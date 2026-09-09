import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { notificationService } from '../services/notifications';
import { StrategyPositionTracker } from './StrategyPositionTracker';
import { getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';
import { TradeMultiPathChronology } from './TradeMultiPathChronology';
import { evaluateStrategyConfluence } from '../utils/confluenceEngine';
import { StrategyConfluenceDetailBadge } from './StrategyConfluenceDetailBadge';
import { StrategyConfluenceStatusBadge } from './StrategyConfluenceStatusBadge';
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
  ChevronDown,
  ChevronUp,
  Activity,
  Zap,
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
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Precios Tácticos
  const slPrice = tradeStatus.slPrice || (isLong ? entryPrice * 0.985 : entryPrice * 1.015);
  const tp1Price = tradeStatus.tp1Price || (isLong ? entryPrice * 1.025 : entryPrice * 0.975);
  const tp2Price = tradeStatus.tp2Price || (isLong ? entryPrice * 1.05 : entryPrice * 0.95);

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
    if (!num || isNaN(num)) return '0.00';
    if (num >= 1000) return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (num >= 1) return num.toFixed(2);
    if (num >= 0.01) return num.toFixed(4);
    return num.toFixed(6);
  };

  // Canvas para el Gráfico Táctico
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.max(100, Math.floor(rect.width));
      const h = Math.max(60, Math.floor(rect.height || 140));

      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.resetTransform();
      ctx.scale(dpr, dpr);

      // Fondo oscuro
      ctx.fillStyle = '#0a0d14';
      ctx.fillRect(0, 0, w, h);

      // Grid suave
      ctx.strokeStyle = '#1a202c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 40; x < w; x += 60) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
      }
      for (let y = 20; y < h; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
      }
      ctx.stroke();

      const prices = [entryPrice, currentLivePrice, slPrice, tp1Price];
      if (tp2Price > 0) prices.push(tp2Price);

      const minP = Math.min(...prices) * 0.997;
      const maxP = Math.max(...prices) * 1.003;
      const range = maxP - minP || 1;

      const getY = (val: number) => {
        const norm = (val - minP) / range;
        return h - 16 - norm * (h - 32);
      };

      const chartRightEdge = w - 100;

      // Dibujar niveles clave
      const drawLevel = (price: number, label: string, color: string, dashed = false) => {
        const y = Math.round(getY(price));
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        if (dashed) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.moveTo(0, y);
        ctx.lineTo(chartRightEdge, y);
        ctx.stroke();

        ctx.fillStyle = '#161c28';
        ctx.fillRect(chartRightEdge + 4, y - 9, w - chartRightEdge - 8, 18);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(chartRightEdge + 4, y - 9, w - chartRightEdge - 8, 18);

        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${label} $${formatVal(price)}`, chartRightEdge + 8, y + 4);
      };

      if (tp2Price) drawLevel(tp2Price, 'TP2', '#10b981', true);
      drawLevel(tp1Price, 'TP1', '#10b981', true);
      drawLevel(entryPrice, 'E1', '#0ea5e9');
      drawLevel(slPrice, 'SL', '#f43f5e');

      // Trayectoria LIVE
      const liveX = Math.max(70, Math.min(chartRightEdge - 20, chartRightEdge * 0.75));
      const liveY = getY(currentLivePrice);
      const entryY = getY(entryPrice);

      ctx.beginPath();
      ctx.strokeStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([]);
      ctx.moveTo(15, entryY);
      ctx.lineTo(liveX, liveY);
      ctx.stroke();

      // Marcador LIVE pulsante
      ctx.beginPath();
      ctx.arc(liveX, liveY, 7, 0, Math.PI * 2);
      ctx.fillStyle = isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(liveX, liveY, 4, 0, Math.PI * 2);
      ctx.fillStyle = isProfit ? '#10b981' : '#f43f5e';
      ctx.fill();

      // Etiqueta LIVE
      ctx.fillStyle = '#121722';
      const badgeText = `LIVE: $${formatVal(currentLivePrice)} (${isProfit ? '+' : ''}$${pnl.toFixed(2)})`;
      ctx.font = 'bold 9.5px monospace';
      const textW = ctx.measureText(badgeText).width;
      const badgeX = Math.max(10, Math.min(chartRightEdge - textW - 14, liveX - textW / 2));
      const badgeY = liveY < 25 ? liveY + 14 : liveY - 14;

      ctx.fillRect(badgeX - 4, badgeY - 9, textW + 8, 16);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(badgeX - 4, badgeY - 9, textW + 8, 16);

      ctx.fillStyle = '#f59e0b';
      ctx.fillText(badgeText, badgeX, badgeY + 3);
    };

    render();

    const ro = new ResizeObserver(() => {
      render();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
    };
  }, [currentLivePrice, entryPrice, slPrice, tp1Price, tp2Price, isLong, pnl, roe, isProfit]);

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

          {/* 2. MATRIZ MULTICAMINO DEL TRADE (GOOGLE SHEETS) */}
          <TradeMultiPathChronology
            position={position}
            status={tradeStatus}
            currentPrice={currentLivePrice}
            onMoveToBE={handleMoveToBE}
          />

          {/* 4. GRÁFICO TÁCTICO DE NIVELES EN VIVO (CANVAS) */}
          <div className="p-3 rounded-xl bg-neutral-900/60 border border-neutral-800 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] font-mono flex-wrap gap-2 text-neutral-300">
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                SL: ${formatVal(slPrice)}
              </span>
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                E1: ${formatVal(entryPrice)}
              </span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                TP1: ${formatVal(tp1Price)}
              </span>
              {tp2Price > 0 && (
                <span className="text-emerald-300 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  TP2: ${formatVal(tp2Price)}
                </span>
              )}
            </div>

            <div className="w-full h-32 relative rounded-lg overflow-hidden border border-neutral-800">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>

            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400">
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

          {/* 5. ACORDEÓN PARA ESTRATEGIA COMPLETA & PROTOCOLO DE 8 DISCIPLINAS */}
          <div className="pt-2 border-t border-neutral-800 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-850 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer w-full"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>
                  {showAdvancedTools
                    ? 'Ocultar Auditoría del Protocolo de 8 Disciplinas & Órdenes Condicionales'
                    : 'Ver Auditoría del Protocolo de 8 Disciplinas, Ficha Oficial de Estrategia & Órdenes'}
                </span>
              </div>
              {showAdvancedTools ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
            </button>

            {showAdvancedTools && (
              <div className="mt-2">
                <StrategyPositionTracker
                  position={position}
                  onLinkStrategy={onLinkStrategy}
                />
              </div>
            )}
          </div>

        </div>
      </td>
    </tr>
  );
};
