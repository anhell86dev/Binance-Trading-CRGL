import React, { useState } from 'react';
import { Header } from './components/Header';
import { AccountSummary } from './components/AccountSummary';
import { AssetInfoCard } from './components/AssetInfoCard';
import { PositionsAndOrders } from './components/PositionsAndOrders';
import { StrategyCreator } from './components/StrategyCreator';
import { ChartSection } from './components/ChartSection';
import { OrderForm } from './components/OrderForm';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WebSocketConsole } from './components/WebSocketConsole';
import { NotificationToasts } from './components/NotificationToasts';
import { APP_VERSION, APP_CONFIG } from './config/version';

export default function App() {
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-amber-500/20 selection:text-amber-300">
      {/* Top Header & Connection Bar */}
      <Header
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onOpenConsole={() => setIsConsoleOpen(true)}
        isConsoleOpen={isConsoleOpen}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 flex flex-col gap-4">
        {/* 1. Protocolo de Riesgo Activo y Balance de Cuenta */}
        <AccountSummary />

        {/* 2. Información en Tiempo Real del Activo (Precio en Vivo, Cambio 24h, Máx 24h, Mín 24h, Vol. 24h) */}
        <AssetInfoCard />

        {/* 3. Posiciones Activas, Órdenes Abiertas, Historial de Trade y Alertas de Volatilidad */}
        <PositionsAndOrders />

        {/* 4. Creador de Estrategia (Tarjeta Separada con Catálogo tipo lista ordenado del 1 al X por R/B) */}
        <div id="strategy_creator_card" className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-4 shadow-xl">
          <StrategyCreator />
        </div>

        {/* 5. Core Trading Split: Gráfico Táctico & Analítica (Izquierda 8 cols) vs Formulario de Creación de Órdenes (Derecha 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Interactive Candlestick Chart with Strategy SL/TP Lines & Metrics */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Real-time Candlestick & Volume Chart with Order Book */}
            <ChartSection />

            {/* Advanced Performance Analytics Dashboard */}
            <MetricsDashboard />
          </div>

          {/* Right Column: Execution Form (Limit, Escalonada, Trailing Stop, TP/SL, 1-5x, ISOLATED para cualquier activo) */}
          <div className="lg:col-span-4 sticky top-[72px]">
            <OrderForm />
          </div>
        </div>
      </main>

      {/* Footer info & protocol adherence note */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-3 px-4 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span>Binance USDⓈ-M Futures WebSocket API v1 Engine</span>
            <span>•</span>
            <span className="text-neutral-400 font-semibold flex items-center gap-1.5">
              <span>Versión en Producción:</span>
              <strong className="text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/60">
                {APP_VERSION}
              </strong>
            </span>
          </div>
          <span className="text-amber-400/80">
            Apalancamiento Restringido: 1x-5x • Modo: Margen ISOLATED Obligatorio • TIF: GTC
          </span>
          <div className="flex items-center gap-2">
            <span>WSS Ping/Pong 3m</span>
            <span>•</span>
            <span className="text-neutral-400">{APP_CONFIG.buildNumber}</span>
          </div>
        </div>
      </footer>

      {/* Modals & Overlays */}
      {isApiModalOpen && <ApiKeyModal onClose={() => setIsApiModalOpen(false)} />}
      {isConsoleOpen && <WebSocketConsole onClose={() => setIsConsoleOpen(false)} />}
      <NotificationToasts />
    </div>
  );
}
