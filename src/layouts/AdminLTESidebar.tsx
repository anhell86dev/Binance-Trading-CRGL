import { useState } from 'react';
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
} from 'lucide-react';

interface MenuItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: TrendingUp, label: 'Mercados', path: '/markets', badge: 'NEW' },
  { icon: BarChart3, label: 'Estrategias', path: '/strategies' },
  { icon: Activity, label: 'Trading', path: '/trading' },
  { icon: Wallet, label: 'Billetera', path: '/wallet' },
  { icon: Target, label: 'Posiciones', path: '/positions' },
  { icon: Shield, label: 'Risk Audit', path: '/risk-audit' },
  { icon: BookOpen, label: 'Diario', path: '/journal' },
  { icon: FileText, label: 'Reportes', path: '/reports' },
  { icon: Users, label: 'Comunidad', path: '/community' },
  { icon: Settings, label: 'ConfiguraciÃ³n', path: '/settings' },
];

interface AdminLTESidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export function AdminLTESidebar({
  isCollapsed,
  onToggle,
  activePath = '/dashboard',
  onNavigate,
}: AdminLTESidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const handleNavClick = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`
          adminlte-sidebar
          fixed top-0 left-0 z-40 h-screen
          bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900
          border-r border-gray-700
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[70px]' : 'w-64'}
        `}
      >
        {/* Brand Logo Area */}
        <div className="h-14 flex items-center justify-between px-3 border-b border-gray-700 bg-gray-900/50">
          <div className={`flex items-center gap-2 ${isCollapsed ? 'justify-center w-full' : ''}`}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm">
              CR
            </div>
            {!isCollapsed && (
              <span className="text-white font-bold text-lg tracking-tight">
                CRGL<span className="text-blue-400">.io</span>
              </span>
            )}
          </div>
        </div>

        {/* Toggle Button */}
        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-blue-600 hover:bg-blue-700 border-2 border-gray-800 flex items-center justify-center transition-colors z-50"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-white" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-white" />
          )}
        </button>

        {/* Menu Items */}
        <nav className="mt-2 px-2 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 80px)' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePath === item.path;

            return (
              <button
                key={item.path}
                onClick={() => handleNavClick(item.path)}
                onMouseEnter={() => !isCollapsed && setHoveredItem(item.label)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                  transition-all duration-200 group relative
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }
                  ${isCollapsed ? 'justify-center px-2' : ''}
                `}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />

                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Mini sidebar tooltip */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    <span className="text-white text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-gray-700 bg-gray-900/30">
          <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
              CG
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">Carlos Garcia</p>
                <p className="text-gray-400 text-xs truncate">Pro Trader</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onToggle}
        />
      )}
    </>
  );
}
