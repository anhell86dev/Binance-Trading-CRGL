import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  Compass,
  DollarSign,
  Flame,
  Radio,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { TickerData } from '../types/binance';

const QUICK_PAIRS = [
  { symbol: 'ZECUSDT', name: 'Zcash', badge: 'Estrategia 1' },
  { symbol: 'TAOUSDT', name: 'Bittensor', badge: 'Estrategia 2' },
  { symbol: 'AAVEUSDT', name: 'Aave', badge: 'Estrategia 3' },
  { symbol: 'SOLUSDT', name: 'Solana', badge: 'Estrategia 4' },
  { symbol: 'XRPUSDT', name: 'Ripple', badge: 'Estrategia 5' },
  { symbol: 'BTCUSDT', name: 'Bitcoin', badge: 'Benchmark' },
  { symbol: 'ETHUSDT', name: 'Ethereum', badge: 'Benchmark' },
];

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

export const AssetInfoCard: React.FC = () => {
  const [ticker, setTicker] = useState<TickerData>(() => binanceWs.getTicker());
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);
  const [activeStrategy, setActiveStrategy] = useState(() => strategyService.getActiveStrategy());
  const prevPriceRef = useRef<number>(ticker.lastPrice);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const current = binanceWs.getTicker();
      if (current.lastPrice !== prevPriceRef.current && prevPriceRef.current > 0) {
        setPriceFlash(current.lastPrice > prevPriceRef.current ? 'up' : 'down');
        const timer = setTimeout(() => setPriceFlash(null), 700);
        prevPriceRef.current = current.lastPrice;
        setTicker(current);
        return () => clearTimeout(timer);
      }
      prevPriceRef.current = current.lastPrice;
      setTicker(current);
    });

    const unsubStrat = strategyService.subscribe(() => {
      setActiveStrategy(strategyService.getActiveStrategy());
    });

    return () => {
      unsubWs();
      unsubStrat();
    };
  }, []);

  const handleSelectPair = (sym: string) => {
    binanceWs.setSymbol(sym);
    // Find matching strategy if exists
    const match = strategyService.getStrategies().find((s) => s.par.toUpperCase() === sym.toUpperCase());
    if (match) {
      strategyService.setActiveStrategyById(match.noEstrategia);
    }
  };

  const isPositive = (ticker.change24hPercent ?? 0) >= 0;
  const currentSymbol = ticker.symbol || activeStrategy?.par || 'ZECUSDT';

  // Calculate 24h range percentage for progress gauge
  const high = ticker.high24h || ticker.lastPrice || 1;
  const low = ticker.low24h || ticker.lastPrice || 0;
  const price = ticker.lastPrice || 0;
  const rangeSpan = high - low;
  const rangePct = rangeSpan > 0 ? Math.min(100, Math.max(0, ((price - low) / rangeSpan) * 100)) : 50;

  return (
    <div
      id="asset_realtime_info_card"
      className="bg-neutral-900/90 border border-neutral-800/90 rounded-xl p-3.5 sm:p-4 shadow-xl backdrop-blur-xs flex flex-col gap-3.5 relative overflow-hidden"
    >
      {/* Background Accent glow */}
      <div
        className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-10 transition-colors ${
          isPositive ? 'bg-emerald-500' : 'bg-rose-500'
        }`}
      />

      {/* Header Row: Symbol, Badges & Quick Switchers */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
        {/* Left: Asset Name, Perpetual Tag & WSS Pulse */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400 font-bold font-mono text-sm shadow-inner">
            {currentSymbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-extrabold font-mono text-white tracking-tight flex items-center gap-1.5">
                <span>{currentSymbol}</span>
                <span className="text-neutral-500 text-xs font-normal font-sans">
                  / USDT
                </span>
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-500/15 text-blue-300 border border-blue-500/30 tracking-wider">
                PERPETUAL
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Shield className="w-3 h-3" />
                ISOLATED 1-5x
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-neutral-400 mt-0.5">
              <span className="flex items-center gap-1 text-emerald-400 font-mono text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Binance Futures WSS v1
              </span>
              {activeStrategy && (
                <>
                  <span className="text-neutral-600">•</span>
                  <span className="text-neutral-300 font-mono text-[11px] truncate max-w-[220px]">
                    {activeStrategy.noEstrategia}: {activeStrategy.nombreEstrategia}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Quick Pair Switcher Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full">
          <span className="text-[10px] text-neutral-500 font-mono uppercase tracking-wider mr-0.5 hidden xl:inline">
            Activos:
          </span>
          {QUICK_PAIRS.map((qp) => {
            const isSelected = qp.symbol === currentSymbol;
            return (
              <button
                key={qp.symbol}
                onClick={() => handleSelectPair(qp.symbol)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 border shrink-0 ${
                  isSelected
                    ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md font-extrabold'
                    : 'bg-neutral-950/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border-neutral-800'
                }`}
                title={`Cambiar a ${qp.name} (${qp.symbol})`}
              >
                <span>{qp.symbol.replace('USDT', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Real-Time Asset Metric Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* 1. Precio en Vivo */}
        <div
          className={`p-3 rounded-xl border transition-all duration-300 ${
            priceFlash === 'up'
              ? 'bg-emerald-950/40 border-emerald-500 shadow-lg shadow-emerald-950/50'
              : priceFlash === 'down'
              ? 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50'
              : 'bg-neutral-950/70 border-neutral-800/80'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-amber-400" />
              Precio en Vivo
            </span>
            <span className="text-[10px] font-mono text-neutral-500">USDⓈ</span>
          </div>

          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight transition-colors ${
              priceFlash === 'up'
                ? 'text-emerald-300'
                : priceFlash === 'down'
                ? 'text-rose-300'
                : isPositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            ${formatPrice(ticker.lastPrice)}
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900">
            <span>Marca: ${formatPrice(ticker.markPrice || ticker.lastPrice)}</span>
          </div>
        </div>

        {/* 2. Cambio en 24h */}
        <div
          className={`p-3 rounded-xl border ${
            isPositive
              ? 'bg-emerald-950/20 border-emerald-800/50'
              : 'bg-rose-950/20 border-rose-800/50'
          }`}
        >
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
              Cambio en 24h
            </span>
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>

          <div
            className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? '+' : ''}
            {(ticker.change24hPercent ?? 0).toFixed(2)}%
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono mt-1 pt-1 border-t border-neutral-900">
            <span className={isPositive ? 'text-emerald-300' : 'text-rose-300'}>
              {isPositive ? '+' : ''}${formatPrice(Math.abs(ticker.change24h ?? 0))}
            </span>
            <span className="text-[10px] text-neutral-500">Neto 24h</span>
          </div>
        </div>

        {/* 3. Máx en 24h */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              Máx en 24h
            </span>
            <span className="text-[10px] font-mono text-emerald-400/80">HIGH</span>
          </div>

          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            ${formatPrice(ticker.high24h)}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex items-center justify-between">
            <span>Pico 24 Horas</span>
          </div>
        </div>

        {/* 4. Mín en 24h */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              Mín en 24h
            </span>
            <span className="text-[10px] font-mono text-rose-400/80">LOW</span>
          </div>

          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
            ${formatPrice(ticker.low24h)}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex items-center justify-between">
            <span>Piso 24 Horas</span>
          </div>
        </div>

        {/* 5. Volumen 24h */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800/80 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-neutral-400 text-xs mb-1">
            <span className="font-semibold text-neutral-300 flex items-center gap-1">
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              Vol. 24h
            </span>
            <span className="text-[10px] font-mono text-neutral-500">USDT</span>
          </div>

          <div className="text-xl sm:text-2xl font-black font-mono tracking-tight text-amber-300">
            ${formatVolume(ticker.volume24h)}
          </div>

          <div className="text-[11px] text-neutral-400 font-mono mt-1 pt-1 border-t border-neutral-900 flex items-center justify-between">
            <span>Liquidez Binance</span>
          </div>
        </div>
      </div>

      {/* 24h Range Bar spectrum */}
      <div className="bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800/80 flex flex-col gap-1.5 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <span className="text-rose-400 font-bold">Mín: ${formatPrice(low)}</span>
          </span>
          <span className="text-neutral-300 font-bold">
            Rango Diario 24h ({rangePct.toFixed(1)}%)
          </span>
          <span className="flex items-center gap-1">
            <span className="text-emerald-400 font-bold">Máx: ${formatPrice(high)}</span>
          </span>
        </div>

        <div className="w-full bg-neutral-900 rounded-full h-2 relative overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${rangePct}%` }}
          />
        </div>
      </div>
    </div>
  );
};
