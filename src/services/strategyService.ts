import { GoogleSheetStrategyRow, StrategyTradeStatus } from '../types/strategy';
import {
  SAMPLE_GOOGLE_SHEET_CSV,
  parseCsvToStrategies,
  resolveLatestStrategiesPerPair,
} from '../utils/sheetParser';
import { binanceWs } from './binanceWs';

const STORAGE_KEY = 'binance_futures_strategies_v3';
const LAST_SYNC_KEY = 'binance_strategies_last_sync';

export const OFFICIAL_GOOGLE_SHEET_NAME = 'Diario de Estrategias Cripto - Táctico Oficial (Google Sheets)';
export const OFFICIAL_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTakticoFuturesStrategies2026/pub?output=csv';

class StrategyService {
  private strategies: GoogleSheetStrategyRow[] = [];
  private activeStrategyIndex: number = 0;
  private lastSyncTime: string = new Date().toLocaleTimeString();
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadStrategies();
  }

  private loadStrategies() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('binance_futures_strategies_v2');
      const storedSync = localStorage.getItem(LAST_SYNC_KEY);
      if (storedSync) {
        this.lastSyncTime = storedSync;
      }
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= 5) {
          const { allResolvedStrategies } = resolveLatestStrategiesPerPair(parsed);
          this.strategies = allResolvedStrategies;
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading stored strategies:', e);
    }

    // Default to the official tactical strategies
    const initial = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    this.strategies = initial;
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.strategies));
      localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime);
    } catch (e) {
      console.warn('Error saving strategies to storage:', e);
    }
  }

  /**
   * Returns all strategies or filtered strictly to the latest strategy of each pair
   */
  public getStrategies(onlyLatestPerPair: boolean = false): GoogleSheetStrategyRow[] {
    if (onlyLatestPerPair) {
      return this.getLatestStrategiesPerPair();
    }
    return this.strategies;
  }

  /**
   * Strictly takes ONLY the latest strategy of each pair.
   * "solo debe tomar la ultima estrategia de cada par"
   */
  public getLatestStrategiesPerPair(): GoogleSheetStrategyRow[] {
    const { latestStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return latestStrategies;
  }

  /**
   * Returns only the latest strategies that have status 'Activa' (Estrategia para tomar)
   */
  public getActiveStrategiesToTake(): GoogleSheetStrategyRow[] {
    const { activeToTakeStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return activeToTakeStrategies;
  }

  /**
   * Returns all strategies with obsolete states correctly resolved for historical duplicates
   */
  public getAllResolvedStrategies(): GoogleSheetStrategyRow[] {
    const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return allResolvedStrategies;
  }

  /**
   * Updates the lifecycle status of a specific strategy
   * ('Activa' | 'Obsoleto' | 'Live' | 'Live+')
   */
  public updateStrategyStatus(strategyId: string, newStatus: StrategyTradeStatus) {
    let changed = false;
    this.strategies = this.strategies.map(s => {
      if (s.noEstrategia.toLowerCase() === strategyId.toLowerCase()) {
        changed = true;
        return {
          ...s,
          estado: newStatus,
        };
      }
      return s;
    });

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Updates the status of the latest strategy matching a trading pair (symbol)
   */
  public updatePairLatestStatus(symbol: string, newStatus: StrategyTradeStatus) {
    const cleanSym = symbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const latest = this.getLatestStrategiesPerPair().find(
      s => (s.par || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanSym
    );

    if (latest) {
      this.updateStrategyStatus(latest.noEstrategia, newStatus);
    }
  }

  public getActiveStrategy(): GoogleSheetStrategyRow | undefined {
    return this.strategies[this.activeStrategyIndex] || this.strategies[0];
  }

  public getActiveIndex(): number {
    return this.activeStrategyIndex;
  }

  public setActiveStrategyIndex(index: number) {
    if (index >= 0 && index < this.strategies.length) {
      this.activeStrategyIndex = index;
      const strat = this.strategies[index];
      if (strat && strat.par) {
        binanceWs.setSymbol(strat.par);
      }
      this.notify();
    }
  }

  public setActiveStrategyById(strategyId: string) {
    const idx = this.strategies.findIndex(s => s.noEstrategia.toLowerCase() === strategyId.toLowerCase());
    if (idx !== -1) {
      this.setActiveStrategyIndex(idx);
    }
  }

  public setActiveStrategyBySymbol(symbol: string) {
    const cleanSym = symbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const idx = this.strategies.findIndex(s => s.par.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanSym);
    if (idx !== -1) {
      this.setActiveStrategyIndex(idx);
    }
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  /**
   * Refreshes strategies from the official Google Sheet CSV specification
   */
  public refreshOfficialStrategies(): GoogleSheetStrategyRow[] {
    const refreshed = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    this.strategies = refreshed;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.saveToStorage();

    // Ensure active strategy par matches binanceWs
    const current = this.getActiveStrategy();
    if (current && current.par) {
      binanceWs.setSymbol(current.par);
    }

    this.notify();
    return refreshed;
  }

  public setStrategies(strategies: GoogleSheetStrategyRow[]) {
    this.strategies = strategies;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Returns the unique list of pairs that are strictly present in the strategies.
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

    return ['ZECUSDT', 'TAOUSDT', 'AAVEUSDT', 'SOLUSDT', 'XRPUSDT'];
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

