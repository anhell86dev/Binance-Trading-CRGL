import React from 'react';
import { AlertCircle, ShieldCheck, ShieldAlert } from 'lucide-react';

interface LiquidationPreviewProps {
  entryPrice: number;
  side: 'BUY' | 'SELL';
  leverage: number; // 1-5x strictly
  marginType?: 'ISOLATED';
}

export const LiquidationPreview: React.FC<LiquidationPreviewProps> = ({
  entryPrice,
  side,
  leverage,
}) => {
  const safeLev = Math.min(5, Math.max(1, leverage));
  const isLong = side === 'BUY';

  // Binance USD(S)-M Futures Maintenance Margin Rate for Tier 1 (~0.4% to 0.5%)
  const mmr = 0.005; // 0.5%

  // Formula for Isolated Margin Liquidation Price in Binance Futures:
  // For Long: LiqPrice = EntryPrice * (1 - (1/Leverage) + MMR)
  // For Short: LiqPrice = EntryPrice * (1 + (1/Leverage) - MMR)
  let estimatedLiqPrice = 0;
  let liqDistancePct = 0;

  if (entryPrice > 0) {
    if (isLong) {
      estimatedLiqPrice = entryPrice * (1 - 1 / safeLev + mmr);
      liqDistancePct = ((estimatedLiqPrice - entryPrice) / entryPrice) * 100;
    } else {
      estimatedLiqPrice = entryPrice * (1 + 1 / safeLev - mmr);
      liqDistancePct = ((estimatedLiqPrice - entryPrice) / entryPrice) * 100;
    }
  }

  const isUltraSafe = safeLev <= 2;
  const isSafe = safeLev <= 4;

  return (
    <div
      id="liquidation-preview-card"
      className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
            isUltraSafe
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : isSafe
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
          }`}
        >
          {isUltraSafe ? (
            <ShieldCheck className="w-3.5 h-3.5" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5" />
          )}
        </div>

        <div>
          <div className="text-[11px] text-neutral-400">
            <span>Precio de Liquidación Estimado: </span>
            <strong className="text-white font-mono text-xs">
              {entryPrice > 0 ? `$${estimatedLiqPrice.toFixed(entryPrice >= 10 ? 2 : 4)}` : '$0.00'}
            </strong>
          </div>
          <p className="text-[10px] text-neutral-500 font-mono mt-0.2">
            Margen Aislado ({safeLev}x): Liquidación a{' '}
            <strong className={isLong ? 'text-rose-400' : 'text-amber-400'}>
              {liqDistancePct > 0 ? `+${liqDistancePct.toFixed(1)}%` : `${liqDistancePct.toFixed(1)}%`}
            </strong>{' '}
            del precio de entrada.
          </p>
        </div>
      </div>

      <div className="text-right shrink-0">
        <span
          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
            isUltraSafe
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : isSafe
              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
          }`}
        >
          {isUltraSafe ? 'Buffer Seguro (50%)' : isSafe ? 'Buffer Seguro (33%)' : 'Buffer Seguro (20%)'}
        </span>
      </div>
    </div>
  );
};
