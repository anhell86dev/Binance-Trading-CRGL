import React, { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Radio,
  Shield,
  Zap,
} from 'lucide-react';
import { TOP_3_STRATEGIES_CATALOG, TopStrategyConfig } from '../services/strategyAutofillService';
import { ExecuteStrategyButton } from './ExecuteStrategyButton';
import { livePriceService } from '../services/livePriceService';

interface TopStrategiesRiskRewardListProps {
  onStrategySelected?: (strategy: TopStrategyConfig) => void;
  highlightSymbol?: string;
}

export const TopStrategiesRiskRewardList: React.FC<TopStrategiesRiskRewardListProps> = ({
  onStrategySelected,
  highlightSymbol,
}) => {
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsub = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });
    return () => {
      unsub();
    };
  }, []);

  return (
    <div id="top-strategies-risk-reward-list" className="flex flex-col gap-3">
      {/* Header Banner with Focus on R:B > 1:2 */}
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Top 3 Estrategias R/B (Mínimo 1:2+)
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Alta Asimetría
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Configuraciones clasificadas por ratio Riesgo/Beneficio con monitoreo de Precio Live en tiempo real y cálculo de distancia a Entrada 1.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-[10px] font-mono text-emerald-400">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>Precios Live Binance</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Máx <strong>5x</strong> | <strong>ISOLATED</strong></span>
          </div>
        </div>
      </div>

      {/* Tabla de Top 3 Estrategias */}
      <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/90 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                <th className="py-2.5 px-3 font-semibold text-center w-12">Rank</th>
                <th className="py-2.5 px-3 font-semibold">Par / Activo</th>
                <th className="py-2.5 px-3 font-semibold">Dirección</th>
                <th className="py-2.5 px-3 font-semibold min-w-[170px]">Estrategia</th>
                <th className="py-2.5 px-3 font-semibold">Entrada 1 (E1)</th>
                <th className="py-2.5 px-3 font-semibold">Precio Live</th>
                <th className="py-2.5 px-3 font-semibold">Dif. vs E1</th>
                <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
                <th className="py-2.5 px-3 font-semibold">Take Profit</th>
                <th className="py-2.5 px-3 font-semibold text-center">Ratio R:B</th>
                <th className="py-2.5 px-3 font-semibold">Apalancamiento</th>
                <th className="py-2.5 px-3 font-semibold text-right min-w-[120px]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 font-mono">
              {TOP_3_STRATEGIES_CATALOG.map((strat) => {
                const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.symbol.toUpperCase();
                const rankBadgeClass =
                  strat.rank === 1
                    ? 'bg-amber-400 text-neutral-950 font-black ring-1 ring-amber-400/50'
                    : strat.rank === 2
                    ? 'bg-sky-400 text-neutral-950 font-black ring-1 ring-sky-400/50'
                    : 'bg-emerald-400 text-neutral-950 font-black ring-1 ring-emerald-400/50';

                // Live price data
                const liveData = livePriceService.getPriceData(strat.symbol);
                const livePrice = liveData.price;
                const isLong = strat.side === 'BUY';

                // Calculate entry difference
                const entry1 = strat.entryPrice || (strat.side === 'BUY' ? livePrice * 0.99 : livePrice * 1.01);
                const diffDollar = livePrice - entry1;
                const diffPct = entry1 > 0 ? (diffDollar / entry1) * 100 : 0;
                const isCloseToEntry = Math.abs(diffPct) <= 0.75;

                return (
                  <tr
                    key={strat.id}
                    className={`transition-colors ${
                      isSelected
                        ? 'bg-amber-500/10 hover:bg-amber-500/15'
                        : 'hover:bg-neutral-850/60'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex w-5 h-5 rounded-md items-center justify-center text-xs ${rankBadgeClass}`}>
                        #{strat.rank}
                      </span>
                    </td>

                    {/* Par */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                        <span>{strat.symbol}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
                          PERP
                        </span>
                      </div>
                    </td>

                    {/* Dirección */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          strat.side === 'BUY'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {strat.side === 'BUY' ? (
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

                    {/* Nombre & Concepto */}
                    <td className="py-3 px-3 font-sans">
                      <div className="font-bold text-white text-xs">{strat.name}</div>
                      <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                        {strat.concept || strat.description}
                      </div>
                    </td>

                    {/* Entrada 1 (E1) */}
                    <td className="py-3 px-3 font-bold text-white">
                      ${entry1.toFixed(entry1 < 10 ? 4 : 2)}
                    </td>

                    {/* Precio Live */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-amber-300">
                          ${livePrice.toFixed(livePrice < 10 ? 4 : 2)}
                        </span>
                        <span
                          className={`text-[9px] font-semibold ${
                            liveData.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {liveData.change24hPercent >= 0 ? '+' : ''}
                          {liveData.change24hPercent.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Diferencia vs Entrada 1 */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <div
                          className={`font-bold text-xs flex items-center gap-1 ${
                            isCloseToEntry
                              ? 'text-emerald-400'
                              : diffPct > 0
                              ? isLong
                                ? 'text-sky-300'
                                : 'text-emerald-300'
                              : isLong
                              ? 'text-emerald-300'
                              : 'text-sky-300'
                          }`}
                        >
                          <span>
                            {diffDollar >= 0 ? '+' : ''}${Math.abs(diffDollar).toFixed(entry1 < 10 ? 4 : 2)}
                          </span>
                          <span className="text-[10px]">
                            ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-medium ${
                            isCloseToEntry
                              ? 'text-emerald-400 font-bold'
                              : 'text-neutral-400'
                          }`}
                        >
                          {isCloseToEntry
                            ? '🎯 En zona E1'
                            : isLong
                            ? diffDollar > 0
                              ? 'Esperando retroceso'
                              : '💎 Descuento vs E1'
                            : diffDollar > 0
                            ? '💎 Mejor precio Short'
                            : 'Esperando rebote'}
                        </span>
                      </div>
                    </td>

                    {/* Stop Loss */}
                    <td className="py-3 px-3">
                      <div className="text-rose-400 font-bold">
                        -{strat.slPercent}%
                      </div>
                    </td>

                    {/* Take Profit */}
                    <td className="py-3 px-3">
                      <div className="text-emerald-400 font-bold">
                        +{strat.tpPercent}%
                      </div>
                    </td>

                    {/* Ratio R:B */}
                    <td className="py-3 px-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        {strat.riskRewardRatio}
                      </span>
                    </td>

                    {/* Apalancamiento */}
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300 text-[11px] font-bold">
                        {strat.leverage}x Isolated
                      </span>
                    </td>

                    {/* Acción */}
                    <td className="py-3 px-3 text-right">
                      <ExecuteStrategyButton
                        strategy={strat}
                        variant="primary"
                        onExecuteComplete={() => onStrategySelected?.(strat)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
