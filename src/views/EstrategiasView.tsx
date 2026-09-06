import React, { useEffect, useState } from 'react';
import { estrategiasSheetService, EstrategiaRow, OrdenRow } from '../services/estrategiasSheetService';
import { googleSheetsApiService } from '../services/googleSheetsApiService';

const SHEET_ID = '1xu-DaHU8kH0SiEEIG3mW2MHDfk7HXc43S6CttIzmi6s';

export function EstrategiasView() {
  const [estrategias, setEstrategias] = useState<EstrategiaRow[]>([]);
  const [ordenes, setOrdenes] = useState<OrdenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Prueba directa a la API
        const rawEstrategias = await googleSheetsApiService.getSheetData(
          SHEET_ID,
          'Estrategias',
          'A1:Z500'
        );
        console.log('rawEstrategias:', rawEstrategias);

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

  // ... resto del componente igual que antes ...
