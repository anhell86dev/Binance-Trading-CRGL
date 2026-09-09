import React, { useEffect, useRef, useState, useMemo } from 'react';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { tradePriceHistoryService, PricePoint } from '../services/tradePriceHistoryService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import {
  TrendingUp,
  ShieldAlert,
  Target,
  Clock,
  Layers,
  Activity,
  Maximize2,
  RefreshCw,
  Zap,
} from 'lucide-react';

export interface ApexTradePriceChartProps {
  symbol: string;
  isLong: boolean;
  entryPrice: number; // E1
  currentPrice: number;
  e2Price?: number; // E2 / DCA
  tp1Price?: number;
  tp2Price?: number;
  tp3Price?: number;
  slPrice?: number;
  height?: number | string;
  showControls?: boolean;
}

export const ApexTradePriceChart: React.FC<ApexTradePriceChartProps> = ({
  symbol,
  isLong,
  entryPrice,
  currentPrice,
  e2Price = 0,
  tp1Price = 0,
  tp2Price = 0,
  tp3Price = 0,
  slPrice = 0,
  height = 250,
  showControls = true,
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<ApexCharts | null>(null);
  const [historyPoints, setHistoryPoints] = useState<PricePoint[]>([]);
  const [lastTickPrice, setLastTickPrice] = useState<number>(currentPrice);
  const isProfit = isLong ? lastTickPrice >= entryPrice : lastTickPrice <= entryPrice;

  const formatPrice = (val: number) => {
    if (!val || isNaN(val)) return '0.00';
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (val >= 1) return val.toFixed(3);
    return val.toFixed(5);
  };

  // 1. Synchronize real-time history ticks
  useEffect(() => {
    const updateTicks = () => {
      const hist = tradePriceHistoryService.getHistory(symbol, entryPrice);
      if (hist && hist.points && hist.points.length > 0) {
        setHistoryPoints([...hist.points]);
        setLastTickPrice(hist.currentPrice);
      } else {
        // Fallback live points
        const live = livePriceService.getPrice(symbol) || currentPrice;
        setLastTickPrice(live);
        setHistoryPoints((prev) => {
          const now = Date.now();
          if (prev.length === 0) {
            return [
              { price: entryPrice, time: now - 30000 },
              { price: (entryPrice + live) / 2, time: now - 15000 },
              { price: live, time: now },
            ];
          }
          const last = prev[prev.length - 1];
          if (Math.abs(last.price - live) > 0.0001 || now - last.time >= 3000) {
            const next = [...prev, { price: live, time: now }];
            return next.slice(-100);
          }
          return prev;
        });
      }
    };

    updateTicks();
    const unsubHist = tradePriceHistoryService.subscribe(updateTicks);
    const unsubLive = livePriceService.subscribe(updateTicks);
    const unsubWs = binanceWs.subscribe(updateTicks);

    return () => {
      unsubHist();
      unsubLive();
      unsubWs();
    };
  }, [symbol, entryPrice, currentPrice]);

  // 2. Build series data for ApexCharts LineChart
  const seriesData = useMemo(() => {
    if (!historyPoints || historyPoints.length === 0) {
      const now = Date.now();
      return [
        [now - 30000, entryPrice],
        [now - 15000, (entryPrice + lastTickPrice) / 2],
        [now, lastTickPrice],
      ];
    }
    return historyPoints.map((p) => [p.time, p.price]);
  }, [historyPoints, entryPrice, lastTickPrice]);

  // 3. Build Annotations for key levels (E1, E2, TP1, TP2, TP3, SL)
  const yAxisAnnotations = useMemo(() => {
    const annotations: any[] = [];

    // SL (Stop Loss) - Crimson Red
    if (slPrice > 0) {
      annotations.push({
        y: slPrice,
        borderColor: '#f43f5e',
        borderWidth: 1.8,
        strokeDashArray: 3,
        label: {
          borderColor: '#f43f5e',
          style: {
            color: '#ffffff',
            background: '#e11d48',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `🛑 SL: $${formatPrice(slPrice)}`,
          position: 'right',
        },
      });
    }

    // E2 (Entrada 2 / DCA) - Amber
    if (e2Price > 0) {
      annotations.push({
        y: e2Price,
        borderColor: '#f59e0b',
        borderWidth: 1.5,
        strokeDashArray: 4,
        label: {
          borderColor: '#f59e0b',
          style: {
            color: '#18181b',
            background: '#fbbf24',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `⚠️ E2: $${formatPrice(e2Price)}`,
          position: 'right',
        },
      });
    }

    // E1 (Entrada 1 / Costo base) - Sky Blue
    if (entryPrice > 0) {
      annotations.push({
        y: entryPrice,
        borderColor: '#0ea5e9',
        borderWidth: 1.8,
        strokeDashArray: 0,
        label: {
          borderColor: '#0ea5e9',
          style: {
            color: '#ffffff',
            background: '#0284c7',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `⚡ E1: $${formatPrice(entryPrice)}`,
          position: 'right',
        },
      });
    }

    // TP1 (Take Profit 1) - Emerald Green
    if (tp1Price > 0) {
      annotations.push({
        y: tp1Price,
        borderColor: '#10b981',
        borderWidth: 1.5,
        strokeDashArray: 3,
        label: {
          borderColor: '#10b981',
          style: {
            color: '#ffffff',
            background: '#059669',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `🎯 TP1: $${formatPrice(tp1Price)}`,
          position: 'right',
        },
      });
    }

    // TP2 (Take Profit 2) - Bright Mint Green
    if (tp2Price > 0) {
      annotations.push({
        y: tp2Price,
        borderColor: '#34d399',
        borderWidth: 1.5,
        strokeDashArray: 3,
        label: {
          borderColor: '#34d399',
          style: {
            color: '#064e3b',
            background: '#34d399',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `🚀 TP2: $${formatPrice(tp2Price)}`,
          position: 'right',
        },
      });
    }

    // TP3 (Take Profit 3 / Final) - Golden Emerald
    if (tp3Price > 0) {
      annotations.push({
        y: tp3Price,
        borderColor: '#6ee7b7',
        borderWidth: 1.8,
        strokeDashArray: 2,
        label: {
          borderColor: '#6ee7b7',
          style: {
            color: '#064e3b',
            background: '#6ee7b7',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `🏆 TP3: $${formatPrice(tp3Price)}`,
          position: 'right',
        },
      });
    }

    return annotations;
  }, [entryPrice, e2Price, tp1Price, tp2Price, tp3Price, slPrice]);

  // 4. Current Point marker annotation
  const pointsAnnotations = useMemo(() => {
    const latestTime =
      seriesData.length > 0 ? seriesData[seriesData.length - 1][0] : Date.now();
    return [
      {
        x: latestTime,
        y: lastTickPrice,
        marker: {
          size: 5,
          fillColor: isProfit ? '#10b981' : '#f43f5e',
          strokeColor: '#ffffff',
          strokeWidth: 2,
        },
        label: {
          borderColor: isProfit ? '#10b981' : '#f43f5e',
          offsetY: -8,
          style: {
            background: '#090d16',
            color: isProfit ? '#34d399' : '#fb7185',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `LIVE: $${formatPrice(lastTickPrice)}`,
        },
      },
    ];
  }, [seriesData, lastTickPrice, isProfit]);

  // 5. Initialize or update ApexCharts LineChart instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions: ApexOptions = {
      chart: {
        type: 'line',
        height: height,
        background: 'transparent',
        toolbar: {
          show: true,
          tools: {
            download: false,
            selection: false,
            zoom: true,
            zoomin: true,
            zoomout: true,
            pan: true,
            reset: true,
          },
          autoSelected: 'pan',
        },
        animations: {
          enabled: true,
          easing: 'linear',
          dynamicAnimation: {
            speed: 400,
          },
        },
        fontFamily: 'monospace, sans-serif',
      },
      stroke: {
        curve: 'smooth',
        width: 2.5,
      },
      colors: [isProfit ? '#10b981' : '#f43f5e'],
      series: [
        {
          name: `Precio ${symbol}`,
          data: seriesData,
        },
      ],
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          style: {
            colors: '#64748b',
            fontSize: '10px',
            fontFamily: 'monospace',
          },
          format: 'HH:mm:ss',
        },
        axisBorder: {
          color: '#1e293b',
        },
        axisTicks: {
          color: '#1e293b',
        },
      },
      yaxis: {
        labels: {
          formatter: (val) => `$${formatPrice(val)}`,
          style: {
            colors: '#94a3b8',
            fontSize: '10px',
            fontFamily: 'monospace',
          },
        },
        axisBorder: {
          show: false,
        },
      },
      grid: {
        borderColor: '#182030',
        strokeDashArray: 3,
        padding: {
          left: 10,
          right: 30,
          top: 10,
          bottom: 10,
        },
      },
      tooltip: {
        theme: 'dark',
        x: {
          format: 'HH:mm:ss',
        },
        y: {
          formatter: (val) => `$${formatPrice(val)}`,
        },
      },
      annotations: {
        yaxis: yAxisAnnotations,
        points: pointsAnnotations,
      },
      markers: {
        size: 0,
        hover: {
          size: 5,
        },
      },
    };

    if (!chartInstanceRef.current) {
      const chart = new ApexCharts(chartContainerRef.current, chartOptions);
      chart.render();
      chartInstanceRef.current = chart;
    } else {
      chartInstanceRef.current.updateOptions(
        {
          colors: [isProfit ? '#10b981' : '#f43f5e'],
          annotations: {
            yaxis: yAxisAnnotations,
            points: pointsAnnotations,
          },
        },
        false,
        false
      );
      chartInstanceRef.current.updateSeries(
        [
          {
            name: `Precio ${symbol}`,
            data: seriesData,
          },
        ],
        true
      );
    }
  }, [seriesData, yAxisAnnotations, pointsAnnotations, height, isProfit, symbol]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, []);

  // Calculate distance metrics to key levels
  const distE1 = entryPrice > 0 ? ((lastTickPrice - entryPrice) / entryPrice) * 100 : 0;
  const distE2 = e2Price > 0 ? ((lastTickPrice - e2Price) / e2Price) * 100 : 0;
  const distTP1 = tp1Price > 0 ? ((lastTickPrice - tp1Price) / tp1Price) * 100 : 0;
  const distTP2 = tp2Price > 0 ? ((lastTickPrice - tp2Price) / tp2Price) * 100 : 0;
  const distTP3 = tp3Price > 0 ? ((lastTickPrice - tp3Price) / tp3Price) * 100 : 0;
  const distSL = slPrice > 0 ? ((lastTickPrice - slPrice) / slPrice) * 100 : 0;

  return (
    <div className="w-full flex flex-col gap-2 bg-neutral-950/80 rounded-xl border border-neutral-800/90 p-3 shadow-inner">
      {/* Header con Estado de Precios y Distancias a Niveles */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs font-mono border-b border-neutral-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>ApexCharts LineChart: {symbol}</span>
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
              isProfit
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                : 'bg-rose-950/80 text-rose-300 border-rose-700'
            }`}
          >
            LIVE: ${formatPrice(lastTickPrice)} ({distE1 >= 0 ? '+' : ''}
            {distE1.toFixed(2)}%)
          </span>
        </div>

        {/* Tactical Badges for E1, E2, TP1, TP2, TP3, SL */}
        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          {/* SL */}
          {slPrice > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                (isLong && lastTickPrice <= slPrice) || (!isLong && lastTickPrice >= slPrice)
                  ? 'bg-rose-600 text-white border-rose-400 font-extrabold animate-pulse'
                  : 'bg-rose-950/40 text-rose-300 border-rose-800/70'
              }`}
              title="Stop Loss definido"
            >
              <span>SL: ${formatPrice(slPrice)}</span>
              <span className="opacity-80">({distSL >= 0 ? '+' : ''}{distSL.toFixed(1)}%)</span>
            </span>
          )}

          {/* E2 */}
          {e2Price > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                (isLong && lastTickPrice <= e2Price) || (!isLong && lastTickPrice >= e2Price)
                  ? 'bg-amber-500 text-neutral-950 border-amber-300 font-extrabold'
                  : 'bg-amber-950/40 text-amber-300 border-amber-800/70'
              }`}
              title="Entrada 2 (DCA) definida"
            >
              <span>E2: ${formatPrice(e2Price)}</span>
              <span className="opacity-80">({distE2 >= 0 ? '+' : ''}{distE2.toFixed(1)}%)</span>
            </span>
          )}

          {/* E1 */}
          <span
            className="px-1.5 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-800/70 flex items-center gap-1"
            title="Entrada 1 (Precio de compra base)"
          >
            <span>E1: ${formatPrice(entryPrice)}</span>
          </span>

          {/* TP1 */}
          {tp1Price > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                (isLong && lastTickPrice >= tp1Price) || (!isLong && lastTickPrice <= tp1Price)
                  ? 'bg-emerald-500 text-neutral-950 border-emerald-300 font-extrabold'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/70'
              }`}
              title="Take Profit 1 definido"
            >
              <span>TP1: ${formatPrice(tp1Price)}</span>
              <span className="opacity-80">({distTP1 >= 0 ? '+' : ''}{distTP1.toFixed(1)}%)</span>
            </span>
          )}

          {/* TP2 */}
          {tp2Price > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                (isLong && lastTickPrice >= tp2Price) || (!isLong && lastTickPrice <= tp2Price)
                  ? 'bg-emerald-400 text-neutral-950 border-emerald-200 font-extrabold'
                  : 'bg-emerald-950/30 text-emerald-300 border-emerald-800/50'
              }`}
              title="Take Profit 2 definido"
            >
              <span>TP2: ${formatPrice(tp2Price)}</span>
              <span className="opacity-80">({distTP2 >= 0 ? '+' : ''}{distTP2.toFixed(1)}%)</span>
            </span>
          )}

          {/* TP3 */}
          {tp3Price > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                (isLong && lastTickPrice >= tp3Price) || (!isLong && lastTickPrice <= tp3Price)
                  ? 'bg-emerald-300 text-neutral-950 border-emerald-100 font-extrabold'
                  : 'bg-emerald-950/30 text-emerald-200 border-emerald-800/40'
              }`}
              title="Take Profit 3 (Final) definido"
            >
              <span>TP3: ${formatPrice(tp3Price)}</span>
              <span className="opacity-80">({distTP3 >= 0 ? '+' : ''}{distTP3.toFixed(1)}%)</span>
            </span>
          )}
        </div>
      </div>

      {/* Main ApexCharts Container */}
      <div className="w-full relative rounded-lg overflow-hidden min-h-[220px]">
        <div ref={chartContainerRef} className="w-full h-full block" />
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/80">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-neutral-500" />
          <span>Ticks en Vivo ({historyPoints.length} puntos capturados)</span>
        </span>
        <span className="text-neutral-500">
          Líneas de niveles: <strong className="text-sky-400">E1</strong> • <strong className="text-amber-400">E2</strong> • <strong className="text-emerald-400">TP1-TP3</strong> • <strong className="text-rose-400">SL</strong>
        </span>
      </div>
    </div>
  );
};
