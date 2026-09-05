# Ejemplo de Integración del Terminal

Este documento muestra cómo integrar tus componentes existentes de trading en el nuevo layout `TerminalPage`.

## Paso 1: Importar componentes

En `src/App.tsx` o en un archivo nuevo `src/views/TerminalView.tsx`:

```tsx
import { TerminalPage } from '../components/TerminalPage';
import { PairSidebar } from '../components/PairSidebar';
import { ChartSection } from '../components/ChartSection';
import { MarketView } from '../components/MarketView';
import { OrderForm } from '../components/OrderForm';
import { OpenPositionsTable } from '../components/OpenPositionsTable';
```

## Paso 2: Crear vista del Terminal

```tsx
export function TerminalView() {
  return (
    <TerminalPage
      watchlist={<PairSidebar />}
      chart={<ChartSection />}
      marketInfo={<MarketView />}
      orderForm={<OrderForm />}
      positions={<OpenPositionsTable />}
    />
  );
}
```

## Paso 3: Integrar en App.tsx

Reemplaza el placeholder en `src/App.tsx`:

```tsx
import { TerminalView } from './views/TerminalView';

// En el switch de rutas:
case '/terminal':
  return <TerminalView />;
```

## Paso 4: Ajustar estilos (si es necesario)

Si los componentes tienen estilos hardcodeados, considera:

1. Reemplazar colores fijos por variables CSS:
   - `#0a0e17` → `var(--bg-app)`
   - `#121a29` → `var(--bg-surface)`
   - `#233149` → `var(--border-subtle)`
   - `#0ecb81` → `var(--positive)`
   - `#f6465d` → `var(--negative)`

2. Ajustar paddings y margins para que coincidan con el sistema:
   - Usa `var(--space-sm)`, `var(--space-md)`, `var(--space-lg)`

## Paso 5: Verificar responsive

Prueba en diferentes tamaños de pantalla:

- Desktop (>1200px): 3 columnas completas
- Laptop (992-1199px): 3 columnas ajustadas
- Tablet (768-991px): sidebar colapsado o en drawer
- Móvil (<768px): una sola columna, paneles apilados

## Notas adicionales

- Si `ChartSection` usa TradingView Widget, verifica que el contenedor tenga altura suficiente.
- Si `OrderForm` tiene validaciones o modales, asegúrate de que se rendericen correctamente dentro del nuevo layout.
- Si `OpenPositionsTable` tiene muchas columnas, considera hacerla scrollable horizontalmente en móvil.

## Solución de problemas

### El gráfico no se ve completo
Agrega altura mínima al contenedor:
```css
.premium-terminal__chart { min-height: 500px; }
```

### Los paneles laterales son muy estrechos
Ajusta el grid en `src/styles/layout.css`:
```css
.premium-terminal {
  grid-template-columns: 300px minmax(0, 1fr) 340px;
}
```

### Los colores no coinciden
Verifica que los componentes no tengan estilos inline que sobrescriban las variables CSS.

---

Siguiente paso: Después de integrar el terminal, repite el proceso para Estrategias, Portafolio, Operaciones, Diario y Riesgo.
