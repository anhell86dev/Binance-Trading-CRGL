import React, { useState, useEffect } from 'react';
import {
  Activity,
  Award,
  BarChart2,
  Percent,
  PieChart,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { PerformanceStats, TradeHistoryItem } from '../types/binance';

export const MetricsDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceStats>(binanceWs.getPerformanceMetrics());
  const [history, setHistory] = useState<TradeHistoryItem[]>(binanceWs.getTradeHistory());

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setMetrics(binanceWs.getPerformanceMetrics());
      setHistory(binanceWs.getTradeHistory());
    });
    return () => unsub();
  }, []);

  const hasTrades = history.length > 0;
  const isPnlPositive = metrics.totalRealizedPnl >= 0;

  return (
    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Métricas de Rendimiento Avanzadas
          </h3>
        </div>
        <span className="text-xs text-neutral-400 font-mono">
          {metrics.totalTrades} Trade{metrics.totalTrades === 1 ? '' : 's'} evaluados
        </span>
      </div>

      {/* Grid of Key Performance Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Win Rate */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Tasa de Acierto</span>
            <Target className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {metrics.winRate}%
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            {metrics.winningTrades}W / {metrics.losingTrades}L
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Profit Factor</span>
            <Activity className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className={`text-xl font-bold font-mono ${metrics.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-neutral-200'}`}>
            {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '-'}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Ganancias / Pérdidas
          </div>
        </div>

        {/* Total Realized PnL */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>PnL Realizado Neto</span>
            {isPnlPositive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono ${isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isPnlPositive ? '+' : ''}${metrics.totalRealizedPnl.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            USDT acumulado
          </div>
        </div>

        {/* Avg Win */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Ganancia Media</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            +${metrics.avgWin.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Por trade ganador
          </div>
        </div>

        {/* Avg Loss */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Pérdida Media</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-mono text-rose-400">
            -${metrics.avgLoss.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Por trade perdedor
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400">
            {metrics.maxDrawdownPercent}%
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Control de riesgo estricto
          </div>
        </div>
      </div>

      {/* Visual Win / Loss Bar & Risk Ratio */}
      <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs font-mono">
          <span className="text-neutral-400">Distribución de Operaciones:</span>
          <div className="flex gap-3">
            <span className="text-emerald-400 font-bold">{metrics.winningTrades} Ganadoras</span>
            <span className="text-rose-400 font-bold">{metrics.losingTrades} Perdedoras</span>
          </div>
        </div>

        <div className="w-full bg-neutral-800 h-2.5 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all duration-300"
            style={{ width: `${metrics.winRate || 50}%` }}
          />
          <div
            className="bg-rose-500 h-full transition-all duration-300"
            style={{ width: `${100 - (metrics.winRate || 50)}%` }}
          />
        </div>

        <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono pt-1">
          <span>Relación Ganancia/Pérdida Típica: 1:{metrics.avgLoss > 0 ? (metrics.avgWin / metrics.avgLoss).toFixed(1) : '2.0'}</span>
          <span>Apalancamiento Seguro: 1-5x Isolated</span>
        </div>
      </div>
    </div>
  );
};
