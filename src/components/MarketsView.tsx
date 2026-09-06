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
  Gauge,
  Droplets,
  Activity,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react';
import {
  marketsService,
  MarketCategory,
  MarketPair,
  TradFiType,
  LiquidityTier,
  VolatilityTier,
  MarketSortOption,
} from '../services/marketsService';
import { binanceWs } from '../services/binanceWs';
import { MarketLiquidityVolatilityChart } from './MarketLiquidityVolatilityChart';

interface MarketsViewProps {
  onNavigateToFutures: (symbol: string) => void;
  onOpenOrderModal: (symbol?: string) => void;
}

export const MarketsView: React.FC<MarketsViewProps> = ({
  onNavigateToFutures,
  onOpenOrderModal,
}) => {
  const [pairs, setPairs] = useState<MarketPair[]>(() => marketsService.getAllPairs());
  const [activeCategory, setActiveCategory] = useState<MarketCategory>('best_trading');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<MarketSortOption>('tradeability_desc');
  const [minLiquidityTier, setMinLiquidityTier] = useState<LiquidityTier | 'all'>('all');
  const [volatilityTierFilter, setVolatilityTierFilter] = useState<VolatilityTier | 'all' | 'moderate_high'>('all');
  const [fastExecutionOnly, setFastExecutionOnly] = useState<boolean>(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
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
      minLiquidityTier,
      volatilityTierFilter,
      fastExecutionOnly,
    });
  }, [pairs, activeCategory, searchQuery, sortBy, minLiquidityTier, volatilityTierFilter, fastExecutionOnly]);

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

  const getLiquidityTierBadge = (tier: LiquidityTier) => {
    switch (tier) {
      case 'ultra':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5" />
            <span>Tier 1 Ultra</span>
          </span>
        );
      case 'high':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5" />
            <span>Tier 2 Alta</span>
          </span>
        );
      case 'medium':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1">
            <Droplets className="w-2.5 h-2.5" />
            <span>Tier 3 Media</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
            <AlertTriangle className="w-2.5 h-2.5" />
            <span>Tier 4 Baja</span>
          </span>
        );
    }
  };

  const getVolatilityBadge = (tier: VolatilityTier, percent: number) => {
    switch (tier) {
      case 'extreme':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1 font-mono">
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            <span>Extrema {percent}%</span>
          </span>
        );
      case 'high':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 flex items-center gap-1 font-mono">
            <Activity className="w-2.5 h-2.5 text-amber-400" />
            <span>Alta {percent}%</span>
          </span>
        );
      case 'moderate':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
            <span>Ideal {percent}%</span>
          </span>
        );
      default:
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700 flex items-center gap-1 font-mono">
            <span>Baja {percent}%</span>
          </span>
        );
    }
  };

  const getTradeabilityGauge = (score: number, rating: string) => {
    let colorClass = 'text-rose-400 bg-rose-950/80 border-rose-800';
    let label = 'Precaución';
    if (score >= 80) {
      colorClass = 'text-amber-300 bg-amber-950/90 border-amber-500/80 font-black shadow-xs shadow-amber-500/10';
      label = 'Óptimo Scalp';
    } else if (score >= 68) {
      colorClass = 'text-emerald-300 bg-emerald-950/80 border-emerald-700 font-bold';
      label = 'Bueno';
    } else if (score >= 50) {
      colorClass = 'text-blue-300 bg-blue-950/80 border-blue-800';
      label = 'Swing';
    }

    return (
      <div className="flex flex-col items-start gap-1">
        <div className={`px-2 py-0.5 rounded text-[11px] font-mono border flex items-center gap-1.5 ${colorClass}`}>
          <Gauge className="w-3 h-3" />
          <span className="font-bold">{score}/100</span>
          <span className="text-[9px] uppercase tracking-wider font-sans opacity-90">({label})</span>
        </div>
      </div>
    );
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
                Mercados, Liquidez & Volatilidad
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-mono font-bold">
                LIVE FAPI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-3xl">
              Explorador avanzado de <strong>Futuros USDT-M y Activos TradFi</strong> con análisis de <strong>Liquidez</strong> y <strong>Volatilidad 24h</strong> para encontrar los mejores pares con <strong>entrada y salida rápida sin slippage</strong>.
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

        {/* 2. Educational Rule Card: Criterio Profesional de Trading */}
        <div className="mt-4 p-3.5 rounded-lg bg-linear-to-r from-amber-950/40 via-neutral-950 to-neutral-950 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Flame className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                <span>Regla de Oro para Trading Eficaz</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500/20 text-amber-200 rounded">
                  Score de Idoneidad
                </span>
              </div>
              <div className="text-neutral-300 text-[11px] leading-relaxed mt-0.5">
                Para hacer trading rentable se requieren pares con <strong>Alta Liquidez</strong> (Tier 1-2, volumen &gt;$100M para salir al instante sin deslizamiento de precio) y <strong>Volatilidad Moderada o Alta</strong> (rango 3%–12% que permita recorrer targets de ganancia velozmente).
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setActiveCategory('best_trading');
              setSortBy('tradeability_desc');
            }}
            className="px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shrink-0 cursor-pointer transition-colors"
          >
            Ver Recomendados ({summary.idealTradingCount})
          </button>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 mt-4 pt-4 border-t border-neutral-800/80">
          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium">Total Pares Activos</div>
            <div className="text-lg font-bold text-white font-mono mt-0.5">{summary.totalPairs}</div>
            <div className="text-[10px] text-neutral-500 mt-0.5">Binance FAPI + Spot</div>
          </div>

          <div className="bg-neutral-950/70 border border-amber-900/50 rounded-lg p-2.5">
            <div className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" />
              <span>Óptimos Trading</span>
            </div>
            <div className="text-lg font-bold text-amber-300 font-mono mt-0.5">{summary.idealTradingCount}</div>
            <div className="text-[10px] text-amber-400/80 mt-0.5">Alta Liq + Volatilidad</div>
          </div>

          <div className="bg-neutral-950/70 border border-cyan-900/40 rounded-lg p-2.5">
            <div className="text-[11px] text-cyan-300 font-medium flex items-center gap-1">
              <Droplets className="w-3 h-3 text-cyan-400" />
              <span>Alta/Mega Liquidez</span>
            </div>
            <div className="text-lg font-bold text-cyan-300 font-mono mt-0.5">{summary.highLiquidityCount}</div>
            <div className="text-[10px] text-cyan-400/80 mt-0.5">&gt; $100M 24h Vol</div>
          </div>

          <div className="bg-neutral-950/70 border border-neutral-800/80 rounded-lg p-2.5">
            <div className="text-[11px] text-neutral-400 font-medium">Volumen Total 24h</div>
            <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
              {formatVolume(summary.totalVolumeUsdt)}
            </div>
            <div className="text-[10px] text-neutral-500 mt-0.5">En USDT 24 horas</div>
          </div>

          {summary.topTradeOpportunity && (
            <div
              onClick={() => handleSelectTrade(summary.topTradeOpportunity!.symbol)}
              className="bg-neutral-950/70 border border-amber-500/40 hover:border-amber-400 rounded-lg p-2.5 cursor-pointer transition-colors"
            >
              <div className="text-[11px] text-amber-400 font-medium flex items-center justify-between">
                <span>Top Tradeability</span>
                <Zap className="w-3 h-3 fill-amber-400" />
              </div>
              <div className="text-sm font-bold text-white font-mono mt-0.5 truncate">
                {summary.topTradeOpportunity.symbol}
              </div>
              <div className="text-[10px] text-amber-300 font-bold font-mono mt-0.5">
                Score {summary.topTradeOpportunity.tradeabilityScore}/100
              </div>
            </div>
          )}

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
        </div>
      </div>

      {/* 2.5 Gráfico de Barras Comparativo de Liquidez y Volatilidad */}
      <MarketLiquidityVolatilityChart
        pairs={pairs}
        onSelectPair={handleSelectTrade}
        onOpenOrderModal={(sym) => onOpenOrderModal(sym)}
      />

      {/* 3. Barra de Categorías y Presets Rápidos */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            type="button"
            onClick={() => {
              setActiveCategory('best_trading');
              setSortBy('tradeability_desc');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'best_trading'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-amber-300 border border-amber-500/30'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>🔥 Recomendados para Trading ({summary.idealTradingCount})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('scalping');
              setSortBy('volatility_desc');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'scalping'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>⚡ Scalping & Day Trading</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveCategory('swing_safe');
              setSortBy('liquidity_desc');
            }}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'swing_safe'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>🛡️ Swing Seguro (Volatilidad Moderada)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('high_liquidity')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'high_liquidity'
                ? 'bg-cyan-500 text-neutral-950 font-bold shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-cyan-300 border border-cyan-800/40'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            <span>Mega Liquidez (&gt;$100M)</span>
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
            <Coins className="w-3.5 h-3.5" />
            <span>Todos los Futuros USDT-M ({summary.futuresCount})</span>
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
            <Building2 className="w-3.5 h-3.5 text-blue-400" />
            <span>TradFi & RWA ({summary.tradFiCount})</span>
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
            <span>Oro & Commodities</span>
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
            <span>Forex & Divisas</span>
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
            <span>Ganadores</span>
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
            <span>Perdedores</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
              activeCategory === 'all'
                ? 'bg-neutral-700 text-white shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border border-neutral-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>
        </div>

        {/* 4. Barra de Búsqueda, Filtros Avanzados y Ordenamiento */}
        <div className="flex flex-col gap-2.5 bg-neutral-900/90 border border-neutral-800 rounded-xl p-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por símbolo (ej. BTC, SOL, PAXG, ONDO, EUR), liquidez o volatilidad..."
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

            <div className="flex flex-wrap items-center gap-2">
              {/* Botón Filtros Avanzados */}
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  showAdvancedFilters || minLiquidityTier !== 'all' || volatilityTierFilter !== 'all' || fastExecutionOnly
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/40'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filtros Específicos</span>
                {(minLiquidityTier !== 'all' || volatilityTierFilter !== 'all' || fastExecutionOnly) && (
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Ordenamiento */}
              <div className="flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-400 hidden lg:inline">Ordenar:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="tradeability_desc">🏆 Score Oportunidad Trading</option>
                  <option value="liquidity_desc">💧 Mayor Liquidez (Quote Vol)</option>
                  <option value="volatility_desc">⚡ Mayor Volatilidad 24h</option>
                  <option value="volatility_asc">🛡️ Menor Volatilidad (Estable)</option>
                  <option value="change_desc">📈 Mayor Subida (+%)</option>
                  <option value="change_asc">📉 Mayor Caída (-%)</option>
                  <option value="price_desc">💰 Mayor Precio</option>
                  <option value="price_asc">💵 Menor Precio</option>
                  <option value="name_asc">🔤 Alfabético (A-Z)</option>
                </select>
              </div>

              {/* Vista Switcher */}
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

          {/* Panel Desplegable de Filtros Avanzados */}
          {showAdvancedFilters && (
            <div className="pt-3 mt-2 border-t border-neutral-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Filtro de Liquidez */}
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400 font-medium flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-cyan-400" />
                  <span>Nivel de Liquidez Mínimo</span>
                </label>
                <select
                  value={minLiquidityTier}
                  onChange={(e) => setMinLiquidityTier(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Cualquier Liquidez</option>
                  <option value="ultra">Tier 1 - Ultra Alta (&gt; $500M USDT)</option>
                  <option value="high">Tier 1 & 2 - Alta (&gt; $100M USDT)</option>
                  <option value="medium">Tier 1, 2 & 3 - Media (&gt; $20M USDT)</option>
                </select>
              </div>

              {/* Filtro de Volatilidad */}
              <div className="flex flex-col gap-1">
                <label className="text-neutral-400 font-medium flex items-center gap-1">
                  <Activity className="w-3 h-3 text-amber-400" />
                  <span>Rango de Volatilidad 24h</span>
                </label>
                <select
                  value={volatilityTierFilter}
                  onChange={(e) => setVolatilityTierFilter(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1.5 text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="all">Todas las Volatilidades</option>
                  <option value="moderate_high">🎯 Moderada + Alta (3% - 15% Ideal Trading)</option>
                  <option value="high">⚡ Alta (7% - 15% Scalping)</option>
                  <option value="extreme">💥 Extrema (&gt; 15% Momentum)</option>
                  <option value="moderate">🛡️ Moderada (3% - 7% Swing)</option>
                  <option value="low">💤 Baja (&lt; 3% Lenta)</option>
                </select>
              </div>

              {/* Toggle de Salida Rápida */}
              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-1.5 cursor-pointer hover:border-neutral-700">
                  <input
                    type="checkbox"
                    checked={fastExecutionOnly}
                    onChange={(e) => setFastExecutionOnly(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-neutral-200 text-[11px]">Solo Salida Instantánea</span>
                    <span className="text-[9px] text-neutral-400">Slippage mínimo garantizado (&lt; 0.05%)</span>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Contenido Principal: Tabla o Cuadrícula */}
      {filteredPairs.length === 0 ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 mx-auto mb-3">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No se encontraron pares con ese criterio</h3>
          <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
            Prueba relajando los filtros de liquidez/volatilidad o buscando otro símbolo.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('best_trading');
              setMinLiquidityTier('all');
              setVolatilityTierFilter('all');
              setFastExecutionOnly(false);
            }}
            className="mt-4 px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-semibold cursor-pointer"
          >
            Restablecer Filtros a Recomendados
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm font-mono min-w-[1150px]">
              <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-xs">
                <tr>
                  <th className="py-3 px-4">Par / Instrumento</th>
                  <th className="py-3 px-4">Precio & Cambio 24h</th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 text-cyan-300">
                      <Droplets className="w-3.5 h-3.5" />
                      <span>Liquidez 24h (Volumen)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 text-amber-300">
                      <Activity className="w-3.5 h-3.5" />
                      <span>Volatilidad 24h (Amplitud)</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">
                    <div className="flex items-center gap-1 text-emerald-300">
                      <Gauge className="w-3.5 h-3.5" />
                      <span>Score Trading & Salida Rápida</span>
                    </div>
                  </th>
                  <th className="py-3 px-4">Tendencia Sparkline</th>
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
                              {pair.isIdealForTrading && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                                  Top Trade
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-neutral-400 font-sans truncate max-w-[200px]">
                              {pair.displayName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Precio & Cambio */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-white text-xs">
                          ${formatPrice(pair.lastPrice)}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span
                            className={`inline-flex items-center gap-0.5 text-[11px] font-bold font-mono ${
                              isGain ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isGain ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{isGain ? '+' : ''}{pair.change24hPercent.toFixed(2)}%</span>
                          </span>
                        </div>
                      </td>

                      {/* Liquidez 24h */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white text-xs font-bold font-mono">
                              {formatVolume(pair.quoteVolume24h)}
                            </span>
                            {getLiquidityTierBadge(pair.liquidityTier)}
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-sans">
                            <span>Slippage est:</span>
                            <span className="font-mono text-neutral-300 font-semibold">{pair.estimatedSlippage}</span>
                          </div>
                        </div>
                      </td>

                      {/* Volatilidad 24h */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-white text-xs font-bold font-mono">
                              {pair.volatilityPercent24h.toFixed(2)}%
                            </span>
                            {getVolatilityBadge(pair.volatilityTier, pair.volatilityPercent24h)}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                            <span>L: ${formatPrice(pair.low24h)}</span>
                            <span>H: ${formatPrice(pair.high24h)}</span>
                          </div>
                        </div>
                      </td>

                      {/* Score Trading & Salida Rápida */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          {getTradeabilityGauge(pair.tradeabilityScore, pair.tradeabilityRating)}
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-sans">
                            <Clock className="w-2.5 h-2.5 text-neutral-500" />
                            <span>Salida:</span>
                            <span className={`font-semibold ${
                              pair.executionSpeed === 'instant' ? 'text-emerald-300' :
                              pair.executionSpeed === 'fast' ? 'text-cyan-300' :
                              pair.executionSpeed === 'moderate' ? 'text-amber-300' : 'text-rose-400'
                            }`}>
                              {pair.executionLabel}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Sparkline */}
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
                className="bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 hover:border-amber-500/50 rounded-xl p-4 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
              >
                <div>
                  {/* Top Header Card */}
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

                  {/* Price & Score Header */}
                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-neutral-800/80">
                    <div>
                      <div className="text-[10px] text-neutral-400">Precio</div>
                      <div className="text-base font-bold text-white font-mono">
                        ${formatPrice(pair.lastPrice)}
                      </div>
                    </div>
                    <div>
                      {getTradeabilityGauge(pair.tradeabilityScore, pair.tradeabilityRating)}
                    </div>
                  </div>

                  {/* Metrics Box: Liquidez & Volatilidad */}
                  <div className="mt-3 p-2.5 rounded-lg bg-neutral-950/80 border border-neutral-800/80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-cyan-400" />
                        <span>Liquidez 24h:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{formatVolume(pair.quoteVolume24h)}</span>
                        {getLiquidityTierBadge(pair.liquidityTier)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 text-[11px] flex items-center gap-1">
                        <Activity className="w-3 h-3 text-amber-400" />
                        <span>Volatilidad 24h:</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono">{pair.volatilityPercent24h.toFixed(2)}%</span>
                        {getVolatilityBadge(pair.volatilityTier, pair.volatilityPercent24h)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-neutral-800/60 text-neutral-400">
                      <span>Slippage est: <strong className="text-neutral-200">{pair.estimatedSlippage}</strong></span>
                      <span className="text-emerald-400 font-semibold">{pair.executionLabel}</span>
                    </div>
                  </div>

                  {/* Trading Advantage Tag */}
                  <div className="mt-2.5 text-[10px] text-neutral-400 font-sans line-clamp-2 leading-relaxed">
                    {pair.tradingAdvantage}
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
