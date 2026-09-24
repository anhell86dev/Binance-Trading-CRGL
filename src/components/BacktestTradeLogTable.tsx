import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Search,
  ArrowUp,
  ArrowDown,
  Target,
  Skull,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  Filter,
} from 'lucide-react';
import { BacktestTrade } from '../types/backtesting';

interface BacktestTradeLogTableProps {
  trades: BacktestTrade[];
  symbol: string;
}

export const BacktestTradeLogTable: React.FC<BacktestTradeLogTableProps> = ({
  trades,
  symbol,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'WINS' | 'LOSSES' | 'TP' | 'SL' | 'TRAILING'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const counts = useMemo(() => {
    let wins = 0;
    let losses = 0;
    let tps = 0;
    let sls = 0;
    let trails = 0;

    trades.forEach((t) => {
      if (t.netPnlUsdt > 0) wins++;
      else losses++;
      if (t.exitReason === 'TP_TARGET') tps++;
      if (t.exitReason === 'STOP_LOSS') sls++;
      if (t.exitReason === 'TRAILING_STOP') trails++;
    });

    return { total: trades.length, wins, losses, tps, sls, trails };
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // 1. Text Search
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSide = t.side.toLowerCase().includes(term);
        const matchesReason = t.exitReason.toLowerCase().includes(term);
        const matchesIndex = t.tradeIndex.toString().includes(term);
        if (!matchesSide && !matchesReason && !matchesIndex) return false;
      }

      // 2. Filter Pill
      switch (filterType) {
        case 'WINS':
          return t.netPnlUsdt > 0;
        case 'LOSSES':
          return t.netPnlUsdt <= 0;
        case 'TP':
          return t.exitReason === 'TP_TARGET';
        case 'SL':
          return t.exitReason === 'STOP_LOSS';
        case 'TRAILING':
          return t.exitReason === 'TRAILING_STOP';
        default:
          return true;
      }
    });
  }, [trades, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredTrades.length / pageSize) || 1;
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTrades.slice(start, start + pageSize);
  }, [filteredTrades, currentPage, pageSize]);

  // Export to CSV
  const handleExportCsv = () => {
    try {
      const headers = [
        'ID_Trade,Simbolo,Direccion,Fecha_Entrada,Precio_Entrada,Fecha_Salida,Precio_Salida,Razon_Salida,Contratos,Valor_Posicion_USDT,Margen_USDT,Stop_Loss,Take_Profit,PnL_Neto_USDT,Retorno_ROE_Pct,Comisiones_USDT,Velas_Duracion,Balance_Posterior',
      ];
      const rows = trades.map((t) => [
        t.tradeIndex,
        `"${symbol}"`,
        t.side,
        `"${new Date(t.entryTime).toISOString()}"`,
        t.entryPrice.toFixed(4),
        `"${new Date(t.exitTime).toISOString()}"`,
        t.exitPrice.toFixed(4),
        t.exitReason,
        t.size.toFixed(4),
        t.positionValueUsdt.toFixed(2),
        t.marginUsedUsdt.toFixed(2),
        t.slPrice.toFixed(4),
        t.tpPrice.toFixed(4),
        t.netPnlUsdt.toFixed(2),
        t.roePct.toFixed(2),
        t.feeUsdt.toFixed(2),
        t.holdingCandles,
        t.balanceAfter.toFixed(2),
      ].join(','));

      const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `backtest_${symbol}_trades_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error exporting backtest csv:', e);
    }
  };

  return (
    <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 shadow-xl space-y-3">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-sm font-bold text-white flex items-center gap-2 m-0">
              <span>Registro Detallado de Operaciones Simuladas</span>
              <span className="badge bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono px-2 py-0.5 rounded-md">
                {filteredTrades.length} de {trades.length} Trades
              </span>
            </h5>
            <span className="text-[11px] text-neutral-400">
              Auditoría trade por trade con precio de ejecución, comisiones, ROE y motivo de cierre
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-[160px] sm:min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
            <input
              type="text"
              placeholder="Filtrar por LONG, SHORT o motivo..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 focus:outline-hidden text-xs text-neutral-100 placeholder-neutral-500 font-sans"
            />
          </div>

          <button
            onClick={handleExportCsv}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Descargar historial de operaciones en CSV"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Descargar CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 flex-wrap text-xs font-mono">
        <span className="text-[11px] text-neutral-500 flex items-center gap-1 me-1">
          <Filter className="w-3 h-3 text-neutral-500" /> Filtros:
        </span>

        <button
          onClick={() => { setFilterType('ALL'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer ${
            filterType === 'ALL'
              ? 'bg-neutral-800 text-white font-bold border border-neutral-600'
              : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
          }`}
        >
          Todos ({counts.total})
        </button>

        <button
          onClick={() => { setFilterType('WINS'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'WINS'
              ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
              : 'bg-neutral-950 text-neutral-400 hover:text-emerald-300 border border-neutral-800'
          }`}
        >
          <TrendingUp className="w-3 h-3 text-emerald-400" />
          Ganadores ({counts.wins})
        </button>

        <button
          onClick={() => { setFilterType('LOSSES'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'LOSSES'
              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
              : 'bg-neutral-950 text-neutral-400 hover:text-rose-300 border border-neutral-800'
          }`}
        >
          <TrendingDown className="w-3 h-3 text-rose-400" />
          Perdedores ({counts.losses})
        </button>

        <button
          onClick={() => { setFilterType('TP'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'TP'
              ? 'bg-purple-500/20 text-purple-300 font-bold border border-purple-500/40'
              : 'bg-neutral-950 text-neutral-400 hover:text-purple-300 border border-neutral-800'
          }`}
        >
          <Target className="w-3 h-3 text-purple-400" />
          TP Target ({counts.tps})
        </button>

        <button
          onClick={() => { setFilterType('TRAILING'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'TRAILING'
              ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
              : 'bg-neutral-950 text-neutral-400 hover:text-blue-300 border border-neutral-800'
          }`}
        >
          <ShieldCheck className="w-3 h-3 text-blue-400" />
          Trailing Stop ({counts.trails})
        </button>

        <button
          onClick={() => { setFilterType('SL'); setCurrentPage(1); }}
          className={`px-2 py-0.5 rounded-md text-[11px] transition-all cursor-pointer flex items-center gap-1 ${
            filterType === 'SL'
              ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
              : 'bg-neutral-950 text-neutral-400 hover:text-rose-300 border border-neutral-800'
          }`}
        >
          <Skull className="w-3 h-3 text-rose-400" />
          Stop Loss ({counts.sls})
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-xs text-neutral-200 border-collapse">
          <thead>
            <tr className="bg-neutral-950/90 border-b border-neutral-800 text-[11px] font-mono uppercase text-neutral-400">
              <th className="p-2.5 text-center w-12">#</th>
              <th className="p-2.5 min-w-[80px]">Dirección</th>
              <th className="p-2.5 min-w-[130px]">Entrada</th>
              <th className="p-2.5 min-w-[130px]">Salida</th>
              <th className="p-2.5 min-w-[120px]">Motivo Salida</th>
              <th className="p-2.5 text-right min-w-[90px]">PnL Neto</th>
              <th className="p-2.5 text-right min-w-[80px]">ROE %</th>
              <th className="p-2.5 min-w-[90px]">Velas / Runup</th>
              <th className="p-2.5 text-right min-w-[100px]">Balance Post</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60 font-sans">
            {paginatedTrades.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-neutral-500 font-mono">
                  No hay operaciones registradas con los filtros seleccionados
                </td>
              </tr>
            ) : (
              paginatedTrades.map((t) => {
                const isWin = t.netPnlUsdt > 0;
                return (
                  <tr key={t.id} className="hover:bg-neutral-800/40 transition-colors text-xs">
                    <td className="p-2.5 text-center font-mono font-bold text-neutral-400">
                      #{t.tradeIndex}
                    </td>

                    {/* Dirección */}
                    <td className="p-2.5">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-1 w-fit ${
                          t.side === 'LONG'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {t.side === 'LONG' ? (
                          <ArrowUp className="w-3 h-3 stroke-[3]" />
                        ) : (
                          <ArrowDown className="w-3 h-3 stroke-[3]" />
                        )}
                        <span>{t.side}</span>
                      </span>
                    </td>

                    {/* Entrada */}
                    <td className="p-2.5 font-mono">
                      <div className="flex flex-col">
                        <span className="text-white font-bold">${t.entryPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-neutral-500 font-sans">
                          {new Date(t.entryTime).toLocaleDateString()} {new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Salida */}
                    <td className="p-2.5 font-mono">
                      <div className="flex flex-col">
                        <span className="text-neutral-200 font-bold">${t.exitPrice.toFixed(2)}</span>
                        <span className="text-[10px] text-neutral-500 font-sans">
                          {new Date(t.exitTime).toLocaleDateString()} {new Date(t.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </td>

                    {/* Motivo Salida */}
                    <td className="p-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                          t.exitReason === 'TP_TARGET'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : t.exitReason === 'TRAILING_STOP'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : t.exitReason === 'STOP_LOSS'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {t.exitReason === 'TP_TARGET' && <Target className="w-2.5 h-2.5" />}
                        {t.exitReason === 'TRAILING_STOP' && <ShieldCheck className="w-2.5 h-2.5" />}
                        {t.exitReason === 'STOP_LOSS' && <Skull className="w-2.5 h-2.5" />}
                        <span>{t.exitReason.replace('_', ' ')}</span>
                      </span>
                    </td>

                    {/* PnL Neto */}
                    <td className="p-2.5 text-right font-mono">
                      <span className={`font-extrabold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isWin ? '+' : ''}${t.netPnlUsdt.toFixed(2)}
                      </span>
                    </td>

                    {/* ROE % */}
                    <td className="p-2.5 text-right font-mono">
                      <span className={`font-bold text-[11px] ${isWin ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {isWin ? '+' : ''}{t.roePct.toFixed(2)}%
                      </span>
                    </td>

                    {/* Velas / Runup */}
                    <td className="p-2.5 font-mono text-[11px]">
                      <div className="flex flex-col">
                        <span className="text-neutral-400">{t.holdingCandles} velas</span>
                        <span className="text-[10px] text-emerald-400/80">Max: +{t.maxRunupPct.toFixed(1)}%</span>
                      </div>
                    </td>

                    {/* Balance Posterior */}
                    <td className="p-2.5 text-right font-mono text-white font-bold">
                      ${t.balanceAfter.toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 text-xs font-mono text-neutral-400">
          <span>Página {currentPage} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 disabled:opacity-40 hover:bg-neutral-800 text-white cursor-pointer"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 rounded bg-neutral-950 border border-neutral-800 disabled:opacity-40 hover:bg-neutral-800 text-white cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
