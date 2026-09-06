import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#0b0f14',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <section style={{ maxWidth: '640px', textAlign: 'center' }}>
          <h1 style={{ marginBottom: '12px' }}>Diagnóstico: ErrorBoundary cargado</h1>
          <p style={{ margin: 0, color: '#aab7c4' }}>
            La aplicación se inició sin cargar vistas ni layout.
          </p>
        </section>
      </main>
    </ErrorBoundary>
  );
}

export default App;
