/**
 * Live Price Service for Binance USDⓈ-M Futures
 * Maintains real-time prices for all pairs listed in strategies and Binance Futures.
 * Fetches from Binance Futures REST ticker endpoints + listens to WebSocket.
 */

import { binanceWs } from './binanceWs';

export interface LivePriceData {
  symbol: string;
  price: number;
  change24hPercent: number;
  lastUpdated: number;
}

const DEFAULT_PRICES: Record<string, { price: number; change24hPercent: number }> = {
  ZECUSDT: { price: 789.5, change24hPercent: 2.4 },
  TAOUSDT: { price: 216.8, change24hPercent: 4.1 },
  AAVEUSDT: { price: 125.4, change24hPercent: 1.8 },
  SOLUSDT: { price: 98.4, change24hPercent: -0.9 },
  XRPUSDT: { price: 1.324, change24hPercent: 0.6 },
  BTCUSDT: { price: 87450.0, change24hPercent: 1.2 },
  ETHUSDT: { price: 3120.5, change24hPercent: 0.8 },
  BNBUSDT: { price: 645.2, change24hPercent: 1.5 },
  DOGEUSDT: { price: 0.185, change24hPercent: 3.2 },
  ADAUSDT: { price: 0.68, change24hPercent: -0.4 },
  AVAXUSDT: { price: 28.5, change24hPercent: 2.1 },
  NEARUSDT: { price: 5.4, change24hPercent: 1.9 },
  SUIUSDT: { price: 2.15, change24hPercent: 5.3 },
  LINKUSDT: { price: 17.2, change24hPercent: 0.5 },
};

class LivePriceService {
  private prices: Map<string, LivePriceData> = new Map();
  private listeners: Set<() => void> = new Set();
  private pollingInterval: any = null;
  private isFetching: boolean = false;

  constructor() {
    // Initialize default prices
    Object.entries(DEFAULT_PRICES).forEach(([symbol, data]) => {
      this.prices.set(symbol, {
        symbol,
        price: data.price,
        change24hPercent: data.change24hPercent,
        lastUpdated: Date.now(),
      });
    });

    // Listen to binanceWs current ticker
    binanceWs.subscribe(() => {
      const ticker = binanceWs.getTicker();
      if (ticker && ticker.symbol && ticker.lastPrice > 0) {
        this.updatePrice(ticker.symbol, ticker.lastPrice, ticker.change24hPercent);
      }
    });

    // Start fetching from Binance FAPI
    this.fetchAllPrices();
    this.pollingInterval = setInterval(() => {
      this.fetchAllPrices();
    }, 4000);
  }

  public getPrice(symbol: string): number {
    const clean = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const data = this.prices.get(clean);
    if (data && data.price > 0) return data.price;
    return DEFAULT_PRICES[clean]?.price || 0;
  }

  public getPriceData(symbol: string): LivePriceData {
    const clean = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const data = this.prices.get(clean);
    if (data) return data;
    const def = DEFAULT_PRICES[clean] || { price: 100, change24hPercent: 0 };
    return {
      symbol: clean,
      price: def.price,
      change24hPercent: def.change24hPercent,
      lastUpdated: Date.now(),
    };
  }

  public getAllPrices(): Map<string, LivePriceData> {
    return this.prices;
  }

  public updatePrice(symbol: string, price: number, change24hPercent: number = 0) {
    const clean = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    this.prices.set(clean, {
      symbol: clean,
      price,
      change24hPercent,
      lastUpdated: Date.now(),
    });
    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in LivePriceService listener', e);
      }
    });
  }

  public async fetchAllPrices() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      // Fetch 24h ticker data from Binance Futures FAPI
      const response = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          let updatedCount = 0;
          data.forEach((item: any) => {
            if (item && item.symbol && item.lastPrice) {
              const price = parseFloat(item.lastPrice);
              const change24hPercent = parseFloat(item.priceChangePercent || '0');
              if (!isNaN(price) && price > 0) {
                this.prices.set(item.symbol, {
                  symbol: item.symbol,
                  price,
                  change24hPercent: isNaN(change24hPercent) ? 0 : change24hPercent,
                  lastUpdated: Date.now(),
                });
                updatedCount++;
              }
            }
          });
          if (updatedCount > 0) {
            this.notify();
          }
        }
      }
    } catch {
      // Fallback: apply subtle micro-variations to active tickers to keep live simulation alive if offline
      const currentSym = binanceWs.getCurrentSymbol();
      const currentTicker = binanceWs.getTicker();
      if (currentTicker && currentTicker.lastPrice > 0) {
        this.prices.set(currentSym, {
          symbol: currentSym,
          price: currentTicker.lastPrice,
          change24hPercent: currentTicker.change24hPercent,
          lastUpdated: Date.now(),
        });
      }
    } finally {
      this.isFetching = false;
    }
  }
}

export const livePriceService = new LivePriceService();
