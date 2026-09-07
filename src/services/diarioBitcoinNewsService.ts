import { NewsHeadlineItem, NewsSentiment } from '../types/diarioBitcoin';

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  // Handle basic common entities
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
    '&#8217;': "'",
    '&#8216;': "'",
    '&#8220;': '"',
    '&#8221;': '"',
    '&#8211;': '–',
    '&#8212;': '—',
    '&#038;': '&',
    '&hellip;': '…',
    '&#8230;': '…',
    '&nbsp;': ' ',
    '&#160;': ' ',
  };

  let decoded = text.replace(/&(?:amp|lt|gt|quot|#039|#8217|#8216|#8220|#8221|#8211|#8212|#038|hellip|#8230|nbsp|#160);/g, (m) => map[m] || m);
  // Numeric character references like &#8211;
  decoded = decoded.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));
  return decoded;
}

function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, '').trim();
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return 'Hace un momento';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHours === 1) return 'Hace 1 hora';
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return 'Hace 1 día';
  return `Hace ${diffDays} días`;
}

function detectHeadlineSentiment(title: string, summary: string): NewsSentiment {
  const text = `${title} ${summary}`.toLowerCase();
  const bullishKeywords = [
    'se dispara',
    'dispara',
    'rally',
    'rompe resistencia',
    'alcista',
    'sube',
    'ganancia',
    'récord',
    'máximos',
    'supera',
    'avance',
    'avanza',
    'impulso',
    'compras de ballenas',
    'repunte',
    'rebote',
    'fuerte',
    'lidera',
    'alza',
    'escala',
    'acumulación',
    'nuevo hito',
    'optimismo',
  ];
  const bearishKeywords = [
    'cede',
    'cae',
    'caída',
    'retrocede',
    'retroceso',
    'pierde',
    'bajista',
    'rojo',
    'tensión',
    'presión vendedora',
    'desplome',
    'mínimos',
    'amenazado',
    'soporte roto',
    'liquidaciones',
    'corrección',
    'recede',
    'pesimismo',
    'hundimiento',
  ];

  const hasBull = bullishKeywords.some((k) => text.includes(k));
  const hasBear = bearishKeywords.some((k) => text.includes(k));

  if (hasBull && !hasBear) return 'bullish';
  if (hasBear && !hasBull) return 'bearish';
  return 'neutral';
}

function extractRelatedSymbols(text: string): string[] {
  const trackedSymbols = [
    'BTC',
    'ETH',
    'SOL',
    'XRP',
    'TAO',
    'AAVE',
    'ZEC',
    'BNB',
    'DOGE',
    'ADA',
    'AVAX',
    'LINK',
    'SUI',
    'NEAR',
    'FET',
    'RENDER',
    'CAKE',
    'WLFI',
    'VVV',
    'SPX6900',
    'AERO',
    'QNT',
    'KAS',
    'JUP',
  ];

  const found = new Set<string>();
  for (const s of trackedSymbols) {
    const reg = new RegExp(`\\b(${s})\\b`, 'i');
    if (reg.test(text)) {
      found.add(s);
    }
  }

  if (/solana/i.test(text)) found.add('SOL');
  if (/bitcoin/i.test(text)) found.add('BTC');
  if (/ethereum/i.test(text)) found.add('ETH');
  if (/ripple/i.test(text)) found.add('XRP');
  if (/bittensor/i.test(text)) found.add('TAO');
  if (/zcash/i.test(text)) found.add('ZEC');
  if (/aave/i.test(text)) found.add('AAVE');
  if (/avalanche/i.test(text)) found.add('AVAX');
  if (/pancakeswap/i.test(text)) found.add('CAKE');

  return Array.from(found);
}

const FALLBACK_NEWS_ITEMS: NewsHeadlineItem[] = [
  {
    id: 'fb-1',
    title: 'WLFI se estabiliza cerca de USD $0,057 con volumen en mínimos: análisis del 6 de septiembre de 2026',
    link: 'https://www.diariobitcoin.com/analisis/wlfi-se-estabiliza-cerca-de-usd-0057-con-volumen-en-minimos-analisis-del-6-de-septiembre-de-2026/',
    pubDate: 'Sun, 06 Sep 2026 22:36:49 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 38,
    ageText: 'Hace 38 min',
    summary: 'El token entra en rango lateral tras defensas consecutivas de soporte con bajo volumen de liquidaciones en derivados.',
    author: 'Canuto',
    category: 'Análisis de mercado',
    relatedSymbols: ['WLFI'],
    sentiment: 'neutral',
  },
  {
    id: 'fb-2',
    title: 'Venice Token (VVV) cede un 4,53 % y pone a prueba su estructura alcista de corto plazo',
    link: 'https://www.diariobitcoin.com/analisis/venice-token-vvv-cede-un-453-y-pone-a-prueba-su-estructura-alcista-de-corto-plazo/',
    pubDate: 'Sun, 06 Sep 2026 22:36:29 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 55,
    ageText: 'Hace 55 min',
    summary: 'La corrección se produce tras un rally de más del 50 % en 30 días, con el precio buscando soporte en medias exponenciales de 4H.',
    author: 'Canuto',
    category: 'Análisis de mercado',
    relatedSymbols: ['VVV'],
    sentiment: 'bearish',
  },
  {
    id: 'fb-3',
    title: 'PancakeSwap (CAKE) se dispara un 12,53% este 6 de septiembre de 2026 con volumen récord',
    link: 'https://www.diariobitcoin.com/analisis/pancakeswap-cake-se-dispara-un-1253-este-6-de-septiembre-de-2026-con-volumen-record/',
    pubDate: 'Sun, 06 Sep 2026 22:34:45 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 75,
    ageText: 'Hace 1 hora',
    summary: 'El protocolo DEX experimenta un flujo masivo de liquidez impulsado por nuevas comisiones reducidas y quema acelerada.',
    author: 'Canuto',
    category: 'DeFi / DEX',
    relatedSymbols: ['CAKE'],
    sentiment: 'bullish',
  },
  {
    id: 'fb-4',
    title: 'Solana (SOL) pone a prueba el soporte de USD $100 tras retroceso del mercado cripto',
    link: 'https://www.diariobitcoin.com/analisis/solana-sol-cede-un-4-y-pone-a-prueba-el-soporte-de-usd-100-el-2-de-septiembre-de-2026/',
    pubDate: 'Wed, 02 Sep 2026 22:08:35 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 180,
    ageText: 'Hace 3 horas',
    summary: 'SOL defiende niveles clave de soporte dinámico con divergencias alcistas en el RSI de 15m y 1H para operaciones apalancadas.',
    author: 'Redacción DiarioBitcoin',
    category: 'Layer 1 / Trading',
    relatedSymbols: ['SOL'],
    sentiment: 'neutral',
  },
  {
    id: 'fb-5',
    title: 'Bittensor (TAO) consolida en torno a la SMA de 200 días y mantiene interés institucional',
    link: 'https://www.diariobitcoin.com/analisis/bittensor-tao-cae-un-409-y-se-aleja-de-sus-medias-moviles-clave/',
    pubDate: 'Mon, 31 Aug 2026 18:30:00 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 240,
    ageText: 'Hace 4 horas',
    summary: 'El activo líder en IA descentralizada mantiene relación de riesgo/beneficio favorable con zonas de acumulación en retroceso.',
    author: 'Redacción DiarioBitcoin',
    category: 'IA / Tokens',
    relatedSymbols: ['TAO'],
    sentiment: 'neutral',
  },
  {
    id: 'fb-6',
    title: 'Aave (AAVE) rompe su rango semanal con volumen creciente en préstamos colateralizados',
    link: 'https://www.diariobitcoin.com/analisis/aave-aave-se-dispara-813-este-2-de-septiembre-y-rompe-su-rango-semanal/',
    pubDate: 'Wed, 02 Sep 2026 04:50:47 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 300,
    ageText: 'Hace 5 horas',
    summary: 'Aave consolida fortaleza relativa frente a Bitcoin mientras los tipos de interés de stablecoins aumentan en el protocolo.',
    author: 'Redacción DiarioBitcoin',
    category: 'DeFi / Lending',
    relatedSymbols: ['AAVE'],
    sentiment: 'bullish',
  },
  {
    id: 'fb-7',
    title: 'Zcash (ZEC) defiende soportes dinámicos tras marcar nuevo ciclo de acumulación',
    link: 'https://www.diariobitcoin.com/analisis/zec-cede-un-445-y-prueba-soportes-tras-un-maximo-de-8-anos/',
    pubDate: 'Tue, 01 Sep 2026 14:20:00 +0000',
    publishedTimestamp: Date.now() - 1000 * 60 * 360,
    ageText: 'Hace 6 horas',
    summary: 'La criptomoneda de privacidad muestra resiliencia en libro de órdenes con menor presión vendedora que en sesiones previas.',
    author: 'Redacción DiarioBitcoin',
    category: 'Privacidad',
    relatedSymbols: ['ZEC'],
    sentiment: 'neutral',
  },
];

export interface NewsServiceState {
  items: NewsHeadlineItem[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  source: 'diariobitcoin-proxy' | 'rss-fallback' | 'cached-fallback';
}

class DiarioBitcoinNewsService {
  private items: NewsHeadlineItem[] = [];
  private isLoading = false;
  private error: string | null = null;
  private lastUpdated: number | null = null;
  private source: 'diariobitcoin-proxy' | 'rss-fallback' | 'cached-fallback' = 'diariobitcoin-proxy';
  private listeners: Set<() => void> = new Set();
  private cacheTtlMs = 60000; // 1 minute cache

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch (e) {
        console.error('Error in news subscriber:', e);
      }
    });
  }

  public getState(): NewsServiceState {
    return {
      items: this.items.length > 0 ? this.items : FALLBACK_NEWS_ITEMS,
      isLoading: this.isLoading,
      error: this.error,
      lastUpdated: this.lastUpdated,
      source: this.source,
    };
  }

  public async fetchHeadlines(options?: {
    search?: string;
    perPage?: number;
    force?: boolean;
  }): Promise<NewsHeadlineItem[]> {
    const { search, perPage = 20, force = false } = options || {};

    // Use cached items if fresh and not forced and no specific search
    if (!force && !search && this.items.length > 0 && this.lastUpdated && Date.now() - this.lastUpdated < this.cacheTtlMs) {
      return this.items;
    }

    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      // 1. Try WP REST API via diariobitcoin-proxy endpoint
      const proxyEndpoint = `/api/diariobitcoin/wp-json/wp/v2/posts?per_page=${perPage}&_embed=1${
        search ? `&search=${encodeURIComponent(search)}` : ''
      }`;

      const res = await fetch(proxyEndpoint, {
        headers: {
          Accept: 'application/json, text/plain, */*',
        },
      });

      if (res.ok) {
        const posts = await res.json();
        if (Array.isArray(posts) && posts.length > 0) {
          const parsedItems: NewsHeadlineItem[] = posts.map((p: any) => {
            const rawTitle = p?.title?.rendered || '';
            const title = decodeHtmlEntities(stripHtml(rawTitle));
            const rawExcerpt = p?.excerpt?.rendered || p?.yoast_head_json?.description || '';
            const summary = decodeHtmlEntities(stripHtml(rawExcerpt));
            const link = p?.link || `https://www.diariobitcoin.com/?p=${p.id}`;
            const pubDateStr = p?.date || p?.date_gmt || new Date().toISOString();
            const timestamp = new Date(pubDateStr).getTime() || Date.now();
            const author = p?.yoast_head_json?.author || p?._embedded?.author?.[0]?.name || 'DiarioBitcoin';
            const category = p?.yoast_head_json?.schema?.['@graph']?.[0]?.articleSection?.[0] || 'Análisis de mercado';
            const imageUrl = p?.jetpack_featured_media_url || p?.yoast_head_json?.og_image?.[0]?.url;

            const relatedSymbols = extractRelatedSymbols(`${title} ${summary}`);
            const sentiment = detectHeadlineSentiment(title, summary);

            return {
              id: String(p.id || Math.random()),
              title,
              link,
              pubDate: pubDateStr,
              publishedTimestamp: timestamp,
              ageText: formatRelativeTime(timestamp),
              summary: summary.length > 180 ? summary.slice(0, 180) + '...' : summary,
              author,
              category,
              imageUrl,
              relatedSymbols,
              sentiment,
            };
          });

          this.items = parsedItems;
          this.lastUpdated = Date.now();
          this.source = 'diariobitcoin-proxy';
          this.error = null;
          this.isLoading = false;
          this.notify();
          return parsedItems;
        }
      }

      // 2. Fallback to RSS feed from proxy
      const rssEndpoint = '/api/diariobitcoin/categoria/analisis/feed/';
      const rssRes = await fetch(rssEndpoint);
      if (rssRes.ok) {
        const xmlText = await rssRes.text();
        const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

        if (itemMatches.length > 0) {
          const rssParsedItems: NewsHeadlineItem[] = [];

          for (let i = 0; i < Math.min(itemMatches.length, perPage); i++) {
            const itemXml = itemMatches[i];
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);
            const creatorMatch = itemXml.match(/<dc:creator>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/dc:creator>/i);

            const rawTitle = titleMatch?.[1]?.trim() || '';
            const link = linkMatch?.[1]?.trim() || '';
            const pubDateStr = pubDateMatch?.[1]?.trim() || '';
            const rawDesc = descMatch?.[1]?.trim() || '';

            if (!rawTitle || !link) continue;

            const title = decodeHtmlEntities(stripHtml(rawTitle));
            const summary = decodeHtmlEntities(stripHtml(rawDesc));
            const timestamp = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();

            const relatedSymbols = extractRelatedSymbols(`${title} ${summary}`);
            const sentiment = detectHeadlineSentiment(title, summary);

            rssParsedItems.push({
              id: `rss-${i}-${timestamp}`,
              title,
              link,
              pubDate: pubDateStr,
              publishedTimestamp: timestamp,
              ageText: formatRelativeTime(timestamp),
              summary: summary.length > 180 ? summary.slice(0, 180) + '...' : summary,
              author: creatorMatch?.[1]?.trim() || 'DiarioBitcoin',
              category: 'Análisis de mercado',
              relatedSymbols,
              sentiment,
            });
          }

          if (rssParsedItems.length > 0) {
            this.items = rssParsedItems;
            this.lastUpdated = Date.now();
            this.source = 'rss-fallback';
            this.error = null;
            this.isLoading = false;
            this.notify();
            return rssParsedItems;
          }
        }
      }

      // 3. Fallback to cached items
      this.items = FALLBACK_NEWS_ITEMS;
      this.lastUpdated = Date.now();
      this.source = 'cached-fallback';
      this.error = null;
      this.isLoading = false;
      this.notify();
      return this.items;
    } catch (err: any) {
      console.warn('Error fetching DiarioBitcoin news headlines:', err);
      this.error = err?.message || 'Error al conectar con el proxy de DiarioBitcoin';
      this.items = FALLBACK_NEWS_ITEMS;
      this.source = 'cached-fallback';
      this.isLoading = false;
      this.notify();
      return this.items;
    }
  }
}

export const diarioBitcoinNewsService = new DiarioBitcoinNewsService();
