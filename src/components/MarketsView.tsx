import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  TrendingUp,
  TrendingDown,
  Globe,
  Coins,
  Shield,
  Layers,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  DollarSign,
  Landmark,
  Building2,
  Gem,
  ExternalLink,
  ChevronRight,
  Bell,
} from 'lucide-react';
import { marketsService, MarketCategory, MarketPair, TradFiType } from '../services/marketsService';
import { binanceWs } from '../services/binanceWs';

interface MarketsViewProps {
  onNavigateToFutures: (symbol: string) => void;
  onOpenOrderModal: (symbol?: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  onNavigateToFutures,
  onOpenOrderModal,
}) => {
  const [pairs, setPairs] = useState<MarketPair[]>(() => marketsService.getAllPairs());
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<
    'volume_desc' | 'volume_asc' | 'change_desc' | 'change_asc' | 'price_desc' | 'price_asc' | 'name_asc'
  >('volume_desc');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [summary, setSummary] = useState(() => marketsService.getMarketSummary());

  useEffect(() => {
    const unsub = marketsService.subscribe(() => {
      setPairs(marketsService.getAllPairs());
      setSummary(marketsService.getMarketSummary());
    });
    return () => unsub();
  }, []);

  const filteredPairs = useMemo(() => {
    return marketsService.getFilteredPairs({
      category: activeCategory,
      searchQuery,
      sortBy,
    });
  }, [pairs, activeCategory, searchQuery, sortBy]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await marketsService.fetchLiveMarkets();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelectTrade = (symbol: string) => {
    binanceWs.setSymbol(symbol);
    onNavigateToFutures(symbol);
  };

  const formatPrice = (price: number): string => {
    if (!price || isNaN(price)) return '0.00';
    if (price >= 1000) {
      return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (price >= 1) {
      return price.toFixed(2);
    }
    if (price >= 0.01) {
      return price.toFixed(4);
    }
    return price.toFixed(6);
  };

  const formatVolume = (vol: number): string => {
    if (!vol || isNaN(vol)) return '$0';
    if (vol >= 1_000_000_000) {
      return `$${(vol / 1_000_000_000).toFixed(2)}B`;
    }
    if (vol >= 1_000_000) {
      return `$${(vol / 1_000_000).toFixed(2)}M`;
    }
    if (vol >= 1_000) {
      return `$${(vol / 1_000).toFixed(1)}K`;
    }
    return `$${vol.toFixed(0)}`;
  };

  const getCategoryIcon = (tradFiType?: TradFiType) => {
    switch (tradFiType) {
      case 'metals_commodities':
        return <Gem className="w-3.5 h-3.5 text-amber-400" />;
      case 'forex_fiat':
        return <Landmark className="w-3.5 h-3.5 text-blue-400" />;
      case 'rwa_treasury':
        return <Building2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'institutional_credit':
        return <Shield className="w-3.5 h-3.5 text-purple-400" />;
      case 'synthetic_tradfi':
        return <Sparkles className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Coins className="w-3.5 h-3.5 text-amber-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-7xl mx-auto pb-10">
      {/* 1. Header Banner & Titulares */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Globe className="w-4 h-4" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Mercados & Pares Binance
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                LIVE
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-3xl">
              Explorador completo de todos los <strong>Pares de Futuros USDT-M</strong> y activos de <strong>TradFi (Traditional Finance)</strong> en Binance: Oro físico (PAXG), Divisas Forex (EUR, GBP, BRL, TRY), Bonos del Tesoro de EE.UU. (ONDO), T-Bills (MKR) y Activos del Mundo Real (RWA).
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-neutral-400 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
              <span>Actualizar Cotizaciones</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenOrderModal()}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Nueva Orden Futuros</span>
            </button>
          </div>
        </div>

        {/* KPI Mini-Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-5 pt-4 border-t border-neutral-800/80">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium">Total Pares Activos</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{summary.totalPairs}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Binance FAPI + Spot</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Futuros USDT-M</span>
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{summary.futuresCount}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Apalancamiento 1-5x</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span>TradFi & RWA</span>
            </div>
            <div className="text-lg font-bold text-blue-300 font-mono mt-0.5">{summary.tradFiCount}</div>
            <div className="text-[10px] text-blue-400/80 mt-0.5">Oro, Forex, Bonos</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium">Volumen Total 24h</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {formatVolume(summary.totalVolumeUsdt)}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">En USDT 24 horas</div>
          </div>

          {summary.topGainer && (
            <div
              onClick={() => handleSelectTrade(summary.topGainer!.symbol)}
              className="bg-neutral-950/70 border border-emerald-900/40 hover:border-emerald-700/60 rounded-lg p-2.5 cursor-pointer transition-colors"
            >
              <div className="text-[11px] text-emerald-400 font-medium flex items-center justify-between">
                <span>Top Gainer</span>
                <ArrowUpRight className="w-3 h-3" />
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                {summary.topGainer.symbol}
              </div>
              <div className="text-[10px] text-emerald-400 font-bold font-mono mt-0.5">
                +{summary.topGainer.change24hPercent.toFixed(2)}%
              </div>
            </div>
          )}

          {summary.topLoser && (
            <div
              onClick={() => handleSelectTrade(summary.topLoser!.symbol)}
              className="bg-neutral-950/70 border border-rose-900/40 hover:border-rose-700/60 rounded-lg p-2.5 cursor-pointer transition-colors"
            >
              <div className="text-[11px] text-rose-400 font-medium flex items-center justify-between">
                <span>Top Loser</span>
                <ArrowDownRight className="w-3 h-3" />
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                {summary.topLoser.symbol}
              </div>
              <div className="text-[10px] text-rose-400 font-bold font-mono mt-0.5">
                {summary.topLoser.change24hPercent.toFixed(2)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Barra de Categorías / Pestañas de Filtro */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Todos los Pares ({summary.totalPairs})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('futures')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'futures'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Futuros USDT-M ({summary.futuresCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('tradfi')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'tradfi'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Todos TradFi & RWA ({summary.tradFiCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('metals')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'metals'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Gem className="w-3.5 h-3.5 text-amber-400" />
            <span>Oro & Commodities ({summary.metalsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('forex')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'forex'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Landmark className="w-3.5 h-3.5 text-blue-400" />
            <span>Forex & Divisas ({summary.forexCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('rwa')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'rwa'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-purple-400" />
            <span>Bonos & RWA TradFi ({summary.rwaCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('gainers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'gainers'
                ? 'bg-emerald-500 text-neutral-950 shadow-sm font-bold'
                : 'bg-neutral-900 hover:bg-neutral-800 text-emerald-400 border border-neutral-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Ganadores 24h</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('losers')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'losers'
                ? 'bg-rose-500 text-white shadow-sm font-bold'
                : 'bg-neutral-900 hover:bg-neutral-800 text-rose-400 border border-neutral-800'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Perdedores 24h</span>
          </button>
        </div>

        {/* 3. Barra de Búsqueda, Ordenamiento y Vista */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900/90 border border-neutral-800 rounded-xl p-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por símbolo (ej. PAXG, ONDO, EUR, BTC, SOL), nombre o sector..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-neutral-400 hidden md:inline">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="volume_desc">Mayor Volumen 24h</option>
                <option value="volume_asc">Menor Volumen 24h</option>
                <option value="change_desc">Mayor Subida (+%)</option>
                <option value="change_asc">Mayor Caída (-%)</option>
                <option value="price_desc">Mayor Precio</option>
                <option value="price_asc">Menor Precio</option>
                <option value="name_asc">Alfabético (A-Z)</option>
              </select>
            </div>

            <div className="flex items-center bg-neutral-950 border border-neutral-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Vista Tabla"
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-neutral-800 text-amber-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Vista Tarjetas"
                className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-neutral-800 text-amber-400 shadow-xs' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Contenido Principal: Tabla o Cuadrícula */}
      {filteredPairs.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No se encontraron pares con ese criterio</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            Prueba ajustando el término de búsqueda o cambiando la categoría seleccionada en las pestañas superiores.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold cursor-pointer"
          >
            Restablecer Filtros
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm font-mono min-w-[1050px]">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-xs">
                <tr>
                  <th className="py-3 px-4">Par / Instrumento</th>
                  <th className="py-3 px-4">Clasificación TradFi / Sector</th>
                  <th className="py-3 px-4">Precio Último</th>
                  <th className="py-3 px-4">Cambio 24h</th>
                  <th className="py-3 px-4">Rango 24h (Bajo / Alto)</th>
                  <th className="py-3 px-4">Volumen 24h (USDT)</th>
                  <th className="py-3 px-4">Tendencia</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60">
                {filteredPairs.map((pair) => {
                  const isGain = pair.change24hPercent >= 0;
                  const rangeSpan = pair.high24h - pair.low24h;
                  const pricePos = rangeSpan > 0 ? Math.max(0, Math.min(100, ((pair.lastPrice - pair.low24h) / rangeSpan) * 100)) : 50;

                  return (
                    <tr
                      key={pair.symbol}
                      onClick={() => handleSelectTrade(pair.symbol)}
                      className="hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                    >
                      {/* Par & Símbolo */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                            {getCategoryIcon(pair.tradFiType)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white text-xs">{pair.symbol}</span>
                              {pair.isFuturesContract && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  FUTUROS 1-5x
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-sans truncate max-w-[220px]">
                              {pair.displayName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clasificación TradFi / Sector */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 max-w-[240px]">
                          {pair.tradFiBadge ? (
                            <div className="flex items-center gap-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950/80 text-blue-300 border border-blue-800/80 font-mono flex items-center gap-1">
                                {getCategoryIcon(pair.tradFiType)}
                                <span>{pair.tradFiBadge}</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-sans">
                              {pair.sectorTag}
                            </span>
                          )}
                          {pair.tradFiDescription && (
                            <span className="text-[10px] text-neutral-500 font-sans line-clamp-1" title={pair.tradFiDescription}>
                              {pair.tradFiDescription}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Precio */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">
                          ${formatPrice(pair.lastPrice)}
                        </div>
                      </td>

                      {/* Cambio 24h */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold font-mono ${
                            isGain
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          <span>{isGain ? '+' : ''}{pair.change24hPercent.toFixed(2)}%</span>
                        </span>
                      </td>

                      {/* Rango 24h */}
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-[10px] text-neutral-400">
                            <span>${formatPrice(pair.low24h)}</span>
                            <span>${formatPrice(pair.high24h)}</span>
                          </div>
                          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full ${isGain ? 'bg-emerald-400' : 'bg-rose-400'}`}
                              style={{ width: `${pricePos}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Volumen 24h */}
                      <td className="py-3 px-4">
                        <div className="text-neutral-200 text-xs font-semibold">
                          {formatVolume(pair.quoteVolume24h)}
                        </div>
                        <div className="text-[10px] text-neutral-500">
                          {pair.tradesCount > 0 ? `${pair.tradesCount.toLocaleString()} trades` : 'Mercado Activo'}
                        </div>
                      </td>

                      {/* Sparkline mini-gráfico */}
                      <td className="py-3 px-4">
                        <div className="w-20 h-6 flex items-end gap-0.5">
                          {pair.sparkline.map((val, idx) => {
                            const minVal = Math.min(...pair.sparkline);
                            const maxVal = Math.max(...pair.sparkline);
                            const heightPct = maxVal > minVal ? Math.max(15, ((val - minVal) / (maxVal - minVal)) * 100) : 50;
                            return (
                              <div
                                key={idx}
                                className={`flex-1 rounded-t-xs transition-all ${
                                  isGain ? 'bg-emerald-500/70' : 'bg-rose-500/70'
                                }`}
                                style={{ height: `${heightPct}%` }}
                              />
                            );
                          })}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSelectTrade(pair.symbol)}
                            title="Operar en Terminal Futuros"
                            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                          >
                            <Zap className="w-3 h-3 fill-neutral-950" />
                            <span>Operar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenOrderModal(pair.symbol)}
                            title="Abrir modal de orden rápida"
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Vista Cuadrícula / Bento Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredPairs.map((pair) => {
            const isGain = pair.change24hPercent >= 0;

            return (
              <div
                key={pair.symbol}
                onClick={() => handleSelectTrade(pair.symbol)}
                className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-neutral-700 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-neutral-950 border border-neutral-800 flex items-center justify-center">
                        {getCategoryIcon(pair.tradFiType)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{pair.symbol}</span>
                          {pair.isFuturesContract && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded font-mono font-bold">
                              1-5x
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-neutral-400 font-sans truncate max-w-[140px]">
                          {pair.displayName}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-bold font-mono ${
                        isGain
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-rose-950 text-rose-400 border border-rose-800'
                      }`}
                    >
                      {isGain ? '+' : ''}{pair.change24hPercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* TradFi Tag / Badge */}
                  {pair.tradFiBadge ? (
                    <div className="mt-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800 font-mono inline-block">
                        {pair.tradFiBadge}
                      </span>
                      {pair.tradFiDescription && (
                        <p className="text-[10px] text-neutral-400 font-sans mt-1 line-clamp-2 leading-relaxed">
                          {pair.tradFiDescription}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-2 mb-2 text-[10px] text-neutral-400 font-sans">
                      {pair.sectorTag}
                    </div>
                  )}

                  {/* Price and Volume */}
                  <div className="flex items-baseline justify-between mt-3 pt-3 border-t border-neutral-800/80">
                    <div>
                      <div className="text-[10px] text-neutral-400">Precio de Mercado</div>
                      <div className="text-base font-bold text-white font-mono">
                        ${formatPrice(pair.lastPrice)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-neutral-400">Volumen 24h</div>
                      <div className="text-xs font-semibold text-neutral-300 font-mono">
                        {formatVolume(pair.quoteVolume24h)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bottom Action buttons */}
                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => onOpenOrderModal(pair.symbol)}
                    className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Orden Rápida
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectTrade(pair.symbol)}
                    className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Zap className="w-3 h-3 fill-neutral-950" />
                    <span>Operar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
