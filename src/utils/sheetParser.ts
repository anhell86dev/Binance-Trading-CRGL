import { GoogleSheetStrategyRow, PlannedStrategyOrder, StrategyExecutionPlan } from '../types/strategy';

export const SAMPLE_GOOGLE_SHEET_CSV = `No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting
STRAT-ZEC-001,2026-09-02,ZEC Rango Táctico y Acumulación en Soporte,ZECUSDT,1D / 4H,Límite / Stop Market / TP Límite,"6 SMAs (SMA-15: $760.45, SMA-30: $629.68), Soporte $789.12, Volumen (-5.54%)",Compra escalonada en soporte: Entrada 1 a $789-$790; Entrada 2 en prueba SMA-15 ($760.45). Opcional: confirmación con cierre 1D > $839.76.,"TP1: $840 (40% parcial); TP2: $865 (40% parcial); TP Final: $883 - $1,000 (20% swing).",Stop Loss estricto bajo SMA-15 a $759.00. Apalancamiento: 5x aislado. Riesgo de cartera: 1-3%.,"Ponderación: Rango/Rebote soporte 50% (más probable), Acumulación SMA-15/30 35%, Corrección profunda 15%. Estructura alcista intacta."
STRAT-TAO-001,2026-09-02,TAO Soporte SMA-30/90 y Rango Táctico,TAOUSDT,1D / 4H,Límite / Stop Market / TP Límite,"SMA-30 y SMA-90 ($211 - $213), SMA-15, SMA-200 ($235.80), Retorno 30D (+15.03%), Volumen (-6.70%)",Entrada escalonada en soporte: Entrada 1 a $216.00; Entrada 2 en confluencia SMA-30/90 ($211.00 - $213.00). Confirmación opcional: cierre > $227.82.,TP1: $227.00 (40% parcial); TP2: $232.00 (40% parcial); TP Final: $235.80 (20% swing hacia SMA-200).,Stop Loss estricto bajo $205.00 en $204.50. Apalancamiento: 3x aislado. Riesgo de cartera: 1-2%.,Recomendación HOLD (2/5 señales alcistas). Respetar soporte $211-$213 para mantener sesgo. Acumulación DCA largo plazo (-70.93% ATH). Prudencia por desbloqueos.
STRAT-AAVE-001,2026-09-02,AAVE Retroceso Táctico y Acumulación en Soporte,AAVEUSDT,1D / 4H,Límite / Stop Market / TP Límite,"SMAs 7/15/30/50/200, SMA-7: $122.10, SMA-30: $103.58, Soporte $117.72, Volumen (+25.51%)","Compra escalonada en retroceso: Entrada 1 a $124.60 (Apertura semanal, 50%); Entrada 2 a $122.10 (SMA-7 días, 50%). Opcional: confirmación con rebote en soporte.",TP1: $132.00 (40% parcial); TP2: $140.00 (40% parcial); TP Final: $160.00 (20% swing institucional).,Stop Loss estricto bajo $117.72 a $117.00. Apalancamiento: 5x aislado. Riesgo de cartera: 1-2%.,"Recomendación HOLD activa (3/5 señales alcistas). Retroceso táctico y rebote en SMA-7 55% (más probable), Rango actual 30%, Corrección a soporte $117.72 15%. Catalizador V4 institucional."
STRAT-SOL-001,2026-09-02,SOL Rango Táctico y Acumulación en Soporte,SOLUSDT,1D / 4H,Límite / Stop Market / TP Límite,"SMA-200 (+14.3%), SMA-7 ($103.07), SMA-30 ($86.13), Retorno 90D (+47.33%), Soporte $97.10 - $97.51, Volumen contenido (-4.40%)",Compra escalonada en soporte: Entrada 1 a $97.50 (50%); Entrada 2 a $97.10 (50%). Confirmación conservadora: cierre 1D > $103.07 o superar $103.62.,TP1: $103.62 (40% parcial); TP2: $104.29 (40% parcial); TP Final: $110.00 (20% swing mediano plazo).,Stop Loss estricto bajo $96.00 en $95.90. Apalancamiento: 3x aislado. Riesgo de cartera: 1-2%.,"Recomendación HOLD (2/5 señales alcistas). Tendencia de fondo alcista. Rango/Rebote soporte $97.10-$97.51 (más probable), Acumulación $95-$100, SMA-30 ($86.13) en corrección profunda."
STRAT-XRP-001,2026-09-02,XRP Rango Táctico y Acumulación en Soporte SMA-200,XRPUSDT,1D / 4H,Límite / Stop Market / TP Límite,"SMA-200 ($1.27), SMA-90 ($1.13), SMA-50, SMA-15, SMA-7, Soporte $1.31, Volumen decreciente (-3.44%)",Compra escalonada en soporte: Entrada 1 a $1.32 (50%); Entrada 2 en defensa SMA-200 a $1.27 (50%). Confirmación: cierre 1D > $1.38.,TP1: $1.38 (40% parcial); TP2: $1.39 (40% parcial); TP Final: $1.56 (20% swing mediano plazo).,Stop Loss estricto bajo $1.26 en $1.2580. Apalancamiento: 5x aislado. Riesgo de cartera: 1-2%.,Recomendación HOLD (2/5 señales alcistas). Tendencia de fondo alcista sobre SMA-200 ($1.27). Operar rango $1.31-$1.39. Acumulación DCA mediano plazo (-65.27% ATH).`;

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
    });
  }

  return strategies;
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
export function parsePricesFromStrategy(strategy: GoogleSheetStrategyRow) {
  let entry1Price = 0;
  let entry2Price = 0;
  let slPrice = 0;
  let tp1Price = 0;
  let tp2Price = 0;
  let tpFinalPrice = 0;
  let leverage = 3; // Default 3x isolated

  // Extract leverage from risk rules (e.g. "Apalancamiento: 5x aislado" or "3x aislado")
  const levMatch = strategy.gestionDeRiesgoStopLoss.match(/(\d+)x(?:-(\d+)x)?/i);
  if (levMatch) {
    const levVal = parseInt(levMatch[1], 10);
    leverage = Math.min(5, Math.max(1, levVal));
  }

  // Extract Entry 1 (e.g. "Entrada 1 a $789-$790" -> 789.50, or "Entrada 1 a $216.00" -> 216.00)
  const e1Match = strategy.reglasDeEntrada.match(/Entrada 1\s*(?:a|en)?\s*\$?([\d,.]+)(?:-\$?([\d,.]+))?/i);
  if (e1Match) {
    const p1 = parseFloat(e1Match[1].replace(/,/g, ''));
    if (e1Match[2]) {
      const p2 = parseFloat(e1Match[2].replace(/,/g, ''));
      entry1Price = Number(((p1 + p2) / 2).toFixed(4));
    } else {
      entry1Price = p1;
    }
  }

  // Extract Entry 2 (e.g. "Entrada 2 en confluencia SMA-30/90 ($211.00 - $213.00)" -> 212.00, or "Entrada 2 a $122.10" -> 122.10)
  const e2Range = strategy.reglasDeEntrada.match(/Entrada 2[^\n\r$]*\$?([\d,.]+)\s*-\s*\$?([\d,.]+)/i);
  if (e2Range) {
    const p1 = parseFloat(e2Range[1].replace(/,/g, ''));
    const p2 = parseFloat(e2Range[2].replace(/,/g, ''));
    entry2Price = Number(((p1 + p2) / 2).toFixed(4));
  } else {
    const e2Match = strategy.reglasDeEntrada.match(/Entrada 2\s*[^$]*\$?([\d,.]+)/i);
    if (e2Match) {
      entry2Price = parseFloat(e2Match[1].replace(/,/g, ''));
    }
  }

  // Extract Stop Loss (e.g. "Stop Loss estricto bajo $205.00 en $204.50" -> 204.50, "bajo $1.26 en $1.2580" -> 1.2580)
  const specificSlMatch = strategy.gestionDeRiesgoStopLoss.match(/Stop Loss[^\n\r]*(?:en|a)\s*\$?([\d,.]+)/i);
  if (specificSlMatch) {
    slPrice = parseFloat(specificSlMatch[1].replace(/,/g, ''));
  } else {
    const generalSlMatch = strategy.gestionDeRiesgoStopLoss.match(/Stop Loss[^$]*\$?([\d,.]+)/i);
    if (generalSlMatch) {
      slPrice = parseFloat(generalSlMatch[1].replace(/,/g, ''));
    }
  }

  // Extract TP1 (e.g. "TP1: $840" -> 840)
  const tp1Match = strategy.reglasDeSalidaTP.match(/TP1:\s*\$?([\d,.]+)/i);
  if (tp1Match) {
    tp1Price = parseFloat(tp1Match[1].replace(/,/g, ''));
  }

  // Extract TP2 (e.g. "TP2: $865" -> 865)
  const tp2Match = strategy.reglasDeSalidaTP.match(/TP2:\s*\$?([\d,.]+)/i);
  if (tp2Match) {
    tp2Price = parseFloat(tp2Match[1].replace(/,/g, ''));
  }

  // Extract TP Final (e.g. "TP Final: $883 - $1,000" -> 883)
  const tpFinalMatch = strategy.reglasDeSalidaTP.match(/TP Final:\s*\$?([\d,.]+)/i);
  if (tpFinalMatch) {
    tpFinalPrice = parseFloat(tpFinalMatch[1].replace(/,/g, ''));
  }

  // Fallbacks if not extracted
  if (!entry1Price && entry2Price) entry1Price = entry2Price * 1.03;
  if (!entry2Price && entry1Price) entry2Price = entry1Price * 0.97;
  if (!slPrice && entry2Price) slPrice = entry2Price * 0.98;
  if (!tp1Price && entry1Price) tp1Price = entry1Price * 1.05;
  if (!tp2Price && tp1Price) tp2Price = tp1Price * 1.03;
  if (!tpFinalPrice && tp2Price) tpFinalPrice = tp2Price * 1.03;

  return {
    entry1Price,
    entry2Price,
    slPrice,
    tp1Price,
    tp2Price,
    tpFinalPrice,
    leverage,
  };
}

/**
 * Builds the comprehensive Strategy Execution Plan with 6 Binance orders
 * Only to be created in Binance upon explicit operator authorization!
 */
export function generateExecutionPlan(
  strategy: GoogleSheetStrategyRow,
  usdtAllocation: number = 300,
  selectedLeverage?: number
): StrategyExecutionPlan {
  const parsed = parsePricesFromStrategy(strategy);
  const leverage = selectedLeverage || parsed.leverage;

  const avgEntryPrice = (parsed.entry1Price + parsed.entry2Price) / 2;
  const totalNotional = usdtAllocation * leverage;
  const totalCoinQty = Number((totalNotional / avgEntryPrice).toFixed(3));

  // 50% / 50% entry allocation
  const entry1Qty = Number((totalCoinQty * 0.5).toFixed(3));
  const entry2Qty = Number((totalCoinQty - entry1Qty).toFixed(3));

  // TP allocation: 40% TP1, 40% TP2, 20% TP Final
  const tp1Qty = Number((totalCoinQty * 0.4).toFixed(3));
  const tp2Qty = Number((totalCoinQty * 0.4).toFixed(3));
  const tpFinalQty = Number((totalCoinQty - tp1Qty - tp2Qty).toFixed(3));

  // Max Loss Calculation: if filled at avg price and hits SL
  const maxLossUsdt = Number(((avgEntryPrice - parsed.slPrice) * totalCoinQty).toFixed(2));

  // Projected Profit:
  const profitTp1 = (parsed.tp1Price - avgEntryPrice) * tp1Qty;
  const profitTp2 = (parsed.tp2Price - avgEntryPrice) * tp2Qty;
  const profitTpFinal = (parsed.tpFinalPrice - avgEntryPrice) * tpFinalQty;
  const maxProfitUsdt = Number((profitTp1 + profitTp2 + profitTpFinal).toFixed(2));

  const riskRewardRatio = maxLossUsdt > 0 ? Number((maxProfitUsdt / maxLossUsdt).toFixed(2)) : 0;

  const orders: PlannedStrategyOrder[] = [
    {
      id: `${strategy.noEstrategia}-ORD-ENT1`,
      label: 'Entrada 1 (Soporte Táctico)',
      role: 'ENTRY',
      side: 'BUY',
      type: 'LIMIT',
      price: parsed.entry1Price,
      percentage: 50,
      quantity: entry1Qty,
      estNotional: Number((entry1Qty * parsed.entry1Price).toFixed(2)),
      estMargin: Number(((entry1Qty * parsed.entry1Price) / leverage).toFixed(2)),
      description: `Compra Límite escalonada en nivel soporte $${parsed.entry1Price.toFixed(2)}`,
    },
    {
      id: `${strategy.noEstrategia}-ORD-ENT2`,
      label: 'Entrada 2 (Prueba SMA-15)',
      role: 'ENTRY',
      side: 'BUY',
      type: 'LIMIT',
      price: parsed.entry2Price,
      percentage: 50,
      quantity: entry2Qty,
      estNotional: Number((entry2Qty * parsed.entry2Price).toFixed(2)),
      estMargin: Number(((entry2Qty * parsed.entry2Price) / leverage).toFixed(2)),
      description: `Compra Límite de acumulación en soporte SMA-15 a $${parsed.entry2Price.toFixed(2)}`,
    },
    {
      id: `${strategy.noEstrategia}-ORD-SL`,
      label: 'Stop Loss Estricto',
      role: 'STOP_LOSS',
      side: 'SELL',
      type: 'STOP_MARKET',
      price: parsed.slPrice,
      stopPrice: parsed.slPrice,
      percentage: 100,
      quantity: totalCoinQty,
      estNotional: Number((totalCoinQty * parsed.slPrice).toFixed(2)),
      estMargin: 0,
      pnlTarget: -maxLossUsdt,
      description: `Stop Loss de protección bajo SMA-15 a $${parsed.slPrice.toFixed(2)} (Riesgo máx: -$${maxLossUsdt})`,
    },
    {
      id: `${strategy.noEstrategia}-ORD-TP1`,
      label: 'Take Profit 1 (40% Parcial)',
      role: 'TAKE_PROFIT',
      side: 'SELL',
      type: 'LIMIT',
      price: parsed.tp1Price,
      percentage: 40,
      quantity: tp1Qty,
      estNotional: Number((tp1Qty * parsed.tp1Price).toFixed(2)),
      estMargin: 0,
      pnlTarget: Number(profitTp1.toFixed(2)),
      description: `Toma de beneficio 1 en resistencia local $${parsed.tp1Price.toFixed(2)} (+${profitTp1.toFixed(2)} USDT)`,
    },
    {
      id: `${strategy.noEstrategia}-ORD-TP2`,
      label: 'Take Profit 2 (40% Parcial)',
      role: 'TAKE_PROFIT',
      side: 'SELL',
      type: 'LIMIT',
      price: parsed.tp2Price,
      percentage: 40,
      quantity: tp2Qty,
      estNotional: Number((tp2Qty * parsed.tp2Price).toFixed(2)),
      estMargin: 0,
      pnlTarget: Number(profitTp2.toFixed(2)),
      description: `Toma de beneficio 2 en zona de rango superior $${parsed.tp2Price.toFixed(2)} (+${profitTp2.toFixed(2)} USDT)`,
    },
    {
      id: `${strategy.noEstrategia}-ORD-TP3`,
      label: 'Take Profit Final / Swing (20%)',
      role: 'TAKE_PROFIT',
      side: 'SELL',
      type: 'LIMIT',
      price: parsed.tpFinalPrice,
      percentage: 20,
      quantity: tpFinalQty,
      estNotional: Number((tpFinalQty * parsed.tpFinalPrice).toFixed(2)),
      estMargin: 0,
      pnlTarget: Number(profitTpFinal.toFixed(2)),
      description: `Toma de beneficio 3 swing objetivo expansión $${parsed.tpFinalPrice.toFixed(2)} (+${profitTpFinal.toFixed(2)} USDT)`,
    },
  ];

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
