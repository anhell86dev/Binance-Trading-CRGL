import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  HelpCircle,
  Info,
  PieChart,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { FuturesMarketMetrics, TickerData } from '../types/binance';
import { analyzeFuturesMetrics, TrafficLightSignal } from '../utils/futuresMetricsHelper';
import { DerivativesMetricsInfoModal } from './DerivativesMetricsInfoModal';

interface FuturesTrafficLightCardProps {
  metrics: FuturesMarketMetrics | null | undefined;
  ticker: TickerData | null | undefined;
  countdownText?: string;
  isCompact?: boolean;
  onOpenExplainer?: () => void;
}

export const FuturesTrafficLightCard: React.FC<FuturesTrafficLightCardProps> = ({
  metrics,
  ticker,
  countdownText = '00:00:00',
  isCompact = false,
  onOpenExplainer,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleOpenHelp = () => {
    if (onOpenExplainer) {
      onOpenExplainer();
    } else {
      setIsModalOpen(true);
    }
  };
  const [showFactorDetails, setShowFactorDetails] = useState(false);

  const analysis = analyzeFuturesMetrics(metrics, ticker);
  const symbol = ticker?.symbol || metrics?.symbol || 'TAOUSDT';
  const baseAsset = symbol.replace('USDT', '');

  const { trafficLight } = analysis;

  // Semáforo colors & styles
  const isGreen = trafficLight === 'BULLISH';
  const isYellow = trafficLight === 'NEUTRAL';
  const isRed = trafficLight === 'BEARISH';

  return (
    <div
      id="futures-traffic-light-card"
      className="w-full bg-neutral-950/95 border border-neutral-800 rounded-xl p-3 sm:p-3.5 shadow-xl flex flex-col gap-3 transition-colors"
    >
      {/* 1. CABECERA CON EL SEMÁFORO Y DICTAMEN OPERATIVO */}
      <div
        className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all ${
          isGreen
            ? 'bg-emerald-950/30 border-emerald-500/40 shadow-emerald-950/30 shadow-lg'
            : isRed
            ? 'bg-rose-950/30 border-rose-500/40 shadow-rose-950/30 shadow-lg'
            : 'bg-amber-950/30 border-amber-500/40 shadow-amber-950/30 shadow-lg'
        }`}
      >
        {/* Lado Izquierdo: Semáforo visual físico + Título y Acción */}
        <div className="flex items-center gap-3.5">
          {/* SEMÁFORO FÍSICO */}
          <div
            className="flex sm:flex-col items-center justify-center gap-1.5 p-2 rounded-xl bg-neutral-950 border border-neutral-800 shadow-inner"
            title={`Semáforo Operativo: ${analysis.trafficLightTitle}`}
          >
            {/* LUZ ROJA: Posible Caída / No Operar Long */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isRed
                  ? 'bg-rose-500 ring-4 ring-rose-500/30 shadow-[0_0_12px_rgba(244,63,94,0.9)] scale-110'
                  : 'bg-rose-950/50 opacity-25'
              }`}
            />
            {/* LUZ AMARILLA: Precaución / Esperar */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isYellow
                  ? 'bg-amber-400 ring-4 ring-amber-400/30 shadow-[0_0_12px_rgba(251,191,36,0.9)] scale-110'
                  : 'bg-amber-950/50 opacity-25'
              }`}
            />
            {/* LUZ VERDE: Continuación Alcista / Apto Operar */}
            <div
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                isGreen
                  ? 'bg-emerald-400 ring-4 ring-emerald-400/30 shadow-[0_0_12px_rgba(52,211,153,0.9)] scale-110'
                  : 'bg-emerald-950/50 opacity-25'
              }`}
            />
          </div>

          {/* Textos del Dictamen */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 font-semibold flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
                Semáforo de Mercado ({symbol})
              </span>
              <span
                className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                  isGreen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isRed
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {analysis.trafficLightTitle}
              </span>
            </div>

            {/* Acción de Entrada Recomendada */}
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-base sm:text-lg font-black tracking-tight ${
                  isGreen ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-amber-400'
                }`}
              >
                {analysis.trafficLightAction}
              </span>
            </div>

            <p className="text-xs text-neutral-300 font-sans mt-0.5 max-w-2xl leading-relaxed">
              {analysis.trafficLightRecommendation}
            </p>
          </div>
        </div>

        {/* Lado Derecho: Puntuación de Confluencia & Botón de Ayuda */}
        <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-800">
          <div className="flex flex-col sm:items-end">
            <span className="text-[10px] text-neutral-400 font-sans uppercase font-semibold">
              Fuerza Alcista
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span
                className={`text-lg font-black ${
                  isGreen ? 'text-emerald-400' : isRed ? 'text-rose-400' : 'text-amber-400'
                }`}
              >
                {analysis.confidenceScore}%
              </span>
              <span className="text-[10px] text-neutral-500">Confluencia</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowFactorDetails(!showFactorDetails)}
              className="px-2 py-1 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-[10px] font-semibold flex items-center gap-1 transition-colors"
            >
              <span>{showFactorDetails ? 'Ocultar Desglose' : 'Ver Desglose'}</span>
              {showFactorDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            <button
              type="button"
              onClick={handleOpenHelp}
              className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-colors"
              title="Guía técnica completa"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Significados</span>
            </button>
          </div>
        </div>
      </div>

      {/* DESGLOSE EXPANDIBLE DE CONFLUENCIA */}
      {showFactorDetails && (
        <div className="bg-neutral-900/90 border border-neutral-800 p-3 rounded-lg flex flex-col gap-2">
          <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
            Evaluación de Factores (Binance Futures)
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            {analysis.factors.map((f) => (
              <div
                key={f.id}
                className="p-2 rounded bg-neutral-950 border border-neutral-800 flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>{f.name}</span>
                  <span className="font-mono text-[9px] text-neutral-500">{f.weight}% peso</span>
                </div>
                <div
                  className={`font-bold text-xs ${
                    f.status === 'bullish'
                      ? 'text-emerald-400'
                      : f.status === 'bearish'
                      ? 'text-rose-400'
                      : 'text-amber-400'
                  }`}
                >
                  {f.verdict}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono truncate">{f.valueDisplay}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LAS 4 TARJETAS CON LEYENDA EXPLÍCITA: OI, FUNDING, TAKER Y TOP L/S */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {/* TARJETA 1: OI (INTERÉS ABIERTO) */}
        <div
          onClick={handleOpenHelp}
          className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-amber-500/40 rounded-xl p-3 flex flex-col justify-between gap-2 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Interés Abierto (OI)
            </span>
            <span className="text-[10px] font-mono text-neutral-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
              Contratos
            </span>
          </div>

          <div>
            <div className="text-base sm:text-lg font-black font-mono text-amber-300 tracking-tight">
              {analysis.oiValueFormatted}
            </div>
            {/* LEYENDA SEGÚN INDICADOR OI: "Confirmación Tendencia Alcista" o "Fuerte Presión Bajista" */}
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-tight ${
                  analysis.oiStatus === 'bullish'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {analysis.oiStatus === 'bullish' ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                )}
                {analysis.oiLegend}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed border-t border-neutral-850 pt-1.5">
            {analysis.oiDescription}
          </p>
        </div>

        {/* TARJETA 2: FUNDING RATE (TASA DE FINANCIACIÓN) */}
        <div
          onClick={handleOpenHelp}
          className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-blue-500/40 rounded-xl p-3 flex flex-col justify-between gap-2 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              Funding Rate
            </span>
            <span className="text-[10px] font-mono text-amber-400 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
              {countdownText}
            </span>
          </div>

          <div>
            <div
              className={`text-base sm:text-lg font-black font-mono tracking-tight ${
                analysis.fundingIsPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {analysis.fundingValueFormatted}
            </div>
            {/* LEYENDA FUNDING: QUÉ SIGNIFICA SI ES POSITIVO O NEGATIVO */}
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-tight ${
                  analysis.fundingIsPositive
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {analysis.fundingLegend}
              </span>
            </div>
          </div>

          <div className="border-t border-neutral-850 pt-1.5 flex flex-col gap-0.5">
            <p className="text-[11px] text-neutral-300 font-sans font-medium leading-relaxed">
              {analysis.fundingMeaning}
            </p>
            <p className="text-[10px] text-neutral-400 font-sans leading-tight">
              {analysis.fundingRiskAlert}
            </p>
          </div>
        </div>

        {/* TARJETA 3: TAKER BUY / SELL (PRESIÓN A MERCADO) */}
        <div
          onClick={handleOpenHelp}
          className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-purple-500/40 rounded-xl p-3 flex flex-col justify-between gap-2 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-purple-400" />
              Taker Compra / Venta
            </span>
            <span className="text-[10px] font-mono text-neutral-300 bg-neutral-950 px-1.5 py-0.5 rounded border border-neutral-800">
              {metrics?.buySellRatio ?? 1.0}x ratio
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono font-black mb-1">
              <span className="text-emerald-400">{(metrics?.buyVolumePercent ?? 50).toFixed(1)}% Compra</span>
              <span className="text-rose-400">{(metrics?.sellVolumePercent ?? 50).toFixed(1)}% Venta</span>
            </div>
            {/* Visual Balance Bar */}
            <div className="w-full bg-neutral-950 rounded-full h-2 flex overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${metrics?.buyVolumePercent ?? 50}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${metrics?.sellVolumePercent ?? 50}%` }}
              />
            </div>

            {/* LEYENDA TAKER */}
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-tight ${
                  analysis.takerDominance === 'COMPRADOR'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {analysis.takerLegend}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed border-t border-neutral-850 pt-1.5">
            {analysis.takerMeaning}
          </p>
        </div>

        {/* TARJETA 4: TOP TRADER LONG/SHORT (BALLENAS) */}
        <div
          onClick={handleOpenHelp}
          className="bg-neutral-900/90 hover:bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 rounded-xl p-3 flex flex-col justify-between gap-2 cursor-pointer transition-all shadow-sm group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
              <PieChart className="w-3.5 h-3.5 text-cyan-400" />
              Top Traders L/S (Ballenas)
            </span>
            <span className="text-[10px] font-mono text-cyan-300 bg-neutral-950 px-1.5 py-0.5 rounded border border-cyan-800/40">
              {metrics?.topPositionLongShortRatio ?? 1.0}:1
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-mono font-black mb-1">
              <span className="text-emerald-400">{(metrics?.topPositionLongPercent ?? 50).toFixed(1)}% Long</span>
              <span className="text-rose-400">{(metrics?.topPositionShortPercent ?? 50).toFixed(1)}% Short</span>
            </div>
            {/* Visual Balance Bar */}
            <div className="w-full bg-neutral-950 rounded-full h-2 flex overflow-hidden border border-neutral-800">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${metrics?.topPositionLongPercent ?? 50}%` }}
              />
              <div
                className="bg-rose-500 h-full transition-all duration-300"
                style={{ width: `${metrics?.topPositionShortPercent ?? 50}%` }}
              />
            </div>

            {/* LEYENDA TOP L/S */}
            <div className="mt-1.5 flex items-center gap-1">
              <span
                className={`text-[11px] font-black px-2 py-0.5 rounded inline-flex items-center gap-1 uppercase tracking-tight ${
                  analysis.topDominance === 'LONGS'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {analysis.topLegend}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-neutral-400 font-sans leading-relaxed border-t border-neutral-850 pt-1.5">
            {analysis.topMeaning}
          </p>
        </div>
      </div>

      {/* Modal Guía Completa */}
      <DerivativesMetricsInfoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
};
