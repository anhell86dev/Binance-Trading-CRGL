import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ExternalLink,
  Layers,
  Lock,
  Maximize2,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { OrderSide, OrderType, ScaledOrderConfig, TrailingStopConfig } from '../types/binance';
import { AssetSelectorModal } from './AssetSelectorModal';
import { normalizeBinanceSymbol } from '../data/binancePairs';
import { LeverageSliderMax5x } from './LeverageSliderMax5x';
import { IsolatedMarginLock } from './IsolatedMarginLock';
import { RiskManagementInputs } from './RiskManagementInputs';
import { LiquidationPreview } from './LiquidationPreview';
import { strategyAutofillService, AutofillPayload } from '../services/strategyAutofillService';

export interface OrderFormProps {
  isModal?: boolean;
  onClose?: () => void;
  onPopOut?: () => void;
}

export const OrderForm: React.FC<OrderFormProps> = ({ isModal = false, onClose, onPopOut }) => {
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [balance, setBalance] = useState(binanceWs.getBalance());
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('LIMIT');

  // STRICT RISK RULE: Leverage 1x to 5x ONLY!
  const [leverage, setLeverage] = useState<number>(2);

  // Asset Selector Modal state
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  // Core Order inputs
  const [price, setPrice] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('0.05');

  // Scaled Orders inputs
  const [scaledMinPrice, setScaledMinPrice] = useState<string>('');
  const [scaledMaxPrice, setScaledMaxPrice] = useState<string>('');
  const [scaledCount, setScaledCount] = useState<number>(5);
  const [scaledDistribution, setScaledDistribution] = useState<'flat' | 'arithmetic' | 'geometric'>('arithmetic');

  // Trailing Stop inputs
  const [trailingCallback, setTrailingCallback] = useState<number>(1.0); // 1.0%
  const [trailingActivation, setTrailingActivation] = useState<string>('');

  // Dynamic TP / SL inputs
  const [enableTPSL, setEnableTPSL] = useState<boolean>(true);
  const [tpPrice, setTpPrice] = useState<string>('');
  const [slPrice, setSlPrice] = useState<string>('');
  const [loadedStrategyNotice, setLoadedStrategyNotice] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
      setBalance(binanceWs.getBalance());
    });

    // Listen to Strategy Autoejecutar events
    const unsubAutofill = strategyAutofillService.subscribe((payload: AutofillPayload) => {
      if (payload.symbol) {
        binanceWs.setSymbol(payload.symbol);
      }
      if (payload.side) setSide(payload.side);
      if (payload.orderType) setOrderType(payload.orderType as OrderType);
      if (payload.leverage) setLeverage(Math.min(5, Math.max(1, payload.leverage)));
      if (payload.price) setPrice(payload.price.toString());
      if (payload.quantity) setQuantity(payload.quantity.toString());
      if (payload.slPrice) setSlPrice(payload.slPrice.toString());
      if (payload.tpPrice) setTpPrice(payload.tpPrice.toString());
      setEnableTPSL(true);

      if (payload.strategyName) {
        setLoadedStrategyNotice(
          `Parámetros cargados de "${payload.strategyName}" (${payload.leverage}x ISOLATED | R:B 1:${payload.riskReward})`
        );
        setTimeout(() => setLoadedStrategyNotice(null), 6000);
      }
    });

    return () => {
      unsubWs();
      unsubAutofill();
    };
  }, []);

  // Format price helper according to coin value
  const formatCoinPrice = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 100) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  // Update default price when symbol changes or initially
  useEffect(() => {
    if (ticker.lastPrice) {
      if (!price || price === '0.00') {
        setPrice(formatCoinPrice(ticker.lastPrice));
      }
      setScaledMinPrice(formatCoinPrice(ticker.lastPrice * 0.98));
      setScaledMaxPrice(formatCoinPrice(ticker.lastPrice * 1.02));
    }
  }, [ticker.symbol]);

  // Handle Quick Size buttons
  const handleQuickPercent = (pct: number) => {
    const currentP = parseFloat(price) || ticker.lastPrice;
    if (!currentP || currentP <= 0) return;
    const maxMargin = balance.availableBalance * (pct / 100);
    const maxNotional = maxMargin * leverage;
    const qty = maxNotional / currentP;

    // Adaptive quantity precision
    if (qty >= 100) {
      setQuantity(qty.toFixed(1));
    } else if (qty >= 1) {
      setQuantity(qty.toFixed(3));
    } else {
      setQuantity(qty.toFixed(4));
    }
  };

  const handleLeverageChange = (val: number) => {
    const safeVal = Math.min(5, Math.max(1, val));
    setLeverage(safeVal);
  };

  const handleSelectSymbol = (newSymbol: string) => {
    const normalized = normalizeBinanceSymbol(newSymbol);
    binanceWs.setSymbol(normalized);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const qtyNum = parseFloat(quantity);
      if (!qtyNum || qtyNum <= 0) {
        throw new Error('Ingresa una cantidad válida mayor a 0');
      }

      const safeLeverage = Math.min(5, Math.max(1, leverage));

      if (orderType === 'LIMIT') {
        const priceNum = parseFloat(price);
        if (!priceNum || priceNum <= 0) throw new Error('Ingresa un precio límite válido');

        await binanceWs.placeLimitOrder({
          symbol: ticker.symbol,
          side,
          quantity: qtyNum,
          price: priceNum,
          leverage: safeLeverage,
          tpPrice: enableTPSL && tpPrice ? parseFloat(tpPrice) : undefined,
          slPrice: enableTPSL && slPrice ? parseFloat(slPrice) : undefined,
        });

        setMessage({
          type: 'success',
          text: `Orden Limit enviada a Binance Futures: ${side} ${qtyNum} ${ticker.symbol} @ $${priceNum} (${safeLeverage}x ISOLATED)`,
        });
      } else if (orderType === 'SCALED') {
        const minP = parseFloat(scaledMinPrice);
        const maxP = parseFloat(scaledMaxPrice);
        if (!minP || !maxP || minP >= maxP) {
          throw new Error('El precio mínimo debe ser menor al precio máximo');
        }

        const config: ScaledOrderConfig = {
          symbol: ticker.symbol,
          side,
          totalQuantity: qtyNum,
          ordersCount: scaledCount,
          minPrice: minP,
          maxPrice: maxP,
          distribution: scaledDistribution,
          leverage: safeLeverage,
        };

        await binanceWs.placeScaledOrders(config);
        setMessage({
          type: 'success',
          text: `Orden escalonada de ${scaledCount} niveles creada en Binance para ${ticker.symbol}`,
        });
      } else if (orderType === 'TRAILING_STOP_MARKET') {
        const config: TrailingStopConfig = {
          symbol: ticker.symbol,
          side,
          quantity: qtyNum,
          callbackRate: trailingCallback,
          activationPrice: trailingActivation ? parseFloat(trailingActivation) : undefined,
          leverage: safeLeverage,
        };

        await binanceWs.placeTrailingStopOrder(config);
        setMessage({
          type: 'success',
          text: `Trailing Stop para ${ticker.symbol} activado con ${trailingCallback}% de retroceso (${safeLeverage}x ISOLATED)`,
        });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error al ejecutar orden en Binance' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calcPrice = parseFloat(price) || ticker.lastPrice || 0;
  const calcQty = parseFloat(quantity) || 0;
  const notionalValue = calcPrice * calcQty;
  const initialMargin = leverage > 0 ? notionalValue / leverage : 0;
  const baseAsset = ticker.symbol.replace('USDT', '');

  return (
    <div id="futures-order-form-card" className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3.5 shadow-lg">
      {/* Autoejecutar Loaded Notice Banner */}
      {loadedStrategyNotice && (
        <div className="bg-amber-500/15 border border-amber-500/40 rounded-lg p-2.5 flex items-center justify-between text-xs text-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{loadedStrategyNotice}</span>
          </div>
          <button
            onClick={() => setLoadedStrategyNotice(null)}
            className="text-amber-400 hover:text-white text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20"
          >
            OK
          </button>
        </div>
      )}

      {/* Asset Selector Header - Support Any Binance Asset */}
      <div className="flex flex-col gap-2 pb-2.5 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Formulario Binance Futures
            </h3>
            {isModal && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                Popup
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-neutral-400">TIF:</span>
              <span className="px-1.5 py-0.5 rounded bg-neutral-800 font-bold text-amber-400 border border-neutral-700">
                GTC
              </span>
            </div>
            {onPopOut && !isModal && (
              <button
                type="button"
                onClick={onPopOut}
                className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-amber-400 border border-neutral-700 transition-colors"
                title="Abrir en ventana emergente (Popup)"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded bg-neutral-800 hover:bg-rose-900/50 text-neutral-400 hover:text-rose-300 border border-neutral-700 transition-colors"
                title="Cerrar ventana emergente"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Asset Chooser Button */}
        <div className="flex items-center justify-between bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              id="orderform-change-asset-btn"
              onClick={() => setIsAssetModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-white transition-all text-xs font-bold font-mono group"
              title="Cambiar o buscar cualquier activo listado en Binance Futures"
            >
              <span className="text-amber-400">{ticker.symbol}</span>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 group-hover:text-amber-400" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Precio Binance</span>
              <span className="text-xs font-mono font-bold text-emerald-400">
                ${formatCoinPrice(ticker.lastPrice)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsAssetModalOpen(true)}
            className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            <Search className="w-3 h-3" />
            <span>Todos los Activos</span>
          </button>
        </div>
      </div>

      {/* 1. Bloqueo de Margen en Modo Aislado */}
      <IsolatedMarginLock />

      {/* 2. Control de Apalancamiento Restringido (1x-5x Máx) */}
      <LeverageSliderMax5x value={leverage} onChange={handleLeverageChange} />

      {/* Side Selector (Long / Short) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          id="side-buy-btn"
          onClick={() => setSide('BUY')}
          className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            side === 'BUY'
              ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          Comprar / Long
        </button>

        <button
          type="button"
          id="side-sell-btn"
          onClick={() => setSide('SELL')}
          className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
            side === 'SELL'
              ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400'
              : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <ArrowDownRight className="w-4 h-4" />
          Vender / Short
        </button>
      </div>

      {/* Order Type Tabs */}
      <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs font-medium">
        <button
          type="button"
          onClick={() => setOrderType('LIMIT')}
          className={`py-1.5 rounded transition-all ${
            orderType === 'LIMIT'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Limit
        </button>
        <button
          type="button"
          onClick={() => setOrderType('SCALED')}
          className={`py-1.5 rounded transition-all ${
            orderType === 'SCALED'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Escalonada
        </button>
        <button
          type="button"
          onClick={() => setOrderType('TRAILING_STOP_MARKET')}
          className={`py-1.5 rounded transition-all ${
            orderType === 'TRAILING_STOP_MARKET'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-sm'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          Trailing Stop
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {/* Dynamic Fields for Order Type */}
        {orderType === 'LIMIT' && (
          <div>
            <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
              <span>Precio Límite (USDT)</span>
              <button
                type="button"
                onClick={() => setPrice(formatCoinPrice(ticker.lastPrice))}
                className="text-amber-400 hover:underline text-[11px]"
              >
                Último: ${formatCoinPrice(ticker.lastPrice)}
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-500/80"
                placeholder={formatCoinPrice(ticker.lastPrice)}
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">USDT</span>
            </div>
          </div>
        )}

        {/* Scaled Orders (Orden Escalonada) Inputs */}
        {orderType === 'SCALED' && (
          <div className="flex flex-col gap-2.5 bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
              <Layers className="w-3.5 h-3.5" />
              <span>Rango de Precios para Escalón ({ticker.symbol})</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Precio Mínimo</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={scaledMinPrice}
                  onChange={(e) => setScaledMinPrice(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                  placeholder="Min USDT"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Precio Máximo</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={scaledMaxPrice}
                  onChange={(e) => setScaledMaxPrice(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                  placeholder="Max USDT"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Número de Órdenes ({scaledCount})</label>
                <input
                  type="range"
                  min="2"
                  max="12"
                  value={scaledCount}
                  onChange={(e) => setScaledCount(parseInt(e.target.value))}
                  className="w-full accent-amber-500 h-1 bg-neutral-800 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">Distribución</label>
                <select
                  value={scaledDistribution}
                  onChange={(e) => setScaledDistribution(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200"
                >
                  <option value="flat">Equitativa (Plana)</option>
                  <option value="arithmetic">Aumentando (Aritmética)</option>
                  <option value="geometric">Exponencial</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Trailing Stop Inputs */}
        {orderType === 'TRAILING_STOP_MARKET' && (
          <div className="flex flex-col gap-2.5 bg-neutral-950/60 p-3 rounded-lg border border-neutral-800">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Tasa de Retorno (Callback Rate):</span>
              <span className="text-amber-400 font-mono font-bold">{trailingCallback}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="5.0"
              step="0.1"
              value={trailingCallback}
              onChange={(e) => setTrailingCallback(parseFloat(e.target.value))}
              className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
              <span>0.2%</span>
              <span>1.0%</span>
              <span>2.5%</span>
              <span>5.0%</span>
            </div>

            <div>
              <label className="text-[11px] text-neutral-400 block mb-1">Precio de Activación (Opcional)</label>
              <input
                type="number"
                step="any"
                value={trailingActivation}
                onChange={(e) => setTrailingActivation(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                placeholder={`Vacío = Inmediato ($${formatCoinPrice(ticker.lastPrice)})`}
              />
            </div>
          </div>
        )}

        {/* Quantity Input */}
        <div>
          <div className="flex justify-between items-center text-xs text-neutral-400 mb-1">
            <span>
              {orderType === 'SCALED' ? 'Cantidad Total' : 'Cantidad'} ({baseAsset})
            </span>
            <span className="text-neutral-400 text-[11px]">
              Disp: ${(balance.availableBalance * leverage).toFixed(1)} USDT
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="any"
              required
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-500/80"
              placeholder="0.05"
            />
            <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">
              {baseAsset}
            </span>
          </div>

          {/* Quick % buttons */}
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[25, 50, 75, 100].map((pct) => (
              <button
                type="button"
                key={pct}
                onClick={() => handleQuickPercent(pct)}
                className="py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-white transition-colors"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 3. Campos de Salida Automatizada (Stop-Loss y Take-Profit Dinámicos) */}
        {orderType === 'LIMIT' && (
          <RiskManagementInputs
            entryPrice={calcPrice}
            side={side}
            stopLossPrice={slPrice}
            takeProfitPrice={tpPrice}
            onChangeStopLoss={setSlPrice}
            onChangeTakeProfit={setTpPrice}
            quantity={calcQty}
          />
        )}

        {/* 4. Cálculo de Liquidación en Tiempo Real */}
        <LiquidationPreview
          entryPrice={calcPrice}
          side={side}
          leverage={leverage}
          marginType="ISOLATED"
        />

        {/* Order Cost & Margin Calculation Overview */}
        <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800 text-xs font-mono flex flex-col gap-1">
          <div className="flex justify-between text-neutral-400">
            <span>Valor Nocional:</span>
            <span className="text-neutral-200">${notionalValue.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-neutral-400">
            <span>Margen Requerido ({leverage}x ISOLATED):</span>
            <span className="text-amber-400 font-bold">${initialMargin.toFixed(2)} USDT</span>
          </div>
          <div className="flex justify-between text-neutral-400 text-[11px]">
            <span>Comisión estimada (0.04%):</span>
            <span>${(notionalValue * 0.0004).toFixed(3)} USDT</span>
          </div>
        </div>

        {/* Submit Status / Error Message */}
        {message && (
          <div
            className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                : 'bg-rose-950/60 text-rose-300 border border-rose-800'
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{message.text}</span>
          </div>
        )}

        {/* Big Submit Button */}
        <button
          type="submit"
          id="submit-order-btn"
          disabled={isSubmitting}
          className={`w-full py-2.5 rounded-lg font-bold text-xs sm:text-sm uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
            side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/40'
              : 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-950/40'
          } ${isSubmitting ? 'opacity-70 cursor-not-allowed animate-pulse ring-2 ring-amber-400' : ''}`}
        >
          {isSubmitting ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
              <span>Ejecutando {side === 'BUY' ? 'LONG' : 'SHORT'} en Binance...</span>
            </>
          ) : (
            <>
              {side === 'BUY' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>
                {side === 'BUY' ? 'Comprar / Long' : 'Vender / Short'} {ticker.symbol} ({leverage}x Isolated)
              </span>
            </>
          )}
        </button>
      </form>

      {/* Asset Selector Modal */}
      <AssetSelectorModal
        isOpen={isAssetModalOpen}
        onClose={() => setIsAssetModalOpen(false)}
        onSelectSymbol={handleSelectSymbol}
        currentSymbol={ticker.symbol}
      />
    </div>
  );
};

export const FuturesOrderForm = OrderForm;
