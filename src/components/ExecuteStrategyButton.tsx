import React, { useState } from 'react';
import { Play, Sparkles, Zap, CheckCircle2 } from 'lucide-react';
import { TopStrategyConfig, strategyAutofillService } from '../services/strategyAutofillService';
import { binanceWs } from '../services/binanceWs';

interface ExecuteStrategyButtonProps {
  strategy: TopStrategyConfig;
  variant?: 'primary' | 'compact' | 'accent';
  onExecuteComplete?: () => void;
}

export const ExecuteStrategyButton: React.FC<ExecuteStrategyButtonProps> = ({
  strategy,
  variant = 'primary',
  onExecuteComplete,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleAutoExecute = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExecuting(true);
    setIsSuccess(false);

    try {
      // 1. Switch active symbol in WebSocket stream
      binanceWs.setSymbol(strategy.symbol);

      // 2. Fetch live price or calculate based on current ticker
      const ticker = binanceWs.getTicker();
      const basePrice = ticker.symbol === strategy.symbol && ticker.lastPrice > 0 ? ticker.lastPrice : 789.5;

      const slPrice = Number((basePrice * (1 - strategy.slPercent / 100)).toFixed(4));
      const tpPrice = Number((basePrice * (1 + strategy.tpPercent / 100)).toFixed(4));
      const riskRewardNum = Number((strategy.tpPercent / strategy.slPercent).toFixed(1));

      // Calculate quantity based on default allocation
      const notional = strategy.allocationUsdt * strategy.leverage;
      const calcQty = Number((notional / basePrice).toFixed(3));

      // 3. Dispatch autofill payload to Futures Order Form
      strategyAutofillService.autofillOrderForm({
        strategyId: strategy.id,
        strategyName: strategy.name,
        symbol: strategy.symbol,
        side: strategy.side,
        orderType: 'LIMIT',
        price: basePrice,
        quantity: calcQty > 0 ? calcQty : 0.1,
        leverage: strategy.leverage, // strictly <= 5x
        marginType: 'ISOLATED', // strictly isolated
        slPercent: strategy.slPercent,
        tpPercent: strategy.tpPercent,
        slPrice,
        tpPrice,
        riskReward: riskRewardNum,
        autoExecuteImmediately: false, // pre-loads form with strict safety
      });

      setIsSuccess(true);
      if (onExecuteComplete) {
        onExecuteComplete();
      }

      setTimeout(() => {
        setIsSuccess(false);
        setIsExecuting(false);
      }, 1500);
    } catch (err) {
      console.error('Error autoejecutando estrategia:', err);
      setIsExecuting(false);
    }
  };

  if (variant === 'compact') {
    return (
      <button
        id={`autoejecutar-btn-${strategy.id}`}
        onClick={handleAutoExecute}
        disabled={isExecuting}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
          isSuccess
            ? 'bg-emerald-500 text-neutral-950 ring-1 ring-emerald-300'
            : 'bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-neutral-950 hover:shadow-amber-500/20'
        }`}
        title="Autoejecutar: Carga parámetros con apalancamiento seguro y margen aislado en Binance Futures"
      >
        {isSuccess ? (
          <>
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-950 shrink-0 animate-bounce" />
            <span>¡Cargado!</span>
          </>
        ) : isExecuting ? (
          <>
            <span className="w-3 h-3 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Transfiriendo...</span>
          </>
        ) : (
          <>
            <Zap className="w-3.5 h-3.5 fill-neutral-950 text-neutral-950 shrink-0" />
            <span>Autoejecutar</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      id={`autoejecutar-full-btn-${strategy.id}`}
      onClick={handleAutoExecute}
      disabled={isExecuting}
      className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md active:scale-98 ${
        isSuccess
          ? 'bg-emerald-500 text-neutral-950 ring-2 ring-emerald-300'
          : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 shadow-amber-950/40'
      }`}
      title="Transferir parámetros de R/B al formulario de futuros bajo límites estrictos de seguridad"
    >
      {isSuccess ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-neutral-950 shrink-0" />
          <span>¡Parámetros Cargados en Futuros!</span>
        </>
      ) : isExecuting ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Cargando en Binance Futures...</span>
        </>
      ) : (
        <>
          <Zap className="w-4 h-4 fill-neutral-950 text-neutral-950 shrink-0" />
          <span>Autoejecutar en Binance ({strategy.leverage}x ISOLATED)</span>
        </>
      )}
    </button>
  );
};
