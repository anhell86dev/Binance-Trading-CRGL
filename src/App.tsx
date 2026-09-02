import React, { useState } from 'react';
import { Header } from './components/Header';
import { AccountSummary } from './components/AccountSummary';
import { ChartSection } from './components/ChartSection';
import { OrderForm } from './components/OrderForm';
import { PositionsAndOrders } from './components/PositionsAndOrders';
import { MetricsDashboard } from './components/MetricsDashboard';
import { ApiKeyModal } from './components/ApiKeyModal';
import { WebSocketConsole } from './components/WebSocketConsole';
import { NotificationToasts } from './components/NotificationToasts';

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
        {/* Real-time Account Balance & Strict Risk Compliance Banner */}
        <AccountSummary />

        {/* Core Trading Split: Charts & Analytics (Left 8 cols) vs Order Form (Right 4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left Column: Interactive Candlestick Chart, Positions & Metrics */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Real-time Candlestick & Volume Chart with Order Book */}
            <ChartSection />

            {/* Positions, Orders, Trade History & Volatility Alerts */}
            <PositionsAndOrders />

            {/* Advanced Performance Analytics Dashboard */}
            <MetricsDashboard />
          </div>

          {/* Right Column: Execution Form (Limit, Escalonada, Trailing Stop, TP/SL, 1-5x, ISOLATED) */}
          <div className="lg:col-span-4 sticky top-[72px]">
            <OrderForm />
          </div>
        </div>
      </main>

      {/* Footer info & protocol adherence note */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-3 px-4 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>Binance USDⓈ-M Futures WebSocket API v1 Engine</span>
          <span className="text-amber-400/80">
            Apalancamiento Restringido: 1x-5x • Modo: Margen ISOLATED Obligatorio • TIF: GTC
          </span>
          <span>WebSockets Seguros (WSS) con Ping/Pong cada 3 min</span>
        </div>
      </footer>

      {/* Modals & Overlays */}
      {isApiModalOpen && <ApiKeyModal onClose={() => setIsApiModalOpen(false)} />}
      {isConsoleOpen && <WebSocketConsole onClose={() => setIsConsoleOpen(false)} />}
      <NotificationToasts />
    </div>
  );
}
