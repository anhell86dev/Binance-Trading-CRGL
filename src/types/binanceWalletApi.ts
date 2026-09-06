/**
 * Binance Wallet REST API TypeScript Types & Schemas
 * Strictly aligned with the official Binance Wallet OpenAPI 3.0.2 specification.
 * 
 * Includes:
 * - Account Info & Status (/sapi/v1/account/*)
 * - API Restrictions & Permissions (/sapi/v1/account/apiRestrictions)
 * - Wallet Balances & Assets (/sapi/v1/asset/wallet/balance, /sapi/v3/asset/getUserAsset)
 * - Daily Account Snapshots (/sapi/v1/accountSnapshot)
 * - Capital / Coins Information (/sapi/v1/capital/config/getall)
 * - Trade Fees & BNB Burn (/sapi/v1/asset/tradeFee, /sapi/v1/bnbBurn)
 * - Deposits & Withdrawals (/sapi/v1/capital/deposit/*, /sapi/v1/capital/withdraw/*)
 * - System Status (/sapi/v1/system/status)
 */

// ============================================================================
// 1. ACCOUNT INFO & STATUS (/sapi/v1/account/*)
// ============================================================================

export interface BinanceAccountInfo {
  vipLevel: number;
  isMarginEnabled: boolean;
  isFutureEnabled: boolean;
  isOptionsEnabled: boolean;
  isPortfolioMarginRetailEnabled: boolean;
}

export interface BinanceAccountStatus {
  data: string; // e.g. "Normal"
}

export interface BinanceAccountApiTradingStatus {
  data: {
    isLocked: boolean;
    plannedRecoverTime: number;
    triggerCondition: {
      GCR: number;
      IFER: number;
      UFR: number;
    };
    updateTime: number;
  };
}

export interface BinanceApiKeyPermissions {
  ipRestrict: boolean;
  createTime: number;
  enableReading: boolean;
  enableWithdrawals: boolean;
  enableInternalTransfer: boolean;
  enableMargin: boolean;
  enableFutures: boolean;
  permitsUniversalTransfer: boolean;
  enableVanillaOptions: boolean;
  enableFixApiTrade: boolean;
  enableFixReadOnly: boolean;
  enableSpotAndMarginTrading: boolean;
  enablePortfolioMarginTrading: boolean;
}

// ============================================================================
// 2. WALLET BALANCES & USER ASSETS (/sapi/v1/asset/wallet/balance, /sapi/v3/asset/getUserAsset)
// ============================================================================

export interface BinanceWalletAssetBalance {
  asset: string;
  assetName: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  btcValuation: string;
}

export interface BinanceUserWalletBalanceItem {
  activate: boolean;
  balance: string;
  walletName: string; // "Spot" | "Futures" | "Funding" | "Cross Margin" | "Isolated Margin" | "Earn"
  assetBalances?: BinanceWalletAssetBalance[];
}

export interface BinanceUserAssetItem {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoable: string;
  btcValuation: string;
}

export interface BinanceFundingWalletAsset {
  asset: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  btcValuation: string;
}

// ============================================================================
// 3. DAILY ACCOUNT SNAPSHOTS (/sapi/v1/accountSnapshot)
// ============================================================================

export interface BinanceSnapshotSpotBalance {
  asset: string;
  free: string;
  locked: string;
}

export interface BinanceSnapshotMarginUserAsset {
  asset: string;
  borrowed: string;
  free: string;
  interest: string;
  locked: string;
  netAsset: string;
}

export interface BinanceSnapshotFuturesAsset {
  asset: string;
  marginBalance: string;
  walletBalance: string;
}

export interface BinanceSnapshotFuturesPosition {
  entryPrice: string;
  markPrice: string;
  positionAmt: string;
  symbol: string;
  unRealizedProfit: string;
}

export interface BinanceSnapshotData {
  balances?: BinanceSnapshotSpotBalance[];
  userAssets?: BinanceSnapshotMarginUserAsset[];
  assets?: BinanceSnapshotFuturesAsset[];
  position?: BinanceSnapshotFuturesPosition[];
  totalAssetOfBtc?: string;
  marginLevel?: string;
  totalLiabilityOfBtc?: string;
  totalNetAssetOfBtc?: string;
}

export interface BinanceAccountSnapshotVo {
  type: 'spot' | 'margin' | 'futures' | string;
  updateTime: number;
  data: BinanceSnapshotData;
}

export interface BinanceAccountSnapshotResponse {
  code: number;
  msg: string;
  snapshotVos: BinanceAccountSnapshotVo[];
}

// ============================================================================
// 4. COIN CONFIGURATIONS & CAPITAL (/sapi/v1/capital/config/getall)
// ============================================================================

export interface BinanceCoinNetwork {
  network: string;
  coin: string;
  name: string;
  withdrawIntegerMultiple: string;
  isDefault: boolean;
  depositEnable: boolean;
  withdrawEnable: boolean;
  depositDesc: string;
  withdrawDesc: string;
  specialTips: string;
  specialWithdrawTips: string;
  resetAddressStatus: boolean;
  addressRegex: string;
  memoRegex: string;
  withdrawFee: string;
  withdrawMin: string;
  withdrawMax: string;
  withdrawInternalMin: string;
  depositDust: string;
  minConfirm: number;
  unLockConfirm: number;
  sameAddress: boolean;
  withdrawTag: boolean;
  estimatedArrivalTime: number;
  busy: boolean;
  contractAddressUrl?: string;
  contractAddress?: string;
  denomination?: number;
}

export interface BinanceCoinConfig {
  coin: string;
  name: string;
  free: string;
  locked: string;
  freeze: string;
  withdrawing: string;
  ipoing: string;
  ipoable: string;
  storage: string;
  isLegalMoney: boolean;
  trading: boolean;
  depositAllEnable: boolean;
  withdrawAllEnable: boolean;
  networkList: BinanceCoinNetwork[];
}

// ============================================================================
// 5. TRADE FEES & BNB BURN (/sapi/v1/asset/tradeFee, /sapi/v1/bnbBurn)
// ============================================================================

export interface BinanceTradeFeeItem {
  symbol: string;
  makerCommission: string;
  takerCommission: string;
}

export interface BinanceBnbBurnStatus {
  spotBNBBurn: boolean;
  interestBNBBurn: boolean;
}

// ============================================================================
// 6. DEPOSITS & WITHDRAWALS (/sapi/v1/capital/deposit/*, /sapi/v1/capital/withdraw/*)
// ============================================================================

export interface BinanceDepositAddress {
  address: string;
  coin: string;
  tag: string;
  url: string;
}

export interface BinanceDepositHistoryItem {
  id: string;
  amount: string;
  coin: string;
  network: string;
  status: number; // 0: pending, 1: success, 2: rejected, 6: credited but cannot withdraw, 7: Wrong Deposit, 8: Waiting User confirm
  address: string;
  addressTag: string;
  txId: string;
  insertTime: number;
  completeTime: number;
  transferType: number;
  confirmTimes: string;
  unlockConfirm: number;
  walletType: number;
  travelRuleStatus: number;
}

export interface BinanceWithdrawHistoryItem {
  id: string;
  amount: string;
  transactionFee: string;
  coin: string;
  status: number; // 0: Email Sent, 2: Awaiting Approval, 3: Rejected, 4: Processing, 6: Completed
  address: string;
  txId: string;
  applyTime: string;
  network: string;
  transferType: number;
  withdrawOrderId?: string;
  info?: string;
  confirmNo?: number;
  walletType: number;
  txKey?: string;
  completeTime?: string;
}

export interface BinanceWithdrawQuota {
  wdQuota: string;
  usedWdQuota: string;
}

// ============================================================================
// 7. UNIVERSAL TRANSFERS (/sapi/v1/asset/transfer)
// ============================================================================

export type BinanceUniversalTransferType =
  | 'MAIN_UMFUTURE' // Spot → USDⓈ-M Futures
  | 'UMFUTURE_MAIN' // USDⓈ-M Futures → Spot
  | 'MAIN_CMFUTURE' // Spot → COIN-M Futures
  | 'CMFUTURE_MAIN' // COIN-M Futures → Spot
  | 'MAIN_MARGIN' // Spot → Margin (cross)
  | 'MARGIN_MAIN' // Margin (cross) → Spot
  | 'MAIN_FUNDING' // Spot → Funding
  | 'FUNDING_MAIN' // Funding → Spot
  | 'FUNDING_UMFUTURE' // Funding → USDⓈ-M Futures
  | 'UMFUTURE_FUNDING' // USDⓈ-M Futures → Funding
  | 'MARGIN_UMFUTURE' // Margin (cross) → USDⓈ-M Futures
  | 'UMFUTURE_MARGIN' // USDⓈ-M Futures → Margin (cross)
  | 'ISOLATEDMARGIN_MARGIN' // Isolated margin → Margin (cross)
  | 'MARGIN_ISOLATEDMARGIN' // Margin (cross) → Isolated margin
  | 'ISOLATEDMARGIN_ISOLATEDMARGIN'; // Isolated margin → Isolated margin

export interface BinanceUniversalTransferHistoryItem {
  asset: string;
  amount: string;
  type: BinanceUniversalTransferType | string;
  status: string; // 'CONFIRMED' | 'FAILED' | 'PENDING'
  tranId: number;
  timestamp: number;
}

export interface BinanceUniversalTransferHistoryResponse {
  total: number;
  rows: BinanceUniversalTransferHistoryItem[];
}

// ============================================================================
// 8. DUST CONVERSIONS & DIVIDENDS (/sapi/v1/asset/dust*, /sapi/v1/asset/assetDividend)
// ============================================================================

export interface BinanceDustConvertResult {
  totalTransfered: string;
  totalServiceCharge: string;
  transferResult: Array<{
    tranId: number;
    fromAsset: string;
    amount: string;
    transferedAmount: string;
    serviceChargeAmount: string;
    operateTime: number;
  }>;
}

export interface BinanceDustLogItem {
  operateTime: number;
  totalTransferedAmount: string;
  totalServiceChargeAmount: string;
  transId: number;
  userAssetDribbletDetails: Array<{
    transId: number;
    serviceChargeAmount: string;
    amount: string;
    operateTime: number;
    transferedAmount: string;
    fromAsset: string;
    targetAsset: string;
  }>;
}

export interface BinanceAssetDividendRecord {
  total: number;
  rows: Array<{
    id: number;
    amount: string;
    asset: string;
    divTime: number;
    enInfo: string;
    tranId: number;
    direction: number;
  }>;
}

// ============================================================================
// 9. SYSTEM STATUS (/sapi/v1/system/status)
// ============================================================================

export interface BinanceSystemStatus {
  status: number; // 0: normal, 1: maintenance
  msg: string; // "normal"
}

// ============================================================================
// 10. COMBINED UNIFIED ACCOUNT PROFILE (App-Level Consolidator)
// ============================================================================

export interface BinanceUnifiedAccountProfile {
  accountInfo: BinanceAccountInfo;
  accountStatus: BinanceAccountStatus;
  apiTradingStatus: BinanceAccountApiTradingStatus;
  apiRestrictions: BinanceApiKeyPermissions;
  walletBalances: BinanceUserWalletBalanceItem[];
  userAssets: BinanceUserAssetItem[];
  bnbBurn: BinanceBnbBurnStatus;
  systemStatus: BinanceSystemStatus;
  lastUpdated: number;
}
