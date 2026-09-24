import React, { useState, useMemo } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Zap,
  Eye,
  Copy,
  Check,
  Download,
  Search,
  ShieldAlert,
  AlertTriangle,
  Skull,
  Target,
  Flame,
  Layers,
  FileSpreadsheet,
  TrendingUp,
  Filter,
  BarChart2,
} from 'lucide-react';
import { CandidateTradeOperation } from './TopOperacionesView';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { StrategyManagedBadge } from './StrategyManagedBadge';
import { StrategySourceBadge } from './StrategySourceBadge';
import { strategyManagedTradesService } from '../services/strategyManagedTradesService';

interface StrategySummaryTableProps {
  operations: CandidateTradeOperation[];
  onAutofillOrder: (operation: CandidateTradeOperation) => void;
  onOpenDetails: (strategy: GoogleSheetStrategyRow) => void;
  onNavigateToGestionTrades?: (symbol?: string) => void;
  onNavigateToFutures?: (symbol?: string) => void;
  onNavigateToBacktest?: (symbol?: string) => void;
}

type SortField =
  | 'RANK'
  | 'SYMBOL'
  | 'STRATEGY_ID'
  | 'DIRECTION'
  | 'LIVE_PRICE'
  | 'ENTRY1'
  | 'ENTRY_DIST_PCT'
  | 'SL'
  | 'TP_FINAL'
  | 'RB_RATIO'
  | 'CONFLUENCE_SCORE'
  | 'STATUS';

type FilterType =
  | 'ALL'
  | 'LONG'
  | 'SHORT'
  | 'IN_ZONE'
  | 'CONFLUENT'
  | 'MANAGED'
  | 'OPERABLE_ONLY';

export const StrategySummaryTable: React.FC<StrategySummaryTableProps> = ({
  operations,
  onAutofillOrder,
  onOpenDetails,
  onNavigateToGestionTrades,
  onNavigateToFutures,
  onNavigateToBacktest,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const [sortField, setSortField] = useState<SortField>('RANK');
  const [sortAsc, setSortAsc] = useState(true);
  const [copiedSuccess, setCopiedSuccess] = useState(false);

  // Global counts for filter pills
  const counts = useMemo(() => {
    let longCount = 0;
    let shortCount = 0;
    let inZoneCount = 0;
    let confluentCount = 0;
    let managedCount = 0;
    let operableCount = 0;

    operations.forEach((op) => {
      if (op.isLong) longCount++;
      else shortCount++;
      if (op.isInZone) inZoneCount++;
      if (op.isFullConfluenceMatch || op.confluenceResult.confluenceScorePercent >= 60) confluentCount++;
      if (op.isManaged) managedCount++;
      if (!op.isNoOperar && !op.hasHitSL) operableCount++;
    });

    return {
      total: operations.length,
      long: longCount,
      short: shortCount,
      inZone: inZoneCount,
      confluent: confluentCount,
      managed: managedCount,
      operable: operableCount,
    };
  }, [operations]);

  // Handle column header sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'RANK' || field === 'SYMBOL' || field === 'ENTRY_DIST_PCT');
    }
  };

  // Filter and sort items
  const processedItems = useMemo(() => {
    let items = operations.filter((op) => {
      // 1. Search text filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesSym = op.strategy.par.toLowerCase().includes(term);
        const matchesName = (op.strategy.nombreEstrategia || '').toLowerCase().includes(term);
        const matchesId = (op.strategy.noEstrategia || '').toLowerCase().includes(term);
        if (!matchesSym && !matchesName && !matchesId) return false;
      }

      // 2. Filter pill
      switch (activeFilter) {
        case 'LONG':
          return op.isLong;
        case 'SHORT':
          return !op.isLong;
        case 'IN_ZONE':
          return op.isInZone;
        case 'CONFLUENT':
          return op.isFullConfluenceMatch || op.confluenceResult.confluenceScorePercent >= 60;
        case 'MANAGED':
          return op.isManaged;
        case 'OPERABLE_ONLY':
          return !op.isNoOperar && !op.hasHitSL;
        default:
          return true;
      }
    });

    // 3. Sorting
    items.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'SYMBOL':
          comparison = a.strategy.par.localeCompare(b.strategy.par);
          break;
        case 'STRATEGY_ID':
          comparison = (a.strategy.noEstrategia || '').localeCompare(b.strategy.noEstrategia || '');
          break;
        case 'DIRECTION':
          comparison = (a.isLong ? 'LONG' : 'SHORT').localeCompare(b.isLong ? 'LONG' : 'SHORT');
          break;
        case 'LIVE_PRICE':
          comparison = a.livePrice - b.livePrice;
          break;
        case 'ENTRY1':
          comparison = a.entry1Price - b.entry1Price;
          break;
        case 'ENTRY_DIST_PCT':
          comparison = a.absDiffPct - b.absDiffPct;
          break;
        case 'SL':
          comparison = a.slPrice - b.slPrice;
          break;
        case 'TP_FINAL':
          comparison = (a.tpFinalPrice || a.tp1Price) - (b.tpFinalPrice || b.tp1Price);
          break;
        case 'RB_RATIO':
          comparison = a.ratio - b.ratio;
          break;
        case 'CONFLUENCE_SCORE':
          comparison = a.confluenceResult.confluenceScorePercent - b.confluenceResult.confluenceScorePercent;
          break;
        case 'STATUS': {
          const getStatusWeight = (op: CandidateTradeOperation) => {
            if (op.isNoOperar) return 1;
            if (op.hasHitSL) return 2;
            if (op.isManaged) return 3;
            if (op.isInZone) return 4;
            if (op.isFullConfluenceMatch) return 5;
            return 6;
          };
          comparison = getStatusWeight(a) - getStatusWeight(b);
          break;
        }
        case 'RANK':
        default:
          comparison = a.ratio !== b.ratio ? b.ratio - a.ratio : a.absDiffPct - b.absDiffPct;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return items;
  }, [operations, searchTerm, activeFilter, sortField, sortAsc]);

  // Export Summary to Markdown
  const handleCopyMarkdownSummary = async () => {
    try {
      const headers = [
        '| # | Par | Estrategia | Dirección | Live | Entrada 1 | Stop Loss | TP Final | R:B | Confluencia | Estado |',
        '|---|---|---|---|---|---|---|---|---|---|---|',
      ];
      const rows = processedItems.map((op, idx) => {
        const estado = op.isNoOperar
          ? `🚫 NO OPERAR (${op.noOperarReason})`
          : op.hasHitSL
          ? '💀 SL Tocado'
          : op.isManaged
          ? '🛡️ En Gestión'
          : op.isInZone
          ? '🔥 En Zona E1'
          : op.isFullConfluenceMatch
          ? '⚡ Confluencia 100%'
          : '✅ Operable';

        return `| ${idx + 1} | **${op.strategy.par}** | ${op.strategy.nombreEstrategia || op.strategy.noEstrategia} | ${op.isLong ? 'LONG' : 'SHORT'} | $${op.livePrice.toFixed(op.decimalPlaces)} | $${op.entry1Price.toFixed(op.decimalPlaces)} (${op.diffPct >= 0 ? '+' : ''}${op.diffPct.toFixed(2)}%) | $${op.slPrice.toFixed(op.decimalPlaces)} (-${op.rewardToRisk.maxLossPct.toFixed(1)}%) | $${(op.tpFinalPrice || op.tp1Price).toFixed(op.decimalPlaces)} (+${op.rewardToRisk.maxProfitPct.toFixed(1)}%) | 1:${op.ratio.toFixed(1)} | ${op.confluenceResult.confluenceScorePercent}% | ${estado} |`;
      });

      const fullMarkdown = `### 📋 Tabla Resumen de Estrategias - Plan de Trabajo Binance Futures\n\n${headers.join('\n')}\n${rows.join('\n')}\n\n*Generado: ${new Date().toLocaleString()}*`;

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(fullMarkdown);
        setCopiedSuccess(true);
        setTimeout(() => setCopiedSuccess(false), 2500);
      }
    } catch (e) {
      console.error('Error copying markdown summary:', e);
    }
  };

  // Export Summary to CSV
  const handleDownloadSummaryCsv = () => {
    try {
      const headers = [
        'Ranking,Par,ID_Estrategia,Nombre_Estrategia,Direccion,Precio_Live,Entrada_1,Distancia_E1_Pct,Stop_Loss,Max_Perdida_Pct,Take_Profit_1,Take_Profit_Final,Max_Ganancia_Pct,Ratio_RB,Score_Confluencia_Pct,Estado,Es_No_Operar,Motivo_No_Operar',
      ];
      const rows = processedItems.map((op, idx) => {
        const estado = op.isNoOperar
          ? 'NO_OPERAR'
          : op.hasHitSL
          ? 'SL_TOCADO'
          : op.isManaged
          ? 'EN_GESTION'
          : op.isInZone
          ? 'EN_ZONA_E1'
          : op.isFullConfluenceMatch
          ? 'CONFLUENCIA_100'
          : 'OPERABLE';

        return [
          idx + 1,
          `"${op.strategy.par}"`,
          `"${op.strategy.noEstrategia}"`,
          `"${op.strategy.nombreEstrategia.replace(/"/g, '""')}"`,
          op.isLong ? 'LONG' : 'SHORT',
          op.livePrice,
          op.entry1Price,
          op.diffPct.toFixed(2),
          op.slPrice,
          op.rewardToRisk.maxLossPct.toFixed(2),
          op.tp1Price,
          op.tpFinalPrice || op.tp1Price,
          op.rewardToRisk.maxProfitPct.toFixed(2),
          op.ratio.toFixed(2),
          op.confluenceResult.confluenceScorePercent,
          estado,
          op.isNoOperar ? 'SI' : 'NO',
          `"${(op.noOperarReason || '').replace(/"/g, '""')}"`,
        ].join(',');
      });

      const csvContent = '\uFEFF' + headers.concat(rows).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `resumen_estrategias_plan_trabajo_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading summary CSV:', e);
    }
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-neutral-600 opacity-60 group-hover:opacity-100" />;
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-amber-400 font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-amber-400 font-bold" />
    );
  };

  return (
    <div id="strategy-summary-table-container" className="space-y-3">
      {/* 1. BARRA DE CONTROL, FILTROS RÁPIDOS Y EXPORTACIÓN */}
      <div className="bg-neutral-900/95 border border-neutral-800 rounded-xl p-3 shadow-md space-y-3">
        {/* Fila Superior: Título, Buscador y Botones de Exportar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white flex items-center gap-2 m-0">
                <span>Tabla Resumen de Estrategias</span>
                <span className="badge bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[11px] font-mono px-2 py-0.5 rounded-md">
                  {processedItems.length} de {operations.length} Listadas
                </span>
              </h5>
              <span className="text-[11px] text-neutral-400">
                Visión ejecutiva compacta con ordenamiento dinámico, precios en vivo y evaluación de riesgo/beneficio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Buscador Rápido */}
            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar par o estrategia..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-6 py-1 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 focus:outline-hidden text-xs text-neutral-100 placeholder-neutral-500 font-sans"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Copiar Resumen Markdown */}
            <button
              onClick={handleCopyMarkdownSummary}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copiar tabla resumen formateada en Markdown para GitHub / Notas"
            >
              {copiedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Copiar Resumen (MD)</span>
                </>
              )}
            </button>

            {/* Descargar CSV */}
            <button
              onClick={handleDownloadSummaryCsv}
              className="px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Descargar archivo CSV con el resumen de estrategias filtradas"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Descargar CSV</span>
            </button>
          </div>
        </div>

        {/* Fila Inferior: Filtros Rápidos (Pills) */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-neutral-800/60 text-xs">
          <span className="text-[11px] text-neutral-500 font-mono flex items-center gap-1 me-1">
            <Filter className="w-3 h-3 text-neutral-500" /> Filtros:
          </span>

          <button
            onClick={() => setActiveFilter('ALL')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-neutral-800 text-white font-bold border border-neutral-600'
                : 'bg-neutral-950 text-neutral-400 hover:text-neutral-200 border border-neutral-800'
            }`}
          >
            Todas ({counts.total})
          </button>

          <button
            onClick={() => setActiveFilter('LONG')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'LONG'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                : 'bg-neutral-950 text-neutral-400 hover:text-emerald-300 border border-neutral-800'
            }`}
          >
            <ArrowUp className="w-3 h-3 text-emerald-400 stroke-[3]" />
            <span>Longs ({counts.long})</span>
          </button>

          <button
            onClick={() => setActiveFilter('SHORT')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'SHORT'
                ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                : 'bg-neutral-950 text-neutral-400 hover:text-rose-300 border border-neutral-800'
            }`}
          >
            <ArrowDown className="w-3 h-3 text-rose-400 stroke-[3]" />
            <span>Shorts ({counts.short})</span>
          </button>

          <button
            onClick={() => setActiveFilter('IN_ZONE')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'IN_ZONE'
                ? 'bg-amber-400 text-neutral-950 font-bold border border-amber-300'
                : 'bg-neutral-950 text-neutral-400 hover:text-amber-300 border border-neutral-800'
            }`}
          >
            <Flame className="w-3 h-3 text-amber-500" />
            <span>En Zona E1 ({counts.inZone})</span>
          </button>

          <button
            onClick={() => setActiveFilter('CONFLUENT')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'CONFLUENT'
                ? 'bg-emerald-400/25 text-emerald-300 font-bold border border-emerald-400/50 shadow-xs'
                : 'bg-neutral-950 text-neutral-400 hover:text-emerald-300 border border-neutral-800'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
            <span>Confluencia Alta ({counts.confluent})</span>
          </button>

          <button
            onClick={() => setActiveFilter('MANAGED')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'MANAGED'
                ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/40'
                : 'bg-neutral-950 text-neutral-400 hover:text-blue-300 border border-neutral-800'
            }`}
          >
            <Layers className="w-3 h-3 text-blue-400" />
            <span>En Gestión ({counts.managed})</span>
          </button>

          <button
            onClick={() => setActiveFilter('OPERABLE_ONLY')}
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] transition-all flex items-center gap-1 cursor-pointer ${
              activeFilter === 'OPERABLE_ONLY'
                ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/40'
                : 'bg-neutral-950 text-neutral-400 hover:text-teal-300 border border-neutral-800'
            }`}
          >
            <span>Solo Operables ({counts.operable})</span>
          </button>
        </div>
      </div>

      {/* 2. TABLA RESUMEN COMPACTA Y ULTRA-LEGIBLE */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-neutral-200 border-collapse">
            <thead>
              <tr className="bg-neutral-950/90 border-b border-neutral-800 text-[11px] font-mono uppercase text-neutral-400 select-none">
                {/* 1. Ranking */}
                <th
                  onClick={() => handleSort('RANK')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors text-center w-12"
                  title="Ordenar por Ranking R:B / Proximidad"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    {renderSortIndicator('RANK')}
                  </div>
                </th>

                {/* 2. Par / Activo */}
                <th
                  onClick={() => handleSort('SYMBOL')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[130px]"
                  title="Ordenar alfabéticamente por Par"
                >
                  <div className="flex items-center gap-1">
                    <span>Par / Dirección</span>
                    {renderSortIndicator('SYMBOL')}
                  </div>
                </th>

                {/* 3. Estrategia */}
                <th
                  onClick={() => handleSort('STRATEGY_ID')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[150px]"
                  title="Ordenar por ID / Nombre de Estrategia"
                >
                  <div className="flex items-center gap-1">
                    <span>Estrategia</span>
                    {renderSortIndicator('STRATEGY_ID')}
                  </div>
                </th>

                {/* 4. Precio Live */}
                <th
                  onClick={() => handleSort('LIVE_PRICE')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors text-right min-w-[100px]"
                  title="Ordenar por Precio Live Actual"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Precio Live</span>
                    {renderSortIndicator('LIVE_PRICE')}
                  </div>
                </th>

                {/* 5. Entrada 1 (E1) y Distancia */}
                <th
                  onClick={() => handleSort('ENTRY_DIST_PCT')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[135px]"
                  title="Ordenar por Distancia a Entrada 1"
                >
                  <div className="flex items-center gap-1">
                    <span>Entrada 1 (E1)</span>
                    {renderSortIndicator('ENTRY_DIST_PCT')}
                  </div>
                </th>

                {/* 6. Entrada 2 (E2) */}
                <th className="p-2.5 font-bold text-neutral-400 min-w-[90px]">
                  <span>Entrada 2</span>
                </th>

                {/* 7. Stop Loss (SL) */}
                <th
                  onClick={() => handleSort('SL')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[115px]"
                  title="Ordenar por Stop Loss"
                >
                  <div className="flex items-center gap-1">
                    <span>Stop Loss</span>
                    {renderSortIndicator('SL')}
                  </div>
                </th>

                {/* 8. TP1 / TP Final */}
                <th
                  onClick={() => handleSort('TP_FINAL')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[125px]"
                  title="Ordenar por Take Profit"
                >
                  <div className="flex items-center gap-1">
                    <span>Take Profit</span>
                    {renderSortIndicator('TP_FINAL')}
                  </div>
                </th>

                {/* 9. Ratio R:B */}
                <th
                  onClick={() => handleSort('RB_RATIO')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors text-center min-w-[85px]"
                  title="Ordenar por Ratio Riesgo / Beneficio"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Ratio R:B</span>
                    {renderSortIndicator('RB_RATIO')}
                  </div>
                </th>

                {/* 10. Confluencia */}
                <th
                  onClick={() => handleSort('CONFLUENCE_SCORE')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors text-center min-w-[100px]"
                  title="Ordenar por Score de Confluencia"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Confluencia</span>
                    {renderSortIndicator('CONFLUENCE_SCORE')}
                  </div>
                </th>

                {/* 11. Estado / Condición */}
                <th
                  onClick={() => handleSort('STATUS')}
                  className="p-2.5 font-bold cursor-pointer group hover:text-white transition-colors min-w-[130px]"
                  title="Ordenar por Estado y Condición Operativa"
                >
                  <div className="flex items-center gap-1">
                    <span>Estado / Señal</span>
                    {renderSortIndicator('STATUS')}
                  </div>
                </th>

                {/* 12. Acciones */}
                <th className="p-2.5 font-bold text-right min-w-[90px]">
                  <span>Acción</span>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-neutral-800/70 font-sans">
              {processedItems.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="w-6 h-6 text-neutral-500" />
                      <span className="text-sm font-semibold text-neutral-300">
                        No se encontraron estrategias con los filtros aplicados
                      </span>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setActiveFilter('ALL');
                        }}
                        className="px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs font-mono transition-colors mt-1"
                      >
                        Restablecer Filtros
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                processedItems.map((op, idx) => {
                  const isFlashActive = op.isFullConfluenceMatch;
                  const managedCtx = strategyManagedTradesService.getManagedTradeContext(op.strategy);
                  const isManaged = Boolean(managedCtx?.isManaged);

                  // Row background styling
                  const rowClass = op.isNoOperar
                    ? 'bg-rose-950/20 hover:bg-rose-950/30'
                    : op.hasHitSL
                    ? 'bg-rose-950/15 hover:bg-rose-950/25'
                    : isManaged
                    ? 'bg-blue-950/15 hover:bg-blue-950/25'
                    : isFlashActive
                    ? 'bg-emerald-950/20 hover:bg-emerald-950/30 border-l-2 border-l-emerald-400'
                    : op.isInZone
                    ? 'bg-amber-950/15 hover:bg-amber-950/25 border-l-2 border-l-amber-400'
                    : 'hover:bg-neutral-800/40';

                  return (
                    <tr key={op.strategy.noEstrategia} className={`transition-colors text-xs ${rowClass}`}>
                      {/* 1. Ranking */}
                      <td className="p-2.5 text-center font-mono">
                        <span className="font-bold text-amber-400 text-xs">#{idx + 1}</span>
                      </td>

                      {/* 2. Par & Dirección */}
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => onNavigateToFutures && onNavigateToFutures(op.strategy.par)}
                            className="font-mono font-extrabold text-white text-xs hover:text-amber-300 hover:underline transition-colors flex items-center gap-1"
                            title="Ver par en Terminal de Futuros"
                          >
                            <span>{op.strategy.par}</span>
                          </button>
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold flex items-center gap-0.5 ${
                              op.isLong
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {op.isLong ? (
                              <ArrowUp className="w-3 h-3 stroke-[3]" />
                            ) : (
                              <ArrowDown className="w-3 h-3 stroke-[3]" />
                            )}
                            <span>{op.isLong ? 'LONG' : 'SHORT'}</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. Estrategia & Fuente */}
                      <td className="p-2.5">
                        <div className="flex flex-col">
                          <span className="font-mono text-amber-400 font-bold text-[11px]">
                            {op.strategy.noEstrategia}
                          </span>
                          <span
                            className="text-neutral-300 text-[11px] truncate max-w-[160px]"
                            title={op.strategy.nombreEstrategia}
                          >
                            {op.strategy.nombreEstrategia}
                          </span>
                          <div className="mt-0.5">
                            <StrategySourceBadge
                              source={op.strategy.fuenteActualizacion}
                              updatedAt={op.strategy.fechaActualizacion}
                              compact={true}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 4. Precio Live */}
                      <td className="p-2.5 text-right font-mono">
                        <span className="font-extrabold text-white text-xs block">
                          ${op.livePrice.toFixed(op.decimalPlaces)}
                        </span>
                      </td>

                      {/* 5. Entrada 1 (E1) y Distancia % */}
                      <td className="p-2.5 font-mono">
                        <div className="flex flex-col">
                          <span className="text-amber-300 font-bold text-xs">
                            ${op.entry1Price.toFixed(op.decimalPlaces)}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              op.isInZone
                                ? 'text-amber-400 flex items-center gap-0.5'
                                : op.absDiffPct <= 2.5
                                ? 'text-emerald-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {op.isInZone && <Flame className="w-2.5 h-2.5 text-amber-400" />}
                            {op.diffPct >= 0 ? '+' : ''}
                            {op.diffPct.toFixed(2)}% ({op.isInZone ? 'En Zona' : `$${Math.abs(op.diffDollar).toFixed(op.decimalPlaces)}`})
                          </span>
                        </div>
                      </td>

                      {/* 6. Entrada 2 (E2) */}
                      <td className="p-2.5 font-mono text-neutral-300 text-xs">
                        {op.entry2Price > 0 ? (
                          <div className="flex flex-col">
                            <span>${op.entry2Price.toFixed(op.decimalPlaces)}</span>
                            <span className="text-[10px] text-neutral-400">
                              {((op.entry2Price - op.livePrice) / op.livePrice * 100) >= 0 ? '+' : ''}
                              {(((op.entry2Price - op.livePrice) / op.livePrice) * 100).toFixed(2)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">-</span>
                        )}
                      </td>

                      {/* 7. Stop Loss (SL) */}
                      <td className="p-2.5 font-mono">
                        <div className="flex flex-col">
                          <span
                            className={`font-bold flex items-center gap-1 text-xs ${
                              op.hasHitSL
                                ? 'text-rose-300 bg-rose-950/80 px-1 py-0.5 rounded border border-rose-500'
                                : 'text-rose-400'
                            }`}
                          >
                            {op.hasHitSL && <Skull className="w-3 h-3 text-rose-400" />}
                            ${op.slPrice.toFixed(op.decimalPlaces)}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            ROE: -{op.rewardToRisk.maxLossPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* 8. Take Profit */}
                      <td className="p-2.5 font-mono">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-bold text-xs">
                            TP1: ${op.tp1Price.toFixed(op.decimalPlaces)}
                          </span>
                          {op.tpFinalPrice > 0 ? (
                            <span className="text-emerald-300/80 text-[10px]">
                              Final: ${op.tpFinalPrice.toFixed(op.decimalPlaces)} (+{op.rewardToRisk.maxProfitPct.toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] text-neutral-400">
                              +{op.rewardToRisk.maxProfitPct.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 9. Ratio R:B */}
                      <td className="p-2.5 text-center font-mono">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-xs border inline-block ${
                            op.ratio >= 2.5
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          1:{op.ratio.toFixed(1)}
                        </span>
                      </td>

                      {/* 10. Confluencia */}
                      <td className="p-2.5 text-center font-mono">
                        <div className="flex flex-col items-center">
                          <span
                            className={`font-bold text-xs ${
                              op.confluenceResult.confluenceScorePercent >= 75
                                ? 'text-emerald-400'
                                : op.confluenceResult.confluenceScorePercent >= 50
                                ? 'text-amber-400'
                                : 'text-neutral-400'
                            }`}
                          >
                            {op.confluenceResult.confluenceScorePercent}%
                          </span>
                          <span className="text-[9px] text-neutral-400">
                            {op.confluenceResult.metFactorsCount}/10 Factores
                          </span>
                        </div>
                      </td>

                      {/* 11. Estado / Condición */}
                      <td className="p-2.5">
                        <div className="flex flex-col gap-1 items-start">
                          {/* NO OPERAR */}
                          {op.isNoOperar ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase bg-rose-600 text-white border border-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.5)]">
                              <ShieldAlert className="w-3 h-3 text-white" />
                              <span>NO OPERAR</span>
                            </span>
                          ) : isManaged ? (
                            <StrategyManagedBadge
                              tradeContext={managedCtx}
                              onNavigateToGestionTrades={onNavigateToGestionTrades}
                              compact={true}
                            />
                          ) : isFlashActive ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase bg-emerald-500/30 text-emerald-300 border border-emerald-400">
                              <Zap className="w-2.5 h-2.5 fill-emerald-400" />
                              <span>100% CONFLUENCIA</span>
                            </span>
                          ) : op.isInZone ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase bg-amber-400 text-neutral-950 font-bold">
                              <Flame className="w-2.5 h-2.5 text-neutral-950" />
                              <span>EN ZONA E1</span>
                            </span>
                          ) : op.hasHitSL ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold font-mono uppercase bg-rose-950 text-rose-300 border border-rose-500">
                              <Skull className="w-2.5 h-2.5 text-rose-400" />
                              <span>TOCÓ SL</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800">
                              <span>✅ OPERABLE</span>
                            </span>
                          )}

                          {op.isInDangerZone && !op.hasHitSL && !op.isNoOperar && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-rose-400 font-mono">
                              <AlertTriangle className="w-2.5 h-2.5" /> Peligro SL
                            </span>
                          )}

                          {op.hasHitTPBeforeE1 && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-400 font-mono">
                              <Target className="w-2.5 h-2.5" /> TP Previo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 12. Acciones */}
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onAutofillOrder(op)}
                            disabled={op.isNoOperar}
                            className={`p-1.5 rounded-lg font-bold transition-all flex items-center justify-center ${
                              op.isNoOperar
                                ? 'bg-rose-950 text-rose-400 border border-rose-800 cursor-not-allowed opacity-70'
                                : isFlashActive
                                ? 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-[0_0_10px_rgba(52,211,153,0.5)] cursor-pointer'
                                : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 cursor-pointer'
                            }`}
                            title={op.isNoOperar ? `Trade NO OPERAR: ${op.noOperarReason}` : 'Autoejecutar en Terminal de Futuros'}
                          >
                            {op.isNoOperar ? <ShieldAlert className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 fill-current" />}
                          </button>

                          <button
                            onClick={() => onOpenDetails(op.strategy)}
                            className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
                            title="Ver ficha técnica completa"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {onNavigateToBacktest && (
                            <button
                              onClick={() => onNavigateToBacktest(op.strategy.par)}
                              className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-purple-400 hover:text-purple-300 border border-neutral-800 hover:border-purple-500/40 transition-colors cursor-pointer"
                              title={`Simular estrategia en Backtesting (${op.strategy.par})`}
                            >
                              <BarChart2 className="w-3.5 h-3.5" />
                            </button>
                          )}
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
  );
};
