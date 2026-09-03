import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Edit2,
  Layers,
  Lock,
  PieChart,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { AccountBalance, PositionRisk } from '../types/binance';

export const AccountSummary: React.FC = () => {
  const [balance, setBalance] = useState<AccountBalance>(binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
  const [marginBreakdown, setMarginBreakdown] = useState(binanceWs.getMarginBreakdown());
  const [openOrdersCount, setOpenOrdersCount] = useState(binanceWs.getOpenOrders().length);
  const [mode, setMode] = useState(binanceWs.getMode());
  const [isFetching, setIsFetching] = useState(binanceWs.getIsFetchingBalance());
  const [lastSyncTime, setLastSyncTime] = useState(binanceWs.getLastBalanceSyncTime());
  const [syncError, setSyncError] = useState(binanceWs.getLastBalanceError());
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
      setLastSyncTime(binanceWs.getLastBalanceSyncTime());
      setSyncError(binanceWs.getLastBalanceError());
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

  // Compute Risk Level and Semantic Border Styling
  const marginRatio = balance?.marginRatio || 0;
  const isDanger = marginRatio >= 70;
  const isWarning = marginRatio >= 40 && marginRatio < 70;
  const isSafe = marginRatio < 40;

  const cardBorderClass = isDanger
    ? 'border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/30'
    : isWarning
    ? 'border-amber-500/60 bg-amber-950/15 shadow-md shadow-amber-950/30 ring-1 ring-amber-500/20'
    : 'border-neutral-800/90 bg-neutral-900/90 shadow-xl';

  // Stacked Progress Bar Percentages
  const total = Math.max(1, marginBreakdown?.totalMarginBalance || 1);
  const ordersMargin = Math.max(0, marginBreakdown?.openOrdersMargin || 0);
  const positionsMargin = Math.max(0, marginBreakdown?.activePositionsMargin || 0);
  const availableMargin = Math.max(0, marginBreakdown?.availableMargin || 0);

  const ordersPct = Math.min(100, Math.max(0, (ordersMargin / total) * 100));
  const positionsPct = Math.min(100 - ordersPct, Math.max(0, (positionsMargin / total) * 100));
  const availPct = Math.min(100, Math.max(0, 100 - ordersPct - positionsPct));

  return (
    <div
      id="account_risk_summary_card"
      className={`rounded-xl p-3.5 sm:p-4 transition-all duration-300 border ${cardBorderClass}`}
    >
      {/* Top Banner: Strict Risk Protocol Mandates & Sync Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold border ${
              isDanger
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : isWarning
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {isDanger ? (
              <AlertTriangle className="w-4 h-4 animate-bounce" />
            ) : isWarning ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                Panel de Control de Riesgo & Margen Isolated
              </h3>
              <span
                className={`px-2 py-0.2 rounded text-[10px] font-mono font-bold uppercase ${
                  isDanger
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                    : isWarning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                }`}
              >
                {isDanger ? 'Riesgo Crítico' : isWarning ? 'Atención Apalancamiento' : 'Margen Seguro'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Apalancamiento estricto <strong>1x-5x</strong> • Cada posición aislada con liquidación independiente
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Lock className="w-3 h-3" />
            ISOLATED ONLY
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            MAX 5X LEVERAGE
          </span>

          {/* Sync Button */}
          <button
            id="sync-balance-btn"
            onClick={handleManualSync}
            disabled={isFetching}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
              isFetching
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed'
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60'
            }`}
            title="Sincronizar balance de margen con Binance Futures"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isFetching ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          {/* Manual Capital Adjustment */}
          <button
            id="manual-balance-btn"
            onClick={() => {
              setManualAmount(balance.availableBalance.toString());
              setShowManualModal(true);
            }}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
            title="Ajustar balance de prueba o capital"
          >
            <Edit2 className="w-3 h-3 text-neutral-400" />
            <span>Ajustar</span>
          </button>

          {mode === 'simulation' && (
            <button
              id="reset-balance-btn"
              onClick={() => binanceWs.resetSimulationBalance(10000)}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
              title="Restaurar a 10,000 USDT de prueba"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Sync Status / Error Banner if any */}
      {syncError && mode !== 'simulation' && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Aviso de sincronización de balance en Binance:</span>
              <p className="text-[11px] text-rose-300/90 mt-0.5">{syncError}</p>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            className="shrink-0 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 text-rose-100 border border-rose-700 text-[11px] transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Unified KPI Cards Grid (Subtle backgrounds, semantic borders) */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* 1. Total Margin Balance (Balance Total Margen) */}
        <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium text-neutral-300 flex items-center gap-1">
              <Wallet className="w-3.5 h-3.5 text-neutral-400" />
              Balance Total Margen
            </span>
            <span className="text-[10px] font-mono text-neutral-500">USDT</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            ${(balance?.totalMarginBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex justify-between">
            <span>Wallet Total:</span>
            <span className="text-neutral-300">${(balance?.totalWalletBalance || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 2. Available Margin (Margen Disponible) */}
        <div className="bg-gradient-to-b from-emerald-950/30 to-neutral-950/70 p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              Margen Disponible
            </span>
            <span className="text-[10px] font-mono text-emerald-500 font-bold">LIBRE</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-300">
            ${(balance?.availableBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex justify-between">
            <span>Para nuevas órdenes:</span>
            <span className="text-emerald-400 font-bold">{(availPct || 0).toFixed(1)}%</span>
          </div>
        </div>

        {/* 3. Unrealized PnL (PnL No Realizado) */}
        <div
          className={`p-3 rounded-xl border flex flex-col justify-between ${
            isProfit
              ? 'bg-emerald-950/20 border-emerald-800/50'
              : 'bg-rose-950/20 border-rose-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium text-neutral-300 flex items-center gap-1">
              <TrendingUp className={`w-3.5 h-3.5 ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`} />
              PnL No Realizado
            </span>
            {isProfit ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isProfit ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isProfit ? '+' : ''}${(balance?.totalUnrealizedProfit || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex justify-between">
            <span>Posiciones activas:</span>
            <span className="text-neutral-200">{positions.length}</span>
          </div>
        </div>

        {/* 4. Maintenance Margin (Margen de Mantenimiento) */}
        <div className="bg-neutral-950/70 p-3 rounded-xl border border-neutral-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-medium text-neutral-300 flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-neutral-400" />
              Margen Mantenimiento
            </span>
            <span className="text-[10px] font-mono text-neutral-500">Maint</span>
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-neutral-200">
            ${(balance?.maintMargin || 0).toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex justify-between">
            <span>Margen Inicial:</span>
            <span className="text-neutral-300">${(marginBreakdown?.activePositionsMargin || 0).toFixed(2)}</span>
          </div>
        </div>

        {/* 5. Unified Margin Ratio & Risk KPI Card */}
        <div
          className={`p-3 rounded-xl border col-span-2 md:col-span-4 lg:col-span-1 flex flex-col justify-between ${
            isDanger
              ? 'bg-rose-950/30 border-rose-500/70'
              : isWarning
              ? 'bg-amber-950/30 border-amber-500/60'
              : 'bg-neutral-950/70 border-neutral-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-neutral-300 flex items-center gap-1">
              <PieChart className="w-3.5 h-3.5 text-amber-400" />
              Ratio de Margen
            </span>
            <span
              className={`font-mono font-bold text-xs ${
                isDanger ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {(marginRatio || 0).toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden my-1 border border-neutral-800">
            <div
              className={`h-full transition-all duration-300 ${
                isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, marginRatio))}%` }}
            />
          </div>

          <div className="text-[10px] text-neutral-400 font-mono pt-1 border-t border-neutral-900 flex justify-between items-center">
            <span>Riesgo {isDanger ? 'Alto (Liquidación)' : isWarning ? 'Medio' : 'Bajo'}</span>
            <span className="text-neutral-500">Máx: 100%</span>
          </div>
        </div>
      </div>

      {/* Visual Stacked Progress Bar: Capital Allocation (Replaces Dense Text Equation) */}
      <div
        id="stacked_margin_progress_container"
        className="mt-3.5 pt-3 border-t border-neutral-800/80 flex flex-col gap-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Distribución Visual del Capital
          </span>

          {/* Legend Items */}
          <div className="flex items-center gap-3 flex-wrap font-mono text-[11px]">
            <div className="flex items-center gap-1.5" title="Capital en órdenes pendientes">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block shrink-0" />
              <span className="text-neutral-400">Órdenes Abiertas:</span>
              <strong className="text-amber-300">${(ordersMargin || 0).toFixed(2)} ({(ordersPct || 0).toFixed(1)}%)</strong>
            </div>

            <div className="flex items-center gap-1.5" title="Margen asignado en posiciones activas">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block shrink-0" />
              <span className="text-neutral-400">Posiciones Aisladas:</span>
              <strong className="text-blue-300">${(positionsMargin || 0).toFixed(2)} ({(positionsPct || 0).toFixed(1)}%)</strong>
            </div>

            <div className="flex items-center gap-1.5" title="Margen libre disponible para operar">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block shrink-0" />
              <span className="text-neutral-400">Disponible:</span>
              <strong className="text-emerald-300">${(availableMargin || 0).toFixed(2)} ({(availPct || 0).toFixed(1)}%)</strong>
            </div>
          </div>
        </div>

        {/* Stacked Progress Bar Bar */}
        <div
          className="w-full bg-neutral-950 rounded-lg h-3 flex overflow-hidden border border-neutral-800 shadow-inner"
          title={`Disponible: ${(availPct || 0).toFixed(1)}% | Posiciones: ${(positionsPct || 0).toFixed(1)}% | Órdenes: ${(ordersPct || 0).toFixed(1)}%`}
        >
          {/* 1. Órdenes Comprometidas (Amber) */}
          {ordersPct > 0 && (
            <div
              className="bg-amber-500 h-full transition-all duration-300 relative group cursor-pointer"
              style={{ width: `${ordersPct}%` }}
            />
          )}

          {/* 2. Posiciones Aisladas Activas (Blue) */}
          {positionsPct > 0 && (
            <div
              className="bg-blue-500 h-full transition-all duration-300 relative group cursor-pointer"
              style={{ width: `${positionsPct}%` }}
            />
          )}

          {/* 3. Margen Disponible Libre (Emerald) */}
          {availPct > 0 && (
            <div
              className="bg-emerald-500 h-full transition-all duration-300 relative group cursor-pointer"
              style={{ width: `${availPct}%` }}
            />
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono px-0.5">
          <span>0%</span>
          <span>
            {positions.length} pos. activa{positions.length === 1 ? '' : 's'} • {openOrdersCount} orden{openOrdersCount === 1 ? '' : 'es'}
          </span>
          <span>Balance Total: ${(total || 0).toFixed(2)} USDT</span>
        </div>
      </div>

      {/* Manual Balance Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-sm p-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white mb-2">Ajustar Margen Disponible</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Ingresa el capital en USDT disponible para ejecutar órdenes de estrategia o simulación:
            </p>
            <form onSubmit={handleApplyManualBalance} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">Capital Disponible (USDT)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualAmount}
                    onChange={(e) => setManualAmount(e.target.value)}
                    placeholder="1000.00"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-500"
                    autoFocus
                  />
                  <span className="absolute right-3 top-2 text-xs text-neutral-500">USDT</span>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300"
                >
                  Guardar Capital
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
