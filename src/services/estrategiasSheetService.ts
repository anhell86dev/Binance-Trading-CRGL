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

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/#/g, '')
    .replace(/estrategia/g, 'estrat')
    .replace(/no\./g, 'no')
    .replace(/\s+/g, '')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
}

function findColumnIndex(headers: string[], ...candidates: string[]): number {
  for (const candidate of candidates) {
    const normalizedCandidate = normalizeKey(candidate);
    const idx = headers.findIndex(h => normalizeKey(h) === normalizedCandidate);
    if (idx !== -1) return idx;
  }
  return -1;
}

function getString(row: any[], idx: number): string {
  if (idx < 0 || idx >= row.length) return '';
  const v = row[idx];
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

export const estrategiasSheetService = {
  async fetchEstrategias(): Promise<EstrategiaRow[]> {
    const now = Date.now();
    if (estrategiasCache.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      return estrategiasCache;
    }

    try {
      const rows = await googleSheetsApiService.getSheetData(SHEET_ID, 'Estrategias', 'A1:Z500');
      if (!rows || rows.length < 2) {
        estrategiasCache = [];
        lastFetchTime = now;
        return estrategiasCache;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const idxNo = findColumnIndex(headers, 'No. Estrategia', 'No Estrategia', 'No.', 'No');
      const idxFecha = findColumnIndex(headers, 'Fecha', 'Fecha Creacion');
      const idxNombre = findColumnIndex(headers, 'Nombre Estrategia', 'Nombre', 'Estrategia');
      const idxPar = findColumnIndex(headers, 'Par', 'Activo', 'Simbolo');
      const idxTemp = findColumnIndex(headers, 'Temporalidad', 'Temp');
      const idxTipo = findColumnIndex(headers, 'Tipo Orden', 'Tipo', 'Orden');
      const idxIndicadores = findColumnIndex(headers, 'Indicadores Clave', 'Indicadores');
      const idxEntrada = findColumnIndex(headers, 'Reglas Entrada', 'Entrada');
      const idxSalida = findColumnIndex(headers, 'Reglas Salida', 'Salida');
      const idxRiesgo = findColumnIndex(headers, 'Gestion Riesgo', 'Riesgo', 'Gestion');
      const idxComentarios = findColumnIndex(headers, 'Comentarios', 'Notas');
      const idxEstado = findColumnIndex(headers, 'Estado', 'Estatus');

      estrategiasCache = dataRows.map(row => ({
        noEstrategia: getString(row, idxNo),
        fecha: getString(row, idxFecha),
        nombreEstrategia: getString(row, idxNombre),
        par: getString(row, idxPar),
        temporalidad: getString(row, idxTemp),
        tipoOrden: getString(row, idxTipo),
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
      return [];
    }
  },

  async fetchOrdenes(): Promise<OrdenRow[]> {
    const now = Date.now();
    if (ordenesCache.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      return ordenesCache;
    }

    try {
      let rows: any[][] | null = null;
      rows = await googleSheetsApiService.getSheetData(SHEET_ID, 'Ordenes ', 'A1:Z500');
      if (!rows || rows.length < 2) {
        rows = await googleSheetsApiService.getSheetData(SHEET_ID, 'Ordenes', 'A1:Z500');
      }

      if (!rows || rows.length < 2) {
        ordenesCache = [];
        lastFetchTime = now;
        return ordenesCache;
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);

      const idxEstrategiaNo = findColumnIndex(headers, 'Estrategia No.', 'Estrategia No', 'Estrategia', 'No. Estrategia');
      const idxFechaHora = findColumnIndex(headers, 'Fecha / Hora (UTC)', 'Fecha Hora', 'Fecha', 'Hora');
      const idxActivo = findColumnIndex(headers, 'Activo', 'Simbolo', 'Par');
      const idxMercado = findColumnIndex(headers, 'Mercado', 'Market');
      const idxMargen = findColumnIndex(headers, 'Margen', 'Margin');
      const idxApalancamiento = findColumnIndex(headers, 'Apalancamiento', 'Leverage');
      const idxTipo = findColumnIndex(headers, 'Tipo', 'Type');
      const idxEstrategia = findColumnIndex(headers, 'Estrategia', 'Strategy');
      const idxEscenario = findColumnIndex(headers, 'Escenario Principal', 'Escenario');
      const idxEntrada1 = findColumnIndex(headers, 'Entrada 1', 'Entrada1', 'Entrada');
      const idxStopLoss = findColumnIndex(headers, 'Stop Loss', 'StopLoss', 'SL');
      const idxTp1 = findColumnIndex(headers, 'TP1', 'Tp1', 'TP 1');
      const idxTp2 = findColumnIndex(headers, 'TP2', 'Tp2', 'TP 2');
      const idxTpFinal = findColumnIndex(headers, 'TP Final', 'TpFinal', 'TPFinal');
      const idxRiesgoMax = findColumnIndex(headers, 'Riesgo Max', 'Riesgo Max', 'Riesgo');
      const idxReglas = findColumnIndex(headers, 'Reglas Ejecucion', 'Reglas Ejecucion', 'Reglas');
      const idxDisciplina = findColumnIndex(headers, 'Disciplina', 'Discipline');
      const idxEstado = findColumnIndex(headers, 'Estado', 'Estatus', 'Status');

      ordenesCache = dataRows.map(row => ({
        estrategiaNo: getString(row, idxEstrategiaNo),
        fechaHora: getString(row, idxFechaHora),
        activo: getString(row, idxActivo),
        mercado: getString(row, idxMercado),
        margen: getString(row, idxMargen),
        apalancamiento: getString(row, idxApalancamiento),
        tipo: getString(row, idxTipo),
        estrategia: getString(row, idxEstrategia),
        escenarioPrincipal: getString(row, idxEscenario),
        entrada1: getString(row, idxEntrada1),
        stopLoss: getString(row, idxStopLoss),
        tp1: getString(row, idxTp1),
        tp2: getString(row, idxTp2),
        tpFinal: getString(row, idxTpFinal),
        riesgoMax: getString(row, idxRiesgoMax),
        reglasEjecucion: getString(row, idxReglas),
        disciplina: getString(row, idxDisciplina),
        estado: getString(row, idxEstado),
      }));

      lastFetchTime = now;
      return ordenesCache;
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      return [];
    }
  },

  getOrdenesPorEstrategia(noEstrategia: string): OrdenRow[] {
    const normalized = normalizeKey(noEstrategia);
    return ordenesCache.filter(orden => normalizeKey(orden.estrategiaNo) === normalized);
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
