import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  Minimize2,
  LineChart,
  Compass,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  Sliders,
  Target,
  Shield,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { TickerData } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TradingViewWidget } from './TradingViewWidget';
import { StrategyChartRenderer } from './StrategyChartRenderer';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { useTheme } from '../context/ThemeContext';

interface TimeframeOption {
  label: string;
  value: string;
  isDefault?: boolean;
}

const TIMEFRAMES: TimeframeOption[] = [
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H (Default)', value: '240', isDefault: true },
  { label: '1D', value: 'D' },
  { label: '1W', value: 'W' },
];

export const ChartSection: React.FC = () => {
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [activeStrategy, setActiveStrategy] = useState(
    strategyService.getActiveStrategy()
  );
  const [allStrategies, setAllStrategies] = useState(
    strategyService.getStrategies()
  );
  const [timeframe, setTimeframe] = useState('240');
  const [isExpanded, setIsExpanded] = useState(false);
  const [chartEngine, setChartEngine] = useState<'strategy_levels' | 'tradingview'>('strategy_levels');
  const { theme } = useTheme();

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setActiveStrategy(strategyService.getActiveStrategy());
      setAllStrategies(strategyService.getStrategies());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  const currentSymbol = activeStrategy?.par || ticker.symbol || 'ZECUSDT';
  const isPositive = (ticker.change24hPercent ?? 0) >= 0;

  const handleSelectStrategy = (strat: GoogleSheetStrategyRow) => {
    strategyService.setActiveStrategyById(strat.noEstrategia);
  };

  const parsedLevels = activeStrategy ? parsePricesFromStrategy(activeStrategy) : null;

  return (
    <div className={`flex flex-col h-full ${isExpanded ? 'fixed inset-0 z-50 bg-neutral-950' : ''}`}>
      {/* ========== HEADER DEL GRÁ¡FICO ========== */}
      <div className="flex flex-col gap-3 p-3 border-b border-neutral-800 bg-neutral-900/60">
        {/* Fila 1: Sí­mbolo + Precio + TF */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-mono tracking-tight">
              {currentSymbol}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-bold text-neutral-400 border border-neutral-700">
              PERPETUAL
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-[10px] font-bold text-amber-300 border border-amber-500/30">
              {timeframe === '240' ? '4H Estrategia' : `${timeframe} TF`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-base font-bold font-mono text-white">
                ${ticker.lastPrice > 0
                  ? ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                  : '---'}
              </div>
              <div className={`text-xs font-bold flex items-center justify-end gap-1 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {isPositive ? '+' : ''}{ticker.change24hPercent ? ticker.change24hPercent.toFixed(2) : '0.00'}%
              </div>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              title={isExpanded ? 'Reducir grá¡¡fico' : 'Pantalla completa'}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          </div>
        </div>

        {/* Fila 2: Alto, Bajo, Volumen 24h */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">24h Alto</span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              ${ticker.high24h ? ticker.high24h.toLocaleString() : '---'}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">24h Bajo</span>
            <span className="text-xs font-mono font-bold text-rose-400">
              ${ticker.low24h ? ticker.low24h.toLocaleString() : '---'}
            </span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded bg-neutral-900 border border-neutral-800">
            <span className="text-[10px] font-bold text-neutral-500 uppercase">Volumen 24h</span>
            <span className="text-xs font-mono font-bold text-neutral-300">
              {ticker.volume24h ? ticker.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}
            </span>
          </div>
        </div>
      </div>

      {/* ========== TOOLBAR: MODO DE GRÁ¡FICO + TIMEFRAMES ========== */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/40">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setChartEngine('strategy_levels')}
            className={`px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-bold ${
              chartEngine === 'strategy_levels'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Dibuja en el grá¡¡fico las Entradas (E1, E2), Stop Loss (SL) y Take Profits (TP1, TP2, TP3)"
          >
            <Target size={14} />
            Niveles E1/SL/TP
          </button>
          <button
            onClick={() => setChartEngine('tradingview')}
            className={`px-2.5 py-1.5 rounded transition-all flex items-center gap-1.5 text-xs font-bold ${
              chartEngine === 'tradingview'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
            title="Abrir vista de TradingView clá¡¡sico con herramientas de dibujo libre"
          >
            <LineChart size={14} />
            TradingView
          </button>
        </div>

        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => {
            const isActive = timeframe === tf.value;
            return (
              <button
                key={tf.value}
                onClick={() => setTimeframe(tf.value)}
                className={`px-2.5 py-1.5 rounded transition-all whitespace-nowrap text-xs font-bold ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
                title={tf.isDefault ? 'Temporalidad por defecto (4H)' : `Cambiar a ${tf.label}`}
              >
                {tf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== BARRA DE ESTRATEGIA ACTIVA + CHIPS DE PARES ========== */}
      <div className="flex flex-col gap-2 px-3 py-2 border-b border-neutral-800 bg-neutral-900/30">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-neutral-500 uppercase">Estrategia en Grá¡¡fico:</span>
          {activeStrategy ? (
            <div className="flex items-center gap-2 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/30">
              <span className="text-[11px] font-bold text-amber-300 font-mono">
                {activeStrategy.noEstrategia}
              </span>
              <span className="text-[11px] font-medium text-amber-200">
                {activeStrategy.nombreEstrategia}
              </span>
              <span className="text-[10px] font-mono text-amber-400/80">
                {activeStrategy.temporalidad || '4H'}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-neutral-400">Seleccione una estrategia para sincronizar grá¡¡fico</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-neutral-500 uppercase">Pares:</span>
          {allStrategies.map(strat => {
            const isCurrent = strat.noEstrategia === activeStrategy?.noEstrategia;
            const parBadge = strat.par.replace('USDT', '');
            return (
              <button
                key={strat.noEstrategia}
                onClick={() => handleSelectStrategy(strat)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-all flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-700/60'
                }`}
                title={`Revisar ${strat.noEstrategia}: ${strat.nombreEstrategia}`}
              >
                {isCurrent && <CheckCircle2 size={10} className="text-amber-400" />}
                {parBadge}
              </button>
            );
          })}
        </div>
      </div>

      {/* ========== CONTENEDOR PRINCIPAL DEL GRÁ¡FICO ========== */}
      <div className="flex-1 relative overflow-hidden">
        {chartEngine === 'strategy_levels' ? (
          <StrategyChartRenderer
            symbol={currentSymbol}
            timeframe={timeframe}
            parsedLevels={parsedLevels}
          />
        ) : (
          <TradingViewWidget
            symbol={currentSymbol}
            timeframe={timeframe}
          />
        )}
      </div>

      {/* ========== FOOTER STATUS BAR ========== */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-amber-500" />
          <span className="text-[11px] font-bold text-neutral-400">
            {chartEngine === 'strategy_levels'
              ? 'Lí¡¡neas Táá¡¡cticas Activas: E1, E2, SL, TP1, TP2, TP Final'
              : 'TradingView Advanced Real-Time Chart'}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono text-neutral-500">
          <span>Sí¡¡mbolo: BINANCE:{currentSymbol}</span>
          <span>Temporalidad: {timeframe === '240' ? '4 Horas (4H)' : timeframe}</span>
          <span>Margen ISOLATED 1x-5x</span>
        </div>
      </div>
    </div>
  );
};
