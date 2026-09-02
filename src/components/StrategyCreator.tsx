import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  Percent,
  Play,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  Compass,
} from 'lucide-react';
import { GoogleSheetStrategyRow, StrategyExecutionPlan } from '../types/strategy';
import {
  SAMPLE_GOOGLE_SHEET_CSV,
  generateExecutionPlan,
  parseCsvToStrategies,
} from '../utils/sheetParser';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import {
  strategyService,
  OFFICIAL_GOOGLE_SHEET_NAME,
  OFFICIAL_GOOGLE_SHEET_URL,
} from '../services/strategyService';
import { DollarSign, Wallet } from 'lucide-react';

interface StrategyCreatorProps {
  onSwitchToOrders?: () => void;
}

export const StrategyCreator: React.FC<StrategyCreatorProps> = ({ onSwitchToOrders }) => {
  // Strategies & Selection State
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() =>
    strategyService.getStrategies()
  );
  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState<number>(() =>
    strategyService.getActiveIndex()
  );
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    strategyService.getLastSyncTime()
  );

  // Strategy Execution Plan & Account Margin State
  const [marginBreakdown, setMarginBreakdown] = useState(binanceWs.getMarginBreakdown());
  const [usdtAllocation, setUsdtAllocation] = useState<number>(() => {
    const avail = binanceWs.getCalculatedAvailableMargin();
    return avail > 0 ? Math.min(300, avail) : 100;
  });
  const [selectedLeverage, setSelectedLeverage] = useState<number>(3);
  const [executionPlan, setExecutionPlan] = useState<StrategyExecutionPlan | null>(null);

  // Authorization Modal & Status
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [confirmedSafetyCheck, setConfirmedSafetyCheck] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [createdOrderReceipts, setCreatedOrderReceipts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all_strategies' | 'plan' | 'sheet_data' | 'guide'>(
    'all_strategies'
  );

  // Keep live margin sync with Binance
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setMarginBreakdown(binanceWs.getMarginBreakdown());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies(strategyService.getStrategies());
      setSelectedStrategyIndex(strategyService.getActiveIndex());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  // Recalculate execution plan whenever selected strategy, allocation, or leverage changes
  useEffect(() => {
    if (strategies.length > 0 && strategies[selectedStrategyIndex]) {
      const currentStrategy = strategies[selectedStrategyIndex];
      const plan = generateExecutionPlan(currentStrategy, usdtAllocation, selectedLeverage);
      setExecutionPlan(plan);
    }
  }, [strategies, selectedStrategyIndex, usdtAllocation, selectedLeverage]);

  // Handler to Refresh strategies strictly from the official Google Sheet
  const handleRefreshOfficialSheet = () => {
    setIsRefreshing(true);

    try {
      const refreshed = strategyService.refreshOfficialStrategies();
      setStrategies(refreshed);
      setLastSyncTime(strategyService.getLastSyncTime());
      setCreatedOrderReceipts([]);

      const active = strategyService.getActiveStrategy();
      if (active && active.par) {
        binanceWs.setSymbol(active.par);
      }

      notificationService.notify(
        'SYSTEM',
        'Google Sheets Actualizado',
        `Se actualizaron ${refreshed.length} estrategias desde la hoja oficial. Gráfico sincronizado.`,
        'normal'
      );
    } catch (err: any) {
      notificationService.notify('SYSTEM', 'Error de sincronización', err.message, 'urgent');
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  };

  // Switch reviewed strategy: updates active strategy, Binance symbol, and TradingView chart
  const handleSelectStrategyToReview = (index: number) => {
    setSelectedStrategyIndex(index);
    strategyService.setActiveStrategyIndex(index);
    setCreatedOrderReceipts([]);

    const strat = strategies[index];
    if (strat) {
      notificationService.notify(
        'SYSTEM',
        'Estrategia en Revisión',
        `Revisando ${strat.noEstrategia} (${strat.par}). Gráfico de TradingView actualizado a 4H.`,
        'normal'
      );
    }
  };

  // MANDATORY AUTHORIZATION: Dispatch orders to Binance only with operator confirmation
  const handleAuthorizeAndCreateOnBinance = async () => {
    if (!executionPlan) return;
    setIsDispatching(true);

    try {
      const authorizedPlan: StrategyExecutionPlan = {
        ...executionPlan,
        status: 'AUTHORIZED_CREATED',
        authorizedAt: Date.now(),
      };

      const orderIds = await binanceWs.placeStrategyOrders(authorizedPlan);
      setCreatedOrderReceipts(orderIds);
      setExecutionPlan(authorizedPlan);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      notificationService.notify('SYSTEM', 'Error al autorizar estrategia', err.message, 'urgent');
    } finally {
      setIsDispatching(false);
    }
  };

  // Cancel strategy orders
  const handleCancelStrategyOrders = async () => {
    if (!executionPlan) return;
    await binanceWs.cancelAllOrders(executionPlan.symbol);
    setCreatedOrderReceipts([]);
    setExecutionPlan({
      ...executionPlan,
      status: 'DRAFT_PENDING_AUTH',
      createdOrderIds: [],
    });
    notificationService.notify(
      'SYSTEM',
      'Órdenes de Estrategia Canceladas',
      'Las órdenes en Binance fueron canceladas.'
    );
  };

  const currentStrategy = strategies[selectedStrategyIndex] || strategies[0];

  return (
    <div className="flex flex-col gap-4 p-4 text-neutral-100 bg-neutral-900/90 rounded-xl border border-neutral-800">
      {/* 1. Official Google Sheet Protected Connection Banner */}
      <div className="flex flex-col gap-3 pb-3 border-b border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Creador de Estrategias
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-emerald-400" />
                  Google Sheet Oficial Vinculada (Exclusiva)
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <LineChart className="w-3 h-3" />
                  TradingView 4H Sincronizado
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Conectado permanentemente a la Google Sheet oficial de estrategias tácticas. Al revisar cualquier estrategia, el gráfico se actualiza en tiempo real.
              </p>
            </div>
          </div>

          {/* Actualizar Button */}
          <div className="flex items-center gap-2">
            <button
              id="refresh-official-sheet-btn"
              onClick={handleRefreshOfficialSheet}
              disabled={isRefreshing}
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2 shadow-sm shadow-emerald-950/40"
              title="Sincronizar y actualizar todas las estrategias de la Google Sheet oficial"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Estrategias'}</span>
            </button>
          </div>
        </div>

        {/* Locked Official Sheet Info Card */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-neutral-950/80 rounded-lg border border-neutral-800 text-xs font-mono">
          <div className="flex items-center gap-2 text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-neutral-500">Hoja de Cálculo Oficial:</span>
            <strong className="text-emerald-300">
              Diario de Estrategias Cripto (5 Estrategias: ZEC, TAO, AAVE, SOL, XRP)
            </strong>
          </div>
          <div className="flex items-center gap-3 text-neutral-400 text-[11px]">
            <span>Total Estrategias: <strong className="text-white">{strategies.length}</strong></span>
            <span>•</span>
            <span>Última Actualización: <strong className="text-amber-400">{lastSyncTime}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 text-xs font-medium">
          <button
            id="tab-all-strategies-btn"
            onClick={() => setActiveTab('all_strategies')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'all_strategies'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Listar Todas las Estrategias ({strategies.length})</span>
          </button>

          <button
            id="tab-plan-btn"
            onClick={() => setActiveTab('plan')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'plan'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Plan de Órdenes ({currentStrategy?.noEstrategia})</span>
          </button>

          <button
            id="tab-sheet-data-btn"
            onClick={() => setActiveTab('sheet_data')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'sheet_data'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Detalles Fila Raw</span>
          </button>

          <button
            id="tab-guide-btn"
            onClick={() => setActiveTab('guide')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
            <span>Guía Táctica</span>
          </button>
        </div>

        {/* Currently Active Strategy Indicator */}
        <div className="flex items-center gap-2 text-xs font-mono bg-neutral-900 px-2.5 py-1 rounded-md border border-neutral-800">
          <span className="text-neutral-500 text-[10px]">Estrategia Activa:</span>
          <span className="font-bold text-amber-300">{currentStrategy?.noEstrategia}</span>
          <span className="px-1.5 py-0.2 rounded bg-neutral-800 text-emerald-400 border border-neutral-700">
            {currentStrategy?.par}
          </span>
          <span className="text-blue-400 text-[10px] hidden sm:inline">Gráfico 4H</span>
        </div>
      </div>

      {/* 3. TAB CONTENT: LISTAR TODAS LAS ESTRATEGIAS */}
      {activeTab === 'all_strategies' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                Catálogo de Estrategias Oficiales ({strategies.length} activas)
              </h3>
              <span className="text-xs text-neutral-400">
                • Haz clic en &ldquo;Revisar y Ver en Gráfico&rdquo; para sincronizar TradingView en 4H
              </span>
            </div>
          </div>

          {/* Strategies Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {strategies.map((strat, idx) => {
              const isSelected = selectedStrategyIndex === idx;
              return (
                <div
                  key={strat.noEstrategia}
                  id={`strategy-card-${strat.noEstrategia}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col gap-3 ${
                    isSelected
                      ? 'bg-neutral-950 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950/90'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-neutral-850">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        {strat.noEstrategia}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                        {strat.par}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {strat.nombreDeEstrategia}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                        {strat.temporalidad || '1D / 4H'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {strat.fecha}
                      </span>
                    </div>

                    {/* Action Button: Revisar & Cargar en Gráfico */}
                    <div className="flex items-center gap-2">
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-bold font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>Revisando • Gráfico 4H Activo</span>
                        </div>
                      ) : (
                        <button
                          id={`select-strat-btn-${strat.noEstrategia}`}
                          onClick={() => handleSelectStrategyToReview(idx)}
                          className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200 text-xs font-semibold border border-neutral-700 hover:border-amber-400 transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <LineChart className="w-3.5 h-3.5" />
                          <span>Revisar y Cargar en Gráfico (4H)</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          handleSelectStrategyToReview(idx);
                          setActiveTab('plan');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors flex items-center gap-1"
                        title="Ver plan de ejecución de 6 órdenes"
                      >
                        <span>Ver Plan</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Indicators & Signals */}
                  <div className="text-xs bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800/80">
                    <span className="font-semibold text-cyan-400 flex items-center gap-1.5 text-[11px] mb-1">
                      <TrendingUp className="w-3 h-3" />
                      Indicadores Clave:
                    </span>
                    <p className="text-neutral-300 font-mono text-xs leading-relaxed">
                      {strat.indicadoresClave}
                    </p>
                  </div>

                  {/* 3 Columns: Reglas de Entrada, TP, y Gestión de Riesgo */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                    {/* Reglas de Entrada */}
                    <div className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800/60 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                        Reglas de Entrada (Escalonada)
                      </span>
                      <p className="text-neutral-300 text-[11px] leading-relaxed">
                        {strat.reglasDeEntrada}
                      </p>
                    </div>

                    {/* Reglas de Salida / TP */}
                    <div className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800/60 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                        Reglas de Salida / Take Profit
                      </span>
                      <p className="text-neutral-300 text-[11px] leading-relaxed">
                        {strat.reglasDeSalidaTP}
                      </p>
                    </div>

                    {/* Gestión de Riesgo */}
                    <div className="p-2.5 rounded-lg bg-neutral-900/40 border border-neutral-800/60 flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
                        Gestión de Riesgo & Stop Loss
                      </span>
                      <p className="text-neutral-300 text-[11px] leading-relaxed">
                        {strat.gestionDeRiesgoStopLoss}
                      </p>
                    </div>
                  </div>

                  {/* Comentarios / Backtesting */}
                  {strat.comentariosBacktesting && (
                    <div className="text-[11px] text-neutral-400 italic bg-neutral-900/30 p-2 rounded border border-neutral-850">
                      <strong className="text-neutral-300 not-italic">Backtesting & Comentarios: </strong>
                      {strat.comentariosBacktesting}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. TAB CONTENT: PLAN DE ÓRDENES (BINANCE) */}
      {activeTab === 'plan' && currentStrategy && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Strategy Meta & Signals (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {currentStrategy.noEstrategia}
                    </span>
                    <span className="text-xs text-neutral-400">{currentStrategy.fecha}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">
                    {currentStrategy.nombreDeEstrategia}
                  </h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {currentStrategy.par}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                    {currentStrategy.temporalidad || '4H'}
                  </span>
                </div>
              </div>

              {/* Technical Indicators */}
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Indicadores Clave del Análisis
                </span>
                <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                  {currentStrategy.indicadoresClave}
                </p>
              </div>

              {/* Strategy Rules Grid */}
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                    Reglas de Entrada (Escalonada)
                  </span>
                  <p className="text-[11px] text-neutral-300">{currentStrategy.reglasDeEntrada}</p>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                    Reglas de Salida / Take Profit (TP)
                  </span>
                  <p className="text-[11px] text-neutral-300">{currentStrategy.reglasDeSalidaTP}</p>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">
                    Gestión de Riesgo & Stop Loss
                  </span>
                  <p className="text-[11px] text-neutral-300">
                    {currentStrategy.gestionDeRiesgoStopLoss}
                  </p>
                </div>
              </div>

              {currentStrategy.comentariosBacktesting && (
                <div className="p-2 rounded-lg bg-neutral-900/40 border border-neutral-800/60 text-[11px] text-neutral-400 italic">
                  <b>Ponderación / Backtesting:</b> {currentStrategy.comentariosBacktesting}
                </div>
              )}
            </div>

            {/* Position Size & Risk Customization */}
            <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-xl flex flex-col gap-3">
              <span className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  Margen de la Cuenta & Asignación
                </span>
                <span className="text-[11px] font-mono text-neutral-400">
                  Total - Órdenes - Posiciones
                </span>
              </span>

              {/* Live Account Available Margin Indicator */}
              <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-300">
                      Margen Disponible de la Cuenta:
                    </span>
                  </div>
                  <span className="text-base font-bold font-mono text-emerald-300">
                    $
                    {marginBreakdown.availableMargin.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    USDT
                  </span>
                </div>

                <div className="text-[10px] font-mono flex flex-wrap items-center gap-1.5 text-neutral-400 bg-neutral-900/60 p-1.5 rounded border border-neutral-800/80">
                  <span className="text-neutral-300">Cálculo:</span>
                  <span>Total (${marginBreakdown.totalMarginBalance.toFixed(2)})</span>
                  <span className="text-rose-400 font-bold">-</span>
                  <span>Órdenes (${marginBreakdown.openOrdersMargin.toFixed(2)})</span>
                  <span className="text-rose-400 font-bold">-</span>
                  <span>Posiciones (${marginBreakdown.activePositionsMargin.toFixed(2)})</span>
                  <span className="text-emerald-400 font-bold">=</span>
                  <span className="text-emerald-300 font-bold">
                    ${marginBreakdown.availableMargin.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              {/* USDT Allocation Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Margen a Asignar a la Estrategia:</span>
                  <span className="font-mono font-bold text-white">{usdtAllocation} USDT</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      id="usdt-allocation-input"
                      type="number"
                      min="5"
                      max={Math.max(10, marginBreakdown.availableMargin)}
                      step="5"
                      value={usdtAllocation}
                      onChange={e =>
                        setUsdtAllocation(Math.max(5, parseFloat(e.target.value) || 5))
                      }
                      className={`w-full px-3 py-1.5 text-xs bg-neutral-900 border rounded-lg text-white font-mono focus:outline-none ${
                        usdtAllocation > marginBreakdown.availableMargin
                          ? 'border-rose-500 text-rose-300 focus:border-rose-400'
                          : 'border-neutral-700 focus:border-amber-500'
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-mono">
                      USDT
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setUsdtAllocation(Number(marginBreakdown.availableMargin.toFixed(2)))
                    }
                    className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 transition-colors shrink-0 flex items-center gap-1"
                    title="Asignar todo el margen disponible"
                  >
                    <DollarSign className="w-3 h-3 text-emerald-400" />
                    Tomar Todo ({marginBreakdown.availableMargin.toFixed(0)})
                  </button>
                </div>

                {/* Percentage Quick Selectors */}
                <div className="flex items-center justify-between gap-1 mt-1">
                  <span className="text-[10px] text-neutral-400">Porcentaje del Disponible:</span>
                  <div className="flex items-center gap-1">
                    {[
                      { label: '25%', ratio: 0.25 },
                      { label: '50%', ratio: 0.5 },
                      { label: '75%', ratio: 0.75 },
                      { label: '100%', ratio: 1.0 },
                    ].map(({ label, ratio }) => {
                      const calculatedAmt = Number(
                        Math.max(5, marginBreakdown.availableMargin * ratio).toFixed(2)
                      );
                      const isSelected = Math.abs(usdtAllocation - calculatedAmt) < 1;
                      return (
                        <button
                          key={label}
                          onClick={() => setUsdtAllocation(calculatedAmt)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded border transition-colors ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Over-allocation warning */}
                {usdtAllocation > marginBreakdown.availableMargin && (
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between gap-2 mt-1">
                    <span>
                      ⚠️ El margen a asignar (${usdtAllocation} USDT) excede el Margen Disponible ($
                      {marginBreakdown.availableMargin.toFixed(2)} USDT).
                    </span>
                    <button
                      onClick={() =>
                        setUsdtAllocation(Number(marginBreakdown.availableMargin.toFixed(2)))
                      }
                      className="shrink-0 px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800/80 text-[10px] font-bold text-white border border-rose-700"
                    >
                      Ajustar al Disponible
                    </button>
                  </div>
                )}
              </div>

              {/* Leverage Selector (Strictly 1x - 5x Isolated) */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-neutral-850">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-300 font-medium">Apalancamiento (1x - 5x Aislado):</span>
                  <span className="font-mono font-bold text-amber-400">{selectedLeverage}x ISOLATED</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {[1, 2, 3, 4, 5].map(lev => (
                    <button
                      key={lev}
                      id={`leverage-btn-${lev}`}
                      onClick={() => setSelectedLeverage(lev)}
                      className={`py-1.5 text-xs font-mono font-bold rounded-lg border transition-all ${
                        selectedLeverage === lev
                          ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-950/30'
                          : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 6 Planned Binance Orders & Authorization Execution (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {executionPlan && (
              <div className="bg-neutral-950/70 border border-neutral-800 p-4 rounded-xl flex flex-col gap-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-850">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Plan de Ejecución ({executionPlan.orders.length} Órdenes Tácticas en Binance)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    Notional: ${(usdtAllocation * selectedLeverage).toFixed(2)} USDT
                  </span>
                </div>

                {/* Risk / Reward Metrics Banner */}
                <div className="grid grid-cols-3 gap-2 text-center p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Pérdida Máxima (SL)</span>
                    <span className="text-rose-400 font-bold">
                      -${executionPlan.maxLossUsdt?.toFixed(2)} USDT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Ganancia Proyectada (TPs)</span>
                    <span className="text-emerald-400 font-bold">
                      +${executionPlan.maxProfitUsdt?.toFixed(2)} USDT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block">Ratio Riesgo/Beneficio</span>
                    <span className="text-amber-300 font-bold">
                      1 : {executionPlan.riskRewardRatio}
                    </span>
                  </div>
                </div>

                {/* The 6 Binance Orders Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-neutral-800 text-neutral-400 text-[10px] uppercase">
                        <th className="py-2">Rol / Etiqueta</th>
                        <th className="py-2">Tipo Orden</th>
                        <th className="py-2">Lado</th>
                        <th className="py-2 text-right">Precio</th>
                        <th className="py-2 text-right">Cantidad</th>
                        <th className="py-2 text-right">Total (USDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850">
                      {executionPlan.orders.map(ord => {
                        const isEntry = ord.role === 'ENTRY';
                        const isTP = ord.role === 'TAKE_PROFIT';
                        const isSL = ord.role === 'STOP_LOSS';

                        return (
                          <tr key={ord.id} className="hover:bg-neutral-900/40">
                            <td className="py-2 font-medium text-neutral-200">
                              <span
                                className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  isEntry
                                    ? 'bg-emerald-400'
                                    : isTP
                                    ? 'bg-cyan-400'
                                    : 'bg-rose-400'
                                }`}
                              ></span>
                              {ord.label}
                            </td>
                            <td className="py-2 text-neutral-400 text-[11px]">{ord.type}</td>
                            <td
                              className={`py-2 font-bold ${
                                ord.side === 'BUY' ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {ord.side}
                            </td>
                            <td className="py-2 text-right font-bold text-white">
                              ${ord.price.toFixed(ord.price < 10 ? 4 : 2)}
                            </td>
                            <td className="py-2 text-right text-neutral-300">{ord.quantity}</td>
                            <td className="py-2 text-right text-neutral-400">
                              ${(ord.price * ord.quantity).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Dispatch / Authorization Area */}
                {createdOrderReceipts.length > 0 ? (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        Órdenes activas en Binance ({createdOrderReceipts.length})
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          id="view-orders-tab-btn"
                          onClick={() => onSwitchToOrders?.()}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver en Órdenes Abiertas</span>
                        </button>
                        <button
                          onClick={handleCancelStrategyOrders}
                          className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-xs transition-colors"
                        >
                          Cancelar Estrategia
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                    <div className="text-[11px] text-neutral-400">
                      <span>Apalancamiento: </span>
                      <b className="text-amber-400">{executionPlan.leverage}x ISOLATED</b>
                      <span> • Par: </span>
                      <b className="text-white">{executionPlan.symbol}</b>
                      <span> • Órdenes: </span>
                      <b className="text-cyan-400">{executionPlan.orders.length}</b>
                    </div>

                    <button
                      id="authorize-binance-strategy-btn"
                      onClick={() => setIsAuthModalOpen(true)}
                      className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                    >
                      <Shield className="w-4 h-4 fill-neutral-950" />
                      <span>Autorizar y Crear Estrategia en Binance</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: RAW SHEET DATA */}
      {activeTab === 'sheet_data' && currentStrategy && (
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <h4 className="text-xs font-bold text-white">
              Fila oficial de Google Sheets: {currentStrategy.noEstrategia} ({currentStrategy.par})
            </h4>
            <span className="text-xs text-neutral-400 font-mono">
              Estrategia {selectedStrategyIndex + 1} de {strategies.length}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <tbody>
                {Object.entries(currentStrategy).map(([key, val]) => (
                  <tr key={key} className="border-b border-neutral-850">
                    <td className="py-2.5 pr-4 font-semibold text-neutral-400 w-52 capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </td>
                    <td className="py-2.5 text-neutral-200 break-words leading-relaxed">{val || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: ESTRUCTURA & GUÍA TÁCTICA */}
      {activeTab === 'guide' && (
        <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 text-xs leading-relaxed text-neutral-300">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-emerald-400" />
            Estructura y Protocolo de Ejecución Táctica de Google Sheets
          </h4>
          <p>
            El Creador de Estrategias está vinculado de manera exclusiva e inmutable a la hoja de cálculo
            oficial de Google Sheets que contiene las 5 estrategias tácticas (ZEC, TAO, AAVE, SOL, XRP).
          </p>
          <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
            No. Estrategia, Fecha, Nombre de Estrategia, Par, Temporalidad, Tipo de Orden, Indicadores Clave, Reglas
            de Entrada, Reglas de Salida / TP, Gestión de Riesgo & Stop Loss, Comentarios / Backtesting
          </div>
          <div className="flex flex-col gap-1.5 text-[11px] text-neutral-400 pt-1">
            <p>
              • <b>Sincronización en Tiempo Real:</b> Cada vez que seleccionas una estrategia, el gráfico de TradingView se actualiza instantáneamente a esa paridad en temporalidad 4H.
            </p>
            <p>
              • <b>Apalancamiento ISOLATED:</b> Se extrae automáticamente de la columna <i>Gestión de Riesgo</i> y está restringido a 1x-5x Aislado (ISOLATED).
            </p>
            <p>
              • <b>Autorización Obligatoria:</b> Para protección estricta del capital del operador, ninguna orden se enviará a Binance hasta que se confirme explícitamente en el diálogo de autorización.
            </p>
          </div>
        </div>
      )}

      {/* 7. MODAL DE AUTORIZACIÓN MANUAL OBLIGATORIA */}
      {isAuthModalOpen && executionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Autorización de Estrategia en Binance</h3>
                  <p className="text-xs text-neutral-400">Confirmación explícita del operador requerida</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist of what will be dispatched */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Estrategia:</span>
                <span className="font-bold text-amber-300">
                  {executionPlan.strategyId} ({executionPlan.name})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Mercado & Par:</span>
                <span className="font-bold text-white">{executionPlan.symbol} USDⓈ-M Futures</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Modo de Margen:</span>
                <span className="font-bold text-emerald-400">ISOLATED (Aislado Obligatorio)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Apalancamiento:</span>
                <span className="font-bold text-amber-400">{executionPlan.leverage}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Capital Asignado:</span>
                <span className="font-bold text-white">{executionPlan.totalUsdtAllocation} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Órdenes a Crear:</span>
                <span className="font-bold text-cyan-400">
                  {executionPlan.orders.length} órdenes simultáneas
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2">
                <span className="text-neutral-400">Riesgo Máximo en Stop Loss:</span>
                <span className="font-bold text-rose-400">
                  -${executionPlan.maxLossUsdt?.toFixed(2)} USDT
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Ganancia Estimada en TPs:</span>
                <span className="font-bold text-emerald-400">
                  +${executionPlan.maxProfitUsdt?.toFixed(2)} USDT
                </span>
              </div>
            </div>

            {/* Operator confirmation toggle */}
            <label className="flex items-start gap-2.5 text-xs text-neutral-300 cursor-pointer p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-colors">
              <input
                id="safety-confirm-checkbox"
                type="checkbox"
                checked={confirmedSafetyCheck}
                onChange={e => setConfirmedSafetyCheck(e.target.checked)}
                className="mt-0.5 rounded bg-neutral-800 border-neutral-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="leading-snug">
                He revisado los niveles de soporte, Stop Loss estricto y las tomas de beneficios de{' '}
                <strong className="text-amber-300">{executionPlan.strategyId}</strong>. Autorizo a la
                terminal a crear las órdenes en el motor de Binance.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>

              <button
                id="confirm-dispatch-binance-btn"
                onClick={handleAuthorizeAndCreateOnBinance}
                disabled={!confirmedSafetyCheck || isDispatching}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isDispatching ? 'Despachando a Binance...' : 'Confirmar y Despachar a Binance'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
