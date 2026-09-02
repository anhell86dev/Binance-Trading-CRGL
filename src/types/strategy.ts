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

