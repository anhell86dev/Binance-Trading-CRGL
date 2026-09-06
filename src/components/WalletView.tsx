import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  Clock,
  Coins,
  Cpu,
  DollarSign,
  Globe,
  HelpCircle,
  Key,
  Layers,
  Lock,
  PieChart,
  Plus,
  QrCode,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Unlock,
  Wallet,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { binanceWalletApiService } from '../services/binanceWalletApiService';
import { AccountBalance, PositionRisk } from '../types/binance';
import {
  BinanceUnifiedAccountProfile,
  BinanceUniversalTransferType,
  BinanceUserWalletBalanceItem,
} from '../types/binanceWalletApi';
import { notificationService } from '../services/notifications';
import { RiskProtocolWidget } from './RiskProtocolWidget';

interface WalletViewProps {
  onGoToTrading: () => void;
  onOpenOrderModal?: () => void;
  onGoToGestionTrades?: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({
  onGoToTrading,
  onOpenOrderModal,
  onGoToGestionTrades,
}) => {
  const [balance, setBalance] = useState<AccountBalance>(() => binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [mode, setMode] = useState(binanceWs.getMode());
  const [profile, setProfile] = useState<BinanceUnifiedAccountProfile>(() =>
    binanceWalletApiService.getCachedProfile()
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeWalletTab, setActiveWalletTab] = useState<'overview' | 'wallets' | 'assets' | 'api_permissions' | 'transfer'>('overview');

  // Modals state
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');
  
  // Universal Transfer state
  const [transferType, setTransferType] = useState<BinanceUniversalTransferType>('MAIN_UMFUTURE');
  const [transferAsset, setTransferAsset] = useState('USDT');
  const [transferAmount, setTransferAmount] = useState('100');
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setBalance(binanceWs.getBalance());
      setPositions(binanceWs.getPositions());
      setMode(binanceWs.getMode());
    });

    const unsubWalletApi = binanceWalletApiService.subscribe((p) => {
      setProfile(p);
    });

    // Initial fetch of unified profile
    binanceWalletApiService.fetchUnifiedAccountProfile().catch(() => {});

    return () => {
      unsubWs();
      unsubWalletApi();
    };
  }, []);

  const totalIsolatedMargin = positions.reduce((acc, pos) => acc + (pos.isolatedMargin || 0), 0);
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unRealizedProfit || 0), 0);
  const marginUsagePercent =
    balance.totalWalletBalance > 0
      ? (totalIsolatedMargin / balance.totalWalletBalance) * 100
      : 0;

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        binanceWs.syncAllAccountData(),
        binanceWalletApiService.fetchUnifiedAccountProfile(),
      ]);
      notificationService.notify('SYSTEM', 'Sincronización Completa', 'Esquema OpenAPI Wallet REST API sincronizado.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSimulatedDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;

    const current = binanceWs.getBalance();
    const updated: AccountBalance = {
      ...current,
      totalWalletBalance: current.totalWalletBalance + amt,
      availableBalance: current.availableBalance + amt,
      totalMarginBalance: current.totalMarginBalance + amt,
    };
    binanceWs.setSimulatedBalance(updated);
    setIsDepositModalOpen(false);
    notificationService.notify('SYSTEM', 'Saldo Añadido', `Se han acreditado $${amt.toFixed(2)} USDT.`);
    binanceWalletApiService.fetchUnifiedAccountProfile().catch(() => {});
  };

  const handleResetBalance = () => {
    binanceWs.resetSimulationBalance(10000);
    notificationService.notify('SYSTEM', 'Billetera Reiniciada', 'El saldo se ha restablecido a $10,000.00 USDT.');
    binanceWalletApiService.fetchUnifiedAccountProfile().catch(() => {});
  };

  const handleExecuteTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(transferAmount);
    if (isNaN(amt) || amt <= 0) return;

    setIsTransferring(true);
    try {
      const res = await binanceWalletApiService.universalTransfer(transferType, transferAsset, amt);
      if (res.success) {
        notificationService.notify('SYSTEM', 'Transferencia Universal Exitosa', `TranID: ${res.tranId} (${amt} ${transferAsset})`);
        await binanceWalletApiService.fetchUnifiedAccountProfile();
      } else {
        notificationService.notify('SYSTEM', 'Error en Transferencia', res.error || 'No se pudo procesar.');
      }
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div id="wallet-view-container" className="w-full max-w-none px-3 sm:px-6 lg:px-8 mx-auto flex flex-col gap-6 pb-20 flex-1">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-white">Billetera Binance &amp; Cuentas OpenAPI 3.0.2</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                Wallet REST API v1.0
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-bold border border-blue-500/30">
                VIP {profile.accountInfo.vipLevel}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Esquema oficial de Binance: /sapi/v1/account/*, /sapi/v1/asset/wallet/balance, /sapi/v3/asset/getUserAsset
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-refresh-wallet-openapi"
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Sincronizar todo el perfil de cuenta vía OpenAPI"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Sincronizando...' : 'Sincronizar OpenAPI'}</span>
          </button>

          {onGoToGestionTrades && (
            <button
              type="button"
              id="btn-wallet-goto-gestion-trades"
              onClick={onGoToGestionTrades}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              title="Ir a Gestión de Trades"
            >
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Gestión de Trades</span>
              {positions.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {positions.length}
                </span>
              )}
            </button>
          )}

          {mode === 'simulation' && (
            <>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Depositar Demo</span>
              </button>
              <button
                type="button"
                onClick={handleResetBalance}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Restablecer saldo demo a $10,000 USDT"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
            </>
          )}

          {onOpenOrderModal && (
            <button
              type="button"
              onClick={onOpenOrderModal}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ring-1 ring-amber-400/50"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Nueva Orden (Popup)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onGoToTrading}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <span>Ver Terminal</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-neutral-800 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveWalletTab('overview')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeWalletTab === 'overview'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <PieChart className="w-3.5 h-3.5" />
          <span>Resumen de Margen &amp; Futuros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveWalletTab('wallets')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeWalletTab === 'wallets'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Wallet className="w-3.5 h-3.5" />
          <span>Multi-Billeteras (/sapi/v1/asset/wallet/balance)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveWalletTab('assets')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeWalletTab === 'assets'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Coins className="w-3.5 h-3.5" />
          <span>Activos del Usuario (/sapi/v3/asset/getUserAsset)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveWalletTab('api_permissions')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeWalletTab === 'api_permissions'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Permisos API &amp; Estado (/sapi/v1/account/*)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveWalletTab('transfer')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shrink-0 cursor-pointer ${
            activeWalletTab === 'transfer'
              ? 'bg-amber-500 text-neutral-950 shadow-sm'
              : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transferencia Universal (/sapi/v1/asset/transfer)</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeWalletTab === 'overview' && (
        <div className="flex flex-col gap-6 animate-fade-in">
          {/* Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800/80 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Estado de Cuenta:</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {profile.accountStatus.data}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Estado del Sistema:</span>
              <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                <Server className="w-3 h-3" />
                {profile.systemStatus.msg.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Descuento BNB:</span>
              <span className={`font-mono font-bold ${profile.bnbBurn.spotBNBBurn ? 'text-amber-400' : 'text-neutral-500'}`}>
                {profile.bnbBurn.spotBNBBurn ? 'Activo (BNB Burn ON)' : 'Inactivo'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-neutral-400">Futures Trading:</span>
              <span className={`font-mono font-bold ${profile.apiRestrictions.enableFutures ? 'text-emerald-400' : 'text-rose-400'}`}>
                {profile.apiRestrictions.enableFutures ? 'Habilitado' : 'Bloqueado'}
              </span>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-4">
                {/* Card 1: Saldo Total Margen */}
                <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center justify-between text-center gap-2.5 shadow-sm flex-1">
                  <div className="w-full flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Saldo Total Margen</span>
                    <DollarSign className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="my-auto py-2">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
                      ${(balance.totalWalletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-amber-400/90 font-mono font-semibold mt-1">USDT (USDⓈ-M)</div>
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-center gap-1.5 border-t border-neutral-800/80 pt-2 w-full">
                    <span>Disponible:</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      ${(balance.availableBalance || 0).toFixed(2)} USDT
                    </span>
                  </div>
                </div>

                {/* Card 2: PnL No Realizado */}
                <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center justify-between text-center gap-2.5 shadow-sm flex-1">
                  <div className="w-full flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">PnL No Realizado Total</span>
                    <TrendingUp className={`w-4 h-4 ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
                  </div>
                  <div className="my-auto py-2">
                    <div className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
                    </div>
                    <div className={`text-xs font-mono font-semibold mt-1 ${totalUnrealizedPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      USDT
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-2 w-full text-center">
                    {totalUnrealizedPnl >= 0 ? (
                      <span className="text-emerald-400 font-medium">Rendimiento positivo en posiciones</span>
                    ) : (
                      <span className="text-neutral-400">Exposición acotada por SL</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {/* Card 3: Garantía Margen Aislado */}
                <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center justify-between text-center gap-2.5 shadow-sm flex-1">
                  <div className="w-full flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Garantía Margen Aislado</span>
                    <Lock className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="my-auto py-2">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-blue-300 tracking-tight">
                      ${totalIsolatedMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-blue-400 font-mono font-semibold mt-1">USDT Comprometido</div>
                  </div>
                  <div className="text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-2 w-full text-center">
                    <span>En <strong className="text-white font-mono">{positions.length}</strong> posiciones activas</span>
                  </div>
                </div>

                {/* Card 4: Protección de Riesgo */}
                <div className="p-5 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col items-center justify-between text-center gap-2.5 shadow-sm flex-1">
                  <div className="w-full flex items-center justify-between text-neutral-400 text-xs">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Garantía Protección</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="my-auto py-2">
                    <div className="text-3xl sm:text-4xl font-black font-mono text-emerald-300 tracking-tight">
                      1x - 5x
                    </div>
                    <div className="text-xs text-emerald-400 font-mono font-semibold mt-1">Máx. Institucional</div>
                  </div>
                  <div className="text-[11px] text-emerald-400/90 font-medium border-t border-neutral-800/80 pt-2 w-full flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Sin contagio cruzado</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Protocol Widget */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="bg-neutral-900/80 rounded-xl border border-neutral-800 p-3.5 flex flex-col gap-3 shadow-lg h-full">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                      Riesgo y Margen Isolated
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30">
                    100% Aislado
                  </span>
                </div>
                <div className="flex-1">
                  <RiskProtocolWidget />
                </div>
              </div>
            </div>
          </div>

          {/* Margen Usage Progress */}
          <div className="w-full bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col gap-3 shadow-sm">
            <div className="flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">Utilización del Margen de la Cuenta</span>
                <span className="text-xs font-mono text-neutral-400">
                  ({totalIsolatedMargin.toFixed(2)} / {(balance.totalWalletBalance || 0).toFixed(2)} USDT)
                </span>
              </div>
              <span className="font-mono font-bold text-sm text-amber-400">
                {marginUsagePercent.toFixed(1)}% Usado
              </span>
            </div>

            <div className="w-full h-4 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800 flex">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  marginUsagePercent > 70
                    ? 'bg-rose-500'
                    : marginUsagePercent > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, marginUsagePercent)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
              <span>0% (Todo libre)</span>
              <span className="text-emerald-400 font-medium font-sans">Zona Segura (&lt; 50%)</span>
              <span className="text-rose-400 font-medium font-sans">Límite Prudente (80%)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-WALLETS (/sapi/v1/asset/wallet/balance) */}
      {activeWalletTab === 'wallets' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-amber-400" />
                  Saldos por Billetera Binance (/sapi/v1/asset/wallet/balance)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Desglose oficial por cuenta: Spot, USDⓈ-M Futures, Funding, Cross Margin e Isolated Margin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.walletBalances.map((w, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                    w.activate
                      ? 'bg-neutral-950/80 border-neutral-800'
                      : 'bg-neutral-950/40 border-neutral-900 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm">{w.walletName}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold border ${
                        w.activate
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {w.activate ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>

                  <div className="py-2">
                    <div className="text-2xl font-bold font-mono text-white">
                      ${parseFloat(w.balance || '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[11px] text-neutral-400 font-mono">Valuación en USDT</div>
                  </div>

                  {w.assetBalances && w.assetBalances.length > 0 && (
                    <div className="border-t border-neutral-800/80 pt-2 flex flex-col gap-1.5 text-xs font-mono">
                      {w.assetBalances.map((a, aIdx) => (
                        <div key={aIdx} className="flex items-center justify-between text-[11px]">
                          <span className="text-neutral-300 font-bold">{a.asset}:</span>
                          <span className="text-neutral-400">
                            Libre: <strong className="text-emerald-400 font-mono">{a.free}</strong> | Bloq: {a.locked}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: POSITIVE USER ASSETS (/sapi/v3/asset/getUserAsset) */}
      {activeWalletTab === 'assets' && (
        <div className="flex flex-col gap-4 animate-fade-in">
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Activos Positivos del Usuario (/sapi/v3/asset/getUserAsset)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Lista de tokens y balances con saldo positivo en la cuenta Binance.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400 uppercase font-mono text-[11px]">
                    <th className="py-2.5 px-3">Activo</th>
                    <th className="py-2.5 px-3 text-right">Disponible (Free)</th>
                    <th className="py-2.5 px-3 text-right">Bloqueado (Locked)</th>
                    <th className="py-2.5 px-3 text-right">En Retiro (Withdrawing)</th>
                    <th className="py-2.5 px-3 text-right">Valuación BTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-mono">
                  {profile.userAssets.map((asset, idx) => (
                    <tr key={idx} className="hover:bg-neutral-800/40 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        {asset.asset}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">{asset.free}</td>
                      <td className="py-2.5 px-3 text-right text-neutral-400">{asset.locked}</td>
                      <td className="py-2.5 px-3 text-right text-neutral-400">{asset.withdrawing || '0.00'}</td>
                      <td className="py-2.5 px-3 text-right text-amber-300 font-semibold">{asset.btcValuation || '0.00000000'} BTC</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: API RESTRICTIONS & TRADING STATUS (/sapi/v1/account/*) */}
      {activeWalletTab === 'api_permissions' && (
        <div className="flex flex-col gap-5 animate-fade-in">
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  Permisos de la API Key (/sapi/v1/account/apiRestrictions)
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Verificación de seguridad y capacidades operativas habilitadas para esta clave.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: 'Lectura de Datos (enableReading)', val: profile.apiRestrictions.enableReading, mandatory: true },
                { label: 'Operar Futuros (enableFutures)', val: profile.apiRestrictions.enableFutures, mandatory: true },
                { label: 'Trading Spot & Margin (enableSpotAndMarginTrading)', val: profile.apiRestrictions.enableSpotAndMarginTrading, mandatory: false },
                { label: 'Transferencias Universales (permitsUniversalTransfer)', val: profile.apiRestrictions.permitsUniversalTransfer, mandatory: false },
                { label: 'Retiros On-chain (enableWithdrawals)', val: profile.apiRestrictions.enableWithdrawals, mandatory: false, danger: true },
                { label: 'Transferencias Internas (enableInternalTransfer)', val: profile.apiRestrictions.enableInternalTransfer, mandatory: false },
                { label: 'Restricción por IP (ipRestrict)', val: profile.apiRestrictions.ipRestrict, mandatory: false },
                { label: 'Portfolio Margin (enablePortfolioMarginTrading)', val: profile.apiRestrictions.enablePortfolioMarginTrading, mandatory: false },
                { label: 'Opciones Vanilla (enableVanillaOptions)', val: profile.apiRestrictions.enableVanillaOptions, mandatory: false },
              ].map((perm, pIdx) => (
                <div
                  key={pIdx}
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    perm.val
                      ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                      : perm.mandatory
                      ? 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <span className="text-xs font-medium">{perm.label}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      perm.val
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {perm.val ? 'HABILITADO' : 'DESHABILITADO'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Trigger Conditions & Trading Status (/sapi/v1/account/apiTradingStatus) */}
          <div className="bg-neutral-900/80 p-4 rounded-xl border border-neutral-800 flex flex-col gap-4">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Límites de Disparo de Cuenta (/sapi/v1/account/apiTradingStatus)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400">GCR (GCR Limit)</span>
                <span className="text-lg font-bold text-white">{profile.apiTradingStatus.data.triggerCondition.GCR} ms</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400">IFER (IFER Limit)</span>
                <span className="text-lg font-bold text-white">{profile.apiTradingStatus.data.triggerCondition.IFER}</span>
              </div>
              <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 flex flex-col gap-1">
                <span className="text-neutral-400">UFR (UFR Limit)</span>
                <span className="text-lg font-bold text-white">{profile.apiTradingStatus.data.triggerCondition.UFR}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: UNIVERSAL TRANSFER (/sapi/v1/asset/transfer) */}
      {activeWalletTab === 'transfer' && (
        <div className="flex flex-col gap-4 max-w-xl animate-fade-in">
          <form onSubmit={handleExecuteTransfer} className="bg-neutral-900/80 p-5 rounded-xl border border-neutral-800 flex flex-col gap-4 shadow-sm">
            <div className="border-b border-neutral-800 pb-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                Transferencia Universal Binance (/sapi/v1/asset/transfer)
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Transfiere fondos al instante entre Billetera Spot, Futuros USDⓈ-M y Billetera de Fondos sin comisiones.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-neutral-300 font-semibold">Tipo de Transferencia:</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as BinanceUniversalTransferType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-amber-400"
              >
                <option value="MAIN_UMFUTURE">Spot ➔ USDⓈ-M Futures (MAIN_UMFUTURE)</option>
                <option value="UMFUTURE_MAIN">USDⓈ-M Futures ➔ Spot (UMFUTURE_MAIN)</option>
                <option value="MAIN_FUNDING">Spot ➔ Fondos (MAIN_FUNDING)</option>
                <option value="FUNDING_MAIN">Fondos ➔ Spot (FUNDING_MAIN)</option>
                <option value="FUNDING_UMFUTURE">Fondos ➔ USDⓈ-M Futures (FUNDING_UMFUTURE)</option>
                <option value="UMFUTURE_FUNDING">USDⓈ-M Futures ➔ Fondos (UMFUTURE_FUNDING)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-300 font-semibold">Activo:</label>
                <select
                  value={transferAsset}
                  onChange={(e) => setTransferAsset(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-amber-400"
                >
                  <option value="USDT">USDT (Tether)</option>
                  <option value="BNB">BNB</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-300 font-semibold">Monto:</label>
                <input
                  type="number"
                  step="any"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  min="0.01"
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isTransferring}
              className="w-full mt-2 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <ArrowRightLeft className={`w-4 h-4 ${isTransferring ? 'animate-spin' : ''}`} />
              <span>{isTransferring ? 'Procesando Transferencia...' : 'Ejecutar Transferencia Universal'}</span>
            </button>
          </form>
        </div>
      )}

      {/* Simulated Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <h3 className="font-bold text-white text-sm">Añadir Fondos Demo (Simulación)</h3>
              <button
                onClick={() => setIsDepositModalOpen(false)}
                className="text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs text-neutral-400">Cantidad en USDT:</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="10"
                max="100000"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>

            <div className="flex gap-2">
              {[500, 1000, 5000, 10000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDepositAmount(v.toString())}
                  className="flex-1 py-1 text-xs rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-mono"
                >
                  ${v}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSimulatedDeposit}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Confirmar Depósito
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
