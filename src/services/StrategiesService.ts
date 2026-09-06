const APPS_SCRIPT_URL = 'https://script.googleusercontent.com/macros/echo?user_content_key=AUkAhnRfrYisekKAQMEJnLTP_GDUMba8CFuBHGCMqbwMyRsvgDj5CZ7owZx9QfoISZUaQDv15Xe8Y2vAvJl_IlStQL6iLbIcQxEmCYAtjqnwRQWr6v4uGMj0uJsTuq9ztJVyexYQZA6Hu-jir3-BufglLhwkmqGrDCJN1H_bddnCLlHXUcWjpo4GIF0w5E2I4dqoncF5NS4fBgXAywq0VIAg18oMV5Zqmr_j16fCZAvI--5-zL8puGyDY12rDXzWLFruUlbhPG4D_xB7ISEfmkaKk3ADqBKAZA&lib=M42faB9UhuA0AE938va8ONNDec98BoeWU';

export interface Strategy {
  'No. Estrategia'?: string;
  'Fecha'?: string;
  'Nombre de Estrategia'?: string;
  'Par'?: string;
  'Temporalidad'?: string;
  'Tipo de Orden'?: string;
  'Indicadores Clave'?: string;
  'Reglas de Entrada'?: string;
  'Reglas de Salida TP'?: string;
  'Gestion de Riesgo Stop Loss'?: string;
  'Comentarios Backtesting'?: string;
  'Estado'?: string;
  rowIndex?: number;
}

export interface StrategiesResponse {
  success: boolean;
  count?: number;
  data?: Strategy[];
  error?: string;
}

export async function getAllStrategies(): Promise<StrategiesResponse> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=getAll`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estrategias'
    };
  }
}

export async function getActiveStrategies(): Promise<StrategiesResponse> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=getActive`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estrategias activas'
    };
  }
}

export async function getStrategyById(id: string): Promise<StrategiesResponse> {
  try {
    const url = `${APPS_SCRIPT_URL}?action=getById&id=${encodeURIComponent(id)}`;
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al obtener estrategia'
    };
  }
}

export function parseStrategyData(strategy: Strategy) {
  return {
    id: strategy['No. Estrategia'] || '',
    fecha: strategy['Fecha'] || '',
    nombre: strategy['Nombre de Estrategia'] || '',
    par: strategy['Par'] || '',
    temporalidad: strategy['Temporalidad'] || '',
    tipoOrden: strategy['Tipo de Orden'] || '',
    indicadores: strategy['Indicadores Clave'] || '',
    entrada: strategy['Reglas de Entrada'] || '',
    salida: strategy['Reglas de Salida TP'] || '',
    riesgo: strategy['Gestion de Riesgo Stop Loss'] || '',
    comentarios: strategy['Comentarios Backtesting'] || '',
    estado: strategy['Estado'] || ''
  };
}
