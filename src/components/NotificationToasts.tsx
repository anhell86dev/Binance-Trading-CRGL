import React, { useState, useEffect } from 'react';
import { AlertTriangle, Bell, CheckCircle2, ShieldAlert, X, Zap } from 'lucide-react';
import { AppNotification, notificationService } from '../services/notifications';

export const NotificationToasts: React.FC = () => {
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsub = notificationService.subscribe(notifications => {
      // Keep only recent unread or latest 3 notifications for floating toast banner
      const recent = notifications.slice(0, 3);
      setToasts(recent);
    });
    return () => unsub();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3 rounded-xl border shadow-xl flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 ${
            toast.priority === 'urgent' || toast.type === 'SL_HIT'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : toast.type === 'EXECUTION' || toast.type === 'TP_HIT'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : toast.type === 'VOLATILITY'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : 'bg-neutral-900/90 border-neutral-700 text-neutral-200'
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

          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold">{toast.title}</h4>
            <p className="text-[11px] opacity-90 mt-0.5 leading-snug">{toast.message}</p>
            <span className="text-[9px] opacity-60 font-mono mt-1 block">
              {new Date(toast.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};
