import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
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
import { PositionRisk } from '../types/binance';
import { trailingStopService } from '../services/trailingStopService';
import { advancedTechnicalConfluenceService } from '../services/advancedTechnicalConfluenceService';
import { livePriceService } from '../services/livePriceService';

interface TrailingStopConfigModalProps {
  position: PositionRisk;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TrailingStopConfigModal: React.FC<TrailingStopConfigModalProps> = ({
  position,
  onClose,
  onSuccess,
}) => {
  const isLong = position.positionAmt > 0;
  const symbol = position.symbol.trim().toUpperCase();
  const live = livePriceService.getPriceData(symbol);
  const currentPrice = live.price || position.markPrice || position.entryPrice;

  const [multiplier, setMultiplier] = useState<number>(1.5);
  const [useCustomCallback, setUseCustomCallback] = useState(false);
  const [customCallbackRate, setCustomCallbackRate] = useState<string>('1.5');
  const [useActivationPrice, setUseActivationPrice] = useState(false);
  const [activationMode, setActivationMode] = useState<'IMMEDIATE' | 'RR1_1' | 'TP1' | 'CUSTOM'>('RR1_1');
  const [customActivationPrice, setCustomActivationPrice] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confluence & ATR Data
  const confluence = advancedTechnicalConfluenceService.getConfluence(symbol, isLong);
  const atrValue = confluence.atr14 > 0 ? confluence.atr14 : position.entryPrice * 0.015;

  // Calculate dynamic ATR Callback Rate: ((Multiplier * ATR) / EntryPrice) * 100
  const atrCalc = trailingStopService.calculateAtrCallbackRate(symbol, position.entryPrice, multiplier);
  const effectiveCallbackRate = useCustomCallback
    ? parseFloat(customCallbackRate) || 1.5
    : atrCalc.callbackRate;

  // Activation Price preview
  let effectiveActivationPrice = 0;
  if (useActivationPrice) {
    if (activationMode === 'RR1_1') {
      const riskDistance = position.stopLoss && position.stopLoss > 0
        ? Math.abs(position.entryPrice - position.stopLoss)
        : position.entryPrice * 0.015;
      effectiveActivationPrice = isLong
        ? position.entryPrice + riskDistance
        : position.entryPrice - riskDistance;
    } else if (activationMode === 'TP1') {
      effectiveActivationPrice = position.takeProfit && position.takeProfit > 0
        ? position.takeProfit
        : isLong
        ? position.entryPrice * 1.02
        : position.entryPrice * 0.98;
    } else if (activationMode === 'CUSTOM') {
      effectiveActivationPrice = parseFloat(customActivationPrice) || currentPrice;
    }
  }

  // Preview of initial trailing stop trigger level
  const basePriceForStop = useActivationPrice && effectiveActivationPrice > 0
    ? effectiveActivationPrice
    : Math.max(currentPrice, position.entryPrice);

  const initialDynamicStopPreview = isLong
    ? basePriceForStop * (1 - effectiveCallbackRate / 100)
    : basePriceForStop * (1 + effectiveCallbackRate / 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await trailingStopService.createTrailingStopOrder({
        symbol,
        side: isLong ? 'SELL' : 'BUY',
        qty: Math.abs(position.positionAmt),
        entryPrice: position.entryPrice,
        atrMultiplier: multiplier,
        customCallbackRate: useCustomCallback ? effectiveCallbackRate : undefined,
        useActivationPrice,
        activationPrice: useActivationPrice ? Number(effectiveActivationPrice.toFixed(4)) : undefined,
        initialStopLossPrice: position.stopLoss,
        reduceOnly: true,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating trailing stop:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    n >= 1000
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n >= 1
      ? n.toFixed(3)
      : n.toFixed(5);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-neutral-900 border border-neutral-700/90 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center font-bold">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Configurar Trailing Stop ATR</h3>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-black uppercase ${
                    isLong ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {isLong ? 'LONG 📈' : 'SHORT 📉'} • {symbol}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Seguimiento dinámico de ganancias con Tasa de Callback por Volatilidad ATR
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de la Posición */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs font-mono">
          <div>
            <span className="text-neutral-400 text-[10px]">Precio de Entrada:</span>
            <div className="text-white font-bold">${fmt(position.entryPrice)}</div>
          </div>
          <div>
            <span className="text-neutral-400 text-[10px]">Precio en Vivo:</span>
            <div className="text-amber-300 font-bold">${fmt(currentPrice)}</div>
          </div>
          <div>
            <span className="text-neutral-400 text-[10px]">ATR (14 periodos):</span>
            <div className="text-sky-300 font-bold">${fmt(atrValue)} ({confluence.atr14Percent}%)</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* 1. Selección de Tasa de Callback (callbackRate) con fórmula ATR */}
          <div className="flex flex-col gap-2 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-amber-400" />
                <span>1. Tasa de Callback (% Distancia de Arrastre)</span>
              </label>
              <button
                type="button"
                onClick={() => setUseCustomCallback(!useCustomCallback)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-mono cursor-pointer"
              >
                {useCustomCallback ? 'Usar Fórmula ATR Dinámica' : 'Ingresar % Manual'}
              </button>
            </div>

            {!useCustomCallback ? (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400">Multiplicador ATR:</span>
                  {[1.0, 1.5, 2.0, 2.5, 3.0].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMultiplier(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        multiplier === m
                          ? 'bg-amber-500 text-neutral-950 shadow-md ring-1 ring-amber-400'
                          : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                      }`}
                    >
                      {m}x
                    </button>
                  ))}
                </div>

                {/* Fórmula Visual */}
                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Fórmula Binance Futures:</span>
                    <span className="text-amber-400 font-bold">
                      Callback = ((Mult × ATR) / Entrada) × 100
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-white pt-1 border-t border-neutral-800/80">
                    <span className="text-neutral-300">{atrCalc.formulaExplanation}</span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      {atrCalc.callbackRate}%
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="10.0"
                  value={customCallbackRate}
                  onChange={(e) => setCustomCallbackRate(e.target.value)}
                  placeholder="Ej: 1.5"
                  className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
                <span className="text-neutral-400 font-mono text-xs">%</span>
              </div>
            )}
          </div>

          {/* 2. Activación Condicional (activationPrice) */}
          <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-200 flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useActivationPrice}
                  onChange={(e) => setUseActivationPrice(e.target.checked)}
                  className="rounded text-amber-500 focus:ring-0 w-4 h-4 bg-neutral-900 border-neutral-700"
                />
                <span>2. Activación Condicional (Precio de Activación)</span>
              </label>
              <span className="text-[10px] text-neutral-400 font-mono">Opcional</span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              Si se activa, el Trailing Stop solo empezará a rastrear cuando el precio alcance este umbral de beneficio (ej. R:R 1:1), manteniendo mientras tanto tu Stop Loss fijo inicial como salvaguarda.
            </p>

            {useActivationPrice && (
              <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActivationMode('RR1_1')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activationMode === 'RR1_1'
                        ? 'bg-sky-500 text-neutral-950 shadow-md ring-1 ring-sky-400'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    R:R 1:1 ({position.stopLoss ? `$${fmt(effectiveActivationPrice)}` : '+1.5%'})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationMode('TP1')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activationMode === 'TP1'
                        ? 'bg-sky-500 text-neutral-950 shadow-md ring-1 ring-sky-400'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    Nivel TP1 ({position.takeProfit ? `$${fmt(position.takeProfit)}` : '+2.0%'})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivationMode('CUSTOM')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      activationMode === 'CUSTOM'
                        ? 'bg-sky-500 text-neutral-950 shadow-md ring-1 ring-sky-400'
                        : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                    }`}
                  >
                    Personalizado
                  </button>
                </div>

                {activationMode === 'CUSTOM' && (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="any"
                      value={customActivationPrice}
                      onChange={(e) => setCustomActivationPrice(e.target.value)}
                      placeholder={`Ej: ${fmt(currentPrice * (isLong ? 1.015 : 0.985))}`}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                    />
                    <span className="text-neutral-400 font-mono text-xs">USDT</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Previsualización del Comportamiento Dinámico */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-sky-500/30 flex flex-col gap-2 text-xs font-mono">
            <div className="flex items-center justify-between text-sky-400 font-bold text-[11px] uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>Previsualización Dinámica de Ejecución</span>
              </span>
              <span>Orden TRAILING_STOP_MARKET</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-neutral-300 pt-1">
              <div>
                <span className="text-neutral-400 text-[10px]">Tasa de Callback:</span>
                <div className="text-amber-300 font-bold">{effectiveCallbackRate}%</div>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px]">Precio de Activación:</span>
                <div className="text-white font-bold">
                  {useActivationPrice && effectiveActivationPrice > 0
                    ? `$${fmt(effectiveActivationPrice)}`
                    : 'Inmediata en Entrada'}
                </div>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px]">Stop Inicial Estimado:</span>
                <div className="text-emerald-300 font-bold">${fmt(initialDynamicStopPreview)}</div>
              </div>
              <div>
                <span className="text-neutral-400 text-[10px]">Regla de Salida:</span>
                <div className="text-neutral-300 text-[10px]">
                  Cierre por mercado al retroceder {effectiveCallbackRate}% desde el pico máximo.
                </div>
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              )}
              <span>Registrar Trailing Stop</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
