import React from 'react';

interface AppSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
  onNavigate?: (path: string) => void;
}

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: 'D' },
  { label: 'Terminal', path: '/terminal', icon: 'T' },
  { label: 'Estrategias', path: '/estrategias', icon: 'E' },
  { label: 'Portafolio', path: '/portafolio', icon: 'P' },
  { label: 'Operaciones', path: '/operaciones', icon: 'O' },
  { label: 'Diario', path: '/diario', icon: 'J' },
  { label: 'Riesgo', path: '/riesgo', icon: 'R' },
  { label: 'Configuracion', path: '/configuracion', icon: 'C' },
];

export function AppSidebar({ collapsed, mobileOpen, onToggle, onMobileClose, onNavigate }: AppSidebarProps) {
  const navigate = (path: string) => {
    onNavigate?.(path);
    onMobileClose();
  };

  const navigation = (compact = false) => (
    <nav className="app-sidebar__nav" aria-label="Navegacion principal">
      {navItems.map((item) => (
        <button className="app-sidebar__item" key={item.path} type="button" onClick={() => navigate(item.path)}>
          <span className="app-sidebar__item-icon" aria-hidden="true">{item.icon}</span>
          {!compact && <span className="app-sidebar__item-label">{item.label}</span>}
        </button>
      ))}
    </nav>
  );

  return (
    <>
      <aside className={`app-sidebar ${collapsed ? 'app-sidebar--collapsed' : ''}`}>
        <div className="app-sidebar__header">
          {!collapsed && <span className="app-sidebar__brand">CRGL Terminal</span>}
          <button className="icon-button" type="button" onClick={onToggle} aria-label="Alternar barra lateral">
            {collapsed ? '>' : '<'}
          </button>
        </div>
        {navigation(collapsed)}
      </aside>

      {mobileOpen && (
        <div className="app-sidebar__overlay" role="presentation" onClick={onMobileClose}>
          <aside className="app-sidebar app-sidebar--mobile" onClick={(event) => event.stopPropagation()}>
            <div className="app-sidebar__header">
              <span className="app-sidebar__brand">CRGL Terminal</span>
              <button className="icon-button" type="button" onClick={onMobileClose} aria-label="Cerrar navegacion">x</button>
            </div>
            {navigation(false)}
          </aside>
        </div>
      )}
    </>
  );
}
