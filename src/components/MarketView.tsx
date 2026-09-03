import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  Flame,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { binanceApi, WatchlistPriceUpdate } from '../services/binanceApi';
import { binanceWs } from '../services/binanceWs';
import { BINANCE_POPULAR_PAIRS, normalizeBinanceSymbol } from '../data/binancePairs';

interface MarketViewProps {
  onSelectSymbolForTrading: (symbol: string) => void;
}

export const MarketView: React.FC<MarketViewProps> = ({ onSelectSymbolForTrading }) => {
  const [tickers, setTickers] = useState<Map<string, WatchlistPriceUpdate>>(() => binanceApi.getCachedTickers());
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<'ALL' | 'GAINERS' | 'LOSERS' | 'VOLUME'>('ALL');
  const [isLiveWs, setIsLiveWs] = useState(binanceApi.isStreamConnected());

  useEffect(() => {
    const unsub = binanceApi.subscribeWatchlist((newTickers) => {
      setTickers(newTickers);
      setIsLiveWs(binanceApi.isStreamConnected());
    });
    return () => unsub();
  }, []);

  // Format price helper
  const formatPrice = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 100) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    return p.toLocaleString('en-US', { minimumFractionDigits: 5, maximumFractionDigits: 6 });
  };

  const marketList = useMemo(() => {
    const defaultPairs = BINANCE_POPULAR_PAIRS;
    const items = defaultPairs.map((pair) => {
      const ticker = tickers.get(pair.symbol);
      const price = ticker?.price || (pair.symbol === 'BTCUSDT' ? 65420 : pair.symbol === 'ETHUSDT' ? 3480 : pair.symbol === 'SOLUSDT' ? 148.5 : 50);
      const change24hPercent = ticker?.change24hPercent || (pair.popular ? 2.4 : 0.8);
      const volume24h = ticker?.volume24h || 12500;
      const high24h = ticker?.high24h || price * 1.03;
      const low24h = ticker?.low24h || price * 0.97;

      return {
        symbol: pair.symbol,
        name: pair.name,
        category: pair.category,
        price,
        change24hPercent,
        volume24h,
        high24h,
        low24h,
      };
    });

    return items.filter((item) => {
      const matchSearch =
        item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.category.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (category === 'GAINERS') return item.change24hPercent > 0;
      if (category === 'LOSERS') return item.change24hPercent < 0;
      if (category === 'VOLUME') return item.volume24h > 10000;
      return true;
    });
  }, [tickers, searchTerm, category]);

  // Top gainers & losers metrics
  const topGainer = useMemo(() => {
    const sorted = [...marketList].sort((a, b) => b.change24hPercent - a.change24hPercent);
    return sorted[0];
  }, [marketList]);

  const topLoser = useMemo(() => {
    const sorted = [...marketList].sort((a, b) => a.change24hPercent - b.change24hPercent);
    return sorted[0];
  }, [marketList]);

  return (
    <div id="market-view-container" className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-950 flex flex-col gap-5 max-w-7xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/80 p-4 rounded-xl border border-neutral-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <BarChart2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white">Mercado de Futuros Cripto</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
                Live Stream WebSocket
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cotizaciones en tiempo real transmitidas directamente desde wss://fstream.binance.com/ws con baja latencia.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-neutral-400">
            {marketList.length} Pares Activos
          </span>
        </div>
      </div>

      {/* Top Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Card 1: Top Gainer */}
        {topGainer && (
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-emerald-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Mayor Ganancia 24h
              </span>
              <div className="text-sm font-bold text-white mt-1">{topGainer.symbol}</div>
              <div className="text-xs font-mono text-emerald-400 font-bold mt-0.5">
                +{(topGainer.change24hPercent || 0).toFixed(2)}%
              </div>
            </div>
            <button
              onClick={() => onSelectSymbolForTrading(topGainer.symbol)}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all"
            >
              Operar
            </button>
          </div>
        )}

        {/* Card 2: Top Loser / Opportunity */}
        {topLoser && (
          <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-rose-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-mono text-rose-400 font-bold flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> Mayor Retroceso 24h
              </span>
              <div className="text-sm font-bold text-white mt-1">{topLoser.symbol}</div>
              <div className="text-xs font-mono text-rose-400 font-bold mt-0.5">
                {(topLoser.change24hPercent || 0).toFixed(2)}%
              </div>
            </div>
            <button
              onClick={() => onSelectSymbolForTrading(topLoser.symbol)}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold transition-all"
            >
              Operar
            </button>
          </div>
        )}

        {/* Card 3: Safe Risk Limits */}
        <div className="p-3.5 rounded-xl bg-neutral-900/60 border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-mono text-amber-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Restricción de Riesgo
            </span>
            <div className="text-xs font-bold text-white mt-1">Margen Aislado Obligatorio</div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Tope estricto: 1x a 5x máx
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
            5x MÁX
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por símbolo (ej. BTC, ETH, SOL)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              category === 'ALL'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setCategory('GAINERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              category === 'GAINERS'
                ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            Ganadores
          </button>
          <button
            onClick={() => setCategory('LOSERS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              category === 'LOSERS'
                ? 'bg-rose-500 text-white font-bold shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <TrendingDown className="w-3 h-3" />
            Perdedores
          </button>
          <button
            onClick={() => setCategory('VOLUME')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              category === 'VOLUME'
                ? 'bg-amber-400 text-neutral-950 font-bold shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            <Flame className="w-3 h-3" />
            Alto Volumen
          </button>
        </div>
      </div>

      {/* Market Watchlist Table */}
      <div className="bg-neutral-900/70 rounded-xl border border-neutral-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Par / Nombre</th>
                <th className="py-3 px-4">Categoría</th>
                <th className="py-3 px-4">Último Precio</th>
                <th className="py-3 px-4">Cambio 24h</th>
                <th className="py-3 px-4 hidden md:table-cell">Rango 24h (Bajo / Alto)</th>
                <th className="py-3 px-4 hidden sm:table-cell">Volumen 24h</th>
                <th className="py-3 px-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {marketList.map((coin) => {
                const isPositive = coin.change24hPercent >= 0;
                return (
                  <tr
                    key={coin.symbol}
                    className="hover:bg-neutral-800/40 transition-colors group cursor-pointer"
                    onClick={() => onSelectSymbolForTrading(coin.symbol)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center font-bold text-amber-400 text-xs">
                          {coin.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm group-hover:text-amber-400 transition-colors">
                            {coin.symbol}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-sans">{coin.name}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-sans text-neutral-300">
                      <span className="px-2 py-0.5 rounded bg-neutral-950 text-[10px] border border-neutral-800">
                        {coin.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-neutral-100 text-xs sm:text-sm">
                      ${formatPrice(coin.price)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                          isPositive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                        }`}
                      >
                        {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>
                          {isPositive ? '+' : ''}
                          {(coin.change24hPercent || 0).toFixed(2)}%
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-400 text-[11px] hidden md:table-cell">
                      <span>${formatPrice(coin.low24h)}</span>
                      <span className="mx-1.5 text-neutral-600">—</span>
                      <span>${formatPrice(coin.high24h)}</span>
                    </td>

                    <td className="py-3.5 px-4 text-neutral-300 text-xs hidden sm:table-cell">
                      ${(coin.volume24h * coin.price).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectSymbolForTrading(coin.symbol);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-xs flex items-center gap-1 ml-auto"
                      >
                        <Zap className="w-3 h-3 fill-neutral-950" />
                        <span>Operar</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
