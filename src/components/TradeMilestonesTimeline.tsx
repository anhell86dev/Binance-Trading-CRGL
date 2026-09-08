import React, { useState, useEffect, useMemo } from 'react';
import {
  CheckCircle2,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Sparkles,
  Clock,
  Zap,
  Info,
  ChevronRight,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';

export interface TradeMilestonesTimelineProps {
  position: PositionRisk;
  openOrders?: OpenOrder[];
  onMoveToBreakEven?: (targetPrice: number) => void;
  onAdjustTpSl?: (position: PositionRisk) => void;
  className?: string;
  compact?: boolean;
}

export const TradeMilestonesTimeline: React.FC<TradeMilestonesTimelineProps> = ({
  position,
  openOrders = [],
  onMoveToBreakEven,
  onAdjustTpSl,
  className = '',
  compact = false,
}) => {
  const [activeHoverStep, setActiveHoverStep] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isLong = position.positionAmt > 0;
  const qty = Math.abs(position.positionAmt || 0);

  // 1. Real-time Live Price via WebSocket
  const [livePrice, setLivePrice] = useState<number>(() => {
    const p = livePriceService.getPrice(position.symbol);
    if (p > 0) return p;
    const wsTicker = binanceWs.getTicker();
    if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) return wsTicker.lastPrice;
    return position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1);
  });

  useEffect(() => {
    const handlePriceUpdate = () => {
      const p = livePriceService.getPrice(position.symbol);
      if (p > 0) {
        setLivePrice(p);
        return;
      }
      const wsTicker = binanceWs.getTicker();
      if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) {
        setLivePrice(wsTicker.lastPrice);
      }
    };

    handlePriceUpdate();
    const unsubLive = livePriceService.subscribe(handlePriceUpdate);
    const unsubWs = binanceWs.subscribe(handlePriceUpdate);

    return () => {
      unsubLive();
      unsubWs();
    };
  }, [position.symbol]);

  const currentPrice =
    livePrice > 0 ? livePrice : position.markPrice > 0 ? position.markPrice : position.entryPrice || 1;
  const entryPrice = position.entryPrice > 0 ? position.entryPrice : currentPrice;

  // 2. Fetch linked strategy prices if available
  const effectiveStrategyId =
    position.strategyId || binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyId;

  const linkedStrategy = useMemo(() => {
    const all = strategyService.getStrategies();
    const cleanSym = position.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (effectiveStrategyId) {
      const byId = all.find((s) => s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase());
      if (byId) return byId;
    }
    return all.find((s) => s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym);
  }, [effectiveStrategyId, position.symbol]);

  const stratPrices = useMemo(() => {
    if (linkedStrategy) {
      return parsePricesFromStrategy(linkedStrategy);
    }
    return null;
  }, [linkedStrategy]);

  // Derived price levels
  const slPrice =
    position.stopLoss && position.stopLoss > 0
      ? position.stopLoss
      : stratPrices?.slPrice && stratPrices.slPrice > 0
      ? stratPrices.slPrice
      : isLong
      ? entryPrice * 0.982
      : entryPrice * 1.018;

  const tp1Price =
    position.takeProfit && position.takeProfit > 0
      ? position.takeProfit
      : stratPrices?.tp1Price && stratPrices.tp1Price > 0
      ? stratPrices.tp1Price
      : isLong
      ? entryPrice * 1.028
      : entryPrice * 0.972;

  const tp2Price =
    stratPrices?.tp2Price && stratPrices.tp2Price > 0
      ? stratPrices.tp2Price
      : isLong
      ? entryPrice * 1.055
      : entryPrice * 0.945;

  // Financial Metrics
  const calculatedPnl = isLong ? (currentPrice - entryPrice) * qty : (entryPrice - currentPrice) * qty;
  const pnl = Number(calculatedPnl.toFixed(2));
  const isProfit = pnl >= 0;
  const margin =
    position.isolatedMargin > 0
      ? position.isolatedMargin
      : (qty * entryPrice) / Math.max(1, position.leverage || 5);
  const roe = margin > 0 ? (pnl / margin) * 100 : position.roePercent || 0;
  const notionalUsd = qty * currentPrice;

  // Distances & Progress
  const totalTargetDistance = Math.abs(tp1Price - entryPrice);
  const currentCoveredDistance = isLong
    ? Math.max(0, currentPrice - entryPrice)
    : Math.max(0, entryPrice - currentPrice);

  const progressToTp1Pct =
    totalTargetDistance > 0 ? Math.min(100, Math.max(0, (currentCoveredDistance / totalTargetDistance) * 100)) : 0;

  const remainingToTp1Pct = isLong
    ? ((tp1Price - currentPrice) / currentPrice) * 100
    : ((currentPrice - tp1Price) / currentPrice) * 100;

  const priceDiffPctFromEntry =
    entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * 100 * (isLong ? 1 : -1) : 0;

  const tp1DiffPct = entryPrice > 0 ? (Math.abs(tp1Price - entryPrice) / entryPrice) * 100 : 2.8;
  const tp2DiffPct = entryPrice > 0 ? (Math.abs(tp2Price - entryPrice) / entryPrice) * 100 : 5.5;
  const slDiffPct = entryPrice > 0 ? (Math.abs(entryPrice - slPrice) / entryPrice) * 100 : 1.8;

  const tp1ProfitEst = Math.abs(tp1Price - entryPrice) * qty * 0.5; // 50% scale out
  const tp2ProfitEst = Math.abs(tp2Price - entryPrice) * qty * 0.5;
  const maxRiskUsd = Math.abs(entryPrice - slPrice) * qty;

  const riskDistance = Math.abs(entryPrice - slPrice);
  const rewardDistance = Math.abs(tp1Price - entryPrice);
  const rewardRiskRatio = riskDistance > 0 ? rewardDistance / riskDistance : 2.5;

  // Status Evaluations
  const isTp1Reached = isLong ? currentPrice >= tp1Price : currentPrice <= tp1Price;
  const isTp2Reached = tp2Price > 0 ? (isLong ? currentPrice >= tp2Price : currentPrice <= tp2Price) : false;
  const isSlBreached = isLong ? currentPrice <= slPrice : currentPrice >= slPrice;

  const isBreakEvenActive = Boolean(
    position.stopLoss &&
      ((isLong && position.stopLoss >= entryPrice * 0.998) ||
        (!isLong && position.stopLoss <= entryPrice * 1.002))
  );

  const isReadyForBreakEven = !isBreakEvenActive && (isTp1Reached || priceDiffPctFromEntry >= 1.0 || progressToTp1Pct >= 50);

  const tradeStatus = getTradeStatusAndPhase(position, openOrders);

  // Number formatting helper
  const fmt = (num: number) => {
    if (!num || isNaN(num)) return '0.00';
    if (num < 0.01) return num.toFixed(6);
    if (num < 1) return num.toFixed(4);
    if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return num.toFixed(2);
  };

  const handleApplyBreakEven = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onMoveToBreakEven) {
      onMoveToBreakEven(entryPrice);
    } else {
      binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, entryPrice);
    }
    setActionFeedback(`¡Stop Loss ajustado a Break-Even ($${fmt(entryPrice)})!`);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  return (
    <div
      id={`trade-timeline-${position.symbol}`}
      className={`bg-neutral-950/90 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 text-neutral-200 shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Background Accent Grid & Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header: Timeline Title & Current Trade Context */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800/80 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Zap className="w-4 h-4 fill-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                Cronología Táctica de Hitos
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-900 text-amber-300 border border-neutral-700">
                {position.symbol} • {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shadow-xs ${tradeStatus.badgeClass}`}
              >
                {tradeStatus.phaseBadge}
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Supervisión en vivo de las 4 fases maestras: Entrada, Desarrollo, Break-Even y Toma de Beneficios (TP).
            </p>
          </div>
        </div>

        {/* Live Metrics Pill & Action Feedback */}
        <div className="flex items-center gap-2 flex-wrap self-end sm:self-auto">
          {actionFeedback && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-500/50 shadow-xs animate-fade-in flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              {actionFeedback}
            </span>
          )}
          <div className="flex items-center gap-2 bg-neutral-900/90 px-3 py-1 rounded-xl border border-neutral-800 text-xs font-mono">
            <span className="text-neutral-400 text-[10px] uppercase">Precio en Vivo:</span>
            <span className="flex items-center gap-1 text-amber-300 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              ${fmt(currentPrice)}
            </span>
            <span className="text-neutral-600">|</span>
            <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(1)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Main Vertical Timeline Container */}
      <div className="relative pl-6 sm:pl-8 flex flex-col gap-6 pt-2 pb-1">
        {/* Continuous Background Vertical Line */}
        <div className="absolute left-[17px] sm:left-[21px] top-4 bottom-8 w-[2px] bg-gradient-to-b from-emerald-500 via-amber-500/80 to-neutral-800" />

        {/* ========================================================= */}
        {/* MILESTONE 1: ENTRADA EJECUTADA (ENTRY) */}
        {/* ========================================================= */}
        <div
          className="group relative flex items-start gap-4 transition-all duration-200"
          onMouseEnter={() => setActiveHoverStep('entry')}
          onMouseLeave={() => setActiveHoverStep(null)}
        >
          {/* Milestone Node */}
          <div className="absolute -left-[24px] sm:-left-[28px] top-1.5 z-20 flex items-center justify-center">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-950 border-2 border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)] group-hover:scale-115 group-hover:shadow-[0_0_18px_rgba(16,185,129,0.6)] group-hover:border-emerald-300 transition-all duration-200">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            </div>
          </div>

          {/* Milestone Content Card */}
          <div className="flex-1 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-emerald-950/40 hover:-translate-y-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Hito 1: Entrada Ejecutada (Fill 100%)</span>
                </span>
                <span className="px-2 py-0.2 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  COMPLETADA
                </span>
              </div>
              <div className="text-neutral-400 font-mono text-[11px] flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-neutral-500" />
                <span>Posición Activa en Binance</span>
              </div>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 pt-2.5 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Precio de Entrada</span>
                <span className="text-white font-bold text-sm sm:text-base">${fmt(entryPrice)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Dirección / Palanca</span>
                <span className={`font-bold ${isLong ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isLong ? 'LONG (Compra)' : 'SHORT (Venta)'} {position.leverage || 5}x
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Margen Aislado</span>
                <span className="text-neutral-200 font-semibold">${margin.toFixed(2)} USDT</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Valor Nocional</span>
                <span className="text-amber-300 font-semibold">${notionalUsd.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Hover Explanatory Pill / Context */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Base de cálculo fija de Ratio Riesgo/Beneficio (R/B 1:{rewardRiskRatio.toFixed(1)}).</span>
              </div>
              <span className="text-[10px] text-emerald-400/80 font-mono opacity-80 group-hover:opacity-100 transition-opacity">
                Volumen: {qty} contratos
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MILESTONE 2: DESARROLLO DEL TRADE (DEVELOPMENT) */}
        {/* ========================================================= */}
        <div
          className="group relative flex items-start gap-4 transition-all duration-200"
          onMouseEnter={() => setActiveHoverStep('dev')}
          onMouseLeave={() => setActiveHoverStep(null)}
        >
          {/* Milestone Node */}
          <div className="absolute -left-[24px] sm:-left-[28px] top-1.5 z-20 flex items-center justify-center">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isTp1Reached
                  ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                  : 'bg-amber-950 border-2 border-amber-400 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.4)] animate-pulse'
              } group-hover:scale-115 group-hover:border-amber-300`}
            >
              {isTp1Reached ? (
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              ) : (
                <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              )}
            </div>
          </div>

          {/* Milestone Content Card */}
          <div className="flex-1 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-amber-950/40 hover:-translate-y-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Hito 2: Desarrollo & Trayectoria en Vivo</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${
                    isTp1Reached
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : isProfit
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  }`}
                >
                  {isTp1Reached ? 'OBJETIVO ALCANZADO' : isProfit ? 'EN AVANCE POSITIVO' : 'EN RETROCESO'}
                </span>
              </div>
              <div className="text-[11px] font-mono flex items-center gap-1">
                <span className="text-neutral-400">Progreso a TP1:</span>
                <strong className={isTp1Reached ? 'text-emerald-400' : 'text-amber-300'}>
                  {progressToTp1Pct.toFixed(0)}%
                </strong>
              </div>
            </div>

            {/* Live Visual Progress Bar to TP1 */}
            <div className="mt-3">
              <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 mb-1">
                <span>Entrada: ${fmt(entryPrice)}</span>
                <span className="text-amber-300 font-bold">
                  Cotización: ${fmt(currentPrice)} ({priceDiffPctFromEntry >= 0 ? '+' : ''}
                  {priceDiffPctFromEntry.toFixed(2)}%)
                </span>
                <span className="text-emerald-400">TP1: ${fmt(tp1Price)}</span>
              </div>
              <div className="w-full h-2 bg-neutral-950 rounded-full overflow-hidden border border-neutral-800 p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isTp1Reached
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : isProfit
                      ? 'bg-gradient-to-r from-amber-500 to-amber-300'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(5, Math.min(100, progressToTp1Pct))}%` }}
                />
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-2.5 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">PnL No Realizado</span>
                <span className={`font-bold text-sm sm:text-base ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Rendimiento (ROE)</span>
                <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}%
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Distancia Restante</span>
                <span className="text-neutral-200 font-semibold">
                  {isTp1Reached ? '0.00% (Tocado)' : `${Math.max(0, remainingToTp1Pct).toFixed(2)}%`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Fase Actual</span>
                <span className="text-cyan-300 font-semibold truncate">{tradeStatus.phaseName}</span>
              </div>
            </div>

            {/* Hover Detailed Diagnostic */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                {isProfit ? (
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                )}
                <span>
                  {isTp1Reached
                    ? 'El precio ha alcanzado el objetivo 1. Habilita el protocolo Break-Even.'
                    : `Recorrido: ${progressToTp1Pct.toFixed(1)}% completado hacia el Take Profit 1.`}
                </span>
              </div>
              <span className="text-[10px] text-amber-400/90 font-mono hidden sm:inline">
                Ticks en Vivo WSS
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MILESTONE 3: PROTOCOLO BREAK-EVEN (BREAK-EVEN) */}
        {/* ========================================================= */}
        <div
          className="group relative flex items-start gap-4 transition-all duration-200"
          onMouseEnter={() => setActiveHoverStep('be')}
          onMouseLeave={() => setActiveHoverStep(null)}
        >
          {/* Milestone Node */}
          <div className="absolute -left-[24px] sm:-left-[28px] top-1.5 z-20 flex items-center justify-center">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isBreakEvenActive
                  ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.5)]'
                  : isReadyForBreakEven
                  ? 'bg-cyan-950 border-2 border-cyan-400 text-cyan-300 shadow-[0_0_14px_rgba(6,182,212,0.4)] animate-bounce'
                  : 'bg-neutral-900 border-2 border-neutral-700 text-neutral-500'
              } group-hover:scale-115 group-hover:border-cyan-300`}
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
            </div>
          </div>

          {/* Milestone Content Card */}
          <div
            className={`flex-1 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:-translate-y-0.5 border ${
              isBreakEvenActive
                ? 'bg-emerald-950/20 border-emerald-500/50 hover:border-emerald-400 shadow-emerald-950/30'
                : isReadyForBreakEven
                ? 'bg-cyan-950/25 border-cyan-500/50 hover:border-cyan-400 shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Hito 3: Blindaje Break-Even (Riesgo Cero)</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${
                    isBreakEvenActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                      : isReadyForBreakEven
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isBreakEvenActive
                    ? 'BLINDADO (RIESGO CERO)'
                    : isReadyForBreakEven
                    ? 'LISTO PARA ACTIVAR'
                    : 'CONDICIONAL'}
                </span>
              </div>

              {/* Action Button: Apply Break-Even directly */}
              {!isBreakEvenActive && isReadyForBreakEven && (
                <button
                  type="button"
                  onClick={handleApplyBreakEven}
                  className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                  title="Ajustar Stop Loss al precio de entrada para garantizar 0 riesgo de pérdida"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Activar Break-Even (${fmt(entryPrice)})</span>
                </button>
              )}
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 pt-2.5 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Precio Objetivo BE</span>
                <span className="text-white font-bold text-sm sm:text-base">${fmt(entryPrice)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Stop Loss Actual</span>
                <span
                  className={`font-semibold ${
                    isBreakEvenActive ? 'text-emerald-400 font-bold' : position.stopLoss ? 'text-amber-300' : 'text-neutral-500 italic'
                  }`}
                >
                  {position.stopLoss ? `$${fmt(position.stopLoss)}` : 'Sin configurar'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Estado de Riesgo</span>
                <span className={isBreakEvenActive ? 'text-emerald-400 font-bold' : 'text-amber-300'}>
                  {isBreakEvenActive ? '$0.00 (Inmune)' : `-$${maxRiskUsd.toFixed(2)} USDT`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Regla Operativa</span>
                <span className="text-neutral-300 text-[11px] font-sans">Regla de Disciplina #8</span>
              </div>
            </div>

            {/* Explanatory text & hover insight */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-400 gap-1.5">
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  {isBreakEvenActive
                    ? 'La posición está completamente blindada. El capital inicial está garantizado contra pérdidas.'
                    : isReadyForBreakEven
                    ? '¡Ventana ideal! Mueve el Stop Loss al precio de entrada para asegurar un trade libre de riesgo.'
                    : 'Se activará al alcanzar el objetivo TP1 o al registrar ganancias sostenidas.'}
                </span>
              </div>
              {onAdjustTpSl && (
                <button
                  type="button"
                  onClick={() => onAdjustTpSl(position)}
                  className="text-amber-400 hover:text-amber-300 text-[10px] font-mono underline cursor-pointer self-start sm:self-auto"
                >
                  Editar TP/SL
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MILESTONE 4: TOMA DE BENEFICIOS (TAKE PROFIT - TP1 & TP2) */}
        {/* ========================================================= */}
        <div
          className="group relative flex items-start gap-4 transition-all duration-200"
          onMouseEnter={() => setActiveHoverStep('tp')}
          onMouseLeave={() => setActiveHoverStep(null)}
        >
          {/* Milestone Node */}
          <div className="absolute -left-[24px] sm:-left-[28px] top-1.5 z-20 flex items-center justify-center">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isTp2Reached
                  ? 'bg-emerald-950 border-2 border-emerald-400 text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.6)]'
                  : isTp1Reached
                  ? 'bg-emerald-950 border-2 border-emerald-500 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                  : 'bg-neutral-900 border-2 border-neutral-700 text-neutral-500'
              } group-hover:scale-115 group-hover:border-emerald-400`}
            >
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-current" />
            </div>
          </div>

          {/* Milestone Content Card */}
          <div className="flex-1 bg-neutral-900/80 hover:bg-neutral-900 border border-neutral-800 hover:border-emerald-500/50 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:shadow-emerald-950/40 hover:-translate-y-0.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Hito 4: Toma de Beneficios (Take Profit)</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${
                    isTp2Reached
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                      : isTp1Reached
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isTp2Reached ? 'TP1 & TP2 ALCANZADOS' : isTp1Reached ? 'TP1 ALCANZADO (50%)' : 'EN ESPERA'}
                </span>
              </div>
              <div className="text-[11px] font-mono flex items-center gap-1.5">
                <span className="text-neutral-400">Ratio R/B Total:</span>
                <span className="text-emerald-400 font-bold">1 : {rewardRiskRatio.toFixed(1)}</span>
              </div>
            </div>

            {/* Dual Target Sub-Cards: TP1 and TP2 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {/* TP1 Card */}
              <div
                className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                  isTp1Reached
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2
                      className={`w-3.5 h-3.5 ${isTp1Reached ? 'text-emerald-400' : 'text-neutral-500'}`}
                    />
                    <span>TP 1 (Toma 50%)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-emerald-400 font-bold">
                    +${fmt(tp1ProfitEst)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs mt-0.5">
                  <span className="text-white font-bold">${fmt(tp1Price)}</span>
                  <span className="text-neutral-400 text-[11px]">(+{tp1DiffPct.toFixed(2)}%)</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isTp1Reached
                    ? '¡Objetivo tocado! Ejecuta la toma de la mitad de la posición.'
                    : `Faltan ${Math.max(0, remainingToTp1Pct).toFixed(2)}% para su ejecución.`}
                </div>
              </div>

              {/* TP2 Card */}
              <div
                className={`p-3 rounded-lg border flex flex-col gap-1.5 transition-colors ${
                  isTp2Reached
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                    : 'bg-neutral-950/60 border-neutral-800 text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Award
                      className={`w-3.5 h-3.5 ${isTp2Reached ? 'text-emerald-400' : 'text-neutral-500'}`}
                    />
                    <span>TP 2 (Maximización)</span>
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-emerald-400 font-bold">
                    +${fmt(tp2ProfitEst)} USDT
                  </span>
                </div>
                <div className="flex items-center justify-between font-mono text-xs mt-0.5">
                  <span className="text-white font-bold">${fmt(tp2Price)}</span>
                  <span className="text-neutral-400 text-[11px]">(+{tp2DiffPct.toFixed(2)}%)</span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {isTp2Reached
                    ? '¡Salida óptima total lograda!'
                    : 'Salida de la posición restante mediante Trailing Stop.'}
                </div>
              </div>
            </div>

            {/* Hover Explanatory Summary */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Ganancia total proyectada de la estrategia: +${fmt(tp1ProfitEst + tp2ProfitEst)} USDT.</span>
              </div>
              <span className="text-[10px] text-emerald-400/90 font-mono hidden sm:inline">
                TP Escalonado
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MILESTONE 5: PARÁMETRO DE PROTECCIÓN (STOP LOSS) */}
        {/* ========================================================= */}
        <div
          className="group relative flex items-start gap-4 transition-all duration-200"
          onMouseEnter={() => setActiveHoverStep('sl')}
          onMouseLeave={() => setActiveHoverStep(null)}
        >
          {/* Milestone Node */}
          <div className="absolute -left-[24px] sm:-left-[28px] top-1.5 z-20 flex items-center justify-center">
            <div
              className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
                isSlBreached
                  ? 'bg-rose-950 border-2 border-rose-500 text-rose-300 shadow-[0_0_14px_rgba(244,63,94,0.6)] animate-pulse'
                  : 'bg-neutral-900 border-2 border-neutral-700 text-neutral-400'
              } group-hover:scale-115 group-hover:border-rose-400`}
            >
              {isSlBreached ? (
                <AlertTriangle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400" />
              )}
            </div>
          </div>

          {/* Milestone Content Card */}
          <div
            className={`flex-1 rounded-xl p-3.5 sm:p-4 transition-all duration-200 shadow-md hover:-translate-y-0.5 border ${
              isSlBreached
                ? 'bg-rose-950/25 border-rose-500/50 hover:border-rose-400 shadow-rose-950/30'
                : 'bg-neutral-900/80 hover:bg-neutral-900 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Protección Stop Loss (Invalidación Técnica)</span>
                </span>
                <span
                  className={`px-2 py-0.2 rounded-full text-[9px] font-mono font-bold border ${
                    isSlBreached
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : isBreakEvenActive
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                  }`}
                >
                  {isSlBreached
                    ? 'STOP LOSS IMPACTADO'
                    : isBreakEvenActive
                    ? 'BLINDADO EN BREAK-EVEN'
                    : 'RIESGO ACOTADO'}
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-400 flex items-center gap-1">
                <span>Riesgo Máximo:</span>
                <strong className="text-rose-400">
                  {isBreakEvenActive ? '$0.00' : `-$${maxRiskUsd.toFixed(2)} USDT`}
                </strong>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2.5 pt-2.5 border-t border-neutral-800/80 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Nivel Stop Loss</span>
                <span className="text-rose-400 font-bold text-sm sm:text-base">${fmt(slPrice)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Distancia Porcentual</span>
                <span className="text-neutral-300 font-semibold">-{slDiffPct.toFixed(2)}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Pérdida Controlada</span>
                <span className="text-rose-400 font-semibold">
                  {isBreakEvenActive ? '0.00% (Sin Pérdida)' : `-${((maxRiskUsd / margin) * 100).toFixed(1)}% margen`}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-neutral-500 uppercase font-sans">Disciplina</span>
                <span className="text-neutral-400 text-[11px] font-sans">Regla Inmutable</span>
              </div>
            </div>

            {/* Explanatory text & hover insight */}
            <div className="mt-2.5 pt-2 border-t border-neutral-800/60 flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>
                  {isBreakEvenActive
                    ? 'El Stop Loss está colocado en el coste de entrada, eliminando riesgo negativo.'
                    : 'El Stop Loss previene pérdidas catastróficas. Respeta la salida sin promediar.'}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">
                SL Aislado
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
