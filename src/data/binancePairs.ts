export interface BinancePairInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  name: string;
  category: 'Top Majors' | 'DeFi' | 'Layer 1 / Layer 2' | 'AI / Cripto IA' | 'Memes' | 'Privacy' | 'Infra / Gaming' | 'Otros';
  popular?: boolean;
}

export const BINANCE_POPULAR_PAIRS: BinancePairInfo[] = [
  // Top Majors
  { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', name: 'Bitcoin', category: 'Top Majors', popular: true },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', name: 'Ethereum', category: 'Top Majors', popular: true },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', name: 'BNB', category: 'Top Majors', popular: true },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', name: 'Solana', category: 'Top Majors', popular: true },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', name: 'XRP', category: 'Top Majors', popular: true },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', name: 'Cardano', category: 'Top Majors', popular: true },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', name: 'Dogecoin', category: 'Top Majors', popular: true },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', name: 'Avalanche', category: 'Top Majors', popular: true },
  { symbol: 'DOTUSDT', baseAsset: 'DOT', quoteAsset: 'USDT', name: 'Polkadot', category: 'Top Majors' },
  { symbol: 'LTCUSDT', baseAsset: 'LTC', quoteAsset: 'USDT', name: 'Litecoin', category: 'Top Majors' },

  // AI / Cripto IA
  { symbol: 'TAOUSDT', baseAsset: 'TAO', quoteAsset: 'USDT', name: 'Bittensor', category: 'AI / Cripto IA', popular: true },
  { symbol: 'FETUSDT', baseAsset: 'FET', quoteAsset: 'USDT', name: 'Artificial Superintelligence Alliance', category: 'AI / Cripto IA', popular: true },
  { symbol: 'RENDERUSDT', baseAsset: 'RENDER', quoteAsset: 'USDT', name: 'Render', category: 'AI / Cripto IA', popular: true },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', name: 'NEAR Protocol', category: 'AI / Cripto IA', popular: true },
  { symbol: 'WLDUSDT', baseAsset: 'WLD', quoteAsset: 'USDT', name: 'Worldcoin', category: 'AI / Cripto IA' },
  { symbol: 'ARKMUSDT', baseAsset: 'ARKM', quoteAsset: 'USDT', name: 'Arkham', category: 'AI / Cripto IA' },
  { symbol: 'IOUSD', baseAsset: 'IO', quoteAsset: 'USDT', name: 'io.net', category: 'AI / Cripto IA' },

  // DeFi & Lending
  { symbol: 'AAVEUSDT', baseAsset: 'AAVE', quoteAsset: 'USDT', name: 'Aave', category: 'DeFi', popular: true },
  { symbol: 'UNIUSDT', baseAsset: 'UNI', quoteAsset: 'USDT', name: 'Uniswap', category: 'DeFi', popular: true },
  { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', name: 'Chainlink', category: 'DeFi', popular: true },
  { symbol: 'INJUSDT', baseAsset: 'INJ', quoteAsset: 'USDT', name: 'Injective', category: 'DeFi', popular: true },
  { symbol: 'PENDLEUSDT', baseAsset: 'PENDLE', quoteAsset: 'USDT', name: 'Pendle', category: 'DeFi' },
  { symbol: 'CRVUSDT', baseAsset: 'CRV', quoteAsset: 'USDT', name: 'Curve DAO', category: 'DeFi' },
  { symbol: 'MKRUSDT', baseAsset: 'MKR', quoteAsset: 'USDT', name: 'Maker', category: 'DeFi' },
  { symbol: 'SNXUSDT', baseAsset: 'SNX', quoteAsset: 'USDT', name: 'Synthetix', category: 'DeFi' },
  { symbol: 'JUPUSDT', baseAsset: 'JUP', quoteAsset: 'USDT', name: 'Jupiter', category: 'DeFi' },
  { symbol: 'DYDXUSDT', baseAsset: 'DYDX', quoteAsset: 'USDT', name: 'dYdX', category: 'DeFi' },

  // Privacy
  { symbol: 'ZECUSDT', baseAsset: 'ZEC', quoteAsset: 'USDT', name: 'Zcash', category: 'Privacy', popular: true },
  { symbol: 'DASHUSDT', baseAsset: 'DASH', quoteAsset: 'USDT', name: 'Dash', category: 'Privacy' },

  // Layer 1 / Layer 2
  { symbol: 'SUIUSDT', baseAsset: 'SUI', quoteAsset: 'USDT', name: 'Sui Network', category: 'Layer 1 / Layer 2', popular: true },
  { symbol: 'APTUSDT', baseAsset: 'APT', quoteAsset: 'USDT', name: 'Aptos', category: 'Layer 1 / Layer 2', popular: true },
  { symbol: 'SEIUSDT', baseAsset: 'SEI', quoteAsset: 'USDT', name: 'Sei Network', category: 'Layer 1 / Layer 2' },
  { symbol: 'TIAUSDT', baseAsset: 'TIA', quoteAsset: 'USDT', name: 'Celestia', category: 'Layer 1 / Layer 2', popular: true },
  { symbol: 'ARBUSDT', baseAsset: 'ARB', quoteAsset: 'USDT', name: 'Arbitrum', category: 'Layer 1 / Layer 2' },
  { symbol: 'OPUSDT', baseAsset: 'OP', quoteAsset: 'USDT', name: 'Optimism', category: 'Layer 1 / Layer 2' },
  { symbol: 'MATICUSDT', baseAsset: 'MATIC', quoteAsset: 'USDT', name: 'Polygon', category: 'Layer 1 / Layer 2' },
  { symbol: 'KASUSDT', baseAsset: 'KAS', quoteAsset: 'USDT', name: 'Kaspa', category: 'Layer 1 / Layer 2' },
  { symbol: 'FTMUSDT', baseAsset: 'FTM', quoteAsset: 'USDT', name: 'Fantom', category: 'Layer 1 / Layer 2' },
  { symbol: 'ATOMUSDT', baseAsset: 'ATOM', quoteAsset: 'USDT', name: 'Cosmos', category: 'Layer 1 / Layer 2' },
  { symbol: 'STXUSDT', baseAsset: 'STX', quoteAsset: 'USDT', name: 'Stacks', category: 'Layer 1 / Layer 2' },

  // Memes
  { symbol: '1000PEPEUSDT', baseAsset: '1000PEPE', quoteAsset: 'USDT', name: 'Pepe (1000PEPE)', category: 'Memes', popular: true },
  { symbol: '1000PUMPUSDT', baseAsset: '1000PUMP', quoteAsset: 'USDT', name: 'Pump (1000PUMP)', category: 'Memes', popular: true },
  { symbol: '1000SHIBUSDT', baseAsset: '1000SHIB', quoteAsset: 'USDT', name: 'Shiba Inu (1000SHIB)', category: 'Memes', popular: true },
  { symbol: '1000BONKUSDT', baseAsset: '1000BONK', quoteAsset: 'USDT', name: 'Bonk (1000BONK)', category: 'Memes' },
  { symbol: '1000FLOKIUSDT', baseAsset: '1000FLOKI', quoteAsset: 'USDT', name: 'Floki (1000FLOKI)', category: 'Memes' },
  { symbol: 'WIFUSDT', baseAsset: 'WIF', quoteAsset: 'USDT', name: 'dogwifhat', category: 'Memes' },
  { symbol: 'BOMEUSDT', baseAsset: 'BOME', quoteAsset: 'USDT', name: 'BOOK OF MEME', category: 'Memes' },

  // Infra & Gaming & Real World Assets
  { symbol: 'OMUSDT', baseAsset: 'OM', quoteAsset: 'USDT', name: 'MANTRA (RWA)', category: 'Infra / Gaming' },
  { symbol: 'PYTHUSDT', baseAsset: 'PYTH', quoteAsset: 'USDT', name: 'Pyth Network', category: 'Infra / Gaming' },
  { symbol: 'FILUSDT', baseAsset: 'FIL', quoteAsset: 'USDT', name: 'Filecoin', category: 'Infra / Gaming' },
  { symbol: 'GALAUSDT', baseAsset: 'GALA', quoteAsset: 'USDT', name: 'Gala Games', category: 'Infra / Gaming' },
  { symbol: 'SANDUSDT', baseAsset: 'SAND', quoteAsset: 'USDT', name: 'The Sandbox', category: 'Infra / Gaming' },
  { symbol: 'MANAUSDT', baseAsset: 'MANA', quoteAsset: 'USDT', name: 'Decentraland', category: 'Infra / Gaming' },
  { symbol: 'ORDIUSDT', baseAsset: 'ORDI', quoteAsset: 'USDT', name: 'Ordinals', category: 'Infra / Gaming' },
];

/**
 * Known Binance Futures USDT-M contract multipliers and symbol remaps
 * e.g. PEPE -> 1000PEPEUSDT (* 1000), PUMP -> 1000PUMPUSDT (* 1000)
 */
export const BINANCE_FUTURES_MULTIPLIERS: Record<string, { futuresSymbol: string; multiplier: number }> = {
  PEPE: { futuresSymbol: '1000PEPEUSDT', multiplier: 1000 },
  PEPEUSDT: { futuresSymbol: '1000PEPEUSDT', multiplier: 1000 },
  '1000PEPE': { futuresSymbol: '1000PEPEUSDT', multiplier: 1000 },
  '1000PEPEUSDT': { futuresSymbol: '1000PEPEUSDT', multiplier: 1000 },

  PUMP: { futuresSymbol: '1000PUMPUSDT', multiplier: 1000 },
  PUMPUSDT: { futuresSymbol: '1000PUMPUSDT', multiplier: 1000 },
  '1000PUMP': { futuresSymbol: '1000PUMPUSDT', multiplier: 1000 },
  '1000PUMPUSDT': { futuresSymbol: '1000PUMPUSDT', multiplier: 1000 },

  SHIB: { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  SHIBUSDT: { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  SHIBA: { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  SHIBAUSDT: { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  '1000SHIB': { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  '1000SHIBUSDT': { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  '1000SHIBA': { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },
  '1000SHIBAUSDT': { futuresSymbol: '1000SHIBUSDT', multiplier: 1000 },

  FLOKI: { futuresSymbol: '1000FLOKIUSDT', multiplier: 1000 },
  FLOKIUSDT: { futuresSymbol: '1000FLOKIUSDT', multiplier: 1000 },
  '1000FLOKI': { futuresSymbol: '1000FLOKIUSDT', multiplier: 1000 },
  '1000FLOKIUSDT': { futuresSymbol: '1000FLOKIUSDT', multiplier: 1000 },

  BONK: { futuresSymbol: '1000BONKUSDT', multiplier: 1000 },
  BONKUSDT: { futuresSymbol: '1000BONKUSDT', multiplier: 1000 },
  '1000BONK': { futuresSymbol: '1000BONKUSDT', multiplier: 1000 },
  '1000BONKUSDT': { futuresSymbol: '1000BONKUSDT', multiplier: 1000 },

  SATS: { futuresSymbol: '1000SATSUSDT', multiplier: 1000 },
  SATSUSDT: { futuresSymbol: '1000SATSUSDT', multiplier: 1000 },
  '1000SATS': { futuresSymbol: '1000SATSUSDT', multiplier: 1000 },
  '1000SATSUSDT': { futuresSymbol: '1000SATSUSDT', multiplier: 1000 },

  LUNC: { futuresSymbol: '1000LUNCUSDT', multiplier: 1000 },
  LUNCUSDT: { futuresSymbol: '1000LUNCUSDT', multiplier: 1000 },
  '1000LUNC': { futuresSymbol: '1000LUNCUSDT', multiplier: 1000 },
  '1000LUNCUSDT': { futuresSymbol: '1000LUNCUSDT', multiplier: 1000 },

  RATS: { futuresSymbol: '1000RATSUSDT', multiplier: 1000 },
  RATSUSDT: { futuresSymbol: '1000RATSUSDT', multiplier: 1000 },
  '1000RATS': { futuresSymbol: '1000RATSUSDT', multiplier: 1000 },
  '1000RATSUSDT': { futuresSymbol: '1000RATSUSDT', multiplier: 1000 },

  CHEEMS: { futuresSymbol: '1000CHEEMSUSDT', multiplier: 1000 },
  CHEEMSUSDT: { futuresSymbol: '1000CHEEMSUSDT', multiplier: 1000 },
  '1000CHEEMS': { futuresSymbol: '1000CHEEMSUSDT', multiplier: 1000 },
  '1000CHEEMSUSDT': { futuresSymbol: '1000CHEEMSUSDT', multiplier: 1000 },

  CAT: { futuresSymbol: '1000CATUSDT', multiplier: 1000 },
  CATUSDT: { futuresSymbol: '1000CATUSDT', multiplier: 1000 },
  '1000CAT': { futuresSymbol: '1000CATUSDT', multiplier: 1000 },
  '1000CATUSDT': { futuresSymbol: '1000CATUSDT', multiplier: 1000 },

  NEIRO: { futuresSymbol: '1000NEIROUSDT', multiplier: 1000 },
  NEIROUSDT: { futuresSymbol: '1000NEIROUSDT', multiplier: 1000 },
  '1000NEIRO': { futuresSymbol: '1000NEIROUSDT', multiplier: 1000 },
  '1000NEIROUSDT': { futuresSymbol: '1000NEIROUSDT', multiplier: 1000 },

  MOG: { futuresSymbol: '1000MOGUSDT', multiplier: 1000 },
  MOGUSDT: { futuresSymbol: '1000MOGUSDT', multiplier: 1000 },
  '1000MOG': { futuresSymbol: '1000MOGUSDT', multiplier: 1000 },
  '1000MOGUSDT': { futuresSymbol: '1000MOGUSDT', multiplier: 1000 },

  WHY: { futuresSymbol: '1000WHYUSDT', multiplier: 1000 },
  WHYUSDT: { futuresSymbol: '1000WHYUSDT', multiplier: 1000 },
  '1000WHY': { futuresSymbol: '1000WHYUSDT', multiplier: 1000 },
  '1000WHYUSDT': { futuresSymbol: '1000WHYUSDT', multiplier: 1000 },

  APU: { futuresSymbol: '1000APUUSDT', multiplier: 1000 },
  APUUSDT: { futuresSymbol: '1000APUUSDT', multiplier: 1000 },
  '1000APU': { futuresSymbol: '1000APUUSDT', multiplier: 1000 },
  '1000APUUSDT': { futuresSymbol: '1000APUUSDT', multiplier: 1000 },

  XEC: { futuresSymbol: '1000XECUSDT', multiplier: 1000 },
  XECUSDT: { futuresSymbol: '1000XECUSDT', multiplier: 1000 },
  '1000XEC': { futuresSymbol: '1000XECUSDT', multiplier: 1000 },
  '1000XECUSDT': { futuresSymbol: '1000XECUSDT', multiplier: 1000 },

  BABYDOGE: { futuresSymbol: '1MBABYDOGEUSDT', multiplier: 1000000 },
  BABYDOGEUSDT: { futuresSymbol: '1MBABYDOGEUSDT', multiplier: 1000000 },
  '1MBABYDOGE': { futuresSymbol: '1MBABYDOGEUSDT', multiplier: 1000000 },
  '1MBABYDOGEUSDT': { futuresSymbol: '1MBABYDOGEUSDT', multiplier: 1000000 },
};

/**
 * Returns the contract price multiplier for micro-assets on Binance Futures
 * e.g. PEPE / 1000PEPE -> 1000, 1MBABYDOGE -> 1000000, BTC -> 1
 */
export function getBinanceSymbolMultiplier(symbol: string): number {
  if (!symbol) return 1;
  const clean = symbol.trim().toUpperCase().replace(/[\s\/\-_]/g, '');
  if (BINANCE_FUTURES_MULTIPLIERS[clean]) {
    return BINANCE_FUTURES_MULTIPLIERS[clean].multiplier;
  }
  const base = clean.endsWith('USDT') ? clean.slice(0, -4) : clean.endsWith('BUSD') ? clean.slice(0, -4) : clean;
  if (BINANCE_FUTURES_MULTIPLIERS[base]) {
    return BINANCE_FUTURES_MULTIPLIERS[base].multiplier;
  }
  if (clean.startsWith('1M')) return 1000000;
  if (clean.startsWith('1000')) return 1000;
  return 1;
}

/**
 * Normalizes any input into a valid Binance USDT perpetual symbol
 * e.g. "pepe" -> "1000PEPEUSDT", "pump" -> "1000PUMPUSDT", "btc" -> "BTCUSDT"
 */
export function normalizeBinanceSymbol(input: string): string {
  if (!input) return 'BTCUSDT';
  const clean = input.trim().toUpperCase().replace(/[\s\/\-_]/g, '');

  if (BINANCE_FUTURES_MULTIPLIERS[clean]) {
    return BINANCE_FUTURES_MULTIPLIERS[clean].futuresSymbol;
  }

  const base = clean.endsWith('USDT') ? clean.slice(0, -4) : clean.endsWith('BUSD') ? clean.slice(0, -4) : clean;
  if (BINANCE_FUTURES_MULTIPLIERS[base]) {
    return BINANCE_FUTURES_MULTIPLIERS[base].futuresSymbol;
  }

  if (clean.endsWith('USDT') || clean.endsWith('BUSD') || clean.endsWith('USDC')) {
    return clean;
  }
  return `${clean}USDT`;
}

/**
 * Searches symbols matching query (by symbol, base asset or name)
 */
export function searchBinancePairs(query: string): BinancePairInfo[] {
  if (!query || query.trim() === '') {
    return BINANCE_POPULAR_PAIRS;
  }
  const q = query.trim().toUpperCase();
  const matched = BINANCE_POPULAR_PAIRS.filter(
    (p) =>
      p.symbol.toUpperCase().includes(q) ||
      p.baseAsset.toUpperCase().includes(q) ||
      p.name.toUpperCase().includes(q)
  );

  // If user entered a custom symbol not in default list, allow creating an ad-hoc pair item
  if (matched.length === 0 && q.length >= 2) {
    const customSymbol = normalizeBinanceSymbol(q);
    const customBase = customSymbol.replace('USDT', '');
    return [
      {
        symbol: customSymbol,
        baseAsset: customBase,
        quoteAsset: 'USDT',
        name: `${customBase} (Par Personalizado)`,
        category: 'Otros',
        popular: false,
      },
    ];
  }

  return matched;
}

/**
 * Returns the exact TradingView symbol for Binance Futures USDT Perpetual contracts
 * e.g. "1000pepe" -> "BINANCE:1000PEPEUSDT.P"
 * e.g. "1000pump" -> "BINANCE:1000PUMPUSDT.P"
 * e.g. "1000shiba" -> "BINANCE:1000SHIBUSDT.P"
 * e.g. "BTCUSDT" -> "BINANCE:BTCUSDT.P"
 */
export function getTradingViewSymbol(input: string): string {
  if (!input) return 'BINANCE:BTCUSDT.P';
  let raw = input.trim().toUpperCase();

  // Strip existing BINANCE: prefix if present
  if (raw.startsWith('BINANCE:')) {
    raw = raw.slice(8);
  }

  // Strip trailing .P if present
  if (raw.endsWith('.P')) {
    raw = raw.slice(0, -2);
  }

  const normalized = normalizeBinanceSymbol(raw);
  return `BINANCE:${normalized}.P`;
}
