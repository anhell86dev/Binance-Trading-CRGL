import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import {
  BarChart3,
  Droplets,
  Activity,
  Zap,
  Flame,
  CheckSquare,
  Square,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Info,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { MarketPair } from '../services/marketsService';

interface MarketLiquidityVolatilityChartProps {
  pairs: MarketPair[];
  onSelectPair: (symbol: string) => void;
  onOpenOrderModal: (symbol: string) => void;
}

type ChartPreset = 'top_tradeability' | 'top_liquidity' | 'top_volatility' | 'custom';

export const MarketLiquidityVolatilityChart: React.FC<MarketLiquidityVolatilityChartProps> = ({
  pairs,
  onSelectPair,
  onOpenOrderModal,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [preset, setPreset] = useState<ChartPreset>('top_tradeability');
  const [selectedSymbols, setSelectedSymbols] = useState<string[]>([
    'BTCUSDT',
    'ETHUSDT',
    'SOLUSDT',
    'DOGEUSDT',
    'XRPUSDT',
    'BNBUSDT',
    'PAXGUSDT',
    'ONDOUSDT',
  ]);
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Compute dataset based on preset
  const chartData = useMemo(() => {
    let source: MarketPair[] = [];

    if (preset === 'top_tradeability') {
      source = [...pairs].sort((a, b) => b.tradeabilityScore - a.tradeabilityScore).slice(0, 10);
    } else if (preset === 'top_liquidity') {
      source = [...pairs].sort((a, b) => b.quoteVolume24h - a.quoteVolume24h).slice(0, 10);
    } else if (preset === 'top_volatility') {
      source = [...pairs].sort((a, b) => b.volatilityPercent24h - a.volatilityPercent24h).slice(0, 10);
    } else {
      // Custom selection
      source = pairs.filter((p) => selectedSymbols.includes(p.symbol));
      if (source.length === 0) {
        source = [...pairs].sort((a, b) => b.tradeabilityScore - a.tradeabilityScore).slice(0, 8);
      }
    }

    return source.map((p) => {
      // Volume in Millions USDT for clean chart display
      const volumeM = Number((p.quoteVolume24h / 1_000_000).toFixed(1));
      const volPercent = Number(p.volatilityPercent24h.toFixed(2));
      const tradeScore = p.tradeabilityScore;

      // High Rotation Index = (Normalized Liquidity Score * 0.5) + (Normalized Volatility * 0.5)
      const rotationIndex = Math.min(
        100,
        Math.round((p.liquidityScore * 0.55) + Math.min(100, volPercent * 8) * 0.45)
      );

      return {
        symbol: p.symbol.replace('USDT', ''),
        fullSymbol: p.symbol,
        displayName: p.displayName,
        volumeM,
        volPercent,
        tradeScore,
        rotationIndex,
        liquidityTier: p.liquidityTier,
        volatilityTier: p.volatilityTier,
        slippage: p.estimatedSlippage,
        executionLabel: p.executionLabel,
        isIdeal: p.isIdealForTrading,
        lastPrice: p.lastPrice,
        change24h: p.change24hPercent,
        tradingAdvantage: p.tradingAdvantage,
      };
    });
  }, [pairs, preset, selectedSymbols]);

  const toggleSymbol = (sym: string) => {
    if (selectedSymbols.includes(sym)) {
      if (selectedSymbols.length > 2) {
        setSelectedSymbols(selectedSymbols.filter((s) => s !== sym));
      }
    } else {
      if (selectedSymbols.length < 12) {
        setSelectedSymbols([...selectedSymbols, sym]);
      }
    }
  };

  const popularSymbols = useMemo(() => {
    return [
      'BTCUSDT',
      'ETHUSDT',
      'SOLUSDT',
      'XRPUSDT',
      'DOGEUSDT',
      'BNBUSDT',
      'PAXGUSDT',
      'ONDOUSDT',
      'EURUSDT',
      'ADAUSDT',
      'AVAXUSDT',
      'LINKUSDT',
      'SUIUSDT',
      'NEARUSDT',
    ];
  }, []);

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm transition-all">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800/80 bg-linear-to-r from-neutral-900 via-neutral-900 to-neutral-950">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-linear-to-br from-cyan-500/20 to-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Comparativa de Liquidez & Volatilidad
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" />
                <span>ALTA ROTACIÓN</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Identifica al instante activos con <strong>profundidad de libro (USDT)</strong> y <strong>amplitud de movimiento 24h (%)</strong> para entrar y salir sin retrasos ni slippage.
            </p>
          </div>
        </div>

        {/* Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setPreset('top_tradeability')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                preset === 'top_tradeability'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Flame className="w-3 h-3" />
              <span>Top Oportunidades</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset('top_liquidity')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                preset === 'top_liquidity'
                  ? 'bg-cyan-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Droplets className="w-3 h-3" />
              <span>Top Liquidez</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset('top_volatility')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                preset === 'top_volatility'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Activity className="w-3 h-3" />
              <span>Top Volatilidad</span>
            </button>
            <button
              type="button"
              onClick={() => setPreset('custom')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 ${
                preset === 'custom'
                  ? 'bg-neutral-800 text-white font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Personalizado ({selectedSymbols.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title={isExpanded ? 'Ocultar Gráfico' : 'Mostrar Gráfico'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Custom Selector Bar if 'custom' is active */}
          {preset === 'custom' && (
            <div className="p-3 bg-neutral-950/70 border border-neutral-800 rounded-lg flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Selecciona los pares a comparar (máx 12):</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  {selectedSymbols.length}/12 activos
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {popularSymbols.map((sym) => {
                  const isSelected = selectedSymbols.includes(sym);
                  const p = pairs.find((item) => item.symbol === sym);
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => toggleSymbol(sym)}
                      className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all cursor-pointer flex items-center gap-1 border ${
                        isSelected
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold'
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-neutral-200'
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Square className="w-3 h-3 text-neutral-600" />
                      )}
                      <span>{sym.replace('USDT', '')}</span>
                      {p && (
                        <span className="text-[10px] text-neutral-500 font-sans">
                          ({p.volatilityPercent24h.toFixed(1)}%)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Guide legend pills */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-cyan-400 shadow-xs shadow-cyan-400/30" />
                <span className="text-neutral-300 font-medium">Volumen Liquidez 24h (Eje Izq: Millones USDT)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-amber-400 shadow-xs shadow-amber-400/30" />
                <span className="text-neutral-300 font-medium">Volatilidad 24h (Eje Der: Amplitud %)</span>
              </div>
            </div>

            <div className="text-[11px] text-neutral-400 flex items-center gap-1.5 font-sans bg-neutral-950 px-2.5 py-1 rounded border border-neutral-800/80">
              <Info className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Haz clic en cualquier barra para operar el par en Futuros</span>
            </div>
          </div>

          {/* Main Chart Area */}
          <div className="w-full h-[320px] sm:h-[350px] bg-neutral-950/60 border border-neutral-800/80 rounded-xl p-3 pt-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 10, bottom: 25 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload.length > 0) {
                    const item = e.activePayload[0].payload;
                    if (item && item.fullSymbol) {
                      onSelectPair(item.fullSymbol);
                    }
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                <XAxis
                  dataKey="symbol"
                  stroke="#737373"
                  tick={{ fill: '#d4d4d4', fontSize: 11, fontFamily: 'monospace', fontWeight: 'bold' }}
                  tickLine={false}
                  axisLine={{ stroke: '#404040' }}
                />
                {/* Left Y Axis for Liquidity Volume (Millions USDT) */}
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="#22d3ee"
                  tick={{ fill: '#22d3ee', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(1)}B` : `$${val}M`)}
                  tickLine={false}
                  axisLine={{ stroke: '#0e7490' }}
                />
                {/* Right Y Axis for Volatility % */}
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#fbbf24"
                  tick={{ fill: '#fbbf24', fontSize: 10, fontFamily: 'monospace' }}
                  tickFormatter={(val) => `${val}%`}
                  tickLine={false}
                  axisLine={{ stroke: '#b45309' }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const isGain = data.change24h >= 0;
                      return (
                        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-3.5 shadow-xl text-xs font-sans max-w-[280px]">
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-neutral-800">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-sm font-mono">{data.fullSymbol}</span>
                              {data.isIdeal && (
                                <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded text-[9px] font-bold">
                                  TOP TRADE
                                </span>
                              )}
                            </div>
                            <span
                              className={`font-mono font-bold text-xs ${
                                isGain ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isGain ? '+' : ''}{data.change24h.toFixed(2)}%
                            </span>
                          </div>

                          <div className="mt-2.5 flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-neutral-400 flex items-center gap-1">
                                <Droplets className="w-3 h-3 text-cyan-400" />
                                <span>Volumen Liquidez 24h:</span>
                              </span>
                              <span className="font-mono font-bold text-cyan-300">
                                ${data.volumeM >= 1000 ? `${(data.volumeM / 1000).toFixed(2)}B` : `${data.volumeM}M`} USDT
                              </span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-neutral-400 flex items-center gap-1">
                                <Activity className="w-3 h-3 text-amber-400" />
                                <span>Volatilidad 24h:</span>
                              </span>
                              <span className="font-mono font-bold text-amber-300">
                                {data.volPercent}% amplitud
                              </span>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                              <span className="text-neutral-400">Score de Oportunidad:</span>
                              <span className="font-mono font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.2 rounded border border-amber-800/60">
                                {data.tradeScore}/100
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-neutral-400">Slippage & Salida:</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {data.slippage} ({data.executionLabel})
                              </span>
                            </div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-neutral-800 text-[10px] text-neutral-400 leading-relaxed italic">
                            {data.tradingAdvantage}
                          </div>

                          <div className="mt-2 pt-2 border-t border-neutral-800 flex items-center justify-between">
                            <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                              <span>Clic para abrir trading</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                {/* Bar 1: Liquidity Volume */}
                <Bar
                  yAxisId="left"
                  dataKey="volumeM"
                  name="Volumen 24h (USDT M)"
                  fill="#06b6d4"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`vol-${index}`}
                      fill={
                        entry.liquidityTier === 'ultra'
                          ? '#06b6d4'
                          : entry.liquidityTier === 'high'
                          ? '#10b981'
                          : '#f59e0b'
                      }
                      opacity={hoveredBar === entry.symbol ? 1 : 0.85}
                    />
                  ))}
                </Bar>

                {/* Bar 2: Volatility % */}
                <Bar
                  yAxisId="right"
                  dataKey="volPercent"
                  name="Volatilidad 24h (%)"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  cursor="pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`volat-${index}`}
                      fill={
                        entry.volatilityTier === 'extreme'
                          ? '#f43f5e'
                          : entry.volatilityTier === 'high'
                          ? '#fbbf24'
                          : '#34d399'
                      }
                      opacity={hoveredBar === entry.symbol ? 1 : 0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* High Rotation Quick Cards below chart */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {chartData.slice(0, 4).map((item) => (
              <div
                key={item.fullSymbol}
                onClick={() => onSelectPair(item.fullSymbol)}
                className="bg-neutral-950/70 border border-neutral-800 hover:border-amber-500/50 rounded-lg p-2.5 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-bold text-white text-xs font-mono">{item.fullSymbol}</span>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/80 px-1 rounded border border-amber-800/60">
                    {item.tradeScore} pts
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-cyan-300 font-mono font-semibold">
                    ${item.volumeM >= 1000 ? `${(item.volumeM / 1000).toFixed(1)}B` : `${item.volumeM}M`}
                  </span>
                  <span className="text-amber-300 font-mono font-semibold">
                    {item.volPercent}% vol
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[9px] text-neutral-400">
                  <span>Slippage: {item.slippage}</span>
                  <span className="text-emerald-400 font-semibold">{item.executionLabel}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
