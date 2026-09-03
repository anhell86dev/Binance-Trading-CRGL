import { GoogleSheetStrategyRow } from '../types/strategy';
import { binanceWs } from './binanceWs';

export interface TopStrategyConfig {
  id: string;
  rank: number;
  name: string;
  symbol: string;
  timeframe: string;
  description: string;
  leverage: number; // Max 5x
  marginType: 'ISOLATED';
  slPercent: number; // e.g., 1.0%
  tpPercent: number; // e.g., 3.0%
  riskRewardRatio: string; // e.g. "1:3" or "1:2.5"
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET';
  allocationUsdt: number;
  technicalDetails: string;
}

export const TOP_3_STRATEGIES_CATALOG: TopStrategyConfig[] = [
  {
    id: 'TOP-STRAT-01-PULLBACK',
    rank: 1,
    name: 'Pullback a Soporte Clave con Asimetría Favorable',
    symbol: 'ZECUSDT',
    timeframe: '1D / 4H / 1H',
    description: 'Entrada en rebote tras testeo de nivel técnico relevante, buscando expansión de precio hacia zona de resistencia con mínimo riesgo.',
    leverage: 2, // 2x apalancamiento seguro
    marginType: 'ISOLATED',
    slPercent: 1.0, // SL 1%
    tpPercent: 3.0, // TP 3%
    riskRewardRatio: '1:3.0',
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 250,
    technicalDetails: 'Soporte SMA-15 / SMA-30 confluente. Confirmación con volumen de rebote institucional y estocástico en sobreventa.',
  },
  {
    id: 'TOP-STRAT-02-BREAKOUT',
    rank: 2,
    name: 'Ruptura de Canal Lateral (Breakout de Alta Proyección)',
    symbol: 'TAOUSDT',
    timeframe: '4H / 1H',
    description: 'Entrada inmediata en dirección al rompimiento de una consolidación prolongada con volumen institucional y expansión de volatilidad.',
    leverage: 3, // 3x apalancamiento
    marginType: 'ISOLATED',
    slPercent: 1.5, // SL 1.5%
    tpPercent: 4.5, // TP 4.5%
    riskRewardRatio: '1:3.0',
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 300,
    technicalDetails: 'Ruptura de rango de 7 días con volumen superior al 180% del promedio. Salida proyectada en siguiente zona de liquidez.',
  },
  {
    id: 'TOP-STRAT-03-TREND-CROSS',
    rank: 3,
    name: 'Cruce Dinámico de Tendencia (Trailing Profit)',
    symbol: 'AAVEUSDT',
    timeframe: '1H / 15m',
    description: 'Seguimiento de tendencia impulsada por medias móviles rápidas (EMA 9 / EMA 21) en temporalidades de 1h con proyección extendida.',
    leverage: 4, // 4x apalancamiento
    marginType: 'ISOLATED',
    slPercent: 2.0, // SL 2.0%
    tpPercent: 5.0, // TP 5.0%
    riskRewardRatio: '1:2.5',
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 200,
    technicalDetails: 'Cruce dorado de EMAs rápidas con MACD en expansión positiva y RSI por encima de 55 sin divergencias bajistas.',
  },
];

export interface AutofillPayload {
  strategyId?: string;
  strategyName?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET' | 'SCALED' | 'TRAILING_STOP_MARKET';
  price?: number;
  quantity?: number;
  leverage: number; // 1-5x strictly
  marginType: 'ISOLATED';
  slPercent: number;
  tpPercent: number;
  slPrice?: number;
  tpPrice?: number;
  riskReward: number;
  autoExecuteImmediately?: boolean;
}

type AutofillListener = (payload: AutofillPayload) => void;

class StrategyAutofillService {
  private listeners: Set<AutofillListener> = new Set();
  private lastPayload: AutofillPayload | null = null;

  public autofillOrderForm(payload: AutofillPayload) {
    // Strictly clamp leverage to 1x - 5x
    const safeLeverage = Math.min(5, Math.max(1, payload.leverage));
    const safePayload: AutofillPayload = {
      ...payload,
      leverage: safeLeverage,
      marginType: 'ISOLATED',
    };

    this.lastPayload = safePayload;

    // Switch active symbol in binanceWs if needed
    if (binanceWs.getCurrentSymbol() !== safePayload.symbol) {
      binanceWs.setSymbol(safePayload.symbol);
    }

    this.listeners.forEach((listener) => {
      try {
        listener(safePayload);
      } catch (err) {
        console.error('Error executing autofill listener:', err);
      }
    });
  }

  public subscribe(listener: AutofillListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getLastPayload(): AutofillPayload | null {
    return this.lastPayload;
  }
}

export const strategyAutofillService = new StrategyAutofillService();
