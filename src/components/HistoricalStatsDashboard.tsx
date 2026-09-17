import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Filter,
  FileSpreadsheet,
  Info,
  Layers,
  Percent,
  PieChart as PieIcon,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { closedTradesSheetService, DEFAULT_CLOSED_TRADES_TAB } from '../services/closedTradesSheetService';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { googleSheetsApiService } from '../services/googleSheetsApiService';
import {
  ClosedTradeSheetItem,
  HistoricalStatsFilter,
  HistoricalMetricsSummary,
} from '../types/historicalStats';

interface HistoricalStatsDashboardProps {
  onClose?: () => void;
  compact?: boolean;
}

export const HistoricalStatsDashboard: React.FC<HistoricalStatsDashboardProps> = ({
  onClose,
  compact = false,
}) => {
  const [trades, setTrades] = useState<ClosedTradeSheetItem[]>(() => closedTradesSheetService.getTrades());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => closedTradesSheetService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => closedTradesSheetService.getLastSyncTime());
  const [syncError, setSyncError] = useState<string | null>(() => closedTradesSheetService.getLastSyncError());
  const [sheetTabName, setSheetTabName] = useState<string>(() => closedTradesSheetService.getSheetTabName());
  const [activeChartTab, setActiveChartTab] = useState<'drawdown_equity' | 'pairs_strategies' | 'exits_distribution' | 'trades_log'>('drawdown_equity');

  // Filter states
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');
  const [filterStrategy, setFilterStrategy] = useState<string>('ALL');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN'>('ALL');
  const [filterDateRange, setFilterDateRange] = useState<'ALL' | '7D' | '30D' | '90D'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  useEffect(() => {
    const unsub = closedTradesSheetService.subscribe(() => {
      setTrades(closedTradesSheetService.getTrades());
      setIsSyncing(closedTradesSheetService.getIsSyncing());
      setLastSyncTime(closedTradesSheetService.getLastSyncTime());
      setSyncError(closedTradesSheetService.getLastSyncError());
      setSheetTabName(closedTradesSheetService.getSheetTabName());
    });
    return () => unsub();
  }, []);

  // Filter application
  const filteredTrades = useMemo(() => {
    const filter: HistoricalStatsFilter = {
      symbol: filterSymbol,
      strategyId: filterStrategy,
      side: filterSide,
      outcome: filterOutcome,
      dateRange: filterDateRange,
    };

    let result = closedTradesSheetService.filterTrades(trades, filter);

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.symbol.toLowerCase().includes(q) ||
          t.strategyId.toLowerCase().includes(q) ||
          t.strategyName.toLowerCase().includes(q) ||
          t.exitReasonLabel.toLowerCase().includes(q) ||
          (t.notes && t.notes.toLowerCase().includes(q))
      );
    }

    return result;
  }, [trades, filterSymbol, filterStrategy, filterSide, filterOutcome, filterDateRange, searchTerm]);

  // Derived metrics and datasets
  const metrics: HistoricalMetricsSummary = useMemo(() => {
    return closedTradesSheetService.calculateMetrics(filteredTrades);
  }, [filteredTrades]);

  const drawdownPoints = useMemo(() => {
    return closedTradesSheetService.generateCumulativeDrawdownPoints(filteredTrades);
  }, [filteredTrades]);

  const symbolBreakdown = useMemo(() => {
    return closedTradesSheetService.generateSymbolBreakdown(filteredTrades);
  }, [filteredTrades]);

  const strategyBreakdown = useMemo(() => {
    return closedTradesSheetService.generateStrategyBreakdown(filteredTrades);
  }, [filteredTrades]);

  const exitDistribution = useMemo(() => {
    return closedTradesSheetService.generateExitReasonDistribution(filteredTrades);
  }, [filteredTrades]);

  // Available unique symbols & strategies for filters
  const uniqueSymbols = useMemo(() => {
    return Array.from(new Set(trades.map((t) => t.symbol))).sort();
  }, [trades]);

  const uniqueStrategies = useMemo(() => {
    const map = new Map<string, string>();
    trades.forEach((t) => {
      if (!map.has(t.strategyId)) {
        map.set(t.strategyId, t.strategyName || t.strategyId);
      }
    });
    return Array.from(map.entries());
  }, [trades]);

  const handleManualSync = async () => {
    await closedTradesSheetService.syncFromGoogleSheets(undefined, false);
  };

  const handleExportCsv = () => {
    const csv = closedTradesSheetService.exportClosedTradesCsv(filteredTrades);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trades_cerrados_google_sheets_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCsv = () => {
    const csv = closedTradesSheetService.exportClosedTradesCsv(filteredTrades);
    navigator.clipboard.writeText(csv);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const currentSheetUrl = strategyService.getEffectiveSheetUrl() || OFFICIAL_GOOGLE_SHEET_URL;

  return (
    <div className="flex flex-col gap-4 bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-2xl">
      {/* 1. Header & Google Sheets Source Sync Banner */}
      <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">
                Estadísticas Históricas de la Estrategia
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Google Sheets</span>
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Cálculo y análisis en tiempo real de <strong className="text-amber-300">Win Rate</strong>, <strong className="text-emerald-300">Profit Factor</strong> y <strong className="text-sky-300">Drawdown Acumulado</strong> sobre trades cerrados.
            </p>
          </div>
        </div>

        {/* Sync Status & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] font-mono text-neutral-400">
              Pestaña: <span className="text-neutral-200 font-semibold">{sheetTabName}</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-500">
              {lastSyncTime ? `Sincronizado: ${lastSyncTime}` : 'Sincronización activa'}
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${
              isSyncing
                ? 'bg-neutral-800 text-neutral-400 border-neutral-700'
                : 'bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-700/60 hover:border-emerald-500'
            }`}
            title="Extraer y recalcular métricas desde la hoja de Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
            <span>{isSyncing ? 'Extrayendo...' : 'Sincronizar Sheets'}</span>
          </button>

          <a
            href={currentSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 flex items-center gap-1.5 transition-colors"
            title="Abrir hoja de cálculo en Google Sheets"
          >
            <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Ver Hoja</span>
          </a>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {syncError && (
        <div className="mx-4 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {/* 2. Key KPI Performance Cards Grid */}
      <div className="px-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* KPI 1: Win Rate */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-amber-500/50 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">Win Rate</span>
            <Target className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black font-mono text-amber-300">
              {metrics.winRate}%
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">{metrics.winningTrades}W</span>
              <span>/</span>
              <span className="text-rose-400 font-bold">{metrics.losingTrades}L</span>
              {metrics.breakevenTrades > 0 && (
                <span className="text-neutral-500 font-bold">({metrics.breakevenTrades} BE)</span>
              )}
            </div>
          </div>
          <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, metrics.winRate))}%` }}
            ></div>
          </div>
        </div>

        {/* KPI 2: Profit Factor */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-500/50 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">Profit Factor</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-1.5">
            <div className={`text-2xl font-black font-mono ${
              metrics.profitFactor >= 2.0
                ? 'text-emerald-400'
                : metrics.profitFactor >= 1.4
                ? 'text-amber-300'
                : 'text-rose-400'
            }`}>
              {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '0.00'}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              +${metrics.grossProfit.toFixed(1)} / -${metrics.grossLoss.toFixed(1)}
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            {metrics.profitFactor >= 2.0 ? '⚡ Rendimiento Institucional' : 'Rentable sostenido'}
          </div>
        </div>

        {/* KPI 3: Max Drawdown Acumulado */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-rose-500/50 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">Max Drawdown</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black font-mono text-rose-400">
              -{metrics.maxDrawdownPercent}%
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Pérdida pico: -${metrics.maxDrawdownUsdt.toFixed(2)}
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>DD actual: -{metrics.currentDrawdownPercent}%</span>
          </div>
        </div>

        {/* KPI 4: PnL Neto Acumulado */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-sky-500/50 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">PnL Neto Total</span>
            {metrics.netRealizedPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className="my-1.5">
            <div className={`text-2xl font-black font-mono ${
              metrics.netRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {metrics.netRealizedPnl >= 0 ? '+' : ''}${metrics.netRealizedPnl.toFixed(2)}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Bruto: ${metrics.totalRealizedPnl.toFixed(2)} USDT
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Comisiones: -${metrics.totalCommissions.toFixed(2)}
          </div>
        </div>

        {/* KPI 5: Expectativa Matemática / Trade */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-purple-500/50 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">Expectativa / Trade</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black font-mono text-purple-300">
              {metrics.expectancyUsdt >= 0 ? '+' : ''}${metrics.expectancyUsdt.toFixed(2)}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Gan: +${metrics.avgWin.toFixed(1)} | Pérd: -${metrics.avgLoss.toFixed(1)}
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Payoff Ratio: {metrics.winLossRatio.toFixed(2)}x
          </div>
        </div>

        {/* KPI 6: Trades Evaluados & Disciplina */}
        <div className="p-3.5 bg-neutral-950/90 rounded-xl border border-neutral-800/90 flex flex-col justify-between relative overflow-hidden group hover:border-neutral-700 transition-colors">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span className="font-semibold text-neutral-300">Total Operaciones</span>
            <Layers className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="my-1.5">
            <div className="text-2xl font-black font-mono text-white">
              {metrics.totalTrades}
            </div>
            <div className="text-[11px] font-mono text-neutral-400 mt-0.5">
              Longs: {metrics.longTradesCount} ({metrics.longWinRate}%)
            </div>
          </div>
          <div className="text-[10px] text-neutral-500 font-mono">
            Racha máx victorias: {metrics.maxConsecutiveWins}
          </div>
        </div>
      </div>

      {/* 3. Interactive Filter Bar */}
      <div className="px-4 py-2 bg-neutral-950/80 border-y border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-bold">Filtros:</span>
          </div>

          {/* Símbolo / Par */}
          <select
            value={filterSymbol}
            onChange={(e) => setFilterSymbol(e.target.value)}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Todos los Pares ({uniqueSymbols.length})</option>
            {uniqueSymbols.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Estrategia Google Sheets */}
          <select
            value={filterStrategy}
            onChange={(e) => setFilterStrategy(e.target.value)}
            className="px-2.5 py-1 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-200 focus:outline-none focus:border-amber-500 cursor-pointer max-w-[190px] truncate"
          >
            <option value="ALL">Todas las Estrategias</option>
            {uniqueStrategies.map(([id, name]) => (
              <option key={id} value={id} title={name}>
                {id} - {name}
              </option>
            ))}
          </select>

          {/* Dirección Lado */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterSide('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterSide === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterSide('BUY')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterSide === 'BUY' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/80' : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              Longs
            </button>
            <button
              onClick={() => setFilterSide('SELL')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterSide === 'SELL' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800/80' : 'text-neutral-400 hover:text-rose-400'
              }`}
            >
              Shorts
            </button>
          </div>

          {/* Resultado */}
          <div className="flex items-center bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 text-xs font-mono">
            <button
              onClick={() => setFilterOutcome('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterOutcome === 'ALL' ? 'bg-neutral-800 text-white font-bold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              W/L
            </button>
            <button
              onClick={() => setFilterOutcome('WIN')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterOutcome === 'WIN' ? 'bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/80' : 'text-neutral-400 hover:text-emerald-400'
              }`}
            >
              Ganadoras
            </button>
            <button
              onClick={() => setFilterOutcome('LOSS')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                filterOutcome === 'LOSS' ? 'bg-rose-950 text-rose-300 font-bold border border-rose-800/80' : 'text-neutral-400 hover:text-rose-400'
              }`}
            >
              Perdedoras
            </button>
          </div>

          {/* Rango Temporal */}
          <select
            value={filterDateRange}
            onChange={(e) => setFilterDateRange(e.target.value as any)}
            className="px-2 py-1 bg-neutral-900 border border-neutral-700 rounded-lg text-xs font-mono text-neutral-300 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">Historial Completo</option>
            <option value="7D">Últimos 7 Días</option>
            <option value="30D">Últimos 30 Días</option>
            <option value="90D">Últimos 90 Días</option>
          </select>
        </div>

        {/* Búsqueda rápida */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Buscar por par, TP, SL..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1 text-xs font-mono text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none w-48"
          />
        </div>
      </div>

      {/* 4. Chart Navigation Tabs */}
      <div className="px-4 flex items-center justify-between border-b border-neutral-800 gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setActiveChartTab('drawdown_equity')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeChartTab === 'drawdown_equity'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Curva de Drawdown Acumulado & Capital</span>
          </button>

          <button
            onClick={() => setActiveChartTab('pairs_strategies')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeChartTab === 'pairs_strategies'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rendimiento por Par & Estrategia</span>
          </button>

          <button
            onClick={() => setActiveChartTab('exits_distribution')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeChartTab === 'exits_distribution'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>Distribución de Salidas (TP / SL / Trailing)</span>
          </button>

          <button
            onClick={() => setActiveChartTab('trades_log')}
            className={`px-3 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeChartTab === 'trades_log'
                ? 'border-amber-500 text-amber-400 bg-amber-500/5'
                : 'border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Registro de Trades Google Sheets ({filteredTrades.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2 py-1">
          <button
            onClick={handleCopyCsv}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
            title="Copiar datos en formato CSV para pegar en Google Sheets"
          >
            {copiedToast ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-bold">¡Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-neutral-400" />
                <span>Copiar CSV</span>
              </>
            )}
          </button>
          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1 text-[11px] font-mono rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
            title="Descargar archivo CSV estructurado"
          >
            <Download className="w-3 h-3 text-neutral-400" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* 5. Main Content Views */}
      <div className="px-4 pb-4">
        {/* VIEW 1: Curva de Drawdown Acumulado & Curva de Capital */}
        {activeChartTab === 'drawdown_equity' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico 1: Curva de Drawdown Acumulado (Underwater Curve) */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <span>Curva de Drawdown Acumulado (%) — Underwater</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Profundidad de pérdida respecto al máximo histórico acumulado (High-Water Mark).
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-rose-400">Máx: -{metrics.maxDrawdownPercent}%</span>
                  <div className="text-[10px] text-neutral-500">-${metrics.maxDrawdownUsdt.toFixed(2)} USDT</div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={drawdownPoints} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={10} tickLine={false} tickFormatter={(v) => `-${v}%`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl text-xs font-mono">
                              <div className="font-bold text-neutral-200">{data.symbol} ({data.strategyId})</div>
                              <div className="text-neutral-400 text-[10px]">{data.date} • {data.exitReason}</div>
                              <div className="text-rose-400 font-bold mt-1">
                                Drawdown: -{data.drawdownPct.toFixed(2)}% (-${data.drawdownUsdt.toFixed(2)})
                              </div>
                              <div className="text-neutral-400 text-[10px]">
                                PnL Trade: {data.tradePnl >= 0 ? '+' : ''}${data.tradePnl.toFixed(2)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="#525252" strokeDasharray="2 2" />
                    <Area
                      type="monotone"
                      dataKey="drawdownPct"
                      stroke="#f43f5e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#drawdownGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-900 text-center font-mono">
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Max Drawdown %</div>
                  <div className="text-xs font-bold text-rose-400">-{metrics.maxDrawdownPercent}%</div>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Drawdown Actual</div>
                  <div className="text-xs font-bold text-amber-400">-{metrics.currentDrawdownPercent}%</div>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Racha Pérdidas</div>
                  <div className="text-xs font-bold text-neutral-300">Máx {metrics.maxConsecutiveLosses} consecutivas</div>
                </div>
              </div>
            </div>

            {/* Gráfico 2: Curva de Capital Acumulada (Equity Curve) */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>Curva de Crecimiento de Capital (PnL Acumulado USDT)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Trayectoria trade a trade del beneficio acumulado neto de comisiones.
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs font-bold text-emerald-400">+${metrics.totalRealizedPnl.toFixed(2)} USDT</span>
                  <div className="text-[10px] text-neutral-500">{filteredTrades.length} trades</div>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={drawdownPoints} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="date" stroke="#737373" fontSize={10} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl text-xs font-mono">
                              <div className="font-bold text-neutral-200">{data.symbol} — {data.strategyId}</div>
                              <div className="text-neutral-400 text-[10px]">{data.date} • {data.exitReason}</div>
                              <div className={`font-bold mt-1 ${data.cumulativePnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                PnL Acumulado: {data.cumulativePnl >= 0 ? '+' : ''}${data.cumulativePnl.toFixed(2)} USDT
                              </div>
                              <div className="text-neutral-300 text-[10px]">
                                Trade individual: {data.tradePnl >= 0 ? '+' : ''}${data.tradePnl.toFixed(2)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine y={0} stroke="#525252" strokeDasharray="2 2" />
                    <Area
                      type="monotone"
                      dataKey="cumulativePnl"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#equityGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-900 text-center font-mono">
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Mejor Trade</div>
                  <div className="text-xs font-bold text-emerald-400">+${metrics.largestWin.toFixed(2)}</div>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Peor Trade (SL)</div>
                  <div className="text-xs font-bold text-rose-400">-${metrics.largestLoss.toFixed(2)}</div>
                </div>
                <div className="bg-neutral-900/60 p-2 rounded border border-neutral-800/80">
                  <div className="text-[10px] text-neutral-500">Ganancia Media</div>
                  <div className="text-xs font-bold text-emerald-400">+${metrics.avgWin.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Rendimiento por Par & Estrategia */}
        {activeChartTab === 'pairs_strategies' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Rendimiento por Criptoactivo */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span>Beneficio Realizado por Par Cripto (USDT)</span>
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Comparación de ganancias acumuladas y tasa de acierto por activo.
                  </p>
                </div>
              </div>

              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={symbolBreakdown} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                    <XAxis dataKey="symbol" stroke="#737373" fontSize={10} tickLine={false} />
                    <YAxis stroke="#737373" fontSize={10} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl text-xs font-mono">
                              <div className="font-bold text-amber-400">{data.symbol}</div>
                              <div className="text-neutral-300 text-[11px]">
                                PnL Total: <strong className="text-emerald-400">+${data.realizedPnl.toFixed(2)}</strong>
                              </div>
                              <div className="text-neutral-400 text-[10px]">
                                Win Rate: {data.winRate}% ({data.winningTrades}W / {data.losingTrades}L)
                              </div>
                              <div className="text-neutral-400 text-[10px]">
                                Profit Factor: {data.profitFactor.toFixed(2)} | Trades: {data.tradesCount}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="realizedPnl" radius={[4, 4, 0, 0]}>
                      {symbolBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.realizedPnl >= 0 ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="divide-y divide-neutral-900 text-xs font-mono">
                {symbolBreakdown.map((sym) => (
                  <div key={sym.symbol} className="py-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white">{sym.symbol}</span>
                      <span className="text-[10px] text-neutral-400">({sym.tradesCount} trades)</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-300 font-semibold">{sym.winRate}% WR</span>
                      <span className="text-neutral-400">PF: {sym.profitFactor.toFixed(2)}</span>
                      <span className={`font-bold ${sym.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {sym.realizedPnl >= 0 ? '+' : ''}${sym.realizedPnl.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rendimiento por Estrategia Google Sheets */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div>
                <h3 className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-sky-400" />
                  <span>Eficacia por Estrategia del Libro Google Sheets</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Desglose de PnL y cumplimiento del plan táctico por cada hipótesis.
                </p>
              </div>

              <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
                {strategyBreakdown.map((strat) => (
                  <div
                    key={strat.strategyId}
                    className="p-2.5 bg-neutral-900/70 border border-neutral-800/90 rounded-lg flex flex-col gap-1.5 font-mono text-xs hover:border-neutral-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white">{strat.symbol}</span>
                        <span className="text-[10px] text-neutral-400 px-1.5 py-0.2 rounded bg-neutral-800">
                          {strat.strategyId}
                        </span>
                      </div>
                      <span className={`font-bold ${strat.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {strat.realizedPnl >= 0 ? '+' : ''}${strat.realizedPnl.toFixed(2)} USDT
                      </span>
                    </div>

                    <div className="text-[11px] text-neutral-300 truncate">
                      {strat.strategyName}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-400 border-t border-neutral-800/60 pt-1.5 mt-0.5">
                      <div className="flex items-center gap-2">
                        <span>Win Rate: <strong className="text-amber-300">{strat.winRate}%</strong></span>
                        <span>PF: <strong className="text-neutral-200">{strat.profitFactor.toFixed(2)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px]">
                        <span className="text-emerald-400">TP1:{strat.exitReasons.tp1}</span>
                        <span className="text-emerald-300">TP2:{strat.exitReasons.tp2}</span>
                        <span className="text-sky-400">TS:{strat.exitReasons.trailingStop}</span>
                        <span className="text-rose-400">SL:{strat.exitReasons.stopLoss}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: Distribución de Salidas & Eficacia */}
        {activeChartTab === 'exits_distribution' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Gráfico Circular de Salidas */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col gap-3">
              <div>
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <PieIcon className="w-4 h-4 text-purple-400" />
                  <span>Distribución de Tipos de Cierre</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Proporción de salidas por Take Profits escalonados, Trailing Stop ATR y Stop Loss.
                </p>
              </div>

              <div className="h-60 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exitDistribution}
                      dataKey="count"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      innerRadius={45}
                      paddingAngle={3}
                    >
                      {exitDistribution.map((entry, index) => (
                        <Cell key={`cell-exit-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="p-2.5 bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl text-xs font-mono">
                              <div className="font-bold" style={{ color: data.color }}>{data.label}</div>
                              <div className="text-neutral-300">{data.count} trades ({data.percentage}%)</div>
                              <div className="text-emerald-400 font-bold">PnL: +${data.totalPnl.toFixed(2)} USDT</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {exitDistribution.map((ex) => (
                  <div key={ex.reason} className="p-2 rounded bg-neutral-900/60 border border-neutral-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ex.color }}></span>
                      <span className="text-neutral-300 text-[11px] truncate max-w-[110px]">{ex.label}</span>
                    </div>
                    <span className="font-bold text-white">{ex.count} ({ex.percentage}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparativa Longs vs Shorts & Disciplina */}
            <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-800 flex flex-col justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Disciplina Operativa & Parámetros Estadísticos</span>
                </h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Estadísticas de sesgo direccional y ratios de recompensa/riesgo realizados.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                {/* Long Performance */}
                <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 flex flex-col gap-1">
                  <span className="text-[11px] text-emerald-400 font-bold uppercase">Operaciones Long</span>
                  <div className="text-lg font-black text-white">{metrics.longTradesCount} Trades</div>
                  <div className="text-xs text-amber-300">Win Rate: {metrics.longWinRate}%</div>
                  <div className="text-xs text-emerald-400 font-bold mt-1">+${metrics.longRealizedPnl.toFixed(2)} USDT</div>
                </div>

                {/* Short Performance */}
                <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-800/40 flex flex-col gap-1">
                  <span className="text-[11px] text-rose-400 font-bold uppercase">Operaciones Short</span>
                  <div className="text-lg font-black text-white">{metrics.shortTradesCount} Trades</div>
                  <div className="text-xs text-amber-300">Win Rate: {metrics.shortWinRate}%</div>
                  <div className="text-xs text-rose-400 font-bold mt-1">${metrics.shortRealizedPnl.toFixed(2)} USDT</div>
                </div>
              </div>

              <div className="bg-neutral-900 p-3 rounded-lg border border-neutral-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">Ratio Ganancia/Pérdida (Payoff):</span>
                  <span className="font-bold text-emerald-400">{metrics.winLossRatio.toFixed(2)} : 1</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">Expectativa Matemática (E):</span>
                  <span className="font-bold text-amber-300">+{metrics.expectancyUsdt.toFixed(2)} USDT por trade</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">Máx Pérdidas Consecutivas:</span>
                  <span className="font-bold text-neutral-200">{metrics.maxConsecutiveLosses} trades</span>
                </div>
                <div className="flex justify-between text-neutral-300">
                  <span className="text-neutral-400">Racha Actual:</span>
                  <span className="font-bold text-emerald-400">{metrics.currentConsecutiveWins} victorias seguidas</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: Registro Completo de Trades Cerrados Google Sheets */}
        {activeChartTab === 'trades_log' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs font-mono text-neutral-400">
              <span>Mostrando {filteredTrades.length} trades cerrados sincronizados con Google Sheets</span>
              <span className="text-emerald-400 font-bold">
                PnL Filtrado: {metrics.netRealizedPnl >= 0 ? '+' : ''}${metrics.netRealizedPnl.toFixed(2)} USDT
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-950">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-neutral-900 text-neutral-400 border-b border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Fecha Salida</th>
                    <th className="py-2.5 px-3">Par</th>
                    <th className="py-2.5 px-3">Estrategia</th>
                    <th className="py-2.5 px-3">Lado</th>
                    <th className="py-2.5 px-3 text-right">Entrada</th>
                    <th className="py-2.5 px-3 text-right">Salida</th>
                    <th className="py-2.5 px-3 text-right">PnL Realizado</th>
                    <th className="py-2.5 px-3 text-right">ROE %</th>
                    <th className="py-2.5 px-3 text-center">Razón Cierre</th>
                    <th className="py-2.5 px-3">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850">
                  {filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-neutral-500">
                        No hay trades que coincidan con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    filteredTrades.map((t) => (
                      <tr key={t.id} className="hover:bg-neutral-900/60 transition-colors">
                        <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                          {t.exitDate.slice(5, 16)}
                        </td>
                        <td className="py-2 px-3 font-bold text-white">
                          {t.symbol}
                        </td>
                        <td className="py-2 px-3 text-neutral-300 max-w-[180px] truncate" title={t.strategyName}>
                          <span className="text-amber-300/90 font-bold block text-[11px]">{t.strategyId}</span>
                          <span className="text-[10px] text-neutral-400 truncate block">{t.strategyName}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            t.side === 'BUY'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/80'
                              : 'bg-rose-950 text-rose-400 border border-rose-800/80'
                          }`}>
                            {t.side === 'BUY' ? 'LONG' : 'SHORT'} {t.leverage}x
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-300">
                          ${t.entryPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-neutral-300">
                          ${t.exitPrice.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={t.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {t.realizedPnl >= 0 ? '+' : ''}${t.realizedPnl.toFixed(2)}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          <span className={t.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                            {t.pnlPercent >= 0 ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            t.exitReason === 'TP1' || t.exitReason === 'TP2' || t.exitReason === 'TP_FINAL'
                              ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300'
                              : t.exitReason === 'TRAILING_STOP'
                              ? 'bg-sky-950/70 border-sky-700/60 text-sky-300'
                              : t.exitReason === 'STOP_LOSS'
                              ? 'bg-rose-950/70 border-rose-700/60 text-rose-300'
                              : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                          }`}>
                            {t.exitReasonLabel}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-neutral-400 text-[11px] whitespace-nowrap">
                          {t.duration || '3h 30m'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
