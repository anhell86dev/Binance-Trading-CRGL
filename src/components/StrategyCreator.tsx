import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Database,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  HelpCircle,
  Layers,
  Lock,
  Percent,
  Play,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { GoogleSheetStrategyRow, StrategyExecutionPlan } from '../types/strategy';
import {
  SAMPLE_GOOGLE_SHEET_CSV,
  convertToGoogleSheetCsvUrl,
  generateExecutionPlan,
  parseCsvToStrategies,
} from '../utils/sheetParser';
import { binanceWs } from '../services/binanceWs';
import { notificationService } from '../services/notifications';

interface StrategyCreatorProps {
  onSwitchToOrders?: () => void;
}

export const StrategyCreator: React.FC<StrategyCreatorProps> = ({ onSwitchToOrders }) => {
  // Sheet Connection State
  const [sheetUrl, setSheetUrl] = useState('');
  const [isLoadingSheet, setIsLoadingSheet] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>([]);
  const [selectedStrategyIndex, setSelectedStrategyIndex] = useState(0);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [pastedCsvText, setPastedCsvText] = useState(SAMPLE_GOOGLE_SHEET_CSV);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Strategy Execution Plan State
  const [usdtAllocation, setUsdtAllocation] = useState<number>(300);
  const [selectedLeverage, setSelectedLeverage] = useState<number>(2);
  const [executionPlan, setExecutionPlan] = useState<StrategyExecutionPlan | null>(null);

  // Authorization Modal & Status
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [confirmedSafetyCheck, setConfirmedSafetyCheck] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [createdOrderReceipts, setCreatedOrderReceipts] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'plan' | 'sheet_data' | 'guide'>('plan');

  // Load default sample strategy on initial mount
  useEffect(() => {
    const defaultList = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    if (defaultList.length > 0) {
      setStrategies(defaultList);
      setSelectedStrategyIndex(0);
      setLastSyncTime(Date.now());
    }
  }, []);

  // Recalculate execution plan whenever strategy, allocation, or leverage changes
  useEffect(() => {
    if (strategies.length > 0 && strategies[selectedStrategyIndex]) {
      const currentStrategy = strategies[selectedStrategyIndex];
      const plan = generateExecutionPlan(currentStrategy, usdtAllocation, selectedLeverage);
      setExecutionPlan(plan);
      // Reset created orders if parameters change before dispatching
      if (createdOrderReceipts.length === 0) {
        setExecutionPlan(plan);
      }
    }
  }, [strategies, selectedStrategyIndex, usdtAllocation, selectedLeverage]);

  // Handler to fetch from Google Sheet URL
  const handleSyncGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      setSheetError('Por favor ingresa la URL de la Google Sheet');
      return;
    }

    setIsLoadingSheet(true);
    setSheetError(null);

    try {
      const csvExportUrl = convertToGoogleSheetCsvUrl(sheetUrl);

      // Attempt to fetch public or published Google Sheet as CSV
      const res = await fetch(csvExportUrl);
      if (!res.ok) {
        throw new Error(
          `No se pudo descargar el archivo de Google Sheets (HTTP ${res.status}). Asegúrate de que la hoja tenga permisos "Cualquier persona con el enlace puede ver" o esté publicada en la web.`
        );
      }

      const csvContent = await res.text();
      const parsed = parseCsvToStrategies(csvContent);

      if (parsed.length === 0) {
        throw new Error('No se detectaron filas válidas de estrategia en el Google Sheet.');
      }

      setStrategies(parsed);
      setSelectedStrategyIndex(0);
      setLastSyncTime(Date.now());
      setCreatedOrderReceipts([]);
      notificationService.notify(
        'SYSTEM',
        'Google Sheets Sincronizado',
        `Se importaron exitosamente ${parsed.length} estrategia(s) desde la hoja de cálculo.`,
        'normal'
      );
    } catch (err: any) {
      console.warn('Sync error:', err);
      setSheetError(
        err.message || 'Error al conectar con Google Sheets. Si hay restricción CORS, puedes usar la opción "Pegar CSV".'
      );
    } finally {
      setIsLoadingSheet(false);
    }
  };

  // Handler to apply pasted CSV data
  const handleApplyPastedCsv = () => {
    try {
      const parsed = parseCsvToStrategies(pastedCsvText);
      if (parsed.length === 0) {
        setSheetError('El texto CSV ingresado no contiene datos válidos.');
        return;
      }
      setStrategies(parsed);
      setSelectedStrategyIndex(0);
      setLastSyncTime(Date.now());
      setCreatedOrderReceipts([]);
      setIsCsvModalOpen(false);
      setSheetError(null);
      notificationService.notify(
        'SYSTEM',
        'CSV de Google Sheets Cargado',
        `Se cargaron ${parsed.length} estrategia(s).`,
        'normal'
      );
    } catch (e: any) {
      setSheetError(e.message || 'Error al procesar el CSV.');
    }
  };

  // Handler to load default sample sheet (STRAT-ZEC-001)
  const handleLoadDefaultPreset = () => {
    setPastedCsvText(SAMPLE_GOOGLE_SHEET_CSV);
    const parsed = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    setStrategies(parsed);
    setSelectedStrategyIndex(0);
    setLastSyncTime(Date.now());
    setCreatedOrderReceipts([]);
    setSheetError(null);
    setUsdtAllocation(300);
    setSelectedLeverage(2);
    notificationService.notify('SYSTEM', 'Estrategia STRAT-ZEC-001 Cargada', 'Datos de Google Sheets predeterminados restaurados.');
  };

  // Switch terminal symbol to strategy pair (e.g. ZECUSDT)
  const handleTuneTerminalSymbol = (symbol: string) => {
    binanceWs.setSymbol(symbol);
    notificationService.notify('SYSTEM', 'Símbolo Sincronizado', `Terminal configurada en ${symbol}`);
  };

  // MANDATORY AUTHORIZATION: Dispatch orders to Binance only with operator confirmation
  const handleAuthorizeAndCreateOnBinance = async () => {
    if (!executionPlan) return;
    setIsDispatching(true);

    try {
      // Mark execution plan as authorized
      const authorizedPlan: StrategyExecutionPlan = {
        ...executionPlan,
        status: 'AUTHORIZED_CREATED',
        authorizedAt: Date.now(),
      };

      // Send to Binance Engine
      const orderIds = await binanceWs.placeStrategyOrders(authorizedPlan);
      setCreatedOrderReceipts(orderIds);
      setExecutionPlan(authorizedPlan);
      setIsAuthModalOpen(false);
    } catch (err: any) {
      notificationService.notify('SYSTEM', 'Error al autorizar estrategia', err.message, 'urgent');
    } finally {
      setIsDispatching(false);
    }
  };

  // Cancel strategy orders
  const handleCancelStrategyOrders = async () => {
    if (!executionPlan) return;
    await binanceWs.cancelAllOrders(executionPlan.symbol);
    setCreatedOrderReceipts([]);
    setExecutionPlan({
      ...executionPlan,
      status: 'DRAFT_PENDING_AUTH',
      createdOrderIds: [],
    });
    notificationService.notify('SYSTEM', 'Órdenes de Estrategia Canceladas', 'Las órdenes en Binance fueron canceladas.');
  };

  const currentStrategy = strategies[selectedStrategyIndex];
  const isTerminalOnSameSymbol = currentStrategy && binanceWs.getCurrentSymbol() === currentStrategy.par;

  return (
    <div className="flex flex-col gap-4 p-4 text-neutral-100 bg-neutral-900/90 rounded-xl border border-neutral-800">
      {/* 1. Header & Google Sheets Connection Bar */}
      <div className="flex flex-col gap-3 pb-3 border-b border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Creador de Estrategia</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Google Sheets Sync
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Autorización Obligatoria
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Sincroniza planes tácticos desde Google Sheets y crea órdenes en Binance bajo tu autorización explícita.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="load-default-strat-btn"
              onClick={handleLoadDefaultPreset}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
              title="Cargar la estrategia ZEC Rango Táctico STRAT-ZEC-001"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Cargar STRAT-ZEC-001</span>
            </button>

            <button
              id="open-csv-modal-btn"
              onClick={() => setIsCsvModalOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg border border-neutral-700 flex items-center gap-1.5 transition-colors"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pegar / Editar CSV</span>
            </button>
          </div>
        </div>

        {/* Connection Input Bar */}
        <div className="flex flex-col sm:flex-row gap-2 items-center">
          <div className="relative flex-1 w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-500">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <input
              id="google-sheet-url-input"
              type="text"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="Pega la URL de tu Google Sheet (ej: https://docs.google.com/spreadsheets/d/.../edit)"
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 focus:outline-none focus:border-emerald-500 font-mono placeholder:text-neutral-600"
            />
          </div>

          <button
            id="sync-sheet-btn"
            onClick={handleSyncGoogleSheet}
            disabled={isLoadingSheet}
            className="w-full sm:w-auto px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shadow-sm shadow-emerald-900/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSheet ? 'animate-spin' : ''}`} />
            <span>{isLoadingSheet ? 'Sincronizando...' : 'Conectar Google Sheet'}</span>
          </button>
        </div>

        {sheetError && (
          <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{sheetError}</span>
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="underline hover:text-rose-100 font-medium"
            >
              Usar importador CSV
            </button>
          </div>
        )}

        {/* Sync Status Banner */}
        {lastSyncTime && (
          <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1 font-mono">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Sincronizado con Google Sheets ({strategies.length} fila(s) cargada(s))</span>
            </div>
            <span>Última sincronización: {new Date(lastSyncTime).toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* 2. Navigation & Strategy Selector Pills */}
      {strategies.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
          <div className="flex items-center gap-2 overflow-x-auto py-1">
            <span className="text-xs font-semibold text-neutral-400 whitespace-nowrap">Estrategias:</span>
            {strategies.map((strat, idx) => (
              <button
                key={strat.noEstrategia + idx}
                id={`strat-tab-${idx}`}
                onClick={() => {
                  setSelectedStrategyIndex(idx);
                  setCreatedOrderReceipts([]);
                }}
                className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  selectedStrategyIndex === idx
                    ? 'bg-neutral-800 text-amber-300 border border-amber-500/50 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
                }`}
              >
                <span className="font-mono font-bold">{strat.noEstrategia}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-700 text-neutral-300 font-mono">
                  {strat.par}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-md border border-neutral-800 text-xs">
            <button
              onClick={() => setActiveTab('plan')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'plan' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Plan de Órdenes
            </button>
            <button
              onClick={() => setActiveTab('sheet_data')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'sheet_data' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Detalles Sheet
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeTab === 'guide' ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Guía
            </button>
          </div>
        </div>
      )}

      {/* 3. Strategy Overview Card (STRAT-ZEC-001) */}
      {currentStrategy && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Strategy Meta & Signals (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-xl flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                      {currentStrategy.noEstrategia}
                    </span>
                    <span className="text-xs text-neutral-400">{currentStrategy.fecha}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1">{currentStrategy.nombreEstrategia}</h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className="font-mono text-sm font-bold text-emerald-400">{currentStrategy.par}</span>
                  <span className="text-[10px] text-neutral-400 font-mono bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-800">
                    {currentStrategy.temporalidad}
                  </span>
                </div>
              </div>

              {/* Terminal sync helper if not currently viewing the strategy pair */}
              {!isTerminalOnSameSymbol && (
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                  <span className="text-[11px]">
                    El terminal está en <b>{binanceWs.getCurrentSymbol()}</b>. ¿Sintonizar con {currentStrategy.par}?
                  </span>
                  <button
                    onClick={() => handleTuneTerminalSymbol(currentStrategy.par)}
                    className="px-2 py-1 bg-amber-500 text-neutral-950 font-bold rounded text-[10px] hover:bg-amber-400 transition-colors whitespace-nowrap"
                  >
                    Sintonizar {currentStrategy.par}
                  </button>
                </div>
              )}

              {/* Technical Indicators */}
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-neutral-300 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                  Indicadores Clave del Análisis
                </span>
                <p className="text-xs text-neutral-300 font-mono leading-relaxed">
                  {currentStrategy.indicadoresClave || 'SMA-15, SMA-30, Soporte y Volumen'}
                </p>
              </div>

              {/* Strategy Rules Grid */}
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">
                    Reglas de Entrada (Escalonada)
                  </span>
                  <p className="text-[11px] text-neutral-300">{currentStrategy.reglasDeEntrada}</p>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block mb-0.5">
                    Reglas de Salida / Take Profit (TP)
                  </span>
                  <p className="text-[11px] text-neutral-300">{currentStrategy.reglasDeSalidaTP}</p>
                </div>

                <div className="p-2 rounded-lg bg-neutral-900/60 border border-neutral-800/80">
                  <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">
                    Gestión de Riesgo & Stop Loss
                  </span>
                  <p className="text-[11px] text-neutral-300">{currentStrategy.gestionDeRiesgoStopLoss}</p>
                </div>
              </div>

              {currentStrategy.comentariosBacktesting && (
                <div className="p-2 rounded-lg bg-neutral-900/40 border border-neutral-800/60 text-[11px] text-neutral-400 italic">
                  <b>Ponderación / Backtesting:</b> {currentStrategy.comentariosBacktesting}
                </div>
              )}
            </div>

            {/* Position Size & Risk Customization */}
            <div className="bg-neutral-950/70 border border-neutral-800 p-3.5 rounded-xl flex flex-col gap-3">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                Configurar Capital & Apalancamiento para Binance
              </span>

              {/* USDT Allocation Input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Margen a Asignar:</span>
                  <span className="font-mono font-bold text-white">{usdtAllocation} USDT</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="usdt-allocation-input"
                    type="number"
                    min="10"
                    max="50000"
                    step="10"
                    value={usdtAllocation}
                    onChange={(e) => setUsdtAllocation(Math.max(10, parseFloat(e.target.value) || 10))}
                    className="flex-1 px-3 py-1.5 text-xs bg-neutral-900 border border-neutral-700 rounded-lg text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                  <div className="flex items-center gap-1">
                    {[100, 250, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setUsdtAllocation(amt)}
                        className={`px-2 py-1 text-[10px] font-mono rounded border transition-colors ${
                          usdtAllocation === amt
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leverage Selector (Strictly ISOLATED 1x-5x) */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Apalancamiento Aislado (ISOLATED):</span>
                  <span className="font-mono font-bold text-amber-400">{selectedLeverage}x Aislado</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map((lev) => (
                    <button
                      key={lev}
                      id={`strat-leverage-${lev}x`}
                      onClick={() => setSelectedLeverage(lev)}
                      className={`py-1.5 text-xs font-mono rounded-lg border transition-all ${
                        selectedLeverage === lev
                          ? 'bg-amber-500 text-neutral-950 font-bold border-amber-400 shadow-sm'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800'
                      }`}
                    >
                      {lev}x
                    </button>
                  ))}
                </div>
                <span className="text-[10px] text-neutral-500 font-mono">
                  * Cumplimiento estricto: la estrategia estipula 2x-3x aislado para mitigar riesgo de cartera.
                </span>
              </div>

              {/* Calculated Strategy Metrics */}
              {executionPlan && (
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-center font-mono">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Posición Total</span>
                    <span className="text-xs font-bold text-white">
                      {executionPlan.totalCoinQty} {currentStrategy.par.replace('USDT', '')}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-rose-400 block">Riesgo SL (Máx)</span>
                    <span className="text-xs font-bold text-rose-400">
                      -${executionPlan.maxLossUsdt?.toFixed(2)} USDT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 block">Ganancia TP</span>
                    <span className="text-xs font-bold text-emerald-400">
                      +${executionPlan.maxProfitUsdt?.toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. Planned Orders Table & MANDATORY AUTHORIZATION PANEL (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {activeTab === 'plan' && executionPlan && (
              <>
                {/* Orders List Preview */}
                <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-3.5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-cyan-400" />
                        Órdenes a Colocar en Binance ({executionPlan.orders.length} órdenes)
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Desglose matemático según soporte, SMA-15, Stop Loss y 3 niveles de TP.
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-900 text-neutral-300 border border-neutral-800">
                      R:R {executionPlan.riskRewardRatio} : 1
                    </span>
                  </div>

                  {/* Orders Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-mono">
                      <thead>
                        <tr className="border-b border-neutral-800 text-[10px] text-neutral-500 uppercase tracking-wider">
                          <th className="py-1.5 pr-2">Orden / Rol</th>
                          <th className="py-1.5 px-2">Tipo</th>
                          <th className="py-1.5 px-2">Lado</th>
                          <th className="py-1.5 px-2 text-right">Precio</th>
                          <th className="py-1.5 px-2 text-right">Cantidad</th>
                          <th className="py-1.5 px-2 text-right">Valor Nocional</th>
                          <th className="py-1.5 pl-2 text-right">Impacto PnL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60">
                        {executionPlan.orders.map((ord) => (
                          <tr key={ord.id} className="hover:bg-neutral-900/50 transition-colors">
                            <td className="py-2 pr-2">
                              <div className="flex flex-col">
                                <span className="font-sans font-semibold text-white text-xs">{ord.label}</span>
                                <span className="text-[10px] text-neutral-500">{ord.description}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-neutral-900 text-neutral-300 border border-neutral-800">
                                {ord.type}
                              </span>
                            </td>
                            <td className="py-2 px-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  ord.side === 'BUY'
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {ord.side}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-bold text-neutral-200">
                              ${ord.price.toFixed(2)}
                            </td>
                            <td className="py-2 px-2 text-right text-neutral-300">
                              {ord.quantity} ({ord.percentage}%)
                            </td>
                            <td className="py-2 px-2 text-right text-neutral-400">
                              ${ord.estNotional.toFixed(2)}
                            </td>
                            <td className="py-2 pl-2 text-right font-bold">
                              {ord.role === 'ENTRY' ? (
                                <span className="text-neutral-400 text-[10px]">Apertura</span>
                              ) : ord.role === 'STOP_LOSS' ? (
                                <span className="text-rose-400 text-[11px]">-${executionPlan.maxLossUsdt}</span>
                              ) : (
                                <span className="text-emerald-400 text-[11px]">
                                  +${ord.pnlTarget?.toFixed(2)}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MANDATORY AUTHORIZATION PANEL */}
                <div
                  id="authorization-panel"
                  className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${
                    createdOrderReceipts.length > 0
                      ? 'bg-emerald-950/20 border-emerald-500/40'
                      : 'bg-amber-950/20 border-amber-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`p-2.5 rounded-lg border ${
                          createdOrderReceipts.length > 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {createdOrderReceipts.length > 0 ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Lock className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {createdOrderReceipts.length > 0
                              ? 'Estrategia Autorizada y Creada en Binance'
                              : 'Control de Autorización Requerido'}
                          </h4>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                              createdOrderReceipts.length > 0
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            }`}
                          >
                            {createdOrderReceipts.length > 0
                              ? 'AUTORIZADO & EN EJECUCIÓN'
                              : 'PENDIENTE DE AUTORIZACIÓN'}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 mt-0.5">
                          {createdOrderReceipts.length > 0
                            ? `Se despacharon ${createdOrderReceipts.length} órdenes al motor de futuros de Binance.`
                            : 'Por política de seguridad estricta, la estrategia solo se debe crear en Binance con el botón de autorización.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* If already created: show order receipt tokens & actions */}
                  {createdOrderReceipts.length > 0 ? (
                    <div className="flex flex-col gap-3 pt-2 border-t border-emerald-500/20">
                      <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-950/80 p-2.5 rounded-lg border border-neutral-800 font-mono text-xs">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4" />
                          Órdenes activas en Binance ({createdOrderReceipts.length})
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            id="view-orders-tab-btn"
                            onClick={() => onSwitchToOrders?.()}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold text-xs transition-colors flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver en Órdenes Abiertas</span>
                          </button>
                          <button
                            onClick={handleCancelStrategyOrders}
                            className="px-3 py-1 bg-rose-600/80 hover:bg-rose-500 text-white rounded text-xs transition-colors"
                          >
                            Cancelar Estrategia
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[10px]">
                        {createdOrderReceipts.map((id) => (
                          <div
                            key={id}
                            className="p-1.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-300 truncate"
                            title={id}
                          >
                            {id}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* Not yet authorized: show big prominent authorization button */
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-amber-500/20">
                      <div className="text-[11px] text-neutral-400">
                        <span>Apalancamiento: </span>
                        <b className="text-amber-400">{executionPlan.leverage}x ISOLATED</b>
                        <span> • Par: </span>
                        <b className="text-white">{executionPlan.symbol}</b>
                        <span> • Órdenes: </span>
                        <b className="text-cyan-400">{executionPlan.orders.length}</b>
                      </div>

                      <button
                        id="authorize-binance-strategy-btn"
                        onClick={() => setIsAuthModalOpen(true)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 transition-all transform active:scale-95"
                      >
                        <Shield className="w-4 h-4 fill-neutral-950" />
                        <span>Autorizar y Crear Estrategia en Binance</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Tab: Raw Sheet Data */}
            {activeTab === 'sheet_data' && (
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
                <h4 className="text-xs font-bold text-white">Datos sin procesar de la fila de Google Sheets</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <tbody>
                      {Object.entries(currentStrategy).map(([key, val]) => (
                        <tr key={key} className="border-b border-neutral-850">
                          <td className="py-2 pr-3 font-semibold text-neutral-400 w-44 capitalize">
                            {key.replace(/([A-Z])/g, ' $1')}
                          </td>
                          <td className="py-2 text-neutral-200 break-words">{val || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Structure Guide */}
            {activeTab === 'guide' && (
              <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3 text-xs leading-relaxed text-neutral-300">
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-400" />
                  Estructura Requerida de Columnas en Google Sheets
                </h4>
                <p>
                  Para sincronizar tus estrategias directamente desde una hoja de cálculo de Google, crea una hoja con las
                  siguientes 11 columnas en la primera fila:
                </p>
                <div className="p-3 bg-neutral-900 rounded-lg border border-neutral-800 font-mono text-[11px] text-emerald-300 overflow-x-auto">
                  No. Estrategia, Fecha, Nombre de Estrategia, Par, Temporalidad, Tipo de Orden, Indicadores Clave, Reglas
                  de Entrada, Reglas de Salida / TP, Gestión de Riesgo & Stop Loss, Comentarios / Backtesting
                </div>
                <div className="flex flex-col gap-1 text-[11px] text-neutral-400">
                  <p>
                    • <b>Compartir:</b> En Google Sheets, ve a <i>Archivo → Compartir → Publicar en la web</i> (o asegúrate de que el enlace sea accesible).
                  </p>
                  <p>
                    • <b>Apalancamiento:</b> Se extrae automáticamente de la columna <i>Gestión de Riesgo</i> y se restringe a 1x-5x Aislado (ISOLATED).
                  </p>
                  <p>
                    • <b>Autorización:</b> Por seguridad de fondos, ninguna orden se enviará a Binance hasta presionar el botón de autorización.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. MODAL DE AUTORIZACIÓN MANUAL OBLIGATORIA */}
      {isAuthModalOpen && executionPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-amber-500/50 rounded-2xl max-w-lg w-full p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Autorización de Estrategia en Binance</h3>
                  <p className="text-xs text-neutral-400">Confirmación explícita del operador requerida</p>
                </div>
              </div>
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Checklist of what will be dispatched */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Estrategia:</span>
                <span className="font-bold text-amber-300">{executionPlan.strategyId} ({executionPlan.name})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Mercado & Par:</span>
                <span className="font-bold text-white">{executionPlan.symbol} USDⓈ-M Futures</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Modo de Margen:</span>
                <span className="font-bold text-emerald-400">ISOLATED (Aislado Obligatorio)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Apalancamiento:</span>
                <span className="font-bold text-amber-400">{executionPlan.leverage}x</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Capital Asignado:</span>
                <span className="font-bold text-white">{executionPlan.totalUsdtAllocation} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Órdenes a Crear:</span>
                <span className="font-bold text-cyan-400">{executionPlan.orders.length} órdenes simultáneas</span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-800/80 pt-2">
                <span className="text-neutral-400">Riesgo Máximo en Stop Loss:</span>
                <span className="font-bold text-rose-400">-${executionPlan.maxLossUsdt?.toFixed(2)} USDT</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Ganancia Estimada en TPs:</span>
                <span className="font-bold text-emerald-400">+${executionPlan.maxProfitUsdt?.toFixed(2)} USDT</span>
              </div>
            </div>

            {/* Operator confirmation toggle */}
            <label className="flex items-start gap-2.5 text-xs text-neutral-300 cursor-pointer p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800 hover:border-neutral-700 transition-colors">
              <input
                id="safety-confirm-checkbox"
                type="checkbox"
                checked={confirmedSafetyCheck}
                onChange={(e) => setConfirmedSafetyCheck(e.target.checked)}
                className="mt-0.5 rounded bg-neutral-800 border-neutral-600 text-amber-500 focus:ring-0 w-4 h-4 cursor-pointer"
              />
              <span className="leading-snug">
                He revisado los niveles de soporte, Stop Loss estricto a $759 y las tomas de beneficios. Autorizo a la terminal a crear las órdenes en el motor de Binance.
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
              >
                Cancelar
              </button>

              <button
                id="confirm-dispatch-binance-btn"
                onClick={handleAuthorizeAndCreateOnBinance}
                disabled={!confirmedSafetyCheck || isDispatching}
                className="px-5 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-neutral-950 rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-950/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isDispatching ? 'Despachando a Binance...' : 'Confirmar y Despachar a Binance'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL PARA PEGAR O EDITAR CSV DE GOOGLE SHEETS */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl max-w-2xl w-full p-5 flex flex-col gap-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Pegar o Importar CSV de Google Sheets</h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Pega aquí el contenido copiado desde tu Google Sheet (incluyendo la fila de encabezados) para sincronizar inmediatamente sin depender de enlaces públicos.
            </p>

            <textarea
              id="csv-textarea"
              rows={8}
              value={pastedCsvText}
              onChange={(e) => setPastedCsvText(e.target.value)}
              className="w-full p-3 bg-neutral-950 border border-neutral-700 rounded-lg text-neutral-200 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-y"
              placeholder="No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad..."
            />

            <div className="flex items-center justify-between gap-2 pt-2">
              <button
                onClick={() => setPastedCsvText(SAMPLE_GOOGLE_SHEET_CSV)}
                className="text-xs text-neutral-400 hover:text-amber-300 underline font-mono"
              >
                Restaurar texto STRAT-ZEC-001
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  id="apply-csv-btn"
                  onClick={handleApplyPastedCsv}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Procesar Estrategias</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
