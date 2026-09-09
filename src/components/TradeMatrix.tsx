import React, { useState, useMemo } from 'react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { TradeStatusAndPhase, getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import {
  GitBranch,
  Target,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Lock,
  Layers,
  Activity,
  Zap,
  Clock,
  Sparkles,
  DollarSign,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

export interface TradeMatrixProps {
  position: PositionRisk;
  status?: TradeStatusAndPhase;
  currentPrice?: number;
  openOrders?: OpenOrder[];
  onMoveToBE?: () => void;
  onCancelPendingDca?: () => void;
  className?: string;
  hideHeader?: boolean;
}

type ScenarioFilter = 'ALL' | 'TP_PROFIT' | 'DCA_REBOUND' | 'SL_PROTECT';

interface MatrixNodeData {
  id: string;
  code: string;
  name: string;
  category: 'ENTRY' | 'PROFIT' | 'DCA' | 'PROTECTION' | 'EXIT';
  price: number;
  allocationPercent?: number;
  status: 'EXECUTED' | 'ACTIVE' | 'PENDING' | 'CANCELED' | 'TRIGGERED';
  actionTrigger?: string;
  exitType?: string;
  pnlUsd?: number;
  roePercent?: number;
  description: string;
}

export const TradeMatrix: React.FC<TradeMatrixProps> = ({
  position,
  status: initialStatus,
  currentPrice: initialCurrentPrice,
  openOrders = [],
  onMoveToBE,
  onCancelPendingDca,
  className = '',
  hideHeader = false,
}) => {
  const isLong = position.positionAmt > 0;
  const qty = Math.abs(position.positionAmt || 0);
  const leverage = position.leverage || 5;

  // Resolve status and current price
  const status: TradeStatusAndPhase = useMemo(() => {
    if (initialStatus) return initialStatus;
    return getTradeStatusAndPhase(position, openOrders);
  }, [initialStatus, position, openOrders]);

  const currentPrice = useMemo(() => {
    if (initialCurrentPrice && initialCurrentPrice > 0) return initialCurrentPrice;
    return position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1);
  }, [initialCurrentPrice, position]);

  const [activeScenario, setActiveScenario] = useState<ScenarioFilter>('ALL');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>('E1');

  // Destructure prices & hit flags
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

  const fmt = (val: number | undefined) => {
    if (!val || isNaN(val)) return '0.00';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(2);
    if (val >= 0.01) return val.toFixed(4);
    return val.toFixed(6);
  };

  const calcDist = (targetPrice: number) => {
    if (!targetPrice || !currentPrice || currentPrice <= 0) return 0;
    return ((targetPrice - currentPrice) / currentPrice) * 100;
  };

  const calcPnl = (targetPrice: number, fractionOfPos = 1) => {
    if (!entry1Price || !targetPrice) return { pnl: 0, roe: 0 };
    const priceDiff = isLong ? targetPrice - entry1Price : entry1Price - targetPrice;
    const pnl = priceDiff * qty * fractionOfPos;
    const roe = (priceDiff / entry1Price) * leverage * 100;
    return { pnl, roe };
  };

  // Build matrix nodes
  const nodes: Record<string, MatrixNodeData> = useMemo(() => {
    const e1 = {
      id: 'E1',
      code: 'E1',
      name: 'Entrada Inicial',
      category: 'ENTRY' as const,
      price: entry1Price,
      allocationPercent: 50,
      status: 'EXECUTED' as const,
      description: 'Entrada táctica principal ejecutada al precio de confirmación.',
      actionTrigger: 'Desencadena órdenes OCO condicionadas de TP1 y DCA E2.',
    };

    const tp1Pnl = calcPnl(tp1Price, 0.5);
    const tp1 = {
      id: 'TP1',
      code: 'TP1',
      name: 'Toma Parcial 50%',
      category: 'PROFIT' as const,
      price: tp1Price,
      allocationPercent: 50,
      status: isTp1Hit ? ('EXECUTED' as const) : ('PENDING' as const),
      pnlUsd: tp1Pnl.pnl,
      roePercent: tp1Pnl.roe,
      actionTrigger: 'Regla Obligatoria: 1) Cancelar X=E2 y X=E3. 2) Mover SL a Break-Even ($' + fmt(entry1Price) + ').',
      description: 'Primer hito de desriesgo: bloquea el 50% de las ganancias proyectadas.',
    };

    const tp2Pnl = calcPnl(tp2Price, 0.3);
    const tp2 = {
      id: 'TP2',
      code: 'TP2',
      name: 'Swing Runner 30%',
      category: 'PROFIT' as const,
      price: tp2Price,
      allocationPercent: 30,
      status: isTp2Hit ? ('EXECUTED' as const) : isTp1Hit ? ('ACTIVE' as const) : ('PENDING' as const),
      pnlUsd: tp2Pnl.pnl,
      roePercent: tp2Pnl.roe,
      actionTrigger: 'Trailing Stop activado con protección asegurada en nivel TP1.',
      description: 'Ampliación de recorrido para capitalizar momentum institucional.',
    };

    const tp3Pnl = calcPnl(tp3Price, 0.2);
    const tp3 = {
      id: 'TP3',
      code: 'TP3',
      name: 'Salida Final 20%',
      category: 'PROFIT' as const,
      price: tp3Price,
      allocationPercent: 20,
      status: isTp3Hit ? ('EXECUTED' as const) : isTp2Hit ? ('ACTIVE' as const) : ('PENDING' as const),
      pnlUsd: tp3Pnl.pnl,
      roePercent: tp3Pnl.roe,
      actionTrigger: 'Cierre total del 100% de la posición en resistencia mayor.',
      description: 'Límite máximo del ratio riesgo-beneficio proyectado en Google Sheets.',
    };

    const exitProfit = {
      id: 'EXIT_PROFIT',
      code: 'SALIDA-MAX',
      name: 'Salida Ganadora Total',
      category: 'EXIT' as const,
      price: tp3Price,
      status: isTp3Hit ? ('EXECUTED' as const) : ('PENDING' as const),
      exitType: 'GANANCIA INSTITUCIONAL COMPLETA',
      description: 'Ciclo completado con éxito sin riesgo de mercado remanente.',
    };

    const e2 = {
      id: 'E2',
      code: 'E2',
      name: 'DCA Nivel 1 (30%)',
      category: 'DCA' as const,
      price: entry2Price,
      allocationPercent: 30,
      status: isE2CanceledDueToTp1
        ? ('CANCELED' as const)
        : isE2Hit
        ? ('EXECUTED' as const)
        : ('PENDING' as const),
      actionTrigger: isE2CanceledDueToTp1
        ? 'CANCELADA: El precio tocó TP1 primero. Orden X=E2 eliminada según disciplina.'
        : 'Mejora de precio promedio ponderado en soporte intradía.',
      description: 'Primera zona de absorción si el precio retrocede antes de tocar TP1.',
    };

    const e3 = {
      id: 'E3',
      code: 'E3',
      name: 'DCA Nivel 2 (20%)',
      category: 'DCA' as const,
      price: entry3Price,
      allocationPercent: 20,
      status: isE3CanceledDueToTp1
        ? ('CANCELED' as const)
        : isE3Hit
        ? ('EXECUTED' as const)
        : ('PENDING' as const),
      actionTrigger: isE3CanceledDueToTp1
        ? 'CANCELADA: Eliminada tras toma de TP1.'
        : 'Carga completa 100% de cupo institucional antes del SL.',
      description: 'Piso de soporte técnico de última instancia antes de la invalidación.',
    };

    const exitDca = {
      id: 'EXIT_DCA',
      code: 'SALIDA-REBOTE',
      name: 'Salida en Rebote / Nuevo BE',
      category: 'EXIT' as const,
      price: (entry1Price + (entry2Price || entry1Price)) / 2,
      status: isE2Hit ? ('ACTIVE' as const) : ('PENDING' as const),
      exitType: 'SALIDA DEFENSA CON COSTO RECALCULADO',
      description: 'Salida sin pérdidas tras promediar precio de entrada en zonas de soporte.',
    };

    const be = {
      id: 'BE',
      code: 'BE',
      name: 'Break-Even Blindado',
      category: 'PROTECTION' as const,
      price: entry1Price,
      status: isBreakEvenActive ? ('ACTIVE' as const) : ('PENDING' as const),
      actionTrigger: 'Garantiza riesgo financiero $0.00 en capital de trabajo.',
      description: 'Nivel al costo de entrada exacto, activo una vez que TP1 fue cobrado.',
    };

    const slPnl = calcPnl(slPrice, 1);
    const sl = {
      id: 'SL',
      code: 'SL',
      name: 'Stop Loss Global',
      category: 'PROTECTION' as const,
      price: slPrice,
      status: isSlHit ? ('TRIGGERED' as const) : ('ACTIVE' as const),
      pnlUsd: slPnl.pnl,
      roePercent: slPnl.roe,
      actionTrigger: 'Corte estricto de invalidación. Respeta la regla de apalancamiento ≤ 5x.',
      description: 'Invalidación estructural de la tesis de mercado. Límite máximo de riesgo.',
    };

    const exitSl = {
      id: 'EXIT_SL',
      code: 'SALIDA-PROTEGIDA',
      name: 'Salida por Invalidación',
      category: 'EXIT' as const,
      price: slPrice,
      status: isSlHit ? ('TRIGGERED' as const) : ('PENDING' as const),
      exitType: 'PÉRDIDA CONTROLADA (CAPITAL PROTEGIDO)',
      description: 'Cierre automático en Binance impidiendo pérdidas mayores o liquidación.',
    };

    return {
      E1: e1,
      TP1: tp1,
      TP2: tp2,
      TP3: tp3,
      EXIT_PROFIT: exitProfit,
      E2: e2,
      E3: e3,
      EXIT_DCA: exitDca,
      BE: be,
      SL: sl,
      EXIT_SL: exitSl,
    };
  }, [
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
    currentPrice,
    qty,
    leverage,
    isLong,
  ]);

  const selectedNode = selectedNodeId ? nodes[selectedNodeId] : nodes['E1'];

  // Distance to current price from selected node
  const selectedNodeDist = selectedNode ? Math.abs(calcDist(selectedNode.price)) : 0;

  // Path highlighting helper
  const isBranchActive = (branch: 'PROFIT' | 'DCA' | 'PROTECT') => {
    if (activeScenario === 'ALL') return true;
    if (activeScenario === 'TP_PROFIT' && branch === 'PROFIT') return true;
    if (activeScenario === 'DCA_REBOUND' && branch === 'DCA') return true;
    if (activeScenario === 'SL_PROTECT' && branch === 'PROTECT') return true;
    return false;
  };

  return (
    <div
      id={`trade-matrix-${position.symbol}`}
      className={`rounded-xl border border-neutral-800 bg-[#0d1117] p-4 flex flex-col gap-3.5 shadow-xl text-neutral-200 ${className}`}
    >
      {/* 1. Header Táctico de la Matriz Multicamino */}
      {!hideHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-neutral-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
              <GitBranch className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                  Matriz Multicamino del Trade
                </h4>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-amber-300 font-bold">
                  {position.symbol} • {isLong ? 'LONG ↗' : 'SHORT ↘'} • {leverage}x
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/50 border border-neutral-800 text-neutral-400">
                  Precio Live: <strong className="text-white">${fmt(currentPrice)}</strong>
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Diagrama de topología de decisiones: Nodos interconectados de ejecución, cancelaciones y salidas tácticas.
              </p>
            </div>
          </div>

          {/* Selector de Escenarios Tácticos */}
          <div className="flex items-center gap-1.5 bg-neutral-900/90 p-1 rounded-lg border border-neutral-800 text-[10px] font-mono shrink-0">
            <button
              type="button"
              onClick={() => setActiveScenario('ALL')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                activeScenario === 'ALL'
                  ? 'bg-sky-500 text-neutral-950 shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos los Caminos
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario('TP_PROFIT')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeScenario === 'TP_PROFIT'
                  ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <Target className="w-3 h-3" />
              <span>Ruta Ganancia</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario('DCA_REBOUND')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeScenario === 'DCA_REBOUND'
                  ? 'bg-amber-500 text-neutral-950 shadow-xs'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <Layers className="w-3 h-3" />
              <span>Ruta DCA</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveScenario('SL_PROTECT')}
              className={`px-2 py-1 rounded font-bold transition-all cursor-pointer flex items-center gap-1 ${
                activeScenario === 'SL_PROTECT'
                  ? 'bg-rose-500 text-neutral-950 shadow-xs'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              <span>Ruta Protección</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. Banner Táctico de Consecuencia / Estado de la Hoja */}
      <div className="px-3 py-2 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-neutral-400">Regla Activa:</span>
          <span className="text-neutral-200">{tacticalRuleSummary}</span>
        </div>

        <div className="flex items-center gap-2">
          {multiPathState === 'TP1_ROUTE_DCA_CANCELED' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Ruta TP1 Dominante • DCA Cancelado</span>
            </span>
          )}
          {multiPathState === 'E2_ROUTE_ACTIVE' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-600 flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Ruta DCA E2 en Ejecución</span>
            </span>
          )}
          {multiPathState === 'DUAL_PATH_ACTIVE' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
              <span>Bifurcación Abierta E1 ⇄ [TP1 | E2]</span>
            </span>
          )}
          {multiPathState === 'SL_ROUTE_HIT' && (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-600 flex items-center gap-1">
              <XCircle className="w-3 h-3 text-rose-400" />
              <span>Ruta SL Tocada</span>
            </span>
          )}
        </div>
      </div>

      {/* 3. MATRIZ DE NODOS INTERCONECTADOS (DIAGRAMA DE RED TÉCNICA) */}
      <div className="relative rounded-xl border border-neutral-800 bg-neutral-950/90 p-4 overflow-x-auto">
        {/* Fondo sutil de cuadrícula tecnológica */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <div className="min-w-[820px] flex items-center justify-between gap-3 relative z-10 py-2">
          
          {/* ================= COLUMNA 1: NODO ORÍGEN E1 ================= */}
          <div className="w-[180px] shrink-0 flex flex-col justify-center">
            <div
              onClick={() => setSelectedNodeId('E1')}
              className={`p-3 rounded-xl border-2 transition-all cursor-pointer relative shadow-lg ${
                selectedNodeId === 'E1'
                  ? 'border-sky-400 bg-sky-950/40 shadow-sky-500/20'
                  : 'border-sky-500/40 bg-neutral-900/90 hover:border-sky-400/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                  NODO RAÍZ
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Target className="w-3.5 h-3.5 text-sky-400" />
                <span>[E1] Entrada Inicial</span>
              </div>

              <div className="text-sm font-mono font-bold text-sky-300 mt-1">
                ${fmt(entry1Price)}
              </div>

              <div className="text-[9px] font-mono text-neutral-400 mt-0.5">
                Asignación: <strong>50% cupo</strong>
              </div>

              <div className="mt-2 pt-1.5 border-t border-neutral-800 flex items-center justify-between text-[9px] font-mono">
                <span className="text-neutral-500">Live:</span>
                <span className="text-amber-400 font-bold">${fmt(currentPrice)}</span>
              </div>
            </div>
          </div>

          {/* ================= CONECTORES SVG CENTRALES (BIFURCACIÓN DE RUTAS) ================= */}
          <div className="w-10 shrink-0 flex items-center justify-center relative self-stretch">
            <svg className="w-full h-full min-h-[260px]" viewBox="0 0 40 260" fill="none">
              {/* Línea hacia arriba: Ruta Ganancia (TP) */}
              <path
                d="M 0 130 C 20 130, 20 45, 40 45"
                stroke={isBranchActive('PROFIT') ? '#10b981' : '#262626'}
                strokeWidth={isBranchActive('PROFIT') ? 2.5 : 1}
                strokeDasharray={isTp1Hit ? 'none' : '4 3'}
                className={isBranchActive('PROFIT') ? 'transition-colors' : ''}
              />
              {/* Línea horizontal central: Ruta DCA */}
              <path
                d="M 0 130 L 40 130"
                stroke={isBranchActive('DCA') ? '#f59e0b' : '#262626'}
                strokeWidth={isBranchActive('DCA') ? 2.5 : 1}
                strokeDasharray={isE2CanceledDueToTp1 ? '2 2' : '4 3'}
                className={isBranchActive('DCA') ? 'transition-colors' : ''}
              />
              {/* Línea hacia abajo: Ruta Protección (SL/BE) */}
              <path
                d="M 0 130 C 20 130, 20 215, 40 215"
                stroke={isBranchActive('PROTECT') ? (isBreakEvenActive ? '#0ea5e9' : '#f43f5e') : '#262626'}
                strokeWidth={isBranchActive('PROTECT') ? 2.5 : 1}
                strokeDasharray={isSlHit ? 'none' : '4 3'}
                className={isBranchActive('PROTECT') ? 'transition-colors' : ''}
              />

              {/* Punto central del Hub */}
              <circle cx="0" cy="130" r="4" fill="#38bdf8" />
              <circle cx="40" cy="45" r="3.5" fill={isBranchActive('PROFIT') ? '#10b981' : '#525252'} />
              <circle cx="40" cy="130" r="3.5" fill={isBranchActive('DCA') ? '#f59e0b' : '#525252'} />
              <circle cx="40" cy="215" r="3.5" fill={isBranchActive('PROTECT') ? '#f43f5e' : '#525252'} />
            </svg>
          </div>

          {/* ================= COLUMNA 2: LAS 3 RAMAS DE ESCENARIOS INTERCONECTADOS ================= */}
          <div className="flex-1 flex flex-col gap-2.5">
            
            {/* ----------------- RAMA A: ESCENARIO GANANCIA (TP1 ➔ TP2 ➔ TP3 ➔ EXIT) ----------------- */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                isBranchActive('PROFIT')
                  ? isTp1Hit
                    ? 'bg-emerald-950/30 border-emerald-500/60 shadow-sm'
                    : 'bg-neutral-900/60 border-emerald-500/30'
                  : 'opacity-40 bg-neutral-950/40 border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>ESCENARIO A: Trayectoria Favorable a Objetivos (TP)</span>
                </span>
                <span className="text-[9px] font-mono text-neutral-400">
                  {isTp1Hit ? '✓ 50% Asegurado' : `A ${Math.abs(calcDist(tp1Price)).toFixed(2)}% de TP1`}
                </span>
              </div>

              {/* Conexión en cadena de los 3 Nodos TP y Salida */}
              <div className="grid grid-cols-4 gap-2">
                {/* Nodo TP1 */}
                <div
                  onClick={() => setSelectedNodeId('TP1')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'TP1'
                      ? 'border-emerald-400 bg-emerald-950/70 text-white ring-1 ring-emerald-400'
                      : isTp1Hit
                      ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">[TP1]</span>
                    <span className="text-[8px] px-1 rounded bg-emerald-900/60 text-emerald-300">50%</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(tp1Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isTp1Hit ? '✓ Cobrado' : 'Gatillo de BE'}
                  </div>
                </div>

                {/* Nodo TP2 */}
                <div
                  onClick={() => setSelectedNodeId('TP2')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'TP2'
                      ? 'border-emerald-400 bg-emerald-950/70 text-white ring-1 ring-emerald-400'
                      : isTp2Hit
                      ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">[TP2]</span>
                    <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400">30%</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(tp2Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isTp2Hit ? '✓ Cobrado' : 'Trailing'}
                  </div>
                </div>

                {/* Nodo TP3 */}
                <div
                  onClick={() => setSelectedNodeId('TP3')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'TP3'
                      ? 'border-emerald-400 bg-emerald-950/70 text-white ring-1 ring-emerald-400'
                      : isTp3Hit
                      ? 'border-emerald-500/80 bg-emerald-950/40 text-emerald-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-emerald-500/40 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-400">[TP3]</span>
                    <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400">20%</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(tp3Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isTp3Hit ? '✓ 100%' : 'Target Max'}
                  </div>
                </div>

                {/* Nodo Terminal de Salida Ganadora */}
                <div
                  onClick={() => setSelectedNodeId('EXIT_PROFIT')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'EXIT_PROFIT'
                      ? 'border-emerald-400 bg-emerald-950/80 text-white ring-1 ring-emerald-400'
                      : 'border-emerald-800/40 bg-emerald-950/20 text-emerald-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1 text-[9px] text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>SALIDA GANANCIA</span>
                  </span>
                  <div className="text-[10px] font-bold text-white mt-1">Cierre 100%</div>
                  <div className="text-[8px] text-emerald-400/80 mt-0.5">R:B Máximo</div>
                </div>
              </div>
            </div>

            {/* ----------------- RAMA B: ESCENARIO RETROCESO DCA & RE-BALANCEO ----------------- */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                isBranchActive('DCA')
                  ? isE2CanceledDueToTp1
                    ? 'bg-neutral-950/60 border-neutral-800 opacity-70'
                    : isE2Hit
                    ? 'bg-amber-950/30 border-amber-500/60'
                    : 'bg-neutral-900/60 border-amber-500/30'
                  : 'opacity-40 bg-neutral-950/40 border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>ESCENARIO B: Retroceso Táctico a Soportes DCA</span>
                </span>
                {isE2CanceledDueToTp1 ? (
                  <span className="text-[9px] font-mono text-rose-400 font-bold flex items-center gap-1">
                    <XCircle className="w-3 h-3" />
                    <span>X = E2 Eliminada por TP1</span>
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-neutral-400">
                    {isE2Hit ? '⚡ E2 Ejecutada' : `A ${Math.abs(calcDist(entry2Price)).toFixed(2)}% de soporte`}
                  </span>
                )}
              </div>

              {/* Nodos de E2, E3 y Salida en Rebote */}
              <div className="grid grid-cols-3 gap-2">
                {/* Nodo E2 */}
                <div
                  onClick={() => setSelectedNodeId('E2')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'E2'
                      ? 'border-amber-400 bg-amber-950/70 text-white ring-1 ring-amber-400'
                      : isE2CanceledDueToTp1
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-500 line-through'
                      : isE2Hit
                      ? 'border-amber-500/80 bg-amber-950/40 text-amber-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-amber-500/40 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isE2CanceledDueToTp1 ? 'text-rose-400' : 'text-amber-400'}`}>
                      {isE2CanceledDueToTp1 ? '[X=E2]' : '[E2 DCA]'}
                    </span>
                    <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400">30%</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(entry2Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isE2CanceledDueToTp1 ? 'Cancelada' : isE2Hit ? 'Promediado' : 'Soporte 1'}
                  </div>
                </div>

                {/* Nodo E3 */}
                <div
                  onClick={() => setSelectedNodeId('E3')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'E3'
                      ? 'border-amber-400 bg-amber-950/70 text-white ring-1 ring-amber-400'
                      : isE3CanceledDueToTp1
                      ? 'border-neutral-800 bg-neutral-950 text-neutral-500 line-through'
                      : isE3Hit
                      ? 'border-purple-500/80 bg-purple-950/40 text-purple-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-amber-500/40 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-bold ${isE3CanceledDueToTp1 ? 'text-rose-400' : 'text-purple-400'}`}>
                      {isE3CanceledDueToTp1 ? '[X=E3]' : '[E3 Carga]'}
                    </span>
                    <span className="text-[8px] px-1 rounded bg-neutral-800 text-neutral-400">20%</span>
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(entry3Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isE3CanceledDueToTp1 ? 'Cancelada' : 'Piso Extremo'}
                  </div>
                </div>

                {/* Nodo Salida Rebote */}
                <div
                  onClick={() => setSelectedNodeId('EXIT_DCA')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'EXIT_DCA'
                      ? 'border-amber-400 bg-amber-950/80 text-white ring-1 ring-amber-400'
                      : 'border-amber-800/40 bg-amber-950/20 text-amber-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1 text-[9px] text-amber-400">
                    <RotateCcw className="w-3 h-3" />
                    <span>SALIDA REBOTE</span>
                  </span>
                  <div className="text-[10px] font-bold text-white mt-1">Nuevo BE</div>
                  <div className="text-[8px] text-amber-400/80 mt-0.5">Defensa de Costo</div>
                </div>
              </div>
            </div>

            {/* ----------------- RAMA C: ESCENARIO PROTECCIÓN (BE / SL / INVALIDACIÓN) ----------------- */}
            <div
              className={`p-2.5 rounded-xl border transition-all ${
                isBranchActive('PROTECT')
                  ? isBreakEvenActive
                    ? 'bg-sky-950/30 border-sky-500/60'
                    : isSlHit
                    ? 'bg-rose-950/40 border-rose-500/60'
                    : 'bg-neutral-900/60 border-rose-500/30'
                  : 'opacity-40 bg-neutral-950/40 border-neutral-900'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold text-rose-400 flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>ESCENARIO C: Invalidación Estricta & Blindaje de Capital</span>
                </span>
                <span className="text-[9px] font-mono text-neutral-400">
                  {isBreakEvenActive ? '🛡️ BE Activo (Riesgo $0)' : `A ${Math.abs(calcDist(slPrice)).toFixed(2)}% del SL`}
                </span>
              </div>

              {/* Nodos de BE, Stop Loss y Salida de Protección */}
              <div className="grid grid-cols-3 gap-2">
                {/* Nodo Break-Even */}
                <div
                  onClick={() => setSelectedNodeId('BE')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'BE'
                      ? 'border-sky-400 bg-sky-950/70 text-white ring-1 ring-sky-400'
                      : isBreakEvenActive
                      ? 'border-sky-500/80 bg-sky-950/40 text-sky-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-sky-500/40 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">[BE]</span>
                    <Lock className="w-2.5 h-2.5 text-sky-400" />
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(entry1Price)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isBreakEvenActive ? '✓ Blindado' : 'Tras TP1'}
                  </div>
                </div>

                {/* Nodo Stop Loss */}
                <div
                  onClick={() => setSelectedNodeId('SL')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'SL'
                      ? 'border-rose-400 bg-rose-950/70 text-white ring-1 ring-rose-400'
                      : isSlHit
                      ? 'border-rose-500/80 bg-rose-950/50 text-rose-200'
                      : 'border-neutral-800 bg-neutral-900 hover:border-rose-500/40 text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-rose-400">[SL Global]</span>
                    <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                  </div>
                  <div className="text-xs font-bold text-white mt-1">${fmt(slPrice)}</div>
                  <div className="text-[8px] text-neutral-400 mt-0.5">
                    {isSlHit ? '🚨 Impactado' : 'Corte Máx'}
                  </div>
                </div>

                {/* Nodo Salida Protegida */}
                <div
                  onClick={() => setSelectedNodeId('EXIT_SL')}
                  className={`p-2 rounded-lg border text-[10px] font-mono cursor-pointer transition-all flex flex-col justify-between ${
                    selectedNodeId === 'EXIT_SL'
                      ? 'border-rose-400 bg-rose-950/80 text-white ring-1 ring-rose-400'
                      : 'border-rose-800/40 bg-rose-950/20 text-rose-300'
                  }`}
                >
                  <span className="font-bold flex items-center gap-1 text-[9px] text-rose-400">
                    <ShieldCheck className="w-3 h-3" />
                    <span>SALIDA CONTROL</span>
                  </span>
                  <div className="text-[10px] font-bold text-white mt-1">
                    {isBreakEvenActive ? 'Riesgo $0' : 'SL Limitado'}
                  </div>
                  <div className="text-[8px] text-rose-400/80 mt-0.5">Capital a Salvo</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 4. PANEL INFERIOR DE DETALLE TÉCNICO DEL NODO SELECCIONADO */}
      {selectedNode && (
        <div className="p-3 rounded-xl bg-neutral-900/90 border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                selectedNode.category === 'PROFIT'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : selectedNode.category === 'DCA'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : selectedNode.category === 'PROTECTION'
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                  : 'bg-sky-500/20 border-sky-500/40 text-sky-400'
              }`}
            >
              {selectedNode.category === 'PROFIT' && <Target className="w-4 h-4" />}
              {selectedNode.category === 'DCA' && <Layers className="w-4 h-4" />}
              {selectedNode.category === 'PROTECTION' && <ShieldAlert className="w-4 h-4" />}
              {selectedNode.category === 'ENTRY' && <Activity className="w-4 h-4" />}
              {selectedNode.category === 'EXIT' && <CheckCircle2 className="w-4 h-4" />}
            </div>

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-white text-sm">
                  {selectedNode.code}: {selectedNode.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300">
                  Nivel: <strong className="text-white">${fmt(selectedNode.price)}</strong>
                </span>
                <span className="text-[10px] text-neutral-400">
                  Distancia: <strong className="text-amber-300">{selectedNodeDist.toFixed(2)}%</strong>
                </span>
                {selectedNode.pnlUsd !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      selectedNode.pnlUsd >= 0
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-700'
                    }`}
                  >
                    PnL Proyectado: {selectedNode.pnlUsd >= 0 ? '+' : ''}${selectedNode.pnlUsd.toFixed(2)} (
                    {selectedNode.roePercent?.toFixed(2)}% ROE)
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-300 leading-snug">{selectedNode.description}</p>
              {selectedNode.actionTrigger && (
                <div className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1">
                  <Zap className="w-3 h-3 shrink-0" />
                  <span>{selectedNode.actionTrigger}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botón de acción rápida condicional */}
          <div className="flex items-center gap-2 shrink-0">
            {onMoveToBE && (isTp1Hit || selectedNode.id === 'BE') && (
              <button
                type="button"
                onClick={onMoveToBE}
                disabled={isBreakEvenActive}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                  isBreakEvenActive
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-neutral-950 active:scale-95'
                }`}
                title="Ajustar Stop Loss al precio de entrada para garantizar 0 riesgo"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isBreakEvenActive ? '✓ Blindado en BE' : `Mover a BE ($${fmt(entry1Price)})`}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
