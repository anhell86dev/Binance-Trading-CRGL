import React, { useEffect } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Clock,
  Coins,
  HelpCircle,
  Info,
  Lightbulb,
  PieChart,
  Shield,
  TrendingDown,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

interface DerivativesMetricsInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DerivativesMetricsInfoModal: React.FC<DerivativesMetricsInfoModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="derivatives-info-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="derivatives-info-modal-card"
        className="w-full max-w-2xl bg-neutral-900 border border-neutral-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <HelpCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Guía de Métricas de Futuros Binance
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  USDⓈ-M FAPI
                </span>
              </h3>
              <p className="text-xs text-neutral-400">
                Interpretación y significado práctico de OI, Funding Rate, Taker y Top L/S
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700 transition-colors"
            title="Cerrar guía (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-4 custom-scrollbar text-sm text-neutral-200">
          {/* SECCIÓN SEMÁFORO DE MERCADO: ¿OPERAR O NO OPERAR? */}
          <div className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-700 rounded-xl p-4 flex flex-col gap-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <div className="flex items-center gap-1 bg-neutral-950 px-2 py-1 rounded-md border border-neutral-800">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                </div>
                <span>Semáforo Operativo: ¿Operar o No Operar?</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Sistema de Decisión
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              El semáforo sintetiza en tiempo real los 4 pilares de Binance Futures (<strong>Interés Abierto</strong>, <strong>Funding Rate</strong>, <strong>Taker C/V</strong> y <strong>Top Traders L/S</strong>) para dictaminar si el mercado tiene confluencia de continuación alcista o riesgo de caída.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,1)]" />
                  <span>VERDE: Continuación Alcista</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-300 uppercase">Apto Operar Long</span>
                <p className="text-[11px] text-neutral-300">
                  OI en expansión con precio al alza + Taker comprador dominante + Ballenas en Long. Alta probabilidad de seguimiento alcista.
                </p>
              </div>

              <div className="bg-amber-950/40 border border-amber-500/40 rounded-lg p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,1)]" />
                  <span>AMARILLO: Zona Neutral</span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 uppercase">Esperar Confirmación</span>
                <p className="text-[11px] text-neutral-300">
                  Fuerzas equilibradas o señales cruzadas (ej: Taker compra pero las ballenas están en short). No apresurar entradas sin gatillo claro.
                </p>
              </div>

              <div className="bg-rose-950/40 border border-rose-500/40 rounded-lg p-2.5 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,1)]" />
                  <span>ROJO: Posible Caída</span>
                </div>
                <span className="text-[10px] font-bold text-rose-300 uppercase">No Operar en Long</span>
                <p className="text-[11px] text-neutral-300">
                  Fuerte presión bajista: Taker vendedor agresivo, ballenas en short o sobrecalentamiento de funding con riesgo inminente de corrección.
                </p>
              </div>
            </div>
          </div>

          {/* 1. Open Interest (OI) */}
          <div className="bg-neutral-950/80 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <Coins className="w-4 h-4" />
                <span>1. OI (Interés Abierto / Open Interest)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Capital en Juego
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              Representa el <strong>valor total en USDT (o contratos)</strong> de todas las posiciones en futuros que siguen abiertas y activas en el mercado (es decir, que no han sido liquidadas ni cerradas por los traders).
            </p>
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 text-xs space-y-1.5">
              <div className="font-semibold text-neutral-200 flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>¿Cómo interpretarlo en tu operativa?</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-400 pl-1">
                <li>
                  <strong className="text-emerald-400">OI Sube + Precio Sube:</strong> Nuevos compradores están entrando al mercado inyectando dinero fresco. <em>Confirmación de tendencia alcista fuerte.</em>
                </li>
                <li>
                  <strong className="text-rose-400">OI Sube + Precio Baja:</strong> Nuevos vendedores agresivos están abriendo cortos apalancados. <em>Fuerte presión bajista.</em>
                </li>
                <li>
                  <strong className="text-neutral-300">OI Cae bruscamente:</strong> Los traders están cerrando posiciones o siendo liquidados en cascada (desapalancamiento masivo).
                </li>
              </ul>
            </div>
          </div>

          {/* 2. Funding Rate */}
          <div className="bg-neutral-950/80 border border-blue-500/30 rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm">
                <Clock className="w-4 h-4" />
                <span>2. Funding Rate (Tasa de Financiación)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
                Liquidación cada 8h
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              Es un mecanismo periódico (cada 8 horas: 00:00, 08:00 y 16:00 UTC) de pagos directos entre traders de posiciones <strong>Long</strong> y <strong>Short</strong>. Su objetivo es evitar que el precio de los futuros perpetuos se desvíe del precio Spot real.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2.5">
                <div className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>Funding Positivo (+)</span>
                </div>
                <p className="text-[11px] text-neutral-300 mt-1">
                  Los <strong>Longs pagan a los Shorts</strong>. El mercado está predominantemente alcista y dispuesto a pagar por mantener posiciones de compra. Tasas muy altas (&gt;0.05%) alertan sobrecalentamiento.
                </p>
              </div>
              <div className="bg-rose-950/30 border border-rose-800/40 rounded-lg p-2.5">
                <div className="text-rose-400 font-bold flex items-center gap-1 text-[11px]">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Funding Negativo (-)</span>
                </div>
                <p className="text-[11px] text-neutral-300 mt-1">
                  Los <strong>Shorts pagan a los Longs</strong>. El mercado está predominantemente bajista. Tasas muy negativas indican ventas en pánico o posible rebote por estrangulamiento de cortos (short squeeze).
                </p>
              </div>
            </div>
          </div>

          {/* 3. Taker Buy/Sell Volume */}
          <div className="bg-neutral-950/80 border border-purple-500/30 rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                <BarChart2 className="w-4 h-4" />
                <span>3. Taker C/V (Volumen Taker Compra / Venta)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Presión a Mercado
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              Mide la proporción de órdenes ejecutadas con <strong>órdenes a mercado agresivas (Takers)</strong> que barren el libro de órdenes al instante, en lugar de esperar pacientemente como órdenes límite (Makers).
            </p>
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 text-xs space-y-1">
              <div className="font-semibold text-neutral-200">Lectura Rápida del Flujo de Órdenes:</div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                • <strong>Taker Compra &gt; 50%:</strong> Compradores agresivos están pagando el precio ask con urgencia.<br />
                • <strong>Taker Venta &gt; 50%:</strong> Vendedores agresivos están tirando el precio cruzando el bid con urgencia.<br />
                • <strong>Ratio &gt; 1.2x:</strong> Desequilibrio notable a favor de la demanda activa.
              </p>
            </div>
          </div>

          {/* 4. Top Trader Long/Short Ratio */}
          <div className="bg-neutral-950/80 border border-cyan-500/30 rounded-xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                <PieChart className="w-4 h-4" />
                <span>4. Top L/S (Ratio Long/Short de Cuentas Top)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/40">
                Ballenas & Institucionales
              </span>
            </div>
            <p className="text-xs leading-relaxed text-neutral-300">
              Muestra el posicionamiento del <strong>20% superior de cuentas con mayor capital</strong> en Binance Futures.
            </p>
            <div className="bg-neutral-900/90 rounded-lg p-2.5 border border-neutral-800 text-xs text-[11px] text-neutral-400">
              • <strong>Ratio &gt; 1.0 (ej: 1.66:1):</strong> Las ballenas tienen más posiciones en Long que en Short.<br />
              • <strong>Ratio &lt; 1.0 (ej: 0.75:1):</strong> Las ballenas están mayoritariamente protegidas o posicionadas en Short.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-neutral-400 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Datos transmitidos en tiempo real vía WebSocket FAPI Binance
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
