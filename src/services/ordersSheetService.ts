import { OpenOrder } from '../types/binance';
import {
  parseCsvToOrders,
  ordersToCsv,
  fetchGoogleSheetCsv,
  DEFAULT_ORDERS_SHEET_CSV_TEMPLATE,
} from '../utils/sheetParser';
import { binanceWs } from './binanceWs';
import { strategyService } from './strategyService';

const ORDERS_TAB_STORAGE_KEY = 'binance_orders_sheet_tab_name_v1';
const ORDERS_GID_STORAGE_KEY = 'binance_orders_sheet_gid_v1';
const ORDERS_CACHE_STORAGE_KEY = 'binance_orders_sheet_cache_v1';
const ORDERS_LAST_SYNC_KEY = 'binance_orders_sheet_last_sync_v1';

export const DEFAULT_ORDERS_SHEET_TAB = 'Ordenes';

class OrdersSheetService {
  private sheetTabName: string = DEFAULT_ORDERS_SHEET_TAB;
  private sheetGid: string = '';
  private orders: OpenOrder[] = [];
  private isSyncing: boolean = false;
  private lastSyncTime: string = '';
  private lastSyncError: string | null = null;
  private autoSyncInterval: any = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadConfig();
    this.initAutoSync();
    setTimeout(() => {
      this.syncOrdersFromGoogleSheet(undefined, true);
    }, 600);
  }

  private loadConfig() {
    try {
      this.sheetTabName = localStorage.getItem(ORDERS_TAB_STORAGE_KEY) || DEFAULT_ORDERS_SHEET_TAB;
      this.sheetGid = localStorage.getItem(ORDERS_GID_STORAGE_KEY) || '';
      this.lastSyncTime = localStorage.getItem(ORDERS_LAST_SYNC_KEY) || '';

      const cached = localStorage.getItem(ORDERS_CACHE_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.orders = parsed;
        }
      }
    } catch (e) {
      console.warn('Error loading OrdersSheetService config:', e);
    }
  }

  private saveConfig() {
    try {
      localStorage.setItem(ORDERS_TAB_STORAGE_KEY, this.sheetTabName);
      localStorage.setItem(ORDERS_GID_STORAGE_KEY, this.sheetGid);
      localStorage.setItem(ORDERS_LAST_SYNC_KEY, this.lastSyncTime);
      localStorage.setItem(ORDERS_CACHE_STORAGE_KEY, JSON.stringify(this.orders));
    } catch (e) {
      console.warn('Error saving OrdersSheetService config:', e);
    }
  }

  private initAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
    }
    // Periodic sync every 20 seconds alongside strategies
    this.autoSyncInterval = setInterval(() => {
      this.syncOrdersFromGoogleSheet(undefined, true);
    }, 20000);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.error('Error notifying OrdersSheetService listener:', err);
      }
    });
  }

  /**
   * Reads and synchronizes orders from the specific tab of the user's configured Google Sheet
   */
  public async syncOrdersFromGoogleSheet(customUrl?: string, silent: boolean = false): Promise<boolean> {
    if (this.isSyncing) return false;
    this.isSyncing = true;
    this.lastSyncError = null;
    if (!silent) this.notify();

    const targetUrl = customUrl || strategyService.getEffectiveSheetUrl();

    try {
      let csvContent = '';

      // 1. Try with explicit tab name or gid
      if (this.sheetGid) {
        csvContent = await fetchGoogleSheetCsv(targetUrl, { gid: this.sheetGid });
      } else if (this.sheetTabName) {
        csvContent = await fetchGoogleSheetCsv(targetUrl, { sheetTabName: this.sheetTabName });
      }

      // 2. If nothing returned, try common candidate tab names in Spanish and English
      if (!csvContent || csvContent.length < 30) {
        const candidateTabs = ['Ordenes', 'Órdenes', 'Orders', 'Trades', 'Ejecuciones'];
        for (const candidate of candidateTabs) {
          if (candidate.toLowerCase() === this.sheetTabName.toLowerCase()) continue;
          const candidateContent = await fetchGoogleSheetCsv(targetUrl, { sheetTabName: candidate });
          if (candidateContent && candidateContent.length > 30 && (candidateContent.includes('Par') || candidateContent.includes('Precio') || candidateContent.includes('Symbol'))) {
            csvContent = candidateContent;
            this.sheetTabName = candidate;
            break;
          }
        }
      }

      // 3. Parse orders from CSV
      if (csvContent && csvContent.length > 20) {
        const parsedOrders = parseCsvToOrders(csvContent);

        if (parsedOrders.length > 0) {
          this.orders = parsedOrders;
          this.lastSyncTime = new Date().toLocaleTimeString();
          this.lastSyncError = null;
          this.saveConfig();

          // Update active orders in Binance WebSocket engine & Account Summary
          binanceWs.setOpenOrders(parsedOrders, 'google_sheets');

          this.isSyncing = false;
          this.notify();
          return true;
        } else {
          // The tab exists or has headers, but no order rows were detected
          this.lastSyncError = `La pestaña "${this.sheetTabName}" fue leída, pero no se encontraron filas de órdenes válidas.`;
          this.isSyncing = false;
          this.notify();
          return false;
        }
      }

      // Tab not found or empty
      this.lastSyncError = `No se pudo leer la pestaña "${this.sheetTabName}" en Google Sheets. Asegúrate de que exista en tu archivo o usa la plantilla para crearla.`;
      this.isSyncing = false;
      this.notify();
      return false;
    } catch (err: any) {
      console.error('Error syncing orders from Google Sheet:', err);
      this.lastSyncError = err.message || 'Error al leer la hoja de órdenes de Google Sheets';
      this.isSyncing = false;
      this.notify();
      return false;
    }
  }

  // --- CONFIGURATION GETTERS & SETTERS ---

  public getSheetTabName(): string {
    return this.sheetTabName;
  }

  public setSheetTabName(name: string) {
    this.sheetTabName = name.trim() || DEFAULT_ORDERS_SHEET_TAB;
    this.saveConfig();
    this.notify();
    this.syncOrdersFromGoogleSheet();
  }

  public getSheetGid(): string {
    return this.sheetGid;
  }

  public setSheetGid(gid: string) {
    this.sheetGid = gid.trim();
    this.saveConfig();
    this.notify();
    this.syncOrdersFromGoogleSheet();
  }

  public getOrders(): OpenOrder[] {
    return this.orders;
  }

  public getIsSyncing(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime;
  }

  public getLastSyncError(): string | null {
    return this.lastSyncError;
  }

  // --- TEMPLATE & EXPORT UTILITIES ---

  public async copyTemplateCsv(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(DEFAULT_ORDERS_SHEET_CSV_TEMPLATE);
      return true;
    } catch {
      return false;
    }
  }

  public async copyCurrentOrdersCsv(): Promise<boolean> {
    try {
      const currentOrders = binanceWs.getOpenOrders();
      const csv = ordersToCsv(currentOrders);
      await navigator.clipboard.writeText(csv);
      return true;
    } catch {
      return false;
    }
  }

  public downloadOrdersCsv(useCurrent: boolean = true) {
    const orders = useCurrent ? binanceWs.getOpenOrders() : this.orders;
    const csvContent = ordersToCsv(orders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ordenes_google_sheets_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const ordersSheetService = new OrdersSheetService();
