import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Layers,
  LayoutGrid,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow, ParsedStrategyPrices } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { futuresConfluenceService } from '../services/futuresConfluenceService';
import {
  parsePricesFromStrategy,
  calculateStrategyRewardToRisk,
  normalizeStrategyStatus,
} from '../utils/sheetParser';
import { StrategyFuturesConfluenceBadge } from './StrategyFuturesConfluenceBadge';
import { StrategyDetailModal } from './StrategyDetailModal';

interface TopOperacionesViewProps {
  onOpenOrderModal?: () => void;
  onNavigateToFutures?: () => void;
}

export interface CandidateTradeOperation {
  strategy: GoogleSheetStrategyRow;
  prices: ParsedStrategyPrices;
  livePrice: number;
  entry1Price: number;
  entry2Price: number;
  entry3Price?: number;
  avgEntryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  tpFinalPrice: number;
  isLong: boolean;
  diffDollar: number;
  diffPct: number;
  absDiffPct: number;
  rewardToRisk: ReturnType<typeof calculateStrategyRewardToRisk>;
  ratio: number;
  isInZone: boolean;
  isVeryClose: boolean;
  isClose: boolean;
  hasTouchedE1: boolean;
  decimalPlaces: number;
  trafficLight: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isConfluent: boolean;
}

export const TopOperacionesView: React.FC<TopOperacionesViewProps> = ({
  onOpenOrderModal,
  onNavigateToFutures,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() =>
    strategyService.getStrategies()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    strategyService.getLastSyncTime()
  );
  const [, setPriceTick] = useState(0);

  // Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [proximityFilter, setProximityFilter] = useState<'ALL' | 'ZONE' | 'VERY_CLOSE' | 'CLOSE'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [confluenceFilter, setConfluenceFilter] = useState<'ALL' | 'CONFLUENT' | 'NEUTRAL'>('ALL');
  const [sortBy, setSortBy] = useState<'RB' | 'PROXIMITY' | 'TP_POTENTIAL'>('RB');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Modal
  const [selectedStrategyForModal, setSelectedStrategyForModal] =
    useState<GoogleSheetStrategyRow | null>(null);

  // Subscriptions to live prices and strategies
  useEffect(() => {
    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((t) => t + 1);
    });

    const unsubConfluence = futuresConfluenceService.subscribe(() => {
      setPriceTick((t) => t + 1);
    });

    return () => {
      unsubStrat();
      unsubPrice();
      unsubConfluence();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  // 1. Process candidate trade operations
  const candidateOperations: CandidateTradeOperation[] = useMemo(() => {
    return strategies
      .filter((s) => normalizeStrategyStatus(s.estado) !== 'Obsoleto')
      .map((strat) => {
        const prices = parsePricesFromStrategy(strat);
        const livePrice = livePriceService.getPrice(strat.par) || prices.entry1Price || 100;
        const e1 = prices.entry1Price || livePrice;
        const isLong =
          !strat.tipoDeOrden?.toLowerCase().includes('short') &&
          !strat.tipoDeOrden?.toLowerCase().includes('venta');

        const diffDollar = livePrice - e1;
        const diffPct = e1 > 0 ? ((livePrice - e1) / e1) * 100 : 0;
        const absDiffPct = Math.abs(diffPct);

        const rewardToRisk = calculateStrategyRewardToRisk(strat);
        const ratio = rewardToRisk.ratio || 0;

        // E1 activation proximity checks
        const isInZone = absDiffPct <= 0.75;
        const isVeryClose = absDiffPct <= 2.5;
        const isClose = absDiffPct <= 5.0;

        const hasTouchedE1 = isLong
          ? livePrice <= e1 * 1.001
          : livePrice >= e1 * 0.999;

        const decimalPlaces = livePrice < 10 ? 4 : 2;

        const confluence = futuresConfluenceService.getConfluence(strat.par);
        const trafficLight = confluence.analysis.trafficLight;
        const isConfluent =
          (isLong && trafficLight === 'BULLISH') ||
          (!isLong && trafficLight === 'BEARISH');

        return {
          strategy: strat,
          prices,
          livePrice,
          entry1Price: e1,
          entry2Price: prices.entry2Price,
          entry3Price: prices.entry3Price,
          avgEntryPrice: prices.avgEntryPrice,
          slPrice: prices.slPrice,
          tp1Price: prices.tp1Price,
          tp2Price: prices.tp2Price,
          tpFinalPrice: prices.tpFinalPrice,
          isLong,
          diffDollar,
          diffPct,
          absDiffPct,
          rewardToRisk,
          ratio,
          isInZone,
          isVeryClose,
          isClose,
          hasTouchedE1,
          decimalPlaces,
          trafficLight,
          isConfluent,
        };
      });
  }, [strategies]);

  // 2. Filter & Sort operations
  const filteredAndSortedOperations = useMemo(() => {
    let list = [...candidateOperations];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (op) =>
          op.strategy.par.toLowerCase().includes(q) ||
          op.strategy.nombreEstrategia.toLowerCase().includes(q) ||
          op.strategy.noEstrategia.toLowerCase().includes(q)
      );
    }

    // Direction filter
    if (directionFilter === 'LONG') {
      list = list.filter((op) => op.isLong);
    } else if (directionFilter === 'SHORT') {
      list = list.filter((op) => !op.isLong);
    }

    // Proximity filter
    if (proximityFilter === 'ZONE') {
      list = list.filter((op) => op.isInZone || op.hasTouchedE1);
    } else if (proximityFilter === 'VERY_CLOSE') {
      list = list.filter((op) => op.absDiffPct <= 2.5);
    } else if (proximityFilter === 'CLOSE') {
      list = list.filter((op) => op.absDiffPct <= 5.0);
    }

    // Confluence filter
    if (confluenceFilter === 'CONFLUENT') {
      list = list.filter((op) => op.isConfluent);
    } else if (confluenceFilter === 'NEUTRAL') {
      list = list.filter((op) => op.trafficLight === 'NEUTRAL');
    }

    // Sorting: default is strictly by R:B (Mayor a Menor) as requested!
    if (sortBy === 'RB') {
      list.sort((a, b) => b.ratio - a.ratio);
    } else if (sortBy === 'PROXIMITY') {
      list.sort((a, b) => a.absDiffPct - b.absDiffPct);
    } else if (sortBy === 'TP_POTENTIAL') {
      list.sort((a, b) => b.rewardToRisk.maxProfitPct - a.rewardToRisk.maxProfitPct);
    }

    return list;
  }, [
    candidateOperations,
    searchTerm,
    directionFilter,
    proximityFilter,
    confluenceFilter,
    sortBy,
  ]);

  // Quick stats
  const inZoneCount = useMemo(
    () => candidateOperations.filter((op) => op.isInZone || op.absDiffPct <= 1.5).length,
    [candidateOperations]
  );
  const closeCount = useMemo(
    () => candidateOperations.filter((op) => op.absDiffPct <= 4.0).length,
    [candidateOperations]
  );
  const bestRatio = useMemo(() => {
    if (candidateOperations.length === 0) return 0;
    return Math.max(...candidateOperations.map((op) => op.ratio));
  }, [candidateOperations]);
  const confluentCount = useMemo(
    () => candidateOperations.filter((op) => op.isConfluent).length,
    [candidateOperations]
  );

  // Autofill and open modal
  const handleAutofillOrder = (op: CandidateTradeOperation) => {
    const cleanSym = op.strategy.par.replace(/[^A-Z0-9]/g, '');
    binanceWs.setSymbol(cleanSym);

    const basePrice = op.entry1Price || op.livePrice;
    const slPrice =
      op.slPrice || (op.isLong ? basePrice * 0.985 : basePrice * 1.015);
    const tpPrice =
      op.tp1Price || (op.isLong ? basePrice * 1.045 : basePrice * 0.955);

    strategyAutofillService.autofillOrderForm({
      strategyId: op.strategy.noEstrategia,
      strategyName: `${op.strategy.par} - ${op.strategy.nombreEstrategia}`,
      symbol: cleanSym,
      side: op.isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: op.prices.leverage || 5,
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice,
      tpPrice,
      riskReward: op.ratio,
      autoExecuteImmediately: false,
    });

    if (onOpenOrderModal) {
      onOpenOrderModal();
    }
  };

  const handleNavigateToFutures = (op: CandidateTradeOperation) => {
    const cleanSym = op.strategy.par.replace(/[^A-Z0-9]/g, '');
    binanceWs.setSymbol(cleanSym);
    if (onNavigateToFutures) {
      onNavigateToFutures();
    }
  };

  return (
    <div id="top-operaciones-view" className="w-full flex flex-col gap-4 text-neutral-100 pb-12">
      {/* 1. Header Banner Principal con Estadísticas y Contexto */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/20 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
        {/* Glow de fondo decorativo */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
              <Flame className="w-6 h-6 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-2">
                  <span>Top de Operaciones</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    Próximas a Entrada 1 (E1)
                  </span>
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>Ordenado por R:B</span>
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-2xl font-sans">
                Estrategias activas ordenadas por su Ratio Recompensa:Riesgo (R:B) con
                proximidad inminente al nivel gatillo <strong className="text-amber-300">Entrada 1 (E1)</strong>,
                desglose completo de entradas DCA, Stop Loss Global, Take Profits y Semáforo de Confluencia de Binance Futures.
              </p>
            </div>
          </div>

          {/* Sincronización y Live FAPI */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            <div className="flex flex-col items-end text-[11px] font-mono text-neutral-400 hidden sm:flex">
              <span className="text-neutral-300">Sincronizado con Sheets:</span>
              <span className="text-neutral-400 text-[10px]">{lastSyncTime || 'En tiempo real'}</span>
            </div>
            <button
              id="btn-sync-sheets-top"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-amber-500/40 text-xs font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-2 disabled:opacity-50"
              title="Recargar datos de estrategias desde Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          </div>
        </div>

        {/* 2. Tarjetas Métricas Rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-neutral-800/80">
          <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Mejor Ratio R:B</div>
              <div className="text-sm font-bold font-mono text-emerald-300">1:{bestRatio.toFixed(1)}</div>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">En Zona E1 (≤1.5%)</div>
              <div className="text-sm font-bold font-mono text-amber-300">{inZoneCount} Operaciones</div>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Próximas (≤4.0%)</div>
              <div className="text-sm font-bold font-mono text-indigo-300">{closeCount} Operaciones</div>
            </div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/90 rounded-xl p-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-neutral-400 font-mono uppercase tracking-wider">Confluencia Favorable</div>
              <div className="text-sm font-bold font-mono text-emerald-300">{confluentCount} Pares</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Barra de Filtros, Ordenamiento y Controles */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            id="top-operaciones-search-input"
            type="text"
            placeholder="Buscar por par (ej. ZEC, SOL, XRP) o estrategia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 focus:outline-hidden text-xs text-neutral-100 placeholder-neutral-500 font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs font-mono"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros rápidos: Proximidad, Dirección, Confluencia y Orden */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Proximidad a E1 */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <span className="text-neutral-500 px-1 text-[10px]">E1:</span>
            <button
              id="filter-prox-all"
              onClick={() => setProximityFilter('ALL')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                proximityFilter === 'ALL'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              id="filter-prox-zone"
              onClick={() => setProximityFilter('ZONE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                proximityFilter === 'ZONE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>En Zona (≤0.75%)</span>
            </button>
            <button
              id="filter-prox-close"
              onClick={() => setProximityFilter('VERY_CLOSE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                proximityFilter === 'VERY_CLOSE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ≤2.5%
            </button>
            <button
              id="filter-prox-mid"
              onClick={() => setProximityFilter('CLOSE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                proximityFilter === 'CLOSE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ≤5%
            </button>
          </div>

          {/* Dirección */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <button
              id="filter-dir-all"
              onClick={() => setDirectionFilter('ALL')}
              className={`px-2 py-0.5 rounded ${directionFilter === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400'}`}
            >
              Todos
            </button>
            <button
              id="filter-dir-long"
              onClick={() => setDirectionFilter('LONG')}
              className={`px-2 py-0.5 rounded ${directionFilter === 'LONG' ? 'bg-emerald-500/30 text-emerald-300 font-bold' : 'text-neutral-400'}`}
            >
              Long
            </button>
            <button
              id="filter-dir-short"
              onClick={() => setDirectionFilter('SHORT')}
              className={`px-2 py-0.5 rounded ${directionFilter === 'SHORT' ? 'bg-rose-500/30 text-rose-300 font-bold' : 'text-neutral-400'}`}
            >
              Short
            </button>
          </div>

          {/* Ordenar por (Default R:B) */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <span className="text-neutral-500 px-1 text-[10px]">Orden:</span>
            <button
              id="sort-rb"
              onClick={() => setSortBy('RB')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                sortBy === 'RB'
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ordenar por Ratio Recompensa/Riesgo de Mayor a Menor"
            >
              Mayor R:B
            </button>
            <button
              id="sort-proximity"
              onClick={() => setSortBy('PROXIMITY')}
              className={`px-2 py-0.5 rounded font-semibold transition-all ${
                sortBy === 'PROXIMITY'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ordenar por mayor cercanía a Entrada 1"
            >
              Cercanía E1
            </button>
          </div>

          {/* Toggle Vista Tarjetas vs Tabla */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 font-mono text-[11px] ml-auto">
            <button
              id="toggle-view-cards"
              onClick={() => setViewMode('CARDS')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                viewMode === 'CARDS'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista en tarjetas bento"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tarjetas</span>
            </button>
            <button
              id="toggle-view-table"
              onClick={() => setViewMode('TABLE')}
              className={`px-2.5 py-1 rounded transition-all flex items-center gap-1 ${
                viewMode === 'TABLE'
                  ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista en tabla técnica compacta"
            >
              <Table className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Contenido Principal: Listado de Operaciones Top */}
      {filteredAndSortedOperations.length === 0 ? (
        <div className="w-full py-20 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No se encontraron operaciones con los filtros seleccionados</h3>
          <p className="text-xs text-neutral-400 max-w-md">
            Prueba ajustando el filtro de proximidad a E1 a "Todas" o limpia el término de búsqueda.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setProximityFilter('ALL');
              setDirectionFilter('ALL');
            }}
            className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-amber-300 transition-all mt-2"
          >
            Restablecer filtros
          </button>
        </div>
      ) : viewMode === 'CARDS' ? (
        /* VISTA BENTO CARDS RESPONSIVE AL MONITOR */
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 min-[2200px]:grid-cols-4 gap-4 w-full">
          {filteredAndSortedOperations.map((op, idx) => {
            const isTop1 = idx === 0 && sortBy === 'RB';
            const isGlow = op.isInZone || op.absDiffPct <= 1.2;

            return (
              <div
                key={op.strategy.noEstrategia}
                id={`top-operation-card-${op.strategy.noEstrategia}`}
                className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 transition-all relative overflow-hidden ${
                  isGlow
                    ? 'bg-gradient-to-b from-amber-950/30 via-neutral-900/95 to-neutral-950 border-amber-400/80 shadow-[0_0_25px_rgba(251,191,36,0.2)] ring-1 ring-amber-400/40'
                    : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 shadow-md'
                }`}
              >
                {/* Badge Top 1 R:B */}
                {isTop1 && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-neutral-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl font-mono flex items-center gap-1 shadow-md z-10">
                    <Crown className="w-3.5 h-3.5" />
                    <span>#1 Mejor R:B</span>
                  </div>
                )}

                {/* Encabezado: Par, Dirección, Título de Estrategia, R:B y Semáforo */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-extrabold font-mono text-white tracking-tight">
                        {op.strategy.par}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                          op.isLong
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        }`}
                      >
                        {op.isLong ? 'LONG / COMPRA' : 'SHORT / VENTA'}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
                        {op.strategy.temporalidad || '1D / 4H'}
                      </span>
                    </div>

                    {/* Ratio R:B Destacado */}
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-[9px] text-neutral-400 font-mono uppercase tracking-wider">Ratio R:B</span>
                      <div
                        className={`text-sm font-mono font-black px-2.5 py-0.5 rounded-lg border ${
                          op.ratio >= 2.5
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                            : op.ratio >= 1.8
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-neutral-850 text-neutral-300 border-neutral-700'
                        }`}
                        title="Ratio Recompensa / Riesgo Global"
                      >
                        1:{op.ratio > 0 ? op.ratio.toFixed(1) : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Nombre de la Estrategia */}
                  <h4 className="text-xs font-semibold text-neutral-200 line-clamp-1 font-sans">
                    {op.strategy.nombreEstrategia}
                  </h4>

                  {/* RADAR DE PROXIMIDAD A ENTRADA 1 (E1) */}
                  <div
                    className={`rounded-xl p-2.5 flex items-center justify-between gap-2 border font-mono text-xs ${
                      op.isInZone
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                        : op.absDiffPct <= 2.5
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-400 animate-ping" />
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold tracking-wide text-neutral-400">
                          Estado de Activación E1
                        </span>
                        <span className="font-extrabold text-white text-xs truncate">
                          {op.isInZone
                            ? '🔥 ¡EN ZONA DE ENTRADA 1!'
                            : op.absDiffPct <= 2.5
                            ? '⚡ MUY PRÓXIMA A E1'
                            : '⏳ PRÓXIMA A E1'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-[10px] text-neutral-400 font-sans">Distancia a E1:</div>
                      <div className="font-bold text-xs">
                        <span className={op.diffPct > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          {op.diffPct > 0 ? '+' : ''}
                          {op.diffPct.toFixed(2)}%
                        </span>
                        <span className="text-[10px] text-neutral-400 ml-1">
                          (${Math.abs(op.diffDollar).toFixed(op.decimalPlaces)})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Semáforo de Confluencia de Binance Futures */}
                  <div className="flex items-center justify-between gap-2 bg-neutral-950/80 p-2 rounded-xl border border-neutral-800">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
                      <Compass className="w-3.5 h-3.5 text-amber-400" />
                      <span className="font-sans font-medium">Confluencia Futuros:</span>
                    </div>
                    <StrategyFuturesConfluenceBadge
                      symbol={op.strategy.par}
                      isLong={op.isLong}
                      compact={false}
                    />
                  </div>
                </div>

                {/* 3 Bloques Técnicos: ENTRADAS, SL GLOBAL, TAKE PROFITS */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                  {/* BLOQUE 1: ENTRADAS (E1, E2, E3, Promedio) */}
                  <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-amber-400 uppercase tracking-wider pb-1 border-b border-neutral-800/60">
                      <span>Entradas (DCA)</span>
                      <span className="text-neutral-500 font-sans font-normal">Escalonadas</span>
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* E1 Gatillo Principal */}
                      <div className="flex items-center justify-between bg-amber-500/10 px-1.5 py-1 rounded border border-amber-500/30">
                        <span className="font-bold text-amber-300 flex items-center gap-1">
                          <Target className="w-3 h-3 text-amber-400" />
                          <span>E1 ({op.prices.entry1Pct || 50}%):</span>
                        </span>
                        <span className="font-extrabold text-white">
                          ${op.entry1Price.toFixed(op.decimalPlaces)}
                        </span>
                      </div>

                      {/* E2 */}
                      <div className="flex items-center justify-between text-neutral-300 px-1">
                        <span className="text-neutral-400">E2 ({op.prices.entry2Pct || 30}%):</span>
                        <span className="font-bold">
                          {op.entry2Price > 0 ? `$${op.entry2Price.toFixed(op.decimalPlaces)}` : '-'}
                        </span>
                      </div>

                      {/* E3 si existe */}
                      {op.entry3Price && op.entry3Price > 0 ? (
                        <div className="flex items-center justify-between text-neutral-300 px-1">
                          <span className="text-neutral-400">E3 ({op.prices.entry3Pct || 20}%):</span>
                          <span className="font-bold">
                            ${op.entry3Price.toFixed(op.decimalPlaces)}
                          </span>
                        </div>
                      ) : null}

                      {/* Promedio Ponderado */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-neutral-400 px-1">
                        <span className="text-[10px]">Promedio:</span>
                        <span className="font-bold text-amber-300">
                          ${op.avgEntryPrice.toFixed(op.decimalPlaces)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 2: STOP LOSS GLOBAL */}
                  <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-rose-400 uppercase tracking-wider pb-1 border-b border-neutral-800/60">
                      <span>SL Global</span>
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between bg-rose-500/10 px-1.5 py-1 rounded border border-rose-500/30">
                        <span className="font-bold text-rose-300">Nivel Stop:</span>
                        <span className="font-extrabold text-white">
                          ${op.slPrice.toFixed(op.decimalPlaces)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300 px-1">
                        <span className="text-neutral-400">Distancia SL:</span>
                        <span className="font-bold text-rose-400">
                          {op.entry1Price > 0
                            ? `${(((op.slPrice - op.entry1Price) / op.entry1Price) * 100).toFixed(2)}%`
                            : '-'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-neutral-300 px-1">
                        <span className="text-neutral-400">ROE Máx {op.prices.leverage}X:</span>
                        <span className="font-bold text-rose-400">
                          -{op.rewardToRisk.maxLossPct.toFixed(1)}%
                        </span>
                      </div>

                      <div className="text-[9px] text-neutral-500 line-clamp-1 pt-1 border-t border-neutral-800/60 px-1 font-sans" title={op.strategy.gestionDeRiesgoStopLoss}>
                        {op.strategy.gestionDeRiesgoStopLoss || 'Margen Aislado Estricto'}
                      </div>
                    </div>
                  </div>

                  {/* BLOQUE 3: TAKE PROFITS (TP) */}
                  <div className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-[10px] font-bold text-emerald-400 uppercase tracking-wider pb-1 border-b border-neutral-800/60">
                      <span>Take Profits</span>
                      <TrendingUp className="w-3 h-3 text-emerald-400" />
                    </div>

                    <div className="flex flex-col gap-1">
                      {/* TP1 */}
                      <div className="flex items-center justify-between bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        <span className="text-emerald-300 font-bold">TP1 ({op.prices.tp1Pct || 50}%):</span>
                        <span className="font-bold text-white">
                          ${op.tp1Price.toFixed(op.decimalPlaces)}
                        </span>
                      </div>

                      {/* TP2 */}
                      <div className="flex items-center justify-between text-neutral-300 px-1">
                        <span className="text-neutral-400">TP2 ({op.prices.tp2Pct || 30}%):</span>
                        <span className="font-bold">
                          {op.tp2Price > 0 ? `$${op.tp2Price.toFixed(op.decimalPlaces)}` : '-'}
                        </span>
                      </div>

                      {/* TP Final */}
                      <div className="flex items-center justify-between text-neutral-300 px-1">
                        <span className="text-neutral-400">TP Final ({op.prices.tpFinalPct || 20}%):</span>
                        <span className="font-bold text-emerald-300">
                          {op.tpFinalPrice > 0 ? `$${op.tpFinalPrice.toFixed(op.decimalPlaces)}` : '-'}
                        </span>
                      </div>

                      {/* Potencial Máximo */}
                      <div className="flex items-center justify-between pt-1 border-t border-neutral-800/60 text-neutral-400 px-1">
                        <span className="text-[10px]">Beneficio Est.:</span>
                        <span className="font-bold text-emerald-300">
                          +{op.rewardToRisk.maxProfitPct.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini Barra de Navegación de Precios: SL -> E1 -> Live -> TP */}
                <div className="bg-neutral-950 p-2 rounded-xl border border-neutral-800/80 flex flex-col gap-1 text-[10px] font-mono">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-rose-400">SL: ${op.slPrice.toFixed(op.decimalPlaces)}</span>
                    <span className="font-bold text-amber-300">E1: ${op.entry1Price.toFixed(op.decimalPlaces)}</span>
                    <span className="text-emerald-400">TP1: ${op.tp1Price.toFixed(op.decimalPlaces)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden relative flex">
                    <div className="w-1/3 bg-rose-500/40 h-full" />
                    <div className="w-1/3 bg-amber-500/40 h-full" />
                    <div className="w-1/3 bg-emerald-500/40 h-full" />
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-neutral-500 font-sans">
                    <span>Precio Live: <strong className="text-white">${op.livePrice.toFixed(op.decimalPlaces)}</strong></span>
                    <span>Apalancamiento: <strong className="text-amber-300">{op.prices.leverage}x Aislado</strong></span>
                  </div>
                </div>

                {/* Botones de Acción Rápida */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    id={`btn-execute-top-${op.strategy.noEstrategia}`}
                    onClick={() => handleAutofillOrder(op)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-extrabold font-mono text-xs transition-all shadow-md flex items-center justify-center gap-1.5"
                    title="Cargar orden límite en E1 con Stop Loss y Take Profit configurados"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Autoejecutar E1</span>
                  </button>

                  <button
                    id={`btn-futures-top-${op.strategy.noEstrategia}`}
                    onClick={() => handleNavigateToFutures(op)}
                    className="py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-300 hover:text-white font-mono text-xs transition-all flex items-center gap-1.5"
                    title="Abrir terminal de futuros con este par"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="hidden sm:inline">Futuros</span>
                  </button>

                  <button
                    id={`btn-detail-top-${op.strategy.noEstrategia}`}
                    onClick={() => setSelectedStrategyForModal(op.strategy)}
                    className="py-2 px-3 rounded-xl bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-neutral-400 hover:text-amber-300 font-mono text-xs transition-all flex items-center justify-center"
                    title="Ver gráfico detallado con velas y zonas trazadas"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA TÉCNICA COMPARATIVA */
        <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-[10px] border-b border-neutral-800">
                  <th className="p-3"># R:B</th>
                  <th className="p-3">Par & Dirección</th>
                  <th className="p-3">Ratio R:B</th>
                  <th className="p-3">Proximidad E1</th>
                  <th className="p-3">Precio Live</th>
                  <th className="p-3">Entradas (DCA)</th>
                  <th className="p-3">SL Global</th>
                  <th className="p-3">Take Profits</th>
                  <th className="p-3">Confluencia Futuros</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80">
                {filteredAndSortedOperations.map((op, idx) => {
                  return (
                    <tr
                      key={op.strategy.noEstrategia}
                      className={`hover:bg-neutral-850/60 transition-colors ${
                        op.isInZone ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Ranking */}
                      <td className="p-3">
                        <span className="font-bold text-amber-400">#{idx + 1}</span>
                      </td>

                      {/* Par */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span className="font-extrabold text-white text-sm">{op.strategy.par}</span>
                          <span
                            className={`text-[9px] font-bold ${
                              op.isLong ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {op.isLong ? 'LONG / COMPRA' : 'SHORT / VENTA'}
                          </span>
                        </div>
                      </td>

                      {/* Ratio R:B */}
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold border ${
                            op.ratio >= 2.5
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          1:{op.ratio.toFixed(1)}
                        </span>
                      </td>

                      {/* Proximidad a E1 */}
                      <td className="p-3">
                        <div className="flex flex-col">
                          <span
                            className={`font-bold ${
                              op.isInZone
                                ? 'text-amber-300 animate-pulse'
                                : op.absDiffPct <= 2.5
                                ? 'text-emerald-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {op.isInZone
                              ? '🔥 En Zona E1'
                              : `${op.diffPct > 0 ? '+' : ''}${op.diffPct.toFixed(2)}%`}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            (${Math.abs(op.diffDollar).toFixed(op.decimalPlaces)})
                          </span>
                        </div>
                      </td>

                      {/* Precio Live */}
                      <td className="p-3">
                        <span className="font-extrabold text-white">
                          ${op.livePrice.toFixed(op.decimalPlaces)}
                        </span>
                      </td>

                      {/* Entradas */}
                      <td className="p-3">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-amber-300 font-bold">
                            E1: ${op.entry1Price.toFixed(op.decimalPlaces)} (50%)
                          </span>
                          <span className="text-neutral-400">
                            E2: ${op.entry2Price > 0 ? op.entry2Price.toFixed(op.decimalPlaces) : '-'} (30%)
                          </span>
                          {op.entry3Price && op.entry3Price > 0 && (
                            <span className="text-neutral-500">
                              E3: ${op.entry3Price.toFixed(op.decimalPlaces)} (20%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SL Global */}
                      <td className="p-3">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-rose-400 font-bold">
                            ${op.slPrice.toFixed(op.decimalPlaces)}
                          </span>
                          <span className="text-neutral-500 text-[10px]">
                            ROE: -{op.rewardToRisk.maxLossPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Take Profits */}
                      <td className="p-3">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-emerald-400 font-bold">
                            TP1: ${op.tp1Price.toFixed(op.decimalPlaces)}
                          </span>
                          <span className="text-neutral-400">
                            TP2: ${op.tp2Price > 0 ? op.tp2Price.toFixed(op.decimalPlaces) : '-'}
                          </span>
                          {op.tpFinalPrice > 0 && (
                            <span className="text-emerald-300 text-[10px]">
                              TP Final: ${op.tpFinalPrice.toFixed(op.decimalPlaces)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Semáforo de Confluencia */}
                      <td className="p-3">
                        <StrategyFuturesConfluenceBadge
                          symbol={op.strategy.par}
                          isLong={op.isLong}
                          compact={true}
                        />
                      </td>

                      {/* Acciones */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-table-execute-${op.strategy.noEstrategia}`}
                            onClick={() => handleAutofillOrder(op)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-all flex items-center gap-1 shadow-xs"
                            title="Autoejecutar orden en E1"
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            <span>Ejecutar</span>
                          </button>
                          <button
                            id={`btn-table-detail-${op.strategy.noEstrategia}`}
                            onClick={() => setSelectedStrategyForModal(op.strategy)}
                            className="p-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalle de Estrategia con Gráfico Interactivo */}
      {selectedStrategyForModal && (
        <StrategyDetailModal
          strategy={selectedStrategyForModal}
          isOpen={!!selectedStrategyForModal}
          onClose={() => setSelectedStrategyForModal(null)}
          onApplyToOrderForm={() => {
            const op = candidateOperations.find(
              (o) => o.strategy.noEstrategia === selectedStrategyForModal.noEstrategia
            );
            if (op) {
              handleAutofillOrder(op);
            }
            setSelectedStrategyForModal(null);
          }}
        />
      )}
    </div>
  );
};
