import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Percent,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { GoogleSheetStrategyRow, StrategyTradeStatus } from '../types/strategy';
import {
  calculateStrategyRewardToRisk,
  getTradeProcessStageInfo,
  parsePricesFromStrategy,
} from '../utils/sheetParser';
import { BINANCE_POPULAR_PAIRS, normalizeBinanceSymbol } from '../data/binancePairs';
import { AssetSelectorModal } from './AssetSelectorModal';

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
  const [strategyFilter, setStrategyFilter] = useState<'ALL' | 'ACTIVE_TO_TAKE' | 'LIVE'>('ALL');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(strategyService.getLastSyncTime());

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      setTicker(binanceWs.getTicker());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setLastSyncTime(strategyService.getLastSyncTime());
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
    strategyService.refreshOfficialStrategies();
    setTimeout(() => setIsSyncingSheet(false), 500);
  };

  // Filtered and enriched strategies with R:R
  const enrichedStrategies = useMemo(() => {
    const all = strategyService.getAllResolvedStrategies();
    return all.map((strat) => {
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
  }, [strategies]);

  const filteredStrategies = useMemo(() => {
    let list = enrichedStrategies;

    if (strategyFilter === 'ACTIVE_TO_TAKE') {
      list = list.filter((s) => s.estado === 'Activa');
    } else if (strategyFilter === 'LIVE') {
      list = list.filter((s) => s.estado === 'Live' || s.estado === 'Live+');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.par.toLowerCase().includes(q) ||
          s.nombreEstrategia.toLowerCase().includes(q) ||
          s.noEstrategia.toLowerCase().includes(q)
      );
    }

    // Sort by Risk/Reward ratio descending
    return list.sort((a, b) => (b.rr.ratio || 0) - (a.rr.ratio || 0));
  }, [enrichedStrategies, strategyFilter, searchTerm]);

  // Filtered Quick Pairs
  const filteredPairs = useMemo(() => {
    if (!searchTerm.trim()) return BINANCE_POPULAR_PAIRS;
    const q = searchTerm.toLowerCase();
    return BINANCE_POPULAR_PAIRS.filter(
      (p) => p.symbol.toLowerCase().includes(q) || p.baseAsset.toLowerCase().includes(q)
    );
  }, [searchTerm]);

  const handleLoadStrategy = (strat: GoogleSheetStrategyRow) => {
    const sym = normalizeBinanceSymbol(strat.par);
    binanceWs.setSymbol(sym);
    if (onSelectStrategy) {
      onSelectStrategy(strat);
    }
  };

  return (
    <div id="strategy_sidebar_container" className="flex flex-col h-full gap-3 text-xs">
      {/* 1. Top Search Header */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            Estrategias & Pares
          </span>
          <button
            onClick={handleSyncSheet}
            disabled={isSyncingSheet}
            className="text-[10px] text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
            title="Sincronizar diario oficial de Google Sheets"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncingSheet ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isSyncingSheet ? 'Sync...' : 'Sheets'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar par o estrategia (ZEC, TAO...)"
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

      {/* 2. Quick Pairs Strip / Mini Carousel */}
      <div className="shrink-0 flex flex-col gap-1.5 bg-neutral-950 p-2 rounded-lg border border-neutral-800/80">
        <div className="flex items-center justify-between text-[10px] text-neutral-400 font-medium">
          <span className="flex items-center gap-1 text-neutral-300">
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            Pares Principales
          </span>
          <button
            onClick={() => setIsAssetModalOpen(true)}
            className="text-amber-400 hover:text-amber-300 font-semibold"
          >
            + Ver 400+
          </button>
        </div>

        {/* Scrollable Mini Pills */}
        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-0.5 custom-scrollbar">
          {filteredPairs.slice(0, 10).map((pair) => {
            const isSelected = currentSymbol === pair.symbol;
            return (
              <button
                key={pair.symbol}
                onClick={() => handleSelectSymbol(pair.symbol)}
                className={`px-2 py-1 rounded font-mono text-[11px] font-semibold transition-all flex items-center gap-1 ${
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

      {/* 3. Catálogo de Estrategias con Ratio Riesgo/Beneficio */}
      <div className="flex-1 flex flex-col min-h-0 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/80 gap-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-neutral-200 flex items-center gap-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Catálogo de Estrategias
          </span>
          <span className="text-[10px] font-mono text-neutral-400 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
            {filteredStrategies.length}
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-neutral-900 p-0.5 rounded-md border border-neutral-800 text-[10px]">
          <button
            onClick={() => setStrategyFilter('ALL')}
            className={`flex-1 py-0.5 rounded font-medium transition-all ${
              strategyFilter === 'ALL'
                ? 'bg-neutral-800 text-white font-bold'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setStrategyFilter('ACTIVE_TO_TAKE')}
            className={`flex-1 py-0.5 rounded font-medium transition-all ${
              strategyFilter === 'ACTIVE_TO_TAKE'
                ? 'bg-emerald-950/60 text-emerald-300 font-bold border border-emerald-800/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Activas
          </button>
          <button
            onClick={() => setStrategyFilter('LIVE')}
            className={`flex-1 py-0.5 rounded font-medium transition-all ${
              strategyFilter === 'LIVE'
                ? 'bg-blue-950/60 text-blue-300 font-bold border border-blue-800/40'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Live
          </button>
        </div>

        {/* Strategies Scrollable List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
          {filteredStrategies.length === 0 ? (
            <div className="p-4 text-center text-neutral-500 text-[11px]">
              No se encontraron estrategias con el filtro aplicado.
            </div>
          ) : (
            filteredStrategies.map((strat) => {
              const isCurrentPair = currentSymbol === normalizeBinanceSymbol(strat.par);
              const rrRatio = strat.rr.ratio ? strat.rr.ratio.toFixed(2) : '2.50';
              const isHighRR = strat.rr.ratio >= 2.5;

              return (
                <div
                  key={strat.noEstrategia}
                  className={`p-2.5 rounded-lg border transition-all flex flex-col gap-1.5 ${
                    isCurrentPair
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-sm ring-1 ring-amber-500/20'
                      : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  {/* Top: Par, Timeframe & Status Badge */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold font-mono text-white text-xs">{strat.par}</span>
                      <span className="text-[9px] font-mono text-neutral-400 px-1 py-0.2 rounded bg-neutral-950 border border-neutral-800">
                        {strat.temporalidad}
                      </span>
                    </div>

                    <span
                      className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono border ${strat.stageInfo.badgeClass}`}
                    >
                      {strat.estado || 'Activa'}
                    </span>
                  </div>

                  {/* Strategy Name */}
                  <p className="text-[11px] font-semibold text-neutral-200 line-clamp-1">
                    {strat.nombreEstrategia}
                  </p>

                  {/* Risk/Reward Highlight Pill & Est Max Profit */}
                  <div className="flex items-center justify-between gap-1 pt-1 border-t border-neutral-800/80 text-[10px] font-mono">
                    <div className="flex items-center gap-1" title="Ratio Riesgo / Beneficio">
                      <span className="text-neutral-400">R:R</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded ${
                          isHighRR
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        1:{rrRatio}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-emerald-400 font-semibold">
                        +{strat.rr.maxProfitPct.toFixed(1)}%
                      </span>
                      <span className="text-neutral-600">/</span>
                      <span className="text-rose-400 font-semibold">
                        -{strat.rr.maxLossPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Action / Load Button */}
                  <div className="pt-1 flex items-center justify-between gap-2">
                    <span className="text-[9px] text-neutral-500 font-mono">
                      SL: ${strat.parsed.slPrice || '0.00'}
                    </span>

                    <button
                      onClick={() => handleLoadStrategy(strat)}
                      className={`px-2 py-1 rounded text-[10px] font-bold font-mono flex items-center gap-1 transition-all ${
                        isCurrentPair
                          ? 'bg-amber-400 text-black hover:bg-amber-300 shadow-sm'
                          : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700 hover:text-white'
                      }`}
                    >
                      <span>{isCurrentPair ? 'En Gráfico' : 'Cargar'}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Bottom Sync Status */}
      <div className="shrink-0 text-[10px] text-neutral-500 font-mono flex items-center justify-between px-1">
        <span>Último sync: {lastSyncTime}</span>
        <a
          href={OFFICIAL_GOOGLE_SHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-400 hover:underline flex items-center gap-0.5"
        >
          <span>Abrir Sheets</span>
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
    </div>
  );
};
