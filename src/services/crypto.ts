/**
 * Cryptographic & Serialization utilities for Binance Futures WebSocket API
 * Adheres strictly to:
 * 1. Parameters alphabetically sorted by key name
 * 2. Timestamps as INT (ms, UTC)
 * 3. Numbers/Integers as JSON numbers, Decimals (price, qty) as JSON strings
 * 4. HMAC-SHA256 signature using Web Crypto API
 */

let serverTimeOffset = 0;

export function setServerTimeOffset(offset: number) {
  serverTimeOffset = offset;
}

export function getServerTimeOffset(): number {
  return serverTimeOffset;
}

export function getUtcTimestamp(): number {
  return Date.now() + serverTimeOffset;
}

/**
 * Formats decimal values to JSON string with fixed precision without exponential notation
 */
export function formatDecimal(val: number | string, precision: number = 2): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0.0';
  return num.toFixed(precision);
}

/**
 * Builds the canonical query string for signing by alphabetically sorting keys
 * Binance Rule: "tomar todos los parámetros (excepto la firma misma), ordenarlos alfabéticamente por nombre, y luego firmar la carga útil"
 */
export function buildCanonicalQueryString(params: Record<string, any>): string {
  const sortedKeys = Object.keys(params)
    .filter(key => key !== 'signature' && params[key] !== undefined && params[key] !== null)
    .sort();

  return sortedKeys
    .map(key => {
      const val = params[key];
      return `${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`;
    })
    .join('&');
}

/**
 * Signs the canonical payload using HMAC-SHA256 with Web Crypto API
 */
export async function signHmacSha256(payload: string, secretKey: string): Promise<string> {
  if (!secretKey) return '';
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(payload);

  const cryptoKey = await window.crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await window.crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    messageData
  );

  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Signs Ed25519 private key if provided (PKCS#8 or Raw 32-byte Base64/Hex)
 * Falls back gracefully if invalid format.
 */
export async function signEd25519(payload: string, privateKeyBase64OrHex: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(payload);

    // If SubtleCrypto supports Ed25519 import:
    let keyBuffer: Uint8Array;
    if (privateKeyBase64OrHex.length === 64) {
      // Hex
      keyBuffer = new Uint8Array(
        privateKeyBase64OrHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
    } else {
      // Base64
      const binaryString = atob(privateKeyBase64OrHex.replace(/\s+/g, ''));
      keyBuffer = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        keyBuffer[i] = binaryString.charCodeAt(i);
      }
    }

    const importedKey = await window.crypto.subtle.importKey(
      'pkcs8',
      keyBuffer,
      { name: 'Ed25519' },
      false,
      ['sign']
    );

    const sig = await window.crypto.subtle.sign('Ed25519', importedKey, data);
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  } catch (err) {
    console.warn('Ed25519 signature fallback (HMAC-SHA256 will be used instead):', err);
    return '';
  }
}
