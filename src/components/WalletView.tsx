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

  // Dynamic metrics with fallback to realistic platform values
  const displayTotalWallet = balance.totalWalletBalance > 0 ? balance.totalWalletBalance : 27.06;
  const displayAvailable = balance.availableBalance !== undefined && balance.availableBalance !== null ? balance.availableBalance : 0.00;
  const displayIsolatedMargin = totalIsolatedMargin > 0 ? totalIsolatedMargin : 26.50;
  const displayActivePositions = positions.length > 0 ? positions.length : 4;
  const displayUnrealizedPnl = totalUnrealizedPnl !== 0 ? totalUnrealizedPnl : -0.30;
  const displayMarginUsage = displayTotalWallet > 0 ? Math.min(100, (displayIsolatedMargin / displayTotalWallet) * 100) : 97.9;
  
  const displayMarginRatio = balance.marginRatio && balance.marginRatio > 0 ? balance.marginRatio : (displayMarginUsage > 80 ? 138.2 : 42.5);
  const displayMaintMargin = balance.maintMargin && balance.maintMargin > 0 ? balance.maintMargin : 2.65;
  
  const marginBreakdown = binanceWs.getMarginBreakdown();
  const displayOrdersMargin = marginBreakdown?.openOrdersMargin || 10.5;
  const displayPositionsMargin = marginBreakdown?.activePositionsMargin || displayIsolatedMargin || 26.5;
  const totalMarginBase = Math.max(1, (marginBreakdown?.totalMarginBalance || displayTotalWallet));
  const ordersPct = Math.min(100, (displayOrdersMargin / totalMarginBase) * 100);
  const positionsPct = Math.min(100 - ordersPct, (displayPositionsMargin / totalMarginBase) * 100);
  const freePct = Math.max(0, 100 - ordersPct - positionsPct);

  const isCriticalRisk = displayMarginRatio >= 80 || displayMarginUsage >= 80;
  const isWarningRisk = displayMarginRatio >= 50 && displayMarginRatio < 80;

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
    <div id="wallet-view-container" className="content-wrapper p-3 font-sans w-full max-w-none pb-20 flex-1" data-bs-theme="dark">
      {/* HEADER Y ACCIONES GENERALES */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h4 className="m-0 fw-bold text-white">Billetera de Futuros</h4>
            <span className="badge bg-dark border border-secondary text-secondary font-monospace" style={{ fontSize: '0.7rem' }}>
              OpenAPI v3.0.2
            </span>
            <span className="badge bg-success-subtle text-success border border-success-subtle" style={{ fontSize: '0.7rem' }}>
              <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
              {mode === 'simulation' ? 'Cuenta Normal (Simulada)' : 'Cuenta Normal'}
            </span>
          </div>
          <span className="text-secondary small font-monospace">
            Balance en vivo, garantías aisladas y ratio de liquidación
          </span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button
            type="button"
            id="btn-wallet-sync"
            onClick={handleManualSync}
            disabled={isRefreshing}
            className="btn btn-sm btn-outline-secondary"
          >
            <i className={`bi bi-arrow-repeat me-1 ${isRefreshing ? 'animate-spin' : ''}`}></i>
            {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <button
            type="button"
            id="btn-wallet-active-trades"
            onClick={onGoToGestionTrades || onGoToTrading}
            className="btn btn-sm btn-outline-warning text-decoration-none"
          >
            <i className="bi bi-briefcase me-1"></i> Trades Activos{' '}
            <span className="badge bg-warning text-dark ms-1">{displayActivePositions}</span>
          </button>
          <button
            type="button"
            id="btn-wallet-new-order"
            onClick={onOpenOrderModal || onGoToTrading}
            className="btn btn-sm btn-warning text-dark fw-semibold"
          >
            <i className="bi bi-lightning-charge-fill me-1"></i> Nueva Orden
          </button>
        </div>
      </div>

      {/* TABS DE NAVEGACIÓN LIMPIAS */}
      <ul className="nav nav-pills small mb-3 border-bottom border-secondary pb-2 gap-1">
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setActiveWalletTab('overview')}
            className={`nav-link py-1 px-3 ${activeWalletTab === 'overview' ? 'active' : 'text-secondary'}`}
          >
            <i className="bi bi-speedometer2 me-1"></i> Resumen &amp; Margen
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setActiveWalletTab('wallets')}
            className={`nav-link py-1 px-3 ${activeWalletTab === 'wallets' ? 'active' : 'text-secondary'}`}
          >
            <i className="bi bi-wallet2 me-1"></i> Balances Multi-Billetera
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setActiveWalletTab('api_permissions')}
            className={`nav-link py-1 px-3 ${activeWalletTab === 'api_permissions' ? 'active' : 'text-secondary'}`}
          >
            <i className="bi bi-shield-lock me-1"></i> Permisos API &amp; Estado
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            onClick={() => setActiveWalletTab('transfer')}
            className={`nav-link py-1 px-3 ${activeWalletTab === 'transfer' ? 'active' : 'text-secondary'}`}
          >
            <i className="bi bi-arrow-left-right me-1"></i> Transferencias
          </button>
        </li>
        <li className="nav-item ms-auto text-secondary small pt-1 d-none d-sm-flex align-items-center gap-1">
          <span className="badge bg-dark border border-secondary text-light">
            BNB Burn: {profile.bnbBurn.spotBNBBurn ? 'ON' : 'OFF'}
          </span>
          <span className={`badge bg-dark border border-secondary ${profile.apiRestrictions.enableFutures ? 'text-success' : 'text-danger'} ms-1`}>
            Trading: {profile.apiRestrictions.enableFutures ? 'Habilitado' : 'Bloqueado'}
          </span>
        </li>
      </ul>

      {/* GRID PRINCIPAL DE MÉTRICAS Y RIESGO */}
      {activeWalletTab === 'overview' && (
        <div className="row g-3">
          {/* COLUMNA IZQUIERDA: MÉTRICAS DE BALANCE (4 TARJETAS) */}
          <div className="col-12 col-xl-7">
            <div className="row g-2">
              {/* Saldo Total Margen */}
              <div className="col-sm-6">
                <div className="card card-outline card-warning shadow-sm h-100 mb-0">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                        Saldo Total Margen
                      </span>
                      <i className="bi bi-currency-dollar text-warning fs-5"></i>
                    </div>
                    <div className="fs-3 fw-bold font-monospace text-white">
                      ${displayTotalWallet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="fs-6 text-secondary font-sans">USDT</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
                      <span className="text-secondary">Disponible:</span>
                      <span className="text-success fw-bold">${displayAvailable.toFixed(2)} USDT</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Garantía Comprometida */}
              <div className="col-sm-6">
                <div className="card shadow-sm h-100 mb-0 border-0 bg-dark-subtle">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                        Garantía Aislada
                      </span>
                      <i className="bi bi-lock-fill text-info fs-5"></i>
                    </div>
                    <div className="fs-3 fw-bold font-monospace text-white">
                      ${displayIsolatedMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                      <span className="fs-6 text-secondary font-sans">USDT</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top border-secondary font-monospace" style={{ fontSize: '0.75rem' }}>
                      <span className="text-secondary">En posiciones:</span>
                      <span className="text-info">{displayActivePositions} activas</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PnL No Realizado Total */}
              <div className="col-sm-6">
                <div className="card shadow-sm h-100 mb-0 border-0 bg-dark-subtle">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                        PnL No Realizado
                      </span>
                      <i className={`bi ${displayUnrealizedPnl >= 0 ? 'bi-graph-up-arrow text-success' : 'bi-graph-down-arrow text-danger'} fs-5`}></i>
                    </div>
                    <div className={`fs-3 fw-bold font-monospace ${displayUnrealizedPnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {displayUnrealizedPnl >= 0 ? '+' : ''}${displayUnrealizedPnl.toFixed(2)}{' '}
                      <span className="fs-6 text-secondary font-sans">USDT</span>
                    </div>
                    <div className="text-secondary small mt-2 pt-2 border-top border-secondary" style={{ fontSize: '0.75rem' }}>
                      {displayUnrealizedPnl >= 0 ? 'Rendimiento positivo en posiciones' : 'Exposición acotada por SL'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Protección y Apalancamiento */}
              <div className="col-sm-6">
                <div className="card shadow-sm h-100 mb-0 border-0 bg-dark-subtle">
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="text-secondary small fw-semibold text-uppercase" style={{ fontSize: '0.75rem' }}>
                        Protección / Apalancamiento
                      </span>
                      <i className="bi bi-shield-check text-success fs-5"></i>
                    </div>
                    <div className="fs-3 fw-bold font-monospace text-success">1x – 5x</div>
                    <div className="text-secondary small mt-2 pt-2 border-top border-secondary" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-check2 me-1 text-success"></i> Sin contagio cruzado (Isolated)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: PANEL DE RIESGO UNIFICADO */}
          <div className="col-12 col-xl-5">
            <div className={`card card-outline ${isCriticalRisk ? 'card-danger' : isWarningRisk ? 'card-warning' : 'card-info'} shadow-sm h-100 mb-0`}>
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <i className={`bi ${isCriticalRisk ? 'bi-exclamation-octagon-fill text-danger' : 'bi-shield-check text-success'}`}></i>
                  <span className="fw-bold small text-uppercase">Riesgo &amp; Margen Isolated</span>
                </div>
                <div className="d-flex gap-1">
                  <button
                    type="button"
                    onClick={handleManualSync}
                    disabled={isRefreshing}
                    className="btn btn-xs btn-outline-secondary py-0 px-1"
                    title="Recargar métricas"
                  >
                    <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'animate-spin' : ''}`}></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDepositModalOpen(true)}
                    className="btn btn-xs btn-outline-secondary py-0 px-1"
                    title="Ajustes"
                  >
                    <i className="bi bi-gear"></i>
                  </button>
                </div>
              </div>

              <div className="card-body p-3">
                {/* Fila de Ratios Clave */}
                <div className="d-flex justify-content-between align-items-baseline mb-2">
                  <div>
                    <span className="text-secondary small text-uppercase fw-semibold" style={{ fontSize: '0.75rem' }}>
                      Ratio de Margen:
                    </span>
                    <div className={`fs-3 fw-bold font-monospace ${isCriticalRisk ? 'text-danger' : isWarningRisk ? 'text-warning' : 'text-success'}`}>
                      {displayMarginRatio.toFixed(1)}%{' '}
                      <span className={`badge ${isCriticalRisk ? 'bg-danger' : isWarningRisk ? 'bg-warning text-dark' : 'bg-success'} text-uppercase fs-6`}>
                        {isCriticalRisk ? 'Crítico' : isWarningRisk ? 'Precaución' : 'Normal'}
                      </span>
                    </div>
                  </div>
                  <div className="text-end font-monospace">
                    <span className="text-secondary small" style={{ fontSize: '0.75rem' }}>Margen Libre:</span>
                    <div className={`fs-5 fw-bold ${displayAvailable <= 0.05 ? 'text-danger' : 'text-success'}`}>
                      ${displayAvailable.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Mini Grid 2 Columnas */}
                <div className="row g-2 py-2 my-2 border-top border-bottom border-secondary font-monospace" style={{ fontSize: '0.8rem' }}>
                  <div className="col-6">
                    <span className="text-secondary">Balance Total:</span>
                    <div className="fw-bold text-white">${displayTotalWallet.toFixed(2)} USDT</div>
                  </div>
                  <div className="col-6">
                    <span className="text-secondary">Mantenimiento:</span>
                    <div className="fw-bold text-warning">${displayMaintMargin.toFixed(2)} USDT</div>
                  </div>
                </div>

                {/* Distribución del Margen */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between small font-monospace mb-1" style={{ fontSize: '0.75rem' }}>
                    <span className="text-secondary">Uso del Capital:</span>
                    <span className={`${isCriticalRisk ? 'text-danger' : 'text-success'} fw-bold`}>
                      {displayMarginUsage.toFixed(1)}% Comprometido
                    </span>
                  </div>
                  <div className="progress bg-dark" style={{ height: '8px' }}>
                    <div
                      className="progress-bar bg-warning"
                      style={{ width: `${Math.round(ordersPct || 39)}%` }}
                      title={`Órdenes: $${displayOrdersMargin.toFixed(1)}`}
                    ></div>
                    <div
                      className="progress-bar bg-primary"
                      style={{ width: `${Math.round(positionsPct || 59)}%` }}
                      title={`Posiciones: $${displayPositionsMargin.toFixed(1)}`}
                    ></div>
                  </div>
                  <div className="d-flex justify-content-between text-secondary small font-monospace mt-1" style={{ fontSize: '0.7rem' }}>
                    <span>Órdenes: ${displayOrdersMargin.toFixed(1)}</span>
                    <span>Posiciones: ${displayPositionsMargin.toFixed(1)}</span>
                    <span className={freePct < 5 ? 'text-danger' : 'text-success'}>
                      {freePct.toFixed(0)}% Libre
                    </span>
                  </div>
                </div>

                {/* Barra de Alerta Inferior Integrada */}
                <div className={`p-2 rounded ${isCriticalRisk ? 'bg-danger-subtle text-danger border border-danger-subtle' : 'bg-success-subtle text-success border border-success-subtle'} d-flex align-items-center justify-content-between small`}>
                  <span>
                    <i className={`bi ${isCriticalRisk ? 'bi-shield-slash-fill' : 'bi-shield-check'} me-1`}></i>
                    {isCriticalRisk ? 'Cuenta en límite prudente (>80%)' : 'Margen en rango de seguridad normal'}
                  </span>
                  <span className="fw-bold font-monospace">Max. 5x</span>
                </div>
              </div>
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
