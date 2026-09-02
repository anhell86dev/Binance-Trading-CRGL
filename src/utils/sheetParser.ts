import { GoogleSheetStrategyRow, PlannedStrategyOrder, StrategyExecutionPlan } from '../types/strategy';

export const SAMPLE_GOOGLE_SHEET_CSV = `No. Estrategia,Fecha,Nombre de Estrategia,Par,Temporalidad,Tipo de Orden,Indicadores Clave,Reglas de Entrada,Reglas de Salida / TP,Gestión de Riesgo & Stop Loss,Comentarios / Backtesting
STRAT-ZEC-001,2026-09-02,ZEC Rango Táctico y Acumulación en Soporte,ZECUSDT,1D / 4H,Límite / Stop Market / TP Límite,"6 SMAs (SMA-15: $760.45, SMA-30: $629.68), Soporte $789.12, Volumen (-5.54%)",Compra escalonada en soporte: Entrada 1 a $789-$790; Entrada 2 en prueba SMA-15 ($760.45). Opcional: confirmación con cierre 1D > $839.76.,"TP1: $840 (40% parcial); TP2: $865 (40% parcial); TP Final: $883 - $1,000 (20% swing).",Stop Loss estricto bajo SMA-15 a $759.00. Apalancamiento: 2x-3x aislado. Riesgo de cartera: 1-3%.,"Ponderación: Rango/Rebote soporte 50% (más probable), Acumulación SMA-15/30 35%, Corrección profunda 15%. Estructura alcista intacta."
STRAT-BTC-002,2026-09-02,BTC Acumulación y Rebote en Soporte Clave,BTCUSDT,4H / 1H,Límite / Stop Market / TP Límite,"EMA-50: $86200, Soporte Dinámico $87100, RSI en sobreventa 32",Compra escalonada: Entrada 1 a $87200 (50%); Entrada 2 en soporte $86500 (50%).,"TP1: $89200 (50% parcial); TP2: $91500 (50% final).",Stop Loss estricto a $85800. Apalancamiento: 2x-4x aislado.,"Rebote en soporte de tendencia alcista mayor. Confirmación con volumen."`;

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
  // Check for ZEC default if it is STRAT-ZEC-001
  const isZec = strategy.par.includes('ZEC');

  let entry1Price = isZec ? 789.50 : 0;
  let entry2Price = isZec ? 760.45 : 0;
  let slPrice = isZec ? 759.00 : 0;
  let tp1Price = isZec ? 840.00 : 0;
  let tp2Price = isZec ? 865.00 : 0;
  let tpFinalPrice = isZec ? 883.00 : 0;
  let leverage = 2; // Default 2x isolated

  // Extract leverage from risk rules (e.g. "Apalancamiento: 2x-3x aislado")
  const levMatch = strategy.gestionDeRiesgoStopLoss.match(/(\d+)x(?:-(\d+)x)?/i);
  if (levMatch) {
    const levVal = parseInt(levMatch[1], 10);
    leverage = Math.min(5, Math.max(1, levVal));
  }

  // Extract Entry 1 (e.g. "Entrada 1 a $789-$790" -> 789.50)
  const e1Match = strategy.reglasDeEntrada.match(/Entrada 1\s*(?:a|en)?\s*\$?([\d,.]+)(?:-\$?([\d,.]+))?/i);
  if (e1Match) {
    const p1 = parseFloat(e1Match[1].replace(',', ''));
    if (e1Match[2]) {
      const p2 = parseFloat(e1Match[2].replace(',', ''));
      entry1Price = Number(((p1 + p2) / 2).toFixed(2));
    } else {
      entry1Price = p1;
    }
  }

  // Extract Entry 2 (e.g. "Entrada 2 en prueba SMA-15 ($760.45)" -> 760.45)
  const e2Match = strategy.reglasDeEntrada.match(/Entrada 2\s*[^$]*\$?([\d,.]+)/i);
  if (e2Match) {
    entry2Price = parseFloat(e2Match[1].replace(',', ''));
  }

  // Extract Stop Loss (e.g. "Stop Loss estricto bajo SMA-15 a $759.00" -> 759.00)
  const slMatch = strategy.gestionDeRiesgoStopLoss.match(/Stop Loss[^$]*\$?([\d,.]+)/i);
  if (slMatch) {
    slPrice = parseFloat(slMatch[1].replace(',', ''));
  }

  // Extract TP1 (e.g. "TP1: $840" -> 840)
  const tp1Match = strategy.reglasDeSalidaTP.match(/TP1:\s*\$?([\d,.]+)/i);
  if (tp1Match) {
    tp1Price = parseFloat(tp1Match[1].replace(',', ''));
  }

  // Extract TP2 (e.g. "TP2: $865" -> 865)
  const tp2Match = strategy.reglasDeSalidaTP.match(/TP2:\s*\$?([\d,.]+)/i);
  if (tp2Match) {
    tp2Price = parseFloat(tp2Match[1].replace(',', ''));
  }

  // Extract TP Final (e.g. "TP Final: $883 - $1,000" -> 883)
  const tpFinalMatch = strategy.reglasDeSalidaTP.match(/TP Final:\s*\$?([\d,.]+)/i);
  if (tpFinalMatch) {
    tpFinalPrice = parseFloat(tpFinalMatch[1].replace(',', ''));
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
