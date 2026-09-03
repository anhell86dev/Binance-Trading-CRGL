import { GoogleSheetStrategyRow } from '../types/strategy';
import { binanceWs } from './binanceWs';

export interface TopStrategyConfig {
  id: string;
  rank: number;
  name: string;
  concept: string;
  symbol: string;
  timeframe: string;
  description: string;
  leverage: number; // Strictly clamped to max 5x
  marginType: 'ISOLATED';
  slPercent: number; // e.g., 1.0%
  tpPercent: number; // e.g., 3.0%
  riskRewardRatio: string; // e.g. "1:3" or "1:2.5"
  side: 'BUY' | 'SELL';
  orderType: 'LIMIT' | 'MARKET';
  allocationUsdt: number;
  technicalDetails: string;
}

/**
 * The 3 best strategies optimized for favorable asymmetry (Risk/Reward >= 1:2.5)
 * as specified in Mark Pascal's UX & Risk Management guidelines:
 * 
 * 1. Pullback a Soporte Clave (2x, ISOLATED, SL 1%, TP 3% -> R:B 1:3)
 * 2. Ruptura de Canal Lateral (Breakout) (3x, ISOLATED, SL 1.5%, TP 4.5% -> R:B 1:3)
 * 3. Cruce Dinámico de Tendencia (Trailing) (4x, ISOLATED, SL 2%, TP 5% -> R:B 1:2.5)
 */
export const TOP_3_STRATEGIES_CATALOG: TopStrategyConfig[] = [
  {
    id: 'TOP-STRAT-01-PULLBACK',
    rank: 1,
    name: 'Pullback a Soporte Clave',
    concept: 'Entrada tras rebote en nivel técnico crítico con expansión de precio.',
    symbol: 'BTCUSDT',
    timeframe: '1D / 4H / 1H',
    description: 'Entrada tras rebote en nivel técnico crítico con expansión de precio hacia zona de resistencia con mínimo riesgo.',
    leverage: 2, // Apalancamiento 2x
    marginType: 'ISOLATED', // Margen Aislado
    slPercent: 1.0, // SL 1%
    tpPercent: 3.0, // TP 3%
    riskRewardRatio: '1:3', // Relación Riesgo/Beneficio 1:3
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 250,
    technicalDetails: 'Rebote en soporte dinámico confluente. Confirmación con volumen institucional y estocástico en sobreventa.',
  },
  {
    id: 'TOP-STRAT-02-BREAKOUT',
    rank: 2,
    name: 'Ruptura de Canal Lateral (Breakout)',
    concept: 'Entrada inmediata en dirección al rompimiento de una consolidación con volumen institucional.',
    symbol: 'ETHUSDT',
    timeframe: '4H / 1H',
    description: 'Entrada inmediata en dirección al rompimiento de una consolidación con volumen institucional y expansión de volatilidad.',
    leverage: 3, // Apalancamiento 3x
    marginType: 'ISOLATED', // Margen Aislado
    slPercent: 1.5, // SL 1.5%
    tpPercent: 4.5, // TP 4.5%
    riskRewardRatio: '1:3', // Relación Riesgo/Beneficio 1:3
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 300,
    technicalDetails: 'Ruptura de rango de consolidación con volumen superior al 180% del promedio. Salida proyectada en siguiente zona de liquidez.',
  },
  {
    id: 'TOP-STRAT-03-TREND-TRAILING',
    rank: 3,
    name: 'Cruce Dinámico de Tendencia (Trailing)',
    concept: 'Seguimiento de tendencia con medias móviles rápidas.',
    symbol: 'SOLUSDT',
    timeframe: '1H / 15m',
    description: 'Seguimiento de tendencia con medias móviles rápidas (EMA 9 / EMA 21) en temporalidades de 1h con proyección extendida.',
    leverage: 4, // Apalancamiento 4x
    marginType: 'ISOLATED', // Margen Aislado
    slPercent: 2.0, // SL 2%
    tpPercent: 5.0, // TP 5%
    riskRewardRatio: '1:2.5', // Relación Riesgo/Beneficio 1:2.5
    side: 'BUY',
    orderType: 'LIMIT',
    allocationUsdt: 200,
    technicalDetails: 'Cruce dinámico de EMAs rápidas con MACD en expansión positiva y RSI por encima de 55 sin divergencias bajistas.',
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
type ModalTriggerListener = () => void;

class StrategyAutofillService {
  private listeners: Set<AutofillListener> = new Set();
  private modalTriggerListeners: Set<ModalTriggerListener> = new Set();
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

    // Automatically trigger opening the Order Form Popup Window
    this.openOrderModal();
  }

  public openOrderModal() {
    this.modalTriggerListeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error executing modal trigger listener:', err);
      }
    });
  }

  public subscribe(listener: AutofillListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeToModalTrigger(listener: ModalTriggerListener): () => void {
    this.modalTriggerListeners.add(listener);
    return () => this.modalTriggerListeners.delete(listener);
  }

  public getLastPayload(): AutofillPayload | null {
    return this.lastPayload;
  }
}

export const strategyAutofillService = new StrategyAutofillService();
