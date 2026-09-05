import { useAccount } from '../context/AccountContext';  // o donde tengas el estado
import { KpiCard } from './ui/KpiCard';

export function DashboardHomeWithData() {
  const { equity, pnlToday, marginUsed, drawdown, openPositions } = useAccount();

  const kpis = [
    { label: 'Equity Total', value: `$${equity.toFixed(2)}`, change: 2.34, changeLabel: 'vs. inicio de mes' },
    { label: 'P&L Hoy', value: `${pnlToday >= 0 ? '+' : ''}$${pnlToday.toFixed(2)}`, change: 1.12, changeLabel: 'vs. ayer' },
    { label: 'Margen Usado', value: `${marginUsed.toFixed(1)}%`, change: -5.2, changeLabel: 'disponible' },
    { label: 'Drawdown', value: `${drawdown.toFixed(2)}%`, change: -0.3, changeLabel: 'max 30d' },
    { label: 'Posiciones Abiertas', value: openPositions?.length || 0, change: 0, changeLabel: 'activas' },
    { label: 'Riesgo Abierto', value: `$${(equity * 0.1).toFixed(2)}`, change: -12.5, changeLabel: 'exposicion' },
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
    </div>
  );
}
