import React, { useState, useEffect } from 'react';
import {
  Clock,
  Globe,
  Sun,
  Moon,
  Zap,
  Flame,
  Info,
  ChevronRight,
  TrendingUp,
  Activity,
  X,
  Calendar,
  Layers,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

export interface MarketSessionDetail {
  id: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  exchange: string;
  timeZone: string;
  timeZoneCode: string;
  openLocalHour: number;
  openLocalMin: number;
  closeLocalHour: number;
  closeLocalMin: number;
  preMarketStartHour?: number;
  preMarketStartMin?: number;
  openLocalStr: string;
  closeLocalStr: string;
  openUtcStr: string;
  closeUtcStr: string;
  currentTimeStr: string;
  currentDateStr: string;
  status: 'OPEN' | 'PRE' | 'CLOSED';
  statusLabel: string;
  progressPct: number; // 0 - 100% of current session
  countdownLabel: string;
  countdownStr: string;
  volatilityLevel: 'EXTREMO' | 'MUY ALTO' | 'ALTO' | 'MODERADO';
  volatilityColor: string;
  accentGradient: string;
  borderAccent: string;
  description: string;
}

interface MarketSessionClocksProps {
  layout?: 'inline' | 'stacked-vertical' | 'grid';
  compact?: boolean;
  className?: string;
  showTitle?: boolean;
}

export const MarketSessionClocks: React.FC<MarketSessionClocksProps> = ({
  layout = 'inline',
  compact = false,
  className = '',
  showTitle = true,
}) => {
  const [now, setNow] = useState<Date>(new Date());
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [selectedSessionModal, setSelectedSessionModal] = useState<string | null>(null);

  useEffect(() => {
    // Update every second for live accurate clocks
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in specific timezone
  const getTimeInZone = (timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);
    } catch (e) {
      return '--:--:--';
    }
  };

  const getDayInZone = (timeZone: string) => {
    try {
      return new Intl.DateTimeFormat('es-ES', {
        timeZone,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now);
    } catch (e) {
      return '';
    }
  };

  const getDayOfWeekInZone = (timeZone: string) => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
      }).formatToParts(now);
      const weekday = parts.find((p) => p.type === 'weekday')?.value;
      if (weekday === 'Sun') return 0;
      if (weekday === 'Mon') return 1;
      if (weekday === 'Tue') return 2;
      if (weekday === 'Wed') return 3;
      if (weekday === 'Thu') return 4;
      if (weekday === 'Fri') return 5;
      if (weekday === 'Sat') return 6;
      return now.getUTCDay();
    } catch (e) {
      return now.getUTCDay();
    }
  };

  // Helper calculation for any market session
  const computeSession = (
    id: string,
    name: string,
    country: string,
    flag: string,
    city: string,
    exchange: string,
    timeZone: string,
    timeZoneCode: string,
    openH: number,
    openM: number,
    closeH: number,
    closeM: number,
    preH: number | null,
    preM: number | null,
    openUtcStr: string,
    closeUtcStr: string,
    volatilityLevel: 'EXTREMO' | 'MUY ALTO' | 'ALTO' | 'MODERADO',
    volatilityColor: string,
    accentGradient: string,
    borderAccent: string,
    description: string
  ): MarketSessionDetail => {
    const timeStr = getTimeInZone(timeZone);
    const dateStr = getDayInZone(timeZone);
    const dayOfWeek = getDayOfWeekInZone(timeZone);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const [hStr, mStr, sStr] = timeStr.split(':');
    const curH = parseInt(hStr, 10) || 0;
    const curM = parseInt(mStr, 10) || 0;
    const curS = parseInt(sStr, 10) || 0;
    const currentMins = curH * 60 + curM;

    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;
    const preMins = preH !== null && preM !== null ? preH * 60 + preM : null;

    let status: 'OPEN' | 'PRE' | 'CLOSED' = 'CLOSED';
    let statusLabel = 'CERRADA';
    let countdownLabel = 'Abre en';
    let countdownStr = '';
    let progressPct = 0;

    // Handle normal intra-day sessions (e.g. 09:30 to 16:00) vs overnight spanning
    const isOvernight = closeMins < openMins;

    if (!isWeekend) {
      const isOpenNow = !isOvernight
        ? currentMins >= openMins && currentMins < closeMins
        : currentMins >= openMins || currentMins < closeMins;

      const isPreNow =
        preMins !== null && !isOpenNow && currentMins >= preMins && currentMins < openMins;

      if (isOpenNow) {
        status = 'OPEN';
        statusLabel = 'ABIERTA';
        countdownLabel = 'Cierra en';

        let minsLeft = 0;
        let totalDuration = 0;
        let elapsed = 0;

        if (!isOvernight) {
          minsLeft = closeMins - currentMins;
          totalDuration = closeMins - openMins;
          elapsed = currentMins - openMins;
        } else {
          totalDuration = 24 * 60 - openMins + closeMins;
          if (currentMins >= openMins) {
            elapsed = currentMins - openMins;
            minsLeft = 24 * 60 - currentMins + closeMins;
          } else {
            elapsed = 24 * 60 - openMins + currentMins;
            minsLeft = closeMins - currentMins;
          }
        }

        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        const s = 59 - curS;
        countdownStr = `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
        progressPct = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      } else if (isPreNow) {
        status = 'PRE';
        statusLabel = 'PRE-MERCADO';
        countdownLabel = 'Abre en';
        const minsLeft = openMins - currentMins;
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        const s = 59 - curS;
        countdownStr = `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
        progressPct = 0;
      } else {
        status = 'CLOSED';
        statusLabel = 'CERRADA';
        countdownLabel = 'Abre en';

        let minsUntilOpen = 0;
        if (currentMins < openMins) {
          minsUntilOpen = openMins - currentMins;
        } else {
          minsUntilOpen = 24 * 60 - currentMins + openMins;
        }
        const h = Math.floor(minsUntilOpen / 60);
        const m = minsUntilOpen % 60;
        countdownStr = `${h}h ${m}m`;
        progressPct = 0;
      }
    } else {
      status = 'CLOSED';
      statusLabel = 'FIN DE SEMANA';
      countdownLabel = 'Abre Lunes';
      countdownStr = `${openH < 10 ? '0' : ''}${openH}:${openM < 10 ? '0' : ''}${openM} ${timeZoneCode}`;
      progressPct = 0;
    }

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);

    return {
      id,
      name,
      country,
      flag,
      city,
      exchange,
      timeZone,
      timeZoneCode,
      openLocalHour: openH,
      openLocalMin: openM,
      closeLocalHour: closeH,
      closeLocalMin: closeM,
      preMarketStartHour: preH ?? undefined,
      preMarketStartMin: preM ?? undefined,
      openLocalStr: `${pad(openH)}:${pad(openM)} ${timeZoneCode}`,
      closeLocalStr: `${pad(closeH)}:${pad(closeM)} ${timeZoneCode}`,
      openUtcStr,
      closeUtcStr,
      currentTimeStr: timeStr,
      currentDateStr: dateStr,
      status,
      statusLabel,
      progressPct,
      countdownLabel,
      countdownStr,
      volatilityLevel,
      volatilityColor,
      accentGradient,
      borderAccent,
      description,
    };
  };

  // 1. Nueva York (NYSE / CME / Wall Street)
  const ny = computeSession(
    'ny',
    'Nueva York',
    'Estados Unidos',
    '🇺🇸',
    'New York',
    'NYSE / NASDAQ / CME',
    'America/New_York',
    'EDT',
    9,
    30,
    16,
    0,
    4,
    0,
    '13:30 UTC',
    '20:00 UTC',
    'EXTREMO',
    'text-rose-400 border-rose-500/40 bg-rose-500/10',
    'from-emerald-950/80 via-neutral-900 to-neutral-950',
    'border-emerald-500/60 hover:border-emerald-400',
    'Mayor centro financiero mundial. Dicta la dirección institucional y volatilidad de Cripto Futuros.'
  );

  // 2. Londres (LSE / Forex / Europa)
  const london = computeSession(
    'london',
    'Londres',
    'Reino Unido',
    '🇬🇧',
    'London',
    'LSE / ICE / Forex',
    'Europe/London',
    'BST',
    8,
    0,
    16,
    30,
    7,
    0,
    '07:00 UTC',
    '15:30 UTC',
    'MUY ALTO',
    'text-amber-400 border-amber-500/40 bg-amber-500/10',
    'from-sky-950/80 via-neutral-900 to-neutral-950',
    'border-sky-500/60 hover:border-sky-400',
    'Capital mundial del mercado de divisas (Forex). Fija la liquidez y las primeras rupturas europeas.'
  );

  // 3. Asia / Tokio & Hong Kong (TSE / HKEX)
  const tokyo = computeSession(
    'tokyo',
    'Tokio & Asia',
    'Japón / Asia',
    '🇯🇵',
    'Tokyo / HK',
    'TSE / HKEX / SGX',
    'Asia/Tokyo',
    'JST',
    9,
    0,
    18,
    0,
    8,
    0,
    '00:00 UTC',
    '09:00 UTC',
    'ALTO',
    'text-sky-400 border-sky-500/40 bg-sky-500/10',
    'from-indigo-950/80 via-neutral-900 to-neutral-950',
    'border-indigo-500/60 hover:border-indigo-400',
    'Apertura del ciclo asiático. Frecuente generación de rangos intradiarios y acumulación institucional.'
  );

  // 4. Sydney (ASX / Pacífico)
  const sydney = computeSession(
    'sydney',
    'Sydney',
    'Australia',
    '🇦🇺',
    'Sydney',
    'ASX Pacífico',
    'Australia/Sydney',
    'AEST',
    10,
    0,
    16,
    0,
    9,
    0,
    '00:00 UTC',
    '06:00 UTC',
    'MODERADO',
    'text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
    'from-teal-950/80 via-neutral-900 to-neutral-950',
    'border-teal-500/60 hover:border-teal-400',
    'Inicia la semana financiera global los domingos por la tarde. Clave para gaps de fin de semana.'
  );

  // Check Overlap (Londres + NY) -> 13:30 - 16:30 BST / 08:30 - 11:30 EDT
  const isLondonNYOverlap = london.status === 'OPEN' && ny.status === 'OPEN';

  const allSessions: MarketSessionDetail[] = [ny, london, tokyo, sydney];

  // =========================================================================
  // RENDER OPTION A: STACKED VERTICAL CARDS (Individual Cards Stacked Vertically)
  // Specific for Day Trading View tab
  // =========================================================================
  if (layout === 'stacked-vertical') {
    return (
      <div id="day-trading-market-session-cards" className={`flex flex-col gap-3 w-full ${className}`}>
        {/* Section Header */}
        {showTitle && (
          <div className="flex items-center justify-between border-b border-[#262c36] pb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider font-mono">
                Relojes de Apertura & Sesiones Bursátiles
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowDetailsModal(true)}
              className="text-[10px] font-mono text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Info className="w-3 h-3" />
              <span>Ver Guía</span>
            </button>
          </div>
        )}

        {/* 1. TARJETA INDIVIDUAL: SOLAPAMIENTO DE MÁXIMA LIQUIDEZ (LONDRES + NY) */}
        <div
          onClick={() => setShowDetailsModal(true)}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer shadow-md ${
            isLondonNYOverlap
              ? 'bg-gradient-to-r from-amber-950/80 via-orange-950/50 to-neutral-950 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.25)] animate-pulse'
              : 'bg-[#14181d] border-neutral-800 hover:border-neutral-700'
          }`}
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <Flame className={`w-4 h-4 ${isLondonNYOverlap ? 'text-amber-400 fill-amber-400' : 'text-neutral-500'}`} />
              <span className="text-xs font-extrabold text-white font-mono tracking-tight">
                Ventana de Máxima Liquidez
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                isLondonNYOverlap
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700'
              }`}
            >
              {isLondonNYOverlap ? '🔥 SOLAPAMIENTO ACTIVO (70% VOLUMEN)' : 'FUERA DE SOLAPAMIENTO'}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-neutral-300">
            <span className="text-neutral-400">Londres (BST) + NY (EDT):</span>
            <span className="font-bold text-amber-300">13:30 - 16:30 BST / 08:30 - 11:30 EDT</span>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1 leading-snug">
            Momento clave para rupturas en 5m/15m confirmadas con volumen institucional.
          </p>
        </div>

        {/* 2. TARJETAS INDIVIDUALES APILADAS VERTICALMENTE PARA CADA BOLSA */}
        <div className="flex flex-col gap-2.5">
          {allSessions.map((session) => {
            const isOpen = session.status === 'OPEN';
            const isPre = session.status === 'PRE';

            return (
              <div
                key={session.id}
                id={`session-card-${session.id}`}
                onClick={() => {
                  setSelectedSessionModal(session.id);
                  setShowDetailsModal(true);
                }}
                className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
                  isOpen
                    ? `bg-gradient-to-r ${session.accentGradient} border-emerald-500/70 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]`
                    : isPre
                    ? 'bg-gradient-to-r from-amber-950/70 via-neutral-900 to-neutral-950 border-amber-500/60 hover:border-amber-400'
                    : 'bg-[#14181d] border-[#262c36] hover:border-neutral-700 hover:bg-[#181d24]'
                }`}
              >
                {/* Top Row: Flag, Name, Exchange & Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-lg leading-none">{session.flag}</span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-xs text-white tracking-tight truncate">
                          {session.name}
                        </span>
                        <span className="text-[9px] font-mono text-neutral-400 truncate">
                          ({session.exchange})
                        </span>
                      </div>
                      <span className="text-[9px] text-neutral-400 font-mono">
                        {session.currentDateStr}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator & Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="relative flex h-2 w-2">
                      {isOpen && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      {isPre && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      )}
                      <span
                        className={`relative inline-flex rounded-full h-2 w-2 ${
                          isOpen ? 'bg-emerald-400' : isPre ? 'bg-amber-400' : 'bg-neutral-600'
                        }`}
                      />
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                        isOpen
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isPre
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
                      }`}
                    >
                      {session.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Middle Row: Digital Live Clock & Countdown */}
                <div className="flex items-baseline justify-between bg-neutral-950/70 p-2.5 rounded-lg border border-neutral-800/80 mb-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase">
                      Hora Local ({session.timeZoneCode})
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-base font-black font-mono text-white tracking-tight">
                        {session.currentTimeStr}
                      </span>
                      <span className="text-[9px] font-mono font-bold text-neutral-400">
                        {session.timeZoneCode}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-mono text-neutral-400 uppercase">
                      {session.countdownLabel}
                    </span>
                    <span
                      className={`text-xs font-bold font-mono ${
                        isOpen
                          ? 'text-emerald-400'
                          : isPre
                          ? 'text-amber-400'
                          : 'text-neutral-300'
                      }`}
                    >
                      {session.countdownStr}
                    </span>
                  </div>
                </div>

                {/* Session Progress Bar (when open) */}
                {isOpen && (
                  <div className="flex flex-col gap-1 mb-2">
                    <div className="flex justify-between text-[9px] font-mono text-neutral-400">
                      <span>Progreso de Sesión</span>
                      <span className="text-emerald-400 font-bold">{session.progressPct}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${session.progressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Bottom Row: Official Trading Hours & Volatility Rating */}
                <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-800/60">
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-500">Horario:</span>
                    <span className="text-neutral-200 font-semibold">{session.openLocalStr} - {session.closeLocalStr}</span>
                  </div>
                  <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold border ${session.volatilityColor}`}>
                    Volatilidad {session.volatilityLevel}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global Modal for detailed session breakdown */}
        {showDetailsModal && renderModal()}
      </div>
    );
  }

  // =========================================================================
  // RENDER OPTION B: INLINE COMPACT (For Navbar or Top Headers)
  // =========================================================================
  return (
    <>
      <div
        id="market-session-clocks-container"
        className={`flex items-center gap-1.5 sm:gap-2 select-none ${className}`}
      >
        {/* RELOJ 1: NUEVA YORK */}
        <div
          onClick={() => {
            setSelectedSessionModal('ny');
            setShowDetailsModal(true);
          }}
          className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
            ny.status === 'OPEN'
              ? 'bg-gradient-to-r from-emerald-950/90 to-neutral-900/90 border-emerald-500/80 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : ny.status === 'PRE'
              ? 'bg-gradient-to-r from-amber-950/80 to-neutral-900/90 border-amber-500/70 hover:border-amber-400'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
          }`}
          title="Sesión Nueva York (09:30 - 16:00 EDT). Clic para ver horarios mundiales."
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              {ny.status === 'OPEN' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              {ny.status === 'PRE' && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  ny.status === 'OPEN'
                    ? 'bg-emerald-400'
                    : ny.status === 'PRE'
                    ? 'bg-amber-400'
                    : 'bg-neutral-500'
                }`}
              />
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors flex items-center gap-1">
                <span>🇺🇸 NY</span>
                <span
                  className={`px-1 rounded text-[8px] font-bold ${
                    ny.status === 'OPEN'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : ny.status === 'PRE'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-neutral-800 text-neutral-400'
                  }`}
                >
                  {ny.statusLabel}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end leading-tight font-mono">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white tracking-tight">
                {ny.currentTimeStr}
              </span>
              <span className="text-[8px] text-neutral-400 font-bold">EDT</span>
            </div>
            <span
              className={`text-[8px] font-semibold tracking-tight ${
                ny.status === 'OPEN'
                  ? 'text-emerald-400'
                  : ny.status === 'PRE'
                  ? 'text-amber-400'
                  : 'text-neutral-400'
              }`}
            >
              {ny.countdownLabel}: {ny.countdownStr}
            </span>
          </div>
        </div>

        {/* RELOJ 2: LONDRES & ASIA */}
        <div
          onClick={() => {
            setSelectedSessionModal('london');
            setShowDetailsModal(true);
          }}
          className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
            isLondonNYOverlap
              ? 'bg-gradient-to-r from-amber-950/90 via-orange-950/60 to-neutral-900 border-amber-500/90 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
              : london.status === 'OPEN'
              ? 'bg-gradient-to-r from-sky-950/90 to-neutral-900/90 border-sky-500/80 hover:border-sky-400'
              : tokyo.status === 'OPEN'
              ? 'bg-gradient-to-r from-indigo-950/90 to-neutral-900/90 border-indigo-500/80 hover:border-indigo-400'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
          }`}
          title="Sesiones Londres & Asia. Clic para detalles."
        >
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              {(london.status === 'OPEN' || tokyo.status === 'OPEN') && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLondonNYOverlap
                    ? 'bg-amber-400'
                    : london.status === 'OPEN'
                    ? 'bg-sky-400'
                    : tokyo.status === 'OPEN'
                    ? 'bg-indigo-400'
                    : 'bg-neutral-500'
                }`}
              />
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors flex items-center gap-1">
                <span>🇬🇧 LON / 🇯🇵 ASIA</span>
                {london.status === 'OPEN' && (
                  <span className="px-1 rounded text-[8px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    LON
                  </span>
                )}
                {tokyo.status === 'OPEN' && (
                  <span className="px-1 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    ASIA
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end leading-tight font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-tight" title="Hora Londres">
                {london.currentTimeStr} <span className="text-[8px] text-neutral-400">LON</span>
              </span>
              <span className="text-neutral-600">|</span>
              <span className="hidden sm:inline text-xs font-bold text-neutral-300 tracking-tight" title="Hora Tokio">
                {tokyo.currentTimeStr} <span className="text-[8px] text-neutral-400">TOK</span>
              </span>
            </div>
            <span
              className={`text-[8px] font-bold tracking-tight truncate max-w-[140px] sm:max-w-[170px] ${
                isLondonNYOverlap
                  ? 'text-amber-300'
                  : london.status === 'OPEN'
                  ? 'text-sky-300'
                  : tokyo.status === 'OPEN'
                  ? 'text-indigo-300'
                  : 'text-neutral-400'
              }`}
            >
              {isLondonNYOverlap ? '🔥 SOLAPAMIENTO NY+LON' : london.status === 'OPEN' ? 'LONDRES ABIERTO' : tokyo.status === 'OPEN' ? 'TOKIO ABIERTO' : `${london.countdownLabel} ${london.countdownStr}`}
            </span>
          </div>
        </div>
      </div>

      {showDetailsModal && renderModal()}
    </>
  );

  // Modal helper function
  function renderModal() {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
        onClick={() => setShowDetailsModal(false)}
      >
        <div
          className="w-full max-w-2xl bg-[#14181d] border border-[#2b3139] rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-200 flex flex-col gap-4 font-sans max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-[#262c36] pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Sesiones Mundiales & Relojes de Apertura</span>
                </h3>
                <p className="text-xs text-neutral-400 font-medium">
                  Horarios de mayor liquidez, volumen y volatilidad para Day Trading
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Solapamiento Highlight */}
          <div className="p-3.5 rounded-xl border bg-gradient-to-br from-amber-950/60 via-neutral-900/90 to-neutral-950 border-amber-500/60 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Solapamiento Clave: Londres + Nueva York</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                  isLondonNYOverlap
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 animate-pulse'
                    : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                }`}
              >
                {isLondonNYOverlap ? '🔥 SOLAPAMIENTO ACTIVO EN VIVO' : 'FUERA DE SOLAPAMIENTO'}
              </span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Entre las <strong>13:30 y 16:30 BST</strong> (08:30 y 11:30 EDT) coinciden los mercados de Londres y Nueva York, concentrando el <strong>70% del volumen intradiario mundial</strong>. Momento ideal para confirmar rupturas de volumen y confluencias en 5m/15m.
            </p>
          </div>

          {/* Sessions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allSessions.map((session) => (
              <div
                key={session.id}
                className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                  session.status === 'OPEN'
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : session.status === 'PRE'
                    ? 'bg-amber-950/40 border-amber-500/60'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{session.flag}</span>
                    <span className="font-bold text-white text-sm">{session.name}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      session.status === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : session.status === 'PRE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {session.statusLabel}
                  </span>
                </div>

                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-xs text-neutral-400">Hora Local ({session.timeZoneCode}):</span>
                  <span className="text-sm font-black text-white">{session.currentTimeStr}</span>
                </div>

                <div className="text-[11px] text-neutral-300 bg-neutral-950/70 p-2 rounded-lg border border-neutral-800 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Apertura Oficial:</span>
                    <span className="font-bold text-amber-300 font-mono">{session.openLocalStr} ({session.openUtcStr})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cierre Oficial:</span>
                    <span className="font-bold text-neutral-200 font-mono">{session.closeLocalStr} ({session.closeUtcStr})</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-neutral-800/80">
                    <span>Estado:</span>
                    <span>{session.countdownLabel} {session.countdownStr}</span>
                  </div>
                </div>

                <p className="text-[10px] text-neutral-400 leading-tight">
                  {session.description}
                </p>
              </div>
            ))}
          </div>

          {/* Modal Footer */}
          <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              <span>Los mercados de futuros cripto operan 24/7, pero el volumen institucional reacciona directamente a estas aperturas.</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDetailsModal(false)}
              className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors shrink-0"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }
};
