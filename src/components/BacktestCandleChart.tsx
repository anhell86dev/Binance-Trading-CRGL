import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceDot,
} from 'recharts';
import { BacktestCandle, BacktestTrade } from '../types/backtesting';
import { Layers, Eye, Zap, Flame, Target, Skull, ShieldCheck } from 'lucide-react';

interface BacktestCandleChartProps {
  candles: BacktestCandle[];
  trades: BacktestTrade[];
  symbol: string;
  interval: string;
}

export const BacktestCandleChart: React.FC<BacktestCandleChartProps> = ({
  candles,
  trades,
  symbol,
  interval,
}) => {
  const [showAtrBands, setShowAtrBands] = useState(true);
  const [showEmas, setShowEmas] = useState(true);
  const [showTrades, setShowTrades] = useState(true);

  // Map trades for quick lookup at candle time
  const tradesMap = useMemo(() => {
    const entryMap = new Map<number, BacktestTrade>();
    const exitMap = new Map<number, BacktestTrade>();

    trades.forEach((t) => {
      entryMap.set(t.entryTime, t);
      exitMap.set(t.exitTime, t);
    });

    return { entryMap, exitMap };
  }, [trades]);

  // Downsample to max 180 points for chart readability
  const chartData = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    
    // Take the most recent candles or downsample
    const maxPoints = 200;
    let sampled = candles;
    if (candles.length > maxPoints) {
      sampled = candles.slice(candles.length - maxPoints);
    }

    return sampled.map((c) => {
      const entryTrade = tradesMap.entryMap.get(c.time);
      const exitTrade = tradesMap.exitMap.get(c.time);

      return {
        time: c.time,
        timeStr: new Date(c.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        emaFast: c.emaFast,
        emaSlow: c.emaSlow,
        emaTrend: c.emaTrend,
        upperAtrBand: c.upperAtrBand,
        lowerAtrBand: c.lowerAtrBand,
        entryTrade,
        exitTrade,
        isEntry: Boolean(entryTrade),
        isExit: Boolean(exitTrade),
      };
    });
  }, [candles, tradesMap]);

  if (chartData.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500 font-mono text-xs">
        Cargando datos del gráfico de simulación...
      </div>
    );
  }

  const minPrice = Math.min(...chartData.map((d) => d.low));
  const maxPrice = Math.max(...chartData.map((d) => d.high));
  const yDomainMin = Math.floor(minPrice * 0.99);
  const yDomainMax = Math.ceil(maxPrice * 1.01);

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-3">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white flex items-center gap-2 m-0">
              <span>Gráfico Histórico con Señales & Bandas ATR</span>
              <span className="badge bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono px-2 py-0.5 rounded-md">
                {symbol} • {interval}
              </span>
            </h5>
            <span className="text-[11px] text-neutral-400">
              Visualización de EMAs (Rápida/Lenta), Envolvente ATR y Puntos de Entrada/Salida
            </span>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-2 flex-wrap font-mono text-[11px]">
          <button
            onClick={() => setShowEmas(!showEmas)}
            className={`px-2 py-1 rounded transition-colors cursor-pointer border ${
              showEmas
                ? 'bg-blue-950 text-blue-300 border-blue-600'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800'
            }`}
          >
            EMAs {showEmas ? '✓' : '✕'}
          </button>

          <button
            onClick={() => setShowAtrBands(!showAtrBands)}
            className={`px-2 py-1 rounded transition-colors cursor-pointer border ${
              showAtrBands
                ? 'bg-amber-950 text-amber-300 border-amber-600'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800'
            }`}
          >
            Bandas ATR {showAtrBands ? '✓' : '✕'}
          </button>

          <button
            onClick={() => setShowTrades(!showTrades)}
            className={`px-2 py-1 rounded transition-colors cursor-pointer border ${
              showTrades
                ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800'
            }`}
          >
            Trades ({trades.length}) {showTrades ? '✓' : '✕'}
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="flex items-center gap-4 text-xs font-mono flex-wrap bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-neutral-300">Precio Close</span>
        </div>
        {showEmas && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-cyan-400 rounded-full"></span>
              <span className="text-cyan-300">EMA Rápida</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-1 bg-purple-400 rounded-full"></span>
              <span className="text-purple-300">EMA Lenta</span>
            </div>
          </>
        )}
        {showAtrBands && (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-1 bg-amber-500/50 border-t border-dashed border-amber-400"></span>
            <span className="text-amber-400/80">Banda Superior/Inferior ATR</span>
          </div>
        )}
        {showTrades && (
          <div className="flex items-center gap-3 ms-auto text-[11px]">
            <span className="text-emerald-400 flex items-center gap-1">🟢 Entrada Long</span>
            <span className="text-rose-400 flex items-center gap-1">🔴 Entrada Short</span>
            <span className="text-purple-300 flex items-center gap-1">🎯 TP</span>
            <span className="text-rose-300 flex items-center gap-1">🛑 SL</span>
          </div>
        )}
      </div>

      {/* Recharts Composed Chart */}
      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />

            <XAxis
              dataKey="timeStr"
              stroke="#737373"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
              minTickGap={40}
            />

            <YAxis
              domain={[yDomainMin, yDomainMax]}
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
              tickFormatter={(v) => `$${v >= 1000 ? v.toLocaleString() : v.toFixed(2)}`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload;
                  return (
                    <div className="bg-neutral-950/95 border border-neutral-800 rounded-lg p-3 shadow-2xl font-mono text-xs space-y-1.5 min-w-[200px]">
                      <div className="text-neutral-400 text-[10px] border-b border-neutral-800 pb-1 font-sans">
                        {pt.timeStr}
                      </div>
                      <div className="flex items-center justify-between text-white font-bold">
                        <span>Precio:</span>
                        <span>${pt.close.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                        <span>High / Low:</span>
                        <span>${pt.high.toFixed(2)} / ${pt.low.toFixed(2)}</span>
                      </div>
                      {pt.emaFast && (
                        <div className="flex items-center justify-between text-cyan-300 text-[11px]">
                          <span>EMA Rápida:</span>
                          <span>${pt.emaFast.toFixed(2)}</span>
                        </div>
                      )}
                      {pt.emaSlow && (
                        <div className="flex items-center justify-between text-purple-300 text-[11px]">
                          <span>EMA Lenta:</span>
                          <span>${pt.emaSlow.toFixed(2)}</span>
                        </div>
                      )}
                      {pt.upperAtrBand && (
                        <div className="flex items-center justify-between text-amber-400/80 text-[11px]">
                          <span>Bandas ATR:</span>
                          <span>${pt.lowerAtrBand?.toFixed(2)} - ${pt.upperAtrBand?.toFixed(2)}</span>
                        </div>
                      )}

                      {/* Trade details in tooltip if present */}
                      {pt.entryTrade && (
                        <div className="mt-1 pt-1 border-t border-neutral-800 text-[11px] text-emerald-400 font-bold">
                          ⚡ ENTRADA {pt.entryTrade.side} @ ${pt.entryTrade.entryPrice.toFixed(2)}
                          <div className="text-[10px] text-neutral-400 font-normal">
                            SL: ${pt.entryTrade.slPrice.toFixed(2)} | TP: ${pt.entryTrade.tpPrice.toFixed(2)}
                          </div>
                        </div>
                      )}
                      {pt.exitTrade && (
                        <div className="mt-1 pt-1 border-t border-neutral-800 text-[11px]">
                          <span className={pt.exitTrade.netPnlUsdt >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            🏁 SALIDA ({pt.exitTrade.exitReason}) PnL: ${pt.exitTrade.netPnlUsdt.toFixed(2)} ({pt.exitTrade.roePct.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="close"
              name="Precio"
              stroke="#fbbf24"
              strokeWidth={2}
              dot={false}
            />

            {/* Fast EMA */}
            {showEmas && (
              <Line
                type="monotone"
                dataKey="emaFast"
                name="EMA Rápida"
                stroke="#22d3ee"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Slow EMA */}
            {showEmas && (
              <Line
                type="monotone"
                dataKey="emaSlow"
                name="EMA Lenta"
                stroke="#c084fc"
                strokeWidth={1.5}
                dot={false}
              />
            )}

            {/* Upper ATR Band */}
            {showAtrBands && (
              <Line
                type="monotone"
                dataKey="upperAtrBand"
                name="Banda ATR Sup"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}

            {/* Lower ATR Band */}
            {showAtrBands && (
              <Line
                type="monotone"
                dataKey="lowerAtrBand"
                name="Banda ATR Inf"
                stroke="#f59e0b"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
