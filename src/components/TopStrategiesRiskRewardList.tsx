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
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
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

  // 2. Calcular R/B, precios y ordenar por mejor Ratio R:B para obtener el Top 3
  const rankedTop3 = useMemo(() => {
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
      };
    });

    // Ordenar de mayor a menor ratio R:B (y si empatan, por proximidad a Entrada 1)
    calculated.sort((a, b) => {
      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }
      return a.absDiffPct - b.absDiffPct;
    });

    return calculated.slice(0, 3);
  }, [activeList]);

  // 3. Encontrar cuál del Top 3 está más próximo a Entrada 1
  const closestInTop3Id = useMemo(() => {
    if (rankedTop3.length === 0) return null;
    let minDiff = Infinity;
    let closestId: string | null = null;
    rankedTop3.forEach((item) => {
      if (item.entry1Price > 0 && item.livePrice > 0 && item.absDiffPct < minDiff) {
        minDiff = item.absDiffPct;
        closestId = item.strategy.noEstrategia;
      }
    });
    return closestId;
  }, [rankedTop3]);

  const handleExecute = (item: (typeof rankedTop3)[0]) => {
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
    <div id="top-strategies-risk-reward-list" className="flex flex-col gap-2">
      {/* Header Banner - Compacto y elegante */}
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl px-3 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Resumen Top 3 Estrategias R/B
            </h4>
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              Mín 1:2+
            </span>
            <span className="text-[9px] font-mono text-neutral-400 hidden md:inline">
              (Estrategias operables activas)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            <Radio className="w-2.5 h-2.5 animate-pulse" />
            <span>Live FAPI</span>
          </div>

          {/* Toggle View Mode */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px] font-mono">
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                viewMode === 'CARDS'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ver en 3 tarjetas compactas"
            >
              <Layers className="w-3 h-3" />
              <span>Resumen</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-2 py-0.5 rounded transition-all flex items-center gap-1 ${
                viewMode === 'TABLE'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ver en tabla compacta"
            >
              <Table className="w-3 h-3" />
              <span>Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* VISTA 1: BENTO 3 TARJETAS COMPACTAS (Default - Bajo footprint vertical) */}
      {viewMode === 'CARDS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {rankedTop3.length === 0 ? (
            <div className="col-span-3 py-6 text-center text-xs text-neutral-500 font-sans bg-neutral-900/60 rounded-xl border border-neutral-800">
              No hay suficientes estrategias activas para calcular el Top 3.
            </div>
          ) : (
            rankedTop3.map((item, index) => {
              const strat = item.strategy;
              const rank = index + 1;
              const isClosest = closestInTop3Id === strat.noEstrategia;
              const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.par.replace(/[^A-Z0-9]/g, '');

              const rankBadgeClass =
                rank === 1
                  ? 'bg-amber-400 text-neutral-950 font-black'
                  : rank === 2
                  ? 'bg-sky-400 text-neutral-950 font-black'
                  : 'bg-emerald-400 text-neutral-950 font-black';

              const decimalPlaces = item.entry1Price < 10 || item.livePrice < 10 ? 4 : 2;
              const isCloseToEntry = item.absDiffPct <= 0.75;

              return (
                <div
                  key={strat.noEstrategia}
                  className={`rounded-xl border p-2.5 flex flex-col gap-2 transition-all relative ${
                    isClosest
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                      : isSelected
                      ? 'bg-neutral-900 border-amber-400/50'
                      : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Card Top: Rank, Par, Tipo, R:B */}
                  <div className="flex items-center justify-between gap-1.5 pb-1.5 border-b border-neutral-800/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`w-4 h-4 rounded text-[10px] flex items-center justify-center shrink-0 ${rankBadgeClass}`}>
                        #{rank}
                      </span>
                      <strong className="text-white text-xs font-mono truncate">{strat.par}</strong>
                      <span
                        className={`text-[9px] font-bold px-1 py-0.2 rounded font-mono ${
                          item.isLong
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {item.isLong ? 'LONG ↗' : 'SHORT ↘'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        1:{item.ratio.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Strategy Name & Proximity Tag */}
                  <div className="flex items-center justify-between gap-1 text-[10px]">
                    <span className="text-neutral-300 font-sans font-medium truncate" title={strat.nombreEstrategia}>
                      {strat.nombreEstrategia}
                    </span>
                    {isClosest && (
                      <span className="text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-400 text-neutral-950 shrink-0">
                        🎯 MÁS PRÓXIMA
                      </span>
                    )}
                  </div>

                  {/* Key Stats Grid: 1. Precio Live (con cambio abajo) & 2. Entrada 1 (con % vs E1 abajo) */}
                  <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-2 rounded-lg border border-neutral-800/80 font-mono">
                    {/* Precio Live con cambio abajo y dirección */}
                    <div className="flex flex-col">
                      <span className="text-[9px] text-amber-400/90 font-medium flex items-center gap-1">
                        <Radio className="w-2 h-2 text-amber-400 animate-pulse" />
                        Precio Live
                      </span>
                      <span className="text-xs font-bold text-white mt-0.5">
                        ${item.livePrice.toFixed(decimalPlaces)}
                      </span>
                      {/* CAMBIO PASADO ABAJO DEL PRECIO */}
                      <span
                        className={`text-[9px] font-bold flex items-center gap-0.5 mt-0.5 ${
                          item.isPricePositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.isPricePositive ? (
                          <ArrowUpRight className="w-2.5 h-2.5" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5" />
                        )}
                        <span>
                          {item.isPricePositive ? '+' : ''}
                          {(item.liveData.change24hPercent || 0).toFixed(2)}% (24h)
                        </span>
                      </span>
                    </div>

                    {/* Entrada 1 con % vs E1 pasado abajo de Entrada 1 */}
                    <div className="flex flex-col border-l border-neutral-850 pl-2">
                      <span className="text-[9px] text-sky-400/90 font-medium">
                        Entrada 1 (E1)
                      </span>
                      <span className="text-xs font-bold text-sky-300 mt-0.5">
                        ${item.entry1Price.toFixed(decimalPlaces)}
                      </span>
                      {/* % VS E1 PASADO ABAJO DE PRECIO ENTRADA DE E1 */}
                      <span
                        className={`text-[9px] font-bold mt-0.5 ${
                          isCloseToEntry
                            ? 'text-emerald-400'
                            : isClosest
                            ? 'text-amber-300'
                            : 'text-neutral-300'
                        }`}
                      >
                        {item.diffPct >= 0 ? '+' : ''}
                        {item.diffPct.toFixed(2)}% vs E1
                      </span>
                    </div>
                  </div>

                  {/* SL / TP1 Compact Line */}
                  <div className="flex items-center justify-between text-[9px] font-mono px-1 text-neutral-400">
                    <span className="text-rose-400 font-bold">
                      SL: ${item.prices.slPrice ? item.prices.slPrice.toFixed(decimalPlaces) : '-'}
                    </span>
                    <span className="text-emerald-400 font-bold">
                      TP1: ${item.prices.tp1Price ? item.prices.tp1Price.toFixed(decimalPlaces) : '-'}
                    </span>
                    <span className="text-neutral-500">2x Isolate</span>
                  </div>

                  {/* Directional Mini Track (Compact 4px rail with directional arrow) */}
                  <div className="relative pt-2 pb-1 px-1">
                    <div className="h-1.5 w-full bg-neutral-950 rounded-full border border-neutral-800 relative overflow-hidden flex items-center">
                      <div
                        className={`h-full ${
                          item.isPricePositive
                            ? 'bg-gradient-to-r from-sky-500 to-emerald-400'
                            : 'bg-gradient-to-r from-rose-500 to-sky-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(15, 50 + item.diffPct * 2))}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-neutral-500 mt-1">
                      <span>SL</span>
                      <span className={`font-bold flex items-center gap-0.5 ${item.isPricePositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {item.isPricePositive ? '➔ Impulso Alcista' : '➔ En Corrección'}
                      </span>
                      <span>TP1</span>
                    </div>
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
                      className="flex-1 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all shadow-xs"
                      title="Cargar orden de esta estrategia a Binance Futures"
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

      {/* VISTA 2: TABLA COMPACTA DE ALTA DENSIDAD */}
      {viewMode === 'TABLE' && (
        <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 overflow-hidden shadow-md">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-950/90 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <th className="py-2 px-2.5 font-semibold text-center w-10">Rank</th>
                  <th className="py-2 px-2.5 font-semibold">Par</th>
                  <th className="py-2 px-2.5 font-semibold">Tipo</th>
                  <th className="py-2 px-2.5 font-semibold">Estrategia</th>
                  <th className="py-2 px-2.5 font-semibold bg-amber-500/5 text-amber-300 border-x border-amber-500/20">
                    Precio Live
                  </th>
                  <th className="py-2 px-2.5 font-semibold">Entrada 1 (E1)</th>
                  <th className="py-2 px-2.5 font-semibold">Stop Loss</th>
                  <th className="py-2 px-2.5 font-semibold">Take Profit</th>
                  <th className="py-2 px-2.5 font-semibold text-center">Ratio R:B</th>
                  <th className="py-2 px-2.5 font-semibold text-right min-w-[100px]">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 font-mono text-[11px]">
                {rankedTop3.map((item, index) => {
                  const strat = item.strategy;
                  const rank = index + 1;
                  const isClosest = closestInTop3Id === strat.noEstrategia;
                  const decimalPlaces = item.entry1Price < 10 || item.livePrice < 10 ? 4 : 2;

                  return (
                    <tr
                      key={strat.noEstrategia}
                      className={`hover:bg-neutral-850/60 transition-colors ${
                        isClosest ? 'bg-amber-500/10' : ''
                      }`}
                    >
                      <td className="py-2 px-2.5 text-center">
                        <span className="font-bold text-amber-400">#{rank}</span>
                      </td>
                      <td className="py-2 px-2.5 font-bold text-white">{strat.par}</td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            item.isLong ? 'text-emerald-400 bg-emerald-500/15' : 'text-rose-400 bg-rose-500/15'
                          }`}
                        >
                          {item.isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 font-sans truncate max-w-[140px]">
                        {strat.nombreEstrategia}
                      </td>

                      {/* 1. PRECIO LIVE: CAMBIO ABAJO DEL PRECIO */}
                      <td className="py-2 px-2.5 bg-amber-500/5 border-x border-amber-500/20">
                        <div className="flex flex-col">
                          <span className="font-bold text-amber-300">
                            ${item.livePrice.toFixed(decimalPlaces)}
                          </span>
                          <span
                            className={`text-[9px] font-bold flex items-center gap-0.5 ${
                              item.isPricePositive ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.isPricePositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
                            <span>{item.isPricePositive ? '+' : ''}{(item.liveData.change24hPercent || 0).toFixed(2)}% (24h)</span>
                          </span>
                        </div>
                      </td>

                      {/* 2. ENTRADA 1: % VS E1 ABAJO DEL PRECIO */}
                      <td className="py-2 px-2.5">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">${item.entry1Price.toFixed(decimalPlaces)}</span>
                          <span className="text-[9px] font-bold text-sky-300">
                            {item.diffPct >= 0 ? '+' : ''}{item.diffPct.toFixed(2)}% vs E1
                          </span>
                        </div>
                      </td>

                      <td className="py-2 px-2.5 text-rose-400 font-bold">
                        ${item.prices.slPrice ? item.prices.slPrice.toFixed(decimalPlaces) : '-'}
                      </td>

                      <td className="py-2 px-2.5 text-emerald-400 font-bold">
                        ${item.prices.tp1Price ? item.prices.tp1Price.toFixed(decimalPlaces) : '-'}
                      </td>

                      <td className="py-2 px-2.5 text-center">
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[10px]">
                          1:{item.ratio.toFixed(1)}
                        </span>
                      </td>

                      <td className="py-2 px-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleExecute(item)}
                          className="px-2 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 font-bold text-[10px] inline-flex items-center gap-1 shadow-xs"
                        >
                          <Zap className="w-2.5 h-2.5 fill-neutral-950" />
                          <span>Cargar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
