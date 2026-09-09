import React, { useState, useRef, useEffect } from 'react';
import {
  GoogleSheetStrategyRow,
  StrategyTradeStatus,
} from '../types/strategy';
import { StrategyFullConfluenceResult } from '../types/confluence';
import { getTradeProcessStageInfo } from '../utils/sheetParser';
import {
  Zap,
  Radio,
  Ban,
  AlertTriangle,
  Layers,
  ChevronDown,
  Info,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface StrategyConfluenceStatusBadgeProps {
  strategy: GoogleSheetStrategyRow | null;
  confluence?: StrategyFullConfluenceResult | null;
  hasPosition?: boolean;
  hasOpenOrders?: boolean;
  compact?: boolean;
}

export const StrategyConfluenceStatusBadge: React.FC<StrategyConfluenceStatusBadgeProps> = ({
  strategy,
  confluence,
  hasPosition = true,
  hasOpenOrders = false,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!strategy) {
    return (
      <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-500 text-[10px] font-mono select-none">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
        <span>Sin Confluencia de Hoja</span>
      </div>
    );
  }

  const rawStatus: StrategyTradeStatus = strategy.estado || 'Activa';
  const stageInfo = getTradeProcessStageInfo(rawStatus, hasOpenOrders, hasPosition);

  // Determine signal badge styling and label based on Google Sheet state & signal level
  const getSignalConfig = () => {
    switch (rawStatus) {
      case 'Activa':
        return {
          title: 'Señal Activa (Para Tomar)',
          shortLabel: 'Señal Activa',
          meaning: 'Estrategia vigente lista para tomar según hoja',
          badgeClass:
            'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-950/30',
          dotClass: 'bg-emerald-400 animate-pulse',
          icon: Sparkles,
          iconColor: 'text-emerald-400',
          accentBorder: 'border-emerald-500/30',
        };
      case 'Live+':
        return {
          title: 'Señal Live+ (En Curso)',
          shortLabel: 'Señal Live+',
          meaning: 'Órdenes completadas y posición activa en Binance Futures',
          badgeClass:
            'bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/40 shadow-xs shadow-cyan-950/30',
          dotClass: 'bg-cyan-400',
          icon: Zap,
          iconColor: 'text-cyan-400',
          accentBorder: 'border-cyan-500/30',
        };
      case 'Live':
        return {
          title: 'Señal Live (Órdenes Generadas)',
          shortLabel: 'Señal Live',
          meaning: 'Órdenes colocadas en el libro a la espera de ejecución',
          badgeClass:
            'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/40 shadow-xs shadow-amber-950/30',
          dotClass: 'bg-amber-400 animate-pulse',
          icon: Radio,
          iconColor: 'text-amber-400',
          accentBorder: 'border-amber-500/30',
        };
      case 'Fallida':
        return {
          title: 'Señal Fallida (Stop Loss Tocado)',
          shortLabel: 'Señal Fallida',
          meaning: 'Stop loss ejecutado. Hipótesis invalidada',
          badgeClass:
            'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/40 shadow-xs shadow-rose-950/30',
          dotClass: 'bg-rose-400',
          icon: AlertTriangle,
          iconColor: 'text-rose-400',
          accentBorder: 'border-rose-500/30',
        };
      case 'Obsoleto':
      default:
        return {
          title: 'Señal Obsoleta (No Activa)',
          shortLabel: 'Señal Obsoleta',
          meaning: 'Estrategia superada o desestimada en hoja',
          badgeClass:
            'bg-neutral-800 hover:bg-neutral-750 text-neutral-400 border-neutral-700',
          dotClass: 'bg-neutral-500',
          icon: Ban,
          iconColor: 'text-neutral-500',
          accentBorder: 'border-neutral-700',
        };
    }
  };

  const config = getSignalConfig();
  const IconComponent = config.icon;

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Visual Badge Trigger */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`rounded-md transition-all flex items-center gap-1.5 border font-mono select-none cursor-pointer ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${config.badgeClass}`}
        title={`${config.title} - Clic para ver desglose de confluencia y estado de la hoja`}
      >
        <div className="flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
          <IconComponent className="w-2.5 h-2.5 shrink-0" />
          <span className="font-bold tracking-tight">{config.shortLabel}</span>
        </div>

        {/* Optional Confluence Score Tag if computed */}
        {confluence && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-black/30 border border-white/10 font-bold opacity-90">
            {confluence.metFactorsCount}/{confluence.totalFactorsCount}
          </span>
        )}

        <ChevronDown className={`w-2.5 h-2.5 opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover con desglose detallado */}
      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-50 mt-1.5 left-0 w-80 sm:w-96 p-3.5 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl text-neutral-200 text-xs backdrop-blur-md ring-1 ring-black/50"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 border-b border-neutral-800 pb-2.5 mb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${config.dotClass}`} />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Confluencia de Estrategia
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                {strategy.nombreEstrategia} ({strategy.noEstrategia})
              </p>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${config.badgeClass}`}
            >
              {rawStatus}
            </span>
          </div>

          {/* Estado de la Hoja de Cálculo */}
          <div className="p-2 rounded-lg bg-neutral-950/70 border border-neutral-800 mb-2.5 flex flex-col gap-1 text-[11px]">
            <div className="flex items-center justify-between text-neutral-400">
              <span>Estado en Hoja de Cálculo:</span>
              <span className="font-bold text-white font-mono">{stageInfo.label}</span>
            </div>
            <div className="text-neutral-300 leading-snug">
              <span className="font-semibold text-amber-400">Significado: </span>
              {stageInfo.meaning}
            </div>
            <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">
              {stageInfo.description}
            </p>
          </div>

          {/* Parámetros Operativos de la Hoja */}
          <div className="grid grid-cols-2 gap-2 mb-2.5 text-[10px] font-mono">
            <div className="p-1.5 rounded bg-neutral-950/50 border border-neutral-800/80">
              <span className="text-neutral-500 block">Par &amp; Temporalidad</span>
              <span className="text-neutral-200 font-bold">{strategy.par} ({strategy.temporalidad})</span>
            </div>
            <div className="p-1.5 rounded bg-neutral-950/50 border border-neutral-800/80">
              <span className="text-neutral-500 block">Tipo de Orden</span>
              <span className="text-neutral-200 font-bold truncate block">{strategy.tipoDeOrden}</span>
            </div>
          </div>

          {/* Desglose de Factores Técnicos de Confluencia (si están evaluados) */}
          {confluence ? (
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold text-neutral-300 mb-1.5 border-t border-neutral-800 pt-2">
                <span>Evaluación Técnica ({confluence.metFactorsCount}/{confluence.totalFactorsCount} Factores)</span>
                <span className="font-mono text-emerald-400">{confluence.confluenceScorePercent}%</span>
              </div>
              <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
                {Object.values(confluence.factors).map((factor) => (
                  <div
                    key={factor.factorKey}
                    className={`px-1.5 py-1 rounded text-[10px] flex items-center justify-between border ${
                      factor.isMet
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-neutral-950/40 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <span className="truncate pr-1">{factor.label}</span>
                    {factor.isMet ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-3 h-3 text-neutral-600 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-neutral-400 italic border-t border-neutral-800 pt-2">
              Los niveles de entrada y TP/SL están alineados con la disciplina de la hoja de cálculo.
            </div>
          )}

          {/* Footer Action tip */}
          <div className="mt-2.5 pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] text-neutral-400">
            <span>Siguiente Paso:</span>
            <span className="text-amber-300 font-semibold">{stageInfo.nextStep}</span>
          </div>
        </div>
      )}
    </div>
  );
};
