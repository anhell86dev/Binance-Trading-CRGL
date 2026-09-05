import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  interactive?: boolean;
}

export function Card({ children, className = '', padding = 'md', interactive = false }: CardProps) {
  return <section className={`ui-card ui-card--${padding} ${interactive ? 'ui-card--interactive' : ''} ${className}`}>{children}</section>;
}
