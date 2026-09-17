/**
 * Servicio de Confluencia Avanzada y Análisis Permanente
 * 
 * - Fase de Análisis Permanente: Realiza llamadas HTTP programadas cada 15 segundos al endpoint de klines de Binance.
 * - Procesa el array de datos extrayendo el cierre de las últimas velas e inyecta la información en las funciones core:
 *   1. RSI (14 periodos)
 *   2. ATR (14 periodos)
 *   3. EMA 50 y EMA 200
 * - Filtrado de Confluencias: Evalúa las 4 capas de confirmación técnica y emite un semáforo interactivo (🟢 Verde, 🟡 Amarillo, 🔴 Rojo).
 * - Dimensionamiento Óptimo de Posición: Calcula el tamaño de posición óptimo basado en la volatilidad actual del ATR.
 */
import { binanceFetch } from '../utils/binanceInterceptor';
import { binanceWs } from './binanceWs';
import { livePriceService } from './livePriceService';

export type TrafficLightState = 'GREEN' | 'YELLOW' | 'RED';

export interface ConfluenceLayersAudit {
  layer1MacroEma: {
    passed: boolean;
    score: number; // 0 or 1
    description: string;
    details: string;
    state: 'bullish' | 'bearish' | 'neutral';
  };
  layer2RsiMomentum: {
    passed: boolean;
    score: number; // 0 or 1
    description: string;
    details: string;
    state: 'favorable' | 'neutral' | 'unfavorable';
  };
  layer3AtrVolatility: {
    passed: boolean;
    score: number; // 0 or 1
    description: string;
    details: string;
    state: 'optimal' | 'moderate' | 'extreme';
  };
  layer4DirectionalAlignment: {
    passed: boolean;
    score: number; // 0 or 1
    description: string;
    details: string;
    state: 'aligned' | 'partial' | 'divergent';
  };
  totalScore: number; // 0 to 4
  confluencePercentage: number; // 0% to 100%
  trafficLight: TrafficLightState;
  summaryLabel: string;
}

export interface OptimalPositionSizing {
  accountCapitalUsdt: number;
  riskPercent: number; // e.g. 1.0%
  riskAmountUsdt: number; // e.g. $10.00
  atrValue: number;
  atrPercent: number;
  stopDistanceUsdt: number; // ATR * 1.5
  stopDistancePercent: number;
  optimalPositionSizeUsdt: number; // Sizing based on ATR
  optimalContracts: number;
  recommendedLeverage: number; // 1x to 5x
  marginRequiredUsdt: number;
  volatilityRegime: 'Baja Volatilidad' | 'Volatilidad Normal' | 'Alta Volatilidad';
}

export interface AdvancedConfluenceData {
  symbol: string;
  lastPrice: number;
  lastUpdated: number;
  isFetching: boolean;
  timeframe: string; // '15m'
  candleCount: number;

  // Core Indicators
  rsi14: number;
  rsiStatus: 'oversold' | 'neutral' | 'overbought';
  rsiSlope: 'up' | 'down' | 'flat';

  atr14: number;
  atr14Percent: number;

  ema50: number;
  ema200: number;
  emaTrend: 'Bullish' | 'Bearish' | 'Golden Cross' | 'Death Cross' | 'Neutral';
  priceVsEma50Pct: number;
  priceVsEma200Pct: number;
  emaSpreadPct: number;

  // Confluence Evaluation (Default or Position-specific)
  layersLong: ConfluenceLayersAudit;
  layersShort: ConfluenceLayersAudit;

  // Volatility-Based Position Sizing
  optimalSizing: OptimalPositionSizing;
}

class AdvancedTechnicalConfluenceService {
  private cache = new Map<string, AdvancedConfluenceData>();
  private inFlight = new Set<string>();
  private listeners = new Set<() => void>();
  private timer: any = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Load initial cache from sessionStorage if available
    try {
      const stored = sessionStorage.getItem('adv_confluence_cache_v1');
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.keys(parsed).forEach((k) => {
          this.cache.set(k, parsed[k]);
        });
      }
    } catch {}

    // Permanent 15-second scheduler
    this.timer = setInterval(() => {
      this.pollPermanentCycle();
    }, 15000);

    // Initial cycle after startup
    setTimeout(() => {
      this.pollPermanentCycle();
    }, 1200);

    // Subscribe to binanceWs to fetch newly opened positions
    binanceWs.subscribe(() => {
      const positions = binanceWs.getPositions();
      if (positions && positions.length > 0) {
        positions.forEach((p) => {
          const clean = p.symbol.trim().toUpperCase();
          if (!this.cache.has(clean) && !this.inFlight.has(clean)) {
            this.fetchKlinesAndAnalyze(clean);
          }
        });
      }
    });
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
        console.error('Error in advanced confluence listener:', e);
      }
    });
  }

  private persistCache() {
    try {
      const obj: Record<string, AdvancedConfluenceData> = {};
      this.cache.forEach((v, k) => {
        obj[k] = v;
      });
      sessionStorage.setItem('adv_confluence_cache_v1', JSON.stringify(obj));
    } catch {}
  }

  /**
   * Permanent polling cycle every 15 seconds
   */
  private async pollPermanentCycle() {
    const symbolsToPoll = new Set<string>();

    // 1. All active positions
    const positions = binanceWs.getPositions();
    if (positions && positions.length > 0) {
      positions.forEach((p) => {
        if (p.symbol) symbolsToPoll.add(p.symbol.trim().toUpperCase());
      });
    }

    // 2. Active symbol in WebSocket
    const currentSym = binanceWs.getCurrentSymbol();
    if (currentSym) symbolsToPoll.add(currentSym.trim().toUpperCase());

    // 3. Fallback popular symbols if no active positions
    if (symbolsToPoll.size === 0) {
      symbolsToPoll.add('BTCUSDT');
      symbolsToPoll.add('ETHUSDT');
      symbolsToPoll.add('SOLUSDT');
    }

    // Execute fetches
    for (const sym of symbolsToPoll) {
      this.fetchKlinesAndAnalyze(sym);
    }
  }

  /**
   * Synchronous accessor for immediate rendering
   */
  public getConfluence(symbol: string, isLong?: boolean): AdvancedConfluenceData {
    const clean = symbol.trim().replace(/[^A-Z0-9]/g, '').toUpperCase();
    const cached = this.cache.get(clean);

    if (cached) {
      // Trigger background update if stale (>14s)
      if (Date.now() - cached.lastUpdated > 14000 && !this.inFlight.has(clean)) {
        this.fetchKlinesAndAnalyze(clean);
      }
      return cached;
    }

    // Build immediate baseline while HTTP call is made
    const baseline = this.generateBaseline(clean);
    this.cache.set(clean, baseline);
    this.fetchKlinesAndAnalyze(clean);
    return baseline;
  }

  /**
   * Helper: Calculates Exponential Moving Average (EMA)
   */
  public calculateEMA(closes: number[], period: number): number {
    if (!closes || closes.length === 0) return 0;
    if (closes.length < period) {
      // Simple fallback average
      return closes.reduce((a, b) => a + b, 0) / closes.length;
    }

    const k = 2 / (period + 1);
    // Start with SMA of first 'period' elements
    let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = period; i < closes.length; i++) {
      ema = closes[i] * k + ema * (1 - k);
    }
    return ema;
  }

  /**
   * Helper: Calculates RSI (14 periodos)
   */
  public calculateRSI(closes: number[], period = 14): {
    rsi: number;
    status: 'oversold' | 'neutral' | 'overbought';
    slope: 'up' | 'down' | 'flat';
  } {
    if (!closes || closes.length <= period) {
      return { rsi: 50, status: 'neutral', slope: 'flat' };
    }

    let gains = 0;
    let losses = 0;

    // First period
    for (let i = 1; i <= period; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff >= 0) gains += diff;
      else losses += Math.abs(diff);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Subsequent periods with Wilder's smoothing
    let prevRsi = 50;
    for (let i = period + 1; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      const gain = diff > 0 ? diff : 0;
      const loss = diff < 0 ? Math.abs(diff) : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (i === closes.length - 2) {
        const rsPrev = avgLoss === 0 ? 100 : avgGain / avgLoss;
        prevRsi = 100 - 100 / (1 + rsPrev);
      }
    }

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const finalRsi = Number((100 - 100 / (1 + rs)).toFixed(1));

    const status: 'oversold' | 'neutral' | 'overbought' =
      finalRsi >= 70 ? 'overbought' : finalRsi <= 30 ? 'oversold' : 'neutral';

    const slope: 'up' | 'down' | 'flat' =
      finalRsi > prevRsi + 0.3 ? 'up' : finalRsi < prevRsi - 0.3 ? 'down' : 'flat';

    return { rsi: finalRsi, status, slope };
  }

  /**
   * Helper: Calculates ATR (14 periodos)
   */
  public calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period = 14
  ): { atr: number; atrPercent: number } {
    if (!closes || closes.length <= period || !highs || !lows) {
      const last = closes[closes.length - 1] || 1;
      return { atr: last * 0.015, atrPercent: 1.5 };
    }

    const trs: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      trs.push(tr);
    }

    // Simple / Wilder RMA of TR
    let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trs.length; i++) {
      atr = (atr * (period - 1) + trs[i]) / period;
    }

    const currentClose = closes[closes.length - 1] || 1;
    const atrPercent = (atr / currentClose) * 100;

    return {
      atr: Number(atr.toFixed(4)),
      atrPercent: Number(atrPercent.toFixed(2)),
    };
  }

  /**
   * Evaluates the 4 Layers of Technical Confirmation & Sizing
   */
  public evaluate4Layers(
    price: number,
    ema50: number,
    ema200: number,
    rsi14: number,
    rsiSlope: 'up' | 'down' | 'flat',
    atr14: number,
    atr14Percent: number,
    isLong: boolean
  ): ConfluenceLayersAudit {
    // 1. Layer 1: Macro Trend EMA (EMA 50 vs EMA 200 & Price)
    const isBullishTrend = price >= ema50 && ema50 >= ema200;
    const isBearishTrend = price <= ema50 && ema50 <= ema200;
    let l1Score = 0;
    let l1State: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let l1Desc = '';
    let l1Details = '';

    if (isLong) {
      if (isBullishTrend) {
        l1Score = 1;
        l1State = 'bullish';
        l1Desc = 'Estructura Macro Alcista Fuerte';
        l1Details = `Precio ($${price.toFixed(2)}) > EMA 50 ($${ema50.toFixed(2)}) > EMA 200 ($${ema200.toFixed(2)})`;
      } else if (price >= ema50) {
        l1Score = 0.75;
        l1State = 'bullish';
        l1Desc = 'Soporte sobre EMA 50 Activo';
        l1Details = `Precio por encima de EMA 50 ($${ema50.toFixed(2)}). EMA 200 en $${ema200.toFixed(2)}`;
      } else {
        l1Score = 0;
        l1State = 'bearish';
        l1Desc = 'Presión Bajista Bajo EMAs';
        l1Details = `Precio ($${price.toFixed(2)}) por debajo de EMA 50 ($${ema50.toFixed(2)})`;
      }
    } else {
      // Short position
      if (isBearishTrend) {
        l1Score = 1;
        l1State = 'bearish';
        l1Desc = 'Estructura Macro Bajista Fuerte';
        l1Details = `Precio ($${price.toFixed(2)}) < EMA 50 ($${ema50.toFixed(2)}) < EMA 200 ($${ema200.toFixed(2)})`;
      } else if (price <= ema50) {
        l1Score = 0.75;
        l1State = 'bearish';
        l1Desc = 'Resistencia bajo EMA 50 Activa';
        l1Details = `Precio bajo EMA 50 ($${ema50.toFixed(2)}). EMA 200 en $${ema200.toFixed(2)}`;
      } else {
        l1Score = 0;
        l1State = 'bullish';
        l1Desc = 'Presión Alcista sobre EMAs';
        l1Details = `Precio ($${price.toFixed(2)}) por encima de EMA 50 ($${ema50.toFixed(2)})`;
      }
    }

    // 2. Layer 2: RSI 14 Momentum
    let l2Score = 0;
    let l2State: 'favorable' | 'neutral' | 'unfavorable' = 'neutral';
    let l2Desc = '';
    let l2Details = '';

    if (isLong) {
      if (rsi14 <= 32) {
        l2Score = 1;
        l2State = 'favorable';
        l2Desc = 'RSI en Sobreventa Extrema (Oportunidad Rebote)';
        l2Details = `RSI 14 = ${rsi14} (Nivel <32 favorece compras de alta convicción)`;
      } else if (rsi14 >= 35 && rsi14 <= 62 && rsiSlope !== 'down') {
        l2Score = 1;
        l2State = 'favorable';
        l2Desc = 'RSI en Rango Óptimo de Expansión Alcista';
        l2Details = `RSI 14 = ${rsi14} con momentum ascendente`;
      } else if (rsi14 > 72) {
        l2Score = 0;
        l2State = 'unfavorable';
        l2Desc = 'RSI en Sobrecompra Severa (>72)';
        l2Details = `Riesgo inminente de pullback o agotamiento de demanda`;
      } else {
        l2Score = 0.5;
        l2State = 'neutral';
        l2Desc = 'RSI en Zona Neutral';
        l2Details = `RSI 14 = ${rsi14}`;
      }
    } else {
      // Short
      if (rsi14 >= 68) {
        l2Score = 1;
        l2State = 'favorable';
        l2Desc = 'RSI en Sobrecompra Extrema (Oportunidad Short)';
        l2Details = `RSI 14 = ${rsi14} (Nivel >68 favorece ventas por agotamiento)`;
      } else if (rsi14 >= 38 && rsi14 <= 65 && rsiSlope !== 'up') {
        l2Score = 1;
        l2State = 'favorable';
        l2Desc = 'RSI en Rango Óptimo de Expansión Bajista';
        l2Details = `RSI 14 = ${rsi14} con momentum descendente`;
      } else if (rsi14 < 28) {
        l2Score = 0;
        l2State = 'unfavorable';
        l2Desc = 'RSI en Sobreventa Severa (<28)';
        l2Details = `Riesgo de rebote violento en contra del short`;
      } else {
        l2Score = 0.5;
        l2State = 'neutral';
        l2Desc = 'RSI en Zona Neutral';
        l2Details = `RSI 14 = ${rsi14}`;
      }
    }

    // 3. Layer 3: ATR 14 Volatility & Range
    let l3Score = 0;
    let l3State: 'optimal' | 'moderate' | 'extreme' = 'moderate';
    let l3Desc = '';
    let l3Details = '';

    if (atr14Percent >= 0.8 && atr14Percent <= 3.8) {
      l3Score = 1;
      l3State = 'optimal';
      l3Desc = 'Volatilidad ATR Óptima y Controlada';
      l3Details = `ATR 14 = $${atr14.toFixed(2)} (${atr14Percent}% del precio). Rango predecible.`;
    } else if (atr14Percent < 0.8) {
      l3Score = 0.7;
      l3State = 'moderate';
      l3Desc = 'Baja Volatilidad ATR (Consolidación Estrecha)';
      l3Details = `ATR 14 = $${atr14.toFixed(2)} (${atr14Percent}%). Posible acumulación antes de breakout.`;
    } else {
      l3Score = 0.3;
      l3State = 'extreme';
      l3Desc = 'Alta Turbulencia ATR (>3.8%)';
      l3Details = `ATR 14 = $${atr14.toFixed(2)} (${atr14Percent}%). Requiere stops más amplios y apalancamiento reducido.`;
    }

    // 4. Layer 4: Directional Alignment
    let l4Score = 0;
    let l4State: 'aligned' | 'partial' | 'divergent' = 'partial';
    let l4Desc = '';
    let l4Details = '';

    const alignmentSum = l1Score + l2Score + l3Score;
    if (alignmentSum >= 2.5) {
      l4Score = 1;
      l4State = 'aligned';
      l4Desc = 'Alineación Técnica Completa';
      l4Details = `Las 3 métricas centrales (EMAs, RSI, ATR) confirman la dirección ${isLong ? 'LONG' : 'SHORT'}.`;
    } else if (alignmentSum >= 1.5) {
      l4Score = 0.5;
      l4State = 'partial';
      l4Desc = 'Confluencia Parcial / Precaución';
      l4Details = `Señales mixtas entre tendencia EMA y momentum oscilador.`;
    } else {
      l4Score = 0;
      l4State = 'divergent';
      l4Desc = 'Divergencia Técnica Contracorriente';
      l4Details = `El mercado actual presenta resistencia fuerte contra la postura ${isLong ? 'LONG' : 'SHORT'}.`;
    }

    const totalScore = Number((l1Score + l2Score + l3Score + l4Score).toFixed(1));
    const confluencePercentage = Math.round((totalScore / 4) * 100);

    let trafficLight: TrafficLightState = 'YELLOW';
    let summaryLabel = 'Confluencia Moderada';

    if (totalScore >= 3.0) {
      trafficLight = 'GREEN';
      summaryLabel = '🟢 Semáforo VERDE: Confluencia Fuerte';
    } else if (totalScore <= 1.5) {
      trafficLight = 'RED';
      summaryLabel = '🔴 Semáforo ROJO: Riesgo Alto / Contracorriente';
    } else {
      trafficLight = 'YELLOW';
      summaryLabel = '🟡 Semáforo AMARILLO: Precaución / Rango';
    }

    return {
      layer1MacroEma: {
        passed: l1Score >= 0.7,
        score: l1Score,
        description: l1Desc,
        details: l1Details,
        state: l1State,
      },
      layer2RsiMomentum: {
        passed: l2Score >= 0.7,
        score: l2Score,
        description: l2Desc,
        details: l2Details,
        state: l2State,
      },
      layer3AtrVolatility: {
        passed: l3Score >= 0.7,
        score: l3Score,
        description: l3Desc,
        details: l3Details,
        state: l3State,
      },
      layer4DirectionalAlignment: {
        passed: l4Score >= 0.7,
        score: l4Score,
        description: l4Desc,
        details: l4Details,
        state: l4State,
      },
      totalScore,
      confluencePercentage,
      trafficLight,
      summaryLabel,
    };
  }

  /**
   * Calculates optimal position size based on current ATR volatility
   */
  public calculateOptimalPositionSize(
    price: number,
    atr14: number,
    atr14Percent: number
  ): OptimalPositionSizing {
    const balance = binanceWs.getBalance();
    const accountCapitalUsdt = balance.totalWalletBalance > 0 ? balance.totalWalletBalance : 1000;
    const riskPercent = 1.0; // 1% capital risk per trade
    const riskAmountUsdt = (accountCapitalUsdt * riskPercent) / 100;

    const stopMultiplier = 1.5;
    const stopDistanceUsdt = Number((atr14 * stopMultiplier).toFixed(4));
    const stopDistancePercent = price > 0 ? (stopDistanceUsdt / price) * 100 : 2.0;

    // Position Size = Risk Amount / (Stop Loss % / 100)
    const optimalPositionSizeUsdt =
      stopDistancePercent > 0 ? Number(((riskAmountUsdt / (stopDistancePercent / 100))).toFixed(2)) : 100;

    const optimalContracts = price > 0 ? Number((optimalPositionSizeUsdt / price).toFixed(4)) : 1;

    // Recommended safe leverage based on ATR
    let recommendedLeverage = 5;
    let volatilityRegime: 'Baja Volatilidad' | 'Volatilidad Normal' | 'Alta Volatilidad' = 'Volatilidad Normal';

    if (atr14Percent > 4.0) {
      recommendedLeverage = 2;
      volatilityRegime = 'Alta Volatilidad';
    } else if (atr14Percent > 2.5) {
      recommendedLeverage = 3;
      volatilityRegime = 'Volatilidad Normal';
    } else {
      recommendedLeverage = 5;
      volatilityRegime = 'Baja Volatilidad';
    }

    const marginRequiredUsdt = Number((optimalPositionSizeUsdt / recommendedLeverage).toFixed(2));

    return {
      accountCapitalUsdt,
      riskPercent,
      riskAmountUsdt,
      atrValue: atr14,
      atrPercent: atr14Percent,
      stopDistanceUsdt,
      stopDistancePercent: Number(stopDistancePercent.toFixed(2)),
      optimalPositionSizeUsdt,
      optimalContracts,
      recommendedLeverage,
      marginRequiredUsdt,
      volatilityRegime,
    };
  }

  /**
   * Fetches real klines from Binance API and executes technical pipeline
   */
  public async fetchKlinesAndAnalyze(symbol: string) {
    const clean = symbol.trim().replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (this.inFlight.has(clean)) return;

    this.inFlight.add(clean);

    try {
      const endpoints = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${clean}&interval=15m&limit=250`,
        `https://api.binance.com/api/v3/klines?symbol=${clean}&interval=15m&limit=250`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${clean}&interval=15m&limit=250`,
      ];

      let rawKlines: any[] | null = null;

      for (const url of endpoints) {
        try {
          const res = await binanceFetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 30) {
              rawKlines = data;
              break;
            }
          }
        } catch {}
      }

      if (!rawKlines || rawKlines.length < 30) {
        this.inFlight.delete(clean);
        return;
      }

      // Process klines array
      const closes: number[] = rawKlines.map((k) => parseFloat(k[4]));
      const highs: number[] = rawKlines.map((k) => parseFloat(k[2]));
      const lows: number[] = rawKlines.map((k) => parseFloat(k[3]));
      const currentPrice = closes[closes.length - 1];

      // 1. Calculate Core Indicators
      const { rsi: rsi14, status: rsiStatus, slope: rsiSlope } = this.calculateRSI(closes, 14);
      const { atr: atr14, atrPercent: atr14Percent } = this.calculateATR(highs, lows, closes, 14);
      const ema50 = Number(this.calculateEMA(closes, 50).toFixed(4));
      const ema200 = Number(this.calculateEMA(closes, 200).toFixed(4));

      // 2. EMA Relationships
      let emaTrend: 'Bullish' | 'Bearish' | 'Golden Cross' | 'Death Cross' | 'Neutral' = 'Neutral';
      if (currentPrice > ema50 && ema50 > ema200) emaTrend = 'Bullish';
      else if (currentPrice < ema50 && ema50 < ema200) emaTrend = 'Bearish';
      else if (ema50 > ema200) emaTrend = 'Golden Cross';
      else if (ema50 < ema200) emaTrend = 'Death Cross';

      const priceVsEma50Pct = Number((((currentPrice - ema50) / ema50) * 100).toFixed(2));
      const priceVsEma200Pct = Number((((currentPrice - ema200) / ema200) * 100).toFixed(2));
      const emaSpreadPct = Number((((ema50 - ema200) / ema200) * 100).toFixed(2));

      // 3. Evaluate 4 Layers of Confluence (Long & Short)
      const layersLong = this.evaluate4Layers(
        currentPrice,
        ema50,
        ema200,
        rsi14,
        rsiSlope,
        atr14,
        atr14Percent,
        true
      );
      const layersShort = this.evaluate4Layers(
        currentPrice,
        ema50,
        ema200,
        rsi14,
        rsiSlope,
        atr14,
        atr14Percent,
        false
      );

      // 4. Calculate Optimal Sizing based on ATR
      const optimalSizing = this.calculateOptimalPositionSize(currentPrice, atr14, atr14Percent);

      const result: AdvancedConfluenceData = {
        symbol: clean,
        lastPrice: currentPrice,
        lastUpdated: Date.now(),
        isFetching: false,
        timeframe: '15m',
        candleCount: closes.length,
        rsi14,
        rsiStatus,
        rsiSlope,
        atr14,
        atr14Percent,
        ema50,
        ema200,
        emaTrend,
        priceVsEma50Pct,
        priceVsEma200Pct,
        emaSpreadPct,
        layersLong,
        layersShort,
        optimalSizing,
      };

      this.cache.set(clean, result);
      this.persistCache();
      this.notify();
    } catch (err) {
      console.warn('Error fetching klines for advanced confluence:', err);
    } finally {
      this.inFlight.delete(clean);
    }
  }

  /**
   * Creates an immediate baseline dataset when first called
   */
  private generateBaseline(symbol: string): AdvancedConfluenceData {
    const live = livePriceService.getPriceData(symbol);
    const p = live.price || 100;
    const isPositive = live.change24hPercent >= 0;

    const ema50 = isPositive ? p * 0.985 : p * 1.015;
    const ema200 = isPositive ? p * 0.965 : p * 1.035;
    const rsi14 = isPositive ? 54.2 : 44.8;
    const atr14 = Number((p * 0.018).toFixed(4));
    const atr14Percent = 1.8;

    const layersLong = this.evaluate4Layers(p, ema50, ema200, rsi14, 'flat', atr14, atr14Percent, true);
    const layersShort = this.evaluate4Layers(p, ema50, ema200, rsi14, 'flat', atr14, atr14Percent, false);
    const optimalSizing = this.calculateOptimalPositionSize(p, atr14, atr14Percent);

    return {
      symbol,
      lastPrice: p,
      lastUpdated: Date.now(),
      isFetching: true,
      timeframe: '15m',
      candleCount: 60,
      rsi14,
      rsiStatus: 'neutral',
      rsiSlope: 'flat',
      atr14,
      atr14Percent,
      ema50,
      ema200,
      emaTrend: isPositive ? 'Bullish' : 'Bearish',
      priceVsEma50Pct: isPositive ? 1.5 : -1.5,
      priceVsEma200Pct: isPositive ? 3.5 : -3.5,
      emaSpreadPct: isPositive ? 2.0 : -2.0,
      layersLong,
      layersShort,
      optimalSizing,
    };
  }
}

export const advancedTechnicalConfluenceService = new AdvancedTechnicalConfluenceService();
