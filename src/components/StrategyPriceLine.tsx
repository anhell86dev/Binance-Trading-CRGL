import React from 'react';
import { Activity, AlertTriangle, Target, Skull, ShieldAlert, MapPin } from 'lucide-react';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';

export interface StrategyPriceLineProps {
  livePrice: number;
  entry1Price: number;
  entry2Price?: number;
  entry3Price?: number;
  actualEntryPrice?: number; // Precio de Entrada real ejecutado en la posición
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
}) => {
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

  // Build levels array with distinct handling for real Entry Price vs Strategy entries
  const rawLevels: Array<{
    key: string;
    label: string;
    price: number;
    type: 'SL' | 'ENTRY' | 'ACTUAL_ENTRY' | 'TP';
    isHit?: boolean;
  }> = [];

  if (slPrice > 0) {
    rawLevels.push({ key: 'SL', label: 'SL', price: slPrice, type: 'SL', isHit: hasHitSL });
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

  if (tp1Price > 0) {
    rawLevels.push({ key: 'TP1', label: 'TP1', price: tp1Price, type: 'TP' });
  }
  if (tp2 > 0) {
    rawLevels.push({ key: 'TP2', label: 'TP2', price: tp2, type: 'TP' });
  }
  if (tp3 > 0) {
    rawLevels.push({ key: 'TP3', label: 'TP3', price: tp3, type: 'TP' });
  }

  const allPrices = [...rawLevels.map((l) => l.price), livePrice].filter((p) => p > 0);
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

  const entryDistPct = entryP > 0 ? calcPct(entryP) : null;

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

      {/* CONTINUOUS HORIZONTAL PRICE TRACK BAR */}
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

        {/* PRICE LEVEL NODES ALONG THE TRACK */}
        {rawLevels.map((lvl) => {
          const posPct = getTrackPos(lvl.price);
          const distPct = calcPct(lvl.price);
          const isSL = lvl.type === 'SL';
          const isTP = lvl.type === 'TP';
          const isActualEntry = lvl.type === 'ACTUAL_ENTRY';

          let nodeColor = 'bg-amber-400 border-amber-300 text-amber-300';
          if (isSL) {
            nodeColor = lvl.isHit
              ? 'bg-rose-500 border-rose-300 text-rose-200 animate-bounce'
              : 'bg-rose-500 border-rose-400 text-rose-400';
          } else if (isTP) {
            nodeColor = 'bg-emerald-400 border-emerald-300 text-emerald-400';
          } else if (isActualEntry) {
            nodeColor = 'bg-sky-400 border-white text-sky-200 ring-2 ring-sky-400/80 shadow-[0_0_12px_rgba(56,189,248,0.9)]';
          }

          return (
            <div
              key={lvl.key}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-10"
              style={{ left: `${posPct}%` }}
              title={`${lvl.label}: ${fmtPrice(lvl.price)} (${fmtPct(distPct)} vs Live)`}
            >
              {/* TOP LABEL (Name & Price) */}
              <div className="absolute -top-7 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[9px] font-extrabold uppercase tracking-tighter flex items-center gap-0.5">
                  {lvl.isHit && <Skull className="w-2.5 h-2.5 text-rose-400" />}
                  {isActualEntry && <MapPin className="w-2.5 h-2.5 text-sky-400" />}
                  <span
                    className={
                      isSL
                        ? 'text-rose-400'
                        : isTP
                        ? 'text-emerald-400'
                        : isActualEntry
                        ? 'text-sky-300 font-black'
                        : 'text-amber-300'
                    }
                  >
                    {lvl.label}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-bold leading-tight ${
                    isActualEntry ? 'text-sky-100 font-black' : 'text-white'
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
    </div>
  );
};
