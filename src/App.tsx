import { useNavigation } from './context/NavigationContext';
import { AppShell } from './layouts/AppShell';
import { DashboardHome } from './components/DashboardHome';
import { TerminalView } from './views/TerminalView';

function AppContent() {
  const { currentRoute, navigate } = useNavigation();

  const renderContent = () => {
    switch (currentRoute) {
      case '/dashboard':
        return <DashboardHome />;
      case '/terminal':
        return <TerminalView />;
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
