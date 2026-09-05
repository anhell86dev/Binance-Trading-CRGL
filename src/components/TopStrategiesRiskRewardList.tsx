import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Crown,
  Eye,
  Layers,
  Radio,
  Shield,
  Sparkles,
  Table,
  Target,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { StrategyPriceBar } from './StrategyPriceBar';
import { StrategyFuturesConfluenceBadge } from './StrategyFuturesConfluenceBadge';

interface TopStrategiesRiskRewardListProps {
  activeStrategies?: GoogleSheetStrategyRow[];
  onStrategySelected?: (strategy: GoogleSheetStrategyRow) => void;
  onOpenDetails?: (strategy: GoogleSheetStrategyRow) => void;
  highlightSymbol?: string;
}

interface StrategyRowPriceBarProps {
  livePrice: number;
  entry1Price: number;
  slPrice: number;
  tpPrice: number;
  diffPct: number;
  absDiffPct: number;
  diffDollar: number;
  isPricePositive: boolean;
  change24h: number;
  isLong: boolean;
  isGlow: boolean;
  decimalPlaces: number;
}

const StrategyRowPriceBar: React.FC<StrategyRowPriceBarProps> = ({
  livePrice,
  entry1Price,
  slPrice,
  tpPrice,
  diffPct,
  diffDollar,
  isPricePositive,
  change24h,
  isGlow,
  decimalPlaces,
}) => {
  // Bound calculations for visual scaling
  const allPoints: number[] = [livePrice, entry1Price];
  if (slPrice > 0) allPoints.push(slPrice);
  if (tpPrice > 0) allPoints.push(tpPrice);

  const rawMin = Math.min(...allPoints);
  const rawMax = Math.max(...allPoints);
  const span = rawMax - rawMin;
  const padding = span > 0 ? span * 0.08 : (rawMin > 0 ? rawMin * 0.02 : 1);
  const minBound = rawMin - padding;
  const maxBound = rawMax + padding;

  const calcPos = (val: number): number => {
    if (maxBound <= minBound || !val) return 50;
    const ratio = (val - minBound) / (maxBound - minBound);
    return Math.max(4, Math.min(96, ratio * 100));
  };

  const slX = slPrice > 0 ? calcPos(slPrice) : 0;
  const e1X = entry1Price > 0 ? calcPos(entry1Price) : 50;
  const liveX = calcPos(livePrice);
  const tpX = tpPrice > 0 ? calcPos(tpPrice) : 100;

  const distSlPct = slPrice > 0 && livePrice > 0
    ? ((slPrice - livePrice) / livePrice) * 100
    : 0;

  const distTpPct = tpPrice > 0 && livePrice > 0
    ? ((tpPrice - livePrice) / livePrice) * 100
    : 0;

  return (
    <div
      className={`relative flex flex-col gap-1.5 p-2 rounded-xl transition-all ${
        isGlow
          ? 'bg-gradient-to-r from-amber-950/40 via-neutral-900/90 to-amber-950/40 border border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
          : 'bg-neutral-950/80 border border-neutral-800/90 hover:border-neutral-700/90'
      }`}
    >
      {/* 1. FILA SUPERIOR: DATOS DENTRO DE LA BARRA (SL, E1, PRECIO LIVE Y TP) */}
      <div className="flex items-center justify-between gap-1 text-[10px] font-mono flex-wrap">
        {/* STOP LOSS */}
        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded text-rose-300">
          <Shield className="w-2.5 h-2.5 text-rose-400 shrink-0" />
          <span className="font-semibold text-rose-400">SL:</span>
          <span className="font-black text-white">${slPrice ? slPrice.toFixed(decimalPlaces) : '-'}</span>
          {slPrice > 0 && (
            <span className="text-[9px] text-rose-400/90">({Math.abs(distSlPct).toFixed(1)}%)</span>
          )}
        </div>

        {/* ENTRADA 1 (E1) */}
        <div className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded text-sky-300">
          <Target className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          <span className="font-semibold text-sky-400">E1:</span>
          <span className="font-black text-white">${entry1Price ? entry1Price.toFixed(decimalPlaces) : '-'}</span>
        </div>

        {/* PRECIO LIVE (DESTACADO Y CON BRILLO) */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
            isGlow
              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse'
              : 'bg-amber-400/20 border border-amber-400/50 text-amber-300 font-bold'
          }`}
        >
          <Radio className={`w-2.5 h-2.5 ${isGlow ? 'text-neutral-950 animate-ping' : 'text-amber-400 animate-pulse'}`} />
          <span>LIVE: ${livePrice.toFixed(decimalPlaces)}</span>
          <span
            className={`text-[9px] font-bold flex items-center ${
              isGlow
                ? 'text-neutral-950'
                : isPricePositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {isPricePositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {isPricePositive ? '+' : ''}{change24h.toFixed(2)}%
          </span>
        </div>

        {/* TAKE PROFIT (TP1) */}
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300">
          <Zap className="w-2.5 h-2.5 text-emerald-400 shrink-0 fill-emerald-400/30" />
          <span className="font-semibold text-emerald-400">TP1:</span>
          <span className="font-black text-white">${tpPrice ? tpPrice.toFixed(decimalPlaces) : '-'}</span>
          {tpPrice > 0 && (
            <span className="text-[9px] text-emerald-400/90">(+{distTpPct.toFixed(1)}%)</span>
          )}
        </div>
      </div>

      {/* 2. BARRA VISUAL DE PRECIO (RIEL CON ZONAS Y MARCADORES EN POSICIÓN) */}
      <div className="relative h-3.5 w-full bg-neutral-900 rounded-full border border-neutral-800 overflow-hidden flex items-center my-0.5">
        {/* Zona Peligro hacia SL */}
        {slPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-rose-500/30"
            style={{
              left: `${Math.min(slX, Math.min(e1X, liveX))}%`,
              width: `${Math.max(2, Math.abs(Math.min(e1X, liveX) - slX))}%`,
            }}
          />
        )}

        {/* Corredor Entrada E1 a Live */}
        <div
          className={`absolute top-0 bottom-0 ${
            isGlow
              ? 'bg-gradient-to-r from-amber-400/50 via-yellow-400/60 to-amber-400/50 animate-pulse'
              : isPricePositive
              ? 'bg-gradient-to-r from-sky-500/25 to-amber-500/30'
              : 'bg-gradient-to-r from-rose-500/25 to-amber-500/30'
          }`}
          style={{
            left: `${Math.min(e1X, liveX)}%`,
            width: `${Math.max(2, Math.abs(liveX - e1X))}%`,
          }}
        />

        {/* Zona Beneficio hacia TP */}
        {tpPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/30"
            style={{
              left: `${Math.min(liveX, tpX)}%`,
              width: `${Math.max(2, Math.abs(tpX - Math.min(liveX, tpX)))}%`,
            }}
          />
        )}

        {/* Marcador Pin SL */}
        {slPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border border-neutral-950 ring-1 ring-rose-400 z-10"
            style={{ left: `${slX}%` }}
            title={`Stop Loss: $${slPrice.toFixed(decimalPlaces)}`}
          />
        )}

        {/* Marcador Pin E1 */}
        {entry1Price > 0 && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border border-neutral-950 z-10 ${
              isGlow
                ? 'w-3 h-3 bg-amber-400 ring-2 ring-amber-300 animate-ping'
                : 'w-2.5 h-2.5 bg-sky-400 ring-1 ring-sky-300'
            }`}
            style={{ left: `${e1X}%` }}
            title={`Entrada 1: $${entry1Price.toFixed(decimalPlaces)}`}
          />
        )}

        {/* Marcador Aguja Live Price (Brilla y resalta) */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-neutral-950 flex items-center justify-center z-20 ${
            isGlow
              ? 'w-4 h-4 bg-amber-300 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.9)] animate-pulse'
              : 'w-3.5 h-3.5 bg-amber-400 ring-1 ring-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
          }`}
          style={{ left: `${liveX}%` }}
          title={`Precio Live: $${livePrice.toFixed(decimalPlaces)}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
        </div>

        {/* Marcador Pin TP */}
        {tpPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-neutral-950 ring-1 ring-emerald-300 z-10"
            style={{ left: `${tpX}%` }}
            title={`Take Profit 1: $${tpPrice.toFixed(decimalPlaces)}`}
          />
        )}
      </div>

      {/* 3. FILA INFERIOR: PROXIMIDAD A E1 Y RANGO DE RECORRIDO DENTRO DE LA BARRA */}
      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 px-0.5">
        <span className="text-rose-400/90 font-medium">
          {slPrice > 0 ? `Riesgo SL: ${Math.abs(distSlPct).toFixed(1)}%` : 'Sin SL'}
        </span>

        {/* PROXIMIDAD A E1 CON BRILLO */}
        <span
          className={`font-bold flex items-center gap-1 ${
            isGlow
              ? 'text-amber-300 font-black drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
              : diffPct >= 0
              ? 'text-sky-300'
              : 'text-emerald-400'
          }`}
        >
          {isGlow && <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />}
          <span>
            {isGlow ? '🎯 EN ZONA E1' : 'Distancia E1'}: {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
            <span className="opacity-80 font-normal ml-0.5">({diffDollar >= 0 ? '+' : ''}{diffDollar.toFixed(decimalPlaces)}$)</span>
          </span>
        </span>

        <span className="text-emerald-400/90 font-medium">
          {tpPrice > 0 ? `Objetivo TP1: +${distTpPct.toFixed(1)}%` : 'Sin TP'}
        </span>
      </div>
    </div>
  );
};

export const TopStrategiesRiskRewardList: React.FC<TopStrategiesRiskRewardListProps> = ({
  activeStrategies: propsActiveStrategies,
  onStrategySelected,
  onOpenDetails,
  highlightSymbol,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('TABLE');
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
    });
    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });
    return () => {
      unsubStrat();
      unsubPrice();
    };
  }, []);

  // 1. Obtener lista de estrategias activas (excluir obsoletas)
  const activeList = useMemo(() => {
    const source = propsActiveStrategies || strategies;
    return source.filter((st) => {
      const isObsolete =
        (st.estado || '').toLowerCase().includes('obsolet') ||
        normalizeStrategyStatus(st.estado) === 'Obsoleto';
      return !isObsolete;
    });
  }, [propsActiveStrategies, strategies]);

  // 2. Calcular R/B, precios y ordenar por mejor Ratio R:B para TODAS las estrategias
  const rankedStrategies = useMemo(() => {
    const calculated = activeList.map((strat) => {
      const prices = parsePricesFromStrategy(strat);
      const rr = calculateStrategyRewardToRisk(strat);
      const isLong =
        !strat.tipoDeOrden?.toLowerCase().includes('short') &&
        !strat.tipoDeOrden?.toLowerCase().includes('venta');

      const liveData = livePriceService.getPriceData(strat.par);
      const livePrice = liveData.price;
      const entry1Price = prices.entry1Price || livePrice;

      const diffDollar = livePrice - entry1Price;
      const diffPct = entry1Price > 0 ? (diffDollar / entry1Price) * 100 : 0;
      const absDiffPct = Math.abs(diffPct);
      const isPricePositive = (liveData.change24hPercent || 0) >= 0;

      const ratio = rr.ratio > 0 ? rr.ratio : 2.0;

      // Criterios de proximidad a Entrada 1 (E1)
      const isVeryCloseToE1 = entry1Price > 0 && livePrice > 0 && absDiffPct <= 1.25;

      return {
        strategy: strat,
        prices,
        rr,
        isLong,
        liveData,
        livePrice,
        entry1Price,
        diffDollar,
        diffPct,
        absDiffPct,
        isPricePositive,
        ratio,
        isVeryCloseToE1,
      };
    });

    // Ordenar de mayor a menor ratio R:B (y si empatan, por proximidad a Entrada 1)
    calculated.sort((a, b) => {
      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }
      return a.absDiffPct - b.absDiffPct;
    });

    return calculated;
  }, [activeList]);

  // 3. Encontrar cuál del catálogo está MÁS PRÓXIMA globalmente a Entrada 1
  const closestInListId = useMemo(() => {
    if (rankedStrategies.length === 0) return null;
    let minDiff = Infinity;
    let closestId: string | null = null;
    rankedStrategies.forEach((item) => {
      if (item.entry1Price > 0 && item.livePrice > 0 && item.absDiffPct < minDiff) {
        minDiff = item.absDiffPct;
        closestId = item.strategy.noEstrategia;
      }
    });
    return closestId;
  }, [rankedStrategies]);

  const handleExecute = (item: (typeof rankedStrategies)[0]) => {
    const strat = item.strategy;
    const cleanSym = strat.par.replace(/[^A-Z0-9]/g, '');

    // Switch WS stream
    binanceWs.setSymbol(cleanSym);

    // Autofill order form
    const basePrice = item.entry1Price || item.livePrice || 789.5;
    const slPrice = item.prices.slPrice || (item.isLong ? basePrice * 0.985 : basePrice * 1.015);
    const tpPrice = item.prices.tp1Price || (item.isLong ? basePrice * 1.045 : basePrice * 0.955);

    strategyAutofillService.autofillOrderForm({
      strategyId: strat.noEstrategia,
      strategyName: `${strat.par} - ${strat.nombreEstrategia}`,
      symbol: cleanSym,
      side: item.isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: 2, // Margen seguro max 5x
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice,
      tpPrice,
      riskReward: item.ratio,
      autoExecuteImmediately: false,
    });

    if (onStrategySelected) {
      onStrategySelected(strat);
    }
  };

  return (
    <div id="top-strategies-risk-reward-list" className="flex flex-col gap-2.5">
      {/* Header Banner - Compacto y elegante */}
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Crown className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Estrategias Ordenadas por Ratio R/B (Mayor a Menor)
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {rankedStrategies.length} Activas
            </span>
            <span className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              <span>Brillan las próximas a Entrada 1 (E1)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-300/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <span>Semáforo Confluencia Futuros</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
            <span>Live FAPI</span>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-[10px] font-mono">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                viewMode === 'TABLE'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ver catálogo completo en tipo tabla"
            >
              <Table className="w-3 h-3" />
              <span>Tabla</span>
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${
                viewMode === 'CARDS'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ver catálogo en tarjetas"
            >
              <Layers className="w-3 h-3" />
              <span>Tarjetas</span>
            </button>
          </div>
        </div>
      </div>

      {/* VISTA 1: TABLA DE ALTA DENSIDAD ORDENADA POR R/B DE MAYOR A MENOR CON EFECTO BRILLANTE EN E1 */}
      {viewMode === 'TABLE' && (
        <div className="bg-neutral-900/90 rounded-xl border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/95 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <th className="py-2.5 px-3 font-semibold text-center w-12">Rank</th>
                  <th className="py-2.5 px-3 font-semibold">Par</th>
                  <th className="py-2.5 px-3 font-semibold">Tipo</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[180px]">Estrategia</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[390px] lg:min-w-[460px] text-center bg-neutral-900/60 text-amber-300 border-x border-neutral-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                      <span>Barra de Precio (SL • E1 • Live • TP)</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center min-w-[190px] bg-neutral-900/40 text-neutral-300 border-x border-neutral-800">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="flex items-center gap-0.5 px-1 py-0.5 rounded bg-neutral-950 border border-neutral-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      </div>
                      <span>Semáforo Confluencia</span>
                    </div>
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-center bg-emerald-500/5 text-emerald-300 border-x border-emerald-500/20">
                    Ratio R:B 🔽
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[90px]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                {rankedStrategies.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-xs text-neutral-500 font-sans">
                      No hay estrategias activas disponibles en el catálogo.
                    </td>
                  </tr>
                ) : (
                  rankedStrategies.map((item, index) => {
                    const strat = item.strategy;
                    const rank = index + 1;
                    const isClosestGlobal = closestInListId === strat.noEstrategia;
                    const isGlow = item.isVeryCloseToE1 || isClosestGlobal;
                    const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.par.replace(/[^A-Z0-9]/g, '');
                    const decimalPlaces = item.entry1Price < 10 || item.livePrice < 10 ? 4 : 2;

                    return (
                      <tr
                        key={strat.noEstrategia}
                        className={`transition-all duration-300 ${
                          isGlow
                            ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 border-y border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/50'
                            : isSelected
                            ? 'bg-neutral-850/90 border-amber-500/40'
                            : 'hover:bg-neutral-850/60'
                        }`}
                      >
                        {/* RANK BADGE */}
                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-md font-black text-xs ${
                              rank === 1
                                ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-neutral-950 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                : rank === 2
                                ? 'bg-sky-400 text-neutral-950'
                                : rank === 3
                                ? 'bg-emerald-400 text-neutral-950'
                                : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                            }`}
                          >
                            #{rank}
                          </span>
                        </td>

                        {/* PAR */}
                        <td className="py-2.5 px-3 font-bold text-white text-xs">
                          <div className="flex items-center gap-1">
                            <span>{strat.par}</span>
                            {isGlow && (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="¡Muy cerca de E1!" />
                            )}
                          </div>
                        </td>

                        {/* TIPO */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              item.isLong ? 'text-emerald-300 bg-emerald-500/20 border border-emerald-500/40' : 'text-rose-300 bg-rose-500/20 border border-rose-500/40'
                            }`}
                          >
                            {item.isLong ? 'LONG ↗' : 'SHORT ↘'}
                          </span>
                        </td>

                        {/* NOMBRE ESTRATEGIA + BADGE BRILLANTE SI ESTÁ PRÓXIMA A E1 */}
                        <td className="py-2.5 px-3 font-sans">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white text-xs truncate max-w-[180px]" title={strat.nombreEstrategia}>
                              {strat.nombreEstrategia}
                            </span>

                            {/* EFECTO BRILLANTE CUANDO EL PRECIO LIVE ESTÁ MUY CERCA DE E1 */}
                            {isGlow && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 shadow-[0_0_12px_rgba(250,204,21,0.8)] animate-pulse">
                                <Sparkles className="w-3 h-3 text-neutral-950 fill-neutral-950" />
                                <span>PRÓXIMA A E1 ({item.diffPct >= 0 ? '+' : ''}{item.diffPct.toFixed(2)}%)</span>
                              </span>
                            )}
                          </div>
                          {strat.noEstrategia && (
                            <span className="text-[10px] text-neutral-500 font-mono">ID: {strat.noEstrategia}</span>
                          )}
                        </td>

                        {/* BARRA DE PRECIO CON TODOS LOS DATOS INCORPORADOS (SL, E1, PRECIO LIVE, PROXIMIDAD, TP) */}
                        <td className="py-2 px-3 border-x border-neutral-800/80 min-w-[390px] lg:min-w-[460px]">
                          <StrategyRowPriceBar
                            livePrice={item.livePrice}
                            entry1Price={item.entry1Price}
                            slPrice={item.prices.slPrice || 0}
                            tpPrice={item.prices.tp1Price || 0}
                            diffPct={item.diffPct}
                            absDiffPct={item.absDiffPct}
                            diffDollar={item.diffDollar}
                            isPricePositive={item.isPricePositive}
                            change24h={item.liveData.change24hPercent || 0}
                            isLong={item.isLong}
                            isGlow={isGlow}
                            decimalPlaces={decimalPlaces}
                          />
                        </td>

                        {/* SEMÁFORO DE CONFLUENCIA DE FUTUROS */}
                        <td className="py-2 px-3 border-x border-neutral-800/80 text-center">
                          <div className="flex items-center justify-center">
                            <StrategyFuturesConfluenceBadge
                              symbol={strat.par}
                              isLong={item.isLong}
                            />
                          </div>
                        </td>

                        {/* RATIO R:B (ORDENADO DE MAYOR A MENOR) */}
                        <td className="py-2.5 px-3 text-center bg-emerald-500/5 border-x border-emerald-500/20">
                          <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-black text-xs font-mono border border-emerald-500/40 shadow-xs">
                            1:{item.ratio.toFixed(1)}
                          </span>
                        </td>

                        {/* ACCIÓN: CARGAR ORDEN */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {onOpenDetails && (
                              <button
                                type="button"
                                onClick={() => onOpenDetails(strat)}
                                className="p-1.5 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
                                title="Ver detalles de estrategia"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleExecute(item)}
                              className="px-2.5 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 font-black text-xs inline-flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
                              title="Cargar orden de esta estrategia en Binance Futures"
                            >
                              <Zap className="w-3 h-3 fill-neutral-950" />
                              <span>Cargar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA 2: BENTO TARJETAS RESPONSIVE AL MONITOR (1 col móvil, 2 cols sm/md, 3 cols lg, 4 cols xl, 5 cols 2xl, 6 cols ultrawide) */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-6 gap-3.5 w-full">
          {rankedStrategies.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs text-neutral-500 font-sans bg-neutral-900/60 rounded-xl border border-neutral-800">
              No hay estrategias activas para mostrar.
            </div>
          ) : (
            rankedStrategies.map((item, index) => {
              const strat = item.strategy;
              const rank = index + 1;
              const isClosestGlobal = closestInListId === strat.noEstrategia;
              const isGlow = item.isVeryCloseToE1 || isClosestGlobal;
              const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.par.replace(/[^A-Z0-9]/g, '');

              const rankBadgeClass =
                rank === 1
                  ? 'bg-amber-400 text-neutral-950 font-black'
                  : rank === 2
                  ? 'bg-sky-400 text-neutral-950 font-black'
                  : rank === 3
                  ? 'bg-emerald-400 text-neutral-950 font-black'
                  : 'bg-neutral-800 text-neutral-300 font-bold';

              const decimalPlaces = item.entry1Price < 10 || item.livePrice < 10 ? 4 : 2;

              return (
                <div
                  key={strat.noEstrategia}
                  className={`rounded-xl border p-3 flex flex-col gap-2.5 transition-all relative w-full ${
                    isGlow
                      ? 'bg-gradient-to-b from-amber-950/30 via-neutral-900 to-amber-950/20 border-amber-400/80 shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-1 ring-amber-400/50'
                      : isSelected
                      ? 'bg-neutral-900 border-amber-400/50'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Card Top: Rank, Par, Tipo, R:B */}
                  <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-neutral-800/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-5 h-5 rounded text-[10px] flex items-center justify-center shrink-0 ${rankBadgeClass}`}>
                        #{rank}
                      </span>
                      <strong className="text-white text-xs font-mono truncate">{strat.par}</strong>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          item.isLong
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.isLong ? 'LONG ↗' : 'SHORT ↘'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        1:{item.ratio.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Strategy Name & Proximity Tag */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-neutral-300 font-sans font-medium truncate" title={strat.nombreEstrategia}>
                      {strat.nombreEstrategia}
                    </span>
                    {isGlow && (
                      <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-400 text-neutral-950 shrink-0 flex items-center gap-1 shadow-xs animate-pulse">
                        <Sparkles className="w-3 h-3 text-neutral-950 fill-neutral-950" />
                        <span>✨ PRÓXIMA E1</span>
                      </span>
                    )}
                  </div>

                  {/* Barra de precio con todos los datos integrados (SL, E1, Live, TP, Distancias) */}
                  <StrategyRowPriceBar
                    livePrice={item.livePrice}
                    entry1Price={item.entry1Price}
                    slPrice={item.prices.slPrice || 0}
                    tpPrice={item.prices.tp1Price || 0}
                    diffPct={item.diffPct}
                    absDiffPct={item.absDiffPct}
                    diffDollar={item.diffDollar}
                    isPricePositive={item.isPricePositive}
                    change24h={item.liveData.change24hPercent || 0}
                    isLong={item.isLong}
                    isGlow={isGlow}
                    decimalPlaces={decimalPlaces}
                  />

                  {/* Semáforo de Confluencia de Futuros */}
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
                    <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                      <span>Semáforo:</span>
                    </span>
                    <StrategyFuturesConfluenceBadge
                      symbol={strat.par}
                      isLong={item.isLong}
                      compact={false}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-neutral-800/80">
                    {onOpenDetails && (
                      <button
                        type="button"
                        onClick={() => onOpenDetails(strat)}
                        className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 text-neutral-300 text-[10px] font-medium flex items-center gap-1 border border-neutral-800 transition-colors"
                      >
                        <Eye className="w-2.5 h-2.5" />
                        <span>Detalles</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExecute(item)}
                      className="flex-1 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer"
                    >
                      <Zap className="w-3 h-3 fill-neutral-950" />
                      <span>Cargar Orden</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
