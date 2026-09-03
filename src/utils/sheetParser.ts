import {
  GoogleSheetStrategyRow,
  PlannedStrategyOrder,
  StrategyExecutionPlan,
  StrategyTradeStatus,
  TradeProcessStageInfo,
  ParsedStrategyPrices,
} from '../types/strategy';

export const SAMPLE_GOOGLE_SHEET_CSV = `No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting,Estado
ZEC-20260902-RETROCESO,2026-09-02,Acumulación en Retroceso y Testeo de SMA-15,ZECUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"SMA-15 ($760.45), Mínimo $789.12, SMA-7 ($813.98), Resistencia $839.76, Máx 8 años $888","DCA: E1 (50%) @ $785.00, E2 (30%) @ $770.00, E3 (20%) @ $760.00 (Promedio: $775.50)",TP1 (50%) @ $838.00; TP2 (30%) @ $885.00; TP Final (20%) @ $950.00,SL Global @ $748.00 (bajo SMA-15 $760.45). ROE Máx 5X: -17.73%. Margen Aislado,Superada por análisis del 03/09.,Obsoleto
TAO-20260902-REBOTE,2026-09-02,Rebote en Soporte Dinámico Confluente (SMA-30 / SMA-90),TAOUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $211.30–$212.87 (SMA-30/SMA-90), SMA-50 ($205.67), Resistencia $227.82, SMA-7 ($232.80), SMA-200 ($235.80)","DCA: E1 (50%) @ $215.50, E2 (30%) @ $213.00, E3 (20%) @ $211.50 (Promedio: $213.95)",TP1 (50%) @ $227.50; TP2 (30%) @ $232.50; TP Final (20%) @ $235.50,SL Global @ $204.50 (bajo SMA-50 $205.67). ROE Máx 5X: -22.08%. Margen Aislado,Rango defensivo. Mover SL a Breakeven tras TP1.,Activa
AAVE-20260902-BREAKOUT-RETEST,2026-09-02,Ruptura y Retesteo en SMA-7 y Apertura Semanal,AAVEUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"SMA-7 ($124.61), Apertura $122.10, SMA-15 ($117.72), Resistencia $131.89, Extensión $140.00","DCA: E1 (50%) @ $124.50, E2 (30%) @ $123.00, E3 (20%) @ $122.10 (Promedio: $123.57)",TP1 (50%) @ $131.50; TP2 (30%) @ $139.50; TP Final (20%) @ $148.00,SL Global @ $116.50 (bajo SMA-15 $117.72). ROE Máx 5X: -28.61%. Margen Aislado,Ruptura alcista. Entrada en retroceso. Mover SL a Breakeven tras TP1.,Activa
SOL-20260902-REBOTE,2026-09-02,Rebote en Soporte y Acumulación Escalonada,SOLUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $97.10–$97.51 (SMA-15), Soporte $98.53, SMA-7 ($103.07), Resistencia $103.62","DCA: E1 (50%) @ $98.50, E2 (30%) @ $97.60, E3 (20%) @ $97.10 (Promedio: $97.95)",TP1 (50%) @ $103.00; TP2 (30%) @ $104.00; TP Final (20%) @ $109.50,SL Global @ $94.80 (bajo $95.00). ROE Máx 5X: -16.08%. Margen Aislado,Superada por análisis del 03/09.,Obsoleto
XRP-20260902-RANGO,2026-09-02,Trading de Rango y Rebote en Soporte Clave (SMA-200),XRPUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte $1.31, SMA-200 ($1.27), SMA-30 ($1.19), Resistencia $1.35, SMA-7 ($1.38), Techo $1.39-$1.40","DCA: E1 (50%) @ $1.3150, E2 (30%) @ $1.2900, E3 (20%) @ $1.2750 (Promedio: $1.3000)",TP1 (50%) @ $1.3500; TP2 (30%) @ $1.3800; TP Final (20%) @ $1.3950,SL Global @ $1.2580 (bajo SMA-200 $1.2700). ROE Máx 5X: -16.15%. Margen Aislado,Rango neutral $1.27-$1.39. Mover SL a Breakeven tras TP1.,Activa
SOL-20260903-RANGO,2026-09-03,Trading de Rango y Defensa en SMA-15 ($97.10–$97.51),SOLUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte intradía $97.51, SMA-15 ($97.10), Resistencia $101.07, SMA-7 ($103.07), Techo $104.29","DCA: E1 (50%) @ $98.20, E2 (30%) @ $97.50, E3 (20%) @ $97.15 (Promedio: $97.78)",TP1 (50%) @ $101.00; TP2 (30%) @ $103.00; TP Final (20%) @ $104.20,SL Global @ $95.80 (bajo $96.00 y SMA-15). ROE Máx 5X: -10.10%. Margen Aislado,Rango de alta probabilidad. Volumen bajo promedio. Mover SL a Breakeven tras TP1.,Activa
ZEC-20260903-RANGO,2026-09-03,Trading de Rango y Rebote en Soporte Intradía (SMA-7 / Mínimo),ZECUSDT,1D / 4H / 1H,Limit (DCA) + SL + TP,"Soporte intradía $789.12, SMA-7 ($813.98), SMA-15 ($760.45), Resistencia 1 $839.76, Resistencia 2 $851.31, Techo $865.79","DCA: E1 (50%) @ $805.00, E2 (30%) @ $792.00, E3 (20%) @ $775.00 (Promedio: $795.10)",TP1 (50%) @ $838.00; TP2 (30%) @ $850.00; TP Final (20%) @ $865.00,SL Global @ $758.00 (bajo SMA-15 $760.45). ROE Máx 5X: -23.33%. Margen Aislado,Rango $760-$865. Retroceso controlado. Mover SL a Breakeven tras TP1.,Activa`;


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
 * Normalizes headers and maps them to GoogleSheetStrategyRow
 */
export function parseCsvToStrategies(csvText: string): GoogleSheetStrategyRow[] {
  const rawRows = parseCsvRows(csvText);
  if (rawRows.length < 2) return [];

  const headers = rawRows[0].map(h => h.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim());

  const findColIndex = (keywords: string[]) => {
    return headers.findIndex(h => keywords.some(k => h.includes(k)));
  };

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

  const strategies: GoogleSheetStrategyRow[] = [];

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    strategies.push({
      noEstrategia: (idIdx >= 0 && row[idIdx]) ? row[idIdx] : `STRAT-${i}`,
      fecha: (fechaIdx >= 0 && row[fechaIdx]) ? row[fechaIdx] : new Date().toISOString().split('T')[0],
      nombreEstrategia: (nombreIdx >= 0 && row[nombreIdx]) ? row[nombreIdx] : `Estrategia #${i}`,
      par: ((parIdx >= 0 && row[parIdx]) ? row[parIdx] : 'ZECUSDT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase(),
      temporalidad: (tempIdx >= 0 && row[tempIdx]) ? row[tempIdx] : '1D / 4H',
      tipoDeOrden: (tipoOrdenIdx >= 0 && row[tipoOrdenIdx]) ? row[tipoOrdenIdx] : 'Límite / Stop Market / TP Límite',
      indicadoresClave: (indIdx >= 0 && row[indIdx]) ? row[indIdx] : '',
      reglasDeEntrada: (entradaIdx >= 0 && row[entradaIdx]) ? row[entradaIdx] : '',
      reglasDeSalidaTP: (salidaIdx >= 0 && row[salidaIdx]) ? row[salidaIdx] : '',
      gestionDeRiesgoStopLoss: (riesgoIdx >= 0 && row[riesgoIdx]) ? row[riesgoIdx] : '',
      comentariosBacktesting: (comIdx >= 0 && row[comIdx]) ? row[comIdx] : '',
      estado: normalizeStrategyStatus(estadoIdx >= 0 ? row[estadoIdx] : undefined),
    });
  }

  // Auto-resolve latest strategies per pair (earlier ones for the same pair become Obsoleto)
  const { allResolvedStrategies } = resolveLatestStrategiesPerPair(strategies);
  return allResolvedStrategies;
}

/**
 * Transforms a standard Google Sheets sharing link into a direct CSV export endpoint
 */
export function convertToGoogleSheetCsvUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Match /spreadsheets/d/([a-zA-Z0-9-_]+)
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) {
    return trimmed; // return as-is if not standard google spreadsheet URL
  }

  const sheetId = match[1];
  let gid = '0';
  const gidMatch = trimmed.match(/[#&?]gid=([0-9]+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  // Google Sheets direct CSV export URL
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
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

  // Extract leverage from risk rules (e.g. "ROE Máx 5X" or "Apalancamiento: 5x aislado" or "3x aislado")
  const levMatch = strategy.gestionDeRiesgoStopLoss.match(/(\d+)x(?:-(\d+)x)?/i) ||
                   strategy.gestionDeRiesgoStopLoss.match(/ROE\s*M[aá]x\s*(\d+)X/i);
  if (levMatch) {
    const levVal = parseInt(levMatch[1], 10);
    leverage = Math.min(5, Math.max(1, levVal));
  }

  const entryText = strategy.reglasDeEntrada || '';

  // 1. DCA Explicit format: E1 (50%) @ $785.00, E2 (30%) @ $770.00, E3 (20%) @ $760.00
  const dcaE1Match = entryText.match(/E1\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*\$?([\d,.]+)/i);
  if (dcaE1Match) {
    if (dcaE1Match[1]) entry1Pct = parseFloat(dcaE1Match[1]);
    entry1Price = parseFloat(dcaE1Match[2].replace(/,/g, ''));
  }

  const dcaE2Match = entryText.match(/E2\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*\$?([\d,.]+)/i);
  if (dcaE2Match) {
    if (dcaE2Match[1]) entry2Pct = parseFloat(dcaE2Match[1]);
    entry2Price = parseFloat(dcaE2Match[2].replace(/,/g, ''));
  }

  const dcaE3Match = entryText.match(/E3\s*(?:\((\d+)%\))?\s*(?:@|a|en|:)?\s*\$?([\d,.]+)/i);
  if (dcaE3Match) {
    if (dcaE3Match[1]) entry3Pct = parseFloat(dcaE3Match[1]);
    entry3Price = parseFloat(dcaE3Match[2].replace(/,/g, ''));
  }

  // Check explicit Promedio
  const avgMatch = entryText.match(/Promedio:\s*\$?([\d,.]+)/i);
  if (avgMatch) {
    avgEntryPrice = parseFloat(avgMatch[1].replace(/,/g, ''));
  }

  // If standard format (e.g. "Entrada 1 a $789-$790")
  if (!entry1Price) {
    const e1Range = entryText.match(/Entrada 1[^\n\r$]*\$?([\d,.]+)\s*-\s*\$?([\d,.]+)/i);
    if (e1Range) {
      const p1 = parseFloat(e1Range[1].replace(/,/g, ''));
      const p2 = parseFloat(e1Range[2].replace(/,/g, ''));
      entry1Price = Number(((p1 + p2) / 2).toFixed(4));
    } else {
      const e1Match = entryText.match(/Entrada 1[^\n\r]*?\$([\d,.]+)/i) || 
                      entryText.match(/Entrada 1\s*(?:a|en|:)?\s*[^$\d]*\$?([\d,.]+)/i);
      if (e1Match) {
        entry1Price = parseFloat(e1Match[1].replace(/,/g, ''));
      }
    }
  }

  if (!entry2Price) {
    const e2Range = entryText.match(/Entrada 2[^\n\r$]*\$?([\d,.]+)\s*-\s*\$?([\d,.]+)/i);
    if (e2Range) {
      const p1 = parseFloat(e2Range[1].replace(/,/g, ''));
      const p2 = parseFloat(e2Range[2].replace(/,/g, ''));
      entry2Price = Number(((p1 + p2) / 2).toFixed(4));
    } else {
      const e2Match = entryText.match(/Entrada 2[^\n\r]*?\$([\d,.]+)/i) || 
                      entryText.match(/Entrada 2\s*[^$]*\$?([\d,.]+)/i);
      if (e2Match) {
        entry2Price = parseFloat(e2Match[1].replace(/,/g, ''));
      }
    }
  }

  // 2. Stop Loss (e.g. "SL Global @ $748.00" or "Stop Loss estricto bajo SMA-15 a $759.00")
  const slText = strategy.gestionDeRiesgoStopLoss || '';
  const slGlobalMatch = slText.match(/SL\s*Global\s*(?:@|en|a)?\s*\$?([\d,.]+)/i);
  if (slGlobalMatch) {
    slPrice = parseFloat(slGlobalMatch[1].replace(/,/g, ''));
  } else {
    const specificSlMatch = slText.match(/Stop Loss[^\n\r]*(?:en|a|@)\s*\$?([\d,.]+)/i);
    if (specificSlMatch) {
      slPrice = parseFloat(specificSlMatch[1].replace(/,/g, ''));
    } else {
      const generalSlMatch = slText.match(/(?:Stop Loss|SL)[^\n\r]*?\$([\d,.]+)/i);
      if (generalSlMatch) {
        slPrice = parseFloat(generalSlMatch[1].replace(/,/g, ''));
      }
    }
  }

  // 3. Take Profits (e.g. "TP1 (50%) @ $838.00; TP2 (30%) @ $885.00; TP Final (20%) @ $950.00")
  const tpText = strategy.reglasDeSalidaTP || '';

  const tp1Match = tpText.match(/TP\s*1\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*\$?([\d,.]+)/i);
  if (tp1Match) {
    if (tp1Match[1]) tp1Pct = parseFloat(tp1Match[1]);
    tp1Price = parseFloat(tp1Match[2].replace(/,/g, ''));
  }

  const tp2Match = tpText.match(/TP\s*2\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*\$?([\d,.]+)/i);
  if (tp2Match) {
    if (tp2Match[1]) tp2Pct = parseFloat(tp2Match[1]);
    tp2Price = parseFloat(tp2Match[2].replace(/,/g, ''));
  }

  const tpFinalMatch = tpText.match(/TP\s*(?:Final|3)\s*(?:\((\d+)%\))?\s*(?:@|:|a|en)?\s*\$?([\d,.]+)/i);
  if (tpFinalMatch) {
    if (tpFinalMatch[1]) tpFinalPct = parseFloat(tpFinalMatch[1]);
    tpFinalPrice = parseFloat(tpFinalMatch[2].replace(/,/g, ''));
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

  return {
    entry1Price: Number(entry1Price.toFixed(4)),
    entry1Pct,
    entry2Price: Number(entry2Price.toFixed(4)),
    entry2Pct,
    entry3Price: entry3Price > 0 ? Number(entry3Price.toFixed(4)) : undefined,
    entry3Pct: entry3Price > 0 ? entry3Pct : undefined,
    avgEntryPrice: Number(avgEntryPrice.toFixed(4)),
    slPrice: Number(slPrice.toFixed(4)),
    tp1Price: Number(tp1Price.toFixed(4)),
    tp1Pct,
    tp2Price: Number(tp2Price.toFixed(4)),
    tp2Pct,
    tpFinalPrice: Number(tpFinalPrice.toFixed(4)),
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
