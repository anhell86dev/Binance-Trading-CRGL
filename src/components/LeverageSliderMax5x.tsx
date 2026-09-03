import React from 'react';
import { Shield, Sliders } from 'lucide-react';

interface LeverageSliderMax5xProps {
  value: number;
  onChange: (val: number) => void;
  disabled?: boolean;
}

export const LeverageSliderMax5x: React.FC<LeverageSliderMax5xProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  // Enforce strict 1x-5x limit
  const safeValue = Math.min(5, Math.max(1, value));

  const handleChange = (rawVal: number) => {
    const clamped = Math.min(5, Math.max(1, rawVal));
    onChange(clamped);
  };

  // Color coding by safe risk:
  // 1x-2x: Verde (Ultra Seguro)
  // 3x-4x: Azul / Verde Claro (Seguro Moderado)
  // 5x: Amarillo (Máximo Permitido por Protocolo)
  const getRiskColor = (lev: number) => {
    if (lev <= 2) {
      return {
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        activeBtn: 'bg-emerald-500 text-neutral-950 font-black shadow-emerald-500/30',
        sliderAccent: 'accent-emerald-500',
        label: 'Ultra Seguro',
        labelColor: 'text-emerald-400',
      };
    }
    if (lev <= 4) {
      return {
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        activeBtn: 'bg-sky-500 text-neutral-950 font-black shadow-sky-500/30',
        sliderAccent: 'accent-sky-500',
        label: 'Moderado Seguro',
        labelColor: 'text-sky-400',
      };
    }
    return {
      bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      activeBtn: 'bg-amber-400 text-neutral-950 font-black shadow-amber-500/30',
      sliderAccent: 'accent-amber-400',
      label: 'Tope Máx Protocolo',
      labelColor: 'text-amber-400',
    };
  };

  const currentColor = getRiskColor(safeValue);

  return (
    <div id="leverage-slider-max5x" className="flex flex-col gap-2 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-neutral-300">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold">Apalancamiento Restringido (1x - 5x máx):</span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${currentColor.bg}`}>
            {currentColor.label}
          </span>
          <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-white">
            {safeValue}x
          </span>
        </div>
      </div>

      {/* Slider Control with strictly clamped 1 to 5 */}
      <div className="flex items-center gap-3 pt-1">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          disabled={disabled}
          value={safeValue}
          onChange={(e) => handleChange(parseInt(e.target.value, 10))}
          className={`w-full h-1.5 bg-neutral-800 rounded-lg cursor-pointer ${currentColor.sliderAccent}`}
        />

        {/* Quick Stepper Buttons 1x to 5x */}
        <div className="flex gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((level) => {
            const btnColor = getRiskColor(level);
            const isSelected = safeValue === level;
            return (
              <button
                type="button"
                key={level}
                disabled={disabled}
                onClick={() => handleChange(level)}
                className={`w-6 h-6 rounded text-xs font-mono font-bold transition-all ${
                  isSelected
                    ? `${btnColor.activeBtn} shadow-sm scale-105`
                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700'
                }`}
                title={`Fijar apalancamiento a ${level}x (${btnColor.label})`}
              >
                {level}x
              </button>
            );
          })}
        </div>
      </div>

      {/* Safety Protocol Note */}
      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono pt-0.5">
        <span className="flex items-center gap-1 text-emerald-400/90">
          <Shield className="w-2.5 h-2.5 text-emerald-400" />
          Tope de 5x previene liquidación por mechas de volatilidad
        </span>
        <span className="text-neutral-500">&gt; 5x Bloqueado</span>
      </div>
    </div>
  );
};
