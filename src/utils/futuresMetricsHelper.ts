import { FuturesMarketMetrics, TickerData } from '../types/binance';

export type TrafficLightSignal = 'BULLISH' | 'NEUTRAL' | 'BEARISH';

export interface MetricFactorEvaluation {
  id: string;
  name: string;
  valueDisplay: string;
  verdict: string;
  status: 'bullish' | 'neutral' | 'bearish';
  weight: number;
}

export interface FuturesAnalysisResult {
  // 1. OI (Interés Abierto)
  oiLegend: 'Confirmación Tendencia Alcista' | 'Fuerte Presión Bajista';
  oiStatus: 'bullish' | 'bearish';
  oiDescription: string;
  oiValueFormatted: string;

  // 2. Funding Rate (Tasa de Financiación)
  fundingIsPositive: boolean;
  fundingLegend: string;
  fundingMeaning: string;
  fundingRiskAlert: string;
  fundingStatus: 'bullish' | 'neutral' | 'bearish';
  fundingValueFormatted: string;

  // 3. Taker Buy/Sell
  takerDominance: 'COMPRADOR' | 'VENDEDOR';
  takerLegend: string;
  takerMeaning: string;
  takerStatus: 'bullish' | 'neutral' | 'bearish';
  takerRatioFormatted: string;

  // 4. Top Trader Long/Short
  topDominance: 'LONGS' | 'SHORTS';
  topLegend: string;
  topMeaning: string;
  topStatus: 'bullish' | 'neutral' | 'bearish';
  topRatioFormatted: string;

  // 5. Semáforo Integral de Decisión Operativa
  trafficLight: TrafficLightSignal;
  trafficLightTitle: string;
  trafficLightAction: 'APTO PARA OPERAR LONG' | 'PRECAUCIÓN: ESPERAR CONFIRMACIÓN' | 'NO OPERAR LONG: RIESGO DE CAÍDA';
  trafficLightRecommendation: string;
  confidenceScore: number; // 0 to 100
  factors: MetricFactorEvaluation[];
}

export function analyzeFuturesMetrics(
  metrics: FuturesMarketMetrics | null | undefined,
  ticker: TickerData | null | undefined
): FuturesAnalysisResult {
  const priceChange = ticker?.change24hPercent ?? 0;
  const isPricePositive = priceChange >= 0;

  // 1. ANÁLISIS DE OI (Interés Abierto)
  // Regla solicitada: "en OI Poner 'Confirmacion Tendencia Alcista' o 'Fuerte Presion Bajista'"
  const isOiBullish = isPricePositive;
  const oiLegend: 'Confirmación Tendencia Alcista' | 'Fuerte Presión Bajista' = isOiBullish
    ? 'Confirmación Tendencia Alcista'
    : 'Fuerte Presión Bajista';

  const oiDescription = isOiBullish
    ? 'El capital entra al mercado respaldando la subida de precio. El interés abierto valida la continuidad alcista.'
    : 'Fuerte entrada de capital bajista o liquidaciones con precio cayendo. Presión vendedora activa en contratos.';

  const oiValueFormatted = metrics?.openInterestValueUsdt
    ? `$${(metrics.openInterestValueUsdt >= 1e9
        ? (metrics.openInterestValueUsdt / 1e9).toFixed(2) + 'B'
        : (metrics.openInterestValueUsdt / 1e6).toFixed(2) + 'M')} USDT`
    : '$0.00 USDT';

  // 2. ANÁLISIS DE FUNDING RATE
  // Regla solicitada: "En Funding si es negativo o positivo que significa"
  const rawFunding = metrics?.fundingRate ?? 0.0001;
  const fundingPercent = metrics?.fundingRatePercent ?? rawFunding * 100;
  const fundingIsPositive = rawFunding >= 0;

  let fundingLegend = '';
  let fundingMeaning = '';
  let fundingRiskAlert = '';
  let fundingStatus: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (fundingIsPositive) {
    fundingLegend = 'Funding Positivo (+)';
    fundingMeaning = 'Longs pagan periódicamente a los Shorts. La mayoría del mercado está posicionada al alza apalancada.';
    if (fundingPercent > 0.03) {
      fundingRiskAlert = 'Alerta de sobrecalentamiento alcista (>0.03%): riesgo elevado de corrección / Long Squeeze.';
      fundingStatus = 'bearish'; // Muy sobrecalentado es riesgo de caída
    } else {
      fundingRiskAlert = 'Tasa normal/saludable. El sentimiento alcista se mantiene dentro de parámetros sostenibles.';
      fundingStatus = 'bullish';
    }
  } else {
    fundingLegend = 'Funding Negativo (-)';
    fundingMeaning = 'Shorts pagan periódicamente a los Longs. La mayoría del mercado está vendiendo o posicionada a la baja.';
    fundingRiskAlert = 'Mercado saturado en cortos. Posibilidad latente de Short Squeeze (rebote alcista violento si rompe resistencia).';
    fundingStatus = isPricePositive ? 'bullish' : 'bearish';
  }

  const fundingValueFormatted = `${fundingIsPositive ? '+' : ''}${fundingPercent.toFixed(4)}%`;

  // 3. ANÁLISIS DE TAKER BUY/SELL
  // Regla solicitada: "tambien taker"
  const buyPct = metrics?.buyVolumePercent ?? 50;
  const sellPct = metrics?.sellVolumePercent ?? 50;
  const takerRatio = metrics?.buySellRatio ?? 1.0;

  let takerDominance: 'COMPRADOR' | 'VENDEDOR' = buyPct >= 50 ? 'COMPRADOR' : 'VENDEDOR';
  let takerLegend = '';
  let takerMeaning = '';
  let takerStatus: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (buyPct >= 52) {
    takerDominance = 'COMPRADOR';
    takerLegend = 'Dominio Comprador Agresivo (Taker Buy)';
    takerMeaning = 'Las órdenes a mercado están barriendo el Ask de forma activa. Compradores dispuestos a pagar precio actual sin esperar.';
    takerStatus = 'bullish';
  } else if (buyPct <= 48) {
    takerDominance = 'VENDEDOR';
    takerLegend = 'Dominio Vendedor Agresivo (Taker Sell)';
    takerMeaning = 'Las órdenes a mercado están barriendo el Bid de forma agresiva. Presión vendedora activa arrojando contratos a mercado.';
    takerStatus = 'bearish';
  } else {
    takerDominance = buyPct >= 50 ? 'COMPRADOR' : 'VENDEDOR';
    takerLegend = 'Flujo Equilibrado (50/50)';
    takerMeaning = 'Fuerzas de compra y venta a mercado balanceadas sin ventaja direccional marcada.';
    takerStatus = 'neutral';
  }

  const takerRatioFormatted = `${buyPct.toFixed(1)}% Compras / ${sellPct.toFixed(1)}% Ventas (${takerRatio.toFixed(2)}x)`;

  // 4. ANÁLISIS DE TOP TRADER LONG/SHORT
  // Regla solicitada: "y top L/S"
  const topLongPct = metrics?.topPositionLongPercent ?? 50;
  const topShortPct = metrics?.topPositionShortPercent ?? 50;
  const topRatio = metrics?.topPositionLongShortRatio ?? 1.0;

  let topDominance: 'LONGS' | 'SHORTS' = topRatio >= 1.0 ? 'LONGS' : 'SHORTS';
  let topLegend = '';
  let topMeaning = '';
  let topStatus: 'bullish' | 'neutral' | 'bearish' = 'neutral';

  if (topRatio >= 1.08) {
    topDominance = 'LONGS';
    topLegend = 'Ballenas Posicionadas en Long (Acumulación)';
    topMeaning = 'El 20% de cuentas con mayor capital tienen fuerte exposición neta en posiciones largas (interés institucional alcista).';
    topStatus = 'bullish';
  } else if (topRatio <= 0.92) {
    topDominance = 'SHORTS';
    topLegend = 'Ballenas Posicionadas en Short (Distribución / Cobertura)';
    topMeaning = 'El 20% de cuentas con mayor capital tienen mayor exposición neta en corto o están protegiéndose ante caída.';
    topStatus = 'bearish';
  } else {
    topDominance = topRatio >= 1.0 ? 'LONGS' : 'SHORTS';
    topLegend = 'Ballenas en Posicionamiento Equilibrado';
    topMeaning = 'Las cuentas mayores no tienen una inclinación extrema en este momento.';
    topStatus = 'neutral';
  }

  const topRatioFormatted = `${topRatio.toFixed(2)}:1 (${topLongPct.toFixed(1)}% Long / ${topShortPct.toFixed(1)}% Short)`;

  // 5. SEMÁFORO DE DECISIÓN OPERATIVA
  // Regla solicitada: "luego hacer un semaforo para identificar posible caida o continuacion alcista para operar o no"
  let bullishPoints = 0;
  const maxPoints = 100;

  // Factor 1: OI + Tendencia Precio (30 puntos)
  if (isPricePositive) {
    bullishPoints += 30;
  } else {
    bullishPoints += 5;
  }

  // Factor 2: Taker Buy/Sell (30 puntos)
  if (buyPct >= 55) {
    bullishPoints += 30;
  } else if (buyPct >= 51) {
    bullishPoints += 22;
  } else if (buyPct >= 49) {
    bullishPoints += 15;
  } else if (buyPct >= 45) {
    bullishPoints += 8;
  } else {
    bullishPoints += 0;
  }

  // Factor 3: Top Trader Long/Short (25 puntos)
  if (topRatio >= 1.15) {
    bullishPoints += 25;
  } else if (topRatio >= 1.0) {
    bullishPoints += 18;
  } else if (topRatio >= 0.9) {
    bullishPoints += 10;
  } else {
    bullishPoints += 3;
  }

  // Factor 4: Funding Rate Sostenible (15 puntos)
  if (fundingIsPositive && fundingPercent <= 0.02) {
    bullishPoints += 15; // Alcista moderado y saludable
  } else if (!fundingIsPositive && isPricePositive) {
    bullishPoints += 15; // Shorts pagando con precio alcista = combustible squeeze
  } else if (fundingPercent > 0.04) {
    bullishPoints += 2; // Sobrecalentamiento peligroso
  } else if (!fundingIsPositive && !isPricePositive) {
    bullishPoints += 4; // Todo bajista
  } else {
    bullishPoints += 8;
  }

  const confidenceScore = Math.min(100, Math.max(0, bullishPoints));

  let trafficLight: TrafficLightSignal = 'NEUTRAL';
  let trafficLightTitle = '';
  let trafficLightAction: 'APTO PARA OPERAR LONG' | 'PRECAUCIÓN: ESPERAR CONFIRMACIÓN' | 'NO OPERAR LONG: RIESGO DE CAÍDA' =
    'PRECAUCIÓN: ESPERAR CONFIRMACIÓN';
  let trafficLightRecommendation = '';

  if (confidenceScore >= 62) {
    // 🟢 VERDE
    trafficLight = 'BULLISH';
    trafficLightTitle = 'CONTINUACIÓN ALCISTA CONFIRMADA';
    trafficLightAction = 'APTO PARA OPERAR LONG';
    trafficLightRecommendation =
      'Confluencia alcista sólida: Flujo de compras agresivas (Taker), respaldo de capital en OI y ballenas en Long. Condiciones óptimas para abrir posiciones largas siguiendo la estrategia.';
  } else if (confidenceScore <= 38) {
    // 🔴 ROJO
    trafficLight = 'BEARISH';
    trafficLightTitle = 'POSIBLE CAÍDA / PRESIÓN BAJISTA ACTIVA';
    trafficLightAction = 'NO OPERAR LONG: RIESGO DE CAÍDA';
    trafficLightRecommendation =
      'Fuerte riesgo bajista: Dominio de presión vendedora a mercado, contratos bajo presión o ballenas posicionadas a la baja. Abstenerse de abrir longs; alto riesgo de liquidación o barrido hacia abajo.';
  } else {
    // 🟡 AMARILLO
    trafficLight = 'NEUTRAL';
    trafficLightTitle = 'ZONA NEUTRAL / SEÑALES MIXTAS';
    trafficLightAction = 'PRECAUCIÓN: ESPERAR CONFIRMACIÓN';
    trafficLightRecommendation =
      'Mercado en rango o con divergencia entre ballenas y flujo a mercado. No operar apalancado sin confirmación clara en soportes/resistencias. Esperar resolución direccional.';
  }

  const factors: MetricFactorEvaluation[] = [
    {
      id: 'oi',
      name: 'Interés Abierto (OI)',
      valueDisplay: oiLegend,
      verdict: isOiBullish ? 'Respaldo Alcista' : 'Presión Vendedora',
      status: isOiBullish ? 'bullish' : 'bearish',
      weight: 30,
    },
    {
      id: 'funding',
      name: 'Funding Rate',
      valueDisplay: `${fundingLegend} (${fundingValueFormatted})`,
      verdict: fundingStatus === 'bullish' ? 'Favorable' : fundingStatus === 'bearish' ? 'Alerta Riesgo' : 'Equilibrado',
      status: fundingStatus,
      weight: 15,
    },
    {
      id: 'taker',
      name: 'Taker Compra / Venta',
      valueDisplay: `${buyPct.toFixed(1)}% Compra vs ${sellPct.toFixed(1)}% Venta`,
      verdict: takerDominance === 'COMPRADOR' ? 'Presión Compradora' : 'Presión Vendedora',
      status: takerStatus,
      weight: 30,
    },
    {
      id: 'top',
      name: 'Top Traders L/S',
      valueDisplay: `${topRatio.toFixed(2)}:1 (${topLongPct.toFixed(1)}% L)`,
      verdict: topDominance === 'LONGS' ? 'Ballenas en Long' : 'Ballenas en Short',
      status: topStatus,
      weight: 25,
    },
  ];

  return {
    oiLegend,
    oiStatus: isOiBullish ? 'bullish' : 'bearish',
    oiDescription,
    oiValueFormatted,

    fundingIsPositive,
    fundingLegend,
    fundingMeaning,
    fundingRiskAlert,
    fundingStatus,
    fundingValueFormatted,

    takerDominance,
    takerLegend,
    takerMeaning,
    takerStatus,
    takerRatioFormatted,

    topDominance,
    topLegend,
    topMeaning,
    topStatus,
    topRatioFormatted,

    trafficLight,
    trafficLightTitle,
    trafficLightAction,
    trafficLightRecommendation,
    confidenceScore,
    factors,
  };
}
