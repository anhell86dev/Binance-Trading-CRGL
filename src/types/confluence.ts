export type ConfluenceFactorKey =
  | 'RSI'
  | 'EMA'
  | 'SOPORTE_RESISTENCIA'
  | 'MACD'
  | 'BOLLINGER'
  | 'TAKER_FLOW'
  | 'TOP_TRADERS'
  | 'FUNDING_OI'
  | 'HIGH_RB'
  | 'IN_ZONE_E1';

export type ConfluenceMatchMode = 'ALL_SELECTED' | 'ANY_SELECTED' | 'MIN_COUNT';

export type ConfluencePreset =
  | 'MAX_CONFLUENCE'
  | 'SCALP_MOMENTUM'
  | 'SWING_TREND'
  | 'SUPPORT_BOUNCE'
  | 'INSTITUTIONAL_FLOW'
  | 'HIGH_RB_ZONE'
  | 'CUSTOM'
  | 'CLEAR';

export interface ConfluenceFactorDefinition {
  key: ConfluenceFactorKey;
  name: string;
  shortName: string;
  category: 'TECHNICAL' | 'DERIVATIVES' | 'STRUCTURE';
  categoryLabel: string;
  description: string;
  tooltipLong: string;
  tooltipShort: string;
  iconName: string;
  color: string;
  bgActive: string;
  borderActive: string;
  textActive: string;
}

export interface StrategyConfluenceEvaluation {
  factorKey: ConfluenceFactorKey;
  isMet: boolean;
  score: number; // 0 to 1
  label: string; // e.g. "RSI: 38.4 (Sobreventa)"
  detail: string; // e.g. "RSI en 4H favorable para entrada Long"
  badgeValue: string; // e.g. "38.4"
  badgeStatus: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface StrategyFullConfluenceResult {
  symbol: string;
  isLong: boolean;
  factors: Record<ConfluenceFactorKey, StrategyConfluenceEvaluation>;
  metFactorsCount: number;
  totalFactorsCount: number;
  confluenceScorePercent: number; // 0-100%
  overallTier: 'MAX_CONFLUENCE' | 'STRONG' | 'MODERATE' | 'WEAK';
  tierLabel: string;
  tierColor: string;
}
