import { googleSheetsApiService } from './googleSheetsApiService';
import { GoogleSheetStrategyRow } from '../types/strategy';
import { OpenOrder } from '../types/binance';

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

export const estrategiasSheetService = {
  async fetchEstrategias(): Promise<EstrategiaRow[]> {
    const now = Date.now();
    if (estrategiasCache.length > 0 && now - lastFetchTime < CACHE_DURATION_MS) {
      return estrategiasCache;
    }

    try {
      const strategies = await googleSheetsApiService.syncStrategiesViaApi(SHEET_ID);
      
      estrategiasCache = strategies.map(row => ({
        noEstrategia: row.noEstrategia?.toString() || '',
        fecha: row.fecha?.toString() || '',
        nombreEstrategia: row.nombreEstrategia?.toString() || '',
        par: row.par?.toString() || '',
        temporalidad: row.temporalidad?.toString() || '',
        tipoOrden: row.tipoOrden?.toString() || '',
        indicadoresClave: row.indicadoresClave?.toString() || '',
        reglasEntrada: row.reglasEntrada?.toString() || '',
        reglasSalida: row.reglasSalida?.toString() || '',
        gestionRiesgo: row.gestionRiesgo?.toString() || '',
        comentarios: row.comentarios?.toString() || '',
        estado: row.estado?.toString() || '',
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
      const orders = await googleSheetsApiService.syncOrdersViaApi(SHEET_ID, 'Ordenes');
      
      ordenesCache = orders.map((order: OpenOrder) => ({
        estrategiaNo: order.strategyId || '',
        fechaHora: new Date().toISOString(),
        activo: order.symbol.replace('USDT', '') || '',
        mercado: 'FUTURES',
        margen: 'ISOLATED',
        apalancamiento: `${order.leverage || 1}x`,
        tipo: order.type,
        estrategia: `Estrategia ${order.strategyId || '-'}`,
        escenarioPrincipal: '',
        entrada1: String(order.price || order.stopPrice || 0),
        stopLoss: '0',
        tp1: '0',
        tp2: '0',
        tpFinal: '0',
        riesgoMax: '0%',
        reglasEjecucion: '',
        disciplina: '',
        estado: order.status,
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
