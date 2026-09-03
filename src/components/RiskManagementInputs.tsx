import React from 'react';
import { Target, AlertTriangle, ArrowDownRight, ArrowUpRight, Percent } from 'lucide-react';

interface RiskManagementInputsProps {
  entryPrice: number;
  side: 'BUY' | 'SELL';
  stopLossPrice: string;
  takeProfitPrice: string;
  onChangeStopLoss: (val: string) => void;
  onChangeTakeProfit: (val: string) => void;
  quantity?: number;
  disabled?: boolean;
}

export const RiskManagementInputs: React.FC<RiskManagementInputsProps> = ({
  entryPrice,
  side,
  stopLossPrice,
  takeProfitPrice,
  onChangeStopLoss,
  onChangeTakeProfit,
  quantity = 1,
  disabled = false,
}) => {
  const isLong = side === 'BUY';

  const slNum = parseFloat(stopLossPrice);
  const tpNum = parseFloat(takeProfitPrice);

  // Calculate percentage distances
  const slPct =
    entryPrice > 0 && !isNaN(slNum) && slNum > 0
      ? isLong
        ? ((entryPrice - slNum) / entryPrice) * 100
        : ((slNum - entryPrice) / entryPrice) * 100
      : 0;

  const tpPct =
    entryPrice > 0 && !isNaN(tpNum) && tpNum > 0
      ? isLong
        ? ((tpNum - entryPrice) / entryPrice) * 100
        : ((entryPrice - tpNum) / entryPrice) * 100
      : 0;

  // Calculate Risk / Reward Ratio
  const rrRatio = slPct > 0 && tpPct > 0 ? (tpPct / slPct).toFixed(1) : null;
  const isHealthyRR = rrRatio !== null && parseFloat(rrRatio) >= 2.0;

  // Calculate estimated PnL in USDT
  const estLossUsdt = slPct > 0 && quantity > 0 ? (entryPrice * quantity * (slPct / 100)).toFixed(2) : '0.00';
  const estProfitUsdt = tpPct > 0 && quantity > 0 ? (entryPrice * quantity * (tpPct / 100)).toFixed(2) : '0.00';

  const handleApplyPreset = (presetSlPct: number, presetTpPct: number) => {
    if (entryPrice <= 0) return;
    const newSl = isLong ? entryPrice * (1 - presetSlPct / 100) : entryPrice * (1 + presetSlPct / 100);
    const newTp = isLong ? entryPrice * (1 + presetTpPct / 100) : entryPrice * (1 - presetTpPct / 100);
    onChangeStopLoss(newSl.toFixed(entryPrice >= 10 ? 2 : 4));
    onChangeTakeProfit(newTp.toFixed(entryPrice >= 10 ? 2 : 4));
  };

  return (
    <div id="risk-management-inputs" className="flex flex-col gap-2.5 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
      {/* Header with R:B Badge */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Target className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-semibold">Gestión de Riesgo Automatizada (SL / TP):</span>
        </div>

        {rrRatio ? (
          <span
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
              isHealthyRR
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}
            title="Relación Riesgo/Beneficio calculada en tiempo real"
          >
            R:B 1:{rrRatio} {isHealthyRR ? '✓ (Óptimo >= 1:2)' : '⚠️ (< 1:2)'}
          </span>
        ) : (
          <span className="text-[10px] text-neutral-500 font-mono">Sin TP/SL activo</span>
        )}
      </div>

      {/* Inputs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Stop Loss Field */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-rose-400 font-semibold flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3" /> Stop-Loss (SL)
            </span>
            {slPct > 0 && (
              <span className="text-rose-400 font-mono text-[10px]">
                -{slPct.toFixed(2)}% (-${estLossUsdt})
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              disabled={disabled}
              value={stopLossPrice}
              onChange={(e) => onChangeStopLoss(e.target.value)}
              placeholder={entryPrice > 0 ? (isLong ? (entryPrice * 0.98).toFixed(2) : (entryPrice * 1.02).toFixed(2)) : 'Precio SL'}
              className="w-full bg-neutral-900 border border-neutral-750 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-hidden"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-mono">
              USDT
            </span>
          </div>
        </div>

        {/* Take Profit Field */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" /> Take-Profit (TP)
            </span>
            {tpPct > 0 && (
              <span className="text-emerald-400 font-mono text-[10px]">
                +{tpPct.toFixed(2)}% (+${estProfitUsdt})
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              disabled={disabled}
              value={takeProfitPrice}
              onChange={(e) => onChangeTakeProfit(e.target.value)}
              placeholder={entryPrice > 0 ? (isLong ? (entryPrice * 1.05).toFixed(2) : (entryPrice * 0.95).toFixed(2)) : 'Precio TP'}
              className="w-full bg-neutral-900 border border-neutral-750 focus:border-emerald-500 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white placeholder-neutral-600 focus:outline-hidden"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-neutral-500 font-mono">
              USDT
            </span>
          </div>
        </div>
      </div>

      {/* Preset Quick R:B Buttons */}
      <div className="flex items-center gap-1.5 pt-1">
        <span className="text-[10px] text-neutral-500 font-mono shrink-0">Preajustes R/B:</span>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={disabled || entryPrice <= 0}
            onClick={() => handleApplyPreset(1.0, 3.0)}
            className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-300 hover:text-emerald-300 border border-neutral-750 transition-colors"
            title="Estrategia 1: SL 1% / TP 3% (1:3)"
          >
            1:3 (SL 1% / TP 3%)
          </button>
          <button
            type="button"
            disabled={disabled || entryPrice <= 0}
            onClick={() => handleApplyPreset(1.5, 4.5)}
            className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-300 hover:text-emerald-300 border border-neutral-750 transition-colors"
            title="Estrategia 2: SL 1.5% / TP 4.5% (1:3)"
          >
            1:3 (SL 1.5% / TP 4.5%)
          </button>
          <button
            type="button"
            disabled={disabled || entryPrice <= 0}
            onClick={() => handleApplyPreset(2.0, 5.0)}
            className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-mono text-neutral-300 hover:text-emerald-300 border border-neutral-750 transition-colors"
            title="Estrategia 3: SL 2% / TP 5% (1:2.5)"
          >
            1:2.5 (SL 2% / TP 5%)
          </button>
        </div>
      </div>
    </div>
  );
};
