import React from 'react';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';

interface KpiCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

export function KpiCard({ label, value, change, changeLabel, icon, onClick }: KpiCardProps) {
  const state = change === undefined ? 'neutral' : change >= 0 ? 'positive' : 'negative';

  return (
    <Card className="kpi-card" interactive={Boolean(onClick)}>
      <div className="kpi-card__head">
        <span className="kpi-card__label">{label}</span>
        {icon && <span className="kpi-card__icon">{icon}</span>}
      </div>
      <strong className="kpi-card__value">{value}</strong>
      {change !== undefined && (
        <div className="kpi-card__foot">
          <StatusBadge status={state}>{`${change >= 0 ? '+' : ''}${change.toFixed(2)}%`}</StatusBadge>
          {changeLabel && <span className="kpi-card__context">{changeLabel}</span>}
        </div>
      )}
    </Card>
  );
}
