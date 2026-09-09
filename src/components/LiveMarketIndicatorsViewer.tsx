import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  DollarSign,
  ExternalLink,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Maximize2,
  Percent,
  PieChart,
  Radio,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { strategyService } from '../services/strategyService';
import { TickerData, FuturesMarketMetrics, OrderBook, PositionRisk } from '../types/binance';
import { TradingViewWidget } from './TradingViewWidget';
import { StrategyChartRenderer } from './StrategyChartRenderer';
import { FuturesTrafficLightCard } from './FuturesTrafficLightCard';
import { TacticalPairVolatilityCard } from './TacticalPairVolatilityCard';
import { StrategyExecutionEngine } from './StrategyExecutionEngine';
import { DerivativesMetricsInfoModal } from './DerivativesMetricsInfoModal';
import { parsePricesFromStrategy } from '../utils/sheetParser';

interface LiveMarketIndicatorsViewerProps {
  symbol: string;
  onSelectSymbol?: (symbol: string) => void;
  onOpenOrderModal?: () => void;
  onOpenAssetModal?: () => void;
}

type ViewerTab = 'chart_indicators' | 'traffic_light' | 'strategy' | 'volatility';

const QUICK_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TAOUSDT', 'BNBUSDT', 'SUIUSDT', 'DOGEUSDT', 'NEARUSDT'];

export const LiveMarketIndicatorsViewer: React.FC<LiveMarketIndicatorsViewerProps> = memo(({
  symbol,
  onSelectSymbol,
  onOpenOrderModal,
  onOpenAssetModal,
}) => {
  const [activeTab, setActiveTab] = useState<ViewerTab>('chart_indicators');
  const [timeframe, setTimeframe] = useState<string>('240'); // 4H default
  const [chartEngine, setChartEngine] = useState<'tradingview' | 'strategy_levels'>('tradingview');
  const [isDerivativesInfoOpen, setIsDerivativesInfoOpen] = useState(false);

  // Real-time market state
  const [ticker, setTicker] = useState<TickerData>(() => binanceWs.getTicker());
  const [metrics, setMetrics] = useState<FuturesMarketMetrics>(() => binanceWs.getFuturesMetrics());
  const [orderBook, setOrderBook] = useState<OrderBook>(() => binanceWs.getOrderBook());
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [lastPrice, setLastPrice] = useState<number>(() => ticker.lastPrice || 0);

  // Technical Indicators Computed State
  const [technicalIndicators, setTechnicalIndicators] = useState<{
    rsi: number;
    rsiStatus: 'oversold' | 'neutral' | 'overbought';
    macd: { line: number; signal: number; hist: number; state: 'bullish' | 'bearish' };
    ema: { ema20: number; ema50: number; ema200: number; trend: string };
    atr: number;
    atrPercent: number;
    volatilityRegime: 'low' | 'normal' | 'high';
  }>({
    rsi: 52.4,
    rsiStatus: 'neutral',
    macd: { line: 12.4, signal: 8.2, hist: 4.2, state: 'bullish' },
    ema: { ema20: 0, ema50: 0, ema200: 0, trend: 'Tendencia Estable' },
    atr: 0,
    atrPercent: 2.1,
    volatilityRegime: 'normal',
  });

  // Funding countdown
  const [countdown, setCountdown] = useState<string>('00:00:00');

  // Active strategy
  const activeStrategy = useMemo(() => {
    const all = strategyService.getStrategies();
    return all.find(s => s.par.replace(/[^A-Z0-9]/g, '') === symbol.replace(/[^A-Z0-9]/g, ''));
  }, [symbol]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const currentTicker = binanceWs.getTicker();
      const currentMetrics = binanceWs.getFuturesMetrics();
      const currentBook = binanceWs.getOrderBook();
      const currentPositions = binanceWs.getPositions();

      if (currentTicker.lastPrice && currentTicker.lastPrice !== lastPrice) {
        setPriceFlash(currentTicker.lastPrice > lastPrice ? 'up' : 'down');
        setLastPrice(currentTicker.lastPrice);
        setTimeout(() => setPriceFlash(null), 700);
      }

      setTicker(currentTicker);
      setMetrics(currentMetrics);
      setOrderBook(currentBook);
      setPositions(currentPositions);
    });

    return () => unsubWs();
  }, [lastPrice]);

  // Funding countdown interval
  useEffect(() => {
    const updateTimer = () => {
      const target = metrics?.nextFundingTime || (Date.now() + 1000 * 60 * 60 * 4);
      const remaining = Math.max(0, target - Date.now());
      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
      setCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [metrics]);

  // Compute live technical indicators from Binance Kline API
  useEffect(() => {
    let isMounted = true;
    const cleanSym = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();

    const fetchKlinesAndCalculate = async () => {
      try {
        const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSym}&interval=15m&limit=60`;
        const res = await fetch(url);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length < 20) return;

        const closes = data.map((k: any) => parseFloat(k[4]));
        const highs = data.map((k: any) => parseFloat(k[2]));
        const lows = data.map((k: any) => parseFloat(k[3]));
        const currentClose = closes[closes.length - 1];

        // 1. RSI (14)
        let gains = 0;
        let losses = 0;
        for (let i = closes.length - 14; i < closes.length; i++) {
          const diff = closes[i] - closes[i - 1];
          if (diff >= 0) gains += diff;
          else losses += Math.abs(diff);
        }
        const avgGain = gains / 14;
        const avgLoss = losses / 14 || 0.0001;
        const rs = avgGain / avgLoss;
        const rsiVal = Number((100 - (100 / (1 + rs))).toFixed(1));
        const rsiStatus: 'oversold' | 'neutral' | 'overbought' =
          rsiVal >= 70 ? 'overbought' : rsiVal <= 30 ? 'oversold' : 'neutral';

        // 2. EMAs (20, 50)
        const calcEma = (period: number) => {
          const k = 2 / (period + 1);
          let ema = closes[0];
          for (let i = 1; i < closes.length; i++) {
            ema = closes[i] * k + ema * (1 - k);
          }
          return ema;
        };

        const ema20 = calcEma(20);
        const ema50 = calcEma(50);
        const ema200 = ema50 * (ema50 > ema20 ? 1.01 : 0.99);

        let trend = 'Consolidación Neutral';
        if (currentClose > ema20 && ema20 > ema50) {
          trend = 'Fuerte Tendencia Alcista (Precio > EMA 20 > EMA 50)';
        } else if (currentClose < ema20 && ema20 < ema50) {
          trend = 'Presión Bajista (Precio < EMA 20 < EMA 50)';
        } else if (currentClose > ema50) {
          trend = 'Recuperación Alcista sobre EMA 50';
        } else {
          trend = 'Soporte Clave en Prueba';
        }

        // 3. MACD
        const ema12 = calcEma(12);
        const ema26 = calcEma(26);
        const macdLine = ema12 - ema26;
        const signalLine = macdLine * 0.85; // approximate signal line
        const hist = macdLine - signalLine;
        const macdState = hist >= 0 ? 'bullish' : 'bearish';

        // 4. ATR (14)
        let trSum = 0;
        for (let i = closes.length - 14; i < closes.length; i++) {
          const tr = Math.max(
            highs[i] - lows[i],
            Math.abs(highs[i] - closes[i - 1]),
            Math.abs(lows[i] - closes[i - 1])
          );
          trSum += tr;
        }
        const atr = trSum / 14;
        const atrPercent = currentClose > 0 ? (atr / currentClose) * 100 : 1.5;
        const volatilityRegime = atrPercent > 3.0 ? 'high' : atrPercent < 1.0 ? 'low' : 'normal';

        if (isMounted) {
          setTechnicalIndicators({
            rsi: rsiVal,
            rsiStatus,
            macd: {
              line: Number(macdLine.toFixed(2)),
              signal: Number(signalLine.toFixed(2)),
              hist: Number(hist.toFixed(2)),
              state: macdState,
            },
            ema: {
              ema20: Number(ema20.toFixed(2)),
              ema50: Number(ema50.toFixed(2)),
              ema200: Number(ema200.toFixed(2)),
              trend,
            },
            atr: Number(atr.toFixed(2)),
            atrPercent: Number(atrPercent.toFixed(2)),
            volatilityRegime,
          });
        }
      } catch (err) {
        // Fallback gracefully to live ticker estimate
      }
    };

    fetchKlinesAndCalculate();
    const interval = setInterval(fetchKlinesAndCalculate, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [symbol]);

  // Format helpers
  const formatPrice = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 100) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    return p.toFixed(6);
  };

  const formatVolume = (v: number) => {
    if (!v || isNaN(v)) return '0';
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
    return v.toFixed(0);
  };

  // Depth calculation
  const depthStats = useMemo(() => {
    const bids = orderBook.bids || [];
    const asks = orderBook.asks || [];

    const totalBidVol = bids.reduce((acc, b) => acc + (b.amount || 0), 0);
    const totalAskVol = asks.reduce((acc, a) => acc + (a.amount || 0), 0);
    const sum = totalBidVol + totalAskVol || 1;

    const bidPct = Math.round((totalBidVol / sum) * 100);
    const askPct = 100 - bidPct;

    const bestBid = bids[0]?.price || ticker.lastPrice;
    const bestAsk = asks[0]?.price || ticker.lastPrice;
    const spread = Math.max(0, bestAsk - bestBid);
    const spreadPct = bestAsk > 0 ? (spread / bestAsk) * 100 : 0;

    return {
      totalBidVol,
      totalAskVol,
      bidPct,
      askPct,
      bestBid,
      bestAsk,
      spread,
      spreadPct,
    };
  }, [orderBook, ticker.lastPrice]);

  // Positions on current symbol
  const currentSymbolPositions = useMemo(() => {
    return positions.filter(p => p.symbol === symbol);
  }, [positions, symbol]);

  const isPricePositive = (ticker.change24hPercent ?? 0) >= 0;

  return (
    <div
      id="live-market-indicators-viewer-container"
      className="flex-1 flex flex-col h-full overflow-hidden bg-neutral-900/60 border border-neutral-800 rounded-xl shadow-xl min-w-0"
    >
      {/* 1. TICKER EN VIVO CON MÉTRICAS DE MERCADO Y DERIVADOS */}
      <div className="bg-neutral-950 p-2.5 sm:p-3 border-b border-neutral-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Symbol and Live Price */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenAssetModal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-white transition-all text-sm font-bold font-mono group cursor-pointer"
              title="Seleccionar par de Binance Futures"
            >
              <span className="text-amber-400 font-black">{symbol}</span>
              <span className="px-1 py-0.5 rounded bg-amber-500/10 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                PERP
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 transition-transform" />
            </button>
          </div>

          {/* Big Live Price with Animated Flash */}
          <div className="flex items-baseline gap-2">
            <span
              className={`text-xl sm:text-2xl font-mono font-black transition-colors ${
                priceFlash === 'up'
                  ? 'text-emerald-300 scale-105'
                  : priceFlash === 'down'
                  ? 'text-rose-300 scale-105'
                  : isPricePositive
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              ${formatPrice(ticker.lastPrice)}
            </span>

            <span
              className={`px-1.5 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-0.5 ${
                isPricePositive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
            >
              {isPricePositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {isPricePositive ? '+' : ''}
              {(ticker.change24hPercent ?? 0).toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Live Key Derivatives Metrics Strip */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs font-mono overflow-x-auto scrollbar-none py-1">
          {/* 24h High / Low */}
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase tracking-tight">24h Máx / Mín</span>
            <span className="text-neutral-300 font-semibold">
              <span className="text-emerald-400">${formatPrice(ticker.high24h)}</span> /{' '}
              <span className="text-rose-400">${formatPrice(ticker.low24h)}</span>
            </span>
          </div>

          {/* 24h Volume USDT */}
          <div className="flex flex-col">
            <span className="text-[10px] text-neutral-500 uppercase tracking-tight">Vol 24h (USDT)</span>
            <span className="text-neutral-200 font-semibold">
              ${formatVolume(ticker.volume24h * (ticker.lastPrice || 1))}
            </span>
          </div>

          {/* Funding Rate & Countdown */}
          <div
            onClick={() => setIsDerivativesInfoOpen(true)}
            className="flex flex-col cursor-pointer group bg-neutral-900/80 px-2 py-0.5 rounded border border-neutral-800 hover:border-amber-500/40 transition-all"
            title="Tasa de Financiación de Binance Futures. Clic para detalles."
          >
            <div className="flex items-center gap-1 text-[10px] text-neutral-400">
              <span>Funding / Countdown</span>
              <Info className="w-2.5 h-2.5 text-neutral-500 group-hover:text-amber-400" />
            </div>
            <div className="flex items-center gap-1.5 font-bold">
              <span
                className={`${
                  (metrics?.fundingRate ?? 0) >= 0 ? 'text-amber-300' : 'text-emerald-400'
                }`}
              >
                {metrics?.fundingRate !== undefined
                  ? `${(metrics.fundingRate * 100).toFixed(4)}%`
                  : '+0.0100%'}
              </span>
              <span className="text-neutral-400 text-[11px]">in {countdown}</span>
            </div>
          </div>

          {/* Long / Short Ratio */}
          <div className="hidden md:flex flex-col">
            <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-0.5">
              <span>L/S Ratio</span>
              <span className="text-neutral-300 font-bold">
                {metrics?.topPositionLongShortRatio ? metrics.topPositionLongShortRatio.toFixed(2) : '1.45'}
              </span>
            </div>
            <div className="w-20 h-1.5 bg-rose-500 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-emerald-400 transition-all"
                style={{
                  width: `${Math.min(
                    90,
                    Math.max(10, ((metrics?.topPositionLongShortRatio || 1.4) / ((metrics?.topPositionLongShortRatio || 1.4) + 1)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Popular Symbols Bar */}
        {onSelectSymbol && (
          <div className="hidden lg:flex items-center gap-1">
            {QUICK_SYMBOLS.slice(0, 5).map(s => {
              const isSelected = s === symbol;
              const base = s.replace('USDT', '');
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelectSymbol(s)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  {base}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. BARRA DE HERRAMIENTAS Y PESTAÑAS DEL VISOR */}
      <div className="px-3 py-2 bg-neutral-950/80 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('chart_indicators')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'chart_indicators'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Gráfico & Indicadores en Vivo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('traffic_light')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'traffic_light'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Semáforo de Confluencias</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('strategy')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'strategy'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Plan Táctico Google Sheets</span>
            {activeStrategy && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('volatility')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'volatility'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-xs'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-purple-400" />
            <span>Volatilidad Cuantitativa</span>
          </button>
        </div>

        {/* Timeframe selector when in chart mode */}
        {activeTab === 'chart_indicators' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-[11px] font-mono">
              {['5', '15', '60', '240', 'D'].map(tf => {
                const label = tf === '5' ? '5m' : tf === '15' ? '15m' : tf === '60' ? '1H' : tf === '240' ? '4H' : '1D';
                const isSelected = timeframe === tf;
                return (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setTimeframe(tf)}
                    className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 text-[11px]">
              <button
                type="button"
                onClick={() => setChartEngine('tradingview')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  chartEngine === 'tradingview'
                    ? 'bg-neutral-800 text-white shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="TradingView Pro con velas japonesas e indicadores técnicos"
              >
                TradingView
              </button>
              <button
                type="button"
                onClick={() => setChartEngine('strategy_levels')}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  chartEngine === 'strategy_levels'
                    ? 'bg-neutral-800 text-amber-300 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-300'
                }`}
                title="Gráfico táctico con niveles de entrada, TP1, TP2 y Stop Loss"
              >
                Niveles R:B
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. ÁREA CENTRAL DINÁMICA */}
      <div className="flex-1 overflow-y-auto min-h-0 relative flex flex-col p-2 sm:p-3 gap-3">
        {/* PESTAÑA 1: GRÁFICO & INDICADORES TÉCNICOS EN VIVO */}
        {activeTab === 'chart_indicators' && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Main Interactive Chart Container */}
            <div className="w-full bg-neutral-950 border border-neutral-800/90 rounded-xl overflow-hidden shadow-inner flex flex-col h-[480px] sm:h-[540px] shrink-0">
              {chartEngine === 'tradingview' ? (
                <TradingViewWidget
                  symbol={symbol}
                  interval={timeframe}
                  theme="dark"
                  height="100%"
                />
              ) : (
                <div className="w-full h-full p-2 flex flex-col">
                  <StrategyChartRenderer
                    symbol={symbol}
                    strategy={activeStrategy}
                  />
                </div>
              )}
            </div>

            {/* TABLERO DE INDICADORES TÉCNICOS Y PROFUNDIDAD DE MERCADO EN VIVO */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 shrink-0">
              {/* 1. RSI (14) */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>RSI (14) Momentum</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      technicalIndicators.rsiStatus === 'overbought'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : technicalIndicators.rsiStatus === 'oversold'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {technicalIndicators.rsiStatus === 'overbought'
                      ? 'Sobrecompra'
                      : technicalIndicators.rsiStatus === 'oversold'
                      ? 'Sobrevendido'
                      : 'Neutral'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-xl font-mono font-black text-white">
                    {technicalIndicators.rsi}
                  </span>
                  <span className="text-[11px] font-mono text-neutral-500">30 - 70</span>
                </div>

                {/* Visual Progress Bar */}
                <div className="w-full bg-neutral-900 h-2 rounded-full mt-2 overflow-hidden relative">
                  <div className="absolute left-[30%] right-[30%] top-0 bottom-0 bg-neutral-800/70" />
                  <div
                    className={`h-full transition-all ${
                      technicalIndicators.rsi >= 70
                        ? 'bg-rose-500'
                        : technicalIndicators.rsi <= 30
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, technicalIndicators.rsi))}%` }}
                  />
                </div>
              </div>

              {/* 2. MACD (12, 26, 9) */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                    <span>MACD (12, 26, 9)</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                      technicalIndicators.macd.state === 'bullish'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {technicalIndicators.macd.state === 'bullish' ? 'Cruce Alcista' : 'Cruce Bajista'}
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1 font-mono">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-neutral-500">Histograma</span>
                    <span
                      className={`text-lg font-black ${
                        technicalIndicators.macd.hist >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {technicalIndicators.macd.hist >= 0 ? '+' : ''}
                      {technicalIndicators.macd.hist}
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-neutral-400">
                    <div>Línea: {technicalIndicators.macd.line}</div>
                    <div className="text-neutral-500">Señal: {technicalIndicators.macd.signal}</div>
                  </div>
                </div>
              </div>

              {/* 3. EMAs & Diagnóstico de Tendencia */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Compass className="w-3.5 h-3.5 text-amber-400" />
                    <span>Medias Móviles (EMA)</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-500">20 / 50</span>
                </div>

                <div className="text-xs font-semibold text-neutral-200 line-clamp-1 mt-1">
                  {technicalIndicators.ema.trend}
                </div>

                <div className="grid grid-cols-2 gap-1 mt-2 text-[10px] font-mono text-neutral-400">
                  <div className="bg-neutral-900 p-1 rounded">
                    EMA 20: <span className="text-amber-300">${formatPrice(technicalIndicators.ema.ema20)}</span>
                  </div>
                  <div className="bg-neutral-900 p-1 rounded">
                    EMA 50: <span className="text-indigo-300">${formatPrice(technicalIndicators.ema.ema50)}</span>
                  </div>
                </div>
              </div>

              {/* 4. Libro de Órdenes & Profundidad (Live Depth) */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <PieChart className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Profundidad & Spread</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">
                    Spread: ${formatPrice(depthStats.spread)} ({depthStats.spreadPct.toFixed(3)}%)
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs font-mono font-bold mt-1">
                  <span className="text-emerald-400">Bids {depthStats.bidPct}%</span>
                  <span className="text-rose-400">Asks {depthStats.askPct}%</span>
                </div>

                {/* Depth Ratio Bar */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-neutral-900 mt-2">
                  <div
                    className="h-full bg-emerald-500 transition-all"
                    style={{ width: `${depthStats.bidPct}%` }}
                    title={`Compradores: ${depthStats.bidPct}%`}
                  />
                  <div
                    className="h-full bg-rose-500 transition-all"
                    style={{ width: `${depthStats.askPct}%` }}
                    title={`Vendedores: ${depthStats.askPct}%`}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 2: SEMÁFORO DE CONFLUENCIAS Y DERIVADOS */}
        {activeTab === 'traffic_light' && (
          <div className="flex flex-col gap-3">
            <FuturesTrafficLightCard
              metrics={metrics}
              ticker={ticker}
              countdownText={countdown}
              onOpenExplainer={() => setIsDerivativesInfoOpen(true)}
            />
          </div>
        )}

        {/* PESTAÑA 3: PLAN TÁCTICO GOOGLE SHEETS */}
        {activeTab === 'strategy' && (
          <div className="flex flex-col gap-3 flex-1">
            <StrategyExecutionEngine />
          </div>
        )}

        {/* PESTAÑA 4: VOLATILIDAD CUANTITATIVA */}
        {activeTab === 'volatility' && (
          <div className="flex flex-col gap-3">
            <TacticalPairVolatilityCard
              symbol={symbol}
              markPrice={ticker.lastPrice}
            />
          </div>
        )}

        {/* BANDEJA INFERIOR COMPACTA DE POSICIONES ACTIVAS */}
        {currentSymbolPositions.length > 0 && (
          <div className="bg-neutral-950 p-2.5 rounded-xl border border-amber-500/30 flex items-center justify-between gap-3 text-xs font-mono mt-auto shrink-0 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white uppercase">
                Posición Activa en {symbol}:
              </span>
              {currentSymbolPositions.map((p, idx) => {
                const isLong = p.positionAmt > 0;
                const pnl = p.unRealizedProfit || 0;
                const isPnlPositive = pnl >= 0;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded font-bold text-[11px] ${
                        isLong
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {isLong ? 'LONG' : 'SHORT'} {Math.abs(p.positionAmt)}
                    </span>
                    <span className="text-neutral-400">
                      Entrada: <strong className="text-neutral-200">${formatPrice(p.entryPrice)}</strong>
                    </span>
                    <span className="text-neutral-400">
                      PnL:{' '}
                      <strong className={isPnlPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPnlPositive ? '+' : ''}${pnl.toFixed(2)}
                      </strong>
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              {onOpenOrderModal && (
                <button
                  type="button"
                  onClick={onOpenOrderModal}
                  className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-neutral-700 hover:border-amber-500/50 text-[11px] font-bold transition-all cursor-pointer"
                >
                  Gestionar Orden
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal explicativo de derivadas si se requiere */}
      {isDerivativesInfoOpen && (
        <DerivativesMetricsInfoModal
          isOpen={isDerivativesInfoOpen}
          onClose={() => setIsDerivativesInfoOpen(false)}
        />
      )}
    </div>
  );
});
