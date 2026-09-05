import { googleSheetsApiService } from './googleSheetsApiService';

const SHEET_ID = '1xu-DaHU8kH0SiEEIG3mW2MHDfk7HXc43S6CttIzmi6s';
const SHEET_NAME_ESTRATEGIAS = 'Estrategias';
const SHEET_NAME_ORDENES = 'Ordenes';

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

export const estrategiasSheetService = {
  async fetchEstrategias(): Promise<EstrategiaRow[]> {
    const now = Date.now();
    if (estrategiasCache.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      return estrategiasCache;
    }

    try {
      const rows = await googleSheetsApiService.getSheetData<EstrategiaRow>(SHEET_ID, SHEET_NAME_ESTRATEGIAS);
      estrategiasCache = rows.map(row => ({
        noEstrategia: row['No. Estrategia']?.toString() || '',
        fecha: row['Fecha']?.toString() || '',
        nombreEstrategia: row['Nombre de Estrategia']?.toString() || '',
        par: row['Par']?.toString() || '',
        temporalidad: row['Temporalidad']?.toString() || '',
        tipoOrden: row['Tipo de Orden']?.toString() || '',
        indicadoresClave: row['Indicadores Clave']?.toString() || '',
        reglasEntrada: row['Reglas de Entrada']?.toString() || '',
        reglasSalida: row['Reglas de Salida / TP']?.toString() || '',
        gestionRiesgo: row['GestiÃ³n de Riesgo & Stop Loss']?.toString() || '',
        comentarios: row['Comentarios / Backtesting']?.toString() || '',
        estado: row['Estado']?.toString() || '',
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
      const rows = await googleSheetsApiService.getSheetData<OrdenRow>(SHEET_ID, SHEET_NAME_ORDENES);
      ordenesCache = rows.map(row => ({
        estrategiaNo: row['Estrategia No.']?.toString() || '',
        fechaHora: row['Fecha/Hora (UTC)']?.toString() || '',
        activo: row['Activo']?.toString() || '',
        mercado: row['Mercado']?.toString() || '',
        margen: row['Margen']?.toString() || '',
        apalancamiento: row['Apalancamiento']?.toString() || '',
        tipo: row['Tipo']?.toString() || '',
        estrategia: row['Estrategia']?.toString() || '',
        escenarioPrincipal: row['Escenario Principal']?.toString() || '',
        entrada1: row['Entrada 1']?.toString() || '',
        stopLoss: row['Stop-Loss']?.toString() || '',
        tp1: row['TP1']?.toString() || '',
        tp2: row['TP2']?.toString() || '',
        tpFinal: row['TP Final']?.toString() || '',
        riesgoMax: row['Riesgo MÃ¡x (ROE)']?.toString() || '',
        reglasEjecucion: row['Reglas de EjecuciÃ³n TÃ¡ctica']?.toString() || '',
        disciplina: row['Disciplina del Trade']?.toString() || '',
        estado: row['Estado']?.toString() || '',
      }));
      lastFetchTime = now;
      return ordenesCache;
    } catch (error) {
      console.error('Error fetching ordenes:', error);
      return [];
    }
  },

  getOrdenesPorEstrategia(noEstrategia: string): OrdenRow[] {
    return ordenesCache.filter(orden => orden.estrategiaNo === noEstrategia);
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
