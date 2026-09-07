import React, { useState, useEffect, useMemo } from 'react';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Filter,
  Layers,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  X,
  Zap,
  Radio,
  Clock,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { AppNotification, notificationService } from '../services/notifications';

interface ConsolidatedNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTrades?: (symbol?: string) => void;
  onNavigateToTerminal?: (symbol?: string) => void;
}

type NotificationCategoryFilter = 'ALL' | 'TRADES' | 'CONFLUENCE' | 'ALERTS' | 'SYSTEM';

export const ConsolidatedNotificationsModal: React.FC<ConsolidatedNotificationsModalProps> = ({
  isOpen,
  onClose,
  onNavigateToTrades,
  onNavigateToTerminal,
}) => {
  const [notifications, setNotifications] = useState<AppNotification[]>(() =>
    notificationService.getNotifications()
  );
  const [activeCategory, setActiveCategory] = useState<NotificationCategoryFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(notificationService.soundEnabled);
  const [confluenceSound, setConfluenceSound] = useState<'harmonic' | 'crystal' | 'radar'>(
    notificationService.confluenceSoundType
  );
  const [pushGranted, setPushGranted] = useState(notificationService.pushGranted);

  useEffect(() => {
    const unsub = notificationService.subscribe((list) => {
      setNotifications(list);
      setPushGranted(notificationService.hasPushPermission());
    });
    return () => unsub();
  }, []);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Counts by category
  const counts = useMemo(() => {
    let unread = 0;
    let trades = 0;
    let confluence = 0;
    let alerts = 0;
    let system = 0;

    notifications.forEach((n) => {
      if (!n.read) unread++;
      if (n.type === 'EXECUTION' || n.type === 'TP_HIT' || n.type === 'SL_HIT') trades++;
      else if (n.type === 'CONFLUENCE_MATCH') confluence++;
      else if (n.type === 'VOLATILITY' || n.type === 'RATE_LIMIT') alerts++;
      else system++;
    });

    return {
      all: notifications.length,
      unread,
      trades,
      confluence,
      alerts,
      system,
    };
  }, [notifications]);

  // Filtered list
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // 1. Unread filter
      if (onlyUnread && n.read) return false;

      // 2. Category filter
      if (activeCategory === 'TRADES') {
        if (n.type !== 'EXECUTION' && n.type !== 'TP_HIT' && n.type !== 'SL_HIT') return false;
      } else if (activeCategory === 'CONFLUENCE') {
        if (n.type !== 'CONFLUENCE_MATCH') return false;
      } else if (activeCategory === 'ALERTS') {
        if (n.type !== 'VOLATILITY' && n.type !== 'RATE_LIMIT' && n.type !== 'SL_HIT') return false;
      } else if (activeCategory === 'SYSTEM') {
        if (n.type !== 'SYSTEM') return false;
      }

      // 3. Search query filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(query);
        const matchesMsg = n.message.toLowerCase().includes(query);
        const matchesSymbol = n.metadata?.symbol?.toLowerCase().includes(query);
        const matchesStrat = n.metadata?.strategyId?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesMsg && !matchesSymbol && !matchesStrat) {
          return false;
        }
      }

      return true;
    });
  }, [notifications, activeCategory, onlyUnread, searchTerm]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    notificationService.setSoundEnabled(next);
    if (next) notificationService.playChime('fill');
  };

  const handleSoundTypeChange = (type: 'harmonic' | 'crystal' | 'radar') => {
    setConfluenceSound(type);
    notificationService.setConfluenceSoundType(type);
    notificationService.playChime(type);
  };

  const handleRequestPush = async () => {
    const granted = await notificationService.requestPushPermission();
    setPushGranted(granted);
    if (granted) {
      notificationService.notify(
        'SYSTEM',
        'Notificaciones de Escritorio Habilitadas',
        'Recibirás alertas inmediatas de confluencias 100% y cambios de TP/SL en segundo plano.',
        'normal'
      );
    }
  };

  const handleMarkAllRead = () => {
    notificationService.markAllRead();
  };

  const handleClearAll = () => {
    if (confirm('¿Deseas vaciar todo el historial consolidado de notificaciones?')) {
      notificationService.clearAll();
    }
  };

  const handleItemClick = (n: AppNotification) => {
    if (!n.read) {
      notificationService.markAsRead(n.id);
    }
  };

  const handleCreateTestNotification = () => {
    const testTypes: AppNotification['type'][] = ['CONFLUENCE_MATCH', 'TP_HIT', 'VOLATILITY', 'EXECUTION'];
    const randomType = testTypes[Math.floor(Math.random() * testTypes.length)];

    if (randomType === 'CONFLUENCE_MATCH') {
      notificationService.notifyConfluenceMatch({
        symbol: 'BTCUSDT',
        strategyId: '07',
        strategyName: 'Order Flow Breakdown',
        isLong: true,
        ratio: 4.2,
        price: 94250,
        matchedFactorNames: ['EMA 20/50/200 Trend', 'VPVR High Volume Node', 'RSI Bullish Hidden Divergence'],
        totalSelectedFactors: 3,
      });
    } else if (randomType === 'TP_HIT') {
      notificationService.notify(
        'TP_HIT',
        '🎯 Take Profit 1 Alcanzado: ETHUSDT',
        'La posición en ETHUSDT completó el hito TP1 a $2,840.50 (+3.42% ganancia asegurada). SL movido a Breakeven.',
        'high',
        { symbol: 'ETHUSDT', side: 'LONG', price: 2840.5 }
      );
    } else if (randomType === 'VOLATILITY') {
      notificationService.notify(
        'VOLATILITY',
        '⚡ Alerta de Volatilidad: SOLUSDT',
        'Spike de volumen del +180% en vela de 5m con rotura de rango de liquidación.',
        'normal',
        { symbol: 'SOLUSDT', price: 182.4 }
      );
    } else {
      notificationService.notify(
        'EXECUTION',
        '🟢 Orden Límite Completada: BTCUSDT',
        'Se ejecutó la orden de entrada E1 a $93,800.00 con apalancamiento 5x.',
        'normal',
        { symbol: 'BTCUSDT', side: 'LONG', price: 93800 }
      );
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return 'Hace unos segundos';
    const min = Math.floor(sec / 60);
    if (min < 60) return `Hace ${min} min`;
    const hours = Math.floor(min / 60);
    if (hours < 24) return `Hace ${hours} h`;
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div
      id="consolidated-notifications-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#14181d] border border-[#2b3139] rounded-2xl shadow-2xl text-neutral-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* 1. MODAL HEADER */}
        {/* ========================================================================= */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-[#242932] bg-[#111418] shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              {counts.unread > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black font-mono shadow-sm animate-pulse">
                  {counts.unread}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  Notificaciones Consolidadas
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 text-[11px] font-mono font-semibold border border-neutral-700">
                  {counts.all} total
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Historial unificado de ejecuciones, hitos TP/SL, confluencias 100% y avisos del sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick sound toggle */}
            <button
              type="button"
              id="btn-notif-modal-toggle-sound"
              onClick={handleToggleSound}
              className={`p-2 rounded-lg border transition-all cursor-pointer ${
                soundEnabled
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700'
              }`}
              title={soundEnabled ? 'Audio habilitado' : 'Audio silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              id="btn-close-notif-modal"
              onClick={onClose}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Cerrar ventana"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. AUDIO & PUSH BANNER / CONTROLS */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0e1115] border-b border-[#242932] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-neutral-400 font-medium flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-400" />
              <span>Timbre de confluencia:</span>
            </span>
            <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded-lg p-0.5">
              {(['harmonic', 'crystal', 'radar'] as const).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => handleSoundTypeChange(tone)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer capitalize ${
                    confluenceSound === tone
                      ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                      : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800'
                  }`}
                >
                  {tone === 'harmonic' ? 'Armónico' : tone === 'crystal' ? 'Cristal' : 'Radar'}
                </button>
              ))}
            </div>

            {!pushGranted && (
              <button
                type="button"
                id="btn-notif-request-push"
                onClick={handleRequestPush}
                className="px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Habilitar notificaciones nativas del navegador"
              >
                <Bell className="w-3 h-3" />
                <span>Activar en Escritorio</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreateTestNotification}
              className="text-[11px] text-amber-400/90 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              title="Generar una notificación de prueba para comprobar el audio y panel"
            >
              <Sparkles className="w-3 h-3" />
              <span>Generar prueba</span>
            </button>
            <span className="text-neutral-600">•</span>
            <button
              type="button"
              id="btn-mark-all-read"
              onClick={handleMarkAllRead}
              disabled={counts.unread === 0}
              className="text-[11px] text-neutral-300 hover:text-emerald-400 disabled:opacity-40 disabled:hover:text-neutral-300 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Marcar todas leídas</span>
            </button>
            <span className="text-neutral-600">•</span>
            <button
              type="button"
              id="btn-clear-all-notifications"
              onClick={handleClearAll}
              disabled={notifications.length === 0}
              className="text-[11px] text-neutral-400 hover:text-rose-400 disabled:opacity-40 disabled:hover:text-neutral-400 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. FILTERS & SEARCH TOOLBAR */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#242932] bg-[#14181d] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'ALL'
                  ? 'bg-amber-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              <span>Todas</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'ALL' ? 'bg-neutral-950 text-amber-300' : 'bg-neutral-900 text-neutral-400'
              }`}>
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('TRADES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'TRADES'
                  ? 'bg-emerald-500 text-neutral-950 shadow-md'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              <span>Trades & Órdenes</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'TRADES' ? 'bg-neutral-950 text-emerald-300' : 'bg-neutral-900 text-neutral-400'
              }`}>
                {counts.trades}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('CONFLUENCE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'CONFLUENCE'
                  ? 'bg-amber-400 text-neutral-950 shadow-md'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Confluencias</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'CONFLUENCE' ? 'bg-neutral-950 text-amber-300' : 'bg-neutral-900 text-neutral-400'
              }`}>
                {counts.confluence}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveCategory('ALERTS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                activeCategory === 'ALERTS'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-700 hover:text-white'
              }`}
            >
              <span>Alertas & Volatilidad</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeCategory === 'ALERTS' ? 'bg-neutral-950 text-rose-300' : 'bg-neutral-900 text-neutral-400'
              }`}>
                {counts.alerts}
              </span>
            </button>
          </div>

          {/* Search and Unread Toggle */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por par, estrategia..."
                className="w-full bg-[#0d1013] border border-[#2b3139] rounded-lg py-1.5 pl-8 pr-7 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/60"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-neutral-400 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setOnlyUnread(!onlyUnread)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                onlyUnread
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                  : 'bg-neutral-800/80 text-neutral-400 border-neutral-700 hover:text-neutral-200'
              }`}
              title="Mostrar solo notificaciones sin leer"
            >
              <span className={`w-2 h-2 rounded-full ${onlyUnread ? 'bg-amber-400' : 'bg-neutral-500'}`} />
              <span>No leídas ({counts.unread})</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. NOTIFICATIONS CONSOLIDATED LIST */}
        {/* ========================================================================= */}
        <div className="flex-1 min-h-[320px] max-h-[58vh] overflow-y-auto p-4 sm:p-6 space-y-2.5 bg-[#0f1216]">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 border border-neutral-700/80 flex items-center justify-center text-neutral-500 mb-3 shadow-inner">
                <Bell className="w-7 h-7 text-neutral-500" />
              </div>
              <h3 className="text-sm font-bold text-neutral-300">
                No hay notificaciones en este filtro
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mt-1">
                {searchTerm
                  ? `No se encontraron coincidencias para "${searchTerm}".`
                  : onlyUnread
                  ? 'Todas tus notificaciones están al día.'
                  : 'Las alertas de órdenes, confluencias del 100% y cambios de mercado se irán consolidando aquí.'}
              </p>
              <button
                type="button"
                onClick={handleCreateTestNotification}
                className="mt-4 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Generar notificación de prueba
              </button>
            </div>
          ) : (
            filteredNotifications.map((n) => {
              const isConfluence = n.type === 'CONFLUENCE_MATCH';
              const isTradeFill = n.type === 'EXECUTION' || n.type === 'TP_HIT';
              const isDanger = n.type === 'SL_HIT' || n.priority === 'urgent';
              const isVolatility = n.type === 'VOLATILITY';

              return (
                <div
                  key={n.id}
                  id={`notif-card-${n.id}`}
                  onClick={() => handleItemClick(n)}
                  className={`group relative p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                    !n.read
                      ? isConfluence
                        ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-900 border-emerald-500/50 shadow-md ring-1 ring-emerald-500/20'
                        : isDanger
                        ? 'bg-gradient-to-r from-rose-950/40 via-neutral-900 to-neutral-900 border-rose-500/50 shadow-md ring-1 ring-rose-500/20'
                        : isTradeFill
                        ? 'bg-gradient-to-r from-emerald-950/30 via-neutral-900 to-neutral-900 border-emerald-500/40 shadow-md'
                        : 'bg-neutral-850 border-amber-500/40 shadow-md ring-1 ring-amber-500/20'
                      : 'bg-[#14181d] hover:bg-[#181d24] border-neutral-800/80 text-neutral-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon container */}
                    <div className="mt-0.5 shrink-0">
                      {isConfluence ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow-xs">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                        </div>
                      ) : isDanger ? (
                        <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shadow-xs">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                      ) : isTradeFill ? (
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xs">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : isVolatility ? (
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-xs">
                          <Zap className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-xs">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="No leída" />
                        )}

                        <span className="text-xs sm:text-sm font-bold text-white leading-tight">
                          {n.title}
                        </span>

                        {isConfluence && (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-400 text-neutral-950 text-[10px] font-black tracking-wide">
                            100% CUMPLIDO
                          </span>
                        )}

                        {n.metadata?.symbol && (
                          <span className="px-1.5 py-0.2 rounded bg-neutral-800 border border-neutral-700 text-amber-300 font-mono text-[10px] font-bold">
                            {n.metadata.symbol}
                          </span>
                        )}

                        {n.metadata?.side && (
                          <span
                            className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-extrabold ${
                              n.metadata.side === 'LONG' || n.metadata.side === 'BUY'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : 'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}
                          >
                            {n.metadata.side}
                          </span>
                        )}

                        {n.metadata?.ratio && (
                          <span className="px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono text-[10px]">
                            R:B 1:{n.metadata.ratio.toFixed(1)}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-neutral-300 leading-relaxed break-words">
                        {n.message}
                      </p>

                      {/* Factors list if confluence match */}
                      {n.metadata?.factors && n.metadata.factors.length > 0 && (
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-neutral-400 font-medium">Factores:</span>
                          {n.metadata.factors.map((factor, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-[10px] font-medium"
                            >
                              ✓ {factor}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Footer info & Action buttons */}
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-neutral-800/60 text-[11px] text-neutral-400 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-neutral-500" />
                            {formatRelativeTime(n.timestamp)}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-neutral-500">
                            {new Date(n.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {n.metadata?.symbol && onNavigateToTrades && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToTrades(n.metadata?.symbol);
                                onClose();
                              }}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Ver posición y órdenes en Gestión de Trades"
                            >
                              <Layers className="w-3 h-3 text-amber-400" />
                              <span>Ver en Trades</span>
                            </button>
                          )}

                          {n.metadata?.symbol && onNavigateToTerminal && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigateToTerminal(n.metadata?.symbol);
                                onClose();
                              }}
                              className="px-2 py-0.5 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white border border-neutral-700 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              title="Abrir gráfico y boleta en Terminal"
                            >
                              <ExternalLink className="w-3 h-3 text-cyan-400" />
                              <span>Terminal</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (n.read) {
                                notificationService.markAsUnread(n.id);
                              } else {
                                notificationService.markAsRead(n.id);
                              }
                            }}
                            className="px-1.5 py-0.5 rounded text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                            title={n.read ? 'Marcar como no leída' : 'Marcar como leída'}
                          >
                            {n.read ? 'No leída' : 'Leída'}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              notificationService.dismiss(n.id);
                            }}
                            className="p-1 rounded text-neutral-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. MODAL FOOTER */}
        {/* ========================================================================= */}
        <div className="px-4 sm:px-6 py-3 border-t border-[#242932] bg-[#111418] flex items-center justify-between text-xs text-neutral-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Consolidación en vivo activa vía WebSocket FAPI</span>
          </div>

          <button
            type="button"
            id="btn-close-notif-footer"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar ventana
          </button>
        </div>
      </div>
    </div>
  );
};
