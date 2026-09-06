import { Bell, Search, Moon, Sun, LogOut, User, ChevronDown, Settings } from 'lucide-react';
import { useState } from 'react';

interface AdminLTEHeaderProps {
  onToggleSidebar?: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export function AdminLTEHeader({
  onToggleSidebar,
  isDarkMode = true,
  onToggleTheme,
}: AdminLTEHeaderProps) {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Orden ejecutada', message: 'BTC/USDT - Long 0.5', time: '2m', unread: true },
    { id: 2, title: 'Stop Loss activado', message: 'ETH/USDT - +2.3%', time: '15m', unread: true },
    { id: 3, title: 'Estrategia completada', message: 'Scalping v2 - +1.8%', time: '1h', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      {/* Header */}
      <header className="adminlte-header fixed top-0 right-0 left-0 z-30 h-14 bg-gray-900 border-b border-gray-700">
        <div className="h-full flex items-center justify-between px-4">
          {/* Left side - Toggle & Search */}
          <div className="flex items-center gap-3 flex-1">
            {/* Sidebar Toggle (visible on mobile) */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search Bar */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar par, estrategia..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              title={isDarkMode ? 'Modo claro' : 'Modo oscuro'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-gray-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg hover:bg-gray-800 transition-colors relative"
              >
                <Bell className="w-5 h-5 text-gray-400" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    <div className="p-3 border-b border-gray-700">
                      <h3 className="text-white font-semibold">Notificaciones</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.map((notif) => (
                        <div
                          key={notif.id}
                          className={`p-3 border-b border-gray-700 hover:bg-gray-700/50 transition-colors cursor-pointer ${
                            notif.unread ? 'bg-blue-900/20' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-white text-sm font-medium">{notif.title}</p>
                              <p className="text-gray-400 text-xs mt-1">{notif.message}</p>
                            </div>
                            <span className="text-gray-500 text-xs">{notif.time}</span>
                          </div>
                          {notif.unread && (
                            <div className="mt-2 flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                              <span className="text-blue-400 text-xs">Nuevo</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="p-3 border-t border-gray-700 text-center">
                      <button className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
                        Ver todas
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative ml-2">
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold text-xs">
                  CG
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown Menu */}
              {showProfileDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {/* User Info */}
                    <div className="p-4 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white font-bold">
                          CG
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm">Carlos Garcia</p>
                          <p className="text-gray-400 text-xs">Pro Trader</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                        <User className="w-4 h-4" />
                        <span className="text-sm">Mi Perfil</span>
                      </button>
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors">
                        <Settings className="w-4 h-4" />
                        <span className="text-sm">ConfiguraciÃ³n</span>
                      </button>
                    </div>

                    {/* Logout */}
                    <div className="py-2 border-t border-gray-700">
                      <button className="w-full flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors">
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm">Cerrar SesiÃ³n</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Spacer for fixed header */}
      <div className="h-14" />
    </>
  );
}
