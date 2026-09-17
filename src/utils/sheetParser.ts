import {
  GoogleSheetStrategyRow,
  PlannedStrategyOrder,
  StrategyExecutionPlan,
  StrategyTradeStatus,
  TradeProcessStageInfo,
  ParsedStrategyPrices,
  StrategySourceType,
} from '../types/strategy';
import { OpenOrder } from '../types/binance';
import { normalizeBinanceSymbol, getBinanceSymbolMultiplier } from '../data/binancePairs';

export const SAMPLE_GOOGLE_SHEET_CSV = `No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting,Estado
ZEC-20260902-RETROCESO,2026-09-02,Acumulación en Retroceso y Testeo de SMA-15,ZECUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"SMA-15 ($760.45), Mínimo $789.12, SMA-7 ($813.98), Resistencia $839.76, Máx 8 años $888","DCA: E1 (50%) @ $785.00, E2 (30%) @ $770.00, E3 (20%) @ $760.00 (Promedio: $775.50)",TP1 (50%) @ $838.00; TP2 (30%) @ $885.00; TP Final (20%) @ $950.00,SL Global @ $748.00 (bajo SMA-15 $760.45). ROE Máx 5X: -17.73%. Margen Aislado,Superada por análisis del 03/09.,Obsoleto
TAO-20260902-REBOTE,2026-09-02,Rebote en Soporte Dinámico Confluente (SMA-30 / SMA-90),TAOUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $211.30–$212.87 (SMA-30/SMA-90), SMA-50 ($205.67), Resistencia $227.82, SMA-7 ($232.80), SMA-200 ($235.80)","DCA: E1 (50%) @ $215.50, E2 (30%) @ $213.00, E3 (20%) @ $211.50 (Promedio: $213.95)",TP1 (50%) @ $227.50; TP2 (30%) @ $232.50; TP Final (20%) @ $235.50,SL Global @ $204.50 (bajo SMA-50 $205.67). ROE Máx 5X: -22.08%. Margen Aislado,Rango defensivo. Mover SL a Breakeven tras TP1.,Activa
AAVE-20260902-BREAKOUT-RETEST,2026-09-02,Ruptura y Retesteo en SMA-7 y Apertura Semanal,AAVEUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"SMA-7 ($124.61), Apertura $122.10, SMA-15 ($117.72), Resistencia $131.89, Extensión $140.00","DCA: E1 (50%) @ $124.50, E2 (30%) @ $123.00, E3 (20%) @ $122.10 (Promedio: $123.57)",TP1 (50%) @ $131.50; TP2 (30%) @ $139.50; TP Final (20%) @ $148.00,SL Global @ $116.50 (bajo SMA-15 $117.72). ROE Máx 5X: -28.61%. Margen Aislado,Ruptura alcista. Entrada en retroceso. Mover SL a Breakeven tras TP1.,Activa
SOL-20260902-REBOTE,2026-09-02,Rebote en Soporte y Acumulación Escalonada,SOLUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $97.10–$97.51 (SMA-15), Soporte $98.53, SMA-7 ($103.07), Resistencia $103.62","DCA: E1 (50%) @ $98.50, E2 (30%) @ $97.60, E3 (20%) @ $97.10 (Promedio: $97.95)",TP1 (50%) @ $103.00; TP2 (30%) @ $104.00; TP Final (20%) @ $109.50,SL Global @ $94.80 (bajo $95.00). ROE Máx 5X: -16.08%. Margen Aislado,Superada por análisis del 03/09.,Obsoleto
XRP-20260902-RANGO,2026-09-02,Trading de Rango y Rebote en Soporte Clave (SMA-200),XRPUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $1.31, SMA-200 ($1.27), SMA-30 ($1.19), Resistencia $1.35, SMA-7 ($1.38), Techo $1.39-$1.40","DCA: E1 (50%) @ $1.3150, E2 (30%) @ $1.2900, E3 (20%) @ $1.2750 (Promedio: $1.3000)",TP1 (50%) @ $1.3500; TP2 (30%) @ $1.3800; TP Final (20%) @ $1.3950,SL Global @ $1.2580 (bajo SMA-200 $1.2700). ROE Máx 5X: -16.15%. Margen Aislado,Rango neutral $1.27-$1.39. Mover SL a Breakeven tras TP1.,Obsoleto
SOL-20260903-RANGO,2026-09-03,Trading de Rango y Defensa en SMA-15 ($97.10–$97.51),SOLUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte intradía $97.51, SMA-15 ($97.10), Resistencia $101.07, SMA-7 ($103.07), Techo $104.29","DCA: E1 (50%) @ $98.20, E2 (30%) @ $97.50, E3 (20%) @ $97.15 (Promedio: $97.78)",TP1 (50%) @ $101.00; TP2 (30%) @ $103.00; TP Final (20%) @ $104.20,SL Global @ $95.80 (bajo $96.00 y SMA-15). ROE Máx 5X: -10.10%. Margen Aislado,Rango de alta probabilidad. Volumen bajo promedio. Mover SL a Breakeven tras TP1.,Obsoleto
ZEC-20260903-RANGO,2026-09-03,Trading de Rango y Rebote en Soporte Intradía (SMA-7 / Mínimo),ZECUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte intradía $789.12, SMA-7 ($813.98), SMA-15 ($760.45), Resistencia 1 $839.76, Resistencia 2 $851.31, Techo $865.79","DCA: E1 (50%) @ $805.00, E2 (30%) @ $792.00, E3 (20%) @ $775.00 (Promedio: $795.10)",TP1 (50%) @ $838.00; TP2 (30%) @ $850.00; TP Final (20%) @ $865.00,SL Global @ $758.00 (bajo SMA-15 $760.45). ROE Máx 5X: -23.33%. Margen Aislado,Rango $760-$865. Retroceso controlado. Mover SL a Breakeven tras TP1.,Obsoleto
XRP-20260903-RANGO,2026-09-03,Trading de Rango y Retest en Soporte ($1.31–$1.35),XRPUSDT,1D / 4H / 1H,Limit (DCA Escalonado) + Stop-Market + Take-Profit,"Soporte apertura/mínimo $1.34-$1.35, Soporte previo $1.31, SMA-200 ($1.27), SMA-30 ($1.20), Resistencia 1 ($1.37 / SMA-7), Resistencia 2 ($1.39 / SMA-15). Volumen -10.12%.","DCA en 3 escalones: E1 (50%) @ $1.3450, E2 (30%) @ $1.3250, E3 (20%) @ $1.3120. Precio promedio ponderado: $1.3324.",TP1 (50%) @ $1.3700; TP2 (30%) @ $1.3850; TP Final (20%) @ $1.3950.,"Stop-Loss Global @ $1.2980 (bajo soporte $1.3100). Distancia precio: -2.58%, ROE Máx 5X: -12.90%. Margen Aislado.",Rango neutral $1.31-$1.39. Consolidación tras repunte mensual respaldada por disciplina de escrow. Mover SL a Breakeven tras TP1. Cancelar DCA no ejecutado tras TP1.,Activa
ZEC-20260903-RANGO-V2,2026-09-03,Trading de Rango y Compra en Eje SMA-7 ($814–$840),ZECUSDT,1D / 4H / 1H,Limit (DCA Escalonado) + Stop-Market + Take-Profit,"Eje decisión $830.22, SMA-7 ($820.16), Mínimo del día $814.37, Mínimo previo $789.12, SMA-15 ($781.54), Resistencia $835-$840.","DCA en 3 escalones: E1 (50%) @ $820.00, E2 (30%) @ $812.00, E3 (20%) @ $795.00. Precio promedio ponderado: $812.60.",TP1 (50%) @ $835.00; TP2 (30%) @ $840.00; TP Final (20%) @ $855.00.,"Stop-Loss Global @ $778.00 (bajo SMA-15 $781.54). Distancia precio: -4.26%, ROE Máx 5X: -21.29%. Margen Aislado.",Rango neutral $789-$840. Consolidación tras repunte anual. Mover SL a Breakeven tras TP1. Cancelar DCA no ejecutado tras TP1.,Activa
SOL-20260903-RANGO-V2,2026-09-03,Trading de Rango y Consolidación Barrera $100 ($98.67–$102.99),SOLUSDT,1D / 4H / 1H,Limit (DCA Escalonado) + Stop-Market + Take-Profit,"Umbral psicológico $100.13, Mínimo intradía $99.83, SMA-15 ($98.67), Mínimo previo $97.51, Resistencia 1 ($101.20), SMA-7 ($102.99). Compresión rango ($1.36).","DCA en 3 escalones: E1 (50%) @ $100.00, E2 (30%) @ $99.20, E3 (20%) @ $98.70. Precio promedio ponderado: $99.50.",TP1 (50%) @ $101.20; TP2 (30%) @ $102.50; TP Final (20%) @ $103.50.,"Stop-Loss Global @ $97.30 (bajo soporte previo $97.51). Distancia precio: -2.21%, ROE Máx 5X: -11.05%. Margen Aislado.",Rango neutral de alta probabilidad ($98.67-$102.99). Compresión de volatilidad. Mover SL a Breakeven tras TP1. Cancelar DCA no ejecutado tras TP1.,Activa`;


/**
 * Normalizes status strings from Google Sheets to StrategyTradeStatus
 * Activa: Estrategia para tomar
 * Obsoleto: Estrategia No activa
 * Live: Estrategia con Ordenes Generadas
 * Live+: Estrategia con Ordenes Generadas y completadas
 */
export function normalizeStrategyStatus(val?: string): StrategyTradeStatus {
  if (!val) return 'Activa';
  const clean = val.trim().toLowerCase();
  if (clean === 'fallida' || clean.includes('fallid') || clean.includes('stop loss') || clean.includes('invalidad')) {
    return 'Fallida';
  }
  if (clean === 'live+' || clean.includes('live+') || clean.includes('live plus') || clean.includes('completad')) {
    return 'Live+';
  }
  if (clean === 'live' || clean.includes('generad')) {
    return 'Live';
  }
  if (clean === 'obsoleto' || clean.includes('obsolet') || clean.includes('no activa') || clean.includes('inactiv') || clean.includes('cancelad')) {
    return 'Obsoleto';
  }
  return 'Activa';
}

/**
 * Returns rich status metadata and trade lifecycle process description
 */
export function getTradeProcessStageInfo(
  status: StrategyTradeStatus = 'Activa',
  hasOpenOrders: boolean = false,
  hasPosition: boolean = false
): TradeProcessStageInfo {
  // If strategy failed (hit Stop Loss)
  if (status === 'Fallida') {
    return {
      stage: -1,
      status: 'Fallida',
      label: 'Fallida',
      meaning: 'Estrategia Fallida (Stop Loss Tocado)',
      description:
        'El precio ha alcanzado el nivel de Stop Loss técnico. La hipótesis de mercado quedó invalidada. Cierre obligatorio y post-mortem de riesgo.',
      progressPct: 100,
      nextStep: 'Registrar en diario de trading para análisis de lecciones aprendidas y respetar el protocolo.',
      badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    };
  }

  // If Binance has an active position, it is in Live+ phase (completada / en curso)
  if (hasPosition || status === 'Live+') {
    return {
      stage: 3,
      status: 'Live+',
      label: 'Live+',
      meaning: 'Estrategia con Órdenes Generadas y completadas',
      description:
        'Entradas ejecutadas y completadas en el mercado. Posición activa en Binance Futures con margen aislado. Monitoreo en tiempo real de PnL no realizado y gestión dinámica hacia TP1 (40%), TP2 (40%), TP Final (20%) y Stop Loss.',
      progressPct: 90,
      nextStep: 'Gestión activa hasta toma de beneficios en TPs escalonados o salida estricta por Stop Loss.',
      badgeClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    };
  }

  // If Binance has open orders placed, it is in Live phase (órdenes generadas en libro)
  if (hasOpenOrders || status === 'Live') {
    return {
      stage: 2,
      status: 'Live',
      label: 'Live',
      meaning: 'Estrategia con Órdenes Generadas',
      description:
        'Órdenes límite de entrada (E1 y E2) junto a órdenes condicionales Stop Loss y Take Profits colocadas en el libro de Binance Futures. Esperando que el mercado toque la zona de soporte para su ejecución.',
      progressPct: 60,
      nextStep: 'Esperar llenado (Fill) de las órdenes límite para pasar automáticamente a estado Live+.',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  // Obsolete / Inactive strategy
  if (status === 'Obsoleto') {
    return {
      stage: 0,
      status: 'Obsoleto',
      label: 'Obsoleto',
      meaning: 'Estrategia No activa',
      description:
        'Estrategia no vigente o superada por una revisión más reciente del mismo par. Desestimada para ejecución operativa.',
      progressPct: 0,
      nextStep: 'Consultar la última estrategia con estado "Activa" para este par.',
      badgeClass: 'bg-neutral-850 text-neutral-400 border-neutral-700',
    };
  }

  // Default: 'Activa' (Estrategia para tomar)
  return {
    stage: 1,
    status: 'Activa',
    label: 'Activa',
    meaning: 'Estrategia para tomar',
    description:
      'Estrategia vigente y lista para tomar. Análisis técnico validado con niveles de soporte y medias móviles. Monitoreo en tiempo real del % de distancia a Entrada 1 y Entrada 2.',
    progressPct: 30,
    nextStep: 'Autorizar y enviar órdenes planificadas a Binance Futures para pasar a estado Live.',
    badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  };
}

/**
 * Takes a list of strategies and resolves the rule:
 * "Solo debe tomar la última estrategia de cada par. La que dice ACTIVA en el estado: Activa.
 * Estrategia para tomar, Obsoleto: Estrategia No activa. Live: Estrategia con Ordenes Generadas.
 * Live+: Estrategia con Ordenes Generadas y completadas."
 */
export function resolveLatestStrategiesPerPair(strategies: GoogleSheetStrategyRow[]): {
  latestStrategies: GoogleSheetStrategyRow[];
  allResolvedStrategies: GoogleSheetStrategyRow[];
  activeToTakeStrategies: GoogleSheetStrategyRow[];
} {
  // Map to find the last index / latest entry for each pair
  const lastIndexByPair = new Map<string, number>();

  for (let i = 0; i < strategies.length; i++) {
    const s = strategies[i];
    const pair = (s.par || '').trim().toUpperCase();
    if (pair) {
      lastIndexByPair.set(pair, i);
    }
  }

  const allResolvedStrategies: GoogleSheetStrategyRow[] = strategies.map((s, i) => {
    const pair = (s.par || '').trim().toUpperCase();
    const isLatest = lastIndexByPair.get(pair) === i;

    // If it's NOT the latest strategy for this pair, it is superseded and becomes Obsoleto
    if (!isLatest) {
      return {
        ...s,
        estado: 'Obsoleto' as StrategyTradeStatus,
      };
    }

    return {
      ...s,
      estado: s.estado ? normalizeStrategyStatus(s.estado) : 'Activa',
    };
  });

  // Extract only the latest strategy of each pair
  const latestStrategies: GoogleSheetStrategyRow[] = [];
  lastIndexByPair.forEach(idx => {
    if (allResolvedStrategies[idx]) {
      latestStrategies.push(allResolvedStrategies[idx]);
    }
  });

  // Filter only those among the latest that are marked "Activa" (Estrategia para tomar)
  const activeToTakeStrategies = latestStrategies.filter(s => s.estado === 'Activa');

  return {
    latestStrategies,
    allResolvedStrategies,
    activeToTakeStrategies,
  };
}

/**
 * Robust CSV parser that handles quotes and line breaks inside quoted fields
 */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip CRLF
      }
      currentRow.push(currentField.trim());
      if (currentRow.some(field => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some(field => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Helper to parse numbers formatted in Spanish (e.g. 10,82 or 75.798,38 or $1.04 or USD $11,92)
 */
export function parseSpanishPrice(rawStr: any, referencePrice = 0): number {
  if (rawStr === null || rawStr === undefined) return 0;
  if (typeof rawStr === 'number') return isNaN(rawStr) ? 0 : rawStr;
  
  let str = rawStr.toString().trim()
    .replace(/^USD\s*/i, '')
    .replace(/^\$\s*/, '')
    .replace(/USD$/i, '')
    .replace(/[\s\t\r\n]+/g, ' ')
    .trim();

  if (!str) return 0;

  // Format: "75.798,38" (thousands dot, decimal comma)
  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(str)) {
    str = str.replace(/\./g, '').replace(',', '.');
  }
  // Format: "75,798.38" (thousands comma, decimal dot)
  else if (/^\d{1,3}(,\d{3})+\.\d+$/.test(str)) {
    str = str.replace(/,/g, '');
  }
  // Format: "1,04" or "0,0795352" or "11,92" (simple decimal comma)
  else if (/^\d+,\d+$/.test(str)) {
    str = str.replace(',', '.');
  }
  // Standard decimal dot or integer
  else {
    str = str.replace(/,/g, '');
  }

  const val = parseFloat(str);
  if (isNaN(val) || val <= 0) return 0;

  // Auto-scale if decimal place was misplaced relative to reference price
  if (referencePrice > 0) {
    if (val > referencePrice * 20 && val / 100 <= referencePrice * 2 && val / 100 >= referencePrice * 0.5) {
      return Number((val / 100).toFixed(6));
    }
    if (val > referencePrice * 200 && val / 1000 <= referencePrice * 2 && val / 1000 >= referencePrice * 0.5) {
      return Number((val / 1000).toFixed(6));
    }
    if (val > referencePrice * 2000 && val / 10000 <= referencePrice * 2 && val / 10000 >= referencePrice * 0.5) {
      return Number((val / 10000).toFixed(6));
    }
  }

  return val;
}

/**
 * Normalizes headers and maps them to GoogleSheetStrategyRow
 * Dual support for:
 * 1. Multi-scenario Analysis Sheet (Fecha, Hora, Activo, Link, Tabla soportes/resistencias, Escenarios, Evaluación, Conclusiones, Estrategia, Ordenes)
 * 2. Standard Binance Futures Tactical Format (No. Estrategia, Fecha, Nombre, Par, Temporalidad, etc.)
 */
export function parseCsvToStrategies(
  csvText: string,
  defaultSource: StrategySourceType = 'Datos Pegados CSV'
): GoogleSheetStrategyRow[] {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  const findColIndex = (keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

  // Check if sheet corresponds to DiarioBitcoin / Multi-scenario structural layout
  const isMultiScenarioFormat = 
    findColIndex(['soportes', 'resistencias', 'tabla de soportes']) >= 0 ||
    findColIndex(['escenarios', 'niveles probables']) >= 0 ||
    findColIndex(['evaluacion de senales', 'senales']) >= 0 ||
    findColIndex(['conclusiones', 'estrategias de inversion']) >= 0;

  const nowFormatted = () => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const currentTs = nowFormatted();
  const strategies: GoogleSheetStrategyRow[] = [];

  if (isMultiScenarioFormat) {
    const fechaIdx = findColIndex(['fecha', 'date']);
    const horaIdx = findColIndex(['hora', 'time']);
    const activoIdx = findColIndex(['activo', 'symbol', 'par', 'paridad', 'moneda']);
    const linkIdx = findColIndex(['link', 'url', 'fuente', 'source']);
    const supResIdx = findColIndex(['tabla de soportes', 'soportes y resistencias', 'soportes']);
    const escenariosIdx = findColIndex(['escenarios', 'niveles probables']);
    const evalIdx = findColIndex(['evaluacion', 'senales de trading', 'senales']);
    const conclIdx = findColIndex(['conclusiones', 'estrategias de inversion', 'conclusion']);
    const stratIdIdx = findColIndex(['estrategia', 'no', 'id']);
    const ordenesIdx = findColIndex(['ordenes', 'estado', 'status']);

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || !row.some(f => f && f.trim().length > 0)) continue;

      const rawFecha = (fechaIdx >= 0 && row[fechaIdx]) ? row[fechaIdx].trim() : '';
      const rawHora = (horaIdx >= 0 && row[horaIdx]) ? row[horaIdx].trim() : '';
      const rawActivo = (activoIdx >= 0 && row[activoIdx]) ? row[activoIdx].trim().toUpperCase() : '';
      const rawLink = (linkIdx >= 0 && row[linkIdx]) ? row[linkIdx].trim() : '';
      const rawSupRes = (supResIdx >= 0 && row[supResIdx]) ? row[supResIdx].trim() : '';
      const rawEscenarios = (escenariosIdx >= 0 && row[escenariosIdx]) ? row[escenariosIdx].trim() : '';
      const rawEval = (evalIdx >= 0 && row[evalIdx]) ? row[evalIdx].trim() : '';
      const rawConcl = (conclIdx >= 0 && row[conclIdx]) ? row[conclIdx].trim() : '';
      const rawStratId = (stratIdIdx >= 0 && row[stratIdIdx]) ? row[stratIdIdx].trim() : '';
      const rawOrdenes = (ordenesIdx >= 0 && row[ordenesIdx]) ? row[ordenesIdx].trim() : '';

      // Clean asset name and format trading pair
      let par = rawActivo.replace(/[^A-Z0-9]/gi, '').toUpperCase();
      if (!par) par = 'BTCUSDT';
      else if (par === 'PEPE') par = '1000PEPEUSDT';
      else if (par === 'SHIB') par = '1000SHIBUSDT';
      else if (par === 'BONK') par = '1000BONKUSDT';
      else if (par === 'FLOKI') par = '1000FLOKIUSDT';
      else if (par === 'LUNC') par = '1000LUNCUSDT';
      else if (!par.endsWith('USDT') && !par.endsWith('BUSD') && !par.endsWith('USDC')) {
        par = `${par}USDT`;
      }

      // Extract current price
      let currentPrice = 0;
      const curMatch = rawSupRes.match(/Precio actual:\s*(?:USD\s*)?\$?([\d.,]+)/i) ||
                       rawConcl.match(/cotiza en (?:USD\s*)?\$?([\d.,]+)/i) ||
                       rawConcl.match(/(?:cae|cede|retrocede|avanza)[^\$]*?hasta (?:USD\s*)?\$?([\d.,]+)/i);
      if (curMatch) currentPrice = parseSpanishPrice(curMatch[1]);

      // Extract Stop Loss
      let slPrice = 0;
      const pctSlMatch = rawConcl.match(/stop loss de\s*([\d.,]+)[–-]([\d.,]+)%\s*por debajo/i);
      if (pctSlMatch && currentPrice > 0) {
        const pct = (parseFloat(pctSlMatch[1]) + parseFloat(pctSlMatch[2])) / 2;
        slPrice = Number((currentPrice * (1 - pct / 100)).toFixed(6));
      } else {
        const slMatch = rawConcl.match(/(?:l[ií]mite de p[eé]rdida|SL|stop loss|stop)\s*(?:en|bajo|de|obligatorio bajo|estricto en)?\s*(?:USD\s*)?\$?([\d.,]+)/i) ||
                        rawEscenarios.match(/(?:l[ií]mite de p[eé]rdida|SL|stop loss|stop)\s*(?:en|bajo|de)?\s*(?:USD\s*)?\$?([\d.,]+)/i) ||
                        rawSupRes.match(/Soporte (?:3|2|1|mayor|estructural):\s*(?:USD\s*)?\$?([\d.,]+)/i);
        if (slMatch) slPrice = parseSpanishPrice(slMatch[1], currentPrice);
      }

      // Extract Take Profits
      let tp1Price = 0;
      let tp2Price = 0;
      let tpFinalPrice = 0;
      const tpMatch = rawConcl.match(/(?:toma de ganancias|TP|objetivo)\s*(?:en|de)?\s*(?:USD\s*)?\$?([\d.,]+)(?:\s*(?:a|y|–|-)\s*(?:USD\s*)?\$?([\d.,]+))?/i) ||
                      rawEscenarios.match(/(?:toma de ganancias|TP|objetivo)\s*(?:en|de)?\s*(?:USD\s*)?\$?([\d.,]+)(?:\s*(?:a|y|–|-)\s*(?:USD\s*)?\$?([\d.,]+))?/i) ||
                      rawSupRes.match(/Resistencia (?:1|2|3|mayor):\s*(?:USD\s*)?\$?([\d.,]+)/i);
      if (tpMatch) {
        tp1Price = parseSpanishPrice(tpMatch[1], currentPrice);
        if (tpMatch[2]) tp2Price = parseSpanishPrice(tpMatch[2], currentPrice);
      }
      const res2Match = rawSupRes.match(/Resistencia 2:\s*(?:USD\s*)?\$?([\d.,]+)/i);
      if (res2Match && !tp2Price) tp2Price = parseSpanishPrice(res2Match[1], currentPrice);
      const res3Match = rawSupRes.match(/Resistencia (?:3|mayor|principal):\s*(?:USD\s*)?\$?([\d.,]+)/i);
      if (res3Match) tpFinalPrice = parseSpanishPrice(res3Match[1], currentPrice);

      // Extract Entry levels (E1, E2, E3)
      let e1Price = 0;
      let e2Price = 0;
      const entryRangeMatch = rawConcl.match(/(?:comprando en|entradas? entre|compras? en|rebote entre|rango(?: de)?)\s*(?:USD\s*)?\$?([\d.,]+)\s*(?:a|y|–|-)\s*(?:USD\s*)?\$?([\d.,]+)/i) ||
                              rawEscenarios.match(/Neutral[^\$]*?Rango (?:USD\s*)?\$?([\d.,]+)\s*(?:–|-)\s*(?:USD\s*)?\$?([\d.,]+)/i);
      if (entryRangeMatch) {
        const pA = parseSpanishPrice(entryRangeMatch[1], currentPrice);
        const pB = parseSpanishPrice(entryRangeMatch[2], currentPrice);
        if (pA > 0 && pB > 0) {
          e1Price = Math.max(pA, pB);
          e2Price = Math.min(pA, pB);
        }
      } else {
        const singleEntryMatch = rawConcl.match(/(?:compras? t[aá]cticas en|entrada cerca de|comprando reacciones en|comprando en|entrada en)\s*(?:USD\s*)?\$?([\d.,]+)/i) ||
                                 rawSupRes.match(/Soporte 1:\s*(?:USD\s*)?\$?([\d.,]+)/i);
        if (singleEntryMatch) {
          e1Price = parseSpanishPrice(singleEntryMatch[1], currentPrice);
          e2Price = slPrice > 0 && slPrice < e1Price ? Number(((e1Price + slPrice) / 2).toFixed(6)) : Number((e1Price * 0.985).toFixed(6));
        }
      }
      if (!e1Price && currentPrice > 0) {
        e1Price = currentPrice;
        e2Price = slPrice > 0 ? Number(((e1Price + slPrice) / 2).toFixed(6)) : Number((e1Price * 0.98).toFixed(6));
      }

      // Safe technical price boundary fallbacks
      if (!slPrice && e2Price > 0) slPrice = Number((e2Price * 0.97).toFixed(6));
      if (!tp1Price && e1Price > 0) tp1Price = Number((e1Price * 1.04).toFixed(6));
      if (!tp2Price && tp1Price > 0) tp2Price = Number((tp1Price * 1.03).toFixed(6));
      if (!tpFinalPrice && tp2Price > 0) tpFinalPrice = Number((tp2Price * 1.03).toFixed(6));

      // Build structured identifier
      const cleanDate = rawFecha.replace(/[^0-9]/g, '').slice(0, 8) || '20260916';
      const stratId = rawStratId || `${rawActivo || 'STRAT'}-${cleanDate}-RANGO`;
      const stratName = `Trading de Rango y Soportes Clave (${rawActivo || par})`;

      const e3Price = slPrice > 0 ? Number(((e2Price + slPrice) / 2).toFixed(6)) : Number((e2Price * 0.99).toFixed(6));
      const avgPrice = Number((e1Price * 0.5 + e2Price * 0.3 + e3Price * 0.2).toFixed(6));

      const reglasEntrada = `DCA Escalonado: E1 (50%) @ $${e1Price}, E2 (30%) @ $${e2Price}, E3 (20%) @ $${e3Price} (Promedio: $${avgPrice}). ${rawConcl.slice(0, 140)}`;
      const reglasSalida = `TP1 (50%) @ $${tp1Price}; TP2 (30%) @ $${tp2Price}; TP Final (20%) @ $${tpFinalPrice || tp2Price}. Mover SL a Breakeven tras TP1.`;
      const gestionRiesgo = `Stop-Loss Global @ $${slPrice}. ROE Máx 5X: -15.00%. Margen Aislado. Mover SL a Breakeven tras TP1.`;
      const dateDisplay = rawFecha ? (rawHora ? `${rawFecha} (${rawHora})` : rawFecha) : new Date().toISOString().split('T')[0];

      strategies.push({
        noEstrategia: stratId,
        fecha: dateDisplay,
        nombreEstrategia: stratName,
        par,
        temporalidad: '1D / 4H / 1H',
        tipoDeOrden: 'Limit (DCA Escalonado) + Stop-Market + Take-Profit',
        indicadoresClave: `${rawSupRes} | ${rawEval}`.slice(0, 350),
        reglasDeEntrada: reglasEntrada,
        reglasDeSalidaTP: reglasSalida,
        gestionDeRiesgoStopLoss: gestionRiesgo,
        comentariosBacktesting: `${rawConcl} ${rawLink ? `Fuente: ${rawLink}` : ''}`.trim(),
        estado: normalizeStrategyStatus(rawOrdenes || 'Activa'),
        fechaActualizacion: currentTs,
        fuenteActualizacion: defaultSource,
      });
    }
  } else {
    // Traditional format
    const idIdx = findColIndex(['no', 'estrategia', 'id']);
    const fechaIdx = findColIndex(['fecha', 'date']);
    const nombreIdx = findColIndex(['nombre', 'name', 'titulo']);
    const parIdx = findColIndex(['par', 'symbol', 'activo', 'paridad']);
    const tempIdx = findColIndex(['temporalidad', 'timeframe', 'tiempo']);
    const tipoOrdenIdx = findColIndex(['tipo de orden', 'tipo', 'order type']);
    const indIdx = findColIndex(['indicadores', 'indicator']);
    const entradaIdx = findColIndex(['entrada', 'entry', 'compra']);
    const salidaIdx = findColIndex(['salida', 'tp', 'take profit', 'exit']);
    const riesgoIdx = findColIndex(['riesgo', 'stop', 'sl', 'risk']);
    const comIdx = findColIndex(['comentario', 'backtest', 'nota', 'comment']);
    const estadoIdx = findColIndex(['estado', 'status', 'fase', 'lifecycle', 'proceso']);
    const fechaActIdx = findColIndex(['fecha_actualizacion', 'actualizacion', 'updated']);
    const fuenteIdx = findColIndex(['fuente', 'source', 'origen']);

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0 || !row[0]) continue;

      const parsedFechaAct = (fechaActIdx >= 0 && row[fechaActIdx]) ? row[fechaActIdx] : currentTs;
      const parsedFuente = (fuenteIdx >= 0 && row[fuenteIdx])
        ? (row[fuenteIdx] as StrategySourceType)
        : defaultSource;

      strategies.push({
        noEstrategia: (idIdx >= 0 && row[idIdx]) ? row[idIdx] : `STRAT-${i}`,
        fecha: (fechaIdx >= 0 && row[fechaIdx]) ? row[fechaIdx] : new Date().toISOString().split('T')[0],
        nombreEstrategia: (nombreIdx >= 0 && row[nombreIdx]) ? row[nombreIdx] : `Estrategia #${i}`,
        par: ((parIdx >= 0 && row[parIdx]) ? row[parIdx] : 'BTCUSDT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
        temporalidad: (tempIdx >= 0 && row[tempIdx]) ? row[tempIdx] : '1D / 4H',
        tipoDeOrden: (tipoOrdenIdx >= 0 && row[tipoOrdenIdx]) ? row[tipoOrdenIdx] : 'Límite / Stop Market / TP Límite',
        indicadoresClave: (indIdx >= 0 && row[indIdx]) ? row[indIdx] : '',
        reglasDeEntrada: (entradaIdx >= 0 && row[entradaIdx]) ? row[entradaIdx] : '',
        reglasDeSalidaTP: (salidaIdx >= 0 && row[salidaIdx]) ? row[salidaIdx] : '',
        gestionDeRiesgoStopLoss: (riesgoIdx >= 0 && row[riesgoIdx]) ? row[riesgoIdx] : '',
        comentariosBacktesting: (comIdx >= 0 && row[comIdx]) ? row[comIdx] : '',
        estado: normalizeStrategyStatus(estadoIdx >= 0 ? row[estadoIdx] : undefined),
        fechaActualizacion: parsedFechaAct,
        fuenteActualizacion: parsedFuente,
      });
    }
  }

  // Auto-resolve latest strategies per pair (earlier ones for the same pair become Obsoleto)
  const { allResolvedStrategies } = resolveLatestStrategiesPerPair(strategies);
  return allResolvedStrategies;
}

/**
 * Transforms a standard Google Sheets sharing link into a direct CSV export endpoint.
 * Supports optional specific sheet tab name (e.g. 'Ordenes') or specific gid.
 */
export function extractSpreadsheetId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

export function convertToGoogleSheetCsvUrl(
  url: string,
  options?: { sheetTabName?: string; gid?: string }
): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Extract sheet ID from standard Google Sheets URL format
  const sheetId = extractSpreadsheetId(trimmed);
  if (!sheetId) {
    // If it's already a direct published CSV link or other format, return as-is
    return trimmed;
  }

  // If a specific sheet tab name is requested (e.g. 'Ordenes' or 'Estrategias')
  if (options?.sheetTabName && options.sheetTabName.trim().length > 0) {
    const cleanTab = options.sheetTabName.trim();
    // If the tab is given as a numeric gid
    if (/^\d+$/.test(cleanTab)) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${cleanTab}`;
    }
    // Tab name via gviz/tq endpoint
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(cleanTab)}`;
  }

  // If a specific gid is provided
  if (options?.gid && options.gid.trim().length > 0) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${options.gid.trim()}`;
  }

  // Check if original URL contains an explicit gid
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) {
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMatch[1]}`;
  }

  // Default export of the active/primary sheet (WITHOUT hardcoded &gid=0 to avoid 404 when gid 0 was deleted)
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
}

/**
 * Robust fetch helper that fetches a Google Sheet CSV either through local proxy or direct
 */
export async function fetchGoogleSheetCsv(
  url: string,
  options?: { sheetTabName?: string; gid?: string; timeoutMs?: number }
): Promise<string> {
  const directUrl = convertToGoogleSheetCsvUrl(url, options);
  if (!directUrl) return '';

  const cacheBustUrl = `${directUrl}${directUrl.includes('?') ? '&' : '?'}_t=${Date.now()}`;
  const timeoutMs = options?.timeoutMs || 9000;

  // 1. First attempt: via local proxy endpoint to bypass any browser CORS restrictions
  try {
    const proxyUrl = `/api/sheets-proxy?url=${encodeURIComponent(cacheBustUrl)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/csv, text/plain, */*', 'Cache-Control': 'no-cache' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 10 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
        return text;
      }
    }
  } catch (_proxyErr) {
    // Proxy failed or not available in this context, fall through to direct fetch
  }

  // 2. Second attempt: direct fetch
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(directUrl, {
      signal: controller.signal,
      headers: { Accept: 'text/csv, text/plain, */*' },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 10 && !text.includes('<!DOCTYPE html>') && !text.includes('<html')) {
        return text;
      }
    }
  } catch (_directErr) {
    // Network / CORS error
  }

  return '';
}

/**
 * Normalizes headers and maps CSV rows to OpenOrder[]
 */
export function parseCsvToOrders(csvText: string): OpenOrder[] {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map(h =>
    h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  );

  const findCol = (regex: RegExp) => headers.findIndex(h => regex.test(h));

  const idIdx = findCol(/^(id|no\.?\s*orden|orderid|clientorderid|codigo)/i);
  const dateIdx = findCol(/^(fecha|date|timestamp|hora|time)/i);
  const stratIdx = findCol(/^(estrategia|no\.?\s*estrategia|strategy|strategyid)/i);
  const symbolIdx = findCol(/^(par|simbolo|symbol|activo|asset|moneda)/i);
  const typeIdx = findCol(/^(tipo|type|order\s*type|tipo\s*orden)/i);
  const sideIdx = findCol(/^(lado|side|direccion|direction|operacion|compra\/venta)/i);
  const priceIdx = findCol(/^(precio|price|entry|precio\s*limite|limit\s*price)/i);
  const qtyIdx = findCol(/^(cantidad|qty|amount|size|tamano|volumen)/i);
  const levIdx = findCol(/^(apalancamiento|leverage|lev)/i);
  const marginIdx = findCol(/^(margen|margin|tipo\s*margen)/i);
  const slIdx = findCol(/^(stop\s*loss|sl|stop\s*price|precio\s*stop|invalidation)/i);
  const tpIdx = findCol(/^(take\s*profit|tp|tp1|tp\s*price)/i);
  const roleIdx = findCol(/^(rol|role|etiqueta|tag|fase)/i);
  const statusIdx = findCol(/^(estado|status|state)/i);

  const orders: OpenOrder[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || !row.some(c => c.trim().length > 0)) continue;

    // Symbol extraction
    let rawSymbol = symbolIdx >= 0 ? row[symbolIdx]?.trim().toUpperCase() : '';
    rawSymbol = rawSymbol.replace(/[^A-Z0-9]/g, '');
    if (!rawSymbol) rawSymbol = 'ZECUSDT';
    if (!rawSymbol.endsWith('USDT') && !rawSymbol.endsWith('BUSD')) {
      rawSymbol = `${rawSymbol}USDT`;
    }

    // Side extraction
    const rawSide = sideIdx >= 0 ? row[sideIdx]?.trim().toUpperCase() : '';
    const side: 'BUY' | 'SELL' = (rawSide.includes('SELL') || rawSide.includes('VENTA') || rawSide.includes('SHORT'))
      ? 'SELL'
      : 'BUY';

    // Type extraction
    const rawType = typeIdx >= 0 ? row[typeIdx]?.trim().toUpperCase() : '';
    let orderType: OpenOrder['type'] = 'LIMIT';
    if (rawType.includes('STOP_MARKET') || rawType === 'STOP' || rawType.includes('STOP')) {
      orderType = 'STOP_MARKET';
    } else if (rawType.includes('TAKE_PROFIT') || rawType.includes('TP')) {
      orderType = 'TAKE_PROFIT_MARKET';
    } else if (rawType.includes('MARKET') || rawType.includes('MERCADO')) {
      orderType = 'MARKET';
    }

    // Price extraction
    const rawPriceStr = priceIdx >= 0 ? row[priceIdx]?.replace(/[\$,]/g, '').trim() : '';
    let price = parseFloat(rawPriceStr) || 0;

    // Stop price extraction
    const rawSlStr = slIdx >= 0 ? row[slIdx]?.replace(/[\$,]/g, '').trim() : '';
    const stopPrice = parseFloat(rawSlStr) || (orderType === 'STOP_MARKET' && price > 0 ? price : undefined);

    if (orderType === 'STOP_MARKET' && price === 0 && stopPrice && stopPrice > 0) {
      price = stopPrice;
    }

    // Qty extraction
    const rawQtyStr = qtyIdx >= 0 ? row[qtyIdx]?.replace(/[\$,]/g, '').trim() : '';
    const origQty = parseFloat(rawQtyStr) || 0.1;

    // Leverage
    const rawLevStr = levIdx >= 0 ? row[levIdx]?.replace(/[^0-9]/g, '').trim() : '';
    const levVal = parseInt(rawLevStr, 10);
    const leverage = !isNaN(levVal) ? Math.min(5, Math.max(1, levVal)) : 5;

    // Status
    const rawStatus = statusIdx >= 0 ? row[statusIdx]?.trim().toUpperCase() : '';
    let status: OpenOrder['status'] = 'NEW';
    if (rawStatus.includes('FILL') || rawStatus.includes('EJECUT')) {
      status = 'FILLED';
    } else if (rawStatus.includes('CANC') || rawStatus.includes('ANUL')) {
      status = 'CANCELED';
    }

    // Order IDs
    const strategyId = stratIdx >= 0 ? row[stratIdx]?.trim() : undefined;
    const role = roleIdx >= 0 ? row[roleIdx]?.trim() : undefined;
    const rawId = idIdx >= 0 ? row[idIdx]?.trim() : '';
    const orderId = rawId || `GSH-${rawSymbol}-${i}`;
    const clientOrderId = `GSH-${strategyId || rawSymbol}-${role || 'ORD'}-${i}`;

    orders.push({
      orderId,
      clientOrderId,
      symbol: rawSymbol,
      side,
      type: orderType,
      price,
      origQty,
      executedQty: status === 'FILLED' ? origQty : 0,
      status,
      timeInForce: 'GTC',
      leverage,
      marginType: 'ISOLATED',
      stopPrice,
      createdAt: Date.now() - (rawRows.length - i) * 60000,
      strategyId,
      strategyName: strategyId ? `Estrategia ${strategyId}` : undefined,
    });
  }

  return orders;
}

/**
 * Standard CSV Template for Orders sheet tab in Google Sheets
 */
export const DEFAULT_ORDERS_SHEET_CSV_TEMPLATE = `ID,Fecha,Estrategia,Par,Tipo,Lado,Precio,Cantidad,Apalancamiento,Margen,StopLoss,TakeProfit,Rol,Estado
ORD-ZEC-001,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,LIMIT,BUY,820.00,0.50,5x,ISOLATED,778.00,835.00,E1 (50%),NEW
ORD-ZEC-002,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,LIMIT,BUY,812.00,0.30,5x,ISOLATED,778.00,840.00,E2 (30%),NEW
ORD-ZEC-003,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,LIMIT,BUY,795.00,0.20,5x,ISOLATED,778.00,855.00,E3 (20%),NEW
ORD-ZEC-004,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,STOP_MARKET,SELL,778.00,1.00,5x,ISOLATED,778.00,,SL-Global,NEW
ORD-ZEC-005,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,TAKE_PROFIT_MARKET,SELL,835.00,0.50,5x,ISOLATED,,835.00,TP1 (50%),NEW
ORD-ZEC-006,2026-09-03,ZEC-20260903-RANGO-V2,ZECUSDT,TAKE_PROFIT_MARKET,SELL,840.00,0.30,5x,ISOLATED,,840.00,TP2 (30%),NEW`;

/**
 * Serializes OpenOrder[] to CSV format for export or writing back to Google Sheets
 */
export function ordersToCsv(orders: OpenOrder[]): string {
  const headers = ['ID', 'Fecha', 'Estrategia', 'Par', 'Tipo', 'Lado', 'Precio', 'Cantidad', 'Apalancamiento', 'Margen', 'StopLoss', 'TakeProfit', 'Rol', 'Estado'];
  const rows = orders.map(o => {
    const dateStr = o.createdAt ? new Date(o.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const role = o.clientOrderId?.includes('E1') ? 'E1 (50%)'
      : o.clientOrderId?.includes('E2') ? 'E2 (30%)'
      : o.clientOrderId?.includes('E3') ? 'E3 (20%)'
      : o.clientOrderId?.includes('SL') ? 'SL-Global'
      : o.clientOrderId?.includes('TP1') ? 'TP1 (50%)'
      : o.clientOrderId?.includes('TP2') ? 'TP2 (30%)'
      : o.clientOrderId?.includes('TP') ? 'TP Final'
      : 'Orden';

    return [
      `"${o.orderId}"`,
      `"${dateStr}"`,
      `"${o.strategyId || ''}"`,
      `"${o.symbol}"`,
      `"${o.type}"`,
      `"${o.side}"`,
      o.price.toFixed(4),
      o.origQty.toFixed(4),
      `"${o.leverage || 5}x"`,
      `"${o.marginType || 'ISOLATED'}"`,
      o.stopPrice ? o.stopPrice.toFixed(4) : '',
      '',
      `"${role}"`,
      `"${o.status}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parses numeric price targets from strategy text fields or falls back to intelligent defaults
 */
export function parsePricesFromStrategy(strategy: GoogleSheetStrategyRow): ParsedStrategyPrices {
  let entry1Price = 0;
  let entry1Pct = 50;
  let entry2Price = 0;
  let entry2Pct = 30;
  let entry3Price = 0;
  let entry3Pct = 20;
  let avgEntryPrice = 0;
  let slPrice = 0;
  let tp1Price = 0;
  let tp1Pct = 50;
  let tp2Price = 0;
  let tp2Pct = 30;
  let tpFinalPrice = 0;
  let tpFinalPct = 20;
  let leverage = 5; // Default 5x isolated as per risk protocol

  if (!strategy) {
    return {
      entry1Price: 0,
      entry1Pct: 50,
      entry2Price: 0,
      entry2Pct: 30,
      avgEntryPrice: 0,
      slPrice: 0,
      tp1Price: 0,
      tp1Pct: 50,
      tp2Price: 0,
      tp2Pct: 30,
      tpFinalPrice: 0,
      tpFinalPct: 20,
      leverage: 5,
    };
  }

  // Extract leverage from risk rules (e.g. "ROE Máx 5X" or "Apalancamiento: 5x aislado" or "3x aislado")
  const riskRules = strategy.gestionDeRiesgoStopLoss || '';
  const levMatch = riskRules.match(/(\d+)x(?:-(\d+)x)?/i) ||
                   riskRules.match(/ROE\s*M[aá]x\s*(\d+)X/i);
  if (levMatch) {
    const levVal = parseInt(levMatch[1], 10);
    leverage = Math.min(5, Math.max(1, levVal));
  }

  const entryText = strategy.reglasDeEntrada || '';

  // 1. DCA Explicit format: E1 (50%) @ $785.00, E2 (30%) @ $770.00, E3 (20%) @ $760.00
  const dcaE1Match = entryText.match(/E1\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (dcaE1Match) {
    if (dcaE1Match[1]) entry1Pct = parseFloat(dcaE1Match[1]);
    entry1Price = parseSpanishPrice(dcaE1Match[2]);
  }

  const dcaE2Match = entryText.match(/E2\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (dcaE2Match) {
    if (dcaE2Match[1]) entry2Pct = parseFloat(dcaE2Match[1]);
    entry2Price = parseSpanishPrice(dcaE2Match[2], entry1Price);
  }

  const dcaE3Match = entryText.match(/E3\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (dcaE3Match) {
    if (dcaE3Match[1]) entry3Pct = parseFloat(dcaE3Match[1]);
    entry3Price = parseSpanishPrice(dcaE3Match[2], entry1Price || entry2Price);
  }

  // Check explicit Promedio (e.g. "Promedio: $775.50" or "Precio promedio ponderado: $1.3324.")
  const avgMatch = entryText.match(/(?:precio\s+)?promedio(?:\s+ponderado)?\s*:\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (avgMatch) {
    avgEntryPrice = parseSpanishPrice(avgMatch[1], entry1Price);
  }

  // If standard format (e.g. "Entrada 1 a $789-$790")
  if (!entry1Price) {
    const e1Range = entryText.match(/Entrada 1[^\n\r$]*(?:USD\s*)?\$?([\d,.]+)\s*-\s*(?:USD\s*)?\$?([\d,.]+)/i);
    if (e1Range) {
      const p1 = parseSpanishPrice(e1Range[1]);
      const p2 = parseSpanishPrice(e1Range[2]);
      entry1Price = Number(((p1 + p2) / 2).toFixed(4));
    } else {
      const e1Match = entryText.match(/Entrada 1[^\n\r]*?(?:USD\s*)?\$([\d,.]+)/i) || 
                      entryText.match(/Entrada 1\s*(?:a|en|:)?\s*[^$\d]*(?:USD\s*)?\$?([\d,.]+)/i);
      if (e1Match) {
        entry1Price = parseSpanishPrice(e1Match[1]);
      }
    }
  }

  if (!entry2Price) {
    const e2Range = entryText.match(/Entrada 2[^\n\r$]*(?:USD\s*)?\$?([\d,.]+)\s*-\s*(?:USD\s*)?\$?([\d,.]+)/i);
    if (e2Range) {
      const p1 = parseSpanishPrice(e2Range[1], entry1Price);
      const p2 = parseSpanishPrice(e2Range[2], entry1Price);
      entry2Price = Number(((p1 + p2) / 2).toFixed(4));
    } else {
      const e2Match = entryText.match(/Entrada 2[^\n\r]*?(?:USD\s*)?\$([\d,.]+)/i) || 
                      entryText.match(/Entrada 2\s*[^$]*(?:USD\s*)?\$?([\d,.]+)/i);
      if (e2Match) {
        entry2Price = parseSpanishPrice(e2Match[1], entry1Price);
      }
    }
  }

  // 2. Stop Loss (e.g. "SL Global @ $748.00" or "Stop-Loss Global @ $1.2980" or "Stop Loss estricto bajo SMA-15 a $759.00")
  const slText = strategy.gestionDeRiesgoStopLoss || '';
  const slGlobalMatch = slText.match(/(?:SL|Stop[- ]?Loss)\s*(?:Global)?\s*(?:@|en|a|:)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (slGlobalMatch) {
    slPrice = parseSpanishPrice(slGlobalMatch[1], entry1Price || entry2Price);
  } else {
    const specificSlMatch = slText.match(/Stop[- ]?Loss[^\n\r]*(?:en|a|@|:)\s*(?:USD\s*)?\$?([\d,.]+)/i);
    if (specificSlMatch) {
      slPrice = parseSpanishPrice(specificSlMatch[1], entry1Price || entry2Price);
    } else {
      const generalSlMatch = slText.match(/(?:Stop[- ]?Loss|SL)[^\n\r]*?(?:USD\s*)?\$([\d,.]+)/i);
      if (generalSlMatch) {
        slPrice = parseSpanishPrice(generalSlMatch[1], entry1Price || entry2Price);
      }
    }
  }

  // Fallback for SL: Extract any dollar or decimal number if slPrice is still 0
  if (!slPrice && slText) {
    const slPlainMatch = slText.match(/(?:USD\s*)?\$?([\d,.]+)/);
    if (slPlainMatch) {
      slPrice = parseSpanishPrice(slPlainMatch[1], entry1Price || entry2Price);
    }
  }

  // 3. Take Profits (e.g. "TP1 (50%) @ $838.00; TP2 (30%) @ $885.00; TP Final (20%) @ $950.00")
  const tpText = strategy.reglasDeSalidaTP || '';

  const tp1Match = tpText.match(/TP\s*1\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (tp1Match) {
    if (tp1Match[1]) tp1Pct = parseFloat(tp1Match[1]);
    tp1Price = parseSpanishPrice(tp1Match[2], entry1Price);
  }

  const tp2Match = tpText.match(/TP\s*2\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (tp2Match) {
    if (tp2Match[1]) tp2Pct = parseFloat(tp2Match[1]);
    tp2Price = parseSpanishPrice(tp2Match[2], entry1Price || tp1Price);
  }

  const tpFinalMatch = tpText.match(/TP\s*(?:Final|3)\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*(?:USD\s*)?\$?([\d,.]+)/i);
  if (tpFinalMatch) {
    if (tpFinalMatch[1]) tpFinalPct = parseFloat(tpFinalMatch[1]);
    tpFinalPrice = parseSpanishPrice(tpFinalMatch[2], entry1Price || tp2Price);
  }

  // Fallback for TPs: Extract all positive numbers in tpText if tp1Price is still 0
  if (!tp1Price && tpText) {
    const allTpNums = Array.from(tpText.matchAll(/(?:USD\s*)?\$?([\d,.]+)/g))
      .map((m) => parseSpanishPrice(m[1], entry1Price))
      .filter((n) => !isNaN(n) && n > 0);
    if (allTpNums.length > 0) tp1Price = allTpNums[0];
    if (!tp2Price && allTpNums.length > 1) tp2Price = allTpNums[1];
    if (!tpFinalPrice && allTpNums.length > 2) tpFinalPrice = allTpNums[2];
  }

  // Fallback for Entries/DCA: Extract all positive numbers in entryText if entry1Price is still 0
  if (!entry1Price && entryText) {
    const allEntryNums = Array.from(entryText.matchAll(/(?:USD\s*)?\$?([\d,.]+)/g))
      .map((m) => parseSpanishPrice(m[1]))
      .filter((n) => !isNaN(n) && n > 0);
    if (allEntryNums.length > 0) entry1Price = allEntryNums[0];
    if (!entry2Price && allEntryNums.length > 1) entry2Price = allEntryNums[1];
    if (!entry3Price && allEntryNums.length > 2) entry3Price = allEntryNums[2];
  }

  // Fallbacks if not extracted
  if (!entry1Price && entry2Price) entry1Price = entry2Price * 1.03;
  if (!entry2Price && entry1Price) entry2Price = entry1Price * 0.97;
  if (!slPrice && entry2Price) slPrice = entry2Price * 0.98;
  if (!tp1Price && entry1Price) tp1Price = entry1Price * 1.05;
  if (!tp2Price && tp1Price) tp2Price = tp1Price * 1.03;
  if (!tpFinalPrice && tp2Price) tpFinalPrice = tp2Price * 1.03;

  // Calculate weighted average price if not explicitly parsed
  if (!avgEntryPrice) {
    if (entry3Price > 0) {
      const totalWeight = entry1Pct + entry2Pct + entry3Pct || 100;
      avgEntryPrice = (entry1Price * entry1Pct + entry2Price * entry2Pct + entry3Price * entry3Pct) / totalWeight;
    } else {
      const totalWeight = entry1Pct + entry2Pct || 100;
      avgEntryPrice = (entry1Price * entry1Pct + entry2Price * entry2Pct) / totalWeight;
    }
  }

  // Auto-coupling / Scaling for Binance Futures contract multipliers (e.g. PEPE -> 1000PEPEUSDT, PUMP -> 1000PUMPUSDT)
  const normSym = normalizeBinanceSymbol(strategy.par || '');
  const mult = getBinanceSymbolMultiplier(normSym);

  if (mult > 1 && entry1Price > 0) {
    // Check if the parsed prices are raw unscaled spot prices (e.g. PEPE spot $0.0000095 vs 1000PEPE $0.0095)
    const unscaledThreshold = mult === 1000000 ? 0.00001 : 0.001;
    if (entry1Price < unscaledThreshold) {
      entry1Price *= mult;
      entry2Price *= mult;
      if (entry3Price > 0) entry3Price *= mult;
      if (avgEntryPrice > 0) avgEntryPrice *= mult;
      if (slPrice > 0) slPrice *= mult;
      if (tp1Price > 0) tp1Price *= mult;
      if (tp2Price > 0) tp2Price *= mult;
      if (tpFinalPrice > 0) tpFinalPrice *= mult;
    }
  }

  const decs = (mult > 1 || entry1Price < 1) ? 8 : 4;

  return {
    entry1Price: Number(entry1Price.toFixed(decs)),
    entry1Pct,
    entry2Price: Number(entry2Price.toFixed(decs)),
    entry2Pct,
    entry3Price: entry3Price > 0 ? Number(entry3Price.toFixed(decs)) : undefined,
    entry3Pct: entry3Price > 0 ? entry3Pct : undefined,
    avgEntryPrice: Number(avgEntryPrice.toFixed(decs)),
    slPrice: Number(slPrice.toFixed(decs)),
    tp1Price: Number(tp1Price.toFixed(decs)),
    tp1Pct,
    tp2Price: Number(tp2Price.toFixed(decs)),
    tp2Pct,
    tpFinalPrice: Number(tpFinalPrice.toFixed(decs)),
    tpFinalPct,
    leverage,
  };
}

/**
 * Computes Risk/Reward metrics for any strategy row for ranking and catalog display
 */
export function calculateStrategyRewardToRisk(strategy: GoogleSheetStrategyRow): {
  ratio: number;
  maxProfitPct: number;
  maxLossPct: number;
  avgEntry: number;
  riskPerCoin: number;
  rewardPerCoin: number;
} {
  const parsed = parsePricesFromStrategy(strategy);
  const avgEntry = parsed.avgEntryPrice || ((parsed.entry1Price + parsed.entry2Price) / 2);
  
  const riskPerCoin = Math.max(0.000001, avgEntry - parsed.slPrice);
  const maxLossPct = avgEntry > 0 ? (riskPerCoin / avgEntry) * 100 : 0;
  
  // Weighted target: based on parsed TP percentages (e.g. 50% TP1, 30% TP2, 20% TP Final)
  const tp1Weight = (parsed.tp1Pct || 50) / 100;
  const tp2Weight = (parsed.tp2Pct || 30) / 100;
  const tpFinalWeight = (parsed.tpFinalPct || 20) / 100;

  const gain1 = Math.max(0, parsed.tp1Price - avgEntry);
  const gain2 = Math.max(0, parsed.tp2Price - avgEntry);
  const gainFinal = Math.max(0, parsed.tpFinalPrice - avgEntry);
  const rewardPerCoin = gain1 * tp1Weight + gain2 * tp2Weight + gainFinal * tpFinalWeight;
  
  const maxProfitPct = avgEntry > 0 ? (rewardPerCoin / avgEntry) * 100 : 0;
  const ratio = riskPerCoin > 0 ? Number((rewardPerCoin / riskPerCoin).toFixed(2)) : 0;

  return {
    ratio,
    maxProfitPct: Number(maxProfitPct.toFixed(2)),
    maxLossPct: Number(maxLossPct.toFixed(2)),
    avgEntry: Number(avgEntry.toFixed(4)),
    riskPerCoin: Number(riskPerCoin.toFixed(4)),
    rewardPerCoin: Number(rewardPerCoin.toFixed(4)),
  };
}

/**
 * Builds the comprehensive Strategy Execution Plan with DCA Binance orders
 * Only to be created in Binance upon explicit operator authorization!
 */
export function generateExecutionPlan(
  strategy: GoogleSheetStrategyRow,
  usdtAllocation: number = 300,
  selectedLeverage?: number
): StrategyExecutionPlan {
  const parsed = parsePricesFromStrategy(strategy);
  const leverage = selectedLeverage || parsed.leverage || 5;

  const avgEntryPrice = parsed.avgEntryPrice || ((parsed.entry1Price + parsed.entry2Price) / 2) || 1;
  const totalNotional = usdtAllocation * leverage;
  const totalCoinQty = Number((totalNotional / avgEntryPrice).toFixed(3));

  const orders: PlannedStrategyOrder[] = [];

  // Entry 1
  const e1Pct = parsed.entry1Pct || 50;
  const e1Qty = Number((totalCoinQty * (e1Pct / 100)).toFixed(3));
  orders.push({
    id: `${strategy.noEstrategia}-ORD-ENT1`,
    label: `Entrada 1 (${e1Pct}% DCA)`,
    role: 'ENTRY',
    side: 'BUY',
    type: 'LIMIT',
    price: parsed.entry1Price,
    percentage: e1Pct,
    quantity: e1Qty,
    estNotional: Number((e1Qty * parsed.entry1Price).toFixed(2)),
    estMargin: Number(((e1Qty * parsed.entry1Price) / leverage).toFixed(2)),
    description: `Compra Límite DCA en nivel $${parsed.entry1Price.toFixed(2)} (${e1Pct}% capital)`,
  });

  // Entry 2
  const e2Pct = parsed.entry2Pct || 30;
  const e2Qty = Number((totalCoinQty * (e2Pct / 100)).toFixed(3));
  orders.push({
    id: `${strategy.noEstrategia}-ORD-ENT2`,
    label: `Entrada 2 (${e2Pct}% DCA)`,
    role: 'ENTRY',
    side: 'BUY',
    type: 'LIMIT',
    price: parsed.entry2Price,
    percentage: e2Pct,
    quantity: e2Qty,
    estNotional: Number((e2Qty * parsed.entry2Price).toFixed(2)),
    estMargin: Number(((e2Qty * parsed.entry2Price) / leverage).toFixed(2)),
    description: `Compra Límite DCA en soporte $${parsed.entry2Price.toFixed(2)} (${e2Pct}% capital)`,
  });

  // Entry 3 (if present)
  let allocatedQty = e1Qty + e2Qty;
  if (parsed.entry3Price && parsed.entry3Price > 0) {
    const e3Pct = parsed.entry3Pct || 20;
    const e3Qty = Number((totalCoinQty - allocatedQty).toFixed(3));
    orders.push({
      id: `${strategy.noEstrategia}-ORD-ENT3`,
      label: `Entrada 3 (${e3Pct}% DCA)`,
      role: 'ENTRY',
      side: 'BUY',
      type: 'LIMIT',
      price: parsed.entry3Price,
      percentage: e3Pct,
      quantity: e3Qty,
      estNotional: Number((e3Qty * parsed.entry3Price).toFixed(2)),
      estMargin: Number(((e3Qty * parsed.entry3Price) / leverage).toFixed(2)),
      description: `Compra Límite DCA en soporte mayor $${parsed.entry3Price.toFixed(2)} (${e3Pct}% capital)`,
    });
    allocatedQty += e3Qty;
  }

  // Max Loss Calculation: if filled at avg price and hits SL
  const maxLossUsdt = Number(((avgEntryPrice - (parsed.slPrice || 0)) * totalCoinQty).toFixed(2));

  // Stop Loss Global (100% position)
  orders.push({
    id: `${strategy.noEstrategia}-ORD-SL`,
    label: 'Stop Loss Global',
    role: 'STOP_LOSS',
    side: 'SELL',
    type: 'STOP_MARKET',
    price: parsed.slPrice,
    stopPrice: parsed.slPrice,
    percentage: 100,
    quantity: totalCoinQty,
    estNotional: Number((totalCoinQty * (parsed.slPrice || 0)).toFixed(2)),
    estMargin: 0,
    pnlTarget: -maxLossUsdt,
    description: `Stop Loss Global de protección en $${parsed.slPrice.toFixed(2)} (Riesgo máx: -$${maxLossUsdt})`,
  });

  // Take Profit 1
  const tp1Pct = parsed.tp1Pct || 50;
  const tp1Qty = Number((totalCoinQty * (tp1Pct / 100)).toFixed(3));
  const profitTp1 = (parsed.tp1Price - avgEntryPrice) * tp1Qty;
  orders.push({
    id: `${strategy.noEstrategia}-ORD-TP1`,
    label: `Take Profit 1 (${tp1Pct}% Parcial)`,
    role: 'TAKE_PROFIT',
    side: 'SELL',
    type: 'LIMIT',
    price: parsed.tp1Price,
    percentage: tp1Pct,
    quantity: tp1Qty,
    estNotional: Number((tp1Qty * parsed.tp1Price).toFixed(2)),
    estMargin: 0,
    pnlTarget: Number(profitTp1.toFixed(2)),
    description: `Toma de beneficio 1 en $${parsed.tp1Price.toFixed(2)} (+${profitTp1.toFixed(2)} USDT)`,
  });

  // Take Profit 2
  const tp2Pct = parsed.tp2Pct || 30;
  const tp2Qty = Number((totalCoinQty * (tp2Pct / 100)).toFixed(3));
  const profitTp2 = (parsed.tp2Price - avgEntryPrice) * tp2Qty;
  orders.push({
    id: `${strategy.noEstrategia}-ORD-TP2`,
    label: `Take Profit 2 (${tp2Pct}% Parcial)`,
    role: 'TAKE_PROFIT',
    side: 'SELL',
    type: 'LIMIT',
    price: parsed.tp2Price,
    percentage: tp2Pct,
    quantity: tp2Qty,
    estNotional: Number((tp2Qty * parsed.tp2Price).toFixed(2)),
    estMargin: 0,
    pnlTarget: Number(profitTp2.toFixed(2)),
    description: `Toma de beneficio 2 en $${parsed.tp2Price.toFixed(2)} (+${profitTp2.toFixed(2)} USDT)`,
  });

  // Take Profit Final
  const tpFinalPct = parsed.tpFinalPct || 20;
  const tpFinalQty = Number((totalCoinQty - tp1Qty - tp2Qty).toFixed(3));
  const profitTpFinal = (parsed.tpFinalPrice - avgEntryPrice) * tpFinalQty;
  orders.push({
    id: `${strategy.noEstrategia}-ORD-TP3`,
    label: `Take Profit Final (${tpFinalPct}% Swing)`,
    role: 'TAKE_PROFIT',
    side: 'SELL',
    type: 'LIMIT',
    price: parsed.tpFinalPrice,
    percentage: tpFinalPct,
    quantity: tpFinalQty,
    estNotional: Number((tpFinalQty * parsed.tpFinalPrice).toFixed(2)),
    estMargin: 0,
    pnlTarget: Number(profitTpFinal.toFixed(2)),
    description: `Toma de beneficio final en resistencia mayor $${parsed.tpFinalPrice.toFixed(2)} (+${profitTpFinal.toFixed(2)} USDT)`,
  });

  const maxProfitUsdt = Number((profitTp1 + profitTp2 + profitTpFinal).toFixed(2));
  const riskRewardRatio = maxLossUsdt > 0 ? Number((maxProfitUsdt / maxLossUsdt).toFixed(2)) : 0;

  return {
    strategyId: strategy.noEstrategia,
    name: strategy.nombreEstrategia,
    symbol: strategy.par,
    timeframe: strategy.temporalidad,
    leverage,
    marginType: 'ISOLATED',
    totalUsdtAllocation: usdtAllocation,
    totalCoinQty,
    orders,
    status: 'DRAFT_PENDING_AUTH',
    maxLossUsdt,
    maxProfitUsdt,
    riskRewardRatio,
  };
}

/**
 * Serializes strategies back into the canonical CSV format expected by Google Sheets / Google Docs
 */
export function strategiesToCsv(strategies: GoogleSheetStrategyRow[]): string {
  const header = 'No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting,Estado';
  const rows = strategies.map(s => {
    const escape = (val: string = '') => {
      const v = String(val ?? '');
      if (v.includes(',') || v.includes('"') || v.includes('\n') || v.includes('\r')) {
        return `"${v.replace(/"/g, '""')}"`;
      }
      return v;
    };
    return [
      escape(s.noEstrategia),
      escape(s.fecha),
      escape(s.nombreEstrategia),
      escape(s.par),
      escape(s.temporalidad),
      escape(s.tipoDeOrden),
      escape(s.indicadoresClave),
      escape(s.reglasDeEntrada),
      escape(s.reglasDeSalidaTP),
      escape(s.gestionDeRiesgoStopLoss),
      escape(s.comentariosBacktesting),
      escape(s.estado),
    ].join(',');
  });
  return [header, ...rows].join('\n');
}
