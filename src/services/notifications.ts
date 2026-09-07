/**
 * Web Push & In-App Notification Service with Web Audio chime synthesis
 */

export interface AppNotification {
  id: string;
  type: 'EXECUTION' | 'VOLATILITY' | 'TP_HIT' | 'SL_HIT' | 'RATE_LIMIT' | 'SYSTEM' | 'CONFLUENCE_MATCH';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: {
    symbol?: string;
    strategyId?: string;
    side?: 'LONG' | 'SHORT' | 'BUY' | 'SELL';
    ratio?: number;
    price?: number;
    factors?: string[];
  };
}

class NotificationService {
  private listeners: ((notifications: AppNotification[]) => void)[] = [];
  private openWindowListeners: (() => void)[] = [];
  private notifications: AppNotification[] = [];
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public pushGranted: boolean = false;
  public confluenceSoundType: 'harmonic' | 'crystal' | 'radar' = 'harmonic';

  constructor() {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        this.pushGranted = Notification.permission === 'granted';
      }
      try {
        const savedSound = localStorage.getItem('binance_sound_alerts_enabled');
        if (savedSound !== null) {
          this.soundEnabled = savedSound === 'true';
        }
        const savedChime = localStorage.getItem('binance_confluence_chime_type');
        if (savedChime === 'harmonic' || savedChime === 'crystal' || savedChime === 'radar') {
          this.confluenceSoundType = savedChime;
        }

        // Cargar historial persistente de notificaciones consolidadas
        const savedNotifications = localStorage.getItem('binance_consolidated_notifications');
        if (savedNotifications) {
          const parsed = JSON.parse(savedNotifications);
          if (Array.isArray(parsed)) {
            this.notifications = parsed.slice(0, 100);
          }
        }
      } catch {}

      // Si no hay ninguna, sembrar una notificación inicial informativa de bienvenida
      if (this.notifications.length === 0) {
        this.notifications = [
          {
            id: `welcome-${Date.now()}`,
            type: 'SYSTEM',
            title: 'Centro de Notificaciones Consolidado Activo',
            message: 'Todas las alertas de TP, Stop Loss, ejecuciones de órdenes y confluencias 100% aparecerán consolidadas en este panel.',
            timestamp: Date.now(),
            read: false,
            priority: 'normal',
          },
        ];
      }
    }
  }

  public setSoundEnabled(enabled: boolean) {
    this.soundEnabled = enabled;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('binance_sound_alerts_enabled', String(enabled));
      }
    } catch {}
  }

  public setConfluenceSoundType(type: 'harmonic' | 'crystal' | 'radar') {
    this.confluenceSoundType = type;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('binance_confluence_chime_type', type);
      }
    } catch {}
  }

  public async requestPushPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      this.pushGranted = perm === 'granted';
      return this.pushGranted;
    } catch {
      return false;
    }
  }

  public hasPushPermission(): boolean {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }
    return Notification.permission === 'granted';
  }

  private initAudio() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public playChime(type: 'fill' | 'alert' | 'danger' | 'confluence' | 'harmonic' | 'crystal' | 'radar') {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      if (type === 'confluence' || type === 'harmonic' || type === 'crystal' || type === 'radar') {
        // High-definition 4-tone harmonic arpeggio chime for 100% Confluence match
        const tones =
          type === 'crystal'
            ? [659.25, 880.0, 1174.66, 1760.0] // E5 -> A5 -> D6 -> A6 (Bright crystal)
            : type === 'radar'
            ? [587.33, 739.99, 880.0, 1174.66] // D5 -> F#5 -> A5 -> D6 (Tactical radar)
            : [523.25, 659.25, 783.99, 1046.5]; // C5 -> E5 -> G5 -> C6 (Golden harmonic arpeggio)

        tones.forEach((freq, idx) => {
          if (!this.audioCtx) return;
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();

          osc.type = type === 'crystal' ? 'triangle' : 'sine';
          const startTime = now + idx * 0.08;
          const duration = 0.45;

          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.audioCtx.destination);

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
        return;
      }

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'fill') {
        // High harmonic double-beep for fill / profit
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'alert') {
        // Subtle bell chime for volatility
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.08); // A5
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
      } else {
        // Low cautionary beep for risk / SL
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.25);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      }
    } catch {
      // Ignore audio synthesis errors on autoplay policies
    }
  }

  public notify(
    type: AppNotification['type'],
    title: string,
    message: string,
    priority: AppNotification['priority'] = 'normal',
    metadata?: AppNotification['metadata']
  ) {
    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      priority,
      metadata,
    };

    this.notifications = [item, ...this.notifications.slice(0, 99)];
    this.notifyListeners();

    // Audio chime
    if (type === 'CONFLUENCE_MATCH') {
      this.playChime(this.confluenceSoundType || 'confluence');
    } else if (type === 'EXECUTION' || type === 'TP_HIT') {
      this.playChime('fill');
    } else if (type === 'VOLATILITY') {
      this.playChime('alert');
    } else if (type === 'SL_HIT' || priority === 'urgent') {
      this.playChime('danger');
    }

    // Native Browser Notification
    if (this.pushGranted && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: item.id,
          badge: '/favicon.ico',
          silent: !this.soundEnabled,
        });
      } catch {
        // fallback
      }
    }
  }

  /**
   * Dispatches a dedicated Confluence Match Alert (Sound + Browser Notification + Toast)
   */
  public notifyConfluenceMatch(params: {
    symbol: string;
    strategyId: string;
    strategyName: string;
    isLong: boolean;
    ratio: number;
    price: number;
    matchedFactorNames: string[];
    totalSelectedFactors: number;
  }) {
    const sideText = params.isLong ? 'LONG 📈' : 'SHORT 📉';
    const title = `🎯 100% Confluencia: ${params.symbol} (${sideText})`;
    const factorsSummary = params.matchedFactorNames.join(', ');
    const message = `Estrategia #${params.strategyId} (${params.strategyName}) validó ${params.matchedFactorNames.length}/${params.totalSelectedFactors} factores (${factorsSummary}) con Ratio R:B 1:${params.ratio.toFixed(1)} a $${params.price.toFixed(params.price < 10 ? 4 : 2)}.`;

    this.notify(
      'CONFLUENCE_MATCH',
      title,
      message,
      'high',
      {
        symbol: params.symbol,
        strategyId: params.strategyId,
        side: params.isLong ? 'LONG' : 'SHORT',
        ratio: params.ratio,
        price: params.price,
        factors: params.matchedFactorNames,
      }
    );
  }

  public getNotifications(): AppNotification[] {
    return this.notifications;
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  public markAsRead(id: string) {
    this.notifications = this.notifications.map(n => (n.id === id ? { ...n, read: true } : n));
    this.notifyListeners();
  }

  public markAsUnread(id: string) {
    this.notifications = this.notifications.map(n => (n.id === id ? { ...n, read: false } : n));
    this.notifyListeners();
  }

  public markAllRead() {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
    this.notifyListeners();
  }

  public dismiss(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  public clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }

  public openConsolidatedWindow() {
    this.openWindowListeners.forEach(cb => {
      try {
        cb();
      } catch {}
    });
  }

  public subscribeToOpenWindow(cb: () => void) {
    this.openWindowListeners.push(cb);
    return () => {
      this.openWindowListeners = this.openWindowListeners.filter(l => l !== cb);
    };
  }

  public subscribe(cb: (list: AppNotification[]) => void) {
    this.listeners.push(cb);
    cb(this.notifications);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'binance_consolidated_notifications',
          JSON.stringify(this.notifications.slice(0, 100))
        );
      }
    } catch {}

    this.listeners.forEach(cb => cb(this.notifications));
  }
}

export const notificationService = new NotificationService();
