import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Info,
  Layers,
  Lock,
  Percent,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Unlock,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { OrderSide, OrderType, OpenOrder } from '../types/binance';

export interface OrderControlPanelProps {
  symbol?: string;
  onOrderPlaced?: (order: OpenOrder) => void;
  isCompact?: boolean;
  onPopOut?: () => void;
}

export const OrderControlPanel: React.FC<OrderControlPanelProps> = memo(({
  symbol: propSymbol,
  onOrderPlaced,
  isCompact = false,
  onPopOut,
}) => {
  // Real-time market and account state
  const [currentSymbol, setCurrentSymbol] = useState(() => propSymbol || binanceWs.getCurrentSymbol());
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [networkMode, setNetworkMode] = useState(() => binanceWs.getMode());

  // Core Order Parameters
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [quantity, setQuantity] = useState<string>('0.05');
  const [price, setPrice] = useState<string>('');

  // Apalancamiento: RESTRINGIDO ESTRICTAMENTE DE 1X A 5X MÁXIMO
  const [leverage, setLeverage] = useState<number>(3);

  // Take Profit & Stop Loss
  const [enableTPSL, setEnableTPSL] = useState(false);
  const [tpPrice, setTpPrice] = useState('');
  const [slPrice, setSlPrice] = useState('');

  // AUTORIZACIÓN MANUAL EXPLÍCITA STATE
  const [requiresExplicitAuth, setRequiresExplicitAuth] = useState(true);
  const [isExplicitlyAuthorized, setIsExplicitlyAuthorized] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authAgreementChecked, setAuthAgreementChecked] = useState(false);

  // Execution & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
    details?: string;
  } | null>(null);

  // Synchronize when propSymbol changes
  useEffect(() => {
    if (propSymbol && propSymbol !== currentSymbol) {
      setCurrentSymbol(propSymbol);
    }
  }, [propSymbol]);

  // Subscribe to WebSocket updates for price and account
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const activeSym = propSymbol || binanceWs.getCurrentSymbol();
      setCurrentSymbol(activeSym);
      setTicker(binanceWs.getTicker());
      setBalance(binanceWs.getBalance());
      setNetworkMode(binanceWs.getMode());
    });

    return () => unsubWs();
  }, [propSymbol]);

  // Update default limit price if ticker changes
  useEffect(() => {
    if (ticker.lastPrice && (!price || price === '0.00')) {
      const p = ticker.lastPrice;
      const formatted = p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(4) : p.toFixed(6);
      setPrice(formatted);
    }
  }, [ticker.lastPrice, ticker.symbol]);

  // Reset explicit authorization when core parameters change for safety
  useEffect(() => {
    setIsExplicitlyAuthorized(false);
    setAuthAgreementChecked(false);
  }, [side, orderType, quantity, price, leverage, currentSymbol]);

  const baseAsset = useMemo(() => {
    return currentSymbol.replace('USDT', '');
  }, [currentSymbol]);

  // Restrict Leverage rigidly between 1 and 5
  const handleLeverageChange = (val: number) => {
    const clamped = Math.min(5, Math.max(1, Math.round(val)));
    setLeverage(clamped);
  };

  // Quick percentage calculators for quantity based on available margin
  const handleQuickPercent = (pct: number) => {
    const currentPrice = parseFloat(price) || ticker.lastPrice || 1;
    const availableMargin = balance.availableBalance || 1000;
    const allocatedMargin = availableMargin * (pct / 100);
    const notional = allocatedMargin * leverage;
    const calculatedQty = notional / currentPrice;

    if (calculatedQty >= 100) {
      setQuantity(calculatedQty.toFixed(1));
    } else if (calculatedQty >= 1) {
      setQuantity(calculatedQty.toFixed(3));
    } else {
      setQuantity(calculatedQty.toFixed(4));
    }
  };

  // Math derivations
  const numQty = parseFloat(quantity) || 0;
  const executionPrice = orderType === 'LIMIT' ? (parseFloat(price) || ticker.lastPrice || 0) : (ticker.lastPrice || 0);
  const notionalValue = numQty * executionPrice;
  const requiredMargin = leverage > 0 ? notionalValue / leverage : 0;
  const isMarginExceeded = requiredMargin > (balance.availableBalance || 0);

  // Liquidation Price Estimation (Isolated)
  const estimatedLiquidationPrice = useMemo(() => {
    if (!executionPrice || executionPrice <= 0 || leverage <= 0) return 0;
    // Maintenance margin estimate (~0.5%)
    const mmr = 0.005;
    if (side === 'BUY') {
      return executionPrice * (1 - 1 / leverage + mmr);
    } else {
      return executionPrice * (1 + 1 / leverage - mmr);
    }
  }, [executionPrice, leverage, side]);

  // Format price helper
  const formatPrice = (p: number) => {
    if (!p || isNaN(p)) return '0.00';
    if (p >= 100) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
    return p.toFixed(6);
  };

  // Initiate submission: Check if explicit manual authorization is needed first
  const handleAttemptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMessage(null);

    // Basic Validations
    if (!numQty || numQty <= 0) {
      setFeedbackMessage({
        type: 'error',
        text: 'Cantidad inválida',
        details: 'Por favor ingresa una cantidad mayor a 0.',
      });
      return;
    }

    if (orderType === 'LIMIT' && (!parseFloat(price) || parseFloat(price) <= 0)) {
      setFeedbackMessage({
        type: 'error',
        text: 'Precio límite inválido',
        details: 'Por favor especifica un precio límite válido.',
      });
      return;
    }

    if (isMarginExceeded) {
      setFeedbackMessage({
        type: 'error',
        text: 'Margen insuficiente',
        details: `El margen requerido ($${requiredMargin.toFixed(2)} USDT) supera tu saldo disponible ($${balance.availableBalance.toFixed(2)} USDT).`,
      });
      return;
    }

    // Explicit manual authorization check
    if (requiresExplicitAuth && !isExplicitlyAuthorized) {
      setIsAuthModalOpen(true);
      return;
    }

    // If already explicitly authorized or manual auth is toggled off
    executeRealOrder();
  };

  // Final confirmation inside Explicit Authorization Modal
  const handleConfirmExplicitAuthorization = () => {
    if (!authAgreementChecked) return;
    setIsExplicitlyAuthorized(true);
    setIsAuthModalOpen(false);
    executeRealOrder();
  };

  // Real Order Execution Pipeline
  const executeRealOrder = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const clampedLeverage = Math.min(5, Math.max(1, leverage));

      let placedOrder: OpenOrder;

      if (orderType === 'LIMIT') {
        const limitPrice = parseFloat(price);
        placedOrder = await binanceWs.placeLimitOrder({
          symbol: currentSymbol,
          side,
          quantity: numQty,
          price: limitPrice,
          leverage: clampedLeverage,
          tpPrice: enableTPSL && tpPrice ? parseFloat(tpPrice) : undefined,
          slPrice: enableTPSL && slPrice ? parseFloat(slPrice) : undefined,
        });
      } else {
        placedOrder = await binanceWs.placeMarketOrder({
          symbol: currentSymbol,
          side,
          quantity: numQty,
          leverage: clampedLeverage,
          tpPrice: enableTPSL && tpPrice ? parseFloat(tpPrice) : undefined,
          slPrice: enableTPSL && slPrice ? parseFloat(slPrice) : undefined,
        });
      }

      setFeedbackMessage({
        type: 'success',
        text: `¡Orden ${orderType} transmitida exitosamente!`,
        details: `${side === 'BUY' ? 'LONG' : 'SHORT'} ${numQty} ${baseAsset} @ ${orderType === 'LIMIT' ? `$${parseFloat(price)}` : 'Mercado'} (${clampedLeverage}x ISOLATED)`,
      });

      notificationService.notify(
        'EXECUTION',
        `Orden ${orderType} Real Ejecutada`,
        `${side} ${numQty} ${currentSymbol} con ${clampedLeverage}x de apalancamiento aislado.`,
        'urgent'
      );

      // Reset authorization state after execution
      setIsExplicitlyAuthorized(false);
      setAuthAgreementChecked(false);

      if (onOrderPlaced) {
        onOrderPlaced(placedOrder);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: 'Error en la transmisión de la orden',
        details: err.message || 'La API de Binance rechazó la solicitud. Verifica tus credenciales y saldo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="order-control-panel"
      className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3.5 shadow-xl select-none"
    >
      {/* Header with Title, Mode & PopOut */}
      <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Order Control Panel
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                1x-5x MAX
              </span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono">
              <span>{currentSymbol}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">ISOLATED</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
              networkMode === 'production'
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : networkMode === 'testnet'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
            }`}
          >
            {networkMode === 'production' ? 'REAL MAINNET' : networkMode === 'testnet' ? 'TESTNET' : 'SIMULACIÓN'}
          </span>

          {onPopOut && (
            <button
              type="button"
              onClick={onPopOut}
              className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
              title="Abrir en ventana modal"
            >
              <Zap className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleAttemptSubmit} className="flex flex-col gap-3">
        {/* 1. DIRECCIÓN: LONG VS SHORT */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 px-3 rounded-lg font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              side === 'BUY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-emerald-300 hover:bg-neutral-800 border border-neutral-700'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>COMPRAR / LONG</span>
          </button>

          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 px-3 rounded-lg font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              side === 'SELL'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 border border-rose-400'
                : 'bg-neutral-800/80 text-neutral-400 hover:text-rose-300 hover:bg-neutral-800 border border-neutral-700'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>VENDER / SHORT</span>
          </button>
        </div>

        {/* 2. TIPO DE ORDEN: MARKET VS LIMIT */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setOrderType('MARKET')}
            className={`py-1.5 rounded-md font-bold transition-all ${
              orderType === 'MARKET'
                ? 'bg-neutral-800 text-amber-300 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Mercado (Market)
          </button>
          <button
            type="button"
            onClick={() => setOrderType('LIMIT')}
            className={`py-1.5 rounded-md font-bold transition-all ${
              orderType === 'LIMIT'
                ? 'bg-neutral-800 text-amber-300 shadow-xs'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Límite (Limit)
          </button>
        </div>

        {/* INPUT DE PRECIO (Si es orden Límite) */}
        {orderType === 'LIMIT' && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-neutral-400">
              <span>Precio Límite (USDT)</span>
              <button
                type="button"
                onClick={() => {
                  const p = ticker.lastPrice || 0;
                  setPrice(p >= 100 ? p.toFixed(2) : p.toFixed(4));
                }}
                className="text-[10px] text-amber-400 hover:underline font-mono cursor-pointer"
              >
                Último: ${formatPrice(ticker.lastPrice)}
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/70"
              />
              <span className="absolute right-3 top-2.5 text-xs text-neutral-500 font-mono">
                USDT
              </span>
            </div>
          </div>
        )}

        {/* 3. INPUT DE CANTIDAD (QUANTITY) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <label className="font-semibold text-neutral-300">Cantidad ({baseAsset})</label>
            <span className="text-[10px] font-mono text-neutral-500">
              Disp: ${(balance.availableBalance || 0).toFixed(2)} USDT
            </span>
          </div>

          <div className="relative">
            <input
              type="number"
              step="any"
              min="0.0001"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/70"
            />
            <span className="absolute right-3 top-2.5 text-xs text-amber-400 font-mono font-bold">
              {baseAsset}
            </span>
          </div>

          {/* Botones de Tamaño Rápido por % */}
          <div className="grid grid-cols-5 gap-1 pt-0.5">
            {[10, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handleQuickPercent(pct)}
                className="py-1 rounded bg-neutral-950 hover:bg-neutral-800 text-[10px] font-mono font-bold text-neutral-400 hover:text-amber-300 border border-neutral-800 hover:border-amber-500/40 transition-all cursor-pointer"
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* 4. INPUT DE APALANCAMIENTO: ESTRICTAMENTE RESTRINGIDO DE 1X A 5X */}
        <div className="flex flex-col gap-2 p-3 bg-neutral-950 rounded-xl border border-neutral-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <label className="text-xs font-bold text-neutral-200 uppercase tracking-tight">
                Apalancamiento (1x - 5x)
              </label>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-black text-amber-400">
                {leverage}x
              </span>
              <span className="text-[10px] font-mono px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                ISOLATED
              </span>
            </div>
          </div>

          {/* Quick Buttons 1x, 2x, 3x, 4x, 5x */}
          <div className="grid grid-cols-5 gap-1">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleLeverageChange(lvl)}
                className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                  leverage === lvl
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/30'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                {lvl}x
              </button>
            ))}
          </div>

          {/* Range Slider Restringido 1x-5x */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-mono text-neutral-500">1x</span>
            <input
              type="range"
              min={1}
              max={5}
              step={1}
              value={leverage}
              onChange={(e) => handleLeverageChange(Number(e.target.value))}
              className="flex-1 accent-amber-500 h-1.5 bg-neutral-800 rounded-lg cursor-pointer"
            />
            <span className="text-[10px] font-mono text-amber-400 font-bold">5x Max</span>
          </div>

          {/* Protocolo de Seguridad Notificación */}
          <div className="flex items-start gap-1.5 text-[10px] text-neutral-400 bg-neutral-900/90 p-2 rounded-lg border border-neutral-800/80">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Candado de Riesgo Institucional:</strong> El apalancamiento está topado en 5x para prevenir llamadas de margen inmediatas y volatilidades descontroladas.
            </span>
          </div>
        </div>

        {/* 5. RESUMEN FINANCIERO DE LA POSICIÓN */}
        <div className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80 flex flex-col gap-1.5 text-xs font-mono">
          <div className="flex items-center justify-between text-neutral-400">
            <span>Valor Nocional:</span>
            <span className="text-neutral-200 font-bold">${notionalValue.toFixed(2)} USDT</span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Margen Inicial Requerido:</span>
            <span className={`font-bold ${isMarginExceeded ? 'text-rose-400' : 'text-amber-300'}`}>
              ${requiredMargin.toFixed(2)} USDT
            </span>
          </div>

          <div className="flex items-center justify-between text-neutral-400">
            <span>Precio Liq. Estimado:</span>
            <span className="text-rose-400 font-bold">
              ${formatPrice(estimatedLiquidationPrice)}
            </span>
          </div>
        </div>

        {/* 6. PROTOCOLO DE AUTORIZACIÓN MANUAL EXPLÍCITA */}
        <div className="flex flex-col gap-2 p-3 bg-neutral-950 rounded-xl border border-amber-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {requiresExplicitAuth ? (
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-neutral-500" />
              )}
              <span className="text-xs font-bold text-neutral-200">
                Autorización Manual Explícita
              </span>
            </div>

            {/* Switch Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={requiresExplicitAuth}
                onChange={(e) => {
                  setRequiresExplicitAuth(e.target.checked);
                  setIsExplicitlyAuthorized(false);
                }}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500" />
            </label>
          </div>

          {requiresExplicitAuth && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="explicit-inline-auth"
                checked={isExplicitlyAuthorized}
                onChange={(e) => setIsExplicitlyAuthorized(e.target.checked)}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
              <label
                htmlFor="explicit-inline-auth"
                className="text-[11px] text-neutral-300 cursor-pointer font-medium"
              >
                Autorizo explícitamente el envío de esta orden real a Binance Futures.
              </label>
            </div>
          )}
        </div>

        {/* BANNER DE FEEDBACK / ERRORES */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex flex-col">
              <span className="font-bold">{feedbackMessage.text}</span>
              {feedbackMessage.details && (
                <span className="text-[11px] text-neutral-400 mt-0.5">
                  {feedbackMessage.details}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 7. BOTÓN PRINCIPAL DE EJECUCIÓN CON AUTORIZACIÓN MANUAL EXPLÍCITA */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isSubmitting
              ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
              : requiresExplicitAuth && !isExplicitlyAuthorized
              ? 'bg-amber-600/90 hover:bg-amber-500 text-black shadow-lg shadow-amber-900/30 border border-amber-400'
              : side === 'BUY'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 border border-emerald-400'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 border border-rose-400'
          }`}
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
              <span>TRANSMITIENDO A BINANCE...</span>
            </>
          ) : requiresExplicitAuth && !isExplicitlyAuthorized ? (
            <>
              <Lock className="w-4 h-4 text-black" />
              <span>REQUERIR AUTORIZACIÓN MANUAL EXPLÍCITA</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 fill-current" />
              <span>
                EJECUTAR ORDEN REAL {side === 'BUY' ? 'LONG' : 'SHORT'} ({leverage}x)
              </span>
            </>
          )}
        </button>
      </form>

      {/* MODAL DE AUTORIZACIÓN MANUAL EXPLÍCITA */}
      {isAuthModalOpen && (
        <div
          id="explicit-authorization-modal"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAuthModalOpen(false);
          }}
        >
          <div className="w-full max-w-md bg-neutral-900 border border-amber-500/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight">
                    Autorización Manual Explícita
                  </h4>
                  <span className="text-[10px] text-amber-400 font-mono">
                    Binance USDⓈ-M Futures
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="p-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Audit Sheet */}
            <div className="p-4 flex flex-col gap-3.5 text-xs">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                ⚠️ <strong>Protocolo de Confirmación Obligatorio:</strong> Estás a punto de despachar una orden con impacto de capital real. Verifica los parámetros antes de otorgar tu consentimiento.
              </div>

              {/* Parámetros Auditados */}
              <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col gap-2 font-mono">
                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Instrumento:</span>
                  <span className="text-white font-bold">{currentSymbol}</span>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Dirección:</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                      side === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {side === 'BUY' ? 'LONG (Compra)' : 'SHORT (Venta)'}
                  </span>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Tipo de Orden:</span>
                  <span className="text-neutral-200 font-bold">{orderType}</span>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Cantidad:</span>
                  <span className="text-white font-bold">
                    {numQty} {baseAsset} (~${notionalValue.toFixed(2)} USDT)
                  </span>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Apalancamiento:</span>
                  <span className="text-amber-400 font-bold">{leverage}x ISOLATED</span>
                </div>

                <div className="flex items-center justify-between pb-1 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Margen Requerido:</span>
                  <span className="text-emerald-400 font-bold">${requiredMargin.toFixed(2)} USDT</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Precio de Liquidación:</span>
                  <span className="text-rose-400 font-bold">
                    ${formatPrice(estimatedLiquidationPrice)}
                  </span>
                </div>
              </div>

              {/* Checkbox de Consentimiento Explícito */}
              <div className="flex items-start gap-2 p-2.5 bg-neutral-950 rounded-xl border border-neutral-800">
                <input
                  type="checkbox"
                  id="auth-modal-checkbox"
                  checked={authAgreementChecked}
                  onChange={(e) => setAuthAgreementChecked(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer mt-0.5"
                />
                <label
                  htmlFor="auth-modal-checkbox"
                  className="text-[11px] text-neutral-300 leading-snug cursor-pointer"
                >
                  Confirmo que he auditado manualmente los parámetros de esta orden real y autorizo explícitamente su transmisión a Binance Futures.
                </label>
              </div>

              {/* Botón de Confirmación Definitiva */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAuthModalOpen(false)}
                  className="py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs font-mono transition-colors"
                >
                  CANCELAR
                </button>

                <button
                  type="button"
                  disabled={!authAgreementChecked || isSubmitting}
                  onClick={handleConfirmExplicitAuthorization}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs font-mono flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    !authAgreementChecked || isSubmitting
                      ? 'bg-neutral-800 text-neutral-600 border border-neutral-700 cursor-not-allowed'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/30 border border-amber-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>AUTORIZAR Y ENVIAR</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default OrderControlPanel;
