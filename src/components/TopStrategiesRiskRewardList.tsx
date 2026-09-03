import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Shield,
} from 'lucide-react';
import { TOP_3_STRATEGIES_CATALOG, TopStrategyConfig } from '../services/strategyAutofillService';
import { ExecuteStrategyButton } from './ExecuteStrategyButton';

interface TopStrategiesRiskRewardListProps {
  onStrategySelected?: (strategy: TopStrategyConfig) => void;
  highlightSymbol?: string;
}

export const TopStrategiesRiskRewardList: React.FC<TopStrategiesRiskRewardListProps> = ({
  onStrategySelected,
  highlightSymbol,
}) => {
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
              Configuraciones clasificadas por ratio Riesgo/Beneficio con límites estrictos de apalancamiento 1x-5x y margen aislado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Máx <strong>5x</strong> | <strong>ISOLATED</strong></span>
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
                <th className="py-2.5 px-3 font-semibold min-w-[200px]">Estrategia & Patrón</th>
                <th className="py-2.5 px-3 font-semibold">Temporalidad</th>
                <th className="py-2.5 px-3 font-semibold">Stop Loss</th>
                <th className="py-2.5 px-3 font-semibold">Take Profit</th>
                <th className="py-2.5 px-3 font-semibold text-center">Ratio R:B</th>
                <th className="py-2.5 px-3 font-semibold">Apalancamiento</th>
                <th className="py-2.5 px-3 font-semibold text-right min-w-[130px]">Acción</th>
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

                    {/* Temporalidad */}
                    <td className="py-3 px-3 text-neutral-300 text-[11px]">
                      {strat.timeframe}
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
