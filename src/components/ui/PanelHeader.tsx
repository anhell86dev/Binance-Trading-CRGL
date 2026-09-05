import React from 'react';

interface PanelHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onToggle?: () => void;
  collapsed?: boolean;
}

export function PanelHeader({ title, subtitle, actions, onToggle, collapsed }: PanelHeaderProps) {
  return (
    <header className="panel-header">
      <div>
        <h3 className="panel-header__title">{title}</h3>
        {subtitle && <p className="panel-header__subtitle">{subtitle}</p>}
      </div>
      <div className="panel-header__actions">
        {actions}
        {onToggle && <button className="icon-button" type="button" onClick={onToggle} aria-label={collapsed ? 'Expandir panel' : 'Contraer panel'}>{collapsed ? '+' : '-'}</button>}
      </div>
    </header>
  );
}
