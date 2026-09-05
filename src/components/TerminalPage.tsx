import React from 'react';
import { PremiumTerminalLayout } from '../layouts/PremiumTerminalLayout';

interface TerminalPageProps {
  watchlist?: React.ReactNode;
  chart: React.ReactNode;
  marketInfo?: React.ReactNode;
  orderForm?: React.ReactNode;
  positions?: React.ReactNode;
}

export function TerminalPage({ watchlist, chart, marketInfo, orderForm, positions }: TerminalPageProps) {
  return (
    <div className="terminal-wrapper">
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
