import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Crown,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  Plus,
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
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TopStrategiesRiskRewardList } from './TopStrategiesRiskRewardList';
import { StrategyDetailModal } from './StrategyDetailModal';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';

export const TradingStrategiesView: React.FC = () => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => strategyService.getLastSyncTime());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'LONG' | 'SHORT' | 'HIGH_RR'>('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState<GoogleSheetStrategyRow | null>(null);
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());

  useEffect(() => {
    const unsub = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
    });

    return () => {
      unsub();
      unsubWs();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  const handleSelectStrategyForExecution = (strat: GoogleSheetStrategyRow) => {
    const prices = parsePricesFromStrategy(strat);
    const rr = calculateStrategyRewardToRisk(strat);
    const basePrice = prices.entry1Price || ticker.lastPrice || 789.5;
    const isLong = !strat.tipoDeOrden?.toLowerCase().includes('short') && !strat.tipoDeOrden?.toLowerCase().includes('venta');

    // Transfer safely to Futures Order Form with max 5x leverage & isolated margin
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
  };

  const filteredStrategies = useMemo(() => {
    return strategies.filter((st) => {
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
  }, [strategies, searchTerm, filterType]);

  return (
    <div id="trading-strategies-view" className="flex flex-col gap-5 p-3 sm:p-4 bg-neutral-900/60 rounded-xl border border-neutral-800">
      {/* 1. SECCIÓN DESTACADA: TOP 3 ESTRATEGIAS CON ALTO R:B (>= 1:2) */}
      <TopStrategiesRiskRewardList highlightSymbol={ticker.symbol} />

      {/* 2. CATÁLOGO COMPLETO DE ESTRATEGIAS Y DIARIO DE SHEETS */}
      <div className="flex flex-col gap-3 bg-neutral-950/80 p-3.5 sm:p-4 rounded-xl border border-neutral-800">
        {/* Header & Synchronization */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-white">Catálogo Completo de Estrategias</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300 font-bold border border-neutral-700">
                  {strategies.length} Registradas
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Sincronizado con Google Sheets con verificación de apalancamiento seguro 1x-5x y margen aislado.
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pt-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por par, estrategia o ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'ALL'
                  ? 'bg-amber-500 text-neutral-950 font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Todas ({strategies.length})
            </button>
            <button
              onClick={() => setFilterType('HIGH_RR')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                filterType === 'HIGH_RR'
                  ? 'bg-emerald-500 text-neutral-950 font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              <Target className="w-3 h-3 text-emerald-400" />
              <span>Alto R:B (&gt;= 1:2)</span>
            </button>
            <button
              onClick={() => setFilterType('LONG')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'LONG'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Long
            </button>
            <button
              onClick={() => setFilterType('SHORT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterType === 'SHORT'
                  ? 'bg-rose-600 text-white font-bold'
                  : 'bg-neutral-900 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
              }`}
            >
              Short
            </button>
          </div>
        </div>

        {/* Strategies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {filteredStrategies.length === 0 ? (
            <div className="col-span-full py-10 text-center text-xs text-neutral-500">
              No se encontraron estrategias que coincidan con la búsqueda.
            </div>
          ) : (
            filteredStrategies.map((strat) => {
              const prices = parsePricesFromStrategy(strat);
              const rr = calculateStrategyRewardToRisk(strat);
              const isLong =
                !strat.tipoDeOrden?.toLowerCase().includes('short') &&
                !strat.tipoDeOrden?.toLowerCase().includes('venta');

              return (
                <div
                  key={strat.noEstrategia}
                  className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between gap-3 group"
                >
                  {/* Top: Par, Type, R:B */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white font-mono text-sm">{strat.par}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded font-bold font-mono ${
                            isLong
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {isLong ? 'LONG' : 'SHORT'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-400 font-medium line-clamp-1 mt-0.5">
                        {strat.nombreEstrategia}
                      </div>
                    </div>

                    <span
                      className={`text-xs font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${
                        rr.ratio >= 2.0
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                      }`}
                    >
                      R:B 1:{rr.ratio.toFixed(1)}
                    </span>
                  </div>

                  {/* Prices & Target Levels */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-neutral-950/80 border border-neutral-850 font-mono text-[11px]">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-500">Entrada 1</span>
                      <span className="text-white font-bold">
                        {prices.entry1Price ? `$${prices.entry1Price.toFixed(2)}` : '-'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-500">Stop-Loss</span>
                      <span className="text-rose-400 font-bold">
                        {prices.slPrice ? `$${prices.slPrice.toFixed(2)}` : '-'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-neutral-500">Take-Profit</span>
                      <span className="text-emerald-400 font-bold">
                        {prices.tp1Price ? `$${prices.tp1Price.toFixed(2)}` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-neutral-800/80">
                    <button
                      onClick={() => setSelectedStrategy(strat)}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-750 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Detalles</span>
                    </button>

                    <button
                      onClick={() => handleSelectStrategyForExecution(strat)}
                      className="px-2.5 py-1 rounded bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-bold flex items-center gap-1 transition-all shadow-xs"
                      title="Cargar parámetros con apalancamiento seguro <= 5x y margen aislado"
                    >
                      <Zap className="w-3 h-3 fill-neutral-950" />
                      <span>Cargar a Futuros</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
