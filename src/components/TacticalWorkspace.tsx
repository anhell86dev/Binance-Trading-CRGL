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
      {/* 1. Header Ticker con Botón Prominente para Abrir el Formulario Emergente de Binance Futures */}
      <div className="relative">
        <HeaderTicker symbol={symbol} price={ticker.lastPrice} />
        
        {/* Quick Floating / Header Action Button for the Popup Order Form */}
        {onOpenOrderModal && (
          <div className="absolute top-2.5 right-3 z-20 hidden md:flex items-center gap-2">
            <button
              type="button"
              id="btn-open-futures-order-modal"
              onClick={onOpenOrderModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all shadow-md ring-1 ring-amber-400/50 group"
              title="Abrir Formulario de Órdenes Binance Futures (Ventana Emergente / Popup)"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950 group-hover:scale-110 transition-transform" />
              <span>Formulario Binance Futures</span>
              <Maximize2 className="w-3 h-3 text-neutral-900" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Central Area: Tactical Strategy Execution & Visual Terminal (Sin catálogo R/B lateral, sin sidebar diario, sin widget riesgo fijo y sin bandeja rápida inferior) */}
      <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <StrategyExecutionEngine />
      </div>
    </div>
  );
};
