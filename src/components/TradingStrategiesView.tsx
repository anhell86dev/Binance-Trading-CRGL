import React, { useState, useEffect, useMemo } from 'react';
import { strategyService } from '../services/strategyService';
import { binanceWs } from '../services/binanceWs';
import { livePriceService } from '../services/livePriceService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { TopStrategiesRiskRewardList } from './TopStrategiesRiskRewardList';
import { StrategyDetailModal } from './StrategyDetailModal';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk, normalizeStrategyStatus } from '../utils/sheetParser';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { GoogleDocsManagerModal } from './GoogleDocsManagerModal';

interface TradingStrategiesViewProps {
  onOpenOrderModal?: () => void;
  onNavigateToFutures?: () => void;
  onNavigateToGestionTrades?: (symbol?: string) => void;
}

export const TradingStrategiesView: React.FC<TradingStrategiesViewProps> = ({
  onOpenOrderModal,
  onNavigateToFutures,
  onNavigateToGestionTrades,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [isSyncing, setIsSyncing] = useState<boolean>(() => strategyService.getIsSyncing());
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => strategyService.getLastSyncTime());
  const [selectedStrategy, setSelectedStrategy] = useState<GoogleSheetStrategyRow | null>(null);
  const [isDocsManagerOpen, setIsDocsManagerOpen] = useState(false);
  const [ticker, setTicker] = useState(() => binanceWs.getTicker());
  const [, setPriceTick] = useState(0);

  useEffect(() => {
    const unsub = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
      setIsSyncing(strategyService.getIsSyncing());
      setLastSyncTime(strategyService.getLastSyncTime());
    });

    const unsubWs = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
    });

    const unsubLive = livePriceService.subscribe(() => {
      setPriceTick((prev) => prev + 1);
    });

    return () => {
      unsub();
      unsubWs();
      unsubLive();
    };
  }, []);

  const handleSync = async () => {
    await strategyService.syncFromGoogleSheets();
  };

  const handleSelectStrategyForExecution = (strat: GoogleSheetStrategyRow) => {
    const prices = parsePricesFromStrategy(strat);
    const rr = calculateStrategyRewardToRisk(strat);
    const liveP = livePriceService.getPrice(strat.par);
    const basePrice = prices.entry1Price || liveP || ticker.lastPrice || 789.5;
    const isLong = !strat.tipoDeOrden?.toLowerCase().includes('short') && !strat.tipoDeOrden?.toLowerCase().includes('venta');

    // Transfer safely to Futures Order Form with max 5x leverage & isolated margin, and trigger popup
    strategyAutofillService.autofillOrderForm({
      strategyId: strat.noEstrategia,
      strategyName: `${strat.par} - ${strat.nombreEstrategia}`,
      symbol: strat.par.replace(/[^A-Z0-9]/g, ''),
      side: isLong ? 'BUY' : 'SELL',
      orderType: 'LIMIT',
      price: basePrice,
      quantity: 0.1,
      leverage: 2, // Safe default 2x
      marginType: 'ISOLATED',
      slPercent: 1.5,
      tpPercent: 4.5,
      slPrice: prices.slPrice || (isLong ? basePrice * 0.985 : basePrice * 1.015),
      tpPrice: prices.tp1Price || (isLong ? basePrice * 1.045 : basePrice * 0.955),
      riskReward: rr.ratio > 0 ? rr.ratio : 2.0,
      autoExecuteImmediately: false,
    });

    if (onOpenOrderModal) {
      onOpenOrderModal();
    }
  };

  // Filtrar ÚNICAMENTE las estrategias activas (excluir obsoletas / inactivas)
  const activeStrategies = useMemo(() => {
    return strategies.filter((st) => {
      const isObsolete = (st.estado || '').toLowerCase().includes('obsolet') || normalizeStrategyStatus(st.estado) === 'Obsoleto';
      return !isObsolete;
    });
  }, [strategies]);

  return (
    <div id="trading-strategies-view" className="flex flex-col gap-4">
      {/* SECCIÓN ÚNICA: ESTRATEGIAS ORDENADAS POR RATIO R/B (MAYOR A MENOR) */}
      <TopStrategiesRiskRewardList
        activeStrategies={activeStrategies}
        onStrategySelected={handleSelectStrategyForExecution}
        onOpenDetails={setSelectedStrategy}
        highlightSymbol={ticker.symbol}
        onOpenDocsManager={() => setIsDocsManagerOpen(true)}
        onSync={handleSync}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onNavigateToGestionTrades={onNavigateToGestionTrades}
      />

      {/* Detail Modal */}
      {selectedStrategy && (
        <StrategyDetailModal
          strategy={selectedStrategy}
          isOpen={!!selectedStrategy}
          onClose={() => setSelectedStrategy(null)}
          onApplyToOrderForm={handleSelectStrategyForExecution}
          onNavigateToGestionTrades={onNavigateToGestionTrades}
        />
      )}

      {/* Google Docs Manager Modal (Leer / Escribir) */}
      <GoogleDocsManagerModal
        isOpen={isDocsManagerOpen}
        onClose={() => setIsDocsManagerOpen(false)}
        onNavigateToGestionTrades={onNavigateToGestionTrades}
      />
    </div>
  );
};
