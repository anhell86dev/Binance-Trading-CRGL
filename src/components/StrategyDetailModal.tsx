import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  BookOpen,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  ExternalLink,
  Eye,
  Layers,
  Percent,
  PieChart,
  Shield,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import {
  calculateStrategyRewardToRisk,
  getTradeProcessStageInfo,
  parsePricesFromStrategy,
} from '../utils/sheetParser';
import { binanceWs } from '../services/binanceWs';
import { strategyService } from '../services/strategyService';
import { normalizeBinanceSymbol } from '../data/binancePairs';

interface StrategyDetailModalProps {
  strategy: GoogleSheetStrategyRow;
  isOpen: boolean;
  onClose: () => void;
  onPlotOnChart?: (strategy: GoogleSheetStrategyRow) => void;
  onApplyToOrderForm?: (strategy: GoogleSheetStrategyRow) => void;
}

const formatPrice = (p: number) => {
  if (!p || isNaN(p)) return '0.00';
  if (p >= 100) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
};

export const StrategyDetailModal: React.FC<StrategyDetailModalProps> = ({
  strategy,
  isOpen,
  onClose,
  onPlotOnChart,
  onApplyToOrderForm,
}) => {
  if (!isOpen || !strategy) return null;

  const currentTicker = binanceWs.getTicker();
  const currentPrice = currentTicker.lastPrice > 0 ? currentTicker.lastPrice : 0;
  const parsed = parsePricesFromStrategy(strategy);
  const rr = calculateStrategyRewardToRisk(strategy);
  const stageInfo = getTradeProcessStageInfo(strategy.estado || 'Activa');
  const normalizedSymbol = normalizeBinanceSymbol(strategy.par);

  const e1Dist =
    currentPrice > 0 && parsed.entry1Price > 0
      ? (((parsed.entry1Price - currentPrice) / currentPrice) * 100).toFixed(2)
      : null;
  const e2Dist =
    currentPrice > 0 && parsed.entry2Price > 0
      ? (((parsed.entry2Price - currentPrice) / currentPrice) * 100).toFixed(2)
      : null;

  const handlePlot = () => {
    binanceWs.setSymbol(normalizedSymbol);
    strategyService.setActiveStrategyById(strategy.noEstrategia);
    if (onPlotOnChart) {
      onPlotOnChart(strategy);
    }
    onClose();
  };

  const handleApply = () => {
    binanceWs.setSymbol(normalizedSymbol);
    strategyService.setActiveStrategyById(strategy.noEstrategia);
    if (onApplyToOrderForm) {
      onApplyToOrderForm(strategy);
    }
    if (onPlotOnChart) {
      onPlotOnChart(strategy);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        id="strategy_detail_modal_container"
        className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans text-neutral-100 animate-in fade-in duration-200"
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs font-mono">
              {strategy.par.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-white text-base sm:text-lg">
                  {strategy.par}
                </span>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  {strategy.noEstrategia}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${stageInfo.badgeClass}`}
                >
                  {strategy.estado || 'Activa'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 font-medium">
                {strategy.nombreEstrategia} • <span className="text-amber-400 font-mono">{strategy.temporalidad}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs custom-scrollbar">
          {/* Quick Stats Banner: R:R, Max Gain, Max Risk */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono">
            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 font-sans flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Ratio R:R
              </span>
              <div className="text-base font-black text-amber-300">
                1:{rr.ratio.toFixed(2)}
              </div>
              <span className="text-[9px] text-neutral-500 font-sans">
                {rr.ratio >= 2.5 ? 'Excelente Relación' : 'Rango Táctico'}
              </span>
            </div>

            <div className="bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-500/30 flex flex-col justify-between">
              <span className="text-[10px] text-emerald-400 font-sans flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                Ganancia Máx.
              </span>
              <div className="text-base font-black text-emerald-300">
                +{rr.maxProfitPct.toFixed(1)}%
              </div>
              <span className="text-[9px] text-emerald-500 font-sans">TP Promedio</span>
            </div>

            <div className="bg-rose-950/20 p-2.5 rounded-xl border border-rose-500/30 flex flex-col justify-between">
              <span className="text-[10px] text-rose-400 font-sans flex items-center gap-1">
                <ArrowDownRight className="w-3 h-3 text-rose-400" />
                Riesgo Máx. (SL)
              </span>
              <div className="text-base font-black text-rose-300">
                -{rr.maxLossPct.toFixed(1)}%
              </div>
              <span className="text-[9px] text-rose-500 font-sans">Bajo soporte</span>
            </div>

            <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
              <span className="text-[10px] text-neutral-400 font-sans flex items-center gap-1">
                <Shield className="w-3 h-3 text-cyan-400" />
                Apalancamiento
              </span>
              <div className="text-base font-black text-cyan-300">
                {parsed.leverage}x ISOLATED
              </div>
              <span className="text-[9px] text-neutral-500 font-sans">Margen Aislado</span>
            </div>
          </div>

          {/* 1. SECCIÓN: ENTRADAS ESCALONADAS */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                Zona de Entradas (Escalonamiento 50% / 50%)
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                Tipo: {strategy.tipoDeOrden || 'Límite Escalonada'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono">
              <div className="bg-cyan-950/20 p-2.5 rounded-lg border border-cyan-500/30 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-cyan-400 font-bold">Entrada 1 (E1 - 50%)</span>
                  {e1Dist && (
                    <span className={`text-[10px] ${Number(e1Dist) >= 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                      {Number(e1Dist) >= 0 ? `+${e1Dist}%` : `${e1Dist}%`}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white">
                  ${formatPrice(parsed.entry1Price)}
                </div>
                <span className="text-[10px] text-neutral-400 font-sans">
                  Soporte principal o confirmación de rebote.
                </span>
              </div>

              <div className="bg-blue-950/20 p-2.5 rounded-lg border border-blue-500/30 flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-blue-400 font-bold">Entrada 2 (E2 - 50%)</span>
                  {e2Dist && (
                    <span className={`text-[10px] ${Number(e2Dist) >= 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                      {Number(e2Dist) >= 0 ? `+${e2Dist}%` : `${e2Dist}%`}
                    </span>
                  )}
                </div>
                <div className="text-sm font-bold text-white">
                  ${formatPrice(parsed.entry2Price)}
                </div>
                <span className="text-[10px] text-neutral-400 font-sans">
                  Prueba de soporte profundo o confluencia SMA.
                </span>
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg text-[11px] text-neutral-300 font-sans border border-neutral-800">
              <strong className="text-amber-400">Reglas de Entrada: </strong>
              {strategy.reglasDeEntrada}
            </div>
          </div>

          {/* 2. SECCIÓN: GESTIÓN DE SALIDAS Y TAKE PROFITS */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
              <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                Gestión de Salidas / Take Profits Escalonados
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                40% • 40% • 20%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              <div className="bg-emerald-950/20 p-2 rounded-lg border border-emerald-500/30 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-bold text-[10px]">TP 1 (40% Parcial)</span>
                <span className="text-sm font-bold text-white">${formatPrice(parsed.tp1Price)}</span>
                <span className="text-[9px] text-neutral-400 font-sans">Asegurar ganancias iniciales</span>
              </div>

              <div className="bg-emerald-950/25 p-2 rounded-lg border border-emerald-500/40 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-bold text-[10px]">TP 2 (40% Parcial)</span>
                <span className="text-sm font-bold text-white">${formatPrice(parsed.tp2Price)}</span>
                <span className="text-[9px] text-neutral-400 font-sans">Zona media de resistencia</span>
              </div>

              <div className="bg-emerald-950/30 p-2 rounded-lg border border-emerald-500/50 flex flex-col gap-0.5">
                <span className="text-emerald-400 font-bold text-[10px]">TP Final (20% Swing)</span>
                <span className="text-sm font-bold text-white">${formatPrice(parsed.tpFinalPrice)}</span>
                <span className="text-[9px] text-neutral-400 font-sans">Proyección institucional</span>
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg text-[11px] text-neutral-300 font-sans border border-neutral-800">
              <strong className="text-emerald-400">Reglas de Salida: </strong>
              {strategy.reglasDeSalidaTP}
            </div>
          </div>

          {/* 3. SECCIÓN: GESTIÓN DE RIESGO & STOP LOSS */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-rose-500/30 space-y-2.5">
            <div className="flex items-center justify-between border-b border-neutral-850 pb-1.5">
              <span className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                Gestión de Riesgo & Stop Loss Estricto
              </span>
              <span className="text-[10px] font-mono text-rose-400 font-bold">
                1-5x Aislado • 1-2% Cartera
              </span>
            </div>

            <div className="bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/40 flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-rose-400 font-sans uppercase font-bold">
                  Nivel de Stop Loss Estricto
                </span>
                <div className="text-base font-black text-rose-300">
                  ${formatPrice(parsed.slPrice)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-neutral-400 font-sans">Pérdida Máxima</span>
                <div className="text-sm font-bold text-rose-400">
                  -{rr.maxLossPct.toFixed(2)}%
                </div>
              </div>
            </div>

            <div className="bg-neutral-900/80 p-2 rounded-lg text-[11px] text-neutral-300 font-sans border border-neutral-800">
              <strong className="text-rose-400">Detalle de Riesgo: </strong>
              {strategy.gestionDeRiesgoStopLoss}
            </div>
          </div>

          {/* 4. SECCIÓN: REGLAS DE EJECUCIÓN & INDICADORES */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs border-b border-neutral-850 pb-1.5">
              <BarChart2 className="w-3.5 h-3.5 text-amber-400" />
              Reglas de Ejecución e Indicadores Clave
            </span>

            <div className="bg-neutral-900/80 p-2.5 rounded-lg text-[11px] text-neutral-300 font-sans border border-neutral-800 space-y-1.5">
              <div>
                <strong className="text-neutral-200">Indicadores Técnicos de Confluencia: </strong>
                <span className="text-neutral-400 font-mono text-[10px]">{strategy.indicadoresClave}</span>
              </div>
              <div>
                <strong className="text-neutral-200">Tipo de Orden: </strong>
                <span className="text-amber-400">{strategy.tipoDeOrden}</span>
              </div>
              <div>
                <strong className="text-neutral-200">Temporalidad de Análisis: </strong>
                <span className="text-neutral-300 font-mono">{strategy.temporalidad}</span>
              </div>
            </div>
          </div>

          {/* 5. SECCIÓN: DISCIPLINA DEL TRADE & BACKTESTING */}
          <div className="bg-neutral-950 p-3 rounded-xl border border-neutral-800 space-y-2">
            <span className="font-bold text-white flex items-center gap-1.5 text-xs border-b border-neutral-850 pb-1.5">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              Disciplina del Trade, Probabilidad & Comentarios
            </span>

            <div className="bg-neutral-900/80 p-2.5 rounded-lg text-[11px] text-neutral-300 font-sans border border-neutral-800 space-y-2">
              <div className="text-neutral-300 leading-relaxed">
                {strategy.comentariosBacktesting}
              </div>

              {/* Protocol Rules Checklist */}
              <div className="pt-2 border-t border-neutral-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Nunca perseguir el precio en velas extendidas.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Respetar el Stop Loss sin desplazarlo a la baja.</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Tomas parciales garantizadas en TP1 (40%) y TP2 (40%).</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>Máximo 5x de apalancamiento siempre en modo ISOLATED.</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-4 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-750 transition-colors"
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePlot}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/50 flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Graficar en Pantalla</span>
            </button>

            <button
              onClick={handleApply}
              className="px-4 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 active:bg-amber-500 flex items-center gap-1.5 transition-all shadow-md"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Aplicar a Formulario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
