import { GoogleSheetStrategyRow, StrategyTradeStatus } from '../types/strategy';
import {
  SAMPLE_GOOGLE_SHEET_CSV,
  parseCsvToStrategies,
  resolveLatestStrategiesPerPair,
  convertToGoogleSheetCsvUrl,
  fetchGoogleSheetCsv,
  strategiesToCsv,
} from '../utils/sheetParser';
import { binanceWs } from './binanceWs';
import { googleSheetsApiService } from './googleSheetsApiService';

const STORAGE_KEY = 'binance_futures_strategies_v6';
const LAST_SYNC_KEY = 'binance_strategies_last_sync_v6';
const SHEET_URL_KEY = 'binance_strategies_custom_sheet_url_v6';
const WEBHOOK_URL_KEY = 'binance_strategies_webhook_url_v6';

export const OFFICIAL_GOOGLE_SHEET_NAME = 'Estrategias Automatizadas Binance';
export const OFFICIAL_GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1xu-DaHU8kH0SiEEIG3mW2MHDfk7HXc43S6CttIzmi6s/edit?usp=sharing';

class StrategyService {
  private strategies: GoogleSheetStrategyRow[] = [];
  private activeStrategyIndex: number = 0;
  private lastSyncTime: string = new Date().toLocaleTimeString();
  private customSheetUrl: string = '';
  private webhookUrl: string = '';
  private isSyncing: boolean = false;
  private syncError: string | null = null;
  private autoSyncInterval: any = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadStrategies();
    this.initAutoSync();

    // Subscribe to Binance WebSocket updates to automatically cross-reference
    // active trade symbols with the 'Estrategias' catalog in real-time
    binanceWs.subscribe(() => {
      this.notify();
    });

    setTimeout(() => {
      this.syncFromGoogleSheets(undefined, true);
    }, 300);
  }

  private loadStrategies() {
    try {
      this.customSheetUrl = localStorage.getItem(SHEET_URL_KEY) || '';
      this.webhookUrl = localStorage.getItem(WEBHOOK_URL_KEY) || '';
      const storedSync = localStorage.getItem(LAST_SYNC_KEY);
      if (storedSync) {
        this.lastSyncTime = storedSync;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const { allResolvedStrategies } = resolveLatestStrategiesPerPair(parsed);
          this.strategies = allResolvedStrategies;
          return;
        }
      }
    } catch (e) {
      console.warn('Error reading stored strategies:', e);
    }

    // Default to official tactical strategies (10 strategies updated from Google Docs)
    const initial = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    this.strategies = initial;
    this.saveToStorage();
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.strategies));
      localStorage.setItem(LAST_SYNC_KEY, this.lastSyncTime);
      if (this.customSheetUrl) {
        localStorage.setItem(SHEET_URL_KEY, this.customSheetUrl);
      }
      if (this.webhookUrl) {
        localStorage.setItem(WEBHOOK_URL_KEY, this.webhookUrl);
      }
    } catch (e) {
      console.warn('Error saving strategies to storage:', e);
    }
  }

  /**
   * Initializes periodic polling every 20 seconds to auto-update from Google Sheets
   */
  private initAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
    this.autoSyncInterval = setInterval(() => {
      this.syncFromGoogleSheets(this.customSheetUrl || OFFICIAL_GOOGLE_SHEET_URL, true);
    }, 20000);
  }

  /**
   * Extracts and syncs strategies strictly from the configured Google Sheets file (Google Sheets API v4 + fallback)
   */
  public async syncFromGoogleSheets(urlToFetch?: string, silent: boolean = false): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.syncError = null;
    if (!silent) this.notify();

    const targetUrl = urlToFetch || this.customSheetUrl || OFFICIAL_GOOGLE_SHEET_URL;

    try {
      // 0. Primary Path: Direct Google Sheets API v4 if authenticated
      if (googleSheetsApiService.isAuthenticated()) {
        try {
          const apiParsed = await googleSheetsApiService.syncStrategiesViaApi(targetUrl);
          if (apiParsed.length > 0) {
            this.strategies = apiParsed;
            this.lastSyncTime = `${new Date().toLocaleTimeString()} (API Google Directa)`;
            this.syncError = null;
            this.saveToStorage();
            this.isSyncing = false;
            this.notify();
            return true;
          }
        } catch (apiErr: any) {
          console.warn('Google Sheets API direct sync failed, falling back to Web CSV:', apiErr);
        }
      }

      // 1. Fallback Path: Try fetching tab 'Estrategias' specifically via CSV
      let csvContent = await fetchGoogleSheetCsv(targetUrl, { sheetTabName: 'Estrategias' });

      // 2. Fallback to primary sheet export if tab 'Estrategias' returned empty
      if (!csvContent || !csvContent.includes('Estrategia') || csvContent.length < 50) {
        csvContent = await fetchGoogleSheetCsv(targetUrl);
      }

      if (csvContent && csvContent.length > 50 && (csvContent.includes('Estrategia') || csvContent.includes('Par'))) {
        const parsed = parseCsvToStrategies(csvContent);
        if (parsed.length > 0) {
          this.strategies = parsed;
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.syncError = null;
          this.saveToStorage();
          this.isSyncing = false;
          this.notify();
          return true;
        }
      }

      // If remote returned nothing or invalid structure, preserve existing strategies and record warning
      this.syncError = 'No se encontraron filas válidas en la hoja de Google Sheets. Se mantienen los datos sincronizados previos.';
      this.isSyncing = false;
      this.notify();
      return false;
    } catch (err: any) {
      console.error('Error syncing Google Sheets:', err);
      this.syncError = err.message || 'Error al conectar con Google Sheets';
      this.isSyncing = false;
      this.notify();
      return false;
    }
  }

  public getEffectiveSheetUrl(): string {
    return this.customSheetUrl || OFFICIAL_GOOGLE_SHEET_URL;
  }

  public setCustomSheetUrl(url: string) {
    this.customSheetUrl = url.trim();
    if (this.customSheetUrl) {
      localStorage.setItem(SHEET_URL_KEY, this.customSheetUrl);
    } else {
      localStorage.removeItem(SHEET_URL_KEY);
    }
    this.syncFromGoogleSheets(this.customSheetUrl);
  }

  public getCustomSheetUrl(): string {
    return this.customSheetUrl;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getSyncError(): string | null {
    return this.syncError;
  }

  /**
   * Returns all strategies or filtered strictly to the latest strategy of each pair
   */
  public getStrategies(onlyLatestPerPair: boolean = false): GoogleSheetStrategyRow[] {
    if (onlyLatestPerPair) {
      return this.getLatestStrategiesPerPair();
    }
    return this.strategies;
  }

  /**
   * Returns strictly ACTIVE strategies (excluding Obsoleto)
   */
  public getActiveStrategies(): GoogleSheetStrategyRow[] {
    const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return allResolvedStrategies.filter((s) => (s.estado || 'Activa') !== 'Obsoleto');
  }

  /**
   * Returns strictly OBSOLETE strategies as historical records
   */
  public getObsoleteHistoricalStrategies(): GoogleSheetStrategyRow[] {
    const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return allResolvedStrategies.filter((s) => (s.estado || '').toLowerCase() === 'obsoleto');
  }

  /**
   * Strictly takes ONLY the latest strategy of each pair
   */
  public getLatestStrategiesPerPair(): GoogleSheetStrategyRow[] {
    const { latestStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return latestStrategies;
  }

  /**
   * Returns only the latest strategies that have status 'Activa' (Estrategia para tomar)
   */
  public getActiveStrategiesToTake(): GoogleSheetStrategyRow[] {
    const { activeToTakeStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return activeToTakeStrategies;
  }

  /**
   * Returns all strategies with obsolete states correctly resolved
   */
  public getAllResolvedStrategies(): GoogleSheetStrategyRow[] {
    const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    return allResolvedStrategies;
  }

  /**
   * Updates the lifecycle status of a specific strategy
   */
  public updateStrategyStatus(strategyId: string, newStatus: StrategyTradeStatus) {
    let changed = false;
    this.strategies = this.strategies.map((s) => {
      if (s.noEstrategia.toLowerCase() === strategyId.toLowerCase()) {
        changed = true;
        return {
          ...s,
          estado: newStatus,
        };
      }
      return s;
    });

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  /**
   * Updates the status of the latest strategy matching a trading pair (symbol)
   */
  public updatePairLatestStatus(symbol: string, newStatus: StrategyTradeStatus) {
    const cleanSym = symbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const latest = this.getLatestStrategiesPerPair().find(
      (s) => (s.par || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanSym
    );

    if (latest) {
      this.updateStrategyStatus(latest.noEstrategia, newStatus);
    }
  }

  public getActiveStrategy(): GoogleSheetStrategyRow | undefined {
    // Prefer the active strategy if valid and not obsolete, otherwise first active strategy
    const active = this.strategies[this.activeStrategyIndex];
    if (active && active.estado !== 'Obsoleto') {
      return active;
    }
    const firstActive = this.getActiveStrategies()[0];
    return firstActive || this.strategies[0];
  }

  public getActiveIndex(): number {
    return this.activeStrategyIndex;
  }

  public setActiveStrategyIndex(index: number) {
    if (index >= 0 && index < this.strategies.length) {
      this.activeStrategyIndex = index;
      const strat = this.strategies[index];
      if (strat && strat.par) {
        binanceWs.setSymbol(strat.par);
      }
      this.notify();
    }
  }

  public setActiveStrategyById(strategyId: string) {
    const idx = this.strategies.findIndex(
      (s) => s.noEstrategia.toLowerCase() === strategyId.toLowerCase()
    );
    if (idx !== -1) {
      this.setActiveStrategyIndex(idx);
    }
  }

  public setActiveStrategy(strat: GoogleSheetStrategyRow) {
    this.setActiveStrategyById(strat.noEstrategia);
  }

  public setActiveStrategyBySymbol(symbol: string) {
    const cleanSym = symbol.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    // Prefer the active version for this symbol
    const idx = this.strategies.findIndex(
      (s) =>
        s.par.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanSym &&
        s.estado !== 'Obsoleto'
    );
    if (idx !== -1) {
      this.setActiveStrategyIndex(idx);
    } else {
      const fallbackIdx = this.strategies.findIndex(
        (s) => s.par.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === cleanSym
      );
      if (fallbackIdx !== -1) {
        this.setActiveStrategyIndex(fallbackIdx);
      }
    }
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  /**
   * Refreshes strategies from the official Google Sheet CSV specification
   */
  public refreshOfficialStrategies(): GoogleSheetStrategyRow[] {
    const refreshed = parseCsvToStrategies(SAMPLE_GOOGLE_SHEET_CSV);
    this.strategies = refreshed;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.saveToStorage();

    // Preserve the user's currently selected symbol; do not forcibly revert to index 0
    const currentSym = binanceWs.getCurrentSymbol();
    if (currentSym) {
      const matchIdx = this.strategies.findIndex(
        (s) => s.par.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase() === currentSym.trim().toUpperCase()
      );
      if (matchIdx !== -1) {
        this.activeStrategyIndex = matchIdx;
      }
    } else {
      const current = this.getActiveStrategy();
      if (current && current.par) {
        binanceWs.setSymbol(current.par);
      }
    }

    this.notify();
    return refreshed;
  }

  public setStrategies(strategies: GoogleSheetStrategyRow[]) {
    this.strategies = strategies;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.saveToStorage();
    this.notify();
  }

  /**
   * Serializes current strategies back to canonical Google Sheets / Google Docs CSV
   */
  public exportCsv(): string {
    return strategiesToCsv(this.strategies);
  }

  /**
   * Copies the full strategies CSV to the user's clipboard for pasting directly into Google Docs or Sheets
   */
  public async copyCsvToClipboard(): Promise<boolean> {
    try {
      const csv = this.exportCsv();
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(csv);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Clipboard copy failed:', e);
      return false;
    }
  }

  /**
   * Downloads current strategies as a .csv file
   */
  public downloadCsvFile(filename: string = 'catalogo_estrategias_google_docs.csv'): void {
    const csv = this.exportCsv();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Overwrite or update strategies from a raw CSV string (e.g. pasted from Google Docs/Sheets)
   */
  public saveRawCsv(csvText: string): boolean {
    try {
      const parsed = parseCsvToStrategies(csvText);
      if (parsed.length > 0) {
        this.strategies = parsed;
        this.lastSyncTime = new Date().toLocaleTimeString();
        this.saveToStorage();
        this.notify();
        this.syncToWebhook();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving raw CSV:', err);
      return false;
    }
  }

  /**
   * Updates an existing strategy row in the catalog (Write operation)
   */
  public updateStrategyRow(updated: GoogleSheetStrategyRow): boolean {
    const idx = this.strategies.findIndex((s) => s.noEstrategia === updated.noEstrategia);
    if (idx !== -1) {
      this.strategies[idx] = { ...updated };
      const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
      this.strategies = allResolvedStrategies;
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.saveToStorage();
      this.notify();
      this.syncToWebhook();
      return true;
    }
    return false;
  }

  /**
   * Adds a new strategy row to the catalog (Write operation)
   */
  public addStrategyRow(newRow: GoogleSheetStrategyRow): boolean {
    this.strategies.push(newRow);
    const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
    this.strategies = allResolvedStrategies;
    this.lastSyncTime = new Date().toLocaleTimeString();
    this.saveToStorage();
    this.notify();
    this.syncToWebhook();
    return true;
  }

  /**
   * Deletes a strategy row by ID
   */
  public deleteStrategyRow(id: string): boolean {
    const initialLen = this.strategies.length;
    this.strategies = this.strategies.filter((s) => s.noEstrategia !== id);
    if (this.strategies.length !== initialLen) {
      const { allResolvedStrategies } = resolveLatestStrategiesPerPair(this.strategies);
      this.strategies = allResolvedStrategies;
      this.lastSyncTime = new Date().toLocaleTimeString();
      this.saveToStorage();
      this.notify();
      this.syncToWebhook();
      return true;
    }
    return false;
  }

  public getWebhookUrl(): string {
    return this.webhookUrl;
  }

  public setWebhookUrl(url: string) {
    this.webhookUrl = url.trim();
    if (this.webhookUrl) {
      localStorage.setItem(WEBHOOK_URL_KEY, this.webhookUrl);
    } else {
      localStorage.removeItem(WEBHOOK_URL_KEY);
    }
  }

  /**
   * Automatically pushes current state to a connected Google Apps Script Webhook or custom writeback endpoint
   */
  public async syncToWebhook(overrideUrl?: string): Promise<{ success: boolean; message: string }> {
    const targetUrl = (overrideUrl || this.webhookUrl).trim();
    if (!targetUrl) {
      return { success: false, message: 'No hay URL de Webhook configurada para sincronización de escritura automática.' };
    }

    try {
      const csv = this.exportCsv();
      await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        mode: 'no-cors',
        body: JSON.stringify({
          action: 'WRITE_STRATEGIES',
          timestamp: new Date().toISOString(),
          csv,
          strategies: this.strategies,
        }),
      });

      return {
        success: true,
        message: 'Solicitud de escritura enviada al webhook de Google Sheets.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Error al escribir en webhook: ${err?.message || 'Error de conexión'}`,
      };
    }
  }

  /**
   * Returns the unique list of pairs that are strictly present in the strategies.
   */
  public getStrategyPairs(): string[] {
    const pairs = Array.from(
      new Set(
        this.getActiveStrategies()
          .map((s) => (s.par || '').trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase())
          .filter((p) => p.length > 0)
      )
    );

    if (pairs.length > 0) {
      return pairs;
    }

    return ['ZECUSDT', 'TAOUSDT', 'AAVEUSDT', 'SOLUSDT', 'XRPUSDT'];
  }

  /**
   * Returns clean, uppercase symbol for robust cross-referencing.
   */
  public cleanSymbol(sym?: string): string {
    if (!sym) return '';
    return sym.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  /**
   * Cross-references and returns all symbols that currently have active positions or open orders in Binance Futures.
   */
  public getActiveTradeSymbols(): string[] {
    const activePositions = binanceWs.getPositions().filter((p) => Math.abs(p.positionAmt) > 0);
    const openOrders = binanceWs.getOpenOrders();

    const symbolsSet = new Set<string>();
    activePositions.forEach((pos) => {
      const clean = this.cleanSymbol(pos.symbol);
      if (clean) symbolsSet.add(clean);
    });
    openOrders.forEach((ord) => {
      const clean = this.cleanSymbol(ord.symbol);
      if (clean) symbolsSet.add(clean);
    });

    return Array.from(symbolsSet);
  }

  /**
   * Checks if a symbol or pair string is currently actively managed in Binance Futures.
   */
  public isSymbolInLiveManagement(symbolOrPar?: string): boolean {
    if (!symbolOrPar) return false;
    const clean = this.cleanSymbol(symbolOrPar);
    const activeSymbols = this.getActiveTradeSymbols();
    return activeSymbols.includes(clean);
  }

  /**
   * Cross-references an individual strategy from the 'Estrategias' catalog with live active trades.
   * Returns complete live trade context if an active position or open orders exist.
   */
  public getLiveManagementContextForStrategy(strategy?: GoogleSheetStrategyRow | null) {
    if (!strategy) return null;

    const stratId = (strategy.noEstrategia || '').trim().toUpperCase();
    const stratName = (strategy.nombreEstrategia || '').trim().toUpperCase();
    const stratSymbol = this.cleanSymbol(strategy.par);

    const allPositions = binanceWs.getPositions();
    const activePositions = allPositions.filter((p) => Math.abs(p.positionAmt) > 0);
    const allOpenOrders = binanceWs.getOpenOrders();

    // 1. Check direct ID/name match in active positions
    let matchedPos = activePositions.find((pos) => {
      const posStratId = (pos.strategyId || '').trim().toUpperCase();
      const posStratName = (pos.strategyName || '').trim().toUpperCase();
      return (
        (stratId && posStratId === stratId) ||
        (stratName && (posStratId === stratName || posStratName === stratName))
      );
    });

    // 2. Check linked strategy memory
    if (!matchedPos) {
      matchedPos = activePositions.find((pos) => {
        const linked = binanceWs.getLinkedStrategyForSymbol(pos.symbol);
        if (!linked) return false;
        const linkedId = (linked.strategyId || '').trim().toUpperCase();
        const linkedName = (linked.strategyName || '').trim().toUpperCase();
        return (
          (stratId && linkedId === stratId) ||
          (stratName && (linkedId === stratName || linkedName === stratName))
        );
      });
    }

    // 3. Check direct symbol match if not obsolete
    if (!matchedPos && stratSymbol) {
      const isObsolete = (strategy.estado || '').toLowerCase().includes('obsoleto');
      if (!isObsolete) {
        matchedPos = activePositions.find((pos) => this.cleanSymbol(pos.symbol) === stratSymbol);
      }
    }

    // Check related open orders
    const relatedOrders = allOpenOrders.filter((ord) => {
      const ordStratId = (ord.strategyId || '').trim().toUpperCase();
      const ordSym = this.cleanSymbol(ord.symbol);
      if (stratId && ordStratId === stratId) return true;
      if (stratSymbol && ordSym === stratSymbol) return true;
      return false;
    });

    const hasActivePosition = Boolean(matchedPos);
    const hasOpenOrders = relatedOrders.length > 0;

    if (!hasActivePosition && !hasOpenOrders) {
      return null;
    }

    const pos = matchedPos;
    const isLong = pos ? pos.positionAmt > 0 : !strategy.tipoDeOrden?.toLowerCase().includes('short');
    const side: 'LONG' | 'SHORT' = isLong ? 'LONG' : 'SHORT';
    const positionAmt = pos ? Math.abs(pos.positionAmt) : 0;
    const entryPrice = pos ? pos.entryPrice || 0 : 0;
    const markPrice = pos ? pos.markPrice || entryPrice : 0;
    const unrealizedPnl = pos ? pos.unRealizedProfit || 0 : 0;
    const leverage = pos ? pos.leverage || 2 : 2;
    const isolatedMargin = pos ? pos.isolatedMargin || (positionAmt * entryPrice) / leverage : 0;
    const roePct = isolatedMargin > 0 ? (unrealizedPnl / isolatedMargin) * 100 : 0;
    const isProfit = unrealizedPnl >= 0;
    const pnlSign = isProfit ? '+' : '-';
    const pnlFormatted = `${pnlSign}$${Math.abs(unrealizedPnl).toFixed(2)}`;
    const roeFormatted = `${pnlSign}${Math.abs(roePct).toFixed(2)}%`;

    return {
      isLiveManagement: true,
      hasActivePosition,
      hasOpenOrders,
      position: pos,
      openOrders: relatedOrders,
      symbol: pos ? pos.symbol : strategy.par,
      side,
      positionAmt,
      entryPrice,
      markPrice,
      unrealizedPnl,
      roePct,
      leverage,
      isProfit,
      pnlFormatted,
      roeFormatted,
      badgeLabel: hasActivePosition
        ? `LIVE MANAGEMENT: ${side} ${leverage}x (${pnlFormatted})`
        : `LIVE MANAGEMENT: ${relatedOrders.length} ÓRDEN(ES)`,
    };
  }

  /**
   * Cross-references entire 'Estrategias' catalog with active trade symbols.
   * Returns map indexed by strategy number and symbol.
   */
  public getLiveManagementCatalogMap(): Map<string, any> {
    const map = new Map<string, any>();
    this.strategies.forEach((st) => {
      const ctx = this.getLiveManagementContextForStrategy(st);
      if (ctx) {
        map.set(st.noEstrategia, ctx);
        const clean = this.cleanSymbol(st.par);
        if (clean) map.set(clean, ctx);
      }
    });
    return map;
  }

  /**
   * Returns count of strategies currently in Live Management.
   */
  public getLiveManagementCount(): number {
    return this.strategies.filter((s) => Boolean(this.getLiveManagementContextForStrategy(s))).length;
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Error in strategyService listener:', err);
      }
    });
  }
}

export const strategyService = new StrategyService();
