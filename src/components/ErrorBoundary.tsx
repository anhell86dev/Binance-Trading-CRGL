import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main style={{ minHeight: '100vh', background: '#080c14', color: '#f8fafc', padding: '32px', fontFamily: 'system-ui, sans-serif' }}>
          <section style={{ maxWidth: '760px', margin: '40px auto', border: '1px solid #7f1d1d', borderRadius: '12px', padding: '24px', background: '#1c1014' }}>
            <h1 style={{ marginTop: 0, color: '#fca5a5' }}>La aplicación encontró un error</h1>
            <p style={{ color: '#fecaca' }}>
              El bundle de producción produjo una excepción durante la inicialización. Recarga la página y, si persiste, copia el detalle técnico.
            </p>
            <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto', background: '#0f172a', padding: '16px', borderRadius: '8px', color: '#fda4af' }}>
              {this.state.error?.stack || this.state.error?.message || 'Error desconocido'}
            </pre>
            <button
              type="button"
              onClick={this.handleReload}
              style={{ border: 0, borderRadius: '8px', padding: '10px 16px', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}
            >
              Recargar aplicación
            </button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
