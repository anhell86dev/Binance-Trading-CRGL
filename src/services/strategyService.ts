import { GoogleSheetStrategyRow } from '../types/strategy';
import { SAMPLE_GOOGLE_SHEET_CSV, parseCsvToStrategies } from '../utils/sheetParser';

const STORAGE_KEY = 'binance_futures_strategies_v1';

class StrategyService {
  private strategies: GoogleSheetStrategyRow[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadStrategies();
  }

  private loadStrategies() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Filter out generic BTC/ETH if requested and sanitize
          this.strategies = parsed;
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading stored strategies:', e);
    }

    // Default to sample strategies (ZECUSDT)
    const initial = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    this.strategies = initial;
  }

  public getStrategies(): GoogleSheetStrategyRow[] {
    return this.strategies;
  }

  public setStrategies(strategies: GoogleSheetStrategyRow[]) {
    this.strategies = strategies;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(strategies));
    } catch (e) {
      console.warn('Error saving strategies to storage:', e);
    }
    this.notify();
  }

  /**
   * Returns the unique list of pairs that are strictly present in the strategies.
   * Eliminates generic BTC/ETH unless explicitly configured in a strategy.
   */
  public getStrategyPairs(): string[] {
    const pairs = Array.from(
      new Set(
        this.strategies
          .map(s => (s.par || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
          .filter(p => p.length > 0)
      )
    );

    if (pairs.length > 0) {
      return pairs;
    }

    // Fallback strictly to default tactical strategy pair (ZECUSDT)
    return ['ZECUSDT'];
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Error in strategyService listener:', err);
      }
    });
  }
}

export const strategyService = new StrategyService();
