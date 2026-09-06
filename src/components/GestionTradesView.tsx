import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Zap,
  TrendingUp,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Key,
  Terminal,
  Wifi,
  WifiOff,
  Activity,
  ChevronDown,
  Info,
  DollarSign,
  TrendingDown,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { PositionRisk, OpenOrder, AccountBalance, NetworkMode, ConnectionStatus, ApiCredentials } from '../types/binance';
import { PositionsAndOrders } from './PositionsAndOrders';

interface GestionTradesViewProps {
  onOpenOrderModal?: () => void;
  onGoToTrading?: () => void;
  onOpenApiModal?: () => void;
  onOpenConsole?: () => void;
}

export const GestionTradesView: React.FC<GestionTradesViewProps> = ({
  onOpenOrderModal,
  onGoToTrading,
  onOpenApiModal,
  onOpenConsole,
}) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [orders, setOrders] = useState<OpenOrder[]>(() => binanceWs.getOpenOrders());
  const [balance, setBalance] = useState<AccountBalance>(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => binanceWs.getLastDataSyncTime());
  const [lastSyncError, setLastSyncError] = useState<string | null>(() => binanceWs.getLastDataSyncError());
  const [mode, setMode] = useState<NetworkMode>(() => binanceWs.getMode());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => binanceWs.getConnectionStatus());
  const [credentials, setCredentials] = useState<ApiCredentials>(() => binanceWs.getCredentials());
  const [latencyMs, setLatencyMs] = useState<number>(() => binanceWs.getLastLatencyMs());
  const [isUserDataConnected, setIsUserDataConnected] = useState<boolean>(() => binanceWs.getIsUserDataConnected());
  
  // Auto-refresh interval (ms): 5000, 10000, 30000, or 0 (paused)
  const [refreshInterval, setRefreshInterval] = useState<number>(10000);

  // Sync immediately when entering this view & subscribe to updates
  useEffect(() => {
    // Initial sync with Binance FAPI
    binanceWs.syncAllAccountData().catch(() => {});

    const unsub = binanceWs.subscribe(() => {
      setPositions(binanceWs.getPositions());
      setOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());
      setLastSyncTime(binanceWs.getLastDataSyncTime());
      setLastSyncError(binanceWs.getLastDataSyncError());
      setMode(binanceWs.getMode());
      setConnectionStatus(binanceWs.getConnectionStatus());
      setCredentials(binanceWs.getCredentials());
      setLatencyMs(binanceWs.getLastLatencyMs());
      setIsUserDataConnected(binanceWs.getIsUserDataConnected());
    });

    return () => unsub();
  }, []);

  // Set up background periodic polling interval for account data
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const intervalTimer = setInterval(() => {
      binanceWs.syncAllAccountData().catch(() => {});
    }, refreshInterval);

    return () => clearInterval(intervalTimer);
  }, [refreshInterval]);

  const totalIsolatedMargin = positions.reduce((acc, pos) => acc + (pos.isolatedMargin || 0), 0);
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unRealizedProfit || 0), 0);
  const totalNotional = positions.reduce((acc, pos) => acc + (pos.notional || 0), 0);

  const hasCredentials = Boolean(credentials.apiKey && credentials.apiSecret);
  const isLiveMode = mode === 'production' || mode === 'testnet';

  // Format time ago
  const getTimeAgo = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 5) return 'Hace un instante';
    if (seconds < 60) return `Hace ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `Hace ${minutes}m`;
  };

  return (
    <div id="gestion-trades-view" className="w-full max-w-none px-2 sm:px-4 lg:px-6 mx-auto flex flex-col gap-4 pb-20 flex-1 min-h-[calc(100vh-4rem)]">
      
      {/* 1. Header Banner con Integración FAPI de Binance */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 shadow-md">
        
        {/* Lado Izquierdo: Título y Estado FAPI en Vivo */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <Layers className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Gestión de Trades
              </h1>

              {/* Status Badge de Binance FAPI */}
              {mode === 'production' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Binance FAPI: En Vivo (ws-fapi.binance.com)
                  {latencyMs > 0 && <span className="text-emerald-500/80 font-normal">({latencyMs}ms)</span>}
                </span>
              ) : mode === 'testnet' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  Binance FAPI Testnet: Conectado
                  {latencyMs > 0 && <span className="text-cyan-500/80 font-normal">({latencyMs}ms)</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                  <Activity className="w-3 h-3 text-amber-400" />
                  Binance FAPI: Simulación (Mercado Real en Vivo)
                </span>
              )}

              {isUserDataConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                  Stream Push Activo
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-400 mt-1">
              Conexión directa con Binance WS-FAPI v1: consulta en vivo balance, posiciones aisladas, órdenes activas e historial de ejecuciones.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Controles de Sincronización FAPI & Acciones */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          
          {/* Selector de intervalo de actualización continua */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800 text-xs text-neutral-400">
            <span className="text-[11px] text-neutral-500 hidden sm:inline">Auto-FAPI:</span>
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-neutral-200 text-xs font-mono font-medium outline-none cursor-pointer"
              title="Intervalo de consulta a Binance FAPI"
            >
              <option value={5000} className="bg-neutral-900 text-neutral-200">En vivo (5s)</option>
              <option value={10000} className="bg-neutral-900 text-neutral-200">Cada 10s</option>
              <option value={30000} className="bg-neutral-900 text-neutral-200">Cada 30s</option>
              <option value={0} className="bg-neutral-900 text-neutral-200">Manual (Pausado)</option>
            </select>
          </div>

          {/* Botón Consola WebSocket FAPI */}
          {onOpenConsole && (
            <button
              type="button"
              onClick={onOpenConsole}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Ver marcos WebSocket en vivo de Binance FAPI"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Log FAPI</span>
            </button>
          )}

          {/* Botón Conectar / Configurar API Key */}
          {onOpenApiModal && (
            <button
              type="button"
              onClick={onOpenApiModal}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border shadow-xs cursor-pointer ${
                hasCredentials
                  ? 'bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border-neutral-700'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/50'
              }`}
              title="Configurar credenciales de Binance FAPI"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{hasCredentials ? 'Credenciales FAPI' : 'Conectar API Binance'}</span>
            </button>
          )}

          {/* Botón Nueva Orden */}
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

          {/* Botón Ir a Terminal */}
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

      {/* 2. Banner Informativo si se encuentra en modo Simulación sin API Key */}
      {!hasCredentials && (
        <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>¿Deseas ver en vivo la información de tu cuenta real de Binance?</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">Opcional</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                Actualmente estás en modo <strong className="text-amber-300">Simulación</strong> con cotizaciones y ticks en tiempo real de Binance.
                Para sincronizar en vivo tu balance real, posiciones abiertas en Binance Futuros, órdenes activas e historial de ejecuciones, ingresa tu API Key (con permisos de lectura habilitados).
              </p>
            </div>
          </div>
          {onOpenApiModal && (
            <button
              type="button"
              onClick={onOpenApiModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Key className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Conectar Binance FAPI</span>
            </button>
          )}
        </div>
      )}

      {/* 4. Banner de Error de Sincronización si existe */}
      {lastSyncError && (
        <div className="bg-rose-950/30 border border-rose-900/60 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-200">Aviso de sincronización Binance FAPI: {lastSyncError}</p>
              <p className="text-[11px] text-rose-400/80 mt-0.5">
                Verifica que tu API Key de Binance tenga habilitado el permiso de Futuros (Enable Futures) y que tu IP no esté restringida.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => binanceWs.syncAllAccountData()}
              className="px-2.5 py-1 rounded bg-rose-900/50 hover:bg-rose-900 text-rose-200 text-xs font-semibold transition-colors border border-rose-800"
            >
              Reintentar
            </button>
            {onOpenApiModal && (
              <button
                type="button"
                onClick={onOpenApiModal}
                className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-semibold transition-colors border border-neutral-700"
              >
                Revisar API Key
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Franja Métrica Financiera de la Cuenta en Vivo (Binance FAPI) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        
        {/* Margen Total */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>Margen Total</span>
            <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
            ${balance.totalMarginBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            USDT • Cuenta Binance
          </div>
        </div>

        {/* Margen Disponible */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>Margen Disponible</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-emerald-400 mt-1">
            ${balance.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            Para nuevas órdenes
          </div>
        </div>

        {/* PnL No Realizado */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>PnL No Realizado</span>
            {totalUnrealizedPnl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-base sm:text-lg font-bold font-mono mt-1 ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            {totalIsolatedMargin > 0 ? `${((totalUnrealizedPnl / totalIsolatedMargin) * 100).toFixed(2)}% ROE` : 'Sin posiciones'}
          </div>
        </div>

        {/* Margen Aislado Usado */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>Margen Aislado</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-amber-300 mt-1">
            ${totalIsolatedMargin.toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            En {positions.length} posición{positions.length !== 1 ? 'es' : ''} (1-5x)
          </div>
        </div>

        {/* Órdenes & Ratio Riesgo */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>Órdenes Abiertas</span>
            <Zap className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white mt-1">
            {orders.length}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            Límite, TP/SL activas
          </div>
        </div>

        {/* Estado FAPI & Latencia */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>Conexión FAPI</span>
            <Wifi className={`w-3.5 h-3.5 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{latencyMs > 0 ? `${latencyMs}ms` : 'Activa'}</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            {mode === 'production' ? 'Producción FAPI' : mode === 'testnet' ? 'Testnet FAPI' : 'Simulación Activa'}
          </div>
        </div>

      </div>

      {/* 6. Bandeja Operativa Principal: Posiciones, Órdenes, Historial & Disciplinas */}
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
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Bandeja Operativa de Posiciones & Órdenes en Vivo
                </h2>
                {(positions.length > 0 || orders.length > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {positions.length} pos / {orders.length} ord
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Monitorea en tiempo real tus posiciones aisladas, edita TP/SL, consulta el historial de trades y gestiona órdenes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-500 hidden md:inline">
              Sincronizado vía Binance WS-FAPI
            </span>
          </div>
        </div>

        {/* Contenedor de la tabla completa de posiciones y órdenes */}
        <div className="w-full p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto min-h-[700px]">
          <PositionsAndOrders defaultTab="positions" onOpenOrderModal={onOpenOrderModal} />
        </div>
      </div>

    </div>
  );
};
