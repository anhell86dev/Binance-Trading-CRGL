import React, { useState, useEffect } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  Copy,
  Info,
  Shield,
  Terminal,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { binanceWs, BINANCE_ENDPOINTS } from '../services/binanceWs';
import { WsLogFrame } from '../types/binance';

interface WebSocketConsoleProps {
  onClose: () => void;
}

export const WebSocketConsole: React.FC<WebSocketConsoleProps> = ({ onClose }) => {
  const [logs, setLogs] = useState<WsLogFrame[]>(binanceWs.getLogs());
  const [selectedLog, setSelectedLog] = useState<WsLogFrame | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsub = binanceWs.subscribeLogs(() => {
      setLogs([...binanceWs.getLogs()]);
    });
    return () => unsub();
  }, []);

  const filteredLogs = logs.filter(log => {
    if (filterType === 'ALL') return true;
    return log.type === filterType;
  });

  const handleCopyJson = (data: any) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Consola e Inspector de Tramas WebSocket Binance (WS-FAPI v1)
              </h2>
              <p className="text-xs text-neutral-400">
                Auditoría en tiempo real de Ping/Pong, firmas alfabéticas, tipos INT/DECIMAL y límites de tasa
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Binance WS Protocol Rules Cheat-Sheet */}
        <div className="bg-neutral-950/80 px-4 py-2 border-b border-neutral-800 text-[11px] font-mono flex flex-wrap gap-4 text-neutral-400">
          <span className="text-amber-400 font-semibold">Reglas Activas:</span>
          <span>1. Ping cada 3m (Respuesta Pong exacta)</span>
          <span>2. Límite Ping: 5/segundo</span>
          <span>3. Duración máx conexión: 24h</span>
          <span>4. Decimales: Strings JSON</span>
          <span>5. Timestamps: INT UTC ms</span>
          <span>6. Parámetros ordenados alfabéticamente</span>
        </div>

        {/* Filters & Actions */}
        <div className="px-4 py-2 border-b border-neutral-800 bg-neutral-900 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {['ALL', 'REQUEST', 'RESPONSE', 'PING', 'PONG', 'STREAM', 'ERROR'].map(type => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-2 py-1 rounded font-mono transition-colors ${
                  filterType === type
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-neutral-400 hover:text-neutral-200 bg-neutral-950'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-500 font-mono">
            {filteredLogs.length} tramas registradas
          </span>
        </div>

        {/* Body Split: List of Frames + JSON Viewer */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Frames List */}
          <div className="w-full md:w-1/2 border-r border-neutral-800 overflow-y-auto divide-y divide-neutral-800/60 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                No hay tramas que coincidan con el filtro seleccionado.
              </div>
            ) : (
              filteredLogs.map(log => {
                const isSelected = selectedLog?.id === log.id;
                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-3 cursor-pointer transition-colors flex items-start gap-2.5 ${
                      isSelected ? 'bg-amber-500/10 border-l-2 border-amber-400' : 'hover:bg-neutral-800/40'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {log.direction === 'OUT' ? (
                        <ArrowUpRight className="w-4 h-4 text-cyan-400" />
                      ) : (
                        <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            log.type === 'PING' || log.type === 'PONG'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : log.type === 'ERROR'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : log.type === 'REQUEST'
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {log.type}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          {new Date(log.timestamp).toLocaleTimeString()}.
                          {String(log.timestamp % 1000).padStart(3, '0')}
                        </span>
                      </div>

                      <p className="text-neutral-200 mt-1 truncate font-medium">{log.summary}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detailed JSON Inspector Panel */}
          <div className="w-full md:w-1/2 flex flex-col bg-neutral-950 overflow-hidden">
            {selectedLog ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-3 border-b border-neutral-800 flex items-center justify-between text-xs bg-neutral-900/60">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400">{selectedLog.type}</span>
                    <span className="text-neutral-400 text-[11px]">
                      Dirección: {selectedLog.direction === 'OUT' ? 'Hacia Servidor Binance' : 'Desde Binance WS'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleCopyJson(selectedLog.data)}
                    className="flex items-center gap-1 text-[11px] text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-800"
                  >
                    {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copiado' : 'Copiar JSON'}</span>
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
                  <pre className="text-emerald-400 bg-neutral-900 p-3 rounded-lg border border-neutral-800 overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-500 text-xs">
                <Activity className="w-8 h-8 text-neutral-700 mb-2" />
                <p>Selecciona cualquier trama de la izquierda para inspeccionar su JSON detallado.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
