import { useNavigation } from './context/NavigationContext';
import { AppShell } from './layouts/AppShell';
import { DashboardHomeWithData } from './components/DashboardHomeWithData';
import { TerminalView } from './views/TerminalView';

function AppContent() {
  const { currentRoute, navigate } = useNavigation();

  const renderContent = () => {
    switch (currentRoute) {
      case '/dashboard':
        return <DashboardHomeWithData />;
      case '/terminal':
        return <TerminalView />;
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
