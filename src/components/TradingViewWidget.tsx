import React, { useMemo, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  interval?: string; // '240' for 4H
  theme?: 'dark' | 'light';
  height?: string | number;
}

export const TradingViewWidget: React.FC<TradingViewWidgetProps> = memo(({
  symbol,
  interval = '240', // 4H default as requested
  theme = 'dark',
  height = '520px',
}) => {
  // Format clean symbol: BINANCE:ZECUSDT, BINANCE:TAOUSDT, etc.
  const formattedSymbol = useMemo(() => {
    const cleanSym = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return cleanSym.startsWith('BINANCE:') ? cleanSym : `BINANCE:${cleanSym}`;
  }, [symbol]);

  const iframeSrc = useMemo(() => {
    const config = {
      autosize: true,
      symbol: formattedSymbol,
      interval: interval, // '240' for 4H
      timezone: 'Etc/UTC',
      theme: theme,
      style: '1', // Candlestick
      locale: 'es',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      withdateranges: true,
      save_image: false,
      details: false,
      hotlist: false,
      support_host: 'https://www.tradingview.com',
      backgroundColor: '#0a0a0a',
      gridColor: '#171717',
    };

    return `https://www.tradingview-widget.com/embed-widget/advanced-chart/?locale=es#${encodeURIComponent(
      JSON.stringify(config)
    )}`;
  }, [formattedSymbol, interval, theme]);

  return (
    <div
      id="tradingview_advanced_chart_wrapper"
      className="w-full relative bg-neutral-950 overflow-hidden border border-neutral-800/80 rounded-lg"
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
    >
      <iframe
        key={`${formattedSymbol}-${interval}`}
        id={`tradingview-iframe-${formattedSymbol}`}
        title={`TradingView Chart ${formattedSymbol}`}
        src={iframeSrc}
        className="w-full h-full border-0 block"
        style={{ width: '100%', height: '100%', border: 0 }}
        allow="clipboard-write"
      />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
