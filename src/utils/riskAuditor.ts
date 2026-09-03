import { OpenOrder, PositionRisk } from '../types/binance';

export type RiskCheckStatus = 'PASS' | 'WARN' | 'FAIL';

export interface RiskCheckItem {
  id: string;
  name: string;
  status: RiskCheckStatus;
  label: string;
  currentValue: string;
  requirement: string;
  description: string;
  recommendation?: string;
}

export interface RiskAuditResult {
  overallStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  score: number; // 0 to 100
  badgeText: string;
  badgeColor: string; // CSS classes
  checks: RiskCheckItem[];
  riskRewardRatio: number | null;
  riskRewardRatioStr: string;
  estimatedLossUsdt: number;
  estimatedProfitUsdt: number;
  walletRiskPercent: number;
  strategyLinked: boolean;
  strategyId?: string;
  strategyName?: string;
}

/**
 * Institutional Risk Management Auditor for Open Orders
 */
export function auditOrderRisk(
  order: OpenOrder,
  walletBalance: number = 1000,
  currentPrice?: number
): RiskAuditResult {
  const price = order.price > 0 ? order.price : (currentPrice || order.stopPrice || 100);
  const qty = order.origQty || 0;
  const lev = Math.max(1, order.leverage || 3);
  const margin = (price * qty) / lev;
  const isBuy = order.side === 'BUY';

  // Reconocer órdenes de protección (Take Profit y Stop Loss)
  const isTP =
    order.type === 'TAKE_PROFIT_MARKET' ||
    (order.type as string) === 'TAKE_PROFIT' ||
    order.clientOrderId?.includes('TP-');
  const isSL =
    order.type === 'STOP_MARKET' ||
    (order.type as string) === 'STOP' ||
    order.type === 'TRAILING_STOP_MARKET' ||
    order.clientOrderId?.includes('SL-');

  if (isTP) {
    return {
      overallStatus: 'OPTIMAL',
      score: 100,
      badgeText: 'PROTECCIÓN (TP)',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      checks: [
        {
          id: 'protective_tp',
          name: 'Orden de Protección',
          status: 'PASS',
          label: 'Take Profit Programado',
          currentValue: `$${(order.price > 0 ? order.price : order.stopPrice || price).toFixed(2)}`,
          requirement: 'Toma de beneficios automática',
          description: 'Orden de salida que asegura ganancias sin arriesgar margen adicional (Reduce-Only).',
        },
        {
          id: 'margin_protective',
          name: 'Margen Requerido',
          status: 'PASS',
          label: '$0.00 (Sin consumo de margen adicional)',
          currentValue: '$0.00 USDT',
          requirement: 'Reduce-Only',
          description: 'Las órdenes de toma de beneficio no inmovilizan colateral nuevo.',
        },
        {
          id: 'leverage_protective',
          name: 'Apalancamiento',
          status: 'PASS',
          label: `${lev}x Aislado`,
          currentValue: `${lev}x`,
          requirement: 'Alineado con posición',
          description: 'Protege la posición aislada correspondiente.',
        },
      ],
      riskRewardRatio: null,
      riskRewardRatioStr: 'N/A (Cierre)',
      estimatedLossUsdt: 0,
      estimatedProfitUsdt: Math.abs((order.price || order.stopPrice || price) - price) * qty,
      walletRiskPercent: 0,
      strategyLinked: !!order.strategyId,
      strategyId: order.strategyId,
    };
  }

  if (isSL) {
    return {
      overallStatus: 'OPTIMAL',
      score: 100,
      badgeText: 'PROTECCIÓN (SL)',
      badgeColor: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      checks: [
        {
          id: 'protective_sl',
          name: 'Orden de Protección',
          status: 'PASS',
          label: 'Stop Loss Programado',
          currentValue: `$${(order.stopPrice || order.price || price).toFixed(2)}`,
          requirement: 'Protección de capital mandatoria',
          description: 'Orden defensiva que corta pérdidas automáticamente para evitar liquidaciones.',
        },
        {
          id: 'margin_protective',
          name: 'Margen Requerido',
          status: 'PASS',
          label: '$0.00 (Sin consumo de margen adicional)',
          currentValue: '$0.00 USDT',
          requirement: 'Reduce-Only',
          description: 'Las órdenes defensivas de corte no consumen colateral nuevo.',
        },
        {
          id: 'leverage_protective',
          name: 'Apalancamiento',
          status: 'PASS',
          label: `${lev}x Aislado`,
          currentValue: `${lev}x`,
          requirement: 'Alineado con posición',
          description: 'Cierra la exposición aislada ante retrocesos.',
        },
      ],
      riskRewardRatio: null,
      riskRewardRatioStr: 'N/A (Defensa)',
      estimatedLossUsdt: 0,
      estimatedProfitUsdt: 0,
      walletRiskPercent: 0,
      strategyLinked: !!order.strategyId,
      strategyId: order.strategyId,
    };
  }

  const checks: RiskCheckItem[] = [];
  let score = 100;

  // 1. Margen Aislado Check (Mandatorio - por defecto en el sistema es ISOLATED)
  const isIsolated = (order.marginType || 'ISOLATED') === 'ISOLATED';
  if (isIsolated) {
    checks.push({
      id: 'margin_type',
      name: 'Tipo de Margen',
      status: 'PASS',
      label: 'Margen Aislado (ISOLATED)',
      currentValue: 'ISOLATED',
      requirement: 'ISOLATED Mandatorio',
      description: 'La orden está confinada a su margen aislado, protegiendo el resto de tu balance.',
    });
  } else {
    score -= 30;
    checks.push({
      id: 'margin_type',
      name: 'Tipo de Margen',
      status: 'FAIL',
      label: 'Margen Cruzado Detectado',
      currentValue: order.marginType || 'CROSSED',
      requirement: 'ISOLATED Mandatorio',
      description: 'Peligro: El margen cruzado expone todo el saldo de tu cuenta ante liquidaciones.',
      recommendation: 'Cambia a margen ISOLATED inmediatamente.',
    });
  }

  // 2. Apalancamiento Seguro (1x a 5x máx)
  if (lev >= 1 && lev <= 3) {
    checks.push({
      id: 'leverage',
      name: 'Apalancamiento',
      status: 'PASS',
      label: `${lev}x (Conservador Institucional)`,
      currentValue: `${lev}x`,
      requirement: '1x a 3x Óptimo (Máx 5x)',
      description: 'Nivel de apalancamiento seguro y controlado dentro de las directrices pro.',
    });
  } else if (lev <= 5) {
    score -= 10;
    checks.push({
      id: 'leverage',
      name: 'Apalancamiento',
      status: 'WARN',
      label: `${lev}x (Máximo Permitido)`,
      currentValue: `${lev}x`,
      requirement: '1x a 3x Recomendado (Máx 5x)',
      description: 'Apalancamiento en el límite superior institucional. Requiere estricta disciplina de Stop Loss.',
      recommendation: 'Considera reducir a 2x-3x para mayor margen de maniobra.',
    });
  } else {
    score -= 35;
    checks.push({
      id: 'leverage',
      name: 'Apalancamiento',
      status: 'FAIL',
      label: `${lev}x (Sobreapalancamiento Crítico)`,
      currentValue: `${lev}x`,
      requirement: 'Máximo 5x',
      description: 'El apalancamiento supera el límite seguro de 5x. Alto riesgo de liquidación rápida.',
      recommendation: 'Ajusta el apalancamiento a ≤ 5x antes de ejecutar.',
    });
  }

  // 3. Stop Loss Mandatorio
  const hasSL = !!order.slPrice && order.slPrice > 0;
  let distSlPct = 0;
  let lossUsdt = margin;

  if (hasSL && order.slPrice) {
    const slDiff = Math.abs(price - order.slPrice);
    distSlPct = price > 0 ? (slDiff / price) * 100 : 0;
    lossUsdt = slDiff * qty;

    // Validate SL side
    const isSlValidSide = isBuy ? order.slPrice < price : order.slPrice > price;

    if (isSlValidSide) {
      checks.push({
        id: 'stop_loss',
        name: 'Stop Loss Mandatorio',
        status: 'PASS',
        label: `SL a $${order.slPrice.toFixed(2)} (-${distSlPct.toFixed(2)}%)`,
        currentValue: `$${order.slPrice.toFixed(2)}`,
        requirement: 'SL Configurado y Válido',
        description: `Pérdida máxima acotada a ~$${lossUsdt.toFixed(2)} USDT si el mercado gira.`,
      });
    } else {
      score -= 25;
      checks.push({
        id: 'stop_loss',
        name: 'Stop Loss Inconsistente',
        status: 'WARN',
        label: `SL a $${order.slPrice.toFixed(2)} (Lado Inverso)`,
        currentValue: `$${order.slPrice.toFixed(2)}`,
        requirement: isBuy ? 'SL < Precio Entrada' : 'SL > Precio Entrada',
        description: 'El Stop Loss está configurado del lado incorrecto de la dirección de la orden.',
        recommendation: `Para una orden ${order.side}, el SL debe ubicarse ${isBuy ? 'abajo' : 'arriba'} del precio de entrada.`,
      });
    }
  } else {
    score -= 30;
    lossUsdt = margin;
    checks.push({
      id: 'stop_loss',
      name: 'Stop Loss Mandatorio',
      status: 'FAIL',
      label: 'Sin Stop Loss Configurado',
      currentValue: 'No definido',
      requirement: 'SL Mandatorio en toda orden',
      description: 'Riesgo Ilimitado: Operar sin Stop Loss viola la disciplina #3 del trader pro.',
      recommendation: 'Asigna un nivel de Stop Loss para limitar la pérdida máxima.',
    });
  }

  // 4. Ratio Riesgo / Beneficio (R:B)
  const hasTP = !!order.tpPrice && order.tpPrice > 0;
  let riskRewardRatio: number | null = null;
  let riskRewardRatioStr = 'N/A';
  let profitUsdt = 0;

  if (hasSL && hasTP && order.slPrice && order.tpPrice) {
    const slDist = Math.abs(price - order.slPrice);
    const tpDist = Math.abs(order.tpPrice - price);
    profitUsdt = tpDist * qty;

    if (slDist > 0) {
      riskRewardRatio = Number((tpDist / slDist).toFixed(2));
      riskRewardRatioStr = `1:${riskRewardRatio.toFixed(2)}`;

      if (riskRewardRatio >= 2.5) {
        checks.push({
          id: 'risk_reward',
          name: 'Ratio Riesgo/Beneficio',
          status: 'PASS',
          label: `R:B ${riskRewardRatioStr} (Asimetría Favorable)`,
          currentValue: riskRewardRatioStr,
          requirement: 'R:B ≥ 1:2.5',
          description: `El beneficio potencial ($${profitUsdt.toFixed(2)}) supera con creces el riesgo ($${lossUsdt.toFixed(2)}).`,
        });
      } else if (riskRewardRatio >= 1.5) {
        score -= 10;
        checks.push({
          id: 'risk_reward',
          name: 'Ratio Riesgo/Beneficio',
          status: 'WARN',
          label: `R:B ${riskRewardRatioStr} (Asimetría Moderada)`,
          currentValue: riskRewardRatioStr,
          requirement: 'R:B ≥ 1:2.5 Recomendado',
          description: 'El ratio es aceptable pero está por debajo del estándar óptimo de 1:2.5.',
          recommendation: 'Amplía el objetivo de TP o ajusta el SL a un nivel técnico más ajustado.',
        });
      } else {
        score -= 25;
        checks.push({
          id: 'risk_reward',
          name: 'Ratio Riesgo/Beneficio',
          status: 'FAIL',
          label: `R:B ${riskRewardRatioStr} (Asimetría Desfavorable)`,
          currentValue: riskRewardRatioStr,
          requirement: 'R:B ≥ 1:2.5',
          description: 'El riesgo asumido es demasiado alto para la ganancia proyectada.',
          recommendation: 'Reestructura los objetivos para asegurar un R:B mínimo de 1:2.5.',
        });
      }
    }
  } else if (hasTP && order.tpPrice) {
    const tpDist = Math.abs(order.tpPrice - price);
    profitUsdt = tpDist * qty;
    score -= 10;
    checks.push({
      id: 'risk_reward',
      name: 'Ratio Riesgo/Beneficio',
      status: 'WARN',
      label: `TP a $${order.tpPrice.toFixed(2)} (Sin SL para cálculo)`,
      currentValue: `TP: $${order.tpPrice.toFixed(2)}`,
      requirement: 'SL y TP configurados',
      description: 'Se tiene objetivo de ganancia pero no se puede calcular el ratio R:B sin Stop Loss.',
      recommendation: 'Define un Stop Loss para validar la asimetría del trade.',
    });
  } else {
    score -= 15;
    checks.push({
      id: 'risk_reward',
      name: 'Ratio Riesgo/Beneficio',
      status: 'WARN',
      label: 'Sin TP Definido',
      currentValue: 'No definido',
      requirement: 'TP y SL configurados',
      description: 'No hay objetivos de salida por Take Profit calculados.',
      recommendation: 'Establece niveles de TP para asegurar toma parcial de beneficios.',
    });
  }

  // 5. Exposición de Capital (% del Balance Total)
  const safeBalance = walletBalance > 0 ? walletBalance : 1000;
  const walletRiskPct = Number(((lossUsdt / safeBalance) * 100).toFixed(2));

  if (walletRiskPct <= 2.0) {
    checks.push({
      id: 'capital_allocation',
      name: 'Exposición de Capital',
      status: 'PASS',
      label: `${walletRiskPct}% del Balance (${lossUsdt.toFixed(2)} USDT)`,
      currentValue: `${walletRiskPct}%`,
      requirement: '≤ 2.0% por trade (Regla #1)',
      description: 'El riesgo por operación está perfectamente alineado con la regla de oro institucional (≤2%).',
    });
  } else if (walletRiskPct <= 5.0) {
    score -= 15;
    checks.push({
      id: 'capital_allocation',
      name: 'Exposición de Capital',
      status: 'WARN',
      label: `${walletRiskPct}% del Balance (${lossUsdt.toFixed(2)} USDT)`,
      currentValue: `${walletRiskPct}%`,
      requirement: '≤ 2.0% Recomendado',
      description: 'El riesgo supera el 2% sugerido por operación. Mantén cautela ante rachas negativas.',
      recommendation: 'Reduce la cantidad o ajusta el SL para arriesgar máx 1%-2% del balance.',
    });
  } else {
    score -= 30;
    checks.push({
      id: 'capital_allocation',
      name: 'Exposición de Capital',
      status: 'FAIL',
      label: `${walletRiskPct}% del Balance (${lossUsdt.toFixed(2)} USDT)`,
      currentValue: `${walletRiskPct}%`,
      requirement: '≤ 2.0% por trade',
      description: 'Sobreexposición severa: Arriesgar más del 5% en un solo trade amenaza la cuenta.',
      recommendation: 'Reduce el tamaño de la orden inmediatamente.',
    });
  }

  // 6. Estrategia Vinculada Check
  const isLinked = !!(order.strategyId || order.strategyName);
  if (isLinked) {
    checks.push({
      id: 'strategy_link',
      name: 'Estrategia Vinculada',
      status: 'PASS',
      label: `${order.strategyId || order.strategyName}`,
      currentValue: order.strategyId || order.strategyName || 'Ligada',
      requirement: 'Ligada a Estrategia Oficial',
      description: 'Esta orden responde a un plan técnico documentado y aprobado.',
    });
  } else {
    score -= 10;
    checks.push({
      id: 'strategy_link',
      name: 'Estrategia Vinculada',
      status: 'WARN',
      label: 'Sin Estrategia Ligada',
      currentValue: 'No vinculada',
      requirement: 'Vincular a Estrategia',
      description: 'Operar órdenes sin estrategia documentada aumenta el riesgo de operaciones impulsivas.',
      recommendation: 'Asocia esta orden a una estrategia activa desde el botón de ligar.',
    });
  }

  const finalScore = Math.max(0, Math.min(100, score));
  let overallStatus: 'OPTIMAL' | 'WARNING' | 'CRITICAL' = 'OPTIMAL';
  let badgeText = 'Gestión Óptima';
  let badgeColor = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';

  const hasFail = checks.some(c => c.status === 'FAIL');
  const warnCount = checks.filter(c => c.status === 'WARN').length;

  if (hasFail || finalScore < 60) {
    overallStatus = 'CRITICAL';
    badgeText = !hasSL ? '⚠️ Sin Stop Loss' : !isIsolated ? '⚠️ Margen Cruzado' : '⚠️ Riesgo Alto';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  } else if (warnCount > 0 || finalScore < 85) {
    overallStatus = 'WARNING';
    badgeText = 'Revisar Gestión';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  return {
    overallStatus,
    score: finalScore,
    badgeText,
    badgeColor,
    checks,
    riskRewardRatio,
    riskRewardRatioStr,
    estimatedLossUsdt: lossUsdt,
    estimatedProfitUsdt: profitUsdt,
    walletRiskPercent: walletRiskPct,
    strategyLinked: isLinked,
    strategyId: order.strategyId,
    strategyName: order.strategyName,
  };
}

/**
 * Institutional Risk Management Auditor for Active Positions
 */
export function auditPositionRisk(
  position: PositionRisk,
  walletBalance: number = 1000
): RiskAuditResult {
  const isBuy = position.positionAmt > 0;
  const dummyOrder: OpenOrder = {
    orderId: `POS-${position.symbol}`,
    clientOrderId: `POS-${position.symbol}`,
    symbol: position.symbol,
    side: isBuy ? 'BUY' : 'SELL',
    type: 'LIMIT',
    price: position.entryPrice,
    origQty: Math.abs(position.positionAmt),
    executedQty: Math.abs(position.positionAmt),
    status: 'FILLED',
    timeInForce: 'GTC',
    leverage: position.leverage,
    marginType: position.marginType,
    tpPrice: position.takeProfit,
    slPrice: position.stopLoss,
    createdAt: position.updatedAt,
    strategyId: position.strategyId,
    strategyName: position.strategyName,
  };

  return auditOrderRisk(dummyOrder, walletBalance, position.markPrice);
}

/**
 * Audit Draft Order configuration in OrderForm before execution
 */
export function auditDraftOrder(
  draft: {
    symbol: string;
    side: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    leverage: number;
    marginType?: 'ISOLATED';
    tpPrice?: number;
    slPrice?: number;
    strategyId?: string;
    strategyName?: string;
  },
  walletBalance: number = 1000
): RiskAuditResult {
  const dummyOrder: OpenOrder = {
    orderId: `DRAFT-${Date.now()}`,
    clientOrderId: `DRAFT-${Date.now()}`,
    symbol: draft.symbol,
    side: draft.side,
    type: 'LIMIT',
    price: draft.price,
    origQty: draft.quantity,
    executedQty: 0,
    status: 'NEW',
    timeInForce: 'GTC',
    leverage: draft.leverage,
    marginType: draft.marginType || 'ISOLATED',
    tpPrice: draft.tpPrice,
    slPrice: draft.slPrice,
    createdAt: Date.now(),
    strategyId: draft.strategyId,
    strategyName: draft.strategyName,
  };

  return auditOrderRisk(dummyOrder, walletBalance, draft.price);
}
