import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Zap,
  DollarSign,
  Percent,
  Layers,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ChevronRight,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Send,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { OrderSide } from '../types/binance';
import { BINANCE_POPULAR_PAIRS } from '../data/binancePairs';
import { strategyAutofillService } from '../services/strategyAutofillService';

export interface PnlSimulatorProps {
  initialSymbol?: string;
  initialSide?: OrderSide;
  initialEntryPrice?: number;
  initialExitPrice?: number;
  initialQuantity?: number;
  initialLeverage?: number;
  onApplyToOrder?: (params: {
    symbol: string;
    side: OrderSide;
    price: number;
    tpPrice: number;
    quantity: number;
    leverage: number;
  }) => void;
  isCompact?: boolean;
}

type SizeInputMode = 'qty' | 'notional' | 'margin';

export const PnlSimulator: React.FC<PnlSimulatorProps> = ({
  initialSymbol = 'BTCUSDT',
  initialSide = 'BUY',
  initialEntryPrice,
  initialExitPrice,
  initialQuantity = 0.05,
  initialLeverage = 2,
  onApplyToOrder,
  isCompact = false,
}) => {
  // Live ticker & market data
  const [ticker, setTicker] = useState(binanceWs.getTicker());
  const [symbol, setSymbol] = useState<string>(initialSymbol || 'BTCUSDT');
  const [side, setSide] = useState<OrderSide>(initialSide);
  const [leverage, setLeverage] = useState<number>(
    Math.min(5, Math.max(1, initialLeverage || 2))
  );

  // Input states
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [exitPrice, setExitPrice] = useState<string>('');
  const [sizeMode, setSizeMode] = useState<SizeInputMode>('qty');
  const [quantityInput, setQuantityInput] = useState<string>(String(initialQuantity || 0.05));
  const [notionalInput, setNotionalInput] = useState<string>('1000');
  const [marginInput, setMarginInput] = useState<string>('500');
  const [feeRate, setFeeRate] = useState<number>(0.05); // 0.05% Taker default
  const [copied, setCopied] = useState<boolean>(false);
  const [applied, setApplied] = useState<boolean>(false);

  // Subscribe to live market WebSocket for ticker updates
  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
    });
    return () => unsub();
  }, []);

  // Format price helper
  const formatPrice = (val: number) => {
    if (!val || isNaN(val)) return '0.00';
    if (val >= 100) return val.toFixed(2);
    if (val >= 1) return val.toFixed(4);
    return val.toFixed(6);
  };

  // Set initial prices from live ticker if not provided
  useEffect(() => {
    const currentPrice = ticker.lastPrice || 65000;
    if (!entryPrice) {
      const initEntry = initialEntryPrice && initialEntryPrice > 0 ? initialEntryPrice : currentPrice;
      setEntryPrice(formatPrice(initEntry));
      
      if (initialExitPrice && initialExitPrice > 0) {
        setExitPrice(formatPrice(initialExitPrice));
      } else {
        const defaultExit = side === 'BUY' ? initEntry * 1.03 : initEntry * 0.97;
        setExitPrice(formatPrice(defaultExit));
      }
    }
  }, [ticker.lastPrice]);

  // When symbol changes, update symbol in binanceWs if selected
  const handleSymbolChange = (newSymbol: string) => {
    setSymbol(newSymbol);
    binanceWs.setSymbol(newSymbol);
    setTimeout(() => {
      const currentTick = binanceWs.getTicker();
      if (currentTick.lastPrice) {
        setEntryPrice(formatPrice(currentTick.lastPrice));
        const newExit = side === 'BUY' ? currentTick.lastPrice * 1.03 : currentTick.lastPrice * 0.97;
        setExitPrice(formatPrice(newExit));
      }
    }, 100);
  };

  // Numerical values
  const entry = parseFloat(entryPrice) || 0;
  const exit = parseFloat(exitPrice) || 0;

  // Derive active quantity, notional, and margin based on sizeMode
  const derivedQuantity = useMemo(() => {
    if (entry <= 0) return 0;
    if (sizeMode === 'qty') {
      return parseFloat(quantityInput) || 0;
    }
    if (sizeMode === 'notional') {
      const notional = parseFloat(notionalInput) || 0;
      return notional / entry;
    }
    if (sizeMode === 'margin') {
      const margin = parseFloat(marginInput) || 0;
      const notional = margin * leverage;
      return notional / entry;
    }
    return 0;
  }, [sizeMode, quantityInput, notionalInput, marginInput, entry, leverage]);

  // Derived Notional & Margin
  const notionalValue = entry * derivedQuantity;
  const initialMargin = leverage > 0 ? notionalValue / leverage : notionalValue;

  // Calculations
  const isLong = side === 'BUY';
  const priceDiff = exit - entry;
  const priceChangePct = entry > 0 ? (priceDiff / entry) * 100 : 0;
  const directionPriceMovePct = isLong ? priceChangePct : -priceChangePct;

  // Raw PnL
  const grossPnl = isLong
    ? (exit - entry) * derivedQuantity
    : (entry - exit) * derivedQuantity;

  // ROE % = (Gross PnL / Initial Margin) * 100
  const roePct = initialMargin > 0 ? (grossPnl / initialMargin) * 100 : 0;

  // Fee Calculation: (Entry Notional + Exit Notional) * (feeRate / 100)
  const exitNotional = exit * derivedQuantity;
  const estimatedFees = (notionalValue + exitNotional) * (feeRate / 100);
  const netPnl = grossPnl - estimatedFees;
  const netRoePct = initialMargin > 0 ? (netPnl / initialMargin) * 100 : 0;

  // Estimated Isolated Liquidation Price:
  // Binance MM maintenance rate approx 0.4% (0.004) for standard contracts
  const mmRate = 0.004;
  const liquidationPrice = useMemo(() => {
    if (entry <= 0 || leverage <= 0) return 0;
    if (isLong) {
      // Long Liquidation = Entry * (1 - (1 / Leverage) + mmRate)
      return Math.max(0, entry * (1 - (1 / leverage) + mmRate));
    } else {
      // Short Liquidation = Entry * (1 + (1 / Leverage) - mmRate)
      return entry * (1 + (1 / leverage) - mmRate);
    }
  }, [entry, leverage, isLong]);

  // Distance to Liquidation %
  const distToLiqPct = entry > 0 && liquidationPrice > 0
    ? Math.abs(((liquidationPrice - entry) / entry) * 100)
    : 0;

  // Quick preset shortcuts for Target Exit Price
  const applyTargetPct = (pct: number) => {
    if (entry <= 0) return;
    const multiplier = isLong ? 1 + pct / 100 : 1 - pct / 100;
    setExitPrice(formatPrice(entry * multiplier));
  };

  // Autofill current live market price into Entry
  const autofillLivePrice = () => {
    const live = ticker.lastPrice || 0;
    if (live > 0) {
      setEntryPrice(formatPrice(live));
      const targetExit = isLong ? live * 1.03 : live * 0.97;
      setExitPrice(formatPrice(targetExit));
    }
  };

  // Copy results to clipboard
  const handleCopySummary = () => {
    const text = `Simulación PnL ${symbol} (${side} ${leverage}x ISOLATED):
• Entrada: $${entry.toFixed(2)} | Salida: $${exit.toFixed(2)}
• Tamaño: ${derivedQuantity.toFixed(4)} ${symbol.replace('USDT', '')} ($${notionalValue.toFixed(2)} USDT)
• Margen Requerido: $${initialMargin.toFixed(2)} USDT
• PnL Bruto: ${grossPnl >= 0 ? '+' : ''}$${grossPnl.toFixed(2)} (${roePct >= 0 ? '+' : ''}${roePct.toFixed(2)}% ROE)
• PnL Neto: ${netPnl >= 0 ? '+' : ''}$${netPnl.toFixed(2)} (${netRoePct >= 0 ? '+' : ''}${netRoePct.toFixed(2)}% ROE)
• Liq. Estimada: $${liquidationPrice.toFixed(2)}`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply to order ticket or modal
  const handleApplyToOrder = () => {
    if (onApplyToOrder) {
      onApplyToOrder({
        symbol,
        side,
        price: entry,
        tpPrice: exit,
        quantity: Number(derivedQuantity.toFixed(4)),
        leverage,
      });
    } else {
      // Trigger via strategy autofill service to populate the global order form
      strategyAutofillService.autofillOrderForm({
        symbol,
        side,
        orderType: 'LIMIT',
        leverage,
        marginType: 'ISOLATED',
        price: entry,
        quantity: Number(derivedQuantity.toFixed(4)),
        tpPrice: exit,
        slPercent: 1.0,
        tpPercent: Number(((Math.abs(exit - entry) / entry) * 100).toFixed(2)),
        strategyName: `Simulador PnL (${leverage}x)`,
        riskReward: Number((Math.abs(exit - entry) / (entry * 0.01)).toFixed(1)),
      });
    }
    setApplied(true);
    setTimeout(() => setApplied(false), 2500);
  };

  // Scenario matrix for quick multi-target projection
  const scenarios = useMemo(() => {
    if (entry <= 0 || derivedQuantity <= 0) return [];
    const targets = [
      { label: '+1.0%', pct: 1.0 },
      { label: '+2.5%', pct: 2.5 },
      { label: '+5.0%', pct: 5.0 },
      { label: '+10.0%', pct: 10.0 },
      { label: '-1.0%', pct: -1.0 },
      { label: '-2.5%', pct: -2.5 },
    ];

    return targets.map((t) => {
      const projectedExit = isLong ? entry * (1 + t.pct / 100) : entry * (1 - t.pct / 100);
      const projPnl = isLong
        ? (projectedExit - entry) * derivedQuantity
        : (entry - projectedExit) * derivedQuantity;
      const projRoe = initialMargin > 0 ? (projPnl / initialMargin) * 100 : 0;
      return {
        ...t,
        projectedExit,
        projPnl,
        projRoe,
      };
    });
  }, [entry, derivedQuantity, isLong, initialMargin]);

  return (
    <div id="pnl-simulator-container" className="w-full bg-[#121519] border border-[#262c36] rounded-2xl p-4 sm:p-5 shadow-xl text-white font-sans flex flex-col gap-4">
      
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#262c36] pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-tight">
                Simulador de PnL y Retorno (ROE)
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                1x - 5x ISOLATED
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">
              Calcula instantáneamente el beneficio esperado, margen requerido, comisiones y precio de liquidación.
            </p>
          </div>
        </div>

        {/* Action buttons (Copy & Live Price) */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={autofillLivePrice}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Sincronizar precio de entrada con el precio de mercado actual"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Precio Live</span>
          </button>
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copiar resumen del cálculo al portapapeles"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>
        </div>
      </div>

      {/* 2. Main Grid: Inputs (Left) vs Real-Time Result Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* ========================================================================= */}
        {/* LEFT COLUMN: PARAMETER CONTROLS (5 cols on large) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-5 flex flex-col gap-3.5 bg-[#171b21] p-3.5 sm:p-4 rounded-xl border border-[#2b313c]">
          
          {/* Símbolo & Dirección (Long / Short) */}
          <div className="grid grid-cols-2 gap-2">
            {/* Symbol selector */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Contrato / Par
              </label>
              <select
                value={symbol}
                onChange={(e) => handleSymbolChange(e.target.value)}
                className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-xs font-mono font-bold rounded-lg px-2.5 py-2 outline-none focus:border-amber-500 transition-colors cursor-pointer"
              >
                {BINANCE_POPULAR_PAIRS.map((pair) => (
                  <option key={pair.symbol} value={pair.symbol} className="bg-[#121519] text-white">
                    {pair.baseAsset} / USDT
                  </option>
                ))}
              </select>
            </div>

            {/* Side toggle */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-400 block mb-1">
                Dirección del Trade
              </label>
              <div className="grid grid-cols-2 gap-1 bg-[#0d1013] p-1 rounded-lg border border-[#2d333f]">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-1 rounded text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    side === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  LONG
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-1 rounded text-xs font-bold font-mono flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    side === 'SELL'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  SHORT
                </button>
              </div>
            </div>
          </div>

          {/* Selector de Apalancamiento Estricto 1x - 5x */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                <span>Apalancamiento Aislado</span>
                <span className="text-amber-400 font-bold font-mono">({leverage}x)</span>
              </label>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Máx 5x Regulado
              </span>
            </div>
            
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setLeverage(lvl)}
                  className={`py-1.5 rounded-lg text-xs font-bold font-mono transition-all border cursor-pointer ${
                    leverage === lvl
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-sm scale-[1.02]'
                      : 'bg-[#0d1013] text-neutral-300 border-[#2b313c] hover:border-neutral-500 hover:text-white'
                  }`}
                >
                  {lvl}x
                </button>
              ))}
            </div>
          </div>

          {/* Precio de Entrada ($) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-400">
                Precio de Entrada ($)
              </label>
              <span className="text-[10px] text-neutral-500 font-mono">
                Live: ${formatPrice(ticker.lastPrice || 0)}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-sm font-mono font-bold rounded-lg pl-7 pr-16 py-2 outline-none focus:border-amber-500 transition-colors"
              />
              <button
                type="button"
                onClick={autofillLivePrice}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-400 text-[10px] font-bold font-mono transition-colors cursor-pointer"
              >
                LIVE
              </button>
            </div>
          </div>

          {/* Precio de Salida / Target ($) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                <span>Precio de Salida / Target ($)</span>
                {entry > 0 && exit > 0 && (
                  <span className={`text-[10px] font-mono font-bold ${directionPriceMovePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ({directionPriceMovePct >= 0 ? '+' : ''}{directionPriceMovePct.toFixed(2)}%)
                  </span>
                )}
              </label>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
              <input
                type="number"
                step="any"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-sm font-mono font-bold rounded-lg pl-7 pr-3 py-2 outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Quick target ROI shortcuts */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-neutral-500 font-mono">Targets:</span>
              {[1, 2, 5, 10, 20].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTargetPct(pct)}
                  className="px-2 py-0.5 rounded bg-[#0d1013] hover:bg-neutral-800 text-emerald-400 hover:text-emerald-300 border border-emerald-900/50 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                >
                  +{pct}%
                </button>
              ))}
              {[-1, -2, -5].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyTargetPct(pct)}
                  className="px-2 py-0.5 rounded bg-[#0d1013] hover:bg-neutral-800 text-rose-400 hover:text-rose-300 border border-rose-900/50 text-[10px] font-mono font-bold transition-colors cursor-pointer"
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          {/* Modo de Tamaño de Posición (Monedas vs Nocional vs Margen) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-neutral-400">
                Dimensionamiento de Posición
              </label>
              <div className="flex items-center gap-1 bg-[#0d1013] p-0.5 rounded border border-[#2b313c]">
                <button
                  type="button"
                  onClick={() => setSizeMode('qty')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                    sizeMode === 'qty' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400'
                  }`}
                >
                  Monedas
                </button>
                <button
                  type="button"
                  onClick={() => setSizeMode('notional')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                    sizeMode === 'notional' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400'
                  }`}
                >
                  Nocional ($)
                </button>
                <button
                  type="button"
                  onClick={() => setSizeMode('margin')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono transition-colors cursor-pointer ${
                    sizeMode === 'margin' ? 'bg-neutral-800 text-amber-400' : 'text-neutral-400'
                  }`}
                >
                  Margen ($)
                </button>
              </div>
            </div>

            {sizeMode === 'qty' && (
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={quantityInput}
                  onChange={(e) => setQuantityInput(e.target.value)}
                  placeholder="0.05"
                  className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-sm font-mono font-bold rounded-lg px-3 py-2 outline-none focus:border-amber-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                  {symbol.replace('USDT', '')}
                </span>
              </div>
            )}

            {sizeMode === 'notional' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="any"
                  value={notionalInput}
                  onChange={(e) => setNotionalInput(e.target.value)}
                  placeholder="1000"
                  className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-sm font-mono font-bold rounded-lg pl-7 pr-16 py-2 outline-none focus:border-amber-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                  USDT Nocional
                </span>
              </div>
            )}

            {sizeMode === 'margin' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">$</span>
                <input
                  type="number"
                  step="any"
                  value={marginInput}
                  onChange={(e) => setMarginInput(e.target.value)}
                  placeholder="500"
                  className="w-full bg-[#0d1013] border border-[#2d333f] text-white text-sm font-mono font-bold rounded-lg pl-7 pr-16 py-2 outline-none focus:border-amber-500 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs">
                  USDT Margen
                </span>
              </div>
            )}
          </div>

          {/* Tasa de comisión (Taker 0.05% vs Maker 0.02%) */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-[#262c36]">
            <span className="text-neutral-400 text-[11px]">Tasa de Comisión Estimada:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFeeRate(0.05)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                  feeRate === 0.05 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Taker (0.05%)
              </button>
              <button
                type="button"
                onClick={() => setFeeRate(0.02)}
                className={`text-[10px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                  feeRate === 0.02 ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-neutral-500 hover:text-neutral-300'
                }`}
              >
                Maker (0.02%)
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT COLUMN: REAL-TIME RESULTS & METRICS DASHBOARD (7 cols on large) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-7 flex flex-col gap-3.5">
          
          {/* Main Hero PnL & ROE Display */}
          <div className={`rounded-xl p-4 sm:p-5 border transition-all ${
            grossPnl >= 0
              ? 'bg-gradient-to-br from-emerald-950/40 via-[#121814] to-[#121519] border-emerald-800/60 shadow-lg'
              : 'bg-gradient-to-br from-rose-950/40 via-[#1a1214] to-[#121519] border-rose-800/60 shadow-lg'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase font-bold tracking-wider text-neutral-400 flex items-center gap-1.5">
                {grossPnl >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-rose-400" />
                )}
                Beneficio / Pérdida Proyectado
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                roePct >= 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}>
                ROE: {roePct >= 0 ? '+' : ''}{roePct.toFixed(2)}%
              </span>
            </div>

            {/* Big Numbers */}
            <div className="mt-2.5 flex items-baseline gap-3 flex-wrap">
              <span className={`text-2xl sm:text-3xl lg:text-4xl font-black font-mono tracking-tight ${
                grossPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {grossPnl >= 0 ? '+' : ''}${grossPnl.toFixed(2)} <span className="text-sm font-sans font-medium text-neutral-400">USDT</span>
              </span>
              <span className="text-xs text-neutral-400 font-mono">
                (Neto post-fees: <strong className={netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}</strong>)
              </span>
            </div>

            {/* Quick context subtitle */}
            <p className="text-xs text-neutral-400 mt-1">
              Con un movimiento de precio del <strong>{directionPriceMovePct >= 0 ? '+' : ''}{directionPriceMovePct.toFixed(2)}%</strong> y apalancamiento <strong>{leverage}x ISOLATED</strong>.
            </p>
          </div>

          {/* 4 Essential Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            
            {/* Margen Requerido */}
            <div className="bg-[#171b21] border border-[#2b313c] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 block">Margen Inicial</span>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                ${initialMargin.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">USDT Aislado</span>
            </div>

            {/* Valor Nocional */}
            <div className="bg-[#171b21] border border-[#2b313c] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 block">Valor Nocional</span>
              <div className="text-sm sm:text-base font-bold font-mono text-white mt-1">
                ${notionalValue.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">{derivedQuantity.toFixed(4)} {symbol.replace('USDT', '')}</span>
            </div>

            {/* Precio Liquidación Estimado */}
            <div className="bg-[#171b21] border border-[#2b313c] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 flex items-center justify-between">
                <span>Precio Liq.</span>
                <AlertTriangle className="w-3 h-3 text-amber-400" />
              </span>
              <div className="text-sm sm:text-base font-bold font-mono text-amber-300 mt-1">
                ${liquidationPrice.toFixed(2)}
              </div>
              <span className="text-[10px] text-amber-400/80 font-mono">
                {distToLiqPct > 0 ? `Distancia: ${distToLiqPct.toFixed(1)}%` : 'Sin riesgo'}
              </span>
            </div>

            {/* Comisiones Estimadas */}
            <div className="bg-[#171b21] border border-[#2b313c] p-3 rounded-xl">
              <span className="text-[11px] text-neutral-400 block">Comisiones (Fees)</span>
              <div className="text-sm sm:text-base font-bold font-mono text-neutral-300 mt-1">
                ${estimatedFees.toFixed(2)}
              </div>
              <span className="text-[10px] text-neutral-500 font-mono">Apertura + Cierre</span>
            </div>
          </div>

          {/* Visual Price Range Bar: Liquidation vs Entry vs Target */}
          <div className="bg-[#171b21] border border-[#2b313c] p-3 sm:p-3.5 rounded-xl">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[11px] font-semibold text-neutral-400">
                Mapa Visual de Precios
              </span>
              <span className="text-[10px] font-mono text-neutral-500">
                {isLong ? 'Long: Liq < Entrada < Salida' : 'Short: Salida < Entrada < Liq'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
              <div className="bg-[#101317] p-2 rounded-lg border border-rose-900/50">
                <span className="text-[10px] text-rose-400 block font-bold">Liquidación</span>
                <span className="font-bold text-white">${liquidationPrice.toFixed(2)}</span>
              </div>
              <div className="bg-[#101317] p-2 rounded-lg border border-neutral-700">
                <span className="text-[10px] text-neutral-400 block font-bold">Entrada</span>
                <span className="font-bold text-white">${entry.toFixed(2)}</span>
              </div>
              <div className="bg-[#101317] p-2 rounded-lg border border-emerald-900/50">
                <span className="text-[10px] text-emerald-400 block font-bold">Target Salida</span>
                <span className="font-bold text-emerald-300">${exit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Quick Scenario Projection Grid */}
          <div className="bg-[#171b21] border border-[#2b313c] p-3 sm:p-3.5 rounded-xl">
            <span className="text-[11px] font-semibold text-neutral-400 block mb-2">
              Matriz de Escenarios Rápidos ({leverage}x ISOLATED)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {scenarios.map((sc) => (
                <button
                  key={sc.label}
                  type="button"
                  onClick={() => setExitPrice(formatPrice(sc.projectedExit))}
                  className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                    sc.projPnl >= 0
                      ? 'bg-emerald-950/20 border-emerald-900/40 hover:border-emerald-500'
                      : 'bg-rose-950/20 border-rose-900/40 hover:border-rose-500'
                  }`}
                  title={`Clic para aplicar precio de salida: $${formatPrice(sc.projectedExit)}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-400">
                    <span>{sc.label}</span>
                    <span className={sc.projPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                      {sc.projRoe >= 0 ? '+' : ''}{sc.projRoe.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`text-xs font-mono font-bold mt-0.5 ${sc.projPnl >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                    {sc.projPnl >= 0 ? '+' : ''}${sc.projPnl.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-neutral-500 font-mono truncate">
                    ${formatPrice(sc.projectedExit)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CTA: Apply directly to Order Form */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleApplyToOrder}
              className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
                applied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 active:scale-95'
              }`}
            >
              {applied ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Parámetros Cargados en la Boleta!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-neutral-950" />
                  <span>Cargar en Boleta de Orden ({symbol})</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default PnlSimulator;
