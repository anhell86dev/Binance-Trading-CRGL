export type DiarioBitcoinSymbol = 'AAVE' | 'SOL' | 'ZEC' | 'XRP' | 'TAO';

export interface TokenMetricsData {
  token: DiarioBitcoinSymbol;
  name: string;
  sourceUrl: string;
  lastQuote: number;
  // 1. Apertura de Hoy: $ y %
  aperturaHoy: {
    price: number;
    pct: number;
  };
  // 2. Cierre Previo: $ y %
  cierrePrevio: {
    price: number;
    pct: number;
  };
  // 3. Rango hoy: $ - $
  rangoHoy: {
    low: number;
    high: number;
  };
  // 4. Rango Ayer: $ - $
  rangoAyer: {
    low: number;
    high: number;
  };
  // 5. Precio hace un Año: $ y %
  precioHaceUnAno: {
    price: number;
    pct: number;
  };
  // 6. Volumen Ayer: $ y %
  volumenAyer: {
    vol: number;
    pct: number;
  };
  // 7. Volumen Hoy: $ y %
  volumenHoy: {
    vol: number;
    pct: number;
  };
  // 8. Volumen Promedio 30 dias: $
  volumenPromedio30Dias: number;
  // 9. Rango 7 dias: $ - $
  rango7Dias: {
    low: number;
    high: number;
  };
  // 10. Tango 52 Semanas (Rango 52 Semanas): X - X
  rango52Semanas: {
    low: number;
    high: number;
  };
  // 11. Precio Promedio 200 dias (SMA 200): $ y %
  precioPromedio200Dias: {
    sma200: number;
    pct: number;
  };
  // 12. Capitalizacion: $
  capitalizacion: number;
  // 13. Capitalizacion ATH: $ y % donde %=$/Capitalizacion
  capitalizacionATH: {
    marketcapAth: number;
    pct: number; // (marketcapAth / capitalizacion) * 100
  };
  // 14. ATH: Cuando y %= Precio hoy/Precio ATH
  ath: {
    price: number;
    timestamp: number;
    dateFormatted: string;
    pct: number; // (lastQuote / price) * 100
  };
  updatedAt: number;
}

export interface MarketAnalysisArticle {
  title: string;
  link: string;
  pubDate: string;
  publishedTimestamp: number;
  ageMs: number;
  ageText: string;
  category?: string;
  description?: string;
}
