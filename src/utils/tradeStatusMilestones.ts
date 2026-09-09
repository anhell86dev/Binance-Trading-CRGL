import { PositionRisk, OpenOrder } from '../types/binance';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { parsePricesFromStrategy } from '../utils/sheetParser';

export interface TradeMilestoneItem {
  id: 'E1' | 'E2' | 'E3' | 'TP1' | 'TP2' | 'TP3' | 'BE' | 'SL';
  label: string;
  isHit: boolean;
  isCanceled?: boolean;
  cancelReason?: string;
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
  isTp3Hit: boolean;
  isE2Hit: boolean;
  isE3Hit: boolean;
  isE2CanceledDueToTp1: boolean;
  isE3CanceledDueToTp1: boolean;
  multiPathState: 'DUAL_PATH_ACTIVE' | 'TP1_ROUTE_DCA_CANCELED' | 'E2_ROUTE_ACTIVE' | 'E3_ROUTE_ACTIVE' | 'SL_ROUTE_HIT';
  multiPathLabel: string;
  tacticalRuleSummary: string;
  entry1Price: number;
  entry2Price: number;
  entry3Price: number;
  tp1Price: number;
  tp2Price: number;
  tp3Price: number;
  slPrice: number;
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
  let slPrice = 0;
  let tp1Price = 0;
  let tp2Price = 0;
  let tp3Price = 0;
  let entry2Price = 0;
  let entry3Price = 0;

  if (linkedStrategy) {
    const prices = parsePricesFromStrategy(linkedStrategy);
    if (prices.slPrice && prices.slPrice > 0) slPrice = prices.slPrice;
    if (prices.tp1Price && prices.tp1Price > 0) tp1Price = prices.tp1Price;
    if (prices.tp2Price && prices.tp2Price > 0) tp2Price = prices.tp2Price;
    if (prices.tpFinalPrice && prices.tpFinalPrice > 0) tp3Price = prices.tpFinalPrice;
    if (prices.entry2Price && prices.entry2Price > 0) entry2Price = prices.entry2Price;
    if (prices.entry3Price && prices.entry3Price > 0) entry3Price = prices.entry3Price;
  }

  // Fallback to position stopLoss/takeProfit if no strategy level found
  if (!slPrice) slPrice = position.stopLoss || 0;
  if (!tp1Price) tp1Price = position.takeProfit || 0;

  // Fallbacks if not configured in strategy
  if (!tp1Price && entryPrice > 0) {
    tp1Price = isLong ? entryPrice * 1.025 : entryPrice * 0.975;
  }
  if (!tp2Price && entryPrice > 0) {
    tp2Price = isLong ? entryPrice * 1.05 : entryPrice * 0.95;
  }
  if (!tp3Price && entryPrice > 0) {
    tp3Price = isLong ? entryPrice * 1.08 : entryPrice * 0.92;
  }
  if (!slPrice && entryPrice > 0) {
    slPrice = isLong ? entryPrice * 0.985 : entryPrice * 1.015;
  }

  // 3. Persistent milestone tracking check
  let savedMilestones = { e2: false, e3: false, tp1: false, tp2: false, tp3: false };
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

  const isTp3Hit =
    !isSlHit &&
    tp3Price > 0 &&
    (savedMilestones.tp3 || (isLong ? markPrice >= tp3Price : markPrice <= tp3Price));

  const isTp2Hit =
    !isSlHit &&
    (isTp3Hit ||
      (tp2Price > 0 && (savedMilestones.tp2 || (isLong ? markPrice >= tp2Price : markPrice <= tp2Price))));

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

  // Core Tactical Rule from Google Sheets:
  // "Si tocó antes TP1, se elimina pone en X=E2 y X=E3 (invalida compras DCA) y traslada SL a Break-Even (E1)"
  const isE2CanceledDueToTp1 = isTp1Hit;
  const isE3CanceledDueToTp1 = isTp1Hit;

  // Compile hit milestones with cancellation annotations
  const milestones: TradeMilestoneItem[] = [
    { id: 'E1', label: 'E1 Entrada (100%)', isHit: true, price: entryPrice },
    {
      id: 'E2',
      label: isE2CanceledDueToTp1 ? 'X = E2 (Cancelada)' : 'E2 DCA (30%)',
      isHit: !isE2CanceledDueToTp1 && (isE2Hit || isE3Hit),
      isCanceled: isE2CanceledDueToTp1,
      cancelReason: 'Eliminada por tocar TP1 primero (Regla de Ejecución Táctica)',
      price: entry2Price,
    },
    {
      id: 'E3',
      label: isE3CanceledDueToTp1 ? 'X = E3 (Cancelada)' : 'E3 Carga (20%)',
      isHit: !isE3CanceledDueToTp1 && isE3Hit,
      isCanceled: isE3CanceledDueToTp1,
      cancelReason: 'Eliminada por tocar TP1 primero (Regla de Ejecución Táctica)',
      price: entry3Price,
    },
    { id: 'TP1', label: 'TP1 Objetivo (50%)', isHit: isTp1Hit, price: tp1Price },
    { id: 'TP2', label: 'TP2 Max (30%)', isHit: isTp2Hit, price: tp2Price },
    { id: 'TP3', label: 'TP3 Final (20%)', isHit: isTp3Hit, price: tp3Price },
    { id: 'BE', label: 'Break-Even (E1)', isHit: isBreakEvenActive || isTp1Hit, price: entryPrice },
    { id: 'SL', label: 'SL Impacto', isHit: isSlHit, price: slPrice },
  ];

  const hasHitMilestone = isTp1Hit || isTp2Hit || isTp3Hit || isE2Hit || isE3Hit || isBreakEvenActive || isSlHit;

  // Multi-Path Branching Determination
  let multiPathState: 'DUAL_PATH_ACTIVE' | 'TP1_ROUTE_DCA_CANCELED' | 'E2_ROUTE_ACTIVE' | 'E3_ROUTE_ACTIVE' | 'SL_ROUTE_HIT' = 'DUAL_PATH_ACTIVE';
  let multiPathLabel = 'Bifurcación Abierta: E1 ➔ [TP1 o E2]';
  let tacticalRuleSummary = 'Regla Táctica: Si el precio toca TP1, se cancela E2 (X=E2) y SL pasa a BE. Si retrocede a E2 sin tocar TP1, se ejecuta DCA.';

  if (isSlHit) {
    multiPathState = 'SL_ROUTE_HIT';
    multiPathLabel = 'Ruta Invalidada: Stop Loss Impactado';
    tacticalRuleSummary = 'Disciplina #8: Nivel de invalidación alcanzado. Respetar salida estricta sin promediar pérdidas.';
  } else if (isTp1Hit) {
    multiPathState = 'TP1_ROUTE_DCA_CANCELED';
    multiPathLabel = 'Ruta Favorable: TP1 Tocado ➔ [X=E2 Cancelada] ➔ Break-Even';
    tacticalRuleSummary = 'Regla Táctica Ejecutada: Al tocar TP1 (50% tomado), la orden E2 queda anulada (X=E2) y el SL se blinda en BE ($' + entryPrice.toFixed(2) + ').';
  } else if (isE3Hit) {
    multiPathState = 'E3_ROUTE_ACTIVE';
    multiPathLabel = 'Ruta Retroceso: E2 + E3 Ejecutadas (100% Cupo)';
    tacticalRuleSummary = 'Disciplina #1: Carga máxima de posición alcanzada. Prohibido añadir más capital. Esperar rebote a TP1 o corte en SL.';
  } else if (isE2Hit) {
    multiPathState = 'E2_ROUTE_ACTIVE';
    multiPathLabel = 'Ruta Retroceso: E2 DCA Ejecutada';
    tacticalRuleSummary = 'Regla Táctica: E2 completado antes de TP1. Precio promedio optimizado. Siguiente objetivo: Rebote a TP1 o soporte en E3.';
  }

  // Build summary text of milestones hit
  let milestonesHitText = '';
  if (isSlHit) {
    milestonesHitText = '🛑 SL Impactado (Invalidado)';
  } else if (isTp3Hit) {
    milestonesHitText = '🏆 TP3 Objetivo Final Alcanzado';
  } else if (isTp2Hit) {
    milestonesHitText = '🎯 TP1 & 🚀 TP2 Tocados • Trailing';
  } else if (isTp1Hit) {
    milestonesHitText = '🎯 TP1 Tocado • X=E2 Cancelado • 🛡️ BE';
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
    nextMilestoneText = `Siguiente: TP2 (${distToTp2}% de dist.) • X=E2`;
  } else {
    const distToTp1 =
      tp1Price > 0 && markPrice > 0
        ? ((Math.abs(tp1Price - markPrice) / markPrice) * 100).toFixed(1)
        : '1.5';
    nextMilestoneText = `Siguiente: TP1 (${distToTp1}% de dist.) o DCA E2`;
  }

  const baseResult = {
    hasHitMilestone,
    milestonesHitText,
    milestones,
    nextMilestoneText,
    isBreakEvenActive,
    isSlHit,
    isTp1Hit,
    isTp2Hit,
    isTp3Hit,
    isE2Hit,
    isE3Hit,
    isE2CanceledDueToTp1,
    isE3CanceledDueToTp1,
    multiPathState,
    multiPathLabel,
    tacticalRuleSummary,
    entry1Price: entryPrice,
    entry2Price,
    entry3Price,
    tp1Price,
    tp2Price,
    tp3Price,
    slPrice,
    linkedStrategyId: effectiveStrategyId,
    linkedStrategyName: effectiveStrategyName,
  };

  // Determine Phase Step, Name and Badge
  if (isSlHit) {
    return {
      ...baseResult,
      phaseStep: 0,
      phaseName: 'Fase Invalidada (SL)',
      phaseBadge: 'SL IMPACTADO',
      badgeClass: 'bg-rose-950/80 text-rose-300 border-rose-800/80',
      textClass: 'text-rose-400',
    };
  }

  if (isTp2Hit || isTp3Hit) {
    return {
      ...baseResult,
      phaseStep: 4,
      phaseName: isTp3Hit ? 'Fase 4: TP3 Objetivo Final' : 'Fase 4: Maximización & Trailing',
      phaseBadge: isTp3Hit ? 'FASE 4 • TP3 FINAL' : 'FASE 4 • MAXIMIZACIÓN',
      badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80',
      textClass: 'text-emerald-300',
    };
  }

  if (isTp1Hit) {
    return {
      ...baseResult,
      phaseStep: 3,
      phaseName: 'Fase 3: TP1 Alcanzado (X=E2 Cancelada & BE)',
      phaseBadge: 'FASE 3 • TP1 & BE (X=E2)',
      badgeClass: 'bg-emerald-950/80 text-emerald-400 border-emerald-600/80',
      textClass: 'text-emerald-400',
    };
  }

  if (isE3Hit) {
    return {
      ...baseResult,
      phaseStep: 1,
      phaseName: 'Fase 1: DCA E3 (100% Carga)',
      phaseBadge: 'FASE 1 • DCA E3',
      badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-800/80',
      textClass: 'text-purple-300',
    };
  }

  if (isE2Hit) {
    return {
      ...baseResult,
      phaseStep: 1,
      phaseName: 'Fase 1: DCA E2 (80% Carga)',
      phaseBadge: 'FASE 1 • DCA E2',
      badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-800/80',
      textClass: 'text-amber-300',
    };
  }

  // Phase 2: Monitoring & Development (Default)
  return {
    ...baseResult,
    phaseStep: 2,
    phaseName: 'Fase 2: Monitoreo & Bifurcación [TP1 o E2]',
    phaseBadge: 'FASE 2 • E1 [TP1 | E2]',
    badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-800/80',
    textClass: 'text-sky-300',
  };
}
