import ErrorBoundary from './components/ErrorBoundary';
import { AdminLTELayout } from './layouts/AdminLTELayout';

function App() {
  return (
    <ErrorBoundary>
      <AdminLTELayout activePath="/dashboard" onNavigate={() => undefined}>
        <main style={{ padding: '24px' }}>
          <h1>Diagnóstico: layout cargado</h1>
          <p>AdminLTELayout y ErrorBoundary se inicializaron sin cargar las vistas.</p>
        </main>
      </AdminLTELayout>
    </ErrorBoundary>
  );
}

export default App;
