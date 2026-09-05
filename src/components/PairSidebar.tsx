import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { AssetSelectorModal } from './AssetSelectorModal';

interface PairItem {
  symbol: string;
  name: string;
  isPopular?: boolean;
}

const DEFAULT_PAIRS: PairItem[] = [
  { symbol: 'ZECUSDT', name: 'Zcash', isPopular: true },
  { symbol: 'TAOUSDT', name: 'Bittensor', isPopular: true },
  { symbol: 'AAVEUSDT', name: 'Aave', isPopular: true },
  { symbol: 'SOLUSDT', name: 'Solana', isPopular: true },
  { symbol: 'XRPUSDT', name: 'Ripple', isPopular: true },
  { symbol: 'BTCUSDT', name: 'Bitcoin', isPopular: true },
  { symbol: 'ETHUSDT', name: 'Ethereum', isPopular: true },
  { symbol: 'DOGEUSDT', name: 'Dogecoin', isPopular: true },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'NEARUSDT', name: 'Near Protocol' },
  { symbol: 'AVAXUSDT', name: 'Avalanche' },
  { symbol: 'SUIUSDT', name: 'Sui' },
  { symbol: 'LINKUSDT', name: 'Chainlink' },
  { symbol: 'PEPEUSDT', name: 'Pepe' },
];

export const PairSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('binance_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [currentSymbol, setCurrentSymbol] = useState<string>(binanceWs.getCurrentSymbol());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [strategyPairs, setStrategyPairs] = useState<string[]>(strategyService.getStrategyPairs());
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [tickerPrices, setTickerPrices] = useState<Record<string, { price: number; change: number }>>({});

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const sym = binanceWs.getCurrentSymbol();
      setCurrentSymbol(sym);
      const ticker = binanceWs.getTicker();
      if (ticker.symbol) {
        setTickerPrices((prev) => ({
          ...prev,
          [ticker.symbol]: {
            price: ticker.lastPrice,
            change: ticker.change24hPercent ?? 0,
          },
        }));
      }
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategyPairs(strategyService.getStrategyPairs());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem('binance_sidebar_collapsed', String(next));
    } catch {}
  };

  const handleSelectSymbol = (sym: string) => {
    binanceWs.setSymbol(sym);
  };

  const allSymbols = Array.from(
    new Set([...strategyPairs, ...DEFAULT_PAIRS.map((pair) => pair.symbol), currentSymbol])
  );

  const filteredSymbols = allSymbols.filter((sym) =>
    sym.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <aside
        id="pair_navigation_sidebar"
        className={`bg-neutral-900 border-r border-neutral-800 flex flex-col transition-all duration-300 z-30 shrink-0 sticky top-[61px] h-[calc(100vh-61px)] ${
          isCollapsed ? 'w-16' : 'w-64 sm:w-72'
        }`}
      >
        <div className="p-3 border-b border-neutral-800 flex items-center justify-between gap-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-6 h-6 rounded bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider truncate">Pares Perpetuos</h3>
                <span className="text-[10px] text-neutral-400 font-mono">USDⓈ-M Futures</span>
              </div>
            </div>
          )}

          <button
            id="sidebar-toggle-btn"
            onClick={toggleCollapse}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors mx-auto"
            title={isCollapsed ? 'Expandir panel de pares' : 'Colapsar panel'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4 text-amber-400" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && (
          <div className="p-2.5 border-b border-neutral-800/80">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Filtrar par (ZEC, TAO, SOL)..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-7 pr-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 pointer-events-none" />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1 scrollbar-thin scrollbar-thumb-neutral-800">
          {filteredSymbols.map((sym) => {
            const isSelected = sym === currentSymbol;
            const isStrategy = strategyPairs.includes(sym);
            const baseAsset = sym.replace('USDT', '');
            const priceInfo = tickerPrices[sym];
            const isPositive = (priceInfo?.change ?? 0) >= 0;

            if (isCollapsed) {
              return (
                <button
                  key={sym}
                  id={`sidebar-pair-${sym}`}
                  onClick={() => handleSelectSymbol(sym)}
                  className={`w-full py-2.5 rounded-lg flex flex-col items-center justify-center transition-all relative group ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
                      : 'hover:bg-neutral-800/60 text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={`${sym} - Clic para seleccionar`}
                >
                  <span className="text-[11px] font-mono font-black tracking-tight">{baseAsset.slice(0, 4)}</span>
                  {isStrategy && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 absolute top-1.5 right-1.5" />}
                  {isSelected && <span className="w-1 h-4 bg-amber-400 rounded-r absolute left-0" />}
                </button>
              );
            }

            return (
              <button
                key={sym}
                id={`sidebar-pair-${sym}`}
                onClick={() => handleSelectSymbol(sym)}
                className={`w-full p-2 rounded-lg flex items-center justify-between text-left transition-all border ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-500/40 text-white shadow-sm'
                    : 'bg-neutral-950/40 hover:bg-neutral-800/70 border-neutral-800/50 text-neutral-300'
                }`}
                title={`${sym} - Clic para seleccionar`}
              >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                  <div
                    className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-mono font-extrabold shrink-0 border ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-300'
                    }`}
                  >
                    {baseAsset.slice(0, 3)}
                  </div>
                  <div className="min-w-0 truncate">
                    <span className="block text-xs font-mono font-bold tracking-tight text-white truncate">{sym}</span>
                  </div>
                  {isStrategy && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Par configurado en Google Sheets" />}
                </div>

                <div className="text-right font-mono shrink-0 pl-1">
                  {priceInfo ? (
                    <>
                      <div className="text-xs font-bold text-neutral-200">
                        ${priceInfo.price >= 1000 ? priceInfo.price.toFixed(2) : priceInfo.price >= 1 ? priceInfo.price.toFixed(3) : priceInfo.price.toFixed(4)}
                      </div>
                      <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        <span>{isPositive ? '+' : ''}{priceInfo.change.toFixed(2)}%</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-[10px] text-neutral-500">--</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-2 border-t border-neutral-800 bg-neutral-950/80">
          <button
            id="sidebar-explore-all-btn"
            onClick={() => setIsAssetModalOpen(true)}
            className={`w-full py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/40 text-neutral-300 hover:text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
              isCollapsed ? 'px-0' : 'px-3'
            }`}
            title="Explorar y buscar en el catálogo completo de Binance (+400 pares)"
          >
            <Search className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            {!isCollapsed && <span className="truncate">Buscar Todo Binance</span>}
          </button>
        </div>
      </aside>

      <AssetSelectorModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={currentSymbol}
      />
    </>
  );
};
