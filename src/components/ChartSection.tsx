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
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { TickerData } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TradingViewWidget } from './TradingViewWidget';

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
  const [ticker, setTicker] = useState<TickerData>(binanceWs.getTicker());
  const [activeStrategy, setActiveStrategy] = useState<GoogleSheetStrategyRow | undefined>(
    strategyService.getActiveStrategy()
  );
  const [allStrategies, setAllStrategies] = useState<GoogleSheetStrategyRow[]>(
    strategyService.getStrategies()
  );
  const [timeframe, setTimeframe] = useState<string>('240'); // 4H default as instructed
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

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

  // Symbol derived from active strategy or binanceWs current symbol
  const currentSymbol = activeStrategy?.par || ticker.symbol || 'ZECUSDT';
  const isPositive = (ticker.priceChangePercent ?? 0) >= 0;

  const handleSelectStrategy = (strat: GoogleSheetStrategyRow) => {
    strategyService.setActiveStrategyById(strat.noEstrategia);
  };

  return (
    <div
      id="tradingview_chart_section"
      className={`bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl flex flex-col transition-all duration-200 ${
        isExpanded ? 'fixed inset-3 z-50 bg-neutral-950/98 max-w-none' : ''
      }`}
    >
      {/* Chart Header Bar */}
      <div className="bg-neutral-950 px-4 py-3 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3">
        {/* Symbol & Active Strategy Info */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg font-bold font-mono tracking-tight text-neutral-100 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {currentSymbol}
            </span>
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
              PERPETUAL
            </span>
            <span className="hidden sm:inline-flex text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              TradingView 4H
            </span>
          </div>

          {/* Live Price Display */}
          <div className="flex items-baseline gap-2 border-l border-neutral-800 pl-3">
            <span
              className={`font-mono text-base sm:text-lg font-bold tracking-tight transition-colors ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${ticker.lastPrice > 0 ? ticker.lastPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : '---'}
            </span>
            <span
              className={`text-xs font-mono flex items-center gap-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? '+' : ''}
              {ticker.priceChangePercent ? ticker.priceChangePercent.toFixed(2) : '0.00'}%
            </span>
          </div>
        </div>

        {/* 24h Stats Mini Chips */}
        <div className="hidden md:flex items-center gap-4 text-xs font-mono text-neutral-400">
          <div>
            <span className="text-neutral-500 text-[10px] block">24h Alto</span>
            <span className="text-neutral-200">
              ${ticker.highPrice ? ticker.highPrice.toLocaleString() : '---'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">24h Bajo</span>
            <span className="text-neutral-200">
              ${ticker.lowPrice ? ticker.lowPrice.toLocaleString() : '---'}
            </span>
          </div>
          <div>
            <span className="text-neutral-500 text-[10px] block">Volumen 24h</span>
            <span className="text-neutral-200">
              {ticker.volume ? ticker.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }) : '---'}
            </span>
          </div>
        </div>

        {/* Controls: Timeframe selector (Default 4H) & Fullscreen Toggle */}
        <div className="flex items-center gap-2">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-xs font-mono">
            {TIMEFRAMES.map(tf => {
              const isActive = timeframe === tf.value;
              return (
                <button
                  key={tf.value}
                  id={`tf-btn-${tf.value}`}
                  onClick={() => setTimeframe(tf.value)}
                  className={`px-2.5 py-1 rounded transition-all whitespace-nowrap text-xs ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40 shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                  title={tf.isDefault ? 'Temporalidad por defecto (4H)' : `Cambiar a ${tf.label}`}
                >
                  {tf.label}
                </button>
              );
            })}
          </div>

          {/* Expand/Collapse Screen */}
          <button
            id="expand-chart-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
            title={isExpanded ? 'Reducir gráfico' : 'Pantalla completa'}
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Active Strategy Context Bar */}
      <div className="bg-neutral-950/70 px-4 py-2 border-b border-neutral-800/50 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-amber-400 font-mono font-medium">
            <Compass size={13} />
            Estrategia en Revisión:
          </span>
          {activeStrategy ? (
            <div className="flex items-center gap-2 font-mono">
              <span className="px-2 py-0.5 rounded bg-neutral-800 text-amber-300 font-bold border border-neutral-700">
                {activeStrategy.noEstrategia}
              </span>
              <span className="text-neutral-300 font-medium truncate max-w-[280px] sm:max-w-[450px]">
                {activeStrategy.nombreDeEstrategia}
              </span>
              <span className="text-neutral-500 hidden sm:inline">•</span>
              <span className="text-neutral-400 hidden sm:inline">
                {activeStrategy.temporalidad || '4H'}
              </span>
            </div>
          ) : (
            <span className="text-neutral-500 font-mono">Seleccione una estrategia para sincronizar gráfico</span>
          )}
        </div>

        {/* Quick Strategy Switcher Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mr-1 hidden lg:inline">
            Estrategias:
          </span>
          {allStrategies.map(strat => {
            const isCurrent = strat.noEstrategia === activeStrategy?.noEstrategia;
            const parBadge = strat.par.replace('USDT', '');
            return (
              <button
                key={strat.noEstrategia}
                id={`strat-chip-${strat.noEstrategia}`}
                onClick={() => handleSelectStrategy(strat)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all flex items-center gap-1 ${
                  isCurrent
                    ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-neutral-700/60'
                }`}
                title={`Revisar ${strat.noEstrategia}: ${strat.nombreDeEstrategia}`}
              >
                {isCurrent && <CheckCircle2 size={10} className="text-amber-400" />}
                <span>{parBadge}</span>
                <span className="text-[10px] text-neutral-400">({strat.noEstrategia})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main TradingView Chart Container (No Order Book, 100% TradingView) */}
      <div className="relative flex-1 w-full min-h-[500px] bg-neutral-950">
        <TradingViewWidget
          symbol={currentSymbol}
          interval={timeframe}
          theme="dark"
          height={isExpanded ? 'calc(100vh - 110px)' : '520px'}
        />
      </div>

      {/* Footer Status Bar with Protocol Adherence */}
      <div className="bg-neutral-950 px-4 py-1.5 border-t border-neutral-800/80 text-[11px] font-mono text-neutral-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-neutral-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            TradingView Advanced Real-Time Chart
          </span>
          <span>•</span>
          <span>Símbolo: <strong className="text-neutral-300">BINANCE:{currentSymbol}</strong></span>
          <span>•</span>
          <span>Temporalidad: <strong className="text-amber-400 font-semibold">{timeframe === '240' ? '4 Horas (4H)' : timeframe}</strong></span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-neutral-400">Modo: Velas Japonesas + Herramientas de Análisis</span>
        </div>
      </div>
    </div>
  );
};
