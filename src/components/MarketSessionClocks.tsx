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
} from 'lucide-react';

interface MarketSessionInfo {
  name: string;
  city: string;
  timeZone: string;
  openUtcHour: number; // UTC hour
  openUtcMin: number;
  closeUtcHour: number;
  closeUtcMin: number;
  coreOpenLocal: string;
  coreCloseLocal: string;
  color: string;
}

export const MarketSessionClocks: React.FC<{
  compact?: boolean;
  className?: string;
}> = ({ compact = false, className = '' }) => {
  const [now, setNow] = useState<Date>(new Date());
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);

  useEffect(() => {
    // Update every second for live clocks
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

  // Convert current time to UTC minutes from midnight
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();
  const currentUtcMinutes = utcHours * 60 + utcMinutes;
  const currentDayOfWeek = now.getUTCDay(); // 0 = Sun, 6 = Sat

  // Check New York Session (13:30 - 20:00 UTC during EDT, or 14:30 - 21:00 UTC during EST)
  // New York standard equities/core futures: 09:30 - 16:00 NY Time (America/New_York)
  const getNYDetails = () => {
    const nyTimeStr = getTimeInZone('America/New_York');
    const [hStr, mStr, sStr] = nyTimeStr.split(':');
    const nyH = parseInt(hStr, 10) || 0;
    const nyM = parseInt(mStr, 10) || 0;
    const nyS = parseInt(sStr, 10) || 0;
    const nyTotalMins = nyH * 60 + nyM;

    const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6; // Sun or Sat
    const openMins = 9 * 60 + 30; // 09:30 NY Time
    const closeMins = 16 * 60; // 16:00 NY Time
    const preMarketMins = 4 * 60; // 04:00 NY Time

    let status: 'OPEN' | 'PRE' | 'CLOSED' = 'CLOSED';
    let countdownStr = '';
    let countdownLabel = '';

    if (!isWeekend) {
      if (nyTotalMins >= openMins && nyTotalMins < closeMins) {
        status = 'OPEN';
        const minsLeft = closeMins - nyTotalMins;
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        const s = 59 - nyS;
        countdownLabel = 'Cierra en';
        countdownStr = `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
      } else if (nyTotalMins >= preMarketMins && nyTotalMins < openMins) {
        status = 'PRE';
        const minsLeft = openMins - nyTotalMins;
        const h = Math.floor(minsLeft / 60);
        const m = minsLeft % 60;
        const s = 59 - nyS;
        countdownLabel = 'Abre en';
        countdownStr = `${h}h ${m}m ${s < 10 ? '0' : ''}${s}s`;
      } else {
        status = 'CLOSED';
        let minsUntilOpen = 0;
        if (nyTotalMins < preMarketMins) {
          minsUntilOpen = openMins - nyTotalMins;
        } else {
          // After 16:00
          minsUntilOpen = 24 * 60 - nyTotalMins + openMins;
        }
        const h = Math.floor(minsUntilOpen / 60);
        const m = minsUntilOpen % 60;
        countdownLabel = 'Abre en';
        countdownStr = `${h}h ${m}m`;
      }
    } else {
      status = 'CLOSED';
      countdownLabel = 'Fin de Semana';
      countdownStr = 'Abre Lunes 09:30';
    }

    return {
      time: nyTimeStr,
      date: getDayInZone('America/New_York'),
      status,
      countdownLabel,
      countdownStr,
      nyH,
      nyM,
      isWeekend,
    };
  };

  // Check London & Asia Sessions
  // London Session: 08:00 - 16:30 London Time (Europe/London)
  // Asia/Tokyo Session: 09:00 - 18:00 Tokyo Time (Asia/Tokyo) / 00:00 - 09:00 UTC
  const getLondonAsiaDetails = () => {
    const londonTimeStr = getTimeInZone('Europe/London');
    const tokyoTimeStr = getTimeInZone('Asia/Tokyo');

    const [lonHStr, lonMStr] = londonTimeStr.split(':');
    const lonH = parseInt(lonHStr, 10) || 0;
    const lonM = parseInt(lonMStr, 10) || 0;
    const lonTotalMins = lonH * 60 + lonM;

    const [tokHStr, tokMStr] = tokyoTimeStr.split(':');
    const tokH = parseInt(tokHStr, 10) || 0;
    const tokM = parseInt(tokMStr, 10) || 0;
    const tokTotalMins = tokH * 60 + tokM;

    const isWeekend = currentDayOfWeek === 0 || currentDayOfWeek === 6;

    // London hours: 08:00 - 16:30
    const lonOpen = 8 * 60;
    const lonClose = 16 * 60 + 30;
    const isLondonOpen = !isWeekend && lonTotalMins >= lonOpen && lonTotalMins < lonClose;

    // Tokyo hours: 09:00 - 18:00 (00:00 - 09:00 UTC)
    const tokOpen = 9 * 60;
    const tokClose = 18 * 60;
    const isTokyoOpen = !isWeekend && tokTotalMins >= tokOpen && tokTotalMins < tokClose;

    // Check overlap with NY (London 13:30 - 16:30 is NY 08:30 - 11:30 EDT, peak volume!)
    const nyDetails = getNYDetails();
    const isLondonNYOverlap = isLondonOpen && nyDetails.status === 'OPEN';

    let primaryStatusText = 'CERRADAS';
    let statusTheme: 'emerald' | 'amber' | 'cyan' | 'neutral' = 'neutral';

    if (isLondonNYOverlap) {
      primaryStatusText = '🔥 LONDRES + NY (MAX LIQUIDEZ)';
      statusTheme = 'amber';
    } else if (isLondonOpen) {
      primaryStatusText = 'LONDRES ABIERTO';
      statusTheme = 'emerald';
    } else if (isTokyoOpen) {
      primaryStatusText = 'ASIA / TOKIO ABIERTO';
      statusTheme = 'cyan';
    } else {
      // Countdown to next opening
      let minsToLon = 0;
      if (lonTotalMins < lonOpen) {
        minsToLon = lonOpen - lonTotalMins;
      } else {
        minsToLon = 24 * 60 - lonTotalMins + lonOpen;
      }
      const h = Math.floor(minsToLon / 60);
      const m = minsToLon % 60;
      primaryStatusText = isWeekend ? 'FIN DE SEMANA' : `Londres abre en ${h}h ${m}m`;
    }

    return {
      londonTime: londonTimeStr,
      londonDate: getDayInZone('Europe/London'),
      tokyoTime: tokyoTimeStr,
      tokyoDate: getDayInZone('Asia/Tokyo'),
      isLondonOpen,
      isTokyoOpen,
      isLondonNYOverlap,
      statusText: primaryStatusText,
      statusTheme,
    };
  };

  const ny = getNYDetails();
  const lonAsia = getLondonAsiaDetails();

  return (
    <>
      {/* Relojes Principales */}
      <div
        id="market-session-clocks-container"
        className={`flex items-center gap-1.5 sm:gap-2 select-none ${className}`}
      >
        {/* ========================================================================= */}
        {/* RELOJ 1: NUEVA YORK (Wall Street / NYSE / US Day Trading Session) */}
        {/* ========================================================================= */}
        <div
          onClick={() => setShowDetailsModal(true)}
          className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
            ny.status === 'OPEN'
              ? 'bg-gradient-to-r from-emerald-950/90 to-neutral-900/90 border-emerald-500/80 hover:border-emerald-400 hover:shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : ny.status === 'PRE'
              ? 'bg-gradient-to-r from-amber-950/80 to-neutral-900/90 border-amber-500/70 hover:border-amber-400'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
          }`}
          title="Sesión Nueva York (09:30 - 16:00 EDT). Clic para ver horarios mundiales y solapamientos."
        >
          {/* Icon & Pulse Indicator */}
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
                  {ny.status === 'OPEN' ? 'ABIERTA' : ny.status === 'PRE' ? 'PRE-MKT' : 'CERRADA'}
                </span>
              </span>
            </div>
          </div>

          {/* Time & Countdown */}
          <div className="flex flex-col items-end leading-tight font-mono">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-white tracking-tight">
                {ny.time}
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

        {/* ========================================================================= */}
        {/* RELOJ 2: LONDRES & ASIA (London / Tokyo / European & Asian Sessions) */}
        {/* ========================================================================= */}
        <div
          onClick={() => setShowDetailsModal(true)}
          className={`group flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
            lonAsia.isLondonNYOverlap
              ? 'bg-gradient-to-r from-amber-950/90 via-orange-950/60 to-neutral-900 border-amber-500/90 hover:border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse'
              : lonAsia.isLondonOpen
              ? 'bg-gradient-to-r from-sky-950/90 to-neutral-900/90 border-sky-500/80 hover:border-sky-400'
              : lonAsia.isTokyoOpen
              ? 'bg-gradient-to-r from-indigo-950/90 to-neutral-900/90 border-indigo-500/80 hover:border-indigo-400'
              : 'bg-neutral-900/90 border-neutral-800 hover:border-neutral-700'
          }`}
          title="Sesiones Londres (08:00-16:30 BST) & Asia/Tokio (09:00-18:00 JST). Clic para detalles."
        >
          {/* Icon & Pulse Indicator */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="relative flex h-2 w-2">
              {(lonAsia.isLondonOpen || lonAsia.isTokyoOpen) && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  lonAsia.isLondonNYOverlap
                    ? 'bg-amber-400'
                    : lonAsia.isLondonOpen
                    ? 'bg-sky-400'
                    : lonAsia.isTokyoOpen
                    ? 'bg-indigo-400'
                    : 'bg-neutral-500'
                }`}
              />
            </span>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase font-black tracking-wider text-neutral-400 group-hover:text-neutral-200 transition-colors flex items-center gap-1">
                <span>🇬🇧 LON / 🇯🇵 ASIA</span>
                {lonAsia.isLondonOpen && (
                  <span className="px-1 rounded text-[8px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                    LON
                  </span>
                )}
                {lonAsia.isTokyoOpen && (
                  <span className="px-1 rounded text-[8px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    ASIA
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Times & Status */}
          <div className="flex flex-col items-end leading-tight font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white tracking-tight" title="Hora Londres">
                {lonAsia.londonTime} <span className="text-[8px] text-neutral-400">LON</span>
              </span>
              <span className="text-neutral-600">|</span>
              <span className="hidden sm:inline text-xs font-bold text-neutral-300 tracking-tight" title="Hora Tokio/Asia">
                {lonAsia.tokyoTime} <span className="text-[8px] text-neutral-400">TOK</span>
              </span>
            </div>
            <span
              className={`text-[8px] font-bold tracking-tight truncate max-w-[140px] sm:max-w-[170px] ${
                lonAsia.isLondonNYOverlap
                  ? 'text-amber-300'
                  : lonAsia.isLondonOpen
                  ? 'text-sky-300'
                  : lonAsia.isTokyoOpen
                  ? 'text-indigo-300'
                  : 'text-neutral-400'
              }`}
            >
              {lonAsia.statusText}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL / POPUP: HORARIOS DE MERCADOS & SOLAPAMIENTOS DE DAY TRADING */}
      {/* ========================================================================= */}
      {showDetailsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="w-full max-w-xl bg-[#14181d] border border-[#2b3139] rounded-2xl p-5 sm:p-6 shadow-2xl text-neutral-200 flex flex-col gap-4 font-sans"
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
                className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sessions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Nueva York */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                  ny.status === 'OPEN'
                    ? 'bg-emerald-950/40 border-emerald-500/60'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🇺🇸</span>
                    <span className="font-bold text-white text-sm">Nueva York (NYSE / CME)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ny.status === 'OPEN'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : ny.status === 'PRE'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {ny.status === 'OPEN' ? 'ABIERTA' : ny.status === 'PRE' ? 'PRE-MKT' : 'CERRADA'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-xs text-neutral-400">Hora Local (EDT):</span>
                  <span className="text-sm font-black text-white">{ny.time}</span>
                </div>
                <div className="text-[11px] text-neutral-300 bg-neutral-950/70 p-2 rounded-lg border border-neutral-800 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Apertura Oficial:</span>
                    <span className="font-bold text-amber-300 font-mono">09:30 EDT (13:30 UTC)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cierre Oficial:</span>
                    <span className="font-bold text-neutral-200 font-mono">16:00 EDT (20:00 UTC)</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold pt-1 border-t border-neutral-800/80">
                    <span>Estado:</span>
                    <span>{ny.countdownLabel} {ny.countdownStr}</span>
                  </div>
                </div>
              </div>

              {/* Londres */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                  lonAsia.isLondonOpen
                    ? 'bg-sky-950/40 border-sky-500/60'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🇬🇧</span>
                    <span className="font-bold text-white text-sm">Londres (LSE / Forex)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lonAsia.isLondonOpen
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {lonAsia.isLondonOpen ? 'ABIERTA' : 'CERRADA'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-xs text-neutral-400">Hora Local (BST):</span>
                  <span className="text-sm font-black text-white">{lonAsia.londonTime}</span>
                </div>
                <div className="text-[11px] text-neutral-300 bg-neutral-950/70 p-2 rounded-lg border border-neutral-800 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Apertura Oficial:</span>
                    <span className="font-bold text-amber-300 font-mono">08:00 BST (07:00 UTC)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cierre Oficial:</span>
                    <span className="font-bold text-neutral-200 font-mono">16:30 BST (15:30 UTC)</span>
                  </div>
                  <div className="flex justify-between text-sky-300 font-semibold pt-1 border-t border-neutral-800/80">
                    <span>Volatilidad Europea:</span>
                    <span>{lonAsia.isLondonOpen ? 'Alta en progreso' : 'En espera'}</span>
                  </div>
                </div>
              </div>

              {/* Tokio / Asia */}
              <div
                className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                  lonAsia.isTokyoOpen
                    ? 'bg-indigo-950/40 border-indigo-500/60'
                    : 'bg-neutral-900/60 border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">🇯🇵</span>
                    <span className="font-bold text-white text-sm">Asia / Tokio (TSE / HK)</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      lonAsia.isTokyoOpen
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {lonAsia.isTokyoOpen ? 'ABIERTA' : 'CERRADA'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between font-mono">
                  <span className="text-xs text-neutral-400">Hora Local (JST):</span>
                  <span className="text-sm font-black text-white">{lonAsia.tokyoTime}</span>
                </div>
                <div className="text-[11px] text-neutral-300 bg-neutral-950/70 p-2 rounded-lg border border-neutral-800 flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Apertura Oficial:</span>
                    <span className="font-bold text-amber-300 font-mono">09:00 JST (00:00 UTC)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-400">Cierre Oficial:</span>
                    <span className="font-bold text-neutral-200 font-mono">18:00 JST (09:00 UTC)</span>
                  </div>
                </div>
              </div>

              {/* Solapamiento Clave */}
              <div className="p-3.5 rounded-xl border bg-gradient-to-br from-amber-950/50 via-neutral-900/90 to-neutral-950 border-amber-500/50 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Solapamiento Clave (Londres - NY)</span>
                </div>
                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Entre las <strong>13:30 y 16:30 BST</strong> (08:30 y 11:30 EDT) coinciden Londres y Nueva York, generando el <strong>70% del volumen intradía mundial</strong>. Momento idóneo para rupturas y confluencias en 5m/15m.
                </p>
                <div className="mt-auto flex items-center justify-between text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-1 rounded border border-amber-500/40">
                  <span>Estado actual:</span>
                  <span>{lonAsia.isLondonNYOverlap ? '🔥 SOLAPAMIENTO ACTIVO' : 'Fuera de solapamiento'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer Note */}
            <div className="text-[11px] text-neutral-400 bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Los mercados de criptomonedas operan 24/7, pero el volumen institucional reacciona directamente a estas aperturas.</span>
              </span>
              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="px-3 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold cursor-pointer transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
