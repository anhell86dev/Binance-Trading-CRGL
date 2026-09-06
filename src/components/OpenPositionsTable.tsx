import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Layers,
  Link as LinkIcon,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { OpenOrder, PositionRisk } from '../types/binance';
import { EmergencyCloseButton } from './EmergencyCloseButton';
import { auditPositionRisk } from '../utils/riskAuditor';
import { RiskAuditModal } from './RiskAuditModal';
import { LinkStrategyModal } from './LinkStrategyModal';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { StrategyPositionTracker } from './StrategyPositionTracker';

interface OpenPositionsTableProps {
  onSelectPosition?: (pos: PositionRisk) => void;
  onOpenOrderModal?: () => void;
}

export const OpenPositionsTable: React.FC<OpenPositionsTableProps> = ({ onSelectPosition, onOpenOrderModal }) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(() => binanceWs.getOpenOrders());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const mode = binanceWs.getMode();

  // Stable fixed order of position symbols so positions NEVER jump or re-order automatically
  const [stableSymbolsOrder, setStableSymbolsOrder] = useState<string[]>(() =>
    binanceWs.getPositions().map((p) => p.symbol)
  );

  // Modal for editing TP/SL
  const [editingPos, setEditingPos] = useState<PositionRisk | null>(null);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');

  // Modals for Risk Audit & Link Strategy
  const [auditPos, setAuditPos] = useState<PositionRisk | null>(null);
  const [linkPos, setLinkPos] = useState<PositionRisk | null>(null);

  // Expanded symbols for visual strategy tracking (E2, E3, TP1, TP2, SL)
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    binanceWs.getPositions().forEach((p) => {
      if (p.strategyId || p.symbol) {
        initial.add(p.symbol);
      }
    });
    return initial;
  });

  const seenSymbolsRef = React.useRef<Set<string>>(
    new Set(binanceWs.getPositions().map((p) => p.symbol))
  );

  const toggleExpand = (sym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) {
        next.delete(sym);
      } else {
        next.add(sym);
      }
      return next;
    });
  };

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      const curPositions = binanceWs.getPositions();
      setPositions(curPositions);
      setOpenOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());

      // Maintain fixed symbol positions: keep existing ordering intact and append any newly opened positions
      setStableSymbolsOrder((prevOrder) => {
        const activeSymbols = new Set(curPositions.map((p) => p.symbol));
        const preserved = prevOrder.filter((sym) => activeSymbols.has(sym));
        const existingSet = new Set(preserved);
        const added = curPositions.map((p) => p.symbol).filter((sym) => !existingSet.has(sym));
        if (added.length === 0 && preserved.length === prevOrder.length) {
          return prevOrder;
        }
        return [...preserved, ...added];
      });

      // Auto-expand only newly opened positions that have a strategy attached (do not re-expand if user collapsed)
      const brandNewPositions = curPositions.filter((p) => !seenSymbolsRef.current.has(p.symbol));
      if (brandNewPositions.length > 0) {
        brandNewPositions.forEach((p) => seenSymbolsRef.current.add(p.symbol));
        setExpandedSymbols((prev) => {
          let changed = false;
          const next = new Set(prev);
          brandNewPositions.forEach((p) => {
            const stratId = p.strategyId || binanceWs.getLinkedStrategyForSymbol(p.symbol)?.strategyId;
            if (stratId && !prev.has(p.symbol)) {
              next.add(p.symbol);
              changed = true;
            }
          });
          return changed ? next : prev;
        });
      }
    });
    return () => unsub();
  }, []);

  // Compute positions strictly in fixed stable order
  const fixedPositions = React.useMemo(() => {
    const posMap = new Map<string, PositionRisk>(positions.map((p) => [p.symbol, p]));
    const result: PositionRisk[] = [];
    stableSymbolsOrder.forEach((sym) => {
      const found = posMap.get(sym);
      if (found) {
        result.push(found);
        posMap.delete(sym);
      }
    });
    // Append any remainder
    posMap.forEach((p) => result.push(p));
    return result;
  }, [positions, stableSymbolsOrder]);

  const handleOpenOrder = () => {
    if (onOpenOrderModal) {
      onOpenOrderModal();
    } else {
      strategyAutofillService.openOrderModal();
    }
  };

  const getEffectiveTPSL = (pos: PositionRisk) => {
    const isLong = pos.positionAmt > 0;
    const matchingOrders = openOrders.filter(
      o => o.symbol === pos.symbol && o.status !== 'CANCELED' && o.status !== 'EXPIRED' && o.status !== 'FILLED'
    );

    const tpOrder = matchingOrders.find(o => {
      const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
      if (!isCloseSide) return false;
      const typeStr = String(o.type || '').toUpperCase();
      if (typeStr.includes('TAKE_PROFIT') || o.clientOrderId?.includes('TP-')) return true;
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return trig > 0 && (isLong ? trig > pos.entryPrice : trig < pos.entryPrice);
    });

    const slOrder = matchingOrders.find(o => {
      const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
      if (!isCloseSide) return false;
      const typeStr = String(o.type || '').toUpperCase();
      if (typeStr.includes('STOP') || o.clientOrderId?.includes('SL-')) return true;
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return trig > 0 && (isLong ? trig < pos.entryPrice : trig > pos.entryPrice);
    });

    const tpValue = pos.takeProfit || (tpOrder ? (tpOrder.stopPrice > 0 ? tpOrder.stopPrice : tpOrder.price) : undefined);
    const slValue = pos.stopLoss || (slOrder ? (slOrder.stopPrice > 0 ? slOrder.stopPrice : slOrder.price) : undefined);

    return { tpValue, slValue, tpOrder, slOrder };
  };

  const openEditModal = (pos: PositionRisk) => {
    setEditingPos(pos);
    const { tpValue, slValue } = getEffectiveTPSL(pos);
    setEditTp(tpValue ? tpValue.toString() : '');
    setEditSl(slValue ? slValue.toString() : '');
  };

  const handleSaveTPSL = async () => {
    if (!editingPos) return;
    const tp = editTp && parseFloat(editTp) > 0 ? parseFloat(editTp) : undefined;
    const sl = editSl && parseFloat(editSl) > 0 ? parseFloat(editSl) : undefined;
    await binanceWs.updatePositionTPSL(editingPos.symbol, tp, sl);
    setEditingPos(null);
  };

  return (
    <div id="open-positions-table-container" className="w-full flex flex-col bg-neutral-900/90 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950/90 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Posiciones Abiertas (Binance Futures)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-amber-300 font-mono font-bold border border-neutral-700">
            {positions.length} activas
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Lock className="w-2.5 h-2.5" />
            Margen Aislado • Máx 5x
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenOrder}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs"
          >
            <Zap className="w-3 h-3 fill-neutral-950" />
            <span>Nueva Orden</span>
          </button>
        </div>
      </div>

      {/* Table Container - ALWAYS renders the full table header so the positions card is always recognizable */}
      <div className="overflow-x-auto w-full" style={{ minHeight: '520px' }}>
        <table className="w-full text-left text-sm font-mono min-w-[1280px]">
          <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-xs">
            <tr>
              <th className="py-3 px-4">Par</th>
              <th className="py-3 px-4">Estrategia Ligada</th>
              <th className="py-3 px-4">Apalancamiento</th>
              <th className="py-3 px-4">Margen</th>
              <th className="py-3 px-4">Tamaño</th>
              <th className="py-3 px-4">Precio Entrada</th>
              <th className="py-3 px-4">Precio Marcado</th>
              <th className="py-3 px-4">Precio Liq.</th>
              <th className="py-3 px-4">PnL No Realizado</th>
              <th className="py-3 px-4">TP / SL</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {fixedPositions.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-3 shadow-inner">
                      <ShieldCheck className="w-6 h-6 text-emerald-400/80" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-sans">
                      Sin posiciones activas en Binance Futures
                    </h4>
                    <p className="text-xs text-neutral-400 font-sans mt-1 leading-relaxed">
                      Tus órdenes de futuros se ejecutan con margen estrictamente <strong>ISOLATED</strong> y apalancamiento seguro de <strong>1x a 5x</strong>.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={handleOpenOrder}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold font-sans flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                        <span>Abrir Nueva Orden</span>
                      </button>
                      {mode === 'simulation' && (
                        <button
                          type="button"
                          onClick={() => binanceWs.loadSimulationDemoData()}
                          className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-xs font-semibold font-sans transition-colors"
                        >
                          Cargar Posición Demo
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              fixedPositions.map((pos) => {
                const isLong = pos.positionAmt > 0;
                const pnl = pos.unRealizedProfit || 0;
                const isProfit = pnl >= 0;
                const roe = pos.roePercent || 0;
                const safeLeverage = Math.min(5, Math.max(1, pos.leverage || 2));
                const { tpValue, slValue, tpOrder, slOrder } = getEffectiveTPSL(pos);

                return (
                  <React.Fragment key={pos.symbol}>
                    <tr
                      onClick={() => onSelectPosition && onSelectPosition(pos)}
                      className="hover:bg-neutral-800/40 transition-colors cursor-pointer"
                    >
                    {/* Par y Dirección */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{pos.symbol}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isLong
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </div>
                    </td>

                    {/* Estrategia Ligada & Hitos */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(() => {
                          const effStratId = pos.strategyId || binanceWs.getLinkedStrategyForSymbol(pos.symbol)?.strategyId;
                          return effStratId ? (
                            <button
                              type="button"
                              onClick={() => setLinkPos(pos)}
                              title={`Estrategia: ${effStratId} - Clic para cambiar`}
                              className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>{effStratId}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setLinkPos(pos)}
                              className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <LinkIcon className="w-2.5 h-2.5 text-neutral-400" />
                              <span>Ligar Estrategia</span>
                            </button>
                          );
                        })()}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(pos.symbol);
                          }}
                          title="Desplegar seguimiento visual de hitos (E1, E2, E3, TP1, TP2, SL) y recomendaciones"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                            expandedSymbols.has(pos.symbol)
                              ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-xs'
                              : 'bg-neutral-800/90 hover:bg-neutral-700 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          <Layers className="w-2.5 h-2.5 text-amber-400" />
                          <span>Hitos</span>
                          {expandedSymbols.has(pos.symbol) ? (
                            <ChevronUp className="w-2.5 h-2.5" />
                          ) : (
                            <ChevronDown className="w-2.5 h-2.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Apalancamiento Máx 5x */}
                    <td className="py-3 px-3 font-bold">
                      <span className="px-1.5 py-0.5 rounded bg-neutral-950 text-amber-300 border border-neutral-700">
                        {safeLeverage}x
                      </span>
                    </td>

                    {/* Margen Isolated */}
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="text-white font-semibold">${(pos.isolatedMargin || 0).toFixed(2)} USDT</span>
                        <span className="text-[10px] text-blue-400 font-mono">ISOLATED</span>
                      </div>
                    </td>

                    {/* Tamaño */}
                    <td className="py-3 px-3 font-semibold text-neutral-200">
                      {Math.abs(pos.positionAmt || 0).toFixed(3)} {pos.symbol.replace('USDT', '')}
                    </td>

                    {/* Precio Entrada */}
                    <td className="py-3 px-3 text-neutral-300">${(pos.entryPrice || 0).toFixed(2)}</td>

                    {/* Precio Marcado */}
                    <td className="py-3 px-3 text-amber-400 font-bold">${(pos.markPrice || 0).toFixed(2)}</td>

                    {/* Precio Liquidación */}
                    <td className="py-3 px-3 text-rose-400 font-bold">
                      ${(pos.liquidationPrice || 0).toFixed(2)}
                    </td>

                    {/* PnL No Realizado */}
                    <td className="py-3 px-3 font-mono">
                      <div className="flex flex-col">
                        <span className={`font-bold text-xs ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                        </span>
                        <span className={`text-[10px] font-semibold ${isProfit ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>
                          {isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE
                        </span>
                      </div>
                    </td>

                    {/* TP / SL Dinámicos */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {tpValue ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[11px] font-mono">
                            <span className="text-emerald-300 font-bold">TP:</span> ${tpValue.toFixed(2)}
                            {tpOrder && (
                              <span className="text-[9px] px-1 py-0.2 bg-emerald-800/60 text-emerald-200 rounded font-sans" title="Orden condicional activa en Binance">
                                Cond.
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-500 italic">Sin TP</span>
                        )}

                        {slValue ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-400 text-[11px] font-mono">
                            <span className="text-rose-300 font-bold">SL:</span> ${slValue.toFixed(2)}
                            {slOrder && (
                              <span className="text-[9px] px-1 py-0.2 bg-rose-800/60 text-rose-200 rounded font-sans" title="Orden condicional activa en Binance">
                                Cond.
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[11px] text-neutral-500 italic">Sin SL</span>
                        )}

                        <button
                          onClick={() => openEditModal(pos)}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors ml-0.5"
                          title="Configurar / Editar TP y SL (Órdenes Condicionales)"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>

                    {/* Acción de Emergencia */}
                    <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <EmergencyCloseButton
                        symbol={pos.symbol}
                        positionSize={pos.positionAmt}
                        entryPrice={pos.entryPrice}
                        unrealizedPnl={pos.unRealizedProfit}
                        variant="danger"
                      />
                    </td>
                  </tr>

                  {/* Subfila Desplegable de Seguimiento Visual de la Estrategia */}
                  {expandedSymbols.has(pos.symbol) && (
                    <tr className="bg-neutral-950 border-b border-neutral-800">
                      <td colSpan={11} className="p-3 sm:p-4 bg-neutral-950">
                        <StrategyPositionTracker
                          position={pos}
                          onLinkStrategy={(p) => setLinkPos(p)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })
          )}
        </tbody>
        </table>
      </div>

      {/* Edit TP/SL Modal */}
      {editingPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Configurar TP / SL (Órdenes Condicionales)</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Protección de posición mediante órdenes de condición en Binance
                </p>
              </div>
              <button onClick={() => setEditingPos(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between font-mono">
              <div>
                <span className="text-neutral-500">Par:</span> <strong className="text-white">{editingPos.symbol}</strong> ({editingPos.positionAmt > 0 ? 'LONG' : 'SHORT'})
              </div>
              <div>
                <span className="text-neutral-500">Entrada:</span> <strong className="text-amber-400">${(editingPos.entryPrice || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Tamaño:</span> <strong className="text-neutral-200">{Math.abs(editingPos.positionAmt || 0).toFixed(3)}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <span>Take Profit (TP) - Precio de Activación</span>
                  </label>
                  {editTp && parseFloat(editTp) > 0 && (
                    <span className="text-[11px] font-mono text-emerald-300">
                      Est. PnL: +${Math.abs((parseFloat(editTp) - editingPos.entryPrice) * editingPos.positionAmt).toFixed(2)} USDT
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ej: 850.00 (Dejar vacío para desactivar)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <span>Stop Loss (SL) - Precio de Activación</span>
                  </label>
                  {editSl && parseFloat(editSl) > 0 && (
                    <span className="text-[11px] font-mono text-rose-300">
                      Est. PnL: -${Math.abs((editingPos.entryPrice - parseFloat(editSl)) * Math.abs(editingPos.positionAmt)).toFixed(2)} USDT
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm font-mono text-rose-300 focus:border-rose-500 focus:outline-none"
                  placeholder="Ej: 750.00 (Dejar vacío para desactivar)"
                />
              </div>
            </div>

            <div className="bg-neutral-950/80 rounded-lg p-2.5 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">ℹ️ Nota de Sincronización:</span> Las órdenes TP y SL se colocan como órdenes condicionales de protección (Take Profit Market y Stop Market) y serán visibles de inmediato en la pestaña <strong className="text-white">Órdenes Abiertas</strong> bajo el filtro por condición.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setEditingPos(null)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTPSL}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
              >
                Guardar y Activar Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Audit Modal */}
      <RiskAuditModal
        isOpen={!!auditPos}
        onClose={() => setAuditPos(null)}
        position={auditPos}
        walletBalance={balance.totalMarginBalance}
        onOpenLinkStrategy={() => {
          const current = auditPos;
          setAuditPos(null);
          setLinkPos(current);
        }}
        onOpenEditTPSL={() => {
          const current = auditPos;
          setAuditPos(null);
          if (current) openEditModal(current);
        }}
      />

      {/* Link Strategy Modal */}
      <LinkStrategyModal
        isOpen={!!linkPos}
        onClose={() => setLinkPos(null)}
        position={linkPos}
      />
    </div>
  );
};

