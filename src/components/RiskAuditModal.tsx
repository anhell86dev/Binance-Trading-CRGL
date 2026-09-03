import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Layers,
  Lock,
  Percent,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  X,
  XCircle,
} from 'lucide-react';
import { OpenOrder, PositionRisk } from '../types/binance';
import { auditOrderRisk, auditPositionRisk, RiskAuditResult } from '../utils/riskAuditor';

interface RiskAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: OpenOrder | null;
  position?: PositionRisk | null;
  walletBalance?: number;
  onOpenLinkStrategy?: () => void;
  onOpenEditTPSL?: () => void;
}

export const RiskAuditModal: React.FC<RiskAuditModalProps> = ({
  isOpen,
  onClose,
  order,
  position,
  walletBalance = 1000,
  onOpenLinkStrategy,
  onOpenEditTPSL,
}) => {
  if (!isOpen || (!order && !position)) return null;

  const isPosition = !!position;
  const audit: RiskAuditResult = position
    ? auditPositionRisk(position, walletBalance)
    : auditOrderRisk(order!, walletBalance);

  const symbol = isPosition ? position!.symbol : order!.symbol;
  const side = isPosition
    ? position!.positionAmt > 0
      ? 'BUY'
      : 'SELL'
    : order!.side;
  const price = isPosition ? position!.entryPrice : order!.price;
  const leverage = isPosition ? position!.leverage : order!.leverage;

  const isOptimal = audit.overallStatus === 'OPTIMAL';
  const isWarning = audit.overallStatus === 'WARNING';
  const isCritical = audit.overallStatus === 'CRITICAL';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isOptimal
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                  : isWarning
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
              }`}
            >
              {isOptimal ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isWarning ? (
                <ShieldAlert className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Auditoría de Gestión de Riesgo
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${audit.badgeColor}`}>
                  {audit.badgeText} ({audit.score}/100)
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                {isPosition ? 'Posición Activa' : 'Orden Abierta'} • {symbol} • {side === 'BUY' ? 'LONG (COMPRA)' : 'SHORT (VENTA)'} • {leverage}x ISOLATED
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Top Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-blue-400" />
                Margen
              </span>
              <span className="text-white font-bold font-mono text-sm mt-0.5">ISOLATED</span>
              <span className="text-[10px] text-neutral-400 font-mono">Apalancamiento {leverage}x</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-rose-400" />
                Pérdida Máx (SL)
              </span>
              <span className="text-rose-400 font-bold font-mono text-sm mt-0.5">
                ${audit.estimatedLossUsdt.toFixed(2)}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {audit.walletRiskPercent}% de billetera
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                <Target className="w-3 h-3 text-emerald-400" />
                Ganancia (TP)
              </span>
              <span className="text-emerald-400 font-bold font-mono text-sm mt-0.5">
                {audit.estimatedProfitUsdt > 0 ? `$${audit.estimatedProfitUsdt.toFixed(2)}` : 'Sin TP'}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Objetivo proyectado</span>
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
              <span className="text-[10px] text-neutral-500 uppercase font-bold flex items-center gap-1">
                <Scale className="w-3 h-3 text-amber-400" />
                Ratio R:B
              </span>
              <span className="text-amber-300 font-bold font-mono text-sm mt-0.5">
                {audit.riskRewardRatioStr}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Mínimo 1:2.5</span>
            </div>
          </div>

          {/* Strategy Link Status Banner */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase font-bold">Estrategia Vinculada</span>
                <div className="font-bold text-white text-xs mt-0.5">
                  {audit.strategyId || audit.strategyName ? (
                    <span className="text-amber-300 flex items-center gap-1.5 font-mono">
                      <span>{audit.strategyId}</span>
                      {audit.strategyName && <span className="text-neutral-300 font-sans">({audit.strategyName})</span>}
                    </span>
                  ) : (
                    <span className="text-neutral-400 font-normal">Sin estrategia asignada (Orden manual)</span>
                  )}
                </div>
              </div>
            </div>

            {onOpenLinkStrategy && (
              <button
                type="button"
                onClick={onOpenLinkStrategy}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold shrink-0 transition-colors"
              >
                {audit.strategyId ? 'Cambiar Estrategia' : 'Ligar a Estrategia'}
              </button>
            )}
          </div>

          {/* Detailed Checks Breakdown */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Puntos de Control de Riesgo Institucional (5/5)</span>
            </h4>

            <div className="divide-y divide-neutral-800/80 bg-neutral-950/80 rounded-xl border border-neutral-800 overflow-hidden">
              {audit.checks.map((check) => {
                const isPass = check.status === 'PASS';
                const isWarn = check.status === 'WARN';

                return (
                  <div key={check.id} className="p-3 flex items-start gap-3 hover:bg-neutral-900/40 transition-colors">
                    <div className="mt-0.5 shrink-0">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : isWarn ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{check.name}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold ${
                              isPass
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : isWarn
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            {check.label}
                          </span>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          Requisito: {check.requirement}
                        </span>
                      </div>

                      <p className="text-neutral-400 text-[11px] mt-1 leading-relaxed">
                        {check.description}
                      </p>

                      {check.recommendation && (
                        <p className="text-amber-400/90 text-[11px] mt-1 font-semibold flex items-center gap-1">
                          <span>💡 Recomendación:</span> {check.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2">
          <div className="text-[11px] text-neutral-500 font-mono">
            Puntuación de Seguridad: <strong className="text-white">{audit.score}/100</strong>
          </div>

          <div className="flex items-center gap-2">
            {onOpenEditTPSL && (
              <button
                type="button"
                onClick={onOpenEditTPSL}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors border border-neutral-700"
              >
                Ajustar TP / SL
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
