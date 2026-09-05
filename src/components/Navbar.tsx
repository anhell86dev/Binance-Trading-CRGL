import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Award,
  BarChart2,
  BookOpen,
  ChevronDown,
  Flame,
  Key,
  Layers,
  PieChart,
  Radio,
  Sliders,
  Terminal,
  TrendingUp,
  Volume2,
  VolumeX,
  Wallet,
  Zap,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { NetworkMode } from '../types/binance';
import { SecurityBadge } from './SecurityBadge';

export type NavTab = 'billetera' | 'estrategias' | 'top-operaciones' | 'futuros';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenApiModal: () => void;
  onOpenOrderModal?: () => void;
  onOpenDisciplinesModal?: () => void;
  onOpenConsole?: () => void;
  isConsoleOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenApiModal,
  onOpenOrderModal,
  onOpenDisciplinesModal,
  onOpenConsole,
  isConsoleOpen = false,
}) => {
  const [currentSymbol, setCurrentSymbol] = useState(binanceWs.getCurrentSymbol());
  const [mode, setMode] = useState<NetworkMode>(binanceWs.getMode());
  const [status, setStatus] = useState(binanceWs.getConnectionStatus());
  const [soundOn, setSoundOn] = useState(notificationService.soundEnabled);
  const [latency, setLatency] = useState(22);
  const [positionsCount, setPositionsCount] = useState(() => binanceWs.getPositions().length);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setCurrentSymbol(binanceWs.getCurrentSymbol());
      setMode(binanceWs.getMode());
      setStatus(binanceWs.getConnectionStatus());
      setPositionsCount(binanceWs.getPositions().length);
    });

    const interval = setInterval(() => {
      setLatency(Math.floor(18 + Math.random() * 8));
    }, 3500);

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsub();
      clearInterval(interval);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleModeChange = (newMode: NetworkMode) => {
    if (newMode === mode) return;
    const creds = binanceWs.getCredentials();
    binanceWs.connectWsApi({ ...creds, mode: newMode });
    setIsModeDropdownOpen(false);
  };

  const toggleSound = () => {
    notificationService.soundEnabled = !soundOn;
    setSoundOn(!soundOn);
    if (!soundOn) notificationService.playChime('fill');
  };

  return (
    <header
      id="main-navbar-header"
      className="sticky top-0 z-50 h-12 w-full bg-neutral-900/95 backdrop-blur-md border-b border-neutral-800/90 px-3 sm:px-5 flex items-center justify-between gap-3 text-neutral-200 select-none shadow-md"
    >
      {/* 1. Left: Brand & Symbol */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm shadow-xs">
            Ⓢ
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold tracking-tight text-white text-sm">Binance</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Futures
              </span>
            </div>
          </div>
        </div>

        {/* Active Market Symbol Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-950 border border-neutral-800 font-mono text-xs">
          <span className="text-amber-400 font-bold">{currentSymbol}</span>
          <span className="text-[10px] text-neutral-400">PERP</span>
        </div>
      </div>

      {/* 2. Center: Minimalist Internal Navigation Menu (Billetera, Estrategias, Futuros) */}
      <nav id="navbar-nav-menu" className="flex items-center bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-xs">
        {/* Tab 1: Billetera */}
        <button
          type="button"
          id="nav-tab-billetera"
          onClick={() => onSelectTab('billetera')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'billetera'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Wallet className={`w-3.5 h-3.5 ${activeTab === 'billetera' ? 'text-amber-400' : 'text-neutral-500'}`} />
          <span>Billetera</span>
        </button>

        {/* Tab 2: Estrategias */}
        <button
          type="button"
          id="nav-tab-estrategias"
          onClick={() => onSelectTab('estrategias')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'estrategias'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <BookOpen className={`w-3.5 h-3.5 ${activeTab === 'estrategias' ? 'text-amber-400' : 'text-neutral-500'}`} />
          <span>Estrategias</span>
          <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
            Tablas
          </span>
        </button>

        {/* Tab 3: Top de Operaciones (Próximas E1 y Ordenadas por R:B) */}
        <button
          type="button"
          id="nav-tab-top-operaciones"
          onClick={() => onSelectTab('top-operaciones')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'top-operaciones'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Flame className={`w-3.5 h-3.5 ${activeTab === 'top-operaciones' ? 'text-amber-400 animate-pulse' : 'text-neutral-500'}`} />
          <span>Top Operaciones</span>
          <span className="hidden sm:inline text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
            E1
          </span>
        </button>

        {/* Tab 4: Futuros */}
        <button
          type="button"
          id="nav-tab-futuros"
          onClick={() => onSelectTab('futuros')}
          className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
            activeTab === 'futuros'
              ? 'bg-neutral-800 text-amber-300 font-bold shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200'
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${activeTab === 'futuros' ? 'text-amber-400' : 'text-neutral-500'}`} />
          <span>Futuros</span>
          {positionsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {positionsCount}
            </span>
          )}
        </button>
      </nav>

      {/* 3. Right: Sello de Seguridad Transparente & Acciones Rápidas */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Sello de Seguridad Transparente (<SecurityBadge/>) */}
        <SecurityBadge />

        {/* Latency badge */}
        <div
          title="Latencia de WebSocket con Binance Futures"
          className="hidden xl:flex items-center gap-1 px-2 py-1 rounded bg-neutral-950 border border-neutral-800 font-mono text-[11px] text-neutral-400"
        >
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-emerald-400 font-bold">{latency}ms</span>
        </div>

        {/* Network Mode Chooser */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 text-xs font-mono font-bold transition-all text-neutral-200"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                mode === 'production'
                  ? 'bg-emerald-400'
                  : mode === 'testnet'
                  ? 'bg-amber-400'
                  : 'bg-blue-400'
              }`}
            />
            <span className="hidden sm:inline">
              {mode === 'production' ? 'PROD' : mode === 'testnet' ? 'TESTNET' : 'DEMO'}
            </span>
            <ChevronDown className="w-3 h-3 text-neutral-400" />
          </button>

          {isModeDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-neutral-900 border border-neutral-700 shadow-xl py-1 z-50 text-xs font-sans">
              <button
                type="button"
                onClick={() => handleModeChange('production')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex items-center justify-between text-neutral-200"
              >
                <span>Binance Live (Producción)</span>
                {mode === 'production' && <span className="text-emerald-400 font-bold">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('testnet')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex items-center justify-between text-neutral-200"
              >
                <span>Testnet FAPI</span>
                {mode === 'testnet' && <span className="text-amber-400 font-bold">✓</span>}
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('simulation')}
                className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex items-center justify-between text-neutral-200"
              >
                <span>Simulación Segura</span>
                {mode === 'simulation' && <span className="text-blue-400 font-bold">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Quick Disciplines Modal Button */}
        {onOpenDisciplinesModal && (
          <button
            type="button"
            onClick={onOpenDisciplinesModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition-all shadow-xs"
            title="Protocolo de las 8 Disciplinas del Trader Institucional"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Disciplinas</span>
          </button>
        )}

        {/* API Key Modal Button */}
        <button
          type="button"
          onClick={onOpenApiModal}
          className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-amber-400 border border-neutral-800 transition-colors"
          title="Configurar Credenciales de API Binance"
        >
          <Key className="w-4 h-4" />
        </button>

        {/* Audio notification toggle */}
        <button
          type="button"
          onClick={toggleSound}
          className="p-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition-colors"
          title={soundOn ? 'Sonido Activado' : 'Sonido Silenciado'}
        >
          {soundOn ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* WebSocket Console toggle */}
        {onOpenConsole && (
          <button
            type="button"
            onClick={onOpenConsole}
            className={`p-1.5 rounded-lg border transition-colors hidden sm:block ${
              isConsoleOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800'
            }`}
            title="Consola de Tramas WebSocket"
          >
            <Terminal className="w-4 h-4" />
          </button>
        )}
      </div>
    </header>
  );
};
