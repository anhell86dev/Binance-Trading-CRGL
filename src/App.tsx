import { useNavigation } from './context/NavigationContext';
import { AppShell } from './layouts/AppShell';
import { DashboardHomeWithData } from './components/DashboardHomeWithData';
import { TerminalView } from './views/TerminalView';
import { EstrategiasView } from './views/EstrategiasView';
import { PortafolioView } from './views/PortafolioView';
import { OperacionesView } from './views/OperacionesView';
import { DiarioView } from './views/DiarioView';
import { RiesgoView } from './views/RiesgoView';
import { ConfiguracionView } from './views/ConfiguracionView';

function AppContent() {
  const { currentRoute, navigate } = useNavigation();

  const renderContent = () => {
    switch (currentRoute) {
      case '/dashboard':
        return <DashboardHomeWithData />;
      case '/terminal':
        return <TerminalView />;
      case '/estrategias':
        return <EstrategiasView />;
      case '/portafolio':
        return <PortafolioView />;
      case '/operaciones':
        return <OperacionesView />;
      case '/diario':
        return <DiarioView />;
      case '/riesgo':
        return <RiesgoView />;
      case '/configuracion':
        return <ConfiguracionView />;
      default:
        return <DashboardHomeWithData />;
    }
  };

  return <AppShell onNavigate={navigate}>{renderContent()}</AppShell>;
}

function App() {
  return <AppContent />;
}

export default App;
