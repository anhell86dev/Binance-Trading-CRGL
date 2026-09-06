/**
 * Markets Service for Binance USDT-M Futures & TradFi Assets
 * Provides comprehensive listings, categorized TradFi (Metals, Forex/Fiats, RWA/Treasuries, Commodities),
 * 24h market metrics, and real-time live synchronization with Binance REST and WebSocket endpoints.
 */

import { binanceWs } from './binanceWs';
import { livePriceService } from './livePriceService';

export type MarketCategory =
  | 'all'
  | 'futures'
  | 'tradfi'
  | 'metals'
  | 'forex'
  | 'rwa'
  | 'gainers'
  | 'losers'
  | 'high_volume';

export type TradFiType =
  | 'metals_commodities'
  | 'forex_fiat'
  | 'rwa_treasury'
  | 'institutional_credit'
  | 'synthetic_tradfi';

export interface MarketPair {
  symbol: string;
  displayName: string;
  baseAsset: string;
  quoteAsset: string;
  category: 'futures' | 'tradfi' | 'both';
  tradFiType?: TradFiType;
  tradFiBadge?: string;
  tradFiDescription?: string;
  sectorTag: string;
  lastPrice: number;
  change24hPercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  quoteVolume24h: number;
  tradesCount: number;
  isFuturesContract: boolean;
  isTradFi: boolean;
  maxLeverageSafe: number;
  sparkline: number[];
  lastUpdated: number;
}

// Well-known categorized TradFi, Metals, Forex & RWA assets on Binance
export const TRADFI_CATALOG: Record<
  string,
  {
    displayName: string;
    type: TradFiType;
    badge: string;
    description: string;
    sector: string;
    defaultPrice: number;
    defaultChange: number;
    isFutures: boolean;
  }
> = {
  // --- METALES PRECIOSOS & COMMODITIES TRADFI ---
  PAXGUSDT: {
    displayName: 'PAX Gold (Oro Físico 1 oz LBMA)',
    type: 'metals_commodities',
    badge: 'ORO FÍSICO LBMA',
    description: '1 token = 1 onza troy de oro físico fino de 400 oz resguardado en bóvedas Brink en Londres.',
    sector: 'Commodities / Metales',
    defaultPrice: 2740.5,
    defaultChange: 0.85,
    isFutures: true,
  },
  XAUTUSDT: {
    displayName: 'Tether Gold (Oro Respaldado)',
    type: 'metals_commodities',
    badge: 'ORO TOKENIZADO',
    description: 'Oro digital respaldado físicamente en bóvedas suizas.',
    sector: 'Commodities / Metales',
    defaultPrice: 2738.0,
    defaultChange: 0.82,
    isFutures: false,
  },

  // --- FOREX & DIVISAS FIDUCIARIAS (FIAT CURRENCIES) ---
  EURUSDT: {
    displayName: 'Euro / Dólar Estadounidense (EUR/USD)',
    type: 'forex_fiat',
    badge: 'FOREX EUR',
    description: 'Par de divisa Forex fiduciaria europea respaldada vs USD.',
    sector: 'Forex / Divisas',
    defaultPrice: 1.085,
    defaultChange: 0.12,
    isFutures: true,
  },
  GBPUSDT: {
    displayName: 'Libra Esterlina / Dólar (GBP/USD)',
    type: 'forex_fiat',
    badge: 'FOREX GBP',
    description: 'Par Forex de la libra británica frente al dólar estadounidense.',
    sector: 'Forex / Divisas',
    defaultPrice: 1.295,
    defaultChange: 0.24,
    isFutures: true,
  },
  AUDUSDT: {
    displayName: 'Dólar Australiano / Dólar (AUD/USD)',
    type: 'forex_fiat',
    badge: 'FOREX AUD',
    description: 'Par Forex del dólar australiano en mercados globales.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.654,
    defaultChange: -0.15,
    isFutures: true,
  },
  BRLUSDT: {
    displayName: 'Real Brasileño / Dólar (BRL/USD)',
    type: 'forex_fiat',
    badge: 'FOREX BRL',
    description: 'Divisa fiduciaria del mercado emergente latinoamericano (Brasil).',
    sector: 'Forex / Divisas',
    defaultPrice: 0.174,
    defaultChange: -0.32,
    isFutures: false,
  },
  TRYUSDT: {
    displayName: 'Lira Turca / Dólar (TRY/USD)',
    type: 'forex_fiat',
    badge: 'FOREX TRY',
    description: 'Divisa de Turquía cotizada contra dólar estadounidense.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.029,
    defaultChange: -0.08,
    isFutures: false,
  },
  ARSUSDT: {
    displayName: 'Peso Argentino / Dólar (ARS/USD)',
    type: 'forex_fiat',
    badge: 'FOREX ARS',
    description: 'Moneda fiduciaria argentina contra dólar digital.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.00098,
    defaultChange: 0.05,
    isFutures: false,
  },
  MXNUSDT: {
    displayName: 'Peso Mexicano / Dólar (MXN/USD)',
    type: 'forex_fiat',
    badge: 'FOREX MXN',
    description: 'Moneda fiduciaria mexicana en mercados de cambio.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.049,
    defaultChange: 0.18,
    isFutures: false,
  },
  COPUSDT: {
    displayName: 'Peso Colombiano / Dólar (COP/USD)',
    type: 'forex_fiat',
    badge: 'FOREX COP',
    description: 'Moneda fiduciaria de Colombia vs USDT.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.00024,
    defaultChange: -0.1,
    isFutures: false,
  },
  USDCUSDT: {
    displayName: 'USD Coin / Tether (Dólar Institucional Circle)',
    type: 'forex_fiat',
    badge: 'INSTITUTIONAL USD',
    description: 'Dólar digital auditado respaldado por letras del tesoro de EE.UU. (BlackRock Circle Reserve Fund).',
    sector: 'Forex / Divisas',
    defaultPrice: 1.0001,
    defaultChange: 0.01,
    isFutures: true,
  },
  FDUSDUSDT: {
    displayName: 'First Digital USD / Tether',
    type: 'forex_fiat',
    badge: 'STABLE FIAT',
    description: 'Dólar fiduciario respaldado en reservas 1:1 custodiadas en Asia.',
    sector: 'Forex / Divisas',
    defaultPrice: 0.9998,
    defaultChange: -0.01,
    isFutures: true,
  },

  // --- RWA (REAL WORLD ASSETS) & TESORERÍA TRADFI ---
  ONDOUSDT: {
    displayName: 'Ondo Finance (Bonos del Tesoro EE.UU. OUSG)',
    type: 'rwa_treasury',
    badge: 'BONOS TESORO EE.UU.',
    description: 'Líder institucional en tokenización de deuda soberana y fondos del tesoro (US Short-Term Government Treasuries).',
    sector: 'RWA & Bonos TradFi',
    defaultPrice: 0.942,
    defaultChange: 4.8,
    isFutures: true,
  },
  OMUSDT: {
    displayName: 'MANTRA Chain (RWA Layer 1 Institucional)',
    type: 'rwa_treasury',
    badge: 'RWA REGULATORIO L1',
    description: 'Blockchain diseñada para cumplimiento de normativas de activos del mundo real con licencia VARA en Dubái.',
    sector: 'RWA & Bonos TradFi',
    defaultPrice: 4.15,
    defaultChange: 6.2,
    isFutures: true,
  },
  PENDLEUSDT: {
    displayName: 'Pendle Finance (Rendimiento Fijo & TradFi Yield)',
    type: 'rwa_treasury',
    badge: 'RENTA FIJA TRADFI',
    description: 'Mercado de rendimiento institucional que separa capital y cupones de bonos/tokens de liquidez TradFi.',
    sector: 'RWA & Bonos TradFi',
    defaultPrice: 5.48,
    defaultChange: 3.1,
    isFutures: true,
  },
  MKRUSDT: {
    displayName: 'Maker / Sky (T-Bills & Deuda TradFi)',
    type: 'rwa_treasury',
    badge: 'DEUDA SOBERANA T-BILLS',
    description: 'Protocolo respaldado por miles de millones en Letras del Tesoro de EE.UU. e instrumentos crediticios institucionales.',
    sector: 'RWA & Bonos TradFi',
    defaultPrice: 1980.0,
    defaultChange: 1.4,
    isFutures: true,
  },
  CFGUSDT: {
    displayName: 'Centrifuge (Crédito Estructurado & Facturas)',
    type: 'institutional_credit',
    badge: 'CRÉDITO ESTRUCTURADO',
    description: 'Pionero en financiamiento de facturas comerciales, hipotecas y préstamos corporativos en blockchain.',
    sector: 'RWA & Crédito Privado',
    defaultPrice: 0.46,
    defaultChange: 2.1,
    isFutures: false,
  },
  TRUUSDT: {
    displayName: 'TrueFi (Préstamos Corporativos sin Colateral)',
    type: 'institutional_credit',
    badge: 'PRÉSTAMOS INSTITUCIONALES',
    description: 'Infraestructura de crédito no garantizado para fondos y empresas TradFi.',
    sector: 'RWA & Crédito Privado',
    defaultPrice: 0.088,
    defaultChange: 1.9,
    isFutures: true,
  },
  LINKUSDT: {
    displayName: 'Chainlink CCIP (Conexión SWIFT & DTCC TradFi)',
    type: 'rwa_treasury',
    badge: 'INFRAESTRUCTURA SWIFT/DTCC',
    description: 'Estándar para liquidaciones transfronterizas entre bancos tradicionales (Euroclear, ANZ, DTCC, SWIFT) y blockchain.',
    sector: 'Infraestructura TradFi',
    defaultPrice: 17.85,
    defaultChange: 2.3,
    isFutures: true,
  },
  AVAXUSDT: {
    displayName: 'Avalanche Evergreen (Subnets Institucionales TradFi)',
    type: 'rwa_treasury',
    badge: 'INSTITUCIONAL CITI/JPMORGAN',
    description: 'Red utilizada por Citi, JPMorgan Onyx, WisdomTree y T. Rowe Price para tokenización de fondos y FX.',
    sector: 'Infraestructura TradFi',
    defaultPrice: 28.9,
    defaultChange: 1.7,
    isFutures: true,
  },
  POLYXUSDT: {
    displayName: 'Polymesh (Títulos Valores & Security Tokens)',
    type: 'rwa_treasury',
    badge: 'SECURITY TOKENS REGULADOS',
    description: 'Blockchain con verificación de identidad para emisión de acciones, bonos corporativos e instrumentos financieros.',
    sector: 'RWA & Títulos Valores',
    defaultPrice: 0.295,
    defaultChange: 3.4,
    isFutures: true,
  },
  MPLUSDT: {
    displayName: 'Maple Finance (Préstamos a Empresas TradFi)',
    type: 'institutional_credit',
    badge: 'CRÉDITO CORPORATIVO',
    description: 'Mercado de crédito corporativo para préstamos asegurados con pool managers institucionales.',
    sector: 'RWA & Crédito Privado',
    defaultPrice: 21.4,
    defaultChange: 4.1,
    isFutures: false,
  },
  GFIUSDT: {
    displayName: 'Goldfinch (Crédito para Mercados Emergentes)',
    type: 'institutional_credit',
    badge: 'CRÉDITO EMERGENTE',
    description: 'Protocolo de crédito descentralizado que financia negocios del mundo real en Latinoamérica, África y Asia.',
    sector: 'RWA & Crédito Privado',
    defaultPrice: 1.82,
    defaultChange: 0.9,
    isFutures: false,
  },
  INJUSDT: {
    displayName: 'Injective (Derivados Sintéticos TradFi & Forex)',
    type: 'synthetic_tradfi',
    badge: 'DERIVADOS SINTÉTICOS',
    description: 'Cadena de alta frecuencia para trading de índices bursátiles, Forex y futuros sintéticos.',
    sector: 'Derivados TradFi',
    defaultPrice: 24.6,
    defaultChange: 3.8,
    isFutures: true,
  },
  SNXUSDT: {
    displayName: 'Synthetix (Commodities & Acciones Sintéticas)',
    type: 'synthetic_tradfi',
    badge: 'SINTÉTICOS COMMODITIES',
    description: 'Protocolo para creación de activos sintéticos que replican el valor de oro, plata, monedas y materias primas.',
    sector: 'Derivados TradFi',
    defaultPrice: 1.76,
    defaultChange: 1.2,
    isFutures: true,
  },
  AEVOUSDT: {
    displayName: 'Aevo (Opciones & Estrategias Estructuradas TradFi)',
    type: 'synthetic_tradfi',
    badge: 'OPCIONES & DERIVADOS',
    description: 'Plataforma institucional de opciones y productos derivados estructurados.',
    sector: 'Derivados TradFi',
    defaultPrice: 0.44,
    defaultChange: 2.7,
    isFutures: true,
  },
};

// Common initial USDT futures pairs fallback
const INITIAL_FUTURES_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'SUIUSDT', 'XRPUSDT', 'DOGEUSDT', 'TAOUSDT',
  'ZECUSDT', 'ADAUSDT', 'AVAXUSDT', 'LINKUSDT', 'NEARUSDT', 'ONDOUSDT', 'PAXGUSDT', 'EURUSDT',
  'GBPUSDT', 'OMUSDT', 'PENDLEUSDT', 'MKRUSDT', 'TRUUSDT', 'POLYXUSDT', 'INJUSDT', 'SNXUSDT',
  'AEVOUSDT', 'DOTUSDT', 'MATICUSDT', 'ATOMUSDT', 'LTCUSDT', 'BCHUSDT', 'APTUSDT', 'FETUSDT',
  'PEPEUSDT', 'SHIBUSDT', 'WIFUSDT', 'ARBUSDT', 'OPUSDT', 'TIAUSDT', 'SEIUSDT', 'RNDRUSDT',
  'ICPUSDT', 'FILUSDT', 'XLMUSDT', 'UNIUSDT', 'KASUSDT', 'POPCATUSDT', 'BONKUSDT', 'FLOKIUSDT',
  'ENAUSDT', 'WLDUSDT', 'ORDIUSDT', 'STXUSDT', 'IMXUSDT', 'JUPUSDT', 'PYTHUSDT', 'STRKUSDT',
];

class MarketsService {
  private pairs: Map<string, MarketPair> = new Map();
  private listeners: Set<() => void> = new Set();
  private isFetching: boolean = false;
  private pollingTimer: any = null;
  private lastFetchTime: number = 0;

  constructor() {
    this.initializeCatalog();
    this.fetchLiveMarkets();

    // Regular polling every 5 seconds for live real-time tickers
    this.pollingTimer = setInterval(() => {
      this.fetchLiveMarkets();
    }, 5000);

    // Sync when livePriceService emits updates
    livePriceService.subscribe(() => {
      this.syncWithLivePrices();
    });
  }

  private initializeCatalog() {
    // 1. Load TradFi catalog
    Object.entries(TRADFI_CATALOG).forEach(([symbol, info]) => {
      const baseAsset = symbol.replace(/(USDT|USD|BTC|ETH)$/, '');
      const quoteAsset = symbol.slice(baseAsset.length);
      const isFutures = info.isFutures;

      this.pairs.set(symbol, {
        symbol,
        displayName: info.displayName,
        baseAsset,
        quoteAsset,
        category: isFutures ? 'both' : 'tradfi',
        tradFiType: info.type,
        tradFiBadge: info.badge,
        tradFiDescription: info.description,
        sectorTag: info.sector,
        lastPrice: info.defaultPrice,
        change24hPercent: info.defaultChange,
        high24h: info.defaultPrice * 1.025,
        low24h: info.defaultPrice * 0.975,
        volume24h: 1540000,
        quoteVolume24h: 1540000 * info.defaultPrice,
        tradesCount: 18450,
        isFuturesContract: isFutures,
        isTradFi: true,
        maxLeverageSafe: 5,
        sparkline: this.generateSparkline(info.defaultPrice, info.defaultChange),
        lastUpdated: Date.now(),
      });
    });

    // 2. Load Top crypto futures pairs
    INITIAL_FUTURES_PAIRS.forEach((symbol) => {
      if (!this.pairs.has(symbol)) {
        const baseAsset = symbol.replace('USDT', '');
        const pData = livePriceService.getPriceData(symbol);
        const price = pData.price > 0 ? pData.price : 10.0;
        const change = pData.change24hPercent || 1.5;

        this.pairs.set(symbol, {
          symbol,
          displayName: `${baseAsset} / Tether Perpetual`,
          baseAsset,
          quoteAsset: 'USDT',
          category: 'futures',
          sectorTag: 'Cripto Futuros USDT-M',
          lastPrice: price,
          change24hPercent: change,
          high24h: price * (1 + Math.abs(change) * 0.01 + 0.01),
          low24h: price * (1 - Math.abs(change) * 0.01 - 0.01),
          volume24h: 850000,
          quoteVolume24h: 850000 * price,
          tradesCount: 32000,
          isFuturesContract: true,
          isTradFi: false,
          maxLeverageSafe: 5,
          sparkline: this.generateSparkline(price, change),
          lastUpdated: Date.now(),
        });
      }
    });
  }

  private generateSparkline(currentPrice: number, changePercent: number): number[] {
    const points: number[] = [];
    const count = 12;
    const startFactor = 1 - (changePercent / 100);
    const startPrice = currentPrice * startFactor;

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      const trend = startPrice + (currentPrice - startPrice) * progress;
      const noise = (Math.sin(i * 1.5) * 0.008) * currentPrice;
      points.push(Number((trend + noise).toFixed(4)));
    }
    return points;
  }

  public async fetchLiveMarkets() {
    if (this.isFetching) return;
    this.isFetching = true;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      // Fetch all 24hr tickers from Binance Futures REST API
      const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          let modified = false;

          data.forEach((item: any) => {
            if (!item || !item.symbol) return;
            const sym = item.symbol.toUpperCase();
            const lastPrice = parseFloat(item.lastPrice || '0');
            const changePercent = parseFloat(item.priceChangePercent || '0');
            const high24h = parseFloat(item.highPrice || '0');
            const low24h = parseFloat(item.lowPrice || '0');
            const volume24h = parseFloat(item.volume || '0');
            const quoteVolume24h = parseFloat(item.quoteVolume || '0');
            const tradesCount = parseInt(item.count || '0', 10);

            if (isNaN(lastPrice) || lastPrice <= 0) return;

            const existing = this.pairs.get(sym);
            if (existing) {
              existing.lastPrice = lastPrice;
              existing.change24hPercent = isNaN(changePercent) ? 0 : changePercent;
              existing.high24h = high24h > 0 ? high24h : lastPrice * 1.02;
              existing.low24h = low24h > 0 ? low24h : lastPrice * 0.98;
              existing.volume24h = volume24h;
              existing.quoteVolume24h = quoteVolume24h;
              existing.tradesCount = tradesCount;
              existing.isFuturesContract = true;
              existing.lastUpdated = Date.now();
              existing.sparkline = this.generateSparkline(lastPrice, changePercent);
              modified = true;
            } else if (sym.endsWith('USDT')) {
              // Add newly discovered USDT-M futures contract
              const baseAsset = sym.replace('USDT', '');
              const isTradFi = sym in TRADFI_CATALOG;
              const tradFiInfo = TRADFI_CATALOG[sym];

              this.pairs.set(sym, {
                symbol: sym,
                displayName: tradFiInfo ? tradFiInfo.displayName : `${baseAsset} / USDT Perpetual`,
                baseAsset,
                quoteAsset: 'USDT',
                category: isTradFi ? 'both' : 'futures',
                tradFiType: tradFiInfo?.type,
                tradFiBadge: tradFiInfo?.badge,
                tradFiDescription: tradFiInfo?.description,
                sectorTag: tradFiInfo ? tradFiInfo.sector : 'Cripto Futuros USDT-M',
                lastPrice,
                change24hPercent: isNaN(changePercent) ? 0 : changePercent,
                high24h: high24h > 0 ? high24h : lastPrice * 1.02,
                low24h: low24h > 0 ? low24h : lastPrice * 0.98,
                volume24h,
                quoteVolume24h,
                tradesCount,
                isFuturesContract: true,
                isTradFi,
                maxLeverageSafe: 5,
                sparkline: this.generateSparkline(lastPrice, changePercent),
                lastUpdated: Date.now(),
              });
              modified = true;
            }
          });

          this.lastFetchTime = Date.now();
          if (modified) {
            this.notify();
          }
        }
      }
    } catch {
      // Offline fallback: micro-variation to spark activity
      this.syncWithLivePrices();
    } finally {
      this.isFetching = false;
    }
  }

  private syncWithLivePrices() {
    let changed = false;
    this.pairs.forEach((pair) => {
      const live = livePriceService.getPrice(pair.symbol);
      if (live > 0 && Math.abs(live - pair.lastPrice) > 0.000001) {
        pair.lastPrice = live;
        pair.lastUpdated = Date.now();
        changed = true;
      }
    });
    if (changed) {
      this.notify();
    }
  }

  public getAllPairs(): MarketPair[] {
    return Array.from(this.pairs.values());
  }

  public getPair(symbol: string): MarketPair | undefined {
    return this.pairs.get(symbol.toUpperCase());
  }

  public getFilteredPairs(options: {
    category: MarketCategory;
    searchQuery: string;
    sortBy: 'volume_desc' | 'volume_asc' | 'change_desc' | 'change_asc' | 'price_desc' | 'price_asc' | 'name_asc';
  }): MarketPair[] {
    let list = Array.from(this.pairs.values());

    // 1. Filter by category
    switch (options.category) {
      case 'futures':
        list = list.filter((p) => p.isFuturesContract);
        break;
      case 'tradfi':
        list = list.filter((p) => p.isTradFi);
        break;
      case 'metals':
        list = list.filter((p) => p.tradFiType === 'metals_commodities');
        break;
      case 'forex':
        list = list.filter((p) => p.tradFiType === 'forex_fiat');
        break;
      case 'rwa':
        list = list.filter(
          (p) =>
            p.tradFiType === 'rwa_treasury' ||
            p.tradFiType === 'institutional_credit' ||
            p.tradFiType === 'synthetic_tradfi'
        );
        break;
      case 'gainers':
        list = list.filter((p) => p.change24hPercent > 0);
        break;
      case 'losers':
        list = list.filter((p) => p.change24hPercent < 0);
        break;
      case 'high_volume':
        list = list.filter((p) => p.quoteVolume24h > 10000000);
        break;
      case 'all':
      default:
        break;
    }

    // 2. Search query filter
    if (options.searchQuery.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.displayName.toLowerCase().includes(q) ||
          p.baseAsset.toLowerCase().includes(q) ||
          p.sectorTag.toLowerCase().includes(q) ||
          (p.tradFiBadge && p.tradFiBadge.toLowerCase().includes(q)) ||
          (p.tradFiDescription && p.tradFiDescription.toLowerCase().includes(q))
      );
    }

    // 3. Sorting
    list.sort((a, b) => {
      switch (options.sortBy) {
        case 'volume_desc':
          return (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0);
        case 'volume_asc':
          return (a.quoteVolume24h || 0) - (b.quoteVolume24h || 0);
        case 'change_desc':
          return (b.change24hPercent || 0) - (a.change24hPercent || 0);
        case 'change_asc':
          return (a.change24hPercent || 0) - (b.change24hPercent || 0);
        case 'price_desc':
          return (b.lastPrice || 0) - (a.lastPrice || 0);
        case 'price_asc':
          return (a.lastPrice || 0) - (b.lastPrice || 0);
        case 'name_asc':
          return a.symbol.localeCompare(b.symbol);
        default:
          return (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0);
      }
    });

    return list;
  }

  public getMarketSummary() {
    const all = Array.from(this.pairs.values());
    const futuresCount = all.filter((p) => p.isFuturesContract).length;
    const tradFiCount = all.filter((p) => p.isTradFi).length;
    const metalsCount = all.filter((p) => p.tradFiType === 'metals_commodities').length;
    const forexCount = all.filter((p) => p.tradFiType === 'forex_fiat').length;
    const rwaCount = all.filter(
      (p) =>
        p.tradFiType === 'rwa_treasury' ||
        p.tradFiType === 'institutional_credit' ||
        p.tradFiType === 'synthetic_tradfi'
    ).length;

    const totalVolumeUsdt = all.reduce((sum, p) => sum + (p.quoteVolume24h || 0), 0);

    const sortedByGain = [...all].sort((a, b) => b.change24hPercent - a.change24hPercent);
    const topGainer = sortedByGain[0] || null;
    const topLoser = sortedByGain[sortedByGain.length - 1] || null;

    return {
      totalPairs: all.length,
      futuresCount,
      tradFiCount,
      metalsCount,
      forexCount,
      rwaCount,
      totalVolumeUsdt,
      topGainer,
      topLoser,
      lastFetchTime: this.lastFetchTime,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.error('Error in MarketsService listener', e);
      }
    });
  }
}

export const marketsService = new MarketsService();
