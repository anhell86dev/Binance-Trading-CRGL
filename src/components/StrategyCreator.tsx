import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  LineChart,
  Lock,
  Percent,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
  Compass,
  Scale,
  Target,
  DollarSign,
  Wallet,
} from 'lucide-react';
import { GoogleSheetStrategyRow, StrategyExecutionPlan, SheetAlertRow } from '../types/strategy';
import {
  SAMPLE_GOOGLE_SHEET_CSV,
  generateExecutionPlan,
  parseCsvToStrategies,
  parsePricesFromStrategy,
} from '../utils/sheetParser';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import {
  strategyService,
  OFFICIAL_GOOGLE_SHEET_NAME,
  OFFICIAL_GOOGLE_SHEET_URL,
} from '../services/strategyService';
import {
  alertsSheetService,
  OFFICIAL_ALERTS_SHEET_NAME,
  OFFICIAL_WORKBOOK_NAME,
} from '../services/alertsSheetService';

interface StrategyCreatorProps {
  onSwitchToOrders?: () => void;
}

const formatPrice = (p: number) => {
  if (!p || isNaN(p)) return '0.00';
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(3);
  return p.toFixed(4);
};

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
  const [activeTab, setActiveTab] = useState<
    'all_strategies' | 'plan' | 'sheet_data' | 'sheet_alertas' | 'guide'
  >('all_strategies');

  // Sheet "alertas" state and form
  const [sheetAlerts, setSheetAlerts] = useState<SheetAlertRow[]>(() =>
    alertsSheetService.getAlerts()
  );
  const [isStructureCreated, setIsStructureCreated] = useState<boolean>(() =>
    alertsSheetService.getIsStructureCreated()
  );
  const [newAlertSymbol, setNewAlertSymbol] = useState<string>('ZECUSDT');
  const [newAlertCond, setNewAlertCond] = useState<'SWING' | 'ABOVE' | 'BELOW'>('SWING');
  const [newAlertSwing, setNewAlertSwing] = useState<number>(1.0);
  const [newAlertTargetPrice, setNewAlertTargetPrice] = useState<string>('');
  const [newAlertCustomMsg, setNewAlertCustomMsg] = useState<string>('');

  // Keep live margin and alerts sync with Binance & Google Sheet service
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setMarginBreakdown(binanceWs.getMarginBreakdown());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies(strategyService.getStrategies());
      setSelectedStrategyIndex(strategyService.getActiveIndex());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubAlerts = alertsSheetService.subscribe(() => {
      setSheetAlerts([...alertsSheetService.getAlerts()]);
      setIsStructureCreated(alertsSheetService.getIsStructureCreated());
    });

    return () => {
      unsubWs();
      unsubStrat();
      unsubAlerts();
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

  // Live Price Resolver for any symbol
  const getLivePriceForSymbol = (symbol: string): number => {
    if (symbol === binanceWs.getTicker().symbol) {
      return binanceWs.getTicker().lastPrice;
    }
    return alertsSheetService.getLivePrice(symbol);
  };

  // Download official CSV for the "alertas" sheet
  const handleDownloadAlertsCsv = () => {
    const csv = alertsSheetService.exportAlertsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `libro_hoja_alertas_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Reset or initialize official sheet structure
  const handleResetSheetStructure = () => {
    alertsSheetService.resetToDefaultStructure();
  };

  // Recalculate distance % in real-time
  const handleRecalculateDistances = () => {
    alertsSheetService.recalculateAllDistances();
  };

  // Add a new alert to the "alertas" sheet
  const handleCreateSheetAlert = (e: React.FormEvent) => {
    e.preventDefault();
    alertsSheetService.addAlert({
      symbol: newAlertSymbol,
      condition: newAlertCond,
      thresholdVal: newAlertCond === 'SWING' ? newAlertSwing : parseFloat(newAlertTargetPrice || '0'),
      customMessage: newAlertCustomMsg || undefined,
    });
    setNewAlertTargetPrice('');
    setNewAlertCustomMsg('');
  };

  // Quick-add volatility alert directly from strategy catalog card
  const handleQuickAddAlertForStrategy = (strat: GoogleSheetStrategyRow) => {
    alertsSheetService.addAlert({
      symbol: strat.par,
      condition: 'SWING',
      thresholdVal: 1.0,
      customMessage: `Monitoreo directo desde catálogo para ${strat.noEstrategia}`,
    });
    setActiveTab('sheet_alertas');
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
                Conectado al libro oficial de Google Sheets con 2 hojas operativas: <strong>Estrategias</strong> (catálogo táctico) y <strong>alertas</strong> (monitoreo de volatilidad y % distancias en vivo).
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
            <span className="text-neutral-500">Libro Oficial de Sheets:</span>
            <strong className="text-emerald-300">
              {OFFICIAL_WORKBOOK_NAME}
            </strong>
          </div>
          <div className="flex items-center gap-3 text-neutral-400 text-[11px] flex-wrap">
            <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300">
              Hoja 1: <b>Estrategias ({strategies.length})</b>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 font-semibold flex items-center gap-1">
              <Bell className="w-3 h-3 text-emerald-400" />
              Hoja 2: <b>{OFFICIAL_ALERTS_SHEET_NAME} ({sheetAlerts.length})</b>
            </span>
            <span>•</span>
            <span>Última Actualización: <strong className="text-amber-400">{lastSyncTime}</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 text-xs font-medium flex-wrap">
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
            <span>Hoja 1: Estrategias ({strategies.length})</span>
          </button>

          <button
            id="tab-sheet-alertas-btn"
            onClick={() => setActiveTab('sheet_alertas')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'sheet_alertas'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
            }`}
          >
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span>Hoja 2: alertas ({sheetAlerts.length})</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
              % Distancia
            </span>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" />
                Catálogo de Estrategias Oficiales ({strategies.length} activas)
              </h3>
              <span className="text-xs text-neutral-400 hidden sm:inline">
                • Haz clic en &ldquo;Revisar y Cargar en Gráfico&rdquo; para sincronizar TradingView en 4H
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <span className="text-neutral-500">Base de Cálculo:</span>
              <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-amber-400 font-bold">
                ${usdtAllocation} USDT • {selectedLeverage}x ISOLATED
              </span>
            </div>
          </div>

          {/* Comparador Rápido de Riesgo / Beneficio de las 5 Estrategias */}
          <div className="bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                Resumen Comparativo: Ratio R/B, Ganancia y Pérdida
              </span>
              <span className="text-[11px] font-mono text-neutral-400 hidden md:inline">
                Haz clic en una ficha para seleccionarla
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
              {strategies.map((strat, sIdx) => {
                const p = generateExecutionPlan(strat, usdtAllocation, selectedLeverage);
                const isSelected = selectedStrategyIndex === sIdx;
                return (
                  <button
                    key={`quick-metric-${strat.noEstrategia}`}
                    id={`quick-compare-btn-${strat.noEstrategia}`}
                    onClick={() => handleSelectStrategyToReview(sIdx)}
                    className={`p-2.5 rounded-lg text-left transition-all border flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/40 shadow-sm'
                        : 'bg-neutral-950/80 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-white flex items-center gap-1">
                        <span>{strat.par}</span>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />}
                      </span>
                      <span className={`text-[10px] font-mono font-extrabold px-1.5 py-0.2 rounded border ${
                        p.riskRewardRatio >= 3
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : p.riskRewardRatio >= 2
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}>
                        R/B 1:{p.riskRewardRatio}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold" title="Ganancia Proyectada">
                        +${p.maxProfitUsdt.toFixed(1)}
                      </span>
                      <span className="text-rose-400 font-bold" title="Pérdida Máxima">
                        -${p.maxLossUsdt.toFixed(1)}
                      </span>
                    </div>

                    <div className="text-[9px] text-neutral-400 truncate">
                      {strat.nombreEstrategia || (strat as unknown as Record<string, string>).nombreDeEstrategia}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Strategies Cards Grid */}
          <div className="grid grid-cols-1 gap-3.5">
            {strategies.map((strat, idx) => {
              const isSelected = selectedStrategyIndex === idx;
              const cardPlan = generateExecutionPlan(strat, usdtAllocation, selectedLeverage);
              const parsedPrices = parsePricesFromStrategy(strat);
              const avgEntry = (parsedPrices.entry1Price + parsedPrices.entry2Price) / 2;
              const slDistPct = avgEntry > 0 ? Math.abs(((avgEntry - parsedPrices.slPrice) / avgEntry) * 100) : 0;
              const tpDistPct = avgEntry > 0 ? Math.abs(((parsedPrices.tp1Price - avgEntry) / avgEntry) * 100) : 0;
              const profitReturnPct = usdtAllocation > 0 ? ((cardPlan.maxProfitUsdt / usdtAllocation) * 100) : 0;
              const lossRiskPct = usdtAllocation > 0 ? ((cardPlan.maxLossUsdt / usdtAllocation) * 100) : 0;

              return (
                <div
                  key={strat.noEstrategia}
                  id={`strategy-card-${strat.noEstrategia}`}
                  className={`p-4 rounded-xl border transition-all flex flex-col gap-3.5 ${
                    isSelected
                      ? 'bg-neutral-950 border-amber-500/60 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
                      : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950/90'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-start justify-between gap-2.5 pb-2.5 border-b border-neutral-850">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/40">
                        {strat.noEstrategia}
                      </span>
                      <span className="font-mono text-sm font-extrabold text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-800/40">
                        {strat.par}
                      </span>
                      <span className="text-xs font-semibold text-white">
                        {strat.nombreEstrategia || (strat as unknown as Record<string, string>).nombreDeEstrategia}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                        {strat.temporalidad || '1D / 4H'}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {strat.fecha}
                      </span>

                      {/* Quick Badges in Header */}
                      <div className="flex items-center gap-1.5 flex-wrap ml-1">
                        <span
                          title={`Ratio Riesgo/Beneficio: 1:${cardPlan.riskRewardRatio}`}
                          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/35 flex items-center gap-1"
                        >
                          <Scale className="w-3 h-3 text-amber-400" />
                          <span>R/B 1:{cardPlan.riskRewardRatio}</span>
                        </span>
                        <span
                          title="Ganancia Proyectada al alcanzar los 3 Take Profits"
                          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/35 flex items-center gap-1"
                        >
                          <TrendingUp className="w-3 h-3 text-emerald-400" />
                          <span>+${cardPlan.maxProfitUsdt.toFixed(2)} USDT</span>
                        </span>
                        <span
                          title="Pérdida Máxima al ejecutar el Stop Loss estricto"
                          className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/35 flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3 text-rose-400" />
                          <span>-${cardPlan.maxLossUsdt.toFixed(2)} USDT</span>
                        </span>
                      </div>
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

                  {/* 3 Core Financial Metrics Requested: Ratio R/B, Ganancia Proyectada, Pérdida Máxima */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 shadow-inner">
                    {/* 1. Ratio R/B */}
                    <div className="p-3 rounded-lg bg-neutral-950/80 border border-amber-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                          <Scale className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          Ratio R/B (Riesgo / Beneficio)
                        </span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold border ${
                          cardPlan.riskRewardRatio >= 3
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : cardPlan.riskRewardRatio >= 2
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                        }`}>
                          {cardPlan.riskRewardRatio >= 3 ? '★ 1:' + cardPlan.riskRewardRatio + ' Óptimo' : '1:' + cardPlan.riskRewardRatio}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-extrabold text-amber-300">
                          1 : {cardPlan.riskRewardRatio}
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          (Riesgo $1.00 vs Retorno ${cardPlan.riskRewardRatio})
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1.5 border-t border-neutral-850">
                        <span>SL: ${formatPrice(parsedPrices.slPrice)} (-{slDistPct.toFixed(1)}%)</span>
                        <span>TP1: ${formatPrice(parsedPrices.tp1Price)} (+{tpDistPct.toFixed(1)}%)</span>
                      </div>
                    </div>

                    {/* 2. Ganancia Proyectada */}
                    <div className="p-3 rounded-lg bg-neutral-950/80 border border-emerald-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          Ganancia Proyectada
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                          +{profitReturnPct.toFixed(1)}% Retorno
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-extrabold text-emerald-300">
                          +${cardPlan.maxProfitUsdt.toFixed(2)} USDT
                        </span>
                        <span className="text-[10px] text-emerald-400/80 font-mono">
                          (TP1 + TP2 + TP Final)
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1.5 border-t border-neutral-850">
                        <span>TP1 40% (${formatPrice(parsedPrices.tp1Price)})</span>
                        <span>TP Final 20% (${formatPrice(parsedPrices.tpFinalPrice)})</span>
                      </div>
                    </div>

                    {/* 3. Pérdida Máxima */}
                    <div className="p-3 rounded-lg bg-neutral-950/80 border border-rose-500/30 flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          Pérdida Máxima
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          -{lossRiskPct.toFixed(1)}% Margen
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-mono font-extrabold text-rose-300">
                          -${cardPlan.maxLossUsdt.toFixed(2)} USDT
                        </span>
                        <span className="text-[10px] text-rose-400/80 font-mono">
                          (SL Estricto)
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1.5 border-t border-neutral-850">
                        <span>Nivel SL: ${formatPrice(parsedPrices.slPrice)}</span>
                        <span className="text-amber-400 font-semibold">{selectedLeverage}x ISOLATED</span>
                      </div>
                    </div>
                  </div>

                  {/* % Distancia entre el precio en vivo vs las entradas */}
                  {(() => {
                    const cardLivePrice = getLivePriceForSymbol(strat.par);
                    const distE1 =
                      parsedPrices.entry1Price > 0
                        ? ((cardLivePrice - parsedPrices.entry1Price) / parsedPrices.entry1Price) * 100
                        : 0;
                    const distE2 =
                      parsedPrices.entry2Price > 0
                        ? ((cardLivePrice - parsedPrices.entry2Price) / parsedPrices.entry2Price) * 100
                        : 0;
                    const isNearE1 = Math.abs(distE1) <= 0.75;
                    const isNearE2 = Math.abs(distE2) <= 0.75;

                    return (
                      <div className="p-3 rounded-xl bg-neutral-950/90 border border-neutral-800 flex flex-col gap-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                              <span>Precio en Vivo vs. Entradas de Estrategia</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-neutral-900 border border-neutral-750 text-neutral-400 font-mono">
                                % Distancia en Tiempo Real
                              </span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-extrabold text-amber-300 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">
                              Vivo: ${formatPrice(cardLivePrice)} USDT
                            </span>
                            <button
                              onClick={() => handleQuickAddAlertForStrategy(strat)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-sm"
                              title="Guardar alerta de volatilidad en la hoja alertas del libro"
                            >
                              <Bell className="w-3 h-3 text-emerald-400" />
                              <span>Guardar en Hoja alertas</span>
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono text-xs">
                          {/* Entrada 1 */}
                          <div
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isNearE1
                                ? 'bg-emerald-950/30 border-emerald-500/50'
                                : 'bg-neutral-900/90 border-neutral-800'
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 font-sans font-semibold">
                                  Entrada 1 (50% lote)
                                </span>
                                {isNearE1 && (
                                  <span className="text-[9px] px-1 py-0.1 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                                    ¡ZONA ACTIVA!
                                  </span>
                                )}
                              </div>
                              <span className="font-extrabold text-white text-sm">
                                ${formatPrice(parsedPrices.entry1Price)}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[10px] text-neutral-400 font-sans">
                                Distancia en Vivo
                              </span>
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded border ${
                                  isNearE1
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                    : distE1 > 0
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                }`}
                              >
                                {distE1 > 0 ? '+' : ''}
                                {distE1.toFixed(2)}%
                              </span>
                            </div>
                          </div>

                          {/* Entrada 2 */}
                          <div
                            className={`p-2.5 rounded-lg border flex items-center justify-between ${
                              isNearE2
                                ? 'bg-emerald-950/30 border-emerald-500/50'
                                : 'bg-neutral-900/90 border-neutral-800'
                            }`}
                          >
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-neutral-400 font-sans font-semibold">
                                  Entrada 2 (50% lote)
                                </span>
                                {isNearE2 && (
                                  <span className="text-[9px] px-1 py-0.1 rounded bg-emerald-500/30 text-emerald-300 font-bold">
                                    ¡ZONA ACTIVA!
                                  </span>
                                )}
                              </div>
                              <span className="font-extrabold text-white text-sm">
                                ${formatPrice(parsedPrices.entry2Price)}
                              </span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[10px] text-neutral-400 font-sans">
                                Distancia en Vivo
                              </span>
                              <span
                                className={`text-xs font-black px-2 py-0.5 rounded border ${
                                  isNearE2
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                    : distE2 > 0
                                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                    : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                }`}
                              >
                                {distE2 > 0 ? '+' : ''}
                                {distE2.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

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

      {/* 5. TAB CONTENT: HOJA "alertas" DE GOOGLE SHEETS */}
      {activeTab === 'sheet_alertas' && (
        <div className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 flex flex-col gap-4">
          {/* Header de la Hoja de Cálculo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    Libro: {OFFICIAL_WORKBOOK_NAME}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-400" />
                    Hoja: &ldquo;{OFFICIAL_ALERTS_SHEET_NAME}&rdquo;
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-900 text-neutral-300 border border-neutral-800">
                    Estructura creada en libro (13 columnas)
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Registro oficial de alertas de volatilidad con cálculo en tiempo real del <strong>% de distancia entre el precio en vivo vs Entrada 1 y Entrada 2</strong> de cada estrategia.
                </p>
              </div>
            </div>

            {/* Acciones de la Hoja */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleRecalculateDistances}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-300 text-xs font-medium border border-neutral-750 transition-colors flex items-center gap-1.5"
                title="Recalcular inmediatamente los % de distancias con los últimos precios de Binance"
              >
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Recalcular Distancias</span>
              </button>

              <button
                id="export-alerts-csv-btn"
                onClick={handleDownloadAlertsCsv}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-200 text-xs font-medium border border-neutral-750 transition-colors flex items-center gap-1.5"
                title="Descargar la hoja de alertas en formato CSV compatible con Excel y Google Sheets"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Descargar CSV</span>
              </button>

              <button
                onClick={handleResetSheetStructure}
                className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-rose-950/40 text-neutral-400 hover:text-rose-300 text-xs border border-neutral-800 transition-colors flex items-center gap-1"
                title="Restablecer la estructura oficial y recargar alertas predeterminadas"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>
            </div>
          </div>

          {/* Formulario para Crear / Agregar Nueva Alerta en la Hoja */}
          <div className="p-3.5 rounded-xl bg-neutral-900/70 border border-neutral-800 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Registrar Nueva Alerta en la Hoja &ldquo;alertas&rdquo;</span>
              </span>
              <span className="text-[11px] text-neutral-400 font-mono">
                Se guardará con vinculación automática a las entradas de la estrategia
              </span>
            </div>

            <form
              onSubmit={handleCreateSheetAlert}
              className="flex flex-wrap items-end gap-3 text-xs"
            >
              {/* Par / Estrategia */}
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                  Par Cripto
                </label>
                <select
                  value={newAlertSymbol}
                  onChange={e => setNewAlertSymbol(e.target.value)}
                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono font-bold text-white"
                >
                  {strategies.map(s => (
                    <option key={s.par} value={s.par}>
                      {s.par} ({s.noEstrategia})
                    </option>
                  ))}
                </select>
              </div>

              {/* Condición */}
              <div>
                <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                  Condición de Disparo
                </label>
                <select
                  value={newAlertCond}
                  onChange={e => setNewAlertCond(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                >
                  <option value="SWING">Oscilación % Rápida (Volatilidad)</option>
                  <option value="ABOVE">Precio Supera Nivel Clave</option>
                  <option value="BELOW">Precio Cae Bajo Soporte</option>
                </select>
              </div>

              {/* Umbral o Precio */}
              {newAlertCond === 'SWING' ? (
                <div>
                  <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                    Umbral de Movimiento (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.2"
                    value={newAlertSwing}
                    onChange={e => setNewAlertSwing(parseFloat(e.target.value))}
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-white w-28"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                    Precio Objetivo (USDT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newAlertTargetPrice}
                    onChange={e => setNewAlertTargetPrice(e.target.value)}
                    className="bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 font-mono text-white w-32"
                    placeholder="0.00"
                  />
                </div>
              )}

              {/* Comentario / Nota */}
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-neutral-400 font-semibold block mb-1">
                  Nota / Regla Táctica (Opcional)
                </label>
                <input
                  type="text"
                  value={newAlertCustomMsg}
                  onChange={e => setNewAlertCustomMsg(e.target.value)}
                  placeholder="Ej: Vigilancia de entrada 1 tras barrido de liquidez"
                  className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2.5 py-1.5 text-white"
                />
              </div>

              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Guardar en Hoja</span>
              </button>
            </form>
          </div>

          {/* Tabla Estilo Hoja de Cálculo: Hoja "alertas" */}
          <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-900/90 text-neutral-400 border-b border-neutral-800 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">ID Alerta</th>
                    <th className="py-2.5 px-3">Fecha/Hora</th>
                    <th className="py-2.5 px-3">Par & Estrategia</th>
                    <th className="py-2.5 px-3 text-right">Precio en Vivo</th>
                    <th className="py-2.5 px-3 text-right">Entrada 1</th>
                    <th className="py-2.5 px-3 text-center bg-amber-950/20 text-amber-300 font-bold">
                      % Distancia E1
                    </th>
                    <th className="py-2.5 px-3 text-right">Entrada 2</th>
                    <th className="py-2.5 px-3 text-center bg-amber-950/20 text-amber-300 font-bold">
                      % Distancia E2
                    </th>
                    <th className="py-2.5 px-3">Condición / Umbral</th>
                    <th className="py-2.5 px-3 text-center">Estado</th>
                    <th className="py-2.5 px-3">Detalles</th>
                    <th className="py-2.5 px-3 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {sheetAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-8 text-center text-neutral-500">
                        No hay alertas registradas en la hoja &ldquo;alertas&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    sheetAlerts.map(alt => {
                      const isNearE1 = Math.abs(alt.distPctEntry1) <= 0.75;
                      const isNearE2 = Math.abs(alt.distPctEntry2) <= 0.75;

                      return (
                        <tr
                          key={alt.id}
                          className={`hover:bg-neutral-900/60 transition-colors ${
                            alt.status === 'DISPARADA' ? 'bg-rose-950/10' : ''
                          }`}
                        >
                          {/* ID */}
                          <td className="py-2.5 px-3 font-bold text-neutral-300 text-[11px]">
                            {alt.id}
                          </td>

                          {/* Fecha / Hora */}
                          <td className="py-2.5 px-3 text-neutral-400 text-[11px] whitespace-nowrap">
                            {alt.timestamp}
                          </td>

                          {/* Par & Estrategia */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-white text-xs">{alt.symbol}</span>
                            <span className="ml-1.5 text-[10px] text-neutral-400 bg-neutral-900 px-1 py-0.2 rounded border border-neutral-800">
                              {alt.noEstrategia}
                            </span>
                          </td>

                          {/* Precio en Vivo */}
                          <td className="py-2.5 px-3 text-right font-bold text-amber-300">
                            ${alt.livePrice.toFixed(alt.livePrice < 10 ? 4 : 2)}
                          </td>

                          {/* Entrada 1 */}
                          <td className="py-2.5 px-3 text-right text-neutral-300">
                            ${alt.entry1Price > 0 ? alt.entry1Price.toFixed(alt.entry1Price < 10 ? 4 : 2) : '-'}
                          </td>

                          {/* % Distancia vs Entrada 1 */}
                          <td className="py-2.5 px-3 text-center bg-neutral-900/30">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-black border ${
                                isNearE1
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : alt.distPctEntry1 > 0
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              }`}
                              title={`Precio en Vivo vs Entrada 1: ${alt.distPctEntry1.toFixed(2)}%`}
                            >
                              {alt.distPctEntry1 > 0 ? '+' : ''}
                              {alt.distPctEntry1.toFixed(2)}%
                              {isNearE1 && ' 🎯'}
                            </span>
                          </td>

                          {/* Entrada 2 */}
                          <td className="py-2.5 px-3 text-right text-neutral-300">
                            ${alt.entry2Price > 0 ? alt.entry2Price.toFixed(alt.entry2Price < 10 ? 4 : 2) : '-'}
                          </td>

                          {/* % Distancia vs Entrada 2 */}
                          <td className="py-2.5 px-3 text-center bg-neutral-900/30">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[11px] font-black border ${
                                isNearE2
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  : alt.distPctEntry2 > 0
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                              }`}
                              title={`Precio en Vivo vs Entrada 2: ${alt.distPctEntry2.toFixed(2)}%`}
                            >
                              {alt.distPctEntry2 > 0 ? '+' : ''}
                              {alt.distPctEntry2.toFixed(2)}%
                              {isNearE2 && ' 🎯'}
                            </span>
                          </td>

                          {/* Condición / Umbral */}
                          <td className="py-2.5 px-3 text-neutral-300 text-[11px]">
                            {alt.thresholdOrTarget}
                          </td>

                          {/* Estado */}
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                alt.status === 'DISPARADA'
                                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {alt.status}
                            </span>
                          </td>

                          {/* Mensaje / Regla */}
                          <td className="py-2.5 px-3 text-neutral-400 text-[11px] max-w-xs truncate">
                            {alt.message || '-'}
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => alertsSheetService.removeAlert(alt.id)}
                              className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                              title="Eliminar alerta de la hoja"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: RAW SHEET DATA */}
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
