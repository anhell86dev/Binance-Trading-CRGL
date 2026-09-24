import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Download,
  Copy,
  Plus,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  Sparkles,
  Info,
  Calendar,
  X,
  Target,
  Sliders,
  DollarSign,
  Award,
  ChevronDown,
} from 'lucide-react';
import { closedTradesSheetService, DEFAULT_CLOSED_TRADES_TAB } from '../services/closedTradesSheetService';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { googleSheetsApiService } from '../services/googleSheetsApiService';
import { ClosedTradeSheetItem } from '../types/historicalStats';

interface ClosedOrdersHistoryTableProps {
  className?: string;
  onSelectStrategy?: (strategyId: string) => void;
  showTitle?: boolean;
}

export const ClosedOrdersHistoryTable: React.FC<ClosedOrdersHistoryTableProps> = ({
  className = '',
  onSelectStrategy,
  showTitle = true,
}) => {
  // Data State from closedTradesSheetService
  const [trades, setTrades] = useState<ClosedTradeSheetItem[]>(() => closedTradesSheetService.getTrades());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => closedTradesSheetService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => closedTradesSheetService.getLastSyncTime());
  const [syncError, setSyncError] = useState<string | null>(() => closedTradesSheetService.getLastSyncError());
  const [sheetTabName, setSheetTabName] = useState<string>(() => closedTradesSheetService.getSheetTabName());

  // Local filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('ALL');
  const [selectedStrategy, setSelectedStrategy] = useState<string>('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState<'ALL' | 'WIN' | 'LOSS' | 'BREAKEVEN'>('ALL');
  const [selectedReason, setSelectedReason] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<'ALL' | '24H' | '7D' | '30D'>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'pnl_desc' | 'pnl_asc'>('date_desc');

  // UI / Modal states
  const [isEditingTab, setIsEditingTab] = useState<boolean>(false);
  const [customTabInput, setCustomTabInput] = useState<string>(sheetTabName);
  const [selectedTradeModal, setSelectedTradeModal] = useState<ClosedTradeSheetItem | null>(null);
  const [showAddTradeModal, setShowAddTradeModal] = useState<boolean>(false);
  const [copiedNotice, setCopiedNotice] = useState<string | null>(null);

  // New Trade Form State
  const [newTradeForm, setNewTradeForm] = useState({
    symbol: 'ZECUSDT',
    strategyId: '',
    strategyName: '',
    side: 'BUY' as 'BUY' | 'SELL',
    entryPrice: '',
    exitPrice: '',
    quantity: '1.0',
    leverage: '5',
    exitReason: 'TP1' as ClosedTradeSheetItem['exitReason'],
    notes: '',
  });

  // Subscribe to service updates
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

  // Sync with Google Sheets handler
  const handleSync = async () => {
    await closedTradesSheetService.syncFromGoogleSheets(undefined, false);
  };

  // Change tab name handler
  const handleSaveTabName = () => {
    if (customTabInput.trim()) {
      closedTradesSheetService.setSheetTabName(customTabInput.trim());
      setIsEditingTab(false);
    }
  };

  // Copy data to clipboard
  const handleCopy = (format: 'csv' | 'markdown' | 'tsv') => {
    let text = '';
    if (format === 'csv') {
      text = closedTradesSheetService.exportClosedTradesCsv(filteredTrades);
    } else if (format === 'tsv') {
      // TSV is perfect for directly pasting into Google Sheets
      const header = ['ID', 'Fecha Entrada', 'Fecha Salida', 'ID Estrategia', 'Nombre Estrategia', 'Par', 'Lado', 'Precio Entrada', 'Precio Salida', 'Cantidad', 'Nocional', 'PnL Realizado', 'PnL %', 'Comision', 'Apalancamiento', 'Razon Cierre', 'Duracion', 'Notas'].join('\t');
      const rows = filteredTrades.map(t => [
        t.id, t.entryDate, t.exitDate, t.strategyId, t.strategyName, t.symbol, t.side, t.entryPrice, t.exitPrice, t.quantity, t.notional, t.realizedPnl, t.pnlPercent.toFixed(2), t.commission, `${t.leverage}x`, t.exitReason, t.duration, t.notes
      ].join('\t')).join('\n');
      text = `${header}\n${rows}`;
    } else {
      text = closedTradesSheetService.exportClosedTradesMarkdown(filteredTrades);
    }

    navigator.clipboard.writeText(text);
    setCopiedNotice(format === 'tsv' ? '¡Copiado para Pegar en Google Sheets (TSV)!' : `¡Copiado en formato ${format.toUpperCase()}!`);
    setTimeout(() => setCopiedNotice(null), 3000);
  };

  // Unique lists for filters
  const uniqueSymbols = useMemo(() => {
    const set = new Set<string>();
    trades.forEach(t => t.symbol && set.add(t.symbol));
    return Array.from(set).sort();
  }, [trades]);

  const uniqueStrategies = useMemo(() => {
    const map = new Map<string, string>();
    trades.forEach(t => {
      if (t.strategyId) {
        map.set(t.strategyId, t.strategyName || t.strategyId);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [trades]);

  // Filtered and sorted trade list
  const filteredTrades = useMemo(() => {
    let result = trades.filter(t => {
      // Text Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchId = t.id.toLowerCase().includes(q);
        const matchStrat = t.strategyId.toLowerCase().includes(q) || t.strategyName.toLowerCase().includes(q);
        const matchSym = t.symbol.toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchId && !matchStrat && !matchSym && !matchNotes) return false;
      }

      // Symbol Filter
      if (selectedSymbol !== 'ALL' && t.symbol !== selectedSymbol) return false;

      // Strategy Filter
      if (selectedStrategy !== 'ALL' && t.strategyId !== selectedStrategy) return false;

      // Outcome Filter
      if (selectedOutcome === 'WIN' && !t.isWin) return false;
      if (selectedOutcome === 'LOSS' && (t.isWin || t.isBreakeven)) return false;
      if (selectedOutcome === 'BREAKEVEN' && !t.isBreakeven) return false;

      // Exit Reason Filter
      if (selectedReason !== 'ALL' && t.exitReason !== selectedReason) return false;

      // Date Range Filter
      if (dateRange !== 'ALL') {
        try {
          const tradeTime = new Date(t.exitDate.replace(' ', 'T')).getTime();
          const now = Date.now();
          const diffHours = (now - tradeTime) / (1000 * 3600);
          if (dateRange === '24H' && diffHours > 24) return false;
          if (dateRange === '7D' && diffHours > 24 * 7) return false;
          if (dateRange === '30D' && diffHours > 24 * 30) return false;
        } catch {}
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.exitDate.replace(' ', 'T')).getTime() - new Date(a.exitDate.replace(' ', 'T')).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.exitDate.replace(' ', 'T')).getTime() - new Date(b.exitDate.replace(' ', 'T')).getTime();
      }
      if (sortBy === 'pnl_desc') {
        return b.realizedPnl - a.realizedPnl;
      }
      if (sortBy === 'pnl_asc') {
        return a.realizedPnl - b.realizedPnl;
      }
      return 0;
    });

    return result;
  }, [trades, searchTerm, selectedSymbol, selectedStrategy, selectedOutcome, selectedReason, dateRange, sortBy]);

  // KPI Calculations on the filtered set
  const metrics = useMemo(() => {
    const total = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.isWin);
    const losses = filteredTrades.filter(t => !t.isWin && !t.isBreakeven);
    const bes = filteredTrades.filter(t => t.isBreakeven);

    const winCount = wins.length;
    const lossCount = losses.length;
    const beCount = bes.length;

    const winRate = total > 0 ? (winCount / total) * 100 : 0;
    const totalPnl = filteredTrades.reduce((acc, t) => acc + t.realizedPnl, 0);
    const totalCommission = filteredTrades.reduce((acc, t) => acc + t.commission, 0);
    const netPnl = totalPnl - totalCommission;

    const grossProfit = wins.reduce((acc, t) => acc + t.realizedPnl, 0);
    const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.realizedPnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.99 : 0;

    const avgWin = winCount > 0 ? grossProfit / winCount : 0;
    const avgLoss = lossCount > 0 ? grossLoss / lossCount : 0;
    const riskReward = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;

    // Best Strategy
    const stratMap: Record<string, { pnl: number; wins: number; total: number; name: string }> = {};
    filteredTrades.forEach(t => {
      if (!stratMap[t.strategyId]) {
        stratMap[t.strategyId] = { pnl: 0, wins: 0, total: 0, name: t.strategyName || t.strategyId };
      }
      stratMap[t.strategyId].pnl += t.realizedPnl;
      if (t.isWin) stratMap[t.strategyId].wins += 1;
      stratMap[t.strategyId].total += 1;
    });

    const bestStratEntry = Object.entries(stratMap).sort((a, b) => b[1].pnl - a[1].pnl)[0];
    const bestStrategy = bestStratEntry ? { id: bestStratEntry[0], ...bestStratEntry[1] } : null;

    return {
      total,
      winCount,
      lossCount,
      beCount,
      winRate,
      totalPnl,
      totalCommission,
      netPnl,
      profitFactor,
      avgWin,
      avgLoss,
      riskReward,
      bestStrategy,
    };
  }, [filteredTrades]);

  // Handle submitting new trade
  const handleAddNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = parseFloat(newTradeForm.entryPrice) || 0;
    const exit = parseFloat(newTradeForm.exitPrice) || 0;
    const qty = parseFloat(newTradeForm.quantity) || 1;
    const lev = parseInt(newTradeForm.leverage) || 5;

    if (entry <= 0 || exit <= 0 || qty <= 0) {
      alert('Por favor introduce precios y cantidades válidos.');
      return;
    }

    const notional = entry * qty;
    const isLong = newTradeForm.side === 'BUY';
    const priceDiff = isLong ? (exit - entry) : (entry - exit);
    const realizedPnl = priceDiff * qty;
    const pnlPercent = ((priceDiff / entry) * 100) * lev;
    const margin = notional / lev;

    const newId = `TRD-${newTradeForm.symbol.replace('USDT', '')}-${Date.now().toString().slice(-4)}`;

    closedTradesSheetService.recordClosedTrade({
      id: newId,
      strategyId: newTradeForm.strategyId || `${newTradeForm.symbol}-MANUAL`,
      strategyName: newTradeForm.strategyName || `Estrategia ${newTradeForm.symbol}`,
      symbol: newTradeForm.symbol,
      side: newTradeForm.side,
      entryPrice: entry,
      exitPrice: exit,
      quantity: qty,
      notional,
      realizedPnl,
      pnlPercent,
      commission: notional * 0.0004 * 2,
      exitReason: newTradeForm.exitReason,
      exitReasonLabel: newTradeForm.exitReason === 'TP1' ? 'Take Profit 1' : newTradeForm.exitReason === 'TP2' ? 'Take Profit 2' : newTradeForm.exitReason === 'TP_FINAL' ? 'Take Profit Final' : newTradeForm.exitReason === 'TRAILING_STOP' ? 'Trailing Stop ATR' : 'Stop Loss',
      duration: '2h 15m',
      leverage: lev,
      notes: newTradeForm.notes,
    });

    setShowAddTradeModal(false);
    setNewTradeForm({
      symbol: 'ZECUSDT',
      strategyId: '',
      strategyName: '',
      side: 'BUY',
      entryPrice: '',
      exitPrice: '',
      quantity: '1.0',
      leverage: '5',
      exitReason: 'TP1',
      notes: '',
    });
  };

  return (
    <div id="closed-orders-history-table" className={`flex flex-col gap-4 text-neutral-100 font-sans w-full ${className}`}>
      
      {/* 1. Header & Google Sheets Sync Bar */}
      <div className="bg-[#14181d] border border-[#262c36] rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        
        {/* Title & Info */}
        <div className="flex flex-col gap-1">
          {showTitle && (
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>Historial de Órdenes Cerradas & Estrategias</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Google Sheets Sync
                  </span>
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  Auditoría de resultados históricos, rentabilidad por estrategia y trazabilidad en Google Sheets.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Sync Controls & External Google Sheet Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          
          {/* Sheet Tab Badge / Config */}
          <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1.5 rounded-xl border border-neutral-800 text-xs font-mono">
            <span className="text-neutral-400">Pestaña:</span>
            {isEditingTab ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={customTabInput}
                  onChange={(e) => setCustomTabInput(e.target.value)}
                  className="px-1.5 py-0.5 rounded bg-neutral-900 border border-amber-500 text-white text-xs w-32 focus:outline-hidden"
                  placeholder="Nombre pestaña..."
                />
                <button
                  type="button"
                  onClick={handleSaveTabName}
                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer"
                >
                  OK
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTab(false)}
                  className="text-neutral-400 hover:text-white text-xs px-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCustomTabInput(sheetTabName);
                  setIsEditingTab(true);
                }}
                className="font-bold text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1 cursor-pointer"
                title="Haga clic para cambiar la pestaña de Google Sheets"
              >
                <span>{sheetTabName}</span>
                <span className="text-[10px] text-neutral-500 hover:text-neutral-300">(cambiar)</span>
              </button>
            )}
          </div>

          {/* Sync Button */}
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer ${
              isSyncing
                ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'
            }`}
            title="Sincronizar órdenes cerradas desde la hoja de cálculo de Google"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-white' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Sheets'}</span>
          </button>

          {/* Open Sheet Link */}
          <a
            href={strategyService.getEffectiveSheetUrl() || OFFICIAL_GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Abrir hoja de cálculo oficial en Google Docs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Abrir Hoja</span>
          </a>

          {/* Copy for Google Sheets (TSV) */}
          <button
            type="button"
            onClick={() => handleCopy('tsv')}
            className="px-2.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copiar datos en formato TSV listo para pegar directo en Google Sheets"
          >
            <Copy className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Copiar TSV Sheets</span>
          </button>

          {/* Log New Trade Manually */}
          <button
            type="button"
            onClick={() => setShowAddTradeModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>Registrar Trade</span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner / Notification */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Última sincronización: <strong className="text-neutral-200">{lastSyncTime || 'Inicializando...'}</strong></span>
          {syncError && (
            <span className="text-rose-400 font-bold ml-2">⚠️ {syncError}</span>
          )}
        </div>

        {copiedNotice && (
          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold animate-fade-in flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {copiedNotice}
          </span>
        )}
      </div>

      {/* 2. Strategy Performance KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* KPI 1: Win Rate */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Win Rate</span>
            <Award className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black font-mono text-amber-300 mt-1">
            {metrics.winRate.toFixed(1)}%
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5 flex items-center gap-1">
            <span className="text-emerald-400 font-bold">{metrics.winCount}W</span>
            <span>/</span>
            <span className="text-rose-400 font-bold">{metrics.lossCount}L</span>
            <span>/</span>
            <span className="text-neutral-400">{metrics.beCount}BE</span>
          </div>
        </div>

        {/* KPI 2: PnL Realizado Neto */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>PnL Realizado Neto</span>
            {metrics.netPnl >= 0 ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            )}
          </div>
          <div className={`text-xl font-black font-mono mt-1 ${metrics.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {metrics.netPnl >= 0 ? '+' : ''}${metrics.netPnl.toFixed(2)}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            USDT (Comisiones: -${metrics.totalCommission.toFixed(2)})
          </div>
        </div>

        {/* KPI 3: Profit Factor */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Profit Factor</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-black font-mono text-sky-400 mt-1">
            {metrics.profitFactor > 0 ? metrics.profitFactor.toFixed(2) : '0.00'}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            Ganancia Bruta / Pérdida Bruta
          </div>
        </div>

        {/* KPI 4: Ratio R:B Realizado */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Ganancia Prom. vs Pérdida</span>
            <Target className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-sm font-black font-mono text-white mt-1 flex items-baseline gap-1">
            <span className="text-emerald-400">+${metrics.avgWin.toFixed(1)}</span>
            <span className="text-neutral-500">/</span>
            <span className="text-rose-400">-${metrics.avgLoss.toFixed(1)}</span>
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            R:B Real 1:{metrics.riskReward.toFixed(2)}
          </div>
        </div>

        {/* KPI 5: Total Órdenes */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Órdenes Cerradas</span>
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
          </div>
          <div className="text-xl font-black font-mono text-white mt-1">
            {metrics.total}
          </div>
          <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
            De {trades.length} en Google Sheets
          </div>
        </div>

        {/* KPI 6: Mejor Estrategia */}
        <div className="bg-[#14181d] border border-[#262c36] rounded-xl p-3.5 flex flex-col shadow-md">
          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
            <span>Estrategia Top</span>
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xs font-black font-mono text-amber-300 mt-1 truncate" title={metrics.bestStrategy?.name}>
            {metrics.bestStrategy?.name || 'N/A'}
          </div>
          <div className="text-[10px] font-mono text-emerald-400 mt-0.5">
            {metrics.bestStrategy ? `+$${metrics.bestStrategy.pnl.toFixed(2)} (${metrics.bestStrategy.wins}/${metrics.bestStrategy.total}W)` : 'Sin datos'}
          </div>
        </div>

      </div>

      {/* 3. Filtros & Controles Interactivos */}
      <div className="bg-[#14181d] border border-[#262c36] rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por ID, estrategia, par, notas..."
              className="w-full pl-9 pr-4 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500 transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Símbolo / Par Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-neutral-400 hidden sm:inline">Par:</span>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Todos los Pares</option>
              {uniqueSymbols.map(sym => (
                <option key={sym} value={sym}>{sym}</option>
              ))}
            </select>
          </div>

          {/* Estrategia Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-neutral-400 hidden sm:inline">Estrategia:</span>
            <select
              value={selectedStrategy}
              onChange={(e) => setSelectedStrategy(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 max-w-[180px] sm:max-w-[240px] truncate cursor-pointer"
            >
              <option value="ALL">Todas las Estrategias</option>
              {uniqueStrategies.map(strat => (
                <option key={strat.id} value={strat.id}>{strat.name}</option>
              ))}
            </select>
          </div>

          {/* Resultado Filter */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSelectedOutcome('ALL')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedOutcome === 'ALL'
                  ? 'bg-neutral-800 text-white border border-neutral-600'
                  : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setSelectedOutcome('WIN')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedOutcome === 'WIN'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-neutral-950 text-emerald-400/70 hover:text-emerald-300'
              }`}
            >
              🟢 Ganadores
            </button>
            <button
              type="button"
              onClick={() => setSelectedOutcome('LOSS')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                selectedOutcome === 'LOSS'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                  : 'bg-neutral-950 text-rose-400/70 hover:text-rose-300'
              }`}
            >
              🔴 Pérdidas
            </button>
          </div>

          {/* Motivo de Cierre Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-neutral-400 hidden lg:inline">Cierre:</span>
            <select
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Todo Cierre</option>
              <option value="TP1">TP 1</option>
              <option value="TP2">TP 2</option>
              <option value="TP_FINAL">TP Final (100%)</option>
              <option value="TRAILING_STOP">Trailing Stop ATR</option>
              <option value="STOP_LOSS">Stop Loss</option>
              <option value="BREAKEVEN">Breakeven</option>
              <option value="MANUAL">Cierre Manual</option>
            </select>
          </div>

          {/* Ordenar */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-neutral-400 hidden xl:inline">Orden:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="date_desc">Más recientes primero</option>
              <option value="date_asc">Más antiguos primero</option>
              <option value="pnl_desc">Mayor Ganancia ($)</option>
              <option value="pnl_asc">Mayor Pérdida ($)</option>
            </select>
          </div>

        </div>
      </div>

      {/* 4. Main Closed Trades Table */}
      <div className="bg-[#14181d] border border-[#262c36] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-3.5">ID / Fecha Cierre</th>
                <th className="py-3 px-3.5">Estrategia Asociada</th>
                <th className="py-3 px-3.5">Par & Lado</th>
                <th className="py-3 px-3.5">Entrada vs Salida</th>
                <th className="py-3 px-3.5">Cantidad & Nocional</th>
                <th className="py-3 px-3.5">Motivo de Cierre</th>
                <th className="py-3 px-3.5">PnL Realizado</th>
                <th className="py-3 px-3.5">ROE %</th>
                <th className="py-3 px-3.5">Comisión</th>
                <th className="py-3 px-3.5 text-right">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/60">
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 px-4 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-neutral-600 mb-1" />
                      <p className="font-bold text-neutral-200">No se encontraron órdenes cerradas con los filtros seleccionados</p>
                      <p className="text-[11px] text-neutral-500">
                        Prueba ajustando el término de búsqueda o sincronizando la hoja de cálculo de Google Sheets.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm('');
                          setSelectedSymbol('ALL');
                          setSelectedStrategy('ALL');
                          setSelectedOutcome('ALL');
                          setSelectedReason('ALL');
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer"
                      >
                        Restablecer Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTrades.map((t) => {
                  const isPositive = t.realizedPnl > 0;
                  const isZero = t.realizedPnl === 0;
                  const roe = t.pnlPercent;

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTradeModal(t)}
                      className="hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                    >
                      {/* ID & Date */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-neutral-200 group-hover:text-amber-400 transition-colors">
                          {t.id}
                        </div>
                        <div className="text-[10px] text-neutral-400 flex items-center gap-1 mt-0.5">
                          <span>{t.exitDate}</span>
                        </div>
                        <div className="text-[9px] text-neutral-500">
                          ⏱ {t.duration}
                        </div>
                      </td>

                      {/* Strategy */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-white max-w-[200px] truncate" title={t.strategyName}>
                          {t.strategyName}
                        </div>
                        <div className="text-[10px] font-mono text-amber-400/90 truncate max-w-[200px]">
                          {t.strategyId}
                        </div>
                      </td>

                      {/* Par & Lado */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-white">{t.symbol}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black ${
                              t.side === 'BUY'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            }`}
                          >
                            {t.side === 'BUY' ? 'LONG' : 'SHORT'}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">
                          Aislado {t.leverage}x
                        </div>
                      </td>

                      {/* Entry vs Exit */}
                      <td className="py-3 px-3.5">
                        <div className="text-neutral-300">
                          In: <span className="font-semibold text-white">${t.entryPrice.toFixed(4)}</span>
                        </div>
                        <div className="text-neutral-300">
                          Out: <span className="font-semibold text-white">${t.exitPrice.toFixed(4)}</span>
                        </div>
                      </td>

                      {/* Size & Notional */}
                      <td className="py-3 px-3.5">
                        <div className="text-neutral-200 font-semibold">
                          {t.quantity} {t.symbol.replace('USDT', '')}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          ${t.notional.toFixed(2)} USDT
                        </div>
                      </td>

                      {/* Exit Reason */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block ${
                            t.exitReason === 'TP_FINAL' || t.exitReason === 'TP2'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                              : t.exitReason === 'TP1'
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/50'
                              : t.exitReason === 'TRAILING_STOP'
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                              : t.exitReason === 'STOP_LOSS'
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                              : 'bg-neutral-800 text-neutral-300 border-neutral-700'
                          }`}
                        >
                          {t.exitReasonLabel || t.exitReason}
                        </span>
                      </td>

                      {/* Realized PnL */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`text-sm font-black ${
                            isPositive
                              ? 'text-emerald-400'
                              : isZero
                              ? 'text-neutral-300'
                              : 'text-rose-400'
                          }`}
                        >
                          {isPositive ? '+' : ''}${t.realizedPnl.toFixed(2)}
                        </span>
                      </td>

                      {/* ROE % */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`font-bold ${
                            roe > 0 ? 'text-emerald-400' : roe < 0 ? 'text-rose-400' : 'text-neutral-400'
                          }`}
                        >
                          {roe > 0 ? '+' : ''}{roe.toFixed(2)}%
                        </span>
                      </td>

                      {/* Commission */}
                      <td className="py-3 px-3.5 text-neutral-400">
                        ${t.commission.toFixed(3)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTradeModal(t);
                          }}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="bg-neutral-950 p-3.5 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <span>Mostrando <strong>{filteredTrades.length}</strong> de <strong>{trades.length}</strong> registros en Google Sheets</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy('csv')}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={() => handleCopy('markdown')}
              className="px-2.5 py-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs transition-colors cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>Markdown Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: TRADE DETAIL INSPECTOR */}
      {selectedTradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedTradeModal(null)}
        >
          <div
            className="w-full max-w-xl bg-[#14181d] border border-[#2b3139] rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-200 flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262c36] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">{selectedTradeModal.strategyName}</h3>
                  <p className="text-xs font-mono text-neutral-400">{selectedTradeModal.id} • {selectedTradeModal.strategyId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTradeModal(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PnL & Stats Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 font-mono">
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">PnL Realizado</span>
                <div className={`text-base font-black ${selectedTradeModal.realizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedTradeModal.realizedPnl >= 0 ? '+' : ''}${selectedTradeModal.realizedPnl.toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">Retorno ROE</span>
                <div className={`text-base font-black ${selectedTradeModal.pnlPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {selectedTradeModal.pnlPercent >= 0 ? '+' : ''}{selectedTradeModal.pnlPercent.toFixed(2)}%
                </div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">Motivo Cierre</span>
                <div className="text-xs font-bold text-amber-300 mt-0.5">
                  {selectedTradeModal.exitReasonLabel || selectedTradeModal.exitReason}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 uppercase">Duración</span>
                <div className="text-xs font-bold text-white mt-0.5">
                  {selectedTradeModal.duration}
                </div>
              </div>
            </div>

            {/* Technical Detail Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Par / Símbolo:</span>
                <div className="font-bold text-white text-sm">{selectedTradeModal.symbol} ({selectedTradeModal.side})</div>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Apalancamiento:</span>
                <div className="font-bold text-amber-300 text-sm">Aislado {selectedTradeModal.leverage}x</div>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Precio de Entrada:</span>
                <div className="font-bold text-white text-sm">${selectedTradeModal.entryPrice.toFixed(4)}</div>
                <div className="text-[9px] text-neutral-500">{selectedTradeModal.entryDate}</div>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Precio de Salida:</span>
                <div className="font-bold text-white text-sm">${selectedTradeModal.exitPrice.toFixed(4)}</div>
                <div className="text-[9px] text-neutral-500">{selectedTradeModal.exitDate}</div>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Cantidad Ejecutada:</span>
                <div className="font-bold text-white text-sm">{selectedTradeModal.quantity} ({selectedTradeModal.notional.toFixed(2)} USDT)</div>
              </div>
              <div className="bg-neutral-900/60 p-2.5 rounded-lg border border-neutral-800">
                <span className="text-neutral-400 text-[10px]">Comisiones Binance:</span>
                <div className="font-bold text-white text-sm">${selectedTradeModal.commission.toFixed(3)} USDT</div>
              </div>
            </div>

            {/* Notes / Confluence Observations */}
            {selectedTradeModal.notes && (
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col gap-1">
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" />
                  <span>Bitácora & Observaciones Técnicas</span>
                </span>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  {selectedTradeModal.notes}
                </p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              {onSelectStrategy && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectStrategy(selectedTradeModal.strategyId);
                    setSelectedTradeModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>Ver Estrategia en Catálogo</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTradeModal(null)}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold ml-auto cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR RESULTADO DE ESTRATEGIA MANUALMENTE */}
      {showAddTradeModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowAddTradeModal(false)}
        >
          <div
            className="w-full max-w-lg bg-[#14181d] border border-[#2b3139] rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-200 flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#262c36] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Registrar Resultado de Trade</h3>
                  <p className="text-xs text-neutral-400">Guarda una orden cerrada y sincronízala con Google Sheets</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddTradeModal(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewTrade} className="flex flex-col gap-3.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 mb-1 block">Par / Símbolo</label>
                  <select
                    value={newTradeForm.symbol}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, symbol: e.target.value })}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="ZECUSDT">ZECUSDT</option>
                    <option value="SOLUSDT">SOLUSDT</option>
                    <option value="XRPUSDT">XRPUSDT</option>
                    <option value="TAOUSDT">TAOUSDT</option>
                    <option value="AAVEUSDT">AAVEUSDT</option>
                    <option value="BTCUSDT">BTCUSDT</option>
                    <option value="ETHUSDT">ETHUSDT</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 mb-1 block">Lado de la Posición</label>
                  <select
                    value={newTradeForm.side}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, side: e.target.value as any })}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="BUY">BUY / LONG</option>
                    <option value="SELL">SELL / SHORT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block">Nombre / ID de la Estrategia</label>
                <input
                  type="text"
                  value={newTradeForm.strategyName}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, strategyName: e.target.value, strategyId: e.target.value.toUpperCase().replace(/\s+/g, '-') })}
                  placeholder="Ej. Acumulación en Retroceso SMA-15"
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500 font-sans"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 mb-1 block">Precio de Entrada ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={newTradeForm.entryPrice}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, entryPrice: e.target.value })}
                    placeholder="785.00"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 mb-1 block">Precio de Salida ($)</label>
                  <input
                    type="number"
                    step="any"
                    value={newTradeForm.exitPrice}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, exitPrice: e.target.value })}
                    placeholder="838.00"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 mb-1 block">Cantidad</label>
                  <input
                    type="number"
                    step="any"
                    value={newTradeForm.quantity}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, quantity: e.target.value })}
                    placeholder="1.2"
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-neutral-400 mb-1 block">Apalancamiento</label>
                  <select
                    value={newTradeForm.leverage}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, leverage: e.target.value })}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="3">3x</option>
                    <option value="5">5x (Máx)</option>
                  </select>
                </div>

                <div>
                  <label className="text-neutral-400 mb-1 block">Motivo Cierre</label>
                  <select
                    value={newTradeForm.exitReason}
                    onChange={(e) => setNewTradeForm({ ...newTradeForm, exitReason: e.target.value as any })}
                    className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="TP1">TP1</option>
                    <option value="TP2">TP2</option>
                    <option value="TP_FINAL">TP Final (100%)</option>
                    <option value="TRAILING_STOP">Trailing Stop</option>
                    <option value="STOP_LOSS">Stop Loss</option>
                    <option value="BREAKEVEN">Breakeven</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 mb-1 block">Notas / Confluencias Técnicas</label>
                <textarea
                  value={newTradeForm.notes}
                  onChange={(e) => setNewTradeForm({ ...newTradeForm, notes: e.target.value })}
                  placeholder="Ej. Ruptura con volumen en 15m, salida parcial 50% en TP1..."
                  rows={2}
                  className="w-full p-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white focus:outline-hidden focus:border-amber-500 font-sans"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setShowAddTradeModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Guardar en Historial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
