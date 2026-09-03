import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, X, Zap } from 'lucide-react';
import { AppNotification, notificationService } from '../services/notifications';

export const NotificationToasts: React.FC = () => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsub = notificationService.subscribe(notifications => {
      // Keep only recent unread or latest 4 notifications that have not been dismissed locally
      setToasts(notifications.slice(0, 5));
    });
    return () => unsub();
  }, []);

  const handleDismiss = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
    notificationService.dismiss(id);
  };

  // Filter out any dismissed IDs
  const visibleToasts = toasts.filter(t => !dismissedIds.has(t.id)).slice(0, 3);

  if (visibleToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {visibleToasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto relative p-3 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
            toast.priority === 'urgent' || toast.type === 'SL_HIT'
              ? 'bg-rose-950/95 border-rose-800/80 text-rose-200 shadow-rose-950/40'
              : toast.type === 'EXECUTION' || toast.type === 'TP_HIT'
              ? 'bg-emerald-950/95 border-emerald-800/80 text-emerald-200 shadow-emerald-950/40'
              : toast.type === 'VOLATILITY'
              ? 'bg-amber-950/95 border-amber-800/80 text-amber-200 shadow-amber-950/40'
              : 'bg-neutral-900/95 border-neutral-700/80 text-neutral-200 shadow-black/50'
          }`}
        >
          <div className="mt-0.5 shrink-0">
            {toast.type === 'EXECUTION' || toast.type === 'TP_HIT' ? (
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
            <h4 className="text-xs font-bold leading-tight">{toast.title}</h4>
            <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            <span className="text-[9px] opacity-60 font-mono mt-1 block">
              {new Date(toast.timestamp).toLocaleTimeString()}
            </span>
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
      ))}
    </div>
  );
};
