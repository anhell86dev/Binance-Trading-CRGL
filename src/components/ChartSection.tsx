import React, { useRef, useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  Layers,
  Maximize2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { binanceWs } from '../services/binanceWs';
import { KlineCandle, OrderBook, PositionRisk, TickerData } from '../types/binance';

export const ChartSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [ticker, setTicker] = useState<TickerData>(binanceWs.getTicker());
  const [candles, setCandles] = useState<KlineCandle[]>(binanceWs.getCandles());
  const [orderBook, setOrderBook] = useState<OrderBook>(binanceWs.getOrderBook());
  const [positions, setPositions] = useState<PositionRisk[]>(binanceWs.getPositions());
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [showOrderBook, setShowOrderBook] = useState<boolean>(true);
  const [hoverData, setHoverData] = useState<{ price: number; time: string } | null>(null);

  useEffect(() => {
    const unsub = binanceWs.subscribe(() => {
      setTicker(binanceWs.getTicker());
      setCandles(binanceWs.getCandles());
      setOrderBook(binanceWs.getOrderBook());
      setPositions(binanceWs.getPositions());
    });
    return () => unsub();
  }, []);

  // Responsive canvas resizing & rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);

      const width = rect.width;
      const height = rect.height;

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, width, height);

      if (candles.length === 0) return;

      // Calculate price domain
      const visibleCandles = candles.slice(-60);
      let minPrice = Infinity;
      let maxPrice = -Infinity;
      let maxVol = 0;

      visibleCandles.forEach(c => {
        if (c.low < minPrice) minPrice = c.low;
        if (c.high > maxPrice) maxPrice = c.high;
        if (c.volume > maxVol) maxVol = c.volume;
      });

      // Price buffer
      const padding = (maxPrice - minPrice) * 0.1 || 10;
      minPrice -= padding;
      maxPrice += padding;
      const priceRange = maxPrice - minPrice;

      // Dimensions
      const chartHeight = height * 0.75;
      const volumeHeight = height * 0.2;
      const volumeTop = chartHeight + height * 0.05;

      const candleSpacing = width / visibleCandles.length;
      const candleWidth = Math.max(2, candleSpacing * 0.7);

      // Draw horizontal price gridlines
      ctx.strokeStyle = '#262626';
      ctx.lineWidth = 1;
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillStyle = '#737373';
      ctx.textAlign = 'right';

      const gridSteps = 5;
      for (let i = 0; i <= gridSteps; i++) {
        const p = minPrice + (priceRange * i) / gridSteps;
        const y = chartHeight - ((p - minPrice) / priceRange) * chartHeight;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width - 55, y);
        ctx.stroke();
        ctx.fillText(`$${p.toFixed(2)}`, width - 8, y + 3);
      }

      // Draw Candlesticks & Volume
      visibleCandles.forEach((c, idx) => {
        const x = idx * candleSpacing + candleSpacing / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? '#10b981' : '#f43f5e'; // Emerald & Rose

        // Volume Bar
        const vHeight = maxVol > 0 ? (c.volume / maxVol) * volumeHeight : 0;
        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
        ctx.fillRect(x - candleWidth / 2, height - vHeight, candleWidth, vHeight);

        // Candlestick Wick
        const yHigh = chartHeight - ((c.high - minPrice) / priceRange) * chartHeight;
        const yLow = chartHeight - ((c.low - minPrice) / priceRange) * chartHeight;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, yHigh);
        ctx.lineTo(x, yLow);
        ctx.stroke();

        // Candlestick Body
        const yOpen = chartHeight - ((c.open - minPrice) / priceRange) * chartHeight;
        const yClose = chartHeight - ((c.close - minPrice) / priceRange) * chartHeight;
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

        ctx.fillStyle = color;
        ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
      });

      // Current Price Line
      const currentPriceY = chartHeight - ((ticker.lastPrice - minPrice) / priceRange) * chartHeight;
      if (currentPriceY >= 0 && currentPriceY <= chartHeight) {
        ctx.strokeStyle = '#f59e0b'; // Amber
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, currentPriceY);
        ctx.lineTo(width - 60, currentPriceY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Tag
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(width - 60, currentPriceY - 9, 58, 18);
        ctx.fillStyle = '#0a0a0a';
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ticker.lastPrice.toFixed(2), width - 31, currentPriceY + 3);
      }

      // Draw Open Position Overlay
      const currentPos = positions.find(p => p.symbol === ticker.symbol);
      if (currentPos && currentPos.entryPrice) {
        const entryY = chartHeight - ((currentPos.entryPrice - minPrice) / priceRange) * chartHeight;
        if (entryY >= 0 && entryY <= chartHeight) {
          ctx.strokeStyle = '#3b82f6'; // Blue
          ctx.setLineDash([2, 2]);
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(0, entryY);
          ctx.lineTo(width - 60, entryY);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(width - 60, entryY - 8, 58, 16);
          ctx.fillStyle = '#ffffff';
          ctx.font = '9px JetBrains Mono, monospace';
          ctx.textAlign = 'center';
          ctx.fillText(`ENT $${currentPos.entryPrice.toFixed(1)}`, width - 31, entryY + 4);
        }

        // Draw Liquidation Price Line
        if (currentPos.liquidationPrice) {
          const liqY = chartHeight - ((currentPos.liquidationPrice - minPrice) / priceRange) * chartHeight;
          if (liqY >= 0 && liqY <= chartHeight) {
            ctx.strokeStyle = '#e11d48'; // Bright red
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(0, liqY);
            ctx.lineTo(width - 60, liqY);
            ctx.stroke();

            ctx.fillStyle = '#e11d48';
            ctx.fillRect(width - 60, liqY - 8, 58, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 9px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`LIQ $${currentPos.liquidationPrice.toFixed(1)}`, width - 31, liqY + 4);
          }
        }
      }
    };

    render();

    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [candles, ticker, positions]);

  const priceColor = ticker.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400';
  const spread = ticker.bestAsk && ticker.bestBid ? (ticker.bestAsk - ticker.bestBid).toFixed(2) : '1.00';

  return (
    <div className="bg-neutral-900/80 border border-neutral-800/80 rounded-xl overflow-hidden flex flex-col">
      {/* Top Bar: Symbol Ticker Stats & Timeframe */}
      <div className="p-3 border-b border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 bg-neutral-900">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Symbol & Price */}
          <div className="flex items-baseline gap-2">
            <h2 className="text-base font-bold text-white tracking-wide">{ticker.symbol}</h2>
            <span className={`text-xl font-bold font-mono ${priceColor}`}>
              ${ticker.lastPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className={`flex items-center text-xs font-mono font-medium ${priceColor}`}>
              {ticker.change24h >= 0 ? '+' : ''}{ticker.change24hPercent.toFixed(2)}%
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-4 text-xs font-mono text-neutral-400">
            <div>
              <span className="text-neutral-400 block text-[10px]">24h Alto</span>
              <span className="text-neutral-200">${ticker.high24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">24h Bajo</span>
              <span className="text-neutral-200">${ticker.low24h.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">24h Vol (USDT)</span>
              <span className="text-neutral-200">${(ticker.volume24h * ticker.lastPrice / 1000000).toFixed(1)}M</span>
            </div>
            <div>
              <span className="text-neutral-400 block text-[10px]">Mark / Index</span>
              <span className="text-amber-400">${ticker.markPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Timeframes & Toggle Orderbook */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
            {['1m', '5m', '15m', '1h', '4h', '1D'].map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-0.5 rounded font-mono text-xs transition-colors ${
                  timeframe === tf ? 'bg-neutral-800 text-amber-400 font-bold' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowOrderBook(!showOrderBook)}
            className={`px-2 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 transition-colors ${
              showOrderBook
                ? 'bg-neutral-800 text-amber-300 border-neutral-700'
                : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-neutral-200'
            }`}
            title="Mostrar / Ocultar Libro de Órdenes"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Libro</span>
          </button>
        </div>
      </div>

      {/* Main Area: Canvas Chart + Mini Orderbook */}
      <div className="flex flex-col lg:flex-row h-[420px] w-full relative">
        {/* Candlestick Canvas */}
        <div ref={containerRef} className="flex-1 h-full relative bg-neutral-950">
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Quick Indicator Tag in Chart */}
          <div className="absolute top-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono text-neutral-400">
              MA(7) • MA(25) • Vol
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-950/70 border border-emerald-800/80 text-[11px] font-mono text-emerald-400">
              ● Live WS Ticks
            </span>
          </div>
        </div>

        {/* Mini Orderbook / Depth Ladder */}
        {showOrderBook && (
          <div className="w-full lg:w-64 border-t lg:border-t-0 lg:border-l border-neutral-800/80 bg-neutral-950/90 flex flex-col justify-between p-2 text-xs font-mono select-none overflow-hidden">
            <div className="flex items-center justify-between text-neutral-400 pb-1 border-b border-neutral-900 text-[11px]">
              <span>Precio (USDT)</span>
              <span>Tamaño</span>
              <span>Total</span>
            </div>

            {/* Asks (Ventas - Red) */}
            <div className="flex flex-col-reverse gap-0.5 overflow-hidden py-1">
              {orderBook.asks.slice(0, 6).map((ask, i) => (
                <div key={i} className="flex justify-between items-center relative py-0.5 text-[11px]">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-rose-500/10 pointer-events-none"
                    style={{ width: `${Math.min(100, (ask.amount / 2) * 100)}%` }}
                  />
                  <span className="text-rose-400 font-semibold">${ask.price.toFixed(2)}</span>
                  <span className="text-neutral-300">{ask.amount.toFixed(3)}</span>
                  <span className="text-neutral-400">{ask.total.toFixed(3)}</span>
                </div>
              ))}
            </div>

            {/* Middle Spread Banner */}
            <div className="py-1.5 px-2 my-1 rounded bg-neutral-900 border border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className={`font-bold text-sm ${priceColor}`}>${ticker.lastPrice.toFixed(2)}</span>
                {ticker.change24h >= 0 ? (
                  <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 text-rose-400" />
                )}
              </div>
              <span className="text-[10px] text-neutral-400">Spread: ${spread}</span>
            </div>

            {/* Bids (Compras - Green) */}
            <div className="flex flex-col gap-0.5 overflow-hidden py-1">
              {orderBook.bids.slice(0, 6).map((bid, i) => (
                <div key={i} className="flex justify-between items-center relative py-0.5 text-[11px]">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-emerald-500/10 pointer-events-none"
                    style={{ width: `${Math.min(100, (bid.amount / 2) * 100)}%` }}
                  />
                  <span className="text-emerald-400 font-semibold">${bid.price.toFixed(2)}</span>
                  <span className="text-neutral-300">{bid.amount.toFixed(3)}</span>
                  <span className="text-neutral-400">{bid.total.toFixed(3)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
