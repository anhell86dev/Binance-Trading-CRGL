import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Target,
  Skull,
  ShieldAlert,
  MapPin,
  Clock,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  BookmarkCheck,
  Shield,
} from 'lucide-react';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
import {
  fetch4HourPriceMovement,
  createSynthetic4HMovement,
  FourHourPriceMovement,
} from '../services/hourlyPriceHistoryService';
import { OpenOrder } from '../types/binance';
import { classifyBinanceOrder, ClassifiedOrder } from '../utils/orderClassifier';

export interface StrategyPriceLineProps {
  livePrice: number;
  entry1Price: number;
  entry2Price?: number;
  entry3Price?: number;
  actualEntryPrice?: number; // Real executed entry price of the position
  slPrice: number;
  tp1Price: number;
  tp2Price?: number;
  tpFinalPrice?: number;
  hasHitSL?: boolean;
  isInDangerZone?: boolean;
  hasHitTPBeforeE1?: boolean;
  isNoOperar?: boolean;
  noOperarReason?: string;
  decimalPlaces?: number;
  isLong?: boolean;
  symbol?: string;
  show4HourMovement?: boolean;
  openOrders?: OpenOrder[];
}

export const StrategyPriceLine: React.FC<StrategyPriceLineProps> = ({
  livePrice,
  entry1Price,
  entry2Price,
  entry3Price,
  actualEntryPrice,
  slPrice,
  tp1Price,
  tp2Price,
  tpFinalPrice,
  hasHitSL = false,
  isInDangerZone = false,
  hasHitTPBeforeE1 = false,
  isNoOperar = false,
  noOperarReason,
  decimalPlaces,
  isLong = true,
  symbol,
  show4HourMovement = true,
  openOrders = [],
}) => {
  // 4-Hour Movement State - initialize immediately so there is never a blank wait
  const [fourHourData, setFourHourData] = useState<FourHourPriceMovement | null>(() => {
    if (livePrice && livePrice > 0) {
      return createSynthetic4HMovement(symbol || 'BTCUSDT', livePrice);
    }
    return null;
  });
  const [isLoading4h, setIsLoading4h] = useState(false);
  const [is4hExpanded, setIs4hExpanded] = useState(true);

  // Fetch 4-Hour 1h interval data
  useEffect(() => {
    let isMounted = true;
    const targetSymbol = symbol || '';

    if (!targetSymbol && (!livePrice || livePrice <= 0)) {
      return;
    }

    // Ensure state has at least baseline data immediately
    setFourHourData((prev) => {
      if (!prev && livePrice && livePrice > 0) {
        return createSynthetic4HMovement(targetSymbol || 'BTCUSDT', livePrice);
      }
      return prev;
    });

    const loadMovement = async () => {
      try {
        setIsLoading4h(true);
        const data = await fetch4HourPriceMovement(targetSymbol || 'BTCUSDT', livePrice);
        if (isMounted) {
          setFourHourData(data);
          setIsLoading4h(false);
        }
      } catch {
        if (isMounted) setIsLoading4h(false);
      }
    };

    loadMovement();

    // Poll every 35 seconds to keep 4h movement in sync with live price
    const interval = setInterval(loadMovement, 35000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol, livePrice]);

  const calcPct = (levelPrice?: number) => {
    if (!livePrice || livePrice <= 0 || !levelPrice || levelPrice <= 0) return null;
    return ((levelPrice - livePrice) / livePrice) * 100;
  };

  const fmtPrice = (p: number) => {
    if (symbol) {
      return `$${formatPriceUtil(p, symbol)}`;
    }
    const dec = decimalPlaces !== undefined ? decimalPlaces : (p < 1 ? 4 : 2);
    return `$${p.toFixed(dec)}`;
  };

  const fmtPct = (pct: number | null) => {
    if (pct === null) return '-';
    const sign = pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const e2 = entry2Price && entry2Price > 0 ? entry2Price : 0;
  const e3 = entry3Price && entry3Price > 0 ? entry3Price : 0;
  const tp2 = tp2Price && tp2Price > 0 ? tp2Price : 0;
  const tp3 = tpFinalPrice && tpFinalPrice > 0 ? tpFinalPrice : 0;
  const entryP = actualEntryPrice && actualEntryPrice > 0 ? actualEntryPrice : 0;

  // Classify and extract active orders (SL, TP, and LIMIT) for this symbol
  const [showOrdersOnTrack, setShowOrdersOnTrack] = useState<boolean>(true);
  const cleanSym = (symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
  const symbolOpenOrders = openOrders.filter((o) => {
    if (!o || o.status === 'CANCELED' || o.status === 'EXPIRED' || o.status === 'FILLED') return false;
    const s = (o.symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
    return s === cleanSym;
  });

  const classifiedOrders: ClassifiedOrder[] = symbolOpenOrders.map((o) =>
    classifyBinanceOrder(o, entryP > 0 ? entryP : livePrice)
  );

  const activeSLOrders = classifiedOrders.filter((c) => c.isStopLoss);
  const activeTPOrders = classifiedOrders.filter((c) => c.isTakeProfit);
  const activeLimitOrders = classifiedOrders.filter((c) => c.isLimit);

  // Proximity to open orders (SL, TP, and Limit) within 0.5%
  const ordersNearLivePrice = livePrice > 0
    ? classifiedOrders
        .filter((c) => c.effectivePrice > 0)
        .map((c) => {
          const diffPct = Math.abs(livePrice - c.effectivePrice) / c.effectivePrice;
          return {
            ...c,
            diffPct,
            diffPctStr: (diffPct * 100).toFixed(2),
          };
        })
        .filter((c) => c.diffPct <= 0.005)
    : [];

  // Build levels array with distinct handling for real Entry Price vs Strategy entries
  const rawLevels: Array<{
    key: string;
    label: string;
    price: number;
    type: 'SL' | 'ENTRY' | 'ACTUAL_ENTRY' | 'TP' | 'LIMIT_ORDER';
    isHit?: boolean;
    orderInfo?: ClassifiedOrder;
  }> = [];

  // 1. If explicit orders exist for SL / TP, prioritize their exact activation / limit price
  if (slPrice > 0) {
    rawLevels.push({ key: 'SL', label: 'SL', price: slPrice, type: 'SL', isHit: hasHitSL });
  } else if (activeSLOrders.length > 0) {
    activeSLOrders.forEach((slOrd, i) => {
      rawLevels.push({
        key: `SL_ORD_${slOrd.order.orderId || i}`,
        label: activeSLOrders.length > 1 ? `SL #${i + 1}` : 'SL',
        price: slOrd.effectivePrice,
        type: 'SL',
        isHit: hasHitSL,
        orderInfo: slOrd,
      });
    });
  }

  if (e3 > 0) {
    rawLevels.push({ key: 'E3', label: 'E3', price: e3, type: 'ENTRY' });
  }
  if (e2 > 0) {
    rawLevels.push({ key: 'E2', label: 'E2', price: e2, type: 'ENTRY' });
  }

  // Handle actual entry price vs E1
  if (entryP > 0) {
    if (entry1Price > 0 && Math.abs(entry1Price - entryP) / entryP < 0.001) {
      rawLevels.push({
        key: 'ENTRY',
        label: 'ENTRADA (E1)',
        price: entryP,
        type: 'ACTUAL_ENTRY',
      });
    } else {
      if (entry1Price > 0) {
        rawLevels.push({ key: 'E1', label: 'E1', price: entry1Price, type: 'ENTRY' });
      }
      rawLevels.push({
        key: 'ENTRY',
        label: 'ENTRADA',
        price: entryP,
        type: 'ACTUAL_ENTRY',
      });
    }
  } else if (entry1Price > 0) {
    rawLevels.push({ key: 'E1', label: 'E1', price: entry1Price, type: 'ENTRY' });
  }

  // TP levels
  if (tp1Price > 0) {
    rawLevels.push({ key: 'TP1', label: 'TP1', price: tp1Price, type: 'TP' });
  } else if (activeTPOrders.length > 0) {
    activeTPOrders.forEach((tpOrd, i) => {
      rawLevels.push({
        key: `TP_ORD_${tpOrd.order.orderId || i}`,
        label: activeTPOrders.length > 1 ? `TP #${i + 1}` : 'TP',
        price: tpOrd.effectivePrice,
        type: 'TP',
        orderInfo: tpOrd,
      });
    });
  }

  if (tp2 > 0) {
    rawLevels.push({ key: 'TP2', label: 'TP2', price: tp2, type: 'TP' });
  }
  if (tp3 > 0) {
    rawLevels.push({ key: 'TP3', label: 'TP3', price: tp3, type: 'TP' });
  }

  // 2. Add open LIMIT orders onto the track if toggled
  if (showOrdersOnTrack && activeLimitOrders.length > 0) {
    activeLimitOrders.forEach((limOrd, i) => {
      const p = limOrd.effectivePrice;
      // Avoid duplicate marker if it's already an E1/E2/E3
      const isAlreadyOnTrack = rawLevels.some((lvl) => Math.abs(lvl.price - p) / (p || 1) < 0.0005);
      if (!isAlreadyOnTrack && p > 0) {
        rawLevels.push({
          key: `LIM_${limOrd.order.orderId || i}`,
          label: `LIMIT ${limOrd.order.side === 'BUY' ? 'COMPRA' : 'VENTA'}`,
          price: p,
          type: 'LIMIT_ORDER',
          orderInfo: limOrd,
        });
      }
    });
  }

  // Include 4h candles (open, close, high, low), 5m, 15m and daily candle in the horizontal track scale
  const candlePrices = [
    ...(fourHourData?.candles?.length
      ? fourHourData.candles.flatMap((c) => [c.open, c.close, c.high, c.low])
      : []),
    ...(fourHourData?.candle5m
      ? [fourHourData.candle5m.open, fourHourData.candle5m.close, fourHourData.candle5m.high, fourHourData.candle5m.low]
      : []),
    ...(fourHourData?.candle15m
      ? [fourHourData.candle15m.open, fourHourData.candle15m.close, fourHourData.candle15m.high, fourHourData.candle15m.low]
      : []),
  ];

  const dailyPrices = fourHourData?.dailyCandle
    ? [fourHourData.dailyCandle.open, fourHourData.dailyCandle.close, fourHourData.dailyCandle.high, fourHourData.dailyCandle.low]
    : [];

  const allPrices = [
    ...rawLevels.map((l) => l.price),
    livePrice,
    ...candlePrices,
    ...dailyPrices,
  ].filter((p) => p > 0);

  const minP = Math.min(...allPrices);
  const maxP = Math.max(...allPrices);
  const range = maxP - minP || 1;

  // Map position percentage along horizontal track (padding between 6% and 94%)
  const getTrackPos = (p: number) => {
    if (range <= 0) return 50;
    const rawPct = ((p - minP) / range) * 100;
    return Math.min(94, Math.max(6, rawPct));
  };

  const livePosPct = getTrackPos(livePrice);

  // Danger zone calculation (between SL and lowest entry e3/e2/e1/entryP)
  const lowestEntry = isLong
    ? (e3 > 0 ? e3 : (e2 > 0 ? e2 : (entry1Price > 0 ? entry1Price : entryP)))
    : (e3 > 0 ? e3 : (e2 > 0 ? e2 : (entry1Price > 0 ? entry1Price : entryP)));
  const highestEntry = !isLong
    ? (e3 > 0 ? e3 : (e2 > 0 ? e2 : (entry1Price > 0 ? entry1Price : entryP)))
    : (e3 > 0 ? e3 : (e2 > 0 ? e2 : (entry1Price > 0 ? entry1Price : entryP)));

  const bound1 = isLong ? slPrice : highestEntry;
  const bound2 = isLong ? lowestEntry : slPrice;

  const pos1 = bound1 > 0 ? getTrackPos(bound1) : 0;
  const pos2 = bound2 > 0 ? getTrackPos(bound2) : 0;
  const dangerLeft = bound1 > 0 && bound2 > 0 ? Math.min(pos1, pos2) : 0;
  const dangerWidth = bound1 > 0 && bound2 > 0 ? Math.max(1, Math.abs(pos1 - pos2)) : 0;

  return (
    <div
      className={`w-full rounded-xl p-3 font-mono text-xs transition-all ${
        isInDangerZone || isNoOperar
          ? 'bg-rose-950/30 border-2 border-rose-500/90 shadow-[0_0_20px_rgba(244,63,94,0.35)]'
          : 'bg-neutral-950/95 border border-neutral-800/90 shadow-xs'
      }`}
    >
      {/* Header Title & Status Badges */}
      <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between font-bold flex-wrap gap-1.5">
        <span className="flex items-center gap-1.5 text-neutral-300 flex-wrap">
          <Activity className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Barra Horizontal de Precios (Niveles vs. Precio Live)</span>

          {/* Badge Destacado de Precio de Entrada */}
          {entryP > 0 && (
            <span
              className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-950/90 text-sky-300 border border-sky-600/70 font-mono text-[10px] font-black shadow-xs"
              title="Precio de Entrada de la Posición"
            >
              <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
              <span>Entrada:</span>
              <span className="text-white font-black">{fmtPrice(entryP)}</span>
              {livePrice > 0 && (
                <span
                  className={`text-[9px] font-bold ${
                    isLong
                      ? livePrice >= entryP
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                      : entryP >= livePrice
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  ({isLong ? (livePrice >= entryP ? '+' : '') : (entryP >= livePrice ? '+' : '-')}{Math.abs(((livePrice - entryP) / entryP) * 100).toFixed(2)}%)
                </span>
              )}
            </span>
          )}

          {/* Badge Resumen de Órdenes Abiertas (SL, TP, LIMIT) */}
          {symbolOpenOrders.length > 0 && (
            <button
              onClick={() => setShowOrdersOnTrack(!showOrdersOnTrack)}
              className={`ml-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${
                showOrdersOnTrack
                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-600/70 shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-700'
              }`}
              title="Haz clic para mostrar u ocultar la proyección de órdenes activas (SL, TP y Limit) en la barra"
            >
              <SlidersHorizontal className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>Órdenes:</span>
              {activeSLOrders.length > 0 && (
                <span className="px-1 rounded bg-rose-900/80 text-rose-200 text-[9px] border border-rose-700/60 font-bold">
                  {activeSLOrders.length} SL
                </span>
              )}
              {activeTPOrders.length > 0 && (
                <span className="px-1 rounded bg-emerald-900/80 text-emerald-200 text-[9px] border border-emerald-700/60 font-bold">
                  {activeTPOrders.length} TP
                </span>
              )}
              {activeLimitOrders.length > 0 && (
                <span className="px-1 rounded bg-cyan-900/80 text-cyan-200 text-[9px] border border-cyan-700/60 font-bold">
                  {activeLimitOrders.length} Limit
                </span>
              )}
            </button>
          )}
          {fourHourData && (
            <button
              onClick={() => setIs4hExpanded(!is4hExpanded)}
              className={`ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold cursor-pointer transition-all hover:scale-105 ${
                fourHourData.isBullish
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 shadow-xs'
                  : 'bg-rose-950/80 text-rose-300 border-rose-600/60 shadow-xs'
              }`}
              title="Clic para mostrar/ocultar las mini-barras (1H, 2h, 3h, 4h y Diario)"
            >
              <Clock className="w-3 h-3 shrink-0" />
              <span>4h:</span>
              <span className="font-black">
                {fourHourData.netChangePct >= 0 ? '+' : ''}
                {fourHourData.netChangePct.toFixed(2)}%
              </span>
              {fourHourData.isBullish ? (
                <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />
              ) : (
                <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />
              )}
              {fourHourData.candle5m && (
                <span
                  className={`ml-1 px-1 rounded text-[9px] font-black ${
                    fourHourData.candle5m.isBullish
                      ? 'bg-teal-900/90 text-teal-200 border border-teal-700/60'
                      : 'bg-rose-900/90 text-rose-200 border border-rose-700/60'
                  }`}
                  title={`Variación 5m: ${fourHourData.candle5m.changePct >= 0 ? '+' : ''}${fourHourData.candle5m.changePct.toFixed(2)}%`}
                >
                  5m: {fourHourData.candle5m.changePct >= 0 ? '+' : ''}
                  {fourHourData.candle5m.changePct.toFixed(1)}%
                </span>
              )}
              {fourHourData.candle15m && (
                <span
                  className={`ml-1 px-1 rounded text-[9px] font-black ${
                    fourHourData.candle15m.isBullish
                      ? 'bg-emerald-900/90 text-emerald-200 border border-emerald-700/60'
                      : 'bg-rose-900/90 text-rose-200 border border-rose-700/60'
                  }`}
                  title={`Variación 15m: ${fourHourData.candle15m.changePct >= 0 ? '+' : ''}${fourHourData.candle15m.changePct.toFixed(2)}%`}
                >
                  15m: {fourHourData.candle15m.changePct >= 0 ? '+' : ''}
                  {fourHourData.candle15m.changePct.toFixed(1)}%
                </span>
              )}
              {fourHourData.dailyCandle && (
                <span
                  className={`ml-1 px-1 rounded text-[9px] font-black ${
                    fourHourData.dailyCandle.isBullish
                      ? 'bg-indigo-900/90 text-indigo-200 border border-indigo-700/60'
                      : 'bg-rose-900/90 text-rose-200 border border-rose-700/60'
                  }`}
                  title={`Variación diaria (24h/Hoy): ${fourHourData.dailyCandle.changePct >= 0 ? '+' : ''}${fourHourData.dailyCandle.changePct.toFixed(2)}%`}
                >
                  1D: {fourHourData.dailyCandle.changePct >= 0 ? '+' : ''}
                  {fourHourData.dailyCandle.changePct.toFixed(1)}%
                </span>
              )}
              {is4hExpanded ? (
                <ChevronUp className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              ) : (
                <ChevronDown className="w-2.5 h-2.5 ml-0.5 opacity-70" />
              )}
            </button>
          )}
        </span>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Danger Zone Active Badge */}
          {isInDangerZone && (
            <span className="inline-flex items-center gap-1 text-rose-200 font-extrabold bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-500 animate-pulse text-[10px] shadow-[0_0_12px_rgba(244,63,94,0.5)]">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>⚠️ EN ZONA DE PELIGRO</span>
            </span>
          )}

          {/* Premature TP Hit Badge */}
          {hasHitTPBeforeE1 && (
            <span className="inline-flex items-center gap-1 text-amber-200 font-extrabold bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-500 animate-pulse text-[10px] shadow-[0_0_10px_rgba(245,158,11,0.5)]">
              <Target className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>🎯 TP ALCANZADO ANTES DE E1</span>
            </span>
          )}

          {/* SL Hit Badge */}
          {hasHitSL && (
            <span className="inline-flex items-center gap-1 text-rose-300 font-extrabold bg-rose-950/90 px-2.5 py-0.5 rounded-full border border-rose-500/80 animate-pulse text-[10px] shadow-[0_0_10px_rgba(244,63,94,0.35)]">
              <Skull className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>TOCÓ STOP LOSS</span>
            </span>
          )}

          {/* NO OPERAR GLOBAL BADGE */}
          {isNoOperar && (
            <span
              className="inline-flex items-center gap-1 text-white font-extrabold bg-rose-600 px-3 py-0.5 rounded-full border border-rose-300 animate-bounce text-[10px] shadow-[0_0_14px_rgba(244,63,94,0.8)]"
              title={noOperarReason || 'No operar'}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-white shrink-0" />
              <span>🚫 NO OPERAR</span>
            </span>
          )}
        </div>
      </div>

      {/* Visual notification banner when live price is within < 0.5% of an open order (SL, TP, Limit) */}
      {ordersNearLivePrice.length > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-amber-950/50 border border-amber-500/80 text-amber-200 flex flex-col gap-1 shadow-md animate-pulse">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5 text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>ALERTA DE PROXIMIDAD DE ÓRDENES (&lt; 0.5% del Precio LIVE)</span>
            </span>
            <span className="text-[9px] bg-amber-900/80 text-amber-200 px-1.5 py-0.5 rounded font-mono border border-amber-600/60">
              LIVE: {fmtPrice(livePrice)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            {ordersNearLivePrice.map((ord, idx) => (
              <span
                key={`near-ord-${ord.order.orderId || idx}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono font-bold ${
                  ord.isStopLoss
                    ? 'bg-rose-950/90 text-rose-200 border-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                    : ord.isTakeProfit
                    ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    : 'bg-cyan-950/90 text-cyan-200 border-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                }`}
              >
                <span>{ord.isStopLoss ? '⚠️' : ord.isTakeProfit ? '🎯' : '🔔'}</span>
                <span>{ord.categoryLabel}:</span>
                <strong className="text-white">{fmtPrice(ord.effectivePrice)}</strong>
                <span className="opacity-90">({ord.diffPctStr}% dist.)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* CONTINUOUS HORIZONTAL PRICE TRACK BAR (NIVELES PRINCIPALES) */}
      <div className="relative w-full pt-8 pb-9 px-2 my-1">
        {/* Track Line Background */}
        <div className="h-3 w-full bg-neutral-900 rounded-full border border-neutral-800 relative overflow-hidden flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-950/80 via-amber-950/50 to-emerald-950/80 opacity-60" />

          {/* RED DANGER ZONE HIGHLIGHT OVERLAY (SL ↔ E3 / Lowest Entry) */}
          {slPrice > 0 && (lowestEntry > 0 || highestEntry > 0) && (
            <div
              className="absolute h-full bg-rose-600/70 border-y border-rose-400/90 shadow-[0_0_12px_rgba(244,63,94,0.8)] animate-pulse"
              style={{ left: `${dangerLeft}%`, width: `${dangerWidth}%` }}
              title="ZONA DE PELIGRO ROJA (SL ↔ E3/E1/Entrada)"
            />
          )}
        </div>

        {/* DANGER ZONE TEXT LABEL ON TRACK */}
        {slPrice > 0 && (lowestEntry > 0 || highestEntry > 0) && (
          <div
            className="absolute -top-3.5 -translate-x-1/2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-500/80 text-[8px] font-extrabold uppercase tracking-tight shadow-md z-5 pointer-events-none whitespace-nowrap animate-pulse"
            style={{ left: `${dangerLeft + dangerWidth / 2}%` }}
          >
            <AlertTriangle className="w-2.5 h-2.5 text-rose-400 shrink-0" />
            <span>ZONA DE PELIGRO (SL ↔ {e3 > 0 ? 'E3' : e2 > 0 ? 'E2' : 'ENTRADA'})</span>
          </div>
        )}

        {/* PRICE LEVEL NODES ALONG THE TRACK (SL, TP, ENTRADAS, ORDENES LIMIT) */}
        {rawLevels.map((lvl) => {
          const posPct = getTrackPos(lvl.price);
          const distPct = calcPct(lvl.price);
          const isSL = lvl.type === 'SL';
          const isTP = lvl.type === 'TP';
          const isActualEntry = lvl.type === 'ACTUAL_ENTRY';
          const isLimitOrder = lvl.type === 'LIMIT_ORDER';

          let nodeColor = 'bg-amber-400 border-amber-300 text-amber-300';
          if (isSL) {
            nodeColor = lvl.isHit
              ? 'bg-rose-500 border-rose-300 text-rose-200 animate-bounce shadow-[0_0_12px_rgba(244,63,94,0.9)]'
              : 'bg-rose-500 border-rose-400 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
          } else if (isTP) {
            nodeColor = 'bg-emerald-400 border-emerald-300 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]';
          } else if (isActualEntry) {
            nodeColor =
              'bg-sky-400 border-white text-sky-200 ring-2 ring-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.9)]';
          } else if (isLimitOrder) {
            const isBuy = lvl.orderInfo?.order.side === 'BUY';
            nodeColor = isBuy
              ? 'bg-cyan-500 border-cyan-300 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.7)]'
              : 'bg-purple-500 border-purple-300 text-purple-200 shadow-[0_0_8px_rgba(168,85,247,0.7)]';
          }

          return (
            <div
              key={lvl.key}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
              style={{ left: `${posPct}%` }}
              title={`${lvl.label}: ${fmtPrice(lvl.price)} (${fmtPct(distPct)} vs Live)${
                lvl.orderInfo ? ` [Orden ID: ${lvl.orderInfo.order.orderId || '-'}, Tipo: ${lvl.orderInfo.order.type}]` : ''
              }`}
            >
              {/* TOP LABEL (Name & Price) */}
              <div className="absolute -top-7 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[9px] font-extrabold uppercase tracking-tighter flex items-center gap-0.5">
                  {lvl.isHit && <Skull className="w-2.5 h-2.5 text-rose-400" />}
                  {isActualEntry && <MapPin className="w-2.5 h-2.5 text-sky-400" />}
                  {isLimitOrder && <SlidersHorizontal className="w-2.5 h-2.5 text-cyan-400" />}
                  {isSL && !lvl.isHit && <Shield className="w-2.5 h-2.5 text-rose-400" />}
                  {isTP && <BookmarkCheck className="w-2.5 h-2.5 text-emerald-400" />}
                  <span
                    className={
                      isSL
                        ? 'text-rose-400'
                        : isTP
                        ? 'text-emerald-400'
                        : isActualEntry
                        ? 'text-sky-300 font-black'
                        : isLimitOrder
                        ? lvl.orderInfo?.order.side === 'BUY'
                          ? 'text-cyan-300'
                          : 'text-purple-300'
                        : 'text-amber-300'
                    }
                  >
                    {lvl.label}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-bold leading-tight ${
                    isActualEntry
                      ? 'text-sky-100 font-black'
                      : isLimitOrder
                      ? 'text-cyan-100 font-bold'
                      : 'text-white'
                  }`}
                >
                  {fmtPrice(lvl.price)}
                </span>
              </div>

              {/* Node Dot / Pin */}
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 transition-transform group-hover:scale-125 shadow-md ${nodeColor}`}
              />

              {/* BOTTOM LABEL (% Distance from Live) */}
              <div className="absolute -bottom-6 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`text-[9px] font-bold px-1 py-0.2 rounded ${
                    isActualEntry
                      ? 'text-sky-300 bg-sky-950/90 border border-sky-700/80'
                      : isLimitOrder
                      ? 'text-cyan-300 bg-cyan-950/90 border border-cyan-700/80'
                      : (distPct || 0) >= 0
                      ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/50'
                      : 'text-rose-400 bg-rose-950/80 border border-rose-800/50'
                  }`}
                >
                  {fmtPct(distPct)}
                </span>
              </div>
            </div>
          );
        })}

        {/* LIVE PRICE NEEDLE / PIN MARKER */}
        <div
          className="absolute top-0 bottom-0 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none"
          style={{ left: `${livePosPct}%` }}
        >
          {/* Top Live Badge */}
          <div
            className={`absolute -top-8 border px-2 py-0.5 rounded-md font-extrabold text-[10px] flex items-center gap-1 whitespace-nowrap ${
              isInDangerZone
                ? 'bg-rose-950/95 text-rose-200 border-rose-400 shadow-[0_0_14px_rgba(244,63,94,0.8)] animate-bounce'
                : 'bg-cyan-950/95 text-cyan-300 border-cyan-400/90 shadow-[0_0_12px_rgba(34,211,238,0.5)] animate-pulse'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isInDangerZone ? 'bg-rose-400 animate-ping' : 'bg-cyan-400 animate-ping'
              }`}
            />
            <span>LIVE: {fmtPrice(livePrice)}</span>
          </div>

          {/* Vertical Needle Line */}
          <div
            className={`w-0.5 h-full ${
              isInDangerZone
                ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.9)]'
                : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
            }`}
          />

          {/* Bottom Live Reference Pin */}
          <div className="absolute -bottom-6 bg-cyan-950 text-cyan-300 text-[9px] font-bold px-1 py-0.2 rounded border border-cyan-800 whitespace-nowrap">
            0.00%
          </div>
        </div>
      </div>

      {/* LÍNEAS GRÁFICAS DE PRECIOS JUNTAS (5M, 15M, 1H/Actual, 2h, 3h, 4h y Diario en una SOLA pista gráfica) */}
      {show4HourMovement && fourHourData && is4hExpanded && (fourHourData.candles.length > 0 || fourHourData.dailyCandle || fourHourData.candle5m || fourHourData.candle15m) && (
        <div className="mt-3 pt-2.5 border-t border-neutral-800/80">
          {/* Header del desglose horario, 5M, 15M y diario */}
          <div className="flex items-center justify-between text-[10px] text-neutral-400 mb-2 px-1">
            <span className="flex items-center gap-1.5 font-bold text-neutral-300">
              <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Líneas Gráficas de Precios Juntas (5M, 15M, 1H / Actual, 2h, 3h, 4h y Diario en una sola escala)</span>
            </span>
            <span className="text-[9px] text-neutral-400 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span className="text-amber-300 font-bold">Empezó (O)</span>
              </span>
              <span className="text-neutral-600">|</span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span className="text-emerald-300 font-bold">Terminó (C)</span>
              </span>
            </span>
          </div>

          {(() => {
            const barsToRender: Array<{
              key: string;
              candle: (typeof fourHourData.candles)[0];
              badgeLabel: string;
              badgeClass: string;
              subHour: string;
              isLive: boolean;
              isDaily: boolean;
            }> = [];

            // 0. 5M (Vela actual / reciente de 5 minutos)
            if (fourHourData.candle5m) {
              barsToRender.push({
                key: 'bar-5m',
                candle: fourHourData.candle5m,
                badgeLabel: '5M',
                badgeClass: 'bg-teal-950 text-teal-300 border border-teal-600/80 font-black',
                subHour: fourHourData.candle5m.shortHour || '5m',
                isLive: true,
                isDaily: false,
              });
            }

            // 0.1 15M (Vela actual / reciente de 15 minutos)
            if (fourHourData.candle15m) {
              barsToRender.push({
                key: 'bar-15m',
                candle: fourHourData.candle15m,
                badgeLabel: '15M',
                badgeClass: 'bg-emerald-950 text-emerald-300 border border-emerald-600/80 font-black',
                subHour: fourHourData.candle15m.shortHour || '15m',
                isLive: true,
                isDaily: false,
              });
            }

            if (fourHourData.candles.length > 0) {
              // 1. 1h / Actual (la hora más reciente en curso)
              const c1 = fourHourData.candles[fourHourData.candles.length - 1];
              barsToRender.push({
                key: 'bar-1h',
                candle: c1,
                badgeLabel: '1h / Actual',
                badgeClass: 'bg-cyan-950 text-cyan-300 border border-cyan-700 font-black',
                subHour: c1.shortHour,
                isLive: true,
                isDaily: false,
              });

              // 2. 2h (hace 2 horas)
              if (fourHourData.candles.length >= 2) {
                const c2 = fourHourData.candles[fourHourData.candles.length - 2];
                barsToRender.push({
                  key: 'bar-2h',
                  candle: c2,
                  badgeLabel: '2h',
                  badgeClass: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
                  subHour: c2.shortHour,
                  isLive: false,
                  isDaily: false,
                });
              }

              // 3. 3h (hace 3 horas)
              if (fourHourData.candles.length >= 3) {
                const c3 = fourHourData.candles[fourHourData.candles.length - 3];
                barsToRender.push({
                  key: 'bar-3h',
                  candle: c3,
                  badgeLabel: '3h',
                  badgeClass: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
                  subHour: c3.shortHour,
                  isLive: false,
                  isDaily: false,
                });
              }

              // 4. 4h (hace 4 horas)
              if (fourHourData.candles.length >= 4) {
                const c4 = fourHourData.candles[fourHourData.candles.length - 4];
                barsToRender.push({
                  key: 'bar-4h',
                  candle: c4,
                  badgeLabel: '4h',
                  badgeClass: 'bg-neutral-800 text-neutral-300 border border-neutral-700',
                  subHour: c4.shortHour,
                  isLive: false,
                  isDaily: false,
                });
              }
            }

            // 5. Diario (vela de hoy completa)
            if (fourHourData.dailyCandle) {
              barsToRender.push({
                key: 'bar-daily',
                candle: fourHourData.dailyCandle,
                badgeLabel: 'Diario',
                badgeClass: 'bg-indigo-950 text-indigo-300 border border-indigo-600/80 shadow-xs font-black',
                subHour: fourHourData.dailyCandle.shortHour || 'Hoy',
                isLive: false,
                isDaily: true,
              });
            }

            return (
              <div className="rounded-xl bg-neutral-950/95 border border-neutral-800/90 p-3 shadow-inner">
                {/* 1. ÚNICA PISTA GRÁFICA COMPARTIDA CON TODAS LAS LÍNEAS DE PRECIO JUNTAS Y ENLACES ENTRE HORAS */}
                <div className="relative w-full h-52 bg-neutral-900/90 rounded-lg border border-neutral-800/90 overflow-hidden select-none">
                  {/* Rejilla de fondo */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#26262615_1px,transparent_1px)] bg-[size:40px_100%] pointer-events-none" />

                  {/* SVG OVERLAY: LÍNEAS ANIMADAS QUE UNEN EL FIN (Cierre) DE CADA HORA CON EL INICIO (Apertura) DE LA SIGUIENTE */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none z-15"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="flowGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                        <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8" />
                      </linearGradient>
                      <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {barsToRender.map((currItem, idx) => {
                      if (idx >= barsToRender.length - 1) return null;
                      const nextItem = barsToRender[idx + 1];

                      // Conectar el punto de inicio de la fila actual con el punto de fin de la hora anterior
                      // En el orden cronológico: 4h terminó en c4.close -> 3h empezó en c3.open
                      // barsToRender está ordenado: [0]: 1H/Actual, [1]: 2h, [2]: 3h, [3]: 4h, [4]: Diario
                      // La unión temporal entre filas consecutivas une:
                      // Y1: centro de la fila idx
                      // X1: término (close) o inicio de esa hora
                      // Y2: centro de la fila idx + 1
                      // X2: inicio (open) de la hora siguiente
                      const totalBars = barsToRender.length;
                      const rowHeightPct = 100 / totalBars;
                      const y1Pct = idx * rowHeightPct + rowHeightPct / 2;
                      const y2Pct = (idx + 1) * rowHeightPct + rowHeightPct / 2;

                      // La fila idx (más reciente) empezó en currItem.candle.open y la anterior (idx + 1) terminó en nextItem.candle.close
                      const x1Pct = getTrackPos(currItem.candle.open);
                      const x2Pct = getTrackPos(nextItem.candle.close);

                      // Curva bezier suave en S conectando ambas horas
                      const midY = (y1Pct + y2Pct) / 2;
                      const pathD = `M ${x2Pct}% ${y2Pct}% C ${x2Pct}% ${midY}%, ${x1Pct}% ${midY}%, ${x1Pct}% ${y1Pct}%`;

                      return (
                        <g key={`connector-${currItem.key}-${nextItem.key}`}>
                          {/* Sombra difusa de la conexión */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="rgba(56, 189, 248, 0.25)"
                            strokeWidth="4"
                            vectorEffect="non-scaling-stroke"
                          />
                          {/* Línea animada discontinua con flujo activo */}
                          <path
                            d={pathD}
                            fill="none"
                            stroke="url(#flowGlow)"
                            strokeWidth="2"
                            className="anim-connector-dash"
                            vectorEffect="non-scaling-stroke"
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {/* Guía vertical de precio de entrada real si existe */}
                  {entryP > 0 && (
                    <div
                      className="absolute top-0 bottom-0 w-px bg-sky-400/60 z-20 pointer-events-none border-r border-dashed border-sky-400"
                      style={{ left: `${getTrackPos(entryP)}%` }}
                    >
                      <span className="absolute bottom-0.5 -translate-x-1/2 bg-sky-950 text-sky-300 text-[8px] font-bold px-1 rounded border border-sky-800 shadow-xs whitespace-nowrap">
                        ENTRADA: {fmtPrice(entryP)}
                      </span>
                    </div>
                  )}

                  {/* Todas las líneas gráficas dibujadas juntas una tras otra verticalmente en la misma pista */}
                  {barsToRender.map((item, index) => {
                    const { candle, badgeLabel, badgeClass, subHour, isBull, isLive, isDaily, key } = {
                      ...item,
                      isBull: item.candle.isBullish,
                    };
                    const openPos = getTrackPos(candle.open);
                    const closePos = getTrackPos(candle.close);
                    const lowPos = getTrackPos(candle.low);
                    const highPos = getTrackPos(candle.high);
                    const barLeft = Math.min(openPos, closePos);
                    const barWidth = Math.max(2.2, Math.abs(closePos - openPos));
                    const wickLeft = Math.min(lowPos, highPos);
                    const wickWidth = Math.max(1, Math.abs(highPos - lowPos));

                    // Posicionamiento vertical dentro de la misma pista (distribución equitativa)
                    const totalBars = barsToRender.length;
                    const rowHeightPercent = 100 / totalBars;
                    const topPos = index * rowHeightPercent;

                    return (
                      <div
                        key={key}
                        className={`absolute w-full flex items-center transition-colors group ${
                          isLive ? 'bg-cyan-500/10' : isDaily ? 'bg-indigo-500/10' : ''
                        }`}
                        style={{
                          top: `${topPos}%`,
                          height: `${rowHeightPercent}%`,
                        }}
                      >
                        {/* Línea horizontal tenue que divide cada nivel */}
                        {index > 0 && (
                          <div className="absolute top-0 left-0 right-0 h-px bg-neutral-800/70 pointer-events-none" />
                        )}

                        {/* Etiqueta fija en el extremo izquierdo de la pista */}
                        <div className="absolute left-2 z-25 flex items-center gap-1.5 pointer-events-none">
                          <span
                            className={`px-1.5 py-0.2 rounded font-black text-[8px] uppercase tracking-wider ${badgeClass}`}
                          >
                            {badgeLabel}
                          </span>
                          <span className="text-[8px] font-mono text-neutral-400">({subHour})</span>
                          <span
                            className={`text-[8px] font-black px-1 rounded flex items-center gap-0.5 ${
                              isBull ? 'text-emerald-400 bg-emerald-950/80 border border-emerald-800/60' : 'text-rose-400 bg-rose-950/80 border border-rose-800/60'
                            }`}
                          >
                            {isBull ? '▲ +' : '▼ '}
                            {candle.changePct.toFixed(2)}%
                          </span>
                        </div>

                        {/* Mecha de rango (Mínimo a Máximo) en la escala común */}
                        <div
                          className="absolute h-0.5 bg-neutral-500/80 rounded-full pointer-events-none"
                          style={{ left: `${wickLeft}%`, width: `${wickWidth}%` }}
                          title={`Rango ${badgeLabel}: ${fmtPrice(candle.low)} ↔ ${fmtPrice(candle.high)}`}
                        />

                        {/* Barra gráfica de Apertura a Cierre con movimiento continuo (anim-flow) según la dirección */}
                        <div
                          className={`absolute h-3.5 rounded flex items-center justify-between px-1 transition-all shadow-md z-20 overflow-hidden ${
                            isBull
                              ? 'bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-700 border border-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.5)] anim-flow-bull'
                              : 'bg-gradient-to-r from-rose-700 via-rose-400 to-rose-700 border border-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.5)] anim-flow-bear'
                          }`}
                          style={{ left: `${barLeft}%`, width: `${barWidth}%` }}
                          title={`${badgeLabel} (${subHour}): Empezó ${fmtPrice(candle.open)} ➔ Terminó ${fmtPrice(candle.close)} (${fmtPct(candle.changePct)})`}
                        >
                          {/* Flechas animadas de dirección del flujo de precio */}
                          <div className={`w-full flex items-center ${isBull ? 'justify-end' : 'justify-start'} gap-1 opacity-90 text-[8px] font-black text-black pointer-events-none`}>
                            <span className="animate-pulse">{isBull ? '▶▶' : '◀◀'}</span>
                          </div>
                        </div>

                        {/* Marcador de INICIO (Donde empezó - Ámbar) */}
                        <div
                          className="absolute -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-neutral-900 shadow-[0_0_8px_rgba(251,191,36,0.8)] z-25 flex items-center justify-center pointer-events-none"
                          style={{ left: `${openPos}%`, top: '50%' }}
                          title={`${badgeLabel}: Empezó (Open) en ${fmtPrice(candle.open)}`}
                        >
                          <div className="w-1 h-1 rounded-full bg-amber-950" />
                        </div>

                        {/* Marcador de FIN (Donde terminó - Verde/Rojo con pulso) */}
                        <div
                          className={`absolute -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-neutral-900 shadow-md z-25 flex items-center justify-center pointer-events-none ${
                            isBull ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                          }`}
                          style={{ left: `${closePos}%`, top: '50%' }}
                          title={`${badgeLabel}: Terminó (Close) en ${fmtPrice(candle.close)}`}
                        >
                          <div className="w-1 h-1 rounded-full bg-black" />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. TABLA COMPACTA DE VALORES (EMPEZÓ ➔ TERMINÓ) ALINEADA DIRECTAMENTE ABAJO */}
                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5 text-[9px] font-mono">
                  {barsToRender.map((item) => {
                    const isBull = item.candle.isBullish;
                    return (
                      <div
                        key={`stat-${item.key}`}
                        className={`px-2 py-1 rounded-md border flex flex-col gap-0.5 ${
                          item.isLive
                            ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                            : item.isDaily
                            ? 'bg-indigo-950/40 border-indigo-800/80 text-indigo-200'
                            : 'bg-neutral-900/60 border-neutral-800/80 text-neutral-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{item.badgeLabel}</span>
                          <span className={isBull ? 'text-emerald-400' : 'text-rose-400'}>
                            {isBull ? '▲ +' : '▼ '}
                            {item.candle.changePct.toFixed(2)}%
                          </span>
                        </div>
                        <div className="text-[8px] text-neutral-400 flex items-center justify-between">
                          <span>
                            O: <strong className="text-amber-300">{fmtPrice(item.candle.open)}</strong>
                          </span>
                          <span>➔</span>
                          <span>
                            C:{' '}
                            <strong className={isBull ? 'text-emerald-300' : 'text-rose-300'}>
                              {fmtPrice(item.candle.close)}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
