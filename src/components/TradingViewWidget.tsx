import React, { useEffect, useRef, memo } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Clear previous widget
    container.innerHTML = '';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = '100%';
    widgetDiv.style.width = '100%';
    container.appendChild(widgetDiv);

    // Format clean symbol: BINANCE:ZECUSDT, BINANCE:TAOUSDT, etc.
    const cleanSym = symbol.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const formattedSymbol = cleanSym.startsWith('BINANCE:') ? cleanSym : `BINANCE:${cleanSym}`;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
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
    });

    container.appendChild(script);

    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, interval, theme]);

  return (
    <div
      ref={containerRef}
      id="tradingview_advanced_chart_wrapper"
      className="tradingview-widget-container w-full relative bg-neutral-950 overflow-hidden"
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
    >
      <div
        className="tradingview-widget-container__widget"
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
