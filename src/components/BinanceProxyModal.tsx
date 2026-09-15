import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, RefreshCw, Server, CheckCircle2, Globe, Settings, Cpu } from 'lucide-react';
import { binanceInterceptor, InterceptorStatus, ProxyConfig } from '../utils/binanceInterceptor';

interface BinanceProxyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BinanceProxyModal: React.FC<BinanceProxyModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<InterceptorStatus>(binanceInterceptor.getStatus());
  const [mode, setMode] = useState<ProxyConfig['mode']>(status.mode);
  const [customUrl, setCustomUrl] = useState<string>(binanceInterceptor.getConfig().customProxyUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);

  useEffect(() => {
    const unsubscribe = binanceInterceptor.subscribe((newStatus) => {
      setStatus(newStatus);
      setMode(newStatus.mode);
    });
    return unsubscribe;
  }, []);

  if (!isOpen) return null;

  const handleSave = () => {
    binanceInterceptor.setConfig(mode, customUrl);
    setTestResult({ success: true, message: 'Configuración de Proxy guardada correctamente.' });
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleRotate = () => {
    binanceInterceptor.rotateEndpoint();
    setTestResult({ success: true, message: `Mirror rotado a: ${binanceInterceptor.getActiveBaseUrl()}` });
  };

  const handleTestEndpoint = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      const response = await binanceInterceptor.fetch('https://fapi.binance.com/fapi/v1/ping', {
        maxRetries: 1,
      });
      const latency = Date.now() - startTime;
      if (response.ok) {
        setTestResult({
          success: true,
          message: `Conexión exitosa con ${binanceInterceptor.getActiveBaseUrl()} (${latency}ms)`,
          latency,
        });
      } else {
        setTestResult({
          success: false,
          message: `Error HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Fallo de conexión: ${err?.message || 'Error de red o CORS'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const remainingLockoutSec = Math.max(0, Math.ceil((status.rateLimitUntil - Date.now()) / 1000));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 text-neutral-100 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Gestor de Proxy & Interceptor Binance
              </h2>
              <p className="text-xs text-neutral-400">
                Mitigación automática de límite 429 y rotación de espejos de IP
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Live Status Banner */}
        <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Estado del Interceptor:</span>
            {status.isRateLimited ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Rate Limit Activo ({remainingLockoutSec}s)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Operativo / Conexión Estable
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Endpoint Activo:</span>
              <span className="font-mono text-amber-300 font-semibold truncate block mt-0.5">
                {status.activeEndpoint}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
              <span className="text-neutral-500 block">Reintentos Exponenciales:</span>
              <span className="font-semibold text-neutral-200 block mt-0.5">
                {status.consecutiveRetries} intentos de Backoff
              </span>
            </div>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="space-y-3">
          <label className="text-xs font-semibold text-neutral-300 block flex items-center gap-2">
            <Settings className="w-4 h-4 text-amber-400" />
            Modo de Conexión & Rotación de Proxy:
          </label>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('auto')}
              className={`p-3 rounded-xl text-left border text-xs font-medium transition ${
                mode === 'auto'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Cpu className="w-4 h-4" /> Auto-Rotación Espejos
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Rota entre fapi.binance.com y espejos fapi1-3 automáticamente al detectar 429.
              </p>
            </button>

            <button
              onClick={() => setMode('local_proxy')}
              className={`p-3 rounded-xl text-left border text-xs font-medium transition ${
                mode === 'local_proxy'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Server className="w-4 h-4" /> Proxy Local Express
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Reenvía las peticiones a través del servidor del backend local (/api/binance-proxy).
              </p>
            </button>

            <button
              onClick={() => setMode('mirror')}
              className={`p-3 rounded-xl text-left border text-xs font-medium transition ${
                mode === 'mirror'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Globe className="w-4 h-4" /> Forzar Espejo Secundario
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Usa directamente fapi1.binance.com o fapi2.binance.com.
              </p>
            </button>

            <button
              onClick={() => setMode('custom')}
              className={`p-3 rounded-xl text-left border text-xs font-medium transition ${
                mode === 'custom'
                  ? 'bg-amber-500/10 border-amber-500 text-amber-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                <Settings className="w-4 h-4" /> Proxy Personalizado
              </div>
              <p className="text-[10px] text-neutral-500 mt-1">
                Ingresa una URL de proxy propia (ej. Cloudflare Worker o servidor CORS).
              </p>
            </button>
          </div>

          {mode === 'custom' && (
            <div className="mt-3 space-y-1.5">
              <label className="text-xs text-neutral-400">URL del Proxy Personalizado:</label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://tu-proxy-binance.com"
                className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          )}
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}
          >
            {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-4 gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestEndpoint}
              disabled={isTesting}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              Probar Conexión
            </button>
            <button
              onClick={handleRotate}
              className="px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              Rotar Espejo
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs text-neutral-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs transition shadow-lg shadow-amber-500/10"
            >
              Guardar Cambios
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
