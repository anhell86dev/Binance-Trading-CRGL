import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Check,
  TrendingUp,
  Award,
  ShieldAlert,
  Percent,
  Sliders,
  Play,
  RotateCcw,
  X,
} from 'lucide-react';
import { BacktestCandle, BacktestParams, OptimizationGridItem } from '../types/backtesting';
import { backtestingService } from '../services/backtestingService';

interface BacktestOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawCandles: BacktestCandle[];
  baseParams: BacktestParams;
  onApplyParams: (params: Partial<BacktestParams>) => void;
}

export const BacktestOptimizerModal: React.FC<BacktestOptimizerModalProps> = ({
  isOpen,
  onClose,
  rawCandles,
  baseParams,
  onApplyParams,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<OptimizationGridItem[]>([]);
  const [appliedId, setAppliedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunOptimizer = async () => {
    setIsRunning(true);
    setProgress(0);

    // Yield to UI thread
    setTimeout(() => {
      try {
        const gridResults = backtestingService.runGridOptimization(
          rawCandles,
          baseParams,
          (pct) => setProgress(pct)
        );
        setResults(gridResults.slice(0, 20)); // Top 20 combinations
      } catch (e) {
        console.error('Optimizer error:', e);
      } finally {
        setIsRunning(false);
        setProgress(100);
      }
    }, 50);
  };

  const handleApply = (item: OptimizationGridItem) => {
    onApplyParams({
      emaFastPeriod: item.emaFast,
      emaSlowPeriod: item.emaSlow,
      atrPeriod: item.atrPeriod,
      atrMultiplierSl: item.atrMultiplierSl,
      atrMultiplierTp: item.atrMultiplierTp,
    });
    setAppliedId(item.id);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 m-0">
                <span>Optimizador de Parámetros ATR & EMAs (Grid Search)</span>
                <span className="badge bg-purple-400/20 text-purple-300 border border-purple-400/30 text-[11px] font-mono px-2 py-0.5 rounded-md">
                  {baseParams.symbol} • {baseParams.interval}
                </span>
              </h3>
              <p className="text-xs text-neutral-400 m-0">
                Explora cientos de combinaciones matemáticas para encontrar la calibración óptima con mayor Sharpe Ratio y menor Drawdown
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls & Run Button */}
        <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-xs text-neutral-300 space-y-0.5">
            <div className="font-mono text-neutral-400">
              Espacio de búsqueda: <span className="text-white font-bold">EMA (7-20 / 21-50)</span> × <span className="text-white font-bold">ATR (10-20)</span> × <span className="text-white font-bold">SL (1.2x-2.5x)</span> × <span className="text-white font-bold">TP (2.0x-5.0x)</span>
            </div>
            <div className="text-[11px] text-neutral-500">
              Sobre {rawCandles.length} velas históricas descargadas de Binance
            </div>
          </div>

          <button
            onClick={handleRunOptimizer}
            disabled={isRunning || rawCandles.length < 50}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <Zap className="w-4 h-4 animate-spin text-purple-300" />
                <span>Optimizando ({progress}%)...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Ejecutar Grid Search</span>
              </>
            )}
          </button>
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[300px]">
          {results.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-500 font-mono text-xs">
              <Sliders className="w-8 h-8 text-neutral-600" />
              <span>Haz clic en "Ejecutar Grid Search" para encontrar la calibración óptima</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-xs font-mono text-neutral-400 flex items-center justify-between px-1">
                <span>Top 20 Configuraciones Ordenadas por Score Compuesto (Sharpe × Profit Factor)</span>
                <span>{results.length} Configuraciones Encontradas</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-neutral-800">
                <table className="w-full text-left text-xs text-neutral-200 border-collapse">
                  <thead>
                    <tr className="bg-neutral-950 border-b border-neutral-800 text-[11px] font-mono uppercase text-neutral-400">
                      <th className="p-2.5 text-center w-10">#</th>
                      <th className="p-2.5 min-w-[130px]">EMAs (Rápida / Lenta)</th>
                      <th className="p-2.5 min-w-[140px]">ATR (Periodo / SL / TP)</th>
                      <th className="p-2.5 text-right min-w-[95px]">Retorno %</th>
                      <th className="p-2.5 text-center min-w-[85px]">Win Rate</th>
                      <th className="p-2.5 text-center min-w-[80px]">P. Factor</th>
                      <th className="p-2.5 text-right min-w-[85px]">Max DD</th>
                      <th className="p-2.5 text-center min-w-[75px]">Sharpe</th>
                      <th className="p-2.5 text-right min-w-[90px]">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {results.map((item, idx) => {
                      const isTop1 = idx === 0;
                      const isApplied = appliedId === item.id;
                      const isProfit = item.netProfitPct >= 0;

                      return (
                        <tr
                          key={item.id}
                          className={`transition-colors ${
                            isTop1
                              ? 'bg-purple-950/25 border-l-2 border-l-purple-400'
                              : 'hover:bg-neutral-800/40'
                          }`}
                        >
                          <td className="p-2.5 text-center font-bold text-neutral-400">
                            {isTop1 ? <span className="text-purple-400 font-bold">★ 1</span> : `#${idx + 1}`}
                          </td>

                          {/* EMAs */}
                          <td className="p-2.5">
                            <span className="text-cyan-300 font-bold">EMA {item.emaFast}</span>
                            <span className="text-neutral-500 mx-1">/</span>
                            <span className="text-purple-300 font-bold">EMA {item.emaSlow}</span>
                          </td>

                          {/* ATR */}
                          <td className="p-2.5">
                            <div className="flex flex-col text-[11px]">
                              <span className="text-amber-300 font-bold">ATR {item.atrPeriod}</span>
                              <span className="text-neutral-400 text-[10px]">
                                SL: {item.atrMultiplierSl}x • TP: {item.atrMultiplierTp}x
                              </span>
                            </div>
                          </td>

                          {/* Retorno */}
                          <td className="p-2.5 text-right">
                            <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : ''}{item.netProfitPct.toFixed(2)}%
                            </span>
                          </td>

                          {/* Win Rate */}
                          <td className="p-2.5 text-center">
                            <span className="text-white font-bold">{item.winRatePct.toFixed(1)}%</span>
                            <span className="text-[10px] text-neutral-500 block">({item.totalTrades}T)</span>
                          </td>

                          {/* Profit Factor */}
                          <td className="p-2.5 text-center">
                            <span
                              className={`font-bold ${
                                item.profitFactor >= 1.5
                                  ? 'text-emerald-400'
                                  : item.profitFactor >= 1.0
                                  ? 'text-amber-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {item.profitFactor.toFixed(2)}
                            </span>
                          </td>

                          {/* Max DD */}
                          <td className="p-2.5 text-right text-rose-400 font-bold">
                            -{item.maxDrawdownPct.toFixed(1)}%
                          </td>

                          {/* Sharpe */}
                          <td className="p-2.5 text-center text-blue-300 font-bold">
                            {item.sharpeRatio.toFixed(2)}
                          </td>

                          {/* Aplicar */}
                          <td className="p-2.5 text-right">
                            <button
                              onClick={() => handleApply(item)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ms-auto ${
                                isApplied
                                  ? 'bg-emerald-500 text-neutral-950 font-extrabold'
                                  : isTop1
                                  ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-xs'
                                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                              }`}
                            >
                              {isApplied ? (
                                <>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>¡Aplicado!</span>
                                </>
                              ) : (
                                <span>Aplicar</span>
                              )}
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
      </div>
    </div>
  );
};
