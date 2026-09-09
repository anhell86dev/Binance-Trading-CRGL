import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart2,
  ChevronLeft,
  ChevronRight,
  Layers,
  Maximize2,
  Radio,
  Search,
  Sliders,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { TerminalMarketSelector } from './TerminalMarketSelector';
import { LiveMarketIndicatorsViewer } from './LiveMarketIndicatorsViewer';
import { TerminalOrderControlPanel } from './TerminalOrderControlPanel';
import { AssetSelectorModal } from './AssetSelectorModal';

interface TacticalWorkspaceProps {
  onOpenOrderModal?: () => void;
}

type MobileWorkspaceTab = 'indicators' | 'markets' | 'orders';

export const TacticalWorkspace: React.FC<TacticalWorkspaceProps> = ({ onOpenOrderModal }) => {
  const [symbol, setSymbol] = useState(() => binanceWs.getCurrentSymbol());
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Desktop collapsible panel states
  const [isMarketsCollapsed, setIsMarketsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('terminal_markets_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const [isOrdersCollapsed, setIsOrdersCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('terminal_orders_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  // Mobile active area tab
  const [mobileTab, setMobileTab] = useState<MobileWorkspaceTab>('indicators');

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const current = binanceWs.getCurrentSymbol();
      if (current !== symbol) {
        setSymbol(current);
      }
    });

    return () => unsubWs();
  }, [symbol]);

  const handleSelectSymbol = useCallback((newSym: string) => {
    binanceWs.setSymbol(newSym);
    setSymbol(newSym);
    // If on mobile, switch back to indicators viewer after selecting a pair
    setMobileTab('indicators');
  }, []);

  const toggleMarketsCollapse = () => {
    setIsMarketsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('terminal_markets_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  const toggleOrdersCollapse = () => {
    setIsOrdersCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('terminal_orders_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  return (
    <div
      id="tactical_workspace_container"
      className="flex flex-col h-full w-full overflow-hidden bg-neutral-950 rounded-xl border border-neutral-800 shadow-2xl relative"
    >
      {/* Mobile / Small Screen Navigation Tab Bar */}
      <div className="flex md:hidden items-center justify-around bg-neutral-900 border-b border-neutral-800 p-1 shrink-0 text-xs font-bold">
        <button
          type="button"
          onClick={() => setMobileTab('markets')}
          className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'markets'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Mercados</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('indicators')}
          className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'indicators'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Gráfico & Indicadores</span>
        </button>

        <button
          type="button"
          onClick={() => setMobileTab('orders')}
          className={`flex-1 py-2 px-1 rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'orders'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Operar</span>
        </button>
      </div>

      {/* Main Multi-Panel Workspace (Desktop: 3 columns, Mobile: Tabbed) */}
      <div className="flex-1 flex flex-row overflow-hidden min-h-0 w-full">
        {/* 1. ÁREA 1: SELECTOR DE MERCADOS */}
        <div
          className={`h-full ${
            mobileTab === 'markets' ? 'flex flex-1' : 'hidden md:flex'
          }`}
        >
          <TerminalMarketSelector
            selectedSymbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            isCollapsed={isMarketsCollapsed}
            onToggleCollapse={toggleMarketsCollapse}
            onOpenAssetModal={() => setIsAssetModalOpen(true)}
          />
        </div>

        {/* 2. ÁREA 2: VISOR DE INDICADORES DE MERCADO EN VIVO */}
        <div
          className={`h-full min-w-0 ${
            mobileTab === 'indicators' ? 'flex flex-1' : 'hidden md:flex flex-1'
          }`}
        >
          <LiveMarketIndicatorsViewer
            symbol={symbol}
            onSelectSymbol={handleSelectSymbol}
            onOpenOrderModal={onOpenOrderModal}
            onOpenAssetModal={() => setIsAssetModalOpen(true)}
          />
        </div>

        {/* 3. ÁREA 3: PANEL DE CONTROL DE ÓRDENES */}
        <div
          className={`h-full ${
            mobileTab === 'orders' ? 'flex flex-1' : 'hidden lg:flex'
          }`}
        >
          <TerminalOrderControlPanel
            isCollapsed={isOrdersCollapsed}
            onToggleCollapse={toggleOrdersCollapse}
            onPopOutModal={onOpenOrderModal}
          />
        </div>
      </div>

      {/* Modal global de selección de activos */}
      {isAssetModalOpen && (
        <AssetSelectorModal
          isOpen={isAssetModalOpen}
          currentSymbol={symbol}
          onClose={() => setIsAssetModalOpen(false)}
          onSelectSymbol={handleSelectSymbol}
        />
      )}
    </div>
  );
};
