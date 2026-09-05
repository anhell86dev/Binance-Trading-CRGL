import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Search, TrendingDown, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { AssetSelectorModal } from './AssetSelectorModal';

interface PairItem { symbol: string; name: string; isPopular?: boolean; }

const DEFAULT_PAIRS: PairItem[] = [
  { symbol: 'ZECUSDT', name: 'Zcash', isPopular: true }, { symbol: 'TAOUSDT', name: 'Bittensor', isPopular: true },
  { symbol: 'AAVEUSDT', name: 'Aave', isPopular: true }, { symbol: 'SOLUSDT', name: 'Solana', isPopular: true },
  { symbol: 'XRPUSDT', name: 'Ripple', isPopular: true }, { symbol: 'BTCUSDT', name: 'Bitcoin', isPopular: true },
  { symbol: 'ETHUSDT', name: 'Ethereum', isPopular: true }, { symbol: 'DOGEUSDT', name: 'Dogecoin', isPopular: true },
  { symbol: 'BNBUSDT', name: 'BNB' }, { symbol: 'NEARUSDT', name: 'Near Protocol' },
  { symbol: 'AVAXUSDT', name: 'Avalanche' }, { symbol: 'SUIUSDT', name: 'Sui' },
  { symbol: 'LINKUSDT', name: 'Chainlink' }, { symbol: 'PEPEUSDT', name: 'Pepe' },
];

export const PairSidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem('binance_sidebar_collapsed') === 'true'; } catch { return false; }
  });
  const [currentSymbol, setCurrentSymbol] = useState<string>(binanceWs.getCurrentSymbol());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [strategyPairs, setStrategyPairs] = useState<string[]>(strategyService.getStrategyPairs());
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [tickerPrices, setTickerPrices] = useState<Record<string, { price: number; change: number }>>({});

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      const ticker = binanceWs.getTicker();
      if (ticker.symbol) setTickerPrices((prev) => ({ ...prev, [ticker.symbol]: { price: ticker.lastPrice, change: ticker.change24hPercent ?? 0 } }));
    });
    const unsubStrat = strategyService.subscribe(() => setStrategyPairs(strategyService.getStrategyPairs()));
    return () => { unsubWs(); unsubStrat(); };
  }, []);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try { localStorage.setItem('binance_sidebar_collapsed', String(next)); } catch {}
  };

  const handleSelectSymbol = (sym: string) => binanceWs.setSymbol(sym);
  const allSymbols = Array.from(new Set([...strategyPairs, ...DEFAULT_PAIRS.map((pair) => pair.symbol), currentSymbol]));
  const filteredSymbols = allSymbols.filter((sym) => sym.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <aside id="pair_navigation_sidebar" className={`pair-sidebar ${isCollapsed ? 'pair-sidebar--collapsed' : ''}`}>
        <div className="pair-sidebar__header">
          {!isCollapsed && <div className="pair-sidebar__title"><SlidersHorizontal className="w-3.5 h-3.5" /><div><h3>Pares Perpetuos</h3><span>USDⓈ-M Futures</span></div></div>}
          <button id="sidebar-toggle-btn" onClick={toggleCollapse} className="pair-sidebar__toggle" title={isCollapsed ? 'Expandir panel de pares' : 'Colapsar panel'}>
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!isCollapsed && <div className="pair-sidebar__search-wrap"><Search className="pair-sidebar__search-icon" /><input className="pair-sidebar__search" type="text" placeholder="Filtrar par (ZEC, TAO, SOL)..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} /></div>}

        <div className="pair-sidebar__list">
          {filteredSymbols.map((sym) => {
            const isSelected = sym === currentSymbol;
            const isStrategy = strategyPairs.includes(sym);
            const baseAsset = sym.replace('USDT', '');
            const priceInfo = tickerPrices[sym];
            const isPositive = (priceInfo?.change ?? 0) >= 0;

            if (isCollapsed) return (
              <button key={sym} id={`sidebar-pair-${sym}`} onClick={() => handleSelectSymbol(sym)} className={`pair-sidebar__row pair-sidebar__row--collapsed ${isSelected ? 'is-selected' : ''}`} title={`${sym} - Clic para seleccionar`}>
                <span>{baseAsset.slice(0, 4)}</span>{isStrategy && <i className="pair-sidebar__strategy-dot" />}
              </button>
            );

            return (
              <button key={sym} id={`sidebar-pair-${sym}`} onClick={() => handleSelectSymbol(sym)} className={`pair-sidebar__row ${isSelected ? 'is-selected' : ''}`} title={`${sym} - Clic para seleccionar`}>
                <span className="pair-sidebar__asset-icon">{baseAsset.slice(0, 3)}</span>
                <span className="pair-sidebar__symbol">{sym}</span>
                {isStrategy && <i className="pair-sidebar__strategy-dot" title="Par configurado en Google Sheets" />}
                <span className="pair-sidebar__quote">
                  <strong>{priceInfo ? `$${priceInfo.price >= 1000 ? priceInfo.price.toFixed(2) : priceInfo.price >= 1 ? priceInfo.price.toFixed(3) : priceInfo.price.toFixed(4)}` : '--'}</strong>
                  {priceInfo && <em className={isPositive ? 'is-positive' : 'is-negative'}>{isPositive ? '+' : ''}{priceInfo.change.toFixed(2)}%</em>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="pair-sidebar__footer"><button id="sidebar-explore-all-btn" onClick={() => setIsAssetModalOpen(true)} className="pair-sidebar__explore"><Search className="w-3.5 h-3.5" />{!isCollapsed && <span>Buscar Todo Binance</span>}</button></div>
      </aside>
      <AssetSelectorModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} onSelectSymbol={handleSelectSymbol} currentSymbol={currentSymbol} />
    </>
  );
};
