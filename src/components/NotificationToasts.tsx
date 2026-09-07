import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, Sparkles, Target, X, Zap, ExternalLink } from 'lucide-react';
import { AppNotification, notificationService } from '../services/notifications';

export const NotificationToasts: React.FC = () => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = notificationService.subscribe(notifications => {
      // Keep only recent unread or latest 5 notifications that have not been dismissed locally
      setToasts(notifications.slice(0, 5));
    });
    return () => unsub();
  }, []);

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
    notificationService.dismiss(id);
  };

  const handleOpenConsolidated = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    notificationService.openConsolidatedWindow();
  };

  // Filter out any dismissed IDs
  const visibleToasts = toasts.filter(t => !dismissedIds.has(t.id)).slice(0, 3);

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
        >
          <Bell className="w-3 h-3 text-amber-400 group-hover:scale-110 transition-transform" />
          <span>Abrir Ventana Consolidada</span>
          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
        </button>
      </div>

      {visibleToasts.map(toast => {
        const isConfluence = toast.type === 'CONFLUENCE_MATCH';

        return (
          <div
            key={toast.id}
            onClick={() => {
              notificationService.markAsRead(toast.id);
              notificationService.openConsolidatedWindow();
            }}
            title="Haz clic para ver en la ventana de notificaciones consolidadas"
            className={`pointer-events-auto relative p-3 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 cursor-pointer hover:scale-[1.01] ${
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
              <div className="flex items-center justify-between mt-1 text-[9px] opacity-70 font-mono">
                <span>{new Date(toast.timestamp).toLocaleTimeString()}</span>
                <span className="text-amber-300/80 hover:underline">Ver detalle ↗</span>
              </div>
            </div>

            {/* Close button with X */}
            <button
              id={`dismiss-toast-${toast.id}`}
              onClick={(e) => handleDismiss(toast.id, e)}
              className="absolute top-2 right-2 p-1 rounded-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar notificación"
              aria-label="Cerrar notificación"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};


