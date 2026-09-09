import React from 'react';
import { PositionRisk } from '../types/binance';
import { TradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import {
  GitBranch,
  ShieldCheck,
  ShieldAlert,
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
  MapPin,
  ChevronRight,
  HelpCircle,
  Compass,
} from 'lucide-react';

interface TradeDecisionFlowDiagramProps {
  position: PositionRisk;
  status: TradeStatusAndPhase;
  currentPrice: number;
  onMoveToBE?: () => void;
  className?: string;
}

export const TradeDecisionFlowDiagram: React.FC<TradeDecisionFlowDiagramProps> = ({
  position,
  status,
  currentPrice,
  onMoveToBE,
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

  const calcDist = (targetPrice: number) => {
    if (!targetPrice || !currentPrice || currentPrice <= 0) return 0;
    return ((targetPrice - currentPrice) / currentPrice) * 100;
  };

  const distToTp1 = Math.abs(calcDist(tp1Price));
  const distToTp2 = Math.abs(calcDist(tp2Price));
  const distToE2 = Math.abs(calcDist(entry2Price));
  const distToSl = Math.abs(calcDist(slPrice));

  // Determine current active point
  let activePointId: 'E1_TRAJECTORY' | 'TP1' | 'TP2' | 'TP3' | 'E2' | 'E3' | 'SL' = 'E1_TRAJECTORY';
  let activePointLabel = 'Entre E1 y [TP1 / E2]';
  let activePointBadge = 'Fase 2: Monitoreo';
  let activePointBadgeClass = 'bg-sky-950 text-sky-300 border-sky-700';

  if (isSlHit) {
    activePointId = 'SL';
    activePointLabel = 'Punto SL: Stop Loss Impactado (Invalidación)';
    activePointBadge = 'SL ACTIVADO';
    activePointBadgeClass = 'bg-rose-950 text-rose-300 border-rose-700';
  } else if (isTp3Hit) {
    activePointId = 'TP3';
    activePointLabel = 'Punto TP3: Objetivo Final Alcanzado (100% Cerrado)';
    activePointBadge = 'TP3 FINAL';
    activePointBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-600';
  } else if (isTp2Hit) {
    activePointId = 'TP2';
    activePointLabel = 'Punto TP2: Maximización Alcanzada (En Trailing Stop hacia TP3)';
    activePointBadge = 'TP2 ALCANZADO';
    activePointBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-600';
  } else if (isTp1Hit) {
    activePointId = 'TP1';
    activePointLabel = 'Punto TP1: 50% Tomado • [X=E2 Cancelada] • Break-Even Activo';
    activePointBadge = 'TP1 ALCANZADO (X=E2 ❌)';
    activePointBadgeClass = 'bg-emerald-950 text-emerald-300 border-emerald-600';
  } else if (isE3Hit) {
    activePointId = 'E3';
    activePointLabel = 'Punto E3: Carga Máxima 100% Ejecutada (Esperar Rebote o SL)';
    activePointBadge = 'E3 DCA MÁXIMO';
    activePointBadgeClass = 'bg-purple-950 text-purple-300 border-purple-700';
  } else if (isE2Hit) {
    activePointId = 'E2';
    activePointLabel = 'Punto E2: DCA Ejecutado (Promedio Reajustado hacia TP1)';
    activePointBadge = 'E2 DCA ACTIVO';
    activePointBadgeClass = 'bg-amber-950 text-amber-300 border-amber-700';
  } else {
    activePointId = 'E1_TRAJECTORY';
    activePointLabel = 'Punto E1: Entrada Completada • En Bifurcación [TP1 o E2]';
    activePointBadge = 'E1 EN CURSO';
    activePointBadgeClass = 'bg-sky-950 text-sky-300 border-sky-700';
  }

  return (
    <div
      id={`decision-flow-diagram-${position.symbol}`}
      className={`rounded-xl border border-neutral-800 bg-neutral-950/95 p-3.5 sm:p-4.5 flex flex-col gap-3.5 shadow-lg ${className}`}
    >
      {/* 1. CABECERA: TÍTULO DEL DIAGRAMA DE PASOS & PUNTO ACTUAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <Compass className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                Diagrama de Flujo de Decisión del Trade (Google Sheets)
              </h4>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
                {position.symbol} • {isLong ? 'LONG' : 'SHORT'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Visualización interactiva paso a paso del camino táctico. Identifica en qué punto exacto se encuentra la posición.
            </p>
          </div>
        </div>

        {/* Badge "ESTÁS AQUÍ" */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shadow-xs ${activePointBadgeClass}`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
            </span>
            <div className="flex flex-col font-mono text-[10px] leading-tight">
              <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">PUNTO ACTUAL</span>
              <span className="font-bold">{activePointBadge}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BANNER INTERACTIVO: "📍 ESTÁS AQUÍ SEGÚN LA LÓGICA DE GOOGLE SHEET" */}
      <div className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-[11.5px] text-neutral-200">
            <div className="font-bold text-white flex items-center gap-1.5">
              <span className="text-amber-400">Punto Activo del Flujo:</span>
              <span className="font-mono text-amber-300">{activePointLabel}</span>
            </div>
            <div className="text-neutral-400 text-[10.5px] font-mono mt-0.5 flex items-center gap-2 flex-wrap">
              <span>Precio LIVE: <strong className="text-white">${fmt(currentPrice)}</strong></span>
              <span>•</span>
              <span>Precio Entrada (E1): <strong className="text-sky-300">${fmt(entry1Price)}</strong></span>
              <span>•</span>
              {activePointId === 'TP1' || isTp1Hit ? (
                <span className="text-emerald-400 font-bold">Ruta Favorable Avanzada ➔ Siguiente: TP2 (${fmt(tp2Price)})</span>
              ) : activePointId === 'E2' ? (
                <span className="text-amber-400 font-bold">Ruta DCA Ejecutada ➔ Esperando Rebote a TP1</span>
              ) : (
                <span>Dist. a TP1: <strong className="text-emerald-400">{distToTp1.toFixed(2)}%</strong> | Dist. a E2: <strong className="text-amber-400">{distToE2.toFixed(2)}%</strong></span>
              )}
            </div>
          </div>
        </div>

        {/* Botón rápido si TP1 alcanzado para Break-Even */}
        {isTp1Hit && (
          <div className="shrink-0">
            <button
              type="button"
              onClick={onMoveToBE}
              disabled={isBreakEvenActive}
              className={`px-3 py-1 rounded text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isBreakEvenActive
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 shadow-xs active:scale-95'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>{isBreakEvenActive ? '✓ Blindado en BE ($' + fmt(entry1Price) + ')' : 'Mover a BE ($' + fmt(entry1Price) + ')'}</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. DIAGRAMA DE PASOS SECUENCIAL Y BIFURCADO (STEP FLOWCHART PIPELINE) */}
      <div className="flex flex-col gap-4 pt-1">
        
        {/* ================= PASO 1: ENTRADA E1 (PUNTO DE PARTIDA) ================= */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Nodo E1 */}
          <div
            className={`p-3 rounded-xl border flex-1 transition-all relative ${
              activePointId === 'E1_TRAJECTORY'
                ? 'bg-sky-950/40 border-sky-500 ring-1 ring-sky-500/50 shadow-sm'
                : 'bg-neutral-900/90 border-neutral-700 text-neutral-300'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 text-[10px] font-bold font-mono flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Paso 1: Entrada Inicial (E1)
                </span>
              </div>

              {activePointId === 'E1_TRAJECTORY' ? (
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                  PUNTO DE PARTIDA ACTIVO
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  COMPLETADO
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-neutral-400 text-[10px]">Precio de Entrada: </span>
                <strong className="text-sky-300 text-sm font-bold">${fmt(entry1Price)}</strong>
              </div>
              <div className="text-[10px] text-neutral-400 text-right">
                Cupo Hoja: <strong className="text-white">50% Tamaño Total</strong> (100% E1)
              </div>
            </div>
          </div>
        </div>

        {/* INDICADOR DE BIFURCACIÓN (DECISION FORK) */}
        <div className="flex items-center justify-center my-0.5 relative">
          <div className="h-px bg-neutral-800 w-full absolute"></div>
          <div className="relative px-3 py-1 rounded-full bg-neutral-900 border border-neutral-700 text-[10.5px] font-mono font-bold text-neutral-300 flex items-center gap-1.5 shadow-xs z-10">
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>BIFURCACIÓN DE DECISIÓN GOOGLE SHEET: ¿Hacia dónde se mueve el precio desde E1?</span>
          </div>
        </div>

        {/* ================= BIFURCACIÓN EN 2 CAMINOS: CAMINO A (FAVORABLE) Y CAMINO B (DCA) ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          
          {/* ================= CAMINO A: RUTA FAVORABLE HACIA TAKE PROFITS ================= */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col gap-3 transition-all ${
              isTp1Hit || isTp2Hit || isTp3Hit
                ? 'bg-emerald-950/20 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/20'
                : 'bg-neutral-900/60 border-neutral-800 opacity-90'
            }`}
          >
            {/* Header Camino A */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                <span>Camino A: Ruta Favorable (Objetivos TP)</span>
              </div>
              {isTp1Hit ? (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>CAMINO EN CURSO</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-400">
                  A {distToTp1.toFixed(2)}% de TP1
                </span>
              )}
            </div>

            {/* PASO 2A: TP1 OBJETIVO */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                activePointId === 'TP1'
                  ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40 shadow-sm'
                  : isTp1Hit
                  ? 'bg-emerald-950/40 border-emerald-600/60 text-emerald-200'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold font-mono flex items-center justify-center">
                    2A
                  </span>
                  <span className="font-bold text-xs text-emerald-400 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Paso 2A: TP1 Objetivo (50% Parcial)
                  </span>
                </div>

                {activePointId === 'TP1' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500 text-neutral-950 flex items-center gap-1 animate-pulse">
                    <MapPin className="w-2.5 h-2.5" />
                    ESTÁS AQUÍ
                  </span>
                )}
                {!isTp1Hit && (
                  <span className="text-[9px] font-mono text-neutral-400">
                    Faltan {distToTp1.toFixed(2)}%
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono mt-0.5">
                <div>
                  <span className="text-neutral-400 text-[10px]">Precio TP1: </span>
                  <strong className="text-white text-sm">${fmt(tp1Price)}</strong>
                </div>
                <div className="text-[10px] font-mono text-emerald-300 font-semibold">
                  {isTp1Hit ? '✓ Ganancia Asegurada' : 'Toma parcial del 50% de volumen'}
                </div>
              </div>
            </div>

            {/* CONSECUENCIA DIRECTA DE TP1 (REGLA DE EJECUCIÓN GOOGLE SHEET) */}
            <div className={`p-2.5 rounded-lg border text-[10.5px] font-mono flex flex-col gap-1.5 transition-all ${
              isTp1Hit
                ? 'bg-neutral-900/95 border-emerald-500/50 shadow-xs'
                : 'bg-neutral-950/60 border-neutral-800 text-neutral-500'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Regla Táctica Google Sheet al tocar TP1:</span>
              </div>
              <div className="text-neutral-300 text-[10px] leading-relaxed">
                • <strong className="text-rose-400 font-mono">[X = E2] y [X = E3] CANCELADAS</strong>: Se eliminan órdenes límite de compra para no operar contra-tendencia.
                <br />
                • <strong className="text-emerald-400 font-mono">[BREAK-EVEN OBLIGATORIO]</strong>: Trasladar Stop Loss a costo (${fmt(entry1Price)}) para riesgo cero.
              </div>
            </div>

            {/* PASO 3A: TP2 MAXIMIZACIÓN */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${
                activePointId === 'TP2'
                  ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40'
                  : isTp2Hit
                  ? 'bg-emerald-950/40 border-emerald-600/60'
                  : 'bg-neutral-900/80 border-neutral-800/80 text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-neutral-800 text-neutral-300 text-[9px] font-bold font-mono flex items-center justify-center">
                    3A
                  </span>
                  <span className="font-bold text-xs text-neutral-300 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    Paso 3A: TP2 Maximización (30% Swing)
                  </span>
                </div>
                {activePointId === 'TP2' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500 text-neutral-950 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    ESTÁS AQUÍ
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-neutral-500 text-[10px]">Precio TP2: </span>
                  <strong className="text-white">${fmt(tp2Price)}</strong>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isTp2Hit ? '✓ Alcanzado' : isTp1Hit ? `Distancia: ${distToTp2.toFixed(2)}%` : 'Requiere TP1'}
                </div>
              </div>
            </div>

            {/* PASO 4A: TP3 OBJETIVO FINAL */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${
                activePointId === 'TP3'
                  ? 'bg-emerald-950/80 border-emerald-400 ring-2 ring-emerald-500/40'
                  : isTp3Hit
                  ? 'bg-emerald-950/40 border-emerald-600/60'
                  : 'bg-neutral-900/80 border-neutral-800/80 text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-neutral-800 text-neutral-300 text-[9px] font-bold font-mono flex items-center justify-center">
                    4A
                  </span>
                  <span className="font-bold text-xs text-neutral-300 flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    Paso 4A: TP3 Objetivo Final (20% Runner)
                  </span>
                </div>
                {activePointId === 'TP3' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-emerald-500 text-neutral-950 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    ESTÁS AQUÍ
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-neutral-500 text-[10px]">Precio TP3: </span>
                  <strong className="text-white">${fmt(tp3Price)}</strong>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isTp3Hit ? '🏆 Salida 100% Exitosa' : 'Resistencia Mayor'}
                </div>
              </div>
            </div>
          </div>

          {/* ================= CAMINO B: RUTA DE RETROCESO A DCA ================= */}
          <div
            className={`p-3.5 rounded-xl border flex flex-col gap-3 transition-all ${
              isE2CanceledDueToTp1
                ? 'bg-neutral-950/60 border-neutral-800/80 opacity-70'
                : isE2Hit || isE3Hit
                ? 'bg-amber-950/20 border-amber-500/60 ring-1 ring-amber-500/20'
                : 'bg-neutral-900/60 border-neutral-800'
            }`}
          >
            {/* Header Camino B */}
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800/80">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 uppercase tracking-wider">
                <ArrowDownRight className="w-4 h-4 text-amber-400" />
                <span>Camino B: Ruta de Retroceso (Zonas DCA)</span>
              </div>

              {isE2CanceledDueToTp1 ? (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span>X=E2 CANCELADA</span>
                </span>
              ) : isE2Hit ? (
                <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1">
                  <Layers className="w-3 h-3 text-amber-400" />
                  <span>CAMINO EN CURSO</span>
                </span>
              ) : (
                <span className="text-[10px] font-mono text-neutral-400">
                  A {distToE2.toFixed(2)}% de soporte
                </span>
              )}
            </div>

            {/* PASO 2B: E2 DCA RECARGA */}
            <div
              className={`p-2.5 rounded-lg border flex flex-col gap-1 transition-all ${
                isE2CanceledDueToTp1
                  ? 'bg-rose-950/20 border-rose-800/60 text-rose-300 line-through'
                  : activePointId === 'E2'
                  ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                  : isE2Hit
                  ? 'bg-amber-950/40 border-amber-600/60'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[9px] font-bold font-mono flex items-center justify-center">
                    2B
                  </span>
                  <span className={`font-bold text-xs flex items-center gap-1 ${isE2CanceledDueToTp1 ? 'text-rose-400' : 'text-amber-400'}`}>
                    {isE2CanceledDueToTp1 ? (
                      <>
                        <XCircle className="w-3 h-3 text-rose-400" />
                        <span>Paso 2B: [X = E2] Eliminada</span>
                      </>
                    ) : (
                      <>
                        <Layers className="w-3 h-3 text-amber-400" />
                        <span>Paso 2B: Entrada 2 DCA (30% Cupo)</span>
                      </>
                    )}
                  </span>
                </div>

                {activePointId === 'E2' && !isE2CanceledDueToTp1 && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500 text-neutral-950 flex items-center gap-1 animate-pulse">
                    <MapPin className="w-2.5 h-2.5" />
                    ESTÁS AQUÍ
                  </span>
                )}
                {isE2CanceledDueToTp1 && (
                  <span className="text-[9px] font-mono text-rose-400 no-underline font-semibold">
                    ❌ Anulada por TP1 previo
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs font-mono mt-0.5">
                <div>
                  <span className="text-neutral-400 text-[10px]">Precio E2: </span>
                  <strong className="text-white text-sm">${fmt(entry2Price)}</strong>
                </div>
                <div className="text-[10px] font-mono">
                  {isE2CanceledDueToTp1 ? (
                    <span className="text-rose-400 no-underline">Cancelada según Google Sheet</span>
                  ) : isE2Hit ? (
                    <span className="text-amber-300 font-bold">⚡ Ejecutada • Promediada</span>
                  ) : (
                    <span className="text-neutral-400">Soporte a {distToE2.toFixed(2)}%</span>
                  )}
                </div>
              </div>
            </div>

            {/* PASO 3B: E3 CARGA MÁXIMA */}
            <div
              className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${
                isE3CanceledDueToTp1
                  ? 'bg-rose-950/10 border-rose-800/40 text-rose-300 line-through'
                  : activePointId === 'E3'
                  ? 'bg-purple-950/80 border-purple-400 ring-2 ring-purple-500/40'
                  : isE3Hit
                  ? 'bg-purple-950/40 border-purple-600/60'
                  : 'bg-neutral-900/80 border-neutral-800/80 text-neutral-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-4.5 h-4.5 rounded-full bg-neutral-800 text-neutral-300 text-[9px] font-bold font-mono flex items-center justify-center">
                    3B
                  </span>
                  <span className="font-bold text-xs text-neutral-300 flex items-center gap-1">
                    <Layers className="w-3 h-3 text-purple-400" />
                    Paso 3B: Entrada 3 Carga Máx (20% Cupo)
                  </span>
                </div>
                {activePointId === 'E3' && !isE3CanceledDueToTp1 && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-purple-500 text-white flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    ESTÁS AQUÍ
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-neutral-500 text-[10px]">Precio E3: </span>
                  <strong className="text-white">${fmt(entry3Price)}</strong>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isE3CanceledDueToTp1 ? '❌ Cancelada por TP1' : isE3Hit ? '⚡ 100% Carga' : 'Soporte Extremo'}
                </div>
              </div>
            </div>

            {/* AVISO DE RE-ENRUTAMIENTO DESDE E2 */}
            <div className="p-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[10px] font-mono text-neutral-300">
              <span className="text-amber-400 font-bold">Lógica de Re-enrutamiento:</span> Si se ejecuta E2 o E3 antes de TP1, el nuevo precio promedio buscará salir en TP1 re-enrutado o cortar en SL.
            </div>
          </div>
        </div>

        {/* ================= NODO GLOBAL DE INVALIDACIÓN: STOP LOSS ================= */}
        <div
          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all ${
            activePointId === 'SL'
              ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/40 shadow-sm'
              : 'bg-neutral-900/80 border-neutral-800 text-neutral-400'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <span>Punto de Invalidación: Stop Loss Global (Disciplina #8)</span>
                {activePointId === 'SL' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-rose-500 text-white animate-pulse">
                    ESTÁS AQUÍ (SL IMPACTADO)
                  </span>
                )}
              </div>
              <div className="text-[10.5px] font-mono text-neutral-300 mt-0.5">
                Nivel SL: <strong className="text-white">${fmt(slPrice)}</strong>
                <span className="text-neutral-500 ml-2">({distToSl.toFixed(2)}% de distancia de seguridad)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-neutral-300">
              {isBreakEvenActive ? '🛡️ Blindado con BE' : 'Invalidación Estricta'}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
};
