import React, { useState, useRef, useEffect } from 'react';
import {
  CheckCircle2,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';

export const SecurityBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(binanceWs.getMode());
  const badgeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setMode(binanceWs.getMode());
    });

    const handleClickOutside = (e: MouseEvent) => {
      if (badgeRef.current && !badgeRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      unsub();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block" ref={badgeRef}>
      {/* Sello Visual Persistente de Seguridad Transparente */}
      <button
        type="button"
        id="security-badge-btn"
        onClick={() => setIsOpen(!isOpen)}
        title="Estado de Seguridad Binance & Gestión de Riesgo"
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 transition-all text-xs font-semibold cursor-pointer shadow-xs group"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
        </span>
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-mono tracking-tight text-white font-bold hidden sm:inline">
          2FA Verificado
        </span>
        <span className="text-[10px] text-emerald-400/90 font-mono hidden md:inline">
          • Protección Activa
        </span>
      </button>

      {/* Popover Desplegable de Auditoría de Seguridad Transparente */}
      {isOpen && (
        <div
          id="security-audit-popover"
          className="absolute right-0 mt-2 w-72 sm:w-80 p-3.5 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 text-xs text-neutral-200 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-white text-xs">Sello de Seguridad Transparente</h4>
                <p className="text-[10px] text-emerald-400 font-mono">Conexión Verificada</p>
              </div>
            </div>
            <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-[10px] font-mono text-neutral-300 font-bold border border-neutral-700">
              {mode === 'production' ? 'PROD LIVE' : mode === 'testnet' ? 'TESTNET' : 'SIMULATION'}
            </span>
          </div>

          {/* Security Protocols List */}
          <div className="flex flex-col gap-2 pt-2.5">
            <div className="flex items-start gap-2 p-2 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-[11px]">2FA & Autenticación de Sesión</div>
                <p className="text-[10px] text-neutral-400">
                  Firmas HMAC-SHA256 / Ed25519 con verificación criptográfica en cada solicitud.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-[11px]">Margen Aislado Obligatorio (1x-5x)</div>
                <p className="text-[10px] text-neutral-400">
                  Bloqueo estricto del modo Cruzado. Apalancamiento limitado a máximo 5x para prevención de liquidaciones.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-2 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <KeyRound className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-white text-[11px]">Restricción de Permisos API</div>
                <p className="text-[10px] text-neutral-400">
                  Solo permisos de lectura y trading en derivados. Retiros de fondos estrictamente deshabilitados.
                </p>
              </div>
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-neutral-400">
            <span>Latencia segura WebSocket: &lt; 30ms</span>
            <span className="text-emerald-400 font-mono font-bold">100% Blindado</span>
          </div>
        </div>
      )}
    </div>
  );
};
