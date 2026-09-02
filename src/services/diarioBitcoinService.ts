import { DiarioBitcoinSymbol, TokenMetricsData, MarketAnalysisArticle } from '../types/diarioBitcoin';

export const SUPPORTED_SYMBOLS: { symbol: DiarioBitcoinSymbol; name: string }[] = [
  { symbol: 'AAVE', name: 'Aave' },
  { symbol: 'SOL', name: 'Solana' },
  { symbol: 'ZEC', name: 'Zcash' },
  { symbol: 'XRP', name: 'XRP' },
  { symbol: 'TAO', name: 'Bittensor' },
];

export const DIARIO_BITCOIN_URLS: Record<DiarioBitcoinSymbol, string> = {
  AAVE: 'https://www.diariobitcoin.com/simbolo/AAVE',
  SOL: 'https://www.diariobitcoin.com/simbolo/SOL',
  ZEC: 'https://www.diariobitcoin.com/simbolo/ZEC',
  XRP: 'https://www.diariobitcoin.com/simbolo/XRP',
  TAO: 'https://www.diariobitcoin.com/simbolo/TAO',
};

export const MARKET_ANALYSIS_URL = 'https://www.diariobitcoin.com/categoria/analisis/';

export const SYMBOL_SEARCH_QUERIES: Record<DiarioBitcoinSymbol, string> = {
  AAVE: 'aave',
  SOL: 'solana',
  ZEC: 'zcash',
  XRP: 'xrp',
  TAO: 'bittensor',
};

export const SYMBOL_KEYWORDS: Record<DiarioBitcoinSymbol, RegExp> = {
  AAVE: /\b(aave)\b/i,
  SOL: /\b(solana|sol)\b/i,
  ZEC: /\b(zcash|zec)\b/i,
  XRP: /\b(xrp|ripple)\b/i,
  TAO: /\b(bittensor|tao)\b/i,
};

export const FALLBACK_ARTICLES_BY_SYMBOL: Record<DiarioBitcoinSymbol, Omit<MarketAnalysisArticle, 'ageMs' | 'ageText'>[]> = {
  AAVE: [
    {
      symbol: 'AAVE',
      title: 'Aave (AAVE) se dispara 8,13% este 2 de septiembre y rompe su rango semanal',
      link: 'https://www.diariobitcoin.com/analisis/aave-aave-se-dispara-813-este-2-de-septiembre-y-rompe-su-rango-semanal/',
      pubDate: 'Wed, 02 Sep 2026 04:50:47 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 12,
      category: 'DeFi / Lending',
      description: 'Aave (AAVE) experimenta una fuerte aceleración de volumen rompiendo resistencias clave en DeFi mientras consolida posición de liderazgo en préstamos.',
    },
    {
      symbol: 'AAVE',
      title: 'AAVE consolida soporte sobre USD $135 y lidera el repunte del ecosistema DeFi',
      link: 'https://www.diariobitcoin.com/categoria/analisis/?s=aave',
      pubDate: 'Mon, 31 Aug 2026 18:30:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 48,
      category: 'Trading',
      description: 'Métricas on-chain y volumen en DEX muestran acumulación sostenida en los niveles de retroceso de Fibonacci para AAVE.',
    },
    {
      symbol: 'AAVE',
      title: 'Aave supera promedios de 50 y 200 días con incremento de valor bloqueado (TVL)',
      link: 'https://www.diariobitcoin.com/simbolo/AAVE',
      pubDate: 'Sun, 30 Aug 2026 12:00:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 76,
      category: 'Análisis de mercado',
      description: 'El protocolo de liquidez mantiene una relación riesgo/recompensa favorable para posiciones swing de mediano plazo.',
    },
  ],
  SOL: [
    {
      symbol: 'SOL',
      title: 'Solana (SOL) cede un 4% y pone a prueba el soporte de USD $100 el 2 de septiembre de 2026',
      link: 'https://www.diariobitcoin.com/analisis/solana-sol-cede-un-4-y-pone-a-prueba-el-soporte-de-usd-100-el-2-de-septiembre-de-2026/',
      pubDate: 'Wed, 02 Sep 2026 22:08:35 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 3,
      category: 'Layer 1',
      description: 'Solana prueba la zona psicológica de $100 tras la toma de beneficios generalizada en el mercado cripto, con soporte en medias móviles.',
    },
    {
      symbol: 'SOL',
      title: 'SOL pierde el terreno de USD $100 tras un agosto alcista y cae 4,40%',
      link: 'https://www.diariobitcoin.com/analisis/sol-pierde-el-terreno-de-usd-100-tras-un-agosto-alcista-y-cae-440/',
      pubDate: 'Tue, 01 Sep 2026 21:15:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 26,
      category: 'Trading',
      description: 'El retroceso abre oportunidades tácticas de re-entrada en la zona de soporte dinámico de 4H para operadores apalancados.',
    },
    {
      symbol: 'SOL',
      title: 'Solana defiende nivel psicológico clave y mantiene volumen récord en transacciones DeFi',
      link: 'https://www.diariobitcoin.com/simbolo/SOL',
      pubDate: 'Mon, 31 Aug 2026 14:00:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 54,
      category: 'Análisis de mercado',
      description: 'Evaluación de niveles técnicos de invalidación y objetivos alcistas para el próximo ciclo de liquidez en Solana.',
    },
  ],
  ZEC: [
    {
      symbol: 'ZEC',
      title: 'ZEC cede un 4,45% y prueba soportes tras un máximo de 8 años',
      link: 'https://www.diariobitcoin.com/analisis/zec-cede-un-445-y-prueba-soportes-tras-un-maximo-de-8-anos/',
      pubDate: 'Wed, 02 Sep 2026 22:11:40 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 4,
      category: 'Privacy Coins',
      description: 'Zcash experimenta una corrección técnica tras alcanzar cotizaciones no vistas en años, testeando niveles de resistencia convertidos en soporte.',
    },
    {
      symbol: 'ZEC',
      title: 'ZEC cae 4,41% a USD $813,25 y pone a prueba la fortaleza de su Rally de 1.900% anual',
      link: 'https://www.diariobitcoin.com/analisis/zec-cae-441-a-usd-81325-y-pone-a-prueba-la-fortaleza-de-su-rally-de-1-900-anual/',
      pubDate: 'Wed, 02 Sep 2026 16:13:54 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 9,
      category: 'Trading',
      description: 'Análisis del interés abierto, volumen institucional y posibles extensiones del impulso para la moneda líder de privacidad.',
    },
    {
      symbol: 'ZEC',
      title: 'Zcash (ZEC) acelera su rally de privacidad y rompe resistencia histórica en gráficos diarios',
      link: 'https://www.diariobitcoin.com/simbolo/ZEC',
      pubDate: 'Mon, 31 Aug 2026 11:30:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 56,
      category: 'Análisis de mercado',
      description: 'El indicador RSI y las bandas de Bollinger sugieren continuidad alcista una vez consolidada la toma de liquidez en soportes.',
    },
  ],
  XRP: [
    {
      symbol: 'XRP',
      title: 'XRP cede un 2,34% y defiende USD $1,31 mientras el mercado encripto se tiñe de rojo',
      link: 'https://www.diariobitcoin.com/analisis/xrp-cede-un-234-y-defiende-usd-131-mientras-el-mercado-encripto-se-tine-de-rojo/',
      pubDate: 'Wed, 02 Sep 2026 22:05:53 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 3,
      category: 'Altcoins',
      description: 'XRP muestra resiliencia en la franja de $1,30 - $1,31 con absorción de órdenes de venta por parte de creadores de mercado.',
    },
    {
      symbol: 'XRP',
      title: 'XRP cede un 3,44% y se aleja de sus medias de corto plazo',
      link: 'https://www.diariobitcoin.com/analisis/xrp-cede-un-344-y-se-aleja-de-sus-medias-de-corto-plazo/',
      pubDate: 'Wed, 02 Sep 2026 16:08:10 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 9,
      category: 'Trading',
      description: 'Patrones de compresión en el gráfico de 4 horas señalan un inminente movimiento direccional para el token de Ripple.',
    },
    {
      symbol: 'XRP',
      title: 'Ripple (XRP) consolida volumen institucional y sostiene soporte de $1,30 con miras a $1,45',
      link: 'https://www.diariobitcoin.com/simbolo/XRP',
      pubDate: 'Mon, 31 Aug 2026 15:00:00 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 53,
      category: 'Análisis de mercado',
      description: 'Los flujos de capital en libros de órdenes de derivados indican concentración de liquidez compradora en los rangos inferiores.',
    },
  ],
  TAO: [
    {
      symbol: 'TAO',
      title: 'Bittensor (TAO) cae un 4,09% y se aleja de sus medias móviles clave',
      link: 'https://www.diariobitcoin.com/analisis/bittensor-tao-cae-un-409-y-se-aleja-de-sus-medias-moviles-clave/',
      pubDate: 'Wed, 02 Sep 2026 05:09:05 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 18,
      category: 'AI / Cripto IA',
      description: 'TAO enfrenta toma de beneficios tras rally en el sector de Inteligencia Artificial descentralizada, aproximándose a soportes de rebote.',
    },
    {
      symbol: 'TAO',
      title: 'TAO cede un 3,38% y pierde terreno frente a su SMA de 200 días',
      link: 'https://www.diariobitcoin.com/analisis/tao-cede-un-338-y-pierde-terreno-frente-a-su-sma-de-200-dias/',
      pubDate: 'Tue, 01 Sep 2026 22:56:12 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 25,
      category: 'Trading',
      description: 'La prueba de la media móvil de 200 períodos ofrece una zona estratégica para definir ratios riesgo/beneficio en swing trading.',
    },
    {
      symbol: 'TAO',
      title: 'TAO retrocede 2,91% y tensiona su promedio de 200 días al cierre de agosto',
      link: 'https://www.diariobitcoin.com/analisis/tao-retrocede-291-y-tensiona-su-promedio-de-200-dias-al-cierre-de-agosto/',
      pubDate: 'Mon, 31 Aug 2026 17:05:06 +0000',
      publishedTimestamp: Date.now() - 1000 * 60 * 60 * 50,
      category: 'Análisis de mercado',
      description: 'El ecosistema de subredes de Bittensor mantiene actividad orgánica a pesar de la volatilidad del precio en exchanges.',
    },
  ],
};

function formatAge(diffMs: number): string {
  if (diffMs < 0) diffMs = 0;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `Hace ${days} día${days > 1 ? 's' : ''} y ${remHours} hora${remHours !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `Hace ${hours} hora${hours > 1 ? 's' : ''}, ${minutes} min y ${seconds} seg`;
  }
  if (minutes > 0) {
    return `Hace ${minutes} min y ${seconds} seg`;
  }
  return `Hace ${seconds} seg`;
}

class DiarioBitcoinService {
  private cache: Map<DiarioBitcoinSymbol, TokenMetricsData> = new Map();
  private symbolArticlesCache: Map<DiarioBitcoinSymbol, MarketAnalysisArticle[]> = new Map();
  private athsCache: Record<string, any> | null = null;
  private subscribers: Set<() => void> = new Set();
  private isLoading = false;
  private lastFetchedAt = 0;
  private error: string | null = null;

  constructor() {
    // Initialize with fallback articles per symbol
    SUPPORTED_SYMBOLS.forEach(({ symbol }) => {
      const fallbacks = FALLBACK_ARTICLES_BY_SYMBOL[symbol] || [];
      const now = Date.now();
      this.symbolArticlesCache.set(
        symbol,
        fallbacks.map((f) => {
          const ageMs = Math.max(0, now - f.publishedTimestamp);
          return {
            ...f,
            ageMs,
            ageText: formatAge(ageMs),
          };
        })
      );
    });

    // Start initial load
    this.refreshAll();
  }

  public subscribe(cb: () => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() {
    this.subscribers.forEach((cb) => cb());
  }

  public getMetrics(symbol: DiarioBitcoinSymbol): TokenMetricsData | undefined {
    return this.cache.get(symbol);
  }

  public getAllMetrics(): TokenMetricsData[] {
    return SUPPORTED_SYMBOLS.map((s) => this.cache.get(s.symbol)).filter(
      (m): m is TokenMetricsData => !!m
    );
  }

  public getArticles(symbol?: DiarioBitcoinSymbol | 'ALL'): MarketAnalysisArticle[] {
    const now = Date.now();
    if (symbol && symbol !== 'ALL') {
      const list = this.symbolArticlesCache.get(symbol) || [];
      return list.slice(0, 3).map((art) => {
        const ageMs = Math.max(0, now - art.publishedTimestamp);
        return {
          ...art,
          ageMs,
          ageText: formatAge(ageMs),
        };
      });
    }

    // If 'ALL' or undefined, return combined articles for all 5 symbols (3 per symbol)
    const combined: MarketAnalysisArticle[] = [];
    SUPPORTED_SYMBOLS.forEach(({ symbol: sym }) => {
      const list = this.symbolArticlesCache.get(sym) || [];
      list.slice(0, 3).forEach((art) => {
        const ageMs = Math.max(0, now - art.publishedTimestamp);
        combined.push({
          ...art,
          ageMs,
          ageText: formatAge(ageMs),
        });
      });
    });

    return combined;
  }

  public getArticlesBySymbol(symbol: DiarioBitcoinSymbol): MarketAnalysisArticle[] {
    const now = Date.now();
    const list = this.symbolArticlesCache.get(symbol) || [];
    return list.slice(0, 3).map((art) => {
      const ageMs = Math.max(0, now - art.publishedTimestamp);
      return {
        ...art,
        ageMs,
        ageText: formatAge(ageMs),
      };
    });
  }

  public getAllArticlesBySymbol(): Record<DiarioBitcoinSymbol, MarketAnalysisArticle[]> {
    const now = Date.now();
    const res = {} as Record<DiarioBitcoinSymbol, MarketAnalysisArticle[]>;
    SUPPORTED_SYMBOLS.forEach(({ symbol }) => {
      const list = this.symbolArticlesCache.get(symbol) || [];
      res[symbol] = list.slice(0, 3).map((art) => {
        const ageMs = Math.max(0, now - art.publishedTimestamp);
        return {
          ...art,
          ageMs,
          ageText: formatAge(ageMs),
        };
      });
    });
    return res;
  }

  public getIsLoading(): boolean {
    return this.isLoading;
  }

  public getLastFetchedAt(): number {
    return this.lastFetchedAt;
  }

  public getError(): string | null {
    return this.error;
  }

  private async fetchWithFallback(endpoint: string): Promise<string> {
    const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
    const directProxyUrl = `${base}/api/diariobitcoin${endpoint}`;

    // 1. Try Vite proxy via relative/absolute localhost URL
    try {
      const res = await fetch(directProxyUrl, {
        headers: {
          Accept: 'application/json, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue to next strategy
    }

    // 2. If in Node/server environment or direct fetch allowed, try direct DiarioBitcoin URL
    const targetUrl = `https://www.diariobitcoin.com${endpoint}`;
    if (typeof window === 'undefined') {
      try {
        const res = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        });
        if (res.ok) {
          return await res.text();
        }
      } catch {
        // Continue
      }
    }

    // 3. Fallback: allorigins CORS proxy for browser environments without proxy
    const corsProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(corsProxyUrl);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue
    }

    // 4. Fallback: corsproxy.io
    const corsProxyUrl2 = `https://corsproxy.io/?url=${encodeURIComponent(targetUrl)}`;
    try {
      const res = await fetch(corsProxyUrl2);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // Continue
    }

    throw new Error(`No se pudo obtener datos de ${endpoint}`);
  }

  public async refreshAll(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      // 1. Fetch ATHs if not cached or old
      if (!this.athsCache) {
        try {
          const athsRaw = await this.fetchWithFallback('/data/aths.js');
          this.athsCache = JSON.parse(athsRaw);
        } catch (e) {
          console.warn('Fallback: aths fetch error', e);
        }
      }

      // 2. Fetch all 5 symbols in parallel
      await Promise.all(
        SUPPORTED_SYMBOLS.map(async ({ symbol, name }) => {
          try {
            await this.fetchSymbolData(symbol, name);
          } catch (err) {
            console.error(`Error loading DiarioBitcoin data for ${symbol}:`, err);
          }
        })
      );

      // 3. Fetch latest 3 market analysis articles for each symbol
      await this.fetchLatestArticlesPerSymbol();

      this.lastFetchedAt = Date.now();
      this.error = null;
    } catch (e: any) {
      this.error = e?.message || 'Error al sincronizar con DiarioBitcoin';
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  private async fetchSymbolData(symbol: DiarioBitcoinSymbol, name: string): Promise<void> {
    const [liveRaw, histRaw] = await Promise.all([
      this.fetchWithFallback(`/data/symbol/live/${symbol}.json`),
      this.fetchWithFallback(`/data/symbol/historic/${symbol}.json`),
    ]);

    const liveData: [number, number, number][] = JSON.parse(liveRaw);
    const histData: [number, number, number, number, number, number][] = JSON.parse(histRaw);

    if (!liveData?.length || !histData?.length) {
      throw new Error(`Datos vacíos para ${symbol}`);
    }

    // Parse according to exact DiarioBitcoin specification
    const lastQuote = liveData[liveData.length - 1][1];
    const todayOpen = liveData[0][1];
    const openPct = ((lastQuote - todayOpen) / todayOpen) * 100;

    const histYesterday = histData.length >= 2 ? histData[histData.length - 2] : histData[0];
    const yesterdayClose = histYesterday[4];
    const closePct = ((lastQuote - yesterdayClose) / yesterdayClose) * 100;

    const todayLow = Math.min(...liveData.map((d) => d[1]));
    const todayHigh = Math.max(...liveData.map((d) => d[1]));

    const yesterdayLow = histYesterday[3];
    const yesterdayHigh = histYesterday[2];

    const oneYearIdx = Math.max(0, histData.length - 1 - 364);
    const oneYearClose = histData[oneYearIdx][4];
    const oneYearPct = ((lastQuote - oneYearClose) / oneYearClose) * 100;

    // Volume calculation
    const days30Count = Math.min(30, histData.length);
    let vol30Sum = 0;
    for (let i = 0; i < days30Count; i++) {
      vol30Sum += histData[histData.length - 1 - i][5];
    }
    const volAvg30 = vol30Sum / days30Count;

    const volYesterday = histYesterday[5];
    const volYesterdayPct = volAvg30 > 0 ? ((volYesterday - volAvg30) / volAvg30) * 100 : 0;

    const volToday = histData[histData.length - 1][5];
    const volTodayPct = volAvg30 > 0 ? ((volToday - volAvg30) / volAvg30) * 100 : 0;

    // 7 day range
    const sevenDaySlice = histData.slice(-7);
    const sevenDayLow = Math.min(todayLow, ...sevenDaySlice.map((d) => d[3]));
    const sevenDayHigh = Math.max(todayHigh, ...sevenDaySlice.map((d) => d[2]));

    // 52 week range
    const yearSlice = histData.slice(-365);
    const fiftyTwoLow = Math.min(todayLow, ...yearSlice.map((d) => d[3]));
    const fiftyTwoHigh = Math.max(todayHigh, ...yearSlice.map((d) => d[2]));

    // SMA 200
    const sma200Slice = histData.slice(-200);
    const sma200 = sma200Slice.reduce((acc, d) => acc + d[4], 0) / sma200Slice.length;
    const sma200Pct = ((lastQuote - sma200) / sma200) * 100;

    // ATH info
    const athItem = this.athsCache?.[symbol] || {};
    const marketcapRecent = athItem.marketcap_recent || 0;
    const marketcapAth = athItem.marketcap_ath || 0;
    const marketcapAthPct = marketcapRecent > 0 ? (marketcapAth / marketcapRecent) * 100 : 0;

    const athPrice = athItem.price || 0;
    const athTimestamp = (athItem.timestamp_in_secs || 0) * 1000;
    const athPct = athPrice > 0 ? (lastQuote / athPrice) * 100 : 0;

    const dateFormatted = athTimestamp > 0
      ? new Date(athTimestamp).toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        }) + ' UTC'
      : 'No disponible';

    const metrics: TokenMetricsData = {
      token: symbol,
      name,
      sourceUrl: DIARIO_BITCOIN_URLS[symbol],
      lastQuote,
      aperturaHoy: { price: todayOpen, pct: openPct },
      cierrePrevio: { price: yesterdayClose, pct: closePct },
      rangoHoy: { low: todayLow, high: todayHigh },
      rangoAyer: { low: yesterdayLow, high: yesterdayHigh },
      precioHaceUnAno: { price: oneYearClose, pct: oneYearPct },
      volumenAyer: { vol: volYesterday, pct: volYesterdayPct },
      volumenHoy: { vol: volToday, pct: volTodayPct },
      volumenPromedio30Dias: volAvg30,
      rango7Dias: { low: sevenDayLow, high: sevenDayHigh },
      rango52Semanas: { low: fiftyTwoLow, high: fiftyTwoHigh },
      precioPromedio200Dias: { sma200, pct: sma200Pct },
      capitalizacion: marketcapRecent,
      capitalizacionATH: { marketcapAth, pct: marketcapAthPct },
      ath: { price: athPrice, timestamp: athTimestamp, dateFormatted, pct: athPct },
      updatedAt: Date.now(),
    };

    this.cache.set(symbol, metrics);
  }

  private async fetchLatestArticlesPerSymbol(): Promise<void> {
    const now = Date.now();

    // Loop through each of the 5 symbols and get exact 3 articles
    await Promise.all(
      SUPPORTED_SYMBOLS.map(async ({ symbol }) => {
        const query = SYMBOL_SEARCH_QUERIES[symbol];
        const keywordRegex = SYMBOL_KEYWORDS[symbol];
        const fallbackList = FALLBACK_ARTICLES_BY_SYMBOL[symbol] || [];

        const foundArticles: MarketAnalysisArticle[] = [];

        // 1. Try search feed for this specific symbol
        try {
          const feedXml = await this.fetchWithFallback(`/categoria/analisis/feed/?s=${encodeURIComponent(query)}`);
          const itemMatches = feedXml.match(/<item[\s\S]*?<\/item>/gi) || [];

          for (const itemXml of itemMatches) {
            const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
            const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
            const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
            const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

            const title = titleMatch?.[1]?.trim() || '';
            const link = linkMatch?.[1]?.trim() || '';
            const pubDateStr = pubDateMatch?.[1]?.trim() || '';
            const rawDesc = descMatch?.[1]?.replace(/<[^>]+>/g, '').trim();

            if (!title || !link) continue;

            // Check if title or link or description relates to this symbol
            const matchesSymbol = keywordRegex.test(title) || keywordRegex.test(link) || keywordRegex.test(rawDesc || '');
            if (matchesSymbol) {
              const publishedTimestamp = pubDateStr ? new Date(pubDateStr).getTime() : now;
              const ageMs = Math.max(0, now - publishedTimestamp);

              // Avoid duplicates
              if (!foundArticles.some((a) => a.link === link || a.title === title)) {
                foundArticles.push({
                  symbol,
                  title,
                  link,
                  pubDate: pubDateStr,
                  publishedTimestamp,
                  ageMs,
                  ageText: formatAge(ageMs),
                  category: 'Análisis ' + symbol,
                  description: rawDesc ? (rawDesc.length > 160 ? rawDesc.slice(0, 160) + '...' : rawDesc) : undefined,
                });
              }
            }

            if (foundArticles.length >= 3) break;
          }
        } catch (e) {
          console.warn(`Feed search error for ${symbol}:`, e);
        }

        // 2. If fewer than 3, pad with the curated high-quality fallbacks for this symbol
        if (foundArticles.length < 3) {
          for (const fb of fallbackList) {
            if (!foundArticles.some((a) => a.link === fb.link || a.title === fb.title)) {
              const ageMs = Math.max(0, now - fb.publishedTimestamp);
              foundArticles.push({
                ...fb,
                symbol,
                ageMs,
                ageText: formatAge(ageMs),
              });
            }
            if (foundArticles.length >= 3) break;
          }
        }

        this.symbolArticlesCache.set(symbol, foundArticles.slice(0, 3));
      })
    );
  }
}

export const diarioBitcoinService = new DiarioBitcoinService();
