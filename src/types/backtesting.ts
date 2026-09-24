export type StrategyBacktestType =
  | 'EMA_CROSS_ATR'
  | 'EMA_PULLBACK_ATR'
  | 'TACTICAL_E1_E2'
  | 'VOLATILITY_BREAKOUT';

export type KlineInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1d';

export interface BacktestCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  emaFast?: number;
  emaSlow?: number;
  emaTrend?: number;
  atr?: number;
  tr?: number;
  upperAtrBand?: number;
  lowerAtrBand?: number;
  rsi?: number;
}

export interface BacktestParams {
  symbol: string;
  interval: KlineInterval;
  candleLimit: number; // 100 to 1500
  strategyType: StrategyBacktestType;
  
  // EMAs Parameters
  emaFastPeriod: number; // e.g. 9 or 20
  emaSlowPeriod: number; // e.g. 21 or 50
  emaTrendPeriod: number; // e.g. 200 (0 to disable)

  // ATR Parameters
  atrPeriod: number; // e.g. 14
  atrMultiplierSl: number; // e.g. 1.5x ATR
  atrMultiplierTp: number; // e.g. 3.0x ATR (or R:B multiplier)

  // Trailing Stop
  useTrailingStop: boolean;
  trailingStopAtrMultiplier: number; // e.g. 1.5x ATR

  // Filters & Direction
  allowLongs: boolean;
  allowShorts: boolean;

  // Capital & Risk (Max 5x isolated)
  initialCapital: number; // e.g. 5000 USDT
  riskPerTradePct: number; // e.g. 2% of capital
  leverage: number; // 1x to 5x strictly compliant
  feeRatePct: number; // 0.04% taker fee Binance Futures
  slippagePct: number; // 0.01% estimated slippage

  // Tactical Blueprint additions
  customE1DistPct?: number; // e.g. 0.5%
  customE2DistPct?: number; // e.g. 1.2%
}

export interface BacktestTrade {
  id: string;
  tradeIndex: number;
  entryIndex: number;
  exitIndex: number;
  entryTime: number;
  exitTime: number;
  side: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice: number;
  size: number; // contracts
  positionValueUsdt: number;
  marginUsedUsdt: number;
  slPrice: number;
  tpPrice: number;
  atrAtEntry: number;
  exitReason: 'TP_TARGET' | 'STOP_LOSS' | 'TRAILING_STOP' | 'SIGNAL_REVERSAL' | 'END_OF_DATA';
  grossPnlUsdt: number;
  feeUsdt: number;
  netPnlUsdt: number;
  returnPct: number;
  roePct: number;
  holdingCandles: number;
  highestPrice: number;
  lowestPrice: number;
  maxRunupPct: number;
  maxDrawdownPct: number;
  balanceAfter: number;
}

export interface EquityPoint {
  time: number;
  timestampStr: string;
  equity: number;
  drawdownPct: number;
  benchmarkEquity: number;
  price: number;
}

export interface BacktestMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakEvenTrades: number;
  winRatePct: number;
  netProfitUsdt: number;
  netProfitPct: number;
  grossProfitUsdt: number;
  grossLossUsdt: number;
  profitFactor: number;
  maxDrawdownPct: number;
  maxDrawdownUsdt: number;
  sharpeRatio: number;
  sortinoRatio: number;
  avgTradePnlUsdt: number;
  avgTradeReturnPct: number;
  avgWinUsdt: number;
  avgLossUsdt: number;
  payoffRatio: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  avgHoldingCandles: number;
  totalFeesPaidUsdt: number;
  exposureTimePct: number;
  benchmarkReturnPct: number;
}

export interface BacktestResult {
  params: BacktestParams;
  candles: BacktestCandle[];
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
  metrics: BacktestMetrics;
  calculatedAt: number;
}

export interface OptimizationGridItem {
  id: string;
  emaFast: number;
  emaSlow: number;
  atrPeriod: number;
  atrMultiplierSl: number;
  atrMultiplierTp: number;
  netProfitPct: number;
  netProfitUsdt: number;
  winRatePct: number;
  profitFactor: number;
  maxDrawdownPct: number;
  totalTrades: number;
  sharpeRatio: number;
  score: number; // composite rank
}
