import React, { useState } from 'react';
import { PremiumTerminalLayout, TerminalMobileTab } from '../layouts/PremiumTerminalLayout';

interface TerminalPageProps {
  watchlist?: React.ReactNode;
  chart: React.ReactNode;
  marketInfo?: React.ReactNode;
  orderForm?: React.ReactNode;
  positions?: React.ReactNode;
}

export function TerminalPage({ watchlist, chart, marketInfo, orderForm, positions }: TerminalPageProps) {
  const [activeTab, setActiveTab] = useState<TerminalMobileTab>('chart');

  const tabs: Array<{ id: TerminalMobileTab; label: string }> = [
    { id: 'chart', label: 'Grafico' },
    { id: 'order', label: 'Orden' },
    { id: 'positions', label: 'Posiciones' },
  ];

  return (
    <div className="terminal-wrapper">
      <div className="mobile-terminal-tabs" role="tablist" aria-label="Paneles del terminal">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <PremiumTerminalLayout
        watchlist={watchlist}
        chart={chart}
        marketInfo={marketInfo}
        orderForm={orderForm}
        positions={positions}
        activeMobileTab={activeTab}
      />
    </div>
  );
}
