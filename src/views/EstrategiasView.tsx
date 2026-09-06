import React, { useEffect, useState } from 'react';
import { estrategiasSheetService, EstrategiaRow, OrdenRow } from '../services/estrategiasSheetService';




export function EstrategiasView() {
  const [estrategias, setEstrategias] = useState<EstrategiaRow[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

 useEffect(() => {
  async function load() {
    try {
      const [est, ord] = await Promise.all([
        estrategiasSheetService.fetchEstrategias(),
        estrategiasSheetService.fetchOrdenes(),
      ]);

      console.log('estrategias cargadas:', est.length);
      console.log('ordenes cargadas:', ord.length);

      setEstrategias(est);
      setOrdenes(ord);
    } catch (err: any) {
      console.error('Error cargando estrategias:', err);
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  load();
}, []);

  function getTotalOrdenes() {
    return ordenes.length;
  }

  function getOrdenesActivas() {
    return ordenes.filter(o => o.estado && o.estado.toLowerCase() === 'activa').length;
  }

  function getOrdenesDeEstrategia(noEstrategia: string): OrdenRow[] {
    return estrategiasSheetService.getOrdenesPorEstrategia(noEstrategia);
  }

  if (loading) {
    return (
      <div className="dashboard-home">
        <div className="page-header">
          <h1 className="page-title">Estrategias</h1>
          <p className="page-subtitle">Cargando estrategias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-home">
        <div className="page-header">
          <h1 className="page-title">Estrategias</h1>
          <p className="page-subtitle">{error}</p>
        </div>
      </div>
    );
  }

  if (estrategias.length === 0) {
    return (
      <div className="dashboard-home">
        <div className="page-header">
          <h1 className="page-title">Estrategias</h1>
          <p className="page-subtitle">No se encontraron estrategias</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-home">
      <div className="page-header">
        <h1 className="page-title">Estrategias</h1>
        <p className="page-subtitle">
          {estrategias.length} estrategias · {getTotalOrdenes()} Órdenes · {getOrdenesActivas()} Activas
        </p>
      </div>

      <div className="estrategias-table-wrapper">
        <table className="estrategias-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nombre</th>
              <th>Par</th>
              <th>Temporalidad</th>
              <th>Estado</th>
              <th>Órdenes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {estrategias.map((estrategia) => {
              const ordenesDeEsta = getOrdenesDeEstrategia(estrategia.noEstrategia);
              const isExpanded = expandedId === estrategia.noEstrategia;

              return (
                <React.Fragment key={estrategia.noEstrategia}>
                  <tr>
                    <td>{estrategia.noEstrategia}</td>
                    <td>{estrategia.nombreEstrategia}</td>
                    <td>{estrategia.par}</td>
                    <td>{estrategia.temporalidad}</td>
                    <td>
                      <span className={`estado-badge estado-${estrategia.estado ? estrategia.estado.toLowerCase() : 'desconocido'}`}>
                        {estrategia.estado || 'Desconocido'}
                      </span>
                    </td>
                    <td>{ordenesDeEsta.length}</td>
                    <td>
                      <button
                        className="btn-expand"
                        onClick={() => setExpandedId(isExpanded ? null : estrategia.noEstrategia)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="row-detalle">
                      <td colSpan={7}>
                        <div className="estrategia-detalle">
                          <div className="detalle-seccion">
                            <h4>Reglas de entrada</h4>
                            <p>{estrategia.reglasEntrada || '—'}</p>
                          </div>
                          <div className="detalle-seccion">
                            <h4>Reglas de salida</h4>
                            <p>{estrategia.reglasSalida || '—'}</p>
                          </div>
                          <div className="detalle-seccion">
                            <h4>Gestión de riesgo</h4>
                            <p>{estrategia.gestionRiesgo || '—'}</p>
                          </div>
                          <div className="detalle-seccion">
                            <h4>Indicadores clave</h4>
                            <p>{estrategia.indicadoresClave || '—'}</p>
                          </div>
                          <div className="detalle-seccion">
                            <h4>Comentarios</h4>
                            <p>{estrategia.comentarios || '—'}</p>
                          </div>

                          {ordenesDeEsta.length > 0 && (
                            <div className="ordenes-asociadas">
                              <h4>Órdenes asociadas ({ordenesDeEsta.length})</h4>
                              <table className="ordenes-mini-table">
                                <thead>
                                  <tr>
                                    <th>Fecha / Hora (UTC)</th>
                                    <th>Activo</th>
                                    <th>Tipo</th>
                                    <th>Entrada</th>
                                    <th>Estado</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ordenesDeEsta.map((orden, i) => (
                                    <tr key={`${estrategia.noEstrategia}-orden-${i}`}>
                                      <td>{orden.fechaHora || '—'}</td>
                                      <td>{orden.activo || '—'}</td>
                                      <td>{orden.tipo || '—'}</td>
                                      <td>{orden.entrada1 || '—'}</td>
                                      <td>
                                        <span className={`estado-badge estado-${orden.estado ? orden.estado.toLowerCase() : 'desconocido'}`}>
                                          {orden.estado || 'Desconocido'}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
