import React, { useState, useRef, useEffect } from 'react';
import {
  Activity,
  TrendingUp,
  Shield,
  BarChart2,
  Layers,
  Zap,
  Crown,
  DollarSign,
  Sparkles,
  Flame,
  ChevronRight,
  Info,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import {
  StrategyFullConfluenceResult,
  ConfluenceFactorKey,
} from '../types/confluence';
import { CONFLUENCE_FACTOR_DEFINITIONS } from '../utils/confluenceEngine';

interface StrategyConfluenceDetailBadgeProps {
  confluence: StrategyFullConfluenceResult;
  compact?: boolean;
}

const FACTOR_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Activity,
  TrendingUp,
  Shield,
  BarChart2,
  Layers,
  Zap,
  Crown,
  DollarSign,
  Sparkles,
  Flame,
};

export const StrategyConfluenceDetailBadge: React.FC<StrategyConfluenceDetailBadgeProps> = ({
  confluence,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const metFactorsList = Object.values(confluence.factors).filter((f) => f.isMet);
  const unmetFactorsList = Object.values(confluence.factors).filter((f) => !f.isMet);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Trigger Button / Badge */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`rounded-lg transition-all flex items-center gap-1.5 border text-left ${
          compact ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } ${
          confluence.metFactorsCount >= 6
            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-xs'
            : confluence.metFactorsCount >= 4
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
            : 'bg-neutral-800/80 border-neutral-700 text-neutral-300 hover:bg-neutral-700/80'
        }`}
        title="Ver desglose completo de factores de confluencia técnica e institucional"
      >
        <div className="flex items-center gap-1">
          {confluence.metFactorsCount >= 6 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          ) : confluence.metFactorsCount >= 4 ? (
            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          )}
          <span className="font-mono font-bold">
            {confluence.metFactorsCount}/{confluence.totalFactorsCount}
          </span>
        </div>

        <span className="font-sans font-semibold hidden sm:inline">
          {confluence.metFactorsCount >= 7
            ? 'Alta Confluencia'
            : confluence.metFactorsCount >= 5
            ? 'Fuerte'
            : confluence.metFactorsCount >= 3
            ? 'Moderada'
            : 'Baja'}
        </span>

        {/* Progress dot bar */}
        <div className="flex items-center gap-0.5 ml-0.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = (confluence.metFactorsCount / confluence.totalFactorsCount) * 5 > i;
            return (
              <span
                key={i}
                className={`w-1 h-2 rounded-xs ${
                  filled
                    ? confluence.metFactorsCount >= 6
                      ? 'bg-emerald-400'
                      : 'bg-amber-400'
                    : 'bg-neutral-700'
                }`}
              />
            );
          })}
        </div>
      </button>

      {/* Popover Dropdown with Full 10 Factors Breakdown */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1.5 left-0 sm:right-0 sm:left-auto w-80 sm:w-96 bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl p-4 text-neutral-100 flex flex-col gap-3 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Popover Header */}
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                  confluence.metFactorsCount >= 6
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                }`}
              >
                {confluence.metFactorsCount}/{confluence.totalFactorsCount}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Confluencia: {confluence.symbol}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      confluence.isLong
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {confluence.isLong ? 'LONG' : 'SHORT'}
                  </span>
                </div>
                <div className="text-[11px] text-neutral-400 font-sans">
                  {confluence.tierLabel} ({confluence.confluenceScorePercent}%)
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-white text-xs font-mono p-1 rounded-md hover:bg-neutral-800"
            >
              ✕
            </button>
          </div>

          {/* Factors List: Met vs Unmet */}
          <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
            <div className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider font-bold">
              Factores Validados ({metFactorsList.length})
            </div>

            {metFactorsList.map((factor) => {
              const def = CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === factor.factorKey);
              const IconComponent = def ? FACTOR_ICONS[def.iconName] || Activity : Activity;

              return (
                <div
                  key={factor.factorKey}
                  className="bg-neutral-900/90 border border-emerald-500/30 rounded-xl p-2 flex items-start gap-2 text-xs"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-emerald-300 font-mono text-[11px]">
                        {def?.name || factor.factorKey}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        {factor.badgeValue}
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 mt-0.5 font-sans leading-tight">
                      {factor.detail}
                    </p>
                  </div>
                </div>
              );
            })}

            {unmetFactorsList.length > 0 && (
              <>
                <div className="text-[10px] font-mono text-neutral-500 uppercase tracking-wider font-bold mt-1">
                  Factores No Cumplidos / Neutrales ({unmetFactorsList.length})
                </div>

                {unmetFactorsList.map((factor) => {
                  const def = CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === factor.factorKey);

                  return (
                    <div
                      key={factor.factorKey}
                      className="bg-neutral-950 border border-neutral-800 rounded-xl p-2 flex items-start gap-2 text-xs opacity-75"
                    >
                      <XCircle className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold text-neutral-400 font-mono text-[11px]">
                            {def?.name || factor.factorKey}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 text-neutral-400">
                            {factor.badgeValue}
                          </span>
                        </div>
                        <p className="text-[11px] text-neutral-500 mt-0.5 font-sans leading-tight">
                          {factor.detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
