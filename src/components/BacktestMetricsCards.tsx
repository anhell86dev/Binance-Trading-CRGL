import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Award,
  ShieldAlert,
  Activity,
  DollarSign,
  Scale,
  Clock,
  Zap,
} from 'lucide-react';
import { BacktestMetrics } from '../types/backtesting';

interface BacktestMetricsCardsProps {
  metrics: BacktestMetrics;
  initialCapital: number;
}

export const BacktestMetricsCards: React.FC<BacktestMetricsCardsProps> = ({
  metrics,
  initialCapital,
}) => {
  const isProfit = metrics.netProfitUsdt >= 0;

  return (
    <div id="backtest-metrics-container" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Retorno Neto ($ y %) */}
      <div className={`p-3 rounded-xl border flex flex-col justify-between ${
        isProfit
          ? 'bg-emerald-950/20 border-emerald-500/30'
          : 'bg-rose-950/20 border-rose-500/30'
      }`}>
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Retorno Neto</span>
          {isProfit ? (
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          ) : (
            <TrendingDown className="w-4 h-4 text-rose-400" />
          )}
        </div>
        <div>
          <span className={`text-lg sm:text-xl font-mono font-extrabold block ${
            isProfit ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {isProfit ? '+' : ''}${metrics.netProfitUsdt.toFixed(2)}
          </span>
          <span className={`text-xs font-mono font-bold ${
            isProfit ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {isProfit ? '+' : ''}{metrics.netProfitPct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* 2. Win Rate (Tasa de Acierto) */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Win Rate</span>
          <Percent className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-white block">
            {metrics.winRatePct.toFixed(1)}%
          </span>
          <span className="text-xs font-mono text-neutral-400">
            {metrics.winningTrades}W / {metrics.losingTrades}L ({metrics.totalTrades} Total)
          </span>
        </div>
      </div>

      {/* 3. Profit Factor */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Profit Factor</span>
          <Award className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <span className={`text-lg sm:text-xl font-mono font-extrabold block ${
            metrics.profitFactor >= 1.5
              ? 'text-emerald-400'
              : metrics.profitFactor >= 1.0
              ? 'text-amber-300'
              : 'text-rose-400'
          }`}>
            {metrics.profitFactor.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-neutral-400">
            G: ${metrics.grossProfitUsdt.toFixed(0)} / P: ${metrics.grossLossUsdt.toFixed(0)}
          </span>
        </div>
      </div>

      {/* 4. Max Drawdown */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Max Drawdown</span>
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        </div>
        <div>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-rose-400 block">
            -{metrics.maxDrawdownPct.toFixed(2)}%
          </span>
          <span className="text-xs font-mono text-neutral-400">
            -${metrics.maxDrawdownUsdt.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 5. Sharpe & Sortino Ratio */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Sharpe Ratio</span>
          <Activity className="w-4 h-4 text-blue-400" />
        </div>
        <div>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-white block">
            {metrics.sharpeRatio.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-neutral-400">
            Sortino: {metrics.sortinoRatio.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 6. Payoff Ratio & Racha */}
      <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
        <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
          <span className="font-mono text-[11px] uppercase">Payoff Ratio</span>
          <Scale className="w-4 h-4 text-teal-400" />
        </div>
        <div>
          <span className="text-lg sm:text-xl font-mono font-extrabold text-white block">
            1:{metrics.payoffRatio.toFixed(2)}
          </span>
          <span className="text-xs font-mono text-neutral-400">
            Racha: {metrics.maxConsecutiveWins}W / {metrics.maxConsecutiveLosses}L
          </span>
        </div>
      </div>
    </div>
  );
};
