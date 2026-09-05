import React, { useState, useEffect, useMemo, Fragment } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  LayoutGrid,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Table,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TopStrategiesRiskRewardList } from './TopStrategiesRiskRewardList';
import { StrategyDetailModal } from './StrategyDetailModal';
import { StrategyPriceBar } from './StrategyPriceBar';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { StrategyCardItem } from './StrategyCardItem';
import { GoogleDocsManagerModal } from './GoogleDocsManagerModal';

interface TradingStrategiesViewProps {
  onOpenOrderModal?: () => void;
  onNavigateToFutures?: () => void;
}

export const TradingStrategiesView: React.FC<TradingStrategiesViewProps> = ({
  onOpenOrderModal,
  onNavigateToFutures,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => strategyService.getLastSyncTime());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT' | 'HIGH_RR'>('ALL');
  const [catalogViewMode, setCatalogViewMode] = useState<'TABLE' | 'CARDS'>('CARDS');
  const [selectedStrategy, setSelectedStrategy] = useState<GoogleSheetStrategyRow | null>(null);
  const [isDocsManagerOpen, setIsDocsManagerOpen] = useState(false);
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());
  const [walletBalance, setWalletBalance] = useState(() => binanceWs.getBalance());
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsub = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
      setWalletBalance(binanceWs.getBalance());
    });

    const unsubLive = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });

    return () => {
      unsub();
      unsubWs();
      unsubLive();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  const handleNavigateToFutures = (strat: GoogleSheetStrategyRow) => {
    // Sincronizar par en Binance WS y estrategia activa en el servicio
    binanceWs.setSymbol(strat.par);
    strategyService.setActiveStrategy(strat);
    if (onNavigateToFutures) {
      onNavigateToFutures();
    }
  };

  const handleSelectStrategyForExecution = (strat: GoogleSheetStrategyRow) => {
    const prices = parsePricesFromStrategy(strat);
    const rr = calculateStrategyRewardToRisk(strat);
    const liveP = livePriceService.getPrice(strat.par);
    const basePrice = prices.entry1Price || liveP || ticker.lastPrice || 789.5;
    const isLong = !strat.tipoDeOrden?.toLowerCase().includes('short') && !strat.tipoDeOrden?.toLowerCase().includes('venta');

    // Transfer safely to Futures Order Form with max 5x leverage & isolated margin, and trigger popup
    strategyAutofillService.autofillOrderForm({
      strategyId: strat.noEstrategia,
      strategyName: `${strat.par} - ${strat.nombreEstrategia}`,
      symbol: strat.par.replace(/[^A-Z0-9]/g, ''),
      side: isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: 2, // Safe default 2x
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice: prices.slPrice || (isLong ? basePrice * 0.985 : basePrice * 1.015),
      tpPrice: prices.tp1Price || (isLong ? basePrice * 1.045 : basePrice * 0.955),
      riskReward: rr.ratio > 0 ? rr.ratio : 2.0,
      autoExecuteImmediately: false,
    });

    if (onOpenOrderModal) {
      onOpenOrderModal();
    }
  };

  // Filtrar ÚNICAMENTE las estrategias activas (excluir obsoletas / inactivas)
  const activeStrategies = useMemo(() => {
    return strategies.filter((st) => {
      const isObsolete = (st.estado || '').toLowerCase().includes('obsolet') || normalizeStrategyStatus(st.estado) === 'Obsoleto';
      return !isObsolete;
    });
  }, [strategies]);

  // Encontrar la estrategia activa global que está MÁS PRÓXIMA a su Entrada 1
  const closestToEntryStrategyId = useMemo(() => {
    if (activeStrategies.length === 0) return null;
    let minDiff = Infinity;
    let closestId: string | null = null;
    activeStrategies.forEach((st) => {
      const prices = parsePricesFromStrategy(st);
      const liveP = livePriceService.getPrice(st.par);
      const e1 = prices.entry1Price || 0;
      if (e1 > 0 && liveP > 0) {
        const diffPct = Math.abs((liveP - e1) / e1) * 100;
        if (diffPct < minDiff) {
          minDiff = diffPct;
          closestId = st.noEstrategia;
        }
      }
    });
    return closestId;
  }, [activeStrategies]);

  const filteredStrategies = useMemo(() => {
    return activeStrategies.filter((st) => {
      const matchSearch =
        st.par.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.nombreEstrategia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.noEstrategia.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'LONG') {
        return !st.tipoDeOrden?.toLowerCase().includes('short') && !st.tipoDeOrden?.toLowerCase().includes('venta');
      }
      if (filterType === 'SHORT') {
        return st.tipoDeOrden?.toLowerCase().includes('short') || st.tipoDeOrden?.toLowerCase().includes('venta');
      }
      if (filterType === 'HIGH_RR') {
        const rr = calculateStrategyRewardToRisk(st);
        return rr.ratio >= 2.0;
      }
      return true;
    });
  }, [activeStrategies, searchTerm, filterType]);

  return (
    <div id="trading-strategies-view" className="flex flex-col gap-6">
      {/* 1. SECCIÓN DESTACADA: TABLA COMPLETA DE ESTRATEGIAS ORDENADAS POR R/B DE MAYOR A MENOR CON DESTELLOS EN E1 */}
      <TopStrategiesRiskRewardList
        activeStrategies={activeStrategies}
        onStrategySelected={handleSelectStrategyForExecution}
        onOpenDetails={setSelectedStrategy}
        highlightSymbol={ticker.symbol}
      />

      {/* 2. CATÁLOGO COMPLETO DE ESTRATEGIAS ACTIVAS - FORMATO TABLA CON PRECIO LIVE PRIMERO Y ENTRADA 1 DESPUÉS */}
      <div className="flex flex-col gap-3.5 bg-neutral-900/70 p-4 rounded-xl border border-neutral-800 shadow-xl">
        {/* Header & Synchronization */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">Catálogo de Estrategias Activas</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  {activeStrategies.length} Activas Vigentes
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>Monitoreo Live FAPI Activo</span>
                </div>
                {lastSyncTime && (
                  <span className="text-[10px] text-neutral-500 font-mono hidden md:inline">
                    Última sincronización: {lastSyncTime}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Estrategias operables ordenadas con Precio Live primero, Entrada 1 y cálculo automático de proximidad.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsDocsManagerOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
              title="Abrir Gestor de Google Docs: Leer, Escribir, Editar y Sincronizar"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Google Docs (Leer / Escribir)</span>
            </button>

            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>

            <a
              href={OFFICIAL_GOOGLE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Abrir hoja de cálculo oficial en Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Sheets URL</span>
            </a>
          </div>
        </div>

        {/* Filter & Search Bar + View Toggle (Tabla vs Tarjetas) */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1">
          <div className="relative w-full lg:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por par, estrategia o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50 font-mono"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
            {/* Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === 'ALL'
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                Todas Activas ({activeStrategies.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType('HIGH_RR')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  filterType === 'HIGH_RR'
                    ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                <Target className="w-3 h-3 text-emerald-400" />
                <span>Alto R:B (&gt;= 1:2)</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType('LONG')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === 'LONG'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                Long
              </button>
              <button
                type="button"
                onClick={() => setFilterType('SHORT')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filterType === 'SHORT'
                    ? 'bg-rose-600 text-white font-bold shadow-xs'
                    : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
                }`}
              >
                Short
              </button>
            </div>

            {/* Selector de Modo de Visualización: Tabla vs Tarjetas */}
            <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs font-mono shrink-0 shadow-inner">
              <button
                type="button"
                onClick={() => setCatalogViewMode('TABLE')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-bold ${
                  catalogViewMode === 'TABLE'
                    ? 'bg-amber-400 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Ver catálogo en formato tabla con números ampliados"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setCatalogViewMode('CARDS')}
                className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 font-bold ${
                  catalogViewMode === 'CARDS'
                    ? 'bg-amber-400 text-neutral-950 shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
                title="Ver catálogo en formato tarjetas visuales grandes"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Tarjetas</span>
              </button>
            </div>
          </div>
        </div>

        {/* VISTA 1: MODO TARJETAS RESPONSIVE AL MONITOR (1 col móvil, 2 cols tablet/laptop, 3 cols desktop amplio/1440p, 4 cols ultrawide) */}
        {catalogViewMode === 'CARDS' ? (
          <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 min-[2200px]:grid-cols-4 gap-5 pt-1 w-full">
            {filteredStrategies.length === 0 ? (
              <div className="col-span-full py-16 text-center text-sm text-neutral-400 font-sans bg-neutral-950/80 rounded-xl border border-neutral-800">
                No se encontraron estrategias activas que coincidan con los filtros aplicados.
              </div>
            ) : (
              filteredStrategies.map((strat) => (
                <StrategyCardItem
                  key={strat.noEstrategia}
                  strat={strat}
                  availableBalance={walletBalance.availableBalance}
                  isClosestGlobal={strat.noEstrategia === closestToEntryStrategyId}
                  onNavigateToFutures={handleNavigateToFutures}
                />
              ))
            )}
          </div>
        ) : (
          /* VISTA 2: FORMATO TABLA PRINCIPAL CON NÚMEROS AMPLIADOS */
          <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-inner">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-neutral-900/90 text-[11px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                    <th className="py-3 px-3 font-semibold w-14">ID</th>
                    <th className="py-3 px-3 font-semibold">Par</th>
                    <th className="py-3 px-3 font-semibold min-w-[190px]">Nombre de Estrategia</th>
                    <th className="py-3 px-3 font-semibold bg-amber-500/5 text-amber-300 border-x border-amber-500/20">
                      Precio Live
                    </th>
                    <th className="py-3 px-3 font-semibold">Entrada 1 (E1)</th>
                    <th className="py-3 px-3 font-semibold min-w-[150px]">Dif. vs Entrada 1</th>
                    <th className="py-3 px-3 font-semibold">Stop Loss</th>
                    <th className="py-3 px-3 font-semibold">Take Profit</th>
                    <th className="py-3 px-3 font-semibold text-center">Ratio R:B</th>
                    <th className="py-3 px-3 font-semibold text-center">Estado</th>
                    <th className="py-3 px-3 font-semibold text-right min-w-[80px]">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850 font-mono">
                  {filteredStrategies.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-xs text-neutral-500 font-sans">
                        No se encontraron estrategias activas que coincidan con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    filteredStrategies.map((strat) => {
                      const prices = parsePricesFromStrategy(strat);
                      const rr = calculateStrategyRewardToRisk(strat);
                      const isLong =
                        !strat.tipoDeOrden?.toLowerCase().includes('short') &&
                        !strat.tipoDeOrden?.toLowerCase().includes('venta');

                      // Real-time live price & difference calculation
                      const liveData = livePriceService.getPriceData(strat.par);
                      const livePrice = liveData.price;
                      const entry1Price = prices.entry1Price || 0;

                      let diffDollar = 0;
                      let diffPercent = 0;
                      let isCloseToEntry = false;
                      let absDiffPercent = 9999;

                      if (entry1Price > 0 && livePrice > 0) {
                        diffDollar = livePrice - entry1Price;
                        diffPercent = (diffDollar / entry1Price) * 100;
                        absDiffPercent = Math.abs(diffPercent);
                        isCloseToEntry = absDiffPercent <= 0.75;
                      }

                      const isClosestGlobal = strat.noEstrategia === closestToEntryStrategyId;
                      const decimalPlaces = entry1Price < 10 || livePrice < 10 ? 4 : 2;

                      return (
                        <Fragment key={strat.noEstrategia}>
                          <tr
                            className={`transition-all ${
                              isClosestGlobal
                                ? 'bg-amber-500/15 hover:bg-amber-500/20 ring-1 ring-inset ring-amber-400/50 shadow-inner'
                                : 'hover:bg-neutral-900/70'
                            }`}
                          >
                          {/* ID / Fecha */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-white text-xs font-mono">{strat.noEstrategia}</div>
                            {strat.fecha && (
                              <div className="text-[10px] text-neutral-500 font-sans">{strat.fecha}</div>
                            )}
                          </td>

                          {/* Par */}
                          <td className="py-3.5 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-white text-sm font-mono">
                              <span>{strat.par}</span>
                              <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                                PERP
                              </span>
                            </div>
                          </td>

                          {/* Nombre de Estrategia */}
                          <td className="py-3.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-white text-xs sm:text-sm">{strat.nombreEstrategia}</span>
                              {isClosestGlobal && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-neutral-950 ring-1 ring-amber-400/60 shadow-xs animate-pulse">
                                  <Target className="w-3 h-3" />
                                  MÁS PRÓXIMA A E1
                                </span>
                              )}
                            </div>
                            {strat.comentariosBacktesting && (
                              <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                                {strat.comentariosBacktesting}
                              </div>
                            )}
                          </td>

                          {/* 1. PRECIO LIVE: NÚMERO GRANDE CON CAMBIO ABAJO */}
                          <td className="py-3.5 px-3 bg-amber-500/5 border-x border-amber-500/20">
                            <div className="flex flex-col">
                              <span className="font-black text-amber-300 text-base font-mono tracking-tight">
                                ${livePrice.toFixed(decimalPlaces)}
                              </span>
                              {/* Cambio 24h pasado ABAJO del precio */}
                              <span
                                className={`text-[11px] font-bold flex items-center gap-0.5 mt-0.5 ${
                                  liveData.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {liveData.change24hPercent >= 0 ? (
                                  <ArrowUpRight className="w-3 h-3 shrink-0" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3 shrink-0" />
                                )}
                                <span>
                                  {liveData.change24hPercent >= 0 ? '+' : ''}
                                  {liveData.change24hPercent.toFixed(2)}% (24h)
                                </span>
                              </span>
                            </div>
                          </td>

                          {/* 2. ENTRADA 1 (E1): NÚMERO GRANDE CON % VS E1 ABAJO */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-col">
                              <span className="font-black text-white text-base font-mono tracking-tight">
                                {entry1Price ? `$${entry1Price.toFixed(decimalPlaces)}` : '-'}
                              </span>
                              {entry1Price > 0 && (
                                <span
                                  className={`text-[11px] font-mono font-bold mt-0.5 inline-flex items-center gap-1 ${
                                    isCloseToEntry
                                      ? 'text-emerald-400'
                                      : isClosestGlobal
                                      ? 'text-amber-300'
                                      : isLong
                                      ? diffPercent > 0
                                        ? 'text-amber-400/90'
                                        : 'text-emerald-400'
                                      : diffPercent > 0
                                      ? 'text-emerald-400'
                                      : 'text-amber-400/90'
                                  }`}
                                >
                                  {diffPercent >= 0 ? '+' : ''}
                                  {diffPercent.toFixed(2)}% vs E1
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 3. DIFERENCIA VS ENTRADA 1 */}
                          <td className="py-3.5 px-3">
                            {entry1Price > 0 ? (
                              <div className="flex flex-col gap-0.5">
                                <div
                                  className={`font-bold text-sm font-mono flex items-center gap-1 ${
                                    isClosestGlobal
                                      ? 'text-amber-300'
                                      : isCloseToEntry
                                      ? 'text-emerald-400'
                                      : isLong
                                      ? diffDollar > 0
                                        ? 'text-sky-300'
                                        : 'text-emerald-300'
                                      : diffDollar > 0
                                      ? 'text-emerald-300'
                                      : 'text-sky-300'
                                  }`}
                                >
                                  <span>
                                    {diffDollar >= 0 ? '+' : ''}${diffDollar.toFixed(decimalPlaces)}
                                  </span>
                                  <span className="text-xs">
                                    ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(2)}%)
                                  </span>
                                </div>
                                <span
                                  className={`text-[10px] font-medium font-sans ${
                                    isClosestGlobal
                                      ? 'text-amber-300 font-bold'
                                      : isCloseToEntry
                                      ? 'text-emerald-400 font-bold'
                                      : 'text-neutral-400'
                                  }`}
                                >
                                  {isClosestGlobal
                                    ? `⭐ Más cercana (${absDiffPercent.toFixed(2)}% dist)`
                                    : isCloseToEntry
                                    ? '🎯 En zona de entrada'
                                    : isLong
                                    ? diffDollar > 0
                                      ? `A ${diffPercent.toFixed(1)}% arriba de E1`
                                      : `💎 Descuento: -${Math.abs(diffPercent).toFixed(1)}%`
                                    : diffDollar > 0
                                    ? `💎 Mejor precio (+${diffPercent.toFixed(1)}%)`
                                    : `A -${Math.abs(diffPercent).toFixed(1)}% de E1`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-neutral-500 font-mono text-sm">-</span>
                            )}
                          </td>

                          {/* Stop Loss - NÚMERO GRANDE */}
                          <td className="py-3.5 px-3">
                            <div className="text-rose-400 font-bold text-sm sm:text-base font-mono">
                              {prices.slPrice ? `$${prices.slPrice.toFixed(decimalPlaces)}` : '-'}
                            </div>
                          </td>

                          {/* Take Profit - NÚMERO GRANDE */}
                          <td className="py-3.5 px-3">
                            <div className="text-emerald-400 font-bold text-sm sm:text-base font-mono">
                              {prices.tp1Price ? `$${prices.tp1Price.toFixed(decimalPlaces)}` : '-'}
                            </div>
                            {prices.tp2Price && (
                              <div className="text-xs text-emerald-400/90 font-mono font-semibold">
                                TP2: ${prices.tp2Price.toFixed(decimalPlaces)}
                              </div>
                            )}
                          </td>

                          {/* Ratio R:B */}
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 rounded-md font-bold text-xs sm:text-sm font-mono border ${
                                rr.ratio >= 2.0
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                              }`}
                            >
                              1:{rr.ratio > 0 ? rr.ratio.toFixed(1) : '-'}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                              {strat.estado || 'Activa'}
                            </span>
                          </td>

                          {/* Acciones: Botón de detalles como icono para navegar a Futuros */}
                          <td className="py-3.5 px-3 text-right">
                            <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => handleNavigateToFutures(strat)}
                                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-750 transition-colors shadow-xs cursor-pointer active:scale-95"
                                title="Ver detalles y operar en Futuros"
                              >
                                <Eye className="w-4 h-4 text-amber-400" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* BARRA DE PRECIO DINÁMICA DEBAJO DE LA ESTRATEGIA (PRECIO LIVE VS ENTRADAS / SL & TP) */}
                        <tr
                          key={`bar-${strat.noEstrategia}`}
                          className={`border-b border-neutral-800/80 ${
                            isClosestGlobal ? 'bg-amber-500/10' : 'bg-neutral-950/40'
                          }`}
                        >
                          <td colSpan={11} className="px-3 py-2">
                            <StrategyPriceBar
                              strategy={strat}
                              livePrice={livePrice}
                              compact={false}
                            />
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailModal
          strategy={selectedStrategy}
          isOpen={!!selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          onApplyToOrderForm={handleSelectStrategyForExecution}
        />
      )}

      {/* Google Docs Manager Modal (Leer / Escribir) */}
      <GoogleDocsManagerModal
        isOpen={isDocsManagerOpen}
        onClose={() => setIsDocsManagerOpen(false)}
      />
    </div>
  );
};
