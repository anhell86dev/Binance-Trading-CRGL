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
  // Dynamic time indicators & 1-hour critical alerts
  isFirstHour: boolean;
  isLastHour: boolean;
  isCriticalHour: boolean;
  criticalHourLabel: string;
  elapsedStr: string;
  timeUntilCloseStr: string;
  timeUntilOpenStr: string;
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
    let countdownLabel = 'Falta para abrir';
    let countdownStr = '';
    let progressPct = 0;

    let isFirstHour = false;
    let isLastHour = false;
    let isCriticalHour = false;
    let criticalHourLabel = '';
    let elapsedStr = '';
    let timeUntilCloseStr = '';
    let timeUntilOpenStr = '';

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
        countdownLabel = 'Falta para cerrar';

        let minsLeft = 0;
        let totalDuration = 0;
        let elapsedMins = 0;

        if (!isOvernight) {
          minsLeft = closeMins - currentMins;
          totalDuration = closeMins - openMins;
          elapsedMins = currentMins - openMins;
        } else {
          totalDuration = 24 * 60 - openMins + closeMins;
          if (currentMins >= openMins) {
            elapsedMins = currentMins - openMins;
            minsLeft = 24 * 60 - currentMins + closeMins;
          } else {
            elapsedMins = 24 * 60 - openMins + currentMins;
            minsLeft = closeMins - currentMins;
          }
        }

        const hLeft = Math.floor(minsLeft / 60);
        const mLeft = minsLeft % 60;
        const sLeft = 59 - curS;
        countdownStr = `${hLeft}h ${mLeft}m ${sLeft < 10 ? '0' : ''}${sLeft}s`;
        timeUntilCloseStr = `${hLeft}h ${mLeft}m`;

        const hElapsed = Math.floor(elapsedMins / 60);
        const mElapsed = elapsedMins % 60;
        elapsedStr = `${hElapsed}h ${mElapsed}m`;

        progressPct = Math.min(100, Math.max(0, Math.round((elapsedMins / totalDuration) * 100)));

        // CRITICAL 1-HOUR RULE:
        // 1. First hour of opening (0 <= elapsedMins < 60) -> RED ALERT
        if (elapsedMins < 60) {
          isFirstHour = true;
          isCriticalHour = true;
          criticalHourLabel = '🚨 1ª HORA APERTURA (ALTA VOLATILIDAD)';
        }
        // 2. Last hour before closing (minsLeft <= 60 && minsLeft > 0) -> RED ALERT
        else if (minsLeft <= 60 && minsLeft > 0) {
          isLastHour = true;
          isCriticalHour = true;
          criticalHourLabel = '🚨 1H PARA EL CIERRE (BALANCING INSTITUCIONAL)';
        }
      } else if (isPreNow) {
        status = 'PRE';
        statusLabel = 'PRE-MERCADO';
        countdownLabel = 'Falta para abrir';
        const minsLeft = openMins - currentMins;
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        const s = 59 - curS;
        countdownStr = `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
        timeUntilOpenStr = `${h}h ${m}m`;
        progressPct = 0;
      } else {
        status = 'CLOSED';
        statusLabel = 'CERRADA';
        countdownLabel = 'Falta para abrir';

        let minsUntilOpen = 0;
        if (currentMins < openMins) {
          minsUntilOpen = openMins - currentMins;
        } else {
          minsUntilOpen = 24 * 60 - currentMins + openMins;
        }
        const h = Math.floor(minsUntilOpen / 60);
        const m = minsUntilOpen % 60;
        countdownStr = `${h}h ${m}m`;
        timeUntilOpenStr = `${h}h ${m}m`;
        progressPct = 0;
      }
    } else {
      status = 'CLOSED';
      statusLabel = 'FIN DE SEMANA';
      countdownLabel = 'Abre Lunes';
      countdownStr = `${openH < 10 ? '0' : ''}${openH}:${openM < 10 ? '0' : ''}${openM} ${timeZoneCode}`;
      timeUntilOpenStr = `Lunes ${openH < 10 ? '0' : ''}${openH}:${openM < 10 ? '0' : ''}${openM}`;
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
      isFirstHour,
      isLastHour,
      isCriticalHour,
      criticalHourLabel,
      elapsedStr,
      timeUntilCloseStr,
      timeUntilOpenStr,
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

  // Helper function to render a single session card with full red 1-hour rules
  const renderStackedCard = (session: MarketSessionDetail) => {
    const isOpen = session.status === 'OPEN';
    const isPre = session.status === 'PRE';
    const isCritical = session.isCriticalHour;

    return (
      <div
        key={session.id}
        id={`session-card-${session.id}`}
        onClick={() => {
          setSelectedSessionModal(session.id);
          setShowDetailsModal(true);
        }}
        className={`group relative p-3.5 rounded-xl border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
          isCritical
            ? 'bg-gradient-to-r from-rose-950/95 via-red-950/80 to-neutral-950 border-rose-500/90 shadow-[0_0_16px_rgba(244,63,94,0.35)] animate-pulse'
            : isOpen
            ? `bg-gradient-to-r ${session.accentGradient} border-emerald-500/70 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]`
            : isPre
            ? 'bg-gradient-to-r from-amber-950/70 via-neutral-900 to-neutral-950 border-amber-500/60 hover:border-amber-400'
            : 'bg-[#14181d] border-[#262c36] hover:border-neutral-700 hover:bg-[#181d24]'
        }`}
      >
        {/* Critical 1-Hour Banner if active */}
        {isCritical && (
          <div className="mb-2 px-2.5 py-1 rounded-md bg-rose-500/25 border border-rose-500/60 flex items-center justify-between">
            <span className="text-[10px] font-mono font-black text-rose-300 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
              {session.criticalHourLabel}
            </span>
            <span className="text-[9px] font-mono text-rose-200 font-bold bg-rose-900/80 px-1.5 py-0.2 rounded">
              {session.isFirstHour ? `Lleva: ${session.elapsedStr}` : `Cierra en: ${session.timeUntilCloseStr}`}
            </span>
          </div>
        )}

        {/* Top Row: Flag, Name, Exchange & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl leading-none">{session.flag}</span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-xs tracking-tight truncate ${isCritical ? 'text-rose-200' : 'text-white'}`}>
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
            <span className="relative flex h-2.5 w-2.5">
              {isCritical ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-90" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                </>
              ) : isOpen ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </>
              ) : isPre ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neutral-600" />
              )}
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                isCritical
                  ? 'bg-rose-500/25 text-rose-300 border-rose-500/60 animate-pulse'
                  : isOpen
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : isPre
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-neutral-800/80 text-neutral-400 border-neutral-700'
              }`}
            >
              {isCritical ? (session.isFirstHour ? '1ª HORA ROJO' : 'ÚLTIMA 1H ROJO') : session.statusLabel}
            </span>
          </div>
        </div>

        {/* Middle Row: Digital Live Clock & Timers */}
        <div className={`flex flex-col gap-2 p-2.5 rounded-lg border mb-2 ${
          isCritical ? 'bg-rose-950/40 border-rose-900/60' : 'bg-neutral-950/70 border-neutral-800/80'
        }`}>
          <div className="flex items-baseline justify-between">
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
                  isCritical
                    ? 'text-rose-400'
                    : isOpen
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

          {/* Time Elapsed and Time Remaining Indicators (when open) */}
          {isOpen && (
            <div className="pt-2 border-t border-neutral-800/80 grid grid-cols-2 gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Clock className={`w-3 h-3 ${isCritical && session.isFirstHour ? 'text-rose-400' : 'text-amber-400'}`} />
                <span className="text-neutral-400">Lleva abierta:</span>
                <span className={`font-bold ${isCritical && session.isFirstHour ? 'text-rose-300' : 'text-amber-300'}`}>
                  {session.elapsedStr}
                </span>
              </div>

              <div className="flex items-center justify-end gap-1.5 text-neutral-300">
                <span className="text-neutral-400">Falta cerrar:</span>
                <span className={`font-bold ${isCritical && session.isLastHour ? 'text-rose-300' : 'text-emerald-400'}`}>
                  {session.timeUntilCloseStr}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Session Progress Bar (when open) */}
        {isOpen && (
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex justify-between text-[9px] font-mono text-neutral-400">
              <span>Progreso de Sesión</span>
              <span className={`font-bold ${isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                {session.progressPct}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isCritical
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                }`}
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
  };

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

        {/* 2. TARJETAS INDIVIDUALES APILADAS VERTICALMENTE (Separadas: NY, Londres, Asia/Tokio, Sydney) */}
        <div className="flex flex-col gap-2.5">
          {allSessions.map((session) => renderStackedCard(session))}
        </div>

        {/* Global Modal for detailed session breakdown */}
        {showDetailsModal && renderModal()}
      </div>
    );
  }

  // =========================================================================
  // RENDER OPTION B: INLINE COMPACT (For Navbar with Separate London & Asia Clocks)
  // =========================================================================
  const renderInlineClock = (session: MarketSessionDetail, shortName: string) => {
    const isOpen = session.status === 'OPEN';
    const isPre = session.status === 'PRE';
    const isCritical = session.isCriticalHour;

    return (
      <div
        key={session.id}
        onClick={() => {
          setSelectedSessionModal(session.id);
          setShowDetailsModal(true);
        }}
        className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
          isCritical
            ? 'bg-gradient-to-r from-rose-950/95 to-neutral-900/90 border-rose-500/90 hover:border-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse'
            : isOpen
            ? 'bg-gradient-to-r from-emerald-950/90 to-neutral-900/90 border-emerald-500/80 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]'
            : isPre
            ? 'bg-gradient-to-r from-amber-950/80 to-neutral-900/90 border-amber-500/70 hover:border-amber-400'
            : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
        }`}
        title={`${session.name} (${session.openLocalStr} - ${session.closeLocalStr}). ${
          isCritical ? session.criticalHourLabel : isOpen ? `Lleva abierta: ${session.elapsedStr} | Falta cerrar: ${session.timeUntilCloseStr}` : `Falta abrir: ${session.timeUntilOpenStr}`
        }`}
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="relative flex h-2 w-2">
            {isCritical ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-90" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
              </>
            ) : isOpen ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </>
            ) : isPre ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-neutral-500" />
            )}
          </span>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors flex items-center gap-1">
              <span>{session.flag} {shortName}</span>
              <span
                className={`px-1 rounded text-[8px] font-bold ${
                  isCritical
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse'
                    : isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : isPre
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {isCritical ? (session.isFirstHour ? '1ª HORA' : '1H CIERRE') : session.statusLabel}
              </span>
            </span>
          </div>
        </div>

        <div className="flex flex-col items-end leading-tight font-mono">
          <div className="flex items-center gap-1">
            <span className="text-xs font-black text-white tracking-tight">
              {session.currentTimeStr}
            </span>
            <span className="text-[8px] text-neutral-400 font-bold">{session.timeZoneCode}</span>
          </div>
          <span
            className={`text-[8px] font-bold tracking-tight truncate max-w-[130px] ${
              isCritical
                ? 'text-rose-400 font-black'
                : isOpen
                ? 'text-emerald-400'
                : isPre
                ? 'text-amber-400'
                : 'text-neutral-400'
            }`}
          >
            {isOpen
              ? session.isFirstHour
                ? `🔴 Abierta hace ${session.elapsedStr}`
                : session.isLastHour
                ? `🔴 Cierra en ${session.timeUntilCloseStr}`
                : `Abierta ${session.elapsedStr}`
              : `Abre en ${session.timeUntilOpenStr}`}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        id="market-session-clocks-container"
        className={`flex items-center gap-1.5 sm:gap-2 select-none ${className}`}
      >
        {/* RELOJ 1: NUEVA YORK */}
        {renderInlineClock(ny, 'NY')}

        {/* RELOJ 2: LONDRES (SEPARADO) */}
        {renderInlineClock(london, 'LON')}

        {/* RELOJ 3: ASIA / TOKIO (SEPARADO) */}
        {renderInlineClock(tokyo, 'ASIA')}
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
                  Horarios de mayor liquidez, volumen y regla crítica de alerta en rojo para la 1ª hora y última 1 hora
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

          {/* Regla de Alerta en Rojo Explicativa */}
          <div className="p-3.5 rounded-xl border bg-rose-950/40 border-rose-500/50 flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <Flame className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Regla Institucional: Alerta en Rojo (1ª Hora de Apertura y Última Hora de Cierre)</span>
            </div>
            <p className="text-[11px] text-neutral-300 leading-relaxed">
              Cuando una bolsa <strong>lleva abierta su primera hora</strong>, los relojes se iluminan en <strong className="text-rose-400">ROJO</strong> debido a la ejecución agresiva de órdenes institucionales y alta volatilidad. Del mismo modo, si <strong>falta menos de 1 hora para su cierre</strong>, se activa la alerta en <strong className="text-rose-400">ROJO</strong> por fijación de precios (Fixing) y liquidación de posiciones intradiarias.
            </p>
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
                  session.isCriticalHour
                    ? 'bg-rose-950/50 border-rose-500/80 shadow-[0_0_10px_rgba(244,63,94,0.25)]'
                    : session.status === 'OPEN'
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
                      session.isCriticalHour
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse'
                        : session.status === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : session.status === 'PRE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {session.isCriticalHour ? session.criticalHourLabel : session.statusLabel}
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

                  {session.status === 'OPEN' ? (
                    <>
                      <div className="flex justify-between text-amber-300 font-semibold pt-1 border-t border-neutral-800/80">
                        <span>Lleva abierta:</span>
                        <span className="font-mono font-bold">{session.elapsedStr}</span>
                      </div>
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Falta para cerrar:</span>
                        <span className="font-mono font-bold">{session.timeUntilCloseStr}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-neutral-300 font-semibold pt-1 border-t border-neutral-800/80">
                      <span>Falta para abrir:</span>
                      <span className="font-mono font-bold text-amber-300">{session.timeUntilOpenStr}</span>
                    </div>
                  )}
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

