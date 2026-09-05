import React from 'react';

type BadgeStatus = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  children: React.ReactNode;
  status?: BadgeStatus;
}

export function StatusBadge({ children, status = 'neutral' }: StatusBadgeProps) {
  return <span className={`status-badge status-badge--${status}`}>{children}</span>;
}
