export type NetworkMode = 'testnet' | 'production' | 'simulation';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';

export type OrderSide = 'BUY' | 'SELL';

export type OrderType =
  | 'LIMIT'
  | 'MARKET'
  | 'STOP'
  | 'STOP_MARKET'
  | 'TAKE_PROFIT'
  | 'TAKE_PROFIT_MARKET'
  | 'TRAILING_STOP_MARKET'
  | 'LIQUIDATION'
  | 'SCALED';

export type ExecutionType =
  | 'NEW'
  | 'CANCELED'
  | 'CALCULATED'
  | 'EXPIRED'
  | 'TRADE'
  | 'AMENDMENT';

export type OrderExecutionStatus =
  | 'NEW'
  | 'PARTIALLY_FILLED'
  | 'FILLED'
  | 'CANCELED'
  | 'EXPIRED'
  | 'EXPIRED_IN_MATCH'
  | 'REJECTED';

export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'GTX';

export type WorkingType = 'MARK_PRICE' | 'CONTRACT_PRICE';

export type MarginType = 'ISOLATED'; // Strictly ISOLATED only

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  minQty: number;
  stepSize: number;
  tickSize: number;
  minNotional: number;
}

export interface TickerData {
  symbol: string;
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  change24h: number;
  change24hPercent: number;
  bestBid: number;
  bestAsk: number;
  timestamp: number;
}

export interface KlineCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

export interface RateLimitStatus {
  rateLimitType: 'REQUEST_WEIGHT' | 'ORDERS';
  interval: string;
  intervalNum: number;
  limit: number;
  count: number;
}

export interface BinanceWsMessage {
  id?: string | number;
  method?: string;
  status?: number;
  result?: any;
  error?: {
    code: number;
    msg: string;
  };
  rateLimits?: RateLimitStatus[];
  event?: string;
  data?: any;
}

export interface PositionRisk {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unRealizedProfit: number;
  liquidationPrice: number;
  leverage: number; // 1 to 5 ONLY
  marginType: 'ISOLATED';
  isolatedMargin: number;
  notional: number;
  roePercent: number;
  takeProfit?: number;
  stopLoss?: number;
  updatedAt: number;
  strategyId?: string;
  strategyName?: string;
  strategyStatus?: string;
}

export const BINANCE_EXPIRY_REASONS: Record<string, string> = {
  '0': 'Sin motivo específico (Normal)',
  '1': 'Cancelada para prevenir auto-negociación (Self-Trade)',
  '2': 'Orden IOC no se pudo llenar completamente',
  '3': 'Orden IOC cancelada para evitar auto-negociación',
  '4': 'Cancelada por orden Reduce-Only de mayor prioridad o reversión de posición',
  '5': 'Expirada debido a liquidación de la cuenta',
  '6': 'Expirada porque no se cumplió la condición GTE',
  '7': 'Cancelada por desliste del símbolo',
  '8': 'Orden inicial expiró tras dispararse orden de stop',
  '9': 'Orden a mercado no se pudo llenar completamente',
};

export interface AccountBalance {
  totalWalletBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  availableBalance: number;
  maintMargin: number;
  marginRatio: number; // maintMargin / totalMarginBalance
  currency: string;
}

export interface OpenOrder {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  price: number;
  avgPrice?: number;
  origQty: number;
  executedQty: number;
  lastFilledQty?: number; // l
  lastFilledPrice?: number; // L
  status: OrderExecutionStatus;
  executionType?: ExecutionType;
  timeInForce: TimeInForce;
  workingType?: WorkingType;
  positionSide?: 'BOTH' | 'LONG' | 'SHORT';
  isReduceOnly?: boolean;
  isCloseAll?: boolean;
  isMaker?: boolean; // m
  modifyId?: string; // M
  tradeId?: number; // t
  leverage: number; // 1 to 5
  marginType: 'ISOLATED';
  stopPrice?: number;
  activationPrice?: number; // AP
  callbackRate?: number; // for Trailing Stop (cr)
  realizedPnl?: number; // rp
  commission?: number; // n
  commissionAsset?: string; // N
  expiryReason?: string; // er
  parentScaledId?: string;
  tpPrice?: number;
  slPrice?: number;
  createdAt: number;
  updatedAt?: number;
  strategyId?: string;
  strategyName?: string;
}

export interface ScaledOrderConfig {
  symbol: string;
  side: OrderSide;
  totalQuantity: number;
  ordersCount: number; // e.g. 3 to 15
  minPrice: number;
  maxPrice: number;
  distribution: 'flat' | 'arithmetic' | 'geometric'; // volume distribution
  leverage: number; // 1 to 5
  strategyId?: string;
  strategyName?: string;
}

export interface TrailingStopConfig {
  symbol: string;
  side: OrderSide;
  quantity: number;
  callbackRate: number; // 0.1% to 5.0%
  activationPrice?: number;
  leverage: number; // 1 to 5
  strategyId?: string;
  strategyName?: string;
}

export interface DynamicTPSLConfig {
  enabled: boolean;
  takeProfitPrice?: number;
  stopLossPrice?: number;
  riskRewardRatio?: number; // e.g. 1:2
  tpPercent?: number; // e.g. 2%
  slPercent?: number; // e.g. 1%
}

export interface VolatilityAlert {
  id: string;
  symbol: string;
  changePercentThreshold: number; // e.g. 1.0% in 5 min
  targetPrice?: number;
  condition: 'ABOVE' | 'BELOW' | 'SWING';
  createdPrice: number;
  createdAt: number;
  triggered: boolean;
  triggeredAt?: number;
  message?: string;
}

export interface ApiCredentials {
  apiKey: string;
  apiSecret: string;
  ed25519PrivateKey?: string; // Optional for session.logon
  isSessionAuth: boolean;
  mode: NetworkMode;
}

export interface TradeHistoryItem {
  id: string;
  orderId: string;
  symbol: string;
  side: OrderSide;
  price: number;
  quantity: number;
  notional: number;
  realizedPnl: number;
  commission: number;
  time: number;
  leverage: number;
  marginType: 'ISOLATED';
}

export interface PerformanceStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalRealizedPnl: number;
  profitFactor: number;
  maxDrawdownPercent: number;
  avgWin: number;
  avgLoss: number;
}

export interface WsLogFrame {
  id: string;
  timestamp: number;
  direction: 'IN' | 'OUT';
  type: 'PING' | 'PONG' | 'REQUEST' | 'RESPONSE' | 'STREAM' | 'ERROR' | 'SYSTEM';
  summary: string;
  data: any;
}

export interface FuturesMarketMetrics {
  symbol: string;
  // Interés Abierto
  openInterest: number;
  openInterestValueUsdt: number;
  openInterestTime: number;

  // Tasa de Financiación
  fundingRate: number;
  fundingRatePercent: number;
  nextFundingTime: number;
  countdownMs: number;

  // Volumen de Compra y Venta
  buyVolumeUsdt: number;
  sellVolumeUsdt: number;
  buySellRatio: number;
  buyVolumePercent: number;
  sellVolumePercent: number;

  // Posiciones de Long/Short (Top Traders Positions)
  topPositionLongPercent: number;
  topPositionShortPercent: number;
  topPositionLongShortRatio: number;

  // Cuentas de Long/Short (Top Traders Accounts)
  topAccountLongPercent: number;
  topAccountShortPercent: number;
  topAccountLongShortRatio: number;

  // Cuentas Globales Long/Short (Global Accounts Ratio)
  globalAccountLongPercent: number;
  globalAccountShortPercent: number;
  globalAccountLongShortRatio: number;

  lastUpdated: number;
}

