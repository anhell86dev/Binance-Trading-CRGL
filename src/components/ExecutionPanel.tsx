import React from 'react';
import { RiskProtocolWidget } from './RiskProtocolWidget';
import { OrderForm } from './OrderForm';

export const ExecutionPanel: React.FC = () => {
  return (
    <div id="execution_panel_container" className="flex flex-col gap-3 h-full overflow-y-auto pr-0.5 custom-scrollbar">
      {/* Risk Protocol Widget: Margin Ratio, Stacked Progress Bar, Balances */}
      <RiskProtocolWidget />

      {/* Semantic Separation Divider */}
      <div className="border-t border-neutral-800/80 my-0.5" />

      {/* Order Execution Form: ISOLATED 1-5x, Stepped TP/SL, Optimistic UI */}
      <OrderForm />
    </div>
  );
};
