import React, { useState, useEffect, useMemo, memo } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { PositionRisk } from '../types/binance';
import {
  tradeMilestonesAlertService,
  MilestoneAlertEvent,
  PositionMilestoneLevels,
} from '../services/tradeMilestonesAlertService';
import { formatPrice as formatPriceUtil } from '../utils/priceFormatter';
import {
  tradePriceHistoryService,
  TradePriceHistory,
} from '../services/tradePriceHistoryService';
import { TradePriceSparkline } from './TradePriceSparkline';

interface ActiveTradeInspectorProps {
  selectedSymbol?: string;
  onSelectSymbol?: (symbol: string) => void;
  onOpenOrderModal?: () => void;
}

export const ActiveTradeInspectorWithMilestones: React.FC<ActiveTradeInspectorProps> = memo(({
  selectedSymbol: propSymbol,
  onSelectSymbol,
  onOpenOrderModal,
}) => {
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [selectedPosSymbol, setSelectedPosSymbol] = useState<string>(() => {
    return propSymbol || (positions[0]?.symbol || 'BTCUSDT');
  });

  const [alerts, setAlerts] = useState<MilestoneAlertEvent[]>(() =>
    tradeMilestonesAlertService.getAlerts()
  );

  const [, setHistoryTick] = useState<number>(Date.now());

  // Listen for updates
  useEffect(() => {
    const unsubWs = binanceWs.subscribe(() => {
      const curPositions = binanceWs.getPositions();
      setPositions(curPositions);
      if (!selectedPosSymbol && curPositions.length > 0) {
        setSelectedPosSymbol(curPositions[0].symbol);
      }
    });

    const unsubAlerts = tradeMilestonesAlertService.subscribe(() => {
      setAlerts(tradeMilestonesAlertService.getAlerts());
    });

    const unsubHistory = tradePriceHistoryService.subscribe(() => {
      setHistoryTick(Date.now());
    });

    return () => {
      unsubWs();
      unsubAlerts();
      unsubHistory();
    };
  }, [selectedPosSymbol]);

  // Sync propSymbol if changed
  useEffect(() => {
    if (propSymbol) {
      setSelectedPosSymbol(propSymbol);
    }
  }, [propSymbol]);

  const activePosition = useMemo(() => {
    return (
      positions.find((p) => p.symbol === selectedPosSymbol) ||
      positions[0] ||
      null
    );
  }, [positions, selectedPosSymbol]);

  const milestoneLevels: PositionMilestoneLevels | null = useMemo(() => {
    if (!activePosition) return null;
    return tradeMilestonesAlertService.getMilestoneLevelsForPosition(activePosition);
  }, [activePosition]);

  const priceHistory: TradePriceHistory | null = useMemo(() => {
    if (!activePosition) return null;
    return tradePriceHistoryService.getHistory(activePosition.symbol, activePosition.entryPrice);
  }, [activePosition]);

  const formatPrice = (p: number) => {
    return formatPriceUtil(p, activePosition?.symbol);
  };

  const handleSelectSym = (sym: string) => {
    setSelectedPosSymbol(sym);
    if (onSelectSymbol) {
      onSelectSymbol(sym);
    }
  };

  if (!activePosition || positions.length === 0) {
    return (
      <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-neutral-400">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white">
              Inspector de Trades, Sparkline y Alertas de Hitos (E2, E3, TP1, TP2, TP3, SL)
            </div>
            <div className="text-[11px] text-neutral-400">
              No hay posiciones activas en este momento. Abre una posición para ver el seguimiento en vivo de la trayectoria del precio.
            </div>
          </div>
        </div>

        {onOpenOrderModal && (
          <button
            type="button"
            onClick={onOpenOrderModal}
            className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs font-mono flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 fill-neutral-950" />
            <span>Abrir Trade</span>
          </button>
        )}
      </div>
    );
  }

  const isLong = activePosition.positionAmt > 0;
  const mark = activePosition.markPrice || activePosition.entryPrice || 0;
  const entry = activePosition.entryPrice || 0;
  const pnl = activePosition.unRealizedProfit || 0;
  const roe = activePosition.isolatedMargin > 0 ? (pnl / activePosition.isolatedMargin) * 100 : 0;

  return (
    <div
      id="active-trade-inspector-milestones"
      className="bg-neutral-900/95 border border-neutral-800 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-4 shadow-xl"
    >
      {/* 1. Header con Selector de Trades Activos */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Seguimiento Táctico & Sparkline de Trades
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {positions.length} Posición{positions.length > 1 ? 'es' : ''} en Seguimiento
              </span>
            </div>
            <p className="text-[11px] text-neutral-400">
              Trayectoria de precio desde apertura y disparo automático de alertas (E2, E3, TP1, TP2, TP3, SL)
            </p>
          </div>
        </div>

        {/* Trade Switcher Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-neutral-500 font-mono hidden sm:inline">Trades:</span>
          {positions.map((p) => {
            const pIsLong = p.positionAmt > 0;
            const isSelected = p.symbol === activePosition.symbol;
            return (
              <button
                key={p.symbol}
                type="button"
                onClick={() => handleSelectSym(p.symbol)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20 border border-amber-400'
                    : 'bg-neutral-950 text-neutral-300 hover:text-white hover:bg-neutral-800 border border-neutral-800'
                }`}
              >
                <span>{p.symbol}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded ${
                    pIsLong
                      ? isSelected
                        ? 'bg-black text-emerald-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                      : isSelected
                      ? 'bg-black text-rose-400'
                      : 'bg-rose-500/20 text-rose-400'
                  }`}
                >
                  {pIsLong ? 'LONG' : 'SHORT'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Resumen Métrico del Trade Activo y Sparkline Central */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-center">
        {/* Lado Izquierdo: Info Clave del Trade */}
        <div className="lg:col-span-4 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white font-mono">
                {activePosition.symbol}
              </span>
              <span
                className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                  isLong
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {isLong ? 'LONG' : 'SHORT'} {activePosition.leverage}x
              </span>
            </div>

            <span
              className={`text-xs font-mono font-extrabold ${
                pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {pnl >= 0 ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({roe >= 0 ? '+' : ''}
              {roe.toFixed(2)}%)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Precio Entrada (E1)</span>
              <span className="text-neutral-200 font-bold">${formatPrice(entry)}</span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-neutral-500">Precio en Vivo</span>
              <span className="text-amber-400 font-bold">${formatPrice(mark)}</span>
            </div>
          </div>

          {milestoneLevels?.strategyName && (
            <div className="text-[10px] text-neutral-400 truncate pt-1 border-t border-neutral-900">
              <span className="text-neutral-500">Estrategia:</span> {milestoneLevels.strategyName}
            </div>
          )}
        </div>

        {/* Centro: Gráfico Tipo Sparkline con Historial desde Inicio */}
        <div className="lg:col-span-8 bg-neutral-950/80 p-3 rounded-xl border border-neutral-800/80 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-neutral-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Seguimiento de Precio Continuo (Sparkline desde Inicio)</span>
            </span>
            <span className="text-[10px] text-neutral-500 font-mono">
              Base: E1 ${formatPrice(entry)}
            </span>
          </div>

          <TradePriceSparkline
            history={priceHistory}
            entryPrice={entry}
            currentPrice={mark}
            isLong={isLong}
            height={68}
            showLabels={true}
          />
        </div>
      </div>

      {/* 3. Escalera de Hitos Tácticos en Vivo: E2, E3, TP1, TP2, TP3, SL */}
      {milestoneLevels && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-neutral-200 uppercase tracking-tight">
                Escalera de Hitos & Alertas Automáticas (E2, E3, TP1, TP2, TP3, SL)
              </span>
            </div>
            <span className="text-[10px] text-neutral-500 font-mono">
              Disparo sonoro + toast activado
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* E2: Entrada 2 (DCA) */}
            {(() => {
              const e2 = milestoneLevels.e2Price;
              const isHit = isLong ? mark <= e2 : mark >= e2;
              const dist = mark > 0 ? ((Math.abs(mark - e2) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>E2 (DCA)</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-amber-500 text-black font-extrabold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isHit ? 'TOCADO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">${formatPrice(e2)}</div>
                  <span className="text-[9px] text-neutral-500">Recarga 30%</span>
                </div>
              );
            })()}

            {/* E3: Entrada 3 (Carga Total) */}
            {(() => {
              const e3 = milestoneLevels.e3Price;
              const isHit = isLong ? mark <= e3 : mark >= e3;
              const dist = mark > 0 ? ((Math.abs(mark - e3) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>E3 (DCA 2)</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-amber-500 text-black font-extrabold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isHit ? 'TOCADO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">${formatPrice(e3)}</div>
                  <span className="text-[9px] text-neutral-500">Carga Max 20%</span>
                </div>
              );
            })()}

            {/* TP1: Take Profit 1 */}
            {(() => {
              const tp1 = milestoneLevels.tp1Price;
              const isHit = isLong ? mark >= tp1 : mark <= tp1;
              const dist = mark > 0 ? ((Math.abs(mark - tp1) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>TP1</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-emerald-500 text-black font-extrabold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isHit ? 'TOCADO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">${formatPrice(tp1)}</div>
                  <span className="text-[9px] text-neutral-500">Toma 50% & BE</span>
                </div>
              );
            })()}

            {/* TP2: Take Profit 2 */}
            {(() => {
              const tp2 = milestoneLevels.tp2Price;
              const isHit = isLong ? mark >= tp2 : mark <= tp2;
              const dist = mark > 0 ? ((Math.abs(mark - tp2) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>TP2</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-emerald-500 text-black font-extrabold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isHit ? 'TOCADO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">${formatPrice(tp2)}</div>
                  <span className="text-[9px] text-neutral-500">Extensión 30%</span>
                </div>
              );
            })()}

            {/* TP3: Take Profit 3 (Final) */}
            {(() => {
              const tp3 = milestoneLevels.tp3Price;
              const isHit = isLong ? mark >= tp3 : mark <= tp3;
              const dist = mark > 0 ? ((Math.abs(mark - tp3) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>TP3 (Final)</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-emerald-500 text-black font-extrabold'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {isHit ? 'TOCADO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white">${formatPrice(tp3)}</div>
                  <span className="text-[9px] text-neutral-500">Max Profit 20%</span>
                </div>
              );
            })()}

            {/* SL: Stop Loss */}
            {(() => {
              const sl = milestoneLevels.slPrice;
              const isHit = isLong ? mark <= sl : mark >= sl;
              const dist = mark > 0 ? ((Math.abs(mark - sl) / mark) * 100).toFixed(1) : '0.0';
              return (
                <div
                  className={`p-2.5 rounded-xl border flex flex-col gap-1 transition-all ${
                    isHit
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-xs'
                      : 'bg-neutral-950/80 border-neutral-800/80 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-rose-400">Stop Loss (SL)</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        isHit
                          ? 'bg-rose-600 text-white font-extrabold'
                          : 'bg-neutral-800 text-rose-300'
                      }`}
                    >
                      {isHit ? 'IMPACTO' : `${dist}%`}
                    </span>
                  </div>
                  <div className="text-xs font-mono font-bold text-rose-400">
                    ${formatPrice(sl)}
                  </div>
                  <span className="text-[9px] text-neutral-500">Corte de Riesgo</span>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* 4. Feed de Alertas Recientes Generadas */}
      {alerts.length > 0 && (
        <div className="flex flex-col gap-2 pt-2 border-t border-neutral-800/80">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-neutral-300">
                Historial de Alertas de Hitos Emitidas ({alerts.length})
              </span>
            </div>
            <button
              type="button"
              onClick={() => tradeMilestonesAlertService.clearAlerts()}
              className="text-[10px] text-neutral-500 hover:text-neutral-300 underline cursor-pointer"
            >
              Limpiar Alertas
            </button>
          </div>

          <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto custom-scrollbar">
            {alerts.slice(0, 5).map((alt) => (
              <div
                key={alt.id}
                className={`p-2 rounded-lg border text-[11px] font-mono flex items-center justify-between gap-2 ${
                  alt.milestone === 'SL'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : alt.milestone.startsWith('TP')
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold text-[10px] shrink-0 ${
                      alt.milestone === 'SL'
                        ? 'bg-rose-600 text-white'
                        : alt.milestone.startsWith('TP')
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-black'
                    }`}
                  >
                    {alt.milestone}
                  </span>
                  <span className="truncate">{alt.message}</span>
                </div>

                <div className="flex items-center gap-1 text-[10px] text-neutral-400 shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(alt.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default ActiveTradeInspectorWithMilestones;
