import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Layers,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { positionsExpansionService } from '../services/positionsExpansionService';
import { binanceWs } from '../services/binanceWs';

interface ExpandCollapseAllToggleProps {
  /**
   * Target symbols to manage. If omitted, uses active positions from binanceWs.
   */
  symbols?: string[];
  /**
   * Visual style variant:
   * - 'smart-toggle': Single dynamic button that switches between Expand All and Collapse All
   * - 'segmented': Two connected buttons (Expand All / Collapse All) with active indicators
   * - 'compact': Small button for toolbars and compact headers
   */
  variant?: 'smart-toggle' | 'segmented' | 'compact';
  className?: string;
  showBadge?: boolean;
  onToggleChange?: (allExpanded: boolean) => void;
}

export const ExpandCollapseAllToggle: React.FC<ExpandCollapseAllToggleProps> = ({
  symbols,
  variant = 'smart-toggle',
  className = '',
  showBadge = true,
  onToggleChange,
}) => {
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const unsubService = positionsExpansionService.subscribe(() => {
      setTick((t) => t + 1);
    });
    const unsubWs = binanceWs.subscribe(() => {
      setTick((t) => t + 1);
    });

    return () => {
      unsubService();
      unsubWs();
    };
  }, []);

  const activeSymbols = symbols && symbols.length > 0
    ? symbols
    : binanceWs.getPositions().map((p) => p.symbol);

  const totalCount = activeSymbols.length;
  const expandedCount = positionsExpansionService.getExpandedCount(activeSymbols);
  const areAllExpanded = totalCount > 0 && expandedCount === totalCount;
  const areAllCollapsed = totalCount > 0 && expandedCount === 0;
  const isPartial = totalCount > 0 && expandedCount > 0 && expandedCount < totalCount;

  if (totalCount === 0) {
    return null; // Don't render toggle if there are no active positions
  }

  const handleSmartToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = positionsExpansionService.toggleAll(activeSymbols);
    if (onToggleChange) onToggleChange(result);
  };

  const handleExpandAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    positionsExpansionService.expandAll(activeSymbols);
    if (onToggleChange) onToggleChange(true);
  };

  const handleCollapseAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    positionsExpansionService.collapseAll();
    if (onToggleChange) onToggleChange(false);
  };

  // 1. SEGMENTED VARIANT
  if (variant === 'segmented') {
    return (
      <div
        id="toggle-expand-collapse-segmented"
        className={`inline-flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 shadow-xs select-none ${className}`}
      >
        <button
          type="button"
          id="btn-segmented-expand-all"
          onClick={handleExpandAll}
          title={`Expandir todas las posiciones simultáneamente (${totalCount} posición${totalCount !== 1 ? 'es' : ''})`}
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            areAllExpanded
              ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40 shadow-xs font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
        >
          <ChevronsDown className="w-3.5 h-3.5 text-amber-400" />
          <span>Expandir Todas</span>
          {showBadge && (
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                areAllExpanded
                  ? 'bg-amber-500/30 text-amber-200'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              {totalCount}
            </span>
          )}
        </button>

        <button
          type="button"
          id="btn-segmented-collapse-all"
          onClick={handleCollapseAll}
          title="Comprimir todas las posiciones para vista compacta"
          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            areAllCollapsed
              ? 'bg-neutral-800 text-white border border-neutral-700 shadow-xs font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
          }`}
        >
          <ChevronsUp className="w-3.5 h-3.5 text-neutral-400" />
          <span>Comprimir Todas</span>
          {showBadge && expandedCount > 0 && (
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-neutral-800 text-amber-400">
              {expandedCount}
            </span>
          )}
        </button>
      </div>
    );
  }

  // 2. COMPACT VARIANT
  if (variant === 'compact') {
    return (
      <button
        type="button"
        id="btn-toggle-expand-collapse-compact"
        onClick={handleSmartToggle}
        title={
          areAllExpanded
            ? 'Comprimir todas las posiciones activas'
            : `Desplegar detalles e hitos de las ${totalCount} posiciones simultáneamente`
        }
        className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border shadow-xs cursor-pointer active:scale-95 select-none ${
          areAllExpanded
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
            : isPartial
            ? 'bg-neutral-900 text-amber-300 border-amber-500/30 hover:bg-neutral-800'
            : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border-neutral-800'
        } ${className}`}
      >
        {areAllExpanded ? (
          <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
        )}
        <span>{areAllExpanded ? 'Comprimir' : 'Expandir'}</span>
        {showBadge && (
          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-neutral-950/80 text-amber-300 border border-neutral-800">
            {expandedCount}/{totalCount}
          </span>
        )}
      </button>
    );
  }

  // 3. SMART TOGGLE (DEFAULT)
  return (
    <button
      type="button"
      id="btn-toggle-expand-collapse-all"
      onClick={handleSmartToggle}
      title={
        areAllExpanded
          ? `Todas las ${totalCount} posiciones están expandidas. Clic para comprimirlas.`
          : `Clic para expandir detalles tácticos e hitos de las ${totalCount} posiciones simultáneamente.`
      }
      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all border shadow-xs cursor-pointer active:scale-95 select-none ${
        areAllExpanded
          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-amber-500/5'
          : isPartial
          ? 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border-amber-500/40'
          : 'bg-neutral-950 hover:bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800 hover:border-amber-500/40'
      } ${className}`}
    >
      {areAllExpanded ? (
        <>
          <ChevronsUp className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold">Colapsar Todas</span>
        </>
      ) : (
        <>
          <ChevronsDown className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold">Expandir Todas</span>
        </>
      )}

      {showBadge && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-bold border transition-colors ${
            areAllExpanded
              ? 'bg-amber-500 text-neutral-950 border-amber-400'
              : isPartial
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              : 'bg-neutral-900 text-neutral-400 border-neutral-800'
          }`}
        >
          {expandedCount}/{totalCount}
        </span>
      )}
    </button>
  );
};
