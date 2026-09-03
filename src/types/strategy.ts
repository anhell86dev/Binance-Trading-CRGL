export type StrategyTradeStatus = 'Activa' | 'Obsoleto' | 'Live' | 'Live+';

export interface TradeProcessStageInfo {
  stage: number; // 0 = Obsoleto, 1 = Activa, 2 = Live, 3 = Live+
  status: StrategyTradeStatus;
  label: string; // e.g. "Activa", "Live", "Live+", "Obsoleto"
  meaning: string; // e.g. "Estrategia para tomar", "Órdenes Generadas", "Órdenes Generadas y completadas", "Estrategia No activa"
  description: string;
  progressPct: number;
  nextStep: string;
  badgeClass: string;
}

export interface GoogleSheetStrategyRow {
  noEstrategia: string;
  fecha: string;
  nombreEstrategia: string;
  par: string;
  temporalidad: string;
  tipoDeOrden: string;
  indicadoresClave: string;
  reglasDeEntrada: string;
  reglasDeSalidaTP: string;
  gestionDeRiesgoStopLoss: string;
  comentariosBacktesting: string;
  estado?: StrategyTradeStatus; // 'Activa' | 'Obsoleto' | 'Live' | 'Live+'
}

export interface PlannedStrategyOrder {
  id: string;
  label: string;
  role: 'ENTRY' | 'STOP_LOSS' | 'TAKE_PROFIT';
  side: 'BUY' | 'SELL';
  type: 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
  price: number;
  stopPrice?: number;
  percentage: number; // e.g. 50% of allocation or 40% of TP
  quantity: number;
  estNotional: number;
  estMargin: number;
  pnlTarget?: number;
  description: string;
}

export interface StrategyExecutionPlan {
  strategyId: string;
  name: string;
  symbol: string;
  timeframe: string;
  sourceSheetUrl?: string;
  leverage: number; // 1-5x isolated
  marginType: 'ISOLATED';
  totalUsdtAllocation: number;
  totalCoinQty: number;
  orders: PlannedStrategyOrder[];
  status: 'DRAFT_PENDING_AUTH' | 'AUTHORIZED_CREATED' | 'CANCELLED';
  authorizedAt?: number;
  createdOrderIds?: string[];
  maxLossUsdt?: number;
  maxProfitUsdt?: number;
  riskRewardRatio?: number;
}

export interface ParsedStrategyPrices {
  entry1Price: number;
  entry1Pct: number;
  entry2Price: number;
  entry2Pct: number;
  entry3Price?: number;
  entry3Pct?: number;
  avgEntryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp1Pct: number;
  tp2Price: number;
  tp2Pct: number;
  tpFinalPrice: number;
  tpFinalPct: number;
  leverage: number;
}

export interface SheetAlertRow {
  id: string; // e.g. "ALT-ZEC-001"
  timestamp: string; // e.g. "2026-09-02 15:15:00"
  symbol: string; // e.g. "ZECUSDT"
  noEstrategia: string; // e.g. "STRAT-ZEC-001"
  nombreEstrategia: string;
  livePrice: number;
  entry1Price: number;
  entry2Price: number;
  distPctEntry1: number; // ((livePrice - entry1) / entry1) * 100
  distPctEntry2: number; // ((livePrice - entry2) / entry2) * 100
  condition: 'SWING' | 'ABOVE' | 'BELOW';
  thresholdOrTarget: string; // e.g. "Oscilación > 1.0%" or "$840.00"
  thresholdVal: number;
  createdPrice: number;
  status: 'MONITOREANDO' | 'DISPARADA';
  triggeredAt?: string;
  triggerPrice?: number;
  message?: string;
}

