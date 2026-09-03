import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Layers,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TopStrategiesRiskRewardList } from './TopStrategiesRiskRewardList';
import { StrategyDetailModal } from './StrategyDetailModal';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';

interface TradingStrategiesViewProps {
  onOpenOrderModal?: () => void;
}

export const TradingStrategiesView: React.FC<TradingStrategiesViewProps> = ({ onOpenOrderModal }) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => strategyService.getLastSyncTime());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT' | 'HIGH_RR'>('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState<GoogleSheetStrategyRow | null>(null);
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsub = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
    });

    const unsubLive = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });

    return () => {
      unsub();
      unsubWs();
      unsubLive();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  const handleSelectStrategyForExecution = (strat: GoogleSheetStrategyRow) => {
    const prices = parsePricesFromStrategy(strat);
    const rr = calculateStrategyRewardToRisk(strat);
    const liveP = livePriceService.getPrice(strat.par);
    const basePrice = prices.entry1Price || liveP || ticker.lastPrice || 789.5;
    const isLong = !strat.tipoDeOrden?.toLowerCase().includes('short') && !strat.tipoDeOrden?.toLowerCase().includes('venta');

    // Transfer safely to Futures Order Form with max 5x leverage & isolated margin, and trigger popup
    strategyAutofillService.autofillOrderForm({
      strategyId: strat.noEstrategia,
      strategyName: `${strat.par} - ${strat.nombreEstrategia}`,
      symbol: strat.par.replace(/[^A-Z0-9]/g, ''),
      side: isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: 2, // Safe default 2x
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice: prices.slPrice || (isLong ? basePrice * 0.985 : basePrice * 1.015),
      tpPrice: prices.tp1Price || (isLong ? basePrice * 1.045 : basePrice * 0.955),
      riskReward: rr.ratio > 0 ? rr.ratio : 2.0,
      autoExecuteImmediately: false,
    });

    if (onOpenOrderModal) {
      onOpenOrderModal();
    }
  };

  // Filtrar ÚNICAMENTE las estrategias activas (excluir obsoletas / inactivas)
  const activeStrategies = useMemo(() => {
    return strategies.filter((st) => {
      const isObsolete = (st.estado || '').toLowerCase().includes('obsolet') || normalizeStrategyStatus(st.estado) === 'Obsoleto';
      return !isObsolete;
    });
  }, [strategies]);

  const filteredStrategies = useMemo(() => {
    return activeStrategies.filter((st) => {
      const matchSearch =
        st.par.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.nombreEstrategia.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.noEstrategia.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (filterType === 'LONG') {
        return !st.tipoDeOrden?.toLowerCase().includes('short') && !st.tipoDeOrden?.toLowerCase().includes('venta');
      }
      if (filterType === 'SHORT') {
        return st.tipoDeOrden?.toLowerCase().includes('short') || st.tipoDeOrden?.toLowerCase().includes('venta');
      }
      if (filterType === 'HIGH_RR') {
        const rr = calculateStrategyRewardToRisk(st);
        return rr.ratio >= 2.0;
      }
      return true;
    });
  }, [activeStrategies, searchTerm, filterType]);

  return (
    <div id="trading-strategies-view" className="flex flex-col gap-6">
      {/* 1. SECCIÓN DESTACADA: TOP 3 ESTRATEGIAS CON ALTO R:B (>= 1:2) - FORMATO TABLA CON PRECIO LIVE */}
      <TopStrategiesRiskRewardList highlightSymbol={ticker.symbol} />

      {/* 2. CATÁLOGO COMPLETO DE ESTRATEGIAS ACTIVAS - FORMATO TABLA CON PRECIO LIVE Y DIFERENCIA VS ENTRADA 1 */}
      <div className="flex flex-col gap-3.5 bg-neutral-900/70 p-4 rounded-xl border border-neutral-800 shadow-xl">
        {/* Header & Synchronization */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">Catálogo de Estrategias Activas</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  {activeStrategies.length} Activas Vigentes
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-neutral-400">
                  <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                  <span>Monitoreo Live FAPI Activo</span>
                </div>
                {lastSyncTime && (
                  <span className="text-[10px] text-neutral-500 font-mono hidden md:inline">
                    Última sincronización: {lastSyncTime}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Solo estrategias operables con cálculo automático en tiempo real de la distancia entre Entrada 1 y Precio Live de Binance Futures.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
            </button>

            <a
              href={OFFICIAL_GOOGLE_SHEET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              title="Abrir hoja de cálculo oficial en Google Sheets"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span>Google Sheets</span>
            </a>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por par, estrategia o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50 font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 font-mono">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Todas Activas ({activeStrategies.length})
            </button>
            <button
              onClick={() => setFilterType('HIGH_RR')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === 'HIGH_RR'
                  ? 'bg-emerald-500 text-neutral-950 font-bold shadow-xs'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <Target className="w-3 h-3 text-emerald-400" />
              <span>Alto R:B (&gt;= 1:2)</span>
            </button>
            <button
              onClick={() => setFilterType('LONG')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'LONG'
                  ? 'bg-emerald-600 text-white font-bold shadow-xs'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setFilterType('SHORT')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'SHORT'
                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Short
            </button>
          </div>
        </div>

        {/* TABLA PRINCIPAL DE ESTRATEGIAS ACTIVAS (Con Precio Live y Diferencia vs E1) */}
        <div className="bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden shadow-inner">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-900/90 text-[10px] font-mono uppercase tracking-wider text-neutral-400 border-b border-neutral-800">
                  <th className="py-3 px-3 font-semibold w-14">ID</th>
                  <th className="py-3 px-3 font-semibold">Par</th>
                  <th className="py-3 px-3 font-semibold">Tipo</th>
                  <th className="py-3 px-3 font-semibold min-w-[190px]">Nombre de Estrategia</th>
                  <th className="py-3 px-3 font-semibold">Entrada 1 (E1)</th>
                  <th className="py-3 px-3 font-semibold">Precio Live</th>
                  <th className="py-3 px-3 font-semibold min-w-[150px]">Dif. vs Entrada 1</th>
                  <th className="py-3 px-3 font-semibold">Stop Loss</th>
                  <th className="py-3 px-3 font-semibold">Take Profit</th>
                  <th className="py-3 px-3 font-semibold text-center">Ratio R:B</th>
                  <th className="py-3 px-3 font-semibold text-center">Estado</th>
                  <th className="py-3 px-3 font-semibold text-right min-w-[160px]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-850 font-mono">
                {filteredStrategies.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-xs text-neutral-500 font-sans">
                      No se encontraron estrategias activas que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredStrategies.map((strat) => {
                    const prices = parsePricesFromStrategy(strat);
                    const rr = calculateStrategyRewardToRisk(strat);
                    const isLong =
                      !strat.tipoDeOrden?.toLowerCase().includes('short') &&
                      !strat.tipoDeOrden?.toLowerCase().includes('venta');

                    // Real-time live price & difference calculation
                    const liveData = livePriceService.getPriceData(strat.par);
                    const livePrice = liveData.price;
                    const entry1Price = prices.entry1Price || 0;

                    let diffDollar = 0;
                    let diffPercent = 0;
                    let isCloseToEntry = false;

                    if (entry1Price > 0 && livePrice > 0) {
                      diffDollar = livePrice - entry1Price;
                      diffPercent = (diffDollar / entry1Price) * 100;
                      isCloseToEntry = Math.abs(diffPercent) <= 0.75;
                    }

                    const decimalPlaces = entry1Price < 10 || livePrice < 10 ? 4 : 2;

                    return (
                      <tr
                        key={strat.noEstrategia}
                        className="transition-colors hover:bg-neutral-900/70"
                      >
                        {/* ID / Fecha */}
                        <td className="py-3 px-3">
                          <div className="font-bold text-white text-[11px]">{strat.noEstrategia}</div>
                          {strat.fecha && (
                            <div className="text-[9px] text-neutral-500 font-sans">{strat.fecha}</div>
                          )}
                        </td>

                        {/* Par */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                            <span>{strat.par}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-400 border border-neutral-800">
                              PERP
                            </span>
                          </div>
                        </td>

                        {/* Tipo / Dirección */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isLong
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isLong ? (
                              <>
                                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                LONG
                              </>
                            ) : (
                              <>
                                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                SHORT
                              </>
                            )}
                          </span>
                        </td>

                        {/* Nombre de Estrategia */}
                        <td className="py-3 px-3 font-sans">
                          <div className="font-bold text-white text-xs">{strat.nombreEstrategia}</div>
                          {strat.comentariosBacktesting && (
                            <div className="text-[10px] text-neutral-400 line-clamp-1 mt-0.5">
                              {strat.comentariosBacktesting}
                            </div>
                          )}
                        </td>

                        {/* Entrada 1 (E1) */}
                        <td className="py-3 px-3 font-bold text-white">
                          {entry1Price ? `$${entry1Price.toFixed(decimalPlaces)}` : '-'}
                        </td>

                        {/* Precio Live */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-amber-300">
                              ${livePrice.toFixed(decimalPlaces)}
                            </span>
                            <span
                              className={`text-[9px] font-semibold ${
                                liveData.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {liveData.change24hPercent >= 0 ? '+' : ''}
                              {liveData.change24hPercent.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* Diferencia entre Entrada 1 y Precio Live */}
                        <td className="py-3 px-3">
                          {entry1Price > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <div
                                className={`font-bold text-xs flex items-center gap-1 ${
                                  isCloseToEntry
                                    ? 'text-emerald-400'
                                    : isLong
                                    ? diffDollar > 0
                                      ? 'text-sky-300'
                                      : 'text-emerald-300'
                                    : diffDollar > 0
                                    ? 'text-emerald-300'
                                    : 'text-sky-300'
                                }`}
                              >
                                <span>
                                  {diffDollar >= 0 ? '+' : ''}${diffDollar.toFixed(decimalPlaces)}
                                </span>
                                <span className="text-[10px]">
                                  ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(2)}%)
                                </span>
                              </div>
                              <span
                                className={`text-[9px] font-medium font-sans ${
                                  isCloseToEntry
                                    ? 'text-emerald-400 font-bold'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {isCloseToEntry
                                  ? '🎯 En zona de entrada'
                                  : isLong
                                  ? diffDollar > 0
                                    ? `A ${diffPercent.toFixed(1)}% arriba de E1`
                                    : `💎 Descuento: -${Math.abs(diffPercent).toFixed(1)}%`
                                  : diffDollar > 0
                                  ? `💎 Mejor precio (+${diffPercent.toFixed(1)}%)`
                                  : `A -${Math.abs(diffPercent).toFixed(1)}% de E1`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-neutral-500">-</span>
                          )}
                        </td>

                        {/* Stop Loss */}
                        <td className="py-3 px-3">
                          <div className="text-rose-400 font-bold">
                            {prices.slPrice ? `$${prices.slPrice.toFixed(decimalPlaces)}` : '-'}
                          </div>
                        </td>

                        {/* Take Profit */}
                        <td className="py-3 px-3">
                          <div className="text-emerald-400 font-bold">
                            {prices.tp1Price ? `$${prices.tp1Price.toFixed(decimalPlaces)}` : '-'}
                          </div>
                          {prices.tp2Price && (
                            <div className="text-[10px] text-emerald-500/80">
                              TP2: ${prices.tp2Price.toFixed(decimalPlaces)}
                            </div>
                          )}
                        </td>

                        {/* Ratio R:B */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md font-bold text-xs border ${
                              rr.ratio >= 2.0
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                            }`}
                          >
                            1:{rr.ratio > 0 ? rr.ratio.toFixed(1) : '-'}
                          </span>
                        </td>

                        {/* Estado */}
                        <td className="py-3 px-3 text-center">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400 border border-emerald-800/60">
                            {strat.estado || 'Activa'}
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedStrategy(strat)}
                              className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors border border-neutral-800"
                              title="Ver detalles completos de la estrategia"
                            >
                              <Eye className="w-3 h-3 text-neutral-400" />
                              <span className="hidden sm:inline">Detalles</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSelectStrategyForExecution(strat)}
                              className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                              title="Cargar orden y abrir formulario popup de Binance Futures"
                            >
                              <Zap className="w-3 h-3 fill-neutral-950" />
                              <span>Cargar</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailModal
          strategy={selectedStrategy}
          isOpen={!!selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          onApplyToOrderForm={handleSelectStrategyForExecution}
        />
      )}
    </div>
  );
};
