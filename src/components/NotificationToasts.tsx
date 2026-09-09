import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, Sparkles, Target, X, Zap, ExternalLink, Clock } from 'lucide-react';
import { AppNotification, notificationService } from '../services/notifications';

const TOAST_LIFETIME_MS = 10000; // 10 segundos

export const NotificationToasts: React.FC = () => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const unsub = notificationService.subscribe(notifications => {
      const now = Date.now();
      // Filtrar solo las notificaciones ocurridas en los últimos 10 segundos
      const freshToasts = notifications
        .filter(n => now - n.timestamp < TOAST_LIFETIME_MS)
        .slice(0, 4);

      setToasts(freshToasts);

      // Programar auto-cierre a los 10 segundos exactos desde su aparición
      freshToasts.forEach(t => {
        if (!timersRef.current.has(t.id)) {
          const remainingMs = Math.max(100, TOAST_LIFETIME_MS - (now - t.timestamp));
          const timerId = window.setTimeout(() => {
            // Se quita de la pantalla pero se conserva intacta como NO LEÍDA en el centro de notificaciones
            setHiddenIds(prev => new Set(prev).add(t.id));
            timersRef.current.delete(t.id);
          }, remainingMs);
          timersRef.current.set(t.id, timerId);
        }
      });
    });

    return () => {
      unsub();
      timersRef.current.forEach(id => clearTimeout(id));
      timersRef.current.clear();
    };
  }, []);

  // Descartar solo de la vista emergente flotante, manteniendo la alerta como NO LEÍDA en el centro de notificaciones
  const handleDismissPopup = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHiddenIds(prev => new Set(prev).add(id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    // NOTA: NO llamamos a notificationService.dismiss(id) ni a markAsRead(id)
    // para asegurar que permanezca como 'no leída' en el centro de notificaciones.
  };

  const handleOpenConsolidated = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    notificationService.openConsolidatedWindow();
  };

  // Solo mostrar las que no han superado los 10 segundos y no han sido cerradas manualmente
  const now = Date.now();
  const visibleToasts = toasts.filter(t => !hiddenIds.has(t.id) && now - t.timestamp < TOAST_LIFETIME_MS).slice(0, 3);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {/* Botón flotante para abrir ventana consolidada */}
      <div className="flex justify-end pointer-events-auto mb-1">
        <button
          type="button"
          id="btn-toast-open-consolidated-window"
          onClick={handleOpenConsolidated}
          className="px-2.5 py-1 rounded-full bg-[#161a1e]/95 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 text-[11px] font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition-all cursor-pointer group"
          title="Abrir Centro de Notificaciones donde permanecen guardadas las alertas"
        >
          <Bell className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Centro de Notificaciones</span>
          <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
            {notificationService.getUnreadCount()}
          </span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </button>
      </div>

      {visibleToasts.map(toast => {
        const isConfluence = toast.type === 'CONFLUENCE_MATCH';
        const elapsed = Math.max(0, Math.min(10000, now - toast.timestamp));
        const remainingSeconds = Math.max(1, Math.ceil((TOAST_LIFETIME_MS - elapsed) / 1000));

        return (
          <div
            key={toast.id}
            onClick={() => {
              notificationService.markAsRead(toast.id);
              notificationService.openConsolidatedWindow();
            }}
            title="Haz clic para verla y marcarla como leída en la ventana consolidada"
            className={`pointer-events-auto relative p-3 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 cursor-pointer hover:scale-[1.01] overflow-hidden ${
              isConfluence
                ? 'bg-gradient-to-r from-neutral-900/95 via-emerald-950/90 to-neutral-900/95 border-emerald-400 text-emerald-100 shadow-[0_0_20px_rgba(52,211,153,0.35)] ring-1 ring-emerald-400/50'
                : toast.priority === 'urgent' || toast.type === 'SL_HIT'
                ? 'bg-rose-950/95 border-rose-800/80 text-rose-200 shadow-rose-950/40'
                : toast.type === 'EXECUTION' || toast.type === 'TP_HIT'
                ? 'bg-emerald-950/95 border-emerald-800/80 text-emerald-200 shadow-emerald-950/40'
                : toast.type === 'VOLATILITY'
                ? 'bg-amber-950/95 border-amber-800/80 text-amber-200 shadow-amber-950/40'
                : 'bg-neutral-900/95 border-neutral-700/80 text-neutral-200 shadow-black/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isConfluence ? (
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                </div>
              ) : toast.type === 'EXECUTION' || toast.type === 'TP_HIT' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : toast.type === 'VOLATILITY' ? (
                <Zap className="w-4 h-4 text-amber-400" />
              ) : toast.type === 'SL_HIT' || toast.priority === 'urgent' ? (
                <ShieldAlert className="w-4 h-4 text-rose-400" />
              ) : (
                <Bell className="w-4 h-4 text-blue-400" />
              )}
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
                {isConfluence && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-400 text-neutral-950 font-black">
                    100% CUMPLIDO
                  </span>
                )}
              </div>
              <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
              
              <div className="flex items-center justify-between mt-1.5 text-[9px] opacity-80 font-mono">
                <span className="flex items-center gap-1 text-amber-300/90 font-semibold">
                  <Clock className="w-2.5 h-2.5" />
                  <span>Auto-cierre en {remainingSeconds}s</span>
                </span>
                <span className="text-neutral-400">
                  Quedará como no leída en campana ↗
                </span>
              </div>
            </div>

            {/* Close button with X */}
            <button
              id={`dismiss-toast-${toast.id}`}
              onClick={(e) => handleDismissPopup(toast.id, e)}
              className="absolute top-2 right-2 p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar emergente (permanecerá no leída en el centro de notificaciones)"
              aria-label="Cerrar emergente"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Barra de progreso de 10 segundos */}
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
              <div
                className="h-full bg-amber-400/80 transition-all duration-300 ease-linear"
                style={{
                  width: `${Math.max(0, 100 - (elapsed / TOAST_LIFETIME_MS) * 100)}%`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};


