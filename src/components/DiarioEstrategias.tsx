import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Clock,
  BookOpen,
  DollarSign,
  BarChart2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  AlertCircle,
  FileText,
  Tag,
} from 'lucide-react';
import {
  diarioBitcoinService,
  SUPPORTED_SYMBOLS,
  DIARIO_BITCOIN_URLS,
  MARKET_ANALYSIS_URL,
} from '../services/diarioBitcoinService';
import { DiarioBitcoinSymbol, TokenMetricsData, MarketAnalysisArticle } from '../types/diarioBitcoin';
import { binanceWs } from '../services/binanceWs';

export const DiarioEstrategias: React.FC = () => {
  const [selectedToken, setSelectedToken] = useState<DiarioBitcoinSymbol | 'ALL'>('ALL');
  const [selectedAnalysisToken, setSelectedAnalysisToken] = useState<DiarioBitcoinSymbol | 'ALL'>('ALL');
  const [metrics, setMetrics] = useState<TokenMetricsData[]>(diarioBitcoinService.getAllMetrics());
  const [articlesBySymbol, setArticlesBySymbol] = useState<Record<DiarioBitcoinSymbol, MarketAnalysisArticle[]>>(
    diarioBitcoinService.getAllArticlesBySymbol()
  );
  const [isLoading, setIsLoading] = useState<boolean>(diarioBitcoinService.getIsLoading());
  const [lastFetchedAt, setLastFetchedAt] = useState<number>(diarioBitcoinService.getLastFetchedAt());
  const [error, setError] = useState<string | null>(diarioBitcoinService.getError());

  // Live timer tick every second to keep the "tiempo en vivo restado" (article age) updated continuously
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsub = diarioBitcoinService.subscribe(() => {
      setMetrics(diarioBitcoinService.getAllMetrics());
      setArticlesBySymbol(diarioBitcoinService.getAllArticlesBySymbol());
      setIsLoading(diarioBitcoinService.getIsLoading());
      setLastFetchedAt(diarioBitcoinService.getLastFetchedAt());
      setError(diarioBitcoinService.getError());
    });

    const timer = setInterval(() => {
      setTick((t) => t + 1);
      setArticlesBySymbol(diarioBitcoinService.getAllArticlesBySymbol());
    }, 1000);

    return () => {
      unsub();
      clearInterval(timer);
    };
  }, []);

  const handleRefresh = async () => {
    await diarioBitcoinService.refreshAll();
  };

  const handleLoadInTerminal = (token: DiarioBitcoinSymbol) => {
    const pair = `${token}USDT`;
    binanceWs.setSymbol(pair);
  };

  const formatCurrency = (val: number, maxDecimals = 2) => {
    if (val === undefined || isNaN(val)) return '$0.00';
    if (val >= 1e9) {
      return `$${(val / 1e9).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} B`;
    }
    if (val >= 1e6) {
      return `$${(val / 1e6).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
    }
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: maxDecimals })}`;
  };

  const formatPct = (pct: number, showSign = true) => {
    if (pct === undefined || isNaN(pct)) return '0.00%';
    const sign = showSign && pct > 0 ? '+' : '';
    return `${sign}${pct.toFixed(2)}%`;
  };

  const filteredMetrics =
    selectedToken === 'ALL'
      ? metrics
      : metrics.filter((m) => m.token === selectedToken);

  const displayedAnalysisSymbols: DiarioBitcoinSymbol[] =
    selectedAnalysisToken === 'ALL'
      ? SUPPORTED_SYMBOLS.map((s) => s.symbol)
      : [selectedAnalysisToken];

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-6 text-neutral-100">
      {/* Header section */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Diario de Estrategias y Análisis de Mercado
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                DiarioBitcoin
              </span>
            </div>
            <p className="text-xs text-neutral-400">
              14 métricas clave e informe de los últimos 3 análisis de mercado dedicados para cada símbolo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="text-right hidden sm:block font-mono text-[11px] text-neutral-400">
            <div>
              {lastFetchedAt > 0
                ? `Actualizado: ${new Date(lastFetchedAt).toLocaleTimeString('es-ES')}`
                : 'Cargando datos...'}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-200 border border-neutral-700 transition-colors disabled:opacity-50"
            title="Recargar datos de DiarioBitcoin"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isLoading ? 'Sincronizando...' : 'Actualizar'}</span>
          </button>
        </div>
      </div>

      {/* Direct Source URLs Bar */}
      <div className="flex flex-wrap items-center gap-2 bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800 text-xs">
        <span className="text-neutral-400 font-medium shrink-0 flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
          Páginas Fuentes por Símbolo:
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {SUPPORTED_SYMBOLS.map(({ symbol, name }) => (
            <a
              key={symbol}
              href={DIARIO_BITCOIN_URLS[symbol]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-700/80 transition-colors font-mono text-[11px]"
            >
              <span className="font-bold text-amber-300">{symbol}</span>
              <span className="text-[10px] text-neutral-400">({name})</span>
              <ArrowUpRight className="w-3 h-3 opacity-60" />
            </a>
          ))}
        </div>
      </div>

      {/* Filter Tabs for Metrics */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-neutral-800">
        <button
          onClick={() => setSelectedToken('ALL')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            selectedToken === 'ALL'
              ? 'bg-amber-500 text-neutral-950 font-bold'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
          }`}
        >
          Todos los Símbolos ({metrics.length})
        </button>
        {SUPPORTED_SYMBOLS.map(({ symbol, name }) => (
          <button
            key={symbol}
            onClick={() => setSelectedToken(symbol)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              selectedToken === symbol
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <span>{symbol}</span>
            <span className="text-[10px] opacity-75 font-normal">({name})</span>
          </button>
        ))}
      </div>

      {/* Error state if any */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading placeholder if empty */}
      {isLoading && metrics.length === 0 && (
        <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
          <p className="text-sm text-neutral-400">Extrayendo datos de DiarioBitcoin.com...</p>
        </div>
      )}

      {/* Cards list for tokens with 14 Metrics + Embedded 3 Market Analysis Links per Symbol */}
      <div className="flex flex-col gap-5">
        {filteredMetrics.map((item) => {
          const isOpenPositive = item.aperturaHoy.pct >= 0;
          const isClosePositive = item.cierrePrevio.pct >= 0;
          const isOneYearPositive = item.precioHaceUnAno.pct >= 0;
          const isVolYesterdayPos = item.volumenAyer.pct >= 0;
          const isVolTodayPos = item.volumenHoy.pct >= 0;
          const isSmaPos = item.precioPromedio200Dias.pct >= 0;
          const tokenArticles = articlesBySymbol[item.token] || [];

          return (
            <div
              key={item.token}
              className="bg-neutral-950/80 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm"
            >
              {/* Token Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-amber-300 text-sm font-mono">
                    {item.token}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-base">{item.name}</span>
                      <span className="text-xs font-mono text-neutral-400">({item.token}/USDT)</span>
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-amber-400/80 hover:text-amber-300 inline-flex items-center gap-0.5 hover:underline"
                        title="Ver en DiarioBitcoin"
                      >
                        <span>diariobitcoin.com/simbolo/{item.token}</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                    <div className="text-xs text-neutral-400 font-mono mt-0.5">
                      Última cotización:{' '}
                      <span className="font-bold text-white">${item.lastQuote.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleLoadInTerminal(item.token)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <span>Cargar {item.token}USDT en Terminal</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 14 Indicators Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5 text-xs">
                {/* 1. Apertura de Hoy: $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">1. Apertura Hoy</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      ${item.aperturaHoy.price.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isOpenPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isOpenPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.aperturaHoy.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(hoy vs apertura)</span>
                </div>

                {/* 2. Cierre Previo: $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">2. Cierre Previo</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      ${item.cierrePrevio.price.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isClosePositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isClosePositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.cierrePrevio.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(hoy vs cierre ayer)</span>
                </div>

                {/* 3. Rango hoy: $ - $ */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">3. Rango Hoy</span>
                  <div className="flex items-baseline justify-between gap-1 font-mono text-xs font-bold text-white">
                    <span>${item.rangoHoy.low.toFixed(2)}</span>
                    <span className="text-neutral-400 font-normal">-</span>
                    <span>${item.rangoHoy.high.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(mínimo - máximo)</span>
                </div>

                {/* 4. Rango Ayer: $ - $ */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">4. Rango Ayer</span>
                  <div className="flex items-baseline justify-between gap-1 font-mono text-xs font-bold text-neutral-300">
                    <span>${item.rangoAyer.low.toFixed(2)}</span>
                    <span className="text-neutral-400 font-normal">-</span>
                    <span>${item.rangoAyer.high.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(mínimo - máximo)</span>
                </div>

                {/* 5. Precio hace un Año: $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">5. Hace un Año (1A)</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      ${item.precioHaceUnAno.price.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isOneYearPositive ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isOneYearPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.precioHaceUnAno.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(retorno 365d)</span>
                </div>

                {/* 6. Volumen Ayer: $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">6. Volumen Ayer</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      {formatCurrency(item.volumenAyer.vol, 0)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isVolYesterdayPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isVolYesterdayPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.volumenAyer.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(vs prom. 30 días)</span>
                </div>

                {/* 7. Volumen Hoy: $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">7. Volumen Hoy</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      {formatCurrency(item.volumenHoy.vol, 0)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isVolTodayPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isVolTodayPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.volumenHoy.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(vs prom. 30 días)</span>
                </div>

                {/* 8. Volumen Promedio 30 dias: $ */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">8. Vol. Prom. 30D</span>
                  <div className="text-sm font-bold font-mono text-white">
                    {formatCurrency(item.volumenPromedio30Dias, 0)}
                  </div>
                  <span className="text-[10px] text-neutral-400">(promedio diario)</span>
                </div>

                {/* 9. Rango 7 dias: $ - $ */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">9. Rango 7 Días</span>
                  <div className="flex items-baseline justify-between gap-1 font-mono text-xs font-bold text-white">
                    <span>${item.rango7Dias.low.toFixed(2)}</span>
                    <span className="text-neutral-400 font-normal">-</span>
                    <span>${item.rango7Dias.high.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(mínimo - máximo)</span>
                </div>

                {/* 10. Rango 52 Semanas (Tango 52 Semanas): X - X */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">10. Rango 52 Sem</span>
                  <div className="flex items-baseline justify-between gap-1 font-mono text-xs font-bold text-white">
                    <span>${item.rango52Semanas.low.toFixed(2)}</span>
                    <span className="text-neutral-400 font-normal">-</span>
                    <span>${item.rango52Semanas.high.toFixed(2)}</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(mínimo - máximo anual)</span>
                </div>

                {/* 11. Precio Promedio 200 dias (SMA 200): $ y % */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">11. SMA 200 Días</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      ${item.precioPromedio200Dias.sma200.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold flex items-center gap-0.5 ${
                        isSmaPos ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isSmaPos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {formatPct(item.precioPromedio200Dias.pct)}
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(hoy vs SMA 200)</span>
                </div>

                {/* 12. Capitalizacion: $ */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">12. Capitalización</span>
                  <div className="text-sm font-bold font-mono text-white">
                    {formatCurrency(item.capitalizacion, 2)}
                  </div>
                  <span className="text-[10px] text-neutral-400">(market cap actual)</span>
                </div>

                {/* 13. Capitalizacion ATH: $ y % donde %=$/Capitalizacion */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">13. Market Cap ATH</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      {formatCurrency(item.capitalizacionATH.marketcapAth, 2)}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400" title="Cap ATH / Cap Actual">
                      {item.capitalizacionATH.pct.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400">(ATH / Cap actual)</span>
                </div>

                {/* 14. ATH: Cuando y %= Precio hoy/Precio ATH */}
                <div className="bg-neutral-900/80 border border-neutral-800/90 rounded-lg p-3 flex flex-col gap-1">
                  <span className="text-[11px] text-neutral-400 font-medium">14. ATH Histórico</span>
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="text-sm font-bold font-mono text-white">
                      ${item.ath.price.toFixed(2)}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400" title="Precio hoy / Precio ATH">
                      {item.ath.pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-300 flex items-center justify-between font-mono">
                    <span>{item.ath.dateFormatted}</span>
                    <span className="text-neutral-400">(hoy / ATH)</span>
                  </div>
                </div>
              </div>

              {/* Embedded 3 Market Analysis Links specifically for this token */}
              <div className="mt-1 pt-3 border-t border-neutral-800/70 flex flex-col gap-2 bg-neutral-900/40 p-3 rounded-lg">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    Últimos 3 Enlaces de Análisis de Mercado para {item.token} ({item.name}):
                  </span>
                  <a
                    href={`https://www.diariobitcoin.com/categoria/analisis/?s=${encodeURIComponent(item.token)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-neutral-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <span>Más análisis de {item.token}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {tokenArticles.slice(0, 3).map((art, aIdx) => (
                    <div
                      key={`card-art-${item.token}-${aIdx}`}
                      className="p-2.5 rounded-lg bg-neutral-950/90 border border-neutral-800/90 flex flex-col justify-between gap-2 hover:border-neutral-700 transition-colors"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono">
                          <span className="px-1.5 py-0.2 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            #{aIdx + 1} {item.token}
                          </span>
                          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                            <Clock className="w-2.5 h-2.5" />
                            {art.ageText}
                          </span>
                        </div>

                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-neutral-200 hover:text-amber-300 transition-colors line-clamp-2 leading-snug group flex items-start justify-between gap-1"
                          title={art.title}
                        >
                          <span>{art.title}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0 mt-0.5" />
                        </a>

                        {art.description && (
                          <p className="text-[10px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {art.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                        <span>
                          {art.publishedTimestamp > 0
                            ? new Date(art.publishedTimestamp).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Reciente'}
                        </span>
                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-0.5"
                        >
                          <span>Leer</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dedicated Section: Últimos 3 Enlaces de Análisis de Mercado por Símbolo */}
      <div className="mt-2 border-t border-neutral-800 pt-5 flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">
              Últimos 3 Enlaces de Análisis de Mercado de Cada Símbolo
            </h3>
            <span className="text-xs text-neutral-400 font-mono">
              (Tiempo en vivo restado continuamente)
            </span>
          </div>

          <a
            href={MARKET_ANALYSIS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 hover:underline"
          >
            <span>Categoría Análisis en DiarioBitcoin</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Filter selector for the analysis section */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedAnalysisToken('ALL')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              selectedAnalysisToken === 'ALL'
                ? 'bg-amber-500 text-neutral-950 font-bold'
                : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
            }`}
          >
            Todos los Símbolos (3 por cada par)
          </button>
          {SUPPORTED_SYMBOLS.map(({ symbol, name }) => (
            <button
              key={`an-tab-${symbol}`}
              onClick={() => setSelectedAnalysisToken(symbol)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                selectedAnalysisToken === symbol
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-neutral-950 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              <span>{symbol}</span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">(3 enlaces)</span>
            </button>
          ))}
        </div>

        {/* Displaying 3 articles for each symbol */}
        <div className="flex flex-col gap-4">
          {displayedAnalysisSymbols.map((sym) => {
            const symInfo = SUPPORTED_SYMBOLS.find((s) => s.symbol === sym);
            const symArticles = (articlesBySymbol[sym] || []).slice(0, 3);

            return (
              <div
                key={`section-sym-articles-${sym}`}
                className="bg-neutral-950/90 border border-neutral-800/90 rounded-xl p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md font-mono font-extrabold text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {sym}
                    </span>
                    <span className="text-xs font-bold text-white">
                      {symInfo?.name || sym} — Últimos 3 Análisis de Mercado
                    </span>
                  </div>

                  <a
                    href={`https://www.diariobitcoin.com/categoria/analisis/?s=${encodeURIComponent(sym)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 hover:underline font-mono"
                  >
                    <span>Ver todos los análisis de {sym}</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {symArticles.map((art, idx) => (
                    <div
                      key={`article-${sym}-${idx}`}
                      className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col justify-between gap-3 hover:border-neutral-700 transition-colors shadow-sm"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="px-2 py-0.5 rounded font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {sym} • #{idx + 1}
                          </span>
                          <div className="flex items-center gap-1 text-emerald-400 font-mono font-semibold bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-900/60">
                            <Clock className="w-3 h-3 text-emerald-400" />
                            <span>{art.ageText}</span>
                          </div>
                        </div>

                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-white hover:text-amber-300 transition-colors line-clamp-3 group flex items-start gap-1.5"
                          title={art.title}
                        >
                          <span>{art.title}</span>
                          <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 shrink-0 mt-0.5" />
                        </a>

                        {art.description && (
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {art.description}
                          </p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] font-mono text-neutral-400">
                        <span title={art.pubDate}>
                          {art.publishedTimestamp > 0
                            ? new Date(art.publishedTimestamp).toLocaleDateString('es-ES', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Fecha no disp.'}
                        </span>
                        <a
                          href={art.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5 hover:underline font-semibold"
                        >
                          <span>Leer artículo</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
