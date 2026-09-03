import React from 'react';
import TerminalLayout from './components/TerminalLayout';
import { ErrorBoundary } from './components/ErrorBoundary';

export default function App() {
  return (
    <ErrorBoundary>
      <TerminalLayout />
    </ErrorBoundary>
  );
}

