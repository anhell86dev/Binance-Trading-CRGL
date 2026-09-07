import React from 'react';
import { Layers, TrendingUp, TrendingDown, Clock, ExternalLink, ArrowRight } from 'lucide-react';
import { ManagedTradeContext } from '../services/strategyManagedTradesService';

interface StrategyManagedBadgeProps {
  tradeContext?: ManagedTradeContext | null;
  onNavigateToGestionTrades?: (symbol?: string) => void;
  compact?: boolean;
  showNavigationButton?: boolean;
  className?: string;
}

export const StrategyManagedBadge: React.FC<StrategyManagedBadgeProps> = ({
  tradeContext,
  onNavigateToGestionTrades,
  compact = false,
  showNavigationButton = false,
  className = '',
}) => {
  if (!tradeContext || !tradeContext.isManaged) {
    return null;
  }

  const {
    hasActivePosition,
    hasOpenOrders,
    side,
    leverage,
    isProfit,
    pnlFormatted,
    roeFormatted,
    symbol,
  } = tradeContext;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavigateToGestionTrades) {
      onNavigateToGestionTrades(symbol);
    }
  };

  if (compact) {
    return (
      <span
        onClick={onNavigateToGestionTrades ? handleClick : undefined}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border transition-all ${
          hasActivePosition
            ? isProfit
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/30 hover:border-emerald-400'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs ring-1 ring-rose-500/30 hover:border-rose-400'
            : 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:border-amber-400'
        } ${onNavigateToGestionTrades ? 'cursor-pointer' : ''} ${className}`}
        title={`Estrategia activa en Gestión de Trades: ${
          hasActivePosition ? `${side} ${leverage}x • PnL: ${pnlFormatted} (${roeFormatted})` : 'Órdenes abiertas'
        } (clic para ver en Gestión de Trades)`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
        <Layers className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
        <span className="truncate">
          {hasActivePosition ? `${side} ${pnlFormatted}` : 'Órdenes en Gestión'}
        </span>
      </span>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border transition-all ${
        hasActivePosition
          ? isProfit
            ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/50 ring-1 ring-emerald-500/20 shadow-xs hover:border-emerald-400'
            : 'bg-rose-950/70 text-rose-300 border-rose-500/50 ring-1 ring-rose-500/20 shadow-xs hover:border-rose-400'
          : 'bg-amber-950/70 text-amber-300 border-amber-500/50 ring-1 ring-amber-500/20 shadow-xs hover:border-amber-400'
      } ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>

      <Layers className="w-3 h-3 text-emerald-400 shrink-0" />

      <span className="text-white font-bold tracking-tight">EN GESTIÓN DE TRADES</span>

      {hasActivePosition ? (
        <span className="flex items-center gap-1 border-l border-neutral-700/80 pl-1.5">
          <span
            className={`px-1 rounded text-[9px] font-black ${
              side === 'LONG' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
            }`}
          >
            {side} {leverage}x
          </span>
          <span
            className={`flex items-center gap-0.5 font-bold ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
            {pnlFormatted} ({roeFormatted})
          </span>
        </span>
      ) : hasOpenOrders ? (
        <span className="flex items-center gap-1 text-amber-300 text-[10px] border-l border-neutral-700/80 pl-1.5">
          <Clock className="w-2.5 h-2.5 text-amber-400" />
          <span>Órdenes Pendientes</span>
        </span>
      ) : null}

      {showNavigationButton && onNavigateToGestionTrades && (
        <button
          type="button"
          onClick={handleClick}
          className="ml-1 p-0.5 px-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer"
          title="Abrir y supervisar esta posición en la pestaña Gestión de Trades"
        >
          <span>Gestionar</span>
          <ArrowRight className="w-2.5 h-2.5 text-emerald-400" />
        </button>
      )}
    </div>
  );
};
