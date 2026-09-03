import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Eye,
  Radio,
  Shield,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';

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
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
    });
    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });
    return () => {
      unStrat: unsubStrat();
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
    <div id="top-strategies-risk-reward-list" className="flex flex-col gap-3">
      {/* Header Banner with Focus on R:B > 1:2 sobre estrategias activas */}
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Top 3 Estrategias Activas con Mayor Ratio R/B
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Mínimo 1:2+
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                Filtrado de Catálogo Activo
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Calculadas en vivo sobre las estrategias activas. Se destaca en dorado la estrategia más próxima a su Entrada 1.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[10px] font-mono text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Precios Live FAPI</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Máx <strong>5x</strong> | <strong>ISOLATED</strong></span>
          </div>
        </div>
      </div>

      {/* Tabla de Top 3 Estrategias Activas */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/90 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                <th className="py-2.5 px-3 font-semibold text-center w-12">Rank</th>
                <th className="py-2.5 px-3 font-semibold">Par / Activo</th>
                <th className="py-2.5 px-3 font-semibold">Dirección</th>
                <th className="py-2.5 px-3 font-semibold min-w-[180px]">Estrategia</th>
                <th className="py-2.5 px-3 font-semibold bg-amber-500/5 text-amber-300 border-x border-amber-500/20">
                  Precio Live
                </th>
                <th className="py-2.5 px-3 font-semibold">Entrada 1 (E1)</th>
                <th className="py-2.5 px-3 font-semibold min-w-[150px]">Dif. vs E1</th>
                <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
                <th className="py-2.5 px-3 font-semibold">Take Profit</th>
                <th className="py-2.5 px-3 font-semibold text-center">Ratio R:B</th>
                <th className="py-2.5 px-3 font-semibold">Apalancamiento</th>
                <th className="py-2.5 px-3 font-semibold text-right min-w-[120px]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 font-mono">
              {rankedTop3.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-8 text-center text-xs text-neutral-500 font-sans">
                    No hay suficientes estrategias activas para calcular el Top 3.
                  </td>
                </tr>
              ) : (
                rankedTop3.map((item, index) => {
                  const strat = item.strategy;
                  const rank = index + 1;
                  const isClosest = closestInTop3Id === strat.noEstrategia;
                  const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.par.replace(/[^A-Z0-9]/g, '');

                  const rankBadgeClass =
                    rank === 1
                      ? 'bg-amber-400 text-neutral-950 font-black ring-1 ring-amber-400/50'
                      : rank === 2
                      ? 'bg-sky-400 text-neutral-950 font-black ring-1 ring-sky-400/50'
                      : 'bg-emerald-400 text-neutral-950 font-black ring-1 ring-emerald-400/50';

                  const decimalPlaces = item.entry1Price < 10 || item.livePrice < 10 ? 4 : 2;
                  const isCloseToEntry = item.absDiffPct <= 0.75;

                  return (
                    <tr
                      key={strat.noEstrategia}
                      className={`transition-all ${
                        isClosest
                          ? 'bg-amber-500/15 hover:bg-amber-500/20 ring-1 ring-inset ring-amber-400/50 shadow-inner'
                          : isSelected
                          ? 'bg-amber-500/10 hover:bg-amber-500/15'
                          : 'hover:bg-neutral-850/60'
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-3 text-center">
                        <span className={`inline-flex w-5 h-5 rounded-md items-center justify-center text-xs ${rankBadgeClass}`}>
                          #{rank}
                        </span>
                      </td>

                      {/* Par */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <span>{strat.par}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                            PERP
                          </span>
                        </div>
                      </td>

                      {/* Dirección */}
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.isLong
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {item.isLong ? (
                            <>
                              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                              LONG
                            </>
                          ) : (
                            <>
                              <ArrowDownRight className="w-3 h-3 text-rose-400" />
                              SHORT
                            </>
                          )}
                        </span>
                      </td>

                      {/* Nombre & Badge de Más Próxima */}
                      <td className="py-3 px-3 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-xs">{strat.nombreEstrategia}</span>
                          {isClosest && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-amber-400 text-neutral-950 ring-1 ring-amber-400/60 shadow-xs animate-pulse">
                              <Target className="w-2.5 h-2.5" />
                              MÁS PRÓXIMA A E1
                            </span>
                          )}
                        </div>
                        {strat.comentariosBacktesting && (
                          <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                            {strat.comentariosBacktesting}
                          </div>
                        )}
                      </td>

                      {/* 1. PRECIO LIVE (PRIMERO) */}
                      <td className="py-3 px-3 bg-amber-500/5 border-x border-amber-500/20">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-amber-300 text-xs">
                            ${item.livePrice.toFixed(decimalPlaces)}
                          </span>
                          <span
                            className={`text-[9px] font-semibold ${
                              item.liveData.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {item.liveData.change24hPercent >= 0 ? '+' : ''}
                            {item.liveData.change24hPercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* 2. ENTRADA 1 (E1) (DESPUÉS) */}
                      <td className="py-3 px-3 font-bold text-white">
                        ${item.entry1Price.toFixed(decimalPlaces)}
                      </td>

                      {/* 3. DIFERENCIA VS ENTRADA 1 */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-0.5">
                          <div
                            className={`font-bold text-xs flex items-center gap-1 ${
                              isClosest
                                ? 'text-amber-300'
                                : isCloseToEntry
                                ? 'text-emerald-400'
                                : item.isLong
                                ? item.diffDollar > 0
                                  ? 'text-sky-300'
                                  : 'text-emerald-300'
                                : item.diffDollar > 0
                                ? 'text-emerald-300'
                                : 'text-sky-300'
                            }`}
                          >
                            <span>
                              {item.diffDollar >= 0 ? '+' : ''}${item.diffDollar.toFixed(decimalPlaces)}
                            </span>
                            <span className="text-[10px]">
                              ({item.diffPct >= 0 ? '+' : ''}{item.diffPct.toFixed(2)}%)
                            </span>
                          </div>
                          <span
                            className={`text-[9px] font-medium font-sans ${
                              isClosest
                                ? 'text-amber-300 font-bold'
                                : isCloseToEntry
                                ? 'text-emerald-400 font-bold'
                                : 'text-neutral-400'
                            }`}
                          >
                            {isClosest
                              ? `⭐ Más cercana (${item.absDiffPct.toFixed(2)}% dist)`
                              : isCloseToEntry
                              ? '🎯 En zona E1'
                              : item.isLong
                              ? item.diffDollar > 0
                                ? 'Esperando retroceso'
                                : '💎 Descuento vs E1'
                              : item.diffDollar > 0
                              ? '💎 Mejor precio Short'
                              : 'Esperando rebote'}
                          </span>
                        </div>
                      </td>

                      {/* Stop Loss */}
                      <td className="py-3 px-3">
                        <div className="text-rose-400 font-bold">
                          {item.prices.slPrice ? `$${item.prices.slPrice.toFixed(decimalPlaces)}` : '-'}
                        </div>
                      </td>

                      {/* Take Profit */}
                      <td className="py-3 px-3">
                        <div className="text-emerald-400 font-bold">
                          {item.prices.tp1Price ? `$${item.prices.tp1Price.toFixed(decimalPlaces)}` : '-'}
                        </div>
                      </td>

                      {/* Ratio R:B */}
                      <td className="py-3 px-3 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          1:{item.ratio.toFixed(1)}
                        </span>
                      </td>

                      {/* Apalancamiento */}
                      <td className="py-3 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] font-bold">
                          2x Isolated
                        </span>
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleExecute(item)}
                          className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold inline-flex items-center gap-1 transition-all shadow-xs"
                          title="Cargar orden de esta estrategia a Binance Futures"
                        >
                          <Zap className="w-3 h-3 fill-neutral-950" />
                          <span>Cargar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
