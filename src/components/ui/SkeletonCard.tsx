import React from 'react';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-card__header">
        <div className="skeleton-text skeleton-text--sm" />
      </div>
      <div className="skeleton-card__value">
        <div className="skeleton-text skeleton-text--lg" />
      </div>
      <div className="skeleton-card__footer">
        <div className="skeleton-text skeleton-text--xs" />
      </div>
    </div>
  );
}
