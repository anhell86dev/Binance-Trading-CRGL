import React from 'react';
import { StrategyTradeStatus, GoogleSheetStrategyRow } from '../types/strategy';
import { getTradeProcessStageInfo } from '../utils/sheetParser';
import {
  CheckCircle2,
  Clock,
  Radio,
  Zap,
  Ban,
  ChevronRight,
  Sparkles,
  Layers,
} from 'lucide-react';

interface TradeProcessIndicatorProps {
  strategy: GoogleSheetStrategyRow;
  compact?: boolean;
  showProcessStepper?: boolean;
  showStatusSelector?: boolean;
  onStatusChange?: (newStatus: StrategyTradeStatus) => void;
  hasOpenOrders?: boolean;
  hasPosition?: boolean;
}

export const TradeProcessIndicator: React.FC<TradeProcessIndicatorProps> = ({
  strategy,
  compact = false,
  showProcessStepper = false,
  showStatusSelector = false,
  onStatusChange,
  hasOpenOrders = false,
  hasPosition = false,
}) => {
  const currentStatus: StrategyTradeStatus = strategy.estado || 'Activa';
  const stageInfo = getTradeProcessStageInfo(currentStatus, hasOpenOrders, hasPosition);

  // Status Badge Rendering
  const renderStatusBadge = () => {
    switch (currentStatus) {
      case 'Live+':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-950/40"
            title="Live+: Estrategia con Órdenes Generadas y completadas"
          >
            <Zap className="w-3 h-3 text-indigo-400 animate-bounce" />
            <span>Live+</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">• Completadas</span>
          </span>
        );
      case 'Live':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-950/40"
            title="Live: Estrategia con Órdenes Generadas"
          >
            <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
            <span>Live</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">• Órdenes Generadas</span>
          </span>
        );
      case 'Obsoleto':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-neutral-850 text-neutral-400 border border-neutral-700"
            title="Obsoleto: Estrategia No activa"
          >
            <Ban className="w-3 h-3 text-neutral-500" />
            <span>Obsoleto</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">• No activa</span>
          </span>
        );
      case 'Activa':
      default:
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950/40"
            title="Activa: Estrategia para tomar"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Activa</span>
            <span className="text-[10px] opacity-80 hidden sm:inline">• Para tomar</span>
          </span>
        );
    }
  };

  if (compact) {
    return renderStatusBadge();
  }

  return (
    <div className="flex flex-col gap-2.5 p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 text-xs font-sans">
      {/* Top row: Status header & Meaning */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
            Estado del Trade:
          </span>
          {renderStatusBadge()}
          <span className="text-xs font-medium text-neutral-300">
            {stageInfo.meaning}
          </span>
        </div>

        {/* Status Manual Selector if enabled */}
        {showStatusSelector && onStatusChange && (
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800 text-[11px] font-mono">
            <span className="text-neutral-500 px-1 text-[10px]">Cambiar Estado:</span>
            {(['Activa', 'Live', 'Live+', 'Obsoleto'] as StrategyTradeStatus[]).map(st => {
              const isCurr = currentStatus === st;
              return (
                <button
                  key={st}
                  id={`set-status-${strategy.noEstrategia}-${st}`}
                  onClick={() => onStatusChange(st)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    isCurr
                      ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                  }`}
                  title={`Asignar estado "${st}" a ${strategy.noEstrategia}`}
                >
                  {st}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stepper / Timeline: Activa -> Live -> Live+ (or Obsoleto) */}
      {showProcessStepper && (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-850">
          <div className="grid grid-cols-3 gap-2">
            {/* Step 1: Activa */}
            <div
              className={`p-2 rounded-lg border transition-all flex flex-col gap-1 ${
                currentStatus === 'Activa'
                  ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                  : currentStatus === 'Live' || currentStatus === 'Live+'
                  ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
                  : 'bg-neutral-900/40 border-neutral-850 text-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span className="flex items-center gap-1">
                  {currentStatus === 'Live' || currentStatus === 'Live+' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                  Paso 1: Activa
                </span>
                <span className="text-[10px] opacity-75">30%</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">
                Estrategia para tomar. Monitoreo distancias Entrada 1 y 2.
              </span>
            </div>

            {/* Step 2: Live */}
            <div
              className={`p-2 rounded-lg border transition-all flex flex-col gap-1 ${
                currentStatus === 'Live'
                  ? 'bg-amber-950/30 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                  : currentStatus === 'Live+'
                  ? 'bg-neutral-900/80 border-neutral-800 text-neutral-300'
                  : 'bg-neutral-900/40 border-neutral-850 text-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span className="flex items-center gap-1">
                  {currentStatus === 'Live+' ? (
                    <CheckCircle2 className="w-3 h-3 text-amber-400" />
                  ) : currentStatus === 'Live' ? (
                    <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                  ) : (
                    <Clock className="w-3 h-3 text-neutral-500" />
                  )}
                  Paso 2: Live
                </span>
                <span className="text-[10px] opacity-75">60%</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">
                Órdenes generadas en Binance. Esperando fill en soporte.
              </span>
            </div>

            {/* Step 3: Live+ */}
            <div
              className={`p-2 rounded-lg border transition-all flex flex-col gap-1 ${
                currentStatus === 'Live+'
                  ? 'bg-indigo-950/30 border-indigo-500/50 text-indigo-300 ring-1 ring-indigo-500/30'
                  : 'bg-neutral-900/40 border-neutral-850 text-neutral-500'
              }`}
            >
              <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                <span className="flex items-center gap-1">
                  {currentStatus === 'Live+' ? (
                    <Zap className="w-3 h-3 text-indigo-400 animate-bounce" />
                  ) : (
                    <Clock className="w-3 h-3 text-neutral-500" />
                  )}
                  Paso 3: Live+
                </span>
                <span className="text-[10px] opacity-75">90%</span>
              </div>
              <span className="text-[10px] text-neutral-400 leading-tight">
                Órdenes completadas. Posición activa en mercado. Gestión TPs.
              </span>
            </div>
          </div>

          {/* If obsolete flag */}
          {currentStatus === 'Obsoleto' && (
            <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 flex items-center gap-2 text-xs">
              <Ban className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                <strong>Estrategia Obsoleta (No activa):</strong> Esta estrategia ha sido superada por la versión más reciente del par o descartada operativamente. No generar órdenes.
              </span>
            </div>
          )}

          {/* Lifecycle Details & Next Step */}
          <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-neutral-300 flex flex-col gap-1 text-[11px]">
            <div className="text-neutral-300 leading-relaxed">
              <strong className="text-white">Proceso actual: </strong>
              {stageInfo.description}
            </div>
            <div className="text-amber-400/90 font-mono text-[10.5px] pt-1 border-t border-neutral-800/60 flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 text-amber-400" />
              <span>
                <strong className="text-neutral-200">Siguiente hito del trade:</strong>{' '}
                {stageInfo.nextStep}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
