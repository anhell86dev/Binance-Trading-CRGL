import React from 'react';
import {
  Zap,
  FileSpreadsheet,
  Code,
  Edit3,
  Layers,
  Clock,
} from 'lucide-react';
import { StrategySourceType } from '../types/strategy';

interface StrategySourceBadgeProps {
  source?: StrategySourceType;
  updatedAt?: string;
  showTime?: boolean;
  compact?: boolean;
}

export const StrategySourceBadge: React.FC<StrategySourceBadgeProps> = ({
  source = 'Catálogo Base',
  updatedAt,
  showTime = true,
  compact = false,
}) => {
  const getBadgeStyle = (src: StrategySourceType) => {
    switch (src) {
      case 'API':
        return {
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          label: 'API Google',
          Icon: Zap,
        };
      case 'Archivo Google Docs':
        return {
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          label: 'Archivo Google Docs',
          Icon: FileSpreadsheet,
        };
      case 'Datos Pegados CSV':
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
          label: 'Datos Pegados CSV',
          Icon: Code,
        };
      case 'Edición Manual':
        return {
          bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
          label: 'Edición Manual',
          Icon: Edit3,
        };
      case 'Catálogo Base':
      default:
        return {
          bg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
          label: 'Catálogo Base',
          Icon: Layers,
        };
    }
  };

  const style = getBadgeStyle(source);
  const Icon = style.Icon;

  return (
    <div className={`inline-flex items-center gap-1.5 flex-wrap ${compact ? 'text-[10px]' : 'text-xs'}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold border ${style.bg}`}
        title={`Fuente de datos: ${style.label}`}
      >
        <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>{style.label}</span>
      </span>

      {showTime && updatedAt && (
        <span className="inline-flex items-center gap-1 text-neutral-400 font-mono text-[10px]">
          <Clock className="w-2.5 h-2.5 text-neutral-500" />
          <span>{updatedAt}</span>
        </span>
      )}
    </div>
  );
};
