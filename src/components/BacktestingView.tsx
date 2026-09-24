import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  Download,
  Sliders,
  TrendingUp,
  Activity,
  Layers,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
  Clock,
  Shield,
  Zap,
  BarChart3,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import {
  BacktestCandle,
  BacktestParams,
  BacktestResult,
  KlineInterval,
  StrategyBacktestType,
} from '../types/backtesting';
import {
  backtestingService,
  BACKTEST_PRESETS,
  DEFAULT_BACKTEST_PARAMS,
  StrategyPreset,
} from '../services/backtestingService';
import { BacktestMetricsCards } from './BacktestMetricsCards';
import { BacktestEquityChart } from './BacktestEquityChart';
import { BacktestCandleChart } from './BacktestCandleChart';
import { BacktestTradeLogTable } from './BacktestTradeLogTable';
import { BacktestOptimizerModal } from './BacktestOptimizerModal';
import { BINANCE_POPULAR_PAIRS } from '../data/binancePairs';

interface BacktestingViewProps {
  initialSymbol?: string;
}

export const BacktestingView: React.FC<BacktestingViewProps> = ({
  initialSymbol = 'BTCUSDT',
}) => {
  const [params, setParams] = useState<BacktestParams>(() => ({
    ...DEFAULT_BACKTEST_PARAMS,
    symbol: initialSymbol,
  }));

  const [isLoadingKlines, setIsLoadingKlines] = useState(false);
  const [rawCandles, setRawCandles] = useState<BacktestCandle[]>([]);
  const [simulationResult, setSimulationResult] = useState<BacktestResult | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>('scalping_5m');
  const [isOptimizerOpen, setIsOptimizerOpen] = useState(false);
  const [showAdvancedParams, setShowAdvancedParams] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);
  const [dataSourceNotice, setDataSourceNotice] = useState<string | null>(null);

  // Load Klines and Run Simulation
  const executeSimulation = useCallback(
    async (currentParams: BacktestParams) => {
      setIsLoadingKlines(true);
      setDataSourceNotice(null);

      try {
        const fetchedCandles = await backtestingService.fetchBinanceKlines(
          currentParams.symbol,
          currentParams.interval,
          currentParams.candleLimit
        );

        setRawCandles(fetchedCandles);

        // Compute indicators
        const candlesWithInd = backtestingService.computeIndicators(fetchedCandles, {
          emaFastPeriod: currentParams.emaFastPeriod,
          emaSlowPeriod: currentParams.emaSlowPeriod,
          emaTrendPeriod: currentParams.emaTrendPeriod,
          atrPeriod: currentParams.atrPeriod,
          atrMultiplierSl: currentParams.atrMultiplierSl,
        });

        // Run simulation
        const result = backtestingService.runSimulation(candlesWithInd, currentParams);
        setSimulationResult(result);
        setDataSourceNotice(
          `Datos cargados: ${fetchedCandles.length} velas históricas de Binance Futures (${currentParams.symbol} ${currentParams.interval})`
        );
      } catch (err: any) {
        console.error('Error in simulation:', err);
      } finally {
        setIsLoadingKlines(false);
      }
    },
    []
  );

  // Auto-run on initial mount
  useEffect(() => {
    executeSimulation(params);
  }, []);

  // Handle Preset Selection
  const handleSelectPreset = (preset: StrategyPreset) => {
    setActivePresetId(preset.id);
    const updatedParams: BacktestParams = {
      ...params,
      interval: preset.interval,
      strategyType: preset.strategyType,
      emaFastPeriod: preset.emaFastPeriod,
      emaSlowPeriod: preset.emaSlowPeriod,
      emaTrendPeriod: preset.emaTrendPeriod,
      atrPeriod: preset.atrPeriod,
      atrMultiplierSl: preset.atrMultiplierSl,
      atrMultiplierTp: preset.atrMultiplierTp,
      useTrailingStop: preset.useTrailingStop,
      trailingStopAtrMultiplier: preset.trailingStopAtrMultiplier,
      leverage: preset.leverage,
    };
    setParams(updatedParams);
    executeSimulation(updatedParams);
  };

  // Handle Optimizer apply
  const handleApplyOptimizerParams = (optParams: Partial<BacktestParams>) => {
    const updated = { ...params, ...optParams };
    setParams(updated);
    setActivePresetId('custom');
    executeSimulation(updated);
  };

  // Copy Markdown Summary Report
  const handleCopyReport = () => {
    if (!simulationResult) return;
    const m = simulationResult.metrics;
    const text = [
      `# 📊 Reporte de Backtesting - Binance Futures Terminal`,
      `**Símbolo**: ${params.symbol} | **Temporalidad**: ${params.interval} | **Velas**: ${rawCandles.length}`,
      `**Estrategia**: ${params.strategyType} (EMA ${params.emaFastPeriod}/${params.emaSlowPeriod} + ATR ${params.atrPeriod})`,
      `**Gestión de Riesgo**: SL ${params.atrMultiplierSl}x ATR | TP ${params.atrMultiplierTp}x ATR | Apalancamiento ${params.leverage}x`,
      ``,
      `### 📈 Resultados de Rendimiento:`,
      `- **Retorno Neto**: ${m.netProfitUsdt >= 0 ? '+' : ''}$${m.netProfitUsdt.toFixed(2)} (${m.netProfitPct.toFixed(2)}%)`,
      `- **Win Rate**: ${m.winRatePct.toFixed(1)}% (${m.winningTrades}W / ${m.losingTrades}L de ${m.totalTrades} trades)`,
      `- **Profit Factor**: ${m.profitFactor.toFixed(2)}`,
      `- **Max Drawdown**: -${m.maxDrawdownPct.toFixed(2)}% (-$${m.maxDrawdownUsdt.toFixed(2)})`,
      `- **Sharpe Ratio**: ${m.sharpeRatio.toFixed(2)} | **Sortino**: ${m.sortinoRatio.toFixed(2)}`,
      `- **Payoff Ratio**: 1:${m.payoffRatio.toFixed(2)} (Avg Win: $${m.avgWinUsdt.toFixed(2)} / Avg Loss: $${m.avgLossUsdt.toFixed(2)})`,
      `- **Comisiones Pagadas**: $${m.totalFeesPaidUsdt.toFixed(2)}`,
      `- **Benchmark Buy & Hold**: ${m.benchmarkReturnPct.toFixed(2)}%`,
    ].join('\n');

    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  const popularSymbols = useMemo(() => {
    return BINANCE_POPULAR_PAIRS.slice(0, 10).map((p) => p.symbol);
  }, []);

  return (
    <div id="backtesting-module-root" className="space-y-4 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-800 rounded-2xl p-4 sm:p-5 shadow-2xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge bg-amber-500/20 text-amber-400 border border-amber-500/30 font-mono text-[11px] px-2 py-0.5 rounded-md font-bold flex items-center gap-1">
                <BarChart3 className="w-3.5 h-3.5" /> MOTOR DE BACKTESTING LOCAL
              </span>
              <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono text-[11px] px-2 py-0.5 rounded-md font-bold">
                BINANCE KLINES HISTÓRICOS
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 m-0">
              <span>Simulación Cuantitativa & Calibración de ATR y EMAs</span>
            </h2>
            <p className="text-xs text-neutral-400 max-w-3xl mt-1 mb-0 leading-relaxed">
              Descarga series históricas de velas directamente desde los servidores de Binance Futures y simula la estrategia bar-by-bar con ejecución sin sesgo de anticipación, apalancamiento seguro 1-5x Isolated, comisiones y slippage.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={() => setIsOptimizerOpen(true)}
              disabled={isLoadingKlines || rawCandles.length === 0}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs font-mono flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/25 transition-all cursor-pointer disabled:opacity-50"
              title="Ejecutar Grid Search para encontrar los mejores parámetros de ATR y EMAs"
            >
              <Sparkles className="w-4 h-4" />
              <span>Optimizar Parámetros</span>
            </button>

            <button
              onClick={() => executeSimulation(params)}
              disabled={isLoadingKlines}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-extrabold text-xs font-mono flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingKlines ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-neutral-950" />
                  <span>Simulando...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Ejecutar Simulación</span>
                </>
              )}
            </button>

            {simulationResult && (
              <button
                onClick={handleCopyReport}
                className="px-3 py-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-700 text-xs font-mono flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Copiar reporte completo en Markdown"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-400" />
                    <span className="hidden sm:inline">Copiar Informe</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Presets Bar */}
        <div className="mt-4 pt-3 border-t border-neutral-800/80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1 me-1">
              <Zap className="w-3.5 h-3.5 text-amber-400" /> Perfiles Rápidos:
            </span>
            {BACKTEST_PRESETS.map((preset) => {
              const isSelected = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-neutral-950 font-extrabold shadow-md shadow-amber-400/20'
                      : 'bg-neutral-950/80 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
                  }`}
                  title={preset.description}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Configuration Bar / Parameter Sliders */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-300 font-bold m-0">
              Parámetros de Simulación & Gestión de Riesgo
            </h4>
          </div>

          <button
            onClick={() => setShowAdvancedParams(!showAdvancedParams)}
            className="text-[11px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
          >
            <span>{showAdvancedParams ? 'Ocultar Avanzados' : 'Configuración Avanzada'}</span>
            {showAdvancedParams ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Primary Controls Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Symbol */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-neutral-400">Símbolo Binance</label>
            <select
              value={params.symbol}
              onChange={(e) => {
                const next = { ...params, symbol: e.target.value };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-hidden"
            >
              {popularSymbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          {/* Timeframe */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-neutral-400">Temporalidad</label>
            <select
              value={params.interval}
              onChange={(e) => {
                const next = { ...params, interval: e.target.value as KlineInterval };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-hidden"
            >
              <option value="1m">1m (Intradía Alta Frecuencia)</option>
              <option value="3m">3m (Scalping)</option>
              <option value="5m">5m (Scalping Dinámico)</option>
              <option value="15m">15m (Momentum)</option>
              <option value="30m">30m (Swing Corto)</option>
              <option value="1h">1h (Estrategia Principal)</option>
              <option value="2h">2h (Tendencial)</option>
              <option value="4h">4h (Estructural)</option>
              <option value="1d">1d (Macro)</option>
            </select>
          </div>

          {/* Candle Limit */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-neutral-400">Historial de Velas</label>
            <select
              value={params.candleLimit}
              onChange={(e) => {
                const next = { ...params, candleLimit: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-hidden"
            >
              <option value="300">300 velas recientes</option>
              <option value="500">500 velas (~5-7 días)</option>
              <option value="1000">1,000 velas (~10-14 días)</option>
              <option value="1500">1,500 velas (Extendido)</option>
            </select>
          </div>

          {/* Strategy Mode */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-neutral-400">Modo de Estrategia</label>
            <select
              value={params.strategyType}
              onChange={(e) => {
                const next = { ...params, strategyType: e.target.value as StrategyBacktestType };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:border-amber-500 focus:outline-hidden"
            >
              <option value="EMA_CROSS_ATR">Cruce de EMAs + ATR</option>
              <option value="EMA_PULLBACK_ATR">Pullback a la EMA + ATR</option>
              <option value="TACTICAL_E1_E2">Plan Táctico E1/E2 Sheets</option>
              <option value="VOLATILITY_BREAKOUT">Ruptura de Volatilidad</option>
            </select>
          </div>

          {/* Fast EMA Period */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>EMA RÁPIDA</span>
              <span className="text-cyan-400 font-bold">{params.emaFastPeriod}</span>
            </div>
            <input
              type="range"
              min={3}
              max={50}
              value={params.emaFastPeriod}
              onChange={(e) => {
                const next = { ...params, emaFastPeriod: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full accent-cyan-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Slow EMA Period */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>EMA LENTA</span>
              <span className="text-purple-400 font-bold">{params.emaSlowPeriod}</span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              value={params.emaSlowPeriod}
              onChange={(e) => {
                const next = { ...params, emaSlowPeriod: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full accent-purple-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>
        </div>

        {/* ATR Tuning Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-neutral-800/60">
          {/* ATR Period */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>PERIODO ATR</span>
              <span className="text-amber-400 font-bold">{params.atrPeriod} velas</span>
            </div>
            <input
              type="range"
              min={5}
              max={30}
              value={params.atrPeriod}
              onChange={(e) => {
                const next = { ...params, atrPeriod: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full accent-amber-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* ATR Multiplier SL */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>MULTIPLICADOR SL</span>
              <span className="text-rose-400 font-bold">{params.atrMultiplierSl}x ATR</span>
            </div>
            <input
              type="range"
              min={0.8}
              max={4.0}
              step={0.1}
              value={params.atrMultiplierSl}
              onChange={(e) => {
                const next = { ...params, atrMultiplierSl: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full accent-rose-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* ATR Multiplier TP */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-neutral-400">
              <span>MULTIPLICADOR TP</span>
              <span className="text-emerald-400 font-bold">{params.atrMultiplierTp}x ATR</span>
            </div>
            <input
              type="range"
              min={1.5}
              max={8.0}
              step={0.1}
              value={params.atrMultiplierTp}
              onChange={(e) => {
                const next = { ...params, atrMultiplierTp: Number(e.target.value) };
                setParams(next);
                executeSimulation(next);
              }}
              className="w-full accent-emerald-400 h-1.5 bg-neutral-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Trailing Stop */}
          <div className="space-y-1 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono text-neutral-200">
              <input
                type="checkbox"
                checked={params.useTrailingStop}
                onChange={(e) => {
                  const next = { ...params, useTrailingStop: e.target.checked };
                  setParams(next);
                  executeSimulation(next);
                }}
                className="w-4 h-4 rounded-sm bg-neutral-950 border-neutral-700 text-amber-500 focus:ring-0"
              />
              <span>Trailing Stop Activo ({params.trailingStopAtrMultiplier}x ATR)</span>
            </label>
          </div>
        </div>

        {/* Advanced Panel (Collapsible) */}
        {showAdvancedParams && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-neutral-800/80 bg-neutral-950/60 p-3 rounded-xl">
            {/* Capital Inicial */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-neutral-400">Capital Inicial (USDT)</label>
              <input
                type="number"
                value={params.initialCapital}
                onChange={(e) => {
                  const next = { ...params, initialCapital: Math.max(100, Number(e.target.value)) };
                  setParams(next);
                  executeSimulation(next);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>

            {/* Riesgo por Trade % */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-neutral-400">Riesgo por Trade (%)</label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="10"
                value={params.riskPerTradePct}
                onChange={(e) => {
                  const next = { ...params, riskPerTradePct: Math.min(10, Math.max(0.1, Number(e.target.value))) };
                  setParams(next);
                  executeSimulation(next);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              />
            </div>

            {/* Apalancamiento (1-5x) */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-neutral-400">
                Apalancamiento Seguro (Max 5x)
              </label>
              <select
                value={params.leverage}
                onChange={(e) => {
                  const next = { ...params, leverage: Number(e.target.value) };
                  setParams(next);
                  executeSimulation(next);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value="1">1x (Sin apalancamiento)</option>
                <option value="2">2x (Conservador)</option>
                <option value="3">3x (Estándar)</option>
                <option value="4">4x (Moderado)</option>
                <option value="5">5x (Límite Máximo Seguro)</option>
              </select>
            </div>

            {/* Filtro EMA 200 */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-neutral-400">Filtro Tendencial EMA</label>
              <select
                value={params.emaTrendPeriod}
                onChange={(e) => {
                  const next = { ...params, emaTrendPeriod: Number(e.target.value) };
                  setParams(next);
                  executeSimulation(next);
                }}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white"
              >
                <option value="0">Desactivado (Longs & Shorts)</option>
                <option value="100">EMA 100 Filtro</option>
                <option value="200">EMA 200 Filtro Institucional</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Status Notice */}
      {dataSourceNotice && (
        <div className="text-[11px] font-mono text-neutral-400 bg-neutral-950/80 px-3 py-1.5 rounded-lg border border-neutral-800/80 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            {dataSourceNotice}
          </span>
          <span className="text-neutral-500">
            {simulationResult?.metrics.totalTrades || 0} operaciones generadas
          </span>
        </div>
      )}

      {/* 1. Performance Metrics Cards */}
      {simulationResult && (
        <BacktestMetricsCards
          metrics={simulationResult.metrics}
          initialCapital={params.initialCapital}
        />
      )}

      {/* 2. Charts Section (Curva de Capital & Candlestick Indicators) */}
      {simulationResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <BacktestEquityChart
            equityCurve={simulationResult.equityCurve}
            initialCapital={params.initialCapital}
          />
          <BacktestCandleChart
            candles={simulationResult.candles}
            trades={simulationResult.trades}
            symbol={params.symbol}
            interval={params.interval}
          />
        </div>
      )}

      {/* 3. Detailed Trade Log Journal Table */}
      {simulationResult && (
        <BacktestTradeLogTable
          trades={simulationResult.trades}
          symbol={params.symbol}
        />
      )}

      {/* Grid Search Optimizer Modal */}
      <BacktestOptimizerModal
        isOpen={isOptimizerOpen}
        onClose={() => setIsOptimizerOpen(false)}
        rawCandles={rawCandles}
        baseParams={params}
        onApplyParams={handleApplyOptimizerParams}
      />
    </div>
  );
};
