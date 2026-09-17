import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Layers,
  Lock,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
import { TrailingStopConfigModal } from './TrailingStopConfigModal';
import { trailingStopService } from '../services/trailingStopService';
import { advancedTechnicalConfluenceService } from '../services/advancedTechnicalConfluenceService';
import { AdvancedConfluenceCell } from './AdvancedConfluenceCell';
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
 * MiniPriceGauge: Línea de precios ultra-gráfica, extendida a todo lo ancho y de alta densidad
 * Integra: Tamaño, Nocional, Entrada promedio, PnL Flotante, ROE, y etiqueta Live flotante sobre el punto
 * Muestra todas las Entradas (E1, E2, E3) y todos los Take Profits (TP1, TP2, TP3)
 */
const MiniPriceGauge: React.FC<{
  isLong: boolean;
  size: number;
  notional: number;
  entryPrice: number;
  currentPrice: number;
  unRealizedProfit: number;
  roePct: number;
  priceDiffPct: number;
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
  size,
  notional,
  entryPrice,
  currentPrice,
  unRealizedProfit,
  roePct,
  priceDiffPct,
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
  e1Pct,
  e2,
  e2Pct,
  e3,
  e3Pct,
  distToTpPct,
  distToSlPct,
}) => {
  const effectiveSl = slPrice && slPrice > 0 ? slPrice : stratSl && stratSl > 0 ? stratSl : undefined;
  const effectiveTp = tp3 && tp3 > 0 ? tp3 : tp2 && tp2 > 0 ? tp2 : tp1 && tp1 > 0 ? tp1 : tpPrice && tpPrice > 0 ? tpPrice : undefined;

  const isWinner = unRealizedProfit >= 0;

  // Colección de todos los puntos de precio relevantes para calcular los límites visuales
  const allPrices: number[] = [entryPrice, currentPrice];
  if (effectiveSl) allPrices.push(effectiveSl);
  if (e1 && e1 > 0) allPrices.push(e1);
  if (e2 && e2 > 0) allPrices.push(e2);
  if (e3 && e3 > 0) allPrices.push(e3);
  if (tp1 && tp1 > 0) allPrices.push(tp1);
  if (tp2 && tp2 > 0) allPrices.push(tp2);
  if (tp3 && tp3 > 0) allPrices.push(tp3);
  if (tpPrice && tpPrice > 0) allPrices.push(tpPrice);

  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange > 0 ? priceRange * 0.08 : entryPrice * 0.02;

  let lowBound = minPrice - padding;
  let highBound = maxPrice + padding;

  const getPercent = (p: number) => {
    if (highBound <= lowBound) return 50;
    if (isLong) {
      return Math.max(4, Math.min(96, ((p - lowBound) / (highBound - lowBound)) * 100));
    } else {
      return Math.max(4, Math.min(96, ((highBound - p) / (highBound - lowBound)) * 100));
    }
  };

  const slPct = effectiveSl ? getPercent(effectiveSl) : 4;
  const entryPct = getPercent(entryPrice);
  const currentPct = getPercent(currentPrice);

  const e1PctVal = e1 && e1 > 0 ? getPercent(e1) : null;
  const e2PctVal = e2 && e2 > 0 ? getPercent(e2) : null;
  const e3PctVal = e3 && e3 > 0 ? getPercent(e3) : null;

  const tp1PctVal = tp1 && tp1 > 0 ? getPercent(tp1) : null;
  const tp2PctVal = tp2 && tp2 > 0 ? getPercent(tp2) : null;
  const tp3PctVal = tp3 && tp3 > 0 ? getPercent(tp3) : null;
  const tpOrderPctVal = !tp1 && tpPrice && tpPrice > 0 ? getPercent(tpPrice) : null;

  return (
    <div className="flex flex-col gap-1 w-full p-2 bg-neutral-950/80 border border-neutral-800/90 rounded-lg shadow-inner">
      {/* 1. Header Integrado Alargado: Tamaño & Nocional | Entrada Promedio | PnL Flotante & ROE */}
      <div className="flex items-center justify-between gap-2 text-xs font-mono border-b border-neutral-800/60 pb-1">
        {/* Tamaño y Nocional */}
        <div className="flex items-center gap-2 leading-tight">
          <div className="text-white font-bold text-xs flex items-center gap-1">
            <span>{size.toLocaleString('en-US', { maximumFractionDigits: 4 })}</span>
            <span className="text-[9px] text-neutral-400 font-normal">contratos</span>
          </div>
          <span className="text-neutral-600">·</span>
          <div className="text-[11px] text-neutral-300 font-semibold">
            ${notional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Entrada Promedio */}
        <div className="flex items-center gap-1 text-[11px] text-neutral-300 font-mono">
          <span className="text-neutral-400">E Prom:</span>
          <strong className="text-sky-300 font-bold">${formatPriceUtil(entryPrice)}</strong>
        </div>

        {/* PnL Flotante & ROE */}
        <div className="flex items-center gap-2 leading-tight">
          <div className={`text-xs font-black flex items-center gap-1 px-1.5 py-0.2 rounded border ${
            isWinner
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-xs'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-xs'
          }`}>
            {isWinner ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
            <span>{isWinner ? '+' : '-'}${Math.abs(unRealizedProfit).toFixed(2)}</span>
          </div>
          <div className={`text-[10px] font-bold ${
            roePct >= 0 ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {roePct >= 0 ? '+' : ''}{roePct.toFixed(2)}% ROE
          </div>
        </div>
      </div>

      {/* 2. Mini Línea Gráfica de Precios con Etiqueta Live Flotante Encima del Punto */}
      <div className="relative w-full pt-6 pb-0.5">
        {/* Contenedor de la barra física */}
        <div className="relative w-full h-4 bg-neutral-950 rounded-md border border-neutral-800 flex items-center px-2 select-none shadow-inner overflow-visible">
          {/* Fondo de zona de riesgo (Rojo) */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-rose-950/40 border-r border-rose-500/20 rounded-l-md"
            style={{ width: `${entryPct}%` }}
          />
          {/* Fondo de zona de ganancia (Verde) */}
          <div
            className="absolute top-0 bottom-0 right-0 bg-emerald-950/40 border-l border-emerald-500/20 rounded-r-md"
            style={{ width: `${100 - entryPct}%` }}
          />

          {/* Guía central */}
          <div className="absolute left-2 right-2 h-1 bg-neutral-800/90 rounded-full" />

          {/* Barra de progreso de precio actual */}
          <div
            className={`absolute h-1.5 rounded-full transition-all duration-300 ${
              isWinner
                ? 'bg-gradient-to-r from-sky-400 via-emerald-400 to-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                : 'bg-gradient-to-r from-rose-500 to-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]'
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
              <div className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-rose-200 shadow-sm" />
            </div>
          ) : (
            <div
              className="absolute left-1.5 flex items-center z-10"
              title="¡Sin Stop Loss Configurado!"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping opacity-80" />
            </div>
          )}

          {/* Marcadores de Todas las Entradas (E1, E2, E3) */}
          {e1PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${e1PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Entrada 1 (E1): $${formatPriceUtil(e1!)}${e1Pct ? ` (${e1Pct}%)` : ''}`}
            >
              <div className="w-2.5 h-2.5 rotate-45 bg-sky-400 border border-sky-100 shadow-sm" />
            </div>
          )}
          {e2PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${e2PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Entrada 2 (E2): $${formatPriceUtil(e2!)}${e2Pct ? ` (${e2Pct}%)` : ''}`}
            >
              <div className="w-2 h-2 rotate-45 bg-cyan-400 border border-cyan-100 shadow-xs" />
            </div>
          )}
          {e3PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${e3PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Entrada 3 (E3): $${formatPriceUtil(e3!)}${e3Pct ? ` (${e3Pct}%)` : ''}`}
            >
              <div className="w-2 h-2 rotate-45 bg-indigo-400 border border-indigo-100 shadow-xs" />
            </div>
          )}

          {/* Marcadores de Todos los Take Profits (TP1, TP2, TP3) */}
          {tp1PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${tp1PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Take Profit 1 (TP1): $${formatPriceUtil(tp1!)}${tp1Pct ? ` (${tp1Pct}%)` : ''}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-200 shadow-xs" />
            </div>
          )}
          {tp2PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${tp2PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Take Profit 2 (TP2): $${formatPriceUtil(tp2!)}${tp2Pct ? ` (${tp2Pct}%)` : ''}`}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 border border-emerald-100 shadow-xs" />
            </div>
          )}
          {tp3PctVal !== null && (
            <div
              className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-10"
              style={{ left: `${tp3PctVal}%`, transform: 'translateX(-50%)' }}
              title={`Take Profit 3 (TP3 / Final): $${formatPriceUtil(tp3!)}${tp3Pct ? ` (${tp3Pct}%)` : ''}`}
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

          {/* Marcador Precio en Vivo: Etiqueta Flotante Directamente SOBRE el Punto */}
          <div
            className="absolute -top-6 flex flex-col items-center justify-center z-30 transition-all duration-300 pointer-events-none"
            style={{ left: `${currentPct}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`px-1.5 py-0.2 rounded shadow-lg text-[9.5px] font-mono font-black whitespace-nowrap border flex items-center gap-1 ${
                isWinner
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]'
                  : 'bg-rose-950 text-rose-300 border-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.7)]'
              }`}
            >
              <span>Live: ${formatPriceUtil(currentPrice)}</span>
              <span className="text-[8.5px] font-bold">({priceDiffPct >= 0 ? '+' : ''}{priceDiffPct.toFixed(2)}%)</span>
            </div>
            <div className={`w-1.5 h-1.5 rotate-45 -mt-0.5 ${isWinner ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          </div>

          {/* Punto de Representación del Precio en Vivo */}
          <div
            className="absolute top-0 bottom-0 flex flex-col items-center justify-center z-20 transition-all duration-300"
            style={{ left: `${currentPct}%`, transform: 'translateX(-50%)' }}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-[0_0_8px_rgba(255,255,255,0.9)] ${
                isWinner
                  ? 'bg-emerald-400 text-neutral-950 ring-2 ring-emerald-300 animate-pulse'
                  : 'bg-rose-500 text-white ring-2 ring-rose-300 animate-pulse'
              }`}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Desglose Numérico Completo: SL + Todas las E (E1, E2, E3) + Todos los TP (TP1, TP2, TP3) */}
      <div className="flex items-center justify-between gap-1.5 text-[9.5px] font-mono flex-wrap pt-0.5 border-t border-neutral-800/40">
        {/* SL */}
        {effectiveSl ? (
          <div
            className="flex items-center gap-1 bg-rose-950/80 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/40 font-bold"
            title={distToSlPct !== null ? `Distancia al SL: ${distToSlPct.toFixed(1)}%` : undefined}
          >
            <span className="text-[8px] text-rose-400 uppercase">SL:</span>
            <span className="text-[9.5px] text-rose-200 font-extrabold">${formatPriceUtil(effectiveSl)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 bg-rose-950 text-rose-300 px-1.5 py-0.2 rounded border border-rose-500/80 text-[8.5px] font-bold animate-pulse">
            <ShieldAlert className="w-2.5 h-2.5 text-rose-400" />
            <span>SIN SL</span>
          </div>
        )}

        {/* Todas las Entradas (E1, E2, E3) */}
        <div className="flex items-center gap-1 flex-wrap">
          {e1 && e1 > 0 && (
            <div className="flex items-center gap-0.5 bg-neutral-900 text-sky-300 px-1.5 py-0.2 rounded border border-neutral-800 font-bold">
              <span className="text-[8px] text-sky-400">E1:</span>
              <span className="text-[9.5px] text-sky-200">${formatPriceUtil(e1)}</span>
              {e1Pct ? <span className="text-[7.5px] text-neutral-400">({e1Pct}%)</span> : null}
            </div>
          )}
          {e2 && e2 > 0 && (
            <div className="flex items-center gap-0.5 bg-neutral-900 text-cyan-300 px-1.5 py-0.2 rounded border border-neutral-800 font-bold">
              <span className="text-[8px] text-cyan-400">E2:</span>
              <span className="text-[9.5px] text-cyan-200">${formatPriceUtil(e2)}</span>
              {e2Pct ? <span className="text-[7.5px] text-neutral-400">({e2Pct}%)</span> : null}
            </div>
          )}
          {e3 && e3 > 0 && (
            <div className="flex items-center gap-0.5 bg-neutral-900 text-indigo-300 px-1.5 py-0.2 rounded border border-neutral-800 font-bold">
              <span className="text-[8px] text-indigo-400">E3:</span>
              <span className="text-[9.5px] text-indigo-200">${formatPriceUtil(e3)}</span>
              {e3Pct ? <span className="text-[7.5px] text-neutral-400">({e3Pct}%)</span> : null}
            </div>
          )}
          {!e1 && !e2 && !e3 && (
            <div className="flex items-center gap-0.5 bg-neutral-900 text-sky-300 px-1.5 py-0.2 rounded border border-neutral-800 font-bold">
              <span className="text-[8px] text-sky-400">E:</span>
              <span className="text-[9.5px] text-sky-200">${formatPriceUtil(entryPrice)}</span>
            </div>
          )}
        </div>

        {/* Todos los Take Profits (TP1, TP2, TP3) */}
        <div className="flex items-center gap-1 flex-wrap">
          {tp1 && tp1 > 0 && (
            <div
              className="flex items-center gap-0.5 bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-bold"
              title={`TP1: $${formatPriceUtil(tp1)}`}
            >
              <span className="text-[8px] text-emerald-400">TP1:</span>
              <span className="text-[9.5px] text-emerald-200">${formatPriceUtil(tp1)}</span>
              {tp1Pct ? <span className="text-[7.5px] text-emerald-400/80">({tp1Pct}%)</span> : null}
            </div>
          )}
          {tp2 && tp2 > 0 && (
            <div
              className="flex items-center gap-0.5 bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-bold"
              title={`TP2: $${formatPriceUtil(tp2)}`}
            >
              <span className="text-[8px] text-emerald-400">TP2:</span>
              <span className="text-[9.5px] text-emerald-200">${formatPriceUtil(tp2)}</span>
              {tp2Pct ? <span className="text-[7.5px] text-emerald-400/80">({tp2Pct}%)</span> : null}
            </div>
          )}
          {tp3 && tp3 > 0 && (
            <div
              className="flex items-center gap-0.5 bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-bold"
              title={`TP3 / Final: $${formatPriceUtil(tp3)}`}
            >
              <span className="text-[8px] text-emerald-300 font-extrabold">TP3:</span>
              <span className="text-[9.5px] text-white font-extrabold">${formatPriceUtil(tp3)}</span>
              {tp3Pct ? <span className="text-[7.5px] text-emerald-400/80">({tp3Pct}%)</span> : null}
            </div>
          )}
          {!tp1 && !tp2 && !tp3 && tpPrice && tpPrice > 0 && (
            <div className="flex items-center gap-0.5 bg-emerald-950/80 text-emerald-300 px-1.5 py-0.2 rounded border border-emerald-500/40 font-bold">
              <span className="text-[8px] text-emerald-400">TP:</span>
              <span className="text-[9.5px] text-emerald-200">${formatPriceUtil(tpPrice)}</span>
            </div>
          )}
          {!tp1 && !tp2 && !tp3 && (!tpPrice || tpPrice <= 0) && (
            <div className="text-[8.5px] text-neutral-500 bg-neutral-900 px-1.5 py-0.2 rounded border border-neutral-800">
              Sin TP
            </div>
          )}
        </div>
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
  const [, setConfTick] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
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

    const unsubConf = advancedTechnicalConfluenceService.subscribe(() => {
      setConfTick((prev) => prev + 1);
    });

    return () => {
      unsubWs();
      unsubPrice();
      unsubStrat();
      unsubTs();
      unsubConf();
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

      // Advanced Technical Confluence & ATR Data
      const confData = advancedTechnicalConfluenceService.getConfluence(cleanSym, isLong);
      const atrValue = confData.atr14 > 0 ? confData.atr14 : pos.entryPrice * 0.015;
      const atrPercent = confData.atr14Percent > 0 ? confData.atr14Percent : 1.5;
      const volatilityRegime = confData.optimalSizing?.volatilityRegime || 'Volatilidad Normal';
      const isAtrCritical = confData.layersLong?.layer3AtrVolatility?.state === 'extreme' || atrPercent > 3.0;

      // Cálculo de Tasa de Callback y Stop Inicial Estimado para SL Dinámico
      const callbackRate = activeTrailingStop
        ? activeTrailingStop.callbackRate
        : Math.max(0.5, Math.min(5.0, Number((((1.5 * atrValue) / (pos.entryPrice || 1)) * 100).toFixed(2))));

      const estimatedInitialStop = isLong
        ? pos.entryPrice * (1 - callbackRate / 100)
        : pos.entryPrice * (1 + callbackRate / 100);

      const dynamicCurrentStop = activeTrailingStop
        ? activeTrailingStop.dynamicStopPrice
        : estimatedInitialStop;

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
        confData,
        atrValue,
        atrPercent,
        volatilityRegime,
        isAtrCritical,
        callbackRate,
        estimatedInitialStop,
        dynamicCurrentStop,
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

  if (activePositionRows.length === 0) {
    return (
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-400 shrink-0">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Tabla Resumen de Posiciones Activas</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-normal">
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
      className="bg-neutral-900/95 border border-amber-500/40 rounded-xl overflow-hidden shadow-lg flex flex-col transition-all ring-1 ring-amber-500/10 mb-2 w-full"
    >
      {/* 1. Header Bar con KPIs Globales Compacto y Nítido */}
      <div className="px-3 py-2 bg-neutral-950 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
              Resumen de Posiciones Activas
            </h3>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
              {totals.count} Posición{totals.count !== 1 ? 'es' : ''} ({totals.longCount}L / {totals.shortCount}S)
            </span>
          </div>
        </div>

        {/* KPIs Consolidada Rápida */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* PnL Flotante Consolidado */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-mono font-black border text-xs sm:text-sm ${
            totals.totalPnl >= 0
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'bg-rose-950/90 text-rose-300 border-rose-500/50 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
          }`}>
            {totals.totalPnl >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : <TrendingDown className="w-3.5 h-3.5 text-rose-400" />}
            <span>
              PnL Total: {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT
            </span>
            <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-black/40">
              {totals.totalRoe >= 0 ? '+' : ''}{totals.totalRoe.toFixed(2)}% ROE
            </span>
          </div>

          {/* Margen Comprometido */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-xs">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>Margen: <strong className="text-white font-bold">${totals.totalMargin.toFixed(2)}</strong></span>
          </div>

          {/* Nocional Total */}
          <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-md bg-neutral-900 text-neutral-300 border border-neutral-800 font-mono text-xs">
            <span>Nocional: <strong className="text-white font-bold">${totals.totalNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
          </div>

          {/* Alerta si falta SL */}
          {totals.missingSlCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-rose-950/90 text-rose-300 border border-rose-500/60 font-bold text-xs animate-pulse">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>{totals.missingSlCount} Sin SL</span>
            </div>
          )}

          {/* Botón Sincronizar */}
          <button
            type="button"
            onClick={() => binanceWs.syncAllAccountData()}
            disabled={isSyncing}
            className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title="Sincronizar posiciones en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* Botón Minimizar / Expandir */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expandir tabla resumen' : 'Minimizar tabla resumen'}
          >
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Tabla de Alta Densidad con Tarjeta de Precio Alargada y Pegada a la Izquierda */}
      {!isCollapsed && (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-neutral-950/90 text-neutral-400 text-[11px] font-bold border-b border-neutral-800 uppercase tracking-wider font-mono">
                <th className="py-1.5 px-2 text-center" style={{ width: '32px' }}>#</th>
                <th className="py-1.5 px-2" style={{ width: '125px' }}>Par / Dir</th>
                <th className="py-1.5 px-2 text-start w-full" style={{ minWidth: '420px' }}>Progreso &amp; Niveles (E / Live / TP / SL / PnL)</th>
                <th className="py-1.5 px-2 text-center" style={{ width: '115px' }}>ATR (14)</th>
                <th className="py-1.5 px-2 text-center" style={{ width: '160px' }}>SL Dinámico</th>
                <th className="py-1.5 px-2 text-start" style={{ width: '165px' }}>Confluencia</th>
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
                    <td className="py-1.5 px-2 text-center font-mono text-neutral-400 font-bold text-xs">
                      {r.index}
                    </td>

                    {/* Par y Dirección (LONG / SHORT + LEVERAGE) Pegado a la Izquierda */}
                    <td className="py-1.5 px-2">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full shrink-0 ${isWinner ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.8)]' : 'bg-rose-500 shadow-[0_0_5px_rgba(244,63,94,0.8)]'}`} />
                          <span className="font-extrabold text-white font-mono text-xs tracking-tight">
                            {pos.symbol}
                          </span>
                        </div>
                        <span
                          className={`w-fit px-1.5 py-0.2 rounded text-[10px] font-mono font-bold tracking-tight ${
                            r.isLong
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {r.isLong ? 'LONG' : 'SHORT'} {pos.leverage}X
                        </span>
                      </div>
                    </td>

                    {/* Progreso & Niveles: Mini Línea Gráfica Alargada y Flexible */}
                    <td className="py-1.5 px-2 font-mono w-full">
                      <MiniPriceGauge
                        isLong={r.isLong}
                        size={r.size}
                        notional={r.notional}
                        entryPrice={pos.entryPrice}
                        currentPrice={r.currentPrice}
                        unRealizedProfit={r.unRealizedProfit}
                        roePct={r.roePct}
                        priceDiffPct={r.priceDiffPct}
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
                        e1Pct={r.e1Pct}
                        e2={r.e2}
                        e2Pct={r.e2Pct}
                        e3={r.e3}
                        e3Pct={r.e3Pct}
                        distToTpPct={r.distToTpPct}
                        distToSlPct={r.distToSlPct}
                      />
                    </td>

                    {/* ATR (14) & Volatilidad */}
                    <td className="py-1.5 px-2 text-center font-mono">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1 font-extrabold text-xs text-amber-300">
                          <Activity className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>${formatPriceUtil(r.atrValue)}</span>
                        </div>
                        <div className="text-[10px] text-neutral-300 font-bold">
                          ({r.atrPercent.toFixed(2)}%)
                        </div>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase tracking-wider border ${
                            r.isAtrCritical
                              ? 'bg-rose-950/90 text-rose-300 border-rose-500/70 animate-pulse'
                              : r.volatilityRegime === 'Alta Volatilidad'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-500/60'
                              : 'bg-sky-950/80 text-sky-300 border-sky-500/50'
                          }`}
                        >
                          {r.isAtrCritical
                            ? 'CRÍTICO'
                            : r.volatilityRegime === 'Alta Volatilidad'
                            ? 'ALTA VOL'
                            : 'NORMAL'}
                        </span>
                      </div>
                    </td>

                    {/* SL Dinámico (Tasa de Callback & Stop Inicial Estimado) */}
                    <td className="py-1.5 px-2 text-center font-mono">
                      <div className="flex flex-col items-center gap-0.5">
                        {/* Tasa de Callback */}
                        <div className="flex items-center gap-1">
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-black border ${
                            r.activeTrailingStop
                              ? 'bg-cyan-950/90 text-cyan-300 border-cyan-500/70 shadow-xs'
                              : 'bg-neutral-800 text-cyan-300 border-neutral-700'
                          }`}>
                            <Zap className="w-2.5 h-2.5 text-cyan-400 fill-cyan-400" />
                            <span>Callback: {r.callbackRate}%</span>
                          </span>
                        </div>

                        {/* Stop Inicial Estimado / Actual */}
                        <div className="text-[10px] text-neutral-300 font-semibold flex items-center gap-0.5">
                          <span className="text-[9px] text-neutral-400">Stop Inic:</span>
                          <strong className="text-amber-300 font-extrabold">${formatPriceUtil(r.estimatedInitialStop)}</strong>
                        </div>

                        {/* Estado Dinámico o Botón de Ajuste */}
                        {r.activeTrailingStop ? (
                          <div className="text-[9px] text-cyan-400 font-medium">
                            Stop Act: ${formatPriceUtil(r.activeTrailingStop.dynamicStopPrice)} ({r.activeTrailingStop.distanceToStopPct ? `${r.activeTrailingStop.distanceToStopPct.toFixed(1)}%` : 'Track'})
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (onOpenTrailingStop) onOpenTrailingStop(pos);
                              setSelectedTrailingPos(pos);
                            }}
                            className="px-1.5 py-0.2 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-cyan-300 border border-neutral-700 hover:border-cyan-500/50 text-[9px] font-bold transition-all cursor-pointer"
                            title="Activar Trailing Stop dinámico con Callback y Stop inicial calculados"
                          >
                            + Activar TS
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Confluencia (Solo Luz del Semáforo y Resultado) */}
                    <td className="py-1.5 px-2">
                      <AdvancedConfluenceCell
                        symbol={r.cleanSym}
                        isLong={r.isLong}
                        positionAmt={pos.positionAmt}
                        entryPrice={pos.entryPrice}
                        markPrice={r.currentPrice}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Footer con Totales Consolidados */}
            <tfoot>
              <tr className="bg-neutral-950 font-mono font-bold text-xs border-t-2 border-neutral-800 text-neutral-300">
                <td colSpan={2} className="py-2 px-2 text-start">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white uppercase tracking-wider text-xs font-extrabold">Totales:</span>
                    <span className="text-[11px] text-amber-400 font-semibold">
                      ({totals.winningCount} Win / {totals.losingCount} Loss)
                    </span>
                  </div>
                </td>
                <td className="py-2 px-2 text-start text-white font-bold text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>Nocional: <strong>${totals.totalNotional.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    <span className={`px-2 py-0.5 rounded font-black ${
                      totals.totalPnl >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40' : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    }`}>
                      PnL Total: {totals.totalPnl >= 0 ? '+' : '-'}${Math.abs(totals.totalPnl).toFixed(2)} USDT ({totals.totalRoe >= 0 ? '+' : ''}{totals.totalRoe.toFixed(2)}% ROE)
                    </span>
                  </div>
                </td>
                <td colSpan={2} className="py-2 px-2 text-center text-neutral-400 text-xs">
                  {totals.missingSlCount === 0 ? (
                    <span className="text-emerald-400 flex items-center justify-center gap-1 font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>100% con Stop Loss</span>
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center justify-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>{totals.missingSlCount} sin Stop Loss</span>
                    </span>
                  )}
                </td>
                <td className="py-2 px-2 text-start text-neutral-400 text-[11px]">
                  Monitoreo 15s ({totals.count} pos)
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
