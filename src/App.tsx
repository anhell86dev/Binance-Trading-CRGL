import { useNavigation } from './context/NavigationContext';
import { AdminLTELayout } from './layouts/AdminLTELayout';
import { DashboardHomeWithData } from './components/DashboardHomeWithData';
import { TradingStrategiesView } from './components/TradingStrategiesView';
import { TopOperacionesView } from './components/TopOperacionesView';
import { GestionTradesView } from './components/GestionTradesView';
import { FuturesHubPage } from './components/FuturesHubPage';
import { WalletView } from './components/WalletView';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { currentRoute, navigate } = useNavigation();

  const renderContent = () => {
    switch (currentRoute) {
      case '/estrategias':
        return <TradingStrategiesView />;
      case '/operaciones':
      case '/plan-trabajo':
        return <TopOperacionesView />;
      case '/gestion':
      case '/gestion-trades':
        return <GestionTradesView />;
      case '/futuros':
      case '/terminal':
        return <FuturesHubPage />;
      case '/portafolio':
      case '/billetera':
        return <WalletView />;
      case '/dashboard':
      default:
        return <DashboardHomeWithData />;
    }
  };

  return (
    <AdminLTELayout activePath={currentRoute} onNavigate={navigate}>
      {renderContent()}
    </AdminLTELayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
