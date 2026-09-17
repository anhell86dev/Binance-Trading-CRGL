import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  HelpCircle,
  Layers,
  Percent,
  Radio,
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import {
  advancedTechnicalConfluenceService,
  AdvancedConfluenceData,
  ConfluenceLayersAudit,
} from '../services/advancedTechnicalConfluenceService';
import { futuresConfluenceService } from '../services/futuresConfluenceService';
import { FuturesAnalysisResult } from '../utils/futuresMetricsHelper';
import { FuturesMarketMetrics, TickerData } from '../types/binance';

interface AdvancedConfluenceCellProps {
  symbol: string;
  isLong?: boolean;
  positionAmt?: number;
  entryPrice?: number;
  markPrice?: number;
}

export const AdvancedConfluenceCell: React.FC<AdvancedConfluenceCellProps> = ({
  symbol,
  isLong = true,
  positionAmt = 0,
  entryPrice = 0,
  markPrice = 0,
}) => {
  // 1. Confluencia Técnica (4 Capas)
  const [techData, setTechData] = useState<AdvancedConfluenceData>(() =>
    advancedTechnicalConfluenceService.getConfluence(symbol, isLong)
  );

  // 2. Confluencia Derivados / Futuros
  const [futuresData, setFuturesData] = useState(() =>
    futuresConfluenceService.getConfluence(symbol)
  );

  const [activeTab, setActiveTab] = useState<'technical' | 'futures'>('technical');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  useEffect(() => {
    // Sincronización Confluencia Técnica
    setTechData(advancedTechnicalConfluenceService.getConfluence(symbol, isLong));
    const unsubTech = advancedTechnicalConfluenceService.subscribe(() => {
      setTechData(advancedTechnicalConfluenceService.getConfluence(symbol, isLong));
    });

    // Sincronización Confluencia Futuros/Derivados
    setFuturesData(futuresConfluenceService.getConfluence(symbol));
    const unsubFutures = futuresConfluenceService.subscribe(() => {
      setFuturesData(futuresConfluenceService.getConfluence(symbol));
    });

    return () => {
      unsubTech();
      unsubFutures();
    };
  }, [symbol, isLong]);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManuallyRefreshing(true);
    await Promise.all([
      advancedTechnicalConfluenceService.fetchKlinesAndAnalyze(symbol),
      futuresConfluenceService.fetchRealMetrics(symbol),
    ]);
    setTimeout(() => setIsManuallyRefreshing(false), 600);
  };

  // Cálculos Confluencia Técnica
  const techAudit: ConfluenceLayersAudit = isLong ? techData.layersLong : techData.layersShort;
  const techIsGreen = techAudit.trafficLight === 'GREEN';
  const techIsYellow = techAudit.trafficLight === 'YELLOW';
  const techIsRed = techAudit.trafficLight === 'RED';

  // Cálculos Confluencia Derivados / Futuros
  const { analysis, metrics, ticker } = futuresData;
  const futuresTraffic = analysis?.trafficLight || 'NEUTRAL';
  const futuresConfidence = analysis?.confidenceScore || 50;
  const futuresIsGreen = futuresTraffic === 'BULLISH';
  const futuresIsYellow = futuresTraffic === 'NEUTRAL';
  const futuresIsRed = futuresTraffic === 'BEARISH';

  // Format helpers
  const fmt = (n: number) =>
    n >= 1000
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n >= 1
      ? n.toFixed(3)
      : n.toFixed(5);

  return (
    <>
      {/* Celda Dual: Las 2 Confluencias (Técnica y Derivados) con Luz del Semáforo y Resultado */}
      <div
        id={`adv-confluence-cell-${symbol}`}
        onClick={() => setIsModalOpen(true)}
        className="group flex items-center gap-1.5 px-2 py-1 rounded-lg bg-neutral-950/90 hover:bg-neutral-900 border border-neutral-800/90 hover:border-amber-500/50 transition-all cursor-pointer shadow-xs select-none"
        title="Haz clic para inspeccionar el desglose de las 2 confluencias (Técnica y Derivados)"
      >
        {/* 1. Confluencia Técnica */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 shrink-0"
          title={`Confluencia Técnica (4 Capas): ${techAudit.trafficLight} (${techAudit.confluencePercentage}%)`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 transition-all ${
              techIsGreen
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse'
                : techIsYellow
                ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse'
                : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-pulse'
            }`}
          />
          <span
            className={`text-[9.5px] font-mono font-black uppercase whitespace-nowrap ${
              techIsGreen ? 'text-emerald-400' : techIsYellow ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            TÉC {techAudit.confluencePercentage}%
          </span>
        </div>

        {/* 2. Confluencia Derivados / Futuros */}
        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-900/90 border border-neutral-800 shrink-0"
          title={`Confluencia Futuros/Derivados: ${futuresTraffic} (${futuresConfidence}%)`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 transition-all ${
              futuresIsGreen
                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)] animate-pulse'
                : futuresIsYellow
                ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.9)] animate-pulse'
                : 'bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.9)] animate-pulse'
            }`}
          />
          <span
            className={`text-[9.5px] font-mono font-black uppercase whitespace-nowrap ${
              futuresIsGreen ? 'text-emerald-400' : futuresIsYellow ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            DER {futuresConfidence}%
          </span>
        </div>
      </div>

      {/* Modal Detallado: Desglose Completo de Ambas Confluencias */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-md ${
                    techIsGreen
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                      : techIsYellow
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-extrabold text-white font-mono">
                      {symbol}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                        isLong
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {isLong ? 'LONG' : 'SHORT'}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      2 Confluencias Activas
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Auditoría dual en tiempo real: Técnica (4 Capas) + Derivados (Métricas de Futuros)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isManuallyRefreshing}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Forzar actualización de ambas confluencias"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isManuallyRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                  <span>Actualizar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Selector de Pestaña de Confluencia */}
            <div className="grid grid-cols-2 gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 font-mono text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('technical')}
                className={`py-2 px-3 rounded-lg font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'technical'
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${techIsGreen ? 'bg-emerald-400' : techIsYellow ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <span>1. Confluencia Técnica ({techAudit.confluencePercentage}%)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('futures')}
                className={`py-2 px-3 rounded-lg font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'futures'
                    ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${futuresIsGreen ? 'bg-emerald-400' : futuresIsYellow ? 'bg-amber-400' : 'bg-rose-400'}`} />
                <span>2. Confluencia Derivados ({futuresConfidence}%)</span>
              </button>
            </div>

            {/* Contenido Pestaña 1: Confluencia Técnica */}
            {activeTab === 'technical' && (
              <div className="flex flex-col gap-3">
                {/* Score Banner Técnica */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    techIsGreen
                      ? 'bg-emerald-950/40 border-emerald-500/30'
                      : techIsYellow
                      ? 'bg-amber-950/40 border-amber-500/30'
                      : 'bg-rose-950/40 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded-full border border-neutral-800">
                      <span className={`w-3 h-3 rounded-full ${techIsGreen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                      <span className={`w-3 h-3 rounded-full ${techIsYellow ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                      <span className={`w-3 h-3 rounded-full ${techIsRed ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-300">Puntaje Técnico Ponderado</div>
                      <div className="text-lg font-mono font-black text-white">
                        {techAudit.totalScore.toFixed(1)} / 4.0 Capas ({techAudit.confluencePercentage}%)
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-right font-mono">
                    <div className="text-neutral-400">Régimen de Volatilidad</div>
                    <div className="font-bold text-amber-300">{techData.optimalSizing.volatilityRegime}</div>
                  </div>
                </div>

                {/* 4 Capas Detalladas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Capa 1: Estructura & EMAs */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-sky-400" />
                        <span>Capa 1: Tendencia (EMAs)</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-sky-400">{techAudit.layer1MacroEma.score}/1.0</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{techAudit.layer1MacroEma.description}</p>
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                      <span>EMA 50: ${fmt(techData.ema50)}</span>
                      <span>EMA 200: ${fmt(techData.ema200)}</span>
                    </div>
                  </div>

                  {/* Capa 2: Momentum RSI */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                        <span>Capa 2: Momentum (RSI 14)</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-400">{techAudit.layer2RsiMomentum.score}/1.0</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{techAudit.layer2RsiMomentum.description}</p>
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                      <span>RSI: {techData.rsi14}</span>
                      <span>Pendiente: {techData.rsiSlope === 'up' ? 'Alcista' : techData.rsiSlope === 'down' ? 'Bajista' : 'Plana'}</span>
                    </div>
                  </div>

                  {/* Capa 3: Volatilidad ATR */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Activity className="w-3.5 h-3.5 text-amber-400" />
                        <span>Capa 3: Volatilidad (ATR 14)</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-400">{techAudit.layer3AtrVolatility.score}/1.0</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{techAudit.layer3AtrVolatility.description}</p>
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                      <span>ATR: ${fmt(techData.atr14)}</span>
                      <span>ATR %: {techData.atr14Percent}%</span>
                    </div>
                  </div>

                  {/* Capa 4: Alineación Direccional */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        <span>Capa 4: Alineación Direccional</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-rose-400">{techAudit.layer4DirectionalAlignment.score}/1.0</span>
                    </div>
                    <p className="text-[11px] text-neutral-300">{techAudit.layer4DirectionalAlignment.description}</p>
                    <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                      <span>Estado: {techAudit.layer4DirectionalAlignment.state}</span>
                      <span>Spread EMA: {techData.emaSpreadPct.toFixed(2)}%</span>
                    </div>
                  </div>
                </div>

                {/* Sizing Óptimo Basado en ATR */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="text-neutral-400 text-[11px]">Gestión de Riesgo Sugerida por ATR:</div>
                      <div className="text-white font-bold">
                        Tamaño Óptimo: <strong className="text-amber-300">${techData.optimalSizing.optimalPositionSizeUsdt} USDT</strong> (Apalancamiento {techData.optimalSizing.recommendedLeverage}x)
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Stop sugerido por ATR: <strong className="text-rose-300">${fmt(techData.optimalSizing.stopDistanceUsdt)} ({techData.optimalSizing.stopDistancePercent}%)</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido Pestaña 2: Confluencia de Derivados / Futuros */}
            {activeTab === 'futures' && (
              <div className="flex flex-col gap-3">
                {/* Score Banner Derivados */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                    futuresIsGreen
                      ? 'bg-emerald-950/40 border-emerald-500/30'
                      : futuresIsYellow
                      ? 'bg-amber-950/40 border-amber-500/30'
                      : 'bg-rose-950/40 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded-full border border-neutral-800">
                      <span className={`w-3 h-3 rounded-full ${futuresIsGreen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                      <span className={`w-3 h-3 rounded-full ${futuresIsYellow ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                      <span className={`w-3 h-3 rounded-full ${futuresIsRed ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-neutral-300">Sesgo de Mercado Institucional</div>
                      <div className="text-lg font-mono font-black text-white">
                        {analysis?.trafficLight} ({futuresConfidence}%)
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-right font-mono">
                    <div className="text-neutral-400">Funding Rate 8h</div>
                    <div className={`font-bold ${metrics.fundingRate >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {(metrics.fundingRatePercent || 0).toFixed(4)}%
                    </div>
                  </div>
                </div>

                {/* Métricas Clave de Derivados */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-mono">
                  {/* Funding Rate */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Tasa de Financiación (Funding)</span>
                      </span>
                      <span className="font-bold text-amber-300">{(metrics.fundingRate * 100).toFixed(4)}%</span>
                    </div>
                    <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                      {metrics.fundingRate > 0.0003
                        ? 'Funding muy positivo: El mercado está saturado en compras (riesgo de long squeeze).'
                        : metrics.fundingRate < -0.0001
                        ? 'Funding negativo: Los cortos pagan a los largos (potencial short squeeze).'
                        : 'Funding equilibrado en rangos estándar.'}
                    </p>
                  </div>

                  {/* Open Interest */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-sky-400" />
                        <span>Open Interest (Interés Abierto)</span>
                      </span>
                      <span className="font-bold text-sky-300">
                        ${metrics.openInterestValueUsdt ? (metrics.openInterestValueUsdt / 1_000_000).toFixed(2) : '0'}M
                      </span>
                    </div>
                    <p className="text-[11px] text-neutral-300 font-sans mt-0.5">
                      Volumen de contratos abiertos en el libro de derivados.
                    </p>
                  </div>

                  {/* Ratio Long/Short Cuentas Globales */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        <span>L/S Cuentas Globales</span>
                      </span>
                      <span className="font-bold text-emerald-300">
                        {(metrics.globalAccountLongShortRatio || 1).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                      <span className="text-emerald-400">Longs: {metrics.globalAccountLongPercent?.toFixed(1) || 50}%</span>
                      <span className="text-rose-400">Shorts: {metrics.globalAccountShortPercent?.toFixed(1) || 50}%</span>
                    </div>
                  </div>

                  {/* Ratio Top Traders */}
                  <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                        <span>Ratio Top Traders (Smart Money)</span>
                      </span>
                      <span className="font-bold text-purple-300">
                        {(metrics.topPositionLongShortRatio || 1).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-1">
                      <span className="text-emerald-400">Longs: {metrics.topPositionLongPercent?.toFixed(1) || 50}%</span>
                      <span className="text-rose-400">Shorts: {metrics.topPositionShortPercent?.toFixed(1) || 50}%</span>
                    </div>
                  </div>
                </div>

                {/* Factores Clave del Análisis de Futuros */}
                {analysis?.factors && analysis.factors.length > 0 && (
                  <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-neutral-300">Factores Clave Detectados:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {analysis.factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              f.status === 'bullish' ? 'bg-emerald-400' : f.status === 'bearish' ? 'bg-rose-400' : 'bg-amber-400'
                            }`} />
                            <span className="font-semibold text-neutral-300">{f.name}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono">
                            <span className="text-neutral-400 text-[11px]">{f.valueDisplay}</span>
                            <span className={`font-bold text-[11px] ${
                              f.status === 'bullish' ? 'text-emerald-400' : f.status === 'bearish' ? 'text-rose-400' : 'text-amber-400'
                            }`}>({f.verdict})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

