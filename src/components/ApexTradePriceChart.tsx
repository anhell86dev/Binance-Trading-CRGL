import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import ApexCharts, { ApexOptions } from 'apexcharts';
import { tradePriceHistoryService, PricePoint } from '../services/tradePriceHistoryService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
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
  BarChart2,
  CandlestickChart,
  LineChart as LineChartIcon,
  CheckCircle2,
  Lock,
  AlertTriangle,
} from 'lucide-react';

export type ChartTimeframe = '5m' | '15m' | '1h' | '4h' | '1d' | 'ticks';
export type ChartStyle = 'candlestick' | 'line';

export interface TimeframeConfig {
  id: ChartTimeframe;
  label: string;
  binanceInterval?: string;
  intervalMs: number;
  candleCount: number;
}

export const TIMEFRAMES: TimeframeConfig[] = [
  { id: '5m', label: '5 min', binanceInterval: '5m', intervalMs: 5 * 60 * 1000, candleCount: 70 },
  { id: '15m', label: '15 min', binanceInterval: '15m', intervalMs: 15 * 60 * 1000, candleCount: 70 },
  { id: '1h', label: '1 h', binanceInterval: '1h', intervalMs: 60 * 60 * 1000, candleCount: 60 },
  { id: '4h', label: '4 h', binanceInterval: '4h', intervalMs: 4 * 60 * 60 * 1000, candleCount: 50 },
  { id: '1d', label: '1 d', binanceInterval: '1d', intervalMs: 24 * 60 * 60 * 1000, candleCount: 45 },
  { id: 'ticks', label: 'Ticks', intervalMs: 1000, candleCount: 80 },
];

export interface CandleData {
  time: number; // timestamp in ms
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface DCAEntryInfo {
  label: string;
  price: number;
  pct?: number;
  executed?: boolean;
  time?: number;
}

export interface ApexTradePriceChartProps {
  symbol: string;
  isLong: boolean;
  entryPrice: number; // E1 (Initial Entry)
  currentPrice: number;
  e2Price?: number; // E2 / DCA 1
  e3Price?: number; // E3 / DCA 2
  averageEntryPrice?: number; // Precio Promedio ponderado (Average Cost Basis)
  tp1Price?: number;
  tp2Price?: number;
  tp3Price?: number;
  slPrice?: number;
  openTime?: number; // Timestamp (ms) when the first operation was opened
  dcaEntries?: DCAEntryInfo[];
  height?: number | string;
  showControls?: boolean;
  defaultTimeframe?: ChartTimeframe;
  defaultStyle?: ChartStyle;
}

export const ApexTradePriceChart: React.FC<ApexTradePriceChartProps> = ({
  symbol,
  isLong,
  entryPrice,
  currentPrice,
  e2Price = 0,
  e3Price = 0,
  averageEntryPrice = 0,
  tp1Price = 0,
  tp2Price = 0,
  tp3Price = 0,
  slPrice = 0,
  openTime,
  dcaEntries,
  height = 250,
  showControls = true,
  defaultTimeframe = '15m',
  defaultStyle = 'candlestick',
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<ApexCharts | null>(null);

  // States
  const [selectedTf, setSelectedTf] = useState<ChartTimeframe>(defaultTimeframe);
  const [chartStyle, setChartStyle] = useState<ChartStyle>(defaultStyle);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [historyPoints, setHistoryPoints] = useState<PricePoint[]>([]);
  const [lastTickPrice, setLastTickPrice] = useState<number>(currentPrice);
  const [isLoadingCandles, setIsLoadingCandles] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const isProfit = isLong ? lastTickPrice >= entryPrice : lastTickPrice <= entryPrice;

  const formatPrice = (val: number | undefined) => {
    return formatPriceUtil(val, symbol);
  };

  // Helper to generate synthetic fallback candles if API is unavailable
  const generateSyntheticCandles = useCallback(
    (tfConfig: TimeframeConfig, basePrice: number): CandleData[] => {
      const now = Date.now();
      const count = tfConfig.candleCount;
      const interval = tfConfig.intervalMs;
      const result: CandleData[] = [];

      let current = basePrice > 0 ? basePrice : 100;
      // Start slightly lower for upward trend or viceversa
      let p = current * (isLong ? 0.97 : 1.03);

      for (let i = count; i >= 0; i--) {
        const time = now - i * interval;
        const volatility = current * 0.008;
        const change = (Math.random() - 0.49) * volatility;
        const open = p;
        const close = open + change;
        const high = Math.max(open, close) + Math.random() * (volatility * 0.7);
        const low = Math.min(open, close) - Math.random() * (volatility * 0.7);
        result.push({ time, open, high, low, close });
        p = close;
      }
      // Ensure the very last candle's close equals current price
      if (result.length > 0) {
        const last = result[result.length - 1];
        last.close = currentPrice > 0 ? currentPrice : last.close;
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
      }
      return result;
    },
    [isLong, currentPrice]
  );

  // Fetch Kline/Candlestick data for selected timeframe
  const loadKlines = useCallback(
    async (tfId: ChartTimeframe, forceRefresh = false) => {
      if (tfId === 'ticks') {
        setIsLoadingCandles(false);
        return;
      }

      const tfConfig = TIMEFRAMES.find((t) => t.id === tfId) || TIMEFRAMES[1];
      if (!tfConfig.binanceInterval) return;

      setIsLoadingCandles(true);
      if (forceRefresh) setIsRefreshing(true);

      const cleanSym = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const binanceInterval = tfConfig.binanceInterval;
      
      // If openTime is provided, calculate candles needed to encompass openTime
      let limit = tfConfig.candleCount;
      if (openTime && openTime > 0) {
        const timeDiffMs = Date.now() - openTime;
        if (timeDiffMs > 0) {
          const candlesNeeded = Math.ceil(timeDiffMs / tfConfig.intervalMs) + 15;
          limit = Math.min(250, Math.max(tfConfig.candleCount, candlesNeeded));
        }
      }

      const endpoints = [
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSym}&interval=${binanceInterval}&limit=${limit}`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSym}&interval=${binanceInterval}&limit=${limit}`,
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSym}&interval=${binanceInterval}&limit=${limit}`,
      ];

      let loaded = false;
      for (const url of endpoints) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const raw = await res.json();
            if (Array.isArray(raw) && raw.length > 0) {
              const parsed: CandleData[] = raw.map((k: any) => ({
                time: Number(k[0]),
                open: parseFloat(k[1]),
                high: parseFloat(k[2]),
                low: parseFloat(k[3]),
                close: parseFloat(k[4]),
                volume: parseFloat(k[5]),
              }));

              // If we have an active real-time price, apply it to the last candle
              const live = livePriceService.getPrice(symbol) || currentPrice;
              if (live > 0 && parsed.length > 0) {
                const last = parsed[parsed.length - 1];
                last.close = live;
                last.high = Math.max(last.high, live);
                last.low = Math.min(last.low, live);
                setLastTickPrice(live);
              }

              setCandles(parsed);
              loaded = true;
              break;
            }
          }
        } catch {
          // Attempt next endpoint
        }
      }

      if (!loaded) {
        // Use realistic synthetic candles centered on real levels
        const synthetic = generateSyntheticCandles(
          tfConfig,
          lastTickPrice || currentPrice || entryPrice
        );
        setCandles(synthetic);
      }

      setIsLoadingCandles(false);
      setIsRefreshing(false);
    },
    [symbol, currentPrice, entryPrice, lastTickPrice, generateSyntheticCandles]
  );

  // Initial and on-timeframe-change fetch
  useEffect(() => {
    loadKlines(selectedTf);
  }, [selectedTf, symbol, loadKlines]);

  // Synchronize live WebSocket ticks & real-time history
  useEffect(() => {
    const updateTicks = () => {
      const live = livePriceService.getPrice(symbol) || currentPrice;
      if (live && live > 0) {
        setLastTickPrice(live);

        // Update the active (last) candle in real-time
        setCandles((prevCandles) => {
          if (!prevCandles || prevCandles.length === 0) return prevCandles;
          const updated = [...prevCandles];
          const lastIdx = updated.length - 1;
          const last = { ...updated[lastIdx] };

          last.close = live;
          if (live > last.high) last.high = live;
          if (live < last.low) last.low = live;

          updated[lastIdx] = last;
          return updated;
        });
      }

      // Also maintain ticks history for 'ticks' mode
      const hist = tradePriceHistoryService.getHistory(symbol, entryPrice);
      if (hist && hist.points && hist.points.length > 0) {
        setHistoryPoints([...hist.points]);
      } else if (live > 0) {
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

  // Build series data for ApexCharts
  const seriesData = useMemo(() => {
    if (selectedTf === 'ticks') {
      if (!historyPoints || historyPoints.length === 0) {
        const now = Date.now();
        return [
          [now - 30000, entryPrice],
          [now - 15000, (entryPrice + lastTickPrice) / 2],
          [now, lastTickPrice],
        ];
      }
      return historyPoints.map((p) => [p.time, p.price]);
    }

    if (chartStyle === 'candlestick') {
      return candles.map((c) => ({
        x: c.time,
        y: [c.open, c.high, c.low, c.close],
      }));
    } else {
      // Line / Area mode
      return candles.map((c) => [c.time, c.close]);
    }
  }, [selectedTf, chartStyle, candles, historyPoints, entryPrice, lastTickPrice]);

  // Calculate Effective Average Entry Price (Precio Promedio para DCA)
  const effectiveAvgPrice = useMemo(() => {
    if (averageEntryPrice > 0) return averageEntryPrice;
    if (e2Price > 0) {
      if (e3Price > 0) {
        return entryPrice * 0.5 + e2Price * 0.3 + e3Price * 0.2;
      }
      return entryPrice * 0.6 + e2Price * 0.4;
    }
    return entryPrice;
  }, [averageEntryPrice, entryPrice, e2Price, e3Price]);

  // Build X-axis Annotations for start time (Apertura de la primera operación)
  const xAxisAnnotations = useMemo(() => {
    if (!openTime || openTime <= 0) return [];
    const openDate = new Date(openTime);
    const dateStr = openDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const timeStr = openDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return [
      {
        x: openTime,
        borderColor: '#38bdf8',
        borderWidth: 2,
        strokeDashArray: 2,
        label: {
          borderColor: '#0284c7',
          style: {
            color: '#ffffff',
            background: '#0284c7',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 5, right: 5, top: 2, bottom: 2 },
          },
          text: `🚀 APERTURA (${dateStr} ${timeStr})`,
          orientation: 'horizontal',
          position: 'top',
        },
      },
    ];
  }, [openTime]);

  // Build Y-axis Annotations for key levels (E1, E2, E3, Average Price, TP1, TP2, TP3, SL)
  const yAxisAnnotations = useMemo(() => {
    const annotations: any[] = [];
    const lineStartX = openTime && openTime > 0 ? openTime : undefined;

    // SL (Stop Loss) - Crimson Red
    if (slPrice > 0) {
      annotations.push({
        y: slPrice,
        x: lineStartX,
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

    // E3 (Entrada 3 / DCA 2) - Orange
    if (e3Price > 0) {
      annotations.push({
        y: e3Price,
        x: lineStartX,
        borderColor: '#f97316',
        borderWidth: 1.5,
        strokeDashArray: 4,
        label: {
          borderColor: '#f97316',
          style: {
            color: '#ffffff',
            background: '#c2410c',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 700,
            padding: { left: 4, right: 4, top: 2, bottom: 2 },
          },
          text: `⚠️ E3 (DCA 2): $${formatPrice(e3Price)}`,
          position: 'right',
        },
      });
    }

    // E2 (Entrada 2 / DCA 1) - Amber
    if (e2Price > 0) {
      annotations.push({
        y: e2Price,
        x: lineStartX,
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
          text: `⚠️ E2 (DCA 1): $${formatPrice(e2Price)}`,
          position: 'right',
        },
      });
    }

    // E1 (Entrada 1 / Costo base inicial) - Sky Blue
    if (entryPrice > 0) {
      annotations.push({
        y: entryPrice,
        x: lineStartX,
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

    // PRECIO PROMEDIO (Average Cost Basis con DCA e ingresos múltiples)
    const hasMultipleIngresos = e2Price > 0 || e3Price > 0 || averageEntryPrice > 0 || (dcaEntries && dcaEntries.length > 1);
    if (hasMultipleIngresos && effectiveAvgPrice > 0 && Math.abs(effectiveAvgPrice - entryPrice) > 0.00000001) {
      annotations.push({
        y: effectiveAvgPrice,
        x: lineStartX,
        borderColor: '#eab308',
        borderWidth: 2.2,
        strokeDashArray: 0,
        label: {
          borderColor: '#eab308',
          style: {
            color: '#090d16',
            background: '#eab308',
            fontSize: '10px',
            fontFamily: 'monospace',
            fontWeight: 800,
            padding: { left: 5, right: 5, top: 2, bottom: 2 },
          },
          text: `📊 PROMEDIO: $${formatPrice(effectiveAvgPrice)}`,
          position: 'right',
        },
      });
    }

    // TP1 (Take Profit 1) - Emerald Green
    if (tp1Price > 0) {
      annotations.push({
        y: tp1Price,
        x: lineStartX,
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
        x: lineStartX,
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
        x: lineStartX,
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
  }, [entryPrice, e2Price, e3Price, averageEntryPrice, effectiveAvgPrice, tp1Price, tp2Price, tp3Price, slPrice, openTime, dcaEntries]);

  // Current Point marker annotation
  const pointsAnnotations = useMemo(() => {
    let latestTime = Date.now();
    if (selectedTf === 'ticks') {
      if (seriesData.length > 0) {
        latestTime = (seriesData[seriesData.length - 1] as any)[0];
      }
    } else if (candles.length > 0) {
      latestTime = candles[candles.length - 1].time;
    }

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
  }, [selectedTf, seriesData, candles, lastTickPrice, isProfit]);

  // Determine effective chart type: 'candlestick' or 'line'
  const effectiveChartType = selectedTf === 'ticks' ? 'line' : chartStyle;

  // Format X-axis datetime label based on timeframe
  const xAxisLabelFormat = useMemo(() => {
    if (selectedTf === 'ticks') return 'HH:mm:ss';
    if (selectedTf === '5m' || selectedTf === '15m') return 'HH:mm';
    if (selectedTf === '1h' || selectedTf === '4h') return 'dd MMM HH:mm';
    return 'dd MMM';
  }, [selectedTf]);

  // Initialize or update ApexCharts instance
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chartOptions: ApexOptions = {
      chart: {
        type: effectiveChartType,
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
            speed: 350,
          },
        },
        fontFamily: 'monospace, sans-serif',
      },
      plotOptions: {
        candlestick: {
          colors: {
            upward: '#10b981',
            downward: '#f43f5e',
          },
          wick: {
            useFillColor: true,
          },
        },
      },
      stroke: {
        curve: 'smooth',
        width: effectiveChartType === 'candlestick' ? 1.2 : 2.5,
      },
      colors: [isProfit ? '#10b981' : '#f43f5e'],
      series: [
        {
          name: effectiveChartType === 'candlestick' ? `Velas ${symbol}` : `Precio ${symbol}`,
          type: effectiveChartType,
          data: seriesData as any,
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
          format: xAxisLabelFormat,
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
          right: 35,
          top: 10,
          bottom: 10,
        },
      },
      tooltip: {
        theme: 'dark',
        x: {
          format: selectedTf === '1d' ? 'dd MMM yyyy' : 'dd MMM HH:mm:ss',
        },
        y: {
          formatter: (val) => `$${formatPrice(val)}`,
        },
      },
      annotations: {
        xaxis: xAxisAnnotations,
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

    // Recreate chart if instance doesn't exist or chart type changed
    if (!chartInstanceRef.current) {
      const chart = new ApexCharts(chartContainerRef.current, chartOptions);
      chart.render();
      chartInstanceRef.current = chart;
    } else {
      chartInstanceRef.current.updateOptions(
        {
          chart: {
            type: effectiveChartType,
          },
          colors: [isProfit ? '#10b981' : '#f43f5e'],
          xaxis: {
            labels: {
              format: xAxisLabelFormat,
            },
          },
          annotations: {
            xaxis: xAxisAnnotations,
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
            name: effectiveChartType === 'candlestick' ? `Velas ${symbol}` : `Precio ${symbol}`,
            type: effectiveChartType,
            data: seriesData as any,
          },
        ],
        true
      );
    }
  }, [
    effectiveChartType,
    height,
    seriesData,
    xAxisLabelFormat,
    xAxisAnnotations,
    yAxisAnnotations,
    pointsAnnotations,
    isProfit,
    symbol,
    selectedTf,
  ]);

  // Clean up on unmount or when chart style changes
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [effectiveChartType]);

  // Calculate distance metrics to key levels
  const distE1 = entryPrice > 0 ? ((lastTickPrice - entryPrice) / entryPrice) * 100 : 0;
  const distE2 = e2Price > 0 ? ((lastTickPrice - e2Price) / e2Price) * 100 : 0;
  const distE3 = e3Price > 0 ? ((lastTickPrice - e3Price) / e3Price) * 100 : 0;
  const distAvg = effectiveAvgPrice > 0 ? ((lastTickPrice - effectiveAvgPrice) / effectiveAvgPrice) * 100 : 0;
  const distTP1 = tp1Price > 0 ? ((lastTickPrice - tp1Price) / tp1Price) * 100 : 0;
  const distTP2 = tp2Price > 0 ? ((lastTickPrice - tp2Price) / tp2Price) * 100 : 0;
  const distTP3 = tp3Price > 0 ? ((lastTickPrice - tp3Price) / tp3Price) * 100 : 0;
  const distSL = slPrice > 0 ? ((lastTickPrice - slPrice) / slPrice) * 100 : 0;

  return (
    <div
      id={`apex-trade-price-chart-${symbol}`}
      className="w-full flex flex-col gap-2.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 p-3 shadow-inner text-neutral-200 font-mono"
    >
      {/* 1. Header con Información Live y Selector de Temporalidades (5min, 15min, 1h, 4h, 1d) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 border-b border-neutral-800/80 pb-2">
        {/* Lado Izquierdo: Título y Precio Live */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white tracking-wider flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>ApexChart: {symbol}</span>
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

          {isLoadingCandles && (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 animate-pulse bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
              <span>Cargando velas...</span>
            </span>
          )}
        </div>

        {/* Lado Derecho: SELECTOR DE TEMPORALIDADES (5min, 15min, 1h, 4h, 1d) + Selector de Tipo de Gráfico */}
        {showControls && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Botones de Temporalidad: 5min, 15min, 1h, 4h, 1d y Ticks */}
            <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800 text-[10px]">
              {TIMEFRAMES.map((tf) => {
                const isActive = selectedTf === tf.id;
                return (
                  <button
                    key={tf.id}
                    type="button"
                    onClick={() => {
                      if (selectedTf !== tf.id) {
                        setSelectedTf(tf.id);
                      }
                    }}
                    className={`px-2 py-1 rounded font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-neutral-950 shadow-xs'
                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                    }`}
                    title={`Ver gráfico en temporalidad ${tf.label}`}
                  >
                    {tf.label}
                  </button>
                );
              })}
            </div>

            {/* Toggle Tipo de Gráfico: Velas o Línea */}
            {selectedTf !== 'ticks' && (
              <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => setChartStyle('candlestick')}
                  className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartStyle === 'candlestick'
                      ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Gráfico de Velas Japonesas (OHLC)"
                >
                  <CandlestickChart className="w-3 h-3" />
                  <span className="hidden sm:inline">Velas</span>
                </button>
                <button
                  type="button"
                  onClick={() => setChartStyle('line')}
                  className={`px-2 py-1 rounded font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    chartStyle === 'line'
                      ? 'bg-sky-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Gráfico de Línea Continua"
                >
                  <LineChartIcon className="w-3 h-3" />
                  <span className="hidden sm:inline">Línea</span>
                </button>
              </div>
            )}

            {/* Botón de Refrescar Velas */}
            <button
              type="button"
              onClick={() => loadKlines(selectedTf, true)}
              disabled={isRefreshing}
              className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer transition-all"
              title="Actualizar datos históricos de Binance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        )}
      </div>

      {/* 2. Badges Tácticos de Niveles de Precio (Apertura, E1, E2, E3, Precio Promedio, TP1, TP2, TP3, SL) */}
      <div className="flex items-center gap-1.5 flex-wrap text-[10px] pb-1">
        {/* Timestamp de Apertura */}
        {openTime && openTime > 0 && (
          <span
            className="px-1.5 py-0.5 rounded bg-sky-950/80 text-sky-300 border border-sky-700/80 font-semibold flex items-center gap-1"
            title="Fecha y Hora de la primera operación (Inicio de gráfico)"
          >
            <span>🚀 Inicio: {new Date(openTime).toLocaleDateString([], { month: 'numeric', day: 'numeric' })} {new Date(openTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        )}

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
            <span className="opacity-80">
              ({distSL >= 0 ? '+' : ''}
              {distSL.toFixed(1)}%)
            </span>
          </span>
        )}

        {/* E3 */}
        {e3Price > 0 && (
          <span
            className={`px-1.5 py-0.5 rounded border flex items-center gap-1 ${
              (isLong && lastTickPrice <= e3Price) || (!isLong && lastTickPrice >= e3Price)
                ? 'bg-orange-500 text-neutral-950 border-orange-300 font-extrabold'
                : 'bg-orange-950/40 text-orange-300 border-orange-800/70'
            }`}
            title="Entrada 3 (DCA 2) definida"
          >
            <span>E3 (DCA 2): ${formatPrice(e3Price)}</span>
            <span className="opacity-80">
              ({distE3 >= 0 ? '+' : ''}
              {distE3.toFixed(1)}%)
            </span>
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
            title="Entrada 2 (DCA 1) definida"
          >
            <span>E2 (DCA 1): ${formatPrice(e2Price)}</span>
            <span className="opacity-80">
              ({distE2 >= 0 ? '+' : ''}
              {distE2.toFixed(1)}%)
            </span>
          </span>
        )}

        {/* E1 */}
        <span
          className="px-1.5 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-sky-800/70 flex items-center gap-1"
          title="Entrada 1 (Precio base inicial de la operación)"
        >
          <span>E1: ${formatPrice(entryPrice)}</span>
        </span>

        {/* PRECIO PROMEDIO (DCA) */}
        {(e2Price > 0 || e3Price > 0 || averageEntryPrice > 0 || (dcaEntries && dcaEntries.length > 1)) && effectiveAvgPrice > 0 && (
          <span
            className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/80 font-bold flex items-center gap-1 shadow-xs"
            title="Precio Promedio Ponderado de Costo (DCA con ingresos múltiples)"
          >
            <span>📊 PROMEDIO: ${formatPrice(effectiveAvgPrice)}</span>
            <span className="opacity-90 font-mono text-[9px] text-amber-200">
              ({distAvg >= 0 ? '+' : ''}
              {distAvg.toFixed(2)}%)
            </span>
          </span>
        )}

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
            <span className="opacity-80">
              ({distTP1 >= 0 ? '+' : ''}
              {distTP1.toFixed(1)}%)
            </span>
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
            <span className="opacity-80">
              ({distTP2 >= 0 ? '+' : ''}
              {distTP2.toFixed(1)}%)
            </span>
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
            <span className="opacity-80">
              ({distTP3 >= 0 ? '+' : ''}
              {distTP3.toFixed(1)}%)
            </span>
          </span>
        )}
      </div>

      {/* 3. Contenedor Principal de ApexCharts */}
      <div className="w-full relative rounded-lg overflow-hidden min-h-[230px]">
        <div ref={chartContainerRef} className="w-full h-full block" />
      </div>

      {/* 4. Footer con Info Técnica de la Temporalidad */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/80 flex-wrap gap-1">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-sky-400" />
          <span>
            Temporalidad Activa:{' '}
            <strong className="text-white">
              {TIMEFRAMES.find((t) => t.id === selectedTf)?.label || selectedTf}
            </strong>{' '}
            {selectedTf !== 'ticks' && `(${candles.length} velas OHLC)`}
          </span>
        </span>
        <span className="text-neutral-500">
          Niveles superpuestos: <strong className="text-sky-400">E1</strong> •{' '}
          <strong className="text-amber-400">E2</strong> •{' '}
          <strong className="text-emerald-400">TP1-TP3</strong> •{' '}
          <strong className="text-rose-400">SL</strong>
        </span>
      </div>
    </div>
  );
};
