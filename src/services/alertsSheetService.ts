import { SheetAlertRow, GoogleSheetStrategyRow } from '../types/strategy';
import { parsePricesFromStrategy, parseCsvToStrategies, SAMPLE_GOOGLE_SHEET_CSV } from '../utils/sheetParser';
import { notificationService } from './notifications';
import { strategyService } from './strategyService';

const ALERTS_SHEET_STORAGE_KEY = 'binance_sheet_alertas_v2';
const ALERTS_SHEET_STRUCTURE_VER_KEY = 'binance_sheet_alertas_structure_created';

export const OFFICIAL_ALERTS_SHEET_NAME = 'alertas';
export const OFFICIAL_WORKBOOK_NAME = 'Diario de Estrategias Cripto - Táctico Oficial (Google Sheets)';

function getStoredStrategies(): GoogleSheetStrategyRow[] {
  const current = strategyService.getStrategies();
  if (current && current.length > 0) return current;
  return parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
}

class AlertsSheetService {

  private alerts: SheetAlertRow[] = [];
  private listeners: Set<() => void> = new Set();
  private isStructureCreated: boolean = false;
  private knownPrices: Record<string, number> = {
    ZECUSDT: 789.5,
    TAOUSDT: 215.8,
    AAVEUSDT: 124.5,
    SOLUSDT: 97.45,
    XRPUSDT: 1.318,
  };

  constructor() {
    this.initAlertsSheet();
  }

  /**
   * Initializes the 'alertas' sheet in the workbook.
   * If not created yet, builds the official structure with alerts for the 5 tactical strategies.
   */
  public initAlertsSheet() {
    try {
      const isCreated = localStorage.getItem(ALERTS_SHEET_STRUCTURE_VER_KEY);
      const stored = localStorage.getItem(ALERTS_SHEET_STORAGE_KEY);

      if (isCreated && stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.alerts = parsed;
          this.isStructureCreated = true;
          this.recalculateAllDistances();
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading stored alerts sheet:', e);
    }

    // Structure is not created yet or empty -> create the official structure in the workbook
    this.buildDefaultStructure();
  }

  /**
   * Creates the structure in the workbook with initial tactical alerts
   */
  public buildDefaultStructure() {
    const strategies = getStoredStrategies();
    const initialAlerts: SheetAlertRow[] = [];

    const defaultConfigs: Record<
      string,
      { swing: number; condition: 'SWING' | 'ABOVE' | 'BELOW'; targetPrice?: number; label: string }
    > = {
      ZECUSDT: { swing: 1.0, condition: 'SWING', label: 'Oscilación > 1.0% (Defensa Soporte $789)' },
      TAOUSDT: { swing: 1.5, condition: 'SWING', label: 'Oscilación > 1.5% (Confluencia $211-$213)' },
      AAVEUSDT: { swing: 1.2, condition: 'SWING', label: 'Oscilación > 1.2% (Retroceso SMA-7 $122.10)' },
      SOLUSDT: { swing: 1.0, condition: 'SWING', label: 'Oscilación > 1.0% (Soporte $97.10-$97.50)' },
      XRPUSDT: { swing: 1.5, condition: 'SWING', label: 'Oscilación > 1.5% (Defensa SMA-200 $1.27)' },
    };

    strategies.forEach((strat, idx) => {
      const sym = strat.par.trim().toUpperCase();
      const prices = parsePricesFromStrategy(strat);
      const cfg = defaultConfigs[sym] || { swing: 1.0, condition: 'SWING', label: 'Oscilación > 1.0%' };
      const basePrice = this.knownPrices[sym] || (prices.entry1Price > 0 ? prices.entry1Price : 100);
      const livePrice = this.knownPrices[sym] || basePrice;

      const dist1 = prices.entry1Price > 0 ? ((livePrice - prices.entry1Price) / prices.entry1Price) * 100 : 0;
      const dist2 = prices.entry2Price > 0 ? ((livePrice - prices.entry2Price) / prices.entry2Price) * 100 : 0;

      const alertRow: SheetAlertRow = {
        id: `ALT-${sym.replace('USDT', '')}-00${idx + 1}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        symbol: sym,
        noEstrategia: strat.noEstrategia,
        nombreEstrategia: strat.nombreEstrategia,
        livePrice: livePrice,
        entry1Price: prices.entry1Price,
        entry2Price: prices.entry2Price,
        distPctEntry1: Number(dist1.toFixed(2)),
        distPctEntry2: Number(dist2.toFixed(2)),
        condition: cfg.condition,
        thresholdOrTarget: cfg.label,
        thresholdVal: cfg.swing,
        createdPrice: basePrice,
        status: 'MONITOREANDO',
        message: `Monitoreando proximidad a Entrada 1 ($${prices.entry1Price}) y Entrada 2 ($${prices.entry2Price})`,
      };

      initialAlerts.push(alertRow);
    });

    this.alerts = initialAlerts;
    this.isStructureCreated = true;
    this.saveToStorage();
    this.notify();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(ALERTS_SHEET_STORAGE_KEY, JSON.stringify(this.alerts));
      localStorage.setItem(ALERTS_SHEET_STRUCTURE_VER_KEY, 'true');
    } catch (e) {
      console.warn('Error saving alerts sheet to storage:', e);
    }
  }

  public getAlerts(): SheetAlertRow[] {
    return this.alerts;
  }

  public getIsStructureCreated(): boolean {
    return this.isStructureCreated;
  }

  public getLivePrice(symbol: string): number {
    const clean = symbol.trim().toUpperCase();
    if (this.knownPrices[clean]) return this.knownPrices[clean];
    const strategies = getStoredStrategies();
    const strat = strategies.find(s => s.par.trim().toUpperCase() === clean);
    if (strat) {
      const parsed = parsePricesFromStrategy(strat);
      return parsed.entry1Price;
    }
    return 0;
  }

  /**
   * Updates live price for a symbol and automatically recalculates:
   * % de distancia entre el precio en vivo vs las entradas (Entrada 1 y Entrada 2)
   */
  public updateLivePrice(symbol: string, livePrice: number) {
    if (!symbol || livePrice <= 0) return;
    const cleanSym = symbol.trim().toUpperCase();
    this.knownPrices[cleanSym] = livePrice;

    let changed = false;

    this.alerts.forEach(alert => {
      if (alert.symbol.toUpperCase() === cleanSym) {
        alert.livePrice = livePrice;
        if (alert.entry1Price > 0) {
          alert.distPctEntry1 = Number((((livePrice - alert.entry1Price) / alert.entry1Price) * 100).toFixed(2));
        }
        if (alert.entry2Price > 0) {
          alert.distPctEntry2 = Number((((livePrice - alert.entry2Price) / alert.entry2Price) * 100).toFixed(2));
        }

        // Check trigger condition if still monitoring
        if (alert.status === 'MONITOREANDO') {
          let shouldTrigger = false;
          let triggerMsg = '';

          if (alert.condition === 'SWING') {
            const swingPct = Math.abs(((livePrice - alert.createdPrice) / alert.createdPrice) * 100);
            if (swingPct >= alert.thresholdVal) {
              shouldTrigger = true;
              triggerMsg = `⚡ Movimiento rápido de ${swingPct.toFixed(2)}% en ${alert.symbol} (Base: $${alert.createdPrice.toFixed(2)} ➔ Vivo: $${livePrice.toFixed(2)}). Distancia Entrada 1: ${alert.distPctEntry1 > 0 ? '+' : ''}${alert.distPctEntry1}%`;
            }
          } else if (alert.condition === 'ABOVE' && alert.thresholdVal > 0) {
            if (livePrice >= alert.thresholdVal) {
              shouldTrigger = true;
              triggerMsg = `🚀 ${alert.symbol} superó objetivo de $${alert.thresholdVal.toFixed(2)} (Precio vivo: $${livePrice.toFixed(2)}). Distancia Entrada 1: ${alert.distPctEntry1 > 0 ? '+' : ''}${alert.distPctEntry1}%`;
            }
          } else if (alert.condition === 'BELOW' && alert.thresholdVal > 0) {
            if (livePrice <= alert.thresholdVal) {
              shouldTrigger = true;
              triggerMsg = `🔻 ${alert.symbol} cayó bajo $${alert.thresholdVal.toFixed(2)} (Precio vivo: $${livePrice.toFixed(2)}). Distancia Entrada 1: ${alert.distPctEntry1 > 0 ? '+' : ''}${alert.distPctEntry1}%`;
            }
          }

          if (shouldTrigger) {
            alert.status = 'DISPARADA';
            alert.triggerPrice = livePrice;
            alert.triggeredAt = new Date().toISOString().replace('T', ' ').substring(0, 19);
            alert.message = triggerMsg;
            notificationService.notify('VOLATILITY', '⚡ Alerta Volatilidad Guardada en Hoja', triggerMsg, 'high');
          }
        }

        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Recalculates distances for all alerts based on known prices
   */
  public recalculateAllDistances() {
    const strategies = getStoredStrategies();
    const stratMap = new Map<string, GoogleSheetStrategyRow>();
    strategies.forEach(s => {
      stratMap.set(s.par.trim().toUpperCase(), s);
    });

    this.alerts.forEach(alert => {
      const sym = alert.symbol.trim().toUpperCase();
      const live = this.knownPrices[sym] || alert.livePrice;
      alert.livePrice = live;

      const strat = stratMap.get(sym);
      if (strat) {
        const prices = parsePricesFromStrategy(strat);
        if (prices.entry1Price > 0) alert.entry1Price = prices.entry1Price;
        if (prices.entry2Price > 0) alert.entry2Price = prices.entry2Price;
        alert.noEstrategia = strat.noEstrategia;
        alert.nombreEstrategia = strat.nombreEstrategia;
      }

      if (alert.entry1Price > 0) {
        alert.distPctEntry1 = Number((((live - alert.entry1Price) / alert.entry1Price) * 100).toFixed(2));
      }
      if (alert.entry2Price > 0) {
        alert.distPctEntry2 = Number((((live - alert.entry2Price) / alert.entry2Price) * 100).toFixed(2));
      }
    });

    this.saveToStorage();
    this.notify();
  }

  /**
   * Saves a new volatility alert to the 'alertas' sheet in the workbook
   */
  public addAlert(params: {
    symbol: string;
    condition: 'SWING' | 'ABOVE' | 'BELOW';
    thresholdVal: number;
    targetPrice?: number;
    customMessage?: string;
  }): SheetAlertRow {
    const cleanSym = params.symbol.trim().toUpperCase();
    const strategies = getStoredStrategies();
    const matchedStrat = strategies.find(
      s => s.par.trim().toUpperCase() === cleanSym || cleanSym.startsWith(s.par.trim().toUpperCase().replace('USDT', ''))
    );

    const prices = matchedStrat ? parsePricesFromStrategy(matchedStrat) : { entry1Price: 0, entry2Price: 0 };
    const livePrice = this.knownPrices[cleanSym] || (params.targetPrice ? params.targetPrice : prices.entry1Price || 100);

    const dist1 = prices.entry1Price > 0 ? ((livePrice - prices.entry1Price) / prices.entry1Price) * 100 : 0;
    const dist2 = prices.entry2Price > 0 ? ((livePrice - prices.entry2Price) / prices.entry2Price) * 100 : 0;

    let thresholdLabel = '';
    if (params.condition === 'SWING') {
      thresholdLabel = `Oscilación rápida > ${params.thresholdVal}%`;
    } else if (params.condition === 'ABOVE') {
      thresholdLabel = `Precio supera $${params.thresholdVal.toFixed(2)}`;
    } else {
      thresholdLabel = `Precio cae bajo $${params.thresholdVal.toFixed(2)}`;
    }

    const newId = `ALT-${cleanSym.replace('USDT', '')}-${Date.now().toString().slice(-4)}`;

    const newRow: SheetAlertRow = {
      id: newId,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      symbol: cleanSym,
      noEstrategia: matchedStrat?.noEstrategia || 'STRAT-CUSTOM',
      nombreEstrategia: matchedStrat?.nombreEstrategia || 'Estrategia Táctica Personalizada',
      livePrice: livePrice,
      entry1Price: prices.entry1Price,
      entry2Price: prices.entry2Price,
      distPctEntry1: Number(dist1.toFixed(2)),
      distPctEntry2: Number(dist2.toFixed(2)),
      condition: params.condition,
      thresholdOrTarget: thresholdLabel,
      thresholdVal: params.thresholdVal,
      createdPrice: livePrice,
      status: 'MONITOREANDO',
      message:
        params.customMessage ||
        `Guardada en hoja alertas del libro. Monitoreando distancia a Entrada 1 ($${prices.entry1Price})`,
    };

    this.alerts = [newRow, ...this.alerts];
    this.saveToStorage();

    notificationService.notify(
      'VOLATILITY',
      'Alerta Guardada en Libro',
      `Registrada en hoja "${OFFICIAL_ALERTS_SHEET_NAME}": ${cleanSym} (${thresholdLabel}). Dist. E1: ${dist1 > 0 ? '+' : ''}${dist1.toFixed(2)}%`,
      'normal'
    );

    this.notify();
    return newRow;
  }

  /**
   * Removes an alert from the 'alertas' sheet
   */
  public removeAlert(id: string) {
    this.alerts = this.alerts.filter(a => a.id !== id);
    this.saveToStorage();
    this.notify();
  }

  /**
   * Resets the 'alertas' sheet to its initial official structure
   */
  public resetToDefaultStructure() {
    this.buildDefaultStructure();
  }

  /**
   * Returns distance metrics for a given symbol and price
   */
  public getDistancesForPrice(symbol: string, currentPrice: number) {
    const cleanSym = symbol.trim().toUpperCase();
    const strategies = getStoredStrategies();
    const matched = strategies.find(s => s.par.trim().toUpperCase() === cleanSym);
    if (!matched) return null;

    const prices = parsePricesFromStrategy(matched);
    const distE1 = prices.entry1Price > 0 ? ((currentPrice - prices.entry1Price) / prices.entry1Price) * 100 : 0;
    const distE2 = prices.entry2Price > 0 ? ((currentPrice - prices.entry2Price) / prices.entry2Price) * 100 : 0;

    return {
      strategyId: matched.noEstrategia,
      strategyName: matched.nombreEstrategia,
      entry1: prices.entry1Price,
      entry2: prices.entry2Price,
      distPctE1: Number(distE1.toFixed(2)),
      distPctE2: Number(distE2.toFixed(2)),
    };
  }

  /**
   * Exports the 'alertas' sheet as standard CSV
   */
  public exportAlertsCsv(): string {
    const headers = [
      'No. Alerta',
      'Fecha / Hora',
      'Par',
      'No. Estrategia',
      'Nombre de Estrategia',
      'Precio en Vivo (USDT)',
      'Entrada 1 (USDT)',
      'Entrada 2 (USDT)',
      '% Distancia vs Entrada 1',
      '% Distancia vs Entrada 2',
      'Condición',
      'Umbral / Objetivo',
      'Precio Creación',
      'Estado',
      'Fecha Disparo',
      'Precio Disparo',
      'Detalle / Mensaje',
    ];

    const rows = this.alerts.map(a => [
      `"${a.id}"`,
      `"${a.timestamp}"`,
      `"${a.symbol}"`,
      `"${a.noEstrategia}"`,
      `"${(a.nombreEstrategia || '').replace(/"/g, '""')}"`,
      a.livePrice.toFixed(4),
      a.entry1Price.toFixed(4),
      a.entry2Price.toFixed(4),
      `"${a.distPctEntry1 > 0 ? '+' : ''}${a.distPctEntry1.toFixed(2)}%"`,
      `"${a.distPctEntry2 > 0 ? '+' : ''}${a.distPctEntry2.toFixed(2)}%"`,
      `"${a.condition}"`,
      `"${(a.thresholdOrTarget || '').replace(/"/g, '""')}"`,
      a.createdPrice.toFixed(4),
      `"${a.status}"`,
      `"${a.triggeredAt || '-'}"`,
      a.triggerPrice ? a.triggerPrice.toFixed(4) : '-',
      `"${(a.message || '').replace(/"/g, '""')}"`,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Error in alertsSheetService listener:', err);
      }
    });
  }
}

export const alertsSheetService = new AlertsSheetService();
