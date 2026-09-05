import React, { useEffect, useState } from 'react';
import {
  Layers,
  Target,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
} from 'lucide-react';
import { estrategiasSheetService, EstrategiaRow, OrdenRow } from '../services/estrategiasSheetService';

export const EstrategiasView: React.FC = () => {
  const [estrategias, setEstrategias] = useState<EstrategiaRow[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);
  const [filterEstado, setFilterEstado] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [estrategiasData, ordenesData] = await Promise.all([
        estrategiasSheetService.fetchEstrategias(),
        estrategiasSheetService.fetchOrdenes(),
      ]);
      setEstrategias(estrategiasData);
      setOrdenes(ordenesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getOrdenesPorEstrategia = (noEstrategia: string): OrdenRow[] => {
    return ordenes.filter(orden => orden.estrategiaNo === noEstrategia);
  };

  const filteredEstrategias = estrategias.filter(estrategia => {
    const matchEstado = filterEstado === 'all' || estrategia.estado === filterEstado;
    const matchSearch = searchTerm === '' ||
      estrategia.nombreEstrategia.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estrategia.par.toLowerCase().includes(searchTerm.toLowerCase()) ||
      estrategia.noEstrategia.toLowerCase().includes(searchTerm.toLowerCase());
    return matchEstado && matchSearch;
  });

  const getEstadoColor = (estado: string) => {
    const lower = estado.toLowerCase();
    if (lower.includes('activo') || lower.includes('ejecutando')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (lower.includes('pendiente') || lower.includes('espera')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (lower.includes('cerrado') || lower.includes('completado')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (lower.includes('cancelado') || lower.includes('fallido')) return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
    return 'bg-neutral-500/20 text-neutral-400 border-neutral-500/30';
  };

  const getTotalOrdenes = () => ordenes.length;
  const getOrdenesActivas = () => ordenes.filter(o => o.estado.toLowerCase().includes('activo') || o.estado.toLowerCase().includes('ejecutando')).length;

  return (
    <div className="flex flex-col h-full bg-neutral-900/40">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
            <Layers size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Estrategias</h2>
            <p className="text-xs text-neutral-400">
              {estrategias.length} estrategias Â・ {getTotalOrdenes()} Ãrdenes Â・ {getOrdenesActivas()} Activas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} disabled={loading} className="p-2 rounded-lg bg-neutral-800 border border-neutral-700 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors disabled:opacity-50" title="Refrescar">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 px-4 py-2 border-b border-neutral-800 bg-neutral-900/40">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre, par o nÃºmero..." className="w-full pl-9 pr-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-500 focus:outline-hidden focus:border-amber-500/50" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-neutral-500" />
          <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)} className="px-3 py-1.5 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500/50">
            <option value="all">Todos los estados</option>
            <option value="Activo">Activos</option>
            <option value="Pendiente">Pendientes</option>
            <option value="Cerrado">Cerrados</option>
            <option value="Cancelado">Cancelados</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <RefreshCw size={24} className="text-amber-500 animate-spin mx-auto" />
              <p className="text-sm text-neutral-400">Cargando estrategias...</p>
            </div>
          </div>
        ) : filteredEstrategias.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <AlertCircle size={32} className="text-neutral-600 mx-auto" />
              <p className="text-sm text-neutral-400">No se encontraron estrategias</p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEstrategias.map((estrategia) => {
              const ordenesAsociadas = getOrdenesPorEstrategia(estrategia.noEstrategia);
              const isExpanded = expandedStrategy === estrategia.noEstrategia;
              const estadoColor = getEstadoColor(estrategia.estado);
              return (
                <div key={estrategia.noEstrategia} className="rounded-xl border border-neutral-800 bg-neutral-900/60 overflow-hidden">
                  <div onClick={() => setExpandedStrategy(isExpanded ? null : estrategia.noEstrategia)} className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-neutral-800/40 transition-colors">
                    <button className="p-1 rounded hover:bg-neutral-800 text-neutral-500">
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-bold font-mono border border-amber-500/30">#{estrategia.noEstrategia}</span>
                          <span className="text-sm font-bold text-white truncate">{estrategia.nombreEstrategia}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Target size={14} className="text-neutral-500" />
                          <span className="text-xs font-mono font-bold text-neutral-300">{estrategia.par}</span>
                          <span className="px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 text-[10px] border border-neutral-700">{estrategia.temporalidad}</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-xs text-neutral-400">{estrategia.tipoOrden}</span>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <Layers size={14} className="text-neutral-500" />
                          <span className="text-xs font-mono text-neutral-300">{ordenesAsociadas.length} Ãrdenes</span>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${estadoColor}`}>{estrategia.estado}</span>
                      </div>
                      <div className="col-span-1 text-right">
                        <ChevronRight size={16} className={`text-neutral-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-neutral-800">
                      <div className="grid grid-cols-2 gap-4 p-4 bg-neutral-900/40">
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">Reglas de Entrada</h4>
                          <p className="text-xs text-neutral-300 leading-relaxed">{estrategia.reglasEntrada}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">Reglas de Salida / TP</h4>
                          <p className="text-xs text-neutral-300 leading-relaxed">{estrategia.reglasSalida}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">GestiÃ³n de Riesgo</h4>
                          <p className="text-xs text-neutral-300 leading-relaxed">{estrategia.gestionRiesgo}</p>
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">Indicadores Clave</h4>
                          <p className="text-xs text-neutral-300 leading-relaxed">{estrategia.indicadoresClave}</p>
                        </div>
                        {estrategia.comentarios && (
                          <div className="col-span-2">
                            <h4 className="text-xs font-bold text-neutral-400 uppercase mb-2">Comentarios / Backtesting</h4>
                            <p className="text-xs text-neutral-300 leading-relaxed">{estrategia.comentarios}</p>
                          </div>
                        )}
                      </div>

                      {ordenesAsociadas.length > 0 && (
                        <div className="p-4">
                          <h4 className="text-xs font-bold text-neutral-400 uppercase mb-3 flex items-center gap-2">
                            <Layers size={14} />
                            Ãrdenes Asociadas ({ordenesAsociadas.length})
                          </h4>
                          <div className="space-y-2">
                            {ordenesAsociadas.map((orden, idx) => {
                              const ordenEstadoColor = getEstadoColor(orden.estado);
                              return (
                                <div key={`${orden.estrategiaNo}-${idx}`} className="p-3 rounded-lg border border-neutral-800 bg-neutral-950/50">
                                  <div className="grid grid-cols-12 gap-3 items-center">
                                    <div className="col-span-2">
                                      <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                                        <Clock size={12} />
                                        <span className="font-mono">{orden.fechaHora}</span>
                                      </div>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-xs font-bold font-mono text-white">{orden.activo}</span>
                                      <span className="text-[10px] text-neutral-500 ml-1">{orden.mercado}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className="text-xs text-neutral-400">{orden.tipo}</span>
                                      <span className="text-[10px] text-neutral-500 block">{orden.estrategia}</span>
                                    </div>
                                    <div className="col-span-3">
                                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono">
                                        <div><span className="text-neutral-500 block">E1</span><span className="text-white">{orden.entrada1}</span></div>
                                        <div><span className="text-neutral-500 block">SL</span><span className="text-rose-400">{orden.stopLoss}</span></div>
                                        <div><span className="text-neutral-500 block">TP</span><span className="text-emerald-400">{orden.tp1}</span></div>
                                      </div>
                                    </div>
                                    <div className="col-span-1">
                                      <span className="text-[10px] text-neutral-500 block">Riesgo</span>
                                      <span className="text-xs font-mono text-amber-400">{orden.riesgoMax}</span>
                                    </div>
                                    <div className="col-span-2">
                                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${ordenEstadoColor}`}>{orden.estado}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-800 bg-neutral-900/50">
        <div className="flex items-center gap-2 text-[10px] text-neutral-500">
          <AlertCircle size={12} />
          <span>Datos sincronizados desde Google Sheets</span>
        </div>
        <div className="text-[10px] font-mono text-neutral-500">Sheet ID: {SHEET_ID.slice(0, 8)}...{SHEET_ID.slice(-8)}</div>
      </div>
    </div>
  );
};

export default EstrategiasView;
