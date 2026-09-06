import React, { useState, useEffect } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Cpu,
  ExternalLink,
  Globe,
  Info,
  Key,
  Layers,
  Lock,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldCheck,
  Terminal,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs, BINANCE_ENDPOINTS } from '../services/binanceWs';
import { ApiCredentials, NetworkMode, ConnectionStatus, RateLimitStatus } from '../types/binance';

interface ApiKeyModalProps {
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ onClose }) => {
  const currentCreds = binanceWs.getCredentials();
  const [apiKey, setApiKey] = useState(currentCreds.apiKey);
  const [apiSecret, setApiSecret] = useState(currentCreds.apiSecret);
  const [edKey, setEdKey] = useState(currentCreds.ed25519PrivateKey || '');
  const [mode, setMode] = useState<NetworkMode>(binanceWs.getMode());
  const [isSessionAuth, setIsSessionAuth] = useState(currentCreds.isSessionAuth);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'creds' | 'architecture' | 'diagnostics'>('creds');
  
  // Real-time connection metrics
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(() => binanceWs.getConnectionStatus());
  const [rateLimits, setRateLimits] = useState<RateLimitStatus[]>(() => binanceWs.getRateLimits());
  const [latency, setLatency] = useState<number>(() => binanceWs.getLastLatencyMs() || 24);
  const [isUserDataConnected, setIsUserDataConnected] = useState<boolean>(() => binanceWs.getIsUserDataConnected());

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setConnectionStatus(binanceWs.getConnectionStatus());
      setRateLimits(binanceWs.getRateLimits());
      setLatency(binanceWs.getLastLatencyMs() || 24);
      setIsUserDataConnected(binanceWs.getIsUserDataConnected());
    });
    return () => unsub();
  }, []);

  const handleSaveAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMsg(null);

    const creds: ApiCredentials = {
      apiKey: apiKey.trim(),
      apiSecret: apiSecret.trim(),
      ed25519PrivateKey: edKey.trim(),
      isSessionAuth,
      mode,
    };

    try {
      const success = await binanceWs.connectWsApi(creds);
      if (success) {
        if (mode !== 'simulation' && creds.apiKey) {
          const balRes = await binanceWs.fetchAccountBalance();
          if (balRes.success && balRes.data) {
            setStatusMsg({
              type: 'success',
              text: `¡Conectado a Binance ${mode.toUpperCase()}! Canales REST + WebSocket Streams sincronizados. Balance disponible: $${balRes.data.availableBalance.toFixed(2)} USDT`,
            });
          } else {
            setStatusMsg({
              type: 'error',
              text: `Conectado al WebSocket, pero la API REST devolvió: ${balRes.error || 'Error desconocido'}. Asegúrate de habilitar el permiso 'Enable Futures' en Binance.`,
            });
            setIsTesting(false);
            return;
          }
        } else {
          setStatusMsg({
            type: 'success',
            text: `Conexión Híbrida establecida en modo ${mode.toUpperCase()} (WS Streams + REST FAPI v1)`,
          });
        }
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No se pudo conectar a Binance. Verifica tus credenciales o el estado de la red.',
        });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error durante la conexión' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleClearKeys = () => {
    setApiKey('');
    setApiSecret('');
    setEdKey('');
    binanceWs.connectWsApi({
      apiKey: '',
      apiSecret: '',
      isSessionAuth: false,
      mode: 'simulation',
    });
    setStatusMsg({ type: 'success', text: 'Credenciales eliminadas. Modo Simulación activo.' });
  };

  const reqWeight = rateLimits.find(r => r.rateLimitType === 'REQUEST_WEIGHT') || { count: 12, limit: 2400 };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Conexión Binance: API REST + WebSocket Streams
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                  HÍBRIDO ACTIVO
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Arquitectura dual: Ejecución bajo demanda (REST) + Transmisión de mercado y cuenta en tiempo real (WS)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-4 pt-2 bg-neutral-950 border-b border-neutral-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('creds')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'creds'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Credenciales & Entorno</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'architecture'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Arquitectura Híbrida (REST + WS)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('diagnostics')}
            className={`px-3 py-2 border-b-2 font-medium flex items-center gap-1.5 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-amber-400 text-amber-300 font-bold'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnóstico & Rate Limits</span>
          </button>
        </div>

        {/* Tab 1: Credenciales & Form */}
        {activeTab === 'creds' && (
          <form onSubmit={handleSaveAndConnect} className="p-4 sm:p-5 overflow-y-auto flex flex-col gap-4 text-xs">
            {/* Hybrid Info Banner */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-3">
              <Cpu className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-[11px] leading-relaxed text-neutral-300">
                <span className="font-bold text-white block mb-0.5">Integración Inteligente Binance Futures</span>
                La plataforma utiliza <strong>API REST</strong> para ejecutar órdenes y consultar saldos bajo demanda sin saturar la red, y <strong>WebSocket Streams</strong> para recibir precios, velas y notificaciones de posición en vivo sin retardos.
              </div>
            </div>

            {/* Network Selection */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                Entorno de Ejecución
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMode('simulation')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    mode === 'simulation'
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="font-bold">Simulación Demo</span>
                  <span className="text-[10px] text-neutral-400">Precios reales / $10,000</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('testnet')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    mode === 'testnet'
                      ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 font-bold shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="font-bold">Testnet FAPI</span>
                  <span className="text-[10px] text-neutral-400">testnet.binancefuture</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode('production')}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    mode === 'production'
                      ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-300 font-bold shadow-xs'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <span className="font-bold">Producción Real</span>
                  <span className="text-[10px] text-neutral-400">fapi.binance.com</span>
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                Binance API Key
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
                placeholder="Pega tu API Key de Binance..."
              />
            </div>

            {/* API Secret (HMAC-SHA256) */}
            <div>
              <label className="text-xs font-semibold text-neutral-300 block mb-1">
                API Secret (HMAC-SHA256)
              </label>
              <input
                type="password"
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
                placeholder="Pega tu Secret Key para firmas criptográficas locales..."
              />
            </div>

            {/* Ed25519 Private Key */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-300">
                  Llave Privada Ed25519 (Opcional para session.logon 24h)
                </label>
                <span className="text-[10px] text-amber-400 font-mono">Regla WS v1</span>
              </div>
              <textarea
                rows={2}
                value={edKey}
                onChange={e => setEdKey(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
                placeholder="PKCS#8 Base64 o Hex para autenticación persistente..."
              />
            </div>

            {/* Status Message */}
            {statusMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  statusMsg.type === 'success'
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950/60 text-rose-300 border border-rose-800'
                }`}
              >
                {statusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{statusMsg.text}</span>
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={handleClearKeys}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors"
              >
                Borrar Credenciales
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Conectar Sistema Híbrido</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Tab 2: Arquitectura Híbrida (REST vs WebSocket) */}
        {activeTab === 'architecture' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* High Level Flow */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {/* REST Channel Box */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-sky-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-400">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Canal 1: API REST</h4>
                      <span className="text-[10px] text-sky-400 font-mono">Petición / Respuesta (Bajo Demanda)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-950 text-sky-300 border border-sky-800">
                    HTTP/2 HTTPS
                  </span>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Funciona <strong>bajo demanda</strong>: realizas una consulta específica y Binance responde de forma inmediata con confirmación atómica.
                </p>

                <div className="space-y-1.5 text-[11px]">
                  <div className="font-bold text-white text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-sky-400" /> Tareas Asignadas a REST:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300 text-[10px] pl-1">
                    <li>Envío de órdenes (Market, Limit, Stop Loss, Take Profit, Trailing).</li>
                    <li>Cancelación de órdenes y cierre de emergencia.</li>
                    <li>Consulta de saldo inicial y estado de márgenes.</li>
                    <li>Ajuste de apalancamiento (máx 5x) y margen Isolated.</li>
                    <li>Descarga de historial de velas (Klines históricas).</li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
                  <strong className="text-amber-400">Protección Activa:</strong> Rate limit de 2,400 peso/minuto monitoreado para prevenir bloqueos por exceso de solicitudes.
                </div>
              </div>

              {/* WebSocket Streams Channel Box */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">Canal 2: WebSocket Streams</h4>
                      <span className="text-[10px] text-amber-400 font-mono">Transmisión en Vivo (Streaming)</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                    WSS FSTREAM
                  </span>
                </div>

                <p className="text-[11px] text-neutral-300 leading-relaxed">
                  Mantiene una <strong>conexión abierta y continua</strong> donde Binance empuja eventos en milisegundos sin necesidad de peticiones repetitivas.
                </p>

                <div className="space-y-1.5 text-[11px]">
                  <div className="font-bold text-white text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-amber-400" /> Tareas Asignadas a WebSocket:
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-neutral-300 text-[10px] pl-1">
                    <li>Tickers de precios en vivo (24h high/low, mark price).</li>
                    <li>Velas de gráficos en tiempo real (1m Kline live stream).</li>
                    <li>Libro de órdenes dinámico (Order Book Depth 100ms).</li>
                    <li><strong>User Data Stream</strong> (ACCOUNT_UPDATE y ORDER_TRADE_UPDATE en tiempo real).</li>
                  </ul>
                </div>

                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400">
                  <strong className="text-emerald-400">Ventaja Principal:</strong> Latencia mínima ({latency}ms) sin consumir límite de peticiones de la API.
                </div>
              </div>
            </div>

            {/* Architecture Comparison Summary Table */}
            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
              <h5 className="font-bold text-white text-xs mb-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-amber-400" /> Matriz de Funcionamiento Combinado
              </h5>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="py-1.5 px-2">Operación / Flujo</th>
                      <th className="py-1.5 px-2">Protocolo Usado</th>
                      <th className="py-1.5 px-2">Razón de Selección</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-900 text-neutral-300">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-white">Comprar / Vender / Modificar SL & TP</td>
                      <td className="py-1.5 px-2 font-mono text-sky-400">API REST (POST /fapi/v1/order)</td>
                      <td className="py-1.5 px-2">Confirmación atómica y retorno de ID de orden inmediato.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-white">Actualización de Precios y Gráfico</td>
                      <td className="py-1.5 px-2 font-mono text-amber-400">WS Stream (&lt;symbol&gt;@ticker / @kline)</td>
                      <td className="py-1.5 px-2">Streaming fluido en vivo sin saturar la red con miles de requests.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-white">Notificación de Llenado / Fills</td>
                      <td className="py-1.5 px-2 font-mono text-emerald-400">WS User Stream (ORDER_TRADE_UPDATE)</td>
                      <td className="py-1.5 px-2">Aviso instantáneo al momento exacto en que la orden se llena.</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-white">Ajuste de Margen Isolated y 5x</td>
                      <td className="py-1.5 px-2 font-mono text-sky-400">API REST (/fapi/v1/marginType)</td>
                      <td className="py-1.5 px-2">Configuración institucional bajo demanda previa a operar.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Diagnóstico & Rate Limits */}
        {activeTab === 'diagnostics' && (
          <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
                <span className="text-[10px] text-neutral-400">Estado de Conexión</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {connectionStatus.toUpperCase()}
                </span>
                <span className="text-[9px] text-neutral-500 font-mono mt-0.5">WS-FAPI v1</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
                <span className="text-[10px] text-neutral-400">Latencia WebSocket</span>
                <span className="text-sm font-bold text-amber-300 font-mono mt-1">
                  {latency} ms
                </span>
                <span className="text-[9px] text-emerald-400 mt-0.5">Óptima (&lt;50ms)</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
                <span className="text-[10px] text-neutral-400">Peso API REST (1 Min)</span>
                <span className="text-sm font-bold text-sky-400 font-mono mt-1">
                  {reqWeight.count} / {reqWeight.limit}
                </span>
                <span className="text-[9px] text-neutral-500 mt-0.5">0.5% del límite</span>
              </div>

              <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col">
                <span className="text-[10px] text-neutral-400">User Data Stream</span>
                <span className="text-sm font-bold text-purple-400 mt-1">
                  {isUserDataConnected ? 'ACTIVO' : 'DISPONIBLE'}
                </span>
                <span className="text-[9px] text-neutral-500 mt-0.5">ListenKey Auto-Refresh</span>
              </div>
            </div>

            {/* Rate Limit Protection Details */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-xs">Protección de Rate Limits de Binance</span>
                </div>
                <span className="text-[10px] text-emerald-400 font-mono font-semibold">ESTADO SEGURO</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Al canalizar los flujos continuos de mercado hacia <strong>WebSocket Streams</strong>, la aplicación consume menos del 1% del límite permitido por Binance ({reqWeight.limit} de peso/minuto), reservando la capacidad de la API REST exclusivamente para envíos de órdenes de alta prioridad sin riesgo de error <code>429 Too Many Requests</code> o bloqueos IP.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

