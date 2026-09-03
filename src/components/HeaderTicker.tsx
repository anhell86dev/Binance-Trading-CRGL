import React, { useState, useEffect, useRef, memo } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  HelpCircle,
  Info,
  PieChart,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { FuturesMarketMetrics, TickerData } from '../types/binance';
import { AssetSelectorModal } from './AssetSelectorModal';
import { DerivativesMetricsInfoModal } from './DerivativesMetricsInfoModal';
import { notificationService } from '../services/notifications';
import { analyzeFuturesMetrics } from '../utils/futuresMetricsHelper';
import { FuturesTrafficLightCard } from './FuturesTrafficLightCard';

const formatPrice = (p: number) => {
  if (!p || isNaN(p)) return '0.00';
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return p.toFixed(6);
};

const formatVolume = (v: number) => {
  if (!v || isNaN(v)) return '0';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toLocaleString('en-US', { maximumFractionDigits: 0 });
};

const formatCountdown = (targetTimestamp: number) => {
  if (!targetTimestamp) return '00:00:00';
  const remaining = Math.max(0, targetTimestamp - Date.now());
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const POPULAR_QUICK_PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'TAOUSDT', 'BNBUSDT', 'SUIUSDT', 'DOGEUSDT', 'NEARUSDT'];

interface HeaderTickerProps {
  symbol?: string;
  price?: number;
}

export const HeaderTicker: React.FC<HeaderTickerProps> = memo(({ symbol: propSymbol, price: propPrice }) => {
  const [ticker, setTicker] = useState<TickerData>(() => binanceWs.getTicker());
  const [metrics, setMetrics] = useState<FuturesMarketMetrics>(() => binanceWs.getFuturesMetrics());
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [showDerivatives, setShowDerivatives] = useState<boolean>(true);
  const [countdownText, setCountdownText] = useState<string>('00:00:00');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState<boolean>(false);
  const [isDerivativesInfoModalOpen, setIsDerivativesInfoModalOpen] = useState<boolean>(false);
  const prevPriceRef = useRef<number>(propPrice || ticker.lastPrice);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const current = binanceWs.getTicker();
      const currentMetrics = binanceWs.getFuturesMetrics();

      if (current.lastPrice !== prevPriceRef.current && prevPriceRef.current > 0) {
        setPriceFlash(current.lastPrice > prevPriceRef.current ? 'up' : 'down');
        const timer = setTimeout(() => setPriceFlash(null), 400);
        prevPriceRef.current = current.lastPrice;
        setTicker(current);
        setMetrics(currentMetrics);
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = current.lastPrice;
      setTicker(current);
      setMetrics(currentMetrics);
    });

    const interval = setInterval(() => {
      const curMetrics = binanceWs.getFuturesMetrics();
      if (curMetrics?.nextFundingTime) {
        setCountdownText(formatCountdown(curMetrics.nextFundingTime));
      }
    }, 1000);

    return () => {
      unsubWs();
      clearInterval(interval);
    };
  }, []);

  const currentSymbol = propSymbol || ticker.symbol || binanceWs.getCurrentSymbol() || 'TAOUSDT';
  const lastPrice = propPrice || ticker.lastPrice || 0;
  const isPositive = (ticker.change24hPercent ?? 0) >= 0;
  const baseAsset = currentSymbol.replace('USDT', '');

  // 24h range percentage
  const high = ticker.high24h || lastPrice || 1;
  const low = ticker.low24h || lastPrice || 0;
  const rangeSpan = high - low;
  const rangePct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((lastPrice - low) / rangeSpan) * 100)) : 50;

  const handleSelectSymbol = (newSymbol: string) => {
    binanceWs.setSymbol(newSymbol);
    notificationService.notify(
      'SYSTEM',
      `Activo Seleccionado: ${newSymbol}`,
      `Conectado a la transmisión de Binance Futures en tiempo real.`
    );
  };

  const fundingRateValue =
    metrics?.fundingRatePercent != null
      ? metrics.fundingRatePercent
      : metrics?.fundingRate != null
      ? metrics.fundingRate * 100
      : 0;
  const isFundingPositive = (metrics?.fundingRate || 0) >= 0;

  // Análisis cuantitativo y semáforo de derivados
  const analysis = analyzeFuturesMetrics(metrics, ticker);
  const { trafficLight } = analysis;
  const isTrafficGreen = trafficLight === 'BULLISH';
  const isTrafficYellow = trafficLight === 'NEUTRAL';
  const isTrafficRed = trafficLight === 'BEARISH';

  return (
    <div
      id="header_ticker_workspace"
      className="bg-neutral-900 border-b border-neutral-800 p-2.5 sm:p-3 flex flex-col gap-2 shrink-0 transition-colors"
    >
      {/* Top Main Row: Symbol Identity with Asset Switcher + High Contrast Stats */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Asset Selector Button & Identity */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Interactive Asset Selector Trigger Button */}
          <button
            type="button"
            id="btn_change_active_asset"
            onClick={() => setIsAssetModalOpen(true)}
            className="group flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700/90 hover:border-amber-500/60 transition-all text-left shadow-sm"
            title="Hacer clic para cambiar a cualquier activo de Binance Futures (BTC, ETH, SOL, TAO, DOGE, etc.)"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-extrabold font-mono text-xs shadow-inner shrink-0 group-hover:scale-105 transition-transform">
              {baseAsset.slice(0, 4)}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight group-hover:text-amber-300 transition-colors">
                  {currentSymbol}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                <Search className="w-2.5 h-2.5" />
                <span>Cambiar Activo</span>
              </div>
            </div>
          </button>

          {/* Badges */}
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
              PERP
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Shield className="w-2.5 h-2.5" />
              1-5x ISOLATED
            </span>
            <span className="hidden md:flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Binance FAPI
            </span>
          </div>

          {/* Quick-switch Asset Chips for Desktop */}
          <div className="hidden xl:flex items-center gap-1 pl-2 border-l border-neutral-800 text-[11px] font-mono">
            <span className="text-[10px] text-neutral-400 mr-0.5 font-sans">Rápidos:</span>
            {POPULAR_QUICK_PAIRS.map((pair) => {
              const isCurr = currentSymbol.toUpperCase() === pair.toUpperCase();
              return (
                <button
                  key={pair}
                  type="button"
                  onClick={() => handleSelectSymbol(pair)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                    isCurr
                      ? 'bg-amber-500 text-neutral-950 font-extrabold shadow-sm'
                      : 'bg-neutral-950 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                  }`}
                >
                  {pair.replace('USDT', '')}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center/Right: Quick Mini Semáforo Badge */}
        <div
          onClick={() => setShowDerivatives(true)}
          className={`cursor-pointer px-2.5 py-1 rounded-xl border flex items-center gap-2 transition-all shadow-sm ${
            isTrafficGreen
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : isTrafficRed
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
          }`}
          title="Semáforo de Decisión Operativa (Binance Futures)"
        >
          {/* Focos Físicos del Semáforo */}
          <div className="flex items-center gap-1 bg-neutral-950 px-1.5 py-1 rounded-md border border-neutral-800 shadow-inner">
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                isTrafficRed
                  ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)] scale-110'
                  : 'bg-rose-950/50 opacity-20'
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                isTrafficYellow
                  ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,1)] scale-110'
                  : 'bg-amber-950/50 opacity-20'
              }`}
            />
            <span
              className={`w-2 h-2 rounded-full transition-all ${
                isTrafficGreen
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] scale-110'
                  : 'bg-emerald-950/50 opacity-20'
              }`}
            />
          </div>

          <div className="flex flex-col">
            <span className="text-[9px] uppercase font-sans font-semibold text-neutral-400 leading-none">
              Semáforo Operativo
            </span>
            <span className="text-[11px] font-black tracking-tight leading-tight">
              {analysis.trafficLightAction}
            </span>
          </div>
        </div>

        {/* Right: Key Stats Ticker (Price, 24h Change, High, Low, Volume) */}
        <div className="flex items-center gap-2.5 sm:gap-4 flex-wrap font-mono">
          {/* Main Price Box with Flash Effect */}
          <div
            className={`flex flex-col px-2.5 py-0.5 rounded-lg transition-all duration-300 ${
              priceFlash === 'up'
                ? 'bg-emerald-950/70 ring-1 ring-emerald-500 scale-[1.02]'
                : priceFlash === 'down'
                ? 'bg-rose-950/70 ring-1 ring-rose-500 scale-[1.02]'
                : 'bg-neutral-950/70 border border-neutral-800'
            }`}
          >
            <span className="text-[9px] text-neutral-400 uppercase font-sans font-semibold">Precio en Vivo</span>
            <div
              className={`text-lg sm:text-xl font-black tracking-tight ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ${formatPrice(lastPrice)}
            </div>
          </div>

          {/* 24h Change */}
          <div className="flex flex-col">
            <span className="text-[9px] text-neutral-400 uppercase font-sans font-semibold">Cambio 24h</span>
            <div
              className={`text-xs sm:text-sm font-bold flex items-center gap-0.5 ${
                isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isPositive ? '+' : ''}{(ticker.change24hPercent ?? 0).toFixed(2)}%</span>
            </div>
            <span className="text-[9px] text-neutral-400">
              {isPositive ? '+' : ''}${formatPrice(Math.abs(ticker.change24h ?? 0))}
            </span>
          </div>

          {/* 24h High */}
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[9px] text-neutral-400 uppercase font-sans font-semibold">Máx 24h</span>
            <span className="text-xs font-bold text-neutral-200">${formatPrice(high)}</span>
            <span className="text-[9px] text-neutral-400">Pico</span>
          </div>

          {/* 24h Low */}
          <div className="flex flex-col hidden sm:flex">
            <span className="text-[9px] text-neutral-400 uppercase font-sans font-semibold">Mín 24h</span>
            <span className="text-xs font-bold text-neutral-200">${formatPrice(low)}</span>
            <span className="text-[9px] text-neutral-400">Piso</span>
          </div>

          {/* 24h Volume */}
          <div className="flex flex-col hidden md:flex">
            <span className="text-[9px] text-neutral-400 uppercase font-sans font-semibold">Volumen 24h</span>
            <span className="text-xs sm:text-sm font-bold text-amber-300">${formatVolume(ticker.volume24h)}</span>
            <span className="text-[9px] text-neutral-400">USDT</span>
          </div>

          {/* Derivatives Toggle & Info Help Button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsDerivativesInfoModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-sans font-semibold flex items-center gap-1 transition-colors"
              title="Ver guía completa: ¿Qué significan OI, Funding, Taker y Top L/S?"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">¿Qué significan?</span>
            </button>

            <button
              type="button"
              onClick={() => setShowDerivatives(!showDerivatives)}
              className={`p-1.5 rounded-lg border text-[10px] font-mono flex items-center gap-1 transition-all ${
                showDerivatives
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                  : 'bg-neutral-950 hover:bg-neutral-800 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Mostrar / Ocultar barra de métricas de futuros y semáforo"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold">Semáforo & OI</span>
              {showDerivatives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>
      </div>

      {/* Integrated 24h Range Bar */}
      <div className="pt-1.5 border-t border-neutral-800/80 flex flex-col gap-0.5 text-[10px] font-mono">
        <div className="flex items-center justify-between text-neutral-400">
          <span className="text-rose-400 font-semibold">${formatPrice(low)}</span>
          <span className="text-neutral-400 text-[10px] font-sans">
            Rango Diario: <strong className="text-neutral-200 font-mono">{rangePct.toFixed(1)}%</strong>
          </span>
          <span className="text-emerald-400 font-semibold">${formatPrice(high)}</span>
        </div>
        <div className="w-full bg-neutral-950 rounded-full h-1 relative overflow-hidden border border-neutral-800/80">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${rangePct}%` }}
          />
        </div>
      </div>

      {/* Enhanced Explanatory Derivatives Metrics & Semáforo Section */}
      {showDerivatives && (
        <div className="flex flex-col gap-2.5 pt-1.5 border-t border-neutral-800/80">
          {/* SEMÁFORO INTEGRAL DE MERCADO PARA OPERAR O NO */}
          <div
            className={`p-3 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all ${
              isTrafficGreen
                ? 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-950/20 shadow-md'
                : isTrafficRed
                ? 'bg-rose-950/30 border-rose-500/40 shadow-rose-950/20 shadow-md'
                : 'bg-amber-950/30 border-amber-500/40 shadow-amber-950/20 shadow-md'
            }`}
          >
            {/* Luces del Semáforo + Título + Resultado del Semáforo */}
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
              {/* Caja de Luces Físicas del Semáforo */}
              <div
                className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 shadow-inner shrink-0"
                title={`Semáforo Operativo: ${analysis.trafficLightTitle}`}
              >
                {/* Luz Roja */}
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isTrafficRed
                      ? 'bg-rose-500 ring-4 ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.9)] scale-110'
                      : 'bg-rose-950/40 opacity-20'
                  }`}
                  title="Luz Roja: Posible Caída / No Operar Long"
                />
                {/* Luz Amarilla */}
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isTrafficYellow
                      ? 'bg-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110'
                      : 'bg-amber-950/40 opacity-20'
                  }`}
                  title="Luz Amarilla: Precaución / Esperar Confirmación"
                />
                {/* Luz Verde */}
                <div
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    isTrafficGreen
                      ? 'bg-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.9)] scale-110'
                      : 'bg-emerald-950/40 opacity-20'
                  }`}
                  title="Luz Verde: Continuación Alcista / Apto Operar Long"
                />
              </div>

              {/* Textos del Dictamen con Resultado del Semáforo Destacado */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-mono font-bold text-neutral-400 flex items-center gap-1">
                    <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                    Semáforo ({currentSymbol}):
                  </span>
                  {/* Resultado del Semáforo (Badge) */}
                  <span
                    className={`text-[11px] font-black font-mono px-2 py-0.5 rounded border uppercase tracking-wider ${
                      isTrafficGreen
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : isTrafficRed
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                  >
                    Resultado: {analysis.trafficLightTitle}
                  </span>
                </div>

                {/* Acción Dictada por el Semáforo */}
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span
                    className={`text-sm sm:text-base font-black tracking-tight ${
                      isTrafficGreen ? 'text-emerald-400' : isTrafficRed ? 'text-rose-400' : 'text-amber-400'
                    }`}
                  >
                    {analysis.trafficLightAction}
                  </span>
                </div>
                <p className="text-[11px] text-neutral-300 font-sans leading-relaxed mt-0.5">
                  {analysis.trafficLightRecommendation}
                </p>
              </div>
            </div>

            {/* Medidor de Confluencia Destacado */}
            <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-1 shrink-0 p-2 sm:p-0 bg-neutral-950/60 sm:bg-transparent rounded-lg border sm:border-0 border-neutral-800/80 w-full sm:w-auto">
              <span className="text-[10px] text-neutral-400 font-sans uppercase font-bold tracking-wider">
                Porcentaje de Confluencia
              </span>
              <div className="flex items-center gap-2 font-mono">
                <span
                  className={`text-xl sm:text-2xl font-black ${
                    isTrafficGreen ? 'text-emerald-400' : isTrafficRed ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {analysis.confidenceScore}%
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                    analysis.confidenceScore >= 70
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : analysis.confidenceScore >= 45
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  Confluencia {analysis.confidenceScore >= 70 ? 'Alta' : analysis.confidenceScore >= 45 ? 'Media' : 'Baja'}
                </span>
              </div>
            </div>
          </div>

          {/* TABLA UNIFICADA DE DATOS DERIVADOS: OI, FUNDING, TAKER Y TOP L/S */}
          <div className="overflow-x-auto custom-scrollbar rounded-xl border border-neutral-800 bg-neutral-950/80">
            <table className="w-full text-left font-mono border-collapse min-w-[750px] text-xs">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/90 text-[10px] sm:text-[11px] uppercase tracking-wider text-neutral-400">
                  <th scope="col" className="py-2.5 px-3.5 font-semibold text-neutral-300 w-[210px]">
                    Métrica Derivada
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-semibold text-neutral-300 w-[170px]">
                    Valor Actual
                  </th>
                  <th scope="col" className="py-2.5 px-3 font-semibold text-neutral-300 w-[210px]">
                    Interpretación / Señal
                  </th>
                  <th scope="col" className="py-2.5 px-3.5 font-semibold text-neutral-300">
                    Significado Operativo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {/* 1. Interés Abierto (OI) */}
                <tr
                  onClick={() => setIsDerivativesInfoModalOpen(true)}
                  className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="text-xs">Interés Abierto (OI)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-amber-300 text-xs">
                    ${formatVolume(metrics.openInterestValueUsdt)}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        analysis.oiStatus === 'bullish'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {analysis.oiStatus === 'bullish' ? (
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-rose-400" />
                      )}
                      {analysis.oiLegend}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans text-[11px] text-neutral-300 leading-relaxed">
                    {analysis.oiDescription}
                  </td>
                </tr>

                {/* 2. Funding Rate */}
                <tr
                  onClick={() => setIsDerivativesInfoModalOpen(true)}
                  className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <Clock className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs">Tasa de Financiación</span>
                        <span className="text-[10px] text-neutral-500 font-mono">({countdownText})</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-xs">
                    <span className={isFundingPositive ? 'text-emerald-400' : 'text-rose-400'}>
                      {isFundingPositive ? '+' : ''}{fundingRateValue.toFixed(4)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        analysis.fundingIsPositive
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {analysis.fundingLegend}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans text-[11px] text-neutral-300 leading-relaxed">
                    <span>{analysis.fundingMeaning}</span>{' '}
                    <span className="text-neutral-500 text-[10px] block mt-0.5">{analysis.fundingRiskAlert}</span>
                  </td>
                </tr>

                {/* 3. Volumen Taker Buy/Sell */}
                <tr
                  onClick={() => setIsDerivativesInfoModalOpen(true)}
                  className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-500/15 border border-purple-500/30 flex items-center justify-center shrink-0">
                        <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <span className="text-xs">Volumen Taker (C/V)</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-xs">
                    <span className="text-emerald-400">{metrics.buyVolumePercent}% C</span>
                    <span className="text-neutral-600 mx-1">/</span>
                    <span className="text-rose-400">{metrics.sellVolumePercent}% V</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        analysis.takerDominance === 'COMPRADOR'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {analysis.takerLegend}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans text-[11px] text-neutral-300 leading-relaxed">
                    {analysis.takerMeaning}
                  </td>
                </tr>

                {/* 4. Ratio L/S Top Traders */}
                <tr
                  onClick={() => setIsDerivativesInfoModalOpen(true)}
                  className="hover:bg-neutral-900/60 cursor-pointer transition-colors"
                >
                  <td className="py-2.5 px-3.5 font-sans font-semibold text-neutral-200">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center shrink-0">
                        <PieChart className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <span className="text-xs">Ratio L/S Top Traders</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-cyan-300 text-xs">
                    {metrics.topPositionLongShortRatio}:1 ({metrics.topPositionLongPercent}% L)
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        analysis.topDominance === 'LONGS'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {analysis.topLegend}
                    </span>
                  </td>
                  <td className="py-2.5 px-3.5 font-sans text-[11px] text-neutral-300 leading-relaxed">
                    {analysis.topMeaning}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={currentSymbol}
      />

      {/* Educational Derivatives Metrics Explanation Modal */}
      <DerivativesMetricsInfoModal
        isOpen={isDerivativesInfoModalOpen}
        onClose={() => setIsDerivativesInfoModalOpen(false)}
      />
    </div>
  );
});

HeaderTicker.displayName = 'HeaderTicker';
