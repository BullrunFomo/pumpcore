// ─── Wallet Funding ───────────────────────────────────────────────────────────

export interface WalletFundingRecord {
  sourceAddress: string | null;
  sourceLabel: string | null;
  timestamp: number | null; // ms
  amountSol: number;
  // True once we've attempted a fetch — prevents repeated API calls for wallets
  // where no funding transaction was found on-chain.
  fetched: boolean;
}

// ─── Wallet ───────────────────────────────────────────────────────────────────

export interface WalletInfo {
  id: string;
  address: string;
  privateKey: string; // base58
  solBalance: number;
  tokenBalance: number;
  avgBuyPrice: number; // SOL per token
  totalSolSpent: number;
  status: "idle" | "pending" | "confirmed" | "failed";
  color: string;
  importedAt?: string; // ISO timestamp of when the wallet was imported
}

// ─── Token Config ─────────────────────────────────────────────────────────────

export type TokenType = "Standard" | "Mayhem Mode" | "Cashback" | "Agent";

export interface TokenConfig {
  name: string;
  symbol: string;
  logoFile: File | null;
  logoUri: string;
  website: string;
  twitter: string;
  telegram: string;
  tokenType: TokenType;
  metadataUri: string;
  mintAddress: string;
}

// ─── Bundle Config ────────────────────────────────────────────────────────────

export type LaunchType = "classic" | "stagger";

export interface BundleConfig {
  selectedWalletIds: string[];
  devWalletId: string;
  solPerWallet: number;
  jitoTipSol: number;
  launchType: LaunchType;
  staggerDelayMs: number;
  walletBuyAmounts: Record<string, number>;
}

// ─── Optional Settings ────────────────────────────────────────────────────────

export type AutoSellMode = "time" | "mcap";

export interface AutoSellConfig {
  enabled: boolean;
  mode: AutoSellMode;
  sellPct: number;
  timeSeconds: number;
  mcapTarget: number;
}

// ─── Launch State ─────────────────────────────────────────────────────────────

export type LaunchLogLevel = "info" | "success" | "error" | "warn";

export interface LaunchLogEntry {
  id: string;
  timestamp: Date;
  level: LaunchLogLevel;
  message: string;
  txSig?: string;
  walletAddress?: string;
}

export interface LaunchState {
  step: number; // 1-4
  tokenConfig: TokenConfig;
  bundleConfig: BundleConfig;
  autoSell: AutoSellConfig;
  isLaunching: boolean;
  logs: LaunchLogEntry[];
  launched: boolean;
}

// ─── Trade ────────────────────────────────────────────────────────────────────

export interface TradeRecord {
  id: string;
  walletAddress: string;
  type: "buy" | "sell";
  solAmount: number;
  tokenAmount: number;
  price: number;
  txSig: string;
  timestamp: Date;
  status: "pending" | "confirmed" | "failed";
}

// ─── Launch Record ────────────────────────────────────────────────────────────

export interface LaunchRecord {
  id: string;
  mintAddress: string;
  name: string;
  symbol: string;
  logoUri: string;
  launchedAt: string; // ISO
}

// ─── Price ────────────────────────────────────────────────────────────────────

export interface TokenPrice {
  price: number; // SOL per token
  priceUsd: number;
  mcap: number; // USD
  solPrice: number; // USD per SOL
}
