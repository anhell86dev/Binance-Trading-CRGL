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
      <div
        id={`adv-confluence-cell-${symbol}`}
        onClick={() => setIsModalOpen(true)}
        className="group relative flex flex-col gap-1.5 p-2 rounded-xl bg-neutral-950/80 hover:bg-neutral-900 border border-neutral-800/80 hover:border-amber-500/40 transition-all cursor-pointer shadow-xs min-w-[200px]"
        title="Haz clic para ver el Análisis Permanente de 15s y las 4 Capas de Confluencia Técnica"
      >
        {/* Header: Semáforo y Puntuación de Confluencia */}
        <div className="flex items-center justify-between gap-1.5 border-b border-neutral-800/60 pb-1">
          <div className="flex items-center gap-1.5">
            {/* Semáforo Visual */}
            <div className="flex items-center gap-1 bg-neutral-900 px-1.5 py-0.5 rounded-full border border-neutral-800">
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

            <span
              className={`text-[10px] font-mono font-black uppercase tracking-wider px-1.5 py-0.2 rounded border ${
                isGreen
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : isYellow
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              }`}
            >
              {audit.totalScore}/4 Capas ({audit.confluencePercentage}%)
            </span>
          </div>

          <div className="flex items-center gap-1 text-[9px] text-neutral-400 font-mono">
            <span className="flex items-center gap-0.5 text-neutral-400" title="Auto-refresh cada 15s">
              <Clock className="w-2.5 h-2.5 text-amber-400 animate-spin-slow" />
              <span>15s</span>
            </span>
            <button
              type="button"
              onClick={handleManualRefresh}
              className="p-0.5 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              title="Actualizar indicadores ahora"
            >
              <RefreshCw className={`w-2.5 h-2.5 ${isManuallyRefreshing ? 'animate-spin text-amber-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Indicadores Core: RSI 14, ATR 14 y EMAs 50/200 */}
        <div className="grid grid-cols-2 gap-1 text-[10px] font-mono">
          {/* RSI (14) */}
          <div
            className={`px-1.5 py-0.5 rounded flex items-center justify-between border ${
              data.rsiStatus === 'oversold'
                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800/80'
                : data.rsiStatus === 'overbought'
                ? 'bg-rose-950/50 text-rose-300 border-rose-800/80'
                : 'bg-neutral-900/90 text-neutral-300 border-neutral-800'
            }`}
          >
            <span className="text-neutral-400 text-[9px]">RSI 14:</span>
            <span className="font-bold flex items-center gap-0.5">
              {data.rsi14}
              {data.rsiSlope === 'up' && <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />}
              {data.rsiSlope === 'down' && <TrendingDown className="w-2.5 h-2.5 text-rose-400" />}
            </span>
          </div>

          {/* ATR (14) */}
          <div
            className="px-1.5 py-0.5 rounded bg-neutral-900/90 text-neutral-300 border border-neutral-800 flex items-center justify-between"
            title={`ATR (14 periodos): $${fmt(data.atr14)} (${data.atr14Percent}% del precio)`}
          >
            <span className="text-neutral-400 text-[9px]">ATR 14:</span>
            <span className="font-bold text-amber-300">{data.atr14Percent}%</span>
          </div>

          {/* EMA 50 */}
          <div
            className="px-1.5 py-0.5 rounded bg-neutral-900/90 text-neutral-300 border border-neutral-800 flex items-center justify-between"
            title={`EMA 50 periodos: $${fmt(data.ema50)} (Distancia: ${data.priceVsEma50Pct}%)`}
          >
            <span className="text-neutral-400 text-[9px]">EMA 50:</span>
            <span className={`font-bold ${data.priceVsEma50Pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${fmt(data.ema50)}
            </span>
          </div>

          {/* EMA 200 */}
          <div
            className="px-1.5 py-0.5 rounded bg-neutral-900/90 text-neutral-300 border border-neutral-800 flex items-center justify-between"
            title={`EMA 200 periodos: $${fmt(data.ema200)} (Distancia: ${data.priceVsEma200Pct}%)`}
          >
            <span className="text-neutral-400 text-[9px]">EMA 200:</span>
            <span className={`font-bold ${data.priceVsEma200Pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${fmt(data.ema200)}
            </span>
          </div>
        </div>

        {/* Footer: Sizing Óptimo ATR & Status de las 4 Capas */}
        <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-neutral-800/60">
          <div className="flex items-center gap-1 text-neutral-300">
            <Scale className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-neutral-400">Tam. ATR:</span>
            <span className="font-bold text-amber-300">${data.optimalSizing.optimalPositionSizeUsdt}</span>
          </div>
          <span className="text-[8px] text-amber-400/90 group-hover:text-amber-300 flex items-center gap-0.5 font-sans font-bold">
            <span>4 Capas</span>
            <ChevronRight className="w-2.5 h-2.5" />
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
                      ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-400'
                      : isYellow
                      ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                      : 'bg-rose-950/80 border-rose-500/40 text-rose-400'
                  }`}
                >
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white font-sans">
                      Confluencia Avanzada &amp; Semáforo Táctico
                    </h3>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-neutral-950 text-amber-400 border border-neutral-800">
                      {symbol} ({isLong ? 'LONG 📈' : 'SHORT 📉'})
                    </span>
                  </div>
                  <p className="text-xs text-neutral-400 font-sans mt-0.5">
                    Fase de análisis permanente cada 15s • Filtrado de 4 capas de confirmación técnica
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Banner del Semáforo Global */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isGreen
                  ? 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200'
                  : isYellow
                  ? 'bg-amber-950/40 border-amber-600/50 text-amber-200'
                  : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Gran Semáforo */}
                <div className="flex flex-col gap-1.5 p-1.5 rounded-lg bg-black/50 border border-neutral-800">
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isGreen ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,1)] animate-pulse' : 'bg-neutral-800'
                    }`}
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isYellow ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,1)] animate-pulse' : 'bg-neutral-800'
                    }`}
                  />
                  <div
                    className={`w-3.5 h-3.5 rounded-full ${
                      isRed ? 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,1)] animate-pulse' : 'bg-neutral-800'
                    }`}
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold font-sans">{audit.summaryLabel}</h4>
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Puntaje Total: <strong>{audit.totalScore} / 4.0</strong> ({audit.confluencePercentage}% Confluencia)
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <div className="text-neutral-400 text-[10px]">Precio en Vivo</div>
                <div className="text-white font-bold text-sm">${fmt(data.lastPrice)}</div>
                <div className="text-[10px] text-amber-400">Actualizado hace {Math.round((Date.now() - data.lastUpdated) / 1000)}s</div>
              </div>
            </div>

            {/* Desglose de las 4 Capas de Confirmación Técnica */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-bold text-neutral-300 font-sans uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Las 4 Capas de Confirmación Técnica</span>
              </h4>

              {/* Capa 1: Tendencia Macro EMA 50 & 200 */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  audit.layer1MacroEma.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-neutral-950/70 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] font-bold font-mono text-amber-400">
                      1
                    </span>
                    <span className="text-xs font-bold text-white font-sans">
                      Capa 1: Tendencia Macro (EMA 50 &amp; EMA 200)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      audit.layer1MacroEma.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {audit.layer1MacroEma.passed ? '✓ Validada (1.0 pt)' : '✗ No Cumple (0 pt)'}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans">{audit.layer1MacroEma.description}</p>
                <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800 flex flex-wrap items-center justify-between gap-2">
                  <span>{audit.layer1MacroEma.details}</span>
                  <span className="text-amber-400 font-bold">Régimen: {data.emaTrend}</span>
                </div>
              </div>

              {/* Capa 2: Momentum RSI 14 Periodos */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  audit.layer2RsiMomentum.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-neutral-950/70 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] font-bold font-mono text-amber-400">
                      2
                    </span>
                    <span className="text-xs font-bold text-white font-sans">
                      Capa 2: Momentum &amp; Oscilador (RSI 14 Periodos)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      audit.layer2RsiMomentum.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {audit.layer2RsiMomentum.passed ? '✓ Validada (1.0 pt)' : 'Parcial (0.5 pt)'}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans">{audit.layer2RsiMomentum.description}</p>
                <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800 flex items-center justify-between">
                  <span>{audit.layer2RsiMomentum.details}</span>
                  <span className="text-white font-bold">
                    RSI 14: <span className="text-amber-400">{data.rsi14}</span> ({data.rsiStatus})
                  </span>
                </div>
              </div>

              {/* Capa 3: Volatilidad & Rango ATR 14 */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  audit.layer3AtrVolatility.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-neutral-950/70 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] font-bold font-mono text-amber-400">
                      3
                    </span>
                    <span className="text-xs font-bold text-white font-sans">
                      Capa 3: Rango de Volatilidad (ATR 14 Periodos)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      audit.layer3AtrVolatility.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {audit.layer3AtrVolatility.passed ? '✓ Validada (1.0 pt)' : 'Parcial (0.7 pt)'}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans">{audit.layer3AtrVolatility.description}</p>
                <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800 flex items-center justify-between">
                  <span>{audit.layer3AtrVolatility.details}</span>
                  <span className="text-white font-bold">
                    ATR: <span className="text-amber-400">${fmt(data.atr14)}</span> ({data.atr14Percent}%)
                  </span>
                </div>
              </div>

              {/* Capa 4: Alineación Direccional del Trade */}
              <div
                className={`p-3 rounded-xl border flex flex-col gap-1.5 ${
                  audit.layer4DirectionalAlignment.passed
                    ? 'bg-emerald-950/20 border-emerald-800/60'
                    : 'bg-neutral-950/70 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[10px] font-bold font-mono text-amber-400">
                      4
                    </span>
                    <span className="text-xs font-bold text-white font-sans">
                      Capa 4: Alineación Direccional ({isLong ? 'LONG' : 'SHORT'})
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      audit.layer4DirectionalAlignment.passed
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {audit.layer4DirectionalAlignment.passed ? '✓ Validada (1.0 pt)' : '✗ Divergencia (0 pt)'}
                  </span>
                </div>
                <p className="text-xs text-neutral-300 font-sans">{audit.layer4DirectionalAlignment.description}</p>
                <div className="text-[11px] font-mono text-neutral-400 bg-neutral-900/80 p-2 rounded-lg border border-neutral-800">
                  {audit.layer4DirectionalAlignment.details}
                </div>
              </div>
            </div>

            {/* Módulo de Dimensionamiento Óptimo de Posición Basado en Volatilidad ATR */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-white font-sans uppercase tracking-wider">
                    Dimensionamiento Óptimo de Posición por Volatilidad (ATR)
                  </h4>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  {data.optimalSizing.volatilityRegime}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col">
                  <span className="text-[10px] text-neutral-400">Tamaño Óptimo (Notional):</span>
                  <span className="text-sm font-bold text-amber-300">${data.optimalSizing.optimalPositionSizeUsdt} USDT</span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col">
                  <span className="text-[10px] text-neutral-400">Distancia Stop ATR (1.5x):</span>
                  <span className="text-sm font-bold text-white">${fmt(data.optimalSizing.stopDistanceUsdt)} ({data.optimalSizing.stopDistancePercent}%)</span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col">
                  <span className="text-[10px] text-neutral-400">Apalancamiento Seguro:</span>
                  <span className="text-sm font-bold text-emerald-400">{data.optimalSizing.recommendedLeverage}x (ISOLATED)</span>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col">
                  <span className="text-[10px] text-neutral-400">Margen Requerido:</span>
                  <span className="text-sm font-bold text-white">${data.optimalSizing.marginRequiredUsdt} USDT</span>
                </div>
              </div>

              <p className="text-[11px] text-neutral-400 leading-relaxed">
                💡 <em>Regla de Riesgo:</em> Con el balance actual (${data.optimalSizing.accountCapitalUsdt.toFixed(2)} USDT) y riesgo del 1.0% (${data.optimalSizing.riskAmountUsdt.toFixed(2)} USDT), el tamaño de posición se ajusta automáticamente según la volatilidad del ATR (${fmt(data.atr14)}) para que un stop alcanzado nunca exceda la pérdida máxima permitida.
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-amber-400" />
                <span>Binance Futures REST API /klines (15m, 250 velas)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-semibold cursor-pointer transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
