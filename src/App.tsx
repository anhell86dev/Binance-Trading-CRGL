import { ErrorBoundary } from './components/ErrorBoundary';
import TerminalLayout from './components/TerminalLayout';

function App() {
  return (
    <ErrorBoundary>
      <TerminalLayout />
    </ErrorBoundary>
  );
}

export default App;
