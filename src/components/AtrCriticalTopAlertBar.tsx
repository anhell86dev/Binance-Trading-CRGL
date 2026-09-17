import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  ShieldAlert,
  Sliders,
  X,
  ChevronRight,
  Zap,
  Sparkles,
  RotateCcw,
  Clock,
  ShieldCheck,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Settings,
} from 'lucide-react';
import { atrAlertService, AtrAlertItem, AtrSoundTone } from '../services/atrAlertService';
import { formatPrice } from '../utils/priceFormatter';

interface AtrCriticalTopAlertBarProps {
  onOpenRiskModal?: (symbol?: string) => void;
  onOpenSettingsModal?: () => void;
  onNavigateToTrades?: () => void;
}

export const AtrCriticalTopAlertBar: React.FC<AtrCriticalTopAlertBarProps> = ({
  onOpenRiskModal,
  onOpenSettingsModal,
  onNavigateToTrades,
}) => {
  const [activeAlerts, setActiveAlerts] = useState<AtrAlertItem[]>([]);
  const [config, setConfig] = useState(atrAlertService.getConfig());
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const update = () => {
      setActiveAlerts(atrAlertService.getActiveAlerts());
      setConfig(atrAlertService.getConfig());
    };

    update();
    const unsub = atrAlertService.subscribe(update);
    return () => unsub();
  }, []);

  if (activeAlerts.length === 0) {
    return null;
  }

  const primaryAlert = activeAlerts[0];
  const isExtreme = primaryAlert.severity === 'extreme';
  const hasPosition = primaryAlert.isPositionActive;

  const handleToggleSound = () => {
    atrAlertService.saveConfig({ soundEnabled: !config.soundEnabled });
  };

  const handleDismiss = (sym: string) => {
    atrAlertService.dismissAlert(sym);
  };

  const handleSnooze = (sym: string) => {
    atrAlertService.snoozeAlert(sym, 15);
  };

  const handleReviewRisk = () => {
    if (onOpenRiskModal) {
      onOpenRiskModal(primaryAlert.symbol);
    }
  };

  return (
    <div
      id="atr-critical-top-alert-banner"
      className={`w-full transition-all duration-300 z-40 border-b ${
        isExtreme
          ? 'bg-gradient-to-r from-rose-950 via-rose-900 to-neutral-950 border-rose-600/60 shadow-lg shadow-rose-950/40 text-rose-100'
          : 'bg-gradient-to-r from-amber-950/95 via-neutral-900 to-neutral-950 border-amber-500/50 shadow-md shadow-amber-950/30 text-amber-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        
        {/* Left: Indicator Badge, Symbol, ATR Details */}
        <div className="flex items-center gap-2.5 flex-wrap min-w-0">
          {/* Pulsing Icon */}
          <div
            className={`p-1.5 rounded-lg flex items-center justify-center shrink-0 ${
              isExtreme
                ? 'bg-rose-500 text-white animate-bounce shadow-md shadow-rose-500/50'
                : 'bg-amber-500 text-neutral-950 animate-pulse'
            }`}
          >
            {isExtreme ? <Flame className="w-4 h-4 fill-white" /> : <AlertTriangle className="w-4 h-4 fill-neutral-950" />}
          </div>

          {/* Alert Title & Symbol Tag */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded font-mono ${
                isExtreme
                  ? 'bg-rose-500/30 text-rose-200 border border-rose-400/50'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isExtreme ? 'VOLATILIDAD EXTREMA' : 'ALERTA ATR CRÍTICO'}
            </span>

            <span className="font-extrabold text-sm text-white font-mono flex items-center gap-1">
              {primaryAlert.symbol}
            </span>

            {/* Live ATR Value & Critical threshold */}
            <div className="flex items-center gap-1 text-xs font-mono">
              <span className="text-neutral-400">ATR(14):</span>
              <span
                className={`font-black px-1.5 py-0.2 rounded ${
                  isExtreme ? 'bg-rose-500/40 text-white' : 'bg-amber-500/30 text-amber-200'
                }`}
              >
                {primaryAlert.atrPercent.toFixed(2)}% (${formatPrice(primaryAlert.atrValue, primaryAlert.symbol)})
              </span>
              <span className="text-neutral-400 text-[11px]">
                (Umbral: ≥{primaryAlert.criticalThreshold}%)
              </span>
            </div>

            {/* Active Position Badge if exists */}
            {hasPosition && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                <Activity className="w-3 h-3 text-sky-400" />
                Posición Activa ({primaryAlert.positionSide || 'ISOLATED'})
                {primaryAlert.unrealizedPnl !== undefined && (
                  <span className={primaryAlert.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {primaryAlert.unrealizedPnl >= 0 ? '+' : ''}${primaryAlert.unrealizedPnl.toFixed(2)}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Right: Action Buttons & Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0 flex-wrap">
          
          {/* Main CTA: Revisar Gestión de Riesgo */}
          <button
            type="button"
            id="atr-alert-btn-review-risk"
            onClick={handleReviewRisk}
            className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ${
              isExtreme
                ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-900/50'
                : 'bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-amber-950/50'
            }`}
            title="Abrir panel de análisis táctico de volatilidad y ajuste de Stops"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Revisar Gestión de Riesgo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Quick Settings CTA */}
          {onOpenSettingsModal && (
            <button
              type="button"
              id="atr-alert-btn-settings"
              onClick={onOpenSettingsModal}
              className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/80 text-xs transition-colors cursor-pointer"
              title="Ajustar umbral crítico de ATR y sonido"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              config.soundEnabled
                ? 'bg-neutral-900/80 hover:bg-neutral-800 text-emerald-400 border-emerald-600/40'
                : 'bg-neutral-900/80 hover:bg-neutral-800 text-neutral-500 border-neutral-800'
            }`}
            title={config.soundEnabled ? 'Sonido de alarma ATR activado' : 'Sonido silenciado'}
          >
            {config.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Snooze 15m */}
          <button
            type="button"
            onClick={() => handleSnooze(primaryAlert.symbol)}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
            title="Silenciar alarma para este símbolo por 15 minutos"
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">15m</span>
          </button>

          {/* Dismiss Alert */}
          <button
            type="button"
            onClick={() => handleDismiss(primaryAlert.symbol)}
            className="p-1.5 rounded-lg bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Descartar alerta"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* Multiple Alerts indicator if more than 1 pair is critical */}
      {activeAlerts.length > 1 && (
        <div className="bg-neutral-950/80 px-4 py-1 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-2 overflow-x-auto py-0.5">
            <span className="font-bold text-amber-400">{activeAlerts.length} pares con ATR Crítico:</span>
            {activeAlerts.map((a) => (
              <button
                key={a.symbol}
                type="button"
                onClick={() => onOpenRiskModal?.(a.symbol)}
                className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-white font-mono text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>{a.symbol}</span>
                <span className="text-amber-400 font-bold">{a.atrPercent.toFixed(1)}%</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => atrAlertService.dismissAllAlerts()}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 underline shrink-0 ml-2"
          >
            Descartar todas
          </button>
        </div>
      )}
    </div>
  );
};
