/**
 * Binance API Fetch Interceptor with Exponential Backoff & Proxy Rotation
 * 
 * Intercepts all Binance REST API requests to handle:
 * 1. HTTP 429 (Too Many Requests) & 418 (IP Auto-Banned / WAF)
 * 2. Exponential backoff retry with jitter
 * 3. Automatic failover and proxy endpoint rotation (fapi.binance.com, fapi1-3.binance.com, /api/binance-proxy, or custom proxy)
 * 4. Custom proxy configuration persistence via localStorage
 */

export interface ProxyConfig {
  mode: 'auto' | 'direct' | 'mirror' | 'custom' | 'local_proxy';
  customProxyUrl: string;
  activeEndpoint: string;
}

export interface InterceptorStatus {
  activeEndpoint: string;
  isRateLimited: boolean;
  rateLimitUntil: number;
  consecutiveRetries: number;
  lastError: string | null;
  mode: ProxyConfig['mode'];
}

// Official Binance Futures REST Endpoints and Mirrors
const DEFAULT_MIRRORS = [
  'https://fapi.binance.com',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
];

const PROXY_MODE_KEY = 'binance_proxy_mode_v1';
const CUSTOM_PROXY_KEY = 'binance_custom_proxy_url_v1';

class BinanceFetchInterceptor {
  private mode: ProxyConfig['mode'] = 'auto';
  private customProxyUrl: string = '';
  private currentMirrorIndex: number = 0;
  private isRateLimited: boolean = false;
  private rateLimitUntil: number = 0;
  private consecutiveRetries: number = 0;
  private lastError: string | null = null;
  private listeners: Set<(status: InterceptorStatus) => void> = new Set();

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      if (typeof window !== 'undefined') {
        const savedMode = localStorage.getItem(PROXY_MODE_KEY) as ProxyConfig['mode'];
        if (savedMode && ['auto', 'direct', 'mirror', 'custom', 'local_proxy'].includes(savedMode)) {
          this.mode = savedMode;
        }
        const savedProxy = localStorage.getItem(CUSTOM_PROXY_KEY);
        if (savedProxy) {
          this.customProxyUrl = savedProxy;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  public getConfig(): ProxyConfig {
    return {
      mode: this.mode,
      customProxyUrl: this.customProxyUrl,
      activeEndpoint: this.getActiveBaseUrl(),
    };
  }

  public setConfig(mode: ProxyConfig['mode'], customUrl?: string) {
    this.mode = mode;
    if (customUrl !== undefined) {
      this.customProxyUrl = customUrl.trim();
      localStorage.setItem(CUSTOM_PROXY_KEY, this.customProxyUrl);
    }
    localStorage.setItem(PROXY_MODE_KEY, this.mode);
    this.notify();
  }

  public subscribe(listener: (status: InterceptorStatus) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): InterceptorStatus {
    return {
      activeEndpoint: this.getActiveBaseUrl(),
      isRateLimited: this.isRateLimited && Date.now() < this.rateLimitUntil,
      rateLimitUntil: this.rateLimitUntil,
      consecutiveRetries: this.consecutiveRetries,
      lastError: this.lastError,
      mode: this.mode,
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error('Error in binanceInterceptor listener', e);
      }
    });
  }

  /**
   * Resolves the current base URL based on selected mode and failover state
   */
  public getActiveBaseUrl(): string {
    if (this.mode === 'custom' && this.customProxyUrl) {
      return this.customProxyUrl.replace(/\/$/, '');
    }
    if (this.mode === 'local_proxy') {
      return '/api/binance-proxy';
    }
    if (this.mode === 'direct') {
      return 'https://fapi.binance.com';
    }
    // 'auto' or 'mirror'
    return DEFAULT_MIRRORS[this.currentMirrorIndex % DEFAULT_MIRRORS.length];
  }

  /**
   * Rotates to the next mirror endpoint upon rate-limit detection
   */
  public rotateEndpoint() {
    this.currentMirrorIndex = (this.currentMirrorIndex + 1) % DEFAULT_MIRRORS.length;
    console.warn(`[BinanceInterceptor] Rotated endpoint to: ${this.getActiveBaseUrl()}`);
    this.notify();
  }

  /**
   * Centralized Fetch Wrapper with Exponential Backoff & Automatic Retry
   */
  public async fetch(
    inputUrl: string,
    init?: RequestInit & { maxRetries?: number; skipProxyTransform?: boolean }
  ): Promise<Response> {
    const maxRetries = init?.maxRetries ?? 3;
    let attempt = 0;

    // Check rate limit lockout
    if (this.isRateLimited && Date.now() < this.rateLimitUntil) {
      const waitSec = Math.ceil((this.rateLimitUntil - Date.now()) / 1000);
      console.warn(`[BinanceInterceptor] Request paused due to active rate limit lockout. Waiting ${waitSec}s.`);
    }

    while (attempt <= maxRetries) {
      const targetUrl = this.resolveUrl(inputUrl, init?.skipProxyTransform);

      try {
        const response = await fetch(targetUrl, init);

        // Check if response indicates Rate Limit / IP Ban
        if (response.status === 429 || response.status === 418 || response.status === 403) {
          this.handleRateLimitError(response);
          attempt++;

          if (attempt <= maxRetries) {
            const delay = this.calculateBackoffDelay(attempt, response);
            console.warn(
              `[BinanceInterceptor] HTTP ${response.status} Rate Limit on attempt ${attempt}/${maxRetries}. Retrying in ${Math.round(
                delay
              )}ms via endpoint: ${this.getActiveBaseUrl()}`
            );
            await new Promise((res) => setTimeout(res, delay));
            continue;
          }
        }

        // If response is OK or non-rate-limit error (e.g. 400 Bad Request)
        if (response.ok) {
          if (this.consecutiveRetries > 0) {
            this.consecutiveRetries = 0;
            this.lastError = null;
            this.isRateLimited = false;
            this.notify();
          }
        }

        return response;
      } catch (err: any) {
        attempt++;
        this.lastError = err?.message || 'Network Error';

        if (attempt <= maxRetries) {
          const delay = this.calculateBackoffDelay(attempt);
          console.warn(
            `[BinanceInterceptor] Network error on attempt ${attempt}/${maxRetries}: ${err?.message}. Retrying in ${Math.round(
              delay
            )}ms.`
          );
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        throw err;
      }
    }

    throw new Error(`[BinanceInterceptor] Failed after ${maxRetries} retries: ${this.lastError}`);
  }

  private resolveUrl(url: string, skipTransform?: boolean): string {
    if (skipTransform) return url;

    // Standardize URL to current active base URL or proxy
    if (url.includes('fapi.binance.com') || url.includes('fapi1.binance.com') || url.includes('fapi2.binance.com') || url.includes('fapi3.binance.com')) {
      const pathAndQuery = url.replace(/https:\/\/fapi[0-3]?\.binance\.com/, '');
      const baseUrl = this.getActiveBaseUrl();

      if (baseUrl.startsWith('/')) {
        // Local proxy path: /api/binance-proxy?path=/fapi/v1/ticker/24hr
        return `${baseUrl}?path=${encodeURIComponent(pathAndQuery)}`;
      }

      return `${baseUrl}${pathAndQuery}`;
    }

    return url;
  }

  private handleRateLimitError(response: Response) {
    this.consecutiveRetries++;
    this.isRateLimited = true;

    // Check Retry-After header
    const retryAfterHeader = response.headers.get('Retry-After');
    let cooldownMs = 120 * 1000; // 2 minutes default

    if (retryAfterHeader) {
      const parsedSec = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        cooldownMs = parsedSec * 1000;
      }
    }

    this.rateLimitUntil = Date.now() + cooldownMs;
    this.lastError = `HTTP ${response.status} Too Many Requests / IP Throttle`;

    // Rotate endpoint automatically if in auto mode
    if (this.mode === 'auto' || this.mode === 'mirror') {
      this.rotateEndpoint();
    } else {
      this.notify();
    }
  }

  private calculateBackoffDelay(attempt: number, response?: Response): number {
    const retryAfterHeader = response?.headers.get('Retry-After');
    if (retryAfterHeader) {
      const parsedSec = parseInt(retryAfterHeader, 10);
      if (!isNaN(parsedSec) && parsedSec > 0) {
        return parsedSec * 1000;
      }
    }

    // Exponential backoff: baseDelay * 2^attempt + jitter (100-400ms)
    const baseDelay = 800;
    const exponential = Math.pow(2, attempt);
    const jitter = Math.random() * 300 + 100;
    return Math.min(15000, baseDelay * exponential + jitter);
  }
}

export const binanceInterceptor = new BinanceFetchInterceptor();
export const binanceFetch = (url: string, init?: RequestInit & { maxRetries?: number; skipProxyTransform?: boolean }) =>
  binanceInterceptor.fetch(url, init);
