import React from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Crown,
  Layers,
  Lock,
  Percent,
  Radio,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
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
      <div className="bg-gradient-to-r from-amber-500/10 via-neutral-900 to-neutral-900 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Crown className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Top 3 Estrategias R/B (Mín. 1:2+)
              </h4>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Alta Asimetría
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Configuraciones ordenadas por relación Riesgo/Beneficio con límites estrictos de seguridad.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-300">
          <Shield className="w-3 h-3 text-emerald-400" />
          <span>Máx <strong>5x</strong> | <strong>ISOLATED</strong></span>
        </div>
      </div>

      {/* Vertical Ordered List (1 to 3) */}
      <div className="flex flex-col gap-2.5">
        {TOP_3_STRATEGIES_CATALOG.map((strat) => {
          const isSelected = highlightSymbol && highlightSymbol.toUpperCase() === strat.symbol.toUpperCase();
          const rankColors =
            strat.rank === 1
              ? {
                  badge: 'bg-amber-400 text-neutral-950 font-black',
                  cardBorder: 'border-amber-500/50 hover:border-amber-400 bg-amber-950/20',
                  glow: 'ring-1 ring-amber-500/40',
                }
              : strat.rank === 2
              ? {
                  badge: 'bg-sky-400 text-neutral-950 font-black',
                  cardBorder: 'border-sky-500/40 hover:border-sky-400 bg-sky-950/20',
                  glow: 'ring-1 ring-sky-500/30',
                }
              : {
                  badge: 'bg-emerald-400 text-neutral-950 font-black',
                  cardBorder: 'border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/20',
                  glow: 'ring-1 ring-emerald-500/30',
                };

          return (
            <div
              key={strat.id}
              id={`top-strategy-card-${strat.rank}`}
              className={`p-3 rounded-xl border transition-all flex flex-col gap-2.5 relative ${
                rankColors.cardBorder
              } ${isSelected ? 'ring-2 ring-amber-400 bg-neutral-900 shadow-lg' : 'bg-neutral-950/90'}`}
            >
              {/* Top Row: Rank Tag, Title, Pair, R:B Ratio Pill */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  <span
                    className={`w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 shadow-xs ${rankColors.badge}`}
                  >
                    #{strat.rank}
                  </span>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs sm:text-sm">{strat.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-900 text-amber-300 border border-neutral-700">
                        {strat.symbol}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400">
                        {strat.timeframe}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-1 leading-relaxed">
                      {strat.description}
                    </p>
                  </div>
                </div>

                {/* Risk/Reward Highlight Pill */}
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[9px] uppercase font-mono text-neutral-400 font-semibold">
                    Relación R:B
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-black px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-xs flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    {strat.riskRewardRatio}
                  </span>
                </div>
              </div>

              {/* Technical Indicators & Risk Protocol Specs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 text-[10px] font-mono">
                <div className="flex flex-col">
                  <span className="text-neutral-500 uppercase text-[9px] flex items-center gap-1">
                    <Shield className="w-2.5 h-2.5 text-blue-400" />
                    Apalancamiento
                  </span>
                  <span className="text-amber-300 font-bold text-xs">
                    {strat.leverage}x Seguro
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-neutral-500 uppercase text-[9px] flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5 text-blue-400" />
                    Margen
                  </span>
                  <span className="text-blue-300 font-bold text-xs">
                    {strat.marginType}
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-neutral-500 uppercase text-[9px]">Stop-Loss (SL)</span>
                  <span className="text-rose-400 font-bold text-xs">
                    -{strat.slPercent}%
                  </span>
                </div>

                <div className="flex flex-col">
                  <span className="text-neutral-500 uppercase text-[9px]">Take-Profit (TP)</span>
                  <span className="text-emerald-400 font-bold text-xs">
                    +{strat.tpPercent}%
                  </span>
                </div>
              </div>

              {/* Technical details note */}
              <div className="text-[10px] text-neutral-400 flex items-center gap-1.5 bg-neutral-900/50 px-2.5 py-1 rounded border border-neutral-850 font-mono">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="truncate">{strat.technicalDetails}</span>
              </div>

              {/* Action Button: Auto-execute with direct transfer to Futures Form */}
              <div className="pt-1 flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-400 font-mono hidden sm:inline">
                  Transferencia inmediata a Binance API con SL/TP fijados
                </span>
                <div className="w-full sm:w-auto">
                  <ExecuteStrategyButton
                    strategy={strat}
                    variant="compact"
                    onExecuteComplete={() => {
                      if (onStrategySelected) {
                        onStrategySelected(strat);
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
