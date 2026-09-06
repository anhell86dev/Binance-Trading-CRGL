/**
 * Markets Service for Binance USDT-M Futures & TradFi Assets
 * Provides comprehensive listings, categorized TradFi (Metals, Forex/Fiats, RWA/Treasuries, Commodities),
 * 24h market metrics, and real-time live synchronization with Binance REST and WebSocket endpoints.
 */

import { binanceWs } from './binanceWs';
import { livePriceService } from './livePriceService';

export type MarketCategory =
  | 'all'
  | 'best_trading'
  | 'futures'
  | 'scalping'
  | 'swing_safe'
  | 'tradfi'
  | 'metals'
  | 'forex'
  | 'rwa'
  | 'high_liquidity'
  | 'high_volatility'
  | 'gainers'
  | 'losers';

export type TradFiType =
  | 'metals_commodities'
  | 'forex_fiat'
  | 'rwa_treasury'
  | 'institutional_credit'
  | 'synthetic_tradfi';

export type LiquidityTier = 'ultra' | 'high' | 'medium' | 'low';
export type VolatilityTier = 'low' | 'moderate' | 'high' | 'extreme';
export type TradeabilityRating = 'optimal' | 'good' | 'moderate' | 'caution';
export type ExecutionSpeed = 'instant' | 'fast' | 'moderate' | 'caution';

export type MarketSortOption =
  | 'tradeability_desc'
  | 'liquidity_desc'
  | 'volatility_desc'
  | 'volatility_asc'
  | 'volume_desc'
  | 'volume_asc'
  | 'change_desc'
  | 'change_asc'
  | 'price_desc'
  | 'price_asc'
  | 'name_asc';

export interface MarketFilterOptions {
  category: MarketCategory;
  searchQuery: string;
  sortBy: MarketSortOption;
  minLiquidityTier?: LiquidityTier | 'all';
  volatilityTierFilter?: VolatilityTier | 'all' | 'moderate_high';
  fastExecutionOnly?: boolean;
  minTradeabilityScore?: number;
}

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

  // --- LIQUIDITY METRICS ---
  liquidityTier: LiquidityTier;
  liquidityScore: number; // 0 - 100
  liquidityLabel: string;
  estimatedSlippage: string; // e.g. "< 0.01%", "< 0.05%", "~ 0.20%"
  executionSpeed: ExecutionSpeed;
  executionLabel: string;

  // --- VOLATILITY METRICS ---
  volatilityPercent24h: number; // 24h High/Low amplitude %
  volatilityTier: VolatilityTier;
  volatilityScore: number; // 0 - 100
  volatilityLabel: string;

  // --- TRADING SUITABILITY (ALTA LIQUIDEZ + VOLATILIDAD MODERADA/ALTA) ---
  tradeabilityScore: number; // 0 - 100
  tradeabilityRating: TradeabilityRating;
  tradeabilityLabel: string;
  isIdealForTrading: boolean; // True if high/ultra liquidity + moderate/high volatility
  tradingAdvantage: string; // e.g. "Entrada y salida instantánea, excelente recorrido intradía"
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

  public static calculateMetrics(data: {
    lastPrice: number;
    change24hPercent: number;
    high24h: number;
    low24h: number;
    quoteVolume24h: number;
    tradesCount?: number;
    isFuturesContract?: boolean;
  }) {
    const quoteVolume = data.quoteVolume24h || 0;
    const price = data.lastPrice || 1;
    const high = data.high24h > 0 ? data.high24h : price * 1.02;
    const low = data.low24h > 0 ? data.low24h : price * 0.98;

    // 1. LIQUIDITY CALCULATION
    // Tier 1: > $500M USDT (Ultra Alta - Mega Cap)
    // Tier 2: $100M - $500M USDT (Alta - Scalping y Day Trading ideal)
    // Tier 3: $20M - $100M USDT (Media - Aceptable)
    // Tier 4: < $20M USDT (Baja - Peligro Slippage)
    let liquidityTier: LiquidityTier = 'low';
    let liquidityLabel = 'Baja Liquidez';
    let estimatedSlippage = '> 0.25% (Riesgo)';
    let executionSpeed: ExecutionSpeed = 'caution';
    let executionLabel = 'Precaución Slippage';
    let liquidityScore = 20;

    if (quoteVolume >= 500_000_000) {
      liquidityTier = 'ultra';
      liquidityLabel = 'Ultra Alta (Tier 1)';
      estimatedSlippage = '< 0.01%';
      executionSpeed = 'instant';
      executionLabel = 'Instantánea (< 0.01s)';
      liquidityScore = 95 + Math.min(5, (quoteVolume - 500_000_000) / 1_000_000_000);
    } else if (quoteVolume >= 100_000_000) {
      liquidityTier = 'high';
      liquidityLabel = 'Alta (Tier 2)';
      estimatedSlippage = '< 0.04%';
      executionSpeed = 'fast';
      executionLabel = 'Muy Rápida (< 0.05s)';
      liquidityScore = 80 + ((quoteVolume - 100_000_000) / 400_000_000) * 15;
    } else if (quoteVolume >= 20_000_000) {
      liquidityTier = 'medium';
      liquidityLabel = 'Media (Tier 3)';
      estimatedSlippage = '~ 0.10%';
      executionSpeed = 'moderate';
      executionLabel = 'Moderada';
      liquidityScore = 55 + ((quoteVolume - 20_000_000) / 80_000_000) * 24;
    } else {
      liquidityTier = 'low';
      liquidityLabel = 'Baja (Tier 4)';
      estimatedSlippage = '> 0.25%';
      executionSpeed = 'caution';
      executionLabel = 'Peligro Slippage';
      liquidityScore = Math.max(10, Math.min(50, (quoteVolume / 20_000_000) * 50));
    }

    // 2. VOLATILITY CALCULATION (24h Amplitude %)
    let volatilityPercent24h = 0;
    if (low > 0 && high >= low) {
      volatilityPercent24h = ((high - low) / low) * 100;
    } else {
      volatilityPercent24h = Math.abs(data.change24hPercent) * 1.4;
    }
    volatilityPercent24h = Number(volatilityPercent24h.toFixed(2));

    let volatilityTier: VolatilityTier = 'moderate';
    let volatilityLabel = 'Moderada';
    let volatilityScore = 50;

    if (volatilityPercent24h >= 15.0) {
      volatilityTier = 'extreme';
      volatilityLabel = 'Extrema (> 15%)';
      volatilityScore = 95;
    } else if (volatilityPercent24h >= 7.0) {
      volatilityTier = 'high';
      volatilityLabel = 'Alta (7% - 15%)';
      volatilityScore = 80 + ((volatilityPercent24h - 7) / 8) * 15;
    } else if (volatilityPercent24h >= 3.0) {
      volatilityTier = 'moderate';
      volatilityLabel = 'Moderada (3% - 7%)';
      volatilityScore = 55 + ((volatilityPercent24h - 3) / 4) * 24;
    } else {
      volatilityTier = 'low';
      volatilityLabel = 'Baja (< 3%)';
      volatilityScore = Math.max(15, (volatilityPercent24h / 3) * 50);
    }

    // 3. TRADING SUITABILITY SCORE (0 - 100)
    // "Para hacer trading, se deben operar criptomonedas con alta liquidez y volatilidad moderada o alta que faciliten la entrada y salida rápida de posiciones."
    // - High Liquidity component (Weight: 55%)
    // - Ideal Volatility component (Weight: 45%): optimal between 4% and 12% amplitude
    let volFitScore = 50;
    if (volatilityPercent24h >= 4.0 && volatilityPercent24h <= 12.0) {
      volFitScore = 100; // Perfect sweet spot!
    } else if (volatilityPercent24h > 12.0 && volatilityPercent24h <= 18.0) {
      volFitScore = 85; // High momentum, manageable risk
    } else if (volatilityPercent24h > 18.0) {
      volFitScore = 65; // Dangerous spikes
    } else if (volatilityPercent24h >= 2.5 && volatilityPercent24h < 4.0) {
      volFitScore = 75; // Decent for swing
    } else {
      volFitScore = 35; // Too sluggish for active trading
    }

    const tradeabilityScore = Math.round(liquidityScore * 0.55 + volFitScore * 0.45);

    let tradeabilityRating: TradeabilityRating = 'moderate';
    let tradeabilityLabel = 'Regular';
    let isIdealForTrading = false;
    let tradingAdvantage = 'Posición estándar con volatilidad controlada';

    if (
      tradeabilityScore >= 78 &&
      (liquidityTier === 'ultra' || liquidityTier === 'high') &&
      (volatilityTier === 'moderate' || volatilityTier === 'high' || volatilityTier === 'extreme')
    ) {
      tradeabilityRating = 'optimal';
      tradeabilityLabel = 'Óptimo para Trading';
      isIdealForTrading = true;
      tradingAdvantage = '🔥 Máxima liquidez con excelente recorrido. Entrada y salida ultra rápida sin slippage.';
    } else if (tradeabilityScore >= 65 && liquidityTier !== 'low') {
      tradeabilityRating = 'good';
      tradeabilityLabel = 'Bueno para Trading';
      isIdealForTrading = true;
      tradingAdvantage = '⚡ Buena profundidad y volatilidad propicia para capturar movimientos intradía.';
    } else if (tradeabilityScore >= 50) {
      tradeabilityRating = 'moderate';
      tradeabilityLabel = 'Moderado / Swing';
      isIdealForTrading = false;
      tradingAdvantage = '🛡️ Movimientos lentos o liquidez media. Adecuado para swing trading de mayor plazo.';
    } else {
      tradeabilityRating = 'caution';
      tradeabilityLabel = 'Precaución (Baja Liquidez)';
      isIdealForTrading = false;
      tradingAdvantage = '⚠️ Riesgo de deslizamiento (slippage) al entrar o salir rápidamente de la posición.';
    }

    return {
      liquidityTier,
      liquidityScore: Math.round(liquidityScore),
      liquidityLabel,
      estimatedSlippage,
      executionSpeed,
      executionLabel,
      volatilityPercent24h,
      volatilityTier,
      volatilityScore: Math.round(volatilityScore),
      volatilityLabel,
      tradeabilityScore,
      tradeabilityRating,
      tradeabilityLabel,
      isIdealForTrading,
      tradingAdvantage,
    };
  }

  private initializeCatalog() {
    // 1. Load TradFi catalog
    Object.entries(TRADFI_CATALOG).forEach(([symbol, info]) => {
      const baseAsset = symbol.replace(/(USDT|USD|BTC|ETH)$/, '');
      const quoteAsset = symbol.slice(baseAsset.length);
      const isFutures = info.isFutures;
      const defaultPrice = info.defaultPrice;
      const defaultChange = info.defaultChange;
      const high24h = defaultPrice * 1.025;
      const low24h = defaultPrice * 0.975;
      const volume24h = 1540000;
      const quoteVolume24h = 1540000 * defaultPrice;

      const metrics = MarketsService.calculateMetrics({
        lastPrice: defaultPrice,
        change24hPercent: defaultChange,
        high24h,
        low24h,
        quoteVolume24h,
        tradesCount: 18450,
        isFuturesContract: isFutures,
      });

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
        lastPrice: defaultPrice,
        change24hPercent: defaultChange,
        high24h,
        low24h,
        volume24h,
        quoteVolume24h,
        tradesCount: 18450,
        isFuturesContract: isFutures,
        isTradFi: true,
        maxLeverageSafe: 5,
        sparkline: this.generateSparkline(info.defaultPrice, info.defaultChange),
        lastUpdated: Date.now(),
        ...metrics,
      });
    });

    // 2. Load Top crypto futures pairs
    INITIAL_FUTURES_PAIRS.forEach((symbol) => {
      if (!this.pairs.has(symbol)) {
        const baseAsset = symbol.replace('USDT', '');
        const pData = livePriceService.getPriceData(symbol);
        const price = pData.price > 0 ? pData.price : 10.0;
        const change = pData.change24hPercent || 1.5;
        const high24h = price * (1 + Math.abs(change) * 0.01 + 0.02);
        const low24h = price * (1 - Math.abs(change) * 0.01 - 0.02);
        const isMega = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'].includes(symbol);
        const quoteVolume24h = isMega ? 850_000_000 : 120_000_000;
        const volume24h = quoteVolume24h / price;

        const metrics = MarketsService.calculateMetrics({
          lastPrice: price,
          change24hPercent: change,
          high24h,
          low24h,
          quoteVolume24h,
          tradesCount: 45000,
          isFuturesContract: true,
        });

        this.pairs.set(symbol, {
          symbol,
          displayName: `${baseAsset} / Tether Perpetual`,
          baseAsset,
          quoteAsset: 'USDT',
          category: 'futures',
          sectorTag: 'Cripto Futuros USDT-M',
          lastPrice: price,
          change24hPercent: change,
          high24h,
          low24h,
          volume24h,
          quoteVolume24h,
          tradesCount: 45000,
          isFuturesContract: true,
          isTradFi: false,
          maxLeverageSafe: 5,
          sparkline: this.generateSparkline(price, change),
          lastUpdated: Date.now(),
          ...metrics,
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
            const isFutures = true;

            const metrics = MarketsService.calculateMetrics({
              lastPrice,
              change24hPercent: isNaN(changePercent) ? 0 : changePercent,
              high24h: high24h > 0 ? high24h : lastPrice * 1.02,
              low24h: low24h > 0 ? low24h : lastPrice * 0.98,
              quoteVolume24h,
              tradesCount,
              isFuturesContract: isFutures,
            });

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

              // Apply updated metrics
              Object.assign(existing, metrics);
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
                ...metrics,
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
        const metrics = MarketsService.calculateMetrics({
          lastPrice: live,
          change24hPercent: pair.change24hPercent,
          high24h: Math.max(pair.high24h, live),
          low24h: Math.min(pair.low24h, live),
          quoteVolume24h: pair.quoteVolume24h,
          tradesCount: pair.tradesCount,
          isFuturesContract: pair.isFuturesContract,
        });
        Object.assign(pair, metrics);
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

  public getFilteredPairs(options: MarketFilterOptions): MarketPair[] {
    let list = Array.from(this.pairs.values());

    // 1. Filter by category preset
    switch (options.category) {
      case 'best_trading':
        // Top trading criterion: High/Ultra liquidity + Moderate/High volatility for fast entry/exit
        list = list.filter((p) => p.isIdealForTrading || p.tradeabilityScore >= 70);
        break;
      case 'scalping':
        // Scalping: High/Ultra liquidity + High volatility (> 6.5%)
        list = list.filter(
          (p) =>
            (p.liquidityTier === 'ultra' || p.liquidityTier === 'high') &&
            (p.volatilityTier === 'high' || p.volatilityTier === 'extreme' || p.volatilityPercent24h >= 6.5)
        );
        break;
      case 'swing_safe':
        // Swing safe: High liquidity + Moderate volatility (3-7%)
        list = list.filter(
          (p) =>
            (p.liquidityTier === 'ultra' || p.liquidityTier === 'high') &&
            (p.volatilityTier === 'moderate' || (p.volatilityPercent24h >= 2.5 && p.volatilityPercent24h <= 7.0))
        );
        break;
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
      case 'high_liquidity':
        list = list.filter((p) => p.liquidityTier === 'ultra' || p.liquidityTier === 'high' || p.quoteVolume24h >= 100_000_000);
        break;
      case 'high_volatility':
        list = list.filter((p) => p.volatilityTier === 'high' || p.volatilityTier === 'extreme' || p.volatilityPercent24h >= 7.0);
        break;
      case 'gainers':
        list = list.filter((p) => p.change24hPercent > 0);
        break;
      case 'losers':
        list = list.filter((p) => p.change24hPercent < 0);
        break;
      case 'all':
      default:
        break;
    }

    // 2. Custom Granular Filter: Liquidity Tier
    if (options.minLiquidityTier && options.minLiquidityTier !== 'all') {
      if (options.minLiquidityTier === 'ultra') {
        list = list.filter((p) => p.liquidityTier === 'ultra');
      } else if (options.minLiquidityTier === 'high') {
        list = list.filter((p) => p.liquidityTier === 'ultra' || p.liquidityTier === 'high');
      } else if (options.minLiquidityTier === 'medium') {
        list = list.filter((p) => p.liquidityTier !== 'low');
      }
    }

    // 3. Custom Granular Filter: Volatility Tier
    if (options.volatilityTierFilter && options.volatilityTierFilter !== 'all') {
      if (options.volatilityTierFilter === 'moderate_high') {
        list = list.filter((p) => p.volatilityTier === 'moderate' || p.volatilityTier === 'high');
      } else {
        list = list.filter((p) => p.volatilityTier === options.volatilityTierFilter);
      }
    }

    // 4. Custom Granular Filter: Fast Execution only (instant or fast)
    if (options.fastExecutionOnly) {
      list = list.filter((p) => p.executionSpeed === 'instant' || p.executionSpeed === 'fast');
    }

    // 5. Custom Granular Filter: Minimum Tradeability Score
    if (options.minTradeabilityScore && options.minTradeabilityScore > 0) {
      list = list.filter((p) => p.tradeabilityScore >= options.minTradeabilityScore!);
    }

    // 6. Search query filter
    if (options.searchQuery.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.symbol.toLowerCase().includes(q) ||
          p.displayName.toLowerCase().includes(q) ||
          p.baseAsset.toLowerCase().includes(q) ||
          p.sectorTag.toLowerCase().includes(q) ||
          (p.tradFiBadge && p.tradFiBadge.toLowerCase().includes(q)) ||
          (p.tradFiDescription && p.tradFiDescription.toLowerCase().includes(q)) ||
          p.liquidityLabel.toLowerCase().includes(q) ||
          p.volatilityLabel.toLowerCase().includes(q) ||
          p.tradeabilityLabel.toLowerCase().includes(q)
      );
    }

    // 7. Sorting
    list.sort((a, b) => {
      switch (options.sortBy) {
        case 'tradeability_desc':
          return (b.tradeabilityScore || 0) - (a.tradeabilityScore || 0);
        case 'liquidity_desc':
          return (b.quoteVolume24h || 0) - (a.quoteVolume24h || 0);
        case 'volatility_desc':
          return (b.volatilityPercent24h || 0) - (a.volatilityPercent24h || 0);
        case 'volatility_asc':
          return (a.volatilityPercent24h || 0) - (b.volatilityPercent24h || 0);
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
          return (b.tradeabilityScore || 0) - (a.tradeabilityScore || 0);
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

    const idealTradingCount = all.filter((p) => p.isIdealForTrading).length;
    const highLiquidityCount = all.filter((p) => p.liquidityTier === 'ultra' || p.liquidityTier === 'high').length;
    const highVolatilityCount = all.filter((p) => p.volatilityTier === 'high' || p.volatilityTier === 'extreme').length;

    const totalVolumeUsdt = all.reduce((sum, p) => sum + (p.quoteVolume24h || 0), 0);

    const sortedByGain = [...all].sort((a, b) => b.change24hPercent - a.change24hPercent);
    const topGainer = sortedByGain[0] || null;
    const topLoser = sortedByGain[sortedByGain.length - 1] || null;

    const sortedByTradeability = [...all].sort((a, b) => b.tradeabilityScore - a.tradeabilityScore);
    const topTradeOpportunity = sortedByTradeability[0] || null;

    return {
      totalPairs: all.length,
      futuresCount,
      tradFiCount,
      metalsCount,
      forexCount,
      rwaCount,
      idealTradingCount,
      highLiquidityCount,
      highVolatilityCount,
      totalVolumeUsdt,
      topGainer,
      topLoser,
      topTradeOpportunity,
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
