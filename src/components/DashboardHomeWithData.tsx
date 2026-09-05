import { KpiCard } from './ui/KpiCard';

interface DashboardHomeWithDataProps {
  equity?: number;
  pnlToday?: number;
  marginUsed?: number;
  drawdown?: number;
  openPositions?: Array<any>;
  riskExposure?: number;
}

export function DashboardHomeWithData({
  equity = 12450.80,
  pnlToday = 287.50,
  marginUsed = 32,
  drawdown = 4.8,
  openPositions = [],
  riskExposure = 1240,
}: DashboardHomeWithDataProps) {
  const calculateChange = (value: number, base: number) => {
    return ((value - base) / base) * 100;
  };

  const kpis = [
    {
      label: 'Equity Total',
      value: `$${equity.toFixed(2)}`,
      change: calculateChange(equity, equity * 0.98),
      changeLabel: 'vs. inicio de mes',
    },
    {
      label: 'P&L Hoy',
      value: `${pnlToday >= 0 ? '+' : ''}$${pnlToday.toFixed(2)}`,
      change: calculateChange(Math.abs(pnlToday), Math.abs(pnlToday) * 0.9),
      changeLabel: 'vs. ayer',
    },
    {
      label: 'Margen Usado',
      value: `${marginUsed.toFixed(1)}%`,
      change: -marginUsed * 0.15,
      changeLabel: 'disponible',
    },
    {
      label: 'Drawdown',
      value: `${drawdown.toFixed(2)}%`,
      change: -drawdown * 0.05,
      changeLabel: 'max 30d',
    },
    {
      label: 'Posiciones Abiertas',
      value: openPositions.length,
      change: 0,
      changeLabel: 'activas',
    },
    {
      label: 'Riesgo Abierto',
      value: `$${riskExposure.toFixed(2)}`,
      change: -12.5,
      changeLabel: 'exposicion',
    },
  ];

  return (
    <div className="dashboard-home">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Resumen de cuenta y rendimiento</p>
      </header>

      <section className="kpi-grid">
        {kpis.map((kpi, index) => (
          <KpiCard
            key={index}
            label={kpi.label}
            value={kpi.value}
            change={kpi.change}
            changeLabel={kpi.changeLabel}
          />
        ))}
      </section>

      <section className="content-placeholder">
        <h2>Graficos y Analisis</h2>
        <p>Aqui iran graficos de equity, distribucion de activos y rendimiento por estrategia.</p>
      </section>
    </div>
  );
}
