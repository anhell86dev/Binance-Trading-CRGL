import { DiarioBitcoinSymbol, TokenMetricsData, MarketAnalysisArticle } from '../types/diarioBitcoin';

export const SUPPORTED_SYMBOLS: { symbol: DiarioBitcoinSymbol; name: string }[] = [
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'ZEC', name: 'Zcash' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'TAO', name: 'Bittensor' },
];

export const DIARIO_BITCOIN_URLS: Record<DiarioBitcoinSymbol, string> = {
  AAVE: 'https://www.diariobitcoin.com/simbolo/AAVE',
  SOL: 'https://www.diariobitcoin.com/simbolo/SOL',
  ZEC: 'https://www.diariobitcoin.com/simbolo/ZEC',
  XRP: 'https://www.diariobitcoin.com/simbolo/XRP',
  TAO: 'https://www.diariobitcoin.com/simbolo/TAO',
};

export const MARKET_ANALYSIS_URL = 'https://www.diariobitcoin.com/categoria/analisis/';

function formatAge(diffMs: number): string {
  if (diffMs < 0) diffMs = 0;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Hace ${days} día${days > 1 ? 's' : ''} y ${remHours} hora${remHours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}, ${minutes} min y ${seconds} seg`;
  }
  if (minutes > 0) {
    return `Hace ${minutes} min y ${seconds} seg`;
  }
  return `Hace ${seconds} seg`;
}

class DiarioBitcoinService {
  private cache: Map<DiarioBitcoinSymbol, TokenMetricsData> = new Map();
  private articlesCache: MarketAnalysisArticle[] = [];
  private athsCache: Record<string, any> | null = null;
  private subscribers: Set<() => void> = new Set();
  private isLoading = false;
  private lastFetchedAt = 0;
  private error: string | null = null;

  constructor() {
    // Start initial load
    this.refreshAll();
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public getMetrics(symbol: DiarioBitcoinSymbol): TokenMetricsData | undefined {
    return this.cache.get(symbol);
  }

  public getAllMetrics(): TokenMetricsData[] {
    return SUPPORTED_SYMBOLS.map((s) => this.cache.get(s.symbol)).filter(
      (m): m is TokenMetricsData => !!m
    );
  }

  public getArticles(): MarketAnalysisArticle[] {
    // Recompute current age for live freshness
    const now = Date.now();
    return this.articlesCache.map((art) => {
      const ageMs = now - art.publishedTimestamp;
      return {
        ...art,
        ageMs,
        ageText: formatAge(ageMs),
      };
    });
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getLastFetchedAt(): number {
    return this.lastFetchedAt;
  }

  public getError(): string | null {
    return this.error;
  }

  private async fetchWithFallback(endpoint: string): Promise<string> {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const directProxyUrl = `${base}/api/diariobitcoin${endpoint}`;

    // 1. Try Vite proxy via relative/absolute localhost URL
    try {
      const res = await fetch(directProxyUrl, {
        headers: {
          Accept: 'application/json, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue to next strategy
    }

    // 2. If in Node/server environment or direct fetch allowed, try direct DiarioBitcoin URL
    const targetUrl = `https://www.diariobitcoin.com${endpoint}`;
    if (typeof window === 'undefined') {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // Continue
      }
    }

    // 3. Fallback: allorigins CORS proxy for browser environments without proxy
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(corsProxyUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue
    }

    // 4. Fallback: corsproxy.io
    const corsProxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(corsProxyUrl2);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue
    }

    throw new Error(`No se pudo obtener datos de ${endpoint}`);
  }

  public async refreshAll(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      // 1. Fetch ATHs if not cached or old
      if (!this.athsCache) {
        try {
          const athsRaw = await this.fetchWithFallback('/data/aths.js');
          this.athsCache = JSON.parse(athsRaw);
        } catch (e) {
          console.warn('Fallback: aths fetch error', e);
        }
      }

      // 2. Fetch all 5 symbols in parallel
      await Promise.all(
        SUPPORTED_SYMBOLS.map(async ({ symbol, name }) => {
          try {
            await this.fetchSymbolData(symbol, name);
          } catch (err) {
            console.error(`Error loading DiarioBitcoin data for ${symbol}:`, err);
          }
        })
      );

      // 3. Fetch latest 3 market analysis articles
      await this.fetchLatestArticles();

      this.lastFetchedAt = Date.now();
      this.error = null;
    } catch (e: any) {
      this.error = e?.message || 'Error al sincronizar con DiarioBitcoin';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  private async fetchSymbolData(symbol: DiarioBitcoinSymbol, name: string): Promise<void> {
    const [liveRaw, histRaw] = await Promise.all([
      this.fetchWithFallback(`/data/symbol/live/${symbol}.json`),
      this.fetchWithFallback(`/data/symbol/historic/${symbol}.json`),
    ]);

    const liveData: [number, number, number][] = JSON.parse(liveRaw);
    const histData: [number, number, number, number, number, number][] = JSON.parse(histRaw);

    if (!liveData?.length || !histData?.length) {
      throw new Error(`Datos vacíos para ${symbol}`);
    }

    // Parse according to exact DiarioBitcoin specification
    const lastQuote = liveData[liveData.length - 1][1];
    const todayOpen = liveData[0][1];
    const openPct = ((lastQuote - todayOpen) / todayOpen) * 100;

    const histYesterday = histData.length >= 2 ? histData[histData.length - 2] : histData[0];
    const yesterdayClose = histYesterday[4];
    const closePct = ((lastQuote - yesterdayClose) / yesterdayClose) * 100;

    const todayLow = Math.min(...liveData.map((d) => d[1]));
    const todayHigh = Math.max(...liveData.map((d) => d[1]));

    const yesterdayLow = histYesterday[3];
    const yesterdayHigh = histYesterday[2];

    const oneYearIdx = Math.max(0, histData.length - 1 - 364);
    const oneYearClose = histData[oneYearIdx][4];
    const oneYearPct = ((lastQuote - oneYearClose) / oneYearClose) * 100;

    // Volume calculation
    const days30Count = Math.min(30, histData.length);
    let vol30Sum = 0;
    for (let i = 0; i < days30Count; i++) {
      vol30Sum += histData[histData.length - 1 - i][5];
    }
    const volAvg30 = vol30Sum / days30Count;

    const volYesterday = histYesterday[5];
    const volYesterdayPct = volAvg30 > 0 ? ((volYesterday - volAvg30) / volAvg30) * 100 : 0;

    const volToday = histData[histData.length - 1][5];
    const volTodayPct = volAvg30 > 0 ? ((volToday - volAvg30) / volAvg30) * 100 : 0;

    // 7 day range
    const sevenDaySlice = histData.slice(-7);
    const sevenDayLow = Math.min(todayLow, ...sevenDaySlice.map((d) => d[3]));
    const sevenDayHigh = Math.max(todayHigh, ...sevenDaySlice.map((d) => d[2]));

    // 52 week range
    const yearSlice = histData.slice(-365);
    const fiftyTwoLow = Math.min(todayLow, ...yearSlice.map((d) => d[3]));
    const fiftyTwoHigh = Math.max(todayHigh, ...yearSlice.map((d) => d[2]));

    // SMA 200
    const sma200Slice = histData.slice(-200);
    const sma200 = sma200Slice.reduce((acc, d) => acc + d[4], 0) / sma200Slice.length;
    const sma200Pct = ((lastQuote - sma200) / sma200) * 100;

    // ATH info
    const athItem = this.athsCache?.[symbol] || {};
    const marketcapRecent = athItem.marketcap_recent || 0;
    const marketcapAth = athItem.marketcap_ath || 0;
    const marketcapAthPct = marketcapRecent > 0 ? (marketcapAth / marketcapRecent) * 100 : 0;

    const athPrice = athItem.price || 0;
    const athTimestamp = (athItem.timestamp_in_secs || 0) * 1000;
    const athPct = athPrice > 0 ? (lastQuote / athPrice) * 100 : 0;

    const dateFormatted = athTimestamp > 0
      ? new Date(athTimestamp).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        }) + ' UTC'
      : 'No disponible';

    const metrics: TokenMetricsData = {
      token: symbol,
      name,
      sourceUrl: DIARIO_BITCOIN_URLS[symbol],
      lastQuote,
      aperturaHoy: { price: todayOpen, pct: openPct },
      cierrePrevio: { price: yesterdayClose, pct: closePct },
      rangoHoy: { low: todayLow, high: todayHigh },
      rangoAyer: { low: yesterdayLow, high: yesterdayHigh },
      precioHaceUnAno: { price: oneYearClose, pct: oneYearPct },
      volumenAyer: { vol: volYesterday, pct: volYesterdayPct },
      volumenHoy: { vol: volToday, pct: volTodayPct },
      volumenPromedio30Dias: volAvg30,
      rango7Dias: { low: sevenDayLow, high: sevenDayHigh },
      rango52Semanas: { low: fiftyTwoLow, high: fiftyTwoHigh },
      precioPromedio200Dias: { sma200, pct: sma200Pct },
      capitalizacion: marketcapRecent,
      capitalizacionATH: { marketcapAth, pct: marketcapAthPct },
      ath: { price: athPrice, timestamp: athTimestamp, dateFormatted, pct: athPct },
      updatedAt: Date.now(),
    };

    this.cache.set(symbol, metrics);
  }

  private async fetchLatestArticles(): Promise<void> {
    try {
      const feedXml = await this.fetchWithFallback('/categoria/analisis/feed/');
      const itemMatches = feedXml.match(/<item[\s\S]*?<\/item>/gi) || [];

      if (itemMatches.length > 0) {
        const parsedArticles: MarketAnalysisArticle[] = itemMatches.slice(0, 3).map((itemXml) => {
          const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
          const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
          const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
          const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

          const title = titleMatch?.[1]?.trim() || 'Análisis de mercado';
          const link = linkMatch?.[1]?.trim() || MARKET_ANALYSIS_URL;
          const pubDateStr = pubDateMatch?.[1]?.trim() || '';
          const rawDesc = descMatch?.[1]?.replace(/<[^>]+>/g, '').trim();

          const publishedTimestamp = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();
          const ageMs = Math.max(0, Date.now() - publishedTimestamp);

          return {
            title,
            link,
            pubDate: pubDateStr,
            publishedTimestamp,
            ageMs,
            ageText: formatAge(ageMs),
            description: rawDesc ? (rawDesc.length > 160 ? rawDesc.slice(0, 160) + '...' : rawDesc) : undefined,
          };
        });

        if (parsedArticles.length > 0) {
          this.articlesCache = parsedArticles;
          return;
        }
      }
    } catch (e) {
      console.warn('Error parsing analysis feed XML, attempting HTML fallback', e);
    }

    // Secondary fallback: Parse HTML from /categoria/analisis/
    try {
      const html = await this.fetchWithFallback('/categoria/analisis/');
      const articleMatches = html.match(/<article[\s\S]*?<\/article>/gi) || [];

      const parsedArticles: MarketAnalysisArticle[] = articleMatches.slice(0, 3).map((artHtml) => {
        const linkMatch = artHtml.match(/<h4><a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a><\/h4>/i);
        const timeMatch = artHtml.match(/<time[^>]*data-timestamp=["'](\d+)["'][^>]*>([\s\S]*?)<\/time>/i);

        const title = linkMatch?.[2]?.trim() || 'Análisis de mercado';
        const link = linkMatch?.[1]?.trim() || MARKET_ANALYSIS_URL;
        const timestampSec = parseInt(timeMatch?.[1] || '0', 10);
        const publishedTimestamp = timestampSec > 0 ? timestampSec * 1000 : Date.now();
        const ageMs = Math.max(0, Date.now() - publishedTimestamp);

        return {
          title,
          link,
          pubDate: timeMatch?.[2]?.trim() || 'Reciente',
          publishedTimestamp,
          ageMs,
          ageText: formatAge(ageMs),
        };
      });

      if (parsedArticles.length > 0) {
        this.articlesCache = parsedArticles;
      }
    } catch (err2) {
      console.error('All article parsing fallbacks failed:', err2);
    }
  }
}

export const diarioBitcoinService = new DiarioBitcoinService();
