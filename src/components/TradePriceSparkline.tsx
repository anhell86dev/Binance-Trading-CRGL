import React, { useMemo } from 'react';
import { TradePriceHistory } from '../services/tradePriceHistoryService';

interface TradePriceSparklineProps {
  history: TradePriceHistory | null;
  entryPrice: number;
  currentPrice: number;
  isLong: boolean;
  width?: number | string;
  height?: number;
  showLabels?: boolean;
  className?: string;
}

export const TradePriceSparkline: React.FC<TradePriceSparklineProps> = ({
  history,
  entryPrice,
  currentPrice,
  isLong,
  width = '100%',
  height = 56,
  showLabels = true,
  className = '',
}) => {
  // Derive price series
  const rawPoints = useMemo(() => {
    if (history && history.points.length > 0) {
      return history.points.map((p) => p.price);
    }
    // Fallback: seed 3 points from entry to current
    const mid = (entryPrice + currentPrice) / 2;
    return [entryPrice, mid, currentPrice];
  }, [history, entryPrice, currentPrice]);

  const { minVal, maxVal, pathD, areaD, baselineY, currentPoint, isProfit, pctChange } = useMemo(() => {
    const pts = [...rawPoints];
    if (pts.length === 1) pts.push(pts[0]);

    // Include entryPrice in bounds calculation to anchor baseline
    const allVals = [...pts, entryPrice];
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min || 1;

    // ViewBox dimensions: 100 x height
    const vbWidth = 100;
    const vbHeight = height;
    const padTop = 6;
    const padBottom = 6;
    const chartH = vbHeight - padTop - padBottom;

    const getY = (val: number) => {
      const normalized = (val - min) / range;
      // Invert Y axis for SVG (0 is top)
      return padTop + (1 - normalized) * chartH;
    };

    const coords = pts.map((val, idx) => {
      const x = (idx / (pts.length - 1)) * vbWidth;
      const y = getY(val);
      return { x, y, val };
    });

    // Build SVG path
    let path = `M ${coords[0].x.toFixed(1)} ${coords[0].y.toFixed(1)}`;
    for (let i = 1; i < coords.length; i++) {
      path += ` L ${coords[i].x.toFixed(1)} ${coords[i].y.toFixed(1)}`;
    }

    const last = coords[coords.length - 1];
    const area = `${path} L ${last.x.toFixed(1)} ${vbHeight} L ${coords[0].x.toFixed(1)} ${vbHeight} Z`;

    const bY = getY(entryPrice);

    // Calculate profit state
    const priceDiff = currentPrice - entryPrice;
    const profit = isLong ? priceDiff >= 0 : priceDiff <= 0;
    const pct = entryPrice > 0 ? (Math.abs(priceDiff) / entryPrice) * 100 : 0;

    return {
      minVal: min,
      maxVal: max,
      pathD: path,
      areaD: area,
      baselineY: bY,
      currentPoint: last,
      isProfit: profit,
      pctChange: pct,
    };
  }, [rawPoints, entryPrice, currentPrice, isLong, height]);

  const strokeColor = isProfit ? '#10b981' : '#f43f5e';
  const fillColor = isProfit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';

  const formatPrice = (p: number) => {
    if (!p) return '0.00';
    if (p >= 100) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  return (
    <div className={`flex flex-col gap-1 select-none ${className}`}>
      {/* Top Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-0.5">
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500">Trayectoria:</span>
            <span
              className={`font-bold px-1 rounded text-[9px] ${
                isProfit
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isProfit ? '+' : '-'}
              {pctChange.toFixed(2)}% desde E1
            </span>
          </div>

          <div className="flex items-center gap-2 text-[9px] text-neutral-500">
            <span>Mín: ${formatPrice(minVal)}</span>
            <span>•</span>
            <span>Máx: ${formatPrice(maxVal)}</span>
          </div>
        </div>
      )}

      {/* SVG Canvas Sparkline */}
      <div
        className="relative w-full overflow-hidden rounded bg-neutral-950/70 border border-neutral-800/80"
        style={{ height }}
      >
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          style={{ width: '100%', height: '100%' }}
        >
          <defs>
            <linearGradient id={`sparklineGrad-${entryPrice}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Baseline Entry Price (E1) */}
          <line
            x1="0"
            y1={baselineY}
            x2="100"
            y2={baselineY}
            stroke="#f59e0b"
            strokeDasharray="2,2"
            strokeWidth="0.8"
            opacity="0.65"
          />

          {/* Gradient Area */}
          <path d={areaD} fill={`url(#sparklineGrad-${entryPrice})`} />

          {/* Trajectory Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pulse Dot on Current Mark Price */}
          {currentPoint && (
            <>
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="3"
                fill={strokeColor}
                className="animate-ping opacity-75 origin-center"
              />
              <circle
                cx={currentPoint.x}
                cy={currentPoint.y}
                r="2"
                fill="#ffffff"
                stroke={strokeColor}
                strokeWidth="1"
              />
            </>
          )}
        </svg>

        {/* Floating Entry & Live Badges */}
        <div
          className="absolute left-1 pointer-events-none text-[8px] font-mono font-bold text-amber-400 bg-neutral-950/90 px-1 py-0.2 rounded border border-amber-500/30"
          style={{ top: Math.max(2, Math.min(height - 14, baselineY - 7)) }}
        >
          E1 ${formatPrice(entryPrice)}
        </div>

        {currentPoint && (
          <div
            className="absolute right-1 pointer-events-none text-[8px] font-mono font-bold px-1 py-0.2 rounded shadow-xs"
            style={{
              top: Math.max(2, Math.min(height - 14, currentPoint.y - 7)),
              backgroundColor: isProfit ? 'rgba(16, 185, 129, 0.9)' : 'rgba(244, 63, 94, 0.9)',
              color: '#ffffff',
            }}
          >
            ${formatPrice(currentPrice)}
          </div>
        )}
      </div>
    </div>
  );
};
