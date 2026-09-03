import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  Bell,
  BellOff,
  ChevronDown,
  Key,
  Lock,
  Radio,
  RefreshCw,
  Shield,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { NetworkMode } from '../types/binance';
import { APP_CONFIG, APP_VERSION } from '../config/version';
import { StrategySidebar } from './StrategySidebar';
import { TacticalWorkspace } from './TacticalWorkspace';
import { RiskProtocolWidget } from './RiskProtocolWidget';
import { OrderForm } from './OrderForm';
import { ApiKeyModal } from './ApiKeyModal';
import { WebSocketConsole } from './WebSocketConsole';
import { NotificationToasts } from './NotificationToasts';

export default function TerminalLayout() {
  const [mode, setMode] = useState<NetworkMode>(binanceWs.getMode());
  const [status, setStatus] = useState(binanceWs.getConnectionStatus());
  const [rateLimits, setRateLimits] = useState(binanceWs.getRateLimits());
  const [soundOn, setSoundOn] = useState(notificationService.soundEnabled);
  const [pushGranted, setPushGranted] = useState(notificationService.pushGranted);
  const [latency, setLatency] = useState(24);
  const [isApiDropdownOpen, setIsApiDropdownOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
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
      notificationService.notify(
        'SYSTEM',
        'Notificaciones Push Activadas',
        'Recibirás alertas de ejecuciones y volatilidad.'
      );
    }
  };

  const reqWeight = rateLimits.find((r) => r.rateLimitType === 'REQUEST_WEIGHT');
  const orderLimit = rateLimits.find((r) => r.rateLimitType === 'ORDERS');

  return (
    <div className="h-screen w-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none selection:bg-amber-500/20 selection:text-amber-300">
      {/* 1. Barra de Estado Superior Ultra Compacta (h-10) */}
      <header className="h-10 flex justify-between items-center px-3 sm:px-4 bg-neutral-900 border-b border-neutral-800 shrink-0 z-40">
        {/* Left: Brand & Status Tag */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
            Ⓢ
          </div>

          <div className="flex items-center gap-2">
            <span className="font-black tracking-tight text-white text-xs sm:text-sm">
              Binance Futures
            </span>
            <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              USDⓈ-M WS-FAPI
            </span>
            <span
              id="header-prod-version-badge"
              className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{APP_VERSION} Prod</span>
            </span>
          </div>

          {/* Strict Risk Protocol Tag */}
          <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-400 text-[10px] font-medium font-mono">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Riesgo: <strong>1-5x máx</strong> | <strong>ISOLATED</strong></span>
          </div>
        </div>

        {/* Center: Realtime WS Live Connection Status */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${
              status === 'authenticated' || status === 'connected'
                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                : 'bg-amber-950/60 text-amber-300 border border-amber-800/60'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>● WS CONNECTED {latency}ms</span>
          </span>
        </div>

        {/* Right: Mode Switcher, Telemetry Dropdown & Quick Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Network Mode Pill */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 text-[10px]">
            <button
              onClick={() => handleModeChange('simulation')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                mode === 'simulation'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Sim
            </button>
            <button
              onClick={() => handleModeChange('testnet')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                mode === 'testnet'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Testnet
            </button>
            <button
              onClick={() => handleModeChange('production')}
              className={`px-1.5 py-0.5 rounded font-medium transition-all ${
                mode === 'production'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Prod
            </button>
          </div>

          {/* Telemetry & API Rate Limit Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsApiDropdownOpen(!isApiDropdownOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] font-mono transition-colors"
              title="Métricas de API & Rate Limits"
            >
              <Activity className="w-3 h-3 text-amber-400" />
              <ChevronDown className={`w-3 h-3 transition-transform ${isApiDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isApiDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-neutral-900 border border-neutral-700 rounded-lg p-3 shadow-2xl z-50 text-xs font-mono space-y-2">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                  <span className="font-bold text-white flex items-center gap-1">
                    <Activity className="w-3 h-3 text-amber-400" />
                    Telemetría API
                  </span>
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1 py-0.2 rounded border border-emerald-800/40">
                    Online
                  </span>
                </div>

                <div className="flex items-center justify-between bg-neutral-950 p-1.5 rounded border border-neutral-800">
                  <span className="text-neutral-400">Latencia WebSocket:</span>
                  <span className="text-emerald-300 font-bold">{latency} ms</span>
                </div>

                <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">REQUEST_WEIGHT:</span>
                    <span className="text-amber-400 font-bold">{reqWeight ? reqWeight.count : 12} / 2400</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-amber-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (((reqWeight ? reqWeight.count : 12) / 2400) * 100))}%` }}
                    />
                  </div>
                </div>

                <div className="bg-neutral-950 p-1.5 rounded border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-neutral-300">
                    <span className="text-neutral-400">ORDERS Limit:</span>
                    <span className="text-cyan-400 font-bold">{orderLimit ? orderLimit.count : 0} / 1200</span>
                  </div>
                  <div className="w-full bg-neutral-800 rounded-full h-1 overflow-hidden">
                    <div
                      className="bg-cyan-400 h-full rounded-full"
                      style={{ width: `${Math.min(100, (((orderLimit ? orderLimit.count : 0) / 1200) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sound Notification Toggle */}
          <button
            onClick={toggleSound}
            className={`p-1 rounded border transition-colors ${
              soundOn
                ? 'bg-neutral-950 text-amber-400 border-neutral-800'
                : 'bg-neutral-950 text-neutral-500 border-neutral-800 hover:text-neutral-300'
            }`}
            title={soundOn ? 'Sonido activado' : 'Sonido silenciado'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Push Notification Toggle */}
          <button
            onClick={enablePushNotifications}
            className={`p-1 rounded border transition-colors ${
              pushGranted
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
            title={pushGranted ? 'Notificaciones Push activadas' : 'Activar Notificaciones Push'}
          >
            {pushGranted ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          </button>

          {/* WS Frame Console Button */}
          <button
            onClick={() => setIsConsoleOpen(true)}
            className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-[11px] font-mono flex items-center gap-1 transition-colors"
            title="Consola de tramas WebSocket"
          >
            <Activity className="w-3 h-3 text-amber-400" />
            <span className="hidden md:inline">Frames</span>
          </button>

          {/* API Keys Configuration Button */}
          <button
            onClick={() => setIsApiModalOpen(true)}
            className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <Key className="w-3 h-3 text-amber-400" />
            <span>API Keys</span>
          </button>
        </div>
      </header>

      {/* 2. Grid Asimétrico Principal 3 Columnas: [20%_55%_25%] */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-[20%_55%_25%] gap-2 p-2 overflow-hidden h-[calc(100vh-2.5rem)]">
        {/* Columna Izquierda: Estrategia (20%) */}
        <aside className="bg-neutral-900 rounded-lg p-2.5 flex flex-col overflow-y-auto border border-neutral-800/90 custom-scrollbar">
          <StrategySidebar />
        </aside>

        {/* Columna Central: Gráfico y Táctica (55%) */}
        <section className="bg-neutral-900 rounded-lg flex flex-col overflow-hidden border border-neutral-800/90 min-h-0">
          <TacticalWorkspace />
        </section>

        {/* Columna Derecha: Ejecución y Riesgo (25%) */}
        <aside className="bg-neutral-900 rounded-lg p-2.5 flex flex-col overflow-y-auto border border-neutral-800/90 custom-scrollbar">
          <RiskProtocolWidget />
          <div className="my-2 border-t border-neutral-800/80" />
          <OrderForm />
        </aside>
      </main>

      {/* Modals & Global Overlays */}
      {isApiModalOpen && <ApiKeyModal onClose={() => setIsApiModalOpen(false)} />}
      {isConsoleOpen && <WebSocketConsole onClose={() => setIsConsoleOpen(false)} />}
      <NotificationToasts />
    </div>
  );
}
