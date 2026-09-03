import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  HelpCircle,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  PieChart,
  Plus,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { AccountBalance, PositionRisk } from '../types/binance';
import { notificationService } from '../services/notifications';
import { PositionsAndOrders } from './PositionsAndOrders';
import { RiskProtocolWidget } from './RiskProtocolWidget';

interface WalletViewProps {
  onGoToTrading: () => void;
  onOpenOrderModal?: () => void;
}

export const WalletView: React.FC<WalletViewProps> = ({ onGoToTrading, onOpenOrderModal }) => {
  const [balance, setBalance] = useState<AccountBalance>(() => binanceWs.getBalance());
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [mode, setMode] = useState(binanceWs.getMode());
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1000');
  const [isTrayExpanded, setIsTrayExpanded] = useState(false);
  const [trayHeightMode, setTrayHeightMode] = useState<'STANDARD' | 'EXPANDED' | 'XL'>('EXPANDED');

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setBalance(binanceWs.getBalance());
      setPositions(binanceWs.getPositions());
      setMode(binanceWs.getMode());
    });
    return () => unsub();
  }, []);

  const totalIsolatedMargin = positions.reduce((acc, pos) => acc + (pos.isolatedMargin || 0), 0);
  const totalUnrealizedPnl = positions.reduce((acc, pos) => acc + (pos.unRealizedProfit || 0), 0);
  const marginUsagePercent = balance.totalWalletBalance > 0
    ? (totalIsolatedMargin / balance.totalWalletBalance) * 100
    : 0;

  const handleSimulatedDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt <= 0) return;
    
    // In simulation mode, add balance
    const current = binanceWs.getBalance();
    const updated: AccountBalance = {
      ...current,
      totalWalletBalance: current.totalWalletBalance + amt,
      availableBalance: current.availableBalance + amt,
      totalMarginBalance: current.totalMarginBalance + amt,
    };
    binanceWs.setSimulatedBalance(updated);
    setIsDepositModalOpen(false);
    notificationService.notify('SYSTEM', 'Saldo Añadido con Éxito', `Se han acreditado $${amt.toFixed(2)} USDT.`);
  };

  const handleResetBalance = () => {
    binanceWs.resetSimulationBalance(10000);
    notificationService.notify('SYSTEM', 'Billetera Reiniciada', 'El saldo se ha restablecido a $10,000.00 USDT.');
  };

  const scrollToTray = () => {
    document.getElementById('wallet-tray-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // VISTA EXPANDIDA (Prioridad Operativa a Pantalla Completa para la Bandeja)
  if (isTrayExpanded) {
    return (
      <div id="wallet-view-expanded" className="w-full max-w-none px-3 sm:px-6 lg:px-8 mx-auto flex flex-col gap-4 min-h-screen pb-32">
        {/* Ribbon de Resumen Compacto en Vista Expandida */}
        <div className="bg-neutral-900/95 p-3 sm:p-4 rounded-xl border border-neutral-800 flex flex-wrap items-center justify-between gap-3 shadow-md sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Billetera de Futuros USDⓈ-M</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                  Bandeja Pantalla Completa
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono mt-0.5">
                <span className="text-neutral-400">
                  Total: <strong className="text-white">${(balance.totalWalletBalance || 0).toFixed(2)}</strong>
                </span>
                <span className="text-neutral-400 hidden sm:inline">
                  Disponible: <strong className="text-emerald-400">${(balance.availableBalance || 0).toFixed(2)}</strong>
                </span>
                <span className="text-neutral-400 hidden sm:inline">
                  Garantía Aislada: <strong className="text-blue-300">${totalIsolatedMargin.toFixed(2)}</strong>
                </span>
                <span className={`font-bold ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  PnL: {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsTrayExpanded(false)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Restaurar Vista Dividida</span>
            </button>

            {onOpenOrderModal && (
              <button
                type="button"
                onClick={onOpenOrderModal}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                <span>Nueva Orden (Popup)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onGoToTrading}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors border border-neutral-800"
            >
              Terminal
            </button>
          </div>
        </div>

        {/* Bandeja Rápida en Pantalla Completa con Scroll Completo */}
        <div
          className="flex-1 w-full bg-neutral-900/95 rounded-2xl border-2 border-neutral-800 overflow-hidden flex flex-col shadow-2xl"
          style={{ minHeight: '950px' }}
        >
          <div className="px-4 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Bandeja Operativa Expandida (Posiciones, Órdenes, Historial y Alertas)
              </h3>
              {(positions.length > 0 || binanceWs.getOpenOrders().length > 0) && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {positions.length} pos / {binanceWs.getOpenOrders().length} ord
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsTrayExpanded(false)}
                className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-medium flex items-center gap-1 transition-colors"
                title="Minimizar a vista dividida"
              >
                <Minimize2 className="w-3 h-3" />
                <span>Minimizar</span>
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-5 flex-1 flex flex-col overflow-y-auto">
            <PositionsAndOrders defaultTab="positions" onOpenOrderModal={onOpenOrderModal} />
          </div>
        </div>
      </div>
    );
  }

  // VISTA NORMAL (Ancha y espaciosa, con la bandeja operativa hasta abajo ocupando toda la página)
  return (
    <div id="wallet-view-container" className="w-full max-w-none px-3 sm:px-6 lg:px-8 mx-auto flex flex-col gap-5 min-h-screen pb-6 flex-1">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">Billetera de Futuros USDⓈ-M</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                Margen Aislado Protegido
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gestión de saldos, garantías aisladas por posición, protocolo de riesgo estricto y órdenes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón para expandir la bandeja rápida a pantalla completa */}
          <button
            type="button"
            onClick={() => setIsTrayExpanded(true)}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
            title="Expandir la bandeja de órdenes y posiciones a vista maximizada"
          >
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Pantalla Completa</span>
          </button>

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
                <span>Restablecer ($10k)</span>
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

      {/* 1. SECCIÓN SUPERIOR: Saldo Margen, Garantía, PnL y Protección + Riesgo & Margen Isolated A SU ALTURA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Bloque de 4 Tarjetas: PnL abajo de Saldo Margen, y Protección Riesgo abajo de Garantía */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Columna Izquierda: Saldo Total Margen (arriba) y PnL No Realizado (abajo) */}
          <div className="flex flex-col gap-4">
            {/* Card 1: Saldo Total Margen */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between gap-2 shadow-sm flex-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-semibold">Saldo Total Margen</span>
                <DollarSign className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight">
                ${(balance.totalWalletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs text-neutral-400 font-sans font-normal">USDT</span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <span>Disponible:</span>
                <span className="font-mono text-neutral-200 font-bold">
                  ${(balance.availableBalance || 0).toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Card 2: PnL No Realizado Total (ABAJO de Saldo Margen) */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between gap-2 shadow-sm flex-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-semibold">PnL No Realizado Total</span>
                <TrendingUp className={`w-4 h-4 ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)}{' '}
                <span className="text-xs text-neutral-400 font-sans font-normal">USDT</span>
              </div>
              <div className="text-[11px] text-neutral-400">
                {totalUnrealizedPnl >= 0 ? 'Rendimiento positivo' : 'Exposición controlada'}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Garantía en Margen Aislado (arriba) y Protección de Riesgo (abajo) */}
          <div className="flex flex-col gap-4">
            {/* Card 3: Garantía en Margen Aislado */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between gap-2 shadow-sm flex-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-semibold">Garantía en Margen Aislado</span>
                <Lock className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-300 tracking-tight">
                ${totalIsolatedMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs text-neutral-400 font-sans font-normal">USDT</span>
              </div>
              <div className="text-[11px] text-neutral-400 flex items-center gap-1">
                <span>En {positions.length} posiciones activas</span>
              </div>
            </div>

            {/* Card 4: Protección de Riesgo (ABAJO de Garantía) */}
            <div className="p-4 rounded-xl bg-neutral-900/80 border border-neutral-800 flex flex-col justify-between gap-2 shadow-sm flex-1">
              <div className="flex items-center justify-between text-neutral-400 text-xs">
                <span className="font-semibold">Protección de Riesgo</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-300 tracking-tight">
                1x - 5x <span className="text-xs text-neutral-400 font-sans font-normal">Máx</span>
              </div>
              <div className="text-[11px] text-emerald-400/90 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 shrink-0" />
                Sin riesgo de contagio cruzado
              </div>
            </div>
          </div>
        </div>

        {/* Bloque Riesgo y Margen Isolated: SUBIDO a la altura de Saldo Margen */}
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

            {/* Live Risk & Isolated Margin Widget a la altura de Saldo */}
            <div className="flex-1">
              <RiskProtocolWidget />
            </div>
          </div>
        </div>
      </div>

      {/* 2. UTILIZACIÓN DEL MARGEN DE LA CUENTA: OCUPA TODA LA HORIZONTAL */}
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

        {/* Visual Progress Bar de Ancho Completo */}
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

      {/* 3. BANDEJA OPERATIVA DE POSICIONES & ÓRDENES: HASTA ABAJO Y OCUPANDO TODA LA PÁGINA HASTA ABAJO */}
      <div
        id="wallet-tray-section"
        className="w-full flex-1 bg-neutral-900/95 rounded-2xl border-2 border-neutral-800 hover:border-amber-500/40 overflow-hidden flex flex-col shadow-2xl ring-1 ring-amber-500/10 transition-colors"
      >
        <div className="px-4 py-3.5 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Bandeja Operativa de Posiciones & Órdenes
                </h3>
                {(positions.length > 0 || binanceWs.getOpenOrders().length > 0) && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {positions.length} pos / {binanceWs.getOpenOrders().length} ord
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 hidden sm:block">
                Monitorea en vivo tus posiciones aisladas, edita TP/SL, consulta historial y gestiona órdenes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Presets de Altura de Bandeja */}
            <div className="flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-800 text-[10px] font-mono">
              <span className="px-2 text-neutral-400 hidden sm:inline">Altura:</span>
              <button
                type="button"
                onClick={() => setTrayHeightMode('STANDARD')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  trayHeightMode === 'STANDARD'
                    ? 'bg-neutral-800 text-white font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Altura estándar (850px)"
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setTrayHeightMode('EXPANDED')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  trayHeightMode === 'EXPANDED'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Bandeja amplia (1200px - 2x)"
              >
                Amplia (2x)
              </button>
              <button
                type="button"
                onClick={() => setTrayHeightMode('XL')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  trayHeightMode === 'XL'
                    ? 'bg-amber-400 text-neutral-950 font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Bandeja extra grande (1600px)"
              >
                XL
              </button>
            </div>

            {/* Botón de Maximizar Bandeja a Pantalla Completa */}
            <button
              type="button"
              onClick={() => setIsTrayExpanded(true)}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
              title="Expandir a pantalla completa"
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Pantalla Completa</span>
            </button>

            <button
              type="button"
              onClick={onOpenOrderModal || onGoToTrading}
              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1 shadow-xs"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Nueva Orden</span>
            </button>
          </div>
        </div>

        {/* Contenedor que ocupa toda la página hacia abajo */}
        <div
          className="w-full p-2 sm:p-4 flex-1 flex flex-col overflow-y-auto transition-all duration-200"
          style={{
            minHeight:
              trayHeightMode === 'STANDARD'
                ? '850px'
                : trayHeightMode === 'EXPANDED'
                ? '1200px'
                : '1600px',
          }}
        >
          <PositionsAndOrders defaultTab="positions" onOpenOrderModal={onOpenOrderModal} />
        </div>
      </div>

      {/* Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
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
