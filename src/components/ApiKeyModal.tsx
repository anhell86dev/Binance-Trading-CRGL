import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Info,
  Key,
  Lock,
  Radio,
  RefreshCw,
  Shield,
  X,
} from 'lucide-react';
import { binanceWs, BINANCE_ENDPOINTS } from '../services/binanceWs';
import { ApiCredentials, NetworkMode } from '../types/binance';

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
        setStatusMsg({
          type: 'success',
          text: `Conexión establecida con éxito en modo ${mode.toUpperCase()} (WS-FAPI v1)`,
        });
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setStatusMsg({
          type: 'error',
          text: 'No se pudo conectar al endpoint WebSocket de Binance. Verifica tus credenciales.',
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

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Top Header */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Configuración de API Keys de Binance
              </h2>
              <p className="text-xs text-neutral-400">USDⓈ-M Futures WebSocket API v1</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSaveAndConnect} className="p-5 flex flex-col gap-4">
          {/* Security Notice */}
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Privacidad y Seguridad de Llaves</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Las claves se almacenan exclusivamente en el navegador y se firman de forma local usando Web Crypto API. Nunca se envían a ningún servidor intermedio.
              </p>
            </div>
          </div>

          {/* Network Selection */}
          <div>
            <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
              Entorno de Red (Binance Endpoint)
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setMode('simulation')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  mode === 'simulation'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Simulación Live</span>
                <span className="text-[10px] text-neutral-500">Sin riesgo</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('testnet')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  mode === 'testnet'
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Testnet FAPI</span>
                <span className="text-[10px] text-neutral-500">testnet.binancefuture</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('production')}
                className={`py-2 px-3 rounded-lg border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                  mode === 'production'
                    ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <span>Producción Real</span>
                <span className="text-[10px] text-neutral-500">ws-fapi.binance.com</span>
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
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
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
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
              placeholder="Pega tu Secret Key para firma automática..."
            />
          </div>

          {/* Ed25519 Private Key for session.logon (Rule #5) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-neutral-300">
                Llave Privada Ed25519 (Opcional para session.logon)
              </label>
              <span className="text-[10px] text-amber-400">Regla #5 Binance WS</span>
            </div>
            <textarea
              rows={2}
              value={edKey}
              onChange={e => setEdKey(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs font-mono text-white focus:border-amber-500/80 focus:outline-none"
              placeholder="Base64 / Hex PKCS#8 para autenticación de sesión de 24 horas..."
            />
            <p className="text-[10px] text-neutral-500 mt-1">
              Binance requiere llaves Ed25519 si utilizas la función session.logon para sesiones persistentes de 24 horas.
            </p>
          </div>

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
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
              className="text-xs text-rose-400 hover:text-rose-300"
            >
              Borrar Credenciales
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold"
              >
                Cerrar
              </button>
              <button
                type="submit"
                disabled={isTesting}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Conectar WebSocket</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
