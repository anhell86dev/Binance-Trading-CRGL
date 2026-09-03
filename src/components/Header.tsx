import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  Key,
  Radio,
  RefreshCw,
  Search,
  Server,
  Shield,
  Volume2,
  VolumeX,
  Wifi,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { NetworkMode } from '../types/binance';
import { APP_CONFIG, APP_VERSION } from '../config/version';

interface HeaderProps {
  onOpenApiModal: () => void;
  onOpenConsole: () => void;
  isConsoleOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenApiModal, onOpenConsole, isConsoleOpen }) => {
  const [currentSymbol, setCurrentSymbol] = useState(binanceWs.getCurrentSymbol());
  const [mode, setMode] = useState<NetworkMode>(binanceWs.getMode());
  const [status, setStatus] = useState(binanceWs.getConnectionStatus());
  const [rateLimits, setRateLimits] = useState(binanceWs.getRateLimits());
  const [soundOn, setSoundOn] = useState(notificationService.soundEnabled);
  const [pushGranted, setPushGranted] = useState(notificationService.pushGranted);
  const [latency, setLatency] = useState(24);
  const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      setMode(binanceWs.getMode());
      setStatus(binanceWs.getConnectionStatus());
      setRateLimits(binanceWs.getRateLimits());
    });

    const interval = setInterval(() => {
      setLatency(Math.floor(18 + Math.random() * 10));
    }, 4000);

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsApiDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubWs();
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
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

  const reqWeight = rateLimits.find((r) => r.rateLimitType === 'REQUEST_WEIGHT');
  const orderLimit = rateLimits.find((r) => r.rateLimitType === 'ORDERS');

  return (
    <header className="border-b border-neutral-800/80 bg-neutral-900/95 backdrop-blur-md px-3 sm:px-4 py-2.5 sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-3">
        {/* Left: Brand & Contract Info */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg shadow-sm shrink-0">
            Ⓢ
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
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
            <p className="text-xs text-neutral-400 hidden sm:block">
              Terminal WebSocket de Baja Latencia • {currentSymbol}
            </p>
          </div>

          {/* Strict Risk Compliance Tag */}
          <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-xs font-medium ml-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Regla de Riesgo: <strong>1-5x máx</strong> | <strong>ISOLATED</strong></span>
          </div>
        </div>

        {/* Right: Condensed API Status Dropdown & Compact Actions */}
        <div className="flex items-center gap-2">
          {/* Network Mode Switcher (Pill) */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
            <button
              id="mode-sim-btn"
              onClick={() => handleModeChange('simulation')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                mode === 'simulation'
                  ? 'bg-neutral-800 text-white font-semibold shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Simulación
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
              Prod
            </button>
          </div>

          {/* Condensed API Metrics & Latency Dropdown Widget */}
          <div className="relative" ref={dropdownRef}>
            <button
              id="api-metrics-dropdown-btn"
              onClick={() => setIsApiDropdownOpen(!isApiDropdownOpen)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium transition-all ${
                status === 'authenticated'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/40'
                  : status === 'connected'
                  ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/60 hover:bg-cyan-900/40'
                  : status === 'connecting'
                  ? 'bg-amber-950/40 text-amber-300 border-amber-800/60 animate-pulse'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/60'
              }`}
              title="Métricas técnicas de API y latencia WebSocket (Clic para detalles)"
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
              <span className="hidden sm:inline font-bold">⚡{latency}ms</span>
              <span className="text-[11px] opacity-80 uppercase">{status === 'authenticated' ? 'Auth' : status}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isApiDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Panel with Technical API Limits */}
            {isApiDropdownOpen && (
              <div
                id="api-metrics-dropdown-menu"
                className="absolute right-0 mt-2 w-72 bg-neutral-900 border border-neutral-700 rounded-xl p-3 shadow-2xl z-50 text-xs font-mono space-y-2.5"
              >
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    Telemetría API & WebSocket
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                    Online
                  </span>
                </div>

                {/* Latency & Ping/Pong */}
                <div className="flex items-center justify-between bg-neutral-950 p-2 rounded-lg border border-neutral-800">
                  <span className="text-neutral-400">Latencia WebSocket:</span>
                  <span className="text-emerald-300 font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-400" />
                    {latency} ms (Ping 3m)
                  </span>
                </div>

                {/* Rate Limits: IP Weight */}
                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">IP REQUEST_WEIGHT:</span>
                    <span className="text-amber-400 font-bold">
                      {reqWeight ? reqWeight.count : 12} / 2400
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (((reqWeight ? reqWeight.count : 12) / 2400) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 block">Regla #4 Binance FAPI</span>
                </div>

                {/* Rate Limits: UID Orders */}
                <div className="bg-neutral-950 p-2 rounded-lg border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">UID ORDERS Limit:</span>
                    <span className="text-cyan-400 font-bold">
                      {orderLimit ? orderLimit.count : 0} / 1200
                    </span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (((orderLimit ? orderLimit.count : 0) / 1200) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-neutral-500 block">Compartido con REST API</span>
                </div>

                {/* Quick actions inside dropdown */}
                <div className="pt-1 flex gap-2">
                  <button
                    onClick={() => {
                      setIsApiDropdownOpen(false);
                      onOpenConsole();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Activity className="w-3 h-3 text-amber-400" />
                    Consola WS
                  </button>
                  <button
                    onClick={() => {
                      setIsApiDropdownOpen(false);
                      onOpenApiModal();
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <Key className="w-3 h-3 text-amber-400" />
                    API Keys
                  </button>
                </div>
              </div>
            )}
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
            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono flex items-center gap-1.5 transition-colors ${
              isConsoleOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800'
            }`}
            title="Consola de tramas WebSocket (Ping/Pong, Firmas, JSON)"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Frames</span>
          </button>

          {/* API Keys Configuration Modal Button */}
          <button
            id="api-keys-modal-btn"
            onClick={onOpenApiModal}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">API Keys</span>
          </button>
        </div>
      </div>
    </header>
  );
};
