import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
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
import { TrailingStopConfigModal } from './TrailingStopConfigModal';
import { trailingStopService } from '../services/trailingStopService';
import { GoogleSheetStrategyRow } from '../types/strategy';

interface ActivePositionsSummaryTableProps {
  positions?: PositionRisk[];
  openOrders?: OpenOrder[];
  onSelectPosition?: (pos: PositionRisk) => void;
  onOpenEditTPSL?: (pos: PositionRisk) => void;
  onOpenTrailingStop?: (pos: PositionRisk) => void;
  onOpenOrderModal?: () => void;
}

/**
 * MiniPriceGauge: Línea de precios ultra-gráfica que visualiza el corredor SL -> Entrada -> Live -> TPs
 */
const MiniPriceGauge: React.FC<{
  isLong: boolean;
  entryPrice: number;
  currentPrice: number;
  slPrice?: number;
  stratSl?: number;
  tpPrice?: number;
  tp1?: number;
  tp1Pct?: string | number;
  tp2?: number;
  tp2Pct?: string | number;
  tp3?: number;
  tp3Pct?: string | number;
  e1?: number;
  e1Pct?: string | number;
  e2?: number;
  e2Pct?: string | number;
  e3?: number;
  e3Pct?: string | number;
  distToTpPct?: number | null;
  distToSlPct?: number | null;
}> = ({
  isLong,
  entryPrice,
  currentPrice,
  slPrice,
  stratSl,
  tpPrice,
  tp1,
  tp1Pct,
  tp2,
  tp2Pct,
  tp3,
  tp3Pct,
  e1,
  e2,
  e3,
  distToTpPct,
  distToSlPct,
}) => {
  const effectiveSl = slPrice && slPrice > 0 ? slPrice : stratSl && stratSl > 0 ? stratSl : undefined;
  const effectiveTp = tp3 && tp3 > 0 ? tp3 : tp2 && tp2 > 0 ? tp2 : tp1 && tp1 > 0 ? tp1 : tpPrice && tpPrice > 0 ? tpPrice : undefined;

  const isWinner = isLong ? currentPrice >= entryPrice : currentPrice <= entryPrice;

  // Calculamos los límites del corredor visual (0% a la izquierda = Zona de Riesgo/SL, 100% a la derecha = Zona de Beneficio/TPs)
  let lowBound = 0;
  let highBound = 0;

  if (isLong) {
    lowBound = effectiveSl ? Math.min(effectiveSl, entryPrice * 0.96) : entryPrice * 0.97;
    highBound = effectiveTp ? Math.max(effectiveTp, entryPrice * 1.04) : entryPrice * 1.05;
    if (currentPrice < lowBound) lowBound = currentPrice * 0.99;
    if (currentPrice > highBound) highBound = currentPrice * 1.01;
  } else {
    // Para short: precio más alto = SL (izquierda), precio más bajo = TP (derecha)
    highBound = effectiveSl ? Math.max(effectiveSl, entryPrice * 1.04) : entryPrice * 1.03;
    lowBound = effectiveTp ? Math.min(effectiveTp, entryPrice * 0.96) : entryPrice * 0.95;
    if (currentPrice > highBound) highBound = currentPrice * 1.01;
    if (currentPrice < lowBound) lowBound = currentPrice * 0.99;
  }

  const getPercent = (p: number) => {
    if (highBound <= lowBound) return 50;
    if (isLong) {
      return Math.max(5, Math.min(95, ((p - lowBound) / (highBound - lowBound)) * 100));
    } else {
      return Math.max(5, Math.min(95, ((highBound - p) / (highBound - lowBound)) * 100));
    }
  };

  const slPct = effectiveSl ? getPercent(effectiveSl) : 6;
  const entryPct = getPercent(entryPrice);
  const currentPct = getPercent(currentPrice);
  const tp1PctVal = tp1 && tp1 > 0 ? getPercent(tp1) : null;
  const tp2PctVal = tp2 && tp2 > 0 ? getPercent(tp2) : null;
  const tp3PctVal = tp3 && tp3 > 0 ? getPercent(tp3) : null;
  const tpOrderPctVal = !tp1 && tpPrice && tpPrice > 0 ? getPercent(tpPrice) : null;

  return (
    <div className="flex flex-col gap-1.5 w-full min-w-[280px] max-w-[380px]">
      {/* 1. Mini Línea Gráfica de Precios */}
      <div className="relative w-full h-6 bg-neutral-950 rounded-lg border border-neutral-800 flex items-center px-2 select-none shadow-inner overflow-hidden">
        {/* Fondo de zona de riesgo (Rojo) */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-rose-950/40 border-r border-rose-500/20"
          style={{ width: `${entryPct}%` }}
        />
        {/* Fondo de zona de ganancia (Verde) */}
        <div
          className="absolute top-0 bottom-0 right-0 bg-emerald-950/40 border-l border-emerald-500/20"
          style={{ width: `${100 - entryPct}%` }}
        />

        {/* Guía central */}
        <div className="absolute left-2 right-2 h-1 bg-neutral-800/90 rounded-full" />

        {/* Barra de progreso de precio actual */}
        <div
          className={`absolute h-1.5 rounded-full transition-all duration-300 ${
            isWinner
              ? 'bg-gradient-to-r from-sky-400 via-emerald-400 to-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
              : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
          }`}
          style={{
            left: `${Math.min(entryPct, currentPct)}%`,
            width: `${Math.max(2, Math.abs(currentPct - entryPct))}%`,
          }}
        />

        {/* Marcador SL */}
        {effectiveSl ? (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
            style={{ left: `${slPct}%`, transform: 'translateX(-50%)' }}
            title={`Stop Loss: $${formatPriceUtil(effectiveSl)}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-200 shadow-sm flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          </div>
        ) : (
          <div
            className="absolute left-1.5 flex items-center z-10"
            title="¡Sin Stop Loss Configurado!"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping opacity-80" />
          </div>
        )}

        {/* Marcador Entrada (E) */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
          style={{ left: `${entryPct}%`, transform: 'translateX(-50%)' }}
          title={`Precio de Entrada: $${formatPriceUtil(entryPrice)}`}
        >
          <div className="w-2.5 h-2.5 rotate-45 bg-sky-400 border border-sky-100 shadow-sm" />
        </div>

        {/* Marcadores TP */}
        {tp1PctVal !== null && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
            style={{ left: `${tp1PctVal}%`, transform: 'translateX(-50%)' }}
            title={`TP1: $${formatPriceUtil(tp1!)}`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-200 shadow-xs" />
          </div>
        )}
        {tp2PctVal !== null && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
            style={{ left: `${tp2PctVal}%`, transform: 'translateX(-50%)' }}
            title={`TP2: $${formatPriceUtil(tp2!)}`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-400 border border-emerald-200 shadow-xs" />
          </div>
        )}
        {tp3PctVal !== null && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
            style={{ left: `${tp3PctVal}%`, transform: 'translateX(-50%)' }}
            title={`TP3 / Final: $${formatPriceUtil(tp3!)}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-300 border border-white shadow-sm" />
          </div>
        )}
        {tpOrderPctVal !== null && (
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
            style={{ left: `${tpOrderPctVal}%`, transform: 'translateX(-50%)' }}
            title={`TP Orden: $${formatPriceUtil(tpPrice!)}`}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-sm" />
          </div>
        )}

        {/* Marcador Precio en Vivo (LIVE SPOT PIN) */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-20 transition-all duration-300"
          style={{ left: `${currentPct}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className={`w-4 h-4 rounded-full flex items-center justify-center shadow-[0_0_10px_rgba(255,255,255,0.8)] ${
              isWinner
                ? 'bg-emerald-400 text-neutral-950 ring-2 ring-emerald-300 animate-pulse'
                : 'bg-rose-500 text-white ring-2 ring-rose-300 animate-pulse'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
          </div>
        </div>
      </div>

      {/* 2. Desglose Numérico con badges de alta legibilidad */}
      <div className="flex items-center justify-between gap-1 text-xs font-mono flex-wrap">
        {/* SL */}
        {effectiveSl ? (
          <div
            className="flex items-center gap-1 bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded border border-rose-500/40 font-bold"
            title={distToSlPct !== null ? `Distancia al SL: ${distToSlPct.toFixed(1)}%` : undefined}
          >
            <span className="text-[10px] text-rose-400 uppercase">SL:</span>
            <span className="text-xs text-rose-200 font-extrabold">${formatPriceUtil(effectiveSl)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-rose-950 text-rose-300 px-2 py-0.5 rounded border border-rose-500/80 text-xs font-bold animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>SIN SL</span>
          </div>
        )}

        {/* Entrada */}
        <div className="flex items-center gap-1 bg-neutral-950 text-sky-300 px-2 py-0.5 rounded border border-neutral-800 font-bold">
          <span className="text-[10px] text-sky-400 uppercase">E:</span>
          <span className="text-xs text-sky-200 font-extrabold">${formatPriceUtil(entryPrice)}</span>
          {e2 && e2 > 0 ? <span className="text-[10px] text-neutral-400">+{formatPriceUtil(e2)}</span> : null}
        </div>

        {/* Live */}
        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border font-extrabold ${
          isWinner
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-xs'
            : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-xs'
        }`}>
          <span className="text-[10px] text-neutral-300 uppercase">Live:</span>
          <span className="text-xs font-black">${formatPriceUtil(currentPrice)}</span>
        </div>

        {/* Take Profits */}
        {effectiveTp ? (
          <div
            className="flex items-center gap-1 bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/40 font-bold"
            title={distToTpPct !== null ? `Distancia al TP: ${distToTpPct >= 0 ? '+' : ''}${distToTpPct.toFixed(1)}%` : undefined}
          >
            <span className="text-[10px] text-emerald-400 uppercase">TP:</span>
            <span className="text-xs text-emerald-200 font-extrabold">${formatPriceUtil(tp1 && tp1 > 0 ? tp1 : effectiveTp)}</span>
            {tp2 && tp2 > 0 ? <span className="text-[10px] text-emerald-400/80">/ {formatPriceUtil(tp2)}</span> : null}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 bg-neutral-950 px-2 py-0.5 rounded border border-neutral-800">
            Sin TP
          </div>
        )}
      </div>
    </div>
  );
};

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
  const [, setTsTick] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [beFeedback, setBeFeedback] = useState<Record<string, string>>({});
  const [selectedTrailingPos, setSelectedTrailingPos] = useState<PositionRisk | null>(null);

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

    const unsubTs = trailingStopService.subscribe(() => {
      setTsTick((prev) => prev + 1);
    });

    return () => {
      unsubWs();
      unsubPrice();
      unsubStrat();
      unsubTs();
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

      // Parse strategy price levels if linked
      const stratPrices = linkedStrategy ? parsePricesFromStrategy(linkedStrategy) : null;
      const e1 = stratPrices?.entry1Price || pos.entryPrice;
      const e1Pct = stratPrices?.entry1Pct;
      const e2 = stratPrices?.entry2Price || 0;
      const e2Pct = stratPrices?.entry2Pct;
      const e3 = stratPrices?.entry3Price || 0;
      const e3Pct = stratPrices?.entry3Pct;

      const tp1 = stratPrices?.tp1Price || 0;
      const tp1Pct = stratPrices?.tp1Pct;
      const tp2 = stratPrices?.tp2Price || 0;
      const tp2Pct = stratPrices?.tp2Pct;
      const tp3 = stratPrices?.tpFinalPrice || 0;
      const tp3Pct = stratPrices?.tpFinalPct;
      const stratSl = stratPrices?.slPrice || 0;

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
        if (typeStr.includes('STOP') || o.clientOrderId?.includes('SL-') || o.clientOrderId?.includes('CLS-')) return true;
        const trig = o.stopPrice && o.stopPrice > 0 ? o.stopPrice : 0;
        return trig > 0 && (isLong ? trig < pos.entryPrice : trig > pos.entryPrice);
      });

      const tpPrice = pos.takeProfit || (tpOrder ? (tpOrder.stopPrice > 0 ? tpOrder.stopPrice : tpOrder.price) : (tp1 > 0 ? tp1 : undefined));
      const slPrice = pos.stopLoss || (slOrder ? (slOrder.stopPrice > 0 ? slOrder.stopPrice : slOrder.price) : (stratSl > 0 ? stratSl : undefined));

      // Distance to TP and SL
      const distToTpPct = tpPrice && currentPrice > 0
        ? isLong
          ? ((tpPrice - currentPrice) / currentPrice) * 100
          : ((currentPrice - tpPrice) / currentPrice) * 100
        : null;

      const distToSlPct = slPrice && currentPrice > 0
        ? isLong
          ? ((slPrice - currentPrice) / currentPrice) * 100
          : ((currentPrice - slPrice) / currentPrice) * 100
        : null;

      // Active trailing stop status
      const activeTrailingStop = trailingStopService.getTrailingStopForSymbol(cleanSym);

      return {
        index: index + 1,
        position: pos,
        cleanSym,
        currentPrice,
        size,
        notional,
        isolatedMargin,
        isLong,
        unRealizedProfit,
        roePct,
        priceDiffPct,
        linkedStrategy,
        stratPrices,
        e1,
        e1Pct,
        e2,
        e2Pct,
        e3,
        e3Pct,
        tp1,
        tp1Pct,
        tp2,
        tp2Pct,
        tp3,
        tp3Pct,
        stratSl,
        tpPrice,
        slPrice,
        distToTpPct,
        distToSlPct,
        hasSL: Boolean(slPrice && slPrice > 0),
        hasTP: Boolean((tpPrice && tpPrice > 0) || tp1 > 0 || tp2 > 0 || tp3 > 0),
        activeTrailingStop,
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
          <div className="w-9 h-9 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Tabla Resumen de Posiciones Activas</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
                0 abiertas
              </span>
            </h4>
            <p className="text-xs text-neutral-400 mt-0.5">
              No tienes posiciones abiertas en este momento. Ejecuta una estrategia o abre una nueva orden para comenzar a monitorear.
            </p>
          </div>
        </div>
        {onOpenOrderModal && (
          <button
            type="button"
            onClick={onOpenOrderModal}
            className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-neutral-950" />
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
      {/* 1. Header Bar con KPIs Globales con Números Grandes y Nítidos */}
      <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Resumen de Posiciones Activas
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {totals.count} Posición{totals.count !== 1 ? 'es' : ''} ({totals.longCount}L / {totals.shortCount}S)
            </span>
          </div>
        </div>

        {/* KPIs Consolidada Rápida */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* PnL Flotante Consolidado */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-black border text-sm sm:text-base ${
            totals.totalPnl >= 0
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
          }`}>
            {totals.totalPnl >= 0 ? <TrendingUp className="w-4 h-4 text-emerald-400" /> : <TrendingDown className="w-4 h-4 text-rose-400" />}
            <span>
              PnL Total: {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT
            </span>
            <span className="text-xs font-bold px-1.5 py-0.2 rounded bg-black/40">
              {totals.totalRoe >= 0 ? '+' : '-'}{Math.abs(totals.totalRoe).toFixed(2)}% ROE
            </span>
          </div>

          {/* Margen Comprometido */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-xs sm:text-sm">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Margen: <strong className="text-white font-bold">${totals.totalMargin.toFixed(2)}</strong></span>
          </div>

          {/* Nocional Total */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-xs sm:text-sm">
            <span>Nocional: <strong className="text-white font-bold">${totals.totalNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>

          {/* Alerta si falta SL */}
          {totals.missingSlCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-950/90 text-rose-300 border border-rose-500/60 font-bold text-xs animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{totals.missingSlCount} Sin SL</span>
            </div>
          )}

          {/* Botón Sincronizar */}
          <button
            type="button"
            onClick={() => binanceWs.syncAllAccountData()}
            disabled={isSyncing}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Sincronizar posiciones en tiempo real"
          >
            <RefreshCw className={`w-4 h-4 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Minimizar / Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir tabla resumen' : 'Minimizar tabla resumen'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 2. Tabla de Alta Densidad Resumida */}
      {!isCollapsed && (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/90 text-neutral-400 text-xs font-bold border-b border-neutral-800 uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3 text-center" style={{ width: '45px' }}>#</th>
                <th className="py-2.5 px-3" style={{ minWidth: '140px' }}>Par / Dirección</th>
                <th className="py-2.5 px-3 text-right" style={{ minWidth: '120px' }}>Tamaño / Nocional</th>
                <th className="py-2.5 px-3 text-right" style={{ minWidth: '140px' }}>Entrada ➔ Live</th>
                <th className="py-2.5 px-3 text-right" style={{ minWidth: '140px' }}>PnL Flotante (ROE)</th>
                <th className="py-2.5 px-3 text-start" style={{ minWidth: '310px' }}>Protección &amp; Niveles (E / TP / SL)</th>
                <th className="py-2.5 px-3 text-right" style={{ minWidth: '105px' }}>Margen Aislado</th>
                <th className="py-2.5 px-3 text-center" style={{ minWidth: '190px' }}>Acciones Rápidas</th>
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
                    {/* # Índice */}
                    <td className="py-3 px-3 text-center font-mono text-neutral-400 font-bold text-xs">
                      {r.index}
                    </td>

                    {/* Par y Dirección (LONG / SHORT + LEVERAGE) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isWinner ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]'}`} />
                        <span className="font-extrabold text-white font-mono text-sm tracking-tight">
                          {pos.symbol}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-mono font-bold tracking-tight ${
                            r.isLong
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {r.isLong ? 'LONG' : 'SHORT'} {pos.leverage}X
                        </span>
                      </div>
                    </td>

                    {/* Tamaño & Nocional */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="text-white font-bold text-sm">
                        {r.size.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                      </div>
                      <div className="text-xs text-neutral-300 font-medium">
                        ${r.notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </td>

                    {/* Entrada ➔ Live */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="text-neutral-300 text-xs font-medium">
                        Entr: <strong className="text-white font-semibold">${formatPriceUtil(pos.entryPrice)}</strong>
                      </div>
                      <div className={`text-sm font-extrabold flex items-center justify-end gap-1 ${
                        isWinner ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <span>Live: ${formatPriceUtil(r.currentPrice)}</span>
                        <span className="text-xs font-bold">
                          ({r.priceDiffPct >= 0 ? '+' : ''}{r.priceDiffPct.toFixed(2)}%)
                        </span>
                      </div>
                    </td>

                    {/* PnL Flotante & ROE */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className={`text-sm sm:text-base font-black flex items-center justify-end gap-1 ${
                        isWinner ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isWinner ? '+' : '-'}${Math.abs(r.unRealizedProfit).toFixed(2)}
                      </div>
                      <div className={`text-xs font-bold ${
                        r.roePct >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}>
                        {r.roePct >= 0 ? '+' : ''}{r.roePct.toFixed(2)}% ROE
                      </div>
                    </td>

                    {/* Protección & Niveles: Mini Línea Gráfica de Precios */}
                    <td className="py-3 px-3 font-mono">
                      <MiniPriceGauge
                        isLong={r.isLong}
                        entryPrice={pos.entryPrice}
                        currentPrice={r.currentPrice}
                        slPrice={r.slPrice}
                        stratSl={r.stratSl}
                        tpPrice={r.tpPrice}
                        tp1={r.tp1}
                        tp1Pct={r.tp1Pct}
                        tp2={r.tp2}
                        tp2Pct={r.tp2Pct}
                        tp3={r.tp3}
                        tp3Pct={r.tp3Pct}
                        e1={r.e1}
                        e2={r.e2}
                        e3={r.e3}
                        distToTpPct={r.distToTpPct}
                        distToSlPct={r.distToSlPct}
                      />
                    </td>

                    {/* Margen Aislado */}
                    <td className="py-3 px-3 text-right font-mono">
                      <div className="text-amber-300 font-extrabold text-sm">
                        ${r.isolatedMargin.toFixed(2)}
                      </div>
                      <div className="text-xs text-neutral-400">
                        {balance.totalMarginBalance > 0
                          ? `${((r.isolatedMargin / balance.totalMarginBalance) * 100).toFixed(1)}% cuenta`
                          : 'Aislado'}
                      </div>
                    </td>

                    {/* Acciones Rápidas */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {/* Botón Breakeven Rápido */}
                        <button
                          type="button"
                          onClick={() => handleQuickBreakeven(pos)}
                          disabled={beFeedback[pos.symbol] !== undefined}
                          className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                          title="Fijar Stop Loss a Precio de Entrada (Breakeven)"
                        >
                          {beFeedback[pos.symbol] || 'BE'}
                        </button>

                        {/* Botón Trailing Stop Dinámico */}
                        <button
                          type="button"
                          onClick={() => {
                            if (onOpenTrailingStop) onOpenTrailingStop(pos);
                            setSelectedTrailingPos(pos);
                          }}
                          className={`px-2 py-1 rounded flex items-center gap-1 text-xs font-mono font-bold transition-all shadow-xs cursor-pointer active:scale-95 border ${
                            r.activeTrailingStop
                              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/70 shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 border-neutral-700 hover:border-cyan-500/50'
                          }`}
                          title="Configurar Trailing Stop Dinámico por ATR (Callback Rate y Activación inteligente)"
                        >
                          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-cyan-400/30" />
                          <span>{r.activeTrailingStop ? `TS ${r.activeTrailingStop.callbackRate}%` : 'TS Dinámico'}</span>
                        </button>

                        {/* Botón Editar TP/SL */}
                        {onOpenEditTPSL && (
                          <button
                            type="button"
                            onClick={() => onOpenEditTPSL(pos)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Editar Parámetros TP / SL"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}

                        {/* Botón Ficha Táctica / Inspección */}
                        {onSelectPosition && (
                          <button
                            type="button"
                            onClick={() => onSelectPosition(pos)}
                            className="p-1.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 transition-colors cursor-pointer"
                            title="Ver Ficha Táctica Completa e Hitos"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
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
                <td colSpan={2} className="py-3 px-3 text-start">
                  <div className="flex items-center gap-2">
                    <span className="text-white uppercase tracking-wider text-xs font-extrabold">Totales Consolidados:</span>
                    <span className="text-xs text-amber-400 font-semibold">
                      ({totals.winningCount} en Ganancia / {totals.losingCount} en Pérdida)
                    </span>
                  </div>
                </td>
                <td className="py-3 px-3 text-right text-white font-bold text-sm">
                  ${totals.totalNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-3 text-right text-neutral-400 text-xs">
                  En {totals.count} posiciones
                </td>
                <td className={`py-3 px-3 text-right ${
                  totals.totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  <div className="text-sm sm:text-base font-black">
                    {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT
                  </div>
                  <div className="text-xs font-bold">
                    {totals.totalRoe >= 0 ? '+' : ''}{totals.totalRoe.toFixed(2)}% ROE Total
                  </div>
                </td>
                <td className="py-3 px-3 text-start text-neutral-400 text-xs">
                  {totals.missingSlCount === 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>100% Protegidas con Stop Loss</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 shrink-0" />
                      <span>{totals.missingSlCount} sin Stop Loss activo</span>
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 text-right text-amber-300 font-bold text-sm">
                  ${totals.totalMargin.toFixed(2)}
                </td>
                <td className="py-3 px-3 text-center text-neutral-400 text-xs">
                  {totals.count} Aisladas
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Trailing Stop Config Modal */}
      {selectedTrailingPos && (
        <TrailingStopConfigModal
          position={selectedTrailingPos}
          onClose={() => setSelectedTrailingPos(null)}
          onSuccess={() => setSelectedTrailingPos(null)}
        />
      )}
    </div>
  );
};
