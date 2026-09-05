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

export const OrderForm: React.FC = ({ isModal = false, onClose, onPopOut }) => {
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [balance, setBalance] = useState(binanceWs.getBalance());
  const [side, setSide] = useState('BUY');
  const [orderType, setOrderType] = useState('LIMIT');
  const [leverage, setLeverage] = useState(2);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('0.05');
  const [scaledMinPrice, setScaledMinPrice] = useState('');
  const [scaledMaxPrice, setScaledMaxPrice] = useState('');
  const [scaledCount, setScaledCount] = useState(5);
  const [scaledDistribution, setScaledDistribution] = useState<'flat' | 'arithmetic' | 'geometric'>('arithmetic');
  const [trailingCallback, setTrailingCallback] = useState(1.0);
  const [trailingActivation, setTrailingActivation] = useState('');
  const [enableTPSL, setEnableTPSL] = useState(true);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');
  const [loadedStrategyNotice, setLoadedStrategyNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
      setBalance(binanceWs.getBalance());
    });

    const unsubAutofill = strategyAutofillService.subscribe((payload: AutofillPayload) => {
      if (payload.symbol) {
        binanceWs.setSymbol(payload.symbol);
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
            `Pará¡¡metros cargados de "${payload.strategyName}" (${payload.leverage}x ISOLATED | R:B 1:${payload.riskReward})`
          );
          setTimeout(() => setLoadedStrategyNotice(null), 6000);
        }
      }
    });

    return () => {
      unsubWs();
      unsubAutofill();
    };
  }, []);

  const formatCoinPrice = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 100) return p.toFixed(2);
    if (p >= 1) return p.toFixed(4);
    return p.toFixed(6);
  };

  useEffect(() => {
    if (ticker.lastPrice) {
      if (!price || price === '0.00') {
        setPrice(formatCoinPrice(ticker.lastPrice));
      }
      setScaledMinPrice(formatCoinPrice(ticker.lastPrice * 0.98));
      setScaledMaxPrice(formatCoinPrice(ticker.lastPrice * 1.02));
    }
  }, [ticker.symbol]);

  const handleQuickPercent = (pct: number) => {
    const currentP = parseFloat(price) || ticker.lastPrice;
    if (!currentP || currentP <= 0) return;
    const maxMargin = balance.availableBalance * (pct / 100);
    const maxNotional = maxMargin * leverage;
    const qty = maxNotional / currentP;
    if (qty >= 100) {
      setQuantity(qty.toFixed(1));
    } else if (qty >= 1) {
      setQuantity(qty.toFixed(3));
    } else {
      setQuantity(qty.toFixed(4));
    }
  };

  const handleLeverageChange = (val: number) => {
    setLeverage(Math.min(5, Math.max(1, val)));
  };

  const handleSelectSymbol = (newSymbol: string) => {
    binanceWs.setSymbol(normalizeBinanceSymbol(newSymbol));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    try {
      const qtyNum = parseFloat(quantity);
      if (!qtyNum || qtyNum <= 0) throw new Error('Ingresa una cantidad váá¡¡lida mayor a 0');
      const safeLeverage = Math.min(5, Math.max(1, leverage));

      if (orderType === 'LIMIT') {
        const priceNum = parseFloat(price);
        if (!priceNum || priceNum <= 0) throw new Error('Ingresa un precio lí­mite váá¡¡lido');
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
        if (!minP || !maxP || minP >= maxP) throw new Error('El precio mí­nimo debe ser menor al precio máá¡¡ximo');
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
    <div className="flex flex-col h-full bg-neutral-900/40">
      {loadedStrategyNotice && (
        <div className="flex items-center justify-between px-3 py-2 bg-amber-500/10 border-b border-amber-500/30">
          <span className="text-[11px] font-mono text-amber-300">{loadedStrategyNotice}</span>
          <button onClick={() => setLoadedStrategyNotice(null)} className="text-amber-400 hover:text-white text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20">OK</button>
        </div>
      )}

      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsAssetModalOpen(true)} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 hover:border-amber-500/50 text-white transition-all text-xs font-bold font-mono group" title="Cambiar o buscar cualquier activo listado en Binance Futures">
            <Search size={14} className="text-amber-400 group-hover:text-amber-300" />
            <span>{ticker.symbol}</span>
          </button>
          <div className="text-xs text-neutral-400">
            <span className="text-[10px] uppercase font-bold">Precio</span>
            <div className="text-xs font-mono font-bold text-white">${formatCoinPrice(ticker.lastPrice)}</div>
          </div>
          <button onClick={() => setIsAssetModalOpen(true)} className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all">
            <Layers size={12} />Todos los Activos
          </button>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-neutral-500 font-mono">
          <span>TIF:</span>
          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">GTC</span>
          {onPopOut && !isModal && <button onClick={onPopOut} className="p-1.5 rounded hover:bg-neutral-800" title="Popup"><ExternalLink size={14} /></button>}
          {isModal && onClose && <button onClick={onClose} className="p-1.5 rounded hover:bg-neutral-800" title="Cerrar"><X size={14} /></button>}
        </div>
      </div>

      <div className="flex-1 flex gap-3 p-3 overflow-hidden">
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setSide('BUY')} className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${side === 'BUY' ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'}`}>
              <ArrowUpRight size={16} />Comprar / Long
            </button>
            <button onClick={() => setSide('SELL')} className={`py-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${side === 'SELL' ? 'bg-rose-600 text-white shadow-md ring-1 ring-rose-400' : 'bg-neutral-800 text-neutral-400 hover:text-neutral-200'}`}>
              <ArrowDownRight size={16} />Vender / Short
            </button>
          </div>

          <div className="flex gap-1 p-1 rounded-lg bg-neutral-900 border border-neutral-800">
            <button onClick={() => setOrderType('LIMIT')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${orderType === 'LIMIT' ? 'bg-neutral-800 text-amber-300 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}>Limit</button>
            <button onClick={() => setOrderType('SCALED')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${orderType === 'SCALED' ? 'bg-neutral-800 text-amber-300 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}>Escalonada</button>
            <button onClick={() => setOrderType('TRAILING_STOP_MARKET')} className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${orderType === 'TRAILING_STOP_MARKET' ? 'bg-neutral-800 text-amber-300 shadow-sm' : 'text-neutral-400 hover:text-neutral-200'}`}>Trailing</button>
          </div>

          {orderType === 'LIMIT' && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Precio Lí­mite (USDT)</label>
                <div className="relative">
                  <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-500/80" placeholder={formatCoinPrice(ticker.lastPrice)} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">USDT</span>
                </div>
                <button onClick={() => setPrice(formatCoinPrice(ticker.lastPrice))} className="mt-1 text-amber-400 hover:underline text-[11px]">Úºltimo: ${formatCoinPrice(ticker.lastPrice)}</button>
              </div>
            </div>
          )}

          {orderType === 'SCALED' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">Precio Mí¡¡n</label>
                  <input type="number" value={scaledMinPrice} onChange={(e) => setScaledMinPrice(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white" placeholder="Min USDT" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-neutral-400 mb-1">Precio Máá¡¡x</label>
                  <input type="number" value={scaledMaxPrice} onChange={(e) => setScaledMaxPrice(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white" placeholder="Max USDT" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">NÚºmero de Órdenes ({scaledCount})</label>
                <input type="range" min="2" max="20" value={scaledCount} onChange={(e) => setScaledCount(parseInt(e.target.value))} className="w-full accent-amber-500 h-1 bg-neutral-800 rounded cursor-pointer" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Distribució¡¡¢n</label>
                <select value={scaledDistribution} onChange={(e) => setScaledDistribution(e.target.value as any)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2 py-1 text-xs text-neutral-200">
                  <option value="flat">Equitativa (Plana)</option>
                  <option value="arithmetic">Aumentando (Aritmé¡¡tica)</option>
                  <option value="geometric">Exponencial</option>
                </select>
              </div>
            </div>
          )}

          {orderType === 'TRAILING_STOP_MARKET' && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Callback Rate: {trailingCallback}%</label>
                <input type="range" min="0.2" max="5.0" step="0.1" value={trailingCallback} onChange={(e) => setTrailingCallback(parseFloat(e.target.value))} className="w-full accent-amber-500 h-1.5 bg-neutral-800 rounded cursor-pointer" />
                <div className="flex justify-between text-[10px] text-neutral-500 mt-1">
                  <span>0.2%</span><span>1.0%</span><span>2.5%</span><span>5.0%</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-neutral-400 mb-1">Precio de Activació¡¡¢n (Opcional)</label>
                <input type="number" value={trailingActivation} onChange={(e) => setTrailingActivation(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded px-2.5 py-1.5 text-xs font-mono text-white" placeholder={`Vací¡¡o = Inmediato ($${formatCoinPrice(ticker.lastPrice)})`} />
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold text-neutral-400">{orderType === 'SCALED' ? 'Cantidad Total' : 'Cantidad'} ({baseAsset})</label>
              <span className="text-[10px] text-neutral-500">Disp: ${(balance.availableBalance * leverage).toFixed(1)} USDT</span>
            </div>
            <div className="relative">
              <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-hidden focus:border-amber-500/80" placeholder="0.05" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-neutral-500">{baseAsset}</span>
            </div>
            <div className="grid grid-cols-4 gap-1 mt-2">
              {[25, 50, 75, 100].map((pct) => (
                <button key={pct} onClick={() => handleQuickPercent(pct)} className="py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-[11px] font-mono text-neutral-300 hover:text-white transition-colors">{pct}%</button>
              ))}
            </div>
          </div>

          {orderType === 'LIMIT' && (
            <RiskManagementInputs
              enableTPSL={enableTPSL}
              onEnableTPSLChange={setEnableTPSL}
              tpPrice={tpPrice}
              onTpPriceChange={setTpPrice}
              slPrice={slPrice}
              onSlPriceChange={setSlPrice}
              side={side as OrderSide}
              currentPrice={ticker.lastPrice}
            />
          )}
        </div>

        <div className="w-72 flex flex-col gap-3 overflow-y-auto">
          <IsolatedMarginLock />
          <LeverageSliderMax5x leverage={leverage} onLeverageChange={handleLeverageChange} />
          <LiquidationPreview side={side as OrderSide} leverage={leverage} entryPrice={calcPrice} quantity={calcQty} balance={balance.availableBalance} />
          <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
            <div className="flex justify-between text-[11px]"><span className="text-neutral-400">Valor Nocional:</span><span className="font-mono text-white">${notionalValue.toFixed(2)} USDT</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-neutral-400">Margen ({leverage}x ISOLATED):</span><span className="font-mono text-amber-300">${initialMargin.toFixed(2)} USDT</span></div>
            <div className="flex justify-between text-[11px]"><span className="text-neutral-400">Comisió¡¡¢n (0.04%):</span><span className="font-mono text-neutral-300">${(notionalValue * 0.0004).toFixed(3)} USDT</span></div>
          </div>
          {message && (
            <div className={`p-3 rounded-lg border text-xs ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
              {message.text}
            </div>
          )}
          <button onClick={handleSubmit} disabled={isSubmitting} className={`mt-auto w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${isSubmitting ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed' : side === 'BUY' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg ring-1 ring-emerald-400' : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg ring-1 ring-rose-400'}`}>
            {isSubmitting ? (<><Sparkles size={16} className="animate-pulse" />Ejecutando {side === 'BUY' ? 'LONG' : 'SHORT'} en Binance...</>) : (<>{side === 'BUY' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}{side === 'BUY' ? 'Comprar / Long' : 'Vender / Short'} {ticker.symbol} ({leverage}x Isolated)</>)}
          </button>
        </div>
      </div>

      <AssetSelectorModal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} onSelectSymbol={handleSelectSymbol} currentSymbol={ticker.symbol} />
    </div>
  );
};

export const FuturesOrderForm = OrderForm;
