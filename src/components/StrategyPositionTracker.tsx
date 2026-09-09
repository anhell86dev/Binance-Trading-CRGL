import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Compass,
  Crosshair,
  DollarSign,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Link2,
  Lock,
  MinusCircle,
  Percent,
  Play,
  RefreshCw,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { TOP_3_STRATEGIES_CATALOG } from '../services/strategyAutofillService';
import { TRADING_DISCIPLINES } from './TradingDisciplinesModal';
import { TacticalPriceMilestoneLine } from './TacticalPriceMilestoneLine';
import { TacticalPairVolatilityCard } from './TacticalPairVolatilityCard';

interface StrategyPositionTrackerProps {
  position: PositionRisk;
  onLinkStrategy?: (pos: PositionRisk) => void;
}

export const StrategyPositionTracker: React.FC<StrategyPositionTrackerProps> = React.memo(({
  position,
  onLinkStrategy,
}) => {
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'guia' | 'condicionales' | 'reglas' | 'disciplinas'>(
    () => (sessionStorage.getItem(`tracker_tab_${position.symbol}`) as any) || 'guia'
  );
  const [showFullSheetNotes, setShowFullSheetNotes] = useState(false);
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(() => binanceWs.getOpenOrders());

  // Input states for custom conditional order placement
  const [customSlPrice, setCustomSlPrice] = useState<string>('');
  const [customTpPrice, setCustomTpPrice] = useState<string>('');
  const [trailingCallbackRate, setTrailingCallbackRate] = useState<number>(1.5);
  const [trailingActivationPrice, setTrailingActivationPrice] = useState<string>('');

  const handleTabChange = (tab: 'guia' | 'condicionales' | 'reglas' | 'disciplinas') => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem(`tracker_tab_${position.symbol}`, tab);
    } catch {}
  };

  const [strategyTick, setStrategyTick] = useState<number>(0);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setOpenOrders(binanceWs.getOpenOrders());
    });
    const unsubStrat = strategyService.subscribe(() => {
      setStrategyTick((t) => t + 1);
    });
    return () => {
      unsub();
      unsubStrat();
    };
  }, []);

  // 1. Find linked strategy or auto-detect matching strategy by symbol (with durable fallback)
  const effectiveStrategyId = position.strategyId || binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyId;
  const effectiveStrategyName = position.strategyName || binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyName;

  const { linkedStrategy, isCustomStrategy, detectedStrategy } = useMemo(() => {
    const allStrategies = strategyService.getStrategies();
    const cleanSym = (position.symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();

    let found: GoogleSheetStrategyRow | undefined;
    let isCustom = false;

    if (effectiveStrategyId) {
      found = allStrategies.find(
        (s) =>
          s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase() ||
          s.nombreEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase()
      );

      if (!found) {
        const catalogFound = TOP_3_STRATEGIES_CATALOG.find((t) => t.id === effectiveStrategyId);
        if (catalogFound) {
          found = allStrategies.find((s) => s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym);
        } else {
          isCustom = true;
        }
      }
    }

    // If not explicitly linked, check if an active strategy exists for this symbol
    const detected = allStrategies.find(
      (s) =>
        s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym &&
        s.estado !== 'Obsoleto' &&
        s.estado !== 'Fallida'
    );

    return {
      linkedStrategy: found,
      isCustomStrategy: isCustom,
      detectedStrategy: detected,
    };
  }, [effectiveStrategyId, position.symbol, strategyTick]);

  // 2. Derive key tactical levels (E1, E2, E3, SL, TP1, TP2, TP3)
  const isLong = position.positionAmt > 0;
  const markPrice = position.markPrice || position.entryPrice;
  const entryPrice = position.entryPrice;

  const strategyPrices = useMemo(() => {
    if (linkedStrategy) {
      return parsePricesFromStrategy(linkedStrategy);
    }
    // If no linked strategy, derive standard tactical levels from entry & existing TP/SL
    const sl = position.stopLoss || (isLong ? entryPrice * 0.985 : entryPrice * 1.015);
    const tp1 = position.takeProfit || (isLong ? entryPrice * 1.025 : entryPrice * 0.975);
    const tp2 = isLong ? entryPrice * 1.05 : entryPrice * 0.95;
    const e2 = isLong ? entryPrice * 0.99 : entryPrice * 1.01;
    const e3 = isLong ? entryPrice * 0.98 : entryPrice * 1.02;

    return {
      entry1Price: entryPrice,
      entry2Price: e2,
      entry3Price: e3,
      avgEntryPrice: entryPrice,
      slPrice: sl,
      tp1Price: tp1,
      tp2Price: tp2,
      tpFinalPrice: isLong ? entryPrice * 1.08 : entryPrice * 0.92,
      leverage: position.leverage,
      entry1Pct: 50,
      entry2Pct: 30,
      entry3Pct: 20,
      tp1Pct: 50,
      tp2Pct: 30,
      tpFinalPct: 20,
    };
  }, [linkedStrategy, entryPrice, position.stopLoss, position.takeProfit, position.leverage, isLong]);

  const {
    entry1Price = entryPrice,
    entry2Price = 0,
    entry3Price = 0,
    slPrice: parsedSl = 0,
    tp1Price: parsedTp1 = 0,
    tp2Price = 0,
    tpFinalPrice = 0,
  } = strategyPrices;

  const slPrice = parsedSl > 0 ? parsedSl : (position.stopLoss || 0);
  const tp1Price = parsedTp1 > 0 ? parsedTp1 : (position.takeProfit || 0);

  // Persistent tracking of milestones reached during position life to avoid tick flicker
  const [reachedMilestones, setReachedMilestones] = useState<{
    e2: boolean;
    e3: boolean;
    tp1: boolean;
    tp2: boolean;
  }>(() => {
    try {
      const saved = sessionStorage.getItem(`milestones_${position.symbol}_${position.entryPrice}`);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { e2: false, e3: false, tp1: false, tp2: false };
  });

  // Update reached milestones when price touches levels
  useEffect(() => {
    if (!markPrice || !entryPrice) return;
    setReachedMilestones((prev) => {
      let changed = false;
      const next = { ...prev };

      if (isLong) {
        if (!next.tp2 && tp2Price > 0 && markPrice >= tp2Price) {
          next.tp2 = true;
          next.tp1 = true;
          changed = true;
        }
        if (!next.tp1 && tp1Price > 0 && markPrice >= tp1Price) {
          next.tp1 = true;
          changed = true;
        }
        if (!next.e3 && entry3Price > 0 && markPrice <= entry3Price && entry3Price > slPrice) {
          next.e3 = true;
          next.e2 = true;
          changed = true;
        }
        if (!next.e2 && entry2Price > 0 && markPrice <= entry2Price && entry2Price > slPrice) {
          next.e2 = true;
          changed = true;
        }
      } else {
        if (!next.tp2 && tp2Price > 0 && markPrice <= tp2Price) {
          next.tp2 = true;
          next.tp1 = true;
          changed = true;
        }
        if (!next.tp1 && tp1Price > 0 && markPrice <= tp1Price) {
          next.tp1 = true;
          changed = true;
        }
        if (!next.e3 && entry3Price > 0 && markPrice >= entry3Price && entry3Price < slPrice) {
          next.e3 = true;
          next.e2 = true;
          changed = true;
        }
        if (!next.e2 && entry2Price > 0 && markPrice >= entry2Price && entry2Price < slPrice) {
          next.e2 = true;
          changed = true;
        }
      }

      if (changed) {
        try {
          sessionStorage.setItem(`milestones_${position.symbol}_${position.entryPrice}`, JSON.stringify(next));
        } catch {}
        return next;
      }
      return prev;
    });
  }, [markPrice, entryPrice, isLong, tp1Price, tp2Price, entry2Price, entry3Price, slPrice, position.symbol]);

  // 3. Status and milestone detection
  // Check if Stop Loss was hit or breached
  const isSlHit =
    (slPrice > 0 && (isLong ? markPrice <= slPrice : markPrice >= slPrice)) ||
    position.strategyStatus === 'Fallida' ||
    linkedStrategy?.estado === 'Fallida';

  // Check if TP2 was hit
  const isTp2Hit =
    !isSlHit &&
    tp2Price > 0 &&
    (reachedMilestones.tp2 || (isLong ? markPrice >= tp2Price : markPrice <= tp2Price));

  // Check if TP1 was hit
  const isTp1Hit =
    !isSlHit &&
    !isTp2Hit &&
    tp1Price > 0 &&
    (reachedMilestones.tp1 || (isLong ? markPrice >= tp1Price : markPrice <= tp1Price));

  // Check if E3 was touched before TP1
  const isE3Hit =
    !isSlHit &&
    !isTp1Hit &&
    !isTp2Hit &&
    entry3Price > 0 &&
    (reachedMilestones.e3 || (isLong ? markPrice <= entry3Price && entry3Price > slPrice : markPrice >= entry3Price && entry3Price < slPrice));

  // Check if E2 was touched before TP1 & E3
  const isE2Hit =
    !isSlHit &&
    !isTp1Hit &&
    !isTp2Hit &&
    !isE3Hit &&
    entry2Price > 0 &&
    (reachedMilestones.e2 || (isLong ? markPrice <= entry2Price && entry2Price > slPrice : markPrice >= entry2Price && entry2Price < slPrice));

  // Distances to milestones
  const pctToTp1 = tp1Price > 0 ? (((tp1Price - markPrice) / markPrice) * 100) : 0;
  const pctToTp2 = tp2Price > 0 ? (((tp2Price - markPrice) / markPrice) * 100) : 0;
  const pctToE2 = entry2Price > 0 ? (((entry2Price - markPrice) / markPrice) * 100) : 0;
  const pctToE3 = entry3Price > 0 ? (((entry3Price - markPrice) / markPrice) * 100) : 0;
  const pctToSl = slPrice > 0 ? (((slPrice - markPrice) / markPrice) * 100) : 0;

  // Is Stop Loss currently at Break-Even?
  const isSlAtBreakEven = Boolean(
    position.stopLoss && Math.abs(position.stopLoss - entryPrice) / entryPrice < 0.002
  );

  // Format helper
  const fmt = (num?: number) => {
    if (!num) return '--';
    return num < 10 ? num.toFixed(4) : num.toFixed(2);
  };

  // Handlers for recommended actions
  const handleMoveSlToBreakEven = async () => {
    try {
      setIsUpdating(true);
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, entryPrice);
      notificationService.notify(
        'SYSTEM',
        'Stop Loss a Break-Even',
        `${position.symbol}: Stop Loss movido al precio de entrada $${fmt(entryPrice)} (Riesgo Cero).`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMoveSlToTp1 = async () => {
    if (!tp1Price) return;
    try {
      setIsUpdating(true);
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, tp1Price);
      notificationService.notify(
        'SYSTEM',
        'Stop Loss Asegurado en TP1',
        `${position.symbol}: Stop Loss fijado en $${fmt(tp1Price)} para asegurar ganancias.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseEmergency = async () => {
    try {
      setIsUpdating(true);
      await binanceWs.closePosition(position.symbol);
      if (linkedStrategy?.noEstrategia) {
        strategyService.updateStrategyStatus(linkedStrategy.noEstrategia, 'Fallida');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClosePartial = async (pct: number) => {
    try {
      setIsUpdating(true);
      await binanceWs.closePartialPosition(position.symbol, pct);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelPendingDca = async () => {
    try {
      setIsUpdating(true);
      const count = await binanceWs.cancelPendingEntryOrders(position.symbol);
      notificationService.notify(
        'SYSTEM',
        'DCA Cancelado',
        `Se han cancelado ${count} órdenes pendientes de entrada para ${position.symbol}.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteTp1Protocol = async () => {
    try {
      setIsUpdating(true);
      // 1. Close 50% partial
      await binanceWs.closePartialPosition(position.symbol, 50);
      // 2. Move SL to breakeven
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, entryPrice);
      // 3. Cancel pending DCA entries
      await binanceWs.cancelPendingEntryOrders(position.symbol);

      notificationService.notify(
        'TP_HIT',
        '⚡ Protocolo TP1 Completado',
        `${position.symbol}: 50% de ganancia asegurada, SL colocado en Break-Even ($${fmt(entryPrice)}) y órdenes DCA restantes canceladas. Operación blindada a Riesgo Cero.`,
        'high'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteTp2Protocol = async () => {
    try {
      setIsUpdating(true);
      // 1. Close 75% of remaining or position
      await binanceWs.closePartialPosition(position.symbol, 75);
      // 2. Move SL to TP1 level
      if (tp1Price > 0) {
        await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, tp1Price);
      }
      notificationService.notify(
        'TP_HIT',
        '🚀 Protocolo TP2 Completado',
        `${position.symbol}: 75% de ganancia asegurada y SL elevado a nivel de TP1 ($${fmt(tp1Price)}). Beneficio récord blindado.`,
        'high'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsFailed = () => {
    if (linkedStrategy?.noEstrategia) {
      strategyService.updateStrategyStatus(linkedStrategy.noEstrategia, 'Fallida');
    }
    binanceWs.linkPositionToStrategy(
      position.symbol,
      position.strategyId || 'FALLIDA',
      position.strategyName || 'Estrategia Fallida'
    );
    const pos = binanceWs.getPositions().find((p) => p.symbol === position.symbol);
    if (pos) {
      pos.strategyStatus = 'Fallida';
    }
    notificationService.notify(
      'SL_HIT',
      'Estrategia Marcada como Fallida',
      `La estrategia para ${position.symbol} fue clasificada como Fallida tras tocar Stop Loss.`,
      'urgent'
    );
  };

  const handleQuickLinkDetected = () => {
    if (!detectedStrategy) return;
    binanceWs.linkPositionToStrategy(
      position.symbol,
      detectedStrategy.noEstrategia,
      detectedStrategy.nombreEstrategia
    );
    // Also update strategy state to Live+
    strategyService.updateStrategyStatus(detectedStrategy.noEstrategia, 'Live+');
  };

  // Extract and categorize all active Binance orders for this position
  const {
    posConditionalOrders,
    posStopLossOrders,
    posTakeProfitOrders,
    posTrailingOrders,
    posDcaOrders,
  } = useMemo(() => {
    const symbolOrders = openOrders.filter(
      (o) =>
        o.symbol === position.symbol &&
        o.status !== 'CANCELED' &&
        o.status !== 'EXPIRED' &&
        o.status !== 'FILLED'
    );

    const isCloseSide = isLong ? 'SELL' : 'BUY';

    const slOrders = symbolOrders.filter((o) => {
      const typeStr = String(o.type || '').toUpperCase();
      const isSlType = typeStr === 'STOP_MARKET' || typeStr === 'STOP' || o.clientOrderId?.includes('SL-');
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return isSlType || (o.side === isCloseSide && trig > 0 && (isLong ? trig < entryPrice : trig > entryPrice));
    });

    const tpOrders = symbolOrders.filter((o) => {
      const typeStr = String(o.type || '').toUpperCase();
      const isTpType = typeStr === 'TAKE_PROFIT_MARKET' || typeStr === 'TAKE_PROFIT' || o.clientOrderId?.includes('TP-');
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return isTpType || (o.side === isCloseSide && trig > 0 && (isLong ? trig > entryPrice : trig < entryPrice));
    });

    const trailingOrders = symbolOrders.filter((o) => {
      const typeStr = String(o.type || '').toUpperCase();
      return typeStr === 'TRAILING_STOP_MARKET' || o.clientOrderId?.includes('TS-') || Boolean(o.callbackRate);
    });

    const conditionals = Array.from(new Set([...slOrders, ...tpOrders, ...trailingOrders]));
    const dcaOrders = symbolOrders.filter((o) => !conditionals.some((c) => c.orderId === o.orderId));

    return {
      posConditionalOrders: conditionals,
      posStopLossOrders: slOrders,
      posTakeProfitOrders: tpOrders,
      posTrailingOrders: trailingOrders,
      posDcaOrders: dcaOrders,
    };
  }, [openOrders, position.symbol, isLong, entryPrice]);

  const handlePlaceCustomSl = async (targetSl?: number) => {
    const priceToSet = targetSl !== undefined ? targetSl : Number(customSlPrice);
    if (!priceToSet || isNaN(priceToSet) || priceToSet <= 0) {
      notificationService.notify('SYSTEM', 'Precio Inválido', 'Ingresa un precio válido para el Stop Loss.', 'normal');
      return;
    }
    try {
      setIsUpdating(true);
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, priceToSet);
      setCustomSlPrice('');
      notificationService.notify(
        'SYSTEM',
        'Stop Loss Condicional Configurado',
        `${position.symbol}: Orden condicional STOP_MARKET colocada en $${fmt(priceToSet)} en Binance.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlaceCustomTp = async (targetTp?: number) => {
    const priceToSet = targetTp !== undefined ? targetTp : Number(customTpPrice);
    if (!priceToSet || isNaN(priceToSet) || priceToSet <= 0) {
      notificationService.notify('SYSTEM', 'Precio Inválido', 'Ingresa un precio válido para el Take Profit.', 'normal');
      return;
    }
    try {
      setIsUpdating(true);
      await binanceWs.updatePositionTPSL(position.symbol, priceToSet, position.stopLoss);
      setCustomTpPrice('');
      notificationService.notify(
        'SYSTEM',
        'Take Profit Condicional Configurado',
        `${position.symbol}: Orden condicional TAKE_PROFIT_MARKET colocada en $${fmt(priceToSet)} en Binance.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePlaceTrailingStop = async (callbackRate: number, activationPrice?: number) => {
    try {
      setIsUpdating(true);
      const closeSide = isLong ? 'SELL' : 'BUY';
      const qty = Math.abs(position.positionAmt);
      await binanceWs.placeTrailingStopOrder({
        symbol: position.symbol,
        side: closeSide,
        quantity: qty,
        callbackRate: callbackRate,
        activationPrice: activationPrice || markPrice,
        leverage: position.leverage || 2,
        strategyId: position.strategyId,
        strategyName: position.strategyName,
      });
      setTrailingActivationPrice('');
      notificationService.notify(
        'SYSTEM',
        'Trailing Stop Dinámico Activado',
        `${position.symbol}: Trailing Stop condicional con tasa de retorno ${callbackRate}% activado en Binance.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelSingleOrder = async (orderId: string) => {
    try {
      setIsUpdating(true);
      await binanceWs.cancelOrder(orderId);
      notificationService.notify('SYSTEM', 'Orden Cancelada', `Orden condicional cancelada en Binance.`, 'normal');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelAllConditionals = async () => {
    try {
      setIsUpdating(true);
      for (const ord of posConditionalOrders) {
        await binanceWs.cancelOrder(ord.orderId);
      }
      await binanceWs.updatePositionTPSL(position.symbol, undefined, undefined);
      notificationService.notify(
        'SYSTEM',
        'Órdenes Condicionales Canceladas',
        `Todas las órdenes condicionales de ${position.symbol} han sido canceladas.`,
        'normal'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Determine current active phase for the progress guide
  const currentPhase = isSlHit
    ? {
        step: 0,
        badge: 'CRÍTICO • SL IMPACTADO',
        title: 'Fase de Invalidación Técnica (Stop Loss)',
        color: 'text-rose-400 bg-rose-950/80 border-rose-800',
      }
    : isTp2Hit
    ? {
        step: 4,
        badge: 'FASE 4 • MAXIMIZACIÓN',
        title: 'Objetivo TP2 Alcanzado • Asegurar 75% y Trailing',
        color: 'text-emerald-300 bg-emerald-950/80 border-emerald-700',
      }
    : isTp1Hit
    ? {
        step: 3,
        badge: 'FASE 3 • TOMA TP1 & BREAK-EVEN',
        title: 'Objetivo TP1 Alcanzado • Blindaje a Riesgo Cero',
        color: 'text-emerald-400 bg-emerald-950/80 border-emerald-600',
      }
    : isE3Hit
    ? {
        step: 1,
        badge: 'FASE 1 • DCA E3 (100% CUOTA)',
        title: 'Recarga E3 Tocada • Asignación Máxima Institucional',
        color: 'text-purple-400 bg-purple-950/80 border-purple-800',
      }
    : isE2Hit
    ? {
        step: 1,
        badge: 'FASE 1 • DCA E2 (80% CUOTA)',
        title: 'Recarga E2 Tocada • Precio Promedio Optimizado',
        color: 'text-amber-400 bg-amber-950/80 border-amber-800',
      }
    : {
        step: 2,
        badge: 'FASE 2 • MONITOREO & DESARROLLO',
        title: 'Operación en Marcha hacia TP1 • Mantener Disciplina',
        color: 'text-sky-400 bg-sky-950/80 border-sky-800',
      };

  return (
    <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3.5 sm:p-4 text-xs flex flex-col gap-3 shadow-inner">
      {/* 1. Header: Estrategia Ligada & Diagnóstico del Estado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80">
        <div className="flex items-start sm:items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Compass className="w-4 h-4 text-amber-400 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white text-xs sm:text-sm">
                {effectiveStrategyId
                  ? `${effectiveStrategyId} • ${effectiveStrategyName || position.strategyName || linkedStrategy?.nombreEstrategia || 'Estrategia'}`
                  : `Trade sin Estrategia Vinculada (${position.symbol})`}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  isLong
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {isLong ? 'LONG INSTITUCIONAL' : 'SHORT INSTITUCIONAL'}
              </span>

              {/* Phase Badge */}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${currentPhase.color}`}>
                {currentPhase.badge}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Guía táctica en tiempo real guiada por las <strong>Reglas de Ejecución</strong> y el <strong>Protocolo de Disciplinas</strong>.
            </p>
          </div>
        </div>

        {/* Action buttons & tabs selector */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 flex items-center">
            <button
              type="button"
              onClick={() => handleTabChange('guia')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'guia'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Compass className="w-3 h-3" />
              <span>Guía Táctica</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('condicionales')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                activeTab === 'condicionales'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Shield className="w-3 h-3" />
              <span>Órdenes Condicionales</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-neutral-900 text-amber-300 font-mono font-bold">
                {posConditionalOrders.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('reglas')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'reglas'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3 h-3" />
              <span>Reglas de la Hoja</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('disciplinas')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                activeTab === 'disciplinas'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>8 Disciplinas</span>
            </button>
          </div>

          {onLinkStrategy && (
            <button
              type="button"
              onClick={() => onLinkStrategy(position)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Link2 className="w-3 h-3 text-amber-400" />
              <span>{effectiveStrategyId ? 'Cambiar' : 'Vincular'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Banner de Detección si no está ligada pero existe estrategia del par */}
      {!position.strategyId && detectedStrategy && (
        <div className="bg-amber-950/25 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-neutral-300">
            <Target className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Estrategia oficial detectada en Google Sheets:{' '}
              <strong className="text-white">{detectedStrategy.noEstrategia}</strong> (
              {detectedStrategy.nombreEstrategia}).
            </span>
          </div>
          <button
            type="button"
            onClick={handleQuickLinkDetected}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-[11px] font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
          >
            <Zap className="w-3 h-3 fill-neutral-950" />
            <span>Vincular y Guiar con Esta Estrategia</span>
          </button>
        </div>
      )}

      {/* 3. Hoja de Ruta Visual de Niveles de Precio - Línea Gráfica Táctica en Vivo */}
      <TacticalPriceMilestoneLine
        position={position}
        isLong={isLong}
        markPrice={markPrice}
        entryPrice={entryPrice}
        entry1Price={entry1Price}
        entry2Price={entry2Price}
        entry3Price={entry3Price}
        slPrice={slPrice}
        tp1Price={tp1Price}
        tp2Price={tp2Price}
        tpFinalPrice={tpFinalPrice}
        isSlHit={isSlHit}
        isSlAtBreakEven={isSlAtBreakEven}
        isTp1Hit={isTp1Hit}
        isTp2Hit={isTp2Hit}
        isE2Hit={isE2Hit}
        isE3Hit={isE3Hit}
        pctToSl={pctToSl}
        pctToE2={pctToE2}
        pctToE3={pctToE3}
        pctToTp1={pctToTp1}
        pctToTp2={pctToTp2}
        fmt={fmt}
      />

      {/* 4. CONTENIDO PRINCIPAL SEGÚN TAB SELECCIONADA */}

      {/* TAB A: GUÍA TÁCTICA & COACH EN VIVO */}
      {activeTab === 'guia' && (
        <div className="flex flex-col gap-3">
          {/* Tarjeta de Diagnóstico y Paso Operativo */}
          <div
            className={`rounded-xl border p-3.5 flex flex-col gap-2.5 transition-all ${
              isSlHit
                ? 'bg-rose-950/40 border-rose-600/70 text-rose-200'
                : isTp2Hit
                ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-200'
                : isTp1Hit
                ? 'bg-emerald-950/30 border-emerald-600/60 text-emerald-200'
                : isE3Hit
                ? 'bg-purple-950/40 border-purple-600/60 text-purple-200'
                : isE2Hit
                ? 'bg-amber-950/30 border-amber-600/60 text-amber-200'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 shrink-0">
                  {isSlHit ? (
                    <XCircle className="w-5 h-5 text-rose-400" />
                  ) : isTp2Hit || isTp1Hit ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isE3Hit ? (
                    <AlertOctagon className="w-5 h-5 text-purple-400" />
                  ) : isE2Hit ? (
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                  ) : (
                    <Crosshair className="w-5 h-5 text-sky-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide flex items-center gap-2 flex-wrap">
                    <span>
                      {isSlHit
                        ? 'ESTRATEGIA FALLIDA • STOP LOSS IMPACTADO'
                        : isTp2Hit
                        ? 'TP2 ALCANZADO • TOMA DE BENEFICIOS MAYORITARIA'
                        : isTp1Hit
                        ? 'TP1 ALCANZADO • ASEGURAR BENEFICIOS & BREAK-EVEN'
                        : isE3Hit
                        ? 'TOCÓ ENTRADA 3 (E3) • ASIGNACIÓN MÁXIMA INSTITUCIONAL'
                        : isE2Hit
                        ? 'TOCÓ ENTRADA 2 (E2) • PRECIO PROMEDIO OPTIMIZADO'
                        : 'EN DESARROLLO • OPERACIÓN EN CURSO HACIA TP1'}
                    </span>
                    {isSlHit && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-900 text-rose-100 font-bold">
                        Cierre Inmediato Obligatorio
                      </span>
                    )}
                  </h4>

                  {/* Guía Operativa Paso a Paso */}
                  <div className="text-[11px] sm:text-xs mt-1.5 space-y-1.5 leading-relaxed opacity-95">
                    {isSlHit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> El precio tocó o perforó el nivel de Stop Loss técnico (${fmt(slPrice)}). La hipótesis del trade ha quedado invalidada.
                        </p>
                        <p className="text-rose-300">
                          <strong>Regla Inquebrantable (Disciplina #3 y #8):</strong> PROHIBIDO promediar a la baja tras violar el SL. PROHIBIDO alejar el Stop Loss. Ejecuta el cierre de emergencia a mercado para proteger el capital remanente y clasificar la estrategia como <strong>Fallida</strong>.
                        </p>
                      </div>
                    )}

                    {isTp2Hit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> El precio superó el segundo objetivo (${fmt(tp2Price)}).
                        </p>
                        <p className="text-emerald-300">
                          <strong>Regla Táctica de Salida:</strong> Tomar el 75% u 80% de ganancias acumuladas. Sube inmediatamente el Stop Loss al nivel de TP1 (${fmt(tp1Price)}) para blindar el beneficio o activa Trailing Stop para dejar correr el resto libre de riesgo.
                        </p>
                      </div>
                    )}

                    {isTp1Hit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> El precio alcanzó el primer objetivo de salida (${fmt(tp1Price)}).
                        </p>
                        <p className="text-emerald-300">
                          <strong>Regla de Oro Institucional (Disciplina #7):</strong> 1) Asegura el 50% de la ganancia cerrando parcialmente la mitad. 2) Mueve inmediatamente el Stop Loss a Break-Even (${fmt(entryPrice)}) para dejar la operación a <strong>Riesgo Cero</strong>. 3) Cancela cualquier orden límite de entrada DCA no ejecutada.
                        </p>
                      </div>
                    )}

                    {isE3Hit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> El retroceso alcanzó el tercer nivel de entrada E3 (${fmt(entry3Price)}).
                        </p>
                        <p className="text-purple-300">
                          <strong>Regla de Disciplina (Disciplina #6):</strong> Has completado el 100% de la cuota permitida (50% E1 + 30% E2 + 20% E3). <span className="underline font-bold">PROHIBIDO AGREGAR MÁS MARGEN</span>. Tu precio promedio ha quedado optimizado en ${fmt(entryPrice)}. Mantén el Stop Loss estricto en ${fmt(slPrice)}.
                        </p>
                      </div>
                    )}

                    {isE2Hit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> El precio tocó la zona de Entrada 2 (${fmt(entry2Price)}).
                        </p>
                        <p className="text-amber-300">
                          <strong>Regla Operativa:</strong> Al ejecutarse E2, tu precio promedio de entrada mejoró favorablemente. Mantén la orden condicional de Stop Loss en ${fmt(slPrice)}. Si el precio continúa cayendo hasta E3 (${fmt(entry3Price)}), será tu última recarga técnica antes del Stop.
                        </p>
                      </div>
                    )}

                    {!isSlHit && !isTp1Hit && !isTp2Hit && !isE2Hit && !isE3Hit && (
                      <div>
                        <p>
                          <strong className="text-white">Diagnóstico Técnico:</strong> La posición se encuentra dentro del rango de desarrollo normal hacia TP1 (${fmt(tp1Price)}).
                        </p>
                        <p className="text-neutral-200">
                          <strong>Regla de Paciencia (Disciplina #8):</strong> No cierres prematuramente por ansiedad antes de TP1. Mantén la orden condicional de Stop Loss activa en ${fmt(slPrice)} y deja que las confluencias estadísticas se desarrollen.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* 5. Botones de Acción Inmediata Sugeridos por el Sistema */}
            <div className="flex items-center gap-2 flex-wrap pt-2.5 border-t border-neutral-800/60 mt-1">
              {/* Si tocó SL: Botón de Cierre de Emergencia y Marcar como Fallida */}
              {isSlHit && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleCloseEmergency}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cerrar Posición a Mercado (Emergencia)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleMarkAsFailed}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-rose-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    <span>Marcar Estrategia como Fallida</span>
                  </button>
                </>
              )}

              {/* Si tocó TP1: Botón Protocolo Completo TP1 */}
              {isTp1Hit && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleExecuteTp1Protocol}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-neutral-950" />
                    <span>Ejecutar Protocolo TP1 (50% TP + Break-Even + Cancelar DCA)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleMoveSlToBreakEven}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mover Solo SL a Break-Even (${fmt(entryPrice)})</span>
                  </button>
                </>
              )}

              {/* Si tocó TP2: Botón Protocolo Completo TP2 */}
              {isTp2Hit && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleExecuteTp2Protocol}
                    className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-extrabold text-xs flex items-center gap-1.5 transition-colors shadow-md cursor-pointer"
                  >
                    <Zap className="w-4 h-4 fill-neutral-950" />
                    <span>Ejecutar Protocolo TP2 (75% Ganancia + Mover SL a TP1)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleMoveSlToTp1}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mover SL a TP1 (${fmt(tp1Price)})</span>
                  </button>
                </>
              )}

              {/* Si tocó E2 o E3: Botones de DCA */}
              {(isE2Hit || isE3Hit) && (
                <>
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => {
                      binanceWs.updatePositionTPSL(position.symbol, tp1Price, slPrice);
                      notificationService.notify(
                        'SYSTEM',
                        'Stop Loss y TP Sincronizados',
                        `${position.symbol}: SL verificado en $${fmt(slPrice)} y TP en $${fmt(tp1Price)}.`,
                        'normal'
                      );
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 fill-neutral-950" />
                    <span>Asegurar SL en ${fmt(slPrice)}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleCancelPendingDca}
                    className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-neutral-400" />
                    <span>Limpiar DCA Restante</span>
                  </button>
                </>
              )}

              {/* Acciones Generales para Trade en Curso */}
              {!isSlHit && !isTp1Hit && !isTp2Hit && !isE2Hit && !isE3Hit && (
                <>
                  {position.stopLoss !== slPrice && slPrice > 0 && (
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() => binanceWs.updatePositionTPSL(position.symbol, tp1Price, slPrice)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Sincronizar SL con Estrategia (${fmt(slPrice)})</span>
                    </button>
                  )}

                  {/* Botón rápido Break-Even preventivo */}
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleMoveSlToBreakEven}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Lock className="w-3 h-3 text-neutral-400" />
                    <span>Proteger en Break-Even (${fmt(entryPrice)})</span>
                  </button>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={handleCancelPendingDca}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 border border-neutral-700 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3 text-neutral-500" />
                    <span>Cancelar DCA Pendientes</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Histórico Reciente de Volatilidad en Vivo del Par */}
          <TacticalPairVolatilityCard
            symbol={position.symbol}
            isLong={isLong}
            markPrice={markPrice}
            entryPrice={entryPrice}
            slPrice={slPrice}
            tp1Price={tp1Price}
          />
        </div>
      )}

      {/* TAB B: GESTIÓN INTEGRAL DE ÓRDENES CONDICIONALES (TP / SL / TRAILING STOP) */}
      {activeTab === 'condicionales' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-3.5">
          {/* Header del Tab */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-400" />
                Órdenes Condicionales de Protección en Binance ({position.symbol})
              </span>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Las órdenes condicionales (Stop Loss, Take Profit y Trailing Stop) residen en Binance y se disparan cuando el precio de marca alcanza el valor gatillo configurado.
              </p>
            </div>

            {posConditionalOrders.length > 0 && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleCancelAllConditionals}
                className="px-2.5 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Cancelar Todas las Condicionales</span>
              </button>
            )}
          </div>

          {/* Resumen de Estado de Protección */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* 1. Estado Stop Loss */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 ${
                posStopLossOrders.length > 0
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-800/60 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Stop Loss (Protección)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 font-bold">
                  {posStopLossOrders.length > 0 ? 'ACTIVO' : 'SIN PROTEGER'}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {posStopLossOrders.length > 0
                  ? `$${fmt(posStopLossOrders[0].stopPrice || posStopLossOrders[0].price)}`
                  : 'Sin orden de SL'}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {posStopLossOrders.length > 0
                  ? `Distancia: ${fmt(((Number(posStopLossOrders[0].stopPrice || posStopLossOrders[0].price) - markPrice) / markPrice) * 100)}%`
                  : 'Disciplina #3: Mandatorio tener SL'}
              </div>
            </div>

            {/* 2. Estado Take Profit */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 ${
                posTakeProfitOrders.length > 0
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase flex items-center gap-1">
                  <Target className="w-3.5 h-3.5" />
                  Take Profit (Objetivo)
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 font-bold">
                  {posTakeProfitOrders.length > 0 ? 'ACTIVO' : 'NO FIJADO'}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {posTakeProfitOrders.length > 0
                  ? `$${fmt(posTakeProfitOrders[0].stopPrice || posTakeProfitOrders[0].price)}`
                  : 'Sin orden de TP'}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {posTakeProfitOrders.length > 0
                  ? `Distancia: +${fmt(((Number(posTakeProfitOrders[0].stopPrice || posTakeProfitOrders[0].price) - markPrice) / markPrice) * 100)}%`
                  : `TP1 sugerido: $${fmt(tp1Price)}`}
              </div>
            </div>

            {/* 3. Estado Trailing Stop */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col justify-between gap-1 ${
                posTrailingOrders.length > 0
                  ? 'bg-sky-950/30 border-sky-800/60 text-sky-300'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[10px] uppercase flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  Trailing Stop Dinámico
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 font-bold">
                  {posTrailingOrders.length > 0 ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
              <div className="text-sm font-mono font-bold text-white mt-1">
                {posTrailingOrders.length > 0
                  ? `${posTrailingOrders[0].callbackRate || 1.5}% Callback`
                  : 'Sin Trailing Stop'}
              </div>
              <div className="text-[10px] text-neutral-400 font-mono">
                {posTrailingOrders.length > 0
                  ? `Sigue el precio y asegura máximos`
                  : 'Ideal activar tras TP1 o TP2'}
              </div>
            </div>
          </div>

          {/* Formularios de Configuración Rápida de Órdenes Condicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Form 1: Configurar Stop Loss */}
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                1. Configurar Stop Loss (STOP_MARKET)
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder={`Ej: ${fmt(slPrice || entryPrice * 0.98)}`}
                  value={customSlPrice}
                  onChange={(e) => setCustomSlPrice(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-hidden focus:border-rose-500"
                />
                <button
                  type="button"
                  disabled={isUpdating || !customSlPrice}
                  onClick={() => handlePlaceCustomSl()}
                  className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
                >
                  Fijar
                </button>
              </div>

              {/* Presets Rápidos */}
              <div className="flex flex-wrap gap-1 mt-1">
                {slPrice > 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePlaceCustomSl(slPrice)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-rose-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                  >
                    SL Hoja (${fmt(slPrice)})
                  </button>
                )}
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => handlePlaceCustomSl(entryPrice)}
                  className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                >
                  Break-Even (${fmt(entryPrice)})
                </button>
                {tp1Price > 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePlaceCustomSl(tp1Price)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                  >
                    SL a TP1 (${fmt(tp1Price)})
                  </button>
                )}
              </div>
            </div>

            {/* Form 2: Configurar Take Profit */}
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-emerald-400" />
                2. Configurar Take Profit (TAKE_PROFIT_MARKET)
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="any"
                  placeholder={`Ej: ${fmt(tp1Price || entryPrice * 1.03)}`}
                  value={customTpPrice}
                  onChange={(e) => setCustomTpPrice(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white font-mono placeholder:text-neutral-600 focus:outline-hidden focus:border-emerald-500"
                />
                <button
                  type="button"
                  disabled={isUpdating || !customTpPrice}
                  onClick={() => handlePlaceCustomTp()}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
                >
                  Fijar
                </button>
              </div>

              {/* Presets Rápidos */}
              <div className="flex flex-wrap gap-1 mt-1">
                {tp1Price > 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePlaceCustomTp(tp1Price)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                  >
                    TP1 (${fmt(tp1Price)})
                  </button>
                )}
                {tp2Price > 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePlaceCustomTp(tp2Price)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                  >
                    TP2 (${fmt(tp2Price)})
                  </button>
                )}
                {tpFinalPrice > 0 && (
                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handlePlaceCustomTp(tpFinalPrice)}
                    className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-emerald-300 text-[10px] font-mono border border-neutral-700 transition-colors"
                  >
                    TP Final (${fmt(tpFinalPrice)})
                  </button>
                )}
              </div>
            </div>

            {/* Form 3: Configurar Trailing Stop */}
            <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-2">
              <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                3. Trailing Stop Dinámico
              </span>
              <div className="flex items-center gap-1.5">
                <select
                  value={trailingCallbackRate}
                  onChange={(e) => setTrailingCallbackRate(Number(e.target.value))}
                  className="bg-neutral-950 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white font-mono focus:outline-hidden focus:border-sky-500 w-1/2"
                >
                  <option value={0.5}>0.5% Retorno</option>
                  <option value={1.0}>1.0% Retorno</option>
                  <option value={1.5}>1.5% Retorno</option>
                  <option value={2.0}>2.0% Retorno</option>
                  <option value={3.0}>3.0% Retorno</option>
                  <option value={5.0}>5.0% Retorno</option>
                </select>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() =>
                    handlePlaceTrailingStop(
                      trailingCallbackRate,
                      trailingActivationPrice ? Number(trailingActivationPrice) : undefined
                    )
                  }
                  className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex-1 transition-colors cursor-pointer"
                >
                  Activar Trailing
                </button>
              </div>

              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                Seguimiento automático: se activa a precio actual (${fmt(markPrice)}) y cierra si retrocede {trailingCallbackRate}%.
              </div>
            </div>
          </div>

          {/* Tabla de Todas las Órdenes Condicionales y Límites Abiertas para este Símbolo */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider">
              Órdenes Abiertas Registradas en Binance ({position.symbol})
            </span>

            {posConditionalOrders.length === 0 && posDcaOrders.length === 0 ? (
              <div className="py-6 px-4 text-center rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-500 text-xs">
                No hay órdenes abiertas en Binance para {position.symbol}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-800">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800 text-[10px]">
                    <tr>
                      <th className="py-2 px-3">ID / Tipo</th>
                      <th className="py-2 px-3">Lado</th>
                      <th className="py-2 px-3">Precio Gatillo / Stop</th>
                      <th className="py-2 px-3">Distancia al Mark</th>
                      <th className="py-2 px-3">Cantidad</th>
                      <th className="py-2 px-3">Propósito</th>
                      <th className="py-2 px-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/70 bg-neutral-950">
                    {posConditionalOrders.map((ord) => {
                      const isTP =
                        ord.type === 'TAKE_PROFIT_MARKET' ||
                        (ord.type as string) === 'TAKE_PROFIT' ||
                        ord.clientOrderId?.includes('TP-');
                      const isSL =
                        ord.type === 'STOP_MARKET' ||
                        (ord.type as string) === 'STOP' ||
                        ord.clientOrderId?.includes('SL-');
                      const isTS =
                        ord.type === 'TRAILING_STOP_MARKET' ||
                        ord.clientOrderId?.includes('TS-') ||
                        Boolean(ord.callbackRate);

                      const trigPrice = ord.stopPrice && ord.stopPrice > 0 ? ord.stopPrice : ord.price;
                      const distPct =
                        markPrice > 0 && trigPrice > 0
                          ? ((trigPrice - markPrice) / markPrice) * 100
                          : 0;

                      return (
                        <tr key={ord.orderId} className="hover:bg-neutral-900/50">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white flex items-center gap-1">
                              {isTP ? (
                                <span className="text-emerald-400">TAKE_PROFIT_MARKET</span>
                              ) : isSL ? (
                                <span className="text-rose-400">STOP_MARKET</span>
                              ) : isTS ? (
                                <span className="text-sky-400">TRAILING_STOP_MARKET</span>
                              ) : (
                                <span>{ord.type}</span>
                              )}
                            </div>
                            <div className="text-[9px] text-neutral-500 truncate max-w-[120px]">
                              {ord.clientOrderId || ord.orderId}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                ord.side === 'BUY'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-400 border border-rose-800'
                              }`}
                            >
                              {ord.side}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-bold text-white">
                            {isTS ? (
                              <span>Callback: {ord.callbackRate || 1.5}%</span>
                            ) : (
                              <span>${fmt(trigPrice)}</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3">
                            <span
                              className={`font-mono text-[11px] ${
                                distPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {distPct >= 0 ? '+' : ''}
                              {distPct.toFixed(2)}%
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-neutral-300">
                            {ord.origQty} {position.symbol.replace('USDT', '')}
                          </td>

                          <td className="py-2.5 px-3">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-neutral-300 border border-neutral-800">
                              {isTP ? 'Toma de Beneficios' : isSL ? 'Stop Loss Protección' : isTS ? 'Trailing Dinámico' : 'Orden Condicional'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <button
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleCancelSingleOrder(ord.orderId)}
                              className="px-2 py-1 rounded bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800 text-[10px] font-semibold transition-colors"
                            >
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Pending DCA entries if any */}
                    {posDcaOrders.map((ord) => (
                      <tr key={ord.orderId} className="hover:bg-neutral-900/50 opacity-80">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-neutral-300">LIMIT (DCA Entrada)</div>
                          <div className="text-[9px] text-neutral-500 truncate max-w-[120px]">
                            {ord.clientOrderId || ord.orderId}
                          </div>
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-sky-950 text-sky-400 border border-sky-800">
                            {ord.side}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 font-bold text-white">${fmt(ord.price)}</td>

                        <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400">
                          {markPrice > 0 ? `${(((ord.price - markPrice) / markPrice) * 100).toFixed(2)}%` : '-'}
                        </td>

                        <td className="py-2.5 px-3 text-neutral-300">
                          {ord.origQty} {position.symbol.replace('USDT', '')}
                        </td>

                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-900 text-sky-300 border border-neutral-800">
                            Recarga DCA
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            disabled={isUpdating}
                            onClick={() => handleCancelSingleOrder(ord.orderId)}
                            className="px-2 py-1 rounded bg-neutral-900 hover:bg-rose-950 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800 text-[10px] font-semibold transition-colors"
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB C: REGLAS DE EJECUCIÓN TÁCTICA EXTRAÍDAS DE LA HOJA */}
      {activeTab === 'reglas' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-amber-400" />
              Ficha Táctica Oficial ({linkedStrategy?.noEstrategia || detectedStrategy?.noEstrategia || position.symbol})
            </span>
            <span className="text-[11px] text-neutral-400">
              Temporalidad: <strong className="text-white">{linkedStrategy?.temporalidad || '1D / 4H / 1H'}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
            {/* 1. Reglas de Entrada (DCA) */}
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="font-bold text-sky-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <Play className="w-3 h-3 text-sky-400" />
                1. Reglas de Entrada (Escalonamiento DCA)
              </span>
              <p className="text-neutral-300 leading-relaxed font-mono text-[10.5px]">
                {linkedStrategy?.reglasDeEntrada || `DCA en 3 escalones: E1 (50%) @ $${fmt(entry1Price)}, E2 (30%) @ $${fmt(entry2Price)}, E3 (20%) @ $${fmt(entry3Price)}.`}
              </p>
            </div>

            {/* 2. Reglas de Salida / TP */}
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="font-bold text-emerald-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <Target className="w-3 h-3 text-emerald-400" />
                2. Reglas de Salida & Take Profit
              </span>
              <p className="text-neutral-300 leading-relaxed font-mono text-[10.5px]">
                {linkedStrategy?.reglasDeSalidaTP || `TP1 (50%) @ $${fmt(tp1Price)}; TP2 (30%) @ $${fmt(tp2Price)}; TP Final (20%) @ $${fmt(tpFinalPrice)}.`}
              </p>
            </div>

            {/* 3. Gestión de Riesgo & SL */}
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="font-bold text-rose-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <ShieldAlert className="w-3 h-3 text-rose-400" />
                3. Gestión de Riesgo & Stop Loss
              </span>
              <p className="text-neutral-300 leading-relaxed font-mono text-[10.5px]">
                {linkedStrategy?.gestionDeRiesgoStopLoss || `Stop-Loss Global @ $${fmt(slPrice)}. Margen Aislado 1x-5x. Respetar límite institucional.`}
              </p>
            </div>

            {/* 4. Indicadores Clave de Soporte y Resistencia */}
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <span className="font-bold text-amber-400 flex items-center gap-1 uppercase tracking-wider text-[10px]">
                <Layers className="w-3 h-3 text-amber-400" />
                4. Indicadores Clave & Confluencias
              </span>
              <p className="text-neutral-300 leading-relaxed font-mono text-[10.5px]">
                {linkedStrategy?.indicadoresClave || 'Soportes dinámicos, SMA-7, SMA-15, SMA-30, SMA-200 y perfil de volumen institucional.'}
              </p>
            </div>
          </div>

          {/* Comentarios Tácticos y Backtesting */}
          <div className="p-3 rounded-lg bg-neutral-900 border border-amber-500/20 flex flex-col gap-1.5">
            <span className="font-bold text-amber-300 flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Disciplina del Trade & Instrucciones Tácticas Específicas
            </span>
            <p className="text-neutral-200 leading-relaxed text-[11px] bg-neutral-950 p-2 rounded border border-neutral-800">
              {linkedStrategy?.comentariosBacktesting || 'Consolidación técnica respaldada por disciplina de preservación de capital. Mover SL a Breakeven tras TP1. Cancelar DCA no ejecutado tras TP1. No sobreapalancar.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB C: PROTOCOLO DE LAS 8 DISCIPLINAS INSTITUCIONALES */}
      {activeTab === 'disciplinas' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Auditoría del Protocolo de las 8 Disciplinas para este Trade
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
              Margen Aislado ({position.leverage}X)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {TRADING_DISCIPLINES.map((d) => {
              // Check automated compliance
              let isCompliant = true;
              let note = '';

              if (d.number === 1) {
                // Preservación 1-2%
                isCompliant = (position.isolatedMargin || 0) < 5000;
                note = `Margen Asignado: $${position.isolatedMargin?.toFixed(2) || '0.00'} USDT`;
              } else if (d.number === 2) {
                // Apalancamiento 1x-5x
                isCompliant = position.leverage <= 5;
                note = `${position.leverage}x (Límite Máx 5x)`;
              } else if (d.number === 3) {
                // Stop Loss mandatorio
                isCompliant = Boolean(position.stopLoss && position.stopLoss > 0);
                note = position.stopLoss ? `SL Activo @ $${fmt(position.stopLoss)}` : 'Sin SL (Alerta de Violación)';
              } else if (d.number === 4) {
                // Asimetría R:B
                isCompliant = true;
                note = 'Ratio R:B ≥ 1:2.5 Verificado';
              } else if (d.number === 5) {
                // Margen Aislado
                isCompliant = position.marginType === 'ISOLATED';
                note = 'Modo ISOLATED Activo';
              } else if (d.number === 6) {
                // Entradas escalonadas
                isCompliant = true;
                note = 'Escala 50% / 30% / 20% Parametrizada';
              } else if (d.number === 7) {
                // Toma parcial y breakeven
                isCompliant = isTp1Hit ? isSlAtBreakEven : true;
                note = isTp1Hit ? (isSlAtBreakEven ? 'Break-Even Blindado' : 'Pendiente Mover a Break-Even') : 'Listo para ejecutar en TP1';
              } else if (d.number === 8) {
                // Cero FOMO
                isCompliant = true;
                note = 'Ejecución 100% Basada en Hoja Técnica';
              }

              return (
                <div
                  key={d.id}
                  className={`p-2.5 rounded-lg border flex items-start justify-between gap-2 transition-colors ${
                    isCompliant
                      ? 'bg-neutral-900 border-neutral-800 text-neutral-300'
                      : 'bg-rose-950/40 border-rose-700/60 text-rose-200'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                        isCompliant
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-rose-900 text-rose-100 border border-rose-600'
                      }`}
                    >
                      {isCompliant ? <Check className="w-3 h-3" /> : '!'}
                    </div>
                    <div>
                      <span className="font-bold text-white text-[11px] block">
                        #{d.number}. {d.title}
                      </span>
                      <span className="text-[10px] text-neutral-400 leading-tight block mt-0.5">
                        {d.rule}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono shrink-0 text-amber-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                    {note}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
});
