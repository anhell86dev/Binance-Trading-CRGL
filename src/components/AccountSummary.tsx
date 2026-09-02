import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Edit2,
  Lock,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
  Wifi,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { AccountBalance, PositionRisk } from '../types/binance';

export const AccountSummary: React.FC = () => {
  const [balance, setBalance] = useState<AccountBalance>(binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
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

  const isProfit = balance.totalUnrealizedProfit >= 0;

  return (
    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-4">
      {/* Top Banner: Strict Risk Protocol Mandates & Sync Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
              Protocolo de Control de Riesgo Activo
            </h3>
            <p className="text-[11px] text-neutral-400">
              Margen <strong>ISOLATED</strong> obligatorio | Apalancamiento limitado estrictamente de <strong>1x a 5x</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Shield className="w-3 h-3" />
            ISOLATED ONLY
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            MAX 5X LEVERAGE
          </span>

          {/* Sync / Refresh Button */}
          <button
            id="sync-balance-btn"
            onClick={handleManualSync}
            disabled={isFetching}
            className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center gap-1.5 transition-colors ${
              isFetching
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed'
                : 'bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border-emerald-800/60'
            }`}
            title="Sincronizar margen y balance con Binance"
          >
            <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            {isFetching ? 'Sincronizando...' : 'Sincronizar Balance'}
          </button>

          {/* Manual Capital Adjustment */}
          <button
            id="manual-balance-btn"
            onClick={() => {
              setManualAmount(balance.availableBalance.toString());
              setShowManualModal(true);
            }}
            className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
            title="Ajustar balance disponible manualmente"
          >
            <Edit2 className="w-3 h-3 text-neutral-400" />
            Ajustar
          </button>

          {mode === 'simulation' && (
            <button
              id="reset-balance-btn"
              onClick={() => binanceWs.resetSimulationBalance(10000)}
              className="px-2 py-1 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
              title="Restaurar a 10,000 USDT de prueba"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Sync Status / Error Banner */}
      {syncError && mode !== 'simulation' && (
        <div className="mb-3 p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Aviso de sincronización de balance en Binance:</span>
              <p className="text-[11px] text-rose-300/90 mt-0.5">
                {syncError}
              </p>
              <p className="text-[10px] text-neutral-400 mt-1">
                Consejo: Asegúrate de que en tu cuenta de Binance, la API Key tenga activado el permiso <strong>"Enable Futures" (Habilitar Futuros)</strong> y que tu cuenta tenga fondos en la billetera de USDⓈ-M Futures.
              </p>
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

      {/* Live sync indicator when connected to real Binance in production */}
      {mode !== 'simulation' && !syncError && lastSyncTime > 0 && (
        <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-2 px-1">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Conectado en vivo a Binance ({mode.toUpperCase()})</span>
          </div>
          <span className="text-neutral-500 font-mono">
            Última sync: {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Grid of Key Account Balance Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Margin Balance */}
        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Balance Total Margen</span>
            <Wallet className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-white">
            ${balance.totalMarginBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Wallet: ${balance.totalWalletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className={`p-3 rounded-lg border ${isProfit ? 'bg-emerald-950/20 border-emerald-800/50' : 'bg-rose-950/20 border-rose-800/50'}`}>
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>PnL No Realizado</span>
            {isProfit ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-bold font-mono tracking-tight ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isProfit ? '+' : ''}${balance.totalUnrealizedProfit.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            {positions.length} posición{positions.length === 1 ? '' : 'es'} activa{positions.length === 1 ? '' : 's'}
          </div>
        </div>

        {/* Available Margin */}
        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Margen Disponible</span>
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-emerald-300">
            ${balance.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Para órdenes de estrategia
          </div>
        </div>

        {/* Maintenance Margin */}
        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Margen de Mant.</span>
            <AlertCircle className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-neutral-200">
            ${balance.maintMargin.toFixed(2)}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Mantenimiento 10%
          </div>
        </div>

        {/* Margin Ratio Gauge */}
        <div className="bg-neutral-950/60 p-3 rounded-lg border border-neutral-800/80 col-span-2 md:col-span-4 lg:col-span-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span>Ratio de Margen</span>
            <span className={`font-mono font-bold ${balance.marginRatio > 70 ? 'text-rose-400' : balance.marginRatio > 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
              {balance.marginRatio.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-neutral-800 rounded-full h-2 mt-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                balance.marginRatio > 70 ? 'bg-rose-500' : balance.marginRatio > 40 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, balance.marginRatio))}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono mt-1.5">
            <span>Riesgo Bajo</span>
            <span>Liquidación (100%)</span>
          </div>
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
