import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Zap,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Key,
  Terminal,
  Wifi,
  Activity,
  DollarSign,
  TrendingDown,
  RefreshCw,
  Clock,
  Bell,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Sparkles,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { PositionRisk, OpenOrder, AccountBalance, NetworkMode, ConnectionStatus, ApiCredentials } from '../types/binance';
import { PositionsAndOrders } from './PositionsAndOrders';
import { TradingViewWidget } from './TradingViewWidget';
import { ActiveTradeInspectorWithMilestones } from './ActiveTradeInspectorWithMilestones';

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
  const [mode, setMode] = useState<NetworkMode>(() => binanceWs.getMode());
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => binanceWs.getConnectionStatus());
  const [credentials, setCredentials] = useState<ApiCredentials>(() => binanceWs.getCredentials());
  const [latencyMs, setLatencyMs] = useState<number>(() => binanceWs.getLastLatencyMs());
  const [isUserDataConnected, setIsUserDataConnected] = useState<boolean>(() => binanceWs.getIsUserDataConnected());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const [lastSyncTime, setLastSyncTime] = useState<number>(() => binanceWs.getLastDataSyncTime());
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // TradingView Chart State in Gestión de Trades
  const [isChartVisible, setIsChartVisible] = useState<boolean>(true);
  const [chartInterval, setChartInterval] = useState<string>('240'); // 4H by default
  const [chartHeightMode, setChartHeightMode] = useState<'compact' | 'normal' | 'expanded'>('normal');
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string>(() => {
    const curPos = binanceWs.getPositions();
    if (curPos.length > 0) return curPos[0].symbol;
    const ticker = binanceWs.getTicker();
    return ticker.symbol || 'BTCUSDT';
  });

  // Subscribe to pure real-time WebSocket events (no polling, no resets)
  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setPositions(binanceWs.getPositions());
      setOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setMode(binanceWs.getMode());
      setConnectionStatus(binanceWs.getConnectionStatus());
      setCredentials(binanceWs.getCredentials());
      setLatencyMs(binanceWs.getLastLatencyMs());
      setIsUserDataConnected(binanceWs.getIsUserDataConnected());
      setIsSyncing(binanceWs.getIsSyncingData());
      setLastSyncTime(binanceWs.getLastDataSyncTime());
    });

    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await binanceWs.syncAllAccountData();
      if (res.success) {
        setSyncFeedback('¡Posiciones y órdenes sincronizadas!');
        setTimeout(() => setSyncFeedback(null), 3000);
      } else {
        setSyncFeedback(res.error || 'Aviso en sincronización');
        setTimeout(() => setSyncFeedback(null), 4000);
      }
    } catch (err: any) {
      setSyncFeedback(err?.message || 'Error al sincronizar');
      setTimeout(() => setSyncFeedback(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalIsolatedMargin = positions.reduce((acc, pos) => acc + (pos.isolatedMargin || 0), 0);
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unRealizedProfit || 0), 0);
  const totalNotional = positions.reduce((acc, pos) => acc + (pos.notional || 0), 0);

  const hasCredentials = Boolean(credentials.apiKey && credentials.apiSecret);
  const isLiveMode = mode === 'production' || mode === 'testnet';

  return (
    <div id="gestion-trades-view" className="w-full max-w-none px-2 sm:px-4 lg:px-6 mx-auto flex flex-col gap-4 pb-20 flex-1 min-h-[calc(100vh-4rem)]">
      
      {/* 1. Header Banner con Enfoque WebSocket Stream Puro */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-neutral-900/90 p-4 rounded-2xl border border-neutral-800 shadow-md">
        
        {/* Lado Izquierdo: Título y Estado WebSocket en Vivo */}
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm mt-0.5 sm:mt-0">
            <Layers className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                Gestión de Trades
              </h1>

              {/* Status Badge de WebSocket Stream */}
              {mode === 'production' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-700/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  WebSocket en Vivo: Producción (Stream WSS)
                  {latencyMs > 0 && <span className="text-emerald-500/80 font-normal">({latencyMs}ms)</span>}
                </span>
              ) : mode === 'testnet' ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/80 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  WebSocket Testnet: Conectado
                  {latencyMs > 0 && <span className="text-cyan-500/80 font-normal">({latencyMs}ms)</span>}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">
                  <Activity className="w-3 h-3 text-amber-400" />
                  WebSocket Stream: Mercado en Vivo
                </span>
              )}

              {isUserDataConnected && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-neutral-800 text-neutral-300 border border-neutral-700">
                  <Wifi className="w-2.5 h-2.5 text-emerald-400" />
                  User Data Push Activo
                </span>
              )}
            </div>

            <p className="text-xs text-neutral-400 mt-1">
              Supervisión reactiva 100% en tiempo real mediante WebSocket Streams (Ticks de precio, PnL flotante, órdenes abiertas y eventos de cuenta instantáneos).
            </p>
          </div>
        </div>

        {/* Lado Derecho: Controles y Acciones Directas */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          
          {/* Indicador de Modo Stream Puro */}
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1.5 rounded-lg border border-neutral-800 text-xs text-emerald-400 font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>WSS Reactivo</span>
          </div>

          {/* Botón Sincronizar Posiciones y Órdenes a Demanda */}
          <button
            type="button"
            id="btn-sync-positions-gestion"
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer ${
              isSyncing
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 cursor-wait'
                : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-200 hover:text-white border-neutral-800 hover:border-amber-500/40 active:scale-95'
            }`}
            title={lastSyncTime > 0 ? `Última sincronización: ${new Date(lastSyncTime).toLocaleTimeString()}` : 'Sincronizar posiciones y órdenes a demanda'}
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            {lastSyncTime > 0 && !isSyncing && (
              <span className="text-[10px] text-neutral-500 font-mono hidden xl:inline">
                ({new Date(lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
              </span>
            )}
          </button>

          {/* Feedback de sincronización si aplica */}
          {syncFeedback && (
            <span className="text-[11px] font-mono px-2 py-1 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 animate-fade-in shadow-xs flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {syncFeedback}
            </span>
          )}

          {/* Botón Consola WebSocket */}
          {onOpenConsole && (
            <button
              type="button"
              onClick={onOpenConsole}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Ver marcos WebSocket en vivo"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Log WS</span>
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
              title="Configurar credenciales de Binance"
            >
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>{hasCredentials ? 'Credenciales Binance' : 'Conectar API Binance'}</span>
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

          {/* Botón Notificaciones Consolidadas */}
          <button
            type="button"
            id="btn-gestion-open-notifs"
            onClick={() => notificationService.openConsolidatedWindow()}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir Ventana de Notificaciones Consolidadas"
          >
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Notificaciones</span>
          </button>

          {/* Botón Ir a Terminal */}
          {onGoToTrading && (
            <button
              type="button"
              onClick={onGoToTrading}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
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
                <span>¿Deseas ver en vivo la información de tu cuenta real de Binance por WebSocket?</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">Opcional</span>
              </h4>
              <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                Actualmente estás en modo <strong className="text-amber-300">Simulación</strong> con cotizaciones y ticks en tiempo real de Binance.
                Para sincronizar en vivo tu balance real, posiciones abiertas en Binance Futuros, órdenes activas e historial por streaming push, ingresa tus credenciales.
              </p>
            </div>
          </div>
          {onOpenApiModal && (
            <button
              type="button"
              onClick={onOpenApiModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shrink-0 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Conectar Binance</span>
            </button>
          )}
        </div>
      )}

      {/* 5. Franja Métrica Financiera de la Cuenta en Vivo por WebSocket */}
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
            {totalUnrealizedPnl >= 0 ? '+' : '-'}${Math.abs(totalUnrealizedPnl).toFixed(2)}
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            {totalIsolatedMargin > 0 ? `${totalUnrealizedPnl >= 0 ? '+' : '-'}${Math.abs((totalUnrealizedPnl / totalIsolatedMargin) * 100).toFixed(2)}% ROE` : 'Sin posiciones'}
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

        {/* Estado WebSocket & Latencia */}
        <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-400 flex items-center justify-between">
            <span>WebSocket Stream</span>
            <Wifi className={`w-3.5 h-3.5 ${connectionStatus === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`} />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-white mt-1 flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span>{latencyMs > 0 ? `${latencyMs}ms` : 'En Vivo'}</span>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono mt-0.5">
            {mode === 'production' ? 'Producción WSS' : mode === 'testnet' ? 'Testnet WSS' : 'Simulación Stream'}
          </div>
        </div>

      </div>

      {/* 6. Inspector Táctico de Trades, Sparkline desde Inicio y Alertas de Hitos (E2, E3, TP1, TP2, TP3, SL) */}
      <ActiveTradeInspectorWithMilestones
        selectedSymbol={selectedChartSymbol}
        onSelectSymbol={(sym) => setSelectedChartSymbol(sym)}
        onOpenOrderModal={onOpenOrderModal}
      />

      {/* 7. Gráfico Avanzado Tipo TradingView en Vivo en Gestión de Trades */}
      <div
        id="gestion-trades-tradingview-section"
        className="w-full bg-neutral-900/95 rounded-2xl border border-neutral-800 shadow-xl overflow-hidden flex flex-col transition-all"
      >
        {/* Header del Gráfico TradingView con Selector de Pares y Temporalidades */}
        <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Gráfico Técnico Pro (TradingView)</span>
                  <span className="text-amber-400 font-mono font-extrabold">{selectedChartSymbol}</span>
                </h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                  Binance Futures
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Monitoreo interactivo con velas en tiempo real, soporte, resistencias e indicadores técnicos.
              </p>
            </div>
          </div>

          {/* Controles de Gráfico: Selector de Pares, Temporalidad y Opciones de Vista */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Switcher de Posiciones Activas */}
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
              <span className="text-[10px] font-mono text-neutral-400 px-1 hidden md:inline">Par:</span>
              {(() => {
                const uniqueSymbols = Array.from(
                  new Set([
                    ...positions.map((p) => p.symbol),
                    'BTCUSDT',
                    'ETHUSDT',
                    'SOLUSDT',
                    'ZECUSDT',
                    'TAOUSDT',
                  ])
                ).slice(0, 6);

                return uniqueSymbols.map((sym) => {
                  const hasPos = positions.some((p) => p.symbol === sym);
                  const isSelected = selectedChartSymbol === sym;
                  return (
                    <button
                      key={sym}
                      type="button"
                      onClick={() => setSelectedChartSymbol(sym)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        isSelected
                          ? 'bg-amber-500 text-black shadow-xs'
                          : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                      }`}
                    >
                      {hasPos && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected ? 'bg-black' : 'bg-emerald-400 animate-pulse'
                          }`}
                        />
                      )}
                      <span>{sym.replace('USDT', '')}</span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Selector de Intervalos / Temporalidad */}
            <div className="flex items-center gap-0.5 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              {[
                { label: '1m', value: '1' },
                { label: '5m', value: '5' },
                { label: '15m', value: '15' },
                { label: '1H', value: '60' },
                { label: '4H', value: '240' },
                { label: '1D', value: 'D' },
              ].map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setChartInterval(t.value)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    chartInterval === t.value
                      ? 'bg-neutral-800 text-amber-400 border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Selector de Altura del Gráfico */}
            <button
              type="button"
              onClick={() =>
                setChartHeightMode((prev) =>
                  prev === 'compact' ? 'normal' : prev === 'normal' ? 'expanded' : 'compact'
                )
              }
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
              title={`Ajustar tamaño del gráfico (Actual: ${chartHeightMode})`}
            >
              {chartHeightMode === 'expanded' ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Toggle Mostrar / Ocultar Gráfico */}
            <button
              type="button"
              onClick={() => setIsChartVisible(!isChartVisible)}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title={isChartVisible ? 'Plegar gráfico TradingView' : 'Desplegar gráfico TradingView'}
            >
              {isChartVisible ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="hidden sm:inline">Plegar</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Expandir Gráfico</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Iframe Interactivo de TradingView */}
        {isChartVisible && (
          <div className="w-full bg-neutral-950 p-1">
            <TradingViewWidget
              symbol={selectedChartSymbol}
              interval={chartInterval}
              height={
                chartHeightMode === 'compact'
                  ? '380px'
                  : chartHeightMode === 'expanded'
                  ? '640px'
                  : '500px'
              }
              theme="dark"
            />
          </div>
        )}
      </div>

      {/* 8. Bandeja Operativa Principal: Posiciones, Órdenes, Historial & Disciplinas */}
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
                Monitorea en tiempo real tus posiciones aisladas, edita TP/SL, consulta el historial de trades y gestiona órdenes por streaming directo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95 shadow-xs"
              title="Actualizar a demanda posiciones y órdenes"
            >
              <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isSyncing ? 'Sincronizando...' : 'Actualizar Posiciones'}</span>
            </button>
            <span className="text-[11px] font-mono text-emerald-400/90 hidden md:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Streaming en Vivo vía WebSocket
            </span>
          </div>
        </div>

        {/* Contenedor de la tabla completa de posiciones y órdenes */}
        <div className="w-full p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto min-h-[700px]">
          <PositionsAndOrders
            defaultTab="positions"
            onOpenOrderModal={onOpenOrderModal}
            onSelectPosition={(pos) => setSelectedChartSymbol(pos.symbol)}
          />
        </div>
      </div>

    </div>
  );
};
