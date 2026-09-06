import React from 'react';
import { X, Calculator } from 'lucide-react';
import { PnlSimulator } from './PnlSimulator';
import { OrderSide } from '../types/binance';

export interface PnlSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSymbol?: string;
  initialSide?: OrderSide;
  initialEntryPrice?: number;
  initialExitPrice?: number;
  initialQuantity?: number;
  initialLeverage?: number;
}

export const PnlSimulatorModal: React.FC<PnlSimulatorModalProps> = ({
  isOpen,
  onClose,
  initialSymbol,
  initialSide,
  initialEntryPrice,
  initialExitPrice,
  initialQuantity,
  initialLeverage,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-[#121519] border border-[#2b313c] rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          title="Cerrar Simulador de PnL"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Embedded Simulator */}
        <div className="p-2 sm:p-3">
          <PnlSimulator
            initialSymbol={initialSymbol}
            initialSide={initialSide}
            initialEntryPrice={initialEntryPrice}
            initialExitPrice={initialExitPrice}
            initialQuantity={initialQuantity}
            initialLeverage={initialLeverage}
            onApplyToOrder={() => {
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PnlSimulatorModal;
