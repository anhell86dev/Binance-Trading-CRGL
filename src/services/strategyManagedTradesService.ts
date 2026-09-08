import { PositionRisk, OpenOrder } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { binanceWs } from './binanceWs';
import { strategyService } from './strategyService';

export interface ManagedTradeContext {
  isManaged: boolean; // True if there is an active open position for this strategy
  hasActivePosition: boolean;
  hasOpenOrders: boolean;
  position?: PositionRisk;
  openOrders: OpenOrder[];
  symbol: string;
  side: 'LONG' | 'SHORT';
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  roePct: number;
  leverage: number;
  isolatedMargin: number;
  stopLoss?: number;
  takeProfit?: number;
  badgeLabel: string;
  badgeClass: string;
  isProfit: boolean;
  pnlFormatted: string;
  roeFormatted: string;
}

class StrategyManagedTradesService {
  private listeners: Set<() => void> = new Set();
  private lastPositionsJson: string = '';
  private lastOrdersJson: string = '';

  constructor() {
    // Subscribe to WebSocket updates to notify whenever positions or orders change
    binanceWs.subscribe(() => {
      const currentPositions = binanceWs.getPositions();
      const currentOrders = binanceWs.getOpenOrders();
      const pJson = JSON.stringify(currentPositions.map((p) => ({ s: p.symbol, a: p.positionAmt, pnl: p.unRealizedProfit })));
      const oJson = JSON.stringify(currentOrders.map((o) => ({ id: o.orderId, s: o.symbol, st: o.status })));

      if (pJson !== this.lastPositionsJson || oJson !== this.lastOrdersJson) {
        this.lastPositionsJson = pJson;
        this.lastOrdersJson = oJson;
        this.notify();
      }
    });

    strategyService.subscribe(() => {
      this.notify();
    });
  }

  /**
   * Helper to clean symbols for robust comparison (e.g., 'SOLUSDT' -> 'SOLUSDT')
   */
  private cleanSymbol(sym?: string): string {
    if (!sym) return '';
    return sym.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Returns managed trade details if the strategy is currently being actively managed in "Gestión de Trades"
   */
  public getManagedTradeContext(strategy?: GoogleSheetStrategyRow | null): ManagedTradeContext | null {
    if (!strategy) return null;

    const stratId = (strategy.noEstrategia || '').trim().toUpperCase();
    const stratName = (strategy.nombreEstrategia || '').trim().toUpperCase();
    const stratSymbol = this.cleanSymbol(strategy.par);

    const allPositions = binanceWs.getPositions();
    const activePositions = allPositions.filter((p) => Math.abs(p.positionAmt) > 0);
    const allOpenOrders = binanceWs.getOpenOrders();

    // 1. Check if there is an active open position directly linked or matching this strategy
    let matchedPos: PositionRisk | undefined;

    // Direct ID match
    matchedPos = activePositions.find((pos) => {
      const posStratId = (pos.strategyId || '').trim().toUpperCase();
      const posStratName = (pos.strategyName || '').trim().toUpperCase();
      return (
        (stratId && posStratId === stratId) ||
        (stratName && (posStratId === stratName || posStratName === stratName))
      );
    });

    // Linked symbol memory match
    if (!matchedPos) {
      matchedPos = activePositions.find((pos) => {
        const linked = binanceWs.getLinkedStrategyForSymbol(pos.symbol);
        if (!linked) return false;
        const linkedId = (linked.strategyId || '').trim().toUpperCase();
        const linkedName = (linked.strategyName || '').trim().toUpperCase();
        return (
          (stratId && linkedId === stratId) ||
          (stratName && (linkedId === stratName || linkedName === stratName))
        );
      });
    }

    // Direct symbol match if strategy is active (not obsolete)
    if (!matchedPos && stratSymbol) {
      const isObsolete = (strategy.estado || '').toLowerCase().includes('obsoleto');
      if (!isObsolete) {
        matchedPos = activePositions.find((pos) => {
          const posSym = this.cleanSymbol(pos.symbol);
          return posSym === stratSymbol;
        });
      }
    }

    // 2. Find open orders related to this strategy or symbol
    const relatedOrders = allOpenOrders.filter((ord) => {
      const ordStratId = (ord.strategyId || '').trim().toUpperCase();
      const ordSym = this.cleanSymbol(ord.symbol);
      if (stratId && ordStratId === stratId) return true;
      if (stratSymbol && ordSym === stratSymbol) return true;
      return false;
    });

    const hasActivePosition = Boolean(matchedPos);
    const hasOpenOrders = relatedOrders.length > 0;

    // If neither active position nor open orders, strategy is not in active trade management
    if (!hasActivePosition && !hasOpenOrders) {
      return null;
    }

    const pos = matchedPos;
    const isLong = pos ? pos.positionAmt > 0 : !strategy.tipoDeOrden?.toLowerCase().includes('short');
    const side = isLong ? 'LONG' : 'SHORT';
    const positionAmt = pos ? Math.abs(pos.positionAmt) : 0;
    const entryPrice = pos ? pos.entryPrice || 0 : 0;
    const markPrice = pos ? pos.markPrice || entryPrice : 0;
    const unrealizedPnl = pos ? pos.unRealizedProfit || 0 : 0;
    const leverage = pos ? pos.leverage || 2 : 2;
    const isolatedMargin = pos ? pos.isolatedMargin || (positionAmt * entryPrice) / leverage : 0;

    const roePct = isolatedMargin > 0 ? (unrealizedPnl / isolatedMargin) * 100 : 0;
    const isProfit = unrealizedPnl >= 0;

    const pnlSign = unrealizedPnl >= 0 ? '+' : '-';
    const pnlFormatted = `${pnlSign}$${Math.abs(unrealizedPnl).toFixed(2)}`;
    const roeFormatted = `${pnlSign}${Math.abs(roePct).toFixed(2)}%`;

    let badgeLabel = 'LIVE MANAGEMENT';
    let badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

    if (hasActivePosition) {
      if (isProfit) {
        badgeLabel = `LIVE MANAGEMENT: ${side} ${leverage}x (${pnlFormatted})`;
        badgeClass = 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-xs';
      } else {
        badgeLabel = `LIVE MANAGEMENT: ${side} ${leverage}x (${pnlFormatted})`;
        badgeClass = 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs';
      }
    } else if (hasOpenOrders) {
      badgeLabel = `LIVE MANAGEMENT: ${relatedOrders.length} ÓRDEN(ES) PENDIENTE(S)`;
      badgeClass = 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-xs';
    }

    return {
      isManaged: true,
      hasActivePosition,
      hasOpenOrders,
      position: pos,
      openOrders: relatedOrders,
      symbol: pos ? pos.symbol : strategy.par,
      side,
      positionAmt,
      entryPrice,
      markPrice,
      unrealizedPnl,
      roePct,
      leverage,
      isolatedMargin,
      stopLoss: pos?.stopLoss,
      takeProfit: pos?.takeProfit,
      badgeLabel,
      badgeClass,
      isProfit,
      pnlFormatted,
      roeFormatted,
    };
  }

  /**
   * Fast boolean check if strategy is being actively managed
   */
  public isStrategyManaged(strategy?: GoogleSheetStrategyRow | null): boolean {
    const ctx = this.getManagedTradeContext(strategy);
    return Boolean(ctx?.isManaged);
  }

  /**
   * Returns a map of strategyId / symbol to ManagedTradeContext
   */
  public getManagedStrategiesMap(strategies: GoogleSheetStrategyRow[]): Map<string, ManagedTradeContext> {
    const map = new Map<string, ManagedTradeContext>();
    strategies.forEach((strat) => {
      const ctx = this.getManagedTradeContext(strat);
      if (ctx) {
        map.set(strat.noEstrategia, ctx);
        const clean = this.cleanSymbol(strat.par);
        if (clean) map.set(clean, ctx);
      }
    });
    return map;
  }

  /**
   * Count how many active strategies are currently managed
   */
  public getManagedStrategiesCount(strategies: GoogleSheetStrategyRow[]): number {
    return strategies.filter((s) => this.isStrategyManaged(s)).length;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in StrategyManagedTradesService listener:', err);
      }
    });
  }
}

export const strategyManagedTradesService = new StrategyManagedTradesService();
