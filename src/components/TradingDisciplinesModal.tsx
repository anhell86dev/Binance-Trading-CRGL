import React, { useState, useEffect } from 'react';
import {
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  DollarSign,
  Flame,
  HeartHandshake,
  Layers,
  Lock,
  Percent,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';

export interface DisciplineRule {
  id: string;
  number: number;
  title: string;
  tagline: string;
  category: 'CAPITAL' | 'EJECUCIÓN' | 'PSICOLOGÍA' | 'SALIDAS';
  icon: any;
  rule: string;
  foundation: string;
  badPractice: string;
  goodPractice: string;
  metrics: string;
}

export const TRADING_DISCIPLINES: DisciplineRule[] = [
  {
    id: 'disc-1',
    number: 1,
    title: 'Preservación de Capital Estricta (1% - 2%)',
    tagline: 'La regla #1 es nunca perder dinero; la regla #2 es nunca olvidar la regla #1.',
    category: 'CAPITAL',
    icon: DollarSign,
    rule: 'Nunca arriesgues más del 1.0% al 2.0% del balance total de tu billetera en una sola operación.',
    foundation:
      'Con un riesgo máximo del 1% por trade, se requieren 10 pérdidas consecutivas para sufrir apenas un ~9.5% de drawdown. Esto garantiza longevidad y supervivencia ante cualquier racha adversa.',
    badPractice: 'Arriesgar 10%, 20% o el 50% de la cuenta en un solo trade ("All-in").',
    goodPractice: 'Calcular el tamaño exacto de posición en base a la distancia del Stop Loss para no superar el 2%.',
    metrics: 'Riesgo Máx: ≤ 2.0% del Balance',
  },
  {
    id: 'disc-2',
    number: 2,
    title: 'Apalancamiento Conservador Institucional (1x a 5x)',
    tagline: 'El apalancamiento amplifica errores, no la inteligencia.',
    category: 'CAPITAL',
    icon: Shield,
    rule: 'Opera exclusivamente entre 1x y 5x. Prohibido el uso de apalancamientos superiores a 5x.',
    foundation:
      'Más del 92% de las liquidaciones de traders minoristas en Binance Futures se deben a apalancamientos >10x. A 3x-5x tienes margen suficiente para resistir la volatilidad inherente de cripto sin ser barrido.',
    badPractice: 'Usar 20x, 50x o 100x para "ganar rápido".',
    goodPractice: 'Mantener el deslizador en 2x-3x (o máx 5x) con margen aislado.',
    metrics: 'Límite Institucional: 1x a 5x',
  },
  {
    id: 'disc-3',
    number: 3,
    title: 'Stop Loss Mandatorio, Técnico e Inamovible',
    tagline: 'Si no estás dispuesto a perder poco, terminarás perdiendo todo.',
    category: 'EJECUCIÓN',
    icon: ShieldAlert,
    rule: 'Toda orden debe nacer con un Stop Loss definido. Está estrictamente prohibido mover o cancelar el SL en contra de la posición.',
    foundation:
      'El Stop Loss es el seguro de vida de tu cuenta. Aceptar una pérdida controlada es un costo operativo normal de un negocio rentable. Quitar el SL transforma un trade en una apuesta descontrolada.',
    badPractice: 'Alejar el Stop Loss cuando el precio se acerca porque "ya va a rebotar".',
    goodPractice: 'Colocar el SL en un nivel técnico clave (por debajo del soporte) y respetarlo incondicionalmente.',
    metrics: 'Stop Loss: 100% Obligatorio',
  },
  {
    id: 'disc-4',
    number: 4,
    title: 'Asimetría Positiva Obligatoria (R:B ≥ 1:2.5)',
    tagline: 'Arriesga 1 para ganar 3. Las matemáticas juegan a tu favor.',
    category: 'EJECUCIÓN',
    icon: Scale,
    rule: 'Solo ejecuta operaciones donde el beneficio potencial (TP) supere al menos 2.5 a 3.0 veces el riesgo asumido (SL).',
    foundation:
      'Con un ratio 1:3, incluso con solo un 33% de operaciones ganadoras mantienes un balance positivo. Con un 50% de winrate, la cuenta crece de manera exponencial.',
    badPractice: 'Arriesgar $100 para ganar $30 (R:B 1:0.3 desfavorable).',
    goodPractice: 'Filtrar y ejecutar únicamente setups con R:B mínimo de 1:2.5 o superior.',
    metrics: 'Ratio R:B Mínimo: 1:2.50',
  },
  {
    id: 'disc-5',
    number: 5,
    title: 'Margen Aislado (ISOLATED) Exclusivo',
    tagline: 'Compartimenta tu riesgo; un incendio en una habitación no debe quemar la casa entera.',
    category: 'CAPITAL',
    icon: Lock,
    rule: 'Mantén el 100% de tus posiciones y órdenes en modo ISOLATED. Prohibido el margen Cruzado (Crossed).',
    foundation:
      'El margen aislado limita la pérdida máxima de la orden al margen asignado. Un movimiento violento o flash crash no podrá consumir los fondos restantes de tu billetera USDT.',
    badPractice: 'Usar Margen Cruzado para "darle aire a la posición".',
    goodPractice: 'Bloquear la cuenta en ISOLATED y ajustar el tamaño con la cantidad de contratos.',
    metrics: 'Tipo de Margen: ISOLATED Lock',
  },
  {
    id: 'disc-6',
    number: 6,
    title: 'Entradas Escalonadas Sistemáticas (50% - 30% - 20%)',
    tagline: 'No busques el fondo exacto; construye una posición profesional por niveles.',
    category: 'EJECUCIÓN',
    icon: Layers,
    rule: 'Distribuye tu capital de entrada en 3 niveles tácticos: 50% en E1 (confirmación), 30% en E2 (retroceso), y 20% en E3 (soporte mayor).',
    foundation:
      'El escalonamiento reduce el impacto psicológico del timing y optimiza el precio medio de entrada durante retrocesos naturales de liquidez.',
    badPractice: 'Entrar con el 100% del capital a precio de mercado en un solo punto.',
    goodPractice: 'Programar órdenes límite en E1, E2 y E3 de acuerdo al plan técnico.',
    metrics: 'Distribución: 50% / 30% / 20%',
  },
  {
    id: 'disc-7',
    number: 7,
    title: 'Toma Parcial de Beneficios & Breakeven Inmediato',
    tagline: 'Nadie se ha ido a la quiebra tomando ganancias.',
    category: 'SALIDAS',
    icon: Target,
    rule: 'Asegura ganancias en TP1 (50%) y sube el Stop Loss a Breakeven (precio de entrada). Deja correr TP2 (30%) y TP Final (20%) libre de riesgo.',
    foundation:
      'Al cobrar en TP1 y mover a Breakeven, el trade queda blindado matemáticamente. Ya no es posible perder en esa operación y permites que los beneficios corran.',
    badPractice: 'Esperar a que toque el último TP sin tomar nada y ver cómo se devuelve a pérdida.',
    goodPractice: 'Ejecutar toma de beneficios escalonada y mover SL a Breakeven tras tocar TP1.',
    metrics: 'TP1 50% + Breakeven Inmediato',
  },
  {
    id: 'disc-8',
    number: 8,
    title: 'Disciplina Psicológica, Cero FOMO & Cero Revenge Trading',
    tagline: 'El mercado tiene infinitas oportunidades; tu cuenta tiene un saldo finito.',
    category: 'PSICOLOGÍA',
    icon: HeartHandshake,
    rule: 'Opera solo setups validados en la hoja técnica. Si el precio ya despegó sin ti, déjalo ir. Jamás aumentes posición para "recuperar" una pérdida.',
    foundation:
      'El trading es un juego de probabilidades y ejecución mecánica, no de emociones. Las mayores pérdidas de la historia de los mercados ocurren por venganza tras un stop loss.',
    badPractice: 'Entrar a destiempo por FOMO viendo una vela verde gigante o duplicar tamaño tras un SL.',
    goodPractice: 'Esperar pacientemente el retroceso a la zona de entrada o buscar el próximo par validado.',
    metrics: 'Ejecución: 100% Sistemática',
  },
];

const CHECKLIST_STORAGE_KEY = 'binance_futures_disciplines_checklist_v1';

export const TradingDisciplinesView: React.FC<{ isCompact?: boolean }> = ({ isCompact = false }) => {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(CHECKLIST_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return {};
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  const toggleCheck = (id: string) => {
    const updated = { ...checkedIds, [id]: !checkedIds[id] };
    setCheckedIds(updated);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleMarkAll = () => {
    const allChecked: Record<string, boolean> = {};
    TRADING_DISCIPLINES.forEach((d) => {
      allChecked[d.id] = true;
    });
    setCheckedIds(allChecked);
    try {
      localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify(allChecked));
    } catch {}
  };

  const handleResetChecklist = () => {
    setCheckedIds({});
    try {
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    } catch {}
  };

  const totalCount = TRADING_DISCIPLINES.length;
  const checkedCount = TRADING_DISCIPLINES.filter((d) => checkedIds[d.id]).length;
  const progressPct = Math.round((checkedCount / totalCount) * 100);

  const filtered = TRADING_DISCIPLINES.filter((d) => {
    if (filterCategory === 'ALL') return true;
    return d.category === filterCategory;
  });

  return (
    <div className="space-y-4">
      {/* Top Banner / Progress Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Las 8 Disciplinas del Trader Institucional
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Binance Futures Pro
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Checklist de auditoría y normas inquebrantables de gestión de riesgo para salvaguardar tu capital.
            </p>
          </div>
        </div>

        {/* Progress meter */}
        <div className="w-full md:w-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800 shrink-0">
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 text-xs">
              <span className="text-neutral-400 font-medium">Pre-Flight Checklist:</span>
              <strong className="text-amber-400 font-mono">
                {checkedCount}/{totalCount} ({progressPct}%)
              </strong>
            </div>
            <div className="w-48 h-2 bg-neutral-800 rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPct === 100
                    ? 'bg-emerald-400'
                    : progressPct >= 50
                    ? 'bg-amber-400'
                    : 'bg-neutral-600'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <button
              onClick={handleMarkAll}
              className="flex-1 sm:flex-none px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-700/50 text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Marcar Todo</span>
            </button>
            <button
              onClick={handleResetChecklist}
              title="Reiniciar checklist"
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ALL', label: 'Todas las Disciplinas (8)' },
          { id: 'CAPITAL', label: 'Gestión de Capital & Margen' },
          { id: 'EJECUCIÓN', label: 'Ejecución & Entradas' },
          { id: 'SALIDAS', label: 'Salidas & Take Profit' },
          { id: 'PSICOLOGÍA', label: 'Psicología & Cero FOMO' },
        ].map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={`px-3 py-1.5 rounded-xl font-semibold transition-all whitespace-nowrap ${
              filterCategory === cat.id
                ? 'bg-amber-500 text-neutral-950 font-bold shadow-sm'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Disciplines Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((disc) => {
          const isChecked = !!checkedIds[disc.id];
          const IconComp = disc.icon;

          return (
            <div
              key={disc.id}
              className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                isChecked
                  ? 'bg-neutral-900/90 border-emerald-500/40 ring-1 ring-emerald-500/20'
                  : 'bg-neutral-900/60 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              {/* Header */}
              <div className="p-4 bg-neutral-950/60 border-b border-neutral-800/80 flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isChecked
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        #{disc.number}
                      </span>
                      <h4 className="text-sm font-bold text-white leading-tight">
                        {disc.title}
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400 block mt-0.5">
                      {disc.metrics}
                    </span>
                  </div>
                </div>

                {/* Interactive Checkbox */}
                <button
                  type="button"
                  onClick={() => toggleCheck(disc.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition-colors shrink-0 ${
                    isChecked
                      ? 'bg-emerald-500 text-neutral-950'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  {isChecked ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                  <span>{isChecked ? 'Cumplida' : 'Verificar'}</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 text-xs">
                <p className="text-neutral-200 font-medium leading-relaxed bg-neutral-950/80 p-2.5 rounded-xl border border-neutral-800/80">
                  <strong className="text-amber-300">Regla:</strong> {disc.rule}
                </p>

                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  <strong className="text-neutral-300">Fundamento:</strong> {disc.foundation}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-900/40 text-[11px]">
                    <span className="text-rose-400 font-bold block mb-0.5">❌ Error Fatal:</span>
                    <span className="text-neutral-300">{disc.badPractice}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-[11px]">
                    <span className="text-emerald-400 font-bold block mb-0.5">✅ Práctica Pro:</span>
                    <span className="text-neutral-300">{disc.goodPractice}</span>
                  </div>
                </div>
              </div>

              {/* Tagline Footer */}
              <div className="px-4 py-2 bg-neutral-950/40 border-t border-neutral-800/60 text-[11px] italic text-neutral-400">
                "{disc.tagline}"
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const TradingDisciplinesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white">
                Disciplinas del Trade • Binance Futures Pro
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Reglas de oro institucionales de gestión de riesgo y ejecución profesional
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

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
          <TradingDisciplinesView />
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between">
          <span className="text-[11px] text-neutral-500 italic">
            "El éxito en los mercados no depende de adivinar el futuro, sino de gestionar el riesgo en cada decisión."
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
