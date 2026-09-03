import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowRight,
  BookOpen,
  DollarSign,
  Layers,
  RefreshCw,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AccountSummary } from './AccountSummary';
import { PositionsAndOrders } from './PositionsAndOrders';
import { HeaderTicker } from './HeaderTicker';
import { binanceWs } from '../services/binanceWs';

interface FuturesHubPageProps {
  onNavigateToTerminal?: () => void;
}

export const FuturesHubPage: React.FC<FuturesHubPageProps> = ({ onNavigateToTerminal }) => {
  const [symbol, setSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [positionsCount, setPositionsCount] = useState(() => binanceWs.getPositions().length);
  const [ordersCount, setOrdersCount] = useState(() => binanceWs.getOpenOrders().length);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
      setPositionsCount(binanceWs.getPositions().length);
      setOrdersCount(binanceWs.getOpenOrders().length);
    });
    return () => unsub();
  }, []);

  const handleFullSync = async () => {
    setIsSyncing(true);
    try {
      await binanceWs.syncAllAccountData();
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-950 p-2 sm:p-3 gap-3">
      {/* 1. Header Ticker */}
      <div className="rounded-xl overflow-hidden border border-neutral-800 shrink-0">
        <HeaderTicker symbol={symbol} price={ticker.lastPrice} />
      </div>

      {/* 2. Top Banner & Quick Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 shrink-0">
        {/* Main Account Summary Box (takes 3 cols on large screens) */}
        <div className="lg:col-span-3">
          <AccountSummary />
        </div>

        {/* Quick Hub Navigation & Risk Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 flex flex-col justify-between shadow-lg">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Binance Futures Hub
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-neutral-950 text-neutral-300 border border-neutral-800">
                USDⓈ-M
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Gestión global de posiciones en vivo, órdenes escalonadas pendientes, historial de trades y diario estratégico sincronizado con Binance.
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
              <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                <span className="text-[9px] text-neutral-500 block uppercase">Posiciones</span>
                <strong className="text-white text-sm">{positionsCount} activas</strong>
              </div>
              <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                <span className="text-[9px] text-neutral-500 block uppercase">Órdenes</span>
                <strong className="text-neutral-200 text-sm">{ordersCount} abiertas</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-neutral-800/80">
            <button
              id="hub-sync-all-btn"
              onClick={handleFullSync}
              disabled={isSyncing}
              className="flex-1 py-1.5 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Todo'}</span>
            </button>

            {onNavigateToTerminal && (
              <button
                id="hub-goto-terminal-btn"
                onClick={onNavigateToTerminal}
                className="py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <span>Terminal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Main Full Width Interactive Tabbed Section */}
      <div className="flex-1 min-h-0 bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden shadow-2xl flex flex-col">
        <PositionsAndOrders defaultTab="positions" />
      </div>
    </div>
  );
};
