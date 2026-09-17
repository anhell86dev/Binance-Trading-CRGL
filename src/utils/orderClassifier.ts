import { OpenOrder, OrderSide, OrderType } from '../types/binance';

export type OrderCategory = 'STOP_LOSS' | 'TAKE_PROFIT' | 'LIMIT' | 'MARKET' | 'TRAILING_STOP' | 'OTHER';

export interface ClassifiedOrder {
  order: OpenOrder;
  category: OrderCategory;
  categoryLabel: string;
  isStopLoss: boolean;
  isTakeProfit: boolean;
  isLimit: boolean;
  isTrailing: boolean;
  /**
   * Effective activation / execution price
   * For STOP_LOSS and TAKE_PROFIT: stopPrice takes precedence, otherwise price
   * For LIMIT: price
   */
  effectivePrice: number;
  triggerPrice?: number;
  limitPrice?: number;
  colorClass: {
    bg: string;
    text: string;
    border: string;
    badge: string;
  };
}

/**
 * Classifies any Binance open order (Spot or Futures USD-M) into:
 * - STOP_LOSS / STOP_LOSS_LIMIT / STOP_MARKET
 * - TAKE_PROFIT / TAKE_PROFIT_LIMIT / TAKE_PROFIT_MARKET
 * - LIMIT
 * - TRAILING_STOP_MARKET
 * - OTHER
 */
export function classifyBinanceOrder(order: OpenOrder, referencePrice?: number): ClassifiedOrder {
  const typeStr = String(order.type || '').toUpperCase();
  const clientOrderId = (order.clientOrderId || '').toUpperCase();
  const stopPrice = order.stopPrice && order.stopPrice > 0 ? order.stopPrice : 0;
  const price = order.price && order.price > 0 ? order.price : 0;
  const refP = referencePrice && referencePrice > 0 ? referencePrice : (order.price > 0 ? order.price : stopPrice);

  let category: OrderCategory = 'OTHER';
  let categoryLabel = typeStr || 'ORDEN';

  const isExplicitSL =
    typeStr.includes('STOP_LOSS') ||
    typeStr === 'STOP' ||
    typeStr === 'STOP_MARKET' ||
    typeStr === 'STOP_LOSS_LIMIT' ||
    clientOrderId.includes('SL-') ||
    clientOrderId.includes('STOP');

  const isExplicitTP =
    typeStr.includes('TAKE_PROFIT') ||
    typeStr === 'TAKE_PROFIT_MARKET' ||
    typeStr === 'TAKE_PROFIT_LIMIT' ||
    clientOrderId.includes('TP-');

  const isTrailing =
    typeStr.includes('TRAILING') ||
    order.type === 'TRAILING_STOP_MARKET' ||
    (order.callbackRate !== undefined && order.callbackRate > 0);

  if (isTrailing) {
    category = 'TRAILING_STOP';
    categoryLabel = `TRAILING (${order.callbackRate || 1}%)`;
  } else if (isExplicitTP) {
    category = 'TAKE_PROFIT';
    categoryLabel = typeStr.includes('LIMIT') ? 'TP LIMIT' : 'TAKE PROFIT (TP)';
  } else if (isExplicitSL) {
    category = 'STOP_LOSS';
    categoryLabel = typeStr.includes('LIMIT') ? 'SL LIMIT' : 'STOP LOSS (SL)';
  } else if (typeStr === 'LIMIT') {
    category = 'LIMIT';
    categoryLabel = order.side === 'BUY' ? 'LIMIT COMPRA' : 'LIMIT VENTA';
  } else if (stopPrice > 0 && refP > 0) {
    // If order has a stopPrice but generic type:
    // When selling to close long or buying to close short:
    // If stopPrice is below ref price for sell => Stop Loss; if above => Take Profit
    if (order.side === 'SELL') {
      if (stopPrice < refP) {
        category = 'STOP_LOSS';
        categoryLabel = 'STOP LOSS (SL)';
      } else {
        category = 'TAKE_PROFIT';
        categoryLabel = 'TAKE PROFIT (TP)';
      }
    } else {
      // BUY side closing short or buying dip
      if (stopPrice > refP) {
        category = 'STOP_LOSS';
        categoryLabel = 'STOP LOSS (SL)';
      } else {
        category = 'TAKE_PROFIT';
        categoryLabel = 'TAKE PROFIT (TP)';
      }
    }
  } else if (typeStr.includes('MARKET')) {
    category = 'MARKET';
    categoryLabel = 'A MERCADO';
  }

  const isStopLoss = category === 'STOP_LOSS';
  const isTakeProfit = category === 'TAKE_PROFIT';
  const isLimit = category === 'LIMIT';

  // Effective trigger / target price
  const effectivePrice = isStopLoss || isTakeProfit
    ? (stopPrice > 0 ? stopPrice : price)
    : (price > 0 ? price : stopPrice);

  let colorClass = {
    bg: 'bg-neutral-900',
    text: 'text-neutral-300',
    border: 'border-neutral-700',
    badge: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  };

  if (isStopLoss) {
    colorClass = {
      bg: 'bg-rose-950/80',
      text: 'text-rose-400',
      border: 'border-rose-700/80',
      badge: 'bg-rose-950/90 text-rose-300 border-rose-700/80 shadow-[0_0_8px_rgba(244,63,94,0.3)]',
    };
  } else if (isTakeProfit) {
    colorClass = {
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-400',
      border: 'border-emerald-700/80',
      badge: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
    };
  } else if (isLimit) {
    colorClass = {
      bg: 'bg-amber-950/70',
      text: 'text-amber-400',
      border: 'border-amber-700/80',
      badge: 'bg-amber-950/90 text-amber-300 border-amber-700/80',
    };
  } else if (isTrailing) {
    colorClass = {
      bg: 'bg-blue-950/80',
      text: 'text-blue-400',
      border: 'border-blue-700/80',
      badge: 'bg-blue-950/90 text-blue-300 border-blue-700/80',
    };
  }

  return {
    order,
    category,
    categoryLabel,
    isStopLoss,
    isTakeProfit,
    isLimit,
    isTrailing,
    effectivePrice,
    triggerPrice: stopPrice > 0 ? stopPrice : undefined,
    limitPrice: price > 0 ? price : undefined,
    colorClass,
  };
}

/**
 * Filter orders specifically for a given symbol and classify them
 */
export function getSymbolClassifiedOrders(
  openOrders: OpenOrder[],
  symbol: string,
  referencePrice?: number
): ClassifiedOrder[] {
  const cleanSym = symbol.replace(/[^A-Z0-9]/g, '').toUpperCase();
  const filtered = openOrders.filter((o) => {
    if (!o || o.status === 'CANCELED' || o.status === 'EXPIRED' || o.status === 'FILLED') {
      return false;
    }
    const orderSym = (o.symbol || '').replace(/[^A-Z0-9]/g, '').toUpperCase();
    return orderSym === cleanSym;
  });

  return filtered.map((ord) => classifyBinanceOrder(ord, referencePrice));
}
