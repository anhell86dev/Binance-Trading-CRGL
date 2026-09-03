import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Flag,
  Flame,
  Gauge,
  Radio,
  Shield,
  Sliders,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow, ParsedStrategyPrices } from '../types/strategy';
import { parsePricesFromStrategy } from '../utils/sheetParser';

interface StrategyPriceBarProps {
  strategy: GoogleSheetStrategyRow;
  livePrice: number;
  compact?: boolean;
}

export const StrategyPriceBar: React.FC<StrategyPriceBarProps> = ({
  strategy,
  livePrice,
  compact = false,
}) => {
  const [manualMode, setManualMode] = useState<'AUTO' | 'ENTRIES' | 'SL_TP'>('AUTO');

  const prices: ParsedStrategyPrices = useMemo(() => {
    return parsePricesFromStrategy(strategy);
  }, [strategy]);

  const isLong = useMemo(() => {
    return (
      !strategy.tipoDeOrden?.toLowerCase().includes('short') &&
      !strategy.tipoDeOrden?.toLowerCase().includes('venta')
    );
  }, [strategy]);

  const {
    entry1Price = 0,
    entry2Price = 0,
    entry3Price = 0,
    slPrice = 0,
    tp1Price = 0,
    tp2Price = 0,
    tpFinalPrice = 0,
  } = prices;

  const currentPrice = livePrice || entry1Price || 100;
  const decimalPlaces = currentPrice < 10 ? 4 : 2;

  // Comprobar si el precio live ha tocado E1, E2 o E3
  const hasTouchedE1 = useMemo(() => {
    if (!entry1Price || !currentPrice) return false;
    // Para LONG: si el precio bajó hasta E1 (o por debajo)
    // Para SHORT: si el precio subió hasta E1 (o por encima)
    return isLong ? currentPrice <= entry1Price * 1.001 : currentPrice >= entry1Price * 0.999;
  }, [isLong, currentPrice, entry1Price]);

  const hasTouchedE2 = useMemo(() => {
    if (!entry2Price || !currentPrice) return false;
    return isLong ? currentPrice <= entry2Price * 1.001 : currentPrice >= entry2Price * 0.999;
  }, [isLong, currentPrice, entry2Price]);

  const hasTouchedE3 = useMemo(() => {
    if (!entry3Price || !currentPrice) return false;
    return isLong ? currentPrice <= entry3Price * 1.001 : currentPrice >= entry3Price * 0.999;
  }, [isLong, currentPrice, entry3Price]);

  const hasTouchedAny = hasTouchedE1 || hasTouchedE2 || hasTouchedE3;

  // Modo de visualización efectivo: si manualMode === AUTO, usamos hasTouchedAny
  const showSlTpMode =
    manualMode === 'SL_TP' || (manualMode === 'AUTO' && hasTouchedAny);

  // Distancias porcentuales respecto al precio Live actual
  const distE1Pct = entry1Price > 0 ? ((currentPrice - entry1Price) / entry1Price) * 100 : 0;
  const distE2Pct = entry2Price > 0 ? ((currentPrice - entry2Price) / entry2Price) * 100 : 0;
  const distE3Pct = entry3Price > 0 ? ((currentPrice - entry3Price) / entry3Price) * 100 : 0;

  const distSlPct =
    slPrice > 0 && currentPrice > 0
      ? ((slPrice - currentPrice) / currentPrice) * 100
      : 0;

  const distTp1Pct =
    tp1Price > 0 && currentPrice > 0
      ? ((tp1Price - currentPrice) / currentPrice) * 100
      : 0;

  const distTp2Pct =
    tp2Price > 0 && currentPrice > 0
      ? ((tp2Price - currentPrice) / currentPrice) * 100
      : 0;

  const distTpFinalPct =
    tpFinalPrice > 0 && currentPrice > 0
      ? ((tpFinalPrice - currentPrice) / currentPrice) * 100
      : 0;

  // Calcular límites de la barra para mapeo visual 0% -> 100%
  const { minBound, maxBound } = useMemo(() => {
    const allPoints: number[] = [currentPrice];
    if (entry1Price > 0) allPoints.push(entry1Price);
    if (entry2Price > 0) allPoints.push(entry2Price);
    if (entry3Price > 0) allPoints.push(entry3Price);

    if (showSlTpMode) {
      if (slPrice > 0) allPoints.push(slPrice);
      if (tp1Price > 0) allPoints.push(tp1Price);
      if (tp2Price > 0) allPoints.push(tp2Price);
      if (tpFinalPrice > 0) allPoints.push(tpFinalPrice);
    }

    const rawMin = Math.min(...allPoints);
    const rawMax = Math.max(...allPoints);
    const padding = (rawMax - rawMin) * 0.08 || rawMin * 0.02;

    return {
      minBound: rawMin - padding,
      maxBound: rawMax + padding,
    };
  }, [
    currentPrice,
    entry1Price,
    entry2Price,
    entry3Price,
    slPrice,
    tp1Price,
    tp2Price,
    tpFinalPrice,
    showSlTpMode,
  ]);

  const calcXPos = (price: number): number => {
    if (maxBound <= minBound) return 50;
    const ratio = (price - minBound) / (maxBound - minBound);
    return Math.max(3, Math.min(97, ratio * 100));
  };

  const liveX = calcXPos(currentPrice);
  const e1X = entry1Price > 0 ? calcXPos(entry1Price) : 0;
  const e2X = entry2Price > 0 ? calcXPos(entry2Price) : 0;
  const e3X = entry3Price > 0 ? calcXPos(entry3Price) : 0;

  const slX = slPrice > 0 ? calcXPos(slPrice) : 0;
  const tp1X = tp1Price > 0 ? calcXPos(tp1Price) : 0;
  const tp2X = tp2Price > 0 ? calcXPos(tp2Price) : 0;
  const tpFinalX = tpFinalPrice > 0 ? calcXPos(tpFinalPrice) : 0;

  return (
    <div
      id={`price-bar-${strategy.noEstrategia}`}
      className={`rounded-lg border transition-all ${
        showSlTpMode
          ? 'bg-neutral-950/90 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
          : 'bg-neutral-950/70 border-neutral-800/90 hover:border-neutral-700'
      } ${compact ? 'p-2' : 'p-2.5 sm:p-3'}`}
    >
      {/* Header & Status Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 text-[11px] font-mono">
        <div className="flex items-center gap-1.5 flex-wrap">
          {showSlTpMode ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
              <Flame className="w-3 h-3 text-emerald-400" />
              <span>
                {hasTouchedE3
                  ? 'ENTRADA E3 TOCADA'
                  : hasTouchedE2
                  ? 'ENTRADA E2 TOCADA'
                  : hasTouchedE1
                  ? 'ENTRADA E1 TOCADA'
                  : 'OPERACIÓN ACTIVA'}
              </span>
              <span className="text-white/80 font-normal">| Monitoreo SL &amp; TPs</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-500/15 text-sky-300 border border-sky-500/30">
              <Crosshair className="w-3 h-3 text-sky-400" />
              <span>APROXIMACIÓN A ENTRADAS</span>
              <span className="text-neutral-400 font-normal">
                | Distancia a E1:{' '}
                <strong className={distE1Pct >= 0 ? 'text-amber-300' : 'text-emerald-400'}>
                  {distE1Pct >= 0 ? '+' : ''}
                  {distE1Pct.toFixed(2)}%
                </strong>
              </span>
            </span>
          )}

          <span className="text-[10px] text-neutral-400">
            {isLong ? 'LONG 📈' : 'SHORT 📉'}
          </span>
        </div>

        {/* Mode Switcher / Info */}
        <div className="flex items-center gap-1 text-[10px]">
          <button
            type="button"
            onClick={() =>
              setManualMode((prev) =>
                prev === 'AUTO' ? (showSlTpMode ? 'ENTRIES' : 'SL_TP') : 'AUTO'
              )
            }
            className="px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-850 text-neutral-300 border border-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
            title="Cambiar vista manual entre Entradas (E1/E2/E3) y SL/TP"
          >
            <Sliders className="w-2.5 h-2.5 text-amber-400" />
            <span>
              {manualMode === 'AUTO'
                ? showSlTpMode
                  ? 'Ver Entradas'
                  : 'Ver SL/TP'
                : 'Modo Auto'}
            </span>
          </button>
        </div>
      </div>

      {/* Visual Dynamic Price Track */}
      <div className="relative pt-6 pb-6 px-2 sm:px-3">
        {/* Background Track Rail */}
        <div className="h-2 w-full bg-neutral-900 rounded-full relative overflow-hidden border border-neutral-800">
          {/* Active Corridor Gradient */}
          {showSlTpMode ? (
            <>
              {/* SL Danger Zone */}
              <div
                className="absolute top-0 bottom-0 bg-rose-500/30"
                style={{
                  left: `${Math.min(slX, liveX)}%`,
                  width: `${Math.abs(liveX - slX)}%`,
                }}
              />
              {/* TP Profit Zone */}
              <div
                className="absolute top-0 bottom-0 bg-emerald-500/30"
                style={{
                  left: `${Math.min(liveX, tpFinalX || tp1X)}%`,
                  width: `${Math.abs((tpFinalX || tp1X) - liveX)}%`,
                }}
              />
            </>
          ) : (
            /* Entry Approach Corridor */
            <div
              className="absolute top-0 bottom-0 bg-sky-500/25"
              style={{
                left: `${Math.min(liveX, e1X)}%`,
                width: `${Math.max(1, Math.abs(e1X - liveX))}%`,
              }}
            />
          )}
        </div>

        {/* ----------------- RENDER MARKERS ON TRACK ----------------- */}

        {/* STOP LOSS (Visible en modo SL_TP) */}
        {showSlTpMode && slPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${slX}%` }}
          >
            {/* Top Label */}
            <div className="absolute -top-6 whitespace-nowrap bg-rose-950/90 text-rose-300 border border-rose-500/50 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shadow-xs">
              SL ${slPrice.toFixed(decimalPlaces)}
              <span className="text-[8px] opacity-85 ml-1">
                ({distSlPct >= 0 ? '+' : ''}
                {distSlPct.toFixed(2)}%)
              </span>
            </div>
            {/* Marker Pin */}
            <div className="w-3 h-3 rounded-full bg-rose-500 border-2 border-neutral-950 ring-1 ring-rose-400 shadow-sm" />
            {/* Bottom Note */}
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-rose-400">
              Stop Loss
            </div>
          </div>
        )}

        {/* ENTRADA 1 (E1) */}
        {entry1Price > 0 && (!showSlTpMode || !hasTouchedE1) && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${e1X}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-sky-950/90 text-sky-300 border border-sky-500/50 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shadow-xs">
              E1 ${entry1Price.toFixed(decimalPlaces)}
              <span className="text-[8px] text-sky-200 ml-1">
                ({distE1Pct >= 0 ? '+' : ''}
                {distE1Pct.toFixed(2)}%)
              </span>
            </div>
            <div
              className={`w-3 h-3 rounded-full border-2 border-neutral-950 ${
                hasTouchedE1
                  ? 'bg-emerald-400 ring-2 ring-emerald-400/80 animate-ping'
                  : 'bg-sky-400 ring-1 ring-sky-400'
              }`}
            />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-sky-400">
              Entrada 1 (50%)
            </div>
          </div>
        )}

        {/* ENTRADA 2 (E2) */}
        {entry2Price > 0 && (!showSlTpMode || !hasTouchedE2) && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${e2X}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-sky-950/80 text-sky-300/90 border border-sky-600/40 px-1.5 py-0.2 rounded text-[9px] font-mono shadow-xs">
              E2 ${entry2Price.toFixed(decimalPlaces)}
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500/70 border-2 border-neutral-950 ring-1 ring-sky-500" />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-neutral-400">
              E2 (30%)
            </div>
          </div>
        )}

        {/* ENTRADA 3 (E3) */}
        {entry3Price > 0 && (!showSlTpMode || !hasTouchedE3) && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${e3X}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-sky-950/80 text-sky-300/90 border border-sky-600/40 px-1.5 py-0.2 rounded text-[9px] font-mono shadow-xs">
              E3 ${entry3Price.toFixed(decimalPlaces)}
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500/70 border-2 border-neutral-950 ring-1 ring-sky-500" />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-neutral-400">
              E3 (20%)
            </div>
          </div>
        )}

        {/* TAKE PROFIT 1 (Visible en modo SL_TP) */}
        {showSlTpMode && tp1Price > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${tp1X}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 px-1.5 py-0.2 rounded text-[9px] font-mono font-bold shadow-xs">
              TP1 ${tp1Price.toFixed(decimalPlaces)}
              <span className="text-[8px] text-emerald-200 ml-1">
                ({distTp1Pct >= 0 ? '+' : ''}
                {distTp1Pct.toFixed(2)}%)
              </span>
            </div>
            <div className="w-3 h-3 rounded-full bg-emerald-400 border-2 border-neutral-950 ring-1 ring-emerald-300 shadow-sm" />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-emerald-400">
              TP1 (50%)
            </div>
          </div>
        )}

        {/* TAKE PROFIT 2 (Visible en modo SL_TP) */}
        {showSlTpMode && tp2Price > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${tp2X}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-emerald-950/80 text-emerald-300/90 border border-emerald-600/40 px-1.5 py-0.2 rounded text-[9px] font-mono shadow-xs">
              TP2 ${tp2Price.toFixed(decimalPlaces)}
              <span className="text-[8px] opacity-80 ml-1">
                ({distTp2Pct >= 0 ? '+' : ''}
                {distTp2Pct.toFixed(2)}%)
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-950 ring-1 ring-emerald-500" />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-neutral-400">
              TP2 (30%)
            </div>
          </div>
        )}

        {/* TAKE PROFIT FINAL (Visible en modo SL_TP) */}
        {showSlTpMode && tpFinalPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${tpFinalX}%` }}
          >
            <div className="absolute -top-6 whitespace-nowrap bg-emerald-950/80 text-emerald-300/90 border border-emerald-600/40 px-1.5 py-0.2 rounded text-[9px] font-mono shadow-xs">
              TP Fin ${tpFinalPrice.toFixed(decimalPlaces)}
              <span className="text-[8px] opacity-80 ml-1">
                ({distTpFinalPct >= 0 ? '+' : ''}
                {distTpFinalPct.toFixed(2)}%)
              </span>
            </div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-neutral-950 ring-1 ring-emerald-500" />
            <div className="absolute -bottom-5 whitespace-nowrap text-[8px] font-mono text-neutral-400">
              TP Final (20%)
            </div>
          </div>
        )}

        {/* PRECIO LIVE ACTUAL (PULSO DESTACADO EN ORO / BLANCO) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-20"
          style={{ left: `${liveX}%` }}
        >
          {/* Live Price Tag Above or Below */}
          <div className="absolute -top-7.5 whitespace-nowrap bg-amber-400 text-neutral-950 font-black px-1.5 py-0.2 rounded text-[9px] font-mono shadow-md ring-1 ring-amber-300 flex items-center gap-1">
            <Radio className="w-2 h-2 animate-ping text-neutral-950" />
            <span>LIVE ${currentPrice.toFixed(decimalPlaces)}</span>
          </div>

          {/* Needle / Marker Pin */}
          <div className="w-4 h-4 rounded-full bg-amber-400 border-2 border-neutral-950 ring-2 ring-amber-400/90 shadow-lg flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
          </div>

          {/* Subtitle Distance */}
          <div className="absolute -bottom-5.5 whitespace-nowrap bg-neutral-900/90 text-amber-300 border border-amber-500/40 px-1 rounded text-[8px] font-mono font-bold">
            {showSlTpMode ? (
              <span>
                SL:{' '}
                <strong className="text-rose-400 font-bold">
                  {distSlPct.toFixed(2)}%
                </strong>{' '}
                | TP1:{' '}
                <strong className="text-emerald-400 font-bold">
                  +{distTp1Pct.toFixed(2)}%
                </strong>
              </span>
            ) : (
              <span>
                {distE1Pct >= 0 ? '+' : ''}
                {distE1Pct.toFixed(2)}% vs E1
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary Footer with Quick Legend */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-900 text-[9px] font-mono text-neutral-400">
        <div className="flex items-center gap-3">
          {showSlTpMode ? (
            <>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                Riesgo SL: {Math.abs(distSlPct).toFixed(2)}%
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Beneficio TP1: {distTp1Pct.toFixed(2)}%
              </span>
              {tp2Price > 0 && (
                <span className="flex items-center gap-1 text-emerald-300/80 hidden sm:inline-flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  TP2: +{distTp2Pct.toFixed(2)}%
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-sky-400">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 inline-block" />
                Entrada 1: ${entry1Price.toFixed(decimalPlaces)} (50%)
              </span>
              {entry2Price > 0 && (
                <span className="flex items-center gap-1 text-neutral-400 hidden sm:inline-flex">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500/70 inline-block" />
                  E2: ${entry2Price.toFixed(decimalPlaces)} (30%)
                </span>
              )}
            </>
          )}
        </div>

        <div className="text-neutral-400 font-sans">
          {showSlTpMode
            ? '🎯 Operación en curso / Monitoreando niveles SL & TP'
            : Math.abs(distE1Pct) <= 0.75
            ? '🎯 En zona de Entrada 1'
            : isLong
            ? distE1Pct > 0
              ? `Esperando retroceso de ${distE1Pct.toFixed(2)}% hacia E1`
              : `Precio en zona de descuento (${Math.abs(distE1Pct).toFixed(2)}% bajo E1)`
            : distE1Pct > 0
            ? `Precio en zona óptima Short (+${distE1Pct.toFixed(2)}%)`
            : `Esperando rebote hacia E1 (${Math.abs(distE1Pct).toFixed(2)}%)`}
        </div>
      </div>
    </div>
  );
};
