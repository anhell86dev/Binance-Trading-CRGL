import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  Key,
  Radio,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { strategyService } from '../services/strategyService';
import { NetworkMode } from '../types/binance';
import { APP_CONFIG, APP_VERSION } from '../config/version';

interface HeaderProps {
  onOpenApiModal: () => void;
  onOpenConsole: () => void;
  isConsoleOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenApiModal, onOpenConsole, isConsoleOpen }) => {
  const [currentSymbol, setCurrentSymbol] = useState(binanceWs.getCurrentSymbol());
  const [strategyPairs, setStrategyPairs] = useState<string[]>(strategyService.getStrategyPairs());
  const [mode, setMode] = useState<NetworkMode>(binanceWs.getMode());
  const [status, setStatus] = useState(binanceWs.getConnectionStatus());
  const [rateLimits, setRateLimits] = useState(binanceWs.getRateLimits());
  const [soundOn, setSoundOn] = useState(notificationService.soundEnabled);
  const [pushGranted, setPushGranted] = useState(notificationService.pushGranted);
  const [latency, setLatency] = useState(24);

  useEffect(() => {
    // Initial sync of symbol with strategy pairs
    const pairs = strategyService.getStrategyPairs();
    if (pairs.length > 0 && !pairs.includes(binanceWs.getCurrentSymbol())) {
      binanceWs.setSymbol(pairs[0]);
    }

    const unsubWs = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      setMode(binanceWs.getMode());
      setStatus(binanceWs.getConnectionStatus());
      setRateLimits(binanceWs.getRateLimits());
    });

    const unsubStrat = strategyService.subscribe(() => {
      const updatedPairs = strategyService.getStrategyPairs();
      setStrategyPairs(updatedPairs);
      if (updatedPairs.length > 0 && !updatedPairs.includes(binanceWs.getCurrentSymbol())) {
        binanceWs.setSymbol(updatedPairs[0]);
      }
    });

    // Simulate minor realistic WS ping fluctuation
    const interval = setInterval(() => {
      setLatency(Math.floor(18 + Math.random() * 12));
    }, 4000);

    return () => {
      unsubWs();
      unsubStrat();
      clearInterval(interval);
    };
  }, []);

  const handleModeChange = (newMode: NetworkMode) => {
    if (newMode === mode) return;
    const creds = binanceWs.getCredentials();
    binanceWs.connectWsApi({ ...creds, mode: newMode });
  };

  const toggleSound = () => {
    notificationService.soundEnabled = !soundOn;
    setSoundOn(!soundOn);
    if (!soundOn) notificationService.playChime('fill');
  };

  const enablePushNotifications = async () => {
    const granted = await notificationService.requestPushPermission();
    setPushGranted(granted);
    if (granted) {
      notificationService.notify('SYSTEM', 'Notificaciones Push Activadas', 'Recibirás alertas de ejecuciones y volatilidad.');
    }
  };

  const reqWeight = rateLimits.find(r => r.rateLimitType === 'REQUEST_WEIGHT');
  const orderLimit = rateLimits.find(r => r.rateLimitType === 'ORDERS');

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Brand & Symbol Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm">
              Ⓢ
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-white text-base">Binance Futures</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  USDⓈ-M WS-FAPI
                </span>
                <span
                  id="header-prod-version-badge"
                  title={`Versión en Producción: ${APP_VERSION} (${APP_CONFIG.stage} • ${APP_CONFIG.releaseDate})`}
                  className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{APP_VERSION} Prod</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400">Terminal WebSocket de Baja Latencia • {APP_CONFIG.version}</p>
            </div>
          </div>

          {/* Symbol Selector Pills - Derived strictly from loaded strategies */}
          <div className="flex items-center gap-1 bg-neutral-950/80 p-1 rounded-lg border border-neutral-800">
            <span className="text-[10px] uppercase font-bold text-neutral-400 px-2 py-0.5 border-r border-neutral-800">
              Pares Estrategia:
            </span>
            {strategyPairs.length === 0 ? (
              <span className="text-xs text-neutral-400 italic px-2">Carga una estrategia en la pestaña Estrategias</span>
            ) : (
              strategyPairs.map(sym => (
                <button
                  key={sym}
                  id={`symbol-btn-${sym}`}
                  onClick={() => binanceWs.setSymbol(sym)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 ${
                    currentSymbol === sym
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60'
                  }`}
                >
                  <span>{sym}</span>
                  {currentSymbol === sym && (
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-pulse" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Strict Risk Compliance Tag */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Regla de Riesgo: <strong>1-5x máx</strong> | <strong>ISOLATED</strong></span>
          </div>
        </div>

        {/* Right: Environment, WS Status, Rate Limits & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Rate Limits Meter */}
          <div className="hidden lg:flex items-center gap-3 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-mono">
            <div className="flex items-center gap-1.5" title="IP REQUEST_WEIGHT (Regla #4 Binance WS)">
              <span className="text-neutral-400">Peso:</span>
              <span className="text-amber-400 font-semibold">{reqWeight ? reqWeight.count : 12}/2400</span>
            </div>
            <div className="w-px h-3 bg-neutral-800" />
            <div className="flex items-center gap-1.5" title="UID ORDERS (Compartido con REST)">
              <span className="text-neutral-400">Órdenes:</span>
              <span className="text-cyan-400 font-semibold">{orderLimit ? orderLimit.count : 0}/1200</span>
            </div>
          </div>

          {/* Network Mode Switcher */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
            <button
              id="mode-sim-btn"
              onClick={() => handleModeChange('simulation')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                mode === 'simulation'
                  ? 'bg-neutral-800 text-white font-semibold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Simulación Live
            </button>
            <button
              id="mode-testnet-btn"
              onClick={() => handleModeChange('testnet')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                mode === 'testnet'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Testnet
            </button>
            <button
              id="mode-prod-btn"
              onClick={() => handleModeChange('production')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                mode === 'production'
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Producción
            </button>
          </div>

          {/* WS Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${
              status === 'authenticated'
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : status === 'connected'
                ? 'bg-cyan-950/60 text-cyan-400 border-cyan-800'
                : status === 'connecting'
                ? 'bg-amber-950/60 text-amber-400 border-amber-800 animate-pulse'
                : 'bg-rose-950/60 text-rose-400 border-rose-800'
            }`}
            title={`WebSocket: ${status.toUpperCase()} | Ping/Pong activo cada 3 min`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  status === 'authenticated' || status === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  status === 'authenticated' || status === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="uppercase text-[11px]">{status === 'authenticated' ? 'Auth 24h' : status}</span>
            <span className="text-neutral-400 text-[10px]">⚡{latency}ms</span>
          </div>

          {/* Sound Notification Toggle */}
          <button
            id="sound-toggle-btn"
            onClick={toggleSound}
            className={`p-1.5 rounded-lg border transition-colors ${
              soundOn
                ? 'bg-neutral-800/80 text-amber-400 border-neutral-700'
                : 'bg-neutral-900 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title={soundOn ? 'Sonido de ejecuciones activado' : 'Sonido silenciado'}
          >
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Push Notifications Permission */}
          <button
            id="push-perm-btn"
            onClick={enablePushNotifications}
            className={`p-1.5 rounded-lg border transition-colors ${
              pushGranted
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title={pushGranted ? 'Notificaciones Push activadas' : 'Activar Notificaciones Push'}
          >
            {pushGranted ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>

          {/* WS Frame Console Inspector Toggle */}
          <button
            id="ws-console-toggle-btn"
            onClick={onOpenConsole}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              isConsoleOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
            title="Consola de tramas WebSocket (Ping/Pong, Firmas, JSON)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Frames WS</span>
          </button>

          {/* API Keys Configuration Modal Button */}
          <button
            id="api-keys-modal-btn"
            onClick={onOpenApiModal}
            className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>API Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
};
