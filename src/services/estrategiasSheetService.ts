import { googleSheetsApiService } from './googleSheetsApiService';

const SHEET_ID = '1xu-DaHU8kH0SiEEIG3mW2MHDfk7HXc43S6CttIzmi6s';

export interface EstrategiaRow {
  noEstrategia: string;
  fecha: string;
  nombreEstrategia: string;
  par: string;
  temporalidad: string;
  tipoOrden: string;
  indicadoresClave: string;
  reglasEntrada: string;
  reglasSalida: string;
  gestionRiesgo: string;
  comentarios: string;
  estado: string;
}

export interface OrdenRow {
  estrategiaNo: string;
  fechaHora: string;
  activo: string;
  mercado: string;
  margen: string;
  apalancamiento: string;
  tipo: string;
  estrategia: string;
  escenarioPrincipal: string;
  entrada1: string;
  stopLoss: string;
  tp1: string;
  tp2: string;
  tpFinal: string;
  riesgoMax: string;
  reglasEjecucion: string;
  disciplina: string;
  estado: string;
}

let estrategiasCache: EstrategiaRow[] = [];
let ordenesCache: OrdenRow[] = [];
let lastFetchTime = 0;
const CACHE_DURATION_MS = 30000;

function normalizeKey(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/#/g, '')
    .replace(/\./g, '')
    .replace(/\s+/g, '');
}

function findColumnIndex(headers: unknown[], ...candidates: string[]): number {
  const normalizedHeaders = headers.map(normalizeKey);

  for (const candidate of candidates) {
    const index = normalizedHeaders.indexOf(normalizeKey(candidate));
    if (index !== -1) return index;
  }

  return -1;
}

function getString(row: unknown[], index: number): string {
  if (index < 0 || index >= row.length) return '';

  const value = row[index];
  return value === null || value === undefined ? '' : String(value).trim();
}

export const estrategiasSheetService = {
  async fetchEstrategias(): Promise<EstrategiaRow[]> {
    const now = Date.now();

    if (
      estrategiasCache.length > 0 &&
      now - lastFetchTime < CACHE_DURATION_MS
    ) {
      return estrategiasCache;
    }

    try {
      let rows: string[][] = [];

      try {
        rows = await googleSheetsApiService.getRangeValues(
          SHEET_ID,
          'Estrategias!A1:Z500'
        );
      } catch {
        rows = await googleSheetsApiService.getRangeValues(
          SHEET_ID,
          'A1:Z500'
        );
      }

      if (!rows || rows.length < 2) {
        estrategiasCache = [];
        lastFetchTime = now;
        return estrategiasCache;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const idxNo = findColumnIndex(
        headers,
        'No. Estrategia',
        'No Estrategia',
        'No.'
      );
      const idxFecha = findColumnIndex(headers, 'Fecha');
      const idxNombre = findColumnIndex(
        headers,
        'Nombre de Estrategia',
        'Nombre Estrategia',
        'Nombre'
      );
      const idxPar = findColumnIndex(headers, 'Par', 'Activo', 'Símbolo');
      const idxTemporalidad = findColumnIndex(
        headers,
        'Temporalidad',
        'Temporalidad de Operación'
      );
      const idxTipoOrden = findColumnIndex(
        headers,
        'Tipo de Orden',
        'Tipo Orden',
        'Tipo'
      );
      const idxIndicadores = findColumnIndex(
        headers,
        'Indicadores Clave',
        'Indicadores'
      );
      const idxEntrada = findColumnIndex(
        headers,
        'Reglas de Entrada',
        'Reglas Entrada',
        'Entrada'
      );
      const idxSalida = findColumnIndex(
        headers,
        'Reglas de Salida',
        'Reglas Salida',
        'Salida'
      );
      const idxRiesgo = findColumnIndex(
        headers,
        'Gestión de Riesgo',
        'Gestion de Riesgo',
        'Gestión Riesgo',
        'Riesgo'
      );
      const idxComentarios = findColumnIndex(headers, 'Comentarios', 'Notas');
      const idxEstado = findColumnIndex(headers, 'Estado', 'Estatus');

      estrategiasCache = dataRows
        .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
        .map(row => ({
          noEstrategia: getString(row, idxNo),
          fecha: getString(row, idxFecha),
          nombreEstrategia: getString(row, idxNombre),
          par: getString(row, idxPar),
          temporalidad: getString(row, idxTemporalidad),
          tipoOrden: getString(row, idxTipoOrden),
          indicadoresClave: getString(row, idxIndicadores),
          reglasEntrada: getString(row, idxEntrada),
          reglasSalida: getString(row, idxSalida),
          gestionRiesgo: getString(row, idxRiesgo),
          comentarios: getString(row, idxComentarios),
          estado: getString(row, idxEstado),
        }));

      lastFetchTime = now;
      return estrategiasCache;
    } catch (error) {
      console.error('Error fetching estrategias:', error);
      estrategiasCache = [];
      return [];
    }
  },

  async fetchOrdenes(): Promise<OrdenRow[]> {
    const now = Date.now();

    if (
      ordenesCache.length > 0 &&
      now - lastFetchTime < CACHE_DURATION_MS
    ) {
      return ordenesCache;
    }

    try {
      let rows: string[][] = [];

      try {
        rows = await googleSheetsApiService.getRangeValues(
          SHEET_ID,
          'Ordenes !A1:Z500'
        );
      } catch {
        try {
          rows = await googleSheetsApiService.getRangeValues(
            SHEET_ID,
            'Ordenes!A1:Z500'
          );
        } catch {
          rows = [];
        }
      }

      if (!rows || rows.length < 2) {
        ordenesCache = [];
        lastFetchTime = now;
        return ordenesCache;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const idxEstrategia = findColumnIndex(
        headers,
        'Estrategia No.',
        'Estrategia No',
        'No. Estrategia'
      );
      const idxFechaHora = findColumnIndex(
        headers,
        'Fecha / Hora (UTC)',
        'Fecha Hora',
        'Fecha'
      );
      const idxActivo = findColumnIndex(headers, 'Activo', 'Símbolo', 'Par');
      const idxMercado = findColumnIndex(headers, 'Mercado');
      const idxMargen = findColumnIndex(headers, 'Margen');
      const idxApalancamiento = findColumnIndex(
        headers,
        'Apalancamiento',
        'Leverage'
      );
      const idxTipo = findColumnIndex(headers, 'Tipo', 'Tipo de Orden');
      const idxNombreEstrategia = findColumnIndex(
        headers,
        'Estrategia',
        'Nombre de Estrategia'
      );
      const idxEscenario = findColumnIndex(
        headers,
        'Escenario Principal',
        'Escenario'
      );
      const idxEntrada = findColumnIndex(
        headers,
        'Entrada 1',
        'Entrada1',
        'Entrada'
      );
      const idxStopLoss = findColumnIndex(
        headers,
        'Stop Loss',
        'StopLoss',
        'SL'
      );
      const idxTp1 = findColumnIndex(headers, 'TP1', 'TP 1');
      const idxTp2 = findColumnIndex(headers, 'TP2', 'TP 2');
      const idxTpFinal = findColumnIndex(
        headers,
        'TP Final',
        'TPFinal',
        'TP Final'
      );
      const idxRiesgo = findColumnIndex(
        headers,
        'Riesgo Máx',
        'Riesgo Max',
        'Riesgo'
      );
      const idxReglas = findColumnIndex(
        headers,
        'Reglas de Ejecución',
        'Reglas Ejecución',
        'Reglas Ejecucion',
        'Reglas'
      );
      const idxDisciplina = findColumnIndex(headers, 'Disciplina');
      const idxEstado = findColumnIndex(headers, 'Estado', 'Estatus');

      ordenesCache = dataRows
        .filter(row => row.some(cell => String(cell ?? '').trim() !== ''))
        .map(row => ({
          estrategiaNo: getString(row, idxEstrategia),
          fechaHora: getString(row, idxFechaHora),
          activo: getString(row, idxActivo),
          mercado: getString(row, idxMercado),
          margen: getString(row, idxMargen),
          apalancamiento: getString(row, idxApalancamiento),
          tipo: getString(row, idxTipo),
          estrategia: getString(row, idxNombreEstrategia),
          escenarioPrincipal: getString(row, idxEscenario),
          entrada1: getString(row, idxEntrada),
          stopLoss: getString(row, idxStopLoss),
          tp1: getString(row, idxTp1),
          tp2: getString(row, idxTp2),
          tpFinal: getString(row, idxTpFinal),
          riesgoMax: getString(row, idxRiesgo),
          reglasEjecucion: getString(row, idxReglas),
          disciplina: getString(row, idxDisciplina),
          estado: getString(row, idxEstado),
        }));

      lastFetchTime = now;
      return ordenesCache;
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      ordenesCache = [];
      return [];
    }
  },

  getOrdenesPorEstrategia(noEstrategia: string): OrdenRow[] {
    const normalizedStrategy = normalizeKey(noEstrategia);

    return ordenesCache.filter(
      orden => normalizeKey(orden.estrategiaNo) === normalizedStrategy
    );
  },

  clearCache(): void {
    estrategiasCache = [];
    ordenesCache = [];
    lastFetchTime = 0;
  },

  getAllEstrategias(): EstrategiaRow[] {
    return estrategiasCache;
  },

  getAllOrdenes(): OrdenRow[] {
    return ordenesCache;
  },
};
