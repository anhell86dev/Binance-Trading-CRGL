import React from 'react';
import { KpiCard } from './ui/KpiCard';

export function DashboardHome() {
  const kpis = [
    { label: 'Equity Total', value: '$12,450.80', change: 2.34, changeLabel: 'vs. inicio de mes' },
    { label: 'P&L Hoy', value: '+$287.50', change: 1.12, changeLabel: 'vs. ayer' },
    { label: 'Margen Usado', value: '32%', change: -5.2, changeLabel: 'disponible' },
    { label: 'Drawdown', value: '4.8%', change: -0.3, changeLabel: 'max 30d' },
    { label: 'Posiciones Abiertas', value: '3', change: 0, changeLabel: 'activas' },
    { label: 'Riesgo Abierto', value: '$1,240', change: -12.5, changeLabel: 'exposicion' },
  ];

  return (
    <div className="dashboard-home">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen de cuenta y rendimiento</p>
      </header>

      <section className="kpi-grid">
        {kpis.map((kpi, index) => (
          <KpiCard key={index} label={kpi.label} value={kpi.value} change={kpi.change} changeLabel={kpi.changeLabel} />
        ))}
      </section>

      <section className="content-placeholder">
        <h2>Contenido principal</h2>
        <p>Aqui iran graficos, tablas y paneles de trading.</p>
      </section>
    </div>
  );
}
