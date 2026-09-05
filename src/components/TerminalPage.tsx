import React, { useState } from 'react';
import { PremiumTerminalLayout } from '../layouts/PremiumTerminalLayout';

interface TerminalPageProps {
  watchlist?: React.ReactNode;
  chart: React.ReactNode;
  marketInfo?: React.ReactNode;
  orderForm?: React.ReactNode;
  positions?: React.ReactNode;
}

export function TerminalPage({ watchlist, chart, marketInfo, orderForm, positions }: TerminalPageProps) {
  const [activeTab, setActiveTab] = useState<'chart' | 'order' | 'positions'>('chart');

  return (
    <div className="terminal-wrapper">
      {/* Mobile tabs - solo visibles en pantallas pequenas */}
      <div className="mobile-terminal-tabs">
        <button
          className={`mobile-tab ${activeTab === 'chart' ? 'active' : ''}`}
          onClick={() => setActiveTab('chart')}
          type="button"
        >
          Grafico
        </button>
        <button
          className={`mobile-tab ${activeTab === 'order' ? 'active' : ''}`}
          onClick={() => setActiveTab('order')}
          type="button"
        >
          Orden
        </button>
        <button
          className={`mobile-tab ${activeTab === 'positions' ? 'active' : ''}`}
          onClick={() => setActiveTab('positions')}
          type="button"
        >
          Posiciones
        </button>
      </div>

      <PremiumTerminalLayout
        watchlist={watchlist}
        chart={chart}
        marketInfo={marketInfo}
        orderForm={orderForm}
        positions={positions}
      />
    </div>
  );
}
