import React, { useState, useMemo } from 'react';
import {
  Calculator,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Layers,
  RotateCcw,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';

export interface DcaLiquidationSimulatorProps {
  initialSymbol?: string;
  initialSide?: 'BUY' | 'SELL';
  initialEntry1Price?: number;
  initialEntry2Price?: number;
  initialEntry3Price?: number;
  initialLeverage?: number;
  initialCurrentPrice?: number;
  className?: string;
  onSyncWithTrade?: () => void;
}

export const DcaLiquidationSimulator: React.FC<DcaLiquidationSimulatorProps> = ({
  initialSymbol = 'BTCUSDT',
  initialSide = 'BUY',
  initialEntry1Price = 65000,
  initialEntry2Price = 63000,
  initialEntry3Price = 61000,
  initialLeverage = 5,
  initialCurrentPrice,
  className = '',
  onSyncWithTrade,
}) => {
  const [symbol, setSymbol] = useState<string>(initialSymbol);
  const [side, setSide] = useState<'BUY' | 'SELL'>(initialSide);
  const [leverage, setLeverage] = useState<number>(initialLeverage);

  // Prices
  const [e1Price, setE1Price] = useState<number>(initialEntry1Price || 65000);
  const [e2Price, setE2Price] = useState<number>(initialEntry2Price || 63000);
  const [e3Price, setE3Price] = useState<number>(initialEntry3Price || 61000);

  // Allocations (%)
  const [alloc1, setAlloc1] = useState<number>(50);
  const [alloc2, setAlloc2] = useState<number>(30);
  const [alloc3, setAlloc3] = useState<number>(20);

  // Current market reference price
  const currentPrice = initialCurrentPrice && initialCurrentPrice > 0 ? initialCurrentPrice : e1Price;

  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showLeverageMatrix, setShowLeverageMatrix] = useState<boolean>(true);

  const isLong = side === 'BUY';
  const fmt = (val: number | undefined) => formatPriceUtil(val, symbol);

  // Maintenance Margin Rate (Binance Tier 1 USDT-M: ~0.5%)
  const MMR = 0.005;

  // Liquidation calculation helper
  const calcLiqPrice = (avgEntry: number, lev: number) => {
    if (!avgEntry || avgEntry <= 0 || !lev || lev <= 0) return 0;
    const safeLev = Math.max(1, lev);
    if (isLong) {
      // Long: AvgEntry * (1 - 1/Lev + MMR)
      return Math.max(0, avgEntry * (1 - 1 / safeLev + MMR));
    } else {
      // Short: AvgEntry * (1 + 1/Lev - MMR)
      return avgEntry * (1 + 1 / safeLev - MMR);
    }
  };

  // Stage 1: Solo E1
  const stage1 = useMemo(() => {
    const avgEntry = e1Price;
    const liqPrice = calcLiqPrice(avgEntry, leverage);
    const distFromEntryPct = avgEntry > 0 ? ((liqPrice - avgEntry) / avgEntry) * 100 : 0;
    const distFromCurrentPct = currentPrice > 0 ? ((liqPrice - currentPrice) / currentPrice) * 100 : 0;

    return {
      name: 'Etapa 1: Entrada Inicial (E1)',
      weight: alloc1,
      avgEntry,
      liqPrice,
      distFromEntryPct,
      distFromCurrentPct,
    };
  }, [e1Price, leverage, side, currentPrice, alloc1]);

  // Stage 2: E1 + E2 (After DCA 1)
  const stage2 = useMemo(() => {
    const totalWeight = alloc1 + alloc2;
    const avgEntry = totalWeight > 0 ? (e1Price * alloc1 + e2Price * alloc2) / totalWeight : e1Price;
    const liqPrice = calcLiqPrice(avgEntry, leverage);
    const distFromEntryPct = avgEntry > 0 ? ((liqPrice - avgEntry) / avgEntry) * 100 : 0;
    const distFromCurrentPct = currentPrice > 0 ? ((liqPrice - currentPrice) / currentPrice) * 100 : 0;

    // Check if DCA 1 price is reachable BEFORE Stage 1 Liquidation
    const isDcaUnreachable = isLong
      ? e2Price <= stage1.liqPrice
      : e2Price >= stage1.liqPrice;

    return {
      name: 'Etapa 2: Tras DCA 1 (E1 + E2)',
      weight: totalWeight,
      avgEntry,
      liqPrice,
      distFromEntryPct,
      distFromCurrentPct,
      isDcaUnreachable,
      shiftFromStage1: stage1.liqPrice > 0 ? ((liqPrice - stage1.liqPrice) / stage1.liqPrice) * 100 : 0,
    };
  }, [e1Price, e2Price, alloc1, alloc2, leverage, side, currentPrice, stage1.liqPrice]);

  // Stage 3: E1 + E2 + E3 (Full Load)
  const stage3 = useMemo(() => {
    const totalWeight = alloc1 + alloc2 + alloc3;
    const avgEntry =
      totalWeight > 0 ? (e1Price * alloc1 + e2Price * alloc2 + e3Price * alloc3) / totalWeight : e1Price;
    const liqPrice = calcLiqPrice(avgEntry, leverage);
    const distFromEntryPct = avgEntry > 0 ? ((liqPrice - avgEntry) / avgEntry) * 100 : 0;
    const distFromCurrentPct = currentPrice > 0 ? ((liqPrice - currentPrice) / currentPrice) * 100 : 0;

    const isDcaUnreachable = isLong
      ? e3Price <= stage2.liqPrice
      : e3Price >= stage2.liqPrice;

    return {
      name: 'Etapa 3: Carga Completa (E1 + E2 + E3)',
      weight: totalWeight,
      avgEntry,
      liqPrice,
      distFromEntryPct,
      distFromCurrentPct,
      isDcaUnreachable,
      shiftFromStage1: stage1.liqPrice > 0 ? ((liqPrice - stage1.liqPrice) / stage1.liqPrice) * 100 : 0,
    };
  }, [e1Price, e2Price, e3Price, alloc1, alloc2, alloc3, leverage, side, currentPrice, stage1.liqPrice, stage2.liqPrice]);

  // Leverage Sensitivity Comparison Matrix
  const leverageMatrix = useMemo(() => {
    const levList = [2, 3, 5, 10, 20, 50];
    return levList.map((lev) => {
      const liqS1 = calcLiqPrice(stage1.avgEntry, lev);
      const liqS2 = calcLiqPrice(stage2.avgEntry, lev);
      const liqS3 = calcLiqPrice(stage3.avgEntry, lev);

      const maxDrawdownPct = isLong
        ? ((liqS3 - stage3.avgEntry) / stage3.avgEntry) * 100
        : ((liqS3 - stage3.avgEntry) / stage3.avgEntry) * 100;

      return {
        lev,
        liqS1,
        liqS2,
        liqS3,
        maxDrawdownPct,
        isSafe: lev <= 5,
        isUltraSafe: lev <= 3,
        isCurrent: lev === leverage,
      };
    });
  }, [stage1.avgEntry, stage2.avgEntry, stage3.avgEntry, side, leverage]);

  // Preset Handlers
  const handleResetToDefaults = () => {
    setE1Price(initialEntry1Price || 65000);
    setE2Price(initialEntry2Price || 63000);
    setE3Price(initialEntry3Price || 61000);
    setLeverage(initialLeverage || 5);
    setSide(initialSide);
    setAlloc1(50);
    setAlloc2(30);
    setAlloc3(20);
  };

  return (
    <div
      id="standalone-dca-liquidation-simulator"
      className={`rounded-xl border border-sky-500/30 bg-[#090d16] p-4 shadow-2xl text-neutral-200 font-mono text-xs ${className}`}
    >
      {/* Simulator Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0 shadow-xs">
            <Calculator className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">
                Simulador Táctico de DCA & Punto de Liquidación
              </h4>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
                Aislamiento Táctico de Margen
              </span>
            </div>
            <p className="text-[11px] text-neutral-400 mt-0.5">
              Evalúa la deriva del precio de liquidación al promediar entradas con DCA e incrementar el apalancamiento.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSyncWithTrade && (
            <button
              type="button"
              onClick={onSyncWithTrade}
              className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-amber-300 border border-neutral-700 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
              title="Cargar precios y apalancamiento del trade activo en la matriz"
            >
              <RefreshCw className="w-3 h-3 text-amber-400" />
              <span className="hidden sm:inline">Cargar Trade Activo</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-all cursor-pointer"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3.5 flex flex-col gap-4">
          {/* Panel de Controles Interactivos */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 bg-neutral-950/80 p-3.5 rounded-xl border border-neutral-800/80">
            {/* Columna 1: Dirección & Apalancamiento */}
            <div className="lg:col-span-4 flex flex-col gap-3 pr-0 lg:pr-3 lg:border-r border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-neutral-300 flex items-center gap-1">
                  <Sliders className="w-3.5 h-3.5 text-sky-400" />
                  <span>Configuración Base</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="text-[9px] text-neutral-400 hover:text-amber-300 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Restablecer</span>
                </button>
              </div>

              {/* Selector de Sentido (LONG / SHORT) */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-900 rounded-lg border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setSide('BUY')}
                  className={`py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    side === 'BUY'
                      ? 'bg-emerald-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-emerald-400'
                  }`}
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>LONG (Comprar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSide('SELL')}
                  className={`py-1.5 rounded text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    side === 'SELL'
                      ? 'bg-rose-500 text-neutral-950 shadow-xs'
                      : 'text-neutral-400 hover:text-rose-400'
                  }`}
                >
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>SHORT (Vender)</span>
                </button>
              </div>

              {/* Selector Deslizante de Apalancamiento */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-neutral-400">Apalancamiento Multiplicador:</span>
                  <span
                    className={`font-bold px-1.5 py-0.2 rounded ${
                      leverage <= 3
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                        : leverage <= 5
                        ? 'bg-sky-950 text-sky-300 border border-sky-700'
                        : 'bg-rose-950 text-rose-300 border border-rose-700 animate-pulse'
                    }`}
                  >
                    {leverage}x Multiplicador {leverage > 5 ? '⚠️ Alto Riesgo' : '✓ Seguro'}
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={leverage}
                  onChange={(e) => setLeverage(Number(e.target.value))}
                  className="w-[#100%] accent-sky-400 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
                />

                {/* Accesos Rápidos a Apalancamiento */}
                <div className="flex items-center gap-1 justify-between mt-0.5">
                  {[2, 3, 5, 10, 20, 50].map((lev) => (
                    <button
                      key={lev}
                      type="button"
                      onClick={() => setLeverage(lev)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-all ${
                        leverage === lev
                          ? 'bg-sky-500 text-neutral-950 border-sky-400 font-black'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Columna 2: Inputs de Precios DCA (E1, E2, E3) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* E1 Input */}
              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-sky-500/30 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-sky-300 font-bold">1. Entrada Inicial (E1)</span>
                  <span className="px-1 bg-sky-950 text-sky-400 rounded text-[9px]">50% Cupo</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-neutral-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={e1Price}
                    onChange={(e) => setE1Price(Math.max(0.000001, Number(e.target.value)))}
                    className="w-full bg-black/60 border border-neutral-700 rounded pl-6 pr-2 py-1 text-white text-xs font-bold font-mono focus:border-sky-400 outline-none"
                  />
                </div>
                <div className="text-[9px] text-neutral-400">
                  Precio de confirmación técnica.
                </div>
              </div>

              {/* E2 Input */}
              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-amber-500/30 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 font-bold">2. DCA Nivel 1 (E2)</span>
                  <span className="px-1 bg-amber-950 text-amber-400 rounded text-[9px]">30% Cupo</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-neutral-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={e2Price}
                    onChange={(e) => setE2Price(Math.max(0.000001, Number(e.target.value)))}
                    className="w-full bg-black/60 border border-neutral-700 rounded pl-6 pr-2 py-1 text-white text-xs font-bold font-mono focus:border-amber-400 outline-none"
                  />
                </div>
                <div className="text-[9px] text-neutral-400">
                  Primera zona de soporte.
                </div>
              </div>

              {/* E3 Input */}
              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-purple-500/30 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-purple-300 font-bold">3. DCA Nivel 2 (E3)</span>
                  <span className="px-1 bg-purple-950 text-purple-400 rounded text-[9px]">20% Cupo</span>
                </div>
                <div className="relative">
                  <span className="absolute left-2 top-1.5 text-neutral-500">$</span>
                  <input
                    type="number"
                    step="any"
                    value={e3Price}
                    onChange={(e) => setE3Price(Math.max(0.000001, Number(e.target.value)))}
                    className="w-full bg-black/60 border border-neutral-700 rounded pl-6 pr-2 py-1 text-white text-xs font-bold font-mono focus:border-purple-400 outline-none"
                  />
                </div>
                <div className="text-[9px] text-neutral-400">
                  Carga máxima antes de SL.
                </div>
              </div>
            </div>
          </div>

          {/* Tarjetas Comparativas de Etapas de DCA */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* ETAPA 1 */}
            <div className="p-3 rounded-xl border border-sky-500/40 bg-sky-950/20 flex flex-col gap-2 relative">
              <div className="flex items-center justify-between pb-1.5 border-b border-sky-500/20">
                <span className="text-[10px] font-bold text-sky-300 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  <span>{stage1.name}</span>
                </span>
                <span className="text-[9px] font-bold text-sky-400 bg-sky-950 px-1.5 py-0.2 rounded border border-sky-800">
                  50% Carga
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-neutral-400">Precio Entrada E1:</span>
                <strong className="text-white text-xs font-bold">${fmt(stage1.avgEntry)}</strong>
              </div>

              <div className="p-2 rounded bg-black/50 border border-sky-900/50 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-300">Punto de Liquidación Est.:</span>
                  <strong className="text-rose-400 text-xs font-black">${fmt(stage1.liqPrice)}</strong>
                </div>
                <div className="text-[9px] text-neutral-400 flex items-center justify-between">
                  <span>Distancia desde E1:</span>
                  <span className="text-amber-300 font-bold">{stage1.distFromEntryPct.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            {/* ETAPA 2 */}
            <div
              className={`p-3 rounded-xl border flex flex-col gap-2 relative ${
                stage2.isDcaUnreachable
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : 'border-amber-500/40 bg-amber-950/20'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/20">
                <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{stage2.name}</span>
                </span>
                <span className="text-[9px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.2 rounded border border-amber-800">
                  80% Carga
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-neutral-400">Precio Promedio Recalculado:</span>
                <strong className="text-amber-200 text-xs font-bold">${fmt(stage2.avgEntry)}</strong>
              </div>

              <div className="p-2 rounded bg-black/50 border border-amber-900/50 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-300">Nuevo Punto de Liquidación:</span>
                  <strong className="text-rose-400 text-xs font-black">${fmt(stage2.liqPrice)}</strong>
                </div>
                <div className="text-[9px] text-neutral-400 flex items-center justify-between">
                  <span>Desplazamiento a favor:</span>
                  <span className="text-emerald-400 font-bold">
                    {stage2.shiftFromStage1 > 0 ? '+' : ''}
                    {stage2.shiftFromStage1.toFixed(2)}%
                  </span>
                </div>
              </div>

              {stage2.isDcaUnreachable && (
                <div className="p-1.5 rounded bg-rose-950/80 border border-rose-600 text-[9px] text-rose-300 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>⚠️ RIESGO: ¡Liquidación ocurrión ANTES de llegar al precio DCA 2! Reduce apalancamiento.</span>
                </div>
              )}
            </div>

            {/* ETAPA 3 */}
            <div
              className={`p-3 rounded-xl border flex flex-col gap-2 relative ${
                stage3.isDcaUnreachable
                  ? 'border-rose-500/60 bg-rose-950/20'
                  : 'border-purple-500/40 bg-purple-950/20'
              }`}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-purple-500/20">
                <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  <span>{stage3.name}</span>
                </span>
                <span className="text-[9px] font-bold text-purple-400 bg-purple-950 px-1.5 py-0.2 rounded border border-purple-800">
                  100% Carga
                </span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-neutral-400">Precio Promedio Final:</span>
                <strong className="text-purple-200 text-xs font-bold">${fmt(stage3.avgEntry)}</strong>
              </div>

              <div className="p-2 rounded bg-black/50 border border-purple-900/50 flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-neutral-300">Precio Liquidación Final:</span>
                  <strong className="text-rose-400 text-xs font-black">${fmt(stage3.liqPrice)}</strong>
                </div>
                <div className="text-[9px] text-neutral-400 flex items-center justify-between">
                  <span>Margen Total Protegido:</span>
                  <span className="text-emerald-400 font-bold">
                    {stage3.distFromEntryPct.toFixed(2)}% tolerancia
                  </span>
                </div>
              </div>

              {stage3.isDcaUnreachable && (
                <div className="p-1.5 rounded bg-rose-950/80 border border-rose-600 text-[9px] text-rose-300 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>⚠️ RIESGO: DCA 3 inalcanzable previo a liquidación.</span>
                </div>
              )}
            </div>
          </div>

          {/* Tabla Comparativa de Sensibilidad de Apalancamiento */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Matriz de Sensibilidad: Apalancamiento vs. Puntos de Liquidación</span>
              </span>
              <button
                type="button"
                onClick={() => setShowLeverageMatrix(!showLeverageMatrix)}
                className="text-[9px] text-neutral-400 hover:text-white transition-colors"
              >
                {showLeverageMatrix ? 'Ocultar Matriz' : 'Mostrar Matriz'}
              </button>
            </div>

            {showLeverageMatrix && (
              <div className="overflow-x-auto mt-1">
                <table className="w-full text-left text-[10px] font-mono border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400 bg-neutral-900/80">
                      <th className="py-2 px-2.5">Apalancamiento</th>
                      <th className="py-2 px-2.5">Liq. Solo E1</th>
                      <th className="py-2 px-2.5">Liq. Tras DCA 1 (E2)</th>
                      <th className="py-2 px-2.5">Liq. Carga Completa (E3)</th>
                      <th className="py-2 px-2.5">Tolerancia Caída Total</th>
                      <th className="py-2 px-2.5 text-right">Estatus de Seguridad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {leverageMatrix.map((item) => (
                      <tr
                        key={item.lev}
                        className={`transition-colors ${
                          item.isCurrent
                            ? 'bg-sky-950/50 font-bold text-white'
                            : 'hover:bg-neutral-900/60 text-neutral-300'
                        }`}
                      >
                        <td className="py-2 px-2.5 flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded font-bold ${
                              item.isCurrent ? 'bg-sky-500 text-neutral-950' : 'bg-neutral-800 text-neutral-300'
                            }`}
                          >
                            {item.lev}x
                          </span>
                          {item.isCurrent && <span className="text-[9px] text-sky-400">(Seleccionado)</span>}
                        </td>
                        <td className="py-2 px-2.5 text-rose-300">${fmt(item.liqS1)}</td>
                        <td className="py-2 px-2.5 text-amber-300">${fmt(item.liqS2)}</td>
                        <td className="py-2 px-2.5 text-emerald-300 font-bold">${fmt(item.liqS3)}</td>
                        <td className="py-2 px-2.5 font-bold text-amber-400">
                          {item.maxDrawdownPct.toFixed(2)}%
                        </td>
                        <td className="py-2 px-2.5 text-right">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                              item.isUltraSafe
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                                : item.isSafe
                                ? 'bg-sky-950 text-sky-300 border-sky-700'
                                : 'bg-rose-950 text-rose-300 border-rose-700'
                            }`}
                          >
                            {item.isUltraSafe
                              ? '✓ ULTRA SEGURO (≤3x)'
                              : item.isSafe
                              ? '✓ SEGURO (≤5x)'
                              : '⚠️ ALTO RIESGO (>5x)'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
