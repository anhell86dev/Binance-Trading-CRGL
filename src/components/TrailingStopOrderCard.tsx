import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit2,
  Flame,
  HelpCircle,
  Layers,
  Percent,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { OpenOrder } from '../types/binance';
import { trailingStopService, TrailingStopRuntimeState } from '../services/trailingStopService';
import { livePriceService } from '../services/livePriceService';

interface TrailingStopOrderCardProps {
  order: OpenOrder;
  onCancel?: (orderId: string) => void;
  className?: string;
}

export const TrailingStopOrderCard: React.FC<TrailingStopOrderCardProps> = ({
  order,
  onCancel,
  className = '',
}) => {
  const [runtime, setRuntime] = useState<TrailingStopRuntimeState | undefined>(() =>
    trailingStopService.getRuntimeState(order.orderId)
  );
  const [isEditing, setIsEditing] = useState(false);
  const [newCallback, setNewCallback] = useState<string>(
    order.callbackRate ? String(order.callbackRate) : '1.5'
  );

  useEffect(() => {
    setRuntime(trailingStopService.getRuntimeState(order.orderId));
    const unsubscribe = trailingStopService.subscribe(() => {
      setRuntime(trailingStopService.getRuntimeState(order.orderId));
    });
    return () => unsubscribe();
  }, [order.orderId]);

  const symbol = order.symbol.trim().toUpperCase();
  const live = livePriceService.getPriceData(symbol);
  const currentPrice = live.price || order.price || 100;
  const isLong = order.side === 'SELL' || order.positionSide === 'LONG';

  const callbackRate = runtime?.callbackRate || order.callbackRate || 1.5;
  const isActivated = runtime ? runtime.isActivated : !order.activationPrice;
  const activationPrice = runtime?.activationPrice || order.activationPrice || 0;
  const extremePrice = runtime?.extremePrice || currentPrice;
  const dynamicStop = runtime?.dynamicStopPrice || (isLong ? extremePrice * (1 - callbackRate / 100) : extremePrice * (1 + callbackRate / 100));
  const adjustmentsCount = runtime?.adjustmentsCount || 0;

  const distanceUsdt = Math.abs(currentPrice - dynamicStop);
  const distancePct = currentPrice > 0 ? (distanceUsdt / currentPrice) * 100 : callbackRate;

  const fmt = (n: number) =>
    n >= 1000
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n >= 1
      ? n.toFixed(3)
      : n.toFixed(5);

  const handleUpdateCallback = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newCallback);
    if (val > 0 && val <= 10) {
      trailingStopService.updateTrailingStopConfig(order.orderId, { callbackRate: val });
      setIsEditing(false);
    }
  };

  return (
    <div
      id={`trailing-stop-card-${order.orderId}`}
      className={`relative flex flex-col gap-2.5 p-3 sm:p-4 rounded-xl bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-sky-500/30 hover:border-sky-400/60 shadow-lg transition-all ${className}`}
    >
      {/* Header: Badge TRAILING_STOP_MARKET y Estado de Activación */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          {/* Badge Tipo de Orden */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-950/80 border border-sky-500/50 text-sky-300 font-mono font-black text-xs shadow-xs">
            <Zap className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
            <span>TRAILING_STOP_MARKET</span>
          </span>

          <span className="font-bold text-white font-sans text-sm">{symbol}</span>

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              isLong
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80'
                : 'bg-rose-950/80 text-rose-300 border border-rose-700/80'
            }`}
          >
            {isLong ? 'CIERRA LONG (VENTA)' : 'CIERRA SHORT (COMPRA)'}
          </span>
        </div>

        {/* Estado: Pendiente de Activación vs Rastreando Activo */}
        <div className="flex items-center gap-2">
          {isActivated ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-500 text-emerald-300 font-mono font-bold text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Rastreando Activo</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/90 border border-amber-500 text-amber-300 font-mono font-bold text-[10px]">
              <Clock className="w-2.5 h-2.5 text-amber-400" />
              <span>Esperando Activación (${fmt(activationPrice)})</span>
            </span>
          )}

          {onCancel && (
            <button
              type="button"
              onClick={() => onCancel(order.orderId)}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-rose-950 hover:text-rose-300 text-neutral-400 text-xs font-semibold transition-colors cursor-pointer border border-neutral-700 hover:border-rose-700"
              title="Cancelar orden de Trailing Stop"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Grid Central: Métricas Clave de Binance Futures */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        {/* 1. Tasa de Callback (%) */}
        <div className="p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-[10px]">
            <span>Tasa de Callback:</span>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="text-sky-400 hover:text-sky-300 p-0.5"
              title="Modificar Callback %"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateCallback} className="flex items-center gap-1 mt-1">
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={newCallback}
                onChange={(e) => setNewCallback(e.target.value)}
                className="w-14 bg-neutral-950 border border-sky-500 rounded px-1 py-0.5 text-white font-mono text-xs"
              />
              <button
                type="submit"
                className="px-1.5 py-0.5 rounded bg-sky-500 text-neutral-950 font-bold text-[10px]"
              >
                OK
              </button>
            </form>
          ) : (
            <div className="text-sm font-bold text-amber-300 flex items-center gap-1 mt-0.5">
              <span>{callbackRate}%</span>
              <span className="text-[9px] font-normal text-neutral-400">
                ({runtime?.isAtrDerived ? 'ATR Dinámico' : 'Fijo'})
              </span>
            </div>
          )}
        </div>

        {/* 2. Pico Máximo (Long) / Mínimo (Short) */}
        <div className="p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400 text-[10px]">
            {isLong ? 'Pico Máximo (Peak):' : 'Mínimo Local (Trough):'}
          </span>
          <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-1">
            <span>${fmt(extremePrice)}</span>
            {isLong ? (
              <TrendingUp className="w-3 h-3 text-emerald-400" />
            ) : (
              <TrendingDown className="w-3 h-3 text-rose-400" />
            )}
          </div>
        </div>

        {/* 3. Stop Dinámico Reajustado */}
        <div className="p-2 rounded-lg bg-sky-950/30 border border-sky-500/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-sky-300 font-bold">
            <span>Stop Dinámico Actual:</span>
            {adjustmentsCount > 0 && (
              <span className="text-[9px] px-1 py-0.2 rounded bg-sky-900/80 text-sky-200">
                {adjustmentsCount} reajustes
              </span>
            )}
          </div>
          <div className="text-sm font-bold text-sky-300 mt-0.5 flex items-center gap-1">
            <span>${fmt(dynamicStop)}</span>
          </div>
        </div>

        {/* 4. Distancia al Stop / Salida */}
        <div className="p-2 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col justify-between">
          <span className="text-neutral-400 text-[10px]">Distancia al Cierre:</span>
          <div className="text-sm font-bold text-amber-300 mt-0.5 flex items-center gap-1">
            <span>{distancePct.toFixed(2)}%</span>
            <span className="text-[9px] text-neutral-400 font-normal">(${fmt(distanceUsdt)})</span>
          </div>
        </div>
      </div>

      {/* Barra de Progreso de Activación (Si la orden tiene precio condicional) */}
      {order.activationPrice && order.activationPrice > 0 && !isActivated && (
        <div className="p-2.5 rounded-lg bg-neutral-950 border border-amber-500/30 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-400">Progreso hacia el Precio de Activación:</span>
            <span className="text-amber-400 font-bold">
              {runtime?.activationProgressPct || 0}% (${fmt(currentPrice)} ➔ ${fmt(activationPrice)})
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-neutral-800 overflow-hidden">
            <div
              className="h-full bg-amber-400 transition-all duration-300 rounded-full"
              style={{ width: `${runtime?.activationProgressPct || 0}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer con regla transparente de Binance Futures */}
      <div className="flex flex-wrap items-center justify-between gap-1 pt-1.5 border-t border-neutral-800/80 text-[10px] font-mono text-neutral-400">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Activity className="w-3 h-3 text-sky-400" />
          <span>
            {isLong
              ? `Si el precio retrocede ${callbackRate}% desde el pico ($${fmt(extremePrice)}), se ejecuta venta a mercado a $${fmt(dynamicStop)}.`
              : `Si el precio rebota ${callbackRate}% desde el mínimo ($${fmt(extremePrice)}), se ejecuta compra a mercado a $${fmt(dynamicStop)}.`}
          </span>
        </div>
        <div className="text-neutral-400 text-[9px]">
          Refresca en vivo con velas 5m / WebSocket
        </div>
      </div>
    </div>
  );
};
