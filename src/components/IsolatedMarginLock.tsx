import React from 'react';
import { Lock, ShieldCheck } from 'lucide-react';

interface IsolatedMarginLockProps {
  className?: string;
}

export const IsolatedMarginLock: React.FC<IsolatedMarginLockProps> = ({ className = '' }) => {
  return (
    <div
      id="isolated-margin-lock"
      className={`p-2.5 rounded-lg bg-neutral-950 border border-blue-500/30 flex items-center justify-between gap-2 ${className}`}
      title="Modo de Margen Aislado (Isolated) forzado por protocolo de seguridad para proteger el saldo restante de la cuenta"
    >
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-white">Margen: Aislado (Isolated)</span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30">
              LOCKED
            </span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.2">
            Riesgo delimitado únicamente al margen de la posición. Cross margin inhabilitado.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
        <ShieldCheck className="w-3 h-3 text-emerald-400" />
        <span className="hidden sm:inline">Seguridad Activa</span>
      </div>
    </div>
  );
};
