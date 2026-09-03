import React, { useState, useEffect } from 'react';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { TacticalWorkspace } from './TacticalWorkspace';
import { FuturesOrderModal } from './FuturesOrderModal';
import { ApiKeyModal } from './ApiKeyModal';
import { WebSocketConsole } from './WebSocketConsole';
import { NotificationToasts } from './NotificationToasts';
import { Navbar, NavTab } from './Navbar';
import { TradingStrategiesView } from './TradingStrategiesView';
import { WalletView } from './WalletView';
import { TradingDisciplinesModal } from './TradingDisciplinesModal';

export default function TerminalLayout() {
  // Billetera al principio como pestaña por defecto
  const [activeTab, setActiveTab] = useState<NavTab>('billetera');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDisciplinesModalOpen, setIsDisciplinesModalOpen] = useState(false);

  useEffect(() => {
    // Listen to automatic popup requests (e.g. from Autoejecutar or quick actions)
    const unsubModal = strategyAutofillService.subscribeToModalTrigger(() => {
      setIsOrderModalOpen(true);
    });

    return () => {
      unsubModal();
    };
  }, []);

  return (
    <div className="h-screen w-full bg-neutral-950 text-neutral-100 overflow-hidden flex flex-col font-sans select-none selection:bg-amber-500/20 selection:text-amber-300">
      {/* 1. Header Minimalista con Navegación (Billetera -> Estrategias -> Futuros), Sello de Seguridad y Botón Popup Orden */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenApiModal={() => setIsApiModalOpen(true)}
        onOpenOrderModal={() => setIsOrderModalOpen(true)}
        onOpenDisciplinesModal={() => setIsDisciplinesModalOpen(true)}
        onOpenConsole={() => setIsConsoleOpen(true)}
        isConsoleOpen={isConsoleOpen}
      />

      {/* 2. Pestaña 1: Billetera (Al Principio) */}
      {activeTab === 'billetera' && (
        <main className="flex-1 overflow-y-auto h-[calc(100vh-3rem)] w-full bg-neutral-950 flex flex-col">
          <WalletView
            onGoToTrading={() => setActiveTab('futuros')}
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
          />
        </main>
      )}

      {/* 3. Pestaña 2: Estrategias (Formato Tablas) */}
      {activeTab === 'estrategias' && (
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 bg-neutral-950 h-[calc(100vh-3rem)]">
          <div className="max-w-7xl mx-auto">
            <TradingStrategiesView onOpenOrderModal={() => setIsOrderModalOpen(true)} />
          </div>
        </main>
      )}

      {/* 4. Pestaña 3: Futuros (Solo la tarjeta de enmedio, sin catálogo R/B, sin diario, sin riesgo fijo y sin bandeja rápida) */}
      {activeTab === 'futuros' && (
        <main className="flex-1 p-2 sm:p-3 overflow-hidden h-[calc(100vh-3rem)] flex flex-col">
          <TacticalWorkspace onOpenOrderModal={() => setIsOrderModalOpen(true)} />
        </main>
      )}

      {/* Modales Globales & Notificaciones */}
      <FuturesOrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
      <TradingDisciplinesModal
        isOpen={isDisciplinesModalOpen}
        onClose={() => setIsDisciplinesModalOpen(false)}
      />
      {isApiModalOpen && <ApiKeyModal onClose={() => setIsApiModalOpen(false)} />}
      {isConsoleOpen && <WebSocketConsole onClose={() => setIsConsoleOpen(false)} />}
      <NotificationToasts />
    </div>
  );
}
