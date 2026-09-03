import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  CheckCircle2,
  Crown,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  LayoutGrid,
  LineChart,
  List,
  Lock,
  Plus,
  Radio,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import {
  GoogleSheetStrategyRow,
  StrategyExecutionPlan,
  SheetAlertRow,
  StrategyTradeStatus,
} from '../types/strategy';
import {
  generateExecutionPlan,
  parsePricesFromStrategy,
  resolveLatestStrategiesPerPair,
  getTradeProcessStageInfo,
  calculateStrategyRewardToRisk,
} from '../utils/sheetParser';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import {
  strategyService,
  OFFICIAL_GOOGLE_SHEET_NAME,
} from '../services/strategyService';
import {
  alertsSheetService,
  OFFICIAL_ALERTS_SHEET_NAME,
  OFFICIAL_WORKBOOK_NAME,
} from '../services/alertsSheetService';
import { TradeProcessIndicator } from './TradeProcessIndicator';

interface StrategyCreatorProps {
  onSwitchToOrders?: () => void;
}

const formatPrice = (p: number) => {
  if (!p || isNaN(p)) return '0.00';
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
};

export const StrategyCreator: React.FC<StrategyCreatorProps> = ({ onSwitchToOrders }) => {
  // Navigation tabs: Simplificada en 4 secciones claras
  const [activeTab, setActiveTab] = useState<'catalog' | 'plan_calculator' | 'alerts_live' | 'raw_data'>('catalog');

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

  // Search & Filters for Strategy Catalog
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLatestPerPair, setOnlyLatestPerPair] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | StrategyTradeStatus>('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState<'list' | 'grid'>('list');

  // Execution Plan & Account Margin State
  const [usdtAllocation, setUsdtAllocation] = useState<number>(() => {
    const avail = binanceWs.getCalculatedAvailableMargin();
    return avail > 0 ? Math.min(300, Math.max(50, Math.floor(avail * 0.1))) : 100;
  });
  const [selectedLeverage, setSelectedLeverage] = useState<number>(3);
  const [executionPlan, setExecutionPlan] = useState<StrategyExecutionPlan | null>(null);

  // Live open orders and positions from Binance
  const [openOrders, setOpenOrders] = useState(() => binanceWs.getOpenOrders());
  const [positions, setPositions] = useState(() => binanceWs.getPositions());
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());

  // Authorization Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [confirmedSafetyCheck, setConfirmedSafetyCheck] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [createdOrderReceipts, setCreatedOrderReceipts] = useState<string[]>([]);

  // Alerts Sheet State
  const [sheetAlerts, setSheetAlerts] = useState<SheetAlertRow[]>(() =>
    alertsSheetService.getAlerts()
  );
  const [newAlertSymbol, setNewAlertSymbol] = useState<string>('ZECUSDT');
  const [newAlertCond, setNewAlertCond] = useState<'SWING' | 'ABOVE' | 'BELOW'>('SWING');
  const [newAlertSwing, setNewAlertSwing] = useState<number>(1.0);
  const [newAlertTargetPrice, setNewAlertTargetPrice] = useState<string>('');
  const [newAlertCustomMsg, setNewAlertCustomMsg] = useState<string>('');

  // Sync subscriptions
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setOpenOrders(binanceWs.getOpenOrders());
      setPositions(binanceWs.getPositions());
      setTicker(binanceWs.getTicker());
      setBalance(binanceWs.getBalance());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies(strategyService.getStrategies());
      setSelectedStrategyIndex(strategyService.getActiveIndex());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubAlerts = alertsSheetService.subscribe(() => {
      setSheetAlerts([...alertsSheetService.getAlerts()]);
    });

    return () => {
      unsubWs();
      unsubStrat();
      unsubAlerts();
    };
  }, []);

  // Compute resolved strategies
  const { latestStrategies, allResolvedStrategies } = useMemo(() => {
    return resolveLatestStrategiesPerPair(strategies);
  }, [strategies]);

  // Filtered strategies list for catalog
  const filteredStrategies = useMemo(() => {
    const base = onlyLatestPerPair ? latestStrategies : allResolvedStrategies;
    return base.filter((s) => {
      const matchesStatus = statusFilter === 'ALL' || (s.estado || 'Activa') === statusFilter;
      const q = searchQuery.trim().toUpperCase();
      const matchesSearch =
        !q ||
        s.par.toUpperCase().includes(q) ||
        s.noEstrategia.toUpperCase().includes(q) ||
        s.nombreEstrategia.toUpperCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [onlyLatestPerPair, latestStrategies, allResolvedStrategies, statusFilter, searchQuery]);

  // Ranked strategies from 1 to X based on Risk/Reward (R/B) ratio (1 = Best Trade by R/B)
  const rankedStrategies = useMemo(() => {
    const items = filteredStrategies.map((strat) => {
      const rewardToRisk = calculateStrategyRewardToRisk(strat);
      const prices = parsePricesFromStrategy(strat);
      return {
        strat,
        rewardToRisk,
        prices,
      };
    });

    // Sort descending by R/B ratio (higher ratio = better trade = #1)
    items.sort((a, b) => b.rewardToRisk.ratio - a.rewardToRisk.ratio);

    return items.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }, [filteredStrategies]);

  const currentStrategy = strategies[selectedStrategyIndex] || strategies[0];

  // Recalculate execution plan whenever current strategy, allocation, or leverage changes
  useEffect(() => {
    if (currentStrategy) {
      const plan = generateExecutionPlan(currentStrategy, usdtAllocation, selectedLeverage);
      setExecutionPlan(plan);
    }
  }, [currentStrategy, usdtAllocation, selectedLeverage]);

  // Handler to refresh from official sheet
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
        'Google Sheets Sincronizado',
        `Se actualizaron ${refreshed.length} estrategias oficiales desde Google Sheets.`,
        'normal'
      );
    } catch (err: any) {
      notificationService.notify('SYSTEM', 'Error de sincronización', err.message, 'urgent');
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  // Select strategy and switch to Plan Calculator view
  const handleSelectStrategy = (strat: GoogleSheetStrategyRow) => {
    const idx = strategies.findIndex((s) => s.noEstrategia === strat.noEstrategia);
    const validIdx = idx >= 0 ? idx : 0;
    setSelectedStrategyIndex(validIdx);
    strategyService.setActiveStrategyIndex(validIdx);
    setCreatedOrderReceipts([]);
    binanceWs.setSymbol(strat.par);
    setActiveTab('plan_calculator');

    notificationService.notify(
      'SYSTEM',
      'Estrategia Seleccionada',
      `${strat.noEstrategia} (${strat.par}) cargada en el Calculador y en el Gráfico Táctico.`,
      'normal'
    );
  };

  // Select strategy and scroll to chart with drawn levels
  const handleViewOnChart = (strat: GoogleSheetStrategyRow) => {
    const idx = strategies.findIndex((s) => s.noEstrategia === strat.noEstrategia);
    const validIdx = idx >= 0 ? idx : 0;
    setSelectedStrategyIndex(validIdx);
    strategyService.setActiveStrategyIndex(validIdx);
    binanceWs.setSymbol(strat.par);

    const chartEl = document.getElementById('tradingview_chart_section');
    if (chartEl) {
      chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Authorize and create orders in Binance
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

      strategyService.updateStrategyStatus(currentStrategy.noEstrategia, 'Live');

      notificationService.notify(
        'EXECUTION',
        'Órdenes Creadas en Binance',
        `Estrategia ${currentStrategy.noEstrategia} (${currentStrategy.par}) enviada a Binance Futures (${orderIds.length} órdenes).`,
        'urgent'
      );
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

    strategyService.updateStrategyStatus(currentStrategy.noEstrategia, 'Activa');

    notificationService.notify(
      'SYSTEM',
      'Órdenes Canceladas',
      `Órdenes de ${currentStrategy.noEstrategia} canceladas. Estado restablecido a "Activa".`
    );
  };

  // Calculate live distance to strategy entry
  const getDistanceToEntry = (strat: GoogleSheetStrategyRow) => {
    const prices = parsePricesFromStrategy(strat);
    const liveP = strat.par === ticker.symbol ? ticker.lastPrice : alertsSheetService.getLivePrice(strat.par);
    if (!liveP || !prices.entry1Price) return null;
    const diff = ((liveP - prices.entry1Price) / prices.entry1Price) * 100;
    return {
      liveP,
      entryP: prices.entry1Price,
      diffPct: diff,
      isNear: Math.abs(diff) <= 1.5,
    };
  };

  // Add sheet alert
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
    notificationService.notify('SYSTEM', 'Alerta Creada', `Alerta para ${newAlertSymbol} agregada a la hoja.`);
  };

  // Download alerts CSV
  const handleDownloadAlertsCsv = () => {
    const csv = alertsSheetService.exportAlertsCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alertas_estrategias_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Parsed prices for current selected strategy
  const currentPrices = useMemo(() => {
    return currentStrategy ? parsePricesFromStrategy(currentStrategy) : null;
  }, [currentStrategy]);

  return (
    <div className="flex flex-col gap-4 p-4 text-neutral-100 bg-neutral-900/90 rounded-2xl border border-neutral-800 shadow-xl">
      {/* 1. Header Banner & Sync */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white tracking-tight">Creador de Estrategias</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Google Sheet Oficial
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                <LineChart className="w-3 h-3" />
                TradingView 4H
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gestión táctica de estrategias, cálculo de margen y despacho de órdenes seguras a Binance Futures.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="refresh-official-sheet-btn"
            onClick={handleRefreshOfficialSheet}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-emerald-950/40"
            title="Sincronizar estrategias desde la Google Sheet oficial"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Sheets'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Navigation Tabs (Simple & Clear) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 text-xs font-medium">
        <button
          id="tab-catalog-btn"
          onClick={() => setActiveTab('catalog')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'catalog'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>1. Catálogo ({filteredStrategies.length})</span>
        </button>

        <button
          id="tab-plan-calc-btn"
          onClick={() => setActiveTab('plan_calculator')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'plan_calculator'
              ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>2. Calculador y Plan ({currentStrategy?.par})</span>
        </button>

        <button
          id="tab-alerts-live-btn"
          onClick={() => setActiveTab('alerts_live')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'alerts_live'
              ? 'bg-emerald-500 text-neutral-950 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>3. Alertas en Vivo ({sheetAlerts.length})</span>
        </button>

        <button
          id="tab-raw-data-btn"
          onClick={() => setActiveTab('raw_data')}
          className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'raw_data'
              ? 'bg-neutral-800 text-white font-bold border border-neutral-700 shadow-sm'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>4. Fila Sheet Raw</span>
        </button>
      </div>

      {/* 3. TAB CONTENT: 1. CATÁLOGO DE ESTRATEGIAS */}
      {activeTab === 'catalog' && (
        <div className="flex flex-col gap-3">
          {/* Controls Bar: Search + Filters + View Mode Toggle */}
          <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por símbolo (ej: ZEC, SOL, AAVE, TAO, XRP) o nombre..."
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Quick Filters & View Switcher */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                onClick={() => setOnlyLatestPerPair(!onlyLatestPerPair)}
                className={`px-2.5 py-1.5 rounded-lg border font-mono font-semibold transition-all flex items-center gap-1.5 ${
                  onlyLatestPerPair
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
                title="Filtro estricto: Solo toma la última estrategia vigente de cada par"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>{onlyLatestPerPair ? '✓ Solo Última por Par' : 'Ver Historial'}</span>
              </button>

              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                {(['ALL', 'Activa', 'Live', 'Obsoleto'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                      statusFilter === st
                        ? 'bg-neutral-800 text-white font-bold'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {st === 'ALL' ? 'Todas' : st}
                  </button>
                ))}
              </div>

              {/* View Switcher: List vs Grid */}
              <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button
                  onClick={() => setCatalogViewMode('list')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                    catalogViewMode === 'list'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Vista tipo lista clasificada del 1 al X por mejor R/B"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista R/B</span>
                </button>
                <button
                  onClick={() => setCatalogViewMode('grid')}
                  className={`px-2.5 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 transition-all ${
                    catalogViewMode === 'grid'
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Vista de cuadrícula en tarjetas"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cuadrícula</span>
                </button>
              </div>
            </div>
          </div>

          {/* Ranking Guide Header */}
          <div className="px-3.5 py-2.5 bg-neutral-950/90 rounded-xl border border-amber-500/30 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Trophy className="w-4 h-4" />
              </div>
              <span className="text-neutral-300 font-medium">
                Catálogo Ordenado por <strong>Ratio Riesgo/Beneficio (R/B)</strong>:
              </span>
              <span className="text-amber-400 font-bold">
                El Puesto #1 es el Mejor Trade del mercado
              </span>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Total listado: <strong className="text-white">{rankedStrategies.length}</strong> estrategias
            </div>
          </div>

          {/* LIST VIEW (TIPO LISTA) - DEFAULT & RECOMMENDED */}
          {catalogViewMode === 'list' && (
            <div className="flex flex-col gap-2.5">
              {rankedStrategies.map(({ strat, rank, rewardToRisk, prices }) => {
                const isSelected = currentStrategy?.noEstrategia === strat.noEstrategia;
                const distInfo = getDistanceToEntry(strat);
                const stageInfo = getTradeProcessStageInfo(strat.estado || 'Activa');
                const isRank1 = rank === 1;

                return (
                  <div
                    key={strat.noEstrategia}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
                      isRank1
                        ? isSelected
                          ? 'bg-gradient-to-r from-amber-950/40 via-neutral-950 to-neutral-950 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                          : 'bg-gradient-to-r from-amber-950/20 via-neutral-950 to-neutral-950 border-amber-500/60 shadow-md'
                        : isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 ring-1 ring-amber-500/30'
                        : 'bg-neutral-950/80 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900/60'
                    }`}
                  >
                    {/* Left: Rank Badge + Pair & Details */}
                    <div className="flex items-start sm:items-center gap-3 min-w-[280px]">
                      {/* Rank Indicator */}
                      <div className="shrink-0">
                        {isRank1 ? (
                          <div className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 font-black shadow-md flex items-center gap-1">
                            <Crown className="w-4 h-4 fill-neutral-950" />
                            <span className="font-mono text-xs font-black">#1 TOP</span>
                          </div>
                        ) : rank <= 3 ? (
                          <div className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold flex items-center gap-1">
                            <Award className="w-3.5 h-3.5" />
                            <span className="font-mono text-xs font-bold">#{rank}</span>
                          </div>
                        ) : (
                          <div className="px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-xs font-semibold">
                            #{rank}
                          </div>
                        )}
                      </div>

                      {/* Pair Symbol & Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-white font-mono tracking-tight">
                            {strat.par}
                          </span>
                          <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border font-mono ${stageInfo.badgeClass}`}>
                            {strat.estado || 'Activa'}
                          </span>
                          {isRank1 && (
                            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30">
                              MEJOR R/B
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-neutral-300">{strat.noEstrategia}</span>
                          <span>•</span>
                          <span className="text-neutral-500">{strat.temporalidad}</span>
                          <span>•</span>
                          <span className="text-neutral-400 truncate max-w-[220px] hidden sm:inline" title={strat.nombreEstrategia}>
                            {strat.nombreEstrategia}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Column 1: Ratio R/B Box */}
                    <div className="bg-neutral-900/90 border border-neutral-800 rounded-lg p-2.5 min-w-[170px] flex flex-col justify-center">
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-neutral-400 text-[10px] uppercase font-mono tracking-wider">Ratio R/B</span>
                        <span className="font-mono font-extrabold text-amber-400 text-sm">
                          {rewardToRisk.ratio > 0 ? `${rewardToRisk.ratio}:1` : 'N/D'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">+{rewardToRisk.maxProfitPct}% TP</span>
                        <span className="text-neutral-600">/</span>
                        <span className="text-rose-400 font-bold">-{rewardToRisk.maxLossPct}% SL</span>
                      </div>
                    </div>

                    {/* Middle Column 2: Tactical Levels Summary */}
                    <div className="grid grid-cols-3 gap-2 bg-neutral-900/60 border border-neutral-800/80 rounded-lg p-2 text-[11px] font-mono min-w-[240px]">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Entrada E1</span>
                        <span className="font-bold text-white">${formatPrice(prices.entry1Price)}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 block text-[10px]">Stop Loss</span>
                        <span className="font-bold text-rose-300">${formatPrice(prices.slPrice)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 block text-[10px]">TP Final</span>
                        <span className="font-bold text-emerald-300">${formatPrice(prices.tpFinalPrice)}</span>
                      </div>
                    </div>

                    {/* Middle Column 3: Live Market Distance */}
                    <div className="min-w-[120px] text-left sm:text-right font-mono">
                      <span className="text-[10px] text-neutral-500 block">Distancia a E1</span>
                      {distInfo ? (
                        <span
                          className={`text-xs font-bold ${
                            Math.abs(distInfo.diffPct) <= 1.0
                              ? 'text-emerald-400 animate-pulse'
                              : distInfo.diffPct > 0
                              ? 'text-amber-400'
                              : 'text-blue-400'
                          }`}
                        >
                          {distInfo.diffPct > 0 ? `+${distInfo.diffPct.toFixed(2)}%` : `${distInfo.diffPct.toFixed(2)}%`}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-500">En rango</span>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleSelectStrategy(strat)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-md font-extrabold'
                            : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200'
                        }`}
                        title="Configurar capital, apalancamiento y autorizar en Binance"
                      >
                        <span>Configurar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleViewOnChart(strat)}
                        className="px-2.5 py-2 rounded-lg bg-neutral-850 hover:bg-neutral-800 text-amber-300 border border-amber-500/40 text-xs font-mono transition-all flex items-center gap-1"
                        title="Trazar líneas de E1, E2, SL y TPs directamente en el gráfico"
                      >
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <span className="hidden sm:inline">Gráfico</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GRID VIEW (OPTIONAL) */}
          {catalogViewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankedStrategies.map(({ strat, rank, rewardToRisk, prices }) => {
                const isSelected = currentStrategy?.noEstrategia === strat.noEstrategia;
                const distInfo = getDistanceToEntry(strat);
                const stageInfo = getTradeProcessStageInfo(strat.estado || 'Activa');
                const isRank1 = rank === 1;

                return (
                  <div
                    key={strat.noEstrategia}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                      isRank1
                        ? isSelected
                          ? 'bg-gradient-to-b from-amber-950/30 to-neutral-950 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                          : 'bg-gradient-to-b from-amber-950/20 to-neutral-950 border-amber-500/60 shadow-md'
                        : isSelected
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                        : 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-950'
                    }`}
                  >
                    {/* Card Header with Rank */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {isRank1 ? (
                          <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-400 text-neutral-950 text-xs font-black font-mono">
                            #1 MEJOR
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-bold font-mono">
                            #{rank}
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white font-mono">{strat.par}</span>
                            <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold border font-mono ${stageInfo.badgeClass}`}>
                              {strat.estado || 'Activa'}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-neutral-400 block mt-0.5">
                            {strat.noEstrategia} • {strat.temporalidad}
                          </span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-[10px] text-neutral-400 block">R/B</span>
                        <span className="text-xs font-extrabold text-amber-400">{rewardToRisk.ratio}:1</span>
                      </div>
                    </div>

                    {/* Strategy Description */}
                    <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                      {strat.nombreEstrategia}
                    </p>

                    {/* Tactical Levels Grid */}
                    <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-neutral-900/80 border border-neutral-800/80 text-[11px] font-mono">
                      <div>
                        <span className="text-neutral-500 block text-[10px]">Entrada E1</span>
                        <span className="font-bold text-white">${formatPrice(prices.entry1Price)}</span>
                      </div>
                      <div>
                        <span className="text-emerald-400 block text-[10px]">TP1 (40%)</span>
                        <span className="font-bold text-emerald-300">${formatPrice(prices.tp1Price)}</span>
                      </div>
                      <div>
                        <span className="text-rose-400 block text-[10px]">Stop Loss</span>
                        <span className="font-bold text-rose-300">${formatPrice(prices.slPrice)}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSelectStrategy(strat)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-neutral-950 shadow-sm'
                            : 'bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 text-neutral-200'
                        }`}
                      >
                        <span>Configurar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleViewOnChart(strat)}
                        className="px-2.5 py-2 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-xs font-mono transition-all flex items-center gap-1"
                        title="Ver líneas de E1, E2, SL y TP dibujadas en el gráfico"
                      >
                        <Target className="w-3.5 h-3.5 text-amber-400" />
                        <span>Gráfico</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. TAB CONTENT: 2. CALCULADOR Y PLAN DE EJECUCIÓN */}
      {activeTab === 'plan_calculator' && currentStrategy && executionPlan && (
        <div className="flex flex-col gap-4">
          {/* Active Strategy Header Card */}
          <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-white font-mono">{currentStrategy.par}</h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold font-mono">
                  {currentStrategy.noEstrategia}
                </span>
                <TradeProcessIndicator strategy={currentStrategy} compact={true} />
              </div>
              <p className="text-xs text-neutral-300 mt-1 max-w-2xl">
                {currentStrategy.nombreEstrategia}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleViewOnChart(currentStrategy)}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 border border-amber-500/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5"
                title="Subir al gráfico para ver las líneas de entrada, SL y TP"
              >
                <Target className="w-3.5 h-3.5" />
                <span>Ver Niveles en Gráfico</span>
              </button>
              <button
                onClick={() => setActiveTab('catalog')}
                className="text-xs text-neutral-400 hover:text-white px-2 py-1.5 rounded hover:bg-neutral-900 flex items-center gap-1 shrink-0 font-medium"
              >
                <span>← Cambiar Estrategia</span>
              </button>
            </div>
          </div>

          {/* Split Layout: Left: Capital & Leverage Controls | Right: Risk/Reward Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Interactive Calculators */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>Asignación de Capital y Riesgo</span>
              </h4>

              {/* Capital Allocation */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Margen Asignado (USDT):</span>
                  <span className="font-mono font-bold text-amber-400">${usdtAllocation} USDT</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max={balance.availableBalance || 10000}
                    value={usdtAllocation}
                    onChange={(e) => setUsdtAllocation(Math.max(10, parseFloat(e.target.value) || 10))}
                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex gap-1">
                    {[50, 100, 250, 500].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setUsdtAllocation(amt)}
                        className={`px-2.5 py-2 rounded-lg text-xs font-mono font-semibold transition-colors ${
                          usdtAllocation === amt
                            ? 'bg-amber-500 text-neutral-950 font-bold'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        ${amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strict Leverage (1x - 5x) */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-neutral-400">Apalancamiento (1x - 5x ISOLATED):</span>
                  <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    {selectedLeverage}x
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={selectedLeverage}
                    onChange={(e) => setSelectedLeverage(parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setSelectedLeverage(l)}
                        className={`w-7 h-7 rounded text-xs font-mono font-bold transition-colors ${
                          selectedLeverage === l
                            ? 'bg-amber-500 text-neutral-950 shadow-sm'
                            : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                        }`}
                      >
                        {l}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mode indicator */}
              <div className="flex items-center justify-between p-2.5 bg-neutral-900 rounded-lg border border-neutral-800 text-xs">
                <span className="text-neutral-400">Modo de Margen:</span>
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-blue-400" />
                  ISOLATED (Obligatorio)
                </span>
              </div>
            </div>

            {/* Right: Projected Risk / Reward Metrics */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col justify-between gap-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-neutral-800 pb-2">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Métricas y Retorno Proyectado</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Valor Nocional Total</span>
                  <span className="text-sm font-bold text-white">
                    ${(usdtAllocation * selectedLeverage).toFixed(2)} USDT
                  </span>
                </div>

                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
                  <span className="text-neutral-500 block text-[10px]">Ratio Riesgo/Beneficio</span>
                  <span className="text-sm font-bold text-amber-400">
                    1:{executionPlan.riskRewardRatio.toFixed(2)}
                  </span>
                </div>

                <div className="p-3 bg-emerald-950/30 rounded-lg border border-emerald-800/40">
                  <span className="text-emerald-400 block text-[10px]">Ganancia Máx (TP3)</span>
                  <span className="text-sm font-bold text-emerald-300">
                    +${executionPlan.maxProfitUsdt.toFixed(2)} USDT
                  </span>
                  <span className="text-[10px] text-emerald-500 block mt-0.5">
                    +{((executionPlan.maxProfitUsdt / usdtAllocation) * 100).toFixed(1)}% ROI
                  </span>
                </div>

                <div className="p-3 bg-rose-950/30 rounded-lg border border-rose-800/40">
                  <span className="text-rose-400 block text-[10px]">Pérdida Máx (Stop Loss)</span>
                  <span className="text-sm font-bold text-rose-300">
                    -${executionPlan.maxLossUsdt.toFixed(2)} USDT
                  </span>
                  <span className="text-[10px] text-rose-500 block mt-0.5">
                    -{((executionPlan.maxLossUsdt / usdtAllocation) * 100).toFixed(1)}% ROI
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                {currentStrategy.estado === 'Live' || createdOrderReceipts.length > 0 ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelStrategyOrders}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Cancelar Órdenes Activas</span>
                    </button>
                    {onSwitchToOrders && (
                      <button
                        onClick={onSwitchToOrders}
                        className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
                      >
                        Ver en Órdenes
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    id="open-auth-strategy-modal-btn"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Autorizar y Crear en Binance ({executionPlan.orders.length} Órdenes)</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Orders Breakdown Table */}
          <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              <span>Desglose de Órdenes a Enviar a Binance</span>
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="pb-2 font-medium">Tipo / Nivel</th>
                    <th className="pb-2 font-medium">Lado</th>
                    <th className="pb-2 font-medium">Precio Objetivo</th>
                    <th className="pb-2 font-medium">Cantidad</th>
                    <th className="pb-2 font-medium">Asignación %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {executionPlan.orders.map((ord, idx) => (
                    <tr key={idx} className="hover:bg-neutral-900/50">
                      <td className="py-2.5 font-bold text-neutral-200">{ord.role}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            ord.side === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {ord.side}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-white">${formatPrice(ord.price)} USDT</td>
                      <td className="py-2.5 text-neutral-300">{ord.quantity.toFixed(3)}</td>
                      <td className="py-2.5 text-neutral-400">{ord.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB CONTENT: 3. ALERTAS EN VIVO (HOJA 'alertas') */}
      {activeTab === 'alerts_live' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Bell className="w-4 h-4 text-emerald-400" />
                <span>Monitoreo de % Distancia y Alertas en Vivo</span>
              </h3>
              <p className="text-xs text-neutral-400">
                Seguimiento automático de proximidad a niveles de entrada tácticos.
              </p>
            </div>

            <button
              onClick={handleDownloadAlertsCsv}
              className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar CSV Alertas</span>
            </button>
          </div>

          {/* Quick Add Alert Form */}
          <form onSubmit={handleCreateSheetAlert} className="p-3 bg-neutral-950/70 rounded-xl border border-neutral-800 grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            <div>
              <label className="text-neutral-400 block mb-1">Símbolo</label>
              <select
                value={newAlertSymbol}
                onChange={(e) => setNewAlertSymbol(e.target.value)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white font-mono"
              >
                {strategies.map((s) => (
                  <option key={s.noEstrategia} value={s.par}>
                    {s.par} ({s.noEstrategia})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">Condición</label>
              <select
                value={newAlertCond}
                onChange={(e) => setNewAlertCond(e.target.value as any)}
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white"
              >
                <option value="SWING">Oscilación % (Swing)</option>
                <option value="ABOVE">Precio &gt; Objetivo</option>
                <option value="BELOW">Precio &lt; Objetivo</option>
              </select>
            </div>

            <div>
              <label className="text-neutral-400 block mb-1">
                {newAlertCond === 'SWING' ? 'Umbral %' : 'Precio Objetivo'}
              </label>
              <input
                type="number"
                step="any"
                required
                value={newAlertCond === 'SWING' ? newAlertSwing : newAlertTargetPrice}
                onChange={(e) =>
                  newAlertCond === 'SWING'
                    ? setNewAlertSwing(parseFloat(e.target.value) || 1.0)
                    : setNewAlertTargetPrice(e.target.value)
                }
                className="w-full bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-white font-mono"
                placeholder={newAlertCond === 'SWING' ? '1.0' : '789.0'}
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Alerta</span>
              </button>
            </div>
          </form>

          {/* Alerts List Table */}
          <div className="overflow-x-auto bg-neutral-950 rounded-xl border border-neutral-800">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/50">
                  <th className="p-3 font-medium">Símbolo</th>
                  <th className="p-3 font-medium">Estrategia</th>
                  <th className="p-3 font-medium">Precio Actual</th>
                  <th className="p-3 font-medium">Distancia Entrada 1</th>
                  <th className="p-3 font-medium">Condición</th>
                  <th className="p-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900">
                {sheetAlerts.map((alt) => {
                  const strat = strategies.find((s) => s.par === alt.symbol);
                  const distInfo = strat ? getDistanceToEntry(strat) : null;

                  return (
                    <tr key={alt.id} className="hover:bg-neutral-900/40">
                      <td className="p-3 font-bold text-white">{alt.symbol}</td>
                      <td className="p-3 text-neutral-300">{alt.noEstrategia}</td>
                      <td className="p-3 font-bold text-emerald-400">
                        ${formatPrice(distInfo?.liveP || alt.livePrice)}
                      </td>
                      <td className="p-3">
                        {distInfo ? (
                          <span
                            className={`font-bold ${
                              Math.abs(distInfo.diffPct) <= 1.0
                                ? 'text-emerald-400'
                                : distInfo.diffPct > 0
                                ? 'text-amber-400'
                                : 'text-blue-400'
                            }`}
                          >
                            {distInfo.diffPct > 0 ? `+${distInfo.diffPct.toFixed(2)}%` : `${distInfo.diffPct.toFixed(2)}%`}
                          </span>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>
                      <td className="p-3 text-neutral-400">{alt.thresholdOrTarget}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {alt.status || 'MONITOREANDO'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB CONTENT: 4. RAW SHEET DETAILS */}
      {activeTab === 'raw_data' && currentStrategy && (
        <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col gap-3 text-xs font-mono">
          <h4 className="text-sm font-bold text-white">Detalles Oficiales de la Hoja de Google Sheets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-neutral-300">
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 block">No. Estrategia</span>
              <strong className="text-white">{currentStrategy.noEstrategia}</strong>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800">
              <span className="text-neutral-500 block">Par & Temporalidad</span>
              <strong className="text-white">{currentStrategy.par} • {currentStrategy.temporalidad}</strong>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 col-span-2">
              <span className="text-neutral-500 block">Reglas de Entrada</span>
              <p className="mt-1">{currentStrategy.reglasDeEntrada}</p>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 col-span-2">
              <span className="text-neutral-500 block">Reglas de Salida / TP</span>
              <p className="mt-1">{currentStrategy.reglasDeSalidaTP}</p>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 col-span-2">
              <span className="text-neutral-500 block">Gestión de Riesgo</span>
              <p className="mt-1">{currentStrategy.gestionDeRiesgoStopLoss}</p>
            </div>
            <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 col-span-2">
              <span className="text-neutral-500 block">Comentarios / Backtesting</span>
              <p className="mt-1">{currentStrategy.comentariosBacktesting}</p>
            </div>
          </div>
        </div>
      )}

      {/* Authorization Modal */}
      {isAuthModalOpen && executionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Autorizar Creación en Binance</h3>
                <p className="text-xs text-neutral-400">
                  Confirmación de operador requerida antes de colocar órdenes reales.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs font-mono space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Estrategia:</span>
                <span className="text-white font-bold">{currentStrategy.noEstrategia} ({currentStrategy.par})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Margen Asignado:</span>
                <span className="text-amber-400 font-bold">${usdtAllocation} USDT ({selectedLeverage}x ISOLATED)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Órdenes a crear:</span>
                <span className="text-white font-bold">{executionPlan.orders.length} órdenes (Entradas + TPs + SL)</span>
              </div>
            </div>

            <label className="flex items-center gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800 cursor-pointer text-xs">
              <input
                type="checkbox"
                checked={confirmedSafetyCheck}
                onChange={(e) => setConfirmedSafetyCheck(e.target.checked)}
                className="accent-amber-500 rounded"
              />
              <span className="text-neutral-200">
                Confirmo la revisión de niveles de entrada, Stop Loss y asignación de margen aislado.
              </span>
            </label>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                disabled={!confirmedSafetyCheck || isDispatching}
                onClick={handleAuthorizeAndCreateOnBinance}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-950/50"
              >
                {isDispatching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isDispatching ? 'Enviando...' : 'Confirmar y Enviar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
