import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Eye,
  Flame,
  History,
  Info,
  Layers,
  Lock,
  Percent,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { GoogleSheetStrategyRow, StrategyExecutionPlan } from '../types/strategy';
import { AccountBalance } from '../types/binance';
import {
  calculateStrategyRewardToRisk,
  generateExecutionPlan,
  getTradeProcessStageInfo,
  parsePricesFromStrategy,
} from '../utils/sheetParser';
import { normalizeBinanceSymbol } from '../data/binancePairs';
import { StrategyDetailModal } from './StrategyDetailModal';
import { GoogleAuthModal } from './GoogleAuthModal';
import { StrategyChartRenderer } from './StrategyChartRenderer';

export const StrategyExecutionEngine: React.FC = () => {
  const [symbol, setSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [balance, setBalance] = useState<AccountBalance>(binanceWs.getBalance());
  const [activeStrategy, setActiveStrategy] = useState<GoogleSheetStrategyRow | undefined>(() =>
    strategyService.getActiveStrategy()
  );

  // Capital allocation state
  const [allocatedCapital, setAllocatedCapital] = useState<number>(300);
  const [leverage, setLeverage] = useState<number>(3);
  const [selectedPercentage, setSelectedPercentage] = useState<number | null>(null);

  // UI state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionSuccessIds, setExecutionSuccessIds] = useState<string[] | null>(null);
  const [showChartPreview, setShowChartPreview] = useState(false);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
      setBalance(binanceWs.getBalance());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setActiveStrategy(strategyService.getActiveStrategy());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  // Strategy matching current symbol or latest available
  const strategy = useMemo(() => {
    if (activeStrategy && normalizeBinanceSymbol(activeStrategy.par) === normalizeBinanceSymbol(symbol)) {
      return activeStrategy;
    }
    const found = strategyService.getStrategies().find(
      (s) => normalizeBinanceSymbol(s.par) === normalizeBinanceSymbol(symbol)
    );
    return found || strategyService.getActiveStrategy() || strategyService.getStrategies()[0];
  }, [activeStrategy, symbol]);

  const isObsolete = (strategy?.estado || '').toLowerCase() === 'obsoleto';

  // Available free margin from Binance WS engine
  const availableMargin = Math.max(0, balance.availableBalance || 0);

  // Default capital setup based on available balance if not initialized
  useEffect(() => {
    if (availableMargin > 0 && allocatedCapital === 300) {
      const defaultVal = Math.min(1000, Math.max(50, Math.floor(availableMargin * 0.25)));
      setAllocatedCapital(defaultVal);
    }
  }, [availableMargin]);

  // Clamped leverage strictly between 1x and 5x (Isolated)
  const clampedLeverage = Math.min(5, Math.max(1, Math.floor(leverage)));

  // Handle % buttons: 25%, 50%, 75%, 100%
  const handlePercentSelect = (pct: number) => {
    setSelectedPercentage(pct);
    const amount = Number(((availableMargin * pct) / 100).toFixed(2));
    setAllocatedCapital(Math.max(10, amount));
  };

  // Custom manual capital input change
  const handleCapitalChange = (val: number) => {
    setSelectedPercentage(null);
    setAllocatedCapital(Math.max(0, val));
  };

  // Generate complete execution plan with 6 Binance orders
  const executionPlan = useMemo(() => {
    if (!strategy) return null;
    return generateExecutionPlan(strategy, allocatedCapital, clampedLeverage);
  }, [strategy, allocatedCapital, clampedLeverage]);

  // Risk / Reward & Parsed price metrics
  const rrMetrics = useMemo(() => {
    if (!strategy) return null;
    return calculateStrategyRewardToRisk(strategy);
  }, [strategy]);

  const parsedPrices = useMemo(() => {
    if (!strategy) return null;
    return parsePricesFromStrategy(strategy);
  }, [strategy]);

  const stageInfo = useMemo(() => {
    if (!strategy) return getTradeProcessStageInfo('Activa');
    return getTradeProcessStageInfo(strategy.estado || 'Activa');
  }, [strategy]);

  // Average Entry Price
  const avgEntryPrice = useMemo(() => {
    if (!parsedPrices) return ticker?.lastPrice || 1;
    if (parsedPrices.entry1Price > 0 && parsedPrices.entry2Price > 0) {
      return (parsedPrices.entry1Price * 0.5) + (parsedPrices.entry2Price * 0.5);
    }
    return parsedPrices.entry1Price || ticker?.lastPrice || 1;
  }, [parsedPrices, ticker]);

  // Notional Position Size = Capital * Leverage (Max 5x)
  const notionalPosition = allocatedCapital * clampedLeverage;

  // Real-time distance of current price to Entry 1
  const currentPrice = ticker?.lastPrice || 1;
  const entry1Dist =
    parsedPrices && parsedPrices.entry1Price > 0
      ? (((currentPrice - parsedPrices.entry1Price) / parsedPrices.entry1Price) * 100).toFixed(2)
      : '0.00';

  // Projected Return and Max Loss
  const projectedReturnUsdt = executionPlan ? (executionPlan.maxProfitUsdt || 0) : 0;
  const maxLossUsdt = executionPlan ? (executionPlan.maxLossUsdt || 0) : 0;

  const projectedReturnRoe = allocatedCapital > 0 ? (projectedReturnUsdt / allocatedCapital) * 100 : 0;
  const maxLossRoe = allocatedCapital > 0 ? (maxLossUsdt / allocatedCapital) * 100 : 0;

  // Wallet risk percentage: (Max Loss / Total Margin Balance) * 100
  const walletRiskPct = balance.totalMarginBalance > 0 ? (maxLossUsdt / balance.totalMarginBalance) * 100 : 0;
  const isExcessiveRisk = walletRiskPct > 2.0;

  // Validation
  const hasInsufficientFunds = allocatedCapital > availableMargin;
  const isReadyToExecute =
    !isObsolete &&
    allocatedCapital > 0 &&
    !hasInsufficientFunds &&
    clampedLeverage >= 1 &&
    clampedLeverage <= 5;

  // Dispatch orders to Binance after Google Authenticator confirmation
  const handleConfirm2FAExecution = async (authCode: string) => {
    if (!executionPlan || isObsolete) return;
    setIsExecuting(true);
    try {
      const createdIds = await binanceWs.executeStrategyPlan(executionPlan);
      setExecutionSuccessIds(createdIds);
      setIsAuthModalOpen(false);
      strategyService.updatePairLatestStatus(symbol, 'Live');
    } catch (err) {
      console.error('Error executing strategy:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSwitchToLatestActive = () => {
    if (strategy?.par) {
      strategyService.setActiveStrategyBySymbol(strategy.par);
    }
  };

  return (
    <div
      id="strategy_execution_engine_container"
      className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-950 p-3 sm:p-4 gap-3.5 custom-scrollbar text-neutral-100"
    >
      {/* Obsolete Historical Warning Banner */}
      {isObsolete && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-amber-400 text-black uppercase">
                  Histórico / Obsoleto
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-white">
                  Estrategia sustituida por análisis técnico más reciente
                </h4>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Esta estrategia ({strategy?.noEstrategia} - {strategy?.fecha}) se muestra solo para fines de registro histórico y backtest.
              </p>
            </div>
          </div>

          <button
            onClick={handleSwitchToLatestActive}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold font-mono transition-all shrink-0 shadow-sm"
          >
            Cargar Versión Activa
          </button>
        </div>
      )}

      {/* 1. Top Strategy Header Banner */}
      <div className="bg-neutral-900/90 rounded-2xl p-3.5 sm:p-4 border border-neutral-800 shadow-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {strategy?.noEstrategia || 'EST-01'}
                </span>
                <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                  {strategy?.nombreEstrategia || 'Estrategia Táctica Binance Futures'}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${stageInfo.badgeClass}`}
                >
                  {strategy?.estado || 'Activa'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-2">
                <span>Par: <strong className="text-white font-mono">{strategy?.par || symbol}</strong></span>
                <span>•</span>
                <span>Fecha: <strong className="text-neutral-300 font-mono">{strategy?.fecha || '2026-09-03'}</strong></span>
                <span>•</span>
                <span>Temporalidad: <strong className="text-neutral-300 font-mono">{strategy?.temporalidad || '4H'}</strong></span>
                <span>•</span>
                <span>R:R: <strong className="text-emerald-400 font-mono">1:{rrMetrics?.ratio != null ? rrMetrics.ratio.toFixed(2) : '3.50'}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChartPreview(!showChartPreview)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                showChartPreview
                  ? 'bg-neutral-800 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-900 text-neutral-300 border-neutral-700 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span>{showChartPreview ? 'Ocultar Gráfico' : 'Ver Gráfico Táctico'}</span>
            </button>

            <button
              onClick={() => setIsDetailModalOpen(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 transition-all shadow-xs"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>Desglose Técnico Completo</span>
            </button>
          </div>
        </div>

        {/* Live Binance Price & Entry Proximity Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-800/80 text-xs font-mono">
          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase">Precio Binance Actual</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-base font-black text-white font-mono">${(ticker?.lastPrice || 0).toFixed(2)}</span>
              <span
                className={`text-[10px] font-bold ${
                  (ticker?.change24hPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {(ticker?.change24hPercent ?? 0) >= 0 ? '+' : ''}{(ticker?.change24hPercent ?? 0).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase">Zona Entrada 1 (50%)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-base font-bold text-sky-400 font-mono">${parsedPrices?.entry1Price || 0}</span>
              <span className="text-[10px] text-neutral-400">Dist: {entry1Dist}%</span>
            </div>
          </div>

          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase">Zona Entrada 2 (50%)</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-base font-bold text-sky-300 font-mono">${parsedPrices?.entry2Price || 0}</span>
              <span className="text-[10px] text-neutral-500">SMA-15 Test</span>
            </div>
          </div>

          <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800 flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase">Stop Loss Estricto</span>
            <div className="flex items-center justify-between mt-0.5">
              <span className="text-base font-bold text-rose-400 font-mono">${parsedPrices?.slPrice || 0}</span>
              <span className="text-[10px] text-rose-400/80 font-bold">100% Salida</span>
            </div>
          </div>
        </div>
      </div>

      {/* Optional Embedded Tactical Candlestick Chart */}
      {showChartPreview && (
        <div className="h-72 bg-neutral-900 rounded-2xl border border-neutral-800 overflow-hidden relative shadow-xl">
          <StrategyChartRenderer symbol={strategy.par} strategy={strategy} />
        </div>
      )}

      {/* 2. Asignación de Capital y Riesgo (Balance Disponible) + Apalancamiento 1x-5x */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Asignación de Capital y Riesgo (7 Cols) */}
        <div className="lg:col-span-7 bg-neutral-900/90 rounded-2xl p-4 border border-neutral-800 shadow-xl flex flex-col gap-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Asignación de Capital y Riesgo
              </h3>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-xs">
              <span className="text-neutral-400 text-[11px]">Margen Disponible:</span>
              <span className="text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                ${availableMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
              </span>
            </div>
          </div>

          {/* Capital Input & Quick Percentage Selector */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs text-neutral-300 font-medium">
              <span>Capital a Asignar en la Estrategia (USDT)</span>
              <span className="text-[11px] text-neutral-400 font-mono">
                Restante: ${(Math.max(0, availableMargin - allocatedCapital)).toFixed(2)} USDT
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-neutral-500 font-bold">$</span>
                <input
                  type="number"
                  step="10"
                  min="10"
                  max={availableMargin}
                  value={allocatedCapital || ''}
                  onChange={(e) => handleCapitalChange(parseFloat(e.target.value) || 0)}
                  placeholder="300.00"
                  className="w-full pl-7 pr-16 py-2 bg-neutral-950 border border-neutral-700 rounded-xl text-white font-mono text-sm sm:text-base font-bold focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                />
                <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">USDT</span>
              </div>
            </div>

            {/* Quick Percentage Buttons: 25%, 50%, 75%, 100% */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              {[25, 50, 75, 100].map((pct) => {
                const isSelected = selectedPercentage === pct;
                return (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handlePercentSelect(pct)}
                    className={`py-1.5 rounded-xl font-mono text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-amber-400 text-black border-amber-300 shadow-md shadow-amber-950/40'
                        : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {pct}%
                  </button>
                );
              })}
            </div>

            {hasInsufficientFunds && (
              <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-800 text-xs text-rose-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>Capital excede el balance disponible (${availableMargin.toFixed(2)} USDT).</span>
              </div>
            )}
          </div>

          {/* Leverage Selector: 1x to 5x ISOLATED */}
          <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-neutral-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                Apalancamiento Aislado (1x a 5x Mandatorio)
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {clampedLeverage}x ISOLATED
              </span>
            </div>

            {/* Leverage Slider & Quick Buttons */}
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={clampedLeverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full accent-amber-400 cursor-pointer h-2 bg-neutral-950 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((lev) => (
                <button
                  key={lev}
                  type="button"
                  onClick={() => setLeverage(lev)}
                  className={`py-1 rounded-lg font-mono text-xs font-bold transition-all border ${
                    clampedLeverage === lev
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:bg-neutral-850 hover:text-white'
                  }`}
                >
                  {lev}x
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono pt-1">
              <span>Posición Notional Total:</span>
              <strong className="text-white font-bold">${notionalPosition.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT</strong>
            </div>
          </div>
        </div>

        {/* Right Column: Métricas y Retorno Proyectado vs Pérdida Máxima (5 Cols) */}
        <div className="lg:col-span-5 bg-neutral-900/90 rounded-2xl p-4 border border-neutral-800 shadow-xl flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Métricas & Retorno Proyectado
              </h3>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
              Máx 5X
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Projected Return */}
            <div className="bg-emerald-950/25 p-3 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span className="font-semibold text-emerald-300 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  Retorno Proyectado
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-400">
                +${projectedReturnUsdt.toFixed(2)}
              </div>
              <div className="text-[11px] text-emerald-300/80 font-mono mt-1 pt-1 border-t border-emerald-900/50 flex justify-between">
                <span>ROE Estimado:</span>
                <strong className="text-emerald-300 font-black">+{projectedReturnRoe.toFixed(1)}%</strong>
              </div>
            </div>

            {/* Maximum Projected Loss */}
            <div className="bg-rose-950/25 p-3 rounded-xl border border-rose-500/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
                <span className="font-semibold text-rose-300 flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                  Pérdida Máxima (SL)
                </span>
              </div>
              <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-400">
                -${maxLossUsdt.toFixed(2)}
              </div>
              <div className="text-[11px] text-rose-300/80 font-mono mt-1 pt-1 border-t border-rose-900/50 flex justify-between">
                <span>Riesgo Cuenta:</span>
                <strong className={isExcessiveRisk ? 'text-rose-300 font-black' : 'text-neutral-300'}>
                  {walletRiskPct.toFixed(2)}%
                </strong>
              </div>
            </div>
          </div>

          {/* Secondary Stats Strip */}
          <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 grid grid-cols-3 gap-2 font-mono text-xs">
            <div>
              <span className="text-[10px] text-neutral-500 block">Ratio R:R:</span>
              <span className="text-emerald-400 font-black text-sm">
                1:{rrMetrics?.ratio != null ? rrMetrics.ratio.toFixed(2) : '3.50'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block">Precio Promedio:</span>
              <span className="text-white font-bold text-sm">
                ${avgEntryPrice.toFixed(2)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-neutral-500 block">Liquidación Est.:</span>
              <span className="text-amber-400 font-bold text-sm">
                ${(avgEntryPrice * (1 - 1 / clampedLeverage + 0.005)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Risk Alert if Loss > 2% of wallet */}
          {isExcessiveRisk && (
            <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-700/60 text-[11px] text-amber-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>La pérdida proyectada ({walletRiskPct.toFixed(1)}%) supera el riesgo recomendado de 1-2% del capital.</span>
            </div>
          )}

          {/* Primary Action Button: Autorizar y Crear en Binance (Requiere 2FA) */}
          <button
            type="button"
            onClick={() => setIsAuthModalOpen(true)}
            disabled={!isReadyToExecute || isExecuting}
            className={`w-full py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-xl ${
              isObsolete
                ? 'bg-neutral-850 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                : isReadyToExecute && !isExecuting
                ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-950/50 cursor-pointer hover:scale-[1.01]'
                : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
            }`}
          >
            <ShieldCheck className="w-5 h-5" />
            <span>
              {isObsolete
                ? 'Estrategia Histórica (Solo Consulta)'
                : 'Autorizar y Crear en Binance (2FA)'}
            </span>
            {!isObsolete && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3. Desglose de Órdenes a Enviar a Binance (6 Órdenes Escalonadas) */}
      <div className="bg-neutral-900/90 rounded-2xl p-4 border border-neutral-800 shadow-xl flex flex-col gap-3">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
              Desglose de Órdenes a Enviar a Binance (6 Órdenes Escalonadas)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            Apalancamiento: {clampedLeverage}x ISOLATED
          </span>
        </div>

        {/* Orders Grid / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {executionPlan?.orders.map((ord) => {
            const isEntry = ord.role === 'ENTRY';
            const isSL = ord.role === 'STOP_LOSS';

            const cardBg = isEntry
              ? 'bg-blue-950/20 border-blue-500/30'
              : isSL
              ? 'bg-rose-950/20 border-rose-500/40'
              : 'bg-emerald-950/20 border-emerald-500/30';

            const pillBg = isEntry
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              : isSL
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

            return (
              <div
                key={ord.id}
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${cardBg}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{ord.label}</span>
                  <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border ${pillBg}`}>
                    {ord.side} {ord.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-1 bg-neutral-950/60 rounded-lg p-2 border border-neutral-800/80">
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Precio Objetivo</span>
                    <strong className="text-white text-sm">${(ord.price || 0).toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Cantidad / %</span>
                    <strong className="text-neutral-200 text-sm">
                      {ord.quantity} ({ord.percentage}%)
                    </strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">Notional</span>
                    <span className="text-neutral-300">${(ord.estNotional || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-neutral-500 block uppercase">
                      {isEntry ? 'Margen Aislado' : isSL ? 'Pérdida Máx' : 'Ganancia Est.'}
                    </span>
                    <span
                      className={`font-bold ${
                        isEntry ? 'text-amber-300' : isSL ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {isEntry
                        ? `$${(ord.estMargin || 0).toFixed(2)}`
                        : isSL
                        ? `-$${(maxLossUsdt || 0).toFixed(2)}`
                        : `+$${(ord.pnlTarget || 0).toFixed(2)}`}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-neutral-400 font-sans line-clamp-1">{ord.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Success Banner if just executed */}
      {executionSuccessIds && (
        <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-white">¡Estrategia Autorizada y Enviada a Binance con Éxito!</h4>
              <p className="text-xs text-emerald-300/80">
                Se han registrado {executionSuccessIds.length} órdenes escalonadas con apalancamiento {clampedLeverage}x ISOLATED en Binance Futures.
              </p>
            </div>
          </div>
          <button
            onClick={() => setExecutionSuccessIds(null)}
            className="px-3 py-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-white text-xs font-semibold"
          >
            Aceptar
          </button>
        </div>
      )}

      {/* Detail Technical Strategy Modal */}
      {isDetailModalOpen && strategy && (
        <StrategyDetailModal
          strategy={strategy}
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}

      {/* Google Authenticator (2FA) Security Authorization Modal */}
      {isAuthModalOpen && executionPlan && (
        <GoogleAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onConfirm={handleConfirm2FAExecution}
          plan={executionPlan}
          allocatedCapital={allocatedCapital}
          leverage={clampedLeverage}
          isProcessing={isExecuting}
        />
      )}
    </div>
  );
};
