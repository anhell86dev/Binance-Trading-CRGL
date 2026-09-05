import { useNavigation } from './context/NavigationContext';
import { AppShell } from './layouts/AppShell';
import { DashboardHome } from './components/DashboardHome';
import { TerminalPage } from './components/TerminalPage';
import { DashboardHomeWithData } from './components/DashboardHomeWithData';


function AppContent() {
  const { currentRoute, navigate } = useNavigation();

  const renderContent = () => {
    switch (currentRoute) {
      case '/dashboard':
  return <DashboardHomeWithData />;
      case '/terminal':
        return (
          <TerminalPage
            watchlist={
              <div style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                <p>Watchlist placeholder</p>
                <p style={{ fontSize: '12px' }}>Integra aqui PairSidebar</p>
              </div>
            }
            chart={
              <div style={{ padding: 'var(--space-lg)', color: 'var(--text-secondary)', textAlign: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: 700 }}>Grafico principal</p>
                <p style={{ fontSize: '12px' }}>Integra aqui ChartSection o TradingViewWidget</p>
              </div>
            }
            marketInfo={
              <div style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                <p>Informacion del activo</p>
                <p style={{ fontSize: '12px' }}>Integra aqui MarketView</p>
              </div>
            }
            orderForm={
              <div style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                <p>Formulario de orden</p>
                <p style={{ fontSize: '12px' }}>Integra aqui OrderForm</p>
              </div>
            }
            positions={
              <div style={{ padding: 'var(--space-md)', color: 'var(--text-secondary)' }}>
                <p>Posiciones y ordenes</p>
                <p style={{ fontSize: '12px' }}>Integra aqui OpenPositionsTable</p>
              </div>
            }
          />
        );
      default:
        return <DashboardHome />;
    }
  };

  return <AppShell onNavigate={navigate}>{renderContent()}</AppShell>;
}

function App() {
  return <AppContent />;
}

export default App;
