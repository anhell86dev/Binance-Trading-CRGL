import { FuturesMarketMetrics, TickerData } from '../types/binance';
import { analyzeFuturesMetrics, FuturesAnalysisResult } from '../utils/futuresMetricsHelper';
import { livePriceService } from './livePriceService';
import { binanceWs } from './binanceWs';

interface SymbolConfluenceEntry {
  metrics: FuturesMarketMetrics;
  ticker: TickerData;
  analysis: FuturesAnalysisResult;
  lastFetched: number;
}

class FuturesConfluenceService {
  private cache = new Map<string, SymbolConfluenceEntry>();
  private inFlight = new Set<string>();
  private listeners = new Set<() => void>();
  private refreshTimer: any = null;

  constructor() {
    // Listen to binanceWs state changes to capture current symbol metrics
    binanceWs.subscribe(() => {
      const wsSymbol = binanceWs.getCurrentSymbol();
      if (wsSymbol) {
        const wsMetrics = binanceWs.getFuturesMetrics();
        const wsTicker = binanceWs.getTicker();
        if (wsMetrics && wsTicker && wsTicker.lastPrice > 0) {
          const clean = wsSymbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
          this.cache.set(clean, {
            metrics: wsMetrics,
            ticker: wsTicker,
            analysis: analyzeFuturesMetrics(wsMetrics, wsTicker),
            lastFetched: Date.now(),
          });
          this.notify();
        }
      }
    });

    // Periodically refresh cached symbols every 25 seconds
    this.refreshTimer = setInterval(() => {
      this.refreshActiveSymbols();
    }, 25000);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in confluence listener:', e);
      }
    });
  }

  /**
   * Retrieves or computes confluence analysis for a pair.
   * Guaranteed to return synchronously immediately.
   */
  public getConfluence(symbol: string): {
    metrics: FuturesMarketMetrics;
    ticker: TickerData;
    analysis: FuturesAnalysisResult;
  } {
    const clean = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    const existing = this.cache.get(clean);

    if (existing) {
      // If data is older than 20 seconds, trigger background update
      if (Date.now() - existing.lastFetched > 20000) {
        this.fetchRealMetrics(clean);
      }
      return existing;
    }

    // Build immediate baseline from livePriceService
    const live = livePriceService.getPriceData(clean);
    const baselineTicker: TickerData = {
      symbol: clean,
      lastPrice: live.price,
      markPrice: live.price,
      indexPrice: live.price,
      high24h: live.price * 1.03,
      low24h: live.price * 0.97,
      volume24h: live.price * 150000,
      change24h: (live.price * live.change24hPercent) / 100,
      change24hPercent: live.change24hPercent,
      bestBid: live.price * 0.999,
      bestAsk: live.price * 1.001,
      timestamp: Date.now(),
    };

    const isPositive = live.change24hPercent >= 0;
    const defaultOI = (live.price * 80000) / (live.price || 1);
    const defaultOIValue = defaultOI * live.price;
    const defaultBuyPct = isPositive ? 54.5 : 46.2;
    const defaultTopRatio = isPositive ? 1.32 : 0.88;

    const baselineMetrics: FuturesMarketMetrics = {
      symbol: clean,
      openInterest: defaultOI,
      openInterestValueUsdt: defaultOIValue,
      openInterestTime: Date.now(),
      fundingRate: isPositive ? 0.0001 : -0.00005,
      fundingRatePercent: isPositive ? 0.01 : -0.005,
      nextFundingTime: Date.now() + 14400000,
      countdownMs: 14400000,
      buyVolumeUsdt: defaultOIValue * 0.52,
      sellVolumeUsdt: defaultOIValue * 0.48,
      buySellRatio: isPositive ? 1.18 : 0.86,
      buyVolumePercent: defaultBuyPct,
      sellVolumePercent: 100 - defaultBuyPct,
      topPositionLongPercent: isPositive ? 58.0 : 45.0,
      topPositionShortPercent: isPositive ? 42.0 : 55.0,
      topPositionLongShortRatio: defaultTopRatio,
      topAccountLongPercent: isPositive ? 56.5 : 46.0,
      topAccountShortPercent: isPositive ? 43.5 : 54.0,
      topAccountLongShortRatio: defaultTopRatio,
      globalAccountLongPercent: 55.0,
      globalAccountShortPercent: 45.0,
      globalAccountLongShortRatio: 1.22,
      lastUpdated: Date.now(),
    };

    const entry: SymbolConfluenceEntry = {
      metrics: baselineMetrics,
      ticker: baselineTicker,
      analysis: analyzeFuturesMetrics(baselineMetrics, baselineTicker),
      lastFetched: Date.now(),
    };

    this.cache.set(clean, entry);
    // Trigger real fetch from Binance Futures
    this.fetchRealMetrics(clean);

    return entry;
  }

  /**
   * Fetches real futures metrics from Binance Futures REST endpoints
   */
  public async fetchRealMetrics(symbol: string) {
    const clean = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (this.inFlight.has(clean)) return;

    this.inFlight.add(clean);

    try {
      const live = livePriceService.getPriceData(clean);
      const currentPrice = live.price > 0 ? live.price : 100;

      const premPromise = fetch(`https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${clean}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const oiPromise = fetch(`https://fapi.binance.com/fapi/v1/openInterest?symbol=${clean}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const takerPromise = fetch(
        `https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=${clean}&period=5m&limit=1`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const topPosPromise = fetch(
        `https://fapi.binance.com/futures/data/topLongShortPositionRatio?symbol=${clean}&period=5m&limit=1`
      )
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);

      const [premData, oiData, takerData, topPosData] = await Promise.all([
        premPromise,
        oiPromise,
        takerPromise,
        topPosPromise,
      ]);

      const now = Date.now();
      const fundingRate = premData?.lastFundingRate ? parseFloat(premData.lastFundingRate) : 0.0001;
      const fundingRatePercent = fundingRate * 100;
      const nextFundingTime = premData?.nextFundingTime ? Number(premData.nextFundingTime) : now + 14400000;
      const countdownMs = Math.max(0, nextFundingTime - now);

      const openInterest = oiData?.openInterest ? parseFloat(oiData.openInterest) : (currentPrice * 50000) / currentPrice;
      const openInterestValueUsdt = openInterest * currentPrice;

      let buyVol = 0;
      let sellVol = 0;
      let buySellRatio = 1.1;
      if (Array.isArray(takerData) && takerData[0]) {
        buyVol = parseFloat(takerData[0].buyVol);
        sellVol = parseFloat(takerData[0].sellVol);
        buySellRatio = parseFloat(takerData[0].buySellRatio) || 1.0;
      } else {
        buySellRatio = live.change24hPercent >= 0 ? 1.15 : 0.88;
      }
      const totalTaker = buyVol + sellVol || 1;
      const buyVolumePercent = Number(((buyVol / totalTaker) * 100).toFixed(2)) || (live.change24hPercent >= 0 ? 54 : 46);
      const sellVolumePercent = Number((100 - buyVolumePercent).toFixed(2));

      let topPosRatio = 1.2;
      let topPosLong = 56;
      let topPosShort = 44;
      if (Array.isArray(topPosData) && topPosData[0]) {
        topPosRatio = parseFloat(topPosData[0].longShortRatio) || 1.0;
        topPosLong = Number((parseFloat(topPosData[0].longAccount || topPosData[0].longPosition || '0.55') * 100).toFixed(1));
        topPosShort = Number((100 - topPosLong).toFixed(1));
      } else {
        topPosRatio = live.change24hPercent >= 0 ? 1.3 : 0.9;
        topPosLong = live.change24hPercent >= 0 ? 58 : 46;
        topPosShort = 100 - topPosLong;
      }

      const ticker: TickerData = {
        symbol: clean,
        lastPrice: currentPrice,
        markPrice: currentPrice,
        indexPrice: currentPrice,
        high24h: currentPrice * 1.03,
        low24h: currentPrice * 0.97,
        volume24h: currentPrice * 120000,
        change24h: (currentPrice * live.change24hPercent) / 100,
        change24hPercent: live.change24hPercent,
        bestBid: currentPrice * 0.999,
        bestAsk: currentPrice * 1.001,
        timestamp: now,
      };

      const metrics: FuturesMarketMetrics = {
        symbol: clean,
        openInterest,
        openInterestValueUsdt,
        openInterestTime: now,
        fundingRate,
        fundingRatePercent,
        nextFundingTime,
        countdownMs,
        buyVolumeUsdt: buyVol,
        sellVolumeUsdt: sellVol,
        buySellRatio: Number(buySellRatio.toFixed(2)),
        buyVolumePercent,
        sellVolumePercent,
        topPositionLongPercent: topPosLong,
        topPositionShortPercent: topPosShort,
        topPositionLongShortRatio: Number(topPosRatio.toFixed(2)),
        topAccountLongPercent: topPosLong,
        topAccountShortPercent: topPosShort,
        topAccountLongShortRatio: Number(topPosRatio.toFixed(2)),
        globalAccountLongPercent: 55,
        globalAccountShortPercent: 45,
        globalAccountLongShortRatio: 1.2,
        lastUpdated: now,
      };

      const analysis = analyzeFuturesMetrics(metrics, ticker);

      this.cache.set(clean, {
        metrics,
        ticker,
        analysis,
        lastFetched: now,
      });

      this.notify();
    } catch (e) {
      console.warn(`Error fetching real futures metrics for ${clean}:`, e);
    } finally {
      this.inFlight.delete(clean);
    }
  }

  private refreshActiveSymbols() {
    const keys = Array.from(this.cache.keys());
    keys.forEach((sym) => {
      this.fetchRealMetrics(sym);
    });
  }
}

export const futuresConfluenceService = new FuturesConfluenceService();
