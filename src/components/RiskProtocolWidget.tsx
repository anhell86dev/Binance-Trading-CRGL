import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Edit2,
  Layers,
  Lock,
  PieChart,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { AccountBalance, PositionRisk } from '../types/binance';

export const RiskProtocolWidget: React.FC = () => {
  const [balance, setBalance] = useState<AccountBalance>(binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
  const [marginBreakdown, setMarginBreakdown] = useState(binanceWs.getMarginBreakdown());
  const [openOrdersCount, setOpenOrdersCount] = useState(binanceWs.getOpenOrders().length);
  const [mode, setMode] = useState(binanceWs.getMode());
  const [isFetching, setIsFetching] = useState(binanceWs.getIsFetchingBalance());
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAmount, setManualAmount] = useState('');

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setBalance(binanceWs.getBalance());
      setPositions(binanceWs.getPositions());
      setMarginBreakdown(binanceWs.getMarginBreakdown());
      setOpenOrdersCount(binanceWs.getOpenOrders().length);
      setMode(binanceWs.getMode());
      setIsFetching(binanceWs.getIsFetchingBalance());
    });
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setIsFetching(true);
    await binanceWs.fetchAccountBalance();
  };

  const handleApplyManualBalance = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(manualAmount);
    if (!isNaN(val) && val >= 0) {
      binanceWs.setManualBalance(val);
      setShowManualModal(false);
      setManualAmount('');
    }
  };

  const isProfit = (balance?.totalUnrealizedProfit || 0) >= 0;

  // Margin Ratio and Risk Level
  const marginRatio = balance?.marginRatio || 0;
  const isDanger = marginRatio >= 70;
  const isWarning = marginRatio >= 40 && marginRatio < 70;

  // Stacked Progress Percentages
  const total = Math.max(1, marginBreakdown?.totalMarginBalance || 1);
  const ordersMargin = Math.max(0, marginBreakdown?.openOrdersMargin || 0);
  const positionsMargin = Math.max(0, marginBreakdown?.activePositionsMargin || 0);
  const availableMargin = Math.max(0, marginBreakdown?.availableMargin || 0);

  const ordersPct = Math.min(100, Math.max(0, (ordersMargin / total) * 100));
  const positionsPct = Math.min(100 - ordersPct, Math.max(0, (positionsMargin / total) * 100));
  const availPct = Math.min(100, Math.max(0, 100 - ordersPct - positionsPct));

  return (
    <div
      id="risk_protocol_widget"
      className={`rounded-xl p-3 flex flex-col gap-2.5 transition-all duration-300 border ${
        isDanger
          ? 'bg-rose-950/20 border-rose-500/70 ring-1 ring-rose-500/30'
          : isWarning
          ? 'bg-amber-950/15 border-amber-500/60 ring-1 ring-amber-500/20'
          : 'bg-neutral-950/90 border-neutral-800'
      }`}
    >
      {/* Header: Protocol Title & Quick Sync */}
      <div className="flex items-center justify-between gap-1 pb-2 border-b border-neutral-800/80">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
              isDanger
                ? 'bg-rose-500/20 text-rose-400'
                : isWarning
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-3 h-3 animate-bounce" />
            ) : isWarning ? (
              <AlertCircle className="w-3 h-3" />
            ) : (
              <Shield className="w-3 h-3" />
            )}
          </div>
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            Riesgo & Margen Isolated
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleManualSync}
            disabled={isFetching}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-emerald-400 transition-colors"
            title="Sincronizar balance con Binance"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => {
              setManualAmount(balance.availableBalance.toString());
              setShowManualModal(true);
            }}
            className="p-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white transition-colors"
            title="Ajustar capital disponible"
          >
            <Edit2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Margin Ratio Pill & Status */}
      <div className="bg-neutral-900/90 p-2 rounded-lg border border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <PieChart className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-neutral-300 font-medium">Ratio de Margen:</span>
        </div>
        <div className="flex items-center gap-1.5 font-mono">
          <span
            className={`text-sm font-black ${
              isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
            }`}
          >
            {marginRatio.toFixed(1)}%
          </span>
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
              isDanger
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {isDanger ? 'Crítico' : isWarning ? 'Alerta' : 'Seguro'}
          </span>
        </div>
      </div>

      {/* Primary Balances Dual Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Total Margin Balance */}
        <div className="bg-neutral-900/70 p-2 rounded-lg border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-sans">Balance Total</span>
          <div className="text-sm font-bold text-white tracking-tight">
            ${(balance?.totalMarginBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-neutral-500">USDT</span>
        </div>

        {/* Available Margin */}
        <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30 flex flex-col justify-between">
          <span className="text-[10px] text-emerald-400 font-sans font-semibold">Margen Libre</span>
          <div className="text-sm font-bold text-emerald-300 tracking-tight">
            ${(balance?.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[9px] text-emerald-500">{(availPct || 0).toFixed(0)}% libre</span>
        </div>
      </div>

      {/* Secondary KPIs: PnL & Maintenance */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        {/* Unrealized PnL */}
        <div
          className={`p-2 rounded-lg border flex flex-col justify-between ${
            isProfit
              ? 'bg-emerald-950/20 border-emerald-800/40'
              : 'bg-rose-950/20 border-rose-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] text-neutral-400 font-sans">
            <span>PnL No Realizado</span>
            {isProfit ? (
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3 h-3 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xs font-bold ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}${(balance?.totalUnrealizedProfit || 0).toFixed(2)}
          </div>
        </div>

        {/* Maintenance Margin */}
        <div className="bg-neutral-900/70 p-2 rounded-lg border border-neutral-800 flex flex-col justify-between">
          <span className="text-[10px] text-neutral-400 font-sans">Mantenimiento</span>
          <div className="text-xs font-bold text-neutral-300">
            ${(balance?.maintMargin || 0).toFixed(2)}
          </div>
        </div>
      </div>

      {/* Stacked Progress Bar: Capital Allocation */}
      <div className="flex flex-col gap-1 pt-1 text-[10px] font-mono">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="flex items-center gap-1 font-sans">
            <Layers className="w-3 h-3 text-amber-400" />
            Distribución de Margen:
          </span>
          <span className="text-emerald-400 font-bold">{(availPct || 0).toFixed(0)}% Disp.</span>
        </div>

        <div
          className="w-full bg-neutral-900 rounded-md h-2 flex overflow-hidden border border-neutral-800"
          title={`Disponible: ${(availPct || 0).toFixed(1)}% | Posiciones: ${(positionsPct || 0).toFixed(1)}% | Órdenes: ${(ordersPct || 0).toFixed(1)}%`}
        >
          {ordersPct > 0 && (
            <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${ordersPct}%` }} />
          )}
          {positionsPct > 0 && (
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${positionsPct}%` }} />
          )}
          {availPct > 0 && (
            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${availPct}%` }} />
          )}
        </div>

        <div className="flex items-center justify-between text-[9px] text-neutral-500">
          <span>Órdenes: ${(ordersMargin || 0).toFixed(1)}</span>
          <span>Pos: ${(positionsMargin || 0).toFixed(1)}</span>
          <span>Libre: ${(availableMargin || 0).toFixed(1)}</span>
        </div>
      </div>

      {/* Strict isolated reminder badge */}
      <div className="p-1.5 rounded bg-blue-950/20 border border-blue-800/30 text-[10px] text-blue-300/90 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Lock className="w-2.5 h-2.5 text-blue-400" />
          Apalancamiento: <strong>1x-5x</strong>
        </span>
        <span className="font-bold">ISOLATED ONLY</span>
      </div>

      {/* Manual Balance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-xs p-4 shadow-2xl">
            <h3 className="text-xs font-bold text-white mb-1">Ajustar Capital de Margen</h3>
            <p className="text-[11px] text-neutral-400 mb-3">
              Ingresa el capital en USDT para balance disponible:
            </p>
            <form onSubmit={handleApplyManualBalance} className="space-y-3">
              <div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualAmount}
                  onChange={(e) => setManualAmount(e.target.value)}
                  placeholder="1000.00"
                  className="w-full px-2.5 py-1.5 bg-neutral-950 border border-neutral-700 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-2.5 py-1 rounded text-xs text-neutral-400 hover:text-white bg-neutral-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded text-xs font-bold text-black bg-amber-400 hover:bg-amber-300"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
