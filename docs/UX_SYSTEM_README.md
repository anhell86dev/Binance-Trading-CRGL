# Sistema de UX Premium - Documentación

## Descripción

Este proyecto implementa un sistema de diseño premium para una terminal de trading de criptomonedas, inspirado en patrones de dashboards administrativos modernos pero adaptado específicamente para operaciones financieras en tiempo real.

## Arquitectura Visual

### Layout Principal

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         HEADER (64px)                                      │
│  [Menu] [Binance Conectado] [Ticker]                    [Alertas] [Perfil] │
├──────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR    │ CONTENIDO PRINCIPAL                                           │
│ (248px)    │                                                               │
│            │  Dashboard / Terminal / Estrategias / etc.                    │
│ Dashboard  │                                                               │
│ Terminal   │                                                               │
│ Estrategias│                                                               │
│ Portafolio │                                                               │
│ Operaciones│                                                               │
│ Diario     │                                                               │
│ Riesgo     │                                                               │
│ Config     │                                                               │
└──────────────────────────────────────────────────────────────────────────┘
```

## Sistema de Colores

### Variables Principales

| Variable | Valor | Uso |
|----------|-------|-----|
| `--bg-app` | `#0a0e17` | Fondo principal |
| `--bg-sidebar` | `#0d1220` | Sidebar |
| `--bg-surface` | `#121a29` | Tarjetas y paneles |
| `--brand` | `#f0b90b` | Color de marca (Binance yellow) |
| `--positive` | `#0ecb81` | Ganancias, éxito |
| `--negative` | `#f6465d` | Pérdidas, errores |
| `--text-primary` | `#f2f6fc` | Texto principal |
| `--text-secondary` | `#98a9c2` | Texto secundario |

## Componentes UI

### KpiCard

Tarjeta para mostrar indicadores clave de rendimiento.

```tsx
<KpiCard
  label="Equity Total"
  value="$12,450.80"
  change={2.34}
  changeLabel="vs. inicio de mes"
/>
```

### StatusBadge

Badge para estados (positivo, negativo, warning, info, neutral).

```tsx
<StatusBadge status="positive">+2.34%</StatusBadge>
```

### Card

Tarjeta base reutilizable.

```tsx
<Card padding="md" interactive>
  Contenido de la tarjeta
</Card>
```

### PanelHeader

Encabezado de panel con título, subtítulo y toggle.

```tsx
<PanelHeader
  title="Watchlist"
  subtitle="8 activos"
  onToggle={() => setOpen(!open)}
  collapsed={!open}
/>
```

## Layouts

### AppShell

Contenedor principal con sidebar y header.

```tsx
<AppShell onNavigate={navigate}>
  {children}
</AppShell>
```

### PremiumTerminalLayout

Layout de 3 columnas para el terminal de trading.

```tsx
<PremiumTerminalLayout
  watchlist={<PairSidebar />}
  chart={<ChartSection />}
  marketInfo={<MarketView />}
  orderForm={<OrderForm />}
  positions={<OpenPositionsTable />}
/>
```

## Responsive

### Breakpoints

| Breakpoint | Ancho | Comportamiento |
|------------|-------|----------------|
| Desktop | >1199px | 3 columnas completas, sidebar expandido |
| Laptop | 992-1199px | 3 columnas ajustadas, sidebar expandido |
| Tablet | 768-991px | 1 columna, sidebar en drawer |
| Móvil | <768px | 1 columna, sidebar oculto, tabs horizontales |

## Navegación

### Rutas Disponibles

- `/dashboard` - Resumen de cuenta y KPIs
- `/terminal` - Terminal de trading
- `/estrategias` - Gestión de estrategias
- `/portafolio` - Portafolio y activos
- `/operaciones` - Historial de operaciones
- `/diario` - Diario de trading
- `/riesgo` - Gestión de riesgo
- `/configuracion` - Configuración

### Uso del Contexto

```tsx
import { useNavigation } from './context/NavigationContext';

function MiComponente() {
  const { currentRoute, navigate } = useNavigation();
  
  return (
    <button onClick={() => navigate('/terminal')}>
      Ir al Terminal
    </button>
  );
}
```

## Próximas Mejoras

- [ ] Agregar animaciones de transición entre rutas
- [ ] Implementar breadcrumbs en el header
- [ ] Agregar búsqueda global en el header
- [ ] Implementar tema claro/oscuro toggle
- [ ] Agregar atajos de teclado para navegación
- [ ] Mejorar accesibilidad (ARIA labels, focus management)
- [ ] Agregar loading states y skeleton screens
- [ ] Implementar error boundaries por módulo

---

**Estado:** En desarrollo - Rama `feat/premium-dashboard-ux`
