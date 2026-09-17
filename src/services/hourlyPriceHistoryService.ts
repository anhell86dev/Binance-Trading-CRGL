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
  label: string; // e.g., '1h / Actual', 'Hace 2h', 'Hace 3h', 'Hace 4h', 'Diario'
  shortHour: string; // e.g., '14:00' or 'Hoy'
  isDaily?: boolean;
}

export interface FourHourPriceMovement {
  symbol: string;
  candles: HourlyCandle[]; // Exactly 4 hourly intervals
  candle5m?: HourlyCandle; // Current / recent 5-minute candle
  candle15m?: HourlyCandle; // Current / recent 15-minute candle
  dailyCandle?: HourlyCandle; // Current daily candle (1D)
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
export function createSynthetic4HMovement(symbol: string, basePrice: number): FourHourPriceMovement {
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
      label: i === 3 ? '1h / Actual' : `Hace ${4 - i}h`,
      shortHour: formatHour(openTime),
      isDaily: false,
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

  // Synthetic Daily Candle
  const dailyOpen = p * (1 - 0.012);
  const dailyClose = basePrice > 0 ? basePrice : p;
  const dailyHigh = Math.max(dailyOpen, dailyClose, max4h) * 1.008;
  const dailyLow = Math.min(dailyOpen, dailyClose, min4h) * 0.992;
  const dailyChangePct = dailyOpen > 0 ? ((dailyClose - dailyOpen) / dailyOpen) * 100 : 0;
  const dailyCandle: HourlyCandle = {
    openTime: now - 86400000,
    closeTime: now,
    open: dailyOpen,
    high: dailyHigh,
    low: dailyLow,
    close: dailyClose,
    volume: 15000,
    changePct: dailyChangePct,
    isBullish: dailyClose >= dailyOpen,
    label: 'Diario',
    shortHour: 'Hoy',
    isDaily: true,
  };

  // Synthetic 5M and 15M candles
  const open5m = p * (1 - 0.0018);
  const close5m = basePrice > 0 ? basePrice : p;
  const candle5m: HourlyCandle = {
    openTime: now - 5 * 60000,
    closeTime: now,
    open: open5m,
    high: Math.max(open5m, close5m) * 1.001,
    low: Math.min(open5m, close5m) * 0.999,
    close: close5m,
    volume: 2500,
    changePct: open5m > 0 ? ((close5m - open5m) / open5m) * 100 : 0,
    isBullish: close5m >= open5m,
    label: '5M',
    shortHour: formatHour(now - 5 * 60000),
    isDaily: false,
  };

  const open15m = p * (1 - 0.0035);
  const close15m = basePrice > 0 ? basePrice : p;
  const candle15m: HourlyCandle = {
    openTime: now - 15 * 60000,
    closeTime: now,
    open: open15m,
    high: Math.max(open15m, close15m) * 1.002,
    low: Math.min(open15m, close15m) * 0.998,
    close: close15m,
    volume: 7200,
    changePct: open15m > 0 ? ((close15m - open15m) / open15m) * 100 : 0,
    isBullish: close15m >= open15m,
    label: '15M',
    shortHour: formatHour(now - 15 * 60000),
    isDaily: false,
  };

  return {
    symbol,
    candles,
    candle5m,
    candle15m,
    dailyCandle,
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
    // If livePrice is given, update the latest candle close and daily close
    if (livePrice && livePrice > 0) {
      const updatedCandles = [...cached.data.candles];
      const last = { ...updatedCandles[updatedCandles.length - 1] };
      last.close = livePrice;
      last.high = Math.max(last.high, livePrice);
      last.low = Math.min(last.low, livePrice);
      last.changePct = last.open > 0 ? ((livePrice - last.open) / last.open) * 100 : 0;
      last.isBullish = last.close >= last.open;
      updatedCandles[updatedCandles.length - 1] = last;

      let updatedDaily = cached.data.dailyCandle ? { ...cached.data.dailyCandle } : undefined;
      if (updatedDaily) {
        updatedDaily.close = livePrice;
        updatedDaily.high = Math.max(updatedDaily.high, livePrice);
        updatedDaily.low = Math.min(updatedDaily.low, livePrice);
        updatedDaily.changePct =
          updatedDaily.open > 0 ? ((livePrice - updatedDaily.open) / updatedDaily.open) * 100 : 0;
        updatedDaily.isBullish = updatedDaily.close >= updatedDaily.open;
      }

      let updated5m = cached.data.candle5m ? { ...cached.data.candle5m } : undefined;
      if (updated5m) {
        updated5m.close = livePrice;
        updated5m.high = Math.max(updated5m.high, livePrice);
        updated5m.low = Math.min(updated5m.low, livePrice);
        updated5m.changePct = updated5m.open > 0 ? ((livePrice - updated5m.open) / updated5m.open) * 100 : 0;
        updated5m.isBullish = updated5m.close >= updated5m.open;
      }

      let updated15m = cached.data.candle15m ? { ...cached.data.candle15m } : undefined;
      if (updated15m) {
        updated15m.close = livePrice;
        updated15m.high = Math.max(updated15m.high, livePrice);
        updated15m.low = Math.min(updated15m.low, livePrice);
        updated15m.changePct = updated15m.open > 0 ? ((livePrice - updated15m.open) / updated15m.open) * 100 : 0;
        updated15m.isBullish = updated15m.close >= updated15m.open;
      }

      const min4h = Math.min(...updatedCandles.map((c) => c.low));
      const max4h = Math.max(...updatedCandles.map((c) => c.high));
      const netChange = livePrice - updatedCandles[0].open;
      const netChangePct = updatedCandles[0].open > 0 ? (netChange / updatedCandles[0].open) * 100 : 0;

      return {
        ...cached.data,
        candles: updatedCandles,
        candle5m: updated5m,
        candle15m: updated15m,
        dailyCandle: updatedDaily,
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
      const urls1h = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=1h&limit=5`,
      ];

      const urls1d = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=1d&limit=2`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=1d&limit=2`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=1d&limit=2`,
      ];

      const urls5m = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=5m&limit=2`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=5m&limit=2`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=5m&limit=2`,
      ];

      const urls15m = [
        `https://fapi.binance.com/fapi/v1/klines?symbol=${cleanSymbol}&interval=15m&limit=2`,
        `https://api.binance.com/api/v3/klines?symbol=${cleanSymbol}&interval=15m&limit=2`,
        `https://data-api.binance.vision/api/v3/klines?symbol=${cleanSymbol}&interval=15m&limit=2`,
      ];

      let rawKlines: any[] | null = null;
      let raw1dKlines: any[] | null = null;
      let raw5mKlines: any[] | null = null;
      let raw15mKlines: any[] | null = null;

      // Fetch 1h klines
      for (const url of urls1h) {
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

      // Fetch 1d klines in background/fallback
      for (const urlD of urls1d) {
        try {
          const resD = await binanceFetch(urlD);
          if (resD && resD.ok) {
            const dData = await resD.json();
            if (Array.isArray(dData) && dData.length >= 1) {
              raw1dKlines = dData;
              break;
            }
          }
        } catch {
          // Continue
        }
      }

      // Fetch 5m klines
      for (const url5 of urls5m) {
        try {
          const res5 = await binanceFetch(url5);
          if (res5 && res5.ok) {
            const d5 = await res5.json();
            if (Array.isArray(d5) && d5.length >= 1) {
              raw5mKlines = d5;
              break;
            }
          }
        } catch {}
      }

      // Fetch 15m klines
      for (const url15 of urls15m) {
        try {
          const res15 = await binanceFetch(url15);
          if (res15 && res15.ok) {
            const d15 = await res15.json();
            if (Array.isArray(d15) && d15.length >= 1) {
              raw15mKlines = d15;
              break;
            }
          }
        } catch {}
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
        const label = hoursAgo === 0 ? '1h / Actual' : `Hace ${hoursAgo}h`;

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
          isDaily: false,
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

      // Daily candle processing
      let dailyCandle: HourlyCandle;
      if (raw1dKlines && raw1dKlines.length > 0) {
        const todayRaw = raw1dKlines[raw1dKlines.length - 1];
        const dOpenTime = Number(todayRaw[0]);
        const dCloseTime = Number(todayRaw[6]) || dOpenTime + 86400000;
        const dOpen = parseFloat(todayRaw[1]);
        let dHigh = parseFloat(todayRaw[2]);
        let dLow = parseFloat(todayRaw[3]);
        let dClose = parseFloat(todayRaw[4]);
        const dVolume = parseFloat(todayRaw[5]) || 0;

        if (livePrice && livePrice > 0) {
          dClose = livePrice;
          dHigh = Math.max(dHigh, livePrice);
          dLow = Math.min(dLow, livePrice);
        }

        const dChangePct = dOpen > 0 ? ((dClose - dOpen) / dOpen) * 100 : 0;

        dailyCandle = {
          openTime: dOpenTime,
          closeTime: dCloseTime,
          open: dOpen,
          high: dHigh,
          low: dLow,
          close: dClose,
          volume: dVolume,
          changePct: dChangePct,
          isBullish: dClose >= dOpen,
          label: 'Diario',
          shortHour: 'Hoy',
          isDaily: true,
        };
      } else {
        // Fallback daily candle based on 4h data
        const dOpen = startPrice * 0.995;
        const dClose = endPrice;
        dailyCandle = {
          openTime: now - 86400000,
          closeTime: now,
          open: dOpen,
          high: Math.max(max4h, dOpen, dClose) * 1.004,
          low: Math.min(min4h, dOpen, dClose) * 0.996,
          close: dClose,
          volume: 20000,
          changePct: dOpen > 0 ? ((dClose - dOpen) / dOpen) * 100 : 0,
          isBullish: dClose >= dOpen,
          label: 'Diario',
          shortHour: 'Hoy',
          isDaily: true,
        };
      }

      // 5M candle processing
      let candle5m: HourlyCandle;
      if (raw5mKlines && raw5mKlines.length > 0) {
        const raw5 = raw5mKlines[raw5mKlines.length - 1];
        const open5 = parseFloat(raw5[1]);
        let high5 = parseFloat(raw5[2]);
        let low5 = parseFloat(raw5[3]);
        let close5 = parseFloat(raw5[4]);
        if (livePrice && livePrice > 0) {
          close5 = livePrice;
          high5 = Math.max(high5, livePrice);
          low5 = Math.min(low5, livePrice);
        }
        candle5m = {
          openTime: Number(raw5[0]),
          closeTime: Number(raw5[6]) || Number(raw5[0]) + 300000,
          open: open5,
          high: high5,
          low: low5,
          close: close5,
          volume: parseFloat(raw5[5]) || 0,
          changePct: open5 > 0 ? ((close5 - open5) / open5) * 100 : 0,
          isBullish: close5 >= open5,
          label: '5M',
          shortHour: formatHour(Number(raw5[0])),
          isDaily: false,
        };
      } else {
        const pRef = livePrice && livePrice > 0 ? livePrice : endPrice;
        const o5 = pRef * (1 - 0.0015);
        candle5m = {
          openTime: now - 300000,
          closeTime: now,
          open: o5,
          high: Math.max(o5, pRef) * 1.001,
          low: Math.min(o5, pRef) * 0.999,
          close: pRef,
          volume: 2500,
          changePct: o5 > 0 ? ((pRef - o5) / o5) * 100 : 0,
          isBullish: pRef >= o5,
          label: '5M',
          shortHour: formatHour(now - 300000),
          isDaily: false,
        };
      }

      // 15M candle processing
      let candle15m: HourlyCandle;
      if (raw15mKlines && raw15mKlines.length > 0) {
        const raw15 = raw15mKlines[raw15mKlines.length - 1];
        const open15 = parseFloat(raw15[1]);
        let high15 = parseFloat(raw15[2]);
        let low15 = parseFloat(raw15[3]);
        let close15 = parseFloat(raw15[4]);
        if (livePrice && livePrice > 0) {
          close15 = livePrice;
          high15 = Math.max(high15, livePrice);
          low15 = Math.min(low15, livePrice);
        }
        candle15m = {
          openTime: Number(raw15[0]),
          closeTime: Number(raw15[6]) || Number(raw15[0]) + 900000,
          open: open15,
          high: high15,
          low: low15,
          close: close15,
          volume: parseFloat(raw15[5]) || 0,
          changePct: open15 > 0 ? ((close15 - open15) / open15) * 100 : 0,
          isBullish: close15 >= open15,
          label: '15M',
          shortHour: formatHour(Number(raw15[0])),
          isDaily: false,
        };
      } else {
        const pRef = livePrice && livePrice > 0 ? livePrice : endPrice;
        const o15 = pRef * (1 - 0.003);
        candle15m = {
          openTime: now - 900000,
          closeTime: now,
          open: o15,
          high: Math.max(o15, pRef) * 1.002,
          low: Math.min(o15, pRef) * 0.998,
          close: pRef,
          volume: 6800,
          changePct: o15 > 0 ? ((pRef - o15) / o15) * 100 : 0,
          isBullish: pRef >= o15,
          label: '15M',
          shortHour: formatHour(now - 900000),
          isDaily: false,
        };
      }

      const result: FourHourPriceMovement = {
        symbol: cleanSymbol,
        candles,
        candle5m,
        candle15m,
        dailyCandle,
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
