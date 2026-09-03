import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, X, Zap } from 'lucide-react';
import { binanceWs } from '../services/binanceWs';

interface EmergencyCloseButtonProps {
  symbol: string;
  positionSize: number;
  entryPrice?: number;
  unrealizedPnl?: number;
  variant?: 'danger' | 'compact';
  onCloseSuccess?: () => void;
}

export const EmergencyCloseButton: React.FC<EmergencyCloseButtonProps> = ({
  symbol,
  positionSize,
  entryPrice = 0,
  unrealizedPnl = 0,
  variant = 'danger',
  onCloseSuccess,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleConfirmClose = async () => {
    setIsClosing(true);
    try {
      await binanceWs.closePosition(symbol);
      setIsModalOpen(false);
      if (onCloseSuccess) {
        onCloseSuccess();
      }
    } catch (err) {
      console.error('Error cerrando posición a mercado:', err);
    } finally {
      setIsClosing(false);
    }
  };

  return (
    <>
      <button
        id={`emergency-close-btn-${symbol}`}
        onClick={() => setIsModalOpen(true)}
        className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all flex items-center gap-1 shadow-xs active:scale-95 ${
          variant === 'danger'
            ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-300 hover:text-white'
            : 'bg-neutral-800 hover:bg-rose-950 hover:border-rose-800 text-rose-400 text-[11px]'
        }`}
        title="Cierre de Emergencia a Mercado (Market Close) con confirmación de seguridad"
      >
        <Zap className="w-3 h-3 text-rose-400 fill-rose-400 shrink-0" />
        <span>Cerrar Mercado</span>
      </button>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-rose-900/80 rounded-xl p-5 w-full max-w-sm flex flex-col gap-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
                <span>Confirmar Cierre de Emergencia</span>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-neutral-300 flex flex-col gap-2">
              <p>
                ¿Estás seguro de que deseas cerrar inmediatamente la posición de{' '}
                <strong className="text-white font-mono">{symbol}</strong> al mejor precio de mercado en Binance?
              </p>

              <div className="p-2.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-[11px] flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Tamaño Posición:</span>
                  <span className="text-white font-bold">{Math.abs(positionSize)} {symbol.replace('USDT', '')}</span>
                </div>
                {entryPrice > 0 && (
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Precio Entrada:</span>
                    <span className="text-neutral-300">${entryPrice.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-neutral-500">PnL No Realizado:</span>
                  <span className={`font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)} USDT
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-amber-400/90 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                Se enviará una orden MARKET inmediata a Binance Futures para cancelar la exposición.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isClosing}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmClose}
                disabled={isClosing}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-md shadow-rose-950/50"
              >
                {isClosing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Cerrando...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-white" />
                    <span>Sí, Cerrar a Mercado</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
