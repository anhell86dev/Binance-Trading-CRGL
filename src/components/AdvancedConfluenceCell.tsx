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
  RefreshCw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import {
  advancedTechnicalConfluenceService,
  AdvancedConfluenceData,
  ConfluenceLayersAudit,
} from '../services/advancedTechnicalConfluenceService';

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
  const [data, setData] = useState<AdvancedConfluenceData>(() =>
    advancedTechnicalConfluenceService.getConfluence(symbol, isLong)
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManuallyRefreshing, setIsManuallyRefreshing] = useState(false);

  useEffect(() => {
    setData(advancedTechnicalConfluenceService.getConfluence(symbol, isLong));

    const unsubscribe = advancedTechnicalConfluenceService.subscribe(() => {
      setData(advancedTechnicalConfluenceService.getConfluence(symbol, isLong));
    });

    return () => unsubscribe();
  }, [symbol, isLong]);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsManuallyRefreshing(true);
    await advancedTechnicalConfluenceService.fetchKlinesAndAnalyze(symbol);
    setTimeout(() => setIsManuallyRefreshing(false), 600);
  };

  const audit: ConfluenceLayersAudit = isLong ? data.layersLong : data.layersShort;
  const isGreen = audit.trafficLight === 'GREEN';
  const isYellow = audit.trafficLight === 'YELLOW';
  const isRed = audit.trafficLight === 'RED';

  // Format helpers
  const fmt = (n: number) =>
    n >= 1000
      ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : n >= 1
      ? n.toFixed(3)
      : n.toFixed(5);

  return (
    <>
      {/* Celda Limpia: Únicamente la Luz del Semáforo y el Resultado */}
      <div
        id={`adv-confluence-cell-${symbol}`}
        onClick={() => setIsModalOpen(true)}
        className="group flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/50 transition-all cursor-pointer shadow-xs min-w-[150px] max-w-[180px]"
        title="Haz clic para inspeccionar el desglose de confluencias de 4 capas"
      >
        {/* Luz del Semáforo de 3 estados */}
        <div className="flex items-center gap-1 bg-neutral-900/90 px-1.5 py-0.5 rounded-full border border-neutral-800 shrink-0">
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isGreen
                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                : 'bg-emerald-950/40 opacity-30'
            }`}
            title="Semáforo Verde (Confluencia Favorable)"
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isYellow
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse'
                : 'bg-amber-950/40 opacity-30'
            }`}
            title="Semáforo Amarillo (Precaución / Rango)"
          />
          <span
            className={`w-2.5 h-2.5 rounded-full transition-all ${
              isRed
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                : 'bg-rose-950/40 opacity-30'
            }`}
            title="Semáforo Rojo (Riesgo Alto / Contracorriente)"
          />
        </div>

        {/* Resultado del Semáforo */}
        <div className="flex items-center gap-1">
          <span
            className={`text-[10px] font-mono font-black uppercase tracking-wider px-1.5 py-0.5 rounded border whitespace-nowrap ${
              isGreen
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : isYellow
                ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/40'
            }`}
          >
            {isGreen ? 'ALTA' : isYellow ? 'NEUTRAL' : 'RIESGO'} {audit.confluencePercentage}%
          </span>
        </div>
      </div>

      {/* Modal Detallado: Desglose de las 4 Capas de Confirmación y Análisis Permanente */}
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
                    isGreen
                      ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                      : isYellow
                      ? 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                      : 'bg-rose-950/80 border-rose-500/50 text-rose-400'
                  }`}
                >
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
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
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-black uppercase border ${
                        isGreen
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : isYellow
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      }`}
                    >
                      Semáforo {audit.trafficLight} ({audit.confluencePercentage}%)
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Auditoría en tiempo real de 4 Capas de Confluencia Técnica y Volatilidad ATR (15s)
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isManuallyRefreshing}
                  className="px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Forzar actualización técnica de Klines"
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

            {/* Score Banner */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${
                isGreen
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : isYellow
                  ? 'bg-amber-950/40 border-amber-500/30'
                  : 'bg-rose-950/40 border-rose-500/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-neutral-950/80 px-2.5 py-1 rounded-full border border-neutral-800">
                  <span className={`w-3 h-3 rounded-full ${isGreen ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${isYellow ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                  <span className={`w-3 h-3 rounded-full ${isRed ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse' : 'bg-neutral-800'}`} />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-300">Puntaje Técnico Ponderado</div>
                  <div className="text-lg font-mono font-black text-white">
                    {audit.totalScore.toFixed(1)} / 4.0 Capas ({audit.confluencePercentage}%)
                  </div>
                </div>
              </div>
              <div className="text-xs text-right font-mono">
                <div className="text-neutral-400">Régimen de Mercado</div>
                <div className="font-bold text-amber-300">{data.optimalSizing.volatilityRegime}</div>
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
                  <span className="text-xs font-mono font-bold text-sky-400">{audit.layer1MacroEma.score}/1.0</span>
                </div>
                <p className="text-[11px] text-neutral-300">{audit.layer1MacroEma.description}</p>
                <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                  <span>EMA 50: ${fmt(data.ema50)}</span>
                  <span>EMA 200: ${fmt(data.ema200)}</span>
                </div>
              </div>

              {/* Capa 2: Momentum RSI */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                    <span>Capa 2: Momentum (RSI 14)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-400">{audit.layer2RsiMomentum.score}/1.0</span>
                </div>
                <p className="text-[11px] text-neutral-300">{audit.layer2RsiMomentum.description}</p>
                <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                  <span>RSI: {data.rsi14}</span>
                  <span>Pendiente: {data.rsiSlope === 'up' ? 'Alcista' : data.rsiSlope === 'down' ? 'Bajista' : 'Plana'}</span>
                </div>
              </div>

              {/* Capa 3: Volatilidad ATR */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>Capa 3: Volatilidad (ATR 14)</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-400">{audit.layer3AtrVolatility.score}/1.0</span>
                </div>
                <p className="text-[11px] text-neutral-300">{audit.layer3AtrVolatility.description}</p>
                <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                  <span>ATR: ${fmt(data.atr14)}</span>
                  <span>ATR %: {data.atr14Percent}%</span>
                </div>
              </div>

              {/* Capa 4: Alineación Direccional */}
              <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    <span>Capa 4: Alineación Direccional</span>
                  </span>
                  <span className="text-xs font-mono font-bold text-rose-400">{audit.layer4DirectionalAlignment.score}/1.0</span>
                </div>
                <p className="text-[11px] text-neutral-300">{audit.layer4DirectionalAlignment.description}</p>
                <div className="text-[10px] font-mono text-neutral-400 mt-1 flex justify-between">
                  <span>Estado: {audit.layer4DirectionalAlignment.state}</span>
                  <span>Spread EMA: {data.emaSpreadPct.toFixed(2)}%</span>
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
                    Tamaño Óptimo: <strong className="text-amber-300">${data.optimalSizing.optimalPositionSizeUsdt} USDT</strong> (Apalancamiento {data.optimalSizing.recommendedLeverage}x)
                  </div>
                </div>
              </div>
              <div className="text-[11px] text-neutral-400">
                Stop Loss sugerido por ATR: <strong className="text-rose-300">${fmt(data.optimalSizing.stopDistanceUsdt)} ({data.optimalSizing.stopDistancePercent}%)</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
