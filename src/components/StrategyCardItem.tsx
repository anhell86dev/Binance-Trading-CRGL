import React, { useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  Shield,
  Target,
  Radio,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { livePriceService } from '../services/livePriceService';
import { StrategyChartRenderer } from './StrategyChartRenderer';
import {
  parsePricesFromStrategy,
  calculateStrategyRewardToRisk,
  normalizeStrategyStatus,
} from '../utils/sheetParser';

interface StrategyCardItemProps {
  strat: GoogleSheetStrategyRow;
  availableBalance: number;
  isClosestGlobal: boolean;
  onNavigateToFutures: (strat: GoogleSheetStrategyRow) => void;
}

export const StrategyCardItem: React.FC<StrategyCardItemProps> = ({
  strat,
  availableBalance,
  isClosestGlobal,
  onNavigateToFutures,
}) => {
  // Local capital allocation synchronized with Wallet balance
  const initialCapital = Math.max(10, Math.min(300, Math.round(availableBalance * 0.25) || 100));
  const [capital, setCapital] = useState<number>(initialCapital);
  const [leverage, setLeverage] = useState<number>(3);

  const prices = parsePricesFromStrategy(strat);
  const rr = calculateStrategyRewardToRisk(strat);
  const isLong =
    !strat.tipoDeOrden?.toLowerCase().includes('short') &&
    !strat.tipoDeOrden?.toLowerCase().includes('venta');

  const liveData = livePriceService.getPriceData(strat.par);
  const livePrice = liveData.price || prices.entry1Price || 0;
  const entry1Price = prices.entry1Price || livePrice;
  const slPrice = prices.slPrice || (isLong ? entry1Price * 0.985 : entry1Price * 1.015);
  const tp1Price = prices.tp1Price || (isLong ? entry1Price * 1.04 : entry1Price * 0.96);
  const tpFinalPrice = prices.tpFinalPrice || prices.tp2Price || tp1Price;

  const decimalPlaces = entry1Price < 10 || livePrice < 10 ? 4 : 2;

  // Proximity to entry 1
  let diffPercent = 0;
  if (entry1Price > 0 && livePrice > 0) {
    diffPercent = ((livePrice - entry1Price) / entry1Price) * 100;
  }

  // Projected return and risk calculations
  const pctProfitTp1 = entry1Price > 0
    ? (isLong ? (tp1Price - entry1Price) / entry1Price : (entry1Price - tp1Price) / entry1Price)
    : 0;

  const pctProfitFinal = entry1Price > 0
    ? (isLong ? (tpFinalPrice - entry1Price) / entry1Price : (entry1Price - tpFinalPrice) / entry1Price)
    : 0;

  const pctLossSl = entry1Price > 0
    ? (isLong ? (entry1Price - slPrice) / entry1Price : (slPrice - entry1Price) / entry1Price)
    : 0;

  const projProfitTp1 = capital * leverage * Math.max(0, pctProfitTp1);
  const projProfitFinal = capital * leverage * Math.max(0, pctProfitFinal);
  const maxLoss = capital * leverage * Math.max(0, pctLossSl);

  const roeTp1 = pctProfitTp1 * leverage * 100;
  const roeFinal = pctProfitFinal * leverage * 100;

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 flex flex-col gap-4 bg-neutral-900/90 shadow-xl transition-all relative ${
        isClosestGlobal
          ? 'border-amber-500/60 ring-2 ring-amber-500/30 shadow-amber-950/30'
          : 'border-neutral-800 hover:border-neutral-700'
      }`}
    >
      {/* 1. Header de la Tarjeta */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-800">
        {/* Izquierda: ID, Par, Precio Live y Nombre de Estrategia */}
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-neutral-300">
              #{strat.noEstrategia}
            </span>
            <span className="text-base sm:text-lg font-bold font-mono text-white tracking-tight">
              {strat.par}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-950 text-neutral-400 border border-neutral-800">
              PERP
            </span>
            <div className="flex items-center gap-1.5 text-xs font-mono ml-1">
              <span className="text-neutral-500 flex items-center gap-0.5">
                <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
              </span>
              <span className="font-bold text-amber-300">${livePrice.toFixed(decimalPlaces)}</span>
              <span
                className={`text-[10px] font-bold ${
                  liveData.change24hPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {liveData.change24hPercent >= 0 ? '+' : ''}
                {liveData.change24hPercent.toFixed(2)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <h4
              className="font-bold text-white text-sm line-clamp-1"
              title={strat.nombreEstrategia}
            >
              {strat.nombreEstrategia}
            </h4>
            {isClosestGlobal && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-400 text-neutral-950 shrink-0 animate-pulse">
                <Target className="w-2.5 h-2.5" />
                MÁS PRÓXIMA
              </span>
            )}
          </div>
        </div>

        {/* Derecha: Estado + Indicador Long/Short + Botón Detalles (icono) + R:B abajo */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Estado a la par del indicador Long/Short */}
            <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-neutral-950 text-neutral-300 border border-neutral-700">
              {normalizeStrategyStatus(strat.estado)}
            </span>

            {/* Indicador Long / Short */}
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold font-mono border ${
                isLong
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {isLong ? (
                <>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                  LONG
                </>
              ) : (
                <>
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                  SHORT
                </>
              )}
            </span>

            {/* Botón de detalles: Únicamente icono (sin texto), navega a Futuros y cambia activo */}
            <button
              type="button"
              onClick={() => onNavigateToFutures(strat)}
              className="p-1.5 rounded-md bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-700 transition-colors shadow-xs cursor-pointer active:scale-95"
              title="Ver detalles y operar en Futuros"
            >
              <Eye className="w-4 h-4 text-amber-400" />
            </button>
          </div>

          {/* R:B (Risk/Reward): Abajo del botón de detalles */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 font-mono">Ratio R:B:</span>
            <span
              className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${
                rr.ratio >= 2.0
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-neutral-950 text-neutral-300 border-neutral-800'
              }`}
              title="Ratio Recompensa / Riesgo"
            >
              1:{rr.ratio > 0 ? rr.ratio.toFixed(1) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Asignación de Capital y Riesgo (Alineada a la altura de la estrategia) */}
      <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800/90 flex flex-col gap-2 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between gap-2 flex-wrap text-[11px]">
          <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-amber-400" />
            Asignación de Capital & Riesgo:
          </span>
          <span className="text-neutral-400 text-[10px]">
            Saldo Billetera:{' '}
            <strong className="text-white font-bold">
              ${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </strong>
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
          {/* Botones de Porcentaje y Entrada de Capital */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[0.25, 0.5, 0.75, 1.0].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setCapital(Math.max(10, Math.round(availableBalance * pct)))}
                className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-[10px] font-bold text-neutral-300 border border-neutral-800 hover:border-neutral-700 active:scale-95 transition-all"
              >
                {pct * 100}%
              </button>
            ))}
            <div className="flex items-center bg-neutral-900 px-2 py-1 rounded border border-neutral-800">
              <span className="text-neutral-500 text-[10px] mr-1">$</span>
              <input
                type="number"
                value={capital}
                onChange={(e) => setCapital(Math.max(1, Number(e.target.value)))}
                className="w-16 bg-transparent text-white font-bold text-xs focus:outline-hidden"
              />
              <span className="text-[10px] text-neutral-500">USDT</span>
            </div>
          </div>

          {/* Selector de Apalancamiento 1x-5x Aislado */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-neutral-400 font-sans mr-0.5">Palanca:</span>
            {[1, 2, 3, 4, 5].map((lev) => (
              <button
                key={lev}
                type="button"
                onClick={() => setLeverage(lev)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                  leverage === lev
                    ? 'bg-amber-400 text-neutral-950 font-black shadow-xs'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                {lev}x
              </button>
            ))}
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-neutral-900 text-amber-400/90 border border-neutral-800 font-bold ml-0.5">
              ISOLATED
            </span>
          </div>
        </div>
      </div>

      {/* 3. Gráfico Integrado y Métricas de Retorno Proyectado a la par */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
        {/* Gráfico Integrado directamente en la tarjeta (7 cols) */}
        <div className="md:col-span-7 bg-neutral-950 rounded-xl border border-neutral-800 overflow-hidden relative min-h-[210px] flex flex-col shadow-inner">
          <StrategyChartRenderer
            symbol={strat.par}
            strategy={strat}
            height={210}
            compact={true}
          />
        </div>

        {/* Métricas de Retorno Proyectado a la par del Gráfico (5 cols) */}
        <div className="md:col-span-5 bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex flex-col justify-between gap-2.5 text-xs font-mono">
          {/* Retorno Proyectado TP1 */}
          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 flex flex-col">
            <span className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center justify-between">
              <span>Retorno Proy. (TP1)</span>
              <span className="text-emerald-300 font-bold">+{roeTp1.toFixed(1)}% ROE</span>
            </span>
            <span className="text-lg font-black text-emerald-300 mt-0.5">
              +${projProfitTp1.toFixed(2)} USDT
            </span>
            <span className="text-[10px] text-neutral-400 mt-0.5">
              TP Final: <strong className="text-emerald-400 font-bold">+${projProfitFinal.toFixed(2)} USDT (+{roeFinal.toFixed(1)}%)</strong>
            </span>
          </div>

          {/* Riesgo Máximo SL */}
          <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 flex flex-col">
            <span className="text-[10px] text-rose-400 uppercase font-semibold flex items-center justify-between">
              <span>Riesgo Máximo SL</span>
              <span className="text-rose-300 font-bold">100% Salida</span>
            </span>
            <span className="text-base font-black text-rose-400 mt-0.5">
              -${maxLoss.toFixed(2)} USDT
            </span>
          </div>

          {/* Precios Tácticos */}
          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1.5 border-t border-neutral-800/80">
            <div>
              <span className="text-neutral-500 block">Entrada 1 (E1):</span>
              <span className="text-sky-300 font-bold font-mono">
                ${entry1Price.toFixed(decimalPlaces)}
              </span>
              <span className="text-[9px] text-neutral-400 block">
                ({diffPercent >= 0 ? '+' : ''}{diffPercent.toFixed(1)}% vs live)
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Stop Loss (SL):</span>
              <span className="text-rose-400 font-bold font-mono">
                ${slPrice.toFixed(decimalPlaces)}
              </span>
              <span className="text-[9px] text-neutral-500 block">Salida Total</span>
            </div>
            <div>
              <span className="text-neutral-500 block">Take Profit 1:</span>
              <span className="text-emerald-400 font-bold font-mono">
                ${tp1Price.toFixed(decimalPlaces)}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block">Take Profit Final:</span>
              <span className="text-emerald-300 font-bold font-mono">
                ${tpFinalPrice.toFixed(decimalPlaces)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
