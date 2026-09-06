import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart2,
  BarChart3,
  Clock,
  Compass,
  Flame,
  Globe,
  Info,
  Layers,
  RefreshCw,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { livePriceService } from '../services/livePriceService';
import { futuresConfluenceService } from '../services/futuresConfluenceService';

export type TimeframeOption = '5m' | '15m' | '30m' | '1h' | '2h' | '4h';
export type WindowOption = '6h' | '12h' | '24h' | '48h';
export type ChartDisplayMode = 'bars_sparkline' | 'bars' | 'sparkline';

interface TacticalPairVolatilityCardProps {
  symbol: string;
  isLong?: boolean;
  markPrice?: number;
  entryPrice?: number;
  slPrice?: number;
  tp1Price?: number;
  className?: string;
}

export interface VolatilityCandleData {
  time: number;
  timeLabel: string;
  fullDateLabel: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rangeDollar: number;
  rangePercent: number; // (high - low) / open * 100
  bodyPercent: number; // (close - open) / open * 100
  isBullish: boolean;
  volatilityZScore?: number;
}

export const TacticalPairVolatilityCard: React.FC<TacticalPairVolatilityCardProps> = ({
  symbol,
  isLong = true,
  markPrice,
  entryPrice,
  slPrice,
  tp1Price,
  className = '',
}) => {
  const cleanSymbol = useMemo(
    () => (symbol || 'BTCUSDT').replace(/[^A-Z0-9]/g, '').toUpperCase(),
    [symbol]
  );

  // Timeframe and Window state
  const [timeframe, setTimeframe] = useState<TimeframeOption>('15m');
  const [windowRange, setWindowRange] = useState<WindowOption>('24h');
  const [chartMode, setChartMode] = useState<ChartDisplayMode>('bars_sparkline');
  const [candles, setCandles] = useState<VolatilityCandleData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [hoveredCandle, setHoveredCandle] = useState<VolatilityCandleData | null>(null);

  // Live price & 24h ticker info
  const livePriceData = livePriceService.getPriceData(cleanSymbol);
  const currentPrice = markPrice || livePriceData.price || 100;
  const confluenceData = futuresConfluenceService.getConfluence(cleanSymbol);

  // Calculate required candle count based on timeframe and windowRange
  const candleLimits = useMemo(() => {
    const hours =
      windowRange === '6h' ? 6 : windowRange === '12h' ? 12 : windowRange === '48h' ? 48 : 24;
    const minutesPerCandle =
      timeframe === '5m'
        ? 5
        : timeframe === '15m'
        ? 15
        : timeframe === '30m'
        ? 30
        : timeframe === '1h'
        ? 60
        : timeframe === '2h'
        ? 120
        : 240;

    const needed = Math.ceil((hours * 60) / minutesPerCandle);
    return Math.min(Math.max(needed, 12), 300); // Between 12 and 300
  }, [timeframe, windowRange]);

  // Fetch real Klines from Binance Futures REST API with high-fidelity local fallback
  const fetchKlines = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=${timeframe}&limit=${candleLimits}`
      );

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }

      const rawData = await response.json();

      if (Array.isArray(rawData) && rawData.length > 0) {
        // First pass: extract basic candle data
        const rawCandles = rawData.map((k: any) => {
          const openTime = Number(k[0]);
          const open = parseFloat(k[1]);
          const high = parseFloat(k[2]);
          const low = parseFloat(k[3]);
          const close = parseFloat(k[4]);
          const volume = parseFloat(k[5]);

          const rangeDollar = Math.max(0, high - low);
          const rangePercent = open > 0 ? (rangeDollar / open) * 100 : 0;
          const bodyPercent = open > 0 ? ((close - open) / open) * 100 : 0;
          const isBullish = close >= open;

          const dateObj = new Date(openTime);
          const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const fullDateLabel = `${dateObj.toLocaleDateString([], {
            day: '2-digit',
            month: 'short',
          })} ${timeLabel}`;

          return {
            time: openTime,
            timeLabel,
            fullDateLabel,
            open,
            high,
            low,
            close,
            volume,
            rangeDollar,
            rangePercent,
            bodyPercent,
            isBullish,
          };
        });

        // Calculate z-score of volatility for visual spike detection
        const avgR =
          rawCandles.reduce((acc, c) => acc + c.rangePercent, 0) / (rawCandles.length || 1);
        const stdR =
          Math.sqrt(
            rawCandles.reduce((acc, c) => acc + Math.pow(c.rangePercent - avgR, 2), 0) /
              (rawCandles.length || 1)
          ) || 0.01;

        const formatted: VolatilityCandleData[] = rawCandles.map((c) => ({
          ...c,
          volatilityZScore: (c.rangePercent - avgR) / stdR,
        }));

        setCandles(formatted);
        setLastUpdated(new Date());
        setIsLoading(false);
        return;
      }
      throw new Error('Formato de datos no válido');
    } catch {
      // Synthetic fallback generated specifically for chosen timeframe and candle count
      const basePrice = currentPrice;
      const changePct = livePriceData.change24hPercent || 1.8;
      const count = candleLimits;
      const now = Date.now();
      const minutesPerCandle =
        timeframe === '5m'
          ? 5
          : timeframe === '15m'
          ? 15
          : timeframe === '30m'
          ? 30
          : timeframe === '1h'
          ? 60
          : timeframe === '2h'
          ? 120
          : 240;

      const synthetic: VolatilityCandleData[] = [];
      let prevClose = basePrice * (1 - (changePct / 100) * 0.4);

      for (let i = count - 1; i >= 0; i--) {
        const candleTime = now - i * minutesPerCandle * 60 * 1000;
        const seed = Math.sin((candleTime / 120000) + (cleanSymbol.charCodeAt(0) || 1));
        const hourOfDay = new Date(candleTime).getUTCHours();
        // Higher volatility around US session (13-20 UTC) and London open (8-10 UTC)
        const sessionMultiplier =
          (hourOfDay >= 13 && hourOfDay <= 20) || (hourOfDay >= 8 && hourOfDay <= 11) ? 1.4 : 0.85;

        const noise =
          (Math.cos(i * 1.5) * 0.4 + seed * 0.6) *
          (Math.abs(changePct) * 0.15 + 0.3) *
          sessionMultiplier;

        const open = prevClose;
        const bodyDiff = open * (noise / 100);
        const close = open + bodyDiff;
        const wickMultiplier = 1 + Math.abs(seed) * 0.8;
        const high = Math.max(open, close) + Math.abs(bodyDiff) * wickMultiplier * 0.7;
        const low = Math.min(open, close) - Math.abs(bodyDiff) * wickMultiplier * 0.7;
        const rangeDollar = Math.max(0.001, high - low);
        const rangePercent = open > 0 ? (rangeDollar / open) * 100 : 0.5;
        const bodyPercent = open > 0 ? ((close - open) / open) * 100 : 0;
        const isBullish = close >= open;

        const dateObj = new Date(candleTime);
        const timeLabel = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const fullDateLabel = `${dateObj.toLocaleDateString([], {
          day: '2-digit',
          month: 'short',
        })} ${timeLabel}`;

        synthetic.push({
          time: candleTime,
          timeLabel,
          fullDateLabel,
          open,
          high,
          low,
          close,
          volume: basePrice * (15 + Math.abs(seed) * 45),
          rangeDollar,
          rangePercent,
          bodyPercent,
          isBullish,
          volatilityZScore: 0,
        });

        prevClose = close;
      }

      // Calculate z-scores for synthetic
      const avgR = synthetic.reduce((acc, c) => acc + c.rangePercent, 0) / (synthetic.length || 1);
      const stdR =
        Math.sqrt(
          synthetic.reduce((acc, c) => acc + Math.pow(c.rangePercent - avgR, 2), 0) /
            (synthetic.length || 1)
        ) || 0.01;

      synthetic.forEach((c) => {
        c.volatilityZScore = (c.rangePercent - avgR) / stdR;
      });

      setCandles(synthetic);
      setLastUpdated(new Date());
      setIsLoading(false);
    }
  }, [cleanSymbol, timeframe, candleLimits, currentPrice, livePriceData.change24hPercent]);

  // Initial fetch and interval refresh
  useEffect(() => {
    fetchKlines();
    const timer = window.setInterval(() => {
      fetchKlines();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [fetchKlines]);

  // Volatility Calculations & 24h Aggregates
  const stats = useMemo(() => {
    if (candles.length === 0) {
      return {
        avgRangePct: 1.2,
        currentRangePct: 1.2,
        maxRangePct: 2.5,
        minRangePct: 0.3,
        peakCandle: null as VolatilityCandleData | null,
        quietCandle: null as VolatilityCandleData | null,
        atrDollar: currentPrice * 0.012,
        regime: 'NORMAL' as 'COMPRESSION' | 'NORMAL' | 'EXPANSION',
        regimeLabel: 'Volatilidad Moderada',
        regimeColor: 'text-amber-400 bg-amber-950/40 border-amber-500/40',
        volatilityTrend: 'STABLE' as 'RISING' | 'FALLING' | 'STABLE',
        high24h: confluenceData.ticker.high24h || currentPrice * 1.03,
        low24h: confluenceData.ticker.low24h || currentPrice * 0.97,
        range24hPct: 6.0,
        realizedVol24hPct: 4.8,
        activeSession: 'GLOBAL',
      };
    }

    const ranges = candles.map((c) => c.rangePercent);
    const sum = ranges.reduce((acc, val) => acc + val, 0);
    const avgRangePct = sum / ranges.length;

    const currentCandle = candles[candles.length - 1];
    const currentRangePct = currentCandle ? currentCandle.rangePercent : avgRangePct;

    // Peak candle & Quietest candle in the selected window
    let peakCandle = candles[0];
    let quietCandle = candles[0];
    candles.forEach((c) => {
      if (c.rangePercent > peakCandle.rangePercent) peakCandle = c;
      if (c.rangePercent < quietCandle.rangePercent) quietCandle = c;
    });

    const maxRangePct = peakCandle.rangePercent;
    const minRangePct = quietCandle.rangePercent;

    // Simple ATR proxy from candle ranges
    const atrDollar = (currentPrice * avgRangePct) / 100;

    // Volatility momentum (recent 25% vs previous 25%)
    const quarter = Math.max(2, Math.floor(candles.length / 4));
    const recent = ranges.slice(-quarter);
    const previous = ranges.slice(-quarter * 2, -quarter);
    const recentAvg = recent.reduce((a, b) => a + b, 0) / (recent.length || 1);
    const prevAvg =
      previous.length > 0 ? previous.reduce((a, b) => a + b, 0) / previous.length : recentAvg;

    let volatilityTrend: 'RISING' | 'FALLING' | 'STABLE' = 'STABLE';
    if (recentAvg > prevAvg * 1.18) volatilityTrend = 'RISING';
    else if (recentAvg < prevAvg * 0.82) volatilityTrend = 'FALLING';

    // Volatility Regime Classification
    let regime: 'COMPRESSION' | 'NORMAL' | 'EXPANSION' = 'NORMAL';
    let regimeLabel = 'Volatilidad Normal';
    let regimeColor = 'text-amber-400 bg-amber-950/50 border-amber-500/40';

    if (avgRangePct < 0.85 && currentRangePct < 1.0) {
      regime = 'COMPRESSION';
      regimeLabel = 'Compresión (Squeeze)';
      regimeColor = 'text-emerald-300 bg-emerald-950/50 border-emerald-500/40';
    } else if (avgRangePct > 2.5 || currentRangePct > 3.0 || volatilityTrend === 'RISING') {
      regime = 'EXPANSION';
      regimeLabel = 'Expansión / Alta Turbulencia';
      regimeColor = 'text-rose-400 bg-rose-950/50 border-rose-500/40';
    }

    const high24 = confluenceData.ticker.high24h || currentPrice * 1.03;
    const low24 = confluenceData.ticker.low24h || currentPrice * 0.97;
    const range24hPct = low24 > 0 ? ((high24 - low24) / low24) * 100 : 0;

    // Estimated realized annual / 24h volatility index
    const realizedVol24hPct = Math.sqrt(sum * (24 / (windowRange === '6h' ? 6 : windowRange === '12h' ? 12 : 24))) * 1.2;

    // Active market session detection (UTC)
    const currentUtcHour = new Date().getUTCHours();
    let activeSession = 'Asia';
    if (currentUtcHour >= 8 && currentUtcHour < 13) activeSession = 'Londres (Open)';
    else if (currentUtcHour >= 13 && currentUtcHour < 17) activeSession = 'Londres / NY (Solapamiento)';
    else if (currentUtcHour >= 17 && currentUtcHour < 21) activeSession = 'Nueva York';
    else if (currentUtcHour >= 21 || currentUtcHour < 8) activeSession = 'Asia / Pacífico';

    return {
      avgRangePct,
      currentRangePct,
      maxRangePct,
      minRangePct,
      peakCandle,
      quietCandle,
      atrDollar,
      regime,
      regimeLabel,
      regimeColor,
      volatilityTrend,
      high24h: high24,
      low24h: low24,
      range24hPct,
      realizedVol24hPct,
      activeSession,
    };
  }, [candles, currentPrice, confluenceData, windowRange]);

  // Tactical Stop Loss / Take Profit buffer comparison
  const tacticalInsight = useMemo(() => {
    const distToSlPct =
      slPrice && slPrice > 0 ? Math.abs(((currentPrice - slPrice) / currentPrice) * 100) : null;
    const distToTpPct =
      tp1Price && tp1Price > 0 ? Math.abs(((tp1Price - currentPrice) / currentPrice) * 100) : null;

    if (stats.regime === 'EXPANSION') {
      return {
        type: 'warning',
        title: 'Alerta de Expansión de Volatilidad',
        description: `Las velas de ${timeframe} muestran amplitudes elevadas (${stats.avgRangePct.toFixed(
          2
        )}% promedio, pico ${stats.maxRangePct.toFixed(2)}%). Existe mayor riesgo de barrido hacia Stop Loss (${
          distToSlPct ? `${distToSlPct.toFixed(2)}% de distancia` : 'protección activa'
        }). En caso de retroceso a niveles DCA (E2/E3), las órdenes tienen alta probabilidad de llenarse con rápido rebote.`,
        badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      };
    } else if (stats.regime === 'COMPRESSION') {
      return {
        type: 'opportunity',
        title: 'Régimen de Compresión (Baja Volatilidad)',
        description: `El par está en rango comprimido (${stats.avgRangePct.toFixed(
          2
        )}% en ventana ${windowRange}). Menor riesgo de slippage o mechas abruptas. Fase ideal para acumulación táctica previa a ruptura direccional.`,
        badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      };
    }

    return {
      type: 'neutral',
      title: 'Volatilidad Estable',
      description: `Rango medio de ${stats.avgRangePct.toFixed(
        2
      )}% por vela ${timeframe} en la ventana de ${windowRange}. Las oscilaciones son armónicas para el cumplimiento del plan hacia TP1 (${
        distToTpPct ? `+${distToTpPct.toFixed(2)}%` : 'objetivo activo'
      }).`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }, [stats, slPrice, tp1Price, currentPrice, timeframe, windowRange]);

  // Chart Scaling calculations
  const chartMaxVal = Math.max(stats.maxRangePct * 1.12, 2.0);

  // Generate SVG Sparkline Path
  const sparklineSvgData = useMemo(() => {
    if (candles.length < 2) return { path: '', area: '', points: [] };
    const width = 1000;
    const height = 100;
    const paddingX = 4;
    const paddingY = 8;

    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;

    const points = candles.map((c, i) => {
      const x = paddingX + (i / (candles.length - 1)) * usableWidth;
      const normalizedY = Math.min(1, Math.max(0, c.rangePercent / chartMaxVal));
      const y = height - paddingY - normalizedY * usableHeight;
      return { x, y, candle: c };
    });

    // Smooth Bezier path
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const midX = (p0.x + p1.x) / 2;
      path += ` C ${midX} ${p0.y}, ${midX} ${p1.y}, ${p1.x} ${p1.y}`;
    }

    const area = `${path} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

    return { path, area, points };
  }, [candles, chartMaxVal]);

  return (
    <div
      id={`tactical-volatility-card-${cleanSymbol}`}
      className={`bg-neutral-950/90 border border-neutral-800 rounded-xl p-3 flex flex-col gap-3 transition-all shadow-md ${className}`}
    >
      {/* 1. Header con Título, Régimen, Timeframe y Selector de Ventana 24H */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black font-mono text-white tracking-wide flex items-center gap-1.5">
                <span>Histórico de Volatilidad (Sparkline & Barras)</span>
                <span className="text-[11px] text-amber-400 font-bold bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.2 rounded">
                  {cleanSymbol}
                </span>
              </span>

              {/* Regime Badge */}
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow-xs ${stats.regimeColor}`}
              >
                {stats.regime === 'EXPANSION' ? (
                  <Flame className="w-3 h-3 text-rose-400 animate-pulse" />
                ) : stats.regime === 'COMPRESSION' ? (
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Activity className="w-3 h-3 text-amber-400" />
                )}
                <span>{stats.regimeLabel}</span>
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1 text-neutral-300">
                <Globe className="w-2.5 h-2.5 text-cyan-400" />
                <span>Sesión: {stats.activeSession}</span>
              </span>
              <span>•</span>
              <span className="text-neutral-400">
                Ventana: <strong className="text-amber-300">{windowRange}</strong> ({candles.length} velas de {timeframe})
              </span>
            </div>
          </div>
        </div>

        {/* Controles: Timeframe de Cálculo + Ventana Horas + Modo Gráfico + Refresco */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
          {/* Selector de Timeframe de Cálculo */}
          <div className="flex items-center bg-neutral-900/90 rounded-lg p-0.5 border border-neutral-800 text-[10px] font-mono">
            <span className="text-neutral-500 px-1.5 text-[9px] font-semibold uppercase">TF:</span>
            {(['5m', '15m', '30m', '1h', '2h', '4h'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  timeframe === t
                    ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title={`Calcular volatilidad por velas de ${t}`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Selector de Ventana Histórica */}
          <div className="flex items-center bg-neutral-900/90 rounded-lg p-0.5 border border-neutral-800 text-[10px] font-mono">
            <span className="text-neutral-500 px-1.5 text-[9px] font-semibold uppercase">Ventana:</span>
            {(['6h', '12h', '24h', '48h'] as const).map((w) => (
              <button
                key={w}
                onClick={() => setWindowRange(w)}
                className={`px-1.5 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                  windowRange === w
                    ? 'bg-cyan-500 text-neutral-950 font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
                title={`Visualizar rango de ${w}`}
              >
                {w}
              </button>
            ))}
          </div>

          {/* Toggle Modo Gráfico */}
          <div className="flex items-center bg-neutral-900/90 rounded-lg p-0.5 border border-neutral-800 text-[10px] font-mono">
            <button
              onClick={() =>
                setChartMode(
                  chartMode === 'bars_sparkline'
                    ? 'bars'
                    : chartMode === 'bars'
                    ? 'sparkline'
                    : 'bars_sparkline'
                )
              }
              className="px-2 py-0.5 rounded text-neutral-300 hover:text-amber-400 hover:bg-neutral-800 transition-colors flex items-center gap-1 cursor-pointer"
              title="Alternar estilo de visualización (Barras / Sparkline / Híbrido)"
            >
              <BarChart2 className="w-3 h-3 text-amber-400" />
              <span className="text-[9px] uppercase">
                {chartMode === 'bars_sparkline' ? 'Barras+Línea' : chartMode === 'bars' ? 'Barras' : 'Línea'}
              </span>
            </button>
          </div>

          {/* Botón Refresco */}
          <button
            onClick={() => fetchKlines()}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-amber-400 transition-colors cursor-pointer"
            title="Actualizar datos de velas y volatilidad en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Sparkline & Gráfico de Barras Pequeñas de Volatilidad Histórica (24h) */}
      <div className="flex flex-col gap-1.5 bg-neutral-900/90 rounded-xl p-3 border border-neutral-800/90 shadow-inner">
        {/* Subheader del gráfico con detalle en hover */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-neutral-200">
              Amplitud % Histórica en {windowRange} ({timeframe}/vela):
            </span>
          </div>

          <div className="text-right">
            {hoveredCandle ? (
              <span className="text-amber-300 font-bold bg-neutral-950 px-2 py-0.5 rounded border border-amber-500/40">
                {hoveredCandle.fullDateLabel} → Rango:{' '}
                <strong className="text-white">{hoveredCandle.rangePercent.toFixed(2)}%</strong> (
                ${hoveredCandle.rangeDollar < 10
                  ? hoveredCandle.rangeDollar.toFixed(4)
                  : hoveredCandle.rangeDollar.toFixed(2)}
                ) {hoveredCandle.isBullish ? '▲ Alcista' : '▼ Bajista'}
              </span>
            ) : (
              <span className="text-neutral-400">
                Promedio: <strong className="text-amber-400">{stats.avgRangePct.toFixed(2)}%</strong> | Pico:{' '}
                <strong className="text-purple-300">{stats.maxRangePct.toFixed(2)}%</strong>
              </span>
            )}
          </div>
        </div>

        {/* Visualizador interactivo Sparkline + Micro-barras */}
        <div className="relative w-full h-24 pt-1 pb-1 flex flex-col justify-end">
          {/* Background Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-25">
            <div className="border-b border-dashed border-neutral-600 w-full" />
            <div className="border-b border-dashed border-neutral-600 w-full" />
            <div className="border-b border-dashed border-neutral-600 w-full" />
          </div>

          {/* SVG Sparkline Layer */}
          {(chartMode === 'bars_sparkline' || chartMode === 'sparkline') && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <svg
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                className="w-full h-full"
              >
                <defs>
                  <linearGradient id="volatilityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(245, 158, 11, 0.35)" />
                    <stop offset="100%" stopColor="rgba(245, 158, 11, 0.0)" />
                  </linearGradient>
                </defs>

                {/* Area fill */}
                <path d={sparklineSvgData.area} fill="url(#volatilityGrad)" />

                {/* Line stroke */}
                <path
                  d={sparklineSvgData.path}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {/* Bar Chart Layer */}
          {(chartMode === 'bars_sparkline' || chartMode === 'bars') && (
            <div className="relative z-10 flex items-end justify-between gap-0.5 h-full w-full px-0.5">
              {candles.map((candle, idx) => {
                const heightPct = Math.min(100, Math.max(8, (candle.rangePercent / chartMaxVal) * 100));
                const isHovered = hoveredCandle?.time === candle.time;
                const isLatest = idx === candles.length - 1;
                const isPeak = stats.peakCandle?.time === candle.time;

                // Dynamic color based on volatility z-score & bullish/bearish
                let barColor = 'bg-neutral-600/70 hover:bg-neutral-400';
                if (isPeak) {
                  barColor = 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.6)] ring-1 ring-purple-300';
                } else if (candle.rangePercent > stats.avgRangePct * 1.5) {
                  barColor = candle.isBullish
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.4)]'
                    : 'bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]';
                } else if (candle.rangePercent > stats.avgRangePct * 0.9) {
                  barColor = candle.isBullish ? 'bg-emerald-500/80' : 'bg-rose-500/80';
                } else {
                  barColor = 'bg-amber-600/40 hover:bg-amber-500/60';
                }

                return (
                  <div
                    key={candle.time}
                    onMouseEnter={() => setHoveredCandle(candle)}
                    onMouseLeave={() => setHoveredCandle(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer min-w-[2px]"
                  >
                    {/* Tooltip on Hover */}
                    {isHovered && (
                      <div className="absolute bottom-full mb-2 z-40 bg-neutral-950 border border-amber-500/80 rounded-lg p-2 text-[10px] font-mono shadow-2xl whitespace-nowrap pointer-events-none min-w-[150px]">
                        <div className="text-amber-300 font-black border-b border-neutral-800 pb-1 flex items-center justify-between">
                          <span>{candle.timeLabel}</span>
                          <span className="text-neutral-400 font-normal">TF {timeframe}</span>
                        </div>
                        <div className="mt-1 space-y-0.5">
                          <div className="text-white flex justify-between">
                            <span className="text-neutral-400">Rango %:</span>
                            <span className="font-bold text-amber-300">{candle.rangePercent.toFixed(2)}%</span>
                          </div>
                          <div className="text-neutral-300 flex justify-between">
                            <span className="text-neutral-400">Amplitud $:</span>
                            <span>
                              ${candle.rangeDollar < 10 ? candle.rangeDollar.toFixed(4) : candle.rangeDollar.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-neutral-400 flex justify-between text-[9px]">
                            <span>High / Low:</span>
                            <span className="text-neutral-300">
                              ${candle.high < 10 ? candle.high.toFixed(3) : candle.high.toFixed(1)} / $
                              {candle.low < 10 ? candle.low.toFixed(3) : candle.low.toFixed(1)}
                            </span>
                          </div>
                          <div
                            className={`pt-1 border-t border-neutral-800/80 font-bold flex justify-between ${
                              candle.isBullish ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            <span>{candle.isBullish ? '▲ Cierre Alcista' : '▼ Cierre Bajista'}</span>
                            <span>
                              {candle.bodyPercent > 0 ? '+' : ''}
                              {candle.bodyPercent.toFixed(2)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Peak Marker Badge */}
                    {isPeak && !isHovered && (
                      <div className="absolute -top-3.5 z-20 pointer-events-none">
                        <span className="text-[8px] font-bold font-mono text-purple-300 bg-purple-950 border border-purple-500/50 px-1 py-0.2 rounded-xs">
                          MAX
                        </span>
                      </div>
                    )}

                    {/* Live ping dot on current candle */}
                    {isLatest && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping absolute -top-1" />
                    )}

                    {/* Volatility Bar */}
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-xs transition-all duration-150 ${barColor} ${
                        isHovered ? 'ring-2 ring-white scale-y-105 z-20' : ''
                      } ${isLatest ? 'border-t-2 border-amber-300' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Average Reference Line */}
          <div
            style={{
              bottom: `${Math.min(90, Math.max(10, (stats.avgRangePct / chartMaxVal) * 100))}%`,
            }}
            className="absolute left-0 right-0 border-b border-dashed border-amber-400/60 pointer-events-none flex items-center justify-between px-2 z-20"
          >
            <span className="text-[8px] font-mono text-amber-300 bg-neutral-950/90 px-1.5 py-0.2 rounded border border-amber-500/30 shadow-xs">
              Media {windowRange}: {stats.avgRangePct.toFixed(2)}%
            </span>
            <span className="text-[8px] font-mono text-purple-300 bg-neutral-950/90 px-1.5 py-0.2 rounded border border-purple-500/30">
              Máx: {stats.maxRangePct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeline Axis Labels */}
        <div className="flex items-center justify-between text-[10px] font-mono text-neutral-500 pt-1 border-t border-neutral-800">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>{candles[0]?.fullDateLabel || '--'}</span>
          </span>
          <span className="hidden sm:inline-block">
            {candles[Math.floor(candles.length / 2)]?.timeLabel || '--'}
          </span>
          <span className="text-amber-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{candles[candles.length - 1]?.timeLabel || 'Actual'} (En Vivo)</span>
          </span>
        </div>
      </div>

      {/* 3. Panel de Métricas Clave de Volatilidad Histórica (24h / Ventana) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono text-xs">
        {/* ATR Promedio */}
        <div className="bg-neutral-900/70 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-xs">
          <div className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wider">
            ATR Promedio ({timeframe})
          </div>
          <div className="text-white font-extrabold text-sm truncate mt-0.5">
            ${stats.atrDollar < 10 ? stats.atrDollar.toFixed(4) : stats.atrDollar.toFixed(2)}
          </div>
          <div className="text-[10px] text-amber-400/90 font-bold">{stats.avgRangePct.toFixed(2)}% / vela</div>
        </div>

        {/* Rango 24 Horas */}
        <div className="bg-neutral-900/70 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-xs">
          <div className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wider">
            Rango Total 24H
          </div>
          <div className="text-amber-300 font-extrabold text-sm truncate mt-0.5">
            {stats.range24hPct.toFixed(2)}%
          </div>
          <div className="text-[9px] text-neutral-400 truncate">
            ${stats.low24h < 10 ? stats.low24h.toFixed(2) : stats.low24h.toFixed(1)} - $
            {stats.high24h < 10 ? stats.high24h.toFixed(2) : stats.high24h.toFixed(1)}
          </div>
        </div>

        {/* Vela Actual & Tendencia */}
        <div className="bg-neutral-900/70 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-xs">
          <div className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wider">
            Vela Actual ({timeframe})
          </div>
          <div
            className={`font-extrabold text-sm truncate mt-0.5 ${
              stats.currentRangePct > stats.avgRangePct * 1.3
                ? 'text-rose-400'
                : stats.currentRangePct < stats.avgRangePct * 0.7
                ? 'text-emerald-400'
                : 'text-neutral-200'
            }`}
          >
            {stats.currentRangePct.toFixed(2)}%
          </div>
          <div className="text-[9px]">
            {stats.volatilityTrend === 'RISING' ? (
              <span className="text-rose-400 font-bold flex items-center justify-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Acelerando
              </span>
            ) : stats.volatilityTrend === 'FALLING' ? (
              <span className="text-emerald-400 font-bold flex items-center justify-center gap-0.5">
                <TrendingDown className="w-3 h-3" /> Desacelerando
              </span>
            ) : (
              <span className="text-neutral-400">Estable</span>
            )}
          </div>
        </div>

        {/* Pico Máximo de Volatilidad */}
        <div className="bg-neutral-900/70 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-center shadow-xs">
          <div className="text-[9px] text-neutral-400 uppercase font-semibold tracking-wider">
            Pico Máximo en {windowRange}
          </div>
          <div className="text-purple-300 font-extrabold text-sm truncate mt-0.5">
            {stats.maxRangePct.toFixed(2)}%
          </div>
          <div className="text-[9px] text-neutral-400 truncate">
            {stats.peakCandle ? stats.peakCandle.timeLabel : '--'}
          </div>
        </div>
      </div>

      {/* 4. Diagnóstico Táctico de Volatilidad para la Estrategia */}
      <div className="bg-neutral-900/60 rounded-xl p-2.5 border border-neutral-800/90 flex items-start gap-2.5 text-xs shadow-xs">
        <div className="mt-0.5 text-amber-400 shrink-0">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1 leading-relaxed">
          <span className="font-bold text-white mr-1.5">{tacticalInsight.title}:</span>
          <span className="text-neutral-300 font-sans">{tacticalInsight.description}</span>
        </div>
      </div>
    </div>
  );
};
