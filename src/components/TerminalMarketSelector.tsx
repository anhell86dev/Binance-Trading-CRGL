import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Flame,
  Layers,
  Search,
  SlidersHorizontal,
  Star,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { strategyService } from '../services/strategyService';
import { BINANCE_POPULAR_PAIRS } from '../data/binancePairs';

interface TerminalMarketSelectorProps {
  selectedSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onOpenAssetModal?: () => void;
}

type MarketFilterTab = 'all' | 'favorites' | 'strategies' | 'gainers' | 'losers';

export const TerminalMarketSelector: React.FC<TerminalMarketSelectorProps> = memo(({
  selectedSymbol,
  onSelectSymbol,
  isCollapsed = false,
  onToggleCollapse,
  onOpenAssetModal,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<MarketFilterTab>('all');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('terminal_favorite_pairs');
      return saved ? JSON.parse(saved) : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TAOUSDT', 'ZECUSDT'];
    } catch {
      return ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TAOUSDT', 'ZECUSDT'];
    }
  });

  const [strategyPairs, setStrategyPairs] = useState<string[]>(() => strategyService.getStrategyPairs());
  const [priceFlashMap, setPriceFlashMap] = useState<Record<string, 'up' | 'down'>>({});
  const [, setTick] = useState(0);

  // Subscribe to ticker updates & strategy changes
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setTick(t => t + 1);
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategyPairs(strategyService.getStrategyPairs());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  // Toggle favorite
  const toggleFavorite = (sym: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(sym) ? prev.filter(s => s !== sym) : [...prev, sym];
      try {
        localStorage.setItem('terminal_favorite_pairs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Compile full list of available pairs
  const pairList = useMemo(() => {
    const defaultList = BINANCE_POPULAR_PAIRS;
    const currentTicker = binanceWs.getTicker();

    // Map each pair with live price and change
    return defaultList.map(pair => {
      const liveData = livePriceService.getPriceData(pair.symbol);
      const isCurrentTicker = currentTicker.symbol === pair.symbol;

      const price = isCurrentTicker && currentTicker.lastPrice > 0
        ? currentTicker.lastPrice
        : (liveData.price || 0);

      const change24h = isCurrentTicker && currentTicker.change24hPercent !== undefined
        ? currentTicker.change24hPercent
        : (liveData.change24hPercent || 0);

      const hasStrategy = strategyPairs.includes(pair.symbol);
      const isFav = favorites.includes(pair.symbol);

      return {
        ...pair,
        price,
        change24h,
        hasStrategy,
        isFav,
      };
    });
  }, [strategyPairs, favorites, selectedSymbol]);

  // Filtered and sorted pairs
  const filteredPairs = useMemo(() => {
    return pairList.filter(item => {
      // Search text
      if (searchTerm.trim()) {
        const query = searchTerm.trim().toLowerCase();
        const matchesSym = item.symbol.toLowerCase().includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBase = item.baseAsset.toLowerCase().includes(query);
        if (!matchesSym && !matchesName && !matchesBase) return false;
      }

      // Category tab filter
      if (filterTab === 'favorites') return item.isFav;
      if (filterTab === 'strategies') return item.hasStrategy;
      if (filterTab === 'gainers') return item.change24h > 0;
      if (filterTab === 'losers') return item.change24h < 0;

      return true;
    }).sort((a, b) => {
      // Keep selected symbol near top if matching
      if (a.symbol === selectedSymbol) return -1;
      if (b.symbol === selectedSymbol) return 1;

      if (filterTab === 'gainers') return b.change24h - a.change24h;
      if (filterTab === 'losers') return a.change24h - b.change24h;
      if (filterTab === 'strategies') {
        if (a.hasStrategy && !b.hasStrategy) return -1;
        if (!a.hasStrategy && b.hasStrategy) return 1;
      }
      return 0;
    });
  }, [pairList, searchTerm, filterTab, selectedSymbol]);

  const formatPrice = (p: number) => {
    if (!p || isNaN(p) || p <= 0) return '--';
    if (p >= 100) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    return p.toFixed(6);
  };

  if (isCollapsed) {
    return (
      <aside
        id="terminal-market-selector-collapsed"
        className="w-14 bg-neutral-950/90 border-r border-neutral-800 flex flex-col items-center py-3 gap-3 shrink-0 select-none"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 transition-all"
          title="Expandir Selector de Mercados"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="w-8 h-[1px] bg-neutral-800 my-1" />

        {/* Quick favorite icons */}
        <div className="flex-1 w-full overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1.5 py-1 scrollbar-none">
          {favorites.slice(0, 10).map(sym => {
            const isSelected = sym === selectedSymbol;
            const base = sym.replace('USDT', '');
            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectSymbol(sym)}
                className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-mono font-bold transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/60 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 border border-transparent'
                }`}
                title={`${sym} - Clic para abrir`}
              >
                <span>{base.slice(0, 4)}</span>
                <span className="w-1 h-1 rounded-full bg-amber-400/80 mt-0.5" />
              </button>
            );
          })}
        </div>

        {onOpenAssetModal && (
          <button
            type="button"
            onClick={onOpenAssetModal}
            className="p-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all"
            title="Explorar todos los mercados"
          >
            <Search className="w-4 h-4" />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      id="terminal-market-selector-container"
      className="w-64 sm:w-72 bg-neutral-950/95 border-r border-neutral-800 flex flex-col h-full shrink-0 select-none shadow-lg z-10"
    >
      {/* Header */}
      <div className="p-3 border-b border-neutral-800/90 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">
              Mercados Futuros
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">Binance USDⓈ-M</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {onOpenAssetModal && (
            <button
              type="button"
              onClick={onOpenAssetModal}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition-colors"
              title="Buscar en todos los activos de Binance"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          )}

          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
              title="Colapsar selector"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="p-2.5 border-b border-neutral-800/80 bg-neutral-900/40">
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar par (BTC, SOL, TAO)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500/70 transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2 text-neutral-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      <div className="px-2 py-1.5 border-b border-neutral-800/70 flex items-center gap-1 overflow-x-auto scrollbar-none bg-neutral-950/60 text-[10px]">
        <button
          type="button"
          onClick={() => setFilterTab('all')}
          className={`px-2 py-1 rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
            filterTab === 'all'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          Todos ({pairList.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('favorites')}
          className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            filterTab === 'favorites'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
          Favs ({favorites.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('strategies')}
          className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-1 whitespace-nowrap cursor-pointer ${
            filterTab === 'strategies'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
          title="Pares con estrategias en Google Sheets"
        >
          <Layers className="w-2.5 h-2.5 text-indigo-400" />
          Estrategia ({strategyPairs.length})
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('gainers')}
          className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-0.5 whitespace-nowrap cursor-pointer ${
            filterTab === 'gainers'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900'
          }`}
        >
          <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
          +24h
        </button>

        <button
          type="button"
          onClick={() => setFilterTab('losers')}
          className={`px-2 py-1 rounded-md font-semibold transition-all flex items-center gap-0.5 whitespace-nowrap cursor-pointer ${
            filterTab === 'losers'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              : 'text-neutral-400 hover:text-rose-300 hover:bg-neutral-900'
          }`}
        >
          <TrendingDown className="w-2.5 h-2.5 text-rose-400" />
          -24h
        </button>
      </div>

      {/* Pairs List */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 scrollbar-thin scrollbar-thumb-neutral-800">
        {filteredPairs.length === 0 ? (
          <div className="p-6 text-center text-neutral-500 text-xs">
            No se encontraron pares coincidentes.
          </div>
        ) : (
          filteredPairs.map((pair) => {
            const isSelected = pair.symbol === selectedSymbol;
            const isPositive = pair.change24h >= 0;

            return (
              <div
                key={pair.symbol}
                onClick={() => onSelectSymbol(pair.symbol)}
                className={`group px-2.5 py-2 rounded-lg flex items-center justify-between cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-sm'
                    : 'border-transparent hover:bg-neutral-900/80 text-neutral-300'
                }`}
              >
                {/* Left: Star & Pair Name */}
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(pair.symbol, e)}
                    className="text-neutral-600 hover:text-amber-400 transition-colors shrink-0"
                    title={pair.isFav ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        pair.isFav ? 'text-amber-400 fill-amber-400' : 'text-neutral-600 group-hover:text-neutral-400'
                      }`}
                    />
                  </button>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-bold tracking-tight text-neutral-100 group-hover:text-white">
                        {pair.baseAsset}
                      </span>
                      <span className="text-[10px] font-mono text-neutral-500">/USDT</span>

                      {pair.hasStrategy && (
                        <span
                          className="px-1 py-0.2 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold"
                          title="Estrategia disponible en Google Sheets"
                        >
                          PLAN
                        </span>
                      )}
                    </div>

                    <span className="text-[10px] text-neutral-500 truncate max-w-[110px]">
                      {pair.name}
                    </span>
                  </div>
                </div>

                {/* Right: Live Price & 24h Change */}
                <div className="flex flex-col items-end shrink-0 font-mono">
                  <span className="text-xs font-bold text-neutral-200">
                    ${formatPrice(pair.price)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                      isPositive ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {isPositive ? '+' : ''}
                    {pair.change24h.toFixed(2)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info / All Assets Trigger */}
      {onOpenAssetModal && (
        <div className="p-2 border-t border-neutral-800/80 bg-neutral-950/80">
          <button
            type="button"
            onClick={onOpenAssetModal}
            className="w-full py-1.5 px-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-400 border border-neutral-800 hover:border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <Search className="w-3.5 h-3.5 text-amber-400" />
            <span>Ver Todos los 300+ Pares</span>
          </button>
        </div>
      )}
    </aside>
  );
});
