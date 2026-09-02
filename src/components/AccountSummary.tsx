import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  DollarSign,
  Lock,
  RefreshCw,
  Shield,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { AccountBalance, PositionRisk } from '../types/binance';

export const AccountSummary: React.FC = () => {
  const [balance, setBalance] = useState<AccountBalance>(binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
  const [mode, setMode] = useState(binanceWs.getMode());

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setBalance(binanceWs.getBalance());
      setPositions(binanceWs.getPositions());
      setMode(binanceWs.getMode());
    });
    return () => unsub();
  }, []);

  const isProfit = balance.totalUnrealizedProfit >= 0;

  return (
    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl p-4">
      {/* Top Banner: Strict Risk Protocol Mandates */}
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
          {mode === 'simulation' && (
            <button
              id="reset-balance-btn"
              onClick={() => binanceWs.resetSimulationBalance(10000)}
              className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1 transition-colors"
              title="Restaurar a 10,000 USDT de prueba"
            >
              <RefreshCw className="w-3 h-3 text-neutral-400" />
              Reset Balance
            </button>
          )}
        </div>
      </div>

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
            <DollarSign className="w-3.5 h-3.5 text-neutral-500" />
          </div>
          <div className="text-xl font-bold font-mono tracking-tight text-neutral-100">
            ${balance.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-neutral-400 font-mono mt-0.5">
            Para nuevas órdenes
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
    </div>
  );
};
