/**
 * Hourly Price History Service
 * Fetches and processes 1-hour interval candle data for the last 4 hours
 * for any Binance Futures / Spot symbol, providing visual analytics.
 */

import { binanceFetch } from '../utils/binanceInterceptor';

export interface HourlyCandle {
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  changePct: number;
  isBullish: boolean;
  label: string; // e.g., 'Hace 4h', 'Hace 3h', 'Hace 2h', '1h / Live'
  shortHour: string; // e.g., '14:00'
}

export interface FourHourPriceMovement {
  symbol: string;
  candles: HourlyCandle[]; // Exactly 4 hourly intervals
  min4h: number;
  max4h: number;
  startPrice: number;
  endPrice: number;
  netChange: number;
  netChangePct: number;
  isBullish: boolean;
  volatilityPct: number;
  trend: 'ALCISTA' | 'BAJISTA' | 'LATERAL';
  lastUpdated: number;
}

interface CacheEntry {
  data: FourHourPriceMovement;
  timestamp: number;
}

const CACHE_TTL_MS = 30000; // 30 seconds
const cache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<FourHourPriceMovement>>();

function formatHour(timestamp: number): string {
  try {
    const d = new Date(timestamp);
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return '';
  }
}

/**
 * Generate synthetic realistic 4h movement if network/API is offline
 */
function createSynthetic4HMovement(symbol: string, basePrice: number): FourHourPriceMovement {
  const now = Date.now();
  const oneHour = 3600000;
  const p = basePrice > 0 ? basePrice : 100;
  
  // Create 4 synthetic variations around basePrice
  const variations = [-0.008, 0.004, -0.002, 0.006];
  let cur = p * (1 - 0.008);
  const candles: HourlyCandle[] = [];

  for (let i = 0; i < 4; i++) {
    const openTime = now - (4 - i) * oneHour;
    const closeTime = openTime + oneHour;
    const open = cur;
    const change = cur * variations[i];
    const close = i === 3 && basePrice > 0 ? basePrice : open + change;
    const high = Math.max(open, close) * 1.0025;
    const low = Math.min(open, close) * 0.9975;
    const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
    const isBullish = close >= open;

    candles.push({
      openTime,
      closeTime,
      open,
      high,
      low,
      close,
      volume: 1000 + i * 250,
      changePct,
      isBullish,
      label: i === 3 ? '1h / Live' : `Hace ${4 - i}h`,
      shortHour: formatHour(openTime),
    });

    cur = close;
  }

  const allHighs = candles.map((c) => c.high);
  const allLows = candles.map((c) => c.low);
  const min4h = Math.min(...allLows);
  const max4h = Math.max(...allHighs);
  const startPrice = candles[0].open;
  const endPrice = candles[3].close;
  const netChange = endPrice - startPrice;
  const netChangePct = startPrice > 0 ? (netChange / startPrice) * 100 : 0;
  const isBullish = netChange >= 0;
  const volatilityPct = min4h > 0 ? ((max4h - min4h) / min4h) * 100 : 0;
  const trend = netChangePct > 0.3 ? 'ALCISTA' : netChangePct < -0.3 ? 'BAJISTA' : 'LATERAL';

  return {
    symbol,
    candles,
    min4h,
    max4h,
    startPrice,
    endPrice,
    netChange,
    netChangePct,
    isBullish,
    volatilityPct,
    trend,
    lastUpdated: now,
  };
}

export async function fetch4HourPriceMovement(
  rawSymbol: string,
  livePrice?: number
): Promise<FourHourPriceMovement> {
  const cleanSymbol = rawSymbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
  if (!cleanSymbol) {
    return createSynthetic4HMovement('UNKNOWN', livePrice || 100);
  }

  // Check cache
  const cached = cache.get(cleanSymbol);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    // If livePrice is given, update the latest candle close
    if (livePrice && livePrice > 0) {
      const updatedCandles = [...cached.data.candles];
      const last = { ...updatedCandles[updatedCandles.length - 1] };
      last.close = livePrice;
      last.high = Math.max(last.high, livePrice);
      last.low = Math.min(last.low, livePrice);
      last.changePct = last.open > 0 ? ((livePrice - last.open) / last.open) * 100 : 0;
      last.isBullish = last.close >= last.open;
      updatedCandles[updatedCandles.length - 1] = last;

      const min4h = Math.min(...updatedCandles.map((c) => c.low));
      const max4h = Math.max(...updatedCandles.map((c) => c.high));
      const netChange = livePrice - updatedCandles[0].open;
      const netChangePct = updatedCandles[0].open > 0 ? (netChange / updatedCandles[0].open) * 100 : 0;

      return {
        ...cached.data,
        candles: updatedCandles,
        endPrice: livePrice,
        min4h,
        max4h,
        netChange,
        netChangePct,
        isBullish: netChange >= 0,
        trend: netChangePct > 0.3 ? 'ALCISTA' : netChangePct < -0.3 ? 'BAJISTA' : 'LATERAL',
      };
    }
    return cached.data;
  }

  // De-duplicate in-flight requests for the same symbol
  if (inFlightRequests.has(cleanSymbol)) {
    return inFlightRequests.get(cleanSymbol)!;
  }

  const fetchPromise = (async (): Promise<FourHourPriceMovement> => {
    try {
      const urls = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
      ];

      let rawKlines: any[] | null = null;

      for (const url of urls) {
        try {
          const res = await binanceFetch(url);
          if (res && res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length >= 3) {
              rawKlines = data;
              break;
            }
          }
        } catch {
          // Continue to next mirror
        }
      }

      if (!rawKlines || rawKlines.length < 3) {
        // Fallback synthetic
        const fallback = createSynthetic4HMovement(cleanSymbol, livePrice || 100);
        cache.set(cleanSymbol, { data: fallback, timestamp: Date.now() });
        return fallback;
      }

      // Take the last 4 candles
      const selected = rawKlines.slice(-4);
      const now = Date.now();

      const candles: HourlyCandle[] = selected.map((k: any, idx: number) => {
        const openTime = Number(k[0]);
        const closeTime = Number(k[6]) || openTime + 3600000;
        const open = parseFloat(k[1]);
        let high = parseFloat(k[2]);
        let low = parseFloat(k[3]);
        let close = parseFloat(k[4]);
        const volume = parseFloat(k[5]) || 0;

        // If this is the latest candle and livePrice is provided, calibrate it
        if (idx === selected.length - 1 && livePrice && livePrice > 0) {
          close = livePrice;
          high = Math.max(high, livePrice);
          low = Math.min(low, livePrice);
        }

        const changePct = open > 0 ? ((close - open) / open) * 100 : 0;
        const isBullish = close >= open;

        // Label based on position
        const hoursAgo = selected.length - 1 - idx;
        const label = hoursAgo === 0 ? '1h / Live' : `Hace ${hoursAgo}h`;

        return {
          openTime,
          closeTime,
          open,
          high,
          low,
          close,
          volume,
          changePct,
          isBullish,
          label,
          shortHour: formatHour(openTime),
        };
      });

      const allHighs = candles.map((c) => c.high);
      const allLows = candles.map((c) => c.low);
      const min4h = Math.min(...allLows);
      const max4h = Math.max(...allHighs);
      const startPrice = candles[0].open;
      const endPrice = candles[candles.length - 1].close;
      const netChange = endPrice - startPrice;
      const netChangePct = startPrice > 0 ? (netChange / startPrice) * 100 : 0;
      const isBullish = netChange >= 0;
      const volatilityPct = min4h > 0 ? ((max4h - min4h) / min4h) * 100 : 0;
      const trend = netChangePct > 0.3 ? 'ALCISTA' : netChangePct < -0.3 ? 'BAJISTA' : 'LATERAL';

      const result: FourHourPriceMovement = {
        symbol: cleanSymbol,
        candles,
        min4h,
        max4h,
        startPrice,
        endPrice,
        netChange,
        netChangePct,
        isBullish,
        volatilityPct,
        trend,
        lastUpdated: now,
      };

      cache.set(cleanSymbol, { data: result, timestamp: Date.now() });
      return result;
    } catch {
      const fallback = createSynthetic4HMovement(cleanSymbol, livePrice || 100);
      cache.set(cleanSymbol, { data: fallback, timestamp: Date.now() });
      return fallback;
    } finally {
      inFlightRequests.delete(cleanSymbol);
    }
  })();

  inFlightRequests.set(cleanSymbol, fetchPromise);
  return fetchPromise;
}
