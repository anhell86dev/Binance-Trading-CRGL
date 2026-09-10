import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Crown,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Layers,
  Radio,
  RefreshCw,
  Shield,
  Sparkles,
  Table,
  Target,
  Zap,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { strategyManagedTradesService, ManagedTradeContext } from '../services/strategyManagedTradesService';
import { StrategyManagedBadge } from './StrategyManagedBadge';
import { StrategyPriceBar } from './StrategyPriceBar';
import { StrategyFuturesConfluenceBadge } from './StrategyFuturesConfluenceBadge';
import { StrategySourceBadge } from './StrategySourceBadge';
import { futuresConfluenceService } from '../services/futuresConfluenceService';

const formatPriceVal = (val: number): string => {
  if (!val || isNaN(val) || val <= 0) return '0.00';
  if (val < 0.0001) return val.toFixed(6);
  if (val < 0.1) return val.toFixed(4);
  if (val < 10) return val.toFixed(4);
  return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDollarVal = (val: number): string => {
  if (!val || isNaN(val) || val <= 0) return '0.00';
  if (val < 0.01) return val.toFixed(4);
  if (val < 1) return val.toFixed(3);
  return val.toFixed(2);
};

const StrategyConfluenceSemaphoreCell: React.FC<{ symbol: string; isLong: boolean }> = ({
  symbol,
  isLong,
}) => {
  const [confluenceData, setConfluenceData] = useState(() =>
    futuresConfluenceService.getConfluence(symbol)
  );

  useEffect(() => {
    setConfluenceData(futuresConfluenceService.getConfluence(symbol));
    const unsubscribe = futuresConfluenceService.subscribe(() => {
      setConfluenceData(futuresConfluenceService.getConfluence(symbol));
    });
    return unsubscribe;
  }, [symbol]);

  const { analysis } = confluenceData;
  const { trafficLight, confidenceScore } = analysis;
  const isGreen = trafficLight === 'BULLISH';
  const isRed = trafficLight === 'BEARISH';
  const isConfluent = (isLong && isGreen) || (!isLong && isRed);
  const isConflicting = (isLong && isRed) || (!isLong && isGreen);

  let badgeClass = 'bg-secondary-subtle text-secondary border border-secondary-subtle';
  let badgeText = 'NEUTRAL';
  let iconClass = 'bi bi-dash-circle me-1';
  let progressBarClass = 'bg-secondary';

  if (isConfluent) {
    badgeClass = 'bg-success-subtle text-success border border-success-subtle';
    badgeText = isLong ? 'APTO LONG' : 'APTO SHORT';
    iconClass = 'bi bi-check-circle-fill me-1';
    progressBarClass = 'bg-success';
  } else if (isConflicting) {
    badgeClass = 'bg-danger-subtle text-danger border border-danger-subtle';
    badgeText = isLong ? 'RIESGO SHORT' : 'RIESGO LONG';
    iconClass = 'bi bi-exclamation-triangle-fill me-1';
    progressBarClass = 'bg-danger';
  } else {
    badgeClass = 'bg-warning-subtle text-warning border border-warning-subtle';
    badgeText = 'NEUTRAL';
    iconClass = 'bi bi-dash-circle me-1';
    progressBarClass = 'bg-warning';
  }

  const score = Math.max(10, Math.min(100, Math.round(confidenceScore || 67)));

  return (
    <td className="text-center" style={{ width: '130px' }}>
      <span className={`badge ${badgeClass} w-100 py-1 mb-1 font-mono`} style={{ fontSize: '0.65rem' }}>
        <i className={iconClass}></i> {badgeText}
      </span>
      <div className="progress bg-dark border border-secondary" style={{ height: '4px' }}>
        <div className={`progress-bar ${progressBarClass}`} style={{ width: `${score}%` }}></div>
      </div>
      <span className="text-secondary font-monospace" style={{ fontSize: '0.65rem' }}>
        {score}% Score
      </span>
    </td>
  );
};

interface TopStrategiesRiskRewardListProps {
  activeStrategies?: GoogleSheetStrategyRow[];
  onStrategySelected?: (strategy: GoogleSheetStrategyRow) => void;
  onOpenDetails?: (strategy: GoogleSheetStrategyRow) => void;
  highlightSymbol?: string;
  onOpenDocsManager?: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  lastSyncTime?: string;
  onNavigateToGestionTrades?: (symbol?: string) => void;
}

interface StrategyRowPriceBarProps {
  livePrice: number;
  entry1Price: number;
  slPrice: number;
  tpPrice: number;
  diffPct: number;
  absDiffPct: number;
  diffDollar: number;
  isPricePositive: boolean;
  change24h: number;
  isLong: boolean;
  isGlow: boolean;
  decimalPlaces: number;
}

const StrategyRowPriceBar: React.FC<StrategyRowPriceBarProps> = ({
  livePrice,
  entry1Price,
  slPrice,
  tpPrice,
  diffPct,
  diffDollar,
  isPricePositive,
  change24h,
  isGlow,
  decimalPlaces,
}) => {
  // Bound calculations for visual scaling
  const allPoints: number[] = [livePrice, entry1Price];
  if (slPrice > 0) allPoints.push(slPrice);
  if (tpPrice > 0) allPoints.push(tpPrice);

  const rawMin = Math.min(...allPoints);
  const rawMax = Math.max(...allPoints);
  const span = rawMax - rawMin;
  const padding = span > 0 ? span * 0.08 : (rawMin > 0 ? rawMin * 0.02 : 1);
  const minBound = rawMin - padding;
  const maxBound = rawMax + padding;

  const calcPos = (val: number): number => {
    if (maxBound <= minBound || !val) return 50;
    const ratio = (val - minBound) / (maxBound - minBound);
    return Math.max(4, Math.min(96, ratio * 100));
  };

  const slX = slPrice > 0 ? calcPos(slPrice) : 0;
  const e1X = entry1Price > 0 ? calcPos(entry1Price) : 50;
  const liveX = calcPos(livePrice);
  const tpX = tpPrice > 0 ? calcPos(tpPrice) : 100;

  const distSlPct = slPrice > 0 && livePrice > 0
    ? ((slPrice - livePrice) / livePrice) * 100
    : 0;

  const distTpPct = tpPrice > 0 && livePrice > 0
    ? ((tpPrice - livePrice) / livePrice) * 100
    : 0;

  return (
    <div
      className={`relative flex flex-col gap-1.5 p-2 rounded-xl transition-all ${
        isGlow
          ? 'bg-gradient-to-r from-amber-950/40 via-neutral-900/90 to-amber-950/40 border border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
          : 'bg-neutral-950/80 border border-neutral-800/90 hover:border-neutral-700/90'
      }`}
    >
      {/* 1. FILA SUPERIOR: DATOS DENTRO DE LA BARRA (SL, E1, PRECIO LIVE Y TP) */}
      <div className="flex items-center justify-between gap-1 text-[10px] font-mono flex-wrap">
        {/* STOP LOSS */}
        <div className="flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 px-1.5 py-0.5 rounded text-rose-300">
          <Shield className="w-2.5 h-2.5 text-rose-400 shrink-0" />
          <span className="font-semibold text-rose-400">SL:</span>
          <span className="font-black text-white">${slPrice ? slPrice.toFixed(decimalPlaces) : '-'}</span>
          {slPrice > 0 && (
            <span className="text-[9px] text-rose-400/90">({Math.abs(distSlPct).toFixed(1)}%)</span>
          )}
        </div>

        {/* ENTRADA 1 (E1) */}
        <div className="flex items-center gap-1 bg-sky-500/10 border border-sky-500/30 px-1.5 py-0.5 rounded text-sky-300">
          <Target className="w-2.5 h-2.5 text-sky-400 shrink-0" />
          <span className="font-semibold text-sky-400">E1:</span>
          <span className="font-black text-white">${entry1Price ? entry1Price.toFixed(decimalPlaces) : '-'}</span>
        </div>

        {/* PRECIO LIVE (DESTACADO Y CON BRILLO) */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono transition-all ${
            isGlow
              ? 'bg-gradient-to-r from-amber-400 to-yellow-300 text-neutral-950 font-black shadow-[0_0_10px_rgba(250,204,21,0.8)] animate-pulse'
              : 'bg-amber-400/20 border border-amber-400/50 text-amber-300 font-bold'
          }`}
        >
          <Radio className={`w-2.5 h-2.5 ${isGlow ? 'text-neutral-950 animate-ping' : 'text-amber-400 animate-pulse'}`} />
          <span>LIVE: ${livePrice.toFixed(decimalPlaces)}</span>
          <span
            className={`text-[9px] font-bold flex items-center ${
              isGlow
                ? 'text-neutral-950'
                : isPricePositive
                ? 'text-emerald-400'
                : 'text-rose-400'
            }`}
          >
            {isPricePositive ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
            {isPricePositive ? '+' : ''}{change24h.toFixed(2)}%
          </span>
        </div>

        {/* TAKE PROFIT (TP1) */}
        <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300">
          <Zap className="w-2.5 h-2.5 text-emerald-400 shrink-0 fill-emerald-400/30" />
          <span className="font-semibold text-emerald-400">TP1:</span>
          <span className="font-black text-white">${tpPrice ? tpPrice.toFixed(decimalPlaces) : '-'}</span>
          {tpPrice > 0 && (
            <span className="text-[9px] text-emerald-400/90">(+{distTpPct.toFixed(1)}%)</span>
          )}
        </div>
      </div>

      {/* 2. BARRA VISUAL DE PRECIO (RIEL CON ZONAS Y MARCADORES EN POSICIÓN) */}
      <div className="relative h-3.5 w-full bg-neutral-900 rounded-full border border-neutral-800 overflow-hidden flex items-center my-0.5">
        {/* Zona Peligro hacia SL */}
        {slPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-rose-500/30"
            style={{
              left: `${Math.min(slX, Math.min(e1X, liveX))}%`,
              width: `${Math.max(2, Math.abs(Math.min(e1X, liveX) - slX))}%`,
            }}
          />
        )}

        {/* Corredor Entrada E1 a Live */}
        <div
          className={`absolute top-0 bottom-0 ${
            isGlow
              ? 'bg-gradient-to-r from-amber-400/50 via-yellow-400/60 to-amber-400/50 animate-pulse'
              : isPricePositive
              ? 'bg-gradient-to-r from-sky-500/25 to-amber-500/30'
              : 'bg-gradient-to-r from-rose-500/25 to-amber-500/30'
          }`}
          style={{
            left: `${Math.min(e1X, liveX)}%`,
            width: `${Math.max(2, Math.abs(liveX - e1X))}%`,
          }}
        />

        {/* Zona Beneficio hacia TP */}
        {tpPrice > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-emerald-500/30"
            style={{
              left: `${Math.min(liveX, tpX)}%`,
              width: `${Math.max(2, Math.abs(tpX - Math.min(liveX, tpX)))}%`,
            }}
          />
        )}

        {/* Marcador Pin SL */}
        {slPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-rose-500 border border-neutral-950 ring-1 ring-rose-400 z-10"
            style={{ left: `${slX}%` }}
            title={`Stop Loss: $${slPrice.toFixed(decimalPlaces)}`}
          />
        )}

        {/* Marcador Pin E1 */}
        {entry1Price > 0 && (
          <div
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border border-neutral-950 z-10 ${
              isGlow
                ? 'w-3 h-3 bg-amber-400 ring-2 ring-amber-300 animate-ping'
                : 'w-2.5 h-2.5 bg-sky-400 ring-1 ring-sky-300'
            }`}
            style={{ left: `${e1X}%` }}
            title={`Entrada 1: $${entry1Price.toFixed(decimalPlaces)}`}
          />
        )}

        {/* Marcador Aguja Live Price (Brilla y resalta) */}
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-neutral-950 flex items-center justify-center z-20 ${
            isGlow
              ? 'w-4 h-4 bg-amber-300 ring-2 ring-amber-300 shadow-[0_0_12px_rgba(250,204,21,0.9)] animate-pulse'
              : 'w-3.5 h-3.5 bg-amber-400 ring-1 ring-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
          }`}
          style={{ left: `${liveX}%` }}
          title={`Precio Live: $${livePrice.toFixed(decimalPlaces)}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-neutral-950" />
        </div>

        {/* Marcador Pin TP */}
        {tpPrice > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-neutral-950 ring-1 ring-emerald-300 z-10"
            style={{ left: `${tpX}%` }}
            title={`Take Profit 1: $${tpPrice.toFixed(decimalPlaces)}`}
          />
        )}
      </div>

      {/* 3. FILA INFERIOR: PROXIMIDAD A E1 Y RANGO DE RECORRIDO DENTRO DE LA BARRA */}
      <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 px-0.5">
        <span className="text-rose-400/90 font-medium">
          {slPrice > 0 ? `Riesgo SL: ${Math.abs(distSlPct).toFixed(1)}%` : 'Sin SL'}
        </span>

        {/* PROXIMIDAD A E1 CON BRILLO */}
        <span
          className={`font-bold flex items-center gap-1 ${
            isGlow
              ? 'text-amber-300 font-black drop-shadow-[0_0_6px_rgba(250,204,21,0.6)]'
              : diffPct >= 0
              ? 'text-sky-300'
              : 'text-emerald-400'
          }`}
        >
          {isGlow && <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />}
          <span>
            {isGlow ? '🎯 EN ZONA E1' : 'Distancia E1'}: {diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%
            <span className="opacity-80 font-normal ml-0.5">({diffDollar >= 0 ? '+' : ''}{diffDollar.toFixed(decimalPlaces)}$)</span>
          </span>
        </span>

        <span className="text-emerald-400/90 font-medium">
          {tpPrice > 0 ? `Objetivo TP1: +${distTpPct.toFixed(1)}%` : 'Sin TP'}
        </span>
      </div>
    </div>
  );
};

export const TopStrategiesRiskRewardList: React.FC<TopStrategiesRiskRewardListProps> = ({
  activeStrategies: propsActiveStrategies,
  onStrategySelected,
  onOpenDetails,
  highlightSymbol,
  onOpenDocsManager,
  onSync,
  isSyncing = false,
  lastSyncTime,
  onNavigateToGestionTrades,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [, setPriceTick] = useState(0);
  const [onlyManagedFilter, setOnlyManagedFilter] = useState<boolean>(false);

  useEffect(() => {
    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
    });
    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });
    const unsubManaged = strategyManagedTradesService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });
    return () => {
      unsubStrat();
      unsubPrice();
      unsubManaged();
    };
  }, []);

  // 1. Obtener lista de estrategias activas (excluir obsoletas)
  const activeList = useMemo(() => {
    const source = propsActiveStrategies || strategies;
    return source.filter((st) => {
      const isObsolete =
        (st.estado || '').toLowerCase().includes('obsolet') ||
        normalizeStrategyStatus(st.estado) === 'Obsoleto';
      return !isObsolete;
    });
  }, [propsActiveStrategies, strategies]);

  // Contar estrategias actualmente gestionadas en operaciones de Gestión de Trades
  const managedStrategiesCount = useMemo(() => {
    return strategyManagedTradesService.getManagedStrategiesCount(activeList);
  }, [activeList, strategies]);

  // 2. Calcular R/B, precios y ordenar por mejor Ratio R:B para TODAS las estrategias
  const rankedStrategies = useMemo(() => {
    let sourceList = activeList;
    if (onlyManagedFilter) {
      sourceList = sourceList.filter((st) => strategyManagedTradesService.isStrategyManaged(st));
    }

    const calculated = sourceList.map((strat) => {
      const prices = parsePricesFromStrategy(strat);
      const rr = calculateStrategyRewardToRisk(strat);
      const isLong =
        !strat.tipoDeOrden?.toLowerCase().includes('short') &&
        !strat.tipoDeOrden?.toLowerCase().includes('venta');

      const liveData = livePriceService.getPriceData(strat.par);
      const livePrice = liveData.price;
      const entry1Price = prices.entry1Price || livePrice;

      const diffDollar = livePrice - entry1Price;
      const diffPct = entry1Price > 0 ? (diffDollar / entry1Price) * 100 : 0;
      const absDiffPct = Math.abs(diffPct);
      const isPricePositive = (liveData.change24hPercent || 0) >= 0;

      const ratio = rr.ratio > 0 ? rr.ratio : 2.0;

      // Criterios de proximidad a Entrada 1 (E1)
      const isVeryCloseToE1 = entry1Price > 0 && livePrice > 0 && absDiffPct <= 1.25;

      return {
        strategy: strat,
        prices,
        rr,
        isLong,
        liveData,
        livePrice,
        entry1Price,
        diffDollar,
        diffPct,
        absDiffPct,
        isPricePositive,
        ratio,
        isVeryCloseToE1,
      };
    });

    // Ordenar de mayor a menor ratio R:B (y si empatan, por proximidad a Entrada 1)
    calculated.sort((a, b) => {
      if (b.ratio !== a.ratio) {
        return b.ratio - a.ratio;
      }
      return a.absDiffPct - b.absDiffPct;
    });

    return calculated;
  }, [activeList, onlyManagedFilter]);

  // 3. Encontrar cuál del catálogo está MÁS PRÓXIMA globalmente a Entrada 1
  const closestInListId = useMemo(() => {
    if (rankedStrategies.length === 0) return null;
    let minDiff = Infinity;
    let closestId: string | null = null;
    rankedStrategies.forEach((item) => {
      if (item.entry1Price > 0 && item.livePrice > 0 && item.absDiffPct < minDiff) {
        minDiff = item.absDiffPct;
        closestId = item.strategy.noEstrategia;
      }
    });
    return closestId;
  }, [rankedStrategies]);

  const handleExecute = (item: (typeof rankedStrategies)[0]) => {
    const strat = item.strategy;
    const cleanSym = strat.par.replace(/[^A-Z0-9]/g, '');

    // Switch WS stream
    binanceWs.setSymbol(cleanSym);

    // Autofill order form
    const basePrice = item.entry1Price || item.livePrice || livePriceService.getPrice(cleanSym) || 1.0;
    const slPrice = item.prices.slPrice || (item.isLong ? basePrice * 0.985 : basePrice * 1.015);
    const tpPrice = item.prices.tp1Price || (item.isLong ? basePrice * 1.045 : basePrice * 0.955);

    strategyAutofillService.autofillOrderForm({
      strategyId: strat.noEstrategia,
      strategyName: `${strat.par} - ${strat.nombreEstrategia}`,
      symbol: cleanSym,
      side: item.isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: 2, // Margen seguro max 5x
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice,
      tpPrice,
      riskReward: item.ratio,
      autoExecuteImmediately: false,
    });

    if (onStrategySelected) {
      onStrategySelected(strat);
    }
  };

  return (
    <div id="top-strategies-risk-reward-list" className="flex flex-col gap-2.5">
      {/* Header Banner - Compacto y elegante */}
      <div className="bg-neutral-900/90 border border-amber-500/30 rounded-xl px-3.5 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-xs">
            <Crown className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Estrategias Ordenadas por Ratio R/B (Mayor a Menor)
            </h4>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {rankedStrategies.length} Activas
            </span>

            {/* Selector de Filtro: Todas vs En Gestión de Trades */}
            <div className="flex items-center gap-1 bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 ml-1">
              <button
                type="button"
                onClick={() => setOnlyManagedFilter(false)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-all ${
                  !onlyManagedFilter
                    ? 'bg-neutral-800 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Todas ({activeList.length})
              </button>
              <button
                type="button"
                onClick={() => setOnlyManagedFilter(true)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1 transition-all ${
                  onlyManagedFilter
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : managedStrategiesCount > 0
                    ? 'text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/30'
                    : 'text-neutral-500 hover:text-neutral-400'
                }`}
                title="Mostrar exclusivamente las estrategias que están siendo gestionadas en las operaciones de Gestión de trades"
              >
                {managedStrategiesCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                )}
                <Layers className="w-3 h-3 text-emerald-400" />
                <span>En Gestión ({managedStrategiesCount})</span>
              </button>
            </div>

            <span className="text-[10px] font-mono text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
              <span>Brillan las próximas a Entrada 1 (E1)</span>
            </span>
            <span className="text-[10px] font-mono text-emerald-300/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 flex items-center gap-1.5">
              <div className="flex items-center gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <span>Semáforo Confluencia Futuros</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-neutral-950 px-2.5 py-1 rounded-md border border-neutral-800">
            <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
            <span>Live FAPI</span>
          </div>

          {onOpenDocsManager && (
            <button
              type="button"
              onClick={onOpenDocsManager}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Abrir Gestor de Google Docs: Leer, Escribir, Editar y Sincronizar"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
              <span>Google Docs</span>
            </button>
          )}

          {onSync && (
            <button
              type="button"
              onClick={onSync}
              disabled={isSyncing}
              className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              title="Sincronizar estrategias desde Google Sheets"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
            </button>
          )}

          <a
            href={OFFICIAL_GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Abrir hoja de cálculo oficial en Google Sheets"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Sheets URL</span>
          </a>
        </div>
      </div>

      {/* TABLA DE ALTA DENSIDAD ORDENADA POR R/B DE MAYOR A MENOR */}
      <div className="crypto-table-container shadow-xl" data-bs-theme="dark">
        <table className="financial-table text-sm w-100">
          <thead>
            <tr className="bg-neutral-950 text-neutral-400 text-xs border-b border-neutral-800">
              <th
                className="py-2.5 px-2 text-center text-secondary fw-bold font-monospace"
                style={{ width: '45px' }}
              >
                #
              </th>
              <th className="py-2.5 px-3 text-start" style={{ minWidth: '240px' }}>
                Par + Estrategia
              </th>
              <th className="py-2.5 px-3 text-center" style={{ minWidth: '380px' }}>
                Barra de Rango Dinámico Reestructurada
              </th>
              <th className="py-2.5 px-2 text-center" style={{ width: '130px' }}>
                Semáforo Confluencia Compacto
              </th>
              <th className="py-2.5 px-2 text-center" style={{ width: '80px' }}>
                Ratio R:B
              </th>
              <th className="py-2.5 px-2 text-center" style={{ width: '90px' }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80 font-mono text-sm">
            {rankedStrategies.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-neutral-500 font-sans">
                  No hay estrategias activas disponibles en el catálogo.
                </td>
              </tr>
            ) : (
              rankedStrategies.map((item, index) => {
                const strat = item.strategy;
                const rank = index + 1;
                const isClosestGlobal = closestInListId === strat.noEstrategia;
                const isGlow = item.isVeryCloseToE1 || isClosestGlobal;
                const isSelected =
                  highlightSymbol &&
                  highlightSymbol.toUpperCase() === strat.par.replace(/[^A-Z0-9]/g, '');

                const managedCtx = strategyManagedTradesService.getManagedTradeContext(strat);
                const isManaged = Boolean(managedCtx?.isManaged);

                const baseEntry = item.entry1Price > 0 ? item.entry1Price : (item.livePrice || 1);
                const slPrice =
                  item.prices.slPrice || (item.isLong ? baseEntry * 0.985 : baseEntry * 1.015);
                const tp1Price =
                  item.prices.tp1Price || (item.isLong ? baseEntry * 1.045 : baseEntry * 0.955);
                const livePrice = item.livePrice || baseEntry;

                // Relative distances
                const slDiffPct = baseEntry > 0 ? ((slPrice - baseEntry) / baseEntry) * 100 : -2.5;
                const tpDiffPct = baseEntry > 0 ? ((tp1Price - baseEntry) / baseEntry) * 100 : 5.0;

                const riskDollar = Math.abs(baseEntry - slPrice);
                const rewardDollar = Math.abs(tp1Price - baseEntry);

                // Proportional stacked bar widths
                const validRatio = item.ratio > 0 ? item.ratio : 2.0;
                const riskWidthPct = Math.max(
                  20,
                  Math.min(50, Math.round((1 / (1 + validRatio)) * 100))
                );
                const rewardWidthPct = 100 - riskWidthPct;

                const inZone = item.isVeryCloseToE1 || item.absDiffPct <= 1.5;

                return (
                  <tr
                    key={strat.noEstrategia}
                    className={`transition-all duration-200 ${
                      isManaged
                        ? 'bg-emerald-950/30 border-y border-emerald-500/70 shadow-[0_0_15px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                        : isGlow
                        ? 'bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border-y border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.2)]'
                        : isSelected
                        ? 'bg-neutral-850/90 border-amber-500/40'
                        : 'hover:bg-neutral-850/60'
                    }`}
                  >
                    {/* 1. Rank */}
                    <td
                      className="text-center text-secondary fw-bold font-monospace"
                      style={{ width: '45px' }}
                    >
                      #{rank}
                    </td>

                    {/* 2. Par + Estrategia unificados + Marca Gestión de Trades */}
                    <td style={{ minWidth: '240px' }}>
                      <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                        <span className="fw-bold text-white fs-6">{strat.par}</span>
                        {item.isLong ? (
                          <span
                            className="badge bg-success-subtle text-success border border-success-subtle"
                            style={{ fontSize: '0.65rem' }}
                          >
                            LONG
                          </span>
                        ) : (
                          <span
                            className="badge bg-danger-subtle text-danger border border-danger-subtle"
                            style={{ fontSize: '0.65rem' }}
                          >
                            SHORT
                          </span>
                        )}
                        {/* Si estuviera en zona: */}
                        {inZone && (
                          <span
                            className="badge bg-warning text-dark font-bold"
                            style={{ fontSize: '0.65rem' }}
                          >
                            E1: {item.diffPct >= 0 ? '+' : ''}
                            {item.diffPct.toFixed(2)}%
                          </span>
                        )}
                      </div>

                      {/* Marca destacada si está siendo gestionada en Gestión de Trades */}
                      {isManaged && (
                        <div className="mb-1">
                          <StrategyManagedBadge
                            tradeContext={managedCtx}
                            onNavigateToGestionTrades={onNavigateToGestionTrades}
                            showNavigationButton={true}
                          />
                        </div>
                      )}

                      <div
                        className="text-secondary small text-truncate"
                        style={{ maxWidth: '220px' }}
                        title={strat.nombreEstrategia || ''}
                      >
                        {strat.nombreEstrategia || 'Estrategia de Google Sheets'}
                      </div>
                      <div className="mt-1">
                        <StrategySourceBadge
                          source={strat.fuenteActualizacion}
                          updatedAt={strat.fechaActualizacion}
                          compact={true}
                        />
                      </div>
                    </td>

                    {/* 3. Barra de Rango Dinámico Reestructurada */}
                    <td style={{ minWidth: '380px' }}>
                      {/* Metadatos sobre la barra */}
                      <div
                        className="d-flex justify-content-between small font-monospace mb-1"
                        style={{ fontSize: '0.72rem' }}
                      >
                        <span className="text-danger">
                          SL: ${formatPriceVal(slPrice)}{' '}
                          <span className="text-secondary">
                            ({slDiffPct > 0 ? `-${slDiffPct.toFixed(1)}` : `${slDiffPct.toFixed(1)}`}%)
                          </span>
                        </span>
                        <span className="text-warning fw-bold">
                          <i className="bi bi-geo-alt-fill"></i> Live: ${formatPriceVal(livePrice)}
                        </span>
                        <span className="text-success">
                          TP1: ${formatPriceVal(tp1Price)}{' '}
                          <span className="text-secondary">
                            ({tpDiffPct >= 0 ? `+${tpDiffPct.toFixed(1)}` : `${tpDiffPct.toFixed(1)}`}%)
                          </span>
                        </span>
                      </div>

                      {/* Barra visual dividida */}
                      <div className="progress-stacked" style={{ height: '8px' }}>
                        <div
                          className="progress"
                          role="progressbar"
                          style={{ width: `${riskWidthPct}%` }}
                          title="Zona SL a Entrada"
                        >
                          <div className="progress-bar bg-danger opacity-75"></div>
                        </div>
                        <div
                          className="progress"
                          role="progressbar"
                          style={{ width: `${rewardWidthPct}%` }}
                          title="Zona Entrada a TP1"
                        >
                          <div className="progress-bar bg-success opacity-75"></div>
                        </div>
                      </div>

                      {/* Referencia de Entrada bajo la barra */}
                      <div
                        className="d-flex justify-content-between text-secondary small font-monospace mt-1"
                        style={{ fontSize: '0.7rem' }}
                      >
                        <span>Riesgo: ${formatDollarVal(riskDollar)}</span>
                        <span className="text-info font-bold">
                          Entrada 1: ${formatPriceVal(baseEntry)}
                        </span>
                        <span>Obj. Net: +${formatDollarVal(rewardDollar)}</span>
                      </div>
                    </td>

                    {/* 4. Semáforo Confluencia Compacto */}
                    <StrategyConfluenceSemaphoreCell symbol={strat.par} isLong={item.isLong} />

                    {/* 5. Ratio R:B */}
                    <td className="text-center font-monospace" style={{ width: '80px' }}>
                      <span className="badge bg-dark border border-success text-success fs-6 px-2 py-1">
                        1:{item.ratio.toFixed(1)}
                      </span>
                    </td>

                    {/* 6. Acciones */}
                    <td className="text-center" style={{ width: '120px' }}>
                      <div className="btn-group btn-group-sm">
                        {isManaged && onNavigateToGestionTrades && (
                          <button
                            type="button"
                            className="btn btn-success text-white shadow-xs"
                            title="Operación activa: ir a Gestión de Trades para supervisar o modificar"
                            onClick={() => onNavigateToGestionTrades(strat.par)}
                          >
                            <Layers className="w-3.5 h-3.5 inline-block" />
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn btn-outline-warning text-warning"
                          title="Ver Gráfico"
                          onClick={() => {
                            binanceWs.setSymbol(strat.par.replace(/[^A-Z0-9]/g, ''));
                            if (onOpenDetails) onOpenDetails(strat);
                          }}
                        >
                          <i className="bi bi-eye"></i>
                        </button>
                        <button
                          type="button"
                          className="btn btn-warning text-dark"
                          title="Ejecutar Trade"
                          onClick={() => handleExecute(item)}
                        >
                          <i className="bi bi-lightning-fill"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
