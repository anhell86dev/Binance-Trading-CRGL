import { useState, useEffect } from 'react';
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
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Load preferences from localStorage
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

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('adminlte-sidebar-collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('adminlte-theme', isDarkMode ? 'dark' : 'light');
    
    // Apply theme class to document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <div className={`min-h-screen bg-gray-950 ${isDarkMode ? 'dark' : ''}`}>
      {/* Sidebar */}
      <AdminLTESidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={toggleSidebar}
        activePath={activePath}
        onNavigate={onNavigate}
      />

      {/* Header */}
      <AdminLTEHeader
        onToggleSidebar={toggleSidebar}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <main
        className={`
          transition-all duration-300 ease-in-out
          ${isSidebarCollapsed ? 'ml-[70px]' : 'ml-64'}
        `}
      >
        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
