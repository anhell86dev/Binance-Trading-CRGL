import React from 'react';

interface AppHeaderProps {
  onMenuToggle: () => void;
}

export function AppHeader({ onMenuToggle }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header__group">
        <button className="icon-button app-header__menu" type="button" onClick={onMenuToggle} aria-label="Abrir navegacion">Menu</button>
        <span className="connection-status"><span className="connection-status__dot" />Binance conectado</span>
      </div>
      <div className="app-header__ticker" aria-label="Ticker de mercado">
        <span>BTCUSDT <b className="text-positive">+1.24%</b></span>
        <span>ETHUSDT <b className="text-negative">-0.48%</b></span>
        <span>SOLUSDT <b className="text-positive">+3.12%</b></span>
      </div>
      <div className="app-header__group">
        <button className="icon-button" type="button" aria-label="Notificaciones">Alertas</button>
        <button className="icon-button" type="button" aria-label="Perfil">Perfil</button>
      </div>
    </header>
  );
}
