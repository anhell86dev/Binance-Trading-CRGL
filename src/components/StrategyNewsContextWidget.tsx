import React, { useState, useEffect, useMemo } from 'react';
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
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { diarioBitcoinNewsService, NewsServiceState } from '../services/diarioBitcoinNewsService';
import { NewsHeadlineItem, NewsSentiment } from '../types/diarioBitcoin';

interface StrategyNewsContextWidgetProps {
  currentSymbol?: string;
  strategyName?: string;
  strategyId?: string;
  className?: string;
  maxHeight?: string;
  compact?: boolean;
}

export const StrategyNewsContextWidget: React.FC<StrategyNewsContextWidgetProps> = ({
  currentSymbol = 'BTCUSDT',
  strategyName,
  strategyId,
  className = '',
  maxHeight = 'max-h-80 sm:max-h-96',
  compact = false,
}) => {
  const [state, setState] = useState<NewsServiceState>(() => diarioBitcoinNewsService.getState());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'strategy' | 'all' | 'bullish' | 'bearish'>('strategy');

  // Normalize base symbol (e.g., 'SOLUSDT' -> 'SOL', 'TAOUSDT' -> 'TAO')
  const baseAsset = useMemo(() => {
    return currentSymbol.replace(/USDT$|BUSD$|PERP$/i, '').toUpperCase();
  }, [currentSymbol]);

  useEffect(() => {
    // Initial fetch from diariobitcoin-proxy
    diarioBitcoinNewsService.fetchHeadlines();

    const unsubscribe = diarioBitcoinNewsService.subscribe(() => {
      setState(diarioBitcoinNewsService.getState());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleRefresh = async () => {
    await diarioBitcoinNewsService.fetchHeadlines({ force: true });
  };

  // Helper to check if item relates to current strategy asset
  const isItemForCurrentStrategy = (item: NewsHeadlineItem): boolean => {
    if (!baseAsset) return false;
    if (item.relatedSymbols.includes(baseAsset)) return true;
    const regex = new RegExp(`\\b(${baseAsset})\\b`, 'i');
    return regex.test(item.title) || regex.test(item.summary);
  };

  // Process items with strategy matching flag
  const enrichedItems = useMemo(() => {
    return state.items.map((item) => ({
      ...item,
      isMatchingStrategy: isItemForCurrentStrategy(item),
    }));
  }, [state.items, baseAsset]);

  // Filter items based on active tab and search query
  const filteredItems = useMemo(() => {
    let list = enrichedItems;

    // Filter by tab
    if (activeFilter === 'strategy') {
      const strategyMatches = list.filter((item) => item.isMatchingStrategy);
      // If no exact matches for this asset, show all with strategy items on top
      if (strategyMatches.length > 0) {
        list = strategyMatches;
      }
    } else if (activeFilter === 'bullish') {
      list = list.filter((item) => item.sentiment === 'bullish');
    } else if (activeFilter === 'bearish') {
      list = list.filter((item) => item.sentiment === 'bearish');
    }

    // Filter by text search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.summary.toLowerCase().includes(q) ||
          item.relatedSymbols.some((s) => s.toLowerCase().includes(q))
      );
    }

    return list;
  }, [enrichedItems, activeFilter, searchQuery]);

  // Strategy match count
  const strategyMatchCount = useMemo(() => {
    return enrichedItems.filter((i) => i.isMatchingStrategy).length;
  }, [enrichedItems]);

  // Sentiment counts
  const sentimentStats = useMemo(() => {
    const total = enrichedItems.length || 1;
    const bulls = enrichedItems.filter((i) => i.sentiment === 'bullish').length;
    const bears = enrichedItems.filter((i) => i.sentiment === 'bearish').length;
    const neutrals = enrichedItems.filter((i) => i.sentiment === 'neutral').length;
    return {
      bulls,
      bears,
      neutrals,
      bullPct: Math.round((bulls / total) * 100),
      bearPct: Math.round((bears / total) * 100),
    };
  }, [enrichedItems]);

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
            Bajista / Alerta
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1">
            <Radio className="w-3 h-3 text-neutral-400" />
            Neutral
          </span>
        );
    }
  };

  return (
    <div
      id="strategy_news_context_widget"
      className={`bg-neutral-900/90 rounded-2xl p-3.5 sm:p-4 border border-neutral-800 shadow-xl flex flex-col gap-3 ${className}`}
    >
      {/* 1. Widget Header: Title, Strategy Context, and Live Proxy Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Contexto de Mercado: DiarioBitcoin
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                {baseAsset} ({strategyId || 'Estrategia'})
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 font-sans mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Titulares tácticos del proxy oficial</span>
              <span>•</span>
              <span className="text-neutral-300 font-medium">
                {strategyMatchCount > 0
                  ? `${strategyMatchCount} titular(es) para ${baseAsset}`
                  : `Monitoreo macro y altcoins`}
              </span>
            </p>
          </div>
        </div>

        {/* Live Proxy Connection & Refresh */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-950 border border-neutral-800 text-[10px] font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                state.source === 'diariobitcoin-proxy'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className="text-neutral-300 hidden sm:inline">
              {state.source === 'diariobitcoin-proxy' ? 'diariobitcoin-proxy' : 'RSS Stream'}
            </span>
            <span className="text-neutral-500">
              {state.lastUpdated
                ? new Date(state.lastUpdated).toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'En vivo'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={state.isLoading}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-300 transition-all disabled:opacity-50 cursor-pointer"
            title="Actualizar titulares desde DiarioBitcoin Proxy"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${state.isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Sentiment Bar Summary */}
      <div className="bg-neutral-950/80 rounded-xl p-2 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1">
            <Globe className="w-3.5 h-3.5 text-sky-400" />
            Sentimiento Táctico:
          </span>
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-bold text-[11px]">
              {sentimentStats.bullPct}% Alcista ({sentimentStats.bulls})
            </span>
            <span className="text-neutral-600">|</span>
            <span className="text-rose-400 font-bold text-[11px]">
              {sentimentStats.bearPct}% Bajista ({sentimentStats.bears})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={`https://www.diariobitcoin.com/categoria/analisis/?s=${encodeURIComponent(baseAsset)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors"
          >
            <span>Ver análisis de {baseAsset} en diariobitcoin.com</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* 3. Filter Tabs & Live Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          <button
            type="button"
            onClick={() => setActiveFilter('strategy')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeFilter === 'strategy'
                ? 'bg-amber-400 text-black border-amber-300 shadow-sm'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Contexto {baseAsset}</span>
            {strategyMatchCount > 0 && (
              <span
                className={`px-1 rounded text-[9px] font-black ${
                  activeFilter === 'strategy' ? 'bg-black text-amber-300' : 'bg-amber-400/20 text-amber-300'
                }`}
              >
                {strategyMatchCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeFilter === 'all'
                ? 'bg-neutral-200 text-black border-white shadow-sm'
                : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <span>Todas ({enrichedItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('bullish')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeFilter === 'bullish'
                ? 'bg-emerald-400 text-black border-emerald-300 shadow-sm'
                : 'bg-neutral-950 text-emerald-400/80 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>Alcistas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('bearish')}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1.5 transition-all border shrink-0 ${
              activeFilter === 'bearish'
                ? 'bg-rose-400 text-black border-rose-300 shadow-sm'
                : 'bg-neutral-950 text-rose-400/80 border-neutral-800 hover:bg-neutral-850'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            <span>Bajistas</span>
          </button>
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[180px] sm:w-56">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar titulares o token..."
            className="w-full pl-8 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 font-sans"
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

      {/* 4. Notification / Context Banner if filtering strategy without direct hits */}
      {activeFilter === 'strategy' && strategyMatchCount === 0 && (
        <div className="bg-sky-950/30 border border-sky-800/60 rounded-xl p-2.5 text-xs text-sky-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            No hay noticias específicas de <strong>{baseAsset}</strong> en las últimas horas. Mostrando titulares del mercado cripto para contexto macro.
          </span>
        </div>
      )}

      {/* 5. Scrollable Feed of News Headlines */}
      <div className={`overflow-y-auto ${maxHeight} custom-scrollbar pr-1 flex flex-col gap-2.5`}>
        {state.isLoading && enrichedItems.length === 0 ? (
          // Loading Skeletons
          <div className="flex flex-col gap-2 py-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 animate-pulse flex flex-col gap-2">
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
            <p className="text-xs font-medium">No se encontraron titulares con el filtro actual.</p>
            <button
              type="button"
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className="mt-1 px-3 py-1 rounded-lg text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-white transition-all font-mono"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          // News Cards Feed
          filteredItems.map((item) => (
            <article
              key={item.id}
              className={`p-3 sm:p-3.5 rounded-xl border transition-all flex flex-col gap-2 ${
                item.isMatchingStrategy
                  ? 'bg-neutral-950/90 border-amber-500/40 hover:border-amber-400/80 shadow-md shadow-amber-950/20'
                  : 'bg-neutral-950/70 border-neutral-800/90 hover:border-neutral-700'
              }`}
            >
              {/* Card Meta Top: Time, Badges, Category */}
              <div className="flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
                <div className="flex items-center gap-2 flex-wrap">
                  {item.isMatchingStrategy && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-neutral-950 flex items-center gap-1 shadow-xs">
                      <Sparkles className="w-3 h-3" />
                      Relevante para {baseAsset}
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

              {/* Headline Title */}
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

              {/* Summary / Excerpt Context */}
              {item.summary && (
                <p className="text-xs text-neutral-400 leading-relaxed font-sans line-clamp-2">
                  {item.summary}
                </p>
              )}

              {/* Card Bottom Meta: Author, Mentioned Tokens, External Link */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/60 text-[11px] font-mono flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-neutral-500">Por: {item.author || 'DiarioBitcoin'}</span>
                  {item.relatedSymbols.length > 0 && (
                    <div className="flex items-center gap-1 ml-2">
                      <Tag className="w-3 h-3 text-neutral-500" />
                      {item.relatedSymbols.map((sym) => (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => setSearchQuery(sym)}
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold transition-all ${
                            sym === baseAsset
                              ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                              : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                          }`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 transition-colors text-[11px] font-semibold"
                >
                  <span>Leer completo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </article>
          ))
        )}
      </div>

      {/* 6. Footer Disclaimer & Link */}
      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-1 border-t border-neutral-800/80">
        <span>Fuente: Feed RSS & WP API vía diariobitcoin-proxy</span>
        <a
          href="https://www.diariobitcoin.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-400 hover:text-amber-400 flex items-center gap-1 transition-colors"
        >
          <span>DiarioBitcoin.com</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>
    </div>
  );
};
