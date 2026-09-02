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
  { symbol: 'PEPEUSDT', baseAsset: 'PEPE', quoteAsset: 'USDT', name: 'Pepe', category: 'Memes', popular: true },
  { symbol: 'SHIBUSDT', baseAsset: 'SHIB', quoteAsset: 'USDT', name: 'Shiba Inu', category: 'Memes', popular: true },
  { symbol: 'BONKUSDT', baseAsset: 'BONK', quoteAsset: 'USDT', name: 'Bonk', category: 'Memes' },
  { symbol: 'FLOKIUSDT', baseAsset: 'FLOKI', quoteAsset: 'USDT', name: 'Floki', category: 'Memes' },
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
 * Normalizes any input into a valid Binance USDT perpetual symbol
 * e.g. "btc" -> "BTCUSDT", "ETHUSDT" -> "ETHUSDT", "sol/usdt" -> "SOLUSDT"
 */
export function normalizeBinanceSymbol(input: string): string {
  if (!input) return 'BTCUSDT';
  const clean = input.trim().toUpperCase().replace(/[\s\/\-_]/g, '');
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
