import { useEffect, useState } from 'react';
import { AdminLTESidebar } from './AdminLTESidebar';
import { AdminLTEHeader } from './AdminLTEHeader';

interface AdminLTELayoutProps {
  children: React.ReactNode;
  activePath?: string;
  onNavigate?: (path: string) => void;
}

export function AdminLTELayout({
  children,
  activePath = '/dashboard',
  onNavigate,
}: AdminLTELayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    const savedSidebarState = localStorage.getItem('adminlte-sidebar-collapsed');
    const savedTheme = localStorage.getItem('adminlte-theme');

    if (savedSidebarState !== null) {
      setIsSidebarCollapsed(savedSidebarState === 'true');
    }

    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adminlte-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('adminlte-theme', isDarkMode ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    setIsMobileOpen(false);
  }, [activePath]);

  const toggleSidebar = () => setIsSidebarCollapsed((value) => !value);
  const toggleTheme = () => setIsDarkMode((value) => !value);
  const openMobileMenu = () => setIsMobileOpen(true);
  const closeMobileMenu = () => setIsMobileOpen(false);

  return (
    <div className={`min-h-screen bg-gray-950 text-gray-100 ${isDarkMode ? 'dark' : ''}`}>
      <AdminLTESidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        activePath={activePath}
        onNavigate={onNavigate}
        isMobileOpen={isMobileOpen}
        onCloseMobile={closeMobileMenu}
      />

      <AdminLTEHeader
        onToggleSidebar={openMobileMenu}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main
        className={`min-h-[calc(100vh-3.5rem)] pt-14 transition-[margin] duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-[70px]' : 'lg:ml-64'
        }`}
      >
        <div className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
