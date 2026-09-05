import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { futuresConfluenceService } from '../services/futuresConfluenceService';
import { FuturesAnalysisResult } from '../utils/futuresMetricsHelper';
import { FuturesMarketMetrics, TickerData } from '../types/binance';

interface StrategyFuturesConfluenceBadgeProps {
  symbol: string;
  isLong: boolean;
  compact?: boolean;
  showDetailsPopover?: boolean;
}

export const StrategyFuturesConfluenceBadge: React.FC<StrategyFuturesConfluenceBadgeProps> = ({
  symbol,
  isLong,
  compact = false,
  showDetailsPopover = true,
}) => {
  const [confluenceData, setConfluenceData] = useState(() =>
    futuresConfluenceService.getConfluence(symbol)
  );
  const [showPopover, setShowPopover] = useState(false);

  useEffect(() => {
    // Initial fetch & subscribe
    setConfluenceData(futuresConfluenceService.getConfluence(symbol));

    const unsubscribe = futuresConfluenceService.subscribe(() => {
      setConfluenceData(futuresConfluenceService.getConfluence(symbol));
    });

    return unsubscribe;
  }, [symbol]);

  const { analysis, metrics, ticker } = confluenceData;
  const { trafficLight, confidenceScore } = analysis;

  // Semáforo lights
  const isRed = trafficLight === 'BEARISH';
  const isYellow = trafficLight === 'NEUTRAL';
  const isGreen = trafficLight === 'BULLISH';

  // Confluence status relative to strategy direction (LONG vs SHORT)
  const isConfluent =
    (isLong && isGreen) || (!isLong && isRed);
  const isConflicting =
    (isLong && isRed) || (!isLong && isGreen);
  const isNeutral = isYellow;

  let verdictLabel = '';
  let verdictAction = '';
  let badgeColorClass = '';

  if (isConfluent) {
    verdictLabel = isLong ? 'Confluencia Alcista' : 'Confluencia Bajista';
    verdictAction = isLong ? 'Apto Long' : 'Apto Short';
    badgeColorClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
  } else if (isConflicting) {
    verdictLabel = isLong ? 'Riesgo de Caída' : 'Presión Alcista';
    verdictAction = isLong ? 'No Operar Long' : 'No Operar Short';
    badgeColorClass = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  } else {
    verdictLabel = 'Señales Mixtas';
    verdictAction = 'Precaución';
    badgeColorClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  // Taker buy percentage
  const takerBuyPct = metrics.buyVolumePercent || 50;
  // Top ratio
  const topRatio = metrics.topPositionLongShortRatio || 1.0;
  // Funding rate
  const fundingPct = metrics.fundingRatePercent || 0;

  return (
    <div className="relative inline-block text-center">
      {/* CUADRO DE CONFLUENCIA */}
      <div
        onClick={() => showDetailsPopover && setShowPopover(!showPopover)}
        className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl border transition-all cursor-pointer select-none min-w-[84px] shadow-xs active:scale-95 ${
          isConfluent
            ? 'bg-emerald-950/30 border-emerald-500/40 hover:border-emerald-400/80 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
            : isConflicting
            ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-400/80 shadow-[0_0_12px_rgba(244,63,94,0.15)]'
            : 'bg-amber-950/30 border-amber-500/40 hover:border-amber-400/80 shadow-[0_0_12px_rgba(251,191,36,0.12)]'
        }`}
        title="Clic para ver desglose de confluencia"
      >
        {/* Punto / Círculo con el color del semáforo */}
        <div className="relative flex items-center justify-center my-0.5">
          <div
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              isRed
                ? 'bg-rose-500 ring-2 ring-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.9)]'
                : isYellow
                ? 'bg-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_8px_rgba(251,191,36,0.9)]'
                : 'bg-emerald-400 ring-2 ring-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.9)]'
            }`}
            title={isRed ? 'Luz Roja: Riesgo' : isYellow ? 'Luz Amarilla: Rango / Neutro' : 'Luz Verde: Continuación Alcista'}
          />
        </div>

        {/* Abajo del círculo su resultado */}
        <span
          className={`text-[11px] font-black uppercase tracking-wider mt-1 text-center whitespace-nowrap leading-tight font-mono ${
            isConfluent
              ? 'text-emerald-300'
              : isConflicting
              ? 'text-rose-300'
              : 'text-amber-300'
          }`}
        >
          {verdictAction}
        </span>

        {/* El % abajo */}
        <span className="text-xs font-mono font-bold text-neutral-300 mt-0.5">
          {confidenceScore}%
        </span>
      </div>

      {/* POPOVER CON DESGLOSE COMPLETO DE CONFLUENCIA */}
      {showPopover && showDetailsPopover && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPopover(false)}
          />
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50 w-72 sm:w-80 bg-neutral-950 border border-neutral-700/90 rounded-xl p-3 shadow-2xl animate-in zoom-in-95 duration-150 font-sans text-xs text-left">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-amber-400 animate-pulse" />
                <span className="font-bold text-white font-mono text-[11px]">
                  Confluencia ({symbol})
                </span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${badgeColorClass}`}>
                Score: {confidenceScore}/100
              </span>
            </div>

            {/* Dictamen */}
            <div className="mt-2.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Estado de Mercado</span>
                <span
                  className={`text-[10px] font-bold font-mono ${
                    isGreen ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-amber-400'
                  }`}
                >
                  {trafficLight} ({analysis.trafficLightTitle})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono text-neutral-400">Confluencia Estrategia</span>
                <span className="text-[10px] font-black font-mono text-white">
                  {isLong ? 'Estrategia LONG' : 'Estrategia SHORT'} → {verdictAction}
                </span>
              </div>
            </div>

            {/* 4 Factores Cuantitativos */}
            <div className="mt-2.5 flex flex-col gap-1.5 font-mono text-[10px]">
              {/* 1. OI */}
              <div className="flex items-center justify-between p-1.5 rounded bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-neutral-400">1. Interés Abierto (OI):</span>
                <span
                  className={`font-bold ${
                    analysis.oiStatus === 'bullish' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {analysis.oiStatus === 'bullish' ? 'Confirmación Alcista ↗' : 'Presión Vendedora ↘'}
                </span>
              </div>

              {/* 2. Taker Buy/Sell */}
              <div className="flex items-center justify-between p-1.5 rounded bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-neutral-400">2. Flujo Taker C/V:</span>
                <span
                  className={`font-bold ${
                    takerBuyPct >= 50 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {takerBuyPct.toFixed(1)}% Compra ({metrics.buySellRatio || 1.0}:1)
                </span>
              </div>

              {/* 3. Top Traders */}
              <div className="flex items-center justify-between p-1.5 rounded bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-neutral-400">3. Ballenas Top L/S:</span>
                <span
                  className={`font-bold ${
                    topRatio >= 1.0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {topRatio.toFixed(2)}:1 ({metrics.topPositionLongPercent || 50}% Long)
                </span>
              </div>

              {/* 4. Funding Rate */}
              <div className="flex items-center justify-between p-1.5 rounded bg-neutral-900/60 border border-neutral-800/60">
                <span className="text-neutral-400">4. Funding Rate (8h):</span>
                <span
                  className={`font-bold ${
                    fundingPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {fundingPct >= 0 ? '+' : ''}{fundingPct.toFixed(4)}%
                </span>
              </div>
            </div>

            <p className="mt-2 text-[10px] text-neutral-400 leading-snug">
              {analysis.trafficLightRecommendation}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
