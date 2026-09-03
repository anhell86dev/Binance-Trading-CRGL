import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Smartphone,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  X,
  ArrowRight,
  Layers,
  Clock,
  Sparkles,
} from 'lucide-react';
import { StrategyExecutionPlan } from '../types/strategy';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (authCode: string) => Promise<void> | void;
  plan: StrategyExecutionPlan;
  allocatedCapital: number;
  leverage: number;
  isProcessing?: boolean;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  plan,
  allocatedCapital,
  leverage,
  isProcessing = false,
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(30);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setErrorMsg(null);
      setTimerSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Simulated TOTP 30-second cycle countdown
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTimerSeconds(30 - (Math.floor(Date.now() / 1000) % 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDigitChange = (index: number, value: string) => {
    // If pasted multiple digits
    if (value.length > 1) {
      const pasted = value.replace(/\D/g, '').slice(0, 6);
      if (pasted.length > 0) {
        const newDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          newDigits[i] = pasted[i] || '';
        }
        setDigits(newDigits);
        setErrorMsg(null);
        const nextIdx = Math.min(5, pasted.length);
        inputRefs.current[nextIdx]?.focus();
        return;
      }
    }

    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMsg(null);

    // Auto-focus next input
    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pastedData[i] || '';
      }
      setDigits(newDigits);
      setErrorMsg(null);
      const nextIdx = Math.min(5, pastedData.length);
      inputRefs.current[nextIdx]?.focus();
    }
  };

  const handleAutoFillDemoCode = () => {
    const demoCode = ['8', '4', '9', '2', '0', '1'];
    setDigits(demoCode);
    setErrorMsg(null);
    inputRefs.current[5]?.focus();
  };

  const code = digits.join('');
  const isComplete = code.length === 6;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isComplete) {
      setErrorMsg('Por favor ingresa los 6 dígitos del código de Google Authenticator.');
      return;
    }

    try {
      await onConfirm(code);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de autenticación 2FA.');
    }
  };

  return (
    <div
      id="google_auth_modal_overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
    >
      <div
        id="google_auth_modal_card"
        className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative text-neutral-100"
      >
        {/* Header with Security Badge */}
        <div className="bg-gradient-to-r from-amber-500/15 via-neutral-900 to-emerald-500/10 p-4 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Autorización Google Authenticator (2FA)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  BINANCE 2FA
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Confirmación de seguridad requerida para despachar 6 órdenes a Binance Futures
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 flex flex-col gap-4">
          {/* Strategy & Order Bundle Summary */}
          <div className="bg-neutral-950/80 rounded-xl p-3.5 border border-neutral-800 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {plan.noEstrategia}
                </span>
                <span className="text-sm font-bold text-white">{plan.name}</span>
              </div>
              <span className="text-xs font-mono font-black text-amber-400">
                {plan.symbol}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-900 font-mono text-xs">
              <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Capital USDT:</span>
                <span className="text-sm font-bold text-emerald-400">${allocatedCapital.toFixed(2)}</span>
              </div>
              <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Apalancamiento:</span>
                <span className="text-sm font-bold text-amber-400">{leverage}x ISOLATED</span>
              </div>
              <div className="bg-neutral-900/60 p-2 rounded-lg border border-neutral-800">
                <span className="text-[10px] text-neutral-400 block">Notional Total:</span>
                <span className="text-sm font-bold text-white">${(allocatedCapital * leverage).toFixed(2)}</span>
              </div>
            </div>

            {/* Stepped Orders Mini-Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                E1 (50%): ${plan.entry1Price}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">
                E2 (50%): ${plan.entry2Price}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60">
                SL Estricto: ${plan.slPrice}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                TP1/TP2/TP Final
              </span>
            </div>
          </div>

          {/* 2FA 6-Digit Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Código de 6 dígitos Google Authenticator
              </label>

              <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-400">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Expira en:</span>
                <strong className="text-amber-300 font-bold">{timerSeconds}s</strong>
              </div>
            </div>

            {/* 6 Digit Inputs */}
            <div className="grid grid-cols-6 gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  disabled={isProcessing}
                  className="w-full h-12 sm:h-14 text-center text-xl sm:text-2xl font-mono font-black bg-neutral-950 border-2 rounded-xl text-white transition-all focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 border-neutral-700"
                />
              ))}
            </div>

            {/* Error Message if any */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/70 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Simulated 2FA Helper */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-neutral-500">
                Abre tu app Google Authenticator y copia el código de Binance.
              </span>
              <button
                type="button"
                onClick={handleAutoFillDemoCode}
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 flex items-center gap-1 hover:underline transition-colors shrink-0"
              >
                <Sparkles className="w-3 h-3" />
                Simular 2FA Auto-Fill
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-800 mt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!isComplete || isProcessing}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all shadow-lg ${
                  isComplete && !isProcessing
                    ? 'bg-amber-400 hover:bg-amber-300 text-black shadow-amber-950/40 font-black cursor-pointer'
                    : 'bg-neutral-800 text-neutral-500 border border-neutral-700 cursor-not-allowed'
                }`}
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Despachando a Binance...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Autorizar y Crear en Binance</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
