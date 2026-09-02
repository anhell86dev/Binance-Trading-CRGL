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
