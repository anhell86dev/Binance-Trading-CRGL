import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  Filter,
  History,
  Layers,
  Medal,
  Percent,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import {
  strategyService,
  OFFICIAL_GOOGLE_SHEET_URL,
  OFFICIAL_GOOGLE_SHEET_NAME,
} from '../services/strategyService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import {
  calculateStrategyRewardToRisk,
  getTradeProcessStageInfo,
  parsePricesFromStrategy,
} from '../utils/sheetParser';
import { BINANCE_POPULAR_PAIRS, normalizeBinanceSymbol } from '../data/binancePairs';
import { AssetSelectorModal } from './AssetSelectorModal';
import { StrategyDetailModal } from './StrategyDetailModal';

interface StrategySidebarProps {
  onSelectStrategy?: (strategy: GoogleSheetStrategyRow) => void;
}

export const StrategySidebar: React.FC<StrategySidebarProps> = ({ onSelectStrategy }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentSymbol, setCurrentSymbol] = useState(binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() =>
    strategyService.getStrategies()
  );
  const [strategyFilter, setStrategyFilter] = useState<'ACTIVAS' | 'TOP3' | 'LIVE' | 'HISTORICO'>('ACTIVAS');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(strategyService.getLastSyncTime());
  const [detailStrategy, setDetailStrategy] = useState<GoogleSheetStrategyRow | null>(null);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setLastSyncTime(strategyService.getLastSyncTime());
      setIsSyncingSheet(strategyService.getIsSyncing());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  const handleSelectSymbol = (sym: string) => {
    const normalized = normalizeBinanceSymbol(sym);
    binanceWs.setSymbol(normalized);
  };

  const handleSyncSheet = async () => {
    setIsSyncingSheet(true);
    await strategyService.syncFromGoogleSheets();
    setTimeout(() => setIsSyncingSheet(false), 400);
  };

  // Enriched strategies with R:R and parsed levels, sorted strictly by Ratio (R/B) descending
  const enrichedStrategies = useMemo(() => {
    const baseList = strategyService.getAllResolvedStrategies();

    const mapped = baseList.map((strat) => {
      const rr = calculateStrategyRewardToRisk(strat);
      const parsed = parsePricesFromStrategy(strat);
      const stageInfo = getTradeProcessStageInfo(strat.estado || 'Activa');
      return {
        ...strat,
        rr,
        parsed,
        stageInfo,
      };
    });

    // Sort strictly by Risk/Reward ratio (R/B) descending
    return mapped.sort((a, b) => (b.rr.ratio || 0) - (a.rr.ratio || 0));
  }, [strategies]);

  // Top 3 best trades of the market (strictly ACTIVE strategies only)
  const top3Strategies = useMemo(() => {
    return enrichedStrategies.filter((s) => s.estado !== 'Obsoleto').slice(0, 3);
  }, [enrichedStrategies]);

  const filteredStrategies = useMemo(() => {
    let list = enrichedStrategies;

    if (strategyFilter === 'ACTIVAS') {
      // Show strictly current active strategies (exclude Obsoleto)
      list = list.filter((s) => s.estado !== 'Obsoleto');
    } else if (strategyFilter === 'TOP3') {
      // Top 3 among active strategies
      list = list.filter((s) => s.estado !== 'Obsoleto').slice(0, 3);
    } else if (strategyFilter === 'LIVE') {
      list = list.filter((s) => s.estado === 'Live' || s.estado === 'Live+');
    } else if (strategyFilter === 'HISTORICO') {
      // Show ONLY obsolete historical strategies
      list = list.filter((s) => s.estado === 'Obsoleto');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.par.toLowerCase().includes(q) ||
          s.nombreEstrategia.toLowerCase().includes(q) ||
          s.noEstrategia.toLowerCase().includes(q) ||
          s.fecha.toLowerCase().includes(q)
      );
    }

    return list;
  }, [enrichedStrategies, strategyFilter, searchTerm]);

  // Filtered Quick Pairs
  const filteredPairs = useMemo(() => {
    if (!searchTerm.trim()) return BINANCE_POPULAR_PAIRS;
    const q = searchTerm.toLowerCase();
    return BINANCE_POPULAR_PAIRS.filter(
      (p) => p.symbol.toLowerCase().includes(q) || p.baseAsset.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const handleSelectAndLoadStrategy = (strat: GoogleSheetStrategyRow) => {
    const sym = normalizeBinanceSymbol(strat.par);
    binanceWs.setSymbol(sym);
    strategyService.setActiveStrategyById(strat.noEstrategia);
    if (onSelectStrategy) {
      onSelectStrategy(strat);
    }
  };

  const handleOpenDetailModal = (strat: GoogleSheetStrategyRow) => {
    setDetailStrategy(strat);
  };

  return (
    <div id="strategy_sidebar_container" className="flex flex-col h-full gap-2.5 text-xs select-none">
      {/* 1. Top Search Header with Google Sheets Sync */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-xs">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            Catálogo R/B (Google Sheets)
          </span>
          <button
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="text-[10px] text-neutral-300 hover:text-amber-300 flex items-center gap-1 transition-colors px-2 py-0.5 rounded-md bg-neutral-900 border border-neutral-700 hover:border-amber-500/50 shadow-xs"
            title="Sincronizar y actualizar con el Google Sheet de estrategias"
          >
            <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncingSheet ? 'animate-spin' : ''}`} />
            <span className="font-medium">{isSyncingSheet ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por par, fecha o ID..."
            className="w-full pl-8 pr-7 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 text-xs placeholder:text-neutral-500 focus:outline-none focus:border-amber-500/80"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-neutral-500 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Podium: Top 3 Mejores Trades del Mercado (Activos) */}
      <div className="shrink-0 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800/90 flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="flex items-center gap-1 text-amber-300">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            Top 3 Mejores Trades (Activos)
          </span>
          <span className="text-[10px] font-mono text-neutral-400">Orden: R/B</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5 pt-1 font-mono text-[10px]">
          {top3Strategies.map((item, idx) => {
            const isRank1 = idx === 0;
            const isRank2 = idx === 1;
            const isRank3 = idx === 2;
            const isSelected = currentSymbol === normalizeBinanceSymbol(item.par);

            return (
              <button
                key={item.noEstrategia}
                onClick={() => handleSelectAndLoadStrategy(item)}
                className={`p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                  isRank1
                    ? 'bg-amber-950/30 border-amber-500/50 hover:border-amber-400 text-amber-200'
                    : isRank2
                    ? 'bg-neutral-900 border-neutral-700 hover:border-neutral-500 text-neutral-200'
                    : 'bg-neutral-900/80 border-neutral-800 hover:border-neutral-600 text-neutral-300'
                } ${isSelected ? 'ring-1 ring-amber-400 shadow-md' : ''}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`font-black text-[9px] px-1 py-0.2 rounded ${
                      isRank1
                        ? 'bg-amber-400 text-black'
                        : isRank2
                        ? 'bg-neutral-300 text-black'
                        : 'bg-amber-700 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="text-[9px] font-bold text-emerald-400">
                    1:{item.rr?.ratio != null ? item.rr.ratio.toFixed(2) : '3.50'}
                  </span>
                </div>
                <div className="mt-1">
                  <strong className="text-white text-xs block truncate">{item.par}</strong>
                  <span className="text-[8px] text-neutral-400 block truncate">
                    {item.noEstrategia}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Quick Pairs Strip */}
      <div className="shrink-0 flex flex-col gap-1.5 bg-neutral-950 p-2 rounded-lg border border-neutral-800/80">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
          <span className="flex items-center gap-1 text-neutral-300">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            Pares Principales
          </span>
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-semibold text-[10px]"
          >
            + Ver 400+
          </button>
        </div>

        {/* Scrollable Mini Pills */}
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-0.5 custom-scrollbar">
          {filteredPairs.slice(0, 8).map((pair) => {
            const isSelected = currentSymbol === pair.symbol;
            return (
              <button
                key={pair.symbol}
                onClick={() => handleSelectSymbol(pair.symbol)}
                className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-850 hover:border-neutral-700'
                }`}
              >
                <span>{pair.baseAsset}</span>
                {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Catálogo de Estrategias con Filtro de Activas vs Histórico Obsoleto */}
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-neutral-200 flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Estrategias del Diario
          </span>
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
            {filteredStrategies.length}
          </span>
        </div>

        {/* Filter Tabs: Activas (Default) | Top 3 | Live | Histórico (Obsoletos) */}
        <div className="grid grid-cols-4 gap-1 bg-neutral-900 p-0.5 rounded-md border border-neutral-800 text-[10px]">
          <button
            onClick={() => setStrategyFilter('ACTIVAS')}
            className={`py-1 rounded font-medium transition-all ${
              strategyFilter === 'ACTIVAS'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Estrategias vigentes y activas para operar"
          >
            Activas
          </button>
          <button
            onClick={() => setStrategyFilter('TOP3')}
            className={`py-1 rounded font-medium transition-all ${
              strategyFilter === 'TOP3'
                ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Top 3 mejores ratios R/B"
          >
            🏆 Top 3
          </button>
          <button
            onClick={() => setStrategyFilter('LIVE')}
            className={`py-1 rounded font-medium transition-all ${
              strategyFilter === 'LIVE'
                ? 'bg-blue-950/60 text-blue-300 font-bold border border-blue-800/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Estrategias con órdenes en ejecución"
          >
            Live
          </button>
          <button
            onClick={() => setStrategyFilter('HISTORICO')}
            className={`py-1 rounded font-medium transition-all flex items-center justify-center gap-0.5 ${
              strategyFilter === 'HISTORICO'
                ? 'bg-neutral-800 text-neutral-200 font-bold border border-neutral-600'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Estrategias obsoletas / sustituidas archivadas como histórico"
          >
            <History className="w-2.5 h-2.5" />
            <span>Histórico</span>
          </button>
        </div>

        {/* Strategies Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
          {filteredStrategies.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 text-[11px] flex flex-col items-center gap-1.5">
              <History className="w-5 h-5 text-neutral-600" />
              <span>No se encontraron estrategias con el filtro actual.</span>
            </div>
          ) : (
            filteredStrategies.map((strat, index) => {
              const isCurrentPair = currentSymbol === normalizeBinanceSymbol(strat.par);
              const rrRatio = strat.rr.ratio ? strat.rr.ratio.toFixed(2) : '2.50';
              const isObsolete = (strat.estado || '').toLowerCase() === 'obsoleto';

              return (
                <div
                  key={strat.noEstrategia}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col gap-2 ${
                    isObsolete
                      ? 'bg-neutral-950/80 border-neutral-850 opacity-80'
                      : isCurrentPair
                      ? 'bg-amber-950/25 border-amber-500/60 shadow-sm ring-1 ring-amber-500/30'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Top: Rank badge, Par, ID & Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-neutral-950 text-neutral-400 border border-neutral-800">
                        #{index + 1}
                      </span>

                      <span className="font-bold font-mono text-white text-xs">{strat.par}</span>
                      <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950/40 px-1 py-0.2 rounded border border-amber-500/30">
                        {strat.noEstrategia}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border ${strat.stageInfo.badgeClass}`}
                    >
                      {strat.estado || 'Activa'}
                    </span>
                  </div>

                  {/* Strategy Name & Date */}
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-semibold text-neutral-200 line-clamp-1">
                      {strat.nombreEstrategia}
                    </span>
                    <span className="text-[9px] font-mono text-neutral-400 shrink-0">
                      {strat.fecha}
                    </span>
                  </div>

                  {/* Quick Price Highlights: E1 / SL / TP1 */}
                  <div className="grid grid-cols-3 gap-1 py-1 px-1.5 bg-neutral-950 rounded border border-neutral-800/80 text-[10px] font-mono">
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-[8px] uppercase">Entrada 1</span>
                      <span className="text-sky-300 font-bold">${strat.parsed.entry1Price || '0.00'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-[8px] uppercase">Stop Loss</span>
                      <span className="text-rose-400 font-bold">${strat.parsed.slPrice || '0.00'}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-neutral-500 text-[8px] uppercase">TP 1</span>
                      <span className="text-emerald-400 font-bold">${strat.parsed.tp1Price || '0.00'}</span>
                    </div>
                  </div>

                  {/* Risk/Reward Highlight Pill & Est Max Profit */}
                  <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                    <div className="flex items-center gap-1" title="Ratio Riesgo / Beneficio">
                      <span className="text-neutral-400">Ratio R/B:</span>
                      <span className="font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        1:{rrRatio}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-emerald-400 font-semibold">
                        +{strat.rr?.maxProfitPct != null ? strat.rr.maxProfitPct.toFixed(1) : '0.0'}%
                      </span>
                      <span className="text-neutral-600">/</span>
                      <span className="text-rose-400 font-semibold">
                        -{strat.rr?.maxLossPct != null ? strat.rr.maxLossPct.toFixed(1) : '0.0'}%
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: 1. Mostrar Estrategia (Modal), 2. Seleccionar & Cargar en Binance */}
                  <div className="pt-1 border-t border-neutral-800/80 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleOpenDetailModal(strat)}
                      className="flex-1 px-2 py-1 rounded text-[10px] font-bold font-mono flex items-center justify-center gap-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 transition-all"
                      title="Ver Entradas, SL, TP, Reglas de Ejecución y Disciplina del Trade"
                    >
                      <Eye className="w-3 h-3 text-amber-400" />
                      <span>{isObsolete ? 'Ver Histórico' : 'Mostrar'}</span>
                    </button>

                    <button
                      onClick={() => handleSelectAndLoadStrategy(strat)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold font-mono flex items-center gap-1 transition-all ${
                        isObsolete
                          ? 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-neutral-200'
                          : isCurrentPair
                          ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-sm font-black'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                      }`}
                      title={
                        isObsolete
                          ? 'Cargar solo para consulta histórica'
                          : 'Cargar estrategia y configurar órdenes en Binance'
                      }
                    >
                      <Zap className="w-3 h-3" />
                      <span>{isObsolete ? 'Cargar Hist.' : isCurrentPair ? 'Activa' : 'Cargar'}</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 5. Bottom Sync Status */}
      <div className="shrink-0 text-[10px] text-neutral-400 font-mono flex items-center justify-between px-1 bg-neutral-950/80 py-1 rounded-md border border-neutral-850">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Auto-sync Sheets: {lastSyncTime}</span>
        </div>
        <a
          href={OFFICIAL_GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:underline flex items-center gap-0.5 font-medium"
        >
          <span>Sheets</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Asset Selector Modal */}
      {isAssetModalOpen && (
        <AssetSelectorModal
          isOpen={isAssetModalOpen}
          currentSymbol={currentSymbol}
          onSelectSymbol={(sym) => {
            handleSelectSymbol(sym);
            setIsAssetModalOpen(false);
          }}
          onClose={() => setIsAssetModalOpen(false)}
        />
      )}

      {/* Strategy Detail Modal */}
      {detailStrategy && (
        <StrategyDetailModal
          strategy={detailStrategy}
          isOpen={!!detailStrategy}
          onClose={() => setDetailStrategy(null)}
          onPlotOnChart={(strat) => {
            handleSelectAndLoadStrategy(strat);
          }}
        />
      )}
    </div>
  );
};
