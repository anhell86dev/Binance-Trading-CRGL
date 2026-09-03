/**
 * Binance API Service (REST & WebSocket Engine)
 * 
 * Provides:
 * 1. Async WebSocket connection to Binance Futures public stream (wss://fstream.binance.com/ws)
 *    with throttled batch updates for the Watchlist to avoid UI jank and heavy re-renders.
 * 2. Low-latency REST client for authentication, market data, and order execution.
 * 3. Strict risk management compliance: Max 5x leverage and mandatory ISOLATED margin mode.
 */

import {
  AccountBalance,
  ApiCredentials,
  KlineCandle,
  NetworkMode,
  OpenOrder,
  OrderSide,
  OrderType,
  PositionRisk,
  TickerData,
} from '../types/binance';
import { binanceWs } from './binanceWs';

export const BINANCE_STREAM_URL = 'wss://fstream.binance.com/ws';
export const BINANCE_REST_BASE = 'https://fapi.binance.com';
export const BINANCE_TESTNET_REST = 'https://testnet.binancefuture.com';

export interface WatchlistPriceUpdate {
  symbol: string;
  price: number;
  change24h: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: number;
}

type WatchlistListener = (tickers: Map<string, WatchlistPriceUpdate>) => void;

class BinanceApiService {
  private streamWs: WebSocket | null = null;
  private isConnected = false;
  private reconnectTimeout: any = null;
  private subscribedSymbols: Set<string> = new Set([
    'btcusdt',
    'ethusdt',
    'solusdt',
    'bnbusdt',
    'xrpusdt',
    'dogeusdt',
    'adausdt',
    'avaxusdt',
    'linkusdt',
    'zecusdt',
    'taousdt',
    'aaveusdt',
  ]);

  // Buffer and throttle system to prevent heavy UI re-renders
  private tickerBuffer: Map<string, WatchlistPriceUpdate> = new Map();
  private listeners: Set<WatchlistListener> = new Set();
  private throttleInterval: any = null;
  private hasPendingUpdates = false;

  constructor() {
    this.startPublicStream();
    this.startThrottler();
  }

  /**
   * Connect asynchronously to Binance Futures public stream: wss://fstream.binance.com/ws
   */
  public startPublicStream() {
    if (this.streamWs && (this.streamWs.readyState === WebSocket.OPEN || this.streamWs.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      // Subscribe to 24hr miniTicker stream for all market pairs or specific symbols
      const streams = Array.from(this.subscribedSymbols).map((s) => `${s}@miniTicker`).join('/');
      const streamUrl = `${BINANCE_STREAM_URL}/${streams}`;

      this.streamWs = new WebSocket(streamUrl);

      this.streamWs.onopen = () => {
        this.isConnected = true;
      };

      this.streamWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.s) {
            // Single miniTicker event: { e: '24hrMiniTicker', s: 'BTCUSDT', c: '65432.10', ... }
            const symbol = data.s.toUpperCase();
            const lastPrice = parseFloat(data.c || '0');
            const openPrice = parseFloat(data.o || '0');
            const highPrice = parseFloat(data.h || '0');
            const lowPrice = parseFloat(data.l || '0');
            const volume = parseFloat(data.v || '0');
            const changePercent = openPrice > 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0;
            const changeAmount = lastPrice - openPrice;

            this.tickerBuffer.set(symbol, {
              symbol,
              price: lastPrice,
              change24h: changeAmount,
              change24hPercent: changePercent,
              high24h: highPrice,
              low24h: lowPrice,
              volume24h: volume,
              timestamp: data.E || Date.now(),
            });

            this.hasPendingUpdates = true;
          }
        } catch {
          // Silent JSON parse error
        }
      };

      this.streamWs.onerror = () => {
        this.isConnected = false;
      };

      this.streamWs.onclose = () => {
        this.isConnected = false;
        // Exponential backoff reconnect
        if (!this.reconnectTimeout) {
          this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.startPublicStream();
          }, 3000);
        }
      };
    } catch {
      this.isConnected = false;
    }
  }

  /**
   * Throttles state updates to at most once every 150ms to keep React UI smooth and high-performance
   */
  private startThrottler() {
    if (this.throttleInterval) return;
    this.throttleInterval = setInterval(() => {
      if (this.hasPendingUpdates && this.listeners.size > 0) {
        this.hasPendingUpdates = false;
        const snapshot = new Map(this.tickerBuffer);
        this.listeners.forEach((cb) => {
          try {
            cb(snapshot);
          } catch (e) {
            console.error('Watchlist listener error:', e);
          }
        });
      }
    }, 150);
  }

  public subscribeWatchlist(listener: WatchlistListener): () => void {
    this.listeners.add(listener);
    if (this.tickerBuffer.size > 0) {
      listener(new Map(this.tickerBuffer));
    }
    return () => this.listeners.delete(listener);
  }

  public getCachedTickers(): Map<string, WatchlistPriceUpdate> {
    return new Map(this.tickerBuffer);
  }

  /**
   * Send an authenticated Futures Order via REST or WebSocket with strict Risk Limits:
   * Max 5x Leverage and ISOLATED Margin enforced.
   */
  public async placeOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number;
    leverage?: number;
    stopPrice?: number;
    tpPrice?: number;
    slPrice?: number;
  }) {
    // 1. Enforce strict risk limits: clamp leverage <= 5x
    const safeLeverage = Math.min(5, Math.max(1, params.leverage || 2));

    // 2. Delegate to WS-FAPI engine with guaranteed ISOLATED margin
    if (params.type === 'LIMIT') {
      if (!params.price) throw new Error('El precio límite es requerido');
      return await binanceWs.placeLimitOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        price: params.price,
        leverage: safeLeverage,
        tpPrice: params.tpPrice,
        slPrice: params.slPrice,
      });
    } else {
      // Market order execution
      return await binanceWs.placeMarketOrder({
        symbol: params.symbol,
        side: params.side,
        quantity: params.quantity,
        leverage: safeLeverage,
        tpPrice: params.tpPrice,
        slPrice: params.slPrice,
      });
    }
  }

  /**
   * Fast emergency position close with low latency
   */
  public async emergencyClosePosition(symbol: string) {
    return await binanceWs.closePosition(symbol);
  }

  /**
   * Close all active positions
   */
  public async emergencyCloseAllPositions() {
    return await binanceWs.closeAllPositions();
  }

  public getBalance(): AccountBalance {
    return binanceWs.getBalance();
  }

  public getPositions(): PositionRisk[] {
    return binanceWs.getPositions();
  }

  public getOpenOrders(): OpenOrder[] {
    return binanceWs.getOpenOrders();
  }

  public isStreamConnected(): boolean {
    return this.isConnected;
  }
}

export const binanceApi = new BinanceApiService();
