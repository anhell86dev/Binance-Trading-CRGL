/**
 * Service to track price trajectory (sparkline) for active trades from initiation.
 */
import { binanceWs } from './binanceWs';
import { PositionRisk } from '../types/binance';

export interface PricePoint {
  price: number;
  time: number;
}

export interface TradePriceHistory {
  symbol: string;
  entryPrice: number;
  isLong: boolean;
  startTime: number;
  points: PricePoint[];
  minPrice: number;
  maxPrice: number;
  currentPrice: number;
  changePctFromEntry: number;
}

class TradePriceHistoryService {
  private historyMap: Map<string, TradePriceHistory> = new Map();
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to WebSocket ticks
    binanceWs.subscribe(() => {
      this.syncWithActivePositions();
    });

    // Initial sync
    this.syncWithActivePositions();
  }

  private getKey(symbol: string, entryPrice: number): string {
    return `${symbol.toUpperCase()}_${entryPrice.toFixed(4)}`;
  }

  public getHistory(symbol: string, entryPrice: number): TradePriceHistory | null {
    const key = this.getKey(symbol, entryPrice);
    let hist = this.historyMap.get(key);

    if (!hist && entryPrice > 0) {
      // Initialize on the fly
      const ticker = binanceWs.getTicker();
      const curPrice = ticker.symbol === symbol && ticker.lastPrice ? ticker.lastPrice : entryPrice;
      const isLong = true; // fallback
      hist = this.createInitialHistory(symbol, entryPrice, isLong, curPrice);
      this.historyMap.set(key, hist);
    }

    return hist || null;
  }

  public getAllHistories(): TradePriceHistory[] {
    return Array.from(this.historyMap.values());
  }

  private createInitialHistory(
    symbol: string,
    entryPrice: number,
    isLong: boolean,
    currentPrice: number
  ): TradePriceHistory {
    const now = Date.now();
    const initialPoints: PricePoint[] = [
      { price: entryPrice, time: now - 60000 },
      { price: (entryPrice + currentPrice) / 2, time: now - 30000 },
      { price: currentPrice, time: now },
    ];

    const prices = initialPoints.map((p) => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const diff = currentPrice - entryPrice;
    const changePctFromEntry = entryPrice > 0 ? (diff / entryPrice) * 100 : 0;

    return {
      symbol,
      entryPrice,
      isLong,
      startTime: now - 60000,
      points: initialPoints,
      minPrice,
      maxPrice,
      currentPrice,
      changePctFromEntry,
    };
  }

  private syncWithActivePositions() {
    const positions = binanceWs.getPositions();
    let hasChanged = false;
    const now = Date.now();

    positions.forEach((pos) => {
      const entryPrice = pos.entryPrice;
      if (!entryPrice || entryPrice <= 0) return;

      const key = this.getKey(pos.symbol, entryPrice);
      const isLong = pos.positionAmt > 0;
      const currentPrice = pos.markPrice || entryPrice;

      let hist = this.historyMap.get(key);

      if (!hist) {
        hist = this.createInitialHistory(pos.symbol, entryPrice, isLong, currentPrice);
        this.historyMap.set(key, hist);
        hasChanged = true;
      } else {
        const lastPoint = hist.points[hist.points.length - 1];
        // Append if price changed or at least 5 seconds elapsed
        if (!lastPoint || Math.abs(lastPoint.price - currentPrice) > 0.0001 || now - lastPoint.time >= 5000) {
          hist.points.push({ price: currentPrice, time: now });
          // Limit rolling buffer to 120 points for smooth performance
          if (hist.points.length > 120) {
            hist.points.shift();
          }

          hist.currentPrice = currentPrice;
          hist.minPrice = Math.min(hist.minPrice, currentPrice);
          hist.maxPrice = Math.max(hist.maxPrice, currentPrice);

          const diff = currentPrice - entryPrice;
          hist.changePctFromEntry = entryPrice > 0 ? (diff / entryPrice) * 100 : 0;
          hasChanged = true;
        }
      }
    });

    if (hasChanged) {
      this.saveToStorage();
      this.notify();
    }
  }

  private saveToStorage() {
    try {
      const entries = Array.from(this.historyMap.entries()).slice(-20);
      sessionStorage.setItem('trade_sparkline_history', JSON.stringify(entries));
    } catch {}
  }

  private loadFromStorage() {
    try {
      const raw = sessionStorage.getItem('trade_sparkline_history');
      if (raw) {
        const entries: [string, TradePriceHistory][] = JSON.parse(raw);
        this.historyMap = new Map(entries);
      }
    } catch {}
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const tradePriceHistoryService = new TradePriceHistoryService();
tradePriceHistoryService.init();
