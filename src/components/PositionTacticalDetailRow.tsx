import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Porcentajes de distancia respecto a la entrada
  const slDiffPct = entryPrice > 0 ? ((slPrice - entryPrice) / entryPrice) * 100 : -1.83;
  const tp1DiffPct = entryPrice > 0 ? ((tp1Price - entryPrice) / entryPrice) * 100 : 2.67;

  // Distancia restante a TP1
  const remainingToTp1 = isLong
    ? ((tp1Price - currentLivePrice) / currentLivePrice) * 100
    : ((currentLivePrice - tp1Price) / currentLivePrice) * 100;

  // Ratio R:B
  const riskDistance = Math.abs(entryPrice - slPrice);
  const rewardDistance = Math.abs(tp1Price - entryPrice);
  const rewardRiskRatio = riskDistance > 0 ? rewardDistance / riskDistance : 2.5;

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

  // Motor de Renderizado en Canvas con Coordenadas (X, Y) Reales
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.scale(dpr, dpr);
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const live = currentLivePrice;
      const entry = entryPrice;
      const sl = slPrice;
      const tp1 = tp1Price;
      const tp2 = tp2Price || (isLong ? entry * 1.05 : entry * 0.95);

      // Límites dinámicos con padding proporcional
      const allPrices = [live, entry, sl, tp1, tp2].filter((p) => p > 0);
      const minRaw = Math.min(...allPrices);
      const maxRaw = Math.max(...allPrices);
      const priceRange = Math.max(0.0001, maxRaw - minRaw);
      const pad = priceRange * 0.14;
      const minP = minRaw - pad;
      const maxP = maxRaw + pad;

      const getY = (price: number) => {
        const clamped = Math.max(minP, Math.min(maxP, price));
        return h - ((clamped - minP) / (maxP - minP)) * h;
      };

      // 1. Sombrear Zona Verde de Beneficio (Entry a TP2/TP1)
      if (isLong) {
        const yTopProfit = getY(tp2);
        const yBottomProfit = getY(entry);
        const profitHeight = yBottomProfit - yTopProfit;
        if (profitHeight > 0) {
          ctx.fillStyle = 'rgba(46, 189, 133, 0.08)';
          ctx.fillRect(0, yTopProfit, w, profitHeight);
        }

        // Sombrear Zona Roja de Riesgo (SL a Entry)
        const yTopRisk = getY(entry);
        const yBottomRisk = getY(sl);
        const riskHeight = yBottomRisk - yTopRisk;
        if (riskHeight > 0) {
          ctx.fillStyle = 'rgba(246, 70, 93, 0.08)';
          ctx.fillRect(0, yTopRisk, w, riskHeight);
        }
      } else {
        // En SHORT: Beneficio debajo de la entrada
        const yTopProfit = getY(entry);
        const yBottomProfit = getY(tp2);
        const profitHeight = yBottomProfit - yTopProfit;
        if (profitHeight > 0) {
          ctx.fillStyle = 'rgba(46, 189, 133, 0.08)';
          ctx.fillRect(0, yTopProfit, w, profitHeight);
        }

        // Riesgo por encima de la entrada
        const yTopRisk = getY(sl);
        const yBottomRisk = getY(entry);
        const riskHeight = yBottomRisk - yTopRisk;
        if (riskHeight > 0) {
          ctx.fillStyle = 'rgba(246, 70, 93, 0.08)';
          ctx.fillRect(0, yTopRisk, w, riskHeight);
        }
      }

      // Guías de cuadrícula sutiles
      ctx.strokeStyle = '#1e2638';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      for (let i = 1; i <= 3; i++) {
        const gridY = (h / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, gridY);
        ctx.lineTo(w, gridY);
        ctx.stroke();
      }

      // Función para trazar líneas de nivel
      function drawLevel(price: number, label: string, color: string, dashed = false) {
        const y = getY(price);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        if (dashed) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.moveTo(0, y);
        ctx.lineTo(w - 95, y);
        ctx.stroke();

        // Etiqueta lateral derecha
        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${label} $${formatVal(price)}`, w - 90, y + 3);
      }

      if (tp2Price) drawLevel(tp2, 'TP2', '#2ebd85', true);
      drawLevel(tp1, 'TP1', '#2ebd85', true);
      drawLevel(entry, 'E1', '#00b8d9');
      drawLevel(sl, 'SL', '#f6465d');

      // 3. Trayectoria reciente simulada de velas / sparkline hasta Live
      const liveX = Math.max(60, Math.min(w - 110, w * 0.7));
      const liveY = getY(live);
      const entryY = getY(entry);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([]);

      const step = liveX / 5;
      const diff = live - entry;
      const pts = [
        { x: 15, y: entryY },
        { x: step * 1, y: getY(entry + diff * 0.25 + (isLong ? 0.05 : -0.05) * entry * 0.002) },
        { x: step * 2, y: getY(entry + diff * 0.65 - (isLong ? 0.04 : -0.04) * entry * 0.002) },
        { x: step * 3, y: getY(entry + diff * 0.45 + (isLong ? 0.03 : -0.03) * entry * 0.002) },
        { x: step * 4, y: getY(entry + diff * 0.85) },
        { x: liveX, y: liveY },
      ];

      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Halo sutil bajo la curva
      ctx.lineTo(liveX, h);
      ctx.lineTo(pts[0].x, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, Math.min(entryY, liveY), 0, h);
      grad.addColorStop(0, 'rgba(240, 185, 11, 0.08)');
      grad.addColorStop(1, 'rgba(240, 185, 11, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // 4. Marcador puntual de la posición actual (LIVE)
      ctx.beginPath();
      ctx.arc(liveX, liveY, 9, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240, 185, 11, 0.25)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(liveX, liveY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f0b90b';
      ctx.fill();

      ctx.fillStyle = '#f0b90b';
      ctx.font = 'bold 11px monospace';
      const liveText = `LIVE: $${formatVal(live)}`;
      const textW = ctx.measureText(liveText).width;
      const textX = Math.max(10, Math.min(w - textW - 10, liveX - textW / 2));
      const textY = liveY < 30 ? liveY + 18 : liveY - 10;
      ctx.fillText(liveText, textX, textY);
    };

    render();

    const ro = new ResizeObserver(() => {
      render();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
    };
  }, [currentLivePrice, entryPrice, slPrice, tp1Price, tp2Price, isLong]);

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
    <tr style={{ backgroundColor: '#07090e', borderBottom: '1px solid #1e2638' }}>
      <td colSpan={8} style={{ padding: '8px 12px', border: 'none', backgroundColor: '#07090e' }}>
        {/* CONTENEDOR EXPEDIENTE TOTALMENTE ENCAPSULADO */}
        <div className="trading-card border-accent-warning p-3 w-100 my-1">
          {/* 1. HEADER DEL TRADE */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fs-5 fw-bold text-white font-mono">
                {position.symbol}
              </span>
              <span
                className={`badge px-2 py-1 font-mono fw-bold ${
                  isLong
                    ? 'bg-success-subtle text-success border border-success'
                    : 'bg-danger-subtle text-danger border border-danger'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x
              </span>
              <span className="badge bg-dark border border-secondary text-secondary font-mono" style={{ fontSize: '0.75rem' }}>
                ID: {effectiveStrategyId}
              </span>
              <span
                className={`badge px-2 py-1 ${
                  isTp1Reached
                    ? 'bg-success-subtle text-success border border-success'
                    : isSlBreached
                    ? 'bg-danger-subtle text-danger border border-danger'
                    : 'bg-primary-subtle text-primary border border-primary'
                }`}
                style={{ fontSize: '0.75rem' }}
              >
                {isTp1Reached
                  ? 'Fase 3: TP1 Alcanzado'
                  : isSlBreached
                  ? 'Fase 4: SL Amenazado'
                  : 'Fase 2: En Desarrollo'}
              </span>
              {actionFeedback && (
                <span className="badge bg-warning text-dark fw-bold font-mono">
                  {actionFeedback}
                </span>
              )}
            </div>

            <div className="d-flex align-items-center gap-2 flex-wrap">
              <div className="text-end font-mono small me-1">
                <span className="text-secondary">R/B: </span>
                <strong className="text-success">1 : {rewardRiskRatio.toFixed(1)}</strong>
              </div>
              <button
                type="button"
                onClick={handleMoveToBE}
                className="btn btn-sm btn-outline-secondary py-1 px-2 font-mono"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-shield-check me-1 text-success"></i>
                Mover a BE (${formatVal(entryPrice)})
              </button>
              <button
                type="button"
                onClick={() => onOpenEditModal(position)}
                className="btn btn-sm btn-outline-warning py-1 px-2 fw-semibold font-mono"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-pencil-square me-1"></i>
                Ajustar TP/SL
              </button>
              <button
                type="button"
                onClick={handlePanicClose}
                className="btn btn-sm btn-danger fw-bold text-white py-1 px-2"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Cierre Pánico
              </button>
            </div>
          </div>

          {/* 2. GRID PRINCIPAL (GRÁFICO A LA IZQ, TIMELINE A LA DER) */}
          <div className="row g-3 align-items-start">
            {/* COLUMNA IZQUIERDA: GRÁFICO REAL + VOLATILIDAD */}
            <div className="col-12 col-lg-7 d-flex flex-column gap-3">
              <div className="trading-card p-0 overflow-hidden">
                {/* Header de niveles */}
                <div className="d-flex justify-content-between align-items-center bg-dark p-2 px-3 small border-bottom border-secondary font-mono flex-wrap gap-2">
                  <span className="text-danger fw-bold">
                    <i className="bi bi-arrow-down-circle me-1"></i>
                    SL: ${formatVal(slPrice)} ({slDiffPct >= 0 ? '+' : ''}{slDiffPct.toFixed(2)}%)
                  </span>
                  <span className="text-info fw-bold">
                    <i className="bi bi-record-circle me-1"></i>
                    ENTRADA: ${formatVal(entryPrice)}
                  </span>
                  <span className="text-success fw-bold">
                    <i className="bi bi-arrow-up-circle me-1"></i>
                    TP1: ${formatVal(tp1Price)} ({tp1DiffPct >= 0 ? '+' : ''}{tp1DiffPct.toFixed(2)}%)
                  </span>
                </div>

                {/* CANVAS INTERACTIVO (DIBUJA EL TRADE) */}
                <div className="position-relative w-100 bg-black" style={{ height: '260px' }}>
                  <canvas ref={canvasRef} className="w-100 h-100 d-block" />
                </div>

                {/* Footer métricas */}
                <div className="d-flex justify-content-between align-items-center bg-dark p-2 px-3 small text-secondary border-top border-secondary font-mono flex-wrap gap-2">
                  <span>
                    ATR (15m): <strong className="text-warning">27.67%</strong>
                  </span>
                  <span>
                    Volumen Posición: <strong className="text-white">${notionalUsd.toFixed(2)} USDT</strong>
                  </span>
                  <span>
                    PnL:{' '}
                    <strong className={isProfit ? 'text-success' : 'text-danger'}>
                      {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE)
                    </strong>
                  </span>
                </div>
              </div>

              {/* Alerta de Diagnóstico */}
              <div className="p-3 rounded border-start border-4 border-primary bg-primary-subtle text-light small">
                <div className="text-primary fw-bold mb-1 d-flex align-items-center gap-1">
                  <i className="bi bi-info-circle-fill"></i>
                  Diagnóstico Táctico &amp; Disciplina
                </div>
                <div className="text-secondary">
                  {isTp1Reached
                    ? 'El precio alcanzó la zona de TP1. Activa el protocolo de Break-Even para blindar la operación.'
                    : isSlBreached
                    ? 'Atención: El precio está en proximidad de Stop Loss. Respeta la salida sin promediar.'
                    : 'El precio consolida dentro del rango esperado sin tocar zona de stop loss.'}
                </div>
                <div className="mt-2 text-warning small font-mono">
                  <i className="bi bi-shield-exclamation me-1"></i>
                  <strong>Regla #8:</strong> Mantén la orden condicional; no cierres por ansiedad antes de tocar TP1.
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: CRONOLOGÍA (TIMELINE) */}
            <div className="col-12 col-lg-5">
              <div className="trading-card p-3 h-100">
                <div className="small fw-bold text-secondary text-uppercase mb-3 border-bottom border-secondary pb-2 d-flex justify-content-between align-items-center">
                  <span>Cronología del Trade</span>
                  <span className="badge bg-dark border border-secondary text-secondary font-mono">En Vivo</span>
                </div>

                {/* Items del Timeline con líneas nativas */}
                <div
                  style={{
                    position: 'relative',
                    paddingLeft: '20px',
                    borderLeft: '2px solid #232a3b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '18px',
                    fontSize: '0.8rem',
                  }}
                >
                  {/* Hito 1: Completado */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#2ebd85',
                      }}
                    />
                    <div className="fw-bold text-white">Entrada Ejecutada (100%)</div>
                    <div className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
                      05 Sept 20:00 · ${formatVal(entryPrice)}
                    </div>
                  </div>

                  {/* Hito 2: En Desarrollo */}
                  <div style={{ position: 'relative' }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#f0b90b',
                        boxShadow: '0 0 6px #f0b90b',
                      }}
                    />
                    <div className="fw-bold text-warning">
                      {isTp1Reached ? 'TP1 Alcanzado (100%)' : 'En Desarrollo a TP1'}
                    </div>
                    <div className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
                      Precio actual: ${formatVal(currentLivePrice)}{' '}
                      {isTp1Reached
                        ? '(¡Objetivo Logrado!)'
                        : `(Faltan ${Math.max(0, remainingToTp1).toFixed(1)}%)`}
                    </div>
                  </div>

                  {/* Hito 3: Pendiente o Activo */}
                  <div style={{ position: 'relative', opacity: isTp1Reached ? 1 : 0.4 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: isTp1Reached ? '#3b82f6' : '#474d57',
                      }}
                    />
                    <div className="text-white" style={{ fontWeight: isTp1Reached ? 'bold' : 'normal' }}>
                      Mover a Break-Even
                    </div>
                    <div className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>
                      {isTp1Reached ? '¡Listo para activar BE!' : 'Trigger automático en TP1'}
                    </div>
                  </div>

                  {/* Hito 4: Objetivo Final */}
                  <div style={{ position: 'relative', opacity: 0.4 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: '-26px',
                        top: '2px',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        background: '#474d57',
                      }}
                    />
                    <div className="text-white">TP2 (${formatVal(tp2Price)})</div>
                    <div className="text-secondary font-mono" style={{ fontSize: '0.72rem' }}>Salida final del trade</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Acordeón Opcional para Herramientas Avanzadas */}
          <div className="mt-3 pt-2 border-top border-secondary d-flex justify-content-between align-items-center flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedTools(!showAdvancedTools)}
              className="btn btn-sm btn-outline-secondary py-1 px-2 font-mono"
              style={{ fontSize: '0.75rem' }}
            >
              {showAdvancedTools
                ? '▲ Ocultar Herramientas Avanzadas & Órdenes Condicionales'
                : '▼ Ver Órdenes Condicionales, 8 Disciplinas & Hoja Oficial'}
            </button>

            {onLinkStrategy && (
              <button
                type="button"
                onClick={() => onLinkStrategy(position)}
                className="btn btn-sm btn-outline-warning py-1 px-2 font-mono"
                style={{ fontSize: '0.75rem' }}
              >
                <i className="bi bi-link-45deg me-1"></i>
                Vincular / Cambiar Estrategia
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
        </div>
      </td>
    </tr>
  );
};
