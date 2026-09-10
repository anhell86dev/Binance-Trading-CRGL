import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Compass,
  Crown,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  Layers,
  Radio,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Table as TableIcon,
  LayoutGrid,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
  Activity,
  Sliders,
  DollarSign,
  Maximize2,
  Volume2,
  VolumeX,
  BellRing,
} from 'lucide-react';
import { GoogleSheetStrategyRow, ParsedStrategyPrices } from '../types/strategy';
import {
  ConfluenceFactorKey,
  ConfluenceMatchMode,
  ConfluencePreset,
  StrategyFullConfluenceResult,
} from '../types/confluence';
import { strategyService } from '../services/strategyService';
import { livePriceService } from '../services/livePriceService';
import { binanceWs } from '../services/binanceWs';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { futuresConfluenceService } from '../services/futuresConfluenceService';
import { notificationService } from '../services/notifications';
import {
  parsePricesFromStrategy,
  calculateStrategyRewardToRisk,
  normalizeStrategyStatus,
} from '../utils/sheetParser';
import {
  evaluateStrategyConfluence,
  CONFLUENCE_FACTOR_DEFINITIONS,
} from '../utils/confluenceEngine';
import { StrategyFuturesConfluenceBadge } from './StrategyFuturesConfluenceBadge';
import { ConfluenceFactorSelector } from './ConfluenceFactorSelector';
import { StrategyConfluenceDetailBadge } from './StrategyConfluenceDetailBadge';
import { StrategyDetailModal } from './StrategyDetailModal';
import { StrategySourceBadge } from './StrategySourceBadge';

interface TopOperacionesViewProps {
  onOpenOrderModal?: () => void;
  onNavigateToFutures?: () => void;
  onNavigateToGestionTrades?: (symbol?: string) => void;
}

export interface CandidateTradeOperation {
  strategy: GoogleSheetStrategyRow;
  prices: ParsedStrategyPrices;
  livePrice: number;
  entry1Price: number;
  entry2Price: number;
  entry3Price?: number;
  avgEntryPrice: number;
  slPrice: number;
  tp1Price: number;
  tp2Price: number;
  tpFinalPrice: number;
  isLong: boolean;
  diffDollar: number;
  diffPct: number;
  absDiffPct: number;
  rewardToRisk: ReturnType<typeof calculateStrategyRewardToRisk>;
  ratio: number;
  isInZone: boolean;
  isVeryClose: boolean;
  isClose: boolean;
  hasTouchedE1: boolean;
  decimalPlaces: number;
  trafficLight: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  isConfluent: boolean;
  confluenceResult: StrategyFullConfluenceResult;
  isFullConfluenceMatch: boolean;
}

export const TopOperacionesView: React.FC<TopOperacionesViewProps> = ({
  onOpenOrderModal,
  onNavigateToFutures,
  onNavigateToGestionTrades,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() =>
    strategyService.getStrategies()
  );
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() =>
    strategyService.getLastSyncTime()
  );
  const [priceTick, setPriceTick] = useState(0);

  // Multi-Factor Confluence Selector States
  const [selectedFactors, setSelectedFactors] = useState<Set<ConfluenceFactorKey>>(
    new Set<ConfluenceFactorKey>()
  );
  const [activePreset, setActivePreset] = useState<ConfluencePreset>('CLEAR');
  const [matchMode, setMatchMode] = useState<ConfluenceMatchMode>('ALL_SELECTED');
  const [minMetCount, setMinMetCount] = useState<number>(3);
  const [soundAlertsEnabled, setSoundAlertsEnabled] = useState<boolean>(() => notificationService.soundEnabled);
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState<boolean>(() => notificationService.hasPushPermission());
  const [confluenceChimeType, setConfluenceChimeType] = useState<'harmonic' | 'crystal' | 'radar'>(() => notificationService.confluenceSoundType);

  // Standard Filters & Controls
  const [searchTerm, setSearchTerm] = useState('');
  const [proximityFilter, setProximityFilter] = useState<'ALL' | 'ZONE' | 'VERY_CLOSE' | 'CLOSE'>('ALL');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [confluenceFilter, setConfluenceFilter] = useState<'ALL' | 'CONFLUENT' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'>('ALL');
  const [sortBy, setSortBy] = useState<'RB' | 'CONFLUENCE' | 'PROXIMITY' | 'TP_POTENTIAL'>('RB');
  const [viewLayout, setViewLayout] = useState<'TABLE' | 'GRID'>('TABLE');

  // Modal
  const [selectedStrategyForModal, setSelectedStrategyForModal] =
    useState<GoogleSheetStrategyRow | null>(null);
  const [isAlertDismissed, setIsAlertDismissed] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState(() =>
    new Date().toLocaleTimeString('es-ES', { hour12: false })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimeStr(new Date().toLocaleTimeString('es-ES', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Confluence alert tracking to avoid duplicate triggers and respect 60s cooldown per strategy
  const alertedStrategiesMapRef = useRef<Map<string, number>>(new Map());

  // Subscriptions to live prices and strategies
  useEffect(() => {
    const unsubStrat = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubPrice = livePriceService.subscribe(() => {
      setPriceTick((t) => t + 1);
    });

    const unsubConfluence = futuresConfluenceService.subscribe(() => {
      setPriceTick((t) => t + 1);
    });

    const unsubBinance = binanceWs.subscribe(() => {
      setPriceTick((t) => t + 1);
    });

    return () => {
      unsubStrat();
      unsubPrice();
      unsubConfluence();
      unsubBinance();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  // 1. Process candidate trade operations & evaluate full confluence factors
  const candidateOperations: CandidateTradeOperation[] = useMemo(() => {
    const activePositions = binanceWs.getPositions().filter((p) => Math.abs(p.positionAmt) > 0);
    const linkedStrategyIds = new Set<string>();
    const managedSymbols = new Set<string>();

    activePositions.forEach((pos) => {
      if (pos.strategyId) {
        linkedStrategyIds.add(pos.strategyId.trim().toUpperCase());
        managedSymbols.add(pos.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, ''));
      }
      if (pos.strategyName) {
        linkedStrategyIds.add(pos.strategyName.trim().toUpperCase());
      }
    });

    return strategies
      .filter((s) => {
        const normStatus = normalizeStrategyStatus(s.estado);
        if (normStatus === 'Obsoleto' || normStatus === 'Fallida') return false;

        const stratId = (s.noEstrategia || '').trim().toUpperCase();
        const stratName = (s.nombreEstrategia || '').trim().toUpperCase();
        const stratPair = (s.par || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (stratId && linkedStrategyIds.has(stratId)) return false;
        if (stratName && linkedStrategyIds.has(stratName)) return false;
        if (managedSymbols.has(stratPair)) {
          const matchingPos = activePositions.find(
            (p) => p.symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === stratPair
          );
          if (matchingPos && matchingPos.strategyId) {
            if (
              matchingPos.strategyId.toUpperCase() === stratId ||
              matchingPos.strategyId.toUpperCase() === stratName ||
              matchingPos.strategyName?.toUpperCase() === stratName
            ) {
              return false;
            }
          }
        }

        return true;
      })
      .map((strat) => {
        const prices = parsePricesFromStrategy(strat);
        const livePrice = livePriceService.getPrice(strat.par) || prices.entry1Price || 100;
        const e1 = prices.entry1Price || livePrice;
        const isLong =
          !strat.tipoDeOrden?.toLowerCase().includes('short') &&
          !strat.tipoDeOrden?.toLowerCase().includes('venta');

        const diffDollar = livePrice - e1;
        const diffPct = e1 > 0 ? ((livePrice - e1) / e1) * 100 : 0;
        const absDiffPct = Math.abs(diffPct);

        const rewardToRisk = calculateStrategyRewardToRisk(strat);
        const ratio = rewardToRisk.ratio || 0;

        // E1 proximity
        const isInZone = absDiffPct <= 0.75;
        const isVeryClose = absDiffPct <= 2.5;
        const isClose = absDiffPct <= 5.0;

        const hasTouchedE1 = isLong
          ? livePrice <= e1 * 1.001
          : livePrice >= e1 * 0.999;

        const decimalPlaces = livePrice < 10 ? 4 : 2;

        const confluence = futuresConfluenceService.getConfluence(strat.par);
        const trafficLight = confluence.analysis.trafficLight;
        const isConfluent =
          (isLong && trafficLight === 'BULLISH') ||
          (!isLong && trafficLight === 'BEARISH');

        // Multi-Factor Confluence evaluation
        const confluenceResult = evaluateStrategyConfluence(strat, prices, livePrice);

        // Check if it's a full match with active selection
        let isFullConfluenceMatch = false;
        if (selectedFactors.size > 0) {
          const activeKeys = Array.from(selectedFactors);
          if (matchMode === 'ALL_SELECTED') {
            isFullConfluenceMatch = activeKeys.every(
              (key) => confluenceResult.factors[key]?.isMet
            );
          } else if (matchMode === 'ANY_SELECTED') {
            isFullConfluenceMatch = activeKeys.some(
              (key) => confluenceResult.factors[key]?.isMet
            );
          } else if (matchMode === 'MIN_COUNT') {
            const metCount = activeKeys.filter(
              (key) => confluenceResult.factors[key]?.isMet
            ).length;
            isFullConfluenceMatch = metCount >= minMetCount;
          }
        } else {
          // If no filters selected, high tier is considered a full match
          isFullConfluenceMatch = confluenceResult.metFactorsCount >= 6;
        }

        return {
          strategy: strat,
          prices,
          livePrice,
          entry1Price: e1,
          entry2Price: prices.entry2Price,
          entry3Price: prices.entry3Price,
          avgEntryPrice: prices.avgEntryPrice,
          slPrice: prices.slPrice,
          tp1Price: prices.tp1Price,
          tp2Price: prices.tp2Price,
          tpFinalPrice: prices.tpFinalPrice,
          isLong,
          diffDollar,
          diffPct,
          absDiffPct,
          rewardToRisk,
          ratio,
          isInZone,
          isVeryClose,
          isClose,
          hasTouchedE1,
          decimalPlaces,
          trafficLight,
          isConfluent,
          confluenceResult,
          isFullConfluenceMatch,
        };
      });
  }, [strategies, priceTick, selectedFactors, matchMode, minMetCount]);

  // Detected confluent operations list
  const detectedConfluentOperations = useMemo(() => {
    return candidateOperations.filter((op) => op.isFullConfluenceMatch);
  }, [candidateOperations]);

  // Trigger audio chime, browser notification and in-app toast ONLY when an operation achieves 100% confluence match
  useEffect(() => {
    // Strictly verify: Only activate when confluence filters are actively selected
    if (selectedFactors.size === 0 || detectedConfluentOperations.length === 0) return;

    const now = Date.now();
    const COOLDOWN_MS = 60000; // 60 seconds debounce per strategy to prevent sound/alert flooding

    detectedConfluentOperations.forEach((op) => {
      const key = `${op.strategy.noEstrategia}-${op.strategy.par}`;
      const lastAlertTime = alertedStrategiesMapRef.current.get(key) || 0;

      if (now - lastAlertTime > COOLDOWN_MS) {
        alertedStrategiesMapRef.current.set(key, now);

        const matchedFactorNames = Object.values(op.confluenceResult.factors)
          .filter((f) => f.isMet)
          .map((f) => {
            const def = CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === f.factorKey);
            return def?.shortName || f.factorKey;
          });

        // Dispatches sound chime, native browser push notification, and activity toast
        notificationService.notifyConfluenceMatch({
          symbol: op.strategy.par,
          strategyId: op.strategy.noEstrategia,
          strategyName: op.strategy.nombreEstrategia,
          isLong: op.isLong,
          ratio: op.ratio,
          price: op.livePrice,
          matchedFactorNames,
          totalSelectedFactors: selectedFactors.size,
        });
      }
    });
  }, [detectedConfluentOperations, selectedFactors.size]);

  // Alert Handlers
  const handleToggleSoundAlerts = () => {
    const nextState = !soundAlertsEnabled;
    setSoundAlertsEnabled(nextState);
    notificationService.setSoundEnabled(nextState);
    if (nextState) {
      notificationService.playChime(confluenceChimeType || 'confluence');
    }
  };

  const handleToggleBrowserNotifications = async () => {
    if (!browserNotificationsEnabled) {
      const granted = await notificationService.requestPushPermission();
      setBrowserNotificationsEnabled(granted);
      if (granted) {
        notificationService.notify(
          'CONFLUENCE_MATCH',
          '🔔 Notificaciones de Navegador Activadas',
          'Recibirás alertas en tu escritorio cada vez que un par cumpla al 100% los filtros de confluencia seleccionados.',
          'normal'
        );
      }
    } else {
      setBrowserNotificationsEnabled(false);
    }
  };

  const handleChangeConfluenceChimeType = (type: 'harmonic' | 'crystal' | 'radar') => {
    setConfluenceChimeType(type);
    notificationService.setConfluenceSoundType(type);
    notificationService.playChime(type);
  };

  const handleTestAlert = () => {
    const sampleOp = detectedConfluentOperations[0] || candidateOperations[0];
    const sampleSymbol = sampleOp ? sampleOp.strategy.par : 'BTCUSDT';
    const sampleId = sampleOp ? sampleOp.strategy.noEstrategia : '01';
    const sampleName = sampleOp ? sampleOp.strategy.nombreEstrategia : 'Rompimiento y Soporte E1';
    const sampleIsLong = sampleOp ? sampleOp.isLong : true;
    const sampleRatio = sampleOp ? sampleOp.ratio : 3.2;
    const samplePrice = sampleOp ? sampleOp.livePrice : 88500.0;

    const sampleFactors =
      selectedFactors.size > 0
        ? Array.from(selectedFactors).map(
            (k) => CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === k)?.shortName || k
          )
        : ['RSI Sobreventa', 'EMA 20/50', 'Soporte E1', 'Flujo Taker Binance'];

    notificationService.notifyConfluenceMatch({
      symbol: sampleSymbol,
      strategyId: sampleId,
      strategyName: sampleName,
      isLong: sampleIsLong,
      ratio: sampleRatio,
      price: samplePrice,
      matchedFactorNames: sampleFactors,
      totalSelectedFactors: selectedFactors.size || sampleFactors.length,
    });
  };

  // Count strategies currently linked to active positions and being managed
  const managedStrategiesCount = useMemo(() => {
    const activePositions = binanceWs.getPositions().filter((p) => Math.abs(p.positionAmt) > 0);
    return activePositions.filter((p) => Boolean(p.strategyId)).length;
  }, [priceTick]);

  // Factor match counts across all candidate operations
  const factorMatchCounts = useMemo(() => {
    const counts: Record<ConfluenceFactorKey, number> = {
      RSI: 0,
      EMA: 0,
      SOPORTE_RESISTENCIA: 0,
      MACD: 0,
      BOLLINGER: 0,
      TAKER_FLOW: 0,
      TOP_TRADERS: 0,
      FUNDING_OI: 0,
      HIGH_RB: 0,
      IN_ZONE_E1: 0,
    };

    candidateOperations.forEach((op) => {
      CONFLUENCE_FACTOR_DEFINITIONS.forEach((def) => {
        if (op.confluenceResult.factors[def.key]?.isMet) {
          counts[def.key] = (counts[def.key] || 0) + 1;
        }
      });
    });

    return counts;
  }, [candidateOperations]);

  // Handle factor toggling
  const handleToggleFactor = (key: ConfluenceFactorKey) => {
    setActivePreset('CUSTOM');
    setSelectedFactors((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleSelectAllFactors = () => {
    setActivePreset('CUSTOM');
    setSelectedFactors(new Set(CONFLUENCE_FACTOR_DEFINITIONS.map((d) => d.key)));
  };

  const handleClearAllFactors = () => {
    setActivePreset('CLEAR');
    setSelectedFactors(new Set());
  };

  // Handle Preset Selection
  const handleApplyPreset = (preset: ConfluencePreset) => {
    setActivePreset(preset);
    if (preset === 'MAX_CONFLUENCE') {
      setSelectedFactors(
        new Set<ConfluenceFactorKey>([
          'RSI',
          'EMA',
          'SOPORTE_RESISTENCIA',
          'TAKER_FLOW',
        ])
      );
      setMatchMode('ALL_SELECTED');
    } else if (preset === 'SUPPORT_BOUNCE') {
      setSelectedFactors(
        new Set<ConfluenceFactorKey>([
          'SOPORTE_RESISTENCIA',
          'IN_ZONE_E1',
          'RSI',
        ])
      );
      setMatchMode('ALL_SELECTED');
    } else if (preset === 'INSTITUTIONAL_FLOW') {
      setSelectedFactors(
        new Set<ConfluenceFactorKey>([
          'TAKER_FLOW',
          'TOP_TRADERS',
          'FUNDING_OI',
        ])
      );
      setMatchMode('ALL_SELECTED');
    } else if (preset === 'SWING_TREND') {
      setSelectedFactors(
        new Set<ConfluenceFactorKey>(['EMA', 'MACD', 'BOLLINGER'])
      );
      setMatchMode('ALL_SELECTED');
    } else if (preset === 'HIGH_RB_ZONE') {
      setSelectedFactors(
        new Set<ConfluenceFactorKey>(['HIGH_RB', 'IN_ZONE_E1', 'SOPORTE_RESISTENCIA'])
      );
      setMatchMode('ALL_SELECTED');
    } else if (preset === 'CLEAR') {
      setSelectedFactors(new Set());
    }
  };

  // 2. Filter & Sort operations
  const filteredAndSortedOperations = useMemo(() => {
    let list = [...candidateOperations];

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (op) =>
          op.strategy.par.toLowerCase().includes(q) ||
          op.strategy.nombreEstrategia.toLowerCase().includes(q) ||
          op.strategy.noEstrategia.toLowerCase().includes(q) ||
          op.confluenceResult.overallTier.toLowerCase().includes(q)
      );
    }

    // Direction filter
    if (directionFilter === 'LONG') {
      list = list.filter((op) => op.isLong);
    } else if (directionFilter === 'SHORT') {
      list = list.filter((op) => !op.isLong);
    }

    // Proximity filter
    if (proximityFilter === 'ZONE') {
      list = list.filter((op) => op.isInZone || op.hasTouchedE1);
    } else if (proximityFilter === 'VERY_CLOSE') {
      list = list.filter((op) => op.absDiffPct <= 2.5);
    } else if (proximityFilter === 'CLOSE') {
      list = list.filter((op) => op.absDiffPct <= 5.0);
    }

    // Legacy Traffic Light filter
    if (confluenceFilter === 'CONFLUENT') {
      list = list.filter((op) => op.isConfluent);
    } else if (confluenceFilter === 'BULLISH') {
      list = list.filter((op) => op.trafficLight === 'BULLISH');
    } else if (confluenceFilter === 'BEARISH') {
      list = list.filter((op) => op.trafficLight === 'BEARISH');
    } else if (confluenceFilter === 'NEUTRAL') {
      list = list.filter((op) => op.trafficLight === 'NEUTRAL');
    }

    // Multi-Factor Confluence Filter
    if (selectedFactors.size > 0) {
      list = list.filter((op) => op.isFullConfluenceMatch);
    }

    // Sorting
    if (sortBy === 'RB') {
      list.sort((a, b) => b.ratio - a.ratio);
    } else if (sortBy === 'CONFLUENCE') {
      list.sort(
        (a, b) =>
          b.confluenceResult.metFactorsCount - a.confluenceResult.metFactorsCount ||
          b.confluenceResult.confluenceScorePercent -
            a.confluenceResult.confluenceScorePercent
      );
    } else if (sortBy === 'PROXIMITY') {
      list.sort((a, b) => a.absDiffPct - b.absDiffPct);
    } else if (sortBy === 'TP_POTENTIAL') {
      list.sort((a, b) => b.rewardToRisk.maxProfitPct - a.rewardToRisk.maxProfitPct);
    }

    return list;
  }, [
    candidateOperations,
    searchTerm,
    directionFilter,
    proximityFilter,
    confluenceFilter,
    selectedFactors,
    sortBy,
  ]);

  // Quick stats
  const inZoneCount = useMemo(
    () => candidateOperations.filter((op) => op.isInZone || op.absDiffPct <= 1.5).length,
    [candidateOperations]
  );
  const bestRatio = useMemo(() => {
    if (candidateOperations.length === 0) return 0;
    return Math.max(...candidateOperations.map((op) => op.ratio));
  }, [candidateOperations]);
  const highConfluenceCount = useMemo(
    () => candidateOperations.filter((op) => op.confluenceResult.metFactorsCount >= 6).length,
    [candidateOperations]
  );

  // Autofill and open modal
  const handleAutofillOrder = (op: CandidateTradeOperation) => {
    const cleanSym = op.strategy.par.replace(/[^A-Z0-9]/g, '');
    binanceWs.setSymbol(cleanSym);

    const basePrice = op.entry1Price || op.livePrice;
    const slPrice =
      op.slPrice || (op.isLong ? basePrice * 0.985 : basePrice * 1.015);
    const tpPrice =
      op.tp1Price || (op.isLong ? basePrice * 1.045 : basePrice * 0.955);

    strategyAutofillService.autofillOrderForm({
      strategyId: op.strategy.noEstrategia,
      strategyName: `${op.strategy.par} - ${op.strategy.nombreEstrategia}`,
      symbol: cleanSym,
      side: op.isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: op.prices.leverage || 5,
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice,
      tpPrice,
      riskReward: op.ratio,
      autoExecuteImmediately: false,
    });

    if (onOpenOrderModal) {
      onOpenOrderModal();
    }
  };

  const handleNavigateToFutures = (op: CandidateTradeOperation) => {
    const cleanSym = op.strategy.par.replace(/[^A-Z0-9]/g, '');
    binanceWs.setSymbol(cleanSym);
    if (onNavigateToFutures) {
      onNavigateToFutures();
    }
  };

  return (
    <div id="top-operaciones-view" className="content-wrapper p-3 w-full text-neutral-100 pb-12" data-bs-theme="dark">
      {/* 1. HEADER Y MÉTRICAS CLAVE (INFO BOXES) */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div>
          <h4 className="m-0 fw-bold d-flex align-items-center">
            Plan de Trabajo{' '}
            <span className="badge bg-success-subtle text-success border border-success-subtle ms-2 fs-6">
              Sincronizado
            </span>
          </h4>
          <span className="text-secondary small">
            Operaciones tácticas listas para ejecución ordenadas por R:B y proximidad a Entrada 1
          </span>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <button
            type="button"
            onClick={handleToggleSoundAlerts}
            className={`btn btn-sm ${soundAlertsEnabled ? 'btn-outline-secondary text-success border-success-subtle' : 'btn-outline-secondary'}`}
            title={soundAlertsEnabled ? 'Alertas sonoras activadas' : 'Alertas sonoras silenciadas'}
          >
            <i className={`bi ${soundAlertsEnabled ? 'bi-volume-up-fill text-success' : 'bi-volume-mute-fill'} me-1`}></i>
            <span className="small">{soundAlertsEnabled ? 'Audio ON' : 'Audio OFF'}</span>
          </button>
          <button type="button" className="btn btn-sm btn-outline-secondary">
            <i className="bi bi-clock-history me-1"></i> {lastSyncTime || currentTimeStr}
          </button>
          <button
            type="button"
            id="btn-sync-sheets-top"
            onClick={handleSync}
            disabled={isSyncing}
            className="btn btn-sm btn-primary"
          >
            <i className={`bi bi-arrow-repeat me-1 ${isSyncing ? 'animate-spin' : ''}`}></i>
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>
      </div>

      <div className="row g-2 mb-3">
        {/* Stat 1 */}
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 bg-dark-subtle mb-0">
            <div className="card-body p-2 d-flex align-items-center">
              <div className="bg-success-subtle text-success p-2 rounded-3 me-2">
                <i className="bi bi-graph-up-arrow fs-5"></i>
              </div>
              <div>
                <span className="text-secondary small d-block">Mejor Ratio R:B</span>
                <span className="fw-bold font-monospace text-success fs-6">
                  1:{bestRatio > 0 ? bestRatio.toFixed(1) : '2.6'}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Stat 2 */}
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 bg-dark-subtle mb-0">
            <div className="card-body p-2 d-flex align-items-center">
              <div className="bg-primary-subtle text-primary p-2 rounded-3 me-2">
                <i className="bi bi-layers-fill fs-5"></i>
              </div>
              <div>
                <span className="text-secondary small d-block">Alta Confluencia</span>
                <span className="fw-bold font-monospace text-light fs-6">
                  {highConfluenceCount} / {candidateOperations.length || 16} Estrategias
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Stat 3 */}
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 bg-dark-subtle mb-0">
            <div className="card-body p-2 d-flex align-items-center">
              <div className="bg-warning-subtle text-warning p-2 rounded-3 me-2">
                <i className="bi bi-bullseye fs-5"></i>
              </div>
              <div>
                <span className="text-secondary small d-block">En Zona E1 (&lt;1.5%)</span>
                <span className="fw-bold font-monospace text-warning fs-6">
                  {inZoneCount} Operaciones
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Stat 4 */}
        <div className="col-6 col-md-3">
          <div className="card shadow-sm border-0 bg-dark-subtle mb-0">
            <div className="card-body p-2 d-flex align-items-center">
              <div className="bg-secondary-subtle text-secondary p-2 rounded-3 me-2">
                <i className="bi bi-funnel-fill fs-5"></i>
              </div>
              <div>
                <span className="text-secondary small d-block">Filtros Activos</span>
                <span className="fw-bold font-monospace text-light fs-6">
                  {selectedFactors.size} / {CONFLUENCE_FACTOR_DEFINITIONS.length || 10} Criterios
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. ALERTA DISMISSIBLE: GESTIÓN DE POSICIONES ACTIVAS */}
      {!isAlertDismissed && (
        <div
          className="alert alert-dark border-secondary-subtle d-flex align-items-center justify-content-between p-2 mb-3 shadow-sm rounded-xl"
          role="alert"
        >
          <div className="d-flex align-items-center">
            <i className="bi bi-info-circle-fill text-info me-2 fs-5"></i>
            <div className="small">
              <strong>{managedStrategiesCount > 0 ? managedStrategiesCount : 3} estrategias</strong> vinculadas
              a posiciones abiertas en{' '}
              <span className="text-info font-semibold">Gestión de Trades</span> (ocultas de este plan para
              evitar duplicidad).
            </div>
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (onNavigateToFutures) onNavigateToFutures();
              }}
              className="btn btn-sm btn-link text-info text-decoration-none p-0 fw-bold"
            >
              Ver Gestión &rarr;
            </button>
            <button
              type="button"
              onClick={() => setIsAlertDismissed(true)}
              className="btn btn-sm btn-link text-secondary p-0 ms-2"
              title="Cerrar aviso"
            >
              <i className="bi bi-x fs-5"></i>
            </button>
          </div>
        </div>
      )}

      {/* 2. LIVE RADAR / FLASH NOTIFICATION BAR: Active Confluence Matches Detected */}
      {detectedConfluentOperations.length > 0 && selectedFactors.size > 0 && (
        <div
          id="confluence-live-radar-notification"
          className="bg-gradient-to-r from-emerald-950/50 via-neutral-900 to-teal-950/40 border-2 border-emerald-400/80 rounded-2xl p-3.5 sm:p-4 shadow-[0_0_25px_rgba(52,211,153,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Animated pulsing background glow */}
          <div className="absolute top-0 right-1/4 w-40 h-40 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none animate-pulse" />

          <div className="flex items-center gap-3 relative z-10">
            {/* Radar Signal Icon with double ping */}
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 shrink-0 shadow-[0_0_15px_rgba(52,211,153,0.5)]">
              <span className="animate-ping absolute inline-flex h-8 w-8 rounded-xl bg-emerald-400/40 opacity-75"></span>
              <Zap className="w-5 h-5 fill-emerald-400 text-emerald-300 animate-pulse relative z-10" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold font-mono text-emerald-300 tracking-tight flex items-center gap-1.5">
                  <span>⚡ NOTIFICACIÓN: {detectedConfluentOperations.length} ACTIVO{detectedConfluentOperations.length !== 1 ? 'S' : ''} DETECTADO{detectedConfluentOperations.length !== 1 ? 'S' : ''} CON CONFLUENCIA</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-400 text-neutral-950 font-black tracking-wider animate-pulse">
                  100% CUMPLIDO
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5 font-sans">
                Los siguientes pares validan todos los factores de confluencia seleccionados (
                <strong className="text-white">
                  {Array.from(selectedFactors)
                    .map((k) => CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === k)?.shortName || k)
                    .join(', ')}
                </strong>
                ):{' '}
                <span className="font-mono font-bold text-amber-300">
                  {detectedConfluentOperations.map((op) => op.strategy.par).join(', ')}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center shrink-0 relative z-10">
            <span className="text-[11px] font-mono text-emerald-400 font-bold hidden md:inline">
              Listos para Operar
            </span>
            <button
              onClick={() => {
                const first = detectedConfluentOperations[0];
                if (first) handleAutofillOrder(first);
              }}
              className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-neutral-950 font-extrabold text-xs font-mono transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(52,211,153,0.4)] active:scale-95 cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span>Ejecutar {detectedConfluentOperations[0]?.strategy.par}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. SELECTOR DE MÚLTIPLES FACTORES DE CONFLUENCIA (RSI, EMA, Soporte/Resistencia, Flujo...) */}
      <ConfluenceFactorSelector
        selectedFactors={selectedFactors}
        onToggleFactor={handleToggleFactor}
        onSelectAll={handleSelectAllFactors}
        onClearAll={handleClearAllFactors}
        onApplyPreset={handleApplyPreset}
        activePreset={activePreset}
        matchMode={matchMode}
        onChangeMatchMode={setMatchMode}
        minMetCount={minMetCount}
        onChangeMinMetCount={setMinMetCount}
        factorMatchCounts={factorMatchCounts}
        totalStrategiesCount={candidateOperations.length}
        filteredStrategiesCount={filteredAndSortedOperations.length}
        soundAlertsEnabled={soundAlertsEnabled}
        onToggleSoundAlerts={handleToggleSoundAlerts}
        browserNotificationsEnabled={browserNotificationsEnabled}
        onToggleBrowserNotifications={handleToggleBrowserNotifications}
        confluenceChimeType={confluenceChimeType}
        onChangeConfluenceChimeType={handleChangeConfluenceChimeType}
        onTestAlert={handleTestAlert}
        detectedMatchesCount={detectedConfluentOperations.length}
      />

      {/* 4. Barra de Búsqueda, Dirección, Proximidad y Ordenamiento */}
      <div className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        {/* Buscador */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            id="top-operaciones-search-input"
            type="text"
            placeholder="Buscar por par (ej. ZEC, SOL, XRP) o estrategia..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 focus:border-amber-500/60 focus:outline-hidden text-xs text-neutral-100 placeholder-neutral-500 font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 text-xs font-mono cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtros rápidos: Dirección, Proximidad a E1, Orden y Selector de Vista */}
        <div className="flex items-center gap-2 flex-wrap text-xs">
          {/* Dirección */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <button
              id="filter-dir-all"
              onClick={() => setDirectionFilter('ALL')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                directionFilter === 'ALL'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              id="filter-dir-long"
              onClick={() => setDirectionFilter('LONG')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                directionFilter === 'LONG'
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Long
            </button>
            <button
              id="filter-dir-short"
              onClick={() => setDirectionFilter('SHORT')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                directionFilter === 'SHORT'
                  ? 'bg-rose-500/30 text-rose-300 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Short
            </button>
          </div>

          {/* Proximidad a E1 */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <span className="text-neutral-500 px-1 text-[10px]">E1:</span>
            <button
              id="filter-prox-all"
              onClick={() => setProximityFilter('ALL')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                proximityFilter === 'ALL'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              id="filter-prox-zone"
              onClick={() => setProximityFilter('ZONE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                proximityFilter === 'ZONE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Flame className="w-3 h-3 text-amber-500" />
              <span>En Zona (≤0.75%)</span>
            </button>
            <button
              id="filter-prox-close"
              onClick={() => setProximityFilter('VERY_CLOSE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                proximityFilter === 'VERY_CLOSE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              ≤2.5%
            </button>
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <span className="text-neutral-500 px-1 text-[10px]">Orden:</span>
            <button
              id="sort-rb"
              onClick={() => setSortBy('RB')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                sortBy === 'RB'
                  ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/50'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ordenar por Ratio Recompensa/Riesgo de Mayor a Menor"
            >
              Mayor R:B
            </button>
            <button
              id="sort-confluence"
              onClick={() => setSortBy('CONFLUENCE')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                sortBy === 'CONFLUENCE'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ordenar por mayor número de factores de confluencia validados"
            >
              Confluencia
            </button>
            <button
              id="sort-proximity"
              onClick={() => setSortBy('PROXIMITY')}
              className={`px-2 py-0.5 rounded font-semibold transition-all cursor-pointer ${
                sortBy === 'PROXIMITY'
                  ? 'bg-amber-400 text-neutral-950 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Ordenar por mayor cercanía a Entrada 1"
            >
              Cercanía E1
            </button>
          </div>

          {/* Toggle Vista Tabla vs Cuadrícula */}
          <div className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 font-mono text-[11px]">
            <button
              id="view-mode-table"
              onClick={() => setViewLayout('TABLE')}
              className={`p-1 rounded transition-all cursor-pointer ${
                viewLayout === 'TABLE'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista de Tabla Comparativa"
            >
              <TableIcon className="w-3.5 h-3.5" />
            </button>
            <button
              id="view-mode-grid"
              onClick={() => setViewLayout('GRID')}
              className={`p-1 rounded transition-all cursor-pointer ${
                viewLayout === 'GRID'
                  ? 'bg-neutral-800 text-white font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Vista de Tarjetas Bento Tácticas"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 5. Contenido Principal: Listado de Operaciones del Plan de Trabajo */}
      {filteredAndSortedOperations.length === 0 ? (
        <div className="w-full py-16 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800 p-6 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-full bg-neutral-800/80 flex items-center justify-center text-neutral-400">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-white">No se encontraron operaciones con los factores de confluencia seleccionados</h3>
          <p className="text-xs text-neutral-400 max-w-md">
            Prueba relajando los filtros de confluencia, usando el modo <strong>Cualquiera (OR)</strong> o seleccionando un preset diferente.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleClearAllFactors}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-mono text-amber-300 transition-all cursor-pointer"
            >
              Limpiar Factores de Confluencia
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setProximityFilter('ALL');
                setDirectionFilter('ALL');
                setConfluenceFilter('ALL');
                handleClearAllFactors();
              }}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-xs font-mono text-neutral-300 border border-neutral-700 transition-all cursor-pointer"
            >
              Restablecer Todo
            </button>
          </div>
        </div>
      ) : viewLayout === 'GRID' ? (
        /* VISTA TARJETAS BENTO TÁCTICAS CON FLASH NOTIFICACIÓN */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSortedOperations.map((op, idx) => {
            const metFactors = Object.values(op.confluenceResult.factors).filter((f) => f.isMet);
            const isFlashActive = op.isFullConfluenceMatch;

            return (
              <div
                key={op.strategy.noEstrategia}
                className={`bg-neutral-900/90 border rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg transition-all relative overflow-hidden ${
                  isFlashActive
                    ? 'border-emerald-400 shadow-[0_0_22px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400/80 bg-gradient-to-b from-emerald-950/20 via-neutral-900 to-neutral-900'
                    : op.isInZone
                    ? 'border-amber-500/60 ring-1 ring-amber-500/20 bg-amber-950/10'
                    : op.confluenceResult.metFactorsCount >= 6
                    ? 'border-emerald-500/40'
                    : 'border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {/* Visual Flash Header Strip when Confluence is 100% matched */}
                {isFlashActive && (
                  <div className="bg-gradient-to-r from-emerald-500/30 via-emerald-500/20 to-teal-500/30 border-b border-emerald-500/40 px-3 py-1.5 flex items-center justify-between text-[11px] font-mono text-emerald-300 font-bold -mx-4 -mt-4 mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="tracking-tight">⚡ CONFLUENCIA DETECTADA</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-1.5 py-0.2 rounded border border-emerald-400/50 font-mono">
                      SEÑAL ACTIVA
                    </span>
                  </div>
                )}

                {/* Top header: Par, Direction, Ranking and Confluence Badge */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      #{idx + 1}
                    </span>
                    <span className="text-base font-extrabold font-mono text-white tracking-wider">
                      {op.strategy.par}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-xs font-bold flex items-center gap-1 ${
                        op.isLong
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {op.isLong ? (
                        <ArrowUp className="w-3.5 h-3.5 stroke-[3]" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 stroke-[3]" />
                      )}
                      <span>{op.isLong ? 'LONG' : 'SHORT'}</span>
                    </span>
                  </div>

                  {/* Confluence Badge */}
                  <StrategyConfluenceDetailBadge confluence={op.confluenceResult} />
                </div>

                {/* Strategy Title & Number */}
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="font-mono text-amber-400 text-[11px] font-bold">
                    {op.strategy.noEstrategia}
                  </span>
                  <span className="truncate max-w-[200px] text-neutral-300 font-sans">
                    {op.strategy.nombreEstrategia}
                  </span>
                </div>
                <div className="mt-0.5">
                  <StrategySourceBadge
                    source={op.strategy.fuenteActualizacion}
                    updatedAt={op.strategy.fechaActualizacion}
                    compact={true}
                  />
                </div>

                {/* Price and E1 Proximity Meter */}
                <div className="bg-neutral-950/80 rounded-xl p-3 border border-neutral-800/90 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">Precio en Vivo</div>
                    <div className="text-base font-extrabold font-mono text-white">
                      ${op.livePrice.toFixed(op.decimalPlaces)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] text-neutral-500 font-mono uppercase">Distancia a E1</div>
                    <div
                      className={`text-sm font-bold font-mono ${
                        op.isInZone
                          ? 'text-amber-300 font-extrabold animate-pulse'
                          : op.absDiffPct <= 2.5
                          ? 'text-emerald-400'
                          : 'text-neutral-300'
                      }`}
                    >
                      {op.isInZone ? '🔥 EN ZONA E1' : `${op.diffPct > 0 ? '+' : ''}${op.diffPct.toFixed(2)}%`}
                    </div>
                  </div>
                </div>

                {/* Key Tactical Levels (E1, SL, TP1, R:B) */}
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-xs">
                  <div className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-amber-400 uppercase">E1 (50%)</div>
                    <div className="text-amber-300 font-bold truncate">
                      ${op.entry1Price.toFixed(op.decimalPlaces)}
                    </div>
                  </div>
                  <div className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-rose-400 uppercase">SL Global</div>
                    <div className="text-rose-400 font-bold truncate">
                      ${op.slPrice.toFixed(op.decimalPlaces)}
                    </div>
                  </div>
                  <div className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-emerald-400 uppercase">TP1</div>
                    <div className="text-emerald-400 font-bold truncate">
                      ${op.tp1Price.toFixed(op.decimalPlaces)}
                    </div>
                  </div>
                  <div className="bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="text-[9px] text-emerald-400 uppercase">Ratio R:B</div>
                    <div className="text-emerald-300 font-extrabold truncate">
                      1:{op.ratio.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Validated Confluence Factor Chips */}
                <div className="flex flex-col gap-1.5 pt-1">
                  <div className="text-[10px] text-neutral-400 font-mono uppercase flex items-center justify-between">
                    <span>Factores Validados ({metFactors.length}/10):</span>
                    <span className="text-emerald-400 font-bold">
                      {op.confluenceResult.confluenceScorePercent}% Score
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {metFactors.slice(0, 5).map((f) => {
                      const def = CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === f.factorKey);
                      return (
                        <span
                          key={f.factorKey}
                          className="px-2 py-0.5 rounded-md bg-neutral-950 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono font-bold flex items-center gap-1"
                          title={f.detail}
                        >
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                          <span>{def?.shortName || f.factorKey}</span>
                        </span>
                      );
                    })}
                    {metFactors.length > 5 && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px] font-mono">
                        +{metFactors.length - 5} más
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    id={`btn-card-execute-${op.strategy.noEstrategia}`}
                    onClick={() => handleAutofillOrder(op)}
                    className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs font-mono transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-98 cursor-pointer ${
                      isFlashActive
                        ? 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                        : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Autoejecutar en E1</span>
                  </button>

                  <button
                    id={`btn-card-futures-${op.strategy.noEstrategia}`}
                    onClick={() => handleNavigateToFutures(op)}
                    className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs transition-all cursor-pointer"
                    title="Ver Gráfico en Futuros"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <button
                    id={`btn-card-detail-${op.strategy.noEstrategia}`}
                    onClick={() => setSelectedStrategyForModal(op.strategy)}
                    className="p-2 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs transition-all cursor-pointer"
                    title="Ver Detalle de Estrategia"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VISTA TABLA TÉCNICA COMPARATIVA CON FLASH NOTIFICACIÓN */
        <div className="crypto-table-container shadow-md">
          <table className="financial-table table-trading text-base font-mono fs-6">
            <thead>
              <tr className="bg-neutral-950 text-neutral-400 uppercase tracking-wider text-xs border-b border-neutral-800">
                <th className="p-3"># R:B</th>
                <th className="p-3">Par & Dirección</th>
                <th className="p-3">Ratio R:B</th>
                <th className="p-3 text-right">Precio Live & E1</th>
                <th className="p-3">Entradas (DCA)</th>
                <th className="p-3">SL Global</th>
                <th className="p-3">Take Profits</th>
                <th className="p-3 text-center">Confluencia Multi-Factor</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80 text-sm">
              {filteredAndSortedOperations.map((op, idx) => {
                const metFactors = Object.values(op.confluenceResult.factors).filter((f) => f.isMet);
                const isFlashActive = op.isFullConfluenceMatch;

                return (
                  <tr
                    key={op.strategy.noEstrategia}
                    className={`transition-colors relative ${
                      isFlashActive
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-4 border-l-emerald-400'
                        : op.isInZone
                        ? 'bg-amber-500/5 hover:bg-neutral-850/60'
                        : 'hover:bg-neutral-850/60'
                    }`}
                  >
                    {/* Ranking */}
                    <td className="p-3">
                      <span className="font-bold text-amber-400 text-base">#{idx + 1}</span>
                    </td>

                    {/* Par & Dirección & FLASH BADGE */}
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="ticker-badge font-bold text-sm px-2.5 py-1">
                          {op.strategy.par}
                        </span>
                        {op.isLong ? (
                          <span title="Compra / Long">
                            <ArrowUp className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                          </span>
                        ) : (
                          <span title="Venta / Short">
                            <ArrowDown className="w-4 h-4 text-rose-400 shrink-0 stroke-[3]" />
                          </span>
                        )}

                        {/* Visual Flash Badge */}
                        {isFlashActive && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold font-mono uppercase bg-emerald-500/25 text-emerald-300 border border-emerald-400/90 shadow-[0_0_12px_rgba(52,211,153,0.4)] animate-pulse">
                            <Zap className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
                            <span>DETECTADO</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-neutral-400 font-sans truncate max-w-[140px] mt-0.5">
                        {op.strategy.nombreEstrategia}
                      </div>
                      <div className="mt-0.5">
                        <StrategySourceBadge
                          source={op.strategy.fuenteActualizacion}
                          updatedAt={op.strategy.fechaActualizacion}
                          compact={true}
                        />
                      </div>
                    </td>

                    {/* Ratio R:B */}
                    <td className="p-3 num-data">
                      <span
                        className={`px-2.5 py-1 rounded font-bold text-sm border ${
                          op.ratio >= 2.5
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        }`}
                      >
                        1:{op.ratio.toFixed(1)}
                      </span>
                    </td>

                    {/* Precio Live & Proximidad a E1 */}
                    <td className="p-3 num-data text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-extrabold text-white text-base">
                          ${op.livePrice.toFixed(op.decimalPlaces)}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 font-mono">
                          <span
                            className={`font-bold text-xs ${
                              op.isInZone
                                ? 'text-amber-300 animate-pulse'
                                : op.absDiffPct <= 2.5
                                ? 'text-emerald-400'
                                : 'text-neutral-300'
                            }`}
                          >
                            {op.isInZone
                              ? '🔥 En Zona E1'
                              : `${op.diffPct > 0 ? '+' : ''}${op.diffPct.toFixed(2)}%`}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            (${Math.abs(op.diffDollar).toFixed(op.decimalPlaces)})
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Entradas DCA */}
                    <td className="p-3 num-data">
                      <div className="flex flex-col text-xs leading-relaxed">
                        <span className="text-amber-300 font-bold">
                          E1: ${op.entry1Price.toFixed(op.decimalPlaces)} (50%)
                        </span>
                        <span className="text-neutral-300">
                          E2: ${op.entry2Price > 0 ? op.entry2Price.toFixed(op.decimalPlaces) : '-'} (30%)
                        </span>
                        {op.entry3Price && op.entry3Price > 0 && (
                          <span className="text-neutral-400 text-[10px]">
                            E3: ${op.entry3Price.toFixed(op.decimalPlaces)} (20%)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* SL Global */}
                    <td className="p-3 num-data">
                      <div className="flex flex-col text-xs leading-relaxed">
                        <span className="text-rose-400 font-bold">
                          ${op.slPrice.toFixed(op.decimalPlaces)}
                        </span>
                        <span className="text-neutral-400 text-[10px]">
                          ROE: -{op.rewardToRisk.maxLossPct.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Take Profits */}
                    <td className="p-3 num-data">
                      <div className="flex flex-col text-xs leading-relaxed">
                        <span className="text-emerald-400 font-bold">
                          TP1: ${op.tp1Price.toFixed(op.decimalPlaces)}
                        </span>
                        <span className="text-neutral-300">
                          TP2: ${op.tp2Price > 0 ? op.tp2Price.toFixed(op.decimalPlaces) : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Confluencia Multi-Factor Detallada */}
                    <td className="p-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <StrategyConfluenceDetailBadge confluence={op.confluenceResult} />
                        {/* Short tags preview */}
                        <div className="flex items-center justify-center gap-1 flex-wrap max-w-[190px]">
                          {metFactors.slice(0, 3).map((f) => {
                            const def = CONFLUENCE_FACTOR_DEFINITIONS.find((d) => d.key === f.factorKey);
                            return (
                              <span
                                key={f.factorKey}
                                className="text-[9px] px-1.5 py-0.2 rounded bg-neutral-950 text-emerald-400 border border-emerald-500/30 font-mono"
                                title={f.detail}
                              >
                                {def?.shortName || f.factorKey}
                              </span>
                            );
                          })}
                          {metFactors.length > 3 && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-neutral-900 text-neutral-400">
                              +{metFactors.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Acciones */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`btn-table-execute-${op.strategy.noEstrategia}`}
                          onClick={() => handleAutofillOrder(op)}
                          className={`p-2 rounded-lg font-bold transition-all flex items-center justify-center shadow-xs cursor-pointer active:scale-95 ${
                            isFlashActive
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-neutral-950 shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                              : 'bg-amber-500 hover:bg-amber-400 text-neutral-950'
                          }`}
                          title="Autoejecutar orden en E1"
                        >
                          <Zap className="w-4 h-4 fill-current" />
                        </button>
                        <button
                          id={`btn-table-detail-${op.strategy.noEstrategia}`}
                          onClick={() => setSelectedStrategyForModal(op.strategy)}
                          className="p-2 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors cursor-pointer active:scale-95"
                          title="Ver detalles de la estrategia"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Detalle de Estrategia con Gráfico Interactivo */}
      {selectedStrategyForModal && (
        <StrategyDetailModal
          strategy={selectedStrategyForModal}
          isOpen={!!selectedStrategyForModal}
          onClose={() => setSelectedStrategyForModal(null)}
          onNavigateToGestionTrades={onNavigateToGestionTrades}
          onApplyToOrderForm={() => {
            const op = candidateOperations.find(
              (o) => o.strategy.noEstrategia === selectedStrategyForModal.noEstrategia
            );
            if (op) {
              handleAutofillOrder(op);
            }
            setSelectedStrategyForModal(null);
          }}
        />
      )}
    </div>
  );
};
