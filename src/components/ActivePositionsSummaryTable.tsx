import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  ExternalLink,
  Layers,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { PositionRisk, OpenOrder } from '../types/binance';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
import { EmergencyCloseButton } from './EmergencyCloseButton';
import { GoogleSheetStrategyRow } from '../types/strategy';

interface ActivePositionsSummaryTableProps {
  positions?: PositionRisk[];
  openOrders?: OpenOrder[];
  onSelectPosition?: (pos: PositionRisk) => void;
  onOpenEditTPSL?: (pos: PositionRisk) => void;
  onOpenTrailingStop?: (pos: PositionRisk) => void;
  onOpenOrderModal?: () => void;
}

export const ActivePositionsSummaryTable: React.FC<ActivePositionsSummaryTableProps> = ({
  positions: propPositions,
  openOrders: propOpenOrders,
  onSelectPosition,
  onOpenEditTPSL,
  onOpenTrailingStop,
  onOpenOrderModal,
}) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => propPositions || binanceWs.getPositions());
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>(() => propOpenOrders || binanceWs.getOpenOrders());
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => binanceWs.getIsSyncingData());
  const [, setPriceTick] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [beFeedback, setBeFeedback] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      if (!propPositions) setPositions(binanceWs.getPositions());
      if (!propOpenOrders) setOpenOrders(binanceWs.getOpenOrders());
      setBalance(binanceWs.getBalance());
      setIsSyncing(binanceWs.getIsSyncingData());
    });

    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });

    const unsubStrat = strategyService.subscribe(() => {
      setStrategies(strategyService.getStrategies());
    });

    return () => {
      unsubWs();
      unsubPrice();
      unsubStrat();
    };
  }, [propPositions, propOpenOrders]);

  // Sync props if provided
  useEffect(() => {
    if (propPositions) setPositions(propPositions);
  }, [propPositions]);

  useEffect(() => {
    if (propOpenOrders) setOpenOrders(propOpenOrders);
  }, [propOpenOrders]);

  // Map each active position with its linked strategy and live metrics
  const activePositionRows = useMemo(() => {
    return positions.map((pos, index) => {
      const isLong = pos.positionAmt > 0;
      const size = Math.abs(pos.positionAmt);
      const cleanSym = pos.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      // Get real-time live price from livePriceService or fallback to markPrice
      const liveWsPrice = livePriceService.getPrice(cleanSym);
      const currentPrice = liveWsPrice > 0 ? liveWsPrice : pos.markPrice > 0 ? pos.markPrice : pos.entryPrice;

      // Realized / Unrealized calculations
      const notional = pos.notional > 0 ? pos.notional : size * currentPrice;
      const isolatedMargin = pos.isolatedMargin > 0 ? pos.isolatedMargin : pos.leverage > 0 ? notional / pos.leverage : notional;
      
      const pnlDollar = isLong
        ? (currentPrice - pos.entryPrice) * size
        : (pos.entryPrice - currentPrice) * size;
      
      const unRealizedProfit = pos.unRealizedProfit !== 0 ? pos.unRealizedProfit : pnlDollar;
      const roePct = isolatedMargin > 0 ? (unRealizedProfit / isolatedMargin) * 100 : 0;
      const priceDiffPct = pos.entryPrice > 0 ? ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;

      // Find linked strategy
      const linkedStrategy = strategies.find((st) => {
        const stratSym = (st.par || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return stratSym === cleanSym;
      });

      // Find effective TP and SL from position or open orders
      const matchingOrders = openOrders.filter(
        (o) => o.symbol === pos.symbol && o.status !== 'CANCELED' && o.status !== 'EXPIRED' && o.status !== 'FILLED'
      );

      const tpOrder = matchingOrders.find((o) => {
        const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
        if (!isCloseSide) return false;
        const typeStr = String(o.type || '').toUpperCase();
        if (typeStr.includes('TAKE_PROFIT') || o.clientOrderId?.includes('TP-')) return true;
        const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
        return trig > 0 && (isLong ? trig > pos.entryPrice : trig < pos.entryPrice);
      });

      const slOrder = matchingOrders.find((o) => {
        const isCloseSide = isLong ? o.side === 'SELL' : o.side === 'BUY';
        if (!isCloseSide) return false;
        const typeStr = String(o.type || '').toUpperCase();
        if (typeStr.includes('STOP') || o.clientOrderId?.includes('SL-')) return true;
        const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
        return trig > 0 && (isLong ? trig < pos.entryPrice : trig > pos.entryPrice);
      });

      const tpPrice = pos.takeProfit || (tpOrder ? (tpOrder.stopPrice > 0 ? tpOrder.stopPrice : tpOrder.price) : undefined);
      const slPrice = pos.stopLoss || (slOrder ? (slOrder.stopPrice > 0 ? slOrder.stopPrice : slOrder.price) : undefined);

      // Distance to TP and SL
      const distToTpPct = tpPrice && currentPrice > 0
        ? isLong
          ? ((tpPrice - currentPrice) / currentPrice) * 100
          : ((currentPrice - tpPrice) / currentPrice) * 100
        : null;

      const distToSlPct = slPrice && currentPrice > 0
        ? isLong
          ? ((currentPrice - slPrice) / currentPrice) * 100
          : ((slPrice - currentPrice) / currentPrice) * 100
        : null;

      return {
        index: index + 1,
        position: pos,
        isLong,
        size,
        cleanSym,
        currentPrice,
        notional,
        isolatedMargin,
        unRealizedProfit,
        roePct,
        priceDiffPct,
        linkedStrategy,
        tpPrice,
        slPrice,
        distToTpPct,
        distToSlPct,
        hasSL: Boolean(slPrice && slPrice > 0),
        hasTP: Boolean(tpPrice && tpPrice > 0),
      };
    });
  }, [positions, openOrders, strategies]);

  // Aggregate stats for the top summary strip
  const totals = useMemo(() => {
    let totalPnl = 0;
    let totalMargin = 0;
    let totalNotional = 0;
    let longCount = 0;
    let shortCount = 0;
    let winningCount = 0;
    let losingCount = 0;
    let missingSlCount = 0;

    activePositionRows.forEach((r) => {
      totalPnl += r.unRealizedProfit;
      totalMargin += r.isolatedMargin;
      totalNotional += r.notional;
      if (r.isLong) longCount++;
      else shortCount++;
      if (r.unRealizedProfit >= 0) winningCount++;
      else losingCount++;
      if (!r.hasSL) missingSlCount++;
    });

    const totalRoe = totalMargin > 0 ? (totalPnl / totalMargin) * 100 : 0;

    return {
      count: activePositionRows.length,
      totalPnl,
      totalMargin,
      totalNotional,
      totalRoe,
      longCount,
      shortCount,
      winningCount,
      losingCount,
      missingSlCount,
    };
  }, [activePositionRows]);

  const handleQuickBreakeven = async (pos: PositionRisk) => {
    if (!pos.entryPrice || pos.entryPrice <= 0) return;
    try {
      await binanceWs.updatePositionTPSL(pos.symbol, pos.takeProfit, pos.entryPrice);
      setBeFeedback((prev) => ({ ...prev, [pos.symbol]: '¡BE Fijado!' }));
      setTimeout(() => {
        setBeFeedback((prev) => {
          const next = { ...prev };
          delete next[pos.symbol];
          return next;
        });
      }, 3000);
    } catch {
      setBeFeedback((prev) => ({ ...prev, [pos.symbol]: 'Error' }));
      setTimeout(() => {
        setBeFeedback((prev) => {
          const next = { ...prev };
          delete next[pos.symbol];
          return next;
        });
      }, 3000);
    }
  };

  if (activePositionRows.length === 0) {
    return (
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Tabla Resumen de Posiciones Activas</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-neutral-800 text-neutral-400 font-normal">
                0 abiertas
              </span>
            </h4>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              No tienes posiciones abiertas en este momento. Ejecuta una estrategia o abre una nueva orden para comenzar a monitorear.
            </p>
          </div>
        </div>
        {onOpenOrderModal && (
          <button
            type="button"
            onClick={onOpenOrderModal}
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-neutral-950" />
            <span>Nueva Orden</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      id="active-positions-summary-table-container"
      className="bg-neutral-900/95 border-2 border-amber-500/40 rounded-xl overflow-hidden shadow-xl flex flex-col transition-all ring-1 ring-amber-500/10 mb-2"
    >
      {/* 1. Header Bar con KPIs Globales de un Vistazo */}
      <div className="px-3.5 py-2.5 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Resumen de Posiciones Activas (De un Vistazo)
            </h3>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {totals.count} Posición{totals.count !== 1 ? 'es' : ''} ({totals.longCount}L / {totals.shortCount}S)
            </span>
          </div>
        </div>

        {/* KPIs Consolidada Rápida */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* PnL Flotante Consolidado */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold border ${
            totals.totalPnl >= 0
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
          }`}>
            {totals.totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            <span>
              PnL Total: {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT ({totals.totalRoe >= 0 ? '+' : '-'}{Math.abs(totals.totalRoe).toFixed(2)}% ROE)
            </span>
          </div>

          {/* Margen Comprometido */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-[11px]">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Margen: <strong className="text-white">${totals.totalMargin.toFixed(2)}</strong></span>
          </div>

          {/* Nocional Total */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-[11px]">
            <span>Nocional: <strong className="text-white">${totals.totalNotional.toFixed(2)}</strong></span>
          </div>

          {/* Alerta si falta SL */}
          {totals.missingSlCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-500/50 font-bold text-[10px] animate-pulse">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>{totals.missingSlCount} Sin SL</span>
            </div>
          )}

          {/* Botón Sincronizar */}
          <button
            type="button"
            onClick={() => binanceWs.syncAllAccountData()}
            disabled={isSyncing}
            className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Sincronizar posiciones en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Minimizar / Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir tabla resumen' : 'Minimizar tabla resumen'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Tabla de Alta Densidad Resumida */}
      {!isCollapsed && (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-neutral-950/90 text-neutral-400 text-[11px] font-semibold border-b border-neutral-800 uppercase tracking-wider font-mono">
                <th className="py-2 px-3 text-center" style={{ width: '40px' }}>#</th>
                <th className="py-2 px-3" style={{ minWidth: '130px' }}>Par / Dirección</th>
                <th className="py-2 px-3 text-start" style={{ minWidth: '110px' }}>Estrategia</th>
                <th className="py-2 px-3 text-right" style={{ minWidth: '110px' }}>Tamaño / Nocional</th>
                <th className="py-2 px-3 text-right" style={{ minWidth: '130px' }}>Entrada ➔ Live</th>
                <th className="py-2 px-3 text-right" style={{ minWidth: '130px' }}>PnL Flotante (ROE)</th>
                <th className="py-2 px-3 text-center" style={{ minWidth: '130px' }}>Protección TP / SL</th>
                <th className="py-2 px-3 text-right" style={{ minWidth: '95px' }}>Margen Aislado</th>
                <th className="py-2 px-3 text-center" style={{ width: '135px' }}>Acciones Rápidas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 bg-neutral-900/60 font-sans">
              {activePositionRows.map((r) => {
                const isWinner = r.unRealizedProfit >= 0;
                const pos = r.position;

                return (
                  <tr
                    key={pos.symbol}
                    className={`hover:bg-neutral-800/60 transition-colors ${
                      !r.hasSL ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    {/* # Íncice */}
                    <td className="py-2 px-3 text-center font-mono text-neutral-500 font-bold text-[11px]">
                      {r.index}
                    </td>

                    {/* Par y Dirección (LONG / SHORT + LEVERAGE) */}
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${isWinner ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                        <span className="font-bold text-white font-mono text-xs">
                          {pos.symbol}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-tight ${
                            r.isLong
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {r.isLong ? 'LONG' : 'SHORT'} {pos.leverage}X
                        </span>
                      </div>
                    </td>

                    {/* Estrategia Vinculada */}
                    <td className="py-2 px-3 text-start">
                      {r.linkedStrategy ? (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                            #{r.linkedStrategy.noEstrategia}
                          </span>
                          <span className="text-neutral-300 truncate max-w-[90px]" title={r.linkedStrategy.nombreEstrategia}>
                            {r.linkedStrategy.nombreEstrategia}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-neutral-500 italic font-mono">
                          Manual / Discrecional
                        </span>
                      )}
                    </td>

                    {/* Tamaño & Nocional */}
                    <td className="py-2 px-3 text-right font-mono">
                      <div className="text-white font-semibold text-xs">
                        {r.size.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        ${r.notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Entrada ➔ Live */}
                    <td className="py-2 px-3 text-right font-mono">
                      <div className="text-neutral-300 text-[11px]">
                        Entr: <strong className="text-white">${formatPriceUtil(pos.entryPrice)}</strong>
                      </div>
                      <div className={`text-xs font-bold flex items-center justify-end gap-1 ${
                        isWinner ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <span>Live: ${formatPriceUtil(r.currentPrice)}</span>
                        <span className="text-[10px] font-normal">
                          ({r.priceDiffPct >= 0 ? '+' : ''}{r.priceDiffPct.toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    {/* PnL Flotante & ROE */}
                    <td className="py-2 px-3 text-right font-mono">
                      <div className={`text-xs font-extrabold flex items-center justify-end gap-1 ${
                        isWinner ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isWinner ? '+' : '-'}${Math.abs(r.unRealizedProfit).toFixed(2)}
                      </div>
                      <div className={`text-[10px] font-bold ${
                        r.roePct >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {r.roePct >= 0 ? '+' : ''}{r.roePct.toFixed(2)}% ROE
                      </div>
                    </td>

                    {/* Protección TP / SL */}
                    <td className="py-2 px-3 text-center font-mono text-[11px]">
                      <div className="flex items-center justify-center gap-2">
                        {/* TP */}
                        {r.hasTP ? (
                          <div className="flex items-center gap-0.5 text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30" title={`TP: $${formatPriceUtil(r.tpPrice!)}`}>
                            <span className="text-[9px] font-bold">TP:</span>
                            <span className="font-semibold">${formatPriceUtil(r.tpPrice!)}</span>
                            {r.distToTpPct !== null && (
                              <span className="text-[9px] text-emerald-300/80">({r.distToTpPct >= 0 ? '+' : ''}{r.distToTpPct.toFixed(1)}%)</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-neutral-500 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
                            Sin TP
                          </span>
                        )}

                        {/* SL */}
                        {r.hasSL ? (
                          <div className="flex items-center gap-0.5 text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-500/30" title={`SL: $${formatPriceUtil(r.slPrice!)}`}>
                            <span className="text-[9px] font-bold">SL:</span>
                            <span className="font-semibold">${formatPriceUtil(r.slPrice!)}</span>
                            {r.distToSlPct !== null && (
                              <span className="text-[9px] text-rose-300/80">({r.distToSlPct.toFixed(1)}%)</span>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-0.5 text-rose-300 bg-rose-950/90 px-1.5 py-0.5 rounded border border-rose-500/60 font-bold text-[10px] animate-pulse">
                            <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
                            <span>¡SIN SL!</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Margen Aislado */}
                    <td className="py-2 px-3 text-right font-mono">
                      <div className="text-amber-300 font-bold text-xs">
                        ${r.isolatedMargin.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        {balance.totalMarginBalance > 0
                          ? `${((r.isolatedMargin / balance.totalMarginBalance) * 100).toFixed(1)}% cuenta`
                          : 'Aislado'}
                      </div>
                    </td>

                    {/* Acciones Rápidas */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Botón BE Rápido */}
                        <button
                          type="button"
                          onClick={() => handleQuickBreakeven(pos)}
                          disabled={beFeedback[pos.symbol] !== undefined}
                          className="px-1.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-[10px] font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Fijar Stop Loss a Precio de Entrada (Breakeven)"
                        >
                          {beFeedback[pos.symbol] || 'BE'}
                        </button>

                        {/* Botón Editar TP/SL */}
                        {onOpenEditTPSL && (
                          <button
                            type="button"
                            onClick={() => onOpenEditTPSL(pos)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Editar Parámetros TP / SL"
                          >
                            <Edit2 className="w-3 h-3 text-amber-400" />
                          </button>
                        )}

                        {/* Botón Trailing Stop */}
                        {onOpenTrailingStop && (
                          <button
                            type="button"
                            onClick={() => onOpenTrailingStop(pos)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Configurar Trailing Stop Dinámico por ATR"
                          >
                            <Sliders className="w-3 h-3 text-cyan-400" />
                          </button>
                        )}

                        {/* Botón Ficha Táctica / Inspección */}
                        {onSelectPosition && (
                          <button
                            type="button"
                            onClick={() => onSelectPosition(pos)}
                            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Ver Ficha Táctica Completa e Hitos"
                          >
                            <ExternalLink className="w-3 h-3 text-blue-400" />
                          </button>
                        )}

                        {/* Botón Cierre de Emergencia */}
                        <EmergencyCloseButton
                          symbol={pos.symbol}
                          positionSize={r.size}
                          entryPrice={pos.entryPrice}
                          unrealizedPnl={r.unRealizedProfit}
                          variant="compact"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer con Totales Consolidados */}
            <tfoot>
              <tr className="bg-neutral-950 font-mono font-bold text-xs border-t-2 border-neutral-800 text-neutral-300">
                <td colSpan={3} className="py-2.5 px-3 text-start">
                  <div className="flex items-center gap-2">
                    <span className="text-white uppercase tracking-wider">Totales Consolidados:</span>
                    <span className="text-[11px] text-amber-400 font-normal">
                      ({totals.winningCount} en Ganancia / {totals.losingCount} en Pérdida)
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right text-white">
                  ${totals.totalNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-2.5 px-3 text-right text-neutral-400 text-[11px]">
                  En {totals.count} posiciones
                </td>
                <td className={`py-2.5 px-3 text-right ${
                  totals.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <div className="text-xs font-extrabold">
                    {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT
                  </div>
                  <div className="text-[10px]">
                    {totals.totalRoe >= 0 ? '+' : ''}{totals.totalRoe.toFixed(2)}% ROE Total
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center text-neutral-400 text-[11px]">
                  {totals.missingSlCount === 0 ? (
                    <span className="text-emerald-400 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>100% Protegidas con SL</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      <span>{totals.missingSlCount} sin Stop Loss</span>
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-3 text-right text-amber-300">
                  ${totals.totalMargin.toFixed(2)}
                </td>
                <td className="py-2.5 px-3 text-center text-neutral-400 text-[11px]">
                  {totals.count} Aisladas
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
