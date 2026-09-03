import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Download,
  Copy,
  Check,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  ExternalLink,
  Code,
  ShieldCheck,
  AlertCircle,
  Link as LinkIcon,
  CheckCircle2,
  Layers,
  KeyRound,
  Shield,
} from 'lucide-react';
import { strategyService, OFFICIAL_GOOGLE_SHEET_URL } from '../services/strategyService';
import { ordersSheetService } from '../services/ordersSheetService';
import { googleSheetsApiService } from '../services/googleSheetsApiService';
import { GoogleSheetStrategyRow, StrategyTradeStatus } from '../types/strategy';
import { SAMPLE_GOOGLE_SHEET_CSV, normalizeStrategyStatus, DEFAULT_ORDERS_SHEET_CSV_TEMPLATE } from '../utils/sheetParser';

interface GoogleDocsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleDocsManagerModal: React.FC<GoogleDocsManagerModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'CATALOG' | 'ORDERS' | 'WRITE' | 'READ'>('CATALOG');
  const [strategies, setStrategies] = useState<GoogleSheetStrategyRow[]>(() => strategyService.getStrategies());
  const [customSheetUrl, setCustomSheetUrl] = useState<string>(() => strategyService.getCustomSheetUrl());
  const [webhookUrl, setWebhookUrl] = useState<string>(() => strategyService.getWebhookUrl());
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [csvInput, setCsvInput] = useState('');
  const [editingRow, setEditingRow] = useState<GoogleSheetStrategyRow | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showAppsScriptCode, setShowAppsScriptCode] = useState(false);

  // Orders Sheet State
  const [ordersTabName, setOrdersTabName] = useState(() => ordersSheetService.getSheetTabName());
  const [ordersGid, setOrdersGid] = useState(() => ordersSheetService.getSheetGid());
  const [sheetOrders, setSheetOrders] = useState(() => ordersSheetService.getOrders());
  const [isSyncingOrders, setIsSyncingOrders] = useState(() => ordersSheetService.getIsSyncing());
  const [ordersSyncError, setOrdersSyncError] = useState(() => ordersSheetService.getLastSyncError());
  const [ordersLastSync, setOrdersLastSync] = useState(() => ordersSheetService.getLastSyncTime());

  // Google Sheets API OAuth State
  const [isGoogleAuthorized, setIsGoogleAuthorized] = useState(() => googleSheetsApiService.isAuthenticated());
  const [isAuthorizingGoogle, setIsAuthorizingGoogle] = useState(false);

  // New Strategy Form State
  const [newStrategy, setNewStrategy] = useState<Partial<GoogleSheetStrategyRow>>({
    noEstrategia: '',
    fecha: new Date().toISOString().split('T')[0],
    nombreEstrategia: '',
    par: 'ZECUSDT',
    temporalidad: '1D / 4H / 1H',
    tipoDeOrden: 'Limit (DCA Escalonado) + Stop-Market + Take-Profit',
    indicadoresClave: '',
    reglasDeEntrada: '',
    reglasDeSalidaTP: '',
    gestionDeRiesgoStopLoss: '',
    comentariosBacktesting: '',
    estado: 'Activa',
  });

  useEffect(() => {
    const unsub = strategyService.subscribe(() => {
      setStrategies([...strategyService.getStrategies()]);
    });
    const unsubOrders = ordersSheetService.subscribe(() => {
      setSheetOrders([...ordersSheetService.getOrders()]);
      setOrdersTabName(ordersSheetService.getSheetTabName());
      setOrdersGid(ordersSheetService.getSheetGid());
      setIsSyncingOrders(ordersSheetService.getIsSyncing());
      setOrdersSyncError(ordersSheetService.getLastSyncError());
      setOrdersLastSync(ordersSheetService.getLastSyncTime());
    });
    const unsubGoogle = googleSheetsApiService.subscribe(() => {
      setIsGoogleAuthorized(googleSheetsApiService.isAuthenticated());
    });
    return () => {
      unsub();
      unsubOrders();
      unsubGoogle();
    };
  }, []);

  if (!isOpen) return null;

  const showNotification = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleConnectGoogleSheetsApi = async () => {
    setIsAuthorizingGoogle(true);
    try {
      await googleSheetsApiService.requestAccessToken();
      showNotification('success', '¡Conexión directa con Google Sheets API v4 autorizada!');
      setIsSyncing(true);
      await Promise.all([
        strategyService.syncFromGoogleSheets(customSheetUrl),
        ordersSheetService.syncOrdersFromGoogleSheet(customSheetUrl),
      ]);
      setIsSyncing(false);
    } catch (err: any) {
      showNotification('error', err.message || 'Error al conectar con la API de Google Sheets.');
    } finally {
      setIsAuthorizingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    googleSheetsApiService.setAccessToken(null);
    showNotification('success', 'Sesión de Google Sheets API desconectada.');
  };

  const handleCopyCsv = async () => {
    const ok = await strategyService.copyCsvToClipboard();
    if (ok) {
      setCopiedSuccess(true);
      showNotification('success', '¡Catálogo copiado al portapapeles! Puedes pegarlo directamente en Google Docs o Google Sheets.');
      setTimeout(() => setCopiedSuccess(false), 2500);
    } else {
      showNotification('error', 'No se pudo copiar automáticamente. Puedes descargar el archivo .CSV');
    }
  };

  const handleDownloadCsv = () => {
    strategyService.downloadCsvFile();
    showNotification('success', 'Archivo catalogo_estrategias_google_docs.csv generado y descargado.');
  };

  const handleImportCsv = () => {
    if (!csvInput.trim()) {
      showNotification('error', 'Por favor ingresa o pega el contenido CSV antes de importar.');
      return;
    }
    const ok = strategyService.saveRawCsv(csvInput);
    if (ok) {
      showNotification('success', '¡Catálogo actualizado correctamente desde el texto CSV!');
      setCsvInput('');
      setActiveTab('CATALOG');
    } else {
      showNotification('error', 'El formato del CSV no coincide con las columnas requeridas de Google Docs.');
    }
  };

  const handleRestoreOfficial = () => {
    strategyService.refreshOfficialStrategies();
    showNotification('success', 'Catálogo restablecido al documento oficial de Google Docs (10 estrategias)');
  };

  const handleStatusChange = (id: string, newStatus: StrategyTradeStatus) => {
    const found = strategies.find((s) => s.noEstrategia === id);
    if (found) {
      const updated = { ...found, estado: newStatus };
      strategyService.updateStrategyRow(updated);
      showNotification('success', `Estado de ${id} cambiado a "${newStatus}" y guardado.`);
    }
  };

  const handleSaveEditRow = () => {
    if (!editingRow) return;
    strategyService.updateStrategyRow(editingRow);
    showNotification('success', `Estrategia ${editingRow.noEstrategia} actualizada y escrita en el catálogo.`);
    setEditingRow(null);
  };

  const handleSaveNewStrategy = () => {
    if (!newStrategy.noEstrategia?.trim() || !newStrategy.nombreEstrategia?.trim()) {
      showNotification('error', 'El número de estrategia y el nombre son obligatorios.');
      return;
    }
    const fullRow: GoogleSheetStrategyRow = {
      noEstrategia: newStrategy.noEstrategia.trim(),
      fecha: newStrategy.fecha || new Date().toISOString().split('T')[0],
      nombreEstrategia: newStrategy.nombreEstrategia.trim(),
      par: (newStrategy.par || 'ZECUSDT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
      temporalidad: newStrategy.temporalidad || '1D / 4H / 1H',
      tipoDeOrden: newStrategy.tipoDeOrden || 'Limit (DCA) + SL + TP',
      indicadoresClave: newStrategy.indicadoresClave || '',
      reglasDeEntrada: newStrategy.reglasDeEntrada || '',
      reglasDeSalidaTP: newStrategy.reglasDeSalidaTP || '',
      gestionDeRiesgoStopLoss: newStrategy.gestionDeRiesgoStopLoss || '',
      comentariosBacktesting: newStrategy.comentariosBacktesting || '',
      estado: (newStrategy.estado as StrategyTradeStatus) || 'Activa',
    };

    strategyService.addStrategyRow(fullRow);
    showNotification('success', `Nueva estrategia ${fullRow.noEstrategia} agregada al catálogo.`);
    setIsAddingNew(false);
    setNewStrategy({
      noEstrategia: '',
      fecha: new Date().toISOString().split('T')[0],
      nombreEstrategia: '',
      par: 'ZECUSDT',
      temporalidad: '1D / 4H / 1H',
      tipoDeOrden: 'Limit (DCA Escalonado) + Stop-Market + Take-Profit',
      indicadoresClave: '',
      reglasDeEntrada: '',
      reglasDeSalidaTP: '',
      gestionDeRiesgoStopLoss: '',
      comentariosBacktesting: '',
      estado: 'Activa',
    });
  };

  const handleDeleteRow = (id: string) => {
    if (confirm(`¿Estás seguro de eliminar la estrategia ${id} del catálogo de Google Docs?`)) {
      strategyService.deleteStrategyRow(id);
      showNotification('success', `Estrategia ${id} eliminada.`);
    }
  };

  const handleSaveWebhook = async () => {
    strategyService.setWebhookUrl(webhookUrl);
    if (webhookUrl.trim()) {
      const res = await strategyService.syncToWebhook(webhookUrl);
      if (res.success) {
        showNotification('success', 'URL de Webhook guardada y prueba de sincronización enviada con éxito.');
      } else {
        showNotification('error', res.message);
      }
    } else {
      showNotification('success', 'URL de Webhook desactivada.');
    }
  };

  const handleSyncFromSheetUrl = async () => {
    setIsSyncing(true);
    strategyService.setCustomSheetUrl(customSheetUrl);
    await Promise.all([
      strategyService.syncFromGoogleSheets(customSheetUrl),
      ordersSheetService.syncOrdersFromGoogleSheet(customSheetUrl),
    ]);
    setIsSyncing(false);
    showNotification('success', 'Sincronización completada desde Google Sheets (Estrategias y Órdenes).');
  };

  const handleSaveOrdersConfig = async () => {
    ordersSheetService.setSheetTabName(ordersTabName);
    ordersSheetService.setSheetGid(ordersGid);
    setIsSyncingOrders(true);
    const ok = await ordersSheetService.syncOrdersFromGoogleSheet();
    setIsSyncingOrders(false);
    if (ok) {
      showNotification('success', `¡Órdenes sincronizadas con éxito desde la pestaña "${ordersTabName}" de Google Sheets!`);
    } else {
      showNotification('error', ordersSheetService.getLastSyncError() || 'No se pudieron recuperar las órdenes.');
    }
  };

  const handleCopyOrdersTemplate = async () => {
    const ok = await ordersSheetService.copyTemplateCsv();
    if (ok) {
      showNotification('success', '¡Plantilla CSV de órdenes copiada al portapapeles! Pégala en tu pestaña de Google Sheets.');
    } else {
      showNotification('error', 'Error al copiar la plantilla.');
    }
  };

  const handleCopyCurrentOrders = async () => {
    const ok = await ordersSheetService.copyCurrentOrdersCsv();
    if (ok) {
      showNotification('success', '¡Órdenes actuales copiadas al portapapeles en formato CSV!');
    } else {
      showNotification('error', 'Error al copiar las órdenes.');
    }
  };

  const handleDownloadOrdersCsv = () => {
    ordersSheetService.downloadOrdersCsv();
    showNotification('success', 'Archivo CSV de órdenes descargado.');
  };

  const appsScriptCodeSnippet = `// Código para Google Apps Script (Extensiones > Apps Script en tu Google Sheet)
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var csv = data.csv;
    var rows = Utilities.parseCsv(csv);
    
    // Limpiar y sobrescribir con los nuevos datos recibidos
    sheet.clearContents();
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", rows: rows.length }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800 bg-neutral-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Gestor Google Docs & Google Sheets</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Lectura & Escritura Activa
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Sincronización bidireccional continua del catálogo de estrategias con tu Google Docs / Sheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`px-5 py-2.5 text-xs flex items-center gap-2 border-b ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800/80 text-rose-300'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center px-5 pt-3 border-b border-neutral-800 bg-neutral-950/50 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'CATALOG'
                ? 'text-emerald-400 border-emerald-500 bg-neutral-900'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Catálogo & Edición ({strategies.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ORDERS')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ORDERS'
                ? 'text-cyan-400 border-cyan-500 bg-neutral-900'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hoja de Órdenes ({sheetOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('WRITE')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'WRITE'
                ? 'text-emerald-400 border-emerald-500 bg-neutral-900'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Escribir / Exportar a Google Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('READ')}
            className={`px-3 py-2 text-xs font-semibold rounded-t-lg transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'READ'
                ? 'text-emerald-400 border-emerald-500 bg-neutral-900'
                : 'text-neutral-400 border-transparent hover:text-neutral-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Leer / Importar desde Google Docs</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* TAB 1: CATALOG & INLINE EDITING */}
          {activeTab === 'CATALOG' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Estrategias registradas en Google Docs ({strategies.length} totales)
                  </h4>
                  <p className="text-[11px] text-neutral-400">
                    Puedes modificar el estado de cualquier estrategia, editar sus campos en detalle o agregar una nueva. Los cambios se guardan y sincronizan inmediatamente.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAddingNew(true)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nueva Estrategia</span>
                  </button>
                  <button
                    onClick={handleCopyCsv}
                    className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    {copiedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-neutral-400" />}
                    <span>{copiedSuccess ? '¡Copiado!' : 'Copiar Tabla CSV'}</span>
                  </button>
                </div>
              </div>

              {/* Table of Strategies */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                <div className="overflow-x-auto max-h-[50vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3">No. Estrategia</th>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">Par</th>
                        <th className="py-2.5 px-3">Nombre & Reglas</th>
                        <th className="py-2.5 px-3">Estado</th>
                        <th className="py-2.5 px-3 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800/60 font-sans">
                      {strategies.map((st) => {
                        const isLiveOrActive = st.estado === 'Activa' || st.estado === 'Live' || st.estado === 'Live+';
                        const isObsolete = st.estado === 'Obsoleto';

                        return (
                          <tr
                            key={st.noEstrategia}
                            className={`hover:bg-neutral-900/60 transition-colors ${
                              isObsolete ? 'opacity-65 bg-neutral-950/30' : ''
                            }`}
                          >
                            <td className="py-3 px-3 font-mono font-bold text-white whitespace-nowrap">
                              {st.noEstrategia}
                            </td>
                            <td className="py-3 px-3 text-neutral-400 font-mono text-[11px] whitespace-nowrap">
                              {st.fecha}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-neutral-800 text-amber-300 border border-neutral-700">
                                {st.par}
                              </span>
                            </td>
                            <td className="py-3 px-3 max-w-xs">
                              <div className="font-semibold text-neutral-200 line-clamp-1">
                                {st.nombreEstrategia}
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono line-clamp-1 mt-0.5">
                                {st.reglasDeEntrada}
                              </div>
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <select
                                value={st.estado || 'Activa'}
                                onChange={(e) =>
                                  handleStatusChange(
                                    st.noEstrategia,
                                    e.target.value as StrategyTradeStatus
                                  )
                                }
                                className={`text-[11px] font-bold px-2 py-1 rounded-md border bg-neutral-900 cursor-pointer outline-none ${
                                  st.estado === 'Activa'
                                    ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/30'
                                    : st.estado === 'Live'
                                    ? 'text-cyan-400 border-cyan-500/40 bg-cyan-950/30'
                                    : st.estado === 'Live+'
                                    ? 'text-purple-400 border-purple-500/40 bg-purple-950/30'
                                    : 'text-neutral-400 border-neutral-700 bg-neutral-900'
                                }`}
                              >
                                <option value="Activa">Activa (Para tomar)</option>
                                <option value="Live">Live (Órdenes emitidas)</option>
                                <option value="Live+">Live+ (Completada)</option>
                                <option value="Obsoleto">Obsoleto</option>
                              </select>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setEditingRow(st)}
                                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white transition-colors"
                                  title="Editar campos de la estrategia"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRow(st.noEstrategia)}
                                  className="p-1.5 rounded-md bg-neutral-800 hover:bg-rose-950/80 hover:text-rose-400 text-neutral-400 transition-colors"
                                  title="Eliminar del catálogo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ORDERS FROM GOOGLE SHEETS */}
          {activeTab === 'ORDERS' && (
            <div className="space-y-5">
              {/* Header & Config */}
              <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Hoja de Órdenes Centralizada</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          {sheetOrders.length} Órdenes Activas
                        </span>
                      </h4>
                      <p className="text-xs text-neutral-400">
                        Lee y sincroniza las órdenes en Binance Futures desde la pestaña específica de tu mismo archivo Google Sheet.
                      </p>
                    </div>
                  </div>

                  <a
                    href={customSheetUrl || OFFICIAL_GOOGLE_SHEET_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-neutral-700"
                  >
                    <span>Abrir Google Sheet</span>
                    <ExternalLink className="w-3.5 h-3.5 text-neutral-400" />
                  </a>
                </div>

                {/* Configuration Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
                  <div className="sm:col-span-6 space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Nombre de la Pestaña / Hoja
                    </label>
                    <input
                      type="text"
                      value={ordersTabName}
                      onChange={(e) => setOrdersTabName(e.target.value)}
                      placeholder="Ej: Ordenes o Órdenes"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <label className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      GID (Opcional)
                    </label>
                    <input
                      type="text"
                      value={ordersGid}
                      onChange={(e) => setOrdersGid(e.target.value)}
                      placeholder="Ej: 0 o 123456789"
                      className="w-full px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div className="sm:col-span-3 flex items-end">
                    <button
                      onClick={handleSaveOrdersConfig}
                      disabled={isSyncingOrders}
                      className="w-full px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg shadow-cyan-950/40"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncingOrders ? 'animate-spin' : ''}`} />
                      <span>{isSyncingOrders ? 'Leyendo...' : 'Sincronizar'}</span>
                    </button>
                  </div>
                </div>

                {/* Sync status & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800/80 text-[11px]">
                  <div className="text-neutral-400 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span>Última lectura: {ordersLastSync || 'Pendiente'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyOrdersTemplate}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium transition-colors flex items-center gap-1"
                      title="Copia el encabezado y formato estándar para pegar en una nueva pestaña de Google Sheets"
                    >
                      <Copy className="w-3 h-3 text-cyan-400" />
                      <span>Copiar Plantilla CSV</span>
                    </button>
                    <button
                      onClick={handleCopyCurrentOrders}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium transition-colors flex items-center gap-1"
                      title="Copia las órdenes activas en formato CSV"
                    >
                      <Copy className="w-3 h-3 text-neutral-400" />
                      <span>Copiar Órdenes Activas</span>
                    </button>
                    <button
                      onClick={handleDownloadOrdersCsv}
                      className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium transition-colors flex items-center gap-1"
                      title="Descarga el archivo .CSV de órdenes"
                    >
                      <Download className="w-3 h-3 text-neutral-400" />
                      <span>Descargar CSV</span>
                    </button>
                  </div>
                </div>

                {ordersSyncError && (
                  <div className="p-2.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-semibold">{ordersSyncError}</p>
                      <p className="text-[11px] text-amber-400/80">
                        Copia la plantilla preformateada haciendo clic en &quot;Copiar Plantilla CSV&quot; y pégala en la pestaña &quot;{ordersTabName}&quot; de tu Google Sheet.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Orders Table */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
                <div className="p-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">
                    Órdenes Registradas en Google Sheets ({sheetOrders.length})
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Hoja: &quot;{ordersTabName}&quot;
                  </span>
                </div>

                {sheetOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs space-y-3">
                    <Layers className="w-10 h-10 text-neutral-600 mx-auto" />
                    <div className="text-neutral-300 font-bold text-sm">
                      Aún no hay órdenes registradas en la pestaña &quot;{ordersTabName}&quot;
                    </div>
                    <p className="text-neutral-500 max-w-md mx-auto text-[11px]">
                      Puedes crear una pestaña llamada <span className="text-cyan-400 font-mono font-bold">&quot;{ordersTabName}&quot;</span> en tu archivo Google Sheet y pegar la plantilla estándar con encabezados de órdenes.
                    </p>
                    <div className="flex justify-center gap-2 pt-2">
                      <button
                        onClick={handleCopyOrdersTemplate}
                        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-950/50"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Plantilla de Órdenes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-[45vh]">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-2 px-3">ID / Ref</th>
                          <th className="py-2 px-3">Estrategia</th>
                          <th className="py-2 px-3">Par</th>
                          <th className="py-2 px-3">Tipo</th>
                          <th className="py-2 px-3">Lado</th>
                          <th className="py-2 px-3">Precio</th>
                          <th className="py-2 px-3">Cantidad</th>
                          <th className="py-2 px-3">Apalancamiento</th>
                          <th className="py-2 px-3">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-800/60 font-sans">
                        {sheetOrders.map((ord) => {
                          const isBuy = ord.side === 'BUY';
                          return (
                            <tr key={ord.orderId} className="hover:bg-neutral-900/60 transition-colors font-mono">
                              <td className="py-2.5 px-3 text-neutral-300 font-bold whitespace-nowrap">
                                {ord.orderId}
                              </td>
                              <td className="py-2.5 px-3 text-amber-300 font-bold whitespace-nowrap">
                                {ord.strategyId || '-'}
                              </td>
                              <td className="py-2.5 px-3 text-white font-bold whitespace-nowrap">
                                {ord.symbol}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 text-[10px]">
                                  {ord.type}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap font-bold">
                                <span className={isBuy ? 'text-emerald-400' : 'text-rose-400'}>
                                  {isBuy ? 'COMPRA' : 'VENTA'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-neutral-200 whitespace-nowrap">
                                ${ord.price > 0 ? ord.price.toFixed(2) : (ord.stopPrice?.toFixed(2) || 'MKT')}
                              </td>
                              <td className="py-2.5 px-3 text-neutral-300 whitespace-nowrap">
                                {ord.origQty}
                              </td>
                              <td className="py-2.5 px-3 text-amber-400 font-bold whitespace-nowrap">
                                {ord.leverage || 3}x
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                  {ord.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WRITE / EXPORT TO GOOGLE DOCS */}
          {activeTab === 'WRITE' && (
            <div className="space-y-5">
              <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      1. Escritura Manual / Copiar a Google Docs & Sheets
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Copia el catálogo con formato CSV estandarizado para pegarlo directamente en tu Google Sheet o Google Docs con 1 solo clic.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={handleCopyCsv}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-950/40"
                  >
                    {copiedSuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSuccess ? '¡Copiado con Éxito!' : 'Copiar Todo el Catálogo (Formato Google Docs)'}</span>
                  </button>

                  <button
                    onClick={handleDownloadCsv}
                    className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>Descargar archivo .CSV</span>
                  </button>

                  <a
                    href={OFFICIAL_GOOGLE_SHEET_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 text-xs font-semibold flex items-center gap-2 transition-colors ml-auto"
                  >
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>Abrir Hoja Google Sheets</span>
                  </a>
                </div>
              </div>

              {/* Webhook Automatic Writeback */}
              <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Code className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      2. Escritura Automática en la Nube (Google Apps Script Webhook)
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Permite que cada cambio de estrategia o estado en la aplicación escriba y actualice automáticamente tu Google Sheet en segundo plano.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-neutral-300">
                    URL de Google Apps Script Web App (Webhook):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      onClick={handleSaveWebhook}
                      className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar & Probar</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setShowAppsScriptCode(!showAppsScriptCode)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium flex items-center gap-1"
                  >
                    <span>{showAppsScriptCode ? 'Ocultar código de Apps Script' : 'Ver código de Apps Script para pegar en Google Sheets'}</span>
                  </button>

                  {showAppsScriptCode && (
                    <div className="mt-2.5 p-3 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
                      <p className="text-[11px] text-neutral-400">
                        Pega este script en tu Google Sheet en <strong>Extensiones &gt; Apps Script</strong> y luego publícalo como <strong>Implementar &gt; Nueva implementación &gt; Aplicación web (Acceso: Cualquier usuario)</strong>:
                      </p>
                      <pre className="p-3 bg-black/60 rounded border border-neutral-800 text-[11px] font-mono text-emerald-300 overflow-x-auto select-all">
                        {appsScriptCodeSnippet}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: READ / IMPORT FROM GOOGLE DOCS */}
          {activeTab === 'READ' && (
            <div className="space-y-5">
              {/* Direct API OAuth Authorization Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-cyan-950/40 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">Conexión Directa Google Sheets API v4</h4>
                      {isGoogleAuthorized ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          CONECTADO (OAuth)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          PROXIED (Modo CSV)
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-neutral-300 mt-0.5">
                      {isGoogleAuthorized
                        ? 'Sincronización bidireccional directa activa en tiempo real (Lectura de estrategias y Registro directo de órdenes).'
                        : 'Conecta tu cuenta de Google Workspace para sincronización bidireccional sin depender de exportación Web.'}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-center shrink-0">
                  {isGoogleAuthorized ? (
                    <button
                      onClick={handleDisconnectGoogle}
                      className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-semibold transition-colors"
                    >
                      Desconectar Google API
                    </button>
                  ) : (
                    <button
                      onClick={handleConnectGoogleSheetsApi}
                      disabled={isAuthorizingGoogle}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{isAuthorizingGoogle ? 'Conectando...' : 'Conectar Google Sheets API'}</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      1. Archivo Único Centralizado de Google Sheets
                    </h4>
                    <p className="text-xs text-neutral-400">
                      La aplicación lee tanto las <strong className="text-emerald-400">Estrategias</strong> (pestaña &quot;Estrategias&quot;) como las <strong className="text-cyan-400">Órdenes</strong> (pestaña &quot;{ordersTabName}&quot;) de este único archivo de Google Sheets.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                      value={customSheetUrl}
                      onChange={(e) => setCustomSheetUrl(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                    <button
                      onClick={handleSyncFromSheetUrl}
                      disabled={isSyncing}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Leyendo Todo...' : 'Leer Ahora (Estrategias y Órdenes)'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Paste Raw CSV */}
              <div className="bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      2. Pegar Datos CSV desde Google Docs / Google Sheets
                    </h4>
                    <p className="text-xs text-neutral-400">
                      Copia las celdas o el texto de tu Google Docs y pégalo aquí para actualizar inmediatamente el catálogo en la aplicación.
                    </p>
                  </div>
                </div>

                <textarea
                  rows={6}
                  placeholder={`No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting,Estado\nZEC-20260903-RANGO-V2,2026-09-03,Trading de Rango,ZECUSDT,1D / 4H / 1H,Limit...`}
                  value={csvInput}
                  onChange={(e) => setCsvInput(e.target.value)}
                  className="w-full p-3 rounded-lg bg-neutral-900 border border-neutral-700 text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                />

                <div className="flex items-center justify-between">
                  <button
                    onClick={handleRestoreOfficial}
                    className="text-xs text-amber-400 hover:text-amber-300 transition-colors underline font-medium"
                  >
                    Restablecer al documento oficial original (10 Estrategias)
                  </button>

                  <button
                    onClick={handleImportCsv}
                    className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar y Actualizar Catálogo</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-neutral-800 bg-neutral-950 flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Formato oficial: 12 columnas canónicas normalizadas</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* SUB-MODAL: EDIT STRATEGY ROW */}
      {editingRow && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-400" />
                <span>Editar Estrategia: {editingRow.noEstrategia}</span>
              </h3>
              <button
                onClick={() => setEditingRow(null)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">Nombre de Estrategia:</label>
                <input
                  type="text"
                  value={editingRow.nombreEstrategia}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, nombreEstrategia: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Par (Símbolo):</label>
                <input
                  type="text"
                  value={editingRow.par}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, par: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Estado:</label>
                <select
                  value={editingRow.estado}
                  onChange={(e) =>
                    setEditingRow({
                      ...editingRow,
                      estado: e.target.value as StrategyTradeStatus,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white"
                >
                  <option value="Activa">Activa (Para tomar)</option>
                  <option value="Live">Live (Órdenes emitidas)</option>
                  <option value="Live+">Live+ (Completada)</option>
                  <option value="Obsoleto">Obsoleto</option>
                </select>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Temporalidad:</label>
                <input
                  type="text"
                  value={editingRow.temporalidad}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, temporalidad: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Reglas de Entrada (DCA):</label>
                <input
                  type="text"
                  value={editingRow.reglasDeEntrada}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, reglasDeEntrada: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Reglas de Salida / Take Profit (TP):</label>
                <input
                  type="text"
                  value={editingRow.reglasDeSalidaTP}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, reglasDeSalidaTP: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Gestión de Riesgo &amp; Stop Loss:</label>
                <input
                  type="text"
                  value={editingRow.gestionDeRiesgoStopLoss}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, gestionDeRiesgoStopLoss: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Comentarios / Backtesting:</label>
                <textarea
                  rows={2}
                  value={editingRow.comentariosBacktesting}
                  onChange={(e) =>
                    setEditingRow({ ...editingRow, comentariosBacktesting: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setEditingRow(null)}
                className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEditRow}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUB-MODAL: ADD NEW STRATEGY ROW */}
      {isAddingNew && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-700 rounded-xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Agregar Nueva Estrategia al Catálogo</span>
              </h3>
              <button
                onClick={() => setIsAddingNew(false)}
                className="p-1 rounded text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-neutral-400 block mb-1">No. Estrategia (ID único):</label>
                <input
                  type="text"
                  placeholder="ej. BTC-20260903-RANGO"
                  value={newStrategy.noEstrategia}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, noEstrategia: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Par (Símbolo Binance):</label>
                <input
                  type="text"
                  placeholder="ej. ZECUSDT"
                  value={newStrategy.par}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, par: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Nombre de la Estrategia:</label>
                <input
                  type="text"
                  placeholder="ej. Trading de Rango y Rebote en Soporte Clave"
                  value={newStrategy.nombreEstrategia}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, nombreEstrategia: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-medium"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Fecha:</label>
                <input
                  type="date"
                  value={newStrategy.fecha}
                  onChange={(e) => setNewStrategy({ ...newStrategy, fecha: e.target.value })}
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Estado:</label>
                <select
                  value={newStrategy.estado}
                  onChange={(e) =>
                    setNewStrategy({
                      ...newStrategy,
                      estado: e.target.value as StrategyTradeStatus,
                    })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white"
                >
                  <option value="Activa">Activa (Para tomar)</option>
                  <option value="Live">Live (Órdenes emitidas)</option>
                  <option value="Live+">Live+ (Completada)</option>
                  <option value="Obsoleto">Obsoleto</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Reglas de Entrada (DCA):</label>
                <input
                  type="text"
                  placeholder="DCA: E1 (50%) @ $100.00, E2 (30%) @ $99.20, E3 (20%) @ $98.70"
                  value={newStrategy.reglasDeEntrada}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, reglasDeEntrada: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Reglas de Salida / TP:</label>
                <input
                  type="text"
                  placeholder="TP1 (50%) @ $101.20; TP2 (30%) @ $102.50; TP Final (20%) @ $103.50"
                  value={newStrategy.reglasDeSalidaTP}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, reglasDeSalidaTP: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Gestión de Riesgo &amp; Stop Loss:</label>
                <input
                  type="text"
                  placeholder="Stop-Loss Global @ $97.30. Margen Aislado 5X."
                  value={newStrategy.gestionDeRiesgoStopLoss}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, gestionDeRiesgoStopLoss: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-neutral-400 block mb-1">Comentarios / Backtesting:</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre volatilidad, confluencias técnicas, breakeven tras TP1..."
                  value={newStrategy.comentariosBacktesting}
                  onChange={(e) =>
                    setNewStrategy({ ...newStrategy, comentariosBacktesting: e.target.value })
                  }
                  className="w-full px-3 py-1.5 rounded bg-neutral-950 border border-neutral-700 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 rounded bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNewStrategy}
                className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950/50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Agregar Estrategia</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
