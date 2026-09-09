import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ExternalLink,
  RefreshCw,
  Search,
  Globe,
  Newspaper,
  TrendingUp,
  TrendingDown,
  Clock,
  Sparkles,
  AlertCircle,
  Tag,
  Radio,
  Filter,
  Layers,
  ChevronRight,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
} from 'lucide-react';
import { diarioBitcoinNewsService, NewsServiceState } from '../services/diarioBitcoinNewsService';
import { NewsHeadlineItem, NewsSentiment } from '../types/diarioBitcoin';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { normalizeStrategyStatus } from '../utils/sheetParser';

export interface MarketNewsWidgetProps {
  /**
   * Optional array of active strategies to contextualize.
   * If not provided, the widget will automatically fetch and subscribe
   * to active strategies from strategyService.
   */
  activeStrategies?: GoogleSheetStrategyRow[];
  /**
   * Currently selected strategy ID or symbol to highlight or filter by.
   */
  selectedStrategyId?: string;
  /**
   * Currently focused trading symbol (e.g., 'BTCUSDT', 'SOLUSDT').
   */
  currentSymbol?: string;
  /**
   * Callback when a user clicks on an active strategy chip.
   */
  onSelectStrategy?: (strategy: GoogleSheetStrategyRow) => void;
  /**
   * Additional CSS classes for the container.
   */
  className?: string;
  /**
   * Custom max-height class for the scrollable feed (e.g. 'max-h-96' or 'max-h-[500px]').
   */
  maxHeight?: string;
  /**
   * Render in compact mode (ideal for sidebars or tight panels).
   */
  compact?: boolean;
  /**
   * Whether to show the top widget header. Default: true.
   */
  showHeader?: boolean;
}

export const MarketNewsWidget: React.FC<MarketNewsWidgetProps> = ({
  activeStrategies: propsActiveStrategies,
  selectedStrategyId,
  currentSymbol,
  onSelectStrategy,
  className = '',
  maxHeight = 'max-h-[480px]',
  compact = false,
  showHeader = true,
}) => {
  // 1. News state from service
  const [newsState, setNewsState] = useState<NewsServiceState>(() => diarioBitcoinNewsService.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'active_strategies' | 'all' | 'bullish' | 'bearish'>('active_strategies');
  const [selectedStrategyFilter, setSelectedStrategyFilter] = useState<string | 'ALL'>(
    selectedStrategyId || 'ALL'
  );

  // 2. Active strategies management
  const [internalStrategies, setInternalStrategies] = useState<GoogleSheetStrategyRow[]>(() => {
    if (propsActiveStrategies) return propsActiveStrategies;
    return strategyService
      .getStrategies()
      .filter((st) => normalizeStrategyStatus(st.estado) === 'Activa');
  });

  // Sync internal strategies if props change or via strategyService subscription
  useEffect(() => {
    if (propsActiveStrategies) {
      setInternalStrategies(propsActiveStrategies);
      return;
    }

    const unsub = strategyService.subscribe(() => {
      const active = strategyService
        .getStrategies()
        .filter((st) => normalizeStrategyStatus(st.estado) === 'Activa');
      setInternalStrategies(active);
    });

    return () => unsub();
  }, [propsActiveStrategies]);

  // Keep selectedStrategyFilter in sync if selectedStrategyId prop changes
  useEffect(() => {
    if (selectedStrategyId) {
      setSelectedStrategyFilter(selectedStrategyId);
    }
  }, [selectedStrategyId]);

  // 3. Initial fetch from diariobitcoin-proxy endpoint
  useEffect(() => {
    diarioBitcoinNewsService.fetchHeadlines();

    const unsub = diarioBitcoinNewsService.subscribe(() => {
      setNewsState(diarioBitcoinNewsService.getState());
    });

    return () => {
      unsub();
    };
  }, []);

  // 4. Extract active strategy symbols and map for context
  const activeTokensMap = useMemo(() => {
    const map = new Map<string, GoogleSheetStrategyRow[]>();

    internalStrategies.forEach((strat) => {
      const cleanSymbol = (strat.par || '').replace(/USDT$|BUSD$|PERP$/i, '').trim().toUpperCase();
      if (cleanSymbol) {
        const existing = map.get(cleanSymbol) || [];
        existing.push(strat);
        map.set(cleanSymbol, existing);
      }
    });

    // Also include currentSymbol if specified
    if (currentSymbol) {
      const cleanCurrent = currentSymbol.replace(/USDT$|BUSD$|PERP$/i, '').trim().toUpperCase();
      if (cleanCurrent && !map.has(cleanCurrent)) {
        map.set(cleanCurrent, []);
      }
    }

    return map;
  }, [internalStrategies, currentSymbol]);

  const activeTokenSymbols = useMemo(() => Array.from(activeTokensMap.keys()), [activeTokensMap]);

  // Helper to match an item to active strategies
  const getMatchingStrategiesForItem = useCallback(
    (item: NewsHeadlineItem): GoogleSheetStrategyRow[] => {
      const matched: GoogleSheetStrategyRow[] = [];
      const titleLower = item.title.toLowerCase();
      const summaryLower = item.summary.toLowerCase();

      activeTokensMap.forEach((strats, token) => {
        const tokenLower = token.toLowerCase();
        const hasToken =
          item.relatedSymbols.includes(token) ||
          titleLower.includes(tokenLower) ||
          summaryLower.includes(tokenLower);

        if (hasToken) {
          strats.forEach((s) => {
            if (!matched.some((m) => m.noEstrategia === s.noEstrategia)) {
              matched.push(s);
            }
          });
        }
      });

      return matched;
    },
    [activeTokensMap]
  );

  // Enriched items with strategy matching and strategic alignment check
  const enrichedItems = useMemo(() => {
    return newsState.items.map((item) => {
      const matchingStrats = getMatchingStrategiesForItem(item);
      const isMatching = matchingStrats.length > 0;

      // Strategy alignment: If strategy is LONG and news is Bullish -> favorable; if Bearish -> conflict/caution
      let alignment: 'favorable' | 'caution' | 'neutral' = 'neutral';
      if (matchingStrats.length > 0) {
        const firstStrat = matchingStrats[0];
        const isLong =
          !firstStrat.tipoDeOrden?.toLowerCase().includes('short') &&
          !firstStrat.tipoDeOrden?.toLowerCase().includes('venta');

        if (item.sentiment === 'bullish') {
          alignment = isLong ? 'favorable' : 'caution';
        } else if (item.sentiment === 'bearish') {
          alignment = isLong ? 'caution' : 'favorable';
        }
      }

      return {
        ...item,
        matchingStrategies: matchingStrats,
        isMatchingStrategy: isMatching,
        strategyAlignment: alignment,
      };
    });
  }, [newsState.items, getMatchingStrategiesForItem]);

  // 5. Filter items based on active tabs, selected strategy, and search query
  const filteredItems = useMemo(() => {
    let list = enrichedItems;

    // Filter by tab
    if (activeTab === 'active_strategies') {
      const strategyMatches = list.filter((item) => item.isMatchingStrategy);
      // If we have items matching active strategies, prioritize them
      if (strategyMatches.length > 0) {
        list = strategyMatches;
      }
    } else if (activeTab === 'bullish') {
      list = list.filter((item) => item.sentiment === 'bullish');
    } else if (activeTab === 'bearish') {
      list = list.filter((item) => item.sentiment === 'bearish');
    }

    // Filter by specific strategy pill if selected
    if (selectedStrategyFilter !== 'ALL') {
      list = list.filter((item) =>
        item.matchingStrategies.some((s) => s.noEstrategia === selectedStrategyFilter)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.relatedSymbols.some((s) => s.toLowerCase().includes(q)) ||
          item.matchingStrategies.some(
            (s) =>
              s.noEstrategia.toLowerCase().includes(q) ||
              s.par.toLowerCase().includes(q) ||
              s.nombreEstrategia.toLowerCase().includes(q)
          )
      );
    }

    return list;
  }, [enrichedItems, activeTab, selectedStrategyFilter, searchQuery]);

  // Stats for the active strategies context
  const strategyContextStats = useMemo(() => {
    const totalHeadlines = enrichedItems.length;
    const matchingHeadlines = enrichedItems.filter((i) => i.isMatchingStrategy).length;
    const bullishForStrategies = enrichedItems.filter(
      (i) => i.isMatchingStrategy && i.sentiment === 'bullish'
    ).length;
    const bearishForStrategies = enrichedItems.filter(
      (i) => i.isMatchingStrategy && i.sentiment === 'bearish'
    ).length;

    return {
      totalHeadlines,
      matchingHeadlines,
      bullishForStrategies,
      bearishForStrategies,
    };
  }, [enrichedItems]);

  const handleRefresh = async () => {
    await diarioBitcoinNewsService.fetchHeadlines({ force: true });
  };

  const getSentimentBadge = (sentiment: NewsSentiment) => {
    switch (sentiment) {
      case 'bullish':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/70 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Alcista
          </span>
        );
      case 'bearish':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/70 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Bajista
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800/80 text-neutral-400 border border-neutral-700/60 flex items-center gap-1">
            <Radio className="w-3 h-3 text-neutral-400" />
            Neutral
          </span>
        );
    }
  };

  return (
    <div
      id="market_news_widget"
      className={`bg-neutral-900/90 rounded-2xl p-3.5 sm:p-4 border border-neutral-800 shadow-xl flex flex-col gap-3 ${className}`}
    >
      {/* 1. WIDGET HEADER */}
      {showHeader && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Newspaper className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                  Market News & Headlines
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                  DiarioBitcoin
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span>Titulares en vivo para contexto de estrategias activas</span>
                <span>•</span>
                <span className="text-neutral-300 font-medium">
                  {internalStrategies.length} estrategia(s) monitoreada(s)
                </span>
              </p>
            </div>
          </div>

          {/* Live Connection & Refresh Control */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400"
              title="Conexión en vivo con el proxy de DiarioBitcoin"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  newsState.source === 'diariobitcoin-proxy'
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <span className="text-neutral-300">diariobitcoin-proxy</span>
              <span className="text-neutral-500">
                {newsState.lastUpdated
                  ? new Date(newsState.lastUpdated).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'En vivo'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={newsState.isLoading}
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-300 transition-all disabled:opacity-50 cursor-pointer"
              title="Actualizar titulares desde diariobitcoin-proxy"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${newsState.isLoading ? 'animate-spin text-amber-400' : ''}`}
              />
            </button>
          </div>
        </div>
      )}

      {/* 2. ACTIVE STRATEGIES CONTEXT BAR */}
      <div className="bg-neutral-950/80 rounded-xl p-2.5 border border-neutral-800/80 flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-neutral-400 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Contexto Activo:
            </span>
            <span className="text-neutral-300 text-[11px]">
              {strategyContextStats.matchingHeadlines} noticias vinculadas a pares en operación
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
              {strategyContextStats.bullishForStrategies} Alcistas
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" />
              {strategyContextStats.bearishForStrategies} Bajistas
            </span>
          </div>
        </div>

        {/* Strategy Selection Pills */}
        {internalStrategies.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setSelectedStrategyFilter('ALL')}
              className={`px-2 py-0.5 rounded-md font-bold transition-all shrink-0 border ${
                selectedStrategyFilter === 'ALL'
                  ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-xs'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:bg-neutral-800'
              }`}
            >
              Todas ({internalStrategies.length})
            </button>

            {internalStrategies.map((strat) => {
              const isSelected = selectedStrategyFilter === strat.noEstrategia;
              const isLong =
                !strat.tipoDeOrden?.toLowerCase().includes('short') &&
                !strat.tipoDeOrden?.toLowerCase().includes('venta');

              return (
                <button
                  key={strat.noEstrategia}
                  type="button"
                  onClick={() => {
                    setSelectedStrategyFilter(isSelected ? 'ALL' : strat.noEstrategia);
                    if (onSelectStrategy) {
                      onSelectStrategy(strat);
                    }
                  }}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all shrink-0 border flex items-center gap-1 ${
                    isSelected
                      ? 'bg-neutral-200 text-neutral-950 border-white shadow-xs'
                      : 'bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800 hover:text-white'
                  }`}
                  title={`${strat.noEstrategia}: ${strat.nombreEstrategia} (${strat.par})`}
                >
                  <span>{strat.par}</span>
                  <span
                    className={`text-[8px] px-1 rounded ${
                      isLong ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                    }`}
                  >
                    {isLong ? 'LONG' : 'SHORT'}
                  </span>
                  <span className="text-neutral-500 font-normal">#{strat.noEstrategia}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. FILTER TABS & SEARCH INPUT */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('active_strategies')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeTab === 'active_strategies'
                ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-sm'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Estrategias Activas</span>
            {strategyContextStats.matchingHeadlines > 0 && (
              <span
                className={`px-1 rounded text-[9px] font-black ${
                  activeTab === 'active_strategies'
                    ? 'bg-black text-amber-300'
                    : 'bg-amber-400/20 text-amber-300'
                }`}
              >
                {strategyContextStats.matchingHeadlines}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeTab === 'all'
                ? 'bg-neutral-200 text-neutral-950 border-white shadow-sm'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <span>Todo el Mercado ({enrichedItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bullish')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeTab === 'bullish'
                ? 'bg-emerald-400 text-neutral-950 border-emerald-300 shadow-sm'
                : 'bg-neutral-950 text-emerald-400/80 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Alcistas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bearish')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeTab === 'bearish'
                ? 'bg-rose-400 text-neutral-950 border-rose-300 shadow-sm'
                : 'bg-neutral-950 text-rose-400/80 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            <span>Bajistas</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[180px] sm:w-60">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por token, título o ID..."
            className="w-full pl-8 pr-6 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2 text-xs text-neutral-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* 4. SCROLLABLE CLEAN NEWS FEED */}
      <div className={`overflow-y-auto ${maxHeight} custom-scrollbar pr-1 flex flex-col gap-2.5`}>
        {newsState.isLoading && enrichedItems.length === 0 ? (
          // Skeletons
          <div className="flex flex-col gap-2 py-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 animate-pulse flex flex-col gap-2"
              >
                <div className="h-4 bg-neutral-800 rounded w-3/4" />
                <div className="h-3 bg-neutral-850 rounded w-full" />
                <div className="h-3 bg-neutral-850 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          // Empty State
          <div className="p-6 text-center bg-neutral-950 rounded-xl border border-neutral-800 flex flex-col items-center justify-center gap-2 text-neutral-400">
            <Filter className="w-8 h-8 text-neutral-600" />
            <p className="text-xs font-medium">No se encontraron titulares para el filtro actual.</p>
            <button
              type="button"
              onClick={() => {
                setActiveTab('all');
                setSelectedStrategyFilter('ALL');
                setSearchQuery('');
              }}
              className="mt-1 px-3 py-1 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-all font-mono cursor-pointer"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          // Feed list
          filteredItems.map((item) => (
            <article
              key={item.id}
              className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                item.isMatchingStrategy
                  ? 'bg-neutral-950/90 border-amber-500/40 hover:border-amber-400/80 shadow-md shadow-amber-950/15'
                  : 'bg-neutral-950/70 border-neutral-800/90 hover:border-neutral-700'
              }`}
            >
              {/* Header row of Card: Strategy Match, Sentiment, Time */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Strategy Match Badge */}
                  {item.isMatchingStrategy && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-neutral-950 flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      Contexto de Estrategia
                      {item.matchingStrategies.length > 0 && (
                        <span className="bg-neutral-950 text-amber-300 px-1 py-0.2 rounded text-[9px] font-mono">
                          {item.matchingStrategies.map((s) => s.noEstrategia).join(', ')}
                        </span>
                      )}
                    </span>
                  )}

                  {/* Strategic Alignment Badge */}
                  {item.isMatchingStrategy && item.strategyAlignment === 'favorable' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Alineación Favorable
                    </span>
                  )}

                  {item.isMatchingStrategy && item.strategyAlignment === 'caution' && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/90 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      <ShieldAlert className="w-2.5 h-2.5" />
                      Precaución: Sentimiento Contrapuesto
                    </span>
                  )}

                  {getSentimentBadge(item.sentiment)}
                  <span className="text-neutral-400 text-[11px]">{item.category}</span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-400">
                  <Clock className="w-3 h-3 text-neutral-500" />
                  <span>{item.ageText}</span>
                </div>
              </div>

              {/* Title */}
              <h4 className="text-xs sm:text-sm font-bold text-white leading-snug tracking-tight hover:text-amber-300 transition-colors">
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline flex items-start gap-1"
                >
                  <span>{item.title}</span>
                </a>
              </h4>

              {/* Summary */}
              {item.summary && (
                <p className="text-xs text-neutral-400 leading-relaxed font-sans line-clamp-2">
                  {item.summary}
                </p>
              )}

              {/* Bottom Row: Author, Related Symbols, Direct Article Link */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60 text-[11px] font-mono flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-neutral-500">Por: {item.author || 'DiarioBitcoin'}</span>

                  {/* Symbol Tags */}
                  {item.relatedSymbols.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <Tag className="w-3 h-3 text-neutral-500" />
                      {item.relatedSymbols.map((sym) => {
                        const isMatch = activeTokenSymbols.includes(sym);
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => setSearchQuery(sym)}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-all cursor-pointer ${
                              isMatch
                                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40 hover:bg-amber-400/30'
                                : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                            }`}
                            title={isMatch ? `Token en estrategia activa: ${sym}` : `Filtrar por ${sym}`}
                          >
                            {sym}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors text-[11px] font-semibold ml-auto"
                >
                  <span>Leer artículo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {/* 5. FOOTER: SOURCE AND REPO REFERENCE */}
      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/80 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-sky-400" />
          <span>Endpoint: /api/diariobitcoin (diariobitcoin-proxy)</span>
        </div>
        <a
          href="https://www.diariobitcoin.com/categoria/analisis/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
        >
          <span>diariobitcoin.com/categoria/analisis</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};

export default MarketNewsWidget;
