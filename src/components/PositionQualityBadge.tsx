import React from 'react';
import { ScoredPosition } from '../utils/positionRanker';
import { Award, ShieldAlert, Zap, Scale, Sparkles, TrendingUp } from 'lucide-react';

interface PositionQualityBadgeProps {
  scored: ScoredPosition;
  showDetails?: boolean;
}

export const PositionQualityBadge: React.FC<PositionQualityBadgeProps> = ({
  scored,
  showDetails = true,
}) => {
  const {
    rank,
    isBest,
    confluenceMetCount,
    confluencePercent,
    effectiveRB,
    rbFormatted,
    hasSL,
    qualityScore,
    qualityTier,
    rankBadgeClass,
  } = scored;

  return (
    <div className="flex flex-col gap-1.5 font-sans">
      {/* Top line: Rank & Overall Quality Score */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${rankBadgeClass}`}
          title={`Posición clasificada #${rank} de acuerdo con su confluencia técnica e institucional y ratio R:B`}
        >
          {rank === 1 ? (
            <>
              <Award className="w-3 h-3 text-amber-950 fill-amber-950" />
              <span>#1 MEJOR</span>
            </>
          ) : rank === 2 ? (
            <span>#2</span>
          ) : rank === 3 ? (
            <span>#3</span>
          ) : !hasSL ? (
            <>
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>#{rank} SIN SL</span>
            </>
          ) : (
            <span>#{rank}</span>
          )}
        </span>

        {/* Quality Score Pill */}
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold border ${
            qualityTier === 'ELITE'
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40'
              : qualityTier === 'STRONG'
              ? 'bg-emerald-950/50 text-emerald-400 border-emerald-700/40'
              : qualityTier === 'MODERATE'
              ? 'bg-amber-950/50 text-amber-300 border-amber-500/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-600/40'
          }`}
          title={`Puntaje de Calidad: ${qualityScore}/100 (60% Confluencia, 40% R:B, disciplina de SL)`}
        >
          <Sparkles className="w-2.5 h-2.5 opacity-75" />
          <span>{qualityScore} pts</span>
        </span>
      </div>

      {/* Second line: Confluence & R:B Metrics Chips */}
      {showDetails && (
        <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono">
          {/* Confluence Chip */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-700/80 ${
              confluenceMetCount >= 8
                ? 'text-emerald-400 border-emerald-500/30'
                : confluenceMetCount >= 6
                ? 'text-emerald-300 border-emerald-600/30'
                : confluenceMetCount >= 4
                ? 'text-amber-300 border-amber-500/30'
                : 'text-neutral-400'
            }`}
            title={`Confluencia Técnica e Institucional: ${confluenceMetCount}/10 factores alineados (${confluencePercent}%)`}
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>{confluenceMetCount}/10 ({confluencePercent}%)</span>
          </span>

          {/* R:B Chip */}
          <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/90 border ${
              !hasSL
                ? 'text-rose-400 border-rose-500/50 bg-rose-950/40'
                : effectiveRB >= 2.5
                ? 'text-emerald-400 border-emerald-500/40'
                : effectiveRB >= 1.8
                ? 'text-cyan-300 border-cyan-500/40'
                : effectiveRB >= 1.2
                ? 'text-amber-300 border-amber-500/30'
                : 'text-neutral-400 border-neutral-700'
            }`}
            title={
              hasSL
                ? `Ratio Riesgo:Beneficio: ${rbFormatted}`
                : 'Peligro: Posición sin Stop Loss colocado en la orden o estrategia'
            }
          >
            <Scale className="w-2.5 h-2.5 opacity-80" />
            <span className="font-semibold">{rbFormatted}</span>
          </span>
        </div>
      )}
    </div>
  );
};
