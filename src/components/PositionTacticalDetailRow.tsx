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

  // 1. Precios en Vivo y Suscripción WebSocket pura en tiempo real
  const [livePrice, setLivePrice] = useState<number>(() => {
    const p = livePriceService.getPrice(position.symbol);
    if (p > 0) return p;
    const wsTicker = binanceWs.getTicker();
    if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) return wsTicker.lastPrice;
    return position.markPrice > 0 ? position.markPrice : (position.entryPrice || 1);
  });

  useEffect(() => {
    const handleTickerUpdate = () => {
      const p = livePriceService.getPrice(position.symbol);
      if (p > 0) {
        setLivePrice(p);
        return;
      }
      const wsTicker = binanceWs.getTicker();
      if (wsTicker.symbol === position.symbol && wsTicker.lastPrice > 0) {
        setLivePrice(wsTicker.lastPrice);
      }
    };

    handleTickerUpdate();
    const unsubLive = livePriceService.subscribe(handleTickerUpdate);
    const unsubWs = binanceWs.subscribe(handleTickerUpdate);

    return () => {
      unsubLive();
      unsubWs();
    };
  }, [position.symbol]);

  const currentLivePrice =
    livePrice > 0
      ? livePrice
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

  const notionalUsd = qty * currentLivePrice;

  // Porcentajes de distancia respecto a la entrada
  const slDiffPct = entryPrice > 0 ? ((slPrice - entryPrice) / entryPrice) * 100 : -1.83;
  const tp1DiffPct = entryPrice > 0 ? ((tp1Price - entryPrice) / entryPrice) * 100 : 2.67;
  const tp2DiffPct = entryPrice > 0 ? ((tp2Price - entryPrice) / entryPrice) * 100 : 5.17;

  // Distancia restante a TP1
  const remainingToTp1 = isLong
    ? ((tp1Price - currentLivePrice) / currentLivePrice) * 100
    : ((currentLivePrice - tp1Price) / currentLivePrice) * 100;

  // Progreso porcentual hacia TP1
  const totalTargetDistance = Math.abs(tp1Price - entryPrice);
  const currentCoveredDistance = isLong
    ? Math.max(0, currentLivePrice - entryPrice)
    : Math.max(0, entryPrice - currentLivePrice);
  const progressToTp1Pct = totalTargetDistance > 0
    ? Math.min(100, Math.max(0, (currentCoveredDistance / totalTargetDistance) * 100))
    : 0;

  // Estimaciones para TP2 y Riesgo Máximo SL
  const tp2ProfitEst = isLong ? (tp2Price - entryPrice) * qty : (entryPrice - tp2Price) * qty;
  const tp2RoeEst = margin > 0 ? (tp2ProfitEst / margin) * 100 : 0;
  const maxRiskUsd = isLong ? Math.max(0, (entryPrice - slPrice) * qty) : Math.max(0, (slPrice - entryPrice) * qty);

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

  // Motor de Renderizado en Canvas con Coordenadas (X, Y) y Zonas de Riesgo / Beneficio Dinámicas
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
      const pad = priceRange * 0.16;
      const minP = minRaw - pad;
      const maxP = maxRaw + pad;

      const getY = (price: number) => {
        const clamped = Math.max(minP, Math.min(maxP, price));
        return h - ((clamped - minP) / (maxP - minP)) * h;
      };

      const chartRightEdge = w - 100;

      // 1. Sombrear Zona Dinámica de Beneficio (Verde) y Zona de Riesgo (Roja)
      if (isLong) {
        // En LONG: Beneficio por encima de la entrada (hasta TP2/TP1)
        const yTopProfit = getY(tp2);
        const yBottomProfit = getY(entry);
        const profitHeight = yBottomProfit - yTopProfit;
        if (profitHeight > 0) {
          const gradProfit = ctx.createLinearGradient(0, yTopProfit, 0, yBottomProfit);
          gradProfit.addColorStop(0, 'rgba(46, 189, 133, 0.18)');
          gradProfit.addColorStop(1, 'rgba(46, 189, 133, 0.03)');
          ctx.fillStyle = gradProfit;
          ctx.fillRect(0, yTopProfit, chartRightEdge, profitHeight);

          // Etiqueta sutil de Zona de Beneficio
          ctx.fillStyle = 'rgba(46, 189, 133, 0.6)';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('▲ ZONA BENEFICIO (TP1 / TP2)', 14, yTopProfit + 15);
        }

        // Riesgo por debajo de la entrada (hasta SL)
        const yTopRisk = getY(entry);
        const yBottomRisk = getY(sl);
        const riskHeight = yBottomRisk - yTopRisk;
        if (riskHeight > 0) {
          const gradRisk = ctx.createLinearGradient(0, yTopRisk, 0, yBottomRisk);
          gradRisk.addColorStop(0, 'rgba(246, 70, 93, 0.03)');
          gradRisk.addColorStop(1, 'rgba(246, 70, 93, 0.18)');
          ctx.fillStyle = gradRisk;
          ctx.fillRect(0, yTopRisk, chartRightEdge, riskHeight);

          // Etiqueta sutil de Zona de Riesgo
          ctx.fillStyle = 'rgba(246, 70, 93, 0.6)';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('▼ ZONA RIESGO ACOTADO (SL)', 14, yBottomRisk - 8);
        }
      } else {
        // En SHORT: Beneficio por debajo de la entrada (hasta TP2/TP1)
        const yTopProfit = getY(entry);
        const yBottomProfit = getY(tp2);
        const profitHeight = yBottomProfit - yTopProfit;
        if (profitHeight > 0) {
          const gradProfit = ctx.createLinearGradient(0, yTopProfit, 0, yBottomProfit);
          gradProfit.addColorStop(0, 'rgba(46, 189, 133, 0.03)');
          gradProfit.addColorStop(1, 'rgba(46, 189, 133, 0.18)');
          ctx.fillStyle = gradProfit;
          ctx.fillRect(0, yTopProfit, chartRightEdge, profitHeight);

          ctx.fillStyle = 'rgba(46, 189, 133, 0.6)';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('▼ ZONA BENEFICIO SHORT (TP1 / TP2)', 14, yBottomProfit - 8);
        }

        // Riesgo por encima de la entrada (hasta SL)
        const yTopRisk = getY(sl);
        const yBottomRisk = getY(entry);
        const riskHeight = yBottomRisk - yTopRisk;
        if (riskHeight > 0) {
          const gradRisk = ctx.createLinearGradient(0, yTopRisk, 0, yBottomRisk);
          gradRisk.addColorStop(0, 'rgba(246, 70, 93, 0.18)');
          gradRisk.addColorStop(1, 'rgba(246, 70, 93, 0.03)');
          ctx.fillStyle = gradRisk;
          ctx.fillRect(0, yTopRisk, chartRightEdge, riskHeight);

          ctx.fillStyle = 'rgba(246, 70, 93, 0.6)';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('▲ ZONA RIESGO SHORT (SL)', 14, yTopRisk + 15);
        }
      }

      // 2. Guías de cuadrícula de fondo
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

      // 3. Función para trazar niveles de precio clave
      function drawLevel(price: number, label: string, color: string, dashed = false) {
        const y = getY(price);
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        if (dashed) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);
        ctx.moveTo(0, y);
        ctx.lineTo(chartRightEdge, y);
        ctx.stroke();

        // Pastilla de etiqueta lateral derecha
        ctx.fillStyle = '#161c28';
        ctx.fillRect(chartRightEdge + 4, y - 9, w - chartRightEdge - 8, 18);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(chartRightEdge + 4, y - 9, w - chartRightEdge - 8, 18);

        ctx.fillStyle = color;
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`${label} $${formatVal(price)}`, chartRightEdge + 8, y + 4);
      }

      if (tp2Price) drawLevel(tp2, 'TP2', '#2ebd85', true);
      drawLevel(tp1, 'TP1', '#2ebd85', true);
      drawLevel(entry, 'E1', '#00b8d9');
      drawLevel(sl, 'SL', '#f6465d');

      // 4. Trayectoria de precio hacia el tick actual (Sparkline en vivo)
      const liveX = Math.max(70, Math.min(chartRightEdge - 20, chartRightEdge * 0.75));
      const liveY = getY(live);
      const entryY = getY(entry);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
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

      // Halo degradado bajo la curva
      ctx.lineTo(liveX, h);
      ctx.lineTo(pts[0].x, h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, Math.min(entryY, liveY), 0, h);
      grad.addColorStop(0, 'rgba(240, 185, 11, 0.12)');
      grad.addColorStop(1, 'rgba(240, 185, 11, 0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Línea horizontal punteada del precio LIVE actual
      ctx.beginPath();
      ctx.strokeStyle = '#f0b90b';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.moveTo(0, liveY);
      ctx.lineTo(chartRightEdge, liveY);
      ctx.stroke();

      // 5. Marcador puntual LIVE con halo pulsante
      ctx.beginPath();
      ctx.arc(liveX, liveY, 10, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(240, 185, 11, 0.3)';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(liveX, liveY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#f0b90b';
      ctx.fill();

      // Etiqueta flotante enriquecida con precio y PnL en vivo
      ctx.fillStyle = '#121722';
      const badgeText = `LIVE: $${formatVal(live)} (${isProfit ? '+' : ''}$${pnl.toFixed(2)} / ${isProfit ? '+' : ''}${roe.toFixed(2)}%)`;
      ctx.font = 'bold 10px monospace';
      const textW = ctx.measureText(badgeText).width;
      const badgeX = Math.max(10, Math.min(chartRightEdge - textW - 14, liveX - textW / 2));
      const badgeY = liveY < 32 ? liveY + 14 : liveY - 18;

      ctx.fillRect(badgeX - 4, badgeY - 11, textW + 8, 16);
      ctx.strokeStyle = '#f0b90b';
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(badgeX - 4, badgeY - 11, textW + 8, 16);

      ctx.fillStyle = '#f0b90b';
      ctx.fillText(badgeText, badgeX, badgeY + 1);
    };

    render();

    const ro = new ResizeObserver(() => {
      render();
    });
    ro.observe(canvas);

    return () => {
      ro.disconnect();
    };
  }, [currentLivePrice, entryPrice, slPrice, tp1Price, tp2Price, isLong, pnl, roe, isProfit]);

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
    <tr className="bg-trading-darker border-bottom border-secondary">
      <td colSpan={8} className="p-2 border-0 bg-trading-darker">
        {/* CONTENEDOR EXPEDIENTE TOTALMENTE ENCAPSULADO CON BOOTSTRAP 5 / ADMINLTE 4 */}
        <div className="trading-card border-accent-warning p-3 w-100 my-1">
          {/* 1. HEADER DEL TRADE CON BADGE DE PNL / ROE EN VIVO VÍA WEBSOCKET */}
          <div className="d-flex justify-content-between align-items-center border-bottom border-secondary pb-3 mb-3 flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="fs-5 fw-bold text-white font-mono">
                {position.symbol}
              </span>
              <span
                className={`badge px-2 py-1 font-mono fw-bold fs-7 ${
                  isLong
                    ? 'bg-success-subtle text-success border border-success'
                    : 'bg-danger-subtle text-danger border border-danger'
                }`}
              >
                {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x
              </span>
              <span className="badge bg-dark border border-secondary text-secondary font-mono fs-7">
                ID: {effectiveStrategyId}
              </span>

              {/* Badge Visual Reactivo de PnL no realizado y ROE% con WebSocket Stream */}
              <span
                className={`badge px-2 py-1 font-mono fw-bold fs-7 d-flex align-items-center gap-1 ${
                  isProfit
                    ? 'bg-success-subtle text-success border border-success'
                    : 'bg-danger-subtle text-danger border border-danger'
                }`}
                title="PnL No Realizado calculado dinámicamente con ticks en vivo de WebSocket"
              >
                <i className={`bi ${isProfit ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'}`}></i>
                <span>{isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} USDT</span>
                <span>({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE)</span>
              </span>

              <span
                className={`badge px-2 py-1 fs-7 ${
                  isTp1Reached
                    ? 'bg-success-subtle text-success border border-success'
                    : isSlBreached
                    ? 'bg-danger-subtle text-danger border border-danger'
                    : 'bg-primary-subtle text-primary border border-primary'
                }`}
              >
                {isTp1Reached
                  ? 'Fase 3: TP1 Alcanzado'
                  : isSlBreached
                  ? 'Fase 4: SL Amenazado'
                  : 'Fase 2: En Desarrollo'}
              </span>

              {actionFeedback && (
                <span className="badge bg-warning text-dark fw-bold font-mono fs-7">
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
                className="btn btn-sm btn-outline-secondary py-1 px-2 font-mono fs-7"
              >
                <i className="bi bi-shield-check me-1 text-success"></i>
                Mover a BE (${formatVal(entryPrice)})
              </button>
              <button
                type="button"
                onClick={() => onOpenEditModal(position)}
                className="btn btn-sm btn-outline-warning py-1 px-2 fw-semibold font-mono fs-7"
              >
                <i className="bi bi-pencil-square me-1"></i>
                Ajustar TP/SL
              </button>
              <button
                type="button"
                onClick={handlePanicClose}
                className="btn btn-sm btn-danger fw-bold text-white py-1 px-2 fs-7"
              >
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                Cierre Pánico
              </button>
            </div>
          </div>

          {/* 2. GRID PRINCIPAL (GRÁFICO A LA IZQ, TIMELINE VERTICAL A LA DER) */}
          <div className="row g-3 align-items-start">
            {/* COLUMNA IZQUIERDA: GRÁFICO REAL ENCAPSULADO CON CSS GRID */}
            <div className="col-12 col-lg-7 d-flex flex-column gap-3">
              <div className="trading-chart-grid">
                {/* Header de Niveles en CSS Grid */}
                <div className="chart-grid-header d-flex justify-content-between align-items-center font-mono fs-7 flex-wrap gap-2">
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
                  {tp2Price > 0 && (
                    <span className="text-success-subtle fw-semibold">
                      TP2: ${formatVal(tp2Price)} ({tp2DiffPct >= 0 ? '+' : ''}{tp2DiffPct.toFixed(2)}%)
                    </span>
                  )}
                </div>

                {/* Contenedor Encapsulado del Canvas */}
                <div className="chart-grid-canvas-container">
                  <canvas ref={canvasRef} className="w-100 h-100 d-block" />
                </div>

                {/* Footer Métricas en CSS Grid */}
                <div className="chart-grid-footer d-flex justify-content-between align-items-center text-secondary font-mono fs-7 flex-wrap gap-2">
                  <span>
                    ATR (15m): <strong className="text-warning">27.67%</strong>
                  </span>
                  <span>
                    Volumen: <strong className="text-white">${notionalUsd.toFixed(2)} USDT</strong>
                  </span>
                  <span>
                    PnL Flotante:{' '}
                    <strong className={isProfit ? 'text-success' : 'text-danger'}>
                      {isProfit ? '+' : '-'}${Math.abs(pnl).toFixed(2)} ({isProfit ? '+' : '-'}{Math.abs(roe).toFixed(2)}% ROE)
                    </strong>
                  </span>
                </div>
              </div>

              {/* Alerta de Diagnóstico y Disciplina */}
              <div className="p-3 rounded border-start border-4 border-primary bg-primary-subtle text-light small">
                <div className="text-primary fw-bold mb-1 d-flex align-items-center gap-1">
                  <i className="bi bi-info-circle-fill"></i>
                  Diagnóstico Táctico &amp; Disciplina Operativa
                </div>
                <div className="text-secondary">
                  {isTp1Reached
                    ? 'El precio alcanzó la zona de TP1. Activa el protocolo de Break-Even para blindar la operación sin riesgo de pérdida.'
                    : isSlBreached
                    ? 'Atención: El precio está en proximidad de Stop Loss. Respeta la salida sin promediar.'
                    : `El precio consolida a favor. Faltan ${Math.max(0, remainingToTp1).toFixed(2)}% para tocar el objetivo TP1.`}
                </div>
                <div className="mt-2 text-warning small font-mono">
                  <i className="bi bi-shield-exclamation me-1"></i>
                  <strong>Regla #8:</strong> Mantén la orden condicional en Binance; no cierres por ansiedad antes de tocar TP1 o activar Break-Even.
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: CRONOLOGÍA ESTILO PASO A PASO (VERTICAL TIMELINE) */}
            <div className="col-12 col-lg-5">
              <div className="trading-card p-3 h-100">
                <div className="small fw-bold text-secondary text-uppercase mb-3 border-bottom border-secondary pb-2 d-flex justify-content-between align-items-center">
                  <span className="d-flex align-items-center gap-1">
                    <i className="bi bi-diagram-3 me-1 text-warning"></i>
                    Cronología del Trade (Paso a Paso)
                  </span>
                  <span className="badge bg-dark border border-secondary text-success font-mono fs-8">
                    <i className="bi bi-circle-fill me-1 text-success fs-8"></i>
                    WebSocket Live
                  </span>
                </div>

                {/* Vertical Timeline Paso a Paso */}
                <div className="trading-timeline">
                  {/* Paso 1: Entrada Ejecutada (Completado) */}
                  <div className="timeline-step">
                    <div className="timeline-node completed">
                      <i className="bi bi-check-lg"></i>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <span>Paso 1: Entrada Ejecutada (100%)</span>
                        <span className="badge bg-success-subtle text-success border border-success font-mono fs-8">
                          Fill 100%
                        </span>
                      </div>
                      <div className="timeline-subtext font-mono">
                        Precio Entrada: <strong className="text-white">${formatVal(entryPrice)}</strong> • {isLong ? 'LONG' : 'SHORT'} {position.leverage || 5}x Isolated
                      </div>
                    </div>
                  </div>

                  {/* Paso 2: Trayectoria Hacia TP1 (En Curso / Completado) */}
                  <div className="timeline-step">
                    <div className={`timeline-node ${isTp1Reached ? 'completed' : 'active'}`}>
                      {isTp1Reached ? <i className="bi bi-check-lg"></i> : '2'}
                    </div>
                    <div className={`timeline-content ${!isTp1Reached ? 'active-step' : ''}`}>
                      <div className="timeline-title">
                        <span className={isTp1Reached ? 'text-success' : 'text-warning'}>
                          {isTp1Reached ? 'Paso 2: TP1 Alcanzado' : 'Paso 2: En Trayectoria a TP1'}
                        </span>
                        <span className={`badge font-mono fs-8 ${isTp1Reached ? 'bg-success-subtle text-success border border-success' : 'bg-warning-subtle text-warning border border-warning'}`}>
                          {isTp1Reached ? '100% Logrado' : `${progressToTp1Pct.toFixed(0)}% Completado`}
                        </span>
                      </div>
                      <div className="timeline-subtext font-mono">
                        Precio actual: <strong className="text-warning">${formatVal(currentLivePrice)}</strong> • TP1: <strong className="text-success">${formatVal(tp1Price)}</strong>
                      </div>
                      {/* Barra de Progreso a TP1 */}
                      <div className="progress bg-dark mt-2 border border-secondary progress-xs">
                        <div
                          className={`progress-bar ${isTp1Reached ? 'bg-success' : 'bg-warning'}`}
                          role="progressbar"
                          style={{ width: `${isTp1Reached ? 100 : Math.max(5, progressToTp1Pct)}%` }}
                          aria-valuenow={progressToTp1Pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between text-secondary font-mono mt-1 fs-8">
                        <span>Entrada: ${formatVal(entryPrice)}</span>
                        <span>{isTp1Reached ? '¡Objetivo tocado!' : `Resta: ${Math.max(0, remainingToTp1).toFixed(2)}%`}</span>
                      </div>
                    </div>
                  </div>

                  {/* Paso 3: Protocolo Break-Even (Blindaje) */}
                  <div className="timeline-step">
                    <div className={`timeline-node ${isTp1Reached ? 'active' : 'pending'}`}>
                      {isTp1Reached ? <i className="bi bi-shield-check"></i> : '3'}
                    </div>
                    <div className={`timeline-content ${isTp1Reached ? 'active-step' : ''}`}>
                      <div className="timeline-title">
                        <span className={isTp1Reached ? 'text-white fw-bold' : 'text-secondary'}>
                          Paso 3: Protocolo Break-Even
                        </span>
                        <span className={`badge font-mono fs-8 ${isTp1Reached ? 'bg-info-subtle text-info border border-info' : 'bg-dark border border-secondary text-secondary'}`}>
                          {isTp1Reached ? 'Listo para activar' : 'Condicional a TP1'}
                        </span>
                      </div>
                      <div className="timeline-subtext">
                        Ajusta el Stop Loss al costo de entrada (${formatVal(entryPrice)}) para garantizar 0 riesgo.
                      </div>
                      {isTp1Reached && (
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={handleMoveToBE}
                            className="btn btn-sm btn-outline-success py-1 px-2 font-mono fs-7 w-100"
                          >
                            <i className="bi bi-shield-lock-fill me-1"></i>
                            Blindar a Break-Even Ahora (${formatVal(entryPrice)})
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Paso 4: Toma de Beneficios Final (TP2) */}
                  <div className="timeline-step">
                    <div className="timeline-node pending">
                      <span>4</span>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <span className="text-secondary">Paso 4: Salida Final (TP2)</span>
                        <span className="badge bg-dark border border-secondary text-secondary font-mono fs-8">
                          ${formatVal(tp2Price)}
                        </span>
                      </div>
                      <div className="timeline-subtext font-mono">
                        Ganancia proyectada: <strong className="text-success">+${tp2ProfitEst.toFixed(2)} USDT</strong> (+{tp2RoeEst.toFixed(1)}% ROE).
                      </div>
                    </div>
                  </div>

                  {/* Paso 5: Stop Loss Preventivo */}
                  <div className="timeline-step">
                    <div className={`timeline-node ${isSlBreached ? 'alert' : 'pending'}`}>
                      <i className={`bi ${isSlBreached ? 'bi-exclamation-triangle-fill' : 'bi-shield-x'}`}></i>
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-title">
                        <span className={isSlBreached ? 'text-danger fw-bold' : 'text-secondary'}>
                          Stop Loss Preventivo
                        </span>
                        <span className="badge bg-danger-subtle text-danger border border-danger font-mono fs-8">
                          SL: ${formatVal(slPrice)}
                        </span>
                      </div>
                      <div className="timeline-subtext font-mono">
                        Riesgo máximo acotado: <span className="text-danger">-${maxRiskUsd.toFixed(2)} USDT</span> ({slDiffPct.toFixed(2)}%).
                      </div>
                    </div>
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
              className="btn btn-sm btn-outline-secondary py-1 px-2 font-mono fs-7"
            >
              {showAdvancedTools
                ? '▲ Ocultar Herramientas Avanzadas & Órdenes Condicionales'
                : '▼ Ver Órdenes Condicionales, 8 Disciplinas & Hoja Oficial'}
            </button>

            {onLinkStrategy && (
              <button
                type="button"
                onClick={() => onLinkStrategy(position)}
                className="btn btn-sm btn-outline-warning py-1 px-2 font-mono fs-7"
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
