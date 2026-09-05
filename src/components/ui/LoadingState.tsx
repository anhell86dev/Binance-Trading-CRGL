import React from 'react';

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />
      <p className="loading-message">{message}</p>
    </div>
  );
}
