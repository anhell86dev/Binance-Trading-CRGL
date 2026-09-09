import React, { useState, memo } from 'react';
import {
  ChevronRight,
  Layers,
  Maximize2,
  Shield,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { OrderForm } from './OrderForm';
import { OrderControlPanel } from './OrderControlPanel';

interface TerminalOrderControlPanelProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onPopOutModal?: () => void;
}

export const TerminalOrderControlPanel: React.FC<TerminalOrderControlPanelProps> = memo(({
  isCollapsed = false,
  onToggleCollapse,
  onPopOutModal,
}) => {
  const [activeFormMode, setActiveFormMode] = useState<'control' | 'advanced'>('control');

  if (isCollapsed) {
    return (
      <aside
        id="terminal-order-panel-collapsed"
        className="w-12 bg-neutral-950/95 border-l border-neutral-800 flex flex-col items-center py-3 gap-3 shrink-0 select-none shadow-lg"
      >
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-400 hover:text-amber-300 border border-neutral-800 transition-all"
          title="Expandir Panel de Órdenes"
        >
          <Sliders className="w-4 h-4" />
        </button>

        <div className="w-6 h-[1px] bg-neutral-800 my-1" />

        {onPopOutModal && (
          <button
            type="button"
            onClick={onPopOutModal}
            className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition-all"
            title="Abrir orden en ventana emergente"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </aside>
    );
  }

  return (
    <aside
      id="terminal-order-panel-container"
      className="w-80 sm:w-88 lg:w-96 bg-neutral-950/95 border-l border-neutral-800 flex flex-col h-full overflow-y-auto shrink-0 select-none shadow-xl z-10 scrollbar-thin scrollbar-thumb-neutral-800"
    >
      {/* Top Selector: Order Control Panel vs Advanced Order Form */}
      <div className="p-2 pb-0 shrink-0">
        <div className="grid grid-cols-2 p-1 bg-neutral-900 rounded-lg border border-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveFormMode('control')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeFormMode === 'control'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            <span>Control 1-5x</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFormMode('advanced')}
            className={`py-1.5 px-2 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeFormMode === 'advanced'
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>Avanzado</span>
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-2.5 flex-1 flex flex-col">
        {activeFormMode === 'control' ? (
          <OrderControlPanel onPopOut={onPopOutModal} />
        ) : (
          <OrderForm isModal={false} onPopOut={onPopOutModal} />
        )}
      </div>
    </aside>
  );
});
