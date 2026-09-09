import React from 'react';
import { PositionRisk } from '../types/binance';
import { TradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import {
  GitBranch,
  ShieldCheck,
  Target,
  AlertTriangle,
  XCircle,
  ArrowRight,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Lock,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

interface TradeMultiPathChronologyProps {
  position: PositionRisk;
  status: TradeStatusAndPhase;
  currentPrice: number;
  onMoveToBE?: () => void;
  onCancelPendingDca?: () => void;
  className?: string;
}

export const TradeMultiPathChronology: React.FC<TradeMultiPathChronologyProps> = ({
  position,
  status,
  currentPrice,
  onMoveToBE,
  onCancelPendingDca,
  className = '',
}) => {
  const isLong = position.positionAmt > 0;
  const {
    entry1Price,
    entry2Price,
    entry3Price,
    tp1Price,
    tp2Price,
    tp3Price,
    slPrice,
    isTp1Hit,
    isTp2Hit,
    isTp3Hit,
    isE2Hit,
    isE3Hit,
    isE2CanceledDueToTp1,
    isE3CanceledDueToTp1,
    isBreakEvenActive,
    isSlHit,
    multiPathState,
    tacticalRuleSummary,
  } = status;

  const fmt = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toFixed(2);
    if (p >= 0.01) return p.toFixed(4);
    return p.toFixed(6);
  };

  // Calculate percentage distances
  const calcDist = (targetPrice: number) => {
    if (!targetPrice || !currentPrice || currentPrice <= 0) return 0;
    return ((targetPrice - currentPrice) / currentPrice) * 100;
  };

  const distToTp1 = Math.abs(calcDist(tp1Price));
  const distToE2 = Math.abs(calcDist(entry2Price));
  const distToSl = Math.abs(calcDist(slPrice));

  return (
    <div
      id={`multi-path-chronology-${position.symbol}`}
      className={`rounded-xl border border-neutral-800 bg-neutral-950/90 p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-md ${className}`}
    >
      {/* 1. Header Táctico y Estado del Camino */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Cronología del Trade: Camino con Múltiples Caminos
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
                {position.symbol} • {isLong ? 'LONG' : 'SHORT'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Bifurcación dinámica: <strong className="text-amber-300">E1 ➔ [TP1 o E2]</strong> según Reglas de Ejecución Táctica de la hoja de Órdenes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {multiPathState === 'TP1_ROUTE_DCA_CANCELED' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1 shadow-xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Ruta TP1 Activa (X=E2 Cancelada)</span>
            </span>
          )}
          {multiPathState === 'E2_ROUTE_ACTIVE' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1 shadow-xs">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Ruta Retroceso DCA E2 Activa</span>
            </span>
          )}
          {multiPathState === 'DUAL_PATH_ACTIVE' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-sky-950 text-sky-300 border border-sky-600 flex items-center gap-1 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Bifurcación Abierta: E1 ⇄ [TP1 | E2]</span>
            </span>
          )}
          {multiPathState === 'SL_ROUTE_HIT' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-950 text-rose-300 border border-rose-600 flex items-center gap-1 shadow-xs">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Ruta SL Impactada</span>
            </span>
          )}
        </div>
      </div>

      {/* 2. Banner de Regla Táctica Institucional (Hoja de Órdenes) */}
      <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-[11px] flex items-start gap-2.5">
        <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-neutral-300 leading-relaxed">
          <div className="font-bold text-white flex items-center gap-1.5 mb-0.5">
            <span className="text-amber-400">Reglas de Ejecución Táctica & Disciplina del Trade:</span>
            <span className="text-[10px] text-neutral-400 font-normal">
              (Hoja de Órdenes / Estrategia {status.linkedStrategyId || position.symbol})
            </span>
          </div>
          <p className="text-neutral-300 text-[11px]">
            {tacticalRuleSummary}
          </p>
        </div>
      </div>

      {/* 3. Diagrama Visual de Múltiples Caminos (Decision Flowchart) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        
        {/* NODO CENTRAL INICIAL: E1 (Entrada Ejecutada) */}
        <div className="lg:col-span-3 flex flex-col justify-center">
          <div className="p-3 rounded-xl bg-neutral-900 border-2 border-sky-500/60 flex flex-col gap-2 relative shadow-md">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono font-bold text-[10px] border border-sky-500/40">
                Paso 1: Punto de Partida
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>

            <div className="flex flex-col">
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>[E1] Entrada Inicial</span>
              </div>
              <div className="text-base font-mono font-bold text-sky-300 mt-0.5">
                ${fmt(entry1Price)}
              </div>
              <div className="text-[10px] font-mono text-neutral-400">
                Asignación: <strong className="text-white">100% de E1</strong> (50% de cupo total)
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 text-[10px] text-neutral-300 flex items-center justify-between font-mono">
              <span>Precio Actual:</span>
              <strong className="text-amber-400">${fmt(currentPrice)}</strong>
            </div>

            {/* Conector lateral derecho a la bifurcación */}
            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-neutral-600"></div>
          </div>
        </div>

        {/* BIFURCACIÓN DE RUTAS (CAMINO A: FAVORABLE / CAMINO B: RETROCESO DCA) */}
        <div className="lg:col-span-9 flex flex-col gap-3">
          
          {/* ================= CAMINO A: TRAYECTORIA FAVORABLE A TP1 ================= */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isTp1Hit
                ? 'bg-emerald-950/30 border-emerald-500/50 shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-emerald-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>CAMINO A: Ruta Favorable hacia Objetivos</span>
              </div>
              {isTp1Hit ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                  ✓ TP1 ALCANZADO (50% Ganancia Tomada)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                  Distancia: {distToTp1.toFixed(2)}% al objetivo
                </span>
              )}
            </div>

            {/* Fila de Nodos del Camino A */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
              {/* Nodo TP1 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  isTp1Hit
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-inner'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    [TP1] Objetivo 1
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-emerald-900/60 text-emerald-300">
                    50% Parcial
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-white">
                  ${fmt(tp1Price)}
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {isTp1Hit ? '✓ Ganancia Ejecutada' : `Faltan ${distToTp1.toFixed(2)}%`}
                </div>
              </div>

              {/* Nodo TP2 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  isTp2Hit
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    [TP2] Maximización
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                    30% Swing
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-white">
                  ${fmt(tp2Price)}
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {isTp2Hit ? '✓ TP2 Logrado' : isTp1Hit ? 'En ruta con Trailing' : 'Requiere TP1 previo'}
                </div>
              </div>

              {/* Nodo TP3 Final */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col gap-1 ${
                  isTp3Hit
                    ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    [TP3] Objetivo Final
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                    20% Runner
                  </span>
                </div>
                <div className="font-mono font-bold text-sm text-white">
                  ${fmt(tp3Price)}
                </div>
                <div className="text-[10px] font-mono text-neutral-400">
                  {isTp3Hit ? '🏆 Trade Completado 100%' : 'Resistencia Mayor'}
                </div>
              </div>
            </div>

            {/* ACCIÓN CONSECUENCIA DE TP1 (REGLA TÁCTICA INSTITUCIONAL): CANCELACIÓN DE E2 Y BREAK-EVEN */}
            {isTp1Hit && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-neutral-900/90 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-[11px] text-neutral-300">
                    <strong className="text-white">Consecuencia Táctica de TP1 Activada:</strong>
                    <div className="text-[10.5px] text-neutral-300 mt-0.5">
                      1. La orden <span className="text-rose-400 font-bold font-mono">X = E2 queda eliminada/cancelada</span> de la hoja de Órdenes.
                      <br />
                      2. El Stop Loss debe estar blindado en <strong className="text-emerald-400 font-mono">Break-Even (${fmt(entry1Price)})</strong>.
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {onMoveToBE && (
                    <button
                      type="button"
                      onClick={onMoveToBE}
                      disabled={isBreakEvenActive}
                      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                        isBreakEvenActive
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 active:scale-95'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      <span>{isBreakEvenActive ? '✓ Blindado en BE' : `Mover a BE ($${fmt(entry1Price)})`}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ================= CAMINO B: RETROCESO A DCA (E2 & E3) ================= */}
          <div
            className={`p-3 rounded-xl border transition-all ${
              isE2CanceledDueToTp1
                ? 'bg-neutral-950/60 border-neutral-800/80 opacity-80'
                : isE2Hit
                ? 'bg-amber-950/30 border-amber-500/50'
                : 'bg-neutral-900/60 border-neutral-800 hover:border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                <span>CAMINO B: Retroceso Táctico a Zonas DCA</span>
              </div>
              
              {isE2CanceledDueToTp1 ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-mono font-bold flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span>X = E2 & X = E3 ELIMINADAS (TP1 tocado antes)</span>
                </span>
              ) : isE2Hit ? (
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
                  ⚡ E2 EJECUTADA (DCA Promediado)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                  Distancia: {distToE2.toFixed(2)}% al soporte E2
                </span>
              )}
            </div>

            {/* Nodos de DCA E2 y E3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px]">
              {/* NODO E2 (CON INDICADOR CLARO DE X=E2 SI TP1 TOCADO) */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                  isE2CanceledDueToTp1
                    ? 'bg-rose-950/20 border-rose-800/60 text-rose-300 line-through'
                    : isE2Hit
                    ? 'bg-amber-950/70 border-amber-500 text-amber-200 shadow-inner'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1 ${isE2CanceledDueToTp1 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {isE2CanceledDueToTp1 ? (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>[X = E2] Eliminada</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>[E2] Entrada 2 DCA</span>
                      </>
                    )}
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                    30% Carga
                  </span>
                </div>

                <div className="font-mono font-bold text-sm text-white">
                  ${fmt(entry2Price)}
                </div>

                <div className="text-[10px] font-mono">
                  {isE2CanceledDueToTp1 ? (
                    <span className="text-rose-400 no-underline font-semibold">
                      ❌ Cancelada por Regla Táctica (TP1 tocado primero)
                    </span>
                  ) : isE2Hit ? (
                    <span className="text-amber-300">
                      ⚡ Ejecutada • Precio promedio mejorado
                    </span>
                  ) : (
                    <span className="text-neutral-400">
                      Soporte pendiente a {distToE2.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>

              {/* NODO E3 */}
              <div
                className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                  isE3CanceledDueToTp1
                    ? 'bg-rose-950/20 border-rose-800/60 text-rose-300 line-through'
                    : isE3Hit
                    ? 'bg-purple-950/70 border-purple-500 text-purple-200'
                    : 'bg-neutral-900 border-neutral-800 text-neutral-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-bold flex items-center gap-1 ${isE3CanceledDueToTp1 ? 'text-rose-400' : 'text-purple-400'}`}>
                    {isE3CanceledDueToTp1 ? (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>[X = E3] Eliminada</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3 text-purple-400" />
                        <span>[E3] Entrada 3 Carga Máx</span>
                      </>
                    )}
                  </span>
                  <span className="text-[9px] font-mono px-1 rounded bg-neutral-800 text-neutral-400">
                    20% Cupo
                  </span>
                </div>

                <div className="font-mono font-bold text-sm text-white">
                  ${fmt(entry3Price)}
                </div>

                <div className="text-[10px] font-mono">
                  {isE3CanceledDueToTp1 ? (
                    <span className="text-rose-400 no-underline font-semibold">
                      ❌ Cancelada por Regla Táctica
                    </span>
                  ) : isE3Hit ? (
                    <span className="text-purple-300 font-semibold">
                      ⚡ Carga Institucional 100% (Esperar rebote)
                    </span>
                  ) : (
                    <span className="text-neutral-400">
                      Nivel de respaldo antes de invalidación
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================= NODO DE INVALIDACIÓN ESTRICTA: STOP LOSS ================= */}
          <div
            className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 text-[11px] ${
              isSlHit
                ? 'bg-rose-950/80 border-rose-600 text-rose-200'
                : 'bg-neutral-900/50 border-neutral-800 text-neutral-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${isSlHit ? 'text-rose-400 animate-pulse' : 'text-rose-500/80'}`} />
              <div>
                <span className="font-bold text-rose-400 font-mono">[SL] Stop Loss Global: </span>
                <span className="font-mono font-bold text-white">${fmt(slPrice)}</span>
                <span className="text-neutral-500 font-mono ml-2">
                  ({distToSl.toFixed(2)}% de distancia de seguridad)
                </span>
              </div>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-neutral-300">
              {isBreakEvenActive ? 'Blindado con BE' : 'Invalidación Estricta'}
            </span>
          </div>

        </div>
      </div>
    </div>
  );
};
