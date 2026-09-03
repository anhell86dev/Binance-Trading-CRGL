import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  ChevronDown,
  Clock,
  Coins,
  DollarSign,
  HelpCircle,
  PieChart,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { FuturesMarketMetrics, TickerData } from '../types/binance';
import { AssetSelectorModal } from './AssetSelectorModal';
import { DerivativesMetricsInfoModal } from './DerivativesMetricsInfoModal';
import { notificationService } from '../services/notifications';

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

export const AssetInfoCard: React.FC = () => {
  const [ticker, setTicker] = useState<TickerData>(() => binanceWs.getTicker());
  const [metrics, setMetrics] = useState<FuturesMarketMetrics>(() => binanceWs.getFuturesMetrics());
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [countdownText, setCountdownText] = useState<string>('00:00:00');
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDerivativesInfoModalOpen, setIsDerivativesInfoModalOpen] = useState(false);
  const prevPriceRef = useRef<number>(ticker.lastPrice);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const current = binanceWs.getTicker();
      const currentMetrics = binanceWs.getFuturesMetrics();

      if (current.lastPrice !== prevPriceRef.current && prevPriceRef.current > 0) {
        setPriceFlash(current.lastPrice > prevPriceRef.current ? 'up' : 'down');
        const timer = setTimeout(() => setPriceFlash(null), 500);
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

  const isPositive = (ticker.change24hPercent ?? 0) >= 0;
  const currentSymbol = ticker.symbol || binanceWs.getCurrentSymbol() || 'TAOUSDT';
  const baseAsset = currentSymbol.replace('USDT', '');

  // Calculate 24h range percentage
  const high = ticker.high24h || ticker.lastPrice || 1;
  const low = ticker.low24h || ticker.lastPrice || 0;
  const price = ticker.lastPrice || 0;
  const rangeSpan = high - low;
  const rangePct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((price - low) / rangeSpan) * 100)) : 50;

  // Sentiment bias calculation
  const sentimentScore =
    (metrics.topPositionLongPercent - 50) * 0.4 +
    (metrics.topAccountLongPercent - 50) * 0.3 +
    (metrics.buyVolumePercent - 50) * 0.3;

  const sentimentLabel =
    sentimentScore > 4
      ? 'Sesgo Alcista Marcado'
      : sentimentScore > 1
      ? 'Sesgo Alcista Moderado'
      : sentimentScore < -4
      ? 'Sesgo Bajista Marcado'
      : sentimentScore < -1
      ? 'Sesgo Bajista Moderado'
      : 'Sesgo Neutral';

  const sentimentColor =
    sentimentScore > 1
      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
      : sentimentScore < -1
      ? 'text-rose-400 bg-rose-500/10 border-rose-500/30'
      : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

  const handleSelectSymbol = (newSymbol: string) => {
    binanceWs.setSymbol(newSymbol);
    notificationService.notify(
      'SYSTEM',
      `Activo Seleccionado: ${newSymbol}`,
      `Conectado a la transmisión de Binance Futures en tiempo real.`
    );
  };

  return (
    <div
      id="asset_realtime_info_card"
      className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-3 sm:p-3.5 shadow-xl flex flex-col gap-3 relative overflow-hidden"
    >
      {/* Background Ambient Glow */}
      <div
        className={`absolute -right-20 -top-20 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors ${
          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* COHESIVE ASSET HEADER & INTEGRATED 24H RANGE */}
      <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-xl p-3 flex flex-col gap-2.5">
        {/* Top Ticker Row: Asset Identity + Live Stats */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Asset Switcher Button & Badges */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/80 hover:border-amber-500/50 transition-all text-left group"
              title="Cambiar activo de Binance Futures"
            >
              <div className="w-9 h-9 rounded-lg bg-neutral-950 border border-neutral-700/80 flex items-center justify-center text-amber-400 font-extrabold font-mono text-sm shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                {baseAsset.slice(0, 4)}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black font-mono text-white tracking-tight group-hover:text-amber-300">
                    {currentSymbol}
                  </span>
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-amber-400" />
                </div>
                <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium">
                  <Search className="w-2.5 h-2.5" />
                  <span>Cambiar Activo</span>
                </div>
              </div>
            </button>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  PERP
                </span>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Shield className="w-2.5 h-2.5" />
                  1-5x ISOLATED
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-neutral-400">
                <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Stream
                </span>
                <span className="text-neutral-600">•</span>
                <span className={`px-1.5 py-0.2 rounded border text-[10px] font-mono font-semibold ${sentimentColor}`}>
                  {sentimentLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Cohesive Ticker Stats (Price, Change, High, Low, Volume) */}
          <div className="flex items-center gap-4 sm:gap-6 flex-wrap font-mono">
            {/* Live Price */}
            <div
              className={`flex flex-col transition-all px-2.5 py-0.5 rounded-lg ${
                priceFlash === 'up'
                  ? 'bg-emerald-950/60 ring-1 ring-emerald-500'
                  : priceFlash === 'down'
                  ? 'bg-rose-950/60 ring-1 ring-rose-500'
                  : 'bg-neutral-900/60 border border-neutral-800'
              }`}
            >
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-semibold">Precio en Vivo</span>
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${formatPrice(ticker.lastPrice)}
              </div>
            </div>

            {/* 24h Change */}
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-semibold">Cambio 24h</span>
              <div
                className={`text-sm sm:text-base font-bold flex items-center gap-0.5 ${
                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                <span>{isPositive ? '+' : ''}{(ticker.change24hPercent ?? 0).toFixed(2)}%</span>
              </div>
              <span className="text-[10px] text-neutral-400">
                {isPositive ? '+' : ''}${formatPrice(Math.abs(ticker.change24h ?? 0))}
              </span>
            </div>

            {/* 24h High */}
            <div className="flex flex-col hidden sm:flex">
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-semibold">Máx 24h</span>
              <span className="text-sm font-bold text-neutral-200">${formatPrice(ticker.high24h)}</span>
              <span className="text-[10px] text-neutral-400">Pico</span>
            </div>

            {/* 24h Low */}
            <div className="flex flex-col hidden sm:flex">
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-semibold">Mín 24h</span>
              <span className="text-sm font-bold text-neutral-200">${formatPrice(ticker.low24h)}</span>
              <span className="text-[10px] text-neutral-400">Piso</span>
            </div>

            {/* 24h Volume */}
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-400 uppercase font-sans font-semibold">Volumen 24h</span>
              <span className="text-sm sm:text-base font-bold text-amber-300">${formatVolume(ticker.volume24h)}</span>
              <span className="text-[10px] text-neutral-400">USDT</span>
            </div>
          </div>
        </div>

        {/* Integrated 24h Daily Range Bar */}
        <div className="pt-2 border-t border-neutral-900 flex flex-col gap-1 text-[11px] font-mono">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-rose-400 font-semibold">
              Mín: ${formatPrice(low)}
            </span>
            <span className="text-neutral-400 text-[10px] font-sans">
              Rango Diario 24h: <strong className="text-neutral-200 font-mono font-semibold">{rangePct.toFixed(1)}%</strong>
            </span>
            <span className="text-emerald-400 font-semibold">
              Máx: ${formatPrice(high)}
            </span>
          </div>

          <div className="w-full bg-neutral-900 rounded-full h-1.5 relative overflow-hidden border border-neutral-800">
            <div
              className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${rangePct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Derivatives & Futures Market Metrics Header with Explanation Guide Trigger */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <h4 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
            Métricas de Derivados (Binance Futures)
          </h4>
        </div>
        <button
          type="button"
          onClick={() => setIsDerivativesInfoModalOpen(true)}
          className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1 transition-colors"
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>¿Qué significan estos números?</span>
        </button>
      </div>

      {/* 4 Cards Grid of Derivatives Metrics with Clear Meanings */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* 1. Interés Abierto (Open Interest) */}
        <div
          onClick={() => setIsDerivativesInfoModalOpen(true)}
          className="bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-amber-500/50 rounded-lg p-3 flex flex-col justify-between gap-1.5 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Interés Abierto (OI)
            </span>
            <span className="text-[9px] font-mono text-neutral-400 bg-neutral-900 px-1 py-0.2 rounded border border-neutral-800">
              Contratos
            </span>
          </div>
          <div>
            <div className="text-base font-extrabold font-mono text-amber-300 tracking-tight">
              ${formatVolume(metrics.openInterestValueUsdt)} <span className="text-xs font-normal text-neutral-400">USDT</span>
            </div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
              Capital activo total en juego sin liquidar
            </div>
          </div>
        </div>

        {/* 2. Tasa de Financiación (Funding Rate) */}
        <div
          onClick={() => setIsDerivativesInfoModalOpen(true)}
          className="bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-blue-500/50 rounded-lg p-3 flex flex-col justify-between gap-1.5 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Tasa Financiación
            </span>
            <span className="text-[9px] font-mono text-amber-400 bg-neutral-900 px-1 py-0.2 rounded border border-neutral-800">
              {countdownText}
            </span>
          </div>
          <div>
            <div
              className={`text-base font-extrabold font-mono tracking-tight ${
                metrics.fundingRate >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {metrics.fundingRate >= 0 ? '+' : ''}
              {(metrics.fundingRatePercent || metrics.fundingRate * 100).toFixed(4)}%
            </div>
            <div className="text-[11px] text-neutral-400 font-sans mt-0.5">
              {metrics.fundingRate >= 0
                ? 'Longs pagan a Shorts (mercado alcista)'
                : 'Shorts pagan a Longs (mercado bajista)'}
            </div>
          </div>
        </div>

        {/* 3. Volumen de Compra vs Venta (Taker Buy/Sell) */}
        <div
          onClick={() => setIsDerivativesInfoModalOpen(true)}
          className="bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-purple-500/50 rounded-lg p-3 flex flex-col justify-between gap-1.5 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              Taker Compra / Venta
            </span>
            <span className="text-[9px] font-mono text-neutral-300 bg-neutral-900 px-1 py-0.2 rounded border border-neutral-800">
              {metrics.buySellRatio}x
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-400 font-semibold">{metrics.buyVolumePercent}% Compras</span>
              <span className="text-rose-400 font-semibold">{metrics.sellVolumePercent}% Ventas</span>
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 flex overflow-hidden border border-neutral-800">
              <div className="bg-emerald-500 h-full" style={{ width: `${metrics.buyVolumePercent}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${metrics.sellVolumePercent}%` }} />
            </div>
            <div className="text-[10px] text-neutral-400 font-sans">
              Presión de órdenes ejecutadas a mercado
            </div>
          </div>
        </div>

        {/* 4. Top Trader Long/Short Positions */}
        <div
          onClick={() => setIsDerivativesInfoModalOpen(true)}
          className="bg-neutral-950/70 hover:bg-neutral-950 border border-neutral-800/80 hover:border-cyan-500/50 rounded-lg p-3 flex flex-col justify-between gap-1.5 cursor-pointer transition-all"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
              Top Long / Short
            </span>
            <span className="text-[9px] font-mono text-cyan-300 bg-cyan-950/40 px-1 py-0.2 rounded border border-cyan-800/40">
              {metrics.topPositionLongShortRatio}:1
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-emerald-400 font-semibold">{metrics.topPositionLongPercent}% Long</span>
              <span className="text-rose-400 font-semibold">{metrics.topPositionShortPercent}% Short</span>
            </div>
            <div className="w-full bg-neutral-900 rounded-full h-1.5 flex overflow-hidden border border-neutral-800">
              <div className="bg-emerald-500 h-full" style={{ width: `${metrics.topPositionLongPercent}%` }} />
              <div className="bg-rose-500 h-full" style={{ width: `${metrics.topPositionShortPercent}%` }} />
            </div>
            <div className="text-[10px] text-neutral-400 font-sans">
              Posicionamiento del 20% de cuentas mayores
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AssetSelectorModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={currentSymbol}
      />
      <DerivativesMetricsInfoModal
        isOpen={isDerivativesInfoModalOpen}
        onClose={() => setIsDerivativesInfoModalOpen(false)}
      />
    </div>
  );
};
