import React, { useState, useMemo, useEffect } from 'react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { notificationService } from '../services/notifications';
import { tradeMilestonesAlertService } from '../services/tradeMilestonesAlertService';
import { getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import { TradeMatrix } from './TradeMatrix';
import { evaluateStrategyConfluence } from '../utils/confluenceEngine';
import { StrategyConfluenceStatusBadge } from './StrategyConfluenceStatusBadge';
import { ApexTradePriceChart } from './ApexTradePriceChart';
import { TacticalPairVolatilityCard } from './TacticalPairVolatilityCard';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
import {
  ShieldCheck,
  ShieldAlert,
  Target,
  Edit2,
  TrendingUp,
  AlertTriangle,
  Lock,
  Layers,
  Sparkles,
  Activity,
  Zap,
  Volume2,
} from 'lucide-react';

interface PositionTacticalDetailRowProps {
  position: PositionRisk;
  openOrders: OpenOrder[];
  onOpenEditModal: (pos: PositionRisk) => void;
  onLinkStrategy?: (pos: PositionRisk) => void;
}

export const PositionTacticalDetailRow: React.FC<PositionTacticalDetailRowProps> = ({
  position,
  openOrders,
  onOpenEditModal,
  onLinkStrategy,
}) => {
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isLong = position.positionAmt > 0;
  const qty = Math.abs(position.positionAmt || 0);

  // 1. Precios en Vivo y Suscripción WebSocket pura en tiempo real
  const [livePrice, setLivePrice] = useState<number>(() => {
    const p = livePriceService.getPrice(position.symbol);
    if (p > 0) return p;
    const wsTicker = binanceWs.getTicker();
    if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) return wsTicker.lastPrice;
    return position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1);
  });

  useEffect(() => {
    const handleTickerUpdate = () => {
      const p = livePriceService.getPrice(position.symbol);
      if (p > 0) {
        setLivePrice(p);
      } else {
        const wsTicker = binanceWs.getTicker();
        if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) {
          setLivePrice(wsTicker.lastPrice);
        }
      }
    };

    handleTickerUpdate();
    const unsubLive = livePriceService.subscribe(handleTickerUpdate);
    const unsubWs = binanceWs.subscribe(handleTickerUpdate);

    return () => {
      unsubLive();
      unsubWs();
    };
  }, [position.symbol]);

  const currentLivePrice =
    livePrice > 0
      ? livePrice
      : (position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1));

  const entryPrice = position.entryPrice > 0 ? position.entryPrice : currentLivePrice;

  // 2. Estado de Hitos y Camino Múltiple
  const tradeStatus = useMemo(() => {
    return getTradeStatusAndPhase(position, openOrders);
  }, [position, openOrders, currentLivePrice]);

  // 3. Estrategia vinculada o detectada
  const effectiveStrategyId =
    position.strategyId ||
    binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyId ||
    'VVV-20260906-RANGO';

  const linkedStrategy = useMemo(() => {
    const all = strategyService.getStrategies();
    const cleanSym = position.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    return (
      all.find(
        (s) =>
          s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase() ||
          s.nombreEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase()
      ) ||
      all.find((s) => s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym)
    );
  }, [effectiveStrategyId, position.symbol]);

  const stratPrices = useMemo(() => {
    if (linkedStrategy) {
      return parsePricesFromStrategy(linkedStrategy);
    }
    return null;
  }, [linkedStrategy]);

  const linkedConfluence = useMemo(() => {
    if (!linkedStrategy || !stratPrices) return null;
    try {
      return evaluateStrategyConfluence(linkedStrategy, stratPrices, currentLivePrice);
    } catch {
      return null;
    }
  }, [linkedStrategy, stratPrices, currentLivePrice]);

  // Precios Tácticos y de Estrategia
  const e1Price = stratPrices?.entry1Price || entryPrice;
  const e2Price = stratPrices?.entry2Price || (isLong ? entryPrice * 0.985 : entryPrice * 1.015);
  const slPrice = tradeStatus.slPrice || stratPrices?.slPrice || (isLong ? entryPrice * 0.985 : entryPrice * 1.015);
  const tp1Price = tradeStatus.tp1Price || stratPrices?.tp1Price || (isLong ? entryPrice * 1.025 : entryPrice * 0.975);
  const tp2Price = tradeStatus.tp2Price || stratPrices?.tp2Price || (isLong ? entryPrice * 1.05 : entryPrice * 0.95);
  const tp3Price = stratPrices?.tpFinalPrice || (isLong ? entryPrice * 1.08 : entryPrice * 0.92);

  const [rowTime, setRowTime] = useState(Date.now());

  useEffect(() => {
    const unsub = tradeMilestonesAlertService.subscribe(() => setRowTime(Date.now()));
    const interval = setInterval(() => setRowTime(Date.now()), 1000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  // Alerta de hito reciente para esta posición (activa estrictamente por 10 segundos)
  const recentAlert = tradeMilestonesAlertService.getLatestActiveAlertForSymbol(position.symbol, 10000);
  const isRecentAlertActive = Boolean(recentAlert && (rowTime - recentAlert.timestamp < 10000));

  // Cálculos financieros
  const calculatedPnl = isLong
    ? (currentLivePrice - entryPrice) * qty
    : (entryPrice - currentLivePrice) * qty;

  const pnl = Number(calculatedPnl.toFixed(2));
  const isProfit = pnl >= 0;
  const margin =
    position.isolatedMargin > 0
      ? position.isolatedMargin
      : (qty * entryPrice) / Math.max(1, position.leverage || 5);
  const roe = margin > 0 ? (pnl / margin) * 100 : 0;
  const notionalUsd = qty * currentLivePrice;

  const formatVal = (num: number): string => {
    return formatPriceUtil(num, position.symbol);
  };

  // Acciones Rápidas
  const handleMoveToBE = async () => {
    if (!entryPrice || entryPrice <= 0) return;
    try {
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, entryPrice);
      setActionFeedback(`SL blindado a Break-Even ($${formatVal(entryPrice)})`);
      notificationService.notify(
        'SYSTEM',
        'Break-Even Activado',
        `${position.symbol}: Stop Loss ajustado al costo de entrada $${formatVal(entryPrice)}`,
        'high'
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Error ajustando SL a BE');
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handlePanicClose = async () => {
    try {
      await binanceWs.closePosition(position.symbol);
      setActionFeedback('Cierre a mercado enviado');
      notificationService.notify(
        'SL_HIT',
        'Cierre de Emergencia',
        `Orden a mercado para ${position.symbol} ejecutada.`,
        'urgent'
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Error en cierre');
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <tr className="bg-neutral-950/95 border-b border-neutral-800">
      <td colSpan={9} className="p-3 sm:p-4 bg-neutral-950/95">
        <div className="flex flex-col gap-3.5 w-full max-w-7xl mx-auto">
          
          {/* 1. BARRA SUPERIOR DE CABECERA Y ACCIONES RÁPIDAS */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-neutral-800">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white font-mono flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-amber-400" />
                {position.symbol}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                  isLong
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border-rose-800'
                }`}
              >
                {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x ISOLATED
              </span>

              {/* Estrategia vinculada */}
              {onLinkStrategy ? (
                <button
                  type="button"
                  onClick={() => onLinkStrategy(position)}
                  className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clic para cambiar o vincular estrategia de Google Sheets"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{effectiveStrategyId}</span>
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded bg-neutral-900 text-neutral-300 border border-neutral-800 text-[10px] font-mono">
                  {effectiveStrategyId}
                </span>
              )}

              {/* Confluencia de la estrategia ligada (basada en el estado de la hoja de cálculo) */}
              <StrategyConfluenceStatusBadge
                strategy={linkedStrategy}
                confluence={linkedConfluence}
                hasPosition={true}
                compact={true}
              />

              {/* Badge PnL / ROE */}
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1 ${
                  isProfit
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950/80 text-rose-300 border-rose-700'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>{isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} USDT</span>
                <span>({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE)</span>
              </span>

              {/* Feedback toast */}
              {actionFeedback && (
                <span className="px-2 py-0.5 rounded bg-amber-500 text-neutral-950 font-bold font-mono text-[10px] animate-pulse">
                  {actionFeedback}
                </span>
              )}
            </div>

            {/* Botones de acción operativa inmediata */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleMoveToBE}
                className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-700 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title={`Mover Stop Loss al costo de entrada ($${formatVal(entryPrice)}) para garantizar 0 riesgo`}
              >
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Mover a BE (${formatVal(entryPrice)})</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenEditModal(position)}
                className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Ajustar parámetros de Take Profit y Stop Loss en Binance"
              >
                <Edit2 className="w-3 h-3 text-amber-400" />
                <span>Ajustar TP/SL</span>
              </button>

              <button
                type="button"
                onClick={handlePanicClose}
                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Cerrar inmediatamente la posición al precio de mercado"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Cierre Pánico</span>
              </button>
            </div>
          </div>

          {/* 2. MATRIZ MULTICAMINO DEL TRADE (NODOS INTERCONECTADOS) */}
          <TradeMatrix
            position={position}
            status={tradeStatus}
            currentPrice={currentLivePrice}
            onMoveToBE={handleMoveToBE}
          />

          {/* 4. GRÁFICO TÁCTICO DE NIVELES EN VIVO CON APEXCHARTS LINECHART */}
          <div className="flex flex-col gap-2">
            {/* Alerta de hito activo en esta posición si cruzó algún nivel clave (desaparece a los 10 segundos) */}
            {isRecentAlertActive && recentAlert && (() => {
              const elapsed = Math.max(0, Math.min(10000, rowTime - recentAlert.timestamp));
              const remainingSeconds = Math.max(1, Math.ceil((10000 - elapsed) / 1000));

              return (
                <div
                  className={`relative overflow-hidden px-3 py-2 rounded-lg border text-xs font-mono flex items-center justify-between gap-2 shadow-xs ${
                    recentAlert.milestone === 'SL'
                      ? 'bg-rose-950/80 border-rose-600 text-rose-200 animate-pulse'
                      : recentAlert.milestone.startsWith('TP')
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-200'
                      : 'bg-amber-950/80 border-amber-600 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">🚨 Hito Cruzado: {recentAlert.milestone}</span>
                    <span className="text-neutral-300">
                      a ${formatVal(recentAlert.triggerPrice)} (Nivel ${formatVal(recentAlert.levelPrice)})
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-black/40 text-[9px] text-amber-300 border border-amber-500/30">
                      ⏱ Cierra en {remainingSeconds}s • Queda no leída en campana
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => notificationService.playMilestoneSound(recentAlert.milestone)}
                    className="px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] flex items-center gap-1 border border-neutral-700 cursor-pointer shrink-0"
                    title="Re-escuchar sonido de la alerta"
                  >
                    <Volume2 className="w-3 h-3 text-amber-400" />
                    <span>Sonido</span>
                  </button>

                  {/* Barra de progreso de 10 segundos */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
                    <div
                      className="h-full bg-amber-400/80 transition-all duration-300 ease-linear"
                      style={{
                        width: `${Math.max(0, 100 - (elapsed / 10000) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })()}

            {/* ApexCharts LineChart para seguimiento en vivo del precio y niveles E1, E2, TP1-3, SL */}
            <ApexTradePriceChart
              symbol={position.symbol}
              isLong={isLong}
              entryPrice={entryPrice}
              currentPrice={currentLivePrice}
              e2Price={e2Price}
              tp1Price={tp1Price}
              tp2Price={tp2Price}
              tp3Price={tp3Price}
              slPrice={slPrice}
              height={240}
            />

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-1">
              <span>Volumen Nocional: <strong className="text-white">${notionalUsd.toFixed(2)} USDT</strong></span>
              <span>Margen Aislado: <strong className="text-white">${(position.isolatedMargin || margin || 0).toFixed(2)} USDT</strong></span>
              <span>
                PnL Flotante:{' '}
                <strong className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
                  {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE)
                </strong>
              </span>
            </div>
          </div>

          {/* 3. HISTÓRICO DE VOLATILIDAD (SPARKLINE & BARRAS) */}
          <div className="pt-2 border-t border-neutral-800">
            <TacticalPairVolatilityCard
              symbol={position.symbol}
              isLong={isLong}
              markPrice={currentLivePrice}
              entryPrice={entryPrice}
              slPrice={slPrice}
              tp1Price={tp1Price}
            />
          </div>

        </div>
      </td>
    </tr>
  );
};
