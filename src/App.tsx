import React from 'react';
import TerminalLayout from './components/TerminalLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <TerminalLayout />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

