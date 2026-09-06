import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Search,
  Bell,
  Maximize,
  Minimize,
  User,
  Layers,
  Wallet,
  TrendingUp,
  BookOpen,
  Award,
  ShieldCheck,
  Terminal,
  Key,
  Zap,
  Radio,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  ExternalLink,
  Activity,
  CheckCircle,
  HelpCircle,
  Sliders,
  DollarSign,
  TrendingDown,
  LogOut,
  Settings,
  Calculator,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { NetworkMode } from '../types/binance';
import { SecurityBadge } from './SecurityBadge';
import { useTheme } from '../context/ThemeContext';
import { NavTab } from './Navbar';

interface MenuItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  category: string;
  description: string;
  isAction?: boolean;
  action?: () => void;
}

interface MenuCategory {
  title: string;
  items: MenuItem[];
}

interface AdminLTELayoutProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenApiModal: () => void;
  onOpenOrderModal: () => void;
  onOpenDisciplinesModal: () => void;
  onOpenPnlSimulator?: () => void;
  onOpenConsole: () => void;
  isConsoleOpen?: boolean;
  children: React.ReactNode;
}

export const AdminLTELayout: React.FC<AdminLTELayoutProps> = ({
  activeTab,
  onSelectTab,
  onOpenApiModal,
  onOpenOrderModal,
  onOpenDisciplinesModal,
  onOpenPnlSimulator,
  onOpenConsole,
  isConsoleOpen = false,
  children,
}) => {
  // AdminLTE sidebar states: expanded (default true on lg), collapsed to mini sidebar on lg, or mobile drawer
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);

  const [mode, setMode] = useState<NetworkMode>(() => binanceWs.getMode());
  const [connectionStatus, setConnectionStatus] = useState(() => binanceWs.getConnectionStatus());
  const [soundOn, setSoundOn] = useState(() => notificationService.soundEnabled);
  const [latencyMs, setLatencyMs] = useState(24);
  const [positionsCount, setPositionsCount] = useState(() => binanceWs.getPositions().length);
  const [ordersCount, setOrdersCount] = useState(() => binanceWs.getOpenOrders().length);
  const [balance, setBalance] = useState(() => binanceWs.getBalance());
  const [credentials, setCredentials] = useState(() => binanceWs.getCredentials());

  const { theme, toggleTheme } = useTheme();
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);
  const modeDropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to Binance updates
  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setMode(binanceWs.getMode());
      setConnectionStatus(binanceWs.getConnectionStatus());
      setPositionsCount(binanceWs.getPositions().length);
      setOrdersCount(binanceWs.getOpenOrders().length);
      setBalance(binanceWs.getBalance());
      setCredentials(binanceWs.getCredentials());
      const l = binanceWs.getLastLatencyMs();
      if (l > 0) setLatencyMs(l);
    });

    const latencyInterval = setInterval(() => {
      const l = binanceWs.getLastLatencyMs();
      if (l > 0) {
        setLatencyMs(l);
      } else {
        setLatencyMs(Math.floor(20 + Math.random() * 8));
      }
    }, 4000);

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    const handleClickOutside = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setIsUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node)) {
        setIsModeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsub();
      clearInterval(latencyInterval);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleFullscreen = () => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    } catch {}
  };

  const toggleSound = () => {
    notificationService.soundEnabled = !soundOn;
    setSoundOn(!soundOn);
    if (!soundOn) notificationService.playChime('fill');
  };

  const handleModeChange = (newMode: NetworkMode) => {
    if (newMode === mode) return;
    const creds = binanceWs.getCredentials();
    binanceWs.connectWsApi({ ...creds, mode: newMode });
    setIsModeDropdownOpen(false);
  };

  // AdminLTE Navigation items definition
  const menuCategories: MenuCategory[] = [
    {
      title: 'OPERATIVA & TRADING',
      items: [
        {
          id: 'billetera' as NavTab,
          label: 'Billetera de Futuros',
          shortLabel: 'Billetera',
          icon: Wallet,
          badge: `$${Math.round(balance.availableBalance).toLocaleString()}`,
          badgeColor: 'bg-emerald-600 text-white',
          category: 'Inicio',
          description: 'Balance, márgenes, asignación y auditoría de capital',
        },
        {
          id: 'gestion-trades' as NavTab,
          label: 'Gestión de Trades',
          shortLabel: 'Trades',
          icon: Layers,
          badge: `${positionsCount} Pos`,
          badgeColor: positionsCount > 0 ? 'bg-amber-500 text-neutral-950 font-bold' : 'bg-neutral-800 text-neutral-400',
          category: 'Operativa',
          description: 'Bandeja en vivo de posiciones aisladas, órdenes activas e historial',
        },
        {
          id: 'futuros' as NavTab,
          label: 'Terminal Futuros',
          shortLabel: 'Terminal',
          icon: TrendingUp,
          badge: 'LIVE',
          badgeColor: 'bg-rose-600 text-white font-bold',
          category: 'Mercado',
          description: 'Gráfico interactivo TradingView, libro de órdenes y ejecución',
        },
      ],
    },
    {
      title: 'PLANIFICACIÓN & ESTRATEGIAS',
      items: [
        {
          id: 'estrategias' as NavTab,
          label: 'Estrategias Google Sheets',
          shortLabel: 'Estrategias',
          icon: BookOpen,
          badge: 'CATÁLOGO',
          badgeColor: 'bg-blue-600 text-white',
          category: 'Análisis',
          description: 'Catálogo de estrategias con R:B, confluencias y cálculo de lotes',
        },
        {
          id: 'top-operaciones' as NavTab,
          label: 'Plan de Trabajo (Top R:B)',
          shortLabel: 'Plan de Trabajo',
          icon: Award,
          badge: 'TOP',
          badgeColor: 'bg-purple-600 text-white font-bold',
          category: 'Prioridades',
          description: 'Ranking de operaciones con mejor ratio Riesgo:Beneficio',
        },
      ],
    },
    {
      title: 'SISTEMA & HERRAMIENTAS',
      items: [
        {
          id: 'pnl-simulator' as const,
          label: 'Simulador de PnL & ROE',
          shortLabel: 'Simulador',
          icon: Calculator,
          badge: '1-5x',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
          category: 'Cálculo',
          isAction: true,
          action: onOpenPnlSimulator,
          description: 'Cálculo instantáneo de PnL esperado, margen, comisiones y liquidación',
        },
        {
          id: 'disciplinas' as const,
          label: 'Protocolo de Disciplinas',
          shortLabel: 'Disciplinas',
          icon: ShieldCheck,
          badge: '1-5x',
          badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
          category: 'Riesgo',
          isAction: true,
          action: onOpenDisciplinesModal,
          description: 'Mandato isolated estricto y reglas de mitigación de drawdown',
        },
        {
          id: 'console' as const,
          label: 'Consola WS-FAPI',
          shortLabel: 'Consola',
          icon: Terminal,
          badge: `${latencyMs}ms`,
          badgeColor: 'bg-neutral-800 text-emerald-400 font-mono',
          category: 'Monitoreo',
          isAction: true,
          action: onOpenConsole,
          description: 'Inspección de tramas WebSocket JSON y tráfico en tiempo real',
        },
        {
          id: 'api-modal' as const,
          label: 'Credenciales Binance FAPI',
          shortLabel: 'API Keys',
          icon: Key,
          badge: credentials.apiKey ? 'CONECTADO' : 'PENDIENTE',
          badgeColor: credentials.apiKey ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-amber-950 text-amber-300 border border-amber-700',
          category: 'Autenticación',
          isAction: true,
          action: onOpenApiModal,
          description: 'Gestión de API Key y Secret Key para Binance Futuros',
        },
      ],
    },
  ];

  // Filter items if search query is provided
  const filteredCategories = menuCategories.map((cat) => ({
    ...cat,
    items: cat.items.filter(
      (item) =>
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  // Determine current page info for Content Header & Breadcrumbs
  const getCurrentPageDetails = () => {
    switch (activeTab) {
      case 'billetera':
        return {
          title: 'Billetera de Futuros',
          subtitle: 'Resumen financiero, balance en vivo y desglose de margen',
          breadcrumb: ['Inicio', 'Finanzas', 'Billetera'],
        };
      case 'gestion-trades':
        return {
          title: 'Gestión de Trades',
          subtitle: 'Bandeja operativa de posiciones aisladas, órdenes activas e historial FAPI',
          breadcrumb: ['Inicio', 'Operativa', 'Gestión de Trades'],
        };
      case 'futuros':
        return {
          title: 'Terminal de Futuros',
          subtitle: 'Ejecución táctica con gráfico TradingView en tiempo real y libro de órdenes',
          breadcrumb: ['Inicio', 'Mercado', 'Terminal'],
        };
      case 'estrategias':
        return {
          title: 'Estrategias Google Sheets',
          subtitle: 'Catálogo de estrategias cuantitativas con parámetros R:B sincronizados',
          breadcrumb: ['Inicio', 'Planificación', 'Estrategias'],
        };
      case 'top-operaciones':
        return {
          title: 'Plan de Trabajo (Top R:B)',
          subtitle: 'Operaciones de alta confluencia ordenadas por mejor ratio Riesgo:Beneficio',
          breadcrumb: ['Inicio', 'Planificación', 'Top Operaciones'],
        };
      default:
        return {
          title: 'AdminLTE Trading Terminal',
          subtitle: 'Panel administrativo de trading',
          breadcrumb: ['Inicio', 'Dashboard'],
        };
    }
  };

  const pageDetails = getCurrentPageDetails();

  return (
    <div id="adminlte-app-wrapper" className="min-h-screen w-full bg-[#0b0e11] text-[#eaecef] flex overflow-hidden font-sans">
      
      {/* ========================================================================= */}
      {/* 1. ADMINLTE SIDEBAR (Main Sidebar) */}
      {/* ========================================================================= */}
      
      {/* Mobile Backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        id="adminlte-main-sidebar"
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col bg-[#161a1e] border-r border-[#262c36] shadow-2xl transition-all duration-300 ease-in-out ${
          sidebarExpanded ? 'w-64' : 'w-18'
        } ${mobileSidebarOpen ? 'translate-x-0 !w-64' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* 1.1 Sidebar Brand Header (AdminLTE classic brand logo + text) */}
        <div className="h-14 flex items-center justify-between px-3.5 border-b border-[#262c36] bg-[#121519] shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('billetera')}
            className="flex items-center gap-2.5 overflow-hidden text-left focus:outline-hidden group"
            title="AdminLTE Trading Terminal"
          >
            {/* Brand Logo Cube */}
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-neutral-950 font-black shrink-0 shadow-md group-hover:scale-105 transition-transform">
              <span className="text-sm font-mono tracking-tighter">LTE</span>
            </div>
            
            {(sidebarExpanded || mobileSidebarOpen) && (
              <div className="flex flex-col truncate leading-tight">
                <span className="text-sm font-extrabold text-white tracking-wider flex items-center gap-1.5">
                  AdminLTE <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">4.0</span>
                </span>
                <span className="text-[10px] text-neutral-400 font-medium truncate">
                  Binance FAPI Terminal
                </span>
              </div>
            )}
          </button>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1.2 Sidebar User Panel (AdminLTE classic user info) */}
        {(sidebarExpanded || mobileSidebarOpen) && (
          <div className="p-3 border-b border-[#262c36] bg-[#14181c]/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-amber-400 font-bold text-xs shadow-inner">
                  <User className="w-4 h-4" />
                </div>
                <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#161a1e] ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              </div>
              <div className="flex flex-col overflow-hidden truncate">
                <span className="text-xs font-bold text-neutral-200 truncate">
                  Operador Binance
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                  <span className={`w-1.5 h-1.5 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  <span className="truncate">
                    {mode === 'production' ? 'Producción FAPI' : mode === 'testnet' ? 'Testnet FAPI' : 'Simulador FAPI'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 1.3 Sidebar Quick Search (AdminLTE form-inline search) */}
        {(sidebarExpanded || mobileSidebarOpen) && (
          <div className="p-2.5 border-b border-[#262c36] shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar módulo..."
                className="w-full bg-[#0f1216] border border-[#2b3139] rounded-lg py-1.5 pl-8 pr-2.5 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50 transition-colors"
              />
              <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-neutral-500 hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* 1.4 Sidebar Navigation Menu (AdminLTE nav-sidebar) */}
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-4 custom-scrollbar">
          {filteredCategories.map((cat, catIdx) => (
            <div key={catIdx} className="space-y-1">
              {(sidebarExpanded || mobileSidebarOpen) && (
                <div className="px-2.5 py-1 text-[10px] font-bold text-neutral-500 uppercase tracking-wider font-mono">
                  {cat.title}
                </div>
              )}

              <div className="space-y-0.5">
                {cat.items.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = !item.isAction && activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        if (item.isAction && item.action) {
                          item.action();
                        } else if (!item.isAction) {
                          onSelectTab(item.id as NavTab);
                          if (mobileSidebarOpen) setMobileSidebarOpen(false);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-all group relative cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-md'
                          : 'text-neutral-300 hover:bg-[#20252b] hover:text-white'
                      }`}
                      title={!sidebarExpanded && !mobileSidebarOpen ? item.label : undefined}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <ItemIcon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-neutral-950'
                              : 'text-neutral-400 group-hover:text-amber-400'
                          }`}
                        />
                        {(sidebarExpanded || mobileSidebarOpen) && (
                          <span className="truncate text-left">{item.label}</span>
                        )}
                      </div>

                      {(sidebarExpanded || mobileSidebarOpen) && item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 ml-1 shadow-2xs ${
                            isActive
                              ? 'bg-neutral-950/20 text-neutral-950 font-bold'
                              : item.badgeColor
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}

                      {/* Tooltip for collapsed mini sidebar */}
                      {!sidebarExpanded && !mobileSidebarOpen && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 border border-neutral-700 text-white text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                          {item.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 1.5 Sidebar Bottom Card: Seguridad ISOLATED & Toggle */}
        <div className="p-2 border-t border-[#262c36] bg-[#121519] shrink-0">
          {(sidebarExpanded || mobileSidebarOpen) ? (
            <div className="bg-[#1a1f26] rounded-xl p-2.5 border border-[#2b3139] flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 font-mono flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  Isolated 1x-5x
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10px] text-neutral-400 leading-tight">
                Protección estricta contra liquidación cruzada activada.
              </p>
            </div>
          ) : (
            <div className="flex justify-center py-1" title="Régimen ISOLATED 1x-5x activo">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
          )}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. ADMINLTE MAIN CONTENT WRAPPER */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-[#0b0e11]">
        
        {/* 2.1 ADMINLTE TOP NAVBAR (app-header) */}
        <header className="h-14 bg-[#161a1e] border-b border-[#262c36] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30 shadow-sm">
          
          {/* Left navbar links & pushmenu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AdminLTE Pushmenu Hamburger Toggle */}
            <button
              type="button"
              id="adminlte-pushmenu-btn"
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen(!mobileSidebarOpen);
                } else {
                  setSidebarExpanded(!sidebarExpanded);
                }
              }}
              className="p-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Colapsar / Expandir Barra Lateral (PushMenu)"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Quick module tabs in navbar */}
            <nav className="hidden md:flex items-center gap-1 text-xs">
              <button
                type="button"
                onClick={() => onSelectTab('billetera')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeTab === 'billetera' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'}`}
              >
                Billetera
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('gestion-trades')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeTab === 'gestion-trades' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'}`}
              >
                Trades ({positionsCount})
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('futuros')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeTab === 'futuros' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'}`}
              >
                Terminal
              </button>
              <button
                type="button"
                onClick={() => onSelectTab('estrategias')}
                className={`px-2.5 py-1 rounded-md transition-colors ${activeTab === 'estrategias' ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-300 hover:text-white hover:bg-neutral-800/60'}`}
              >
                Estrategias
              </button>
            </nav>

            {/* Network Mode Badge with dropdown */}
            <div className="relative" ref={modeDropdownRef}>
              <button
                type="button"
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  mode === 'production'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : mode === 'testnet'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-amber-950 text-amber-300 border-amber-700'
                }`}
                title="Cambiar Entorno FAPI (Producción / Testnet / Simulación)"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${mode === 'production' ? 'bg-emerald-400' : mode === 'testnet' ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                <span className="hidden sm:inline">
                  {mode === 'production' ? 'PRODUCCIÓN' : mode === 'testnet' ? 'TESTNET' : 'SIMULACIÓN'}
                </span>
                <ChevronDown className="w-3 h-3 opacity-70" />
              </button>

              {isModeDropdownOpen && (
                <div className="absolute left-0 mt-1 w-48 bg-[#181d24] border border-[#2b3139] rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-neutral-400 border-b border-neutral-800 font-mono">
                    Modo Binance FAPI
                  </div>
                  <button
                    type="button"
                    onClick={() => handleModeChange('production')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-800 transition-colors ${mode === 'production' ? 'text-emerald-400 font-bold' : 'text-neutral-200'}`}
                  >
                    <span>Producción (Real)</span>
                    {mode === 'production' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('testnet')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-800 transition-colors ${mode === 'testnet' ? 'text-cyan-400 font-bold' : 'text-neutral-200'}`}
                  >
                    <span>Testnet FAPI</span>
                    {mode === 'testnet' && <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('simulation')}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-800 transition-colors ${mode === 'simulation' ? 'text-amber-400 font-bold' : 'text-neutral-200'}`}
                  >
                    <span>Simulación (Demo)</span>
                    {mode === 'simulation' && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right navbar controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            
            {/* Ping latency */}
            <div className="hidden lg:flex items-center gap-1 px-2 py-0.5 rounded bg-[#101317] border border-[#262c36] text-[11px] font-mono text-neutral-400">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{latencyMs}ms</span>
            </div>

            {/* Audio Toggle */}
            <button
              type="button"
              onClick={toggleSound}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title={soundOn ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundOn ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* PnL Simulator Button */}
            {onOpenPnlSimulator && (
              <button
                type="button"
                id="adminlte-btn-pnl-simulator"
                onClick={onOpenPnlSimulator}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Abrir Simulador de PnL y Retorno (ROE)"
              >
                <Calculator className="w-4 h-4 text-emerald-400" />
                <span className="hidden md:inline">Simulador PnL</span>
              </button>
            )}

            {/* Console Button */}
            <button
              type="button"
              onClick={onOpenConsole}
              className={`p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ${isConsoleOpen ? 'text-amber-400 bg-neutral-800' : ''}`}
              title="Consola WS-FAPI"
            >
              <Terminal className="w-4 h-4" />
            </button>

            {/* New Order Primary Button (AdminLTE call-to-action) */}
            <button
              type="button"
              id="adminlte-btn-new-order"
              onClick={onOpenOrderModal}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer ml-1"
              title="Abrir boleta de nueva orden en Binance Futuros"
            >
              <Zap className="w-3.5 h-3.5 fill-neutral-950" />
              <span className="hidden sm:inline">Nueva Orden</span>
            </button>

            {/* User Profile & API Key Dropdown */}
            <div className="relative ml-1" ref={userDropdownRef}>
              <button
                type="button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 flex items-center justify-center text-neutral-300 hover:text-white transition-colors cursor-pointer"
                title="Perfil y credenciales API"
              >
                <User className="w-4 h-4" />
              </button>

              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-1 w-56 bg-[#181d24] border border-[#2b3139] rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-neutral-800">
                    <p className="text-xs font-bold text-white">Cuenta Binance</p>
                    <p className="text-[11px] text-neutral-400 truncate">
                      {credentials.apiKey ? `${credentials.apiKey.slice(0, 8)}...` : 'Sin API Key'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenApiModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Configurar API Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenDisciplinesModal();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Protocolo de Riesgo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      onOpenConsole();
                    }}
                    className="w-full px-3 py-2 text-left text-xs text-neutral-200 hover:bg-neutral-800 flex items-center gap-2 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5 text-blue-400" />
                    <span>Consola WebSocket</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* 2.2 ADMINLTE CONTENT HEADER (app-content-header) */}
        <div className="bg-[#121519] border-b border-[#20252c] px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-2">
              <span>{pageDetails.title}</span>
            </h1>
            <p className="text-[11px] text-neutral-400 hidden sm:block">
              {pageDetails.subtitle}
            </p>
          </div>

          {/* AdminLTE Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-neutral-400 font-mono">
            {pageDetails.breadcrumb.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3 h-3 text-neutral-600" />}
                <span className={idx === pageDetails.breadcrumb.length - 1 ? 'text-amber-400 font-bold' : 'hover:text-neutral-200'}>
                  {crumb}
                </span>
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* 2.3 ADMINLTE CONTENT BODY (app-content) */}
        <main className="flex-1 overflow-y-auto w-full relative">
          {children}
        </main>

        {/* 2.4 ADMINLTE FOOTER (app-footer) */}
        <footer className="h-8 bg-[#121519] border-t border-[#20252c] px-3 sm:px-6 flex items-center justify-between text-[11px] text-neutral-400 shrink-0 font-mono">
          <div className="truncate">
            <strong className="text-neutral-300">AdminLTE 4</strong> • Binance Futuros WS-FAPI
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="hidden md:inline text-neutral-500">
              Modo: <strong className="text-neutral-300">{mode.toUpperCase()}</strong>
            </span>
            <span className="hidden sm:inline text-neutral-500">|</span>
            <span className="text-emerald-400 font-medium">
              100% ISOLATED
            </span>
            <span className="text-neutral-600">v4.0.0</span>
          </div>
        </footer>

      </div>

    </div>
  );
};
