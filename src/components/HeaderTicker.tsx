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
  HelpCircle,
  Info,
  PieChart,
  Search,
  Shield,
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
              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors text-[10px] font-mono flex items-center gap-1"
              title="Mostrar / Ocultar barra de métricas de futuros"
            >
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden lg:inline">OI/Funding</span>
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

      {/* Enhanced Explanatory Derivatives Metrics Row with Clear Indicators of what the numbers mean */}
      {showDerivatives && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1.5 border-t border-neutral-800/80 text-[11px] font-mono">
          {/* 1. OI (Interés Abierto) */}
          <div
            onClick={() => setIsDerivativesInfoModalOpen(true)}
            className="bg-neutral-950/90 hover:bg-neutral-950 hover:border-amber-500/50 cursor-pointer transition-all p-2 rounded-lg border border-neutral-800 flex flex-col justify-between gap-1 group"
            title="Haz clic para ver explicación detallada del Interés Abierto (OI)"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[10px] font-sans font-semibold flex items-center gap-1.5">
                <Coins className="w-3 h-3 text-amber-400" />
                Interés Abierto (OI):
              </span>
              <span className="font-extrabold text-amber-300 font-mono text-xs">
                ${formatVolume(metrics.openInterestValueUsdt)}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-sans flex items-center justify-between">
              <span>Capital activo en contratos</span>
              <span className="text-neutral-400 font-mono text-[9px]">
                {formatVolume(metrics.openInterest)} {baseAsset}
              </span>
            </div>
          </div>

          {/* 2. Funding Rate (Tasa de Financiación) */}
          <div
            onClick={() => setIsDerivativesInfoModalOpen(true)}
            className="bg-neutral-950/90 hover:bg-neutral-950 hover:border-blue-500/50 cursor-pointer transition-all p-2 rounded-lg border border-neutral-800 flex flex-col justify-between gap-1 group"
            title="Haz clic para ver explicación detallada de la Tasa de Financiación (Funding Rate)"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[10px] font-sans font-semibold flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-blue-400" />
                Funding ({countdownText}):
              </span>
              <span className={`font-extrabold font-mono text-xs ${isFundingPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isFundingPositive ? '+' : ''}{fundingRateValue.toFixed(4)}%
              </span>
            </div>
            <div className="text-[10px] font-sans flex items-center justify-between">
              <span className={isFundingPositive ? 'text-emerald-400' : 'text-rose-400'}>
                {isFundingPositive ? 'Longs pagan a Shorts' : 'Shorts pagan a Longs'}
              </span>
              <span className="text-neutral-400 font-mono text-[9px]">Cada 8h</span>
            </div>
          </div>

          {/* 3. Taker Buy/Sell (Presión a Mercado) */}
          <div
            onClick={() => setIsDerivativesInfoModalOpen(true)}
            className="bg-neutral-950/90 hover:bg-neutral-950 hover:border-purple-500/50 cursor-pointer transition-all p-2 rounded-lg border border-neutral-800 flex flex-col justify-between gap-1 group"
            title="Haz clic para ver explicación detallada del Volumen Taker Compra / Venta"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[10px] font-sans font-semibold flex items-center gap-1.5">
                <BarChart2 className="w-3 h-3 text-purple-400" />
                Taker C/V:
              </span>
              <div className="flex items-center gap-1 font-bold text-xs">
                <span className="text-emerald-400">{metrics.buyVolumePercent}% C</span>
                <span className="text-neutral-600">/</span>
                <span className="text-rose-400">{metrics.sellVolumePercent}% V</span>
              </div>
            </div>
            <div className="text-[10px] text-neutral-400 font-sans flex items-center justify-between">
              <span>{metrics.buyVolumePercent >= 50 ? 'Presión compradora activa' : 'Presión vendedora activa'}</span>
              <span className="text-amber-400 font-mono text-[9px]">{metrics.buySellRatio}x ratio</span>
            </div>
          </div>

          {/* 4. Top Trader Long/Short Ratio */}
          <div
            onClick={() => setIsDerivativesInfoModalOpen(true)}
            className="bg-neutral-950/90 hover:bg-neutral-950 hover:border-cyan-500/50 cursor-pointer transition-all p-2 rounded-lg border border-neutral-800 flex flex-col justify-between gap-1 group"
            title="Haz clic para ver explicación detallada del Ratio Long/Short de Ballenas / Cuentas Top"
          >
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[10px] font-sans font-semibold flex items-center gap-1.5">
                <PieChart className="w-3 h-3 text-cyan-400" />
                Top L/S:
              </span>
              <span className="font-extrabold text-cyan-300 font-mono text-xs">
                {metrics.topPositionLongShortRatio}:1 ({metrics.topPositionLongPercent}% L)
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-sans flex items-center justify-between">
              <span>{metrics.topPositionLongShortRatio >= 1.0 ? 'Ballenas netamente en Long' : 'Ballenas netamente en Short'}</span>
              <span className="text-cyan-400 font-mono text-[9px]">Top 20% cuentas</span>
            </div>
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
