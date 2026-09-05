import React, { useState } from 'react';
import { PanelHeader } from '../components/ui/PanelHeader';

interface PremiumTerminalLayoutProps {
  watchlist?: React.ReactNode;
  chart: React.ReactNode;
  marketInfo?: React.ReactNode;
  orderForm?: React.ReactNode;
  positions?: React.ReactNode;
  className?: string;
}

export function PremiumTerminalLayout({
  watchlist,
  chart,
  marketInfo,
  orderForm,
  positions,
  className = '',
}: PremiumTerminalLayoutProps) {
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);

  return (
    <section className={`premium-terminal ${className} ${!leftOpen ? 'premium-terminal--left-collapsed' : ''} ${!rightOpen ? 'premium-terminal--right-collapsed' : ''}`}>
      <aside className="premium-terminal__side premium-terminal__side--left">
        <PanelHeader title="Watchlist" onToggle={() => setLeftOpen((value) => !value)} collapsed={!leftOpen} />
        {leftOpen && <div className="premium-terminal__side-content">{watchlist}</div>}
      </aside>

      <div className="premium-terminal__workspace">
        <div className="premium-terminal__chart">{chart}</div>
        {orderForm && <div className="premium-terminal__order">{orderForm}</div>}
        {positions && <div className="premium-terminal__positions">{positions}</div>}
      </div>

      <aside className="premium-terminal__side premium-terminal__side--right">
        <PanelHeader title="Informacion del activo" onToggle={() => setRightOpen((value) => !value)} collapsed={!rightOpen} />
        {rightOpen && <div className="premium-terminal__side-content">{marketInfo}</div>}
      </aside>
    </section>
  );
}
