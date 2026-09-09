/**
 * Centralized Price Formatter Utility
 * Rule:
 * - Assets like DOGE, PEPE, SHIB, FLOKI, BONK, etc. (or sub-dollar assets < 1) support up to 8 decimals.
 * - All other standard assets (BTC, ETH, SOL, BNB, etc.) display strictly with 2 decimals.
 */

// Known micro-cap / memecoin tokens that need up to 8 decimal precision
const HIGH_PRECISION_TOKENS = [
  'DOGE',
  'PEPE',
  'SHIB',
  'FLOKI',
  'BONK',
  'LUNC',
  'SATS',
  '1000PEPE',
  '1000SHIB',
  '1000FLOKI',
  '1000BONK',
  '1000SATS',
  '1000LUNC',
  '1000RATS',
  '1000CHEEMS',
  '1000CAT',
  'BTT',
  'BTTC',
  'WIN',
  'HOT',
  'REEF',
  'XEC',
  'NOT',
  'HMSTR',
  'NEIRO',
  'MEME',
  'WIF',
  'POPCAT',
  'MOG',
  'TURBO',
  'BABYDOGE',
  '1MBABYDOGE',
  'SLERF',
  'BOME',
  'BRETT',
  'MEW',
  'PENGU',
];

/**
 * Check if a symbol or price warrants high precision (up to 8 decimals)
 */
export function isHighPrecisionAsset(symbol?: string, price?: number): boolean {
  if (symbol) {
    const s = symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (HIGH_PRECISION_TOKENS.some((tok) => s.includes(tok))) {
      return true;
    }
  }

  // If price is below 1.0 (sub-dollar assets like micro-caps), use high precision to avoid 0.00
  if (typeof price === 'number' && price > 0 && price < 1) {
    return true;
  }

  return false;
}

/**
 * Format an asset's price:
 * - For assets like DOGE or PEPE: up to 8 decimals (preserves micro-value precision).
 * - For all other assets: strictly 2 decimals (e.g. BTC $78,241.62, ETH $2,461.89).
 */
export function formatPrice(
  price: number | undefined | null,
  symbol?: string,
  options?: {
    showCurrencySymbol?: boolean;
    forceDecimals?: number;
  }
): string {
  if (price === undefined || price === null || isNaN(price)) {
    return '0.00';
  }

  if (price === 0) {
    return '0.00';
  }

  // Check if forceDecimals was explicitly requested
  if (typeof options?.forceDecimals === 'number') {
    return price.toFixed(options.forceDecimals);
  }

  const isHighPrec = isHighPrecisionAsset(symbol, price);

  if (isHighPrec) {
    // Assets like PEPE or micro-cap with very tiny values (< 0.0001)
    if (price < 0.0001) {
      return price.toFixed(8);
    }
    // Assets like DOGE or 1000PEPE with values < 1: up to 8 decimals (minimum 4 to avoid rounding truncation)
    if (price < 1) {
      return price.toLocaleString('en-US', {
        minimumFractionDigits: 4,
        maximumFractionDigits: 8,
      });
    }
    // High precision token that happens to be >= 1 (e.g. DOGE if it went above $1)
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }

  // All other assets: Strictly 2 decimals
  if (price >= 1000) {
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return price.toFixed(2);
}

/**
 * Format price with dollar symbol prefix
 */
export function formatCurrencyPrice(
  price: number | undefined | null,
  symbol?: string
): string {
  return `$${formatPrice(price, symbol)}`;
}
