import React, { useEffect } from 'react';
import { Lock, Shield, Sparkles, X, Zap } from 'lucide-react';
import { OrderForm } from './OrderForm';
import { binanceWs } from '../services/binanceWs';

interface FuturesOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FuturesOrderModal: React.FC<FuturesOrderModalProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="futures-order-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="futures-order-modal-card"
        className="w-full max-w-lg bg-neutral-900 border border-neutral-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
      >
        {/* Modal Top Control Bar */}
        <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Zap className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white">
                  Ventana Emergente: Binance Futures
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                  ISOLATED ONLY
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-mono">
                Apalancamiento estricto 1x-5x | Sin riesgo de contagio cruzado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-rose-900/40 text-neutral-400 hover:text-rose-300 border border-neutral-700 transition-colors"
            title="Cerrar ventana emergente (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body with the Order Form */}
        <div className="overflow-y-auto p-3.5 sm:p-4 custom-scrollbar flex-1">
          <OrderForm isModal={true} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default FuturesOrderModal;
