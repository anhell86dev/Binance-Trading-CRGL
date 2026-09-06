import React, { useState } from 'react';
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
  SlidersHorizontal,
  Check,
  RotateCcw,
  Info,
  ChevronDown,
  ChevronUp,
  Target,
  Sliders,
} from 'lucide-react';
import {
  ConfluenceFactorKey,
  ConfluenceMatchMode,
  ConfluencePreset,
  ConfluenceFactorDefinition,
} from '../types/confluence';
import { CONFLUENCE_FACTOR_DEFINITIONS } from '../utils/confluenceEngine';

interface ConfluenceFactorSelectorProps {
  selectedFactors: Set<ConfluenceFactorKey>;
  onToggleFactor: (key: ConfluenceFactorKey) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onApplyPreset: (preset: ConfluencePreset) => void;
  activePreset: ConfluencePreset;
  matchMode: ConfluenceMatchMode;
  onChangeMatchMode: (mode: ConfluenceMatchMode) => void;
  minMetCount: number;
  onChangeMinMetCount: (count: number) => void;
  factorMatchCounts: Record<ConfluenceFactorKey, number>;
  totalStrategiesCount: number;
  filteredStrategiesCount: number;
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

export const ConfluenceFactorSelector: React.FC<ConfluenceFactorSelectorProps> = ({
  selectedFactors,
  onToggleFactor,
  onClearAll,
  onApplyPreset,
  activePreset,
  matchMode,
  onChangeMatchMode,
  minMetCount,
  onChangeMinMetCount,
  factorMatchCounts,
  totalStrategiesCount,
  filteredStrategiesCount,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTabCategory, setActiveTabCategory] = useState<'ALL' | 'TECHNICAL' | 'DERIVATIVES' | 'STRUCTURE'>('ALL');

  const categories = [
    { id: 'ALL', label: 'Todos los Factores' },
    { id: 'TECHNICAL', label: 'Indicadores Técnicos (RSI, EMA, MACD...)' },
    { id: 'DERIVATIVES', label: 'Derivados Binance (Taker, Top Traders...)' },
    { id: 'STRUCTURE', label: 'Estructura & Zonas (S/R, E1, R:B)' },
  ] as const;

  const displayedFactors = CONFLUENCE_FACTOR_DEFINITIONS.filter(
    (f) => activeTabCategory === 'ALL' || f.category === activeTabCategory
  );

  return (
    <div
      id="confluence-factor-selector-panel"
      className="bg-neutral-900/95 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 shadow-xl flex flex-col gap-3 relative overflow-hidden backdrop-blur-md"
    >
      {/* Decorative gradient glow */}
      <div className="absolute top-0 left-1/3 w-64 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* 1. Header with Controls and Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Selector de Factores de Confluencia</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                {selectedFactors.size} Activo{selectedFactors.size !== 1 ? 's' : ''}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
                {filteredStrategiesCount} de {totalStrategiesCount} Estrategias Filtradas
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Filtra automáticamente las estrategias combinando indicadores técnicos, flujo institucional y zonas clave.
            </p>
          </div>
        </div>

        {/* Action buttons: Reset & Expand/Collapse */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          {selectedFactors.size > 0 && (
            <button
              id="btn-clear-confluence-factors"
              onClick={onClearAll}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 hover:text-white transition-all flex items-center gap-1"
              title="Restablecer filtros de confluencia"
            >
              <RotateCcw className="w-3 h-3 text-neutral-400" />
              <span>Limpiar Filtro</span>
            </button>
          )}

          <button
            id="btn-toggle-expand-confluence"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-all"
            title={isExpanded ? 'Contraer selector' : 'Expandir selector'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Quick Presets Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-thin">
        <span className="text-neutral-400 text-[10px] uppercase font-bold shrink-0 mr-1 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Presets:</span>
        </span>

        <button
          id="preset-max-confluence"
          onClick={() => onApplyPreset('MAX_CONFLUENCE')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
            activePreset === 'MAX_CONFLUENCE'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold shadow-xs'
              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-emerald-500/40 hover:text-white'
          }`}
          title="RSI + EMA + Soporte/Resistencia + Flujo Institucional"
        >
          <Crown className="w-3 h-3 text-emerald-400" />
          <span>🎯 Máxima Confluencia</span>
        </button>

        <button
          id="preset-support-bounce"
          onClick={() => onApplyPreset('SUPPORT_BOUNCE')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
            activePreset === 'SUPPORT_BOUNCE'
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 font-bold shadow-xs'
              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-amber-500/40 hover:text-white'
          }`}
          title="Soporte/Resistencia + En Zona E1 + RSI"
        >
          <Shield className="w-3 h-3 text-amber-400" />
          <span>🛡️ Rebote en Soporte (E1)</span>
        </button>

        <button
          id="preset-institutional-flow"
          onClick={() => onApplyPreset('INSTITUTIONAL_FLOW')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
            activePreset === 'INSTITUTIONAL_FLOW'
              ? 'bg-violet-500/20 text-violet-300 border-violet-500/60 font-bold shadow-xs'
              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-violet-500/40 hover:text-white'
          }`}
          title="Taker Buy/Sell + Top Traders + Funding/OI"
        >
          <Zap className="w-3 h-3 text-violet-400" />
          <span>⚡ Flujo Institucional Binance</span>
        </button>

        <button
          id="preset-swing-trend"
          onClick={() => onApplyPreset('SWING_TREND')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
            activePreset === 'SWING_TREND'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/60 font-bold shadow-xs'
              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-blue-500/40 hover:text-white'
          }`}
          title="EMA 20/50 + MACD + Bollinger"
        >
          <TrendingUp className="w-3 h-3 text-blue-400" />
          <span>📈 Tendencia EMA & MACD</span>
        </button>

        <button
          id="preset-high-rb"
          onClick={() => onApplyPreset('HIGH_RB_ZONE')}
          className={`px-2.5 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1.5 ${
            activePreset === 'HIGH_RB_ZONE'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-bold shadow-xs'
              : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-emerald-500/40 hover:text-white'
          }`}
          title="Alto R:B (≥ 2.5:1) + En Zona E1"
        >
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>💎 Alto R:B (≥2.5) & Gatillo</span>
        </button>
      </div>

      {isExpanded && (
        <>
          {/* 3. Match Mode & Logic Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800">
            {/* Category tabs */}
            <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveTabCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-md transition-all shrink-0 ${
                    activeTabCategory === cat.id
                      ? 'bg-neutral-800 text-white font-bold border border-neutral-700'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filter Logic: ALL (AND) vs MIN_COUNT vs ANY (OR) */}
            <div className="flex items-center gap-2 self-start sm:self-center font-mono text-[11px] shrink-0">
              <span className="text-neutral-500 text-[10px]">Criterio:</span>
              <div className="flex items-center bg-neutral-900 p-0.5 rounded-lg border border-neutral-800">
                <button
                  id="match-mode-all"
                  onClick={() => onChangeMatchMode('ALL_SELECTED')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    matchMode === 'ALL_SELECTED'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="La estrategia debe cumplir TODOS los factores seleccionados"
                >
                  Todos (AND)
                </button>

                <button
                  id="match-mode-min"
                  onClick={() => onChangeMatchMode('MIN_COUNT')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 ${
                    matchMode === 'MIN_COUNT'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="La estrategia debe cumplir al menos un número mínimo de factores"
                >
                  <span>Mínimo</span>
                  <select
                    value={minMetCount}
                    onChange={(e) => {
                      onChangeMinMetCount(Number(e.target.value));
                      onChangeMatchMode('MIN_COUNT');
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-neutral-950 text-white font-bold text-[10px] rounded px-1 py-0 border border-neutral-700 ml-0.5"
                  >
                    {[1, 2, 3, 4, 5, 6].map((num) => (
                      <option key={num} value={num}>
                        {num}+
                      </option>
                    ))}
                  </select>
                </button>

                <button
                  id="match-mode-any"
                  onClick={() => onChangeMatchMode('ANY_SELECTED')}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                    matchMode === 'ANY_SELECTED'
                      ? 'bg-amber-400 text-neutral-950 font-bold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Basta con que la estrategia cumpla cualquiera de los factores seleccionados"
                >
                  Cualquiera (OR)
                </button>
              </div>
            </div>
          </div>

          {/* 4. Multi-Select Factors Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-1">
            {displayedFactors.map((factor) => {
              const isSelected = selectedFactors.has(factor.key);
              const count = factorMatchCounts[factor.key] || 0;
              const IconComponent = FACTOR_ICONS[factor.iconName] || Activity;

              return (
                <button
                  key={factor.key}
                  id={`factor-toggle-${factor.key}`}
                  onClick={() => onToggleFactor(factor.key)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between gap-1.5 group ${
                    isSelected
                      ? `${factor.bgActive} ${factor.borderActive} shadow-xs ring-1 ring-amber-500/20`
                      : 'bg-neutral-950/70 border-neutral-800/90 hover:border-neutral-700 hover:bg-neutral-900/60'
                  }`}
                  title={`${factor.description}\n${factor.tooltipLong}\n${factor.tooltipShort}`}
                >
                  {/* Top row: Icon, Name & Check indicator */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          isSelected
                            ? `${factor.bgActive} text-white font-bold`
                            : 'bg-neutral-900 text-neutral-400 group-hover:text-neutral-200'
                        }`}
                      >
                        <IconComponent className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-xs font-bold font-mono tracking-tight leading-tight ${
                          isSelected ? factor.textActive : 'text-neutral-300 group-hover:text-white'
                        }`}
                      >
                        {factor.shortName}
                      </span>
                    </div>

                    {/* Checkbox badge */}
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 ${
                        isSelected
                          ? 'bg-amber-400 text-neutral-950 font-extrabold'
                          : 'border border-neutral-700 bg-neutral-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Middle row: Description preview */}
                  <div className="text-[10px] text-neutral-400 font-sans line-clamp-1 leading-tight">
                    {factor.description}
                  </div>

                  {/* Bottom row: Matches count pill */}
                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-neutral-800/60 mt-0.5">
                    <span className="text-neutral-500">{factor.categoryLabel.split(' ')[0]}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold ${
                        count > 0
                          ? isSelected
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-neutral-900 text-neutral-300'
                          : 'text-neutral-600'
                      }`}
                    >
                      {count} {count === 1 ? 'par' : 'pares'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
