import { PositionRisk, OpenOrder } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { evaluateStrategyConfluence } from './confluenceEngine';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk } from './sheetParser';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { StrategyFullConfluenceResult } from '../types/confluence';

export type PositionSortMode =
  | 'best_quality'       // Mejor a Peor (Confluencia + R:B) - DEFAULT
  | 'confluence_desc'    // Mayor Confluencia (10 Factores)
  | 'rb_desc'            // Mayor Ratio R:B
  | 'pnl_desc'           // Mayor PnL ($)
  | 'stable';            // Orden Original de Apertura

export interface ScoredPosition {
  position: PositionRisk;
  symbol: string;
  isLong: boolean;
  qty: number;
  entryPrice: number;
  marketPrice: number;
  pnl: number;
  roe: number;
  margin: number;

  // Strategy relation
  strategy: GoogleSheetStrategyRow | null;
  strategyId: string | null;

  // Confluence metrics (10 Factors)
  confluence: StrategyFullConfluenceResult;
  confluenceMetCount: number; // 0 - 10
  confluencePercent: number;  // 0 - 100%
  confluenceTier: 'MAX_CONFLUENCE' | 'STRONG' | 'MODERATE' | 'WEAK';
  confluenceLabel: string;
  confluenceColor: string;

  // R:B metrics
  tpValue: number | undefined;
  slValue: number | undefined;
  hasTP: boolean;
  hasSL: boolean;
  effectiveRB: number; // e.g. 3.4
  rbFormatted: string; // e.g. "1:3.4" or "Sin SL"
  rbQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  rbSource: 'ORDER_TPSL' | 'STRATEGY' | 'ESTIMATED';

  // Composite quality score (0 - 100)
  qualityScore: number;
  qualityTier: 'ELITE' | 'STRONG' | 'MODERATE' | 'POOR';
  qualityLabel: string;
  qualityColor: string;

  // Dynamic ranking
  rank: number; // 1 = Mejor, ..., N = Peor
  isBest: boolean;
  rankBadgeClass: string;
}

/**
 * Extracts TP and SL from position and open conditional orders
 */
export function getPositionEffectiveTPSL(pos: PositionRisk, openOrders: OpenOrder[]) {
  const isLong = pos.positionAmt > 0;
  const matchingOrders = openOrders.filter(
    (o) => o.symbol === pos.symbol && o.status !== 'CANCELED' && o.status !== 'EXPIRED' && o.status !== 'FILLED'
  );

  const tpOrder = matchingOrders.find((o) => {
    const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
    if (!isCloseSide) return false;
    const typeStr = String(o.type || '').toUpperCase();
    if (typeStr.includes('TAKE_PROFIT') || o.clientOrderId?.includes('TP-')) return true;
    const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
    return trig > 0 && (isLong ? trig > pos.entryPrice : trig < pos.entryPrice);
  });

  const slOrder = matchingOrders.find((o) => {
    const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
    if (!isCloseSide) return false;
    const typeStr = String(o.type || '').toUpperCase();
    if (typeStr.includes('STOP') || o.clientOrderId?.includes('SL-')) return true;
    const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
    return trig > 0 && (isLong ? trig < pos.entryPrice : trig > pos.entryPrice);
  });

  const tpValue = pos.takeProfit || (tpOrder ? (tpOrder.stopPrice && tpOrder.stopPrice > 0 ? tpOrder.stopPrice : tpOrder.price) : undefined);
  const slValue = pos.stopLoss || (slOrder ? (slOrder.stopPrice && slOrder.stopPrice > 0 ? slOrder.stopPrice : slOrder.price) : undefined);

  return { tpValue, slValue, tpOrder, slOrder };
}

/**
 * Evaluates full confluence, R:B ratio, and composite quality score for a single position
 */
export function scoreSinglePosition(
  pos: PositionRisk,
  openOrders: OpenOrder[],
  allStrategies: GoogleSheetStrategyRow[],
  overrideMarketPrice?: number
): ScoredPosition {
  const isLong = pos.positionAmt > 0;
  const qty = Math.abs(pos.positionAmt || 0);

  // Live market price resolution
  const livePrice = livePriceService.getPrice(pos.symbol);
  const currentPrice = overrideMarketPrice && overrideMarketPrice > 0
    ? overrideMarketPrice
    : livePrice && livePrice > 0
    ? livePrice
    : binanceWs.getTicker().symbol === pos.symbol && binanceWs.getTicker().lastPrice > 0
    ? binanceWs.getTicker().lastPrice
    : pos.markPrice > 0
    ? pos.markPrice
    : pos.entryPrice || 1;

  const entryPrice = pos.entryPrice > 0 ? pos.entryPrice : currentPrice;

  // Live PnL and ROE calculation
  const calculatedPnl = entryPrice > 0 && currentPrice > 0 && qty > 0
    ? (isLong ? (currentPrice - entryPrice) * qty : (entryPrice - currentPrice) * qty)
    : (pos.unRealizedProfit || 0);
  const pnl = Number(calculatedPnl.toFixed(2));

  const margin = pos.isolatedMargin > 0
    ? pos.isolatedMargin
    : ((qty * entryPrice) / Math.max(1, pos.leverage || 2));
  const roe = margin > 0 ? (pnl / margin) * 100 : (pos.roePercent || 0);

  // 1. Resolve strategy link
  const effStratId = pos.strategyId || binanceWs.getLinkedStrategyForSymbol(pos.symbol)?.strategyId;
  const cleanSym = pos.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();

  let matchedStrat = allStrategies.find(
    (s) =>
      (effStratId &&
        (s.noEstrategia.toUpperCase() === effStratId.toUpperCase() ||
          s.nombreEstrategia.toUpperCase() === effStratId.toUpperCase())) ||
      s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym
  ) || null;

  // 2. Extract effective TP / SL
  const { tpValue, slValue } = getPositionEffectiveTPSL(pos, openOrders);
  const hasSL = Boolean(slValue && slValue > 0);
  const hasTP = Boolean(tpValue && tpValue > 0);

  // 3. Compute Confluence (10 factors)
  let confluence: StrategyFullConfluenceResult;
  if (matchedStrat) {
    try {
      const parsedPrices = parsePricesFromStrategy(matchedStrat);
      confluence = evaluateStrategyConfluence(matchedStrat, parsedPrices, currentPrice);
    } catch {
      confluence = evaluateStrategyConfluence(matchedStrat, undefined, currentPrice);
    }
  } else {
    // Generate synthetic technical evaluation strategy for this pair
    const syntheticStrat: GoogleSheetStrategyRow = {
      noEstrategia: pos.symbol,
      fecha: new Date().toISOString().split('T')[0],
      nombreEstrategia: `Posición ${pos.symbol}`,
      par: pos.symbol,
      temporalidad: '4H / 1D',
      tipoDeOrden: 'Límite / SL / TP',
      indicadoresClave: 'RSI, EMA 20/50, MACD, Bollinger, Flujo Taker',
      reglasDeEntrada: `Entrada 1 a $${entryPrice.toFixed(4)}`,
      reglasDeSalidaTP: tpValue
        ? `TP1 (100%) @ $${tpValue.toFixed(4)}`
        : `TP1 (100%) @ $${(entryPrice * (isLong ? 1.05 : 0.95)).toFixed(4)}`,
      gestionDeRiesgoStopLoss: slValue
        ? `SL Global @ $${slValue.toFixed(4)}`
        : `SL Global @ $${(entryPrice * (isLong ? 0.97 : 1.03)).toFixed(4)}`,
      comentariosBacktesting: 'Evaluación técnica e institucional automática en vivo',
      estado: 'Live+',
    };
    confluence = evaluateStrategyConfluence(syntheticStrat, undefined, currentPrice);
  }

  const confluenceMetCount = confluence.metFactorsCount;
  const confluencePercent = confluence.confluenceScorePercent;
  const confluenceTier = confluence.overallTier;
  const confluenceLabel = confluence.tierLabel;
  const confluenceColor = confluence.tierColor;

  // 4. Calculate R:B (Risk:Benefit)
  let liveRB = 0;
  let rbSource: 'ORDER_TPSL' | 'STRATEGY' | 'ESTIMATED' = 'ESTIMATED';

  if (entryPrice > 0 && slValue && slValue > 0 && tpValue && tpValue > 0) {
    const risk = isLong ? entryPrice - slValue : slValue - entryPrice;
    const reward = isLong ? tpValue - entryPrice : entryPrice - tpValue;

    if (risk > 0 && reward > 0) {
      liveRB = Number((reward / risk).toFixed(2));
      rbSource = 'ORDER_TPSL';
    }
  }

  let stratRB = 0;
  if (matchedStrat) {
    try {
      const parsedRR = calculateStrategyRewardToRisk(matchedStrat);
      stratRB = parsedRR.ratio;
    } catch {
      stratRB = 0;
    }
  }

  let effectiveRB = 0;
  if (liveRB > 0) {
    effectiveRB = liveRB;
    rbSource = 'ORDER_TPSL';
  } else if (stratRB > 0) {
    effectiveRB = stratRB;
    rbSource = 'STRATEGY';
  } else if (hasSL && !hasTP) {
    // Estimación técnica si tiene SL pero no TP definido aún
    effectiveRB = 1.5;
    rbSource = 'ESTIMATED';
  } else {
    // Sin SL = Riesgo infinito/indefinido (R:B 0)
    effectiveRB = 0;
    rbSource = 'ESTIMATED';
  }

  let rbFormatted: string;
  let rbQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';

  if (!hasSL) {
    rbFormatted = 'Sin SL';
    rbQuality = 'POOR';
  } else if (effectiveRB >= 2.5) {
    rbFormatted = `1:${effectiveRB.toFixed(1)}`;
    rbQuality = 'EXCELLENT';
  } else if (effectiveRB >= 1.8) {
    rbFormatted = `1:${effectiveRB.toFixed(1)}`;
    rbQuality = 'GOOD';
  } else if (effectiveRB >= 1.2) {
    rbFormatted = `1:${effectiveRB.toFixed(1)}`;
    rbQuality = 'FAIR';
  } else {
    rbFormatted = effectiveRB > 0 ? `1:${effectiveRB.toFixed(1)}` : 'Bajo R:B';
    rbQuality = 'POOR';
  }

  // 5. Composite Quality Score (0 to 100)
  // Confluence weight: 60% (0 to 60 pts)
  const confluencePts = (confluencePercent / 100) * 60;

  // R:B weight: 40% (0 to 40 pts)
  let rbPts = 0;
  if (hasSL) {
    if (effectiveRB >= 3.5) {
      rbPts = 40;
    } else if (effectiveRB >= 2.5) {
      rbPts = 30 + ((effectiveRB - 2.5) / 1.0) * 10;
    } else if (effectiveRB >= 1.8) {
      rbPts = 20 + ((effectiveRB - 1.8) / 0.7) * 10;
    } else if (effectiveRB >= 1.2) {
      rbPts = 12 + ((effectiveRB - 1.2) / 0.6) * 8;
    } else if (effectiveRB > 0) {
      rbPts = Math.max(2, effectiveRB * 8);
    }
  }

  // Risk adjustment penalties & bonuses
  let adjustments = 0;
  if (!hasSL) {
    adjustments -= 30; // Severe penalty: missing SL violates Discipline #3
  }
  if (!hasTP) {
    adjustments -= 6;  // Penalty: no target defined
  }
  if (pnl > 0) {
    adjustments += 5;  // Bonus: already winning
  }

  const rawScore = confluencePts + rbPts + adjustments;
  const qualityScore = Math.max(0, Math.min(100, Math.round(rawScore)));

  let qualityTier: 'ELITE' | 'STRONG' | 'MODERATE' | 'POOR';
  let qualityLabel: string;
  let qualityColor: string;

  if (qualityScore >= 80) {
    qualityTier = 'ELITE';
    qualityLabel = 'Calidad Élite (Alta Probabilidad)';
    qualityColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/50';
  } else if (qualityScore >= 65) {
    qualityTier = 'STRONG';
    qualityLabel = 'Calidad Fuerte (Favorable)';
    qualityColor = 'text-emerald-300 bg-emerald-950/60 border-emerald-700/50';
  } else if (qualityScore >= 45) {
    qualityTier = 'MODERATE';
    qualityLabel = 'Calidad Moderada (Vigilar)';
    qualityColor = 'text-amber-300 bg-amber-950/60 border-amber-500/40';
  } else {
    qualityTier = 'POOR';
    qualityLabel = 'Baja Calidad (Riesgo Elevado)';
    qualityColor = 'text-rose-400 bg-rose-950/70 border-rose-600/50';
  }

  return {
    position: pos,
    symbol: pos.symbol,
    isLong,
    qty,
    entryPrice,
    marketPrice: currentPrice,
    pnl,
    roe,
    margin,
    strategy: matchedStrat,
    strategyId: effStratId || (matchedStrat ? matchedStrat.noEstrategia : null),
    confluence,
    confluenceMetCount,
    confluencePercent,
    confluenceTier,
    confluenceLabel,
    confluenceColor,
    tpValue,
    slValue,
    hasTP,
    hasSL,
    effectiveRB,
    rbFormatted,
    rbQuality,
    rbSource,
    qualityScore,
    qualityTier,
    qualityLabel,
    qualityColor,
    rank: 1,
    isBest: false,
    rankBadgeClass: '',
  };
}

/**
 * Sorts and ranks all active positions from Best to Worst based on Confluence and R:B
 */
export function rankAndSortPositions(
  positions: PositionRisk[],
  openOrders: OpenOrder[],
  allStrategies: GoogleSheetStrategyRow[],
  sortMode: PositionSortMode = 'best_quality',
  marketPriceMap?: Record<string, number>
): ScoredPosition[] {
  if (positions.length === 0) return [];

  // Score each position
  const scored = positions.map((pos) =>
    scoreSinglePosition(pos, openOrders, allStrategies, marketPriceMap?.[pos.symbol])
  );

  // Sorting
  const sorted = [...scored].sort((a, b) => {
    if (sortMode === 'best_quality') {
      // 1. Composite quality score (Confluence 60% + R:B 40%)
      if (b.qualityScore !== a.qualityScore) {
        return b.qualityScore - a.qualityScore;
      }
      // 2. Confluence met factors count
      if (b.confluenceMetCount !== a.confluenceMetCount) {
        return b.confluenceMetCount - a.confluenceMetCount;
      }
      // 3. R:B ratio
      if (b.effectiveRB !== a.effectiveRB) {
        return b.effectiveRB - a.effectiveRB;
      }
      // 4. Unrealized PnL
      return b.pnl - a.pnl;
    }

    if (sortMode === 'confluence_desc') {
      if (b.confluenceMetCount !== a.confluenceMetCount) {
        return b.confluenceMetCount - a.confluenceMetCount;
      }
      if (b.effectiveRB !== a.effectiveRB) {
        return b.effectiveRB - a.effectiveRB;
      }
      return b.qualityScore - a.qualityScore;
    }

    if (sortMode === 'rb_desc') {
      if (b.effectiveRB !== a.effectiveRB) {
        return b.effectiveRB - a.effectiveRB;
      }
      if (b.confluenceMetCount !== a.confluenceMetCount) {
        return b.confluenceMetCount - a.confluenceMetCount;
      }
      return b.qualityScore - a.qualityScore;
    }

    if (sortMode === 'pnl_desc') {
      return b.pnl - a.pnl;
    }

    // 'stable': maintain original position index
    return 0;
  });

  // Assign final rank numbers and badge styling
  sorted.forEach((item, idx) => {
    item.rank = idx + 1;
    item.isBest = idx === 0;

    if (idx === 0) {
      item.rankBadgeClass = 'bg-amber-500 text-neutral-950 border-amber-400 font-extrabold shadow-sm ring-1 ring-amber-400/50';
    } else if (idx === 1) {
      item.rankBadgeClass = 'bg-slate-200 text-neutral-900 border-slate-300 font-bold';
    } else if (idx === 2) {
      item.rankBadgeClass = 'bg-amber-700/60 text-amber-100 border-amber-600/60 font-bold';
    } else if (!item.hasSL || item.qualityTier === 'POOR') {
      item.rankBadgeClass = 'bg-rose-950/80 text-rose-300 border-rose-700 font-semibold';
    } else {
      item.rankBadgeClass = 'bg-neutral-800 text-neutral-300 border-neutral-700 font-medium';
    }
  });

  return sorted;
}
