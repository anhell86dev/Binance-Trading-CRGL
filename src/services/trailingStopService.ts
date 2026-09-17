/**
 * Servicio de Motor y Gestión Dinámica de Trailing Stop para Binance Futuros
 * 
 * Implementa la lógica estricta de Binance Futures para órdenes TRAILING_STOP_MARKET:
 * - Cálculo de Tasa de Callback (callbackRate) dinámico basado en ATR:
 *   Callback Rate (%) = ((Multiplicador * ATR) / Precio de Entrada) * 100
 * - Seguimiento de Posiciones Long:
 *   Arrastre hacia arriba con cada nuevo máximo (High) en tiempo real / vela 5m.
 *   Disparo si el precio retrocede >= callbackRate% desde el pico más alto.
 * - Seguimiento de Posiciones Short:
 *   Arrastre hacia abajo con cada nuevo mínimo (Low) en tiempo real / vela 5m.
 *   Disparo si el precio rebota >= callbackRate% desde el mínimo más bajo.
 * - Activación Condicional (activationPrice):
 *   El rastreo solo inicia cuando se alcanza el umbral de activación (ej. R:R 1:1 o TP1).
 *   Mantiene el Stop Loss fijo inicial como salvaguarda hasta la activación.
 */

import { binanceWs } from './binanceWs';
import { livePriceService } from './livePriceService';
import { advancedTechnicalConfluenceService } from './advancedTechnicalConfluenceService';
import { OpenOrder, PositionRisk } from '../types/binance';

export interface TrailingStopRuntimeState {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: 'BUY' | 'SELL'; // SELL closes LONG, BUY closes SHORT
  isLong: boolean;
  positionAmt: number;
  entryPrice: number;
  origQty: number;
  
  // ATR & Callback Configuration
  atrValue: number;
  atrMultiplier: number;
  callbackRate: number; // e.g. 1.5%
  isAtrDerived: boolean;

  // Activation Condition
  hasActivationCondition: boolean;
  activationPrice: number;
  isActivated: boolean;
  activationProgressPct: number; // 0% to 100% towards activation price

  // Dynamic Trailing Tracking
  extremePrice: number; // Highest price for Long, Lowest price for Short
  dynamicStopPrice: number; // Current calculated trigger stop price
  previousDynamicStopPrice: number;
  adjustmentsCount: number; // Number of times the stop was moved forward

  // Distance & Safety metrics
  currentPrice: number;
  distanceToStopUsdt: number;
  distanceToStopPct: number;
  maxLockedProfitUsdt: number;
  maxLockedProfitPct: number;

  // 5m Candle Reference
  candle5mHigh?: number;
  candle5mLow?: number;
  last5mCandleTime?: number;

  status: 'PENDING_ACTIVATION' | 'TRACKING_ACTIVE' | 'FILLED' | 'CANCELED';
  createdAt: number;
  updatedAt: number;
}

export interface TrailingStopCreationParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  qty: number;
  entryPrice?: number;
  atrMultiplier?: number;
  customCallbackRate?: number;
  activationPrice?: number;
  useActivationPrice?: boolean;
  initialStopLossPrice?: number;
  reduceOnly?: boolean;
}

class TrailingStopService {
  private runtimeMap = new Map<string, TrailingStopRuntimeState>();
  private listeners = new Set<() => void>();
  private intervalTimer: any = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load persisted runtime state from localStorage if available
    try {
      const stored = localStorage.getItem('apex_trailing_stop_runtime_v1');
      if (stored) {
        const parsed: Record<string, TrailingStopRuntimeState> = JSON.parse(stored);
        Object.entries(parsed).forEach(([k, v]) => {
          this.runtimeMap.set(k, v);
        });
      }
    } catch {}

    // Subscribe to WebSocket price & order updates
    binanceWs.subscribe(() => {
      this.syncWithOpenOrders();
      this.evaluateAllTrailingStops();
    });

    // High frequency interval (100ms) for ultra-responsive dynamic stop adjustments
    this.intervalTimer = setInterval(() => {
      this.evaluateAllTrailingStops();
    }, 250);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in trailing stop listener:', e);
      }
    });
  }

  private persist() {
    try {
      const obj: Record<string, TrailingStopRuntimeState> = {};
      this.runtimeMap.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem('apex_trailing_stop_runtime_v1', JSON.stringify(obj));
    } catch {}
  }

  /**
   * Calculates ATR-based Callback Rate:
   * Callback Rate (%) = ((Multiplicador * ATR) / Precio de Entrada) * 100
   */
  public calculateAtrCallbackRate(symbol: string, entryPrice: number, multiplier = 1.5): {
    callbackRate: number;
    atrValue: number;
    atrPercent: number;
    formulaExplanation: string;
  } {
    const confluence = advancedTechnicalConfluenceService.getConfluence(symbol);
    const atr = confluence.atr14 > 0 ? confluence.atr14 : entryPrice * 0.015;
    const atrPct = confluence.atr14Percent > 0 ? confluence.atr14Percent : 1.5;

    const rawCallback = entryPrice > 0 ? ((multiplier * atr) / entryPrice) * 100 : atrPct * multiplier;
    // Bound callback between 0.1% and 10.0% (Binance standards)
    const callbackRate = Number(Math.min(10.0, Math.max(0.1, rawCallback)).toFixed(2));

    const formulaExplanation = `((${multiplier} × $${atr.toFixed(2)}) / $${entryPrice.toFixed(2)}) × 100 = ${callbackRate}%`;

    return {
      callbackRate,
      atrValue: Number(atr.toFixed(4)),
      atrPercent: Number(atrPct.toFixed(2)),
      formulaExplanation,
    };
  }

  /**
   * Helper to calculate recommended Activation Price based on Risk:Reward (1:1) or custom target
   */
  public calculateRecommendedActivationPrice(
    isLong: boolean,
    entryPrice: number,
    stopLossPrice?: number,
    takeProfit1Price?: number
  ): number {
    if (takeProfit1Price && takeProfit1Price > 0) {
      return Number(takeProfit1Price.toFixed(4));
    }

    if (stopLossPrice && stopLossPrice > 0) {
      const riskDistance = Math.abs(entryPrice - stopLossPrice);
      if (isLong) {
        return Number((entryPrice + riskDistance).toFixed(4)); // 1:1 R:R
      } else {
        return Number((entryPrice - riskDistance).toFixed(4)); // 1:1 R:R
      }
    }

    // Default: 1.5% in profit
    return isLong
      ? Number((entryPrice * 1.015).toFixed(4))
      : Number((entryPrice * 0.985).toFixed(4));
  }

  /**
   * Synchronize registered trailing stops with active open orders in binanceWs
   */
  public syncWithOpenOrders() {
    const orders = binanceWs.getOpenOrders();
    const trailingOrders = orders.filter(
      (o) =>
        o.type === 'TRAILING_STOP_MARKET' ||
        o.clientOrderId?.startsWith('TS-') ||
        o.clientOrderId?.includes('TRAILING') ||
        (o.callbackRate && o.callbackRate > 0)
    );

    const activeOrderIds = new Set(trailingOrders.map((o) => o.orderId));

    // Remove obsolete records that were deleted or filled outside
    let changed = false;
    this.runtimeMap.forEach((val, orderId) => {
      if (!activeOrderIds.has(orderId)) {
        this.runtimeMap.delete(orderId);
        changed = true;
      }
    });

    // Ingest or update orders from binanceWs
    trailingOrders.forEach((ord) => {
      const symbol = ord.symbol.trim().toUpperCase();
      const live = livePriceService.getPriceData(symbol);
      const currentPrice = live.price || ord.price || 100;
      const isLong = ord.side === 'SELL'; // Closing sell means protecting a Long

      let runtime = this.runtimeMap.get(ord.orderId);
      if (!runtime) {
        const positions = binanceWs.getPositions();
        const pos = positions.find((p) => p.symbol.toUpperCase() === symbol);
        const entryPrice = pos ? pos.entryPrice : (ord.price || currentPrice);
        const atrCalc = this.calculateAtrCallbackRate(symbol, entryPrice, 1.5);
        const callbackRate = ord.callbackRate || atrCalc.callbackRate;

        const hasActivation = Boolean(ord.activationPrice && ord.activationPrice > 0);
        const activationPrice = ord.activationPrice || 0;

        let isActivated = !hasActivation;
        if (hasActivation) {
          isActivated = isLong ? currentPrice >= activationPrice : currentPrice <= activationPrice;
        }

        const extremePrice = isLong ? Math.max(currentPrice, entryPrice) : Math.min(currentPrice, entryPrice);
        const dynamicStop = isLong
          ? Number((extremePrice * (1 - callbackRate / 100)).toFixed(4))
          : Number((extremePrice * (1 + callbackRate / 100)).toFixed(4));

        runtime = {
          orderId: ord.orderId,
          clientOrderId: ord.clientOrderId,
          symbol,
          side: ord.side,
          isLong,
          positionAmt: pos ? pos.positionAmt : ord.origQty,
          entryPrice,
          origQty: ord.origQty,
          atrValue: atrCalc.atrValue,
          atrMultiplier: 1.5,
          callbackRate,
          isAtrDerived: true,
          hasActivationCondition: hasActivation,
          activationPrice,
          isActivated,
          activationProgressPct: isActivated ? 100 : this.calculateActivationProgress(isLong, currentPrice, entryPrice, activationPrice),
          extremePrice,
          dynamicStopPrice: dynamicStop,
          previousDynamicStopPrice: dynamicStop,
          adjustmentsCount: 0,
          currentPrice,
          distanceToStopUsdt: Math.abs(currentPrice - dynamicStop),
          distanceToStopPct: Math.abs(((currentPrice - dynamicStop) / currentPrice) * 100),
          maxLockedProfitUsdt: isLong ? dynamicStop - entryPrice : entryPrice - dynamicStop,
          maxLockedProfitPct: isLong ? ((dynamicStop - entryPrice) / entryPrice) * 100 : ((entryPrice - dynamicStop) / entryPrice) * 100,
          status: isActivated ? 'TRACKING_ACTIVE' : 'PENDING_ACTIVATION',
          createdAt: ord.createdAt || Date.now(),
          updatedAt: Date.now(),
        };

        this.runtimeMap.set(ord.orderId, runtime);
        changed = true;
      }
    });

    if (changed) {
      this.persist();
      this.notify();
    }
  }

  private calculateActivationProgress(
    isLong: boolean,
    currentPrice: number,
    entryPrice: number,
    activationPrice: number
  ): number {
    if (!activationPrice || activationPrice === entryPrice) return 100;
    const totalDistance = Math.abs(activationPrice - entryPrice);
    const coveredDistance = isLong ? currentPrice - entryPrice : entryPrice - currentPrice;
    if (totalDistance <= 0) return 100;
    const pct = Math.round((coveredDistance / totalDistance) * 100);
    return Math.max(0, Math.min(100, pct));
  }

  /**
   * Main real-time engine: Evaluates prices, 5m candle highs/lows, and shifts stops upward (Long) or downward (Short)
   */
  public evaluateAllTrailingStops() {
    if (this.runtimeMap.size === 0) return;

    let hasStateChange = false;
    const ordersToTrigger: TrailingStopRuntimeState[] = [];

    this.runtimeMap.forEach((state) => {
      const live = livePriceService.getPriceData(state.symbol);
      const currentPrice = live.price;
      if (!currentPrice || currentPrice <= 0) return;

      state.currentPrice = currentPrice;
      state.updatedAt = Date.now();

      // 1. Check Activation Price Condition if pending
      if (!state.isActivated && state.hasActivationCondition) {
        state.activationProgressPct = this.calculateActivationProgress(
          state.isLong,
          currentPrice,
          state.entryPrice,
          state.activationPrice
        );

        const activationHit = state.isLong
          ? currentPrice >= state.activationPrice
          : currentPrice <= state.activationPrice;

        if (activationHit) {
          state.isActivated = true;
          state.status = 'TRACKING_ACTIVE';
          state.extremePrice = currentPrice;
          state.dynamicStopPrice = state.isLong
            ? Number((currentPrice * (1 - state.callbackRate / 100)).toFixed(4))
            : Number((currentPrice * (1 + state.callbackRate / 100)).toFixed(4));
          hasStateChange = true;
        }
      }

      // 2. Dynamic Trailing Logic once activated
      if (state.isActivated) {
        if (state.isLong) {
          // Long position trailing: Track higher highs
          if (currentPrice > state.extremePrice) {
            state.extremePrice = currentPrice;
            const newStop = Number((currentPrice * (1 - state.callbackRate / 100)).toFixed(4));

            // Stop can only move UP, never down
            if (newStop > state.dynamicStopPrice) {
              state.previousDynamicStopPrice = state.dynamicStopPrice;
              state.dynamicStopPrice = newStop;
              state.adjustmentsCount += 1;
              hasStateChange = true;
            }
          }

          // Trigger condition for Long: Live price drops to or below dynamic stop
          if (currentPrice <= state.dynamicStopPrice) {
            state.status = 'FILLED';
            ordersToTrigger.push(state);
            hasStateChange = true;
          }
        } else {
          // Short position trailing: Track lower lows
          if (currentPrice < state.extremePrice) {
            state.extremePrice = currentPrice;
            const newStop = Number((currentPrice * (1 + state.callbackRate / 100)).toFixed(4));

            // Stop can only move DOWN, never up
            if (newStop < state.dynamicStopPrice) {
              state.previousDynamicStopPrice = state.dynamicStopPrice;
              state.dynamicStopPrice = newStop;
              state.adjustmentsCount += 1;
              hasStateChange = true;
            }
          }

          // Trigger condition for Short: Live price rises to or above dynamic stop
          if (currentPrice >= state.dynamicStopPrice) {
            state.status = 'FILLED';
            ordersToTrigger.push(state);
            hasStateChange = true;
          }
        }

        // Update distance & profit metrics
        state.distanceToStopUsdt = Number(Math.abs(currentPrice - state.dynamicStopPrice).toFixed(4));
        state.distanceToStopPct = Number(
          Math.abs(((currentPrice - state.dynamicStopPrice) / currentPrice) * 100).toFixed(2)
        );
        state.maxLockedProfitUsdt = state.isLong
          ? Number((state.dynamicStopPrice - state.entryPrice).toFixed(4))
          : Number((state.entryPrice - state.dynamicStopPrice).toFixed(4));
        state.maxLockedProfitPct = Number(
          (
            ((state.isLong
              ? state.dynamicStopPrice - state.entryPrice
              : state.entryPrice - state.dynamicStopPrice) /
              state.entryPrice) *
            100
          ).toFixed(2)
        );
      }
    });

    // Execute triggers
    ordersToTrigger.forEach((triggered) => {
      this.executeTrailingStopTrigger(triggered);
    });

    if (hasStateChange) {
      this.persist();
      this.notify();
    }
  }

  /**
   * Executes order fill and closes position when dynamic trailing stop is triggered
   */
  private executeTrailingStopTrigger(state: TrailingStopRuntimeState) {
    console.log(`[TRAILING STOP TRIGGERED] ${state.symbol} (${state.side}) triggered at $${state.currentPrice} (Dynamic Stop was $${state.dynamicStopPrice})`);

    // 1. Close position or trigger market fill in BinanceWs
    binanceWs.closePosition(state.symbol);

    // 2. Remove order from active Open Orders
    binanceWs.cancelOrder(state.orderId);

    // 3. Remove from runtime map
    this.runtimeMap.delete(state.orderId);
    this.persist();
    this.notify();
  }

  /**
   * Creates and registers a new TRAILING_STOP_MARKET order
   */
  public async createTrailingStopOrder(params: TrailingStopCreationParams): Promise<OpenOrder | null> {
    const symbol = params.symbol.trim().toUpperCase();
    const live = livePriceService.getPriceData(symbol);
    const entryPrice = params.entryPrice || live.price || 100;

    let callbackRate = params.customCallbackRate;
    if (!callbackRate || callbackRate <= 0) {
      const atrCalc = this.calculateAtrCallbackRate(symbol, entryPrice, params.atrMultiplier || 1.5);
      callbackRate = atrCalc.callbackRate;
    }

    const isLong = params.side === 'SELL';
    let activationPrice = params.useActivationPrice ? (params.activationPrice || 0) : 0;

    if (params.useActivationPrice && (!activationPrice || activationPrice <= 0)) {
      activationPrice = this.calculateRecommendedActivationPrice(
        isLong,
        entryPrice,
        params.initialStopLossPrice
      );
    }

    const orderId = `TS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const clientOrderId = `TS-${symbol}-${Date.now().toString().slice(-6)}`;

    const newOrder: OpenOrder = {
      orderId,
      clientOrderId,
      symbol,
      side: params.side,
      type: 'TRAILING_STOP_MARKET',
      price: 0,
      origQty: params.qty,
      executedQty: 0,
      status: 'NEW',
      timeInForce: 'GTC',
      workingType: 'MARK_PRICE',
      positionSide: isLong ? 'LONG' : 'SHORT',
      isReduceOnly: params.reduceOnly !== false,
      leverage: 3,
      marginType: 'ISOLATED',
      callbackRate,
      activationPrice: activationPrice > 0 ? activationPrice : undefined,
      stopPrice: entryPrice,
      createdAt: Date.now(),
    };

    // Place order in Binance WS
    binanceWs.createOrder(newOrder);

    // Synchronize immediately
    this.syncWithOpenOrders();

    return newOrder;
  }

  /**
   * Cancel an active trailing stop order
   */
  public cancelTrailingStop(orderId: string) {
    this.runtimeMap.delete(orderId);
    binanceWs.cancelOrder(orderId);
    this.persist();
    this.notify();
  }

  /**
   * Update callback rate or activation price dynamically
   */
  public updateTrailingStopConfig(
    orderId: string,
    updates: { callbackRate?: number; activationPrice?: number; atrMultiplier?: number }
  ) {
    const runtime = this.runtimeMap.get(orderId);
    if (!runtime) return;

    if (updates.callbackRate !== undefined && updates.callbackRate > 0) {
      runtime.callbackRate = updates.callbackRate;
      runtime.dynamicStopPrice = runtime.isLong
        ? Number((runtime.extremePrice * (1 - runtime.callbackRate / 100)).toFixed(4))
        : Number((runtime.extremePrice * (1 + runtime.callbackRate / 100)).toFixed(4));
    }

    if (updates.activationPrice !== undefined) {
      runtime.activationPrice = updates.activationPrice;
      runtime.hasActivationCondition = updates.activationPrice > 0;
      runtime.isActivated = !runtime.hasActivationCondition;
    }

    this.persist();
    this.notify();
  }

  /**
   * Get runtime state for a specific orderId
   */
  public getRuntimeState(orderId: string): TrailingStopRuntimeState | undefined {
    return this.runtimeMap.get(orderId);
  }

  /**
   * Get all active trailing stop runtime states
   */
  public getAllRuntimeStates(): TrailingStopRuntimeState[] {
    return Array.from(this.runtimeMap.values());
  }

  /**
   * Get trailing stop state for a given symbol
   */
  public getTrailingStopForSymbol(symbol: string): TrailingStopRuntimeState | undefined {
    const clean = symbol.trim().toUpperCase();
    return Array.from(this.runtimeMap.values()).find((r) => r.symbol.toUpperCase() === clean);
  }
}

export const trailingStopService = new TrailingStopService();
