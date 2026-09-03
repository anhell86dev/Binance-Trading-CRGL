/**
 * Web Push & In-App Notification Service with Web Audio chime synthesis
 */

export interface AppNotification {
  id: string;
  type: 'EXECUTION' | 'VOLATILITY' | 'TP_HIT' | 'SL_HIT' | 'RATE_LIMIT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

class NotificationService {
  private listeners: ((notifications: AppNotification[]) => void)[] = [];
  private notifications: AppNotification[] = [];
  private audioCtx: AudioContext | null = null;
  public soundEnabled: boolean = true;
  public pushGranted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      this.pushGranted = Notification.permission === 'granted';
    }
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

  public playChime(type: 'fill' | 'alert' | 'danger') {
    if (!this.soundEnabled) return;
    try {
      this.initAudio();
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      const now = this.audioCtx.currentTime;
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
    priority: AppNotification['priority'] = 'normal'
  ) {
    const item: AppNotification = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type,
      title,
      message,
      timestamp: Date.now(),
      read: false,
      priority,
    };

    this.notifications = [item, ...this.notifications.slice(0, 49)];
    this.notifyListeners();

    // Audio chime
    if (type === 'EXECUTION' || type === 'TP_HIT') {
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
        });
      } catch {
        // fallback
      }
    }
  }

  public getNotifications(): AppNotification[] {
    return this.notifications;
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

  public subscribe(cb: (list: AppNotification[]) => void) {
    this.listeners.push(cb);
    cb(this.notifications);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(cb => cb(this.notifications));
  }
}

export const notificationService = new NotificationService();
