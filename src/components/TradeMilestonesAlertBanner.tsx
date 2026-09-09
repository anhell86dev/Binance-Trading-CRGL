import React, { useState, useEffect } from 'react';
import {
  tradeMilestonesAlertService,
  MilestoneAlertEvent,
  MilestoneType,
} from '../services/tradeMilestonesAlertService';
import { notificationService } from '../services/notifications';
import {
  Volume2,
  VolumeX,
  Bell,
  AlertTriangle,
  Target,
  ShieldAlert,
  ShieldCheck,
  Zap,
  X,
  ChevronDown,
  Sparkles,
  Music,
} from 'lucide-react';

export const TradeMilestonesAlertBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<MilestoneAlertEvent[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(notificationService.isSoundEnabled());
  const [showTestMenu, setShowTestMenu] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const update = () => {
      setAlerts(tradeMilestonesAlertService.getAlerts());
      setSoundEnabled(notificationService.isSoundEnabled());
      setIsDismissed(false); // Reset dismissal on new alert
      setCurrentTime(Date.now());
    };

    update();
    const unsubMilestones = tradeMilestonesAlertService.subscribe(update);
    const unsubNotifs = notificationService.subscribe(update);

    // Timer de 1s para actualizar la cuenta regresiva de 10s del banner activo
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => {
      unsubMilestones();
      unsubNotifs();
      clearInterval(interval);
    };
  }, []);

  const latestAlert = alerts.length > 0 ? alerts[0] : null;

  const toggleSound = () => {
    const next = !soundEnabled;
    notificationService.setSoundEnabled(next);
    setSoundEnabled(next);
  };

  const testSound = (m: MilestoneType) => {
    tradeMilestonesAlertService.triggerTestAlert(m, 'BTCUSDT');
  };

  const getBadgeColor = (milestone: MilestoneType) => {
    switch (milestone) {
      case 'TP3':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'TP2':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'TP1':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-600/40';
      case 'E1':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'E2':
      case 'E3':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'SL':
        return 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse';
      default:
        return 'bg-neutral-800 text-neutral-300 border-neutral-700';
    }
  };

  const formatPrice = (val: number) => {
    if (!val || isNaN(val)) return '0.00';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toFixed(3);
  };

  return (
    <div className="w-full flex flex-col gap-2 mb-3">
      {/* Top Notification Control Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 bg-neutral-900/90 border border-neutral-800 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${soundEnabled ? 'bg-emerald-400' : 'bg-neutral-500'}`}></span>
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${soundEnabled ? 'bg-emerald-500' : 'bg-neutral-600'}`}></span>
          </span>
          <span className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5 text-amber-400" />
            <span>Notificaciones de Niveles Clave (E1, E2, TP1-3, SL)</span>
          </span>
          <span className="text-[10px] text-neutral-400 hidden sm:inline-block">
            {soundEnabled ? 'Alertas sonoras y visuales activas' : 'Sonido desactivado'}
          </span>
        </div>

        <div className="flex items-center gap-2 relative">
          {/* Sound Toggle Button */}
          <button
            type="button"
            onClick={toggleSound}
            className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 transition-colors ${
              soundEnabled
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/50'
                : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:bg-neutral-800'
            }`}
            title={soundEnabled ? 'Silenciar alertas sonoras' : 'Activar alertas sonoras'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{soundEnabled ? 'Audio ON' : 'Audio OFF'}</span>
          </button>

          {/* Test Sound Menu Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTestMenu(!showTestMenu)}
              className="px-2.5 py-1 text-xs rounded-md bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white hover:bg-neutral-750 flex items-center gap-1"
            >
              <Music className="w-3.5 h-3.5 text-sky-400" />
              <span>Probar Tonos</span>
              <ChevronDown className="w-3 h-3 text-neutral-400" />
            </button>

            {showTestMenu && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-52 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl p-2 flex flex-col gap-1 text-xs">
                <div className="text-[10px] uppercase font-semibold text-neutral-400 px-2 py-1 border-b border-neutral-800">
                  Prueba de Tonos de Alerta
                </div>
                <button
                  type="button"
                  onClick={() => testSound('E1')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-sky-300 flex items-center justify-between"
                >
                  <span>⚡ Probar E1 (Entrada)</span>
                  <span className="text-[10px] text-neutral-500">Chime Doble</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSound('E2')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-amber-300 flex items-center justify-between"
                >
                  <span>⚠️ Probar E2 (DCA)</span>
                  <span className="text-[10px] text-neutral-500">Radar Dual</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSound('TP1')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-emerald-400 flex items-center justify-between"
                >
                  <span>🎯 Probar TP1</span>
                  <span className="text-[10px] text-neutral-500">Arpeggio</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSound('TP2')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-emerald-300 flex items-center justify-between"
                >
                  <span>🚀 Probar TP2</span>
                  <span className="text-[10px] text-neutral-500">Armónico</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSound('TP3')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-emerald-200 flex items-center justify-between"
                >
                  <span>🏆 Probar TP3</span>
                  <span className="text-[10px] text-neutral-500">Cristalino</span>
                </button>
                <button
                  type="button"
                  onClick={() => testSound('SL')}
                  className="px-2 py-1 text-left rounded hover:bg-neutral-800 text-rose-400 flex items-center justify-between"
                >
                  <span>🛑 Probar Stop Loss</span>
                  <span className="text-[10px] text-neutral-500">Alarma Alerta</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Alert Banner when a recent alert exists (Se oculta automáticamente a los 10 segundos) */}
      {latestAlert && !isDismissed && currentTime - latestAlert.timestamp < 10000 && (() => {
        const elapsed = Math.max(0, Math.min(10000, currentTime - latestAlert.timestamp));
        const remainingSeconds = Math.max(1, Math.ceil((10000 - elapsed) / 1000));

        return (
          <div
            className={`relative overflow-hidden flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs font-mono transition-all shadow-md ${
              latestAlert.milestone === 'SL'
                ? 'bg-rose-950/80 border-rose-700 text-rose-200'
                : latestAlert.milestone.startsWith('TP')
                ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                : 'bg-sky-950/70 border-sky-700 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getBadgeColor(
                  latestAlert.milestone
                )}`}
              >
                {latestAlert.milestone} CRUZADO
              </span>
              <span className="font-bold text-white tracking-wide">{latestAlert.symbol}</span>
              <span className="text-neutral-300 hidden md:inline">
                Precio: ${formatPrice(latestAlert.triggerPrice)} (Nivel: ${formatPrice(latestAlert.levelPrice)})
              </span>
              <span className="text-[10px] text-neutral-400">
                {new Date(latestAlert.timestamp).toLocaleTimeString()}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-black/40 text-amber-300 text-[10px] border border-amber-500/30">
                ⏱ Auto-cierre en {remainingSeconds}s • Queda no leída en campana
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => notificationService.playMilestoneSound(latestAlert.milestone)}
                className="px-2 py-0.5 rounded bg-neutral-800/80 hover:bg-neutral-700 text-[10px] text-neutral-200 flex items-center gap-1 border border-neutral-600 cursor-pointer"
                title="Re-escuchar sonido"
              >
                <Volume2 className="w-3 h-3 text-amber-400" />
                <span>Sonido</span>
              </button>
              <button
                type="button"
                onClick={() => setIsDismissed(true)}
                className="p-1 text-neutral-400 hover:text-white rounded cursor-pointer"
                title="Cerrar banner (quedará no leída en el centro de notificaciones)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Barra de cuenta regresiva de 10 segundos */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
              <div
                className="h-full bg-amber-400/80 transition-all duration-300 ease-linear"
                style={{
                  width: `${Math.max(0, 100 - (elapsed / 10000) * 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};
