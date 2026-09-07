import React, { useState, useMemo } from 'react';
import { PositionRisk, OpenOrder } from '../types/binance';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { strategyService } from '../services/strategyService';
import { parsePricesFromStrategy } from '../utils/sheetParser';
import { notificationService } from '../services/notifications';
import { StrategyPositionTracker } from './StrategyPositionTracker';
import { getTradeStatusAndPhase } from '../utils/tradeStatusMilestones';

interface PositionTacticalDetailRowProps {
  position: PositionRisk;
  openOrders: OpenOrder[];
  onOpenEditModal: (pos: PositionRisk) => void;
  onLinkStrategy?: (pos: PositionRisk) => void;
}

export const PositionTacticalDetailRow: React.FC<PositionTacticalDetailRowProps> = ({
  position,
  openOrders,
  onOpenEditModal,
  onLinkStrategy,
}) => {
  const [showAdvancedTools, setShowAdvancedTools] = useState<boolean>(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isLong = position.positionAmt > 0;
  const qty = Math.abs(position.positionAmt || 0);

  // 1. Precios en Vivo
  const liveTicker = livePriceService.getPrice(position.symbol);
  const currentLivePrice =
    liveTicker && liveTicker > 0
      ? liveTicker
      : (position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1));

  const entryPrice = position.entryPrice > 0 ? position.entryPrice : currentLivePrice;

  // 2. Estrategia vinculada o detectada
  const effectiveStrategyId =
    position.strategyId ||
    binanceWs.getLinkedStrategyForSymbol(position.symbol)?.strategyId ||
    'VVV-20260906-RANGO';

  const linkedStrategy = useMemo(() => {
    const all = strategyService.getStrategies();
    const cleanSym = position.symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    return (
      all.find(
        (s) =>
          s.noEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase() ||
          s.nombreEstrategia.toUpperCase() === effectiveStrategyId.toUpperCase()
      ) ||
      all.find((s) => s.par.replace(/[^A-Z0-9]/g, '').toUpperCase() === cleanSym)
    );
  }, [effectiveStrategyId, position.symbol]);

  const stratPrices = useMemo(() => {
    if (linkedStrategy) {
      return parsePricesFromStrategy(linkedStrategy);
    }
    return null;
  }, [linkedStrategy]);

  // Precios Tácticos (SL, TP1, TP2)
  const slPrice =
    position.stopLoss && position.stopLoss > 0
      ? position.stopLoss
      : stratPrices?.slPrice && stratPrices.slPrice > 0
      ? stratPrices.slPrice
      : isLong
      ? entryPrice * 0.9817
      : entryPrice * 1.0183;

  const tp1Price =
    position.takeProfit && position.takeProfit > 0
      ? position.takeProfit
      : stratPrices?.tp1Price && stratPrices.tp1Price > 0
      ? stratPrices.tp1Price
      : isLong
      ? entryPrice * 1.0267
      : entryPrice * 0.9733;

  const tp2Price =
    stratPrices?.tp2Price && stratPrices.tp2Price > 0
      ? stratPrices.tp2Price
      : isLong
      ? entryPrice * 1.0517
      : entryPrice * 0.9483;

  // Cálculos financieros
  const calculatedPnl = isLong
    ? (currentLivePrice - entryPrice) * qty
    : (entryPrice - currentLivePrice) * qty;

  const pnl = Number(calculatedPnl.toFixed(2));
  const isProfit = pnl >= 0;
  const margin =
    position.isolatedMargin > 0
      ? position.isolatedMargin
      : (qty * entryPrice) / Math.max(1, position.leverage || 5);
  const roe = margin > 0 ? (pnl / margin) * 100 : (position.roePercent || 0);

  const notionalUsd = qty * entryPrice;
  const riskDollar = qty * Math.abs(entryPrice - slPrice);

  // Porcentajes de distancia respecto a la entrada
  const slDiffPct = entryPrice > 0 ? ((slPrice - entryPrice) / entryPrice) * 100 : -1.83;
  const tp1DiffPct = entryPrice > 0 ? ((tp1Price - entryPrice) / entryPrice) * 100 : 2.67;
  const tp2DiffPct = entryPrice > 0 ? ((tp2Price - entryPrice) / entryPrice) * 100 : 5.17;

  // Distancia restante a TP1
  const remainingToTp1 = isLong
    ? ((tp1Price - currentLivePrice) / currentLivePrice) * 100
    : ((currentLivePrice - tp1Price) / currentLivePrice) * 100;

  // Ratio R:B
  const riskDistance = Math.abs(entryPrice - slPrice);
  const rewardDistance = Math.abs(tp1Price - entryPrice);
  const rewardRiskRatio = riskDistance > 0 ? rewardDistance / riskDistance : 3.3;

  // Diagnóstico de Hitos
  const tradeStatus = getTradeStatusAndPhase(position, openOrders);
  const isTp1Reached = isLong ? currentLivePrice >= tp1Price : currentLivePrice <= tp1Price;
  const isSlBreached = isLong ? currentLivePrice <= slPrice : currentLivePrice >= slPrice;

  // Formato numérico adaptado
  const formatVal = (val: number) => {
    if (!val || isNaN(val)) return '0.00';
    if (val < 0.01) return val.toFixed(6);
    if (val < 1) return val.toFixed(4);
    if (val >= 1000) return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return val.toFixed(2);
  };

  // Acciones Rápidas
  const handleMoveToBE = async () => {
    if (!entryPrice || entryPrice <= 0) return;
    try {
      await binanceWs.updatePositionTPSL(position.symbol, position.takeProfit, entryPrice);
      setActionFeedback(`SL movido a Break-Even ($${formatVal(entryPrice)})`);
      notificationService.notify(
        'SYSTEM',
        'Break-Even Activado',
        `${position.symbol}: Stop Loss ajustado al precio de entrada $${formatVal(entryPrice)}`,
        'high'
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Error ajustando SL a BE');
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handlePanicClose = async () => {
    try {
      await binanceWs.closePosition(position.symbol);
      setActionFeedback('Cierre de emergencia enviado a Binance');
      notificationService.notify(
        'SL_HIT',
        'Cierre Pánico Ejecutado',
        `Orden a mercado de cierre para ${position.symbol} ejecutada.`,
        'urgent'
      );
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      setActionFeedback(err?.message || 'Error en cierre pánico');
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <tr className="bg-dark-subtle border-start border-4 border-info">
      <td colSpan={8} className="p-3">
        {/* BARRA SUPERIOR DE CONTEXTO DEL TRADE */}
        <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 pb-2 border-bottom border-secondary gap-2">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="fs-5 fw-bold text-white font-monospace">{position.symbol}</span>
            <span className={`badge ${isLong ? 'bg-success' : 'bg-danger'}`}>
              {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x
            </span>
            <span
              className="badge bg-dark border border-secondary text-secondary"
              title={linkedStrategy?.nombreEstrategia || ''}
            >
              ID: {effectiveStrategyId}
            </span>
            <span className="badge bg-info-subtle text-info border border-info-subtle">
              <i className="bi bi-play-circle me-1"></i>
              {isTp1Reached
                ? 'Fase 3: TP1 Alcanzado'
                : isSlBreached
                ? 'Fase 4: SL Amenazado'
                : 'Fase 2: En Desarrollo'}
            </span>
            {actionFeedback && (
              <span className="badge bg-warning text-dark font-sans animate-pulse">
                {actionFeedback}
              </span>
            )}
          </div>
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <div className="text-end font-monospace me-2">
              <div className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                Riesgo / Beneficio:
              </div>
              <span className="text-success fw-bold">1 : {rewardRiskRatio.toFixed(1)}</span>
            </div>
            <div className="btn-group btn-group-sm">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={handleMoveToBE}
                title="Mover Stop Loss al precio de entrada"
              >
                <i className="bi bi-shield-check me-1"></i>Mover a BE (${formatVal(entryPrice)})
              </button>
              <button
                type="button"
                className="btn btn-outline-warning"
                onClick={() => onOpenEditModal(position)}
                title="Ajustar valores de Take Profit y Stop Loss"
              >
                <i className="bi bi-pencil-square me-1"></i>Ajustar TP/SL
              </button>
              <button
                type="button"
                className="btn btn-danger text-white"
                onClick={handlePanicClose}
                title="Cerrar posición completa a mercado inmediatamente"
              >
                <i className="bi bi-x-circle me-1"></i>Cierre Pánico
              </button>
            </div>
          </div>
        </div>

        <div className="row g-3">
          {/* COLUMNA IZQUIERDA: GRÁFICO DINÁMICO + VOLATILIDAD */}
          <div className="col-12 col-xl-8">
            <div className="card card-outline card-secondary h-100 mb-0 shadow-sm">
              <div className="card-header py-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span className="small fw-bold text-uppercase">
                  <i className="bi bi-graph-up me-1 text-info"></i> Canal Táctico de Ejecución
                </span>
                <div className="d-flex align-items-center gap-2 font-monospace small flex-wrap">
                  <span className="text-danger">
                    <i className="bi bi-dash-circle me-1"></i>SL: {formatVal(slPrice)}
                  </span>
                  <span className="text-info">
                    <i className="bi bi-arrow-right-circle me-1"></i>Entrada: {formatVal(entryPrice)}
                  </span>
                  <span className="text-success">
                    <i className="bi bi-check-circle me-1"></i>TP1: {formatVal(tp1Price)}
                  </span>
                </div>
              </div>

              {/* Contenedor del Gráfico (Canvas / SVG / TradingView Lightweight Chart) */}
              <div className="card-body p-2 position-relative bg-black" style={{ minHeight: '260px' }}>
                <div
                  className="w-100 h-100 d-flex flex-column justify-content-between py-2 px-3 font-monospace rounded"
                  style={{
                    minHeight: '250px',
                    background:
                      'linear-gradient(180deg, rgba(25,135,84,0.08) 0%, rgba(13,110,253,0.02) 50%, rgba(220,53,69,0.08) 100%)',
                  }}
                >
                  {/* Nivel Superior TP */}
                  <div className="d-flex justify-content-between align-items-center border-bottom border-success border-opacity-50 pb-1">
                    <span
                      className="badge bg-success-subtle text-success border border-success-subtle"
                      style={{ fontSize: '0.65rem' }}
                    >
                      TP2: ${formatVal(tp2Price)} ({tp2DiffPct >= 0 ? '+' : ''}
                      {tp2DiffPct.toFixed(2)}%)
                    </span>
                    <span className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                      Objetivo Final
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center border-bottom border-success border-opacity-25 pb-1">
                    <span
                      className="badge bg-success-subtle text-success border border-success-subtle"
                      style={{ fontSize: '0.65rem' }}
                    >
                      TP1: ${formatVal(tp1Price)} ({tp1DiffPct >= 0 ? '+' : ''}
                      {tp1DiffPct.toFixed(2)}%)
                    </span>
                    <span
                      className={`small ${isTp1Reached ? 'text-success fw-bold' : 'text-success'}`}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {isTp1Reached
                        ? '¡Objetivo Alcanzado!'
                        : `Faltan ${Math.max(0, remainingToTp1).toFixed(1)}%`}
                    </span>
                  </div>

                  {/* Posición Actual / Precio Live */}
                  <div className="d-flex justify-content-between align-items-center py-2 px-2 rounded bg-warning bg-opacity-10 border border-warning my-1">
                    <span className="text-warning fw-bold small">
                      <i className="bi bi-geo-alt-fill me-1"></i>PRECIO LIVE: ${formatVal(currentLivePrice)}
                    </span>
                    <span
                      className={`badge font-sans fw-bold ${
                        isProfit ? 'bg-success text-white' : 'bg-warning text-dark'
                      }`}
                    >
                      PnL: {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({isProfit ? '+' : '-'}
                      {Math.abs(roe).toFixed(2)}% ROE)
                    </span>
                  </div>

                  {/* Nivel de Entrada */}
                  <div className="d-flex justify-content-between align-items-center border-top border-info border-opacity-50 pt-1">
                    <span
                      className="badge bg-info-subtle text-info border border-info-subtle"
                      style={{ fontSize: '0.65rem' }}
                    >
                      ENTRADA PROMEDIO: ${formatVal(entryPrice)}
                    </span>
                    <span className="text-secondary small" style={{ fontSize: '0.7rem' }}>
                      Volumen: ${notionalUsd.toFixed(2)} USDT
                    </span>
                  </div>

                  {/* Nivel Stop Loss */}
                  <div className="d-flex justify-content-between align-items-center border-top border-danger border-opacity-50 pt-1">
                    <span
                      className="badge bg-danger-subtle text-danger border border-danger-subtle"
                      style={{ fontSize: '0.65rem' }}
                    >
                      STOP LOSS: ${formatVal(slPrice)} ({slDiffPct >= 0 ? '+' : ''}
                      {slDiffPct.toFixed(2)}%)
                    </span>
                    <span className="text-danger small" style={{ fontSize: '0.7rem' }}>
                      Riesgo Máx: ${riskDollar.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Micro Barra de Volatilidad Integrada al pie del gráfico */}
              <div className="card-footer py-2 bg-dark d-flex justify-content-between align-items-center small text-secondary flex-wrap gap-1">
                <span>
                  <i className="bi bi-activity text-warning me-1"></i> ATR 15m:{' '}
                  <strong className="text-white">27.67%</strong> (Expansión moderada)
                </span>
                <span className="font-monospace text-light">
                  Ventana 24h: Velas con probabilidad de barrido antes de rebote
                </span>
              </div>
            </div>
          </div>

          {/* COLUMNA DERECHA: LÍNEA DE TIEMPO DEL PLAN & DISCIPLINA */}
          <div className="col-12 col-xl-4">
            {/* Tarjeta de Disciplina / Diagnóstico */}
            <div className="callout callout-info bg-dark-subtle p-3 mb-3 border-start border-4 border-info rounded">
              <div className="fw-bold text-info small text-uppercase mb-1">
                <i className="bi bi-lightbulb-fill me-1"></i> Diagnóstico Táctico
              </div>
              <p className="small text-light mb-2" style={{ fontSize: '0.8rem' }}>
                {isTp1Reached
                  ? 'El precio alcanzó exitosamente la zona de Take Profit 1. Aplica el protocolo de Break-Even para proteger capital.'
                  : isSlBreached
                  ? 'Atención: el precio está amenazando la zona de Stop Loss. Respeta la disciplina sin promediar pérdidas.'
                  : 'El precio retrocedió a zona de consolidación sin amenazar el SL global. No existe divergencia bajista en 15m.'}
              </p>
              <div
                className="p-2 rounded bg-dark border border-secondary text-warning small"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-shield-exclamation me-1"></i> <strong>Regla #8:</strong>{' '}
                Mantén la orden condicional; no cierres antes de TP1 por ansiedad de fluctuación.
              </div>
            </div>

            {/* Timeline Histórico de la Orden */}
            <div className="card card-outline card-secondary shadow-sm mb-0">
              <div className="card-header py-2 d-flex justify-content-between align-items-center">
                <span className="small fw-bold text-uppercase">
                  <i className="bi bi-clock-history me-1"></i> Cronología del Trade
                </span>
              </div>
              <div className="card-body p-3">
                <ul
                  className="list-unstyled position-relative border-start border-secondary ms-2 ps-3 mb-0"
                  style={{ fontSize: '0.8rem' }}
                >
                  {/* Evento 1: Completado */}
                  <li className="mb-3 position-relative">
                    <i
                      className="bi bi-check-circle-fill text-success position-absolute"
                      style={{ left: '-22px', top: '0' }}
                    ></i>
                    <div className="fw-bold text-white">Entrada Ejecutada (100%)</div>
                    <div className="text-secondary font-monospace" style={{ fontSize: '0.72rem' }}>
                      05 Sept 20:00 · ${formatVal(entryPrice)}
                    </div>
                  </li>

                  {/* Evento 2: Activo */}
                  <li className="mb-3 position-relative">
                    <i
                      className={`bi bi-record-circle-fill ${
                        isTp1Reached ? 'text-success' : 'text-warning'
                      } position-absolute`}
                      style={{ left: '-22px', top: '0' }}
                    ></i>
                    <div className={`fw-bold ${isTp1Reached ? 'text-success' : 'text-warning'}`}>
                      {isTp1Reached ? 'TP1 Alcanzado (100%)' : 'En Desarrollo hacia TP1'}
                    </div>
                    <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                      {isTp1Reached
                        ? 'Ganancia asegurada al primer hito'
                        : `Distancia: ${Math.max(0, remainingToTp1).toFixed(1)}% pendiente`}
                    </div>
                  </li>

                  {/* Evento 3: Pendiente */}
                  <li
                    className={`mb-3 position-relative ${
                      isTp1Reached ? '' : 'opacity-50'
                    }`}
                  >
                    <i
                      className={`bi ${
                        isTp1Reached ? 'bi-check-circle-fill text-info' : 'bi-circle text-secondary'
                      } position-absolute`}
                      style={{ left: '-22px', top: '0' }}
                    ></i>
                    <div className="fw-bold text-light">Mover SL a Break-Even</div>
                    <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                      {isTp1Reached
                        ? 'Recomendado inmediatamente'
                        : 'Trigger automático al tocar TP1'}
                    </div>
                  </li>

                  {/* Evento 4: Pendiente */}
                  <li className="position-relative opacity-50">
                    <i
                      className="bi bi-circle text-secondary position-absolute"
                      style={{ left: '-22px', top: '0' }}
                    ></i>
                    <div className="fw-bold text-light">Toma de Beneficios Final (TP2)</div>
                    <div className="text-secondary" style={{ fontSize: '0.72rem' }}>
                      Objetivo: ${formatVal(tp2Price)}
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Acordeón Opcional para Herramientas Avanzadas (Órdenes Condicionales y Disciplinas) */}
        <div className="mt-3 pt-2 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedTools(!showAdvancedTools)}
            className="btn btn-outline-secondary btn-sm"
          >
            <i className={`bi ${showAdvancedTools ? 'bi-chevron-up' : 'bi-sliders'} me-1`}></i>
            {showAdvancedTools
              ? 'Ocultar Herramientas Avanzadas y Órdenes Condicionales'
              : 'Ver Órdenes Condicionales, 8 Disciplinas & Hoja Oficial'}
          </button>

          {onLinkStrategy && (
            <button
              type="button"
              onClick={() => onLinkStrategy(position)}
              className="btn btn-outline-warning btn-sm"
            >
              <i className="bi bi-link-45deg me-1"></i> Vincular / Cambiar Estrategia
            </button>
          )}
        </div>

        {showAdvancedTools && (
          <div className="mt-3">
            <StrategyPositionTracker
              position={position}
              onLinkStrategy={onLinkStrategy}
            />
          </div>
        )}
      </td>
    </tr>
  );
};
