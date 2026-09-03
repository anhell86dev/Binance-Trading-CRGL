import React, { useState, useEffect, useRef, memo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  DollarSign,
  PieChart,
  Shield,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { FuturesMarketMetrics, TickerData } from '../types/binance';

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

  const currentSymbol = propSymbol || ticker.symbol || binanceWs.getCurrentSymbol() || 'ZECUSDT';
  const lastPrice = propPrice || ticker.lastPrice || 0;
  const isPositive = (ticker.change24hPercent ?? 0) >= 0;
  const baseAsset = currentSymbol.replace('USDT', '');

  // 24h range percentage
  const high = ticker.high24h || lastPrice || 1;
  const low = ticker.low24h || lastPrice || 0;
  const rangeSpan = high - low;
  const rangePct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((lastPrice - low) / rangeSpan) * 100)) : 50;

  return (
    <div
      id="header_ticker_workspace"
      className="bg-neutral-900 border-b border-neutral-800 p-2.5 sm:p-3 flex flex-col gap-2 shrink-0 transition-colors"
    >
      {/* Top Main Row: Symbol Identity + High Contrast Stats Flexbox */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Asset Identity & Protocol Badges */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-700/80 flex items-center justify-center text-amber-400 font-extrabold font-mono text-xs shadow-inner shrink-0">
            {baseAsset.slice(0, 4)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight">
                {currentSymbol}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30">
                PERP
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Shield className="w-2.5 h-2.5" />
                1-5x ISOLATED
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-neutral-400">
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Binance FAPI
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400 font-mono text-[10px]">
                Mark: ${formatPrice(ticker.markPrice || lastPrice)}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Key Stats Ticker (Price, 24h Change, High, Low, Volume) */}
        <div className="flex items-center gap-3 sm:gap-5 flex-wrap font-mono">
          {/* Main Price Box with Flash Effect */}
          <div
            className={`flex flex-col px-2 py-0.5 rounded transition-all duration-300 ${
              priceFlash === 'up'
                ? 'bg-emerald-950/70 ring-1 ring-emerald-500 scale-[1.02]'
                : priceFlash === 'down'
                ? 'bg-rose-950/70 ring-1 ring-rose-500 scale-[1.02]'
                : 'bg-neutral-950/50'
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

          {/* Derivatives Metrics Collapsible Button */}
          <button
            onClick={() => setShowDerivatives(!showDerivatives)}
            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors text-[10px] font-mono flex items-center gap-1"
            title="Mostrar / Ocultar métricas de futuros (OI, Funding, Taker)"
          >
            <BarChart2 className="w-3 h-3 text-amber-400" />
            <span className="hidden lg:inline">Futuros</span>
            {showDerivatives ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
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

      {/* Collapsible Derivatives Metrics Row */}
      {showDerivatives && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1.5 border-t border-neutral-800/80 text-[11px] font-mono">
          {/* OI */}
          <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px] flex items-center gap-1">
              <Coins className="w-3 h-3 text-amber-400" />
              OI:
            </span>
            <span className="font-bold text-neutral-200">${formatVolume(metrics.openInterestValueUsdt)}</span>
          </div>

          {/* Funding */}
          <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px] flex items-center gap-1">
              <Clock className="w-3 h-3 text-blue-400" />
              Funding ({countdownText}):
            </span>
            <span className={`font-bold ${(metrics?.fundingRate || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(metrics?.fundingRate || 0) >= 0 ? '+' : ''}
              {(metrics?.fundingRatePercent != null ? metrics.fundingRatePercent : (metrics?.fundingRate != null ? metrics.fundingRate * 100 : 0)).toFixed(4)}%
            </span>
          </div>

          {/* Taker Buy/Sell */}
          <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px]">Taker C/V:</span>
            <span className="font-bold text-amber-400">
              {metrics.buyVolumePercent}% / {metrics.sellVolumePercent}%
            </span>
          </div>

          {/* Top Long/Short */}
          <div className="bg-neutral-950/80 px-2 py-1 rounded border border-neutral-800 flex items-center justify-between">
            <span className="text-neutral-400 text-[10px]">Top L/S:</span>
            <span className="font-bold text-cyan-400">{metrics.topPositionLongShortRatio}:1</span>
          </div>
        </div>
      )}
    </div>
  );
});

HeaderTicker.displayName = 'HeaderTicker';
