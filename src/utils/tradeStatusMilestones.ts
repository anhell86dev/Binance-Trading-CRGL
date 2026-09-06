import { PositionRisk, OpenOrder } from '../types/binance';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { parsePricesFromStrategy } from '../utils/sheetParser';

export interface TradeMilestoneItem {
  id: 'E1' | 'E2' | 'E3' | 'TP1' | 'TP2' | 'BE' | 'SL';
  label: string;
  isHit: boolean;
  price?: number;
}

export interface TradeStatusAndPhase {
  phaseStep: 0 | 1 | 2 | 3 | 4;
  phaseName: string;
  phaseBadge: string;
  badgeClass: string;
  textClass: string;
  hasHitMilestone: boolean;
  milestonesHitText: string;
  milestones: TradeMilestoneItem[];
  nextMilestoneText: string;
  isBreakEvenActive: boolean;
  isSlHit: boolean;
  isTp1Hit: boolean;
  isTp2Hit: boolean;
  isE2Hit: boolean;
  isE3Hit: boolean;
  linkedStrategyId?: string;
  linkedStrategyName?: string;
}

/**
 * Evaluates a position and returns its current lifecycle phase and milestone progress.
 */
export function getTradeStatusAndPhase(
  position: PositionRisk,
  openOrders: OpenOrder[] = []
): TradeStatusAndPhase {
  const isLong = position.positionAmt > 0;
  const markPrice = position.markPrice || position.entryPrice || 0;
  const entryPrice = position.entryPrice || 0;

  // 1. Find linked or matching strategy
  const effectiveStrategyId =
    position.strategyId || binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyId;
  const effectiveStrategyName =
    position.strategyName || binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyName;

  const allStrategies = strategyService.getStrategies();
  const cleanSym = (position.symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();

  let linkedStrategy: GoogleSheetStrategyRow | undefined;
  if (effectiveStrategyId) {
    linkedStrategy = allStrategies.find(
      (s) =>
        s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase() ||
        s.nombreEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase()
    );
  }
  if (!linkedStrategy) {
    linkedStrategy = allStrategies.find(
      (s) =>
        s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym &&
        s.estado !== 'Obsoleto' &&
        s.estado !== 'Fallida'
    );
  }

  // 2. Parse price levels
  let slPrice = position.stopLoss || 0;
  let tp1Price = position.takeProfit || 0;
  let tp2Price = 0;
  let entry2Price = 0;
  let entry3Price = 0;

  if (linkedStrategy) {
    const prices = parsePricesFromStrategy(linkedStrategy);
    if (!slPrice && prices.slPrice) slPrice = prices.slPrice;
    if (!tp1Price && prices.tp1Price) tp1Price = prices.tp1Price;
    tp2Price = prices.tp2Price || 0;
    entry2Price = prices.entry2Price || 0;
    entry3Price = prices.entry3Price || 0;
  }

  // Fallbacks if not configured in strategy
  if (!tp1Price && entryPrice > 0) {
    tp1Price = isLong ? entryPrice * 1.025 : entryPrice * 0.975;
  }
  if (!tp2Price && entryPrice > 0) {
    tp2Price = isLong ? entryPrice * 1.05 : entryPrice * 0.95;
  }
  if (!slPrice && entryPrice > 0) {
    slPrice = isLong ? entryPrice * 0.985 : entryPrice * 1.015;
  }

  // 3. Persistent milestone tracking check
  let savedMilestones = { e2: false, e3: false, tp1: false, tp2: false };
  try {
    const saved = sessionStorage.getItem(`milestones_${position.symbol}_${position.entryPrice}`);
    if (saved) {
      savedMilestones = JSON.parse(saved);
    }
  } catch {}

  // 4. Milestone evaluations
  const isSlHit =
    (slPrice > 0 && (isLong ? markPrice <= slPrice : markPrice >= slPrice)) ||
    position.strategyStatus === 'Fallida' ||
    linkedStrategy?.estado === 'Fallida';

  const isTp2Hit =
    !isSlHit &&
    tp2Price > 0 &&
    (savedMilestones.tp2 || (isLong ? markPrice >= tp2Price : markPrice <= tp2Price));

  const isTp1Hit =
    !isSlHit &&
    (isTp2Hit ||
      (tp1Price > 0 && (savedMilestones.tp1 || (isLong ? markPrice >= tp1Price : markPrice <= tp1Price))));

  const isE3Hit =
    !isSlHit &&
    !isTp1Hit &&
    !isTp2Hit &&
    entry3Price > 0 &&
    (savedMilestones.e3 ||
      (isLong ? markPrice <= entry3Price && entry3Price > slPrice : markPrice >= entry3Price && entry3Price < slPrice));

  const isE2Hit =
    !isSlHit &&
    !isTp1Hit &&
    !isTp2Hit &&
    !isE3Hit &&
    entry2Price > 0 &&
    (savedMilestones.e2 ||
      (isLong ? markPrice <= entry2Price && entry2Price > slPrice : markPrice >= entry2Price && entry2Price < slPrice));

  // Break-Even check
  const isBreakEvenActive = Boolean(
    position.stopLoss &&
      ((isLong && position.stopLoss >= entryPrice * 0.998) ||
        (!isLong && position.stopLoss <= entryPrice * 1.002))
  );

  // Compile hit milestones
  const milestones: TradeMilestoneItem[] = [
    { id: 'E1', label: 'E1 Entrada', isHit: true, price: entryPrice },
    { id: 'E2', label: 'E2 DCA', isHit: isE2Hit || isE3Hit, price: entry2Price },
    { id: 'E3', label: 'E3 Carga', isHit: isE3Hit, price: entry3Price },
    { id: 'TP1', label: 'TP1 Objetivo', isHit: isTp1Hit, price: tp1Price },
    { id: 'TP2', label: 'TP2 Max', isHit: isTp2Hit, price: tp2Price },
    { id: 'BE', label: 'Break-Even', isHit: isBreakEvenActive, price: entryPrice },
    { id: 'SL', label: 'SL Impacto', isHit: isSlHit, price: slPrice },
  ];

  const hasHitMilestone = isTp1Hit || isTp2Hit || isE2Hit || isE3Hit || isBreakEvenActive || isSlHit;

  // Build summary text of milestones hit
  let milestonesHitText = '';
  if (isSlHit) {
    milestonesHitText = '🛑 SL Impactado (Invalidado)';
  } else if (isTp2Hit) {
    milestonesHitText = '🎯 TP1 & 🚀 TP2 Tocados • Trailing';
  } else if (isTp1Hit) {
    milestonesHitText = isBreakEvenActive
      ? '🎯 TP1 Tocado • 🛡️ Break-Even Activo'
      : '🎯 TP1 Tocado (Toma 50%)';
  } else if (isBreakEvenActive) {
    milestonesHitText = '🛡️ Break-Even Blindado (Riesgo Cero)';
  } else if (isE3Hit) {
    milestonesHitText = '⚡ E2 & E3 Tocados (100% DCA)';
  } else if (isE2Hit) {
    milestonesHitText = '⚡ E2 Tocado (Recarga DCA)';
  } else {
    const distToTp1 =
      tp1Price > 0 && markPrice > 0
        ? ((Math.abs(tp1Price - markPrice) / markPrice) * 100).toFixed(1)
        : null;
    milestonesHitText = distToTp1
      ? `Sin hitos aún • ${distToTp1}% a TP1`
      : 'Sin hitos tocados • En desarrollo';
  }

  // Next Milestone determination
  let nextMilestoneText = '';
  if (isSlHit) {
    nextMilestoneText = 'Trade cerrado / invalidado';
  } else if (isTp2Hit) {
    nextMilestoneText = 'Trailing Stop & Maximización Final';
  } else if (isTp1Hit) {
    const distToTp2 =
      tp2Price > 0 && markPrice > 0
        ? ((Math.abs(tp2Price - markPrice) / markPrice) * 100).toFixed(1)
        : '2.5';
    nextMilestoneText = `Siguiente: TP2 (${distToTp2}% de dist.)`;
  } else {
    const distToTp1 =
      tp1Price > 0 && markPrice > 0
        ? ((Math.abs(tp1Price - markPrice) / markPrice) * 100).toFixed(1)
        : '1.5';
    nextMilestoneText = `Siguiente: TP1 (${distToTp1}% de dist.)`;
  }

  // Determine Phase Step, Name and Badge
  if (isSlHit) {
    return {
      phaseStep: 0,
      phaseName: 'Fase Invalidada (SL)',
      phaseBadge: 'SL IMPACTADO',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
      textClass: 'text-rose-400',
      hasHitMilestone,
      milestonesHitText,
      milestones,
      nextMilestoneText,
      isBreakEvenActive,
      isSlHit,
      isTp1Hit,
      isTp2Hit,
      isE2Hit,
      isE3Hit,
      linkedStrategyId: effectiveStrategyId,
      linkedStrategyName: effectiveStrategyName,
    };
  }

  if (isTp2Hit) {
    return {
      phaseStep: 4,
      phaseName: 'Fase 4: Maximización & Trailing',
      phaseBadge: 'FASE 4 • MAXIMIZACIÓN',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
      textClass: 'text-emerald-300',
      hasHitMilestone,
      milestonesHitText,
      milestones,
      nextMilestoneText,
      isBreakEvenActive,
      isSlHit,
      isTp1Hit,
      isTp2Hit,
      isE2Hit,
      isE3Hit,
      linkedStrategyId: effectiveStrategyId,
      linkedStrategyName: effectiveStrategyName,
    };
  }

  if (isTp1Hit) {
    return {
      phaseStep: 3,
      phaseName: 'Fase 3: TP1 & Break-Even',
      phaseBadge: 'FASE 3 • TP1 & BE',
      badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-600/80',
      textClass: 'text-emerald-400',
      hasHitMilestone,
      milestonesHitText,
      milestones,
      nextMilestoneText,
      isBreakEvenActive,
      isSlHit,
      isTp1Hit,
      isTp2Hit,
      isE2Hit,
      isE3Hit,
      linkedStrategyId: effectiveStrategyId,
      linkedStrategyName: effectiveStrategyName,
    };
  }

  if (isE3Hit) {
    return {
      phaseStep: 1,
      phaseName: 'Fase 1: DCA E3 (100% Carga)',
      phaseBadge: 'FASE 1 • DCA E3',
      badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
      textClass: 'text-purple-300',
      hasHitMilestone,
      milestonesHitText,
      milestones,
      nextMilestoneText,
      isBreakEvenActive,
      isSlHit,
      isTp1Hit,
      isTp2Hit,
      isE2Hit,
      isE3Hit,
      linkedStrategyId: effectiveStrategyId,
      linkedStrategyName: effectiveStrategyName,
    };
  }

  if (isE2Hit) {
    return {
      phaseStep: 1,
      phaseName: 'Fase 1: DCA E2 (80% Carga)',
      phaseBadge: 'FASE 1 • DCA E2',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
      textClass: 'text-amber-300',
      hasHitMilestone,
      milestonesHitText,
      milestones,
      nextMilestoneText,
      isBreakEvenActive,
      isSlHit,
      isTp1Hit,
      isTp2Hit,
      isE2Hit,
      isE3Hit,
      linkedStrategyId: effectiveStrategyId,
      linkedStrategyName: effectiveStrategyName,
    };
  }

  // Phase 2: Monitoring & Development (Default)
  return {
    phaseStep: 2,
    phaseName: 'Fase 2: Monitoreo & Desarrollo',
    phaseBadge: 'FASE 2 • DESARROLLO',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    textClass: 'text-sky-300',
    hasHitMilestone,
    milestonesHitText,
    milestones,
    nextMilestoneText,
    isBreakEvenActive,
    isSlHit,
    isTp1Hit,
    isTp2Hit,
    isE2Hit,
    isE3Hit,
    linkedStrategyId: effectiveStrategyId,
    linkedStrategyName: effectiveStrategyName,
  };
}
