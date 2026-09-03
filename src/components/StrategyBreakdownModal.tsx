import React, { useState } from 'react';
import {
  X,
  Layers,
  Zap,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { GoogleSheetStrategyRow, StrategyExecutionPlan } from '../types/strategy';
import { OrderForm } from './OrderForm';

interface StrategyBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: GoogleSheetStrategyRow;
  executionPlan: StrategyExecutionPlan | null;
  allocatedCapital: number;
  clampedLeverage: number;
  currentPrice: number;
  maxLossUsdt: number;
  onAuthorize2FA: () => void;
  isExecuting: boolean;
  isReadyToExecute: boolean;
  isObsolete: boolean;
}

const formatOrderPrice = (p: number) => {
  if (!p || isNaN(p)) return '0.00';
  if (p >= 100) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return p.toFixed(6);
};

export const StrategyBreakdownModal: React.FC<StrategyBreakdownModalProps> = ({
  isOpen,
  onClose,
  strategy,
  executionPlan,
  allocatedCapital,
  clampedLeverage,
  currentPrice,
  maxLossUsdt,
  onAuthorize2FA,
  isExecuting,
  isReadyToExecute,
  isObsolete,
}) => {
  const [activeTab, setActiveTab] = useState<'BREAKDOWN' | 'FORM'>('BREAKDOWN');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
              <Layers className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">
                  Desglose y Envío a Binance Futures
                </h3>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-neutral-900 text-amber-300 border border-neutral-700">
                  {strategy.noEstrategia}
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                {strategy.par} • {strategy.nombreEstrategia}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab switch between 6-order breakdown and direct manual form */}
            <div className="flex items-center bg-neutral-900 p-1 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setActiveTab('BREAKDOWN')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'BREAKDOWN'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Desglose 6 Órdenes</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('FORM')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  activeTab === 'FORM'
                    ? 'bg-amber-400 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Formulario Binance</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
          {activeTab === 'BREAKDOWN' ? (
            <div className="flex flex-col gap-4">
              {/* Summary Bar */}
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-neutral-400">
                    Apalancamiento:{' '}
                    <strong className="text-amber-300 font-bold">{clampedLeverage}x ISOLATED</strong>
                  </span>
                  <span className="text-neutral-700">|</span>
                  <span className="text-neutral-400">
                    Capital Asignado:{' '}
                    <strong className="text-white font-bold">${allocatedCapital.toFixed(2)} USDT</strong>
                  </span>
                  <span className="text-neutral-700">|</span>
                  <span className="text-neutral-400">
                    Pérdida Máxima SL:{' '}
                    <strong className="text-rose-400 font-bold">-${(maxLossUsdt || 0).toFixed(2)} USDT</strong>
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500">
                  Total de órdenes calculadas: 6
                </div>
              </div>

              {/* 6 Orders Table: Strictly aligned header and cells, wrapped description */}
              <div className="overflow-x-auto custom-scrollbar rounded-xl border border-neutral-800 bg-neutral-950/80">
                <table className="w-full text-left font-mono border-collapse min-w-[760px]">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/90 text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400">
                      <th scope="col" className="py-3 px-3.5 font-semibold text-neutral-300 w-[280px]">
                        Orden / Detalle
                      </th>
                      <th scope="col" className="py-3 px-3 font-semibold text-neutral-300 text-left w-[140px]">
                        Precio Objetivo
                      </th>
                      <th scope="col" className="py-3 px-3 font-semibold text-neutral-300 text-left w-[120px]">
                        Cantidad
                      </th>
                      <th scope="col" className="py-3 px-3 font-semibold text-neutral-300 text-left w-[110px]">
                        Notional
                      </th>
                      <th scope="col" className="py-3 px-3 font-semibold text-neutral-300 text-left w-[150px]">
                        Margen / PnL Est.
                      </th>
                      <th scope="col" className="py-3 px-3.5 font-semibold text-neutral-300 text-right w-[100px]">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 text-xs">
                    {executionPlan?.orders.map((ord, idx) => {
                      const isEntry = ord.role === 'ENTRY';
                      const isSL = ord.role === 'STOP_LOSS';

                      const roleBadgeClass = isEntry
                        ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                        : isSL
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/40'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';

                      const roleIconText = isEntry
                        ? `E${idx + 1}`
                        : isSL
                        ? 'SL'
                        : `TP${idx - 2}`;

                      const orderPrice = ord.price || 0;
                      const distFromLive = currentPrice > 0 ? ((orderPrice - currentPrice) / currentPrice) * 100 : 0;

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-neutral-900/50 transition-colors"
                        >
                          {/* 1. Orden y Detalle */}
                          <td className="py-3 px-3.5 align-top w-[280px] max-w-[280px]">
                            <div className="flex items-start gap-2.5">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0 border mt-0.5 ${roleBadgeClass}`}
                              >
                                {roleIconText}
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs leading-tight">{ord.label}</span>
                                  <span
                                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleBadgeClass}`}
                                  >
                                    {ord.side} {ord.type}
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-400 font-sans mt-1 leading-snug break-words whitespace-normal">
                                  {ord.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* 2. Precio Objetivo */}
                          <td className="py-3 px-3 align-top text-left w-[140px]">
                            <div className="flex flex-col">
                              <span className="text-white font-bold text-sm leading-tight">
                                ${formatOrderPrice(orderPrice)}
                              </span>
                              <span
                                className={`text-[10px] font-medium leading-tight mt-1 ${
                                  Math.abs(distFromLive) < 0.5
                                    ? 'text-amber-300 font-bold'
                                    : distFromLive > 0
                                    ? 'text-cyan-400'
                                    : 'text-neutral-400'
                                }`}
                              >
                                ({distFromLive >= 0 ? '+' : ''}{distFromLive.toFixed(1)}% vs live)
                              </span>
                            </div>
                          </td>

                          {/* 3. Cantidad */}
                          <td className="py-3 px-3 align-top text-left w-[120px]">
                            <div className="flex flex-col">
                              <span className="text-neutral-200 font-bold text-sm leading-tight">
                                {ord.quantity}
                              </span>
                              <span className="text-neutral-400 text-[10px] font-normal leading-tight mt-1">
                                ({ord.percentage}% del total)
                              </span>
                            </div>
                          </td>

                          {/* 4. Notional */}
                          <td className="py-3 px-3 align-top text-left w-[110px]">
                            <div className="flex flex-col">
                              <span className="text-neutral-200 font-semibold text-sm leading-tight">
                                ${(ord.estNotional || 0).toFixed(2)}
                              </span>
                              <span className="text-neutral-500 text-[10px] leading-tight mt-1">
                                USDT
                              </span>
                            </div>
                          </td>

                          {/* 5. Margen / PnL Est. */}
                          <td className="py-3 px-3 align-top text-left w-[150px]">
                            <div className="flex flex-col">
                              <span
                                className={`font-bold text-sm leading-tight ${
                                  isEntry ? 'text-amber-300' : isSL ? 'text-rose-400' : 'text-emerald-400'
                                }`}
                              >
                                {isEntry
                                  ? `$${(ord.estMargin || 0).toFixed(2)} USDT`
                                  : isSL
                                  ? `-$${(maxLossUsdt || 0).toFixed(2)} USDT`
                                  : `+$${(ord.pnlTarget || 0).toFixed(2)} USDT`}
                              </span>
                              <span className="text-[10px] text-neutral-400 font-sans leading-tight mt-1 uppercase">
                                {isEntry ? 'Margen Aislado' : isSL ? 'Pérdida SL' : 'Ganancia TP'}
                              </span>
                            </div>
                          </td>

                          {/* 6. Estado */}
                          <td className="py-3 px-3.5 align-top text-right w-[100px]">
                            <div className="flex flex-col items-end">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 text-neutral-300 border border-neutral-700">
                                LISTA
                              </span>
                              <span className="text-[10px] text-neutral-500 mt-1 whitespace-nowrap">
                                {clampedLeverage}x Isolated
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Action Bar inside Breakdown */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Info className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    El envío de las 6 órdenes se realiza de forma atómica y requiere verificación 2FA.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAuthorize2FA();
                  }}
                  disabled={!isReadyToExecute || isExecuting}
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl ${
                    isObsolete
                      ? 'bg-neutral-850 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                      : isReadyToExecute && !isExecuting
                      ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 shadow-amber-950/50 cursor-pointer active:scale-95'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    {isObsolete
                      ? 'Estrategia Histórica (Solo Consulta)'
                      : 'Autorizar y Enviar a Binance (2FA)'}
                  </span>
                  {!isObsolete && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            /* Tab 2: Integrated Binance Futures Order Form */
            <div className="bg-neutral-950 rounded-xl border border-neutral-800 p-2 sm:p-4">
              <OrderForm isModal={true} onClose={onClose} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
