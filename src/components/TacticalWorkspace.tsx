import React, { useState, useEffect } from 'react';
import {
  Maximize2,
  Sliders,
  Zap,
} from 'lucide-react';
import { HeaderTicker } from './HeaderTicker';
import { StrategyExecutionEngine } from './StrategyExecutionEngine';
import { binanceWs } from '../services/binanceWs';

interface TacticalWorkspaceProps {
  onOpenOrderModal?: () => void;
}

export const TacticalWorkspace: React.FC<TacticalWorkspaceProps> = ({ onOpenOrderModal }) => {
  const [symbol, setSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
    });

    return () => {
      unsubWs();
    };
  }, []);

  return (
    <div id="tactical_workspace_container" className="flex flex-col h-full overflow-hidden bg-neutral-900 rounded-xl border border-neutral-800 shadow-xl">
      {/* 1. Header Ticker */}
      <div className="relative">
        <HeaderTicker symbol={symbol} price={ticker.lastPrice} />
      </div>

      {/* 2. Main Central Area: Tactical Strategy Execution & Visual Terminal */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <StrategyExecutionEngine />
      </div>
    </div>
  );
};
