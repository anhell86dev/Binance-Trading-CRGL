import React, { useState, useMemo } from 'react';
import { Search, X, Zap, TrendingUp, Check, Star, Sparkles } from 'lucide-react';
import { BINANCE_POPULAR_PAIRS, BinancePairInfo, normalizeBinanceSymbol, searchBinancePairs } from '../data/binancePairs';
import { binanceWs } from '../services/binanceWs';

interface AssetSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSymbol: (symbol: string) => void;
  currentSymbol: string;
}

export const AssetSelectorModal: React.FC<AssetSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectSymbol,
  currentSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const categories = [
    { id: 'ALL', label: 'Todos' },
    { id: 'Top Majors', label: 'Top Majors' },
    { id: 'AI / Cripto IA', label: 'IA & Tech' },
    { id: 'DeFi', label: 'DeFi' },
    { id: 'Layer 1 / Layer 2', label: 'L1 / L2' },
    { id: 'Memes', label: 'Memes' },
    { id: 'Privacy', label: 'Privacy' },
  ];

  const filteredPairs = useMemo(() => {
    let list = searchBinancePairs(searchQuery);
    if (selectedCategory !== 'ALL') {
      list = list.filter((p) => p.category === selectedCategory);
    }
    return list;
  }, [searchQuery, selectedCategory]);

  if (!isOpen) return null;

  const handleSelect = (sym: string) => {
    const normalized = normalizeBinanceSymbol(sym);
    onSelectSymbol(normalized);
    onClose();
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      handleSelect(searchQuery);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Seleccionar Activo de Binance</h3>
              <p className="text-xs text-neutral-400">
                Opera cualquier contrato Perpetuo USDⓈ-M disponible en Binance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Custom Input */}
        <div className="p-4 border-b border-neutral-800 bg-neutral-950/60 flex flex-col gap-3">
          <form onSubmit={handleCustomSubmit} className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar símbolo (ej: BTC, SOL, DOGE, TAO, ZEC, SUI) o escribir cualquier par..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-24 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              autoFocus
            />
            {searchQuery.trim() && (
              <button
                type="submit"
                className="absolute right-2 top-2 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all shadow-sm"
              >
                Cargar
              </button>
            )}
          </form>

          {/* Quick Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Pairs List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filteredPairs.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <Sparkles className="w-8 h-8 text-amber-400/60" />
              <div>
                <p className="text-neutral-300 font-semibold text-sm">
                  ¿No encuentras el par en la lista rápida?
                </p>
                <p className="text-neutral-400 text-xs mt-1">
                  Puedes operar cualquier activo listado en Binance escribiendo su ticker (ej. {normalizeBinanceSymbol(searchQuery || 'BTC')}).
                </p>
              </div>
              {searchQuery.trim() && (
                <button
                  onClick={() => handleSelect(searchQuery)}
                  className="px-4 py-2 bg-amber-500 text-neutral-950 font-bold text-xs rounded-xl hover:bg-amber-400 transition-all"
                >
                  Operar {normalizeBinanceSymbol(searchQuery)}
                </button>
              )}
            </div>
          ) : (
            filteredPairs.map((pair) => {
              const isSelected = currentSymbol.toUpperCase() === pair.symbol.toUpperCase();
              return (
                <button
                  key={pair.symbol}
                  onClick={() => handleSelect(pair.symbol)}
                  className={`w-full p-3 rounded-xl flex items-center justify-between text-left transition-all border ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                      : 'bg-neutral-950/40 border-neutral-800/60 text-neutral-200 hover:bg-neutral-800/80 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-amber-400 font-mono">
                      {pair.baseAsset.slice(0, 3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm font-mono text-white">{pair.symbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                          {pair.category}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">{pair.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isSelected ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/20 px-2 py-1 rounded-lg border border-amber-500/40">
                        <Check className="w-3.5 h-3.5" />
                        Activo
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500 group-hover:text-neutral-300 font-mono">
                        Seleccionar →
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-neutral-950 border-t border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
          <span>Binance USDⓈ-M Futures • WebSocket Direct Feed</span>
          <span className="font-mono text-neutral-400">ISOLATED • 1x a 5x</span>
        </div>
      </div>
    </div>
  );
};
