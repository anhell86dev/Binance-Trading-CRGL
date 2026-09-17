import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  Volume2,
  VolumeX,
  Sliders,
  X,
  CheckCircle2,
  ShieldCheck,
  TrendingDown,
  Activity,
  ArrowRight,
  Sparkles,
  Zap,
  Play,
  RotateCcw,
  Percent,
  Clock,
  ExternalLink,
  Target,
} from 'lucide-react';
import { atrAlertService, AtrAlertItem, AtrSoundTone, AtrAlertConfig } from '../services/atrAlertService';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { formatPrice } from '../utils/priceFormatter';
import { PositionRisk } from '../types/binance';
import { EmergencyCloseButton } from './EmergencyCloseButton';

interface AtrRiskManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSymbol?: string;
  onOpenTrailingStop?: (symbol: string) => void;
  onNavigateToTrades?: () => void;
}

export const AtrRiskManagementModal: React.FC<AtrRiskManagementModalProps> = ({
  isOpen,
  onClose,
  targetSymbol,
  onOpenTrailingStop,
  onNavigateToTrades,
}) => {
  const [activeTab, setActiveTab] = useState<'review' | 'positions' | 'settings'>('review');
  const [alerts, setAlerts] = useState<AtrAlertItem[]>([]);
  const [config, setConfig] = useState<AtrAlertConfig>(atrAlertService.getConfig());
  const [positions, setPositions] = useState<PositionRisk[]>(() => binanceWs.getPositions());
  const [selectedSymbol, setSelectedSymbol] = useState<string>(targetSymbol || 'BTCUSDT');
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [beSuccessMessage, setBeSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const update = () => {
      setAlerts(atrAlertService.getActiveAlerts());
      setConfig(atrAlertService.getConfig());
      setPositions(binanceWs.getPositions());
      setBalance(binanceWs.getBalance());
    };

    update();
    const unsubAtr = atrAlertService.subscribe(update);
    const unsubWs = binanceWs.subscribe(update);

    return () => {
      unsubAtr();
      unsubWs();
    };
  }, []);

  useEffect(() => {
    if (targetSymbol) {
      setSelectedSymbol(targetSymbol);
    } else if (alerts.length > 0) {
      setSelectedSymbol(alerts[0].symbol);
    }
  }, [targetSymbol, alerts]);

  if (!isOpen) return null;

  const currentAlert = alerts.find((a) => a.symbol === selectedSymbol) || alerts[0] || null;
  const currentPrice = livePriceService.getPrice(selectedSymbol) || currentAlert?.currentPrice || 68500;
  const activePosition = positions.find(
    (p) => p.symbol === selectedSymbol && Math.abs(p.positionAmt) > 0
  );

  // Dynamic calculations for volatility risk mitigation
  const atrPercent = currentAlert ? currentAlert.atrPercent : 3.45;
  const atrDollar = currentAlert ? currentAlert.atrValue : (currentPrice * atrPercent) / 100;
  const volExpansionRatio = Number((atrPercent / 1.5).toFixed(2));
  
  // Recommended parameters
  const recommendedLev = Math.max(1, Math.min(5, Math.floor(5 / volExpansionRatio)));
  const stopLoss1_5x = Number((atrDollar * 1.5).toFixed(4));
  const stopLoss1_5xPct = Number(((stopLoss1_5x / currentPrice) * 100).toFixed(2));
  const stopLoss2_0x = Number((atrDollar * 2.0).toFixed(4));
  const stopLoss2_0xPct = Number(((stopLoss2_0x / currentPrice) * 100).toFixed(2));

  // Capital risk calculations (1% rule)
  const capital = balance.availableBalance > 0 ? balance.availableBalance : 1000;
  const riskAmountUsdt = Number((capital * 0.01).toFixed(2)); // 1%
  const optimalNotionalUsdt = Number(((riskAmountUsdt / (stopLoss1_5xPct / 100))).toFixed(2));
  const optimalMarginRequired = Number((optimalNotionalUsdt / recommendedLev).toFixed(2));

  // Breakeven Move Handler
  const handleMoveToBreakeven = (pos: PositionRisk) => {
    const isLong = pos.positionAmt > 0;
    const entry = pos.entryPrice;
    const side = isLong ? 'SELL' : 'BUY';
    const qty = Math.abs(pos.positionAmt);

    const orderIdStr = `be-${pos.symbol}-${Date.now()}`;
    // Call Binance WS to place Stop Market order at entry price
    binanceWs.createOrder({
      orderId: orderIdStr,
      clientOrderId: orderIdStr,
      symbol: pos.symbol,
      side,
      type: 'STOP_MARKET',
      origQty: qty,
      executedQty: 0,
      price: entry,
      stopPrice: entry,
      status: 'NEW',
      timeInForce: 'GTC',
      isReduceOnly: true,
      workingType: 'MARK_PRICE',
      leverage: pos.leverage || 3,
      marginType: 'ISOLATED',
      createdAt: Date.now(),
    });

    setBeSuccessMessage(`✅ Stop Loss movido a Breakeven ($${formatPrice(entry, pos.symbol)}) para ${pos.symbol}`);
    setTimeout(() => setBeSuccessMessage(null), 4000);
  };

  const handleSaveConfig = (newCfg: Partial<AtrAlertConfig>) => {
    const updated = { ...config, ...newCfg };
    setConfig(updated);
    atrAlertService.saveConfig(updated);
  };

  const handleTestSound = (tone: AtrSoundTone) => {
    atrAlertService.testTone(tone);
  };

  const handleTriggerSimulation = () => {
    atrAlertService.triggerManualTest(selectedSymbol || 'BTCUSDT', 4.5);
  };

  return (
    <div
      id="atr-risk-management-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="atr-risk-management-modal"
        className="relative w-full max-w-4xl bg-neutral-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-neutral-900 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Centro de Gestión de Riesgo por ATR
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  VOLATILIDAD EN VIVO
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Auditoría dinámica de volatilidad, dimensionamiento óptimo y protección de margen.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-950 border-b border-neutral-800 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'review'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Auditoría de Volatilidad ({selectedSymbol})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'positions'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Posiciones Expuestas ({positions.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configuración de Alertas & Sonido</span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar">
          
          {beSuccessMessage && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{beSuccessMessage}</span>
            </div>
          )}

          {/* TAB 1: AUDITORÍA DE VOLATILIDAD */}
          {activeTab === 'review' && (
            <div className="space-y-5">
              
              {/* Top Selector if multiple alerts exist */}
              {alerts.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap p-2.5 bg-neutral-950 border border-neutral-800 rounded-xl">
                  <span className="text-xs font-bold text-neutral-400">Pares con alerta:</span>
                  {alerts.map((a) => (
                    <button
                      key={a.symbol}
                      type="button"
                      onClick={() => setSelectedSymbol(a.symbol)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                        selectedSymbol === a.symbol
                          ? 'bg-amber-500 text-neutral-950'
                          : 'bg-neutral-900 text-neutral-300 border border-neutral-700 hover:text-white'
                      }`}
                    >
                      {a.symbol} ({a.atrPercent.toFixed(1)}%)
                    </button>
                  ))}
                </div>
              )}

              {/* Metric Hero Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. ATR Actual vs Umbral */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-amber-500/30 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>ATR (14 Periodos)</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {atrPercent >= config.criticalThresholdPercent ? 'CRÍTICO' : 'ELEVADO'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-amber-400 font-mono">
                    {atrPercent.toFixed(2)}%
                  </div>
                  <div className="text-[11px] text-neutral-400 flex items-center justify-between font-mono">
                    <span>Valor: ${formatPrice(atrDollar, selectedSymbol)}</span>
                    <span className="text-neutral-500">Umbral: {config.criticalThresholdPercent}%</span>
                  </div>
                </div>

                {/* 2. Expansión de Volatilidad */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Expansión vs Promedio</span>
                    <span className="text-[10px] text-neutral-500 font-mono">Base 1.50%</span>
                  </div>
                  <div className="text-2xl font-black text-rose-400 font-mono">
                    {volExpansionRatio}x
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    Riesgo de slippage y mechas bruscas incrementado
                  </div>
                </div>

                {/* 3. Apalancamiento Máximo Recomendado */}
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-emerald-500/30 flex flex-col gap-1 shadow-inner">
                  <div className="flex items-center justify-between text-neutral-400 text-xs">
                    <span>Apalancamiento Sugerido</span>
                    <span className="text-[10px] font-mono text-emerald-400 font-bold">ISOLATED</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-400 font-mono">
                    {recommendedLev}x
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {recommendedLev < 3 ? 'Apalancamiento conservador obligatorio' : 'Apalancamiento moderado seguro'}
                  </div>
                </div>
              </div>

              {/* Protocolo Táctico de Mitigación de Riesgo */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-400" />
                    Parámetros de Stop Loss y Dimensionamiento Óptimo
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    Precio Ref: ${formatPrice(currentPrice, selectedSymbol)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Buffer Stop Loss 1.5x ATR */}
                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300 font-bold">Stop Loss Óptimo (1.5× ATR)</span>
                      <span className="text-amber-400 font-bold">±{stopLoss1_5xPct}%</span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Distancia en precio: <strong className="text-white">${stopLoss1_5x}</strong>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-sans mt-1">
                      Protege la operación contra mechas de ruido normales del marco de 15m.
                    </p>
                  </div>

                  {/* Buffer Stop Loss 2.0x ATR */}
                  <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-300 font-bold">Stop Loss Amplio (2.0× ATR)</span>
                      <span className="text-rose-400 font-bold">±{stopLoss2_0xPct}%</span>
                    </div>
                    <div className="text-neutral-400 text-[11px]">
                      Distancia en precio: <strong className="text-white">${stopLoss2_0x}</strong>
                    </div>
                    <p className="text-[10px] text-neutral-500 font-sans mt-1">
                      Para alta volatilidad intradía o sesiones de noticias de alto impacto.
                    </p>
                  </div>
                </div>

                {/* Regla de Capital & Sizing */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
                  <div className="font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Regla de Riesgo Máximo (1% del Capital: ${riskAmountUsdt} USDT)
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed font-sans">
                    Para no arriesgar más de <strong>${riskAmountUsdt} USDT</strong> con un Stop a 1.5× ATR ({stopLoss1_5xPct}%), el tamaño nocional máximo no debe exceder <strong>${optimalNotionalUsdt} USDT</strong> (Margen requerido a {recommendedLev}x: <strong>${optimalMarginRequired} USDT</strong>).
                  </p>
                </div>
              </div>

              {/* Posición Activa de este Símbolo y Acciones 1-Click */}
              {activePosition ? (
                <div className="p-4 rounded-xl bg-neutral-950 border border-sky-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-xs font-bold text-white">
                        Posición Abierta Detectada en {selectedSymbol}
                      </span>
                      <span className={`text-[10px] font-mono px-2 py-0.2 rounded font-bold ${
                        activePosition.positionAmt > 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {activePosition.positionAmt > 0 ? 'LONG' : 'SHORT'} {activePosition.leverage}x
                      </span>
                    </div>
                    <div className="text-xs font-mono">
                      PnL: <strong className={activePosition.unRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {activePosition.unRealizedProfit >= 0 ? '+' : ''}${activePosition.unRealizedProfit.toFixed(2)} USDT
                      </strong>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {/* Move to BE */}
                    <button
                      type="button"
                      onClick={() => handleMoveToBreakeven(activePosition)}
                      className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Coloca orden de Stop Market al precio exacto de entrada"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Mover SL a Breakeven</span>
                    </button>

                    {/* Trailing Stop Config */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenTrailingStop?.(selectedSymbol);
                      }}
                      className="px-3 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-sky-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>Trailing Stop ATR</span>
                    </button>

                    {/* Emergency Close Button */}
                    <EmergencyCloseButton
                      symbol={selectedSymbol}
                      positionSize={Math.abs(activePosition.positionAmt)}
                      entryPrice={activePosition.entryPrice}
                      unrealizedPnl={activePosition.unRealizedProfit}
                      variant="danger"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-neutral-400 flex items-center justify-between">
                  <span>Sin posiciones abiertas actualmente en {selectedSymbol}. Monitoreo preventivo activado.</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToTrades?.();
                    }}
                    className="text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver Bandeja de Trades</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}

            </div>
          )}

          {/* TAB 2: TODAS LAS POSICIONES EXPUESTAS */}
          {activeTab === 'positions' && (
            <div className="space-y-4">
              <div className="text-xs text-neutral-400">
                Supervisión del impacto de la volatilidad actual en todas tus posiciones abiertas aisladas.
              </div>

              {positions.length === 0 ? (
                <div className="p-8 text-center rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs">
                  No hay posiciones abiertas en este momento.
                </div>
              ) : (
                <div className="space-y-3">
                  {positions.map((pos) => {
                    const isLong = pos.positionAmt > 0;
                    const liveP = livePriceService.getPrice(pos.symbol) || pos.entryPrice;
                    const posAlert = alerts.find((a) => a.symbol === pos.symbol);
                    const posAtrPct = posAlert?.atrPercent || 2.5;

                    return (
                      <div
                        key={pos.symbol}
                        className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg font-mono font-bold text-xs ${
                            isLong ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {isLong ? 'LONG' : 'SHORT'} {pos.leverage}x
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-white font-mono">{pos.symbol}</span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                posAtrPct >= config.criticalThresholdPercent
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                  : 'bg-neutral-800 text-neutral-400'
                              }`}>
                                ATR: {posAtrPct.toFixed(2)}%
                              </span>
                            </div>
                            <div className="text-[11px] text-neutral-400 font-mono">
                              Entrada: ${formatPrice(pos.entryPrice, pos.symbol)} • Actual: ${formatPrice(liveP, pos.symbol)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-center">
                          <div className="text-right font-mono">
                            <div className="text-[10px] text-neutral-500">PnL Flotante</div>
                            <div className={`text-xs font-black ${pos.unRealizedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {pos.unRealizedProfit >= 0 ? '+' : ''}${pos.unRealizedProfit.toFixed(2)} USDT
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleMoveToBreakeven(pos)}
                            className="px-2.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-amber-300 text-xs font-bold transition-colors cursor-pointer"
                            title="Mover SL a Breakeven"
                          >
                            BE
                          </button>

                          <EmergencyCloseButton
                            symbol={pos.symbol}
                            positionSize={Math.abs(pos.positionAmt)}
                            entryPrice={pos.entryPrice}
                            unrealizedPnl={pos.unRealizedProfit}
                            variant="compact"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CONFIGURACIÓN DE ALERTAS & SONIDO */}
          {activeTab === 'settings' && (
            <div className="space-y-5">
              
              {/* 1. Umbrales de Disparo ATR */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  Umbrales de Volatilidad Crítica
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Umbral Crítico % */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-semibold">Umbral Crítico (%):</span>
                      <span className="font-mono font-bold text-amber-400 text-sm">{config.criticalThresholdPercent.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1.5"
                      max="8.0"
                      step="0.1"
                      value={config.criticalThresholdPercent}
                      onChange={(e) => handleSaveConfig({ criticalThresholdPercent: parseFloat(e.target.value) })}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                      <span>1.5% (Sensible)</span>
                      <span>3.0% (Recomendado)</span>
                      <span>8.0% (Solo picos extremos)</span>
                    </div>
                  </div>

                  {/* Umbral Preventivo % */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-300 font-semibold">Umbral de Advertencia (%):</span>
                      <span className="font-mono font-bold text-sky-400 text-sm">{config.warningThresholdPercent.toFixed(1)}%</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="4.0"
                      step="0.1"
                      value={config.warningThresholdPercent}
                      onChange={(e) => handleSaveConfig({ warningThresholdPercent: parseFloat(e.target.value) })}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                      <span>1.0%</span>
                      <span>2.0% (Recomendado)</span>
                      <span>4.0%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Configuración del Motor de Audio Sintetizado (Web Audio API) */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    Alertas Sonoras Sintetizadas (Web Audio)
                  </h3>
                  
                  {/* Master Sound Switch */}
                  <button
                    type="button"
                    onClick={() => handleSaveConfig({ soundEnabled: !config.soundEnabled })}
                    className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      config.soundEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    }`}
                  >
                    {config.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    <span>{config.soundEnabled ? 'Sonido Activado' : 'Sonido Silenciado'}</span>
                  </button>
                </div>

                {/* Tone Selection Radio Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {[
                    { id: 'siren' as AtrSoundTone, title: 'Alarma Táctica Oscilante (Sirena)', desc: 'Pulso bitonal oscilante (784Hz <-> 587Hz)' },
                    { id: 'tactical-pulse' as AtrSoundTone, title: 'Triple Pulso Staccato', desc: 'Tres ráfagas agudas inmediatas (1046Hz)' },
                    { id: 'caution' as AtrSoundTone, title: 'Precaución Ascendente', desc: 'Onda cuadrada suave (320Hz -> 520Hz)' },
                    { id: 'harmonic' as AtrSoundTone, title: 'Arpegio Armónico Descendente', desc: 'Cuatro notas continuas de aviso' },
                  ].map((t) => (
                    <div
                      key={t.id}
                      onClick={() => handleSaveConfig({ soundTone: t.id })}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        config.soundTone === t.id
                          ? 'bg-amber-500/15 border-amber-500/50 text-white'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${config.soundTone === t.id ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                          {t.title}
                        </div>
                        <div className="text-[10px] text-neutral-400">{t.desc}</div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestSound(t.id);
                        }}
                        className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-amber-300 text-xs transition-colors cursor-pointer shrink-0 ml-2"
                        title="Probar este tono"
                      >
                        <Play className="w-3.5 h-3.5 fill-amber-300" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Cooldown Interval */}
                <div className="flex items-center justify-between text-xs pt-2 border-t border-neutral-800/80">
                  <span className="text-neutral-400">Intervalo de enfriamiento entre alertas sonoras:</span>
                  <select
                    value={config.cooldownSeconds}
                    onChange={(e) => handleSaveConfig({ cooldownSeconds: parseInt(e.target.value) })}
                    className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono focus:outline-hidden"
                  >
                    <option value={15}>15 Segundos</option>
                    <option value={30}>30 Segundos</option>
                    <option value={45}>45 Segundos (Recomendado)</option>
                    <option value={60}>60 Segundos</option>
                    <option value={120}>2 Minutos</option>
                  </select>
                </div>
              </div>

              {/* 3. Botón de Simulación / Disparo Manual */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white">Simular Alerta Crítica (Test de Audio y Banner)</div>
                  <div className="text-[11px] text-neutral-400">
                    Dispara una alerta simulada de ATR en 4.5% para verificar el banner superior y el sintetizador sonoro.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleTriggerSimulation}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <Zap className="w-3.5 h-3.5 fill-neutral-950" />
                  <span>Probar Alerta Ahora</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-xs font-mono shrink-0">
          <div className="text-neutral-500 text-[11px]">
            Monitoreo ATR: Activo 24/7 en tiempo real con WebSocket FAPI
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
