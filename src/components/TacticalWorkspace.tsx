import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Layers,
} from 'lucide-react';
import { HeaderTicker } from './HeaderTicker';
import { PositionsAndOrders } from './PositionsAndOrders';
import { StrategyExecutionEngine } from './StrategyExecutionEngine';
import { binanceWs } from '../services/binanceWs';

export const TacticalWorkspace: React.FC = () => {
  const [symbol, setSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [isPositionsCollapsed, setIsPositionsCollapsed] = useState<boolean>(false);
  const [positionsCount, setPositionsCount] = useState<number>(() => binanceWs.getPositions().length);
  const [ordersCount, setOrdersCount] = useState<number>(() => binanceWs.getOpenOrders().length);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
      setPositionsCount(binanceWs.getPositions().length);
      setOrdersCount(binanceWs.getOpenOrders().length);
    });

    return () => {
      unsubWs();
    };
  }, []);

  return (
    <div id="tactical_workspace_container" className="flex flex-col h-full overflow-hidden bg-neutral-900 rounded-xl border border-neutral-800">
      {/* 1. Header Ticker (Live Price, Mark, 24h High/Low, 24h Change, Range & Derivatives) */}
      <HeaderTicker symbol={symbol} price={ticker.lastPrice} />

      {/* 2. Main Central Area: Tactical Strategy Execution & Order Breakdown List */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <StrategyExecutionEngine />
      </div>

      {/* 3. Bottom Collapsible Quick Positions & Orders Area */}
      <div
        id="collapsible_active_positions_section"
        className={`shrink-0 border-t border-neutral-800 bg-neutral-900 transition-all duration-300 flex flex-col ${
          isPositionsCollapsed ? 'h-9' : 'h-[32%] min-h-[190px] max-h-[340px]'
        }`}
      >
        <div
          onClick={() => setIsPositionsCollapsed(!isPositionsCollapsed)}
          className="h-9 px-3 bg-neutral-950 border-b border-neutral-800/80 flex items-center justify-between cursor-pointer select-none hover:bg-neutral-900 transition-colors shrink-0"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              Bandeja Rápida: Posiciones Activas & Órdenes
            </span>
            {(positionsCount > 0 || ordersCount > 0) && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {positionsCount} pos / {ordersCount} ord
              </span>
            )}
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

        {!isPositionsCollapsed && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 custom-scrollbar">
            <PositionsAndOrders />
          </div>
        )}
      </div>
    </div>
  );
};
