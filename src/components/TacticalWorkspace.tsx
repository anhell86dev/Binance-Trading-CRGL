import React, { useState, useEffect, Suspense } from 'react';
import {
  Activity,
  BarChart2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock,
  Eye,
  Layers,
  Maximize2,
  Minimize2,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { HeaderTicker } from './HeaderTicker';
import { PositionsAndOrders } from './PositionsAndOrders';
import { TradingViewWidget } from './TradingViewWidget';
import { StrategyChartRenderer } from './StrategyChartRenderer';
import { StrategyDetailModal } from './StrategyDetailModal';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { normalizeBinanceSymbol } from '../data/binancePairs';

// Chart Skeleton Loader for Suspense
const ChartSkeletonLoader: React.FC = () => {
  return (
    <div className="w-full h-full min-h-[360px] bg-neutral-950 flex flex-col justify-between p-4 relative overflow-hidden animate-pulse border border-neutral-800/80 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-20 h-5 bg-neutral-800 rounded" />
          <div className="w-12 h-5 bg-neutral-850 rounded" />
          <div className="w-16 h-5 bg-neutral-850 rounded" />
        </div>
        <div className="w-28 h-5 bg-neutral-800 rounded" />
      </div>

      <div className="flex items-end justify-around h-48 w-full px-4 gap-2 opacity-30">
        {[40, 65, 30, 85, 45, 90, 60, 75, 50, 95, 70, 80, 55, 60].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-1 w-full max-w-[14px]">
            <div className="w-[1px] bg-neutral-700 h-6" />
            <div
              className={`w-full rounded-xs ${i % 2 === 0 ? 'bg-emerald-500/60' : 'bg-rose-500/60'}`}
              style={{ height: `${h}px` }}
            />
            <div className="w-[1px] bg-neutral-700 h-6" />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-900 pt-2 text-[10px] text-neutral-600 font-mono">
        <span>00:00</span>
        <span>04:00</span>
        <span>08:00</span>
        <span>12:00</span>
        <span>16:00</span>
        <span>20:00</span>
        <span className="flex items-center gap-1 text-amber-400/80">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          Cargando Gráfico Táctico Binance...
        </span>
      </div>
    </div>
  );
};

export const TacticalWorkspace: React.FC = () => {
  const [symbol, setSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [timeframe, setTimeframe] = useState<string>('240'); // 4H default
  const [isPositionsCollapsed, setIsPositionsCollapsed] = useState<boolean>(false);
  const [chartMode, setChartMode] = useState<'TACTICAL_STRATEGY' | 'TRADINGVIEW'>('TACTICAL_STRATEGY');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [activeStrategy, setActiveStrategy] = useState<GoogleSheetStrategyRow | undefined>(() =>
    strategyService.getActiveStrategy()
  );

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setActiveStrategy(strategyService.getActiveStrategy());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  // Ensure active strategy matches current symbol if available
  const currentPairStrategy = activeStrategy && normalizeBinanceSymbol(activeStrategy.par) === normalizeBinanceSymbol(symbol)
    ? activeStrategy
    : strategyService.getStrategies().find(
        (s) => normalizeBinanceSymbol(s.par) === normalizeBinanceSymbol(symbol)
      );

  return (
    <div id="tactical_workspace_container" className="flex flex-col h-full overflow-hidden bg-neutral-900 rounded-xl border border-neutral-800">
      {/* 1. Header Ticker (Live Price, Mark, 24h High/Low, 24h Change, Range & Derivatives) */}
      <HeaderTicker symbol={symbol} price={ticker.lastPrice} />

      {/* 2. Chart Controls Toolbar */}
      <div className="px-3 py-1.5 bg-neutral-950/90 border-b border-neutral-800/80 flex items-center justify-between text-xs font-mono flex-wrap gap-2">
        {/* Left: Timeframe pills */}
        <div className="flex items-center gap-1">
          <span className="text-neutral-400 text-[10px] font-sans mr-1">Temporalidad:</span>
          {[
            { label: '15m', val: '15' },
            { label: '1h', val: '60' },
            { label: '4h', val: '240' },
            { label: '1D', val: 'D' },
          ].map((tf) => (
            <button
              key={tf.val}
              onClick={() => setTimeframe(tf.val)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                timeframe === tf.val
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Center: Active Strategy Indicator & "Mostrar Estrategia" Action */}
        <div className="flex items-center gap-1.5">
          {currentPairStrategy ? (
            <button
              id="show-strategy-modal-top-btn"
              onClick={() => setIsDetailModalOpen(true)}
              className="px-2.5 py-0.5 rounded text-[11px] font-bold text-amber-300 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-xs"
              title="Ver detalle completo de Entradas, SL, TP, Reglas de Ejecución y Disciplina"
            >
              <BookOpen className="w-3 h-3 text-amber-400" />
              <span className="truncate max-w-[130px] sm:max-w-[180px]">
                {currentPairStrategy.noEstrategia}: {currentPairStrategy.nombreEstrategia.slice(0, 16)}...
              </span>
              <span className="text-[10px] bg-amber-400 text-black px-1 rounded font-mono font-bold">
                Ver
              </span>
            </button>
          ) : (
            <span className="text-[10px] text-neutral-500 font-sans">
              Sin estrategia activa para {symbol}
            </span>
          )}
        </div>

        {/* Right: Chart Engine Switcher & Positions Collapse */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-900 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => setChartMode('TACTICAL_STRATEGY')}
              className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                chartMode === 'TACTICAL_STRATEGY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="Gráfico con líneas de Entrada 1, Entrada 2, Stop Loss y Take Profits en tiempo real"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Gráfico Táctico</span>
            </button>

            <button
              onClick={() => setChartMode('TRADINGVIEW')}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                chartMode === 'TRADINGVIEW'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
              title="TradingView Widget estándar"
            >
              TradingView
            </button>
          </div>

          <button
            onClick={() => setIsPositionsCollapsed(!isPositionsCollapsed)}
            className="text-[11px] text-neutral-400 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition-colors"
            title={isPositionsCollapsed ? 'Expandir panel de posiciones' : 'Colapsar panel de posiciones'}
          >
            <span>Posiciones</span>
            {isPositionsCollapsed ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 3. Main Chart Canvas with Strategy Price Lines & Binance WebSocket */}
      <div className="flex-1 min-h-[300px] bg-neutral-950 relative overflow-hidden flex flex-col">
        <Suspense fallback={<ChartSkeletonLoader />}>
          <div className="w-full h-full flex-1">
            {chartMode === 'TACTICAL_STRATEGY' ? (
              <StrategyChartRenderer
                symbol={symbol}
                interval={timeframe}
                height="100%"
                strategy={currentPairStrategy}
              />
            ) : (
              <TradingViewWidget
                symbol={symbol}
                interval={timeframe}
                height="100%"
              />
            )}
          </div>
        </Suspense>
      </div>

      {/* 4. Collapsible Bottom Panel for Active Positions, Orders, Trade History & Journal */}
      <div
        id="collapsible_active_positions_section"
        className={`border-t border-neutral-800 bg-neutral-900 transition-all duration-300 flex flex-col ${
          isPositionsCollapsed ? 'h-9' : 'h-[36%] min-h-[220px] max-h-[400px]'
        }`}
      >
        {/* Header Toggle Strip */}
        <div
          onClick={() => setIsPositionsCollapsed(!isPositionsCollapsed)}
          className="h-9 px-3 bg-neutral-950 border-b border-neutral-800/80 flex items-center justify-between cursor-pointer select-none hover:bg-neutral-900 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Posiciones Activas, Órdenes & Diario de Estrategias
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-900 text-neutral-400 border border-neutral-800">
              USDⓈ-M
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400">
            <span className="text-[10px] font-mono hidden sm:inline">
              {isPositionsCollapsed ? 'Clic para expandir' : 'Clic para colapsar'}
            </span>
            {isPositionsCollapsed ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-300" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-300" />
            )}
          </div>
        </div>

        {/* Expanded Content with full PositionsAndOrders tabs */}
        {!isPositionsCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 custom-scrollbar">
            <PositionsAndOrders />
          </div>
        )}
      </div>

      {/* Strategy Details Modal */}
      {isDetailModalOpen && currentPairStrategy && (
        <StrategyDetailModal
          strategy={currentPairStrategy}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          onPlotOnChart={() => {
            setChartMode('TACTICAL_STRATEGY');
          }}
        />
      )}
    </div>
  );
};

