import React, { useState } from 'react';
import { AppSidebar } from '../components/navigation/AppSidebar';
import { AppHeader } from '../components/navigation/AppHeader';

interface AppShellProps {
  children: React.ReactNode;
  onNavigate?: (path: string) => void;
}

export function AppShell({ children, onNavigate }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggle={() => setSidebarCollapsed((value) => !value)}
        onMobileClose={() => setMobileMenuOpen(false)}
        onNavigate={onNavigate}
      />
      <AppHeader onMenuToggle={() => setMobileMenuOpen(true)} />
      <main className="app-content">{children}</main>
    </div>
  );
}
