import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Layers,
  Link as LinkIcon,
  Lock,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  Award,
  Scale,
  ArrowUpDown,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { OpenOrder, PositionRisk } from '../types/binance';
import { EmergencyCloseButton } from './EmergencyCloseButton';
import { auditPositionRisk } from '../utils/riskAuditor';
import { RiskAuditModal } from './RiskAuditModal';
import { LinkStrategyModal } from './LinkStrategyModal';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { PositionTacticalDetailRow } from './PositionTacticalDetailRow';
import { getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import { TradePriceSparkline } from './TradePriceSparkline';
import { tradePriceHistoryService } from '../services/tradePriceHistoryService';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { evaluateStrategyConfluence } from '../utils/confluenceEngine';
import { StrategyConfluenceDetailBadge } from './StrategyConfluenceDetailBadge';
import { StrategyConfluenceStatusBadge } from './StrategyConfluenceStatusBadge';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { GitBranch, Activity, Volume2, VolumeX } from 'lucide-react';
import { tradeMilestonesAlertService } from '../services/tradeMilestonesAlertService';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
import { notificationService } from '../services/notifications';
import { rankAndSortPositions, PositionSortMode, ScoredPosition } from '../utils/positionRanker';
import { PositionQualityBadge } from './PositionQualityBadge';
import { StrategyPriceLine } from './StrategyPriceLine';

interface OpenPositionsTableProps {
  onSelectPosition?: (pos: PositionRisk) => void;
  onOpenOrderModal?: () => void;
}

export const OpenPositionsTable: React.FC<OpenPositionsTableProps> = ({ onSelectPosition, onOpenOrderModal }) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(() => binanceWs.getOpenOrders());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const [priceTick, setPriceTick] = useState<number>(Date.now());
  const [allStrategies, setAllStrategies] = useState<GoogleSheetStrategyRow[]>(() =>
    strategyService.getStrategies()
  );
  const mode = binanceWs.getMode();

  // Stable fixed order of position symbols so positions NEVER jump or re-order automatically
  const [stableSymbolsOrder, setStableSymbolsOrder] = useState<string[]>(() =>
    binanceWs.getPositions().map((p) => p.symbol)
  );

  // Mode for ranking & sorting positions: defaults to 'best_quality' (Mejor a Peor según Confluencia y R:B)
  const [sortMode, setSortMode] = useState<PositionSortMode>('best_quality');

  // Modal for editing TP/SL
  const [editingPos, setEditingPos] = useState<PositionRisk | null>(null);
  const [editTp, setEditTp] = useState<string>('');
  const [editSl, setEditSl] = useState<string>('');

  // Fast filter & search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [posFilter, setPosFilter] = useState<'all' | 'profit' | 'loss' | 'no_sl' | 'long' | 'short'>('all');
  const [beFeedback, setBeFeedback] = useState<Record<string, string>>({});

  // Modals for Risk Audit & Link Strategy
  const [auditPos, setAuditPos] = useState<PositionRisk | null>(null);
  const [linkPos, setLinkPos] = useState<PositionRisk | null>(null);

  // Expanded symbols for visual strategy tracking (E2, E3, TP1, TP2, SL)
  // Requerimiento: todas las posiciones inician comprimidas por defecto
  const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(() => new Set<string>());

  const seenSymbolsRef = React.useRef<Set<string>>(
    new Set(binanceWs.getPositions().map((p) => p.symbol))
  );

  const toggleExpand = (sym: string) => {
    setExpandedSymbols((prev) => {
      const next = new Set(prev);
      if (next.has(sym)) {
        next.delete(sym);
      } else {
        next.add(sym);
      }
      return next;
    });
  };

  const handleExpandAll = () => {
    const allSymbols = new Set(positions.map((p) => p.symbol));
    setExpandedSymbols(allSymbols);
  };

  const handleCollapseAll = () => {
    setExpandedSymbols(new Set());
  };

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      const curPositions = binanceWs.getPositions();
      setPositions(curPositions);
      setOpenOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());

      // Maintain fixed symbol positions: keep existing ordering intact and append any newly opened positions
      setStableSymbolsOrder((prevOrder) => {
        const activeSymbols = new Set(curPositions.map((p) => p.symbol));
        const preserved = prevOrder.filter((sym) => activeSymbols.has(sym));
        const existingSet = new Set(preserved);
        const added = curPositions.map((p) => p.symbol).filter((sym) => !existingSet.has(sym));
        if (added.length === 0 && preserved.length === prevOrder.length) {
          return prevOrder;
        }
        return [...preserved, ...added];
      });

      // Track newly seen positions without forcing auto-expansion
      const brandNewPositions = curPositions.filter((p) => !seenSymbolsRef.current.has(p.symbol));
      if (brandNewPositions.length > 0) {
        brandNewPositions.forEach((p) => seenSymbolsRef.current.add(p.symbol));
      }
    });

    const unsubLivePrices = livePriceService.subscribe(() => {
      setPriceTick(Date.now());
    });

    const unsubHist = tradePriceHistoryService.subscribe(() => {
      setPriceTick(Date.now());
    });

    const unsubStrat = strategyService.subscribe(() => {
      setAllStrategies(strategyService.getStrategies());
      setPriceTick(Date.now());
    });

    const unsubMilestones = tradeMilestonesAlertService.subscribe(() => {
      setPriceTick(Date.now());
    });

    const alertTimer = setInterval(() => {
      setPriceTick(Date.now());
    }, 1000);

    return () => {
      unsub();
      unsubLivePrices();
      unsubHist();
      unsubStrat();
      unsubMilestones();
      clearInterval(alertTimer);
    };
  }, []);

  // Helper to resolve linked strategy and compute 10-factor confluence in real time
  const getLinkedStrategyAndConfluence = (pos: PositionRisk, currentMarketPrice: number) => {
    const effStratId = pos.strategyId || binanceWs.getLinkedStrategyForSymbol(pos.symbol)?.strategyId;
    const cleanSym = pos.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();

    const strat = allStrategies.find(
      (s) =>
        (effStratId &&
          (s.noEstrategia.toUpperCase() === effStratId.toUpperCase() ||
            s.nombreEstrategia.toUpperCase() === effStratId.toUpperCase())) ||
        s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym
    );

    if (!strat) {
      return {
        stratId: effStratId,
        strategy: null,
        confluence: null,
      };
    }

    try {
      const prices = parsePricesFromStrategy(strat);
      const confluence = evaluateStrategyConfluence(strat, prices, currentMarketPrice);
      return {
        stratId: effStratId || strat.noEstrategia,
        strategy: strat,
        confluence,
      };
    } catch {
      return {
        stratId: effStratId || strat.noEstrategia,
        strategy: strat,
        confluence: null,
      };
    }
  };

  // Compute positions ranked and sorted by quality (Confluence 60% + R:B 40%)
  const rankedPositions = React.useMemo(() => {
    const baseList = sortMode === 'stable'
      ? (() => {
          const posMap = new Map<string, PositionRisk>(positions.map((p) => [p.symbol, p]));
          const result: PositionRisk[] = [];
          stableSymbolsOrder.forEach((sym) => {
            const found = posMap.get(sym);
            if (found) {
              result.push(found);
              posMap.delete(sym);
            }
          });
          posMap.forEach((p) => result.push(p));
          return result;
        })()
      : positions;

    return rankAndSortPositions(
      baseList,
      openOrders,
      allStrategies,
      sortMode
    );
  }, [positions, stableSymbolsOrder, openOrders, allStrategies, sortMode, priceTick]);

  const handleOpenOrder = () => {
    if (onOpenOrderModal) {
      onOpenOrderModal();
    } else {
      strategyAutofillService.openOrderModal();
    }
  };

  const handleSyncPositions = async () => {
    await binanceWs.syncAllAccountData();
  };

  const getEffectiveTPSL = (pos: PositionRisk) => {
    const isLong = pos.positionAmt > 0;
    const matchingOrders = openOrders.filter(
      o => o.symbol === pos.symbol && o.status !== 'CANCELED' && o.status !== 'EXPIRED' && o.status !== 'FILLED'
    );

    const tpOrder = matchingOrders.find(o => {
      const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
      if (!isCloseSide) return false;
      const typeStr = String(o.type || '').toUpperCase();
      if (typeStr.includes('TAKE_PROFIT') || o.clientOrderId?.includes('TP-')) return true;
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return trig > 0 && (isLong ? trig > pos.entryPrice : trig < pos.entryPrice);
    });

    const slOrder = matchingOrders.find(o => {
      const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
      if (!isCloseSide) return false;
      const typeStr = String(o.type || '').toUpperCase();
      if (typeStr.includes('STOP') || o.clientOrderId?.includes('SL-')) return true;
      const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
      return trig > 0 && (isLong ? trig < pos.entryPrice : trig > pos.entryPrice);
    });

    const tpValue = pos.takeProfit || (tpOrder ? (tpOrder.stopPrice > 0 ? tpOrder.stopPrice : tpOrder.price) : undefined);
    const slValue = pos.stopLoss || (slOrder ? (slOrder.stopPrice > 0 ? slOrder.stopPrice : slOrder.price) : undefined);

    return { tpValue, slValue, tpOrder, slOrder };
  };

  const openEditModal = (pos: PositionRisk) => {
    setEditingPos(pos);
    const { tpValue, slValue } = getEffectiveTPSL(pos);
    setEditTp(tpValue ? tpValue.toString() : '');
    setEditSl(slValue ? slValue.toString() : '');
  };

  const handleSaveTPSL = async () => {
    if (!editingPos) return;
    const tp = editTp && parseFloat(editTp) > 0 ? parseFloat(editTp) : undefined;
    const sl = editSl && parseFloat(editSl) > 0 ? parseFloat(editSl) : undefined;
    await binanceWs.updatePositionTPSL(editingPos.symbol, tp, sl);
    setEditingPos(null);
  };

  const handleQuickBreakeven = async (pos: PositionRisk) => {
    if (!pos.entryPrice || pos.entryPrice <= 0) return;
    try {
      const { tpValue } = getEffectiveTPSL(pos);
      await binanceWs.updatePositionTPSL(pos.symbol, tpValue, pos.entryPrice);
      setBeFeedback(prev => ({ ...prev, [pos.symbol]: '¡BE Fijado!' }));
      setTimeout(() => {
        setBeFeedback(prev => {
          const next = { ...prev };
          delete next[pos.symbol];
          return next;
        });
      }, 3000);
    } catch {
      setBeFeedback(prev => ({ ...prev, [pos.symbol]: 'Error' }));
      setTimeout(() => {
        setBeFeedback(prev => {
          const next = { ...prev };
          delete next[pos.symbol];
          return next;
        });
      }, 3000);
    }
  };

  // Quick stats computed across all ranked positions
  const positionStats = React.useMemo(() => {
    let winningCount = 0;
    let losingCount = 0;
    let missingSlCount = 0;
    let longCount = 0;
    let shortCount = 0;
    let eliteCount = 0;

    rankedPositions.forEach((sp) => {
      if (sp.isLong) longCount++;
      else shortCount++;

      if (sp.pnl >= 0) winningCount++;
      else losingCount++;

      if (!sp.hasSL) missingSlCount++;
      if (sp.qualityScore >= 75) eliteCount++;
    });

    return { winningCount, losingCount, missingSlCount, longCount, shortCount, eliteCount };
  }, [rankedPositions]);

  const filteredPositions = React.useMemo(() => {
    return rankedPositions.filter((sp) => {
      const pos = sp.position;
      if (searchTerm.trim() && !pos.symbol.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
        return false;
      }
      if (posFilter === 'profit') return sp.pnl >= 0;
      if (posFilter === 'loss') return sp.pnl < 0;
      if (posFilter === 'no_sl') return !sp.hasSL;
      if (posFilter === 'long') return sp.isLong;
      if (posFilter === 'short') return !sp.isLong;
      return true;
    });
  }, [rankedPositions, searchTerm, posFilter]);

  return (
    <div id="open-positions-table-container" className="trading-card border-accent-warning w-full flex flex-col overflow-hidden shadow-lg mb-4">
      {/* Table Header Controls */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-950/90 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Posiciones Abiertas (Binance Futures)</span>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-800 text-amber-300 font-mono font-bold border border-neutral-700">
            {positions.length} activas
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
            <Lock className="w-2.5 h-2.5" />
            Margen Aislado • Máx 5x
          </span>
        </div>

        <div className="flex items-center gap-2">
          {rankedPositions.length > 0 && (
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5 shadow-xs">
              <button
                type="button"
                id="btn-expand-all-positions"
                onClick={handleExpandAll}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  expandedSymbols.size === rankedPositions.length
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'text-neutral-300 hover:text-white hover:bg-neutral-800'
                }`}
                title="Expandir el seguimiento e hitos de todas las posiciones"
              >
                <ChevronDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Expandir todas</span>
              </button>
              <button
                type="button"
                id="btn-collapse-all-positions"
                onClick={handleCollapseAll}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  expandedSymbols.size === 0
                    ? 'bg-neutral-800 text-white border border-neutral-700 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                }`}
                title="Comprimir todas las posiciones para vista compacta"
              >
                <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
                <span>Comprimir todas</span>
              </button>
            </div>
          )}

          <button
            type="button"
            id="btn-sync-open-positions"
            onClick={handleSyncPositions}
            disabled={isSyncing}
            className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 font-semibold text-[11px] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Sincronizar y actualizar posiciones de Binance a demanda"
          >
            <RefreshCw className={`w-3 h-3 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenOrder}
            className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-[11px] flex items-center gap-1 transition-all shadow-xs"
          >
            <Zap className="w-3 h-3 fill-neutral-950" />
            <span>Nueva Orden</span>
          </button>
        </div>
      </div>

      {/* Quick Filter, Search & Quality Ranking Bar */}
      {rankedPositions.length > 0 && (
        <div className="flex flex-col gap-2 px-3.5 py-2.5 bg-neutral-950/80 border-b border-neutral-800 text-xs">
          {/* Row 1: Fast Filters & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setPosFilter('all')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  posFilter === 'all'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                Todas ({rankedPositions.length})
              </button>
              <button
                type="button"
                onClick={() => setPosFilter('profit')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  posFilter === 'profit'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold'
                    : 'text-neutral-400 hover:text-emerald-300 hover:bg-neutral-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                En Ganancia ({positionStats.winningCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilter('loss')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  posFilter === 'loss'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold'
                    : 'text-neutral-400 hover:text-rose-300 hover:bg-neutral-900'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                En Pérdida ({positionStats.losingCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilter('no_sl')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  posFilter === 'no_sl'
                    ? 'bg-amber-500/30 text-amber-200 border border-amber-500/50 font-bold'
                    : positionStats.missingSlCount > 0
                      ? 'text-amber-400 bg-amber-950/40 border border-amber-800/60 font-bold animate-pulse'
                      : 'text-neutral-400 hover:text-amber-300 hover:bg-neutral-900'
                }`}
                title="Posiciones sin Stop Loss activo (Riesgo según Disciplina #3)"
              >
                ⚠️ Sin SL ({positionStats.missingSlCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilter('long')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  posFilter === 'long'
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                Long ({positionStats.longCount})
              </button>
              <button
                type="button"
                onClick={() => setPosFilter('short')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                  posFilter === 'short'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                Short ({positionStats.shortCount})
              </button>
            </div>

            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar par (ej. BTC, SOL)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-neutral-900/90 border border-neutral-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400/60 w-44 transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 text-neutral-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Row 2: Jerarquía y Orden de Calidad (Confluencia + R:B) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 font-semibold mr-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Ordenar:</span>
              </div>

              <button
                type="button"
                id="sort-best-quality-btn"
                onClick={() => setSortMode('best_quality')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  sortMode === 'best_quality'
                    ? 'bg-amber-500 text-neutral-950 border border-amber-400 font-black shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-300 hover:text-amber-300 hover:bg-neutral-850 border border-neutral-800'
                }`}
                title="Ordenar de Mejor a Peor ponderando Confluencia institucional (60%) y Ratio R:B (40%)"
              >
                <Award className="w-3.5 h-3.5" />
                <span>⭐ Mejor a Peor (Confluencia + R:B)</span>
              </button>

              <button
                type="button"
                id="sort-confluence-btn"
                onClick={() => setSortMode('confluence_desc')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  sortMode === 'confluence_desc'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-emerald-300 hover:bg-neutral-850 border border-neutral-800'
                }`}
                title="Ordenar priorizando Mayor Confluencia Técnica de 10 factores"
              >
                <Flame className="w-3 h-3 text-emerald-400" />
                <span>1º Confluencia (10F)</span>
              </button>

              <button
                type="button"
                id="sort-rb-btn"
                onClick={() => setSortMode('rb_desc')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  sortMode === 'rb_desc'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-cyan-300 hover:bg-neutral-850 border border-neutral-800'
                }`}
                title="Ordenar priorizando Mayor Ratio Beneficio / Riesgo"
              >
                <Scale className="w-3 h-3 text-cyan-400" />
                <span>1º Ratio R:B</span>
              </button>

              <button
                type="button"
                id="sort-pnl-btn"
                onClick={() => setSortMode('pnl_desc')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  sortMode === 'pnl_desc'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-emerald-300 hover:bg-neutral-850 border border-neutral-800'
                }`}
                title="Ordenar por Mayor Ganancia PnL ($)"
              >
                <span>PnL ($)</span>
              </button>

              <button
                type="button"
                id="sort-stable-btn"
                onClick={() => setSortMode('stable')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                  sortMode === 'stable'
                    ? 'bg-neutral-800 text-white border border-neutral-600 font-bold'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-850 border border-neutral-800'
                }`}
                title="Restaurar orden original de apertura de posiciones"
              >
                <span>Orden Fijo</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
              <span className="text-amber-400 font-bold">
                {sortMode === 'best_quality' && '⭐ Jerarquía Activa: Mejor Calidad (#1) a Menor'}
                {sortMode === 'confluence_desc' && '⚡ Jerarquía Activa: Mayor Confluencia (10F)'}
                {sortMode === 'rb_desc' && '⚖️ Jerarquía Activa: Mayor Ratio R:B'}
                {sortMode === 'pnl_desc' && '💵 Jerarquía Activa: Mayor Ganancia PnL'}
                {sortMode === 'stable' && '🔒 Orden Fijo: Sin reordenar'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table Container - ALWAYS renders the full table header so the positions card is always recognizable */}
      <div className="overflow-x-auto w-full" style={{ minHeight: '520px' }}>
        <table className="table table-dark table-trading w-full text-left text-sm font-mono min-w-[1240px] mb-0">
          <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800 text-xs">
            <tr>
              <th className="py-3 px-3.5">
                <div className="flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span># RANK &amp; PAR</span>
                </div>
              </th>
              <th className="py-3 px-3.5" title="Estrategia vinculada y Nivel de Confluencia técnica e institucional (10 Factores)">
                Estrategia &amp; Confluencia (10F)
              </th>
              <th className="py-3 px-3.5" title="Calidad integral del trade y Ratio Riesgo / Beneficio">
                Calidad &amp; Ratio R:B
              </th>
              <th className="py-3 px-3.5">Apalancamiento Margen</th>
              <th className="py-3 px-3.5">Tamaño</th>
              <th className="py-3 px-3.5">Precio Entrada</th>
              <th className="py-3 px-3.5">Precio de Mercado</th>
              <th className="py-3 px-3.5">PnL</th>
              <th className="py-3 px-3.5 text-center">Seguimiento &amp; Sparkline</th>
              <th className="py-3 px-3.5 text-right">Estado del trade</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/60">
            {rankedPositions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-3 shadow-inner">
                      <ShieldCheck className="w-6 h-6 text-emerald-400/80" />
                    </div>
                    <h4 className="text-sm font-bold text-white font-sans">
                      Sin posiciones activas en Binance Futures
                    </h4>
                    <p className="text-xs text-neutral-400 font-sans mt-1 leading-relaxed">
                      Tus órdenes de futuros se ejecutan con margen estrictamente <strong>ISOLATED</strong> y apalancamiento seguro de <strong>1x a 5x</strong>.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                      <button
                        type="button"
                        onClick={handleOpenOrder}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold font-sans flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
                      >
                        <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                        <span>Abrir Nueva Orden</span>
                      </button>
                      {mode === 'simulation' && (
                        <button
                          type="button"
                          onClick={() => binanceWs.loadSimulationDemoData()}
                          className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-amber-500/30 text-xs font-semibold font-sans transition-colors cursor-pointer"
                        >
                          Cargar Posiciones Demo
                        </button>
                      )}
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredPositions.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 px-4 text-center">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <p className="text-sm font-semibold text-neutral-300 font-sans">
                      No hay posiciones que coincidan con los filtros seleccionados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPosFilter('all');
                        setSearchTerm('');
                      }}
                      className="mt-3 px-3 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-semibold cursor-pointer"
                    >
                      Restablecer Filtros
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filteredPositions.map((scored) => {
                const pos = scored.position;
                const isLong = scored.isLong;
                const isExpanded = expandedSymbols.has(pos.symbol);
                const effectiveMarketPrice = scored.marketPrice > 0 ? scored.marketPrice : (pos.entryPrice || 0);
                const qty = scored.qty;
                const pnl = scored.pnl;
                const isProfit = pnl >= 0;
                const margin = scored.margin;
                const roe = scored.roe;
                const safeLeverage = Math.min(5, Math.max(1, pos.leverage || 2));
                const tpValue = scored.tpValue;
                const slValue = scored.slValue;

                const formatPrice = (price: number): string => {
                  return formatPriceUtil(price, pos.symbol);
                };

                const notionalUsd = qty * (pos.entryPrice || effectiveMarketPrice);
                const hasMilestoneAlert = tradeMilestonesAlertService.hasRecentAlert(pos.symbol, 10000);
                const latestMilestoneAlert = tradeMilestonesAlertService.getLatestActiveAlertForSymbol(pos.symbol, 10000);

                // Niveles de precios y cálculo de zona de peligro para la Barra Horizontal de Precios
                const stratPrices = scored.strategy ? parsePricesFromStrategy(scored.strategy) : null;
                const e1Price = stratPrices?.entry1Price || pos.entryPrice || 0;
                const e2Price = stratPrices?.entry2Price || 0;
                const e3Price = stratPrices?.entry3Price || 0;
                const slPrice = slValue || stratPrices?.slPrice || (isLong ? pos.entryPrice * 0.985 : pos.entryPrice * 1.015);
                const tp1Price = tpValue || stratPrices?.tp1Price || (isLong ? pos.entryPrice * 1.025 : pos.entryPrice * 0.975);
                const tp2Price = stratPrices?.tp2Price || 0;
                const tp3Price = stratPrices?.tpFinalPrice || 0;

                const hasHitSL = slPrice > 0 && (isLong ? effectiveMarketPrice <= slPrice : effectiveMarketPrice >= slPrice);

                const lowestEntry = isLong
                  ? (e3Price > 0 ? e3Price : (e2Price > 0 ? e2Price : (e1Price > 0 ? e1Price : pos.entryPrice)))
                  : (e3Price > 0 ? e3Price : (e2Price > 0 ? e2Price : (e1Price > 0 ? e1Price : pos.entryPrice)));
                const highestEntry = !isLong
                  ? (e3Price > 0 ? e3Price : (e2Price > 0 ? e2Price : (e1Price > 0 ? e1Price : pos.entryPrice)))
                  : (e3Price > 0 ? e3Price : (e2Price > 0 ? e2Price : (e1Price > 0 ? e1Price : pos.entryPrice)));

                let isInDangerZone = false;
                if (slPrice > 0) {
                  if (isLong && lowestEntry > 0) {
                    isInDangerZone = effectiveMarketPrice > 0 && effectiveMarketPrice <= lowestEntry && effectiveMarketPrice >= slPrice;
                  } else if (!isLong && highestEntry > 0) {
                    isInDangerZone = effectiveMarketPrice > 0 && effectiveMarketPrice >= highestEntry && effectiveMarketPrice <= slPrice;
                  }
                }

                return (
                  <React.Fragment key={pos.symbol}>
                    <tr
                      id={`position-row-${pos.symbol}`}
                      onClick={() => {
                        toggleExpand(pos.symbol);
                        if (onSelectPosition) onSelectPosition(pos);
                      }}
                      className={`group transition-colors cursor-pointer select-none ${
                        hasMilestoneAlert
                          ? 'bg-amber-950/20 ring-1 ring-amber-500/50'
                          : ''
                      } ${
                        isExpanded
                          ? 'bg-neutral-900/90 border-l-2 border-amber-400 hover:bg-neutral-850'
                          : 'hover:bg-neutral-800/40'
                      }`}
                      title="Haz clic en cualquier parte de la fila para expandir o comprimir el seguimiento de hitos"
                    >
                      {/* 1. # RANK & PAR */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="text-neutral-500 group-hover:text-amber-400 transition-colors p-0.5"
                              title={isExpanded ? 'Comprimir posición' : 'Expandir posición'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-amber-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                              )}
                            </span>

                            {/* Rank Badge */}
                            {scored.isBest ? (
                              <span
                                className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-300 border border-amber-400/60 font-black text-[10px] tracking-wider flex items-center gap-1 shadow-xs"
                                title="Posición #1 Mejor Calificada (Mayor Confluencia y mejor R:B)"
                              >
                                <span>🥇 #1 MEJOR</span>
                              </span>
                            ) : scored.rank === 2 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md bg-slate-400/20 text-slate-200 border border-slate-400/40 font-bold text-[10px] tracking-tight flex items-center gap-0.5"
                                title="Posición #2 Mejor Calificada"
                              >
                                <span>🥈 #2</span>
                              </span>
                            ) : scored.rank === 3 ? (
                              <span
                                className="px-1.5 py-0.5 rounded-md bg-amber-800/25 text-amber-300 border border-amber-700/50 font-bold text-[10px] tracking-tight flex items-center gap-0.5"
                                title="Posición #3 Mejor Calificada"
                              >
                                <span>🥉 #3</span>
                              </span>
                            ) : (
                              <span
                                className="px-1.5 py-0.5 rounded bg-neutral-900 text-neutral-400 border border-neutral-800 font-mono text-[10px] font-bold"
                                title={`Puesto #${scored.rank}`}
                              >
                                #{scored.rank}
                              </span>
                            )}

                            <span className="font-bold text-white text-xs tracking-wide">{pos.symbol}</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                                isLong
                                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                                  : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                              }`}
                            >
                              {isLong ? 'LONG' : 'SHORT'}
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-neutral-500 pl-5">
                            {pos.liquidationPrice > 0 ? (
                              <span className="text-rose-400/90 font-medium" title="Precio de Liquidación">
                                Liq: ${formatPrice(pos.liquidationPrice)}
                              </span>
                            ) : (
                              <span className="text-neutral-500">Liq: Segura (0.00)</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 2. Estrategia & Confluencia (10F) */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                          {/* Fila superior: ID de Estrategia y botón Hitos */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {scored.strategyId ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkPos(pos);
                                }}
                                title={`Estrategia: ${scored.strategyId}${
                                  scored.strategy ? ` (${scored.strategy.nombreEstrategia})` : ''
                                } - Clic para cambiar`}
                                className="px-2 py-0.5 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold font-mono flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                                <span className="truncate max-w-[110px]">{scored.strategyId}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkPos(pos);
                                }}
                                className="px-2 py-0.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <LinkIcon className="w-2.5 h-2.5 text-neutral-400" />
                                <span>Ligar Estrategia</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(pos.symbol);
                              }}
                              title="Desplegar seguimiento visual de hitos (E1, E2, E3, TP1, TP2, SL) y recomendaciones"
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                                isExpanded
                                  ? 'bg-amber-500 text-neutral-950 border-amber-400 font-bold shadow-xs'
                                  : 'bg-neutral-800/90 hover:bg-neutral-700 text-amber-300 border-amber-500/30'
                              }`}
                            >
                              <Layers className="w-2.5 h-2.5" />
                              <span>Hitos</span>
                              {isExpanded ? (
                                <ChevronUp className="w-2.5 h-2.5" />
                              ) : (
                                <ChevronDown className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>

                          {/* Fila inferior: Indicador visual de Confluencia de Estrategia */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <StrategyConfluenceStatusBadge
                              strategy={scored.strategy}
                              confluence={scored.confluence}
                              hasPosition={true}
                              compact={true}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 3. Calidad & Ratio R:B */}
                      <td className="py-3.5 px-3.5">
                        <PositionQualityBadge scored={scored} showDetails={true} />
                      </td>

                      {/* 4. Apalancamiento Margen */}
                      <td className="py-3.5 px-3.5">
                        <div className="flex flex-col gap-0.5 font-mono">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-neutral-950 text-amber-300 border border-neutral-700 font-bold text-[11px]">
                              {safeLeverage}x
                            </span>
                            <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[9px] font-semibold">
                              ISOLATED
                            </span>
                          </div>
                          <span className="text-white font-semibold text-xs">
                            ${(pos.isolatedMargin || margin || 0).toFixed(2)} USDT
                          </span>
                        </div>
                      </td>

                      {/* 5. Tamaño */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-xs">
                            {qty.toFixed(3)} {pos.symbol.replace('USDT', '')}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            ~${notionalUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                          </span>
                        </div>
                      </td>

                      {/* 6. Precio Entrada */}
                      <td className="py-3.5 px-3.5 text-neutral-200 font-mono text-xs">
                        ${formatPrice(pos.entryPrice || 0)}
                      </td>

                      {/* 7. Precio de Mercado */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            <span className="text-amber-400 font-bold text-xs">
                              ${formatPrice(effectiveMarketPrice)}
                            </span>
                          </div>
                          {pos.entryPrice > 0 && effectiveMarketPrice > 0 && (
                            <span className={`text-[10px] font-semibold ${isProfit ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                              {isLong
                                ? (effectiveMarketPrice >= pos.entryPrice ? '+' : '') + formatPrice(effectiveMarketPrice - pos.entryPrice)
                                : (pos.entryPrice >= effectiveMarketPrice ? '+' : '-') + formatPrice(Math.abs(pos.entryPrice - effectiveMarketPrice))}
                              {' (' + (isLong ? '+' : '') + (((effectiveMarketPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2) + '%)'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 8. PnL */}
                      <td className="py-3.5 px-3.5 font-mono">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`font-bold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                            </span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                              isProfit
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                                : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                            }`}>
                              {isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE
                            </span>
                          </div>

                          {/* Quick TP / SL with Edit Pencil and 1-Click Breakeven */}
                          <div className="flex items-center gap-1 text-[10px] text-neutral-400 flex-wrap">
                            {tpValue ? (
                              <span className="text-emerald-400 font-semibold" title="Take Profit">
                                TP: ${tpValue.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-neutral-500 italic">Sin TP</span>
                            )}
                            <span className="text-neutral-600">•</span>
                            {slValue ? (
                              <span className="text-rose-400 font-semibold" title="Stop Loss">
                                SL: ${slValue.toFixed(2)}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditModal(pos);
                                }}
                                className="px-1.5 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-[9px] font-bold animate-pulse cursor-pointer"
                                title="¡Alerta de riesgo! Posición sin Stop Loss. Haz clic para fijarlo."
                              >
                                ⚠️ Sin SL (Fijar)
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(pos);
                              }}
                              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors ml-0.5 cursor-pointer"
                              title="Configurar / Editar TP y SL (Órdenes Condicionales en Binance)"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>

                            {/* Quick Breakeven button if in profit */}
                            {isProfit && pos.entryPrice > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleQuickBreakeven(pos);
                                }}
                                className="px-1.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-[9px] font-bold transition-all ml-1 cursor-pointer active:scale-95 shadow-xs"
                                title={`Mover Stop Loss al precio de entrada ($${pos.entryPrice}) para asegurar el trade sin riesgo (Breakeven)`}
                              >
                                {beFeedback[pos.symbol] || '🛡️ BE'}
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 9. Seguimiento Táctico & Sparkline integrado */}
                      <td className="py-3 px-3 font-mono">
                        {(() => {
                          const tradeStatus = getTradeStatusAndPhase(pos, openOrders);
                          const hist = tradePriceHistoryService.getHistory(pos.symbol, pos.entryPrice);
                          return (
                            <div className="flex flex-col items-center gap-1 min-w-[130px]">
                              <TradePriceSparkline
                                history={hist}
                                entryPrice={pos.entryPrice}
                                currentPrice={effectiveMarketPrice}
                                isLong={isLong}
                                symbol={pos.symbol}
                                height={28}
                                showLabels={false}
                                className="w-full"
                              />

                              {/* Indicador de Hito Cruzado si ocurrió recientemente */}
                              {latestMilestoneAlert && (
                                <div
                                  className={`w-full px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border flex items-center justify-between shadow-2xs ${
                                    latestMilestoneAlert.milestone === 'SL'
                                      ? 'bg-rose-950/90 text-rose-300 border-rose-600 animate-pulse'
                                      : latestMilestoneAlert.milestone.startsWith('TP')
                                      ? 'bg-emerald-950/90 text-emerald-300 border-emerald-600'
                                      : 'bg-amber-950/90 text-amber-300 border-amber-600'
                                  }`}
                                  title={`Hito alcanzado: ${latestMilestoneAlert.message}`}
                                >
                                  <span className="flex items-center gap-1">
                                    <Volume2 className="w-2.5 h-2.5 text-amber-400" />
                                    <span>{latestMilestoneAlert.milestone} Cruzado</span>
                                  </span>
                                  <span className="text-[8px] opacity-80 font-normal">
                                    ${latestMilestoneAlert.triggerPrice.toFixed(2)}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between w-full text-[9px]">
                                {tradeStatus.multiPathState === 'TP1_ROUTE_DCA_CANCELED' ? (
                                  <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 flex items-center gap-1">
                                    <span>TP1 • X=E2 ❌</span>
                                  </span>
                                ) : tradeStatus.multiPathState === 'E2_ROUTE_ACTIVE' ? (
                                  <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/80 flex items-center gap-1">
                                    <span>E1 ➔ E2 DCA</span>
                                  </span>
                                ) : tradeStatus.multiPathState === 'SL_ROUTE_HIT' ? (
                                  <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-rose-950/90 text-rose-300 border border-rose-700/80 flex items-center gap-1">
                                    <span>🛑 SL Tocado</span>
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded font-mono font-bold bg-sky-950/90 text-sky-300 border border-sky-700/80 flex items-center gap-1">
                                    <span>E1 ⇄ [TP1 | E2]</span>
                                  </span>
                                )}
                                <span className="text-neutral-400 font-mono text-[9px]">
                                  {isExpanded ? '▲ Detalle' : '▼ Táctico'}
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 10. Estado del trade */}
                      <td className="py-3.5 px-3.5 text-right">
                        {(() => {
                          const tradeStatus = getTradeStatusAndPhase(pos, openOrders);
                          return (
                            <div className="flex items-center justify-end gap-3">
                              <div className="flex flex-col gap-0.5 text-left min-w-[170px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border flex items-center gap-1 shadow-2xs ${tradeStatus.badgeClass}`}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
                                    {tradeStatus.phaseBadge}
                                  </span>
                                  {tradeStatus.hasHitMilestone && (
                                    <span
                                      className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold"
                                      title="Hito alcanzado en la posición"
                                    >
                                      Hito Tocado
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] font-semibold text-neutral-200">
                                  {tradeStatus.milestonesHitText}
                                </div>
                                <div className="text-[10px] text-neutral-400 font-mono">
                                  {tradeStatus.nextMilestoneText}
                                </div>
                              </div>

                              {/* Emergency / Market Close Action */}
                              <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                                <EmergencyCloseButton
                                  symbol={pos.symbol}
                                  positionSize={pos.positionAmt}
                                  entryPrice={pos.entryPrice}
                                  unrealizedPnl={pos.unRealizedProfit}
                                  variant="danger"
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>

                    {/* Subfila: Barra Horizontal de Precios (Niveles vs. Precio Live + Precio de Entrada + Órdenes SL, TP y Limit) */}
                    <tr className="bg-neutral-950/70 border-b border-neutral-800">
                      <td colSpan={10} className="px-3 pt-1 pb-3">
                        <StrategyPriceLine
                          livePrice={effectiveMarketPrice}
                          entry1Price={e1Price}
                          entry2Price={e2Price}
                          entry3Price={e3Price}
                          actualEntryPrice={pos.entryPrice}
                          slPrice={slPrice}
                          tp1Price={tp1Price}
                          tp2Price={tp2Price}
                          tpFinalPrice={tp3Price}
                          hasHitSL={hasHitSL}
                          isInDangerZone={isInDangerZone}
                          isLong={isLong}
                          symbol={pos.symbol}
                          openOrders={openOrders}
                        />
                      </td>
                    </tr>

                    {/* Subfila Desplegable de Seguimiento Visual y Gráfico del Trade */}
                    {isExpanded && (
                      <PositionTacticalDetailRow
                        position={pos}
                        openOrders={openOrders}
                        onOpenEditModal={(p) => openEditModal(p)}
                        onLinkStrategy={(p) => setLinkPos(p)}
                        scored={scored}
                      />
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit TP/SL Modal */}
      {editingPos && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-5 w-full max-w-md flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Configurar TP / SL (Órdenes Condicionales)</h3>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Protección de posición mediante órdenes de condición en Binance
                </p>
              </div>
              <button onClick={() => setEditingPos(null)} className="text-neutral-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-center justify-between font-mono">
              <div>
                <span className="text-neutral-500">Par:</span> <strong className="text-white">{editingPos.symbol}</strong> ({editingPos.positionAmt > 0 ? 'LONG' : 'SHORT'})
              </div>
              <div>
                <span className="text-neutral-500">Entrada:</span> <strong className="text-amber-400">${(editingPos.entryPrice || 0).toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-neutral-500">Tamaño:</span> <strong className="text-neutral-200">{Math.abs(editingPos.positionAmt || 0).toFixed(3)}</strong>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                    <span>Take Profit (TP) - Precio de Activación</span>
                  </label>
                  {editTp && parseFloat(editTp) > 0 && (
                    <span className="text-[11px] font-mono text-emerald-300">
                      Est. PnL: +${Math.abs((parseFloat(editTp) - editingPos.entryPrice) * editingPos.positionAmt).toFixed(2)} USDT
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editTp}
                  onChange={(e) => setEditTp(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
                  placeholder="Ej: 850.00 (Dejar vacío para desactivar)"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-rose-400 font-semibold flex items-center gap-1">
                    <span>Stop Loss (SL) - Precio de Activación</span>
                  </label>
                  {editSl && parseFloat(editSl) > 0 && (
                    <span className="text-[11px] font-mono text-rose-300">
                      Est. PnL: -${Math.abs((editingPos.entryPrice - parseFloat(editSl)) * Math.abs(editingPos.positionAmt)).toFixed(2)} USDT
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={editSl}
                  onChange={(e) => setEditSl(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-sm font-mono text-rose-300 focus:border-rose-500 focus:outline-none"
                  placeholder="Ej: 750.00 (Dejar vacío para desactivar)"
                />
              </div>
            </div>

            <div className="bg-neutral-950/80 rounded-lg p-2.5 border border-neutral-800/80 text-[11px] text-neutral-400 leading-relaxed">
              <span className="text-amber-400 font-semibold">ℹ️ Nota de Sincronización:</span> Las órdenes TP y SL se colocan como órdenes condicionales de protección (Take Profit Market y Stop Market) y serán visibles de inmediato en la pestaña <strong className="text-white">Órdenes Abiertas</strong> bajo el filtro por condición.
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => setEditingPos(null)}
                className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTPSL}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
              >
                Guardar y Activar Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Risk Audit Modal */}
      <RiskAuditModal
        isOpen={!!auditPos}
        onClose={() => setAuditPos(null)}
        position={auditPos}
        walletBalance={balance.totalMarginBalance}
        onOpenLinkStrategy={() => {
          const current = auditPos;
          setAuditPos(null);
          setLinkPos(current);
        }}
        onOpenEditTPSL={() => {
          const current = auditPos;
          setAuditPos(null);
          if (current) openEditModal(current);
        }}
      />

      {/* Link Strategy Modal */}
      <LinkStrategyModal
        isOpen={!!linkPos}
        onClose={() => setLinkPos(null)}
        position={linkPos}
      />
    </div>
  );
};

