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

interface TopStrategiesRiskRewardListProps {
  activeStrategies?: GoogleSheetStrategyRow[];
  onStrategySelected?: (strategy: GoogleSheetStrategyRow) => void;
  onOpenDetails?: (strategy: GoogleSheetStrategyRow) => void;
  highlightSymbol?: string;
}

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
                  <th className="py-2.5 px-3 font-semibold min-w-[200px]">Estrategia</th>
                  <th className="py-2.5 px-3 font-semibold bg-amber-500/5 text-amber-300 border-x border-amber-500/20">
                    Precio Live
                  </th>
                  <th className="py-2.5 px-3 font-semibold">Entrada 1 (E1)</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[130px]">Proximidad a E1</th>
                  <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
                  <th className="py-2.5 px-3 font-semibold">Take Profit</th>
                  <th className="py-2.5 px-3 font-semibold text-center bg-emerald-500/5 text-emerald-300 border-x border-emerald-500/20">
                    Ratio R:B 🔽
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[90px]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                {rankedStrategies.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-xs text-neutral-500 font-sans">
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

                        {/* PRECIO LIVE (CON EFECTO BRILLO SI CORRESPONDE) */}
                        <td className="py-2.5 px-3 bg-amber-500/5 border-x border-amber-500/20 font-mono">
                          <div className="flex flex-col">
                            <span
                              className={`font-black text-sm sm:text-base tracking-tight ${
                                isGlow
                                  ? 'text-amber-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.7)]'
                                  : 'text-amber-300'
                              }`}
                            >
                              ${item.livePrice.toFixed(decimalPlaces)}
                            </span>
                            <span
                              className={`text-[10px] font-bold flex items-center gap-0.5 ${
                                item.isPricePositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {item.isPricePositive ? <ArrowUpRight className="w-3 h-3 shrink-0" /> : <ArrowDownRight className="w-3 h-3 shrink-0" />}
                              <span>{item.isPricePositive ? '+' : ''}{(item.liveData.change24hPercent || 0).toFixed(2)}%</span>
                            </span>
                          </div>
                        </td>

                        {/* ENTRADA 1 (E1) */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <span className="font-black text-white text-sm sm:text-base tracking-tight">
                              ${item.entry1Price.toFixed(decimalPlaces)}
                            </span>
                          </div>
                        </td>

                        {/* PROXIMIDAD A E1 (DIF EN % Y DESCRIPCIÓN) */}
                        <td className="py-2.5 px-3 font-mono">
                          <div className="flex flex-col">
                            <span
                              className={`font-bold text-xs ${
                                isGlow
                                  ? 'text-amber-300 font-black drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
                                  : item.diffPct >= 0
                                  ? 'text-sky-300'
                                  : 'text-emerald-400'
                              }`}
                            >
                              {item.diffPct >= 0 ? '+' : ''}{item.diffPct.toFixed(2)}% vs E1
                            </span>
                            <span className="text-[9px] text-neutral-400 font-sans">
                              {isGlow
                                ? '🎯 Zona de Ejecución'
                                : item.diffDollar > 0
                                ? `+${item.diffDollar.toFixed(decimalPlaces)} $`
                                : `${item.diffDollar.toFixed(decimalPlaces)} $`}
                            </span>
                          </div>
                        </td>

                        {/* STOP LOSS */}
                        <td className="py-2.5 px-3 text-rose-400 font-bold font-mono text-xs">
                          ${item.prices.slPrice ? item.prices.slPrice.toFixed(decimalPlaces) : '-'}
                        </td>

                        {/* TAKE PROFIT */}
                        <td className="py-2.5 px-3 text-emerald-400 font-bold font-mono text-xs">
                          ${item.prices.tp1Price ? item.prices.tp1Price.toFixed(decimalPlaces) : '-'}
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

      {/* VISTA 2: BENTO TARJETAS (Si el usuario conmuta a vista tarjetas) */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
                  className={`rounded-xl border p-3 flex flex-col gap-2.5 transition-all relative ${
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

                  {/* Key Stats Grid: Live Price & E1 */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 font-mono">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1 uppercase tracking-wider">
                        <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                        Precio Live
                      </span>
                      <span className={`text-base font-black tracking-tight mt-0.5 ${isGlow ? 'text-amber-300 drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]' : 'text-amber-300'}`}>
                        ${item.livePrice.toFixed(decimalPlaces)}
                      </span>
                      <span
                        className={`text-[10px] font-bold flex items-center gap-0.5 mt-0.5 ${
                          item.isPricePositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.isPricePositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{(item.liveData.change24hPercent || 0).toFixed(2)}%</span>
                      </span>
                    </div>

                    <div className="flex flex-col border-l border-neutral-800 pl-2.5">
                      <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">
                        Entrada 1 (E1)
                      </span>
                      <span className="text-base font-black text-white tracking-tight mt-0.5">
                        ${item.entry1Price.toFixed(decimalPlaces)}
                      </span>
                      <span
                        className={`text-[10px] font-bold mt-0.5 ${
                          isGlow ? 'text-amber-300 font-black' : 'text-sky-300'
                        }`}
                      >
                        {item.diffPct >= 0 ? '+' : ''}{item.diffPct.toFixed(2)}% vs E1
                      </span>
                    </div>
                  </div>

                  {/* SL / TP1 */}
                  <div className="flex items-center justify-between text-xs font-mono px-1 text-neutral-400">
                    <span className="text-rose-400 font-bold">
                      SL: ${item.prices.slPrice ? item.prices.slPrice.toFixed(decimalPlaces) : '-'}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      TP1: ${item.prices.tp1Price ? item.prices.tp1Price.toFixed(decimalPlaces) : '-'}
                    </span>
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
