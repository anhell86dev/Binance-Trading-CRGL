import { parseCsvToStrategies, parseCsvToOrders, ordersToCsv, extractSpreadsheetId } from '../utils/sheetParser';
import { strategyService } from './strategyService';
import { binanceWs } from './binanceWs';
import { OpenOrder } from '../types/binance';
import { GoogleSheetStrategyRow } from '../types/strategy';

const GOOGLE_TOKEN_STORAGE_KEY = 'binance_google_sheets_access_token_v1';

class GoogleSheetsApiService {
  private accessToken: string | null = null;
  private isConnecting: boolean = false;
  private lastSyncError: string | null = null;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.accessToken = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY) || null;
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
        console.error('Error notifying GoogleSheetsApiService listener:', err);
      }
    });
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  public setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem(GOOGLE_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(GOOGLE_TOKEN_STORAGE_KEY);
    }
    this.notify();
  }

  public isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  public getLastSyncError(): string | null {
    return this.lastSyncError;
  }

  /**
   * Triggers client-side OAuth flow using Google Identity Services (GIS)
   */
  public async requestAccessToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if google Identity Services script is available
      if (typeof window === 'undefined') {
        return reject(new Error('Entorno no soportado para OAuth de Google.'));
      }

      // Load GIS script dynamically if not present
      const ensureGisScript = (): Promise<void> => {
        return new Promise((res, rej) => {
          if ((window as any).google?.accounts?.oauth2) {
            return res();
          }
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.defer = true;
          script.onload = () => res();
          script.onerror = () => rej(new Error('Error al cargar Google Identity Services script.'));
          document.head.appendChild(script);
        });
      };

      ensureGisScript()
        .then(() => {
          const google = (window as any).google;
          if (!google?.accounts?.oauth2) {
            throw new Error('Google Identity Services no está listo.');
          }

          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: '322867373543-ai-studio-applet.apps.googleusercontent.com', // standard client
            scope: 'https://www.googleapis.com/auth/spreadsheets',
            callback: (response: any) => {
              if (response.error) {
                console.error('OAuth GIS Token Error:', response);
                this.lastSyncError = `Error de autenticación Google: ${response.error}`;
                this.notify();
                return reject(new Error(response.error_description || response.error));
              }

              if (response.access_token) {
                this.setAccessToken(response.access_token);
                this.lastSyncError = null;
                this.notify();
                resolve(response.access_token);
              } else {
                reject(new Error('No se recibió token de acceso de Google.'));
              }
            },
          });

          tokenClient.requestAccessToken();
        })
        .catch((err) => {
          console.warn('Fallback to manual token or error:', err);
          reject(err);
        });
    });
  }

  /**
   * Helper to perform authorized Google Sheets API v4 requests
   */
  private async apiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('No hay sesión activa con la API de Google Sheets. Conecta tu cuenta primero.');
    }

    const headers = {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    };

    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${endpoint}`, {
      ...options,
      headers,
    });

    if (res.status === 401) {
      this.setAccessToken(null);
      this.lastSyncError = 'La sesión de Google Sheets ha expirado. Vuelve a conectar tu cuenta.';
      this.notify();
      throw new Error(this.lastSyncError);
    }

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg = errJson.error?.message || `Error Google Sheets API (${res.status})`;
      this.lastSyncError = msg;
      this.notify();
      throw new Error(msg);
    }

    return await res.json();
  }

  /**
   * Read raw values matrix from a range in Google Sheets
   */
  public async getRangeValues(sheetUrlOrId: string, range: string): Promise<string[][]> {
    const sheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!sheetId) throw new Error('URL de Google Sheets inválida.');

    const data = await this.apiFetch(`${sheetId}/values/${encodeURIComponent(range)}`);
    return data.values || [];
  }

  /**
   * Convert matrix rows to CSV string for parsing compatibility
   */
  private rowsToCsv(rows: string[][]): string {
    return rows
      .map((row) =>
        row
          .map((cell) => {
            const str = cell ?? '';
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          })
          .join(',')
      )
      .join('\n');
  }

  /**
   * DIRECT BIDIRECTIONAL SYNC: Read strategies directly via Google Sheets API v4
   */
  public async syncStrategiesViaApi(sheetUrlOrId: string): Promise<GoogleSheetStrategyRow[]> {
    const sheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!sheetId) throw new Error('ID de Google Sheets inválido.');

    try {
      // 1. Try tab 'Estrategias'
      let rows: string[][] = [];
      try {
        rows = await this.getRangeValues(sheetId, 'Estrategias!A1:Z200');
      } catch {
        // Fallback to range A1:Z200 on first sheet
        rows = await this.getRangeValues(sheetId, 'A1:Z200');
      }

      if (!rows || rows.length < 2) {
        throw new Error('La pestaña "Estrategias" está vacía o no contiene filas de datos.');
      }

      const csvText = this.rowsToCsv(rows);
      const parsed = parseCsvToStrategies(csvText);

      if (parsed.length > 0) {
        this.lastSyncError = null;
        this.notify();
        return parsed;
      } else {
        throw new Error('No se detectaron columnas válidas de Estrategia en la hoja.');
      }
    } catch (err: any) {
      this.lastSyncError = err.message || 'Error al leer estrategias via Google API';
      this.notify();
      throw err;
    }
  }

  /**
   * DIRECT BIDIRECTIONAL SYNC: Read orders directly via Google Sheets API v4
   */
  public async syncOrdersViaApi(sheetUrlOrId: string, tabName: string = 'Ordenes'): Promise<OpenOrder[]> {
    const sheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!sheetId) throw new Error('ID de Google Sheets inválido.');

    try {
      let rows: string[][] = [];
      try {
        rows = await this.getRangeValues(sheetId, `${tabName}!A1:Z200`);
      } catch {
        rows = await this.getRangeValues(sheetId, 'Ordenes!A1:Z200');
      }

      if (!rows || rows.length < 2) {
        return [];
      }

      const csvText = this.rowsToCsv(rows);
      const parsedOrders = parseCsvToOrders(csvText);

      this.lastSyncError = null;
      this.notify();
      return parsedOrders;
    } catch (err: any) {
      console.warn('Error reading orders via Google API:', err);
      return [];
    }
  }

  /**
   * DIRECT BIDIRECTIONAL WRITING: Append a new order row directly to Google Sheets
   */
  public async appendOrderViaApi(sheetUrlOrId: string, order: OpenOrder, tabName: string = 'Ordenes'): Promise<boolean> {
    const sheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!sheetId) throw new Error('ID de Google Sheets inválido.');

    const formattedRow = [
      order.strategyId || '-',
      new Date().toISOString(),
      order.strategyId ? `Estrategia ${order.strategyId}` : 'Manual Order',
      order.symbol,
      '5m',
      order.type,
      order.side,
      String(order.price || order.stopPrice || 0),
      String(order.origQty || 0),
      `${order.leverage || 3}x`,
      order.status,
      order.orderId,
    ];

    try {
      await this.apiFetch(
        `${sheetId}/values/${encodeURIComponent(tabName)}!A1:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          body: JSON.stringify({
            values: [formattedRow],
          }),
        }
      );
      return true;
    } catch (err: any) {
      console.error('Error appending order to Google Sheets API:', err);
      // Attempt without tab prefix if tab fails
      try {
        await this.apiFetch(
          `${sheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            body: JSON.stringify({
              values: [formattedRow],
            }),
          }
        );
        return true;
      } catch (innerErr) {
        throw err;
      }
    }
  }

  /**
   * DIRECT BIDIRECTIONAL WRITING: Update entire orders range or overwrite active orders in Google Sheets
   */
  public async writeOrdersViaApi(sheetUrlOrId: string, orders: OpenOrder[], tabName: string = 'Ordenes'): Promise<boolean> {
    const sheetId = extractSpreadsheetId(sheetUrlOrId);
    if (!sheetId) throw new Error('ID de Google Sheets inválido.');

    const headers = [
      'No. Estrategia',
      'Fecha',
      'Nombre de Estrategia',
      'Par',
      'Temporalidad',
      'Tipo de Orden',
      'Lado',
      'Precio',
      'Cantidad',
      'Apalancamiento',
      'Estado',
      'ID Orden',
    ];

    const dataRows = orders.map((o) => [
      o.strategyId || '-',
      new Date().toISOString(),
      o.strategyId ? `Estrategia ${o.strategyId}` : 'Manual Order',
      o.symbol,
      '5m',
      o.type,
      o.side,
      String(o.price || o.stopPrice || 0),
      String(o.origQty || 0),
      `${o.leverage || 3}x`,
      o.status,
      o.orderId,
    ]);

    const values = [headers, ...dataRows];

    try {
      await this.apiFetch(
        `${sheetId}/values/${encodeURIComponent(tabName)}!A1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          body: JSON.stringify({ values }),
        }
      );
      return true;
    } catch (err: any) {
      console.error('Error writing orders via Google API:', err);
      throw err;
    }
  }
}

export const googleSheetsApiService = new GoogleSheetsApiService();
