import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Filter,
  Layers,
  Link as LinkIcon,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { strategyService } from '../services/strategyService';
import { binanceWs } from '../services/binanceWs';
import { TOP_3_STRATEGIES_CATALOG } from '../services/strategyAutofillService';
import { OpenOrder, PositionRisk } from '../types/binance';
import { parsePricesFromStrategy, calculateStrategyRewardToRisk } from '../utils/sheetParser';

interface LinkStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: OpenOrder | null;
  position?: PositionRisk | null;
}

export const LinkStrategyModal: React.FC<LinkStrategyModalProps> = ({
  isOpen,
  onClose,
  order,
  position,
}) => {
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>('');
  const [customStrategyName, setCustomStrategyName] = useState<string>('');

  const targetSymbol = position ? position.symbol : order ? order.symbol : '';
  const currentStrategyId = position ? position.strategyId : order ? order.strategyId : '';

  useEffect(() => {
    if (isOpen) {
      setStrategies(strategyService.getStrategies());
      setSelectedStrategyId(currentStrategyId || '');
      setSearchTerm(targetSymbol || '');
    }
  }, [isOpen, currentStrategyId, targetSymbol]);

  if (!isOpen || (!order && !position)) return null;

  // Filter strategies
  const filteredStrategies = strategies.filter((strat) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      strat.noEstrategia.toLowerCase().includes(term) ||
      strat.nombreEstrategia.toLowerCase().includes(term) ||
      strat.par.toLowerCase().includes(term)
    );
  });

  const handleLink = () => {
    let chosenId = selectedStrategyId;
    let chosenName = '';

    const found = strategies.find((s) => s.noEstrategia === selectedStrategyId);
    if (found) {
      chosenName = found.nombreEstrategia;
    } else {
      const topFound = TOP_3_STRATEGIES_CATALOG.find((t) => t.id === selectedStrategyId);
      if (topFound) {
        chosenName = topFound.name;
      } else if (customStrategyName) {
        chosenId = `CUSTOM-${Date.now().toString().slice(-4)}`;
        chosenName = customStrategyName;
      }
    }

    if (!chosenId && !chosenName) {
      // Unlink
      chosenId = '';
      chosenName = '';
    }

    if (position) {
      binanceWs.linkPositionToStrategy(position.symbol, chosenId, chosenName);
    } else if (order) {
      binanceWs.linkOrderToStrategy(order.orderId, chosenId, chosenName);
    }

    onClose();
  };

  const handleUnlink = () => {
    if (position) {
      binanceWs.linkPositionToStrategy(position.symbol, '', '');
    } else if (order) {
      binanceWs.linkOrderToStrategy(order.orderId, '', '');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Vincular a Estrategia de Trading
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 font-mono">
                {position ? `Posición ${position.symbol}` : `Orden ${order?.orderId.slice(0, 16)}... (${order?.symbol})`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por ID, nombre o símbolo (ej. ZEC, BTC, TOP-01)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2 text-neutral-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter: Top 3 & Official Strategies */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-neutral-400 text-[11px]">
              <span className="font-bold uppercase tracking-wider text-neutral-300">
                Selecciona la Estrategia Asociada
              </span>
              <span>{filteredStrategies.length} disponibles</span>
            </div>

            <div className="divide-y divide-neutral-800/80 bg-neutral-950/80 rounded-xl border border-neutral-800 overflow-hidden max-h-[300px] overflow-y-auto">
              {filteredStrategies.length === 0 ? (
                <div className="p-6 text-center text-neutral-500 text-xs">
                  No se encontraron estrategias coincidentes con "{searchTerm}".
                </div>
              ) : (
                filteredStrategies.map((strat) => {
                  const isSelected = selectedStrategyId === strat.noEstrategia;
                  const isMatchSymbol = strat.par.toUpperCase() === targetSymbol.toUpperCase();
                  const prices = parsePricesFromStrategy(strat);
                  const rr = calculateStrategyRewardToRisk(strat);

                  return (
                    <div
                      key={strat.noEstrategia}
                      onClick={() => setSelectedStrategyId(strat.noEstrategia)}
                      className={`p-3 flex items-start justify-between gap-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 ring-1 ring-inset ring-amber-400/50'
                          : 'hover:bg-neutral-900/60'
                      }`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-xs mt-0.5 shrink-0 ${
                            isSelected
                              ? 'bg-amber-400 text-neutral-950 font-bold'
                              : 'bg-neutral-800 text-neutral-400'
                          }`}
                        >
                          {isSelected ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : null}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-amber-300 text-xs">
                              {strat.noEstrategia}
                            </span>
                            <span className="font-bold text-white text-xs truncate">
                              {strat.nombreEstrategia}
                            </span>
                            {isMatchSymbol && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                                Mismo Par
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1 font-mono flex-wrap">
                            <span>Par: <strong className="text-neutral-200">{strat.par}</strong></span>
                            <span>•</span>
                            <span>R:B: <strong className="text-emerald-400">1:{rr.ratio?.toFixed(2) || '3.00'}</strong></span>
                            <span>•</span>
                            <span>SL: <strong className="text-rose-400">${prices.slPrice || '-'}</strong></span>
                            <span>•</span>
                            <span>TP1: <strong className="text-emerald-400">${prices.tp1Price || '-'}</strong></span>
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold shrink-0 ${
                          strat.estado === 'Live'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        {strat.estado || 'Activa'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between gap-2">
          {currentStrategyId ? (
            <button
              type="button"
              onClick={handleUnlink}
              className="text-xs text-rose-400 hover:text-rose-300 hover:underline"
            >
              Desvincular Estrategia
            </button>
          ) : (
            <div className="text-[11px] text-neutral-500">
              Selecciona una estrategia técnica para vincularla a esta orden/posición.
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 text-neutral-300 text-xs font-semibold hover:bg-neutral-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleLink}
              disabled={!selectedStrategyId}
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Guardar Vinculación</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
