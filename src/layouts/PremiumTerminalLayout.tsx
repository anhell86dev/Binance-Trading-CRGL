import React, { useState } from 'react';
import { PanelHeader } from '../components/ui/PanelHeader';

export type TerminalMobileTab = 'chart' | 'order' | 'positions';

interface PremiumTerminalLayoutProps {
  watchlist?: React.ReactNode;
  chart: React.ReactNode;
  marketInfo?: React.ReactNode;
  orderForm?: React.ReactNode;
  positions?: React.ReactNode;
  className?: string;
  activeMobileTab?: TerminalMobileTab;
}

export function PremiumTerminalLayout({
  watchlist,
  chart,
  marketInfo,
  orderForm,
  positions,
  className = '',
  activeMobileTab = 'chart',
}: PremiumTerminalLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <section
      className={`premium-terminal ${className} premium-terminal--mobile-${activeMobileTab} ${!leftOpen ? 'premium-terminal--left-collapsed' : ''} ${!rightOpen ? 'premium-terminal--right-collapsed' : ''}`}
    >
      <aside className="premium-terminal__side premium-terminal__side--left">
        <PanelHeader title="Watchlist" onToggle={() => setLeftOpen((value) => !value)} collapsed={!leftOpen} />
        {leftOpen && <div className="premium-terminal__side-content premium-terminal__legacy-content">{watchlist}</div>}
      </aside>

      <div className="premium-terminal__workspace">
        <div className="premium-terminal__chart premium-terminal__mobile-panel premium-terminal__mobile-panel--chart">
          <div className="premium-terminal__legacy-content">{chart}</div>
        </div>
        {orderForm && (
          <div className="premium-terminal__order premium-terminal__mobile-panel premium-terminal__mobile-panel--order">
            <div className="premium-terminal__legacy-content">{orderForm}</div>
          </div>
        )}
        {positions && (
          <div className="premium-terminal__positions premium-terminal__mobile-panel premium-terminal__mobile-panel--positions">
            <div className="premium-terminal__legacy-content">{positions}</div>
          </div>
        )}
      </div>

      <aside className="premium-terminal__side premium-terminal__side--right">
        <PanelHeader title="Informacion del activo" onToggle={() => setRightOpen((value) => !value)} collapsed={!rightOpen} />
        {rightOpen && <div className="premium-terminal__side-content premium-terminal__legacy-content">{marketInfo}</div>}
      </aside>
    </section>
  );
}
