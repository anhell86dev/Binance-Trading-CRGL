import { createContext, useContext, useState, ReactNode, useCallback } from 'react';

export type Route = '/dashboard' | '/terminal' | '/estrategias' | '/portafolio' | '/operaciones' | '/diario' | '/riesgo' | '/configuracion';

interface NavigationContextType {
  currentRoute: Route;
  navigate: (route: Route) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentRoute, setCurrentRoute] = useState<Route>('/dashboard');

  const navigate = useCallback((route: Route) => {
    setCurrentRoute(route);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentRoute, navigate }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation debe usarse dentro de NavigationProvider');
  }
  return context;
}
