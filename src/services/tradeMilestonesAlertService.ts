/**
 * Service to generate real-time alerts when active trade prices reach key tactical milestones:
 * - E1, E2, E3 (Entradas / DCA)
 * - TP1, TP2, TP3 (Take Profits)
 * - SL (Stop Loss)
 *
 * When any milestone is touched:
 * 1. Records the exact date and time (DD/MM/YYYY HH:mm:ss).
 * 2. Updates the trade lifecycle status ('Live', 'Live+', 'Fallida').
 * 3. Persists to the related Google Sheet / Webhook and local storage.
 */
import { binanceWs } from './binanceWs';
import { livePriceService } from './livePriceService';
import { notificationService } from './notifications';
import { strategyService } from './strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { PositionRisk } from '../types/binance';
import {
  GoogleSheetStrategyRow,
  StrategyMilestoneHit,
  StrategyMilestoneType,
  StrategyTradeStatus,
} from '../types/strategy';

export type MilestoneType = StrategyMilestoneType;

export interface MilestoneAlertEvent {
  id: string;
  symbol: string;
  milestone: MilestoneType;
  levelPrice: number;
  triggerPrice: number;
  isLong: boolean;
  timestamp: number;
  date: string;
  time: string;
  message: string;
  strategyId?: string;
  strategyName?: string;
  tradeStatus?: StrategyTradeStatus;
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
  strategyId?: string;
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
      this.evaluateAll();
    });

    livePriceService.subscribe(() => {
      this.evaluateAll();
    });

    strategyService.subscribe(() => {
      this.evaluateAll();
    });

    // Run first evaluation
    this.evaluateAll();
  }

  private loadFromStorage() {
    try {
      const raw = sessionStorage.getItem('milestone_alerts_log_v2');
      if (raw) {
        this.alertsLog = JSON.parse(raw);
      }
      const rawKeys = sessionStorage.getItem('milestone_alerts_keys_v2');
      if (rawKeys) {
        this.triggeredAlertKeys = new Set(JSON.parse(rawKeys));
      }
    } catch {}
  }

  private saveToStorage() {
    try {
      sessionStorage.setItem('milestone_alerts_log_v2', JSON.stringify(this.alertsLog.slice(0, 100)));
      sessionStorage.setItem(
        'milestone_alerts_keys_v2',
        JSON.stringify(Array.from(this.triggeredAlertKeys).slice(-200))
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
    this.triggeredAlertKeys.clear();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Helper to format current date and time
   */
  private getFormattedDateTime(): { date: string; time: string; iso: string } {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return {
      date: `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
      iso: now.toISOString(),
    };
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
    let tp1Price = 0;
    let tp2Price = 0;
    let tp3Price = 0;
    let slPrice = 0;
    let strategyId = linkedStrategy?.noEstrategia;
    let strategyName = linkedStrategy?.nombreEstrategia;

    if (linkedStrategy) {
      const parsed = parsePricesFromStrategy(linkedStrategy);
      if (parsed.entry1Price) e1Price = parsed.entry1Price;
      if (parsed.entry2Price) e2Price = parsed.entry2Price;
      if (parsed.entry3Price) e3Price = parsed.entry3Price;
      if (parsed.tp1Price) tp1Price = parsed.tp1Price;
      if (parsed.tp2Price) tp2Price = parsed.tp2Price;
      if (parsed.tpFinalPrice) tp3Price = parsed.tpFinalPrice;
      if (parsed.slPrice) slPrice = parsed.slPrice;
    }

    if (!tp1Price) tp1Price = pos.takeProfit || 0;
    if (!slPrice) slPrice = pos.stopLoss || 0;

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
      strategyId,
      strategyName,
    };
  }

  /**
   * Main evaluation runner: checks active positions & strategies against live stream
   */
  public evaluateAll() {
    let hasNewAlert = false;
    if (this.evaluateAllPositions()) hasNewAlert = true;
    if (this.evaluateAllStrategies()) hasNewAlert = true;

    if (hasNewAlert) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * 1. Evaluates open positions on Binance Futures
   */
  private evaluateAllPositions(): boolean {
    const positions = binanceWs.getPositions();
    if (!positions || positions.length === 0) return false;

    let hasNewAlert = false;

    positions.forEach((pos) => {
      if (!pos.entryPrice || pos.entryPrice <= 0) return;
      const levels = this.getMilestoneLevelsForPosition(pos);
      const isLong = levels.isLong;
      const mark = levels.markPrice;

      if (!mark || mark <= 0) return;

      const prevMark = this.prevPriceMap.get(pos.symbol) || mark;
      this.prevPriceMap.set(pos.symbol, mark);

      const handleHit = (
        milestone: MilestoneType,
        levelPrice: number,
        condition: boolean,
        badgeText: string,
        priority: 'urgent' | 'normal'
      ) => {
        if (!levelPrice || levelPrice <= 0 || !condition) return;

        const alertKey = `POS_${pos.symbol}_${milestone}_${levelPrice.toFixed(2)}`;
        if (this.triggeredAlertKeys.has(alertKey)) return;
        this.triggeredAlertKeys.add(alertKey);

        const { date, time, iso } = this.getFormattedDateTime();

        // Determine statusAfter
        let statusAfter: StrategyTradeStatus = 'Live';
        if (milestone === 'SL') {
          statusAfter = 'Fallida';
        } else if (milestone.startsWith('TP')) {
          statusAfter = 'Live+';
        } else {
          statusAfter = 'Live';
        }

        const alertEvent: MilestoneAlertEvent = {
          id: `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: pos.symbol,
          milestone,
          levelPrice,
          triggerPrice: mark,
          isLong,
          timestamp: Date.now(),
          date,
          time,
          message: `${badgeText} en ${pos.symbol} a las ${time} (${date}): Precio actual $${mark.toFixed(
            2
          )} tocó nivel $${levelPrice.toFixed(2)} (${isLong ? 'LONG' : 'SHORT'}). Estado: ${statusAfter}.`,
          strategyId: levels.strategyId,
          strategyName: levels.strategyName,
          tradeStatus: statusAfter,
        };

        this.alertsLog.unshift(alertEvent);
        hasNewAlert = true;

        // Persist to strategy and Google Sheet
        const hitRecord: StrategyMilestoneHit = {
          id: alertEvent.id,
          milestone,
          price: levelPrice,
          triggerPrice: mark,
          date,
          time,
          isoTimestamp: iso,
          timestamp: Date.now(),
          statusAfter,
          symbol: pos.symbol,
          strategyId: levels.strategyId || '',
          strategyName: levels.strategyName || '',
          isLong,
        };

        strategyService.recordStrategyMilestoneHit(hitRecord);

        // Sound + Notification
        notificationService.playMilestoneSound(milestone);
        const title = `🚨 ALERTA: ${milestone} Tocado [${time}] (${pos.symbol})`;
        const notifType =
          milestone === 'SL'
            ? 'SL_HIT'
            : milestone.startsWith('TP')
            ? 'TP_HIT'
            : 'EXECUTION';

        notificationService.notify(notifType, title, alertEvent.message, priority);
      };

      // 1. SL check
      const slHit = isLong ? mark <= levels.slPrice : mark >= levels.slPrice;
      handleHit('SL', levels.slPrice, slHit, '🛑 STOP LOSS TOCADO', 'urgent');

      // 2. TP3 check
      const tp3Hit = isLong ? mark >= levels.tp3Price : mark <= levels.tp3Price;
      handleHit('TP3', levels.tp3Price, tp3Hit, '🏆 TP3 (OBJETIVO FINAL) TOCADO', 'urgent');

      // 3. TP2 check
      const tp2Hit = isLong ? mark >= levels.tp2Price : mark <= levels.tp2Price;
      handleHit('TP2', levels.tp2Price, tp2Hit, '🚀 TP2 TOCADO', 'urgent');

      // 4. TP1 check
      const tp1Hit = isLong ? mark >= levels.tp1Price : mark <= levels.tp1Price;
      handleHit('TP1', levels.tp1Price, tp1Hit, '🎯 TP1 TOCADO', 'urgent');

      // 5. E1 check
      const e1Hit =
        levels.e1Price > 0 &&
        ((prevMark > levels.e1Price && mark <= levels.e1Price) ||
          (prevMark < levels.e1Price && mark >= levels.e1Price) ||
          Math.abs(mark - levels.e1Price) / levels.e1Price < 0.001);
      handleHit('E1', levels.e1Price, e1Hit, '⚡ E1 (ENTRADA 1) TOCADA', 'normal');

      // 6. E2 check
      const e2Hit = isLong
        ? mark <= levels.e2Price && mark > levels.slPrice
        : mark >= levels.e2Price && mark < levels.slPrice;
      handleHit('E2', levels.e2Price, e2Hit, '⚠️ E2 (DCA 2 / RECARGA) TOCADO', 'normal');

      // 7. E3 check
      if (levels.e3Price > 0) {
        const e3Hit = isLong
          ? mark <= levels.e3Price && mark > levels.slPrice
          : mark >= levels.e3Price && mark < levels.slPrice;
        handleHit('E3', levels.e3Price, e3Hit, '⚠️ E3 (DCA 3 / CARGA TOTAL) TOCADO', 'normal');
      }
    });

    return hasNewAlert;
  }

  /**
   * 2. Evaluates all strategies in the catalog against real-time live price streams
   */
  private evaluateAllStrategies(): boolean {
    const strategies = strategyService.getStrategies();
    if (!strategies || strategies.length === 0) return false;

    let hasNewAlert = false;

    strategies.forEach((strat) => {
      // Ignore obsolete or already failed strategies
      if (strat.estado === 'Obsoleto' || strat.estado === 'Fallida') return;

      const sym = strat.par.trim().toUpperCase();
      const mark = livePriceService.getPrice(sym);
      if (!mark || mark <= 0) return;

      const parsed = parsePricesFromStrategy(strat);
      const isLong = !strat.tipoDeOrden?.toLowerCase().includes('short');
      const prevMark = this.prevPriceMap.get(sym) || mark;
      this.prevPriceMap.set(sym, mark);

      const checkStrategyMilestone = (
        milestone: MilestoneType,
        levelPrice: number,
        condition: boolean,
        badgeText: string,
        priority: 'urgent' | 'normal'
      ) => {
        if (!levelPrice || levelPrice <= 0 || !condition) return;

        const alertKey = `STRAT_${strat.noEstrategia}_${milestone}_${levelPrice.toFixed(2)}`;
        if (this.triggeredAlertKeys.has(alertKey)) return;
        this.triggeredAlertKeys.add(alertKey);

        const { date, time, iso } = this.getFormattedDateTime();

        let statusAfter: StrategyTradeStatus = 'Live';
        if (milestone === 'SL') {
          statusAfter = 'Fallida';
        } else if (milestone.startsWith('TP')) {
          statusAfter = 'Live+';
        } else {
          statusAfter = 'Live';
        }

        const alertEvent: MilestoneAlertEvent = {
          id: `ALERT-STRAT-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: sym,
          milestone,
          levelPrice,
          triggerPrice: mark,
          isLong,
          timestamp: Date.now(),
          date,
          time,
          message: `${badgeText} en ${strat.nombreEstrategia} (${sym}) a las ${time} del ${date}: Precio live $${mark.toFixed(
            2
          )} tocó nivel clave $${levelPrice.toFixed(2)}. Estado actualizado a: ${statusAfter}. Guardado en Google Sheets.`,
          strategyId: strat.noEstrategia,
          strategyName: strat.nombreEstrategia,
          tradeStatus: statusAfter,
        };

        this.alertsLog.unshift(alertEvent);
        hasNewAlert = true;

        // Record on strategy & push to Google Sheet / Webhook
        const hitRecord: StrategyMilestoneHit = {
          id: alertEvent.id,
          milestone,
          price: levelPrice,
          triggerPrice: mark,
          date,
          time,
          isoTimestamp: iso,
          timestamp: Date.now(),
          statusAfter,
          symbol: sym,
          strategyId: strat.noEstrategia,
          strategyName: strat.nombreEstrategia,
          isLong,
        };

        strategyService.recordStrategyMilestoneHit(hitRecord);

        // Sound + Notification
        notificationService.playMilestoneSound(milestone);
        const title = `🚨 ${milestone} TOCADO [${time}]: ${strat.nombreEstrategia}`;
        const notifType =
          milestone === 'SL'
            ? 'SL_HIT'
            : milestone.startsWith('TP')
            ? 'TP_HIT'
            : 'EXECUTION';

        notificationService.notify(notifType, title, alertEvent.message, priority);
      };

      // Check SL
      if (parsed.slPrice > 0) {
        const slHit = isLong ? mark <= parsed.slPrice : mark >= parsed.slPrice;
        checkStrategyMilestone('SL', parsed.slPrice, slHit, '🛑 STOP LOSS TOCADO', 'urgent');
      }

      // Check TP3 (TP Final)
      if (parsed.tpFinalPrice > 0) {
        const tp3Hit = isLong ? mark >= parsed.tpFinalPrice : mark <= parsed.tpFinalPrice;
        checkStrategyMilestone('TP3', parsed.tpFinalPrice, tp3Hit, '🏆 TP FINAL TOCADO', 'urgent');
      }

      // Check TP2
      if (parsed.tp2Price > 0) {
        const tp2Hit = isLong ? mark >= parsed.tp2Price : mark <= parsed.tp2Price;
        checkStrategyMilestone('TP2', parsed.tp2Price, tp2Hit, '🚀 TP2 TOCADO', 'urgent');
      }

      // Check TP1
      if (parsed.tp1Price > 0) {
        const tp1Hit = isLong ? mark >= parsed.tp1Price : mark <= parsed.tp1Price;
        checkStrategyMilestone('TP1', parsed.tp1Price, tp1Hit, '🎯 TP1 TOCADO', 'urgent');
      }

      // Check E1 (Entrada 1)
      if (parsed.entry1Price > 0) {
        const e1Hit =
          (prevMark > parsed.entry1Price && mark <= parsed.entry1Price) ||
          (prevMark < parsed.entry1Price && mark >= parsed.entry1Price) ||
          Math.abs(mark - parsed.entry1Price) / parsed.entry1Price < 0.0015;
        checkStrategyMilestone('E1', parsed.entry1Price, e1Hit, '⚡ ENTRADA E1 TOCADA', 'normal');
      }

      // Check E2 (DCA 1)
      if (parsed.entry2Price > 0) {
        const e2Hit = isLong
          ? mark <= parsed.entry2Price && mark > parsed.slPrice
          : mark >= parsed.entry2Price && mark < parsed.slPrice;
        checkStrategyMilestone('E2', parsed.entry2Price, e2Hit, '⚠️ ENTRADA E2 (DCA) TOCADA', 'normal');
      }

      // Check E3 (DCA 2)
      if (parsed.entry3Price && parsed.entry3Price > 0) {
        const e3Hit = isLong
          ? mark <= parsed.entry3Price && mark > parsed.slPrice
          : mark >= parsed.entry3Price && mark < parsed.slPrice;
        checkStrategyMilestone('E3', parsed.entry3Price, e3Hit, '⚠️ ENTRADA E3 TOCADA', 'normal');
      }
    });

    return hasNewAlert;
  }

  /**
   * Dispara una alerta de prueba para validar fecha/hora, sonido, estado y persistencia
   */
  public triggerTestAlert(milestone: MilestoneType, symbol = 'BTCUSDT', customPrice?: number) {
    const dummyPrice =
      customPrice || (milestone === 'SL' ? 88200 : milestone.startsWith('TP') ? 93500 : 91000);
    const { date, time, iso } = this.getFormattedDateTime();

    let statusAfter: StrategyTradeStatus = 'Live';
    if (milestone === 'SL') {
      statusAfter = 'Fallida';
    } else if (milestone.startsWith('TP')) {
      statusAfter = 'Live+';
    } else {
      statusAfter = 'Live';
    }

    const alertEvent: MilestoneAlertEvent = {
      id: `TEST-${Date.now()}`,
      symbol,
      milestone,
      levelPrice: dummyPrice,
      triggerPrice: dummyPrice,
      isLong: true,
      timestamp: Date.now(),
      date,
      time,
      message: `Prueba de Alerta: Nivel ${milestone} alcanzado en ${symbol} a las ${time} (${date}) a $${dummyPrice.toLocaleString(
        'en-US'
      )}. Estado registrado: ${statusAfter}. Guardado en Google Sheets.`,
      strategyName: 'Estrategia Táctica Test',
      tradeStatus: statusAfter,
    };

    this.alertsLog.unshift(alertEvent);
    this.saveToStorage();

    const hitRecord: StrategyMilestoneHit = {
      id: alertEvent.id,
      milestone,
      price: dummyPrice,
      triggerPrice: dummyPrice,
      date,
      time,
      isoTimestamp: iso,
      timestamp: Date.now(),
      statusAfter,
      symbol,
      strategyId: 'TEST-STRAT-01',
      strategyName: 'Estrategia Táctica Test',
      isLong: true,
    };

    strategyService.recordStrategyMilestoneHit(hitRecord);

    // Sonido
    notificationService.testMilestoneSound(milestone);

    // Notificación
    notificationService.notify(
      milestone === 'SL' ? 'SL_HIT' : milestone.startsWith('TP') ? 'TP_HIT' : 'EXECUTION',
      `🔔 Prueba Registrada: ${milestone} [${time}]`,
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

