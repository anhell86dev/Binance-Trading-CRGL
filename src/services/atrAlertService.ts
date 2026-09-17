/**
 * ATR Critical Volatility Alert Service
 * 
 * Monitorea el indicador ATR (Average True Range) en tiempo real para el par activo y posiciones abiertas.
 * Cuando el ATR supera el umbral crítico configurado (ej. 3.0%), emite alertas sonoras sintetizadas
 * con Web Audio API, notificaciones visuales en la barra superior (Top Bar) y registro en el centro consolidado.
 */

import { binanceWs } from './binanceWs';
import { advancedTechnicalConfluenceService, AdvancedConfluenceData } from './advancedTechnicalConfluenceService';
import { notificationService } from './notifications';
import { livePriceService } from './livePriceService';

export type AtrAlertSeverity = 'warning' | 'critical' | 'extreme';
export type AtrSoundTone = 'siren' | 'tactical-pulse' | 'caution' | 'harmonic';

export interface AtrAlertConfig {
  criticalThresholdPercent: number; // e.g. 3.0%
  warningThresholdPercent: number;  // e.g. 2.0%
  soundEnabled: boolean;
  soundTone: AtrSoundTone;
  cooldownSeconds: number; // prevent re-triggering sound too rapidly for the same symbol
  autoMonitorPositions: boolean;
  autoMonitorActiveSymbol: boolean;
  snoozeDurationMinutes: number; // default snooze time (e.g. 15 mins)
}

export interface AtrAlertItem {
  id: string;
  symbol: string;
  currentPrice: number;
  atrValue: number;
  atrPercent: number;
  criticalThreshold: number;
  severity: AtrAlertSeverity;
  timestamp: number;
  isPositionActive: boolean;
  positionSide?: 'LONG' | 'SHORT';
  positionSize?: number;
  unrealizedPnl?: number;
  leverage?: number;
  dismissed: boolean;
  snoozedUntil?: number;
  isTest?: boolean;
  riskGuidance: {
    volatilityMultiplier: number; // Ratio of current ATR vs 1.5% baseline
    recommendedMaxLeverage: number;
    recommendedStopLossDistance: number; // 1.5x ATR in USD
    recommendedStopLossPercent: number;
    actions: string[];
  };
}

const DEFAULT_CONFIG: AtrAlertConfig = {
  criticalThresholdPercent: 3.0,
  warningThresholdPercent: 2.0,
  soundEnabled: true,
  soundTone: 'siren',
  cooldownSeconds: 45,
  autoMonitorPositions: true,
  autoMonitorActiveSymbol: true,
  snoozeDurationMinutes: 15,
};

class AtrAlertService {
  private config: AtrAlertConfig = { ...DEFAULT_CONFIG };
  private activeAlerts: Map<string, AtrAlertItem> = new Map();
  private lastSoundTriggerTimes: Map<string, number> = new Map();
  private listeners: Set<() => void> = new Set();
  private audioCtx: AudioContext | null = null;
  private monitorInterval: any = null;
  private isEvaluating = false;

  constructor() {
    this.loadConfig();
    this.initMonitoring();
  }

  private loadConfig() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('binance_atr_alert_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      }
    } catch {
      // fallback
    }
  }

  public saveConfig(newConfig: Partial<AtrAlertConfig>) {
    this.config = { ...this.config, ...newConfig };
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('binance_atr_alert_config', JSON.stringify(this.config));
      }
    } catch {}
    this.notifyListeners();
  }

  public getConfig(): AtrAlertConfig {
    return { ...this.config };
  }

  private initMonitoring() {
    if (typeof window === 'undefined') return;

    // Evaluamos cada 5 segundos para reaccionar a expansiones de volatilidad en tiempo real
    this.monitorInterval = setInterval(() => {
      this.evaluateAtrConditions();
    }, 5000);

    // Escuchamos actualizaciones directas de confluencia técnica
    advancedTechnicalConfluenceService.subscribe(() => {
      this.evaluateAtrConditions();
    });

    // Escuchamos cambios de posición en Binance WS
    binanceWs.subscribe(() => {
      this.evaluateAtrConditions();
    });
  }

  /**
   * Inicializa o reactiva el contexto Web Audio
   */
  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Reproduce el sintetizador sonoro de alerta crítica de ATR
   */
  public playAtrAlertSound(customTone?: AtrSoundTone) {
    if (!this.config.soundEnabled && !customTone) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const tone = customTone || this.config.soundTone;

      if (tone === 'siren') {
        // Alarma táctica oscilante bitonal de alta urgencia (784Hz <-> 587Hz)
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sawtooth';

        // Pulso oscilante 3 ciclos rápidos
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.15); // G5
        osc.frequency.linearRampToValueAtTime(587.33, now + 0.30);
        osc.frequency.linearRampToValueAtTime(783.99, now + 0.45);
        osc.frequency.linearRampToValueAtTime(587.33, now + 0.60);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.setValueAtTime(0.18, now + 0.50);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.75);
      } else if (tone === 'tactical-pulse') {
        // Triple pulso staccato agudo (1046Hz C6)
        [0, 0.12, 0.24].forEach((offset) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1046.5, now + offset);

          gain.gain.setValueAtTime(0, now + offset);
          gain.gain.linearRampToValueAtTime(0.20, now + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.09);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.09);
        });
      } else if (tone === 'caution') {
        // Tono de precaución grave con rampa ascendente
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(520, now + 0.35);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.50);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.50);
      } else {
        // Harmonic 4-tone descending warning arpeggio
        const freqs = [880.0, 783.99, 659.25, 523.25];
        freqs.forEach((f, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          const t = now + idx * 0.10;
          osc.frequency.setValueAtTime(f, t);

          gain.gain.setValueAtTime(0, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      }
    } catch {
      // Ignorar restricciones de audio del navegador
    }
  }

  /**
   * Permite probar un tono de alerta sonora
   */
  public testTone(tone: AtrSoundTone) {
    this.playAtrAlertSound(tone);
  }

  /**
   * Evalúa las condiciones de ATR en símbolos monitoreados
   */
  public evaluateAtrConditions() {
    if (this.isEvaluating) return;
    this.isEvaluating = true;

    try {
      const now = Date.now();
      const currentSymbol = binanceWs.getCurrentSymbol() || 'BTCUSDT';
      const positions = binanceWs.getPositions();

      const symbolsToEvaluate = new Set<string>();

      if (this.config.autoMonitorActiveSymbol && currentSymbol) {
        symbolsToEvaluate.add(currentSymbol);
      }

      if (this.config.autoMonitorPositions) {
        positions.forEach((p) => {
          if (Math.abs(p.positionAmt) > 0) {
            symbolsToEvaluate.add(p.symbol);
          }
        });
      }

      // Evaluar cada símbolo
      symbolsToEvaluate.forEach((sym) => {
        const confluence = advancedTechnicalConfluenceService.getConfluence(sym);
        const livePrice = livePriceService.getPrice(sym) || confluence?.lastPrice || 0;
        
        if (!confluence || confluence.atr14Percent <= 0) return;

        const atrPct = confluence.atr14Percent;
        const atrVal = confluence.atr14;
        const isCritical = atrPct >= this.config.criticalThresholdPercent;
        const isWarning = atrPct >= this.config.warningThresholdPercent && !isCritical;

        const matchingPosition = positions.find((p) => p.symbol === sym && Math.abs(p.positionAmt) > 0);
        const isPosActive = Boolean(matchingPosition);
        const posSide = matchingPosition ? (matchingPosition.positionAmt > 0 ? 'LONG' : 'SHORT') : undefined;

        if (isCritical || (isWarning && isPosActive)) {
          const existing = this.activeAlerts.get(sym);

          // Verificar si está snoozed (silenciado temporalmente)
          if (existing?.snoozedUntil && existing.snoozedUntil > now) {
            return;
          }

          const severity: AtrAlertSeverity = atrPct >= this.config.criticalThresholdPercent * 1.5 
            ? 'extreme' 
            : isCritical 
            ? 'critical' 
            : 'warning';

          const volMultiplier = Number((atrPct / 1.5).toFixed(2));
          const recommendedLev = Math.max(1, Math.min(5, Math.floor(5 / volMultiplier)));
          const stopDist = Number((atrVal * 1.5).toFixed(4));
          const stopPct = Number(((stopDist / (livePrice || 1)) * 100).toFixed(2));

          const actions: string[] = [
            `Volatilidad expandida (${atrPct.toFixed(2)}% vs promedio base 1.50%).`,
            `Reducir apalancamiento máximo a ${recommendedLev}x (Isolated).`,
            `Distancia recomendada de Stop Loss por ATR: ±$${stopDist} (${stopPct}%).`,
          ];

          if (isPosActive) {
            actions.push(`⚠️ Tienes posición abierta en ${sym}. Considera asegurar ganancias con Trailing Stop o ajustar SL a Breakeven.`);
          }

          const alertItem: AtrAlertItem = {
            id: `atr-alert-${sym}-${Math.floor(now / 60000)}`,
            symbol: sym,
            currentPrice: livePrice,
            atrValue: atrVal,
            atrPercent: atrPct,
            criticalThreshold: this.config.criticalThresholdPercent,
            severity,
            timestamp: now,
            isPositionActive: isPosActive,
            positionSide: posSide,
            positionSize: matchingPosition ? Math.abs(matchingPosition.positionAmt) : undefined,
            unrealizedPnl: matchingPosition ? matchingPosition.unRealizedProfit : undefined,
            leverage: matchingPosition ? matchingPosition.leverage : undefined,
            dismissed: false,
            riskGuidance: {
              volatilityMultiplier: volMultiplier,
              recommendedMaxLeverage: recommendedLev,
              recommendedStopLossDistance: stopDist,
              recommendedStopLossPercent: stopPct,
              actions,
            },
          };

          const isNewAlert = !existing || existing.dismissed || (existing.severity !== severity);
          this.activeAlerts.set(sym, alertItem);

          // Disparar sonido y notificación si respeta el cooldown
          const lastSoundTime = this.lastSoundTriggerTimes.get(sym) || 0;
          const cooldownMs = (this.config.cooldownSeconds || 45) * 1000;

          if (isNewAlert || now - lastSoundTime > cooldownMs) {
            this.lastSoundTriggerTimes.set(sym, now);
            this.playAtrAlertSound();

            // Notificación consolidada
            const urgencyTitle = severity === 'extreme' 
              ? `🔥 VOLATILIDAD EXTREMA: ATR ${sym} en ${atrPct.toFixed(2)}%`
              : `⚠️ ALERTA ATR CRÍTICO: ${sym} superó umbral (${atrPct.toFixed(2)}% >= ${this.config.criticalThresholdPercent}%)`;

            notificationService.notify(
              'VOLATILITY',
              urgencyTitle,
              `El rango de volatilidad ATR (14) en ${sym} está en $${atrVal.toFixed(atrVal < 10 ? 4 : 2)} (${atrPct.toFixed(2)}%). Revisa el dimensionamiento de tu posición y el nivel de Stop Loss para prevenir liquidación acelerada.`,
              severity === 'extreme' ? 'urgent' : 'high',
              {
                symbol: sym,
                price: livePrice,
                ratio: volMultiplier,
              }
            );
          }
        } else {
          // Si el ATR volvió a niveles seguros y no es un test, podemos limpiar la alerta activa
          const existing = this.activeAlerts.get(sym);
          if (existing && !existing.isTest) {
            this.activeAlerts.delete(sym);
          }
        }
      });

      this.notifyListeners();
    } finally {
      this.isEvaluating = false;
    }
  }

  /**
   * Obtiene la lista de alertas activas (no descartadas y no silenciadas)
   */
  public getActiveAlerts(): AtrAlertItem[] {
    const now = Date.now();
    return Array.from(this.activeAlerts.values())
      .filter((a) => !a.dismissed && (!a.snoozedUntil || a.snoozedUntil < now))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Obtiene la alerta más crítica actualmente activa
   */
  public getHighestCriticalAlert(): AtrAlertItem | null {
    const active = this.getActiveAlerts();
    if (active.length === 0) return null;
    return active.reduce((highest, current) => {
      if (current.severity === 'extreme' && highest.severity !== 'extreme') return current;
      if (current.atrPercent > highest.atrPercent) return current;
      return highest;
    }, active[0]);
  }

  /**
   * Descarta una alerta para un símbolo específico
   */
  public dismissAlert(symbol: string) {
    const item = this.activeAlerts.get(symbol);
    if (item) {
      item.dismissed = true;
      this.activeAlerts.set(symbol, item);
      this.notifyListeners();
    }
  }

  /**
   * Silencia la alerta temporalmente por N minutos
   */
  public snoozeAlert(symbol: string, minutes?: number) {
    const mins = minutes || this.config.snoozeDurationMinutes || 15;
    const item = this.activeAlerts.get(symbol);
    if (item) {
      item.snoozedUntil = Date.now() + mins * 60 * 1000;
      this.activeAlerts.set(symbol, item);
      this.notifyListeners();
    }
  }

  /**
   * Descarta todas las alertas activas
   */
  public dismissAllAlerts() {
    this.activeAlerts.forEach((item, sym) => {
      item.dismissed = true;
    });
    this.notifyListeners();
  }

  /**
   * Dispara una alerta de prueba manual para verificar visuales y sonido
   */
  public triggerManualTest(symbol = 'BTCUSDT', customAtrPercent = 4.25) {
    const now = Date.now();
    const livePrice = livePriceService.getPrice(symbol) || 68500;
    const atrVal = Number(((livePrice * customAtrPercent) / 100).toFixed(2));
    const volMultiplier = Number((customAtrPercent / 1.5).toFixed(2));
    const recommendedLev = Math.max(1, Math.min(5, Math.floor(5 / volMultiplier)));
    const stopDist = Number((atrVal * 1.5).toFixed(2));
    const stopPct = Number(((stopDist / livePrice) * 100).toFixed(2));

    const testItem: AtrAlertItem = {
      id: `test-atr-${now}`,
      symbol,
      currentPrice: livePrice,
      atrValue: atrVal,
      atrPercent: customAtrPercent,
      criticalThreshold: this.config.criticalThresholdPercent,
      severity: customAtrPercent >= 4.0 ? 'extreme' : 'critical',
      timestamp: now,
      isPositionActive: true,
      positionSide: 'LONG',
      positionSize: 0.15,
      unrealizedPnl: -12.40,
      leverage: 3,
      dismissed: false,
      isTest: true,
      riskGuidance: {
        volatilityMultiplier: volMultiplier,
        recommendedMaxLeverage: recommendedLev,
        recommendedStopLossDistance: stopDist,
        recommendedStopLossPercent: stopPct,
        actions: [
          `[MODO PRUEBA] Simulación de ATR superando el umbral crítico (${customAtrPercent}% > ${this.config.criticalThresholdPercent}%).`,
          `Reducción de apalancamiento recomendada a ${recommendedLev}x.`,
          `Stop Loss dinámico sugerido a $${(livePrice - stopDist).toFixed(2)} (Distancia: $${stopDist}).`,
          `Verifica tu tamaño de posición para cumplir el protocolo de mitigación de drawdown.`,
        ],
      },
    };

    this.activeAlerts.set(symbol, testItem);
    this.playAtrAlertSound();
    
    notificationService.notify(
      'VOLATILITY',
      `🚨 [PRUEBA] ATR Crítico: ${symbol} en ${customAtrPercent}%`,
      `Alerta de prueba activada. ATR en $${atrVal} (${customAtrPercent}%). Revisa tu panel de gestión de riesgo.`,
      'high',
      { symbol, price: livePrice, ratio: volMultiplier }
    );

    this.notifyListeners();
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {}
    });
  }
}

export const atrAlertService = new AtrAlertService();
