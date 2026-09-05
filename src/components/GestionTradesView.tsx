import React, { useState, useEffect } from 'react';
import {
  Layers,
  Zap,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { PositionRisk, OpenOrder, AccountBalance } from '../types/binance';
import { PositionsAndOrders } from './PositionsAndOrders';

interface GestionTradesViewProps {
  onOpenOrderModal?: () => void;
  onGoToTrading?: () => void;
}

export const GestionTradesView: React.FC<GestionTradesViewProps> = ({
  onOpenOrderModal,
  onGoToTrading,
}) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [orders, setOrders] = useState<OpenOrder[]>(() => binanceWs.getOpenOrders());
  const [balance, setBalance] = useState<AccountBalance>(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => binanceWs.getLastDataSyncTime());

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setPositions(binanceWs.getPositions());
      setOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());
      setLastSyncTime(binanceWs.getLastDataSyncTime());
    });
    return () => unsub();
  }, []);

  const totalIsolatedMargin = positions.reduce((acc, pos) => acc + (pos.isolatedMargin || 0), 0);
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unRealizedProfit || 0), 0);

  const handleManualSync = async () => {
    await binanceWs.syncAllAccountData();
  };

  return (
    <div id="gestion-trades-view" className="w-full max-w-none px-2 sm:px-4 lg:px-6 mx-auto flex flex-col gap-4 pb-20 flex-1 min-h-[calc(100vh-4rem)]">
      {/* 1. Header Banner de Gestión de Trades */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Layers className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Gestión de Trades
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                Bandeja Operativa de Posiciones & Órdenes
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Supervisión en tiempo real, gestión de TP/SL, órdenes activas, historial de ejecuciones y control de riesgo isolated.
            </p>
          </div>
        </div>

        {/* Resumen Métrico Rápido & Acciones */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Posiciones:</span>
              <strong className="text-white font-bold">{positions.length}</strong>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">Órdenes:</span>
              <strong className="text-amber-400 font-bold">{orders.length}</strong>
            </div>
            <span className="text-neutral-700">|</span>
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-500">PnL Total:</span>
              <strong className={`font-bold ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title={lastSyncTime > 0 ? `Sincronizado: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sincronizar datos'}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          {onOpenOrderModal && (
            <button
              type="button"
              id="btn-gestion-new-order"
              onClick={onOpenOrderModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Nueva Orden</span>
            </button>
          )}

          {onGoToTrading && (
            <button
              type="button"
              onClick={onGoToTrading}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span>Terminal</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Tarjeta Principal: Bandeja Operativa de Posiciones & Órdenes en Formato de Tabla */}
      <div
        id="gestion-trades-tray-card"
        className="w-full flex-1 bg-neutral-900/95 rounded-2xl border-2 border-neutral-800 hover:border-amber-500/40 overflow-hidden flex flex-col shadow-2xl ring-1 ring-amber-500/10 transition-colors"
      >
        <div className="px-4 py-3.5 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Bandeja Operativa de Posiciones & Órdenes
                </h3>
                {(positions.length > 0 || orders.length > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {positions.length} pos / {orders.length} ord
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Monitorea en vivo tus posiciones aisladas, edita TP/SL, consulta historial y gestiona órdenes.
              </p>
            </div>
          </div>
        </div>

        {/* Contenedor de la tabla completa */}
        <div className="w-full p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto min-h-[700px]">
          <PositionsAndOrders defaultTab="positions" onOpenOrderModal={onOpenOrderModal} />
        </div>
      </div>
    </div>
  );
};
