import {
  LayoutDashboard,
  TrendingUp,
  Wallet,
  BookOpen,
  Settings,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Activity,
  Target,
  Shield,
  FileText,
  Users,
  X,
} from 'lucide-react';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Activity, label: 'Terminal', path: '/terminal' },
  { icon: BarChart3, label: 'Estrategias', path: '/estrategias' },
  { icon: TrendingUp, label: 'Operaciones', path: '/operaciones' },
  { icon: Wallet, label: 'Portafolio', path: '/portafolio' },
  { icon: Target, label: 'Posiciones', path: '/operaciones' },
  { icon: Shield, label: 'Riesgo', path: '/riesgo' },
  { icon: BookOpen, label: 'Diario', path: '/diario' },
  { icon: FileText, label: 'Reportes', path: '/operaciones' },
  { icon: Users, label: 'Comunidad', path: '/dashboard' },
  { icon: Settings, label: 'Configuración', path: '/configuracion' },
];

interface AdminLTESidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activePath?: string;
  onNavigate?: (path: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminLTESidebar({
  isCollapsed,
  onToggle,
  activePath = '/dashboard',
  onNavigate,
  isMobileOpen = false,
  onCloseMobile,
}: AdminLTESidebarProps) {
  const handleNavClick = (path: string) => {
    onNavigate?.(path);
    onCloseMobile?.();
  };

  return (
    <>
      <aside
        className={`
          adminlte-sidebar fixed top-0 left-0 z-50 h-screen
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
          border-r border-gray-700 transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[70px]' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-700 bg-gray-900/50">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">CR</div>
            {!isCollapsed && <span className="text-white font-bold text-lg tracking-tight">CRGL<span className="text-blue-400">.io</span></span>}
          </div>
          <button onClick={onCloseMobile} className="lg:hidden p-1 text-gray-400 hover:text-white" aria-label="Cerrar menú">
            <X className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-gray-800 flex items-center justify-center z-50"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4 text-white" /> : <ChevronLeft className="w-4 h-4 text-white" />}
        </button>

        <nav className="mt-2 px-2 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 135px)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;
            return (
              <button
                key={`${item.label}-${item.path}`}
                onClick={() => handleNavClick(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative ${isActive ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30' : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'} ${isCollapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {!isCollapsed && <><span className="flex-1 text-left text-sm font-medium">{item.label}</span>{item.badge && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{item.badge}</span>}</>}
                {isCollapsed && <span className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 text-white text-sm">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-900/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">CG</div>
            {!isCollapsed && <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">Carlos Garcia</p><p className="text-gray-400 text-xs truncate">Pro Trader</p></div>}
          </div>
        </div>
      </aside>
      {isMobileOpen && <button className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onCloseMobile} aria-label="Cerrar menú" />}
    </>
  );
}
