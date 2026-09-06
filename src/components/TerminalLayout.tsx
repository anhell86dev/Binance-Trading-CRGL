import React, { useState, useEffect } from 'react';
import { strategyAutofillService } from '../services/strategyAutofillService';
import { TacticalWorkspace } from './TacticalWorkspace';
import { FuturesOrderModal } from './FuturesOrderModal';
import { ApiKeyModal } from './ApiKeyModal';
import { WebSocketConsole } from './WebSocketConsole';
import { NotificationToasts } from './NotificationToasts';
import { NavTab } from './Navbar';
import { TradingStrategiesView } from './TradingStrategiesView';
import { WalletView } from './WalletView';
import { TopOperacionesView } from './TopOperacionesView';
import { GestionTradesView } from './GestionTradesView';
import { TradingDisciplinesModal } from './TradingDisciplinesModal';
import { AdminLTELayout } from './AdminLTELayout';

export default function TerminalLayout() {
  // Pestaña activa por defecto: Billetera
  const [activeTab, setActiveTab] = useState<NavTab>('billetera');
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isDisciplinesModalOpen, setIsDisciplinesModalOpen] = useState(false);

  useEffect(() => {
    // Escucha solicitudes automáticas de apertura de modal (ej. Autoejecutar de estrategia)
    const unsubModal = strategyAutofillService.subscribeToModalTrigger(() => {
      setIsOrderModalOpen(true);
    });

    return () => {
      unsubModal();
    };
  }, []);

  return (
    <AdminLTELayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onOpenApiModal={() => setIsApiModalOpen(true)}
      onOpenOrderModal={() => setIsOrderModalOpen(true)}
      onOpenDisciplinesModal={() => setIsDisciplinesModalOpen(true)}
      onOpenConsole={() => setIsConsoleOpen(true)}
      isConsoleOpen={isConsoleOpen}
    >
      {/* 1. Pestaña: Billetera de Futuros */}
      {activeTab === 'billetera' && (
        <div className="w-full h-full p-2 sm:p-4 lg:p-6 overflow-y-auto">
          <WalletView
            onGoToTrading={() => setActiveTab('futuros')}
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
            onGoToGestionTrades={() => setActiveTab('gestion-trades')}
          />
        </div>
      )}

      {/* 2. Pestaña: Gestión de Trades */}
      {activeTab === 'gestion-trades' && (
        <div className="w-full h-full p-2 sm:p-4 lg:p-6 overflow-y-auto">
          <GestionTradesView
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
            onGoToTrading={() => setActiveTab('futuros')}
            onOpenApiModal={() => setIsApiModalOpen(true)}
            onOpenConsole={() => setIsConsoleOpen(true)}
          />
        </div>
      )}

      {/* 3. Pestaña: Terminal Futuros (Tactical Workspace) */}
      {activeTab === 'futuros' && (
        <div className="w-full h-full p-2 overflow-hidden flex flex-col">
          <TacticalWorkspace onOpenOrderModal={() => setIsOrderModalOpen(true)} />
        </div>
      )}

      {/* 4. Pestaña: Estrategias Google Sheets */}
      {activeTab === 'estrategias' && (
        <div className="w-full h-full p-2 sm:p-4 lg:p-6 overflow-y-auto">
          <TradingStrategiesView
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
            onNavigateToFutures={() => setActiveTab('futuros')}
          />
        </div>
      )}

      {/* 5. Pestaña: Plan de Trabajo (Top R:B) */}
      {activeTab === 'top-operaciones' && (
        <div className="w-full h-full p-2 sm:p-4 lg:p-6 overflow-y-auto">
          <TopOperacionesView
            onOpenOrderModal={() => setIsOrderModalOpen(true)}
            onNavigateToFutures={() => setActiveTab('futuros')}
          />
        </div>
      )}

      {/* Modales Globales & Sistema de Notificaciones Toast */}
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
    </AdminLTELayout>
  );
}
