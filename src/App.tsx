import { AppShell } from './layouts/AppShell';
import { DashboardHome } from './components/DashboardHome';

function App() {
  const navigate = (path: string) => {
    console.log('Navegando a:', path);
  };

  return (
    <AppShell onNavigate={navigate}>
      <DashboardHome />
    </AppShell>
  );
}

export default App;
