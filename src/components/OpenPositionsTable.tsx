import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
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
import { PositionRisk } from '../types/binance';
import { EmergencyCloseButton } from './EmergencyCloseButton';
import { auditPositionRisk } from '../utils/riskAuditor';
import { RiskAuditModal } from './RiskAuditModal';
import { LinkStrategyModal } from './LinkStrategyModal';

interface OpenPositionsTableProps {
  onSelectPosition?: (pos: PositionRisk) => void;
}

export const OpenPositionsTable: React.FC<OpenPositionsTableProps> = ({ onSelectPosition }) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const mode = binanceWs.getMode();

  // Modal for editing TP/SL
  const [editingPos, setEditingPos] = useState<PositionRisk | null>(null);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');

  // Modals for Risk Audit & Link Strategy
  const [auditPos, setAuditPos] = useState<PositionRisk | null>(null);
  const [linkPos, setLinkPos] = useState<PositionRisk | null>(null);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setPositions(binanceWs.getPositions());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    await binanceWs.syncAllAccountData();
  };

  const openEditModal = (pos: PositionRisk) => {
    setEditingPos(pos);
    setEditTp(pos.takeProfit ? pos.takeProfit.toString() : '');
    setEditSl(pos.stopLoss ? pos.stopLoss.toString() : '');
  };

  const handleSaveTPSL = () => {
    if (!editingPos) return;
    const tp = editTp ? parseFloat(editTp) : undefined;
    const sl = editSl ? parseFloat(editSl) : undefined;
    binanceWs.updatePositionTPSL(editingPos.symbol, tp, sl);
    setEditingPos(null);
  };

  return (
    <div id="open-positions-table-container" className="flex flex-col bg-neutral-900/90 rounded-xl border border-neutral-800 overflow-hidden">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950/80 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Posiciones Abiertas (Binance Futures)</span>
          </div>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-800 text-neutral-300 font-mono font-bold">
            {positions.length}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Lock className="w-2.5 h-2.5" />
            Margen Aislado • Máx 5x
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="text-[11px] font-medium text-neutral-300 hover:text-white px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Sincronizar posiciones en vivo con la API de Binance"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      {/* Table Body or Empty State */}
      <div className="overflow-x-auto min-h-[180px]">
        {positions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-neutral-400 text-xs">
            <Shield className="w-8 h-8 text-neutral-600 mb-2" />
            <p className="font-semibold text-neutral-200 text-sm">Sin posiciones activas en Binance</p>
            <p className="text-[11px] text-neutral-500 mt-0.5 max-w-md">
              Tus órdenes de futuros se ejecutan con margen estrictamente ISOLATED y apalancamiento seguro de 1x a 5x.
            </p>
            {mode === 'simulation' && (
              <button
                onClick={() => binanceWs.loadSimulationDemoData()}
                className="mt-3 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors"
              >
                Cargar Posición Demo
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px]">
              <tr>
                <th className="py-2.5 px-3">Par</th>
                <th className="py-2.5 px-3">Estrategia Ligada</th>
                <th className="py-2.5 px-3">Gestión de Riesgo</th>
                <th className="py-2.5 px-3">Apalancamiento</th>
                <th className="py-2.5 px-3">Margen</th>
                <th className="py-2.5 px-3">Tamaño</th>
                <th className="py-2.5 px-3">Precio Entrada</th>
                <th className="py-2.5 px-3">Precio Marcado</th>
                <th className="py-2.5 px-3">Precio Liq.</th>
                <th className="py-2.5 px-3">PnL No Realizado</th>
                <th className="py-2.5 px-3">TP / SL</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {positions.map((pos) => {
                const isLong = pos.positionAmt > 0;
                const isProfit = pos.unRealizedProfit >= 0;
                const safeLeverage = Math.min(5, Math.max(1, pos.leverage || 2));
                const audit = auditPositionRisk(pos, balance.totalMarginBalance);

                return (
                  <tr
                    key={pos.symbol}
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

                    {/* Estrategia Ligada */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {pos.strategyId ? (
                          <button
                            type="button"
                            onClick={() => setLinkPos(pos)}
                            title={`Estrategia: ${pos.strategyId} - Clic para cambiar`}
                            className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center gap-1 transition-colors"
                          >
                            <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                            <span>{pos.strategyId}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setLinkPos(pos)}
                            className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <LinkIcon className="w-2.5 h-2.5 text-neutral-400" />
                            <span>Ligar Estrategia</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Gestión de Riesgo Badge */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setAuditPos(pos)}
                        title="Ver auditoría de riesgo institucional detallada"
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 transition-transform hover:scale-105 ${audit.badgeColor}`}
                      >
                        {audit.overallStatus === 'OPTIMAL' ? (
                          <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <ShieldAlert className="w-3 h-3" />
                        )}
                        <span>{audit.badgeText}</span>
                      </button>
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
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-bold">
                        <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                          {isProfit ? '+' : ''}${(pos.unRealizedProfit || 0).toFixed(2)}
                        </span>
                        <span className={`text-[11px] ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({isProfit ? '+' : ''}{(pos.roePercent || 0).toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    {/* TP / SL Dinámicos */}
                    <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-neutral-400">
                          TP: {pos.takeProfit ? `$${pos.takeProfit}` : '-'} | SL:{' '}
                          {pos.stopLoss ? `$${pos.stopLoss}` : '-'}
                        </span>
                        <button
                          onClick={() => openEditModal(pos)}
                          className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
                          title="Editar TP/SL"
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Edit TP/SL Modal */}
      {editingPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white">Editar TP / SL de Posición</h3>
              <button onClick={() => setEditingPos(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-400">
              Posición: <strong className="text-white">{editingPos.symbol}</strong> Entrada: $
              {(editingPos.entryPrice || 0).toFixed(2)}
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-xs text-emerald-400 block mb-1 font-semibold">Take Profit (USDT)</label>
                <input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-emerald-300"
                  placeholder="Ej: 850.00"
                />
              </div>

              <div>
                <label className="text-xs text-rose-400 block mb-1 font-semibold">Stop Loss (USDT)</label>
                <input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-sm font-mono text-rose-300"
                  placeholder="Ej: 750.00"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setEditingPos(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTPSL}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold"
              >
                Guardar
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

