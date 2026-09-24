import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart,
} from 'recharts';
import { EquityPoint } from '../types/backtesting';
import { TrendingUp, ShieldAlert, LineChart as ChartIcon } from 'lucide-react';

interface BacktestEquityChartProps {
  equityCurve: EquityPoint[];
  initialCapital: number;
}

export const BacktestEquityChart: React.FC<BacktestEquityChartProps> = ({
  equityCurve,
  initialCapital,
}) => {
  if (!equityCurve || equityCurve.length === 0) {
    return (
      <div className="p-8 text-center text-neutral-500 font-mono text-xs">
        No hay datos de curva de capital disponibles. Ejecuta una simulación.
      </div>
    );
  }

  // Downsample if more than 300 points for smooth performance
  const data = React.useMemo(() => {
    if (equityCurve.length <= 250) return equityCurve;
    const step = Math.ceil(equityCurve.length / 250);
    return equityCurve.filter((_, idx) => idx % step === 0 || idx === equityCurve.length - 1);
  }, [equityCurve]);

  const minEquity = Math.min(...data.map((d) => Math.min(d.equity, d.benchmarkEquity)));
  const maxEquity = Math.max(...data.map((d) => Math.max(d.equity, d.benchmarkEquity)));
  const yDomainMin = Math.floor(Math.max(0, minEquity * 0.95));
  const yDomainMax = Math.ceil(maxEquity * 1.05);

  const finalEquity = equityCurve[equityCurve.length - 1]?.equity || initialCapital;
  const netReturn = ((finalEquity - initialCapital) / initialCapital) * 100;
  const isProfit = netReturn >= 0;

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ChartIcon className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white flex items-center gap-2 m-0">
              <span>Curva de Capital & Crecimiento del Portfolio</span>
              <span
                className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                  isProfit
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {isProfit ? '+' : ''}
                {netReturn.toFixed(2)}%
              </span>
            </h5>
            <span className="text-[11px] text-neutral-400">
              Evolución acumulada frente a Buy & Hold (Benchmark) con registro de Drawdown
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-emerald-400 rounded-full inline-block"></span>
            <span className="text-neutral-300">Estrategia: ${finalEquity.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-neutral-500 rounded-full inline-block"></span>
            <span className="text-neutral-400">Capital Inicial: ${initialCapital.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Recharts Composed Area & Line Chart */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />

            <XAxis
              dataKey="timestampStr"
              stroke="#737373"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
              interval="preserveStartEnd"
              minTickGap={40}
            />

            <YAxis
              yAxisId="equity"
              domain={[yDomainMin, yDomainMax]}
              stroke="#a3a3a3"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#404040' }}
              tickFormatter={(v) => `$${v.toLocaleString()}`}
            />

            <YAxis
              yAxisId="drawdown"
              orientation="right"
              domain={[0, 40]}
              reversed={true}
              hide={true}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const pt = payload[0].payload as EquityPoint;
                  return (
                    <div className="bg-neutral-950/95 border border-neutral-800 rounded-lg p-2.5 shadow-2xl font-mono text-xs space-y-1">
                      <div className="text-neutral-400 text-[10px] border-b border-neutral-800 pb-1 font-sans">
                        {pt.timestampStr}
                      </div>
                      <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                        <span>Capital:</span>
                        <span>${pt.equity.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-neutral-400 text-[11px]">
                        <span>Benchmark B&H:</span>
                        <span>${pt.benchmarkEquity.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-rose-400 text-[11px]">
                        <span>Drawdown:</span>
                        <span>-{pt.drawdownPct.toFixed(2)}%</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-neutral-400 text-[11px]">
                        <span>Precio Activo:</span>
                        <span>${pt.price.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              yAxisId="equity"
              type="monotone"
              dataKey="equity"
              name="Capital Estrategia"
              stroke="#10b981"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#equityGradient)"
            />

            <Line
              yAxisId="equity"
              type="monotone"
              dataKey="benchmarkEquity"
              name="Benchmark (Buy & Hold)"
              stroke="#737373"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
