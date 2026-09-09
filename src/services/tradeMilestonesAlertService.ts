/**
 * Service to generate real-time alerts when active trade prices reach key tactical milestones:
 * - E2 (Entrada 2 / DCA 1)
 * - E3 (Entrada 3 / DCA 2)
 * - TP1 (Take Profit 1)
 * - TP2 (Take Profit 2)
 * - TP3 (Take Profit 3 / TP Final)
 * - SL (Stop Loss)
 */
import { binanceWs } from './binanceWs';
import { notificationService } from './notifications';
import { strategyService } from './strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { PositionRisk } from '../types/binance';

export type MilestoneType = 'E1' | 'E2' | 'E3' | 'TP1' | 'TP2' | 'TP3' | 'SL';

export interface MilestoneAlertEvent {
  id: string;
  symbol: string;
  milestone: MilestoneType;
  levelPrice: number;
  triggerPrice: number;
  isLong: boolean;
  timestamp: number;
  message: string;
  strategyName?: string;
}

export interface PositionMilestoneLevels {
  symbol: string;
  isLong: boolean;
  entryPrice: number;
  markPrice: number;
  e1Price: number;
  e2Price: number;
  e3Price: number;
  tp1Price: number;
  tp2Price: number;
  tp3Price: number;
  slPrice: number;
  strategyName?: string;
}

class TradeMilestonesAlertService {
  private alertsLog: MilestoneAlertEvent[] = [];
  private triggeredAlertKeys: Set<string> = new Set();
  private prevPriceMap: Map<string, number> = new Map();
  private listeners: Set<() => void> = new Set();
  private isInitialized = false;

  constructor() {
    this.loadFromStorage();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    binanceWs.subscribe(() => {
      this.evaluateAllPositions();
    });

    // Run first evaluation
    this.evaluateAllPositions();
  }

  private loadFromStorage() {
    try {
      const raw = sessionStorage.getItem('milestone_alerts_log');
      if (raw) {
        this.alertsLog = JSON.parse(raw);
      }
      const rawKeys = sessionStorage.getItem('milestone_alerts_keys');
      if (rawKeys) {
        this.triggeredAlertKeys = new Set(JSON.parse(rawKeys));
      }
    } catch {}
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem('milestone_alerts_log', JSON.stringify(this.alertsLog.slice(0, 50)));
      sessionStorage.setItem(
        'milestone_alerts_keys',
        JSON.stringify(Array.from(this.triggeredAlertKeys).slice(-100))
      );
    } catch {}
  }

  public getAlerts(): MilestoneAlertEvent[] {
    return [...this.alertsLog];
  }

  public getLatestAlert(): MilestoneAlertEvent | null {
    return this.alertsLog.length > 0 ? this.alertsLog[0] : null;
  }

  public getLatestAlertForSymbol(symbol: string): MilestoneAlertEvent | null {
    const cleanSym = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    return (
      this.alertsLog.find(
        (a) => a.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym
      ) || null
    );
  }

  public hasRecentAlert(symbol: string, withinMs = 10000): boolean {
    const latest = this.getLatestAlertForSymbol(symbol);
    if (!latest) return false;
    return Date.now() - latest.timestamp < withinMs;
  }

  public getLatestActiveAlertForSymbol(symbol: string, withinMs = 10000): MilestoneAlertEvent | null {
    const latest = this.getLatestAlertForSymbol(symbol);
    if (!latest) return null;
    return Date.now() - latest.timestamp < withinMs ? latest : null;
  }

  public clearAlerts() {
    this.alertsLog = [];
    this.saveToStorage();
    this.notify();
  }

  /**
   * Derive exact E1, E2, E3, TP1, TP2, TP3, SL for a given position.
   */
  public getMilestoneLevelsForPosition(pos: PositionRisk): PositionMilestoneLevels {
    const isLong = pos.positionAmt > 0;
    const entryPrice = pos.entryPrice || 0;
    const markPrice = pos.markPrice || entryPrice;

    // Search linked strategy
    const effectiveStrategyId =
      pos.strategyId || binanceWs.getLinkedStrategyForSymbol(pos.symbol)?.strategyId;
    const allStrategies = strategyService.getStrategies();
    const cleanSym = (pos.symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();

    let linkedStrategy = effectiveStrategyId
      ? allStrategies.find(
          (s) =>
            s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase() ||
            s.nombreEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase()
        )
      : undefined;

    if (!linkedStrategy) {
      linkedStrategy = allStrategies.find(
        (s) =>
          s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym &&
          s.estado !== 'Obsoleto' &&
          s.estado !== 'Fallida'
      );
    }

    let e1Price = entryPrice;
    let e2Price = 0;
    let e3Price = 0;
    let tp1Price = pos.takeProfit || 0;
    let tp2Price = 0;
    let tp3Price = 0;
    let slPrice = pos.stopLoss || 0;
    let strategyName = linkedStrategy?.nombreEstrategia;

    if (linkedStrategy) {
      const parsed = parsePricesFromStrategy(linkedStrategy);
      if (parsed.entry1Price) e1Price = parsed.entry1Price;
      if (parsed.entry2Price) e2Price = parsed.entry2Price;
      if (parsed.entry3Price) e3Price = parsed.entry3Price;
      if (!tp1Price && parsed.tp1Price) tp1Price = parsed.tp1Price;
      if (parsed.tp2Price) tp2Price = parsed.tp2Price;
      if (parsed.tpFinalPrice) tp3Price = parsed.tpFinalPrice;
      if (!slPrice && parsed.slPrice) slPrice = parsed.slPrice;
    }

    // Calculated fallbacks if not explicitly provided
    if (entryPrice > 0) {
      if (!e1Price) e1Price = entryPrice;
      if (!e2Price) e2Price = isLong ? entryPrice * 0.985 : entryPrice * 1.015;
      if (!e3Price) e3Price = isLong ? entryPrice * 0.970 : entryPrice * 1.030;
      if (!tp1Price) tp1Price = isLong ? entryPrice * 1.025 : entryPrice * 0.975;
      if (!tp2Price) tp2Price = isLong ? entryPrice * 1.050 : entryPrice * 0.950;
      if (!tp3Price) tp3Price = isLong ? entryPrice * 1.080 : entryPrice * 0.920;
      if (!slPrice) slPrice = isLong ? entryPrice * 0.980 : entryPrice * 1.020;
    }

    return {
      symbol: pos.symbol,
      isLong,
      entryPrice,
      markPrice,
      e1Price,
      e2Price,
      e3Price,
      tp1Price,
      tp2Price,
      tp3Price,
      slPrice,
      strategyName,
    };
  }

  private evaluateAllPositions() {
    const positions = binanceWs.getPositions();
    if (!positions || positions.length === 0) return;

    let hasNewAlert = false;

    positions.forEach((pos) => {
      if (!pos.entryPrice || pos.entryPrice <= 0) return;
      const levels = this.getMilestoneLevelsForPosition(pos);
      const isLong = levels.isLong;
      const mark = levels.markPrice;

      if (!mark || mark <= 0) return;

      const prevMark = this.prevPriceMap.get(pos.symbol) || mark;
      this.prevPriceMap.set(pos.symbol, mark);

      const checkMilestone = (
        milestone: MilestoneType,
        levelPrice: number,
        condition: boolean,
        badgeText: string,
        priority: 'urgent' | 'normal'
      ) => {
        if (!levelPrice || levelPrice <= 0) return;
        if (!condition) return;

        const alertKey = `${pos.symbol}_${pos.entryPrice.toFixed(4)}_${milestone}`;
        if (this.triggeredAlertKeys.has(alertKey)) return;

        // Register triggered key
        this.triggeredAlertKeys.add(alertKey);

        const alertEvent: MilestoneAlertEvent = {
          id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: pos.symbol,
          milestone,
          levelPrice,
          triggerPrice: mark,
          isLong,
          timestamp: Date.now(),
          message: `${badgeText} en ${pos.symbol}: Precio actual $${mark.toFixed(
            2
          )} cruzó nivel clave $${levelPrice.toFixed(2)} (${isLong ? 'LONG' : 'SHORT'}).`,
          strategyName: levels.strategyName,
        };

        this.alertsLog.unshift(alertEvent);
        hasNewAlert = true;

        // 1. Reproducir sonido táctico de acuerdo al hito cruzado
        notificationService.playMilestoneSound(milestone);

        // 2. Despachar notificación visual in-app / toast
        const title = `🚨 ALERTA: Nivel ${milestone} Cruzado (${pos.symbol})`;
        const notifType =
          milestone === 'SL'
            ? 'SL_HIT'
            : milestone.startsWith('TP')
            ? 'TP_HIT'
            : 'EXECUTION';

        notificationService.notify(
          notifType,
          title,
          alertEvent.message,
          priority
        );
      };

      // 1. SL check (Stop Loss)
      const slHit = isLong ? mark <= levels.slPrice : mark >= levels.slPrice;
      checkMilestone('SL', levels.slPrice, slHit, '🛑 STOP LOSS CRUZADO', 'urgent');

      // 2. TP3 check (Take Profit 3 / Final)
      const tp3Hit = isLong ? mark >= levels.tp3Price : mark <= levels.tp3Price;
      checkMilestone('TP3', levels.tp3Price, tp3Hit, '🏆 TP3 (OBJETIVO MÁXIMO) CRUZADO', 'urgent');

      // 3. TP2 check (Take Profit 2)
      const tp2Hit = isLong ? mark >= levels.tp2Price : mark <= levels.tp2Price;
      checkMilestone('TP2', levels.tp2Price, tp2Hit, '🚀 TP2 CRUZADO', 'urgent');

      // 4. TP1 check (Take Profit 1)
      const tp1Hit = isLong ? mark >= levels.tp1Price : mark <= levels.tp1Price;
      checkMilestone('TP1', levels.tp1Price, tp1Hit, '🎯 TP1 CRUZADO', 'urgent');

      // 5. E1 check (Entrada 1 cruzada / tocada)
      const e1Hit =
        levels.e1Price > 0 &&
        ((prevMark > levels.e1Price && mark <= levels.e1Price) ||
         (prevMark < levels.e1Price && mark >= levels.e1Price) ||
         Math.abs(mark - levels.e1Price) / levels.e1Price < 0.001);
      checkMilestone('E1', levels.e1Price, e1Hit, '⚡ E1 (ENTRADA 1) CRUZADA', 'normal');

      // 6. E2 check (DCA Nivel 2 cruzado)
      const e2Hit = isLong
        ? (mark <= levels.e2Price && mark > levels.slPrice)
        : (mark >= levels.e2Price && mark < levels.slPrice);
      checkMilestone('E2', levels.e2Price, e2Hit, '⚠️ E2 (DCA 2 / RECARGA) CRUZADO', 'normal');

      // 7. E3 check (DCA Nivel 3)
      if (levels.e3Price > 0) {
        const e3Hit = isLong
          ? (mark <= levels.e3Price && mark > levels.slPrice)
          : (mark >= levels.e3Price && mark < levels.slPrice);
        checkMilestone('E3', levels.e3Price, e3Hit, '⚠️ E3 (DCA 3 / CARGA TOTAL) CRUZADO', 'normal');
      }
    });

    if (hasNewAlert) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Dispara una alerta de prueba para validar sonidos y elementos visuales
   */
  public triggerTestAlert(milestone: MilestoneType, symbol = 'BTCUSDT', customPrice?: number) {
    const dummyPrice = customPrice || (milestone === 'SL' ? 88200 : milestone.startsWith('TP') ? 93500 : 91000);
    const alertEvent: MilestoneAlertEvent = {
      id: `TEST-${Date.now()}`,
      symbol,
      milestone,
      levelPrice: dummyPrice,
      triggerPrice: dummyPrice,
      isLong: true,
      timestamp: Date.now(),
      message: `Prueba de Alerta: Nivel ${milestone} alcanzado en ${symbol} a $${dummyPrice.toLocaleString('en-US')}.`,
      strategyName: 'Estrategia de Prueba',
    };

    this.alertsLog.unshift(alertEvent);
    this.saveToStorage();

    // Sonido
    notificationService.testMilestoneSound(milestone);

    // Notificación
    notificationService.notify(
      milestone === 'SL' ? 'SL_HIT' : milestone.startsWith('TP') ? 'TP_HIT' : 'EXECUTION',
      `🔔 Prueba Sonora & Visual: ${milestone}`,
      alertEvent.message,
      'normal'
    );

    this.notify();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

export const tradeMilestonesAlertService = new TradeMilestonesAlertService();
tradeMilestonesAlertService.init();
