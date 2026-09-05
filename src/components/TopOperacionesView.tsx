import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
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
      ) : (
        /* VISTA TABLA TÉCNICA COMPARATIVA */
        <div className="crypto-table-container shadow-md">
          <table className="financial-table text-base font-mono" style={{ fontSize: '16px' }}>
            <thead>
                <tr className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-sm border-b border-neutral-800">
                  <th className="p-3.5"># R:B</th>
                  <th className="p-3.5">Par & Dirección</th>
                  <th className="p-3.5">Ratio R:B</th>
                  <th className="p-3.5 text-right">Precio Live</th>
                  <th className="p-3.5">Entradas (DCA)</th>
                  <th className="p-3.5">SL Global</th>
                  <th className="p-3.5">Take Profits</th>
                  <th className="p-3.5 text-center">Confluencia</th>
                  <th className="p-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/80 text-base">
                {filteredAndSortedOperations.map((op, idx) => {
                  return (
                    <tr
                      key={op.strategy.noEstrategia}
                      className={`hover:bg-neutral-850/60 transition-colors ${
                        op.isInZone ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Ranking */}
                      <td className="p-3.5">
                        <span className="font-bold text-amber-400 text-base">#{idx + 1}</span>
                      </td>

                      {/* Par & Dirección (Solo flecha verde para compra o roja para venta) */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="ticker-badge font-bold text-base px-2.5 py-1">{op.strategy.par}</span>
                          {op.isLong ? (
                            <span title="Compra / Long">
                              <ArrowUp className="w-5 h-5 text-emerald-400 shrink-0 stroke-[3]" />
                            </span>
                          ) : (
                            <span title="Venta / Short">
                              <ArrowDown className="w-5 h-5 text-rose-400 shrink-0 stroke-[3]" />
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ratio R:B */}
                      <td className="p-3.5 num-data">
                        <span
                          className={`px-3 py-1 rounded font-bold text-base border ${
                            op.ratio >= 2.5
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          1:{op.ratio.toFixed(1)}
                        </span>
                      </td>

                      {/* Precio Live & Proximidad a E1 integrada */}
                      <td className="p-3.5 num-data text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-extrabold text-white text-lg">
                            ${op.livePrice.toFixed(op.decimalPlaces)}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                            <span
                              className={`font-bold text-sm ${
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
                            <span className="text-xs text-neutral-400">
                              (${Math.abs(op.diffDollar).toFixed(op.decimalPlaces)})
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Entradas */}
                      <td className="p-3.5 num-data">
                        <div className="flex flex-col text-sm leading-relaxed">
                          <span className="text-amber-300 font-bold text-base">
                            E1: ${op.entry1Price.toFixed(op.decimalPlaces)} (50%)
                          </span>
                          <span className="text-neutral-300 text-sm">
                            E2: ${op.entry2Price > 0 ? op.entry2Price.toFixed(op.decimalPlaces) : '-'} (30%)
                          </span>
                          {op.entry3Price && op.entry3Price > 0 && (
                            <span className="text-neutral-400 text-xs">
                              E3: ${op.entry3Price.toFixed(op.decimalPlaces)} (20%)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* SL Global */}
                      <td className="p-3.5 num-data">
                        <div className="flex flex-col text-sm leading-relaxed">
                          <span className="text-rose-400 font-bold text-base">
                            ${op.slPrice.toFixed(op.decimalPlaces)}
                          </span>
                          <span className="text-neutral-400 text-xs">
                            ROE: -{op.rewardToRisk.maxLossPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* Take Profits */}
                      <td className="p-3.5 num-data">
                        <div className="flex flex-col text-sm leading-relaxed">
                          <span className="text-emerald-400 font-bold text-base">
                            TP1: ${op.tp1Price.toFixed(op.decimalPlaces)}
                          </span>
                          <span className="text-neutral-300 text-sm">
                            TP2: ${op.tp2Price > 0 ? op.tp2Price.toFixed(op.decimalPlaces) : '-'}
                          </span>
                          {op.tpFinalPrice > 0 && (
                            <span className="text-emerald-300 text-xs">
                              TP Final: ${op.tpFinalPrice.toFixed(op.decimalPlaces)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Semáforo de Confluencia */}
                      <td className="p-3.5 text-center">
                        <div className="flex justify-center">
                          <StrategyFuturesConfluenceBadge
                            symbol={op.strategy.par}
                            isLong={op.isLong}
                            compact={true}
                          />
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            id={`btn-table-execute-${op.strategy.noEstrategia}`}
                            onClick={() => handleAutofillOrder(op)}
                            className="p-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95"
                            title="Autoejecutar orden en E1"
                          >
                            <Zap className="w-4 h-4 fill-current" />
                          </button>
                          <button
                            id={`btn-table-detail-${op.strategy.noEstrategia}`}
                            onClick={() => setSelectedStrategyForModal(op.strategy)}
                            className="p-2.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer active:scale-95"
                            title="Ver detalles"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
