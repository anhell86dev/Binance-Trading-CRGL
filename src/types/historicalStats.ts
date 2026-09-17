import { OrderSide } from './binance';

export interface ClosedTradeSheetItem {
  id: string;
  orderId?: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  side: OrderSide;
  entryDate: string; // e.g. "2026-09-02 14:30:00"
  exitDate: string;  // e.g. "2026-09-03 09:15:00"
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  notional: number;
  realizedPnl: number;
  pnlPercent: number; // e.g. +8.45% or -3.20%
  commission: number;
  exitReason: 'TP1' | 'TP2' | 'TP_FINAL' | 'TRAILING_STOP' | 'STOP_LOSS' | 'BREAKEVEN' | 'MANUAL';
  exitReasonLabel: string;
  duration?: string; // e.g. "4h 15m"
  leverage: number;  // 1-5x isolated
  isWin: boolean;
  isBreakeven: boolean;
  sourceSheet?: string;
  notes?: string;
}

export interface CumulativeDrawdownPoint {
  tradeIndex: number;
  date: string;
  symbol: string;
  strategyId: string;
  tradePnl: number;
  cumulativePnl: number;
  peakEquity: number;
  drawdownUsdt: number;
  drawdownPct: number;
  isNewPeak: boolean;
  exitReason: string;
}

export interface SymbolPerformanceBreakdown {
  symbol: string;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  realizedPnl: number; // USDT
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  avgPnl: number;
  maxDrawdownPct: number;
}

export interface StrategyPerformanceBreakdown {
  strategyId: string;
  strategyName: string;
  symbol: string;
  tradesCount: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  realizedPnl: number; // USDT
  profitFactor: number;
  avgPnl: number;
  exitReasons: {
    tp1: number;
    tp2: number;
    tpFinal: number;
    trailingStop: number;
    stopLoss: number;
    manualOrOther: number;
  };
}

export interface ExitReasonDistribution {
  reason: string;
  label: string;
  count: number;
  percentage: number;
  totalPnl: number;
  winRate: number;
  color: string;
}

export interface HistoricalMetricsSummary {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // e.g. 68.5%
  profitFactor: number; // e.g. 2.45
  grossProfit: number; // Sum of positive PnLs
  grossLoss: number;   // Sum of negative PnLs (positive absolute value)
  totalRealizedPnl: number; // Net gross PnL
  netRealizedPnl: number;   // Net PnL after commissions
  totalCommissions: number;
  
  // Drawdown metrics
  maxDrawdownPercent: number; // e.g. 4.85%
  maxDrawdownUsdt: number;    // e.g. $485.20
  currentDrawdownPercent: number;
  currentDrawdownUsdt: number;
  maxConsecutiveLosses: number;
  currentConsecutiveLosses: number;
  maxConsecutiveWins: number;
  currentConsecutiveWins: number;
  
  // Averages and expectations
  avgWin: number;
  avgLoss: number;
  winLossRatio: number; // Avg Win / Avg Loss
  expectancyUsdt: number; // E = (WinRate * AvgWin) - (LossRate * AvgLoss)
  largestWin: number;
  largestLoss: number;
  
  // Side breakdown
  longTradesCount: number;
  longWinRate: number;
  longRealizedPnl: number;
  shortTradesCount: number;
  shortWinRate: number;
  shortRealizedPnl: number;
  
  // Time and duration
  avgTradeDurationMinutes: number;
  firstTradeDate?: string;
  lastTradeDate?: string;
}

export interface HistoricalStatsFilter {
  symbol?: string;
  strategyId?: string;
  side?: 'ALL' | 'BUY' | 'SELL';
  outcome?: 'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN';
  exitReason?: string;
  dateRange?: 'ALL' | '7D' | '30D' | '90D' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
}
