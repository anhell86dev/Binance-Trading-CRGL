import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Target,
  Sparkles,
  Layers,
  RotateCcw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Crosshair,
  Check,
} from 'lucide-react';
import { PositionRisk } from '../types/binance';

interface TacticalPriceMilestoneLineProps {
  position: PositionRisk;
  isLong: boolean;
  markPrice: number;
  entryPrice: number;
  entry1Price: number;
  entry2Price: number;
  entry3Price: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  isSlHit: boolean;
  isSlAtBreakEven: boolean;
  isTp1Hit: boolean;
  isTp2Hit: boolean;
  isE2Hit: boolean;
  isE3Hit: boolean;
  pctToSl: number;
  pctToE2: number;
  pctToE3: number;
  pctToTp1: number;
  pctToTp2: number;
  fmt: (val: number) => string;
}

export const TacticalPriceMilestoneLine: React.FC<TacticalPriceMilestoneLineProps> = ({
  position,
  isLong,
  markPrice,
  entryPrice,
  entry1Price,
  entry2Price,
  entry3Price,
  slPrice,
  tp1Price,
  tp2Price,
  isSlHit,
  isSlAtBreakEven,
  isTp1Hit,
  isTp2Hit,
  isE2Hit,
  isE3Hit,
  pctToSl,
  pctToE2,
  pctToE3,
  pctToTp1,
  pctToTp2,
  fmt,
}) => {
  const pnl = position.unRealizedProfit || 0;
  const isProfit = pnl >= 0;
  const roe =
    position.roePercent ??
    ((pnl / (position.isolatedMargin || 1)) * 100);

  // 1. Calculate min and max bounds for the continuous linear scale
  // Standardized so Left = Stop Loss / Risk, Center = Entry, Right = Targets (TP1/TP2)
  const allPrices = [
    slPrice > 0 ? slPrice : null,
    entry3Price > 0 ? entry3Price : null,
    entry2Price > 0 ? entry2Price : null,
    entryPrice > 0 ? entryPrice : null,
    markPrice > 0 ? markPrice : null,
    tp1Price > 0 ? tp1Price : null,
    tp2Price > 0 ? tp2Price : null,
  ].filter((p): p is number => p !== null && p > 0);

  let rawMin = Math.min(...allPrices, entryPrice);
  let rawMax = Math.max(...allPrices, entryPrice);

  if (isLong) {
    if (!slPrice) rawMin = Math.min(rawMin, entryPrice * 0.98);
    if (!tp1Price) rawMax = Math.max(rawMax, entryPrice * 1.04);
    if (!tp2Price) rawMax = Math.max(rawMax, entryPrice * 1.07);
  } else {
    if (!slPrice) rawMax = Math.max(rawMax, entryPrice * 1.02);
    if (!tp1Price) rawMin = Math.min(rawMin, entryPrice * 0.96);
    if (!tp2Price) rawMin = Math.min(rawMin, entryPrice * 0.93);
  }

  // Padding buffer (3% margin on ends)
  const span = Math.max(0.0001, rawMax - rawMin);
  const minBound = isLong ? rawMin - span * 0.05 : rawMax + span * 0.05;
  const maxBound = isLong ? rawMax + span * 0.05 : rawMin - span * 0.05;

  // Percentage mapper along 0% to 100%
  const getPct = (price: number): number => {
    if (!price || price <= 0) return 50;
    let pct = isLong
      ? ((price - minBound) / (maxBound - minBound)) * 100
      : ((minBound - price) / (minBound - maxBound)) * 100;
    return Math.max(3, Math.min(97, pct));
  };

  const slPct = slPrice ? getPct(slPrice) : 8;
  const e3Pct = entry3Price ? getPct(entry3Price) : null;
  const e2Pct = entry2Price ? getPct(entry2Price) : null;
  const entryPct = getPct(entryPrice);
  const markPct = getPct(markPrice);
  const tp1Pct = tp1Price ? getPct(tp1Price) : 75;
  const tp2Pct = tp2Price ? getPct(tp2Price) : 93;

  // Next target calculation
  let nextTargetLabel = '';
  if (isSlHit) {
    nextTargetLabel = 'Stop Loss Impactado • Invalidado';
  } else if (isTp2Hit) {
    nextTargetLabel = 'TP2 Superado • Trailing Activo';
  } else if (isTp1Hit) {
    nextTargetLabel = `A ${pctToTp2.toFixed(1)}% de TP2 ($${fmt(tp2Price)})`;
  } else {
    nextTargetLabel = `A ${pctToTp1.toFixed(1)}% de TP1 ($${fmt(tp1Price)})`;
  }

  return (
    <div className="bg-neutral-950/90 border border-neutral-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-lg">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wide">
                Línea Táctica de Precio & Hitos en Vivo
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold font-mono border ${
                  isLong
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {isLong ? 'LONG' : 'SHORT'}
              </span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Continuo visual de ejecución: Riesgo / SL (Izquierda) → Entradas → Objetivos TP1/TP2 (Derecha)
            </p>
          </div>
        </div>

        {/* Live Metrics Header Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Live Mark Price Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-700/80 font-mono">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-[11px] text-neutral-400 font-semibold">Precio en Vivo:</span>
            <span className="text-xs font-bold text-amber-300">${fmt(markPrice)}</span>
          </div>

          {/* Live ROE & PnL */}
          <div
            className={`px-2.5 py-1 rounded-lg border font-mono text-xs font-bold flex items-center gap-1 ${
              isProfit
                ? 'bg-emerald-950/60 border-emerald-800/70 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800/70 text-rose-300'
            }`}
          >
            {isProfit ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            <span>
              {isProfit ? '+' : ''}${fmt(pnl)} ({isProfit ? '+' : ''}
              {roe.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* GRAPHICAL CONTINUOUS PRICE TIMELINE */}
      <div className="pt-8 pb-10 px-4 sm:px-6 relative select-none">
        {/* Continuous Baseline Track */}
        <div className="relative h-3 w-full rounded-full bg-neutral-900 border border-neutral-800 overflow-visible shadow-inner">
          {/* Colored Background Zones */}
          {/* 1. Invalidation/SL Zone (0% to Entry) */}
          <div
            className="absolute top-0 bottom-0 left-0 rounded-l-full bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-neutral-900/20"
            style={{ width: `${entryPct}%` }}
          />

          {/* 2. Profit Zone (Entry to 100%) */}
          <div
            className="absolute top-0 bottom-0 right-0 rounded-r-full bg-gradient-to-r from-emerald-950/30 via-emerald-900/50 to-emerald-600/40"
            style={{ left: `${entryPct}%` }}
          />

          {/* Active Fill from Entry to Live Mark Price */}
          {isProfit ? (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-500/60 to-emerald-400 transition-all duration-300 rounded-full shadow-xs"
              style={{
                left: `${entryPct}%`,
                width: `${Math.max(0, markPct - entryPct)}%`,
              }}
            />
          ) : (
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-l from-rose-500/60 to-rose-400 transition-all duration-300 rounded-full shadow-xs"
              style={{
                left: `${markPct}%`,
                width: `${Math.max(0, entryPct - markPct)}%`,
              }}
            />
          )}

          {/* ===================== MILESTONE NODES ===================== */}

          {/* 1. STOP LOSS NODE */}
          {slPrice > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${slPct}%` }}
            >
              {/* Top Tag */}
              <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 border shadow-xs ${
                    isSlHit
                      ? 'bg-rose-950 text-rose-300 border-rose-600 animate-pulse'
                      : isSlAtBreakEven
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                      : 'bg-neutral-900 text-rose-400 border-rose-900/60'
                  }`}
                >
                  {isSlHit ? (
                    '🛑 SL IMPACTADO'
                  ) : isSlAtBreakEven ? (
                    '🛡️ BREAK-EVEN'
                  ) : (
                    <>
                      <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                      SL
                    </>
                  )}
                </span>
              </div>

              {/* Node Dot */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  isSlHit
                    ? 'bg-rose-500 border-white ring-4 ring-rose-500/40 animate-ping'
                    : isSlAtBreakEven
                    ? 'bg-emerald-500 border-white ring-2 ring-emerald-500/40'
                    : 'bg-rose-900 border-rose-500'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>

              {/* Bottom Price Label */}
              <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-mono font-bold text-rose-300">
                  ${fmt(slPrice)}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {pctToSl ? `${fmt(pctToSl)}% dist.` : 'Protección'}
                </span>
              </div>
            </div>
          )}

          {/* 2. ENTRADA 3 (E3) NODE */}
          {entry3Price > 0 && e3Pct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${e3Pct}%` }}
            >
              {/* Top Tag */}
              <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                    isE3Hit
                      ? 'bg-purple-950 text-purple-200 border-purple-600 ring-1 ring-purple-500'
                      : 'bg-neutral-900 text-purple-400 border-neutral-800'
                  }`}
                >
                  ⚡ E3 (20%) {isE3Hit && '✓'}
                </span>
              </div>

              {/* Node Dot */}
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  isE3Hit
                    ? 'bg-purple-500 border-white ring-2 ring-purple-500/40'
                    : 'bg-neutral-900 border-purple-500'
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-purple-200"></div>
              </div>

              {/* Bottom Price Label */}
              <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-mono font-bold text-purple-300">
                  ${fmt(entry3Price)}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {pctToE3 ? `${fmt(pctToE3)}%` : 'DCA'}
                </span>
              </div>
            </div>
          )}

          {/* 3. ENTRADA 2 (E2) NODE */}
          {entry2Price > 0 && e2Pct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${e2Pct}%` }}
            >
              {/* Top Tag */}
              <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${
                    isE2Hit
                      ? 'bg-amber-950 text-amber-200 border-amber-600 ring-1 ring-amber-500'
                      : 'bg-neutral-900 text-amber-400 border-neutral-800'
                  }`}
                >
                  ⚡ E2 (30%) {isE2Hit && '✓'}
                </span>
              </div>

              {/* Node Dot */}
              <div
                className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                  isE2Hit
                    ? 'bg-amber-500 border-white ring-2 ring-amber-500/40'
                    : 'bg-neutral-900 border-amber-500'
                }`}
              >
                <div className="w-1 h-1 rounded-full bg-amber-200"></div>
              </div>

              {/* Bottom Price Label */}
              <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-mono font-bold text-amber-300">
                  ${fmt(entry2Price)}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {pctToE2 ? `${fmt(pctToE2)}%` : 'DCA'}
                </span>
              </div>
            </div>
          )}

          {/* 4. ENTRADA PROMEDIO / E1 NODE (Anchor Point) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-20"
            style={{ left: `${entryPct}%` }}
          >
            {/* Top Tag */}
            <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-950 text-sky-200 border border-sky-600 shadow-sm flex items-center gap-1">
                <Crosshair className="w-2.5 h-2.5 text-sky-400" />
                ENTRADA
              </span>
            </div>

            {/* Node Dot */}
            <div className="w-4 h-4 rounded-full bg-sky-500 border-2 border-white ring-2 ring-sky-500/40 flex items-center justify-center shadow-md">
              <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
            </div>

            {/* Bottom Price Label */}
            <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
              <span className="text-[10px] font-mono font-bold text-sky-300">
                ${fmt(entryPrice)}
              </span>
              <span className="text-[9px] text-neutral-400 font-mono">Base (50%)</span>
            </div>
          </div>

          {/* 5. TAKE PROFIT 1 (TP1) NODE */}
          {tp1Price > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${tp1Pct}%` }}
            >
              {/* Top Tag */}
              <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 border shadow-xs ${
                    isTp1Hit
                      ? 'bg-emerald-950 text-emerald-200 border-emerald-500 ring-2 ring-emerald-500/40'
                      : 'bg-neutral-900 text-emerald-400 border-emerald-800/60'
                  }`}
                >
                  <Target className="w-2.5 h-2.5 text-emerald-400" />
                  TP1 (50%) {isTp1Hit && <Check className="w-2.5 h-2.5 text-emerald-300" />}
                </span>
              </div>

              {/* Node Dot */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  isTp1Hit
                    ? 'bg-emerald-500 border-white ring-4 ring-emerald-500/40'
                    : 'bg-emerald-950 border-emerald-500'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-200"></div>
              </div>

              {/* Bottom Price Label */}
              <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-mono font-bold text-emerald-300">
                  ${fmt(tp1Price)}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {pctToTp1 ? `${fmt(pctToTp1)}% dist.` : 'Objetivo 1'}
                </span>
              </div>
            </div>
          )}

          {/* 6. TAKE PROFIT 2 (TP2) NODE */}
          {tp2Price > 0 && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-10"
              style={{ left: `${tp2Pct}%` }}
            >
              {/* Top Tag */}
              <div className="absolute bottom-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold flex items-center gap-1 border shadow-xs ${
                    isTp2Hit
                      ? 'bg-emerald-900 text-emerald-100 border-emerald-400 ring-2 ring-emerald-400/40'
                      : 'bg-neutral-900 text-emerald-300 border-neutral-700'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                  TP2 Max {isTp2Hit && <Check className="w-2.5 h-2.5 text-emerald-200" />}
                </span>
              </div>

              {/* Node Dot */}
              <div
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                  isTp2Hit
                    ? 'bg-emerald-400 border-white ring-4 ring-emerald-400/40'
                    : 'bg-emerald-950 border-emerald-400'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-100"></div>
              </div>

              {/* Bottom Price Label */}
              <div className="absolute top-5 flex flex-col items-center pointer-events-none whitespace-nowrap">
                <span className="text-[10px] font-mono font-bold text-emerald-200">
                  ${fmt(tp2Price)}
                </span>
                <span className="text-[9px] text-neutral-400 font-mono">
                  {pctToTp2 ? `${fmt(pctToTp2)}% dist.` : 'Objetivo 2'}
                </span>
              </div>
            </div>
          )}

          {/* ===================== LIVE MARK PRICE PIN ===================== */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none transition-all duration-300"
            style={{ left: `${markPct}%` }}
          >
            {/* Pulsing Target Beacon Indicator */}
            <div className="relative flex items-center justify-center">
              <span
                className={`absolute -inset-1.5 rounded-full animate-ping opacity-75 ${
                  isProfit ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <div
                className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                  isProfit ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              >
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
              </div>
            </div>

            {/* Floating Live Tooltip */}
            <div className="absolute -top-7 flex flex-col items-center whitespace-nowrap">
              <div
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1 shadow-md border ${
                  isProfit
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-rose-950 text-rose-300 border-rose-500 ring-2 ring-rose-500/20'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span>${fmt(markPrice)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER SUMMARY CHIPS OF HITOS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-neutral-800/80">
        {/* SL Chip */}
        <div
          className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between ${
            isSlHit
              ? 'bg-rose-950/70 border-rose-600 text-rose-200 ring-1 ring-rose-500'
              : isSlAtBreakEven
              ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-rose-400">Stop Loss</span>
            {isSlHit ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-rose-900 text-rose-100 font-bold">
                IMPACTADO
              </span>
            ) : isSlAtBreakEven ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900 text-emerald-200 font-bold">
                BE ACTIVO
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400 font-normal">Activo</span>
            )}
          </div>
          <div className="text-xs font-bold text-white mt-1">${fmt(slPrice)}</div>
          <div className="text-[9px] text-neutral-400">{slPrice ? `${fmt(pctToSl)}% dist.` : '-'}</div>
        </div>

        {/* E3 Chip */}
        <div
          className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between ${
            isE3Hit
              ? 'bg-purple-950/70 border-purple-600 text-purple-200 ring-1 ring-purple-500'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-purple-400">Entrada 3 (E3)</span>
            {isE3Hit ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-purple-900 text-purple-100 font-bold">
                TOCADO
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400 font-normal">20% cuota</span>
            )}
          </div>
          <div className="text-xs font-bold text-white mt-1">
            {entry3Price ? `$${fmt(entry3Price)}` : 'N/A'}
          </div>
          <div className="text-[9px] text-neutral-400">
            {entry3Price ? `${fmt(pctToE3)}% dist.` : 'Sin E3'}
          </div>
        </div>

        {/* E2 Chip */}
        <div
          className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between ${
            isE2Hit
              ? 'bg-amber-950/70 border-amber-600 text-amber-200 ring-1 ring-amber-500'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-amber-400">Entrada 2 (E2)</span>
            {isE2Hit ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-900 text-amber-100 font-bold">
                TOCADO
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400 font-normal">30% cuota</span>
            )}
          </div>
          <div className="text-xs font-bold text-white mt-1">
            {entry2Price ? `$${fmt(entry2Price)}` : 'N/A'}
          </div>
          <div className="text-[9px] text-neutral-400">
            {entry2Price ? `${fmt(pctToE2)}% dist.` : 'Sin E2'}
          </div>
        </div>

        {/* Entrada Base Chip */}
        <div className="p-2 rounded-lg border border-sky-900/60 bg-sky-950/30 text-xs font-mono flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-sky-400">Entrada Prom.</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-sky-900 text-sky-200 font-bold">
              EJECUTADA
            </span>
          </div>
          <div className="text-xs font-bold text-white mt-1">${fmt(entryPrice)}</div>
          <div className="text-[9px] text-neutral-400">E1: ${fmt(entry1Price)} (50%)</div>
        </div>

        {/* TP1 Chip */}
        <div
          className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between ${
            isTp1Hit
              ? 'bg-emerald-950/70 border-emerald-600 text-emerald-200 ring-1 ring-emerald-500'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-400">Take Profit 1</span>
            {isTp1Hit ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-900 text-emerald-100 font-bold">
                ALCANZADO
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400 font-normal">50% toma</span>
            )}
          </div>
          <div className="text-xs font-bold text-white mt-1">
            {tp1Price ? `$${fmt(tp1Price)}` : 'N/A'}
          </div>
          <div className="text-[9px] text-neutral-400">
            {tp1Price ? `${fmt(pctToTp1)}% dist.` : '-'}
          </div>
        </div>

        {/* TP2 Chip */}
        <div
          className={`p-2 rounded-lg border text-xs font-mono flex flex-col justify-between ${
            isTp2Hit
              ? 'bg-emerald-900/70 border-emerald-500 text-emerald-100 ring-1 ring-emerald-400'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="text-emerald-300">Take Profit 2</span>
            {isTp2Hit ? (
              <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-800 text-emerald-100 font-bold">
                ALCANZADO
              </span>
            ) : (
              <span className="text-[9px] text-neutral-400 font-normal">Final / Max</span>
            )}
          </div>
          <div className="text-xs font-bold text-white mt-1">
            {tp2Price ? `$${fmt(tp2Price)}` : 'N/A'}
          </div>
          <div className="text-[9px] text-neutral-400">
            {tp2Price ? `${fmt(pctToTp2)}% dist.` : '-'}
          </div>
        </div>
      </div>

      {/* Progress to Next Milestone Banner */}
      <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono flex items-center justify-between text-neutral-300">
        <div className="flex items-center gap-1.5 text-neutral-400">
          <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          <span>Próximo Hito:</span>
          <strong className="text-white">{nextTargetLabel}</strong>
        </div>
        <div className="text-[11px] text-neutral-400">
          Apalancamiento: <strong className="text-amber-400">{position.leverage || 2}x</strong> (ISOLATED)
        </div>
      </div>
    </div>
  );
};
