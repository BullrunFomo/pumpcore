import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getAccountStoreName } from "@/lib/auth";
import type {
  WalletInfo,
  WalletFundingRecord,
  LaunchState,
  TokenConfig,
  BundleConfig,
  AutoSellConfig,
  SniperGuardConfig,
  LaunchLogEntry,
  TradeRecord,
  TokenPrice,
  LaunchRecord,
} from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const WALLET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7",
];

function randomId() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultTokenConfig(): TokenConfig {
  return {
    name: "",
    symbol: "",
    logoFile: null,
    logoUri: "",
    website: "",
    twitter: "",
    telegram: "",
    tokenType: "Standard",
    metadataUri: "",
    mintAddress: "",
  };
}

function defaultBundleConfig(): BundleConfig {
  return {
    selectedWalletIds: [],
    devWalletId: "",
    solPerWallet: 0.1,
    jitoTipSol: 0.005,
    launchType: "classic",
    staggerDelayMs: 500,
    walletBuyAmounts: {},
  };
}

function defaultAutoSell(): AutoSellConfig {
  return {
    enabled: false,
    mode: "time",
    sellPct: 100,
    timeSeconds: 300,
    mcapTarget: 50000,
  };
}

function defaultSniperGuard(): SniperGuardConfig {
  return {
    enabled: false,
    solThreshold: 5,
    action: "stop",
  };
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // Funding wallet (persistent)
  fundingWallet: { address: string; privateKey: string };
  rotateFundingWallet: () => void;
  fundingBalance: number;
  setFundingBalance: (v: number) => void;
  fundingDate: string | null;
  setFundingDate: (v: string) => void;

  // Wallets
  wallets: WalletInfo[];
  addWallets: (wallets: WalletInfo[]) => void;
  updateWallet: (id: string, patch: Partial<WalletInfo>) => void;
  removeWallet: (id: string) => void;
  clearWallets: () => void;
  refreshBalances: () => Promise<void>;

  // Wallet funding info (persisted cache — keyed by wallet address)
  walletFunding: Record<string, WalletFundingRecord>;
  setWalletFunding: (address: string, record: WalletFundingRecord) => void;
  mergeWalletFunding: (records: Record<string, WalletFundingRecord>) => void;

  // Active token
  activeTokenMint: string;
  setActiveTokenMint: (mint: string) => void;
  tokenMeta: { name: string; symbol: string; image: string } | null;
  setTokenMeta: (meta: { name: string; symbol: string; image: string }) => void;

  // Launch flow
  launch: LaunchState;
  setLaunchStep: (step: number) => void;
  updateTokenConfig: (patch: Partial<TokenConfig>) => void;
  updateBundleConfig: (patch: Partial<BundleConfig>) => void;
  updateAutoSell: (patch: Partial<AutoSellConfig>) => void;
  updateSniperGuard: (patch: Partial<SniperGuardConfig>) => void;
  setLaunching: (v: boolean) => void;
  addLaunchLog: (entry: Omit<LaunchLogEntry, "id" | "timestamp">) => void;
  setLaunched: (v: boolean) => void;
  resetLaunch: () => void;

  // Launch history
  launches: LaunchRecord[];
  addLaunch: (record: Omit<LaunchRecord, "id">) => void;
  updateLaunch: (id: string, patch: Partial<Omit<LaunchRecord, "id">>) => void;

  // Trade history
  trades: TradeRecord[];
  addTrade: (trade: Omit<TradeRecord, "id">) => void;

  // Price
  tokenPrice: TokenPrice | null;
  setTokenPrice: (p: TokenPrice) => void;
  priceHistory: Array<{ time: number; price: number }>; // SOL per token, unix seconds
  clearPriceHistory: () => void;

  // UI
  importModalOpen: boolean;
  setImportModalOpen: (v: boolean) => void;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Funding wallet ───────────────────────────────────────────────────────
      fundingWallet: (() => {
        const kp = Keypair.generate();
        return { address: kp.publicKey.toBase58(), privateKey: bs58.encode(kp.secretKey) };
      })(),
      rotateFundingWallet: () => {
        const kp = Keypair.generate();
        set({ fundingWallet: { address: kp.publicKey.toBase58(), privateKey: bs58.encode(kp.secretKey) }, fundingBalance: 0 });
      },
      fundingBalance: 0,
      setFundingBalance: (v) => set({ fundingBalance: v }),
      fundingDate: null,
      setFundingDate: (v) => set({ fundingDate: v }),

      // ── Wallets ──────────────────────────────────────────────────────────────
      wallets: [],
      addWallets: (newWallets) =>
        set((s) => ({
          wallets: [
            ...s.wallets,
            ...newWallets.map((w, i) => ({
              ...w,
              color: WALLET_COLORS[(s.wallets.length + i) % WALLET_COLORS.length],
              importedAt: w.importedAt ?? new Date().toISOString(),
            })),
          ],
        })),
      updateWallet: (id, patch) =>
        set((s) => ({
          wallets: s.wallets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
        })),
      removeWallet: (id) =>
        set((s) => ({ wallets: s.wallets.filter((w) => w.id !== id) })),
      clearWallets: () => set({ wallets: [] }),
      refreshBalances: async () => {
        const wallets = get().wallets;
        if (!wallets.length) return;
        try {
          const addresses = wallets.map((w) => w.address).join(",");
          const mint = get().activeTokenMint;
          const params = new URLSearchParams({ addresses });
          if (mint) params.set("mint", mint);
          const res = await fetch(`/api/wallets?${params}`, {
            method: "GET",
          });
          if (!res.ok) return;
          const data = await res.json();
          if (Array.isArray(data.wallets)) {
            data.wallets.forEach((w: { address: string; solBalance: number; tokenBalance: number }) => {
              const local = wallets.find((x) => x.address === w.address);
              if (local) {
                get().updateWallet(local.id, {
                  solBalance: w.solBalance,
                  tokenBalance: w.tokenBalance,
                });
              }
            });
          }
        } catch {}
      },

      // ── Wallet funding cache ─────────────────────────────────────────────────
      walletFunding: {},
      setWalletFunding: (address, record) =>
        set((s) => ({ walletFunding: { ...s.walletFunding, [address]: record } })),
      mergeWalletFunding: (records) =>
        set((s) => ({ walletFunding: { ...s.walletFunding, ...records } })),

      // ── Active token ─────────────────────────────────────────────────────────
      activeTokenMint: "",
      setActiveTokenMint: (mint) => set({ activeTokenMint: mint, tokenMeta: null, priceHistory: [] }),
      tokenMeta: null,
      setTokenMeta: (meta) => set({ tokenMeta: meta }),

      // ── Launch ───────────────────────────────────────────────────────────────
      launch: {
        step: 1,
        tokenConfig: defaultTokenConfig(),
        bundleConfig: defaultBundleConfig(),
        autoSell: defaultAutoSell(),
        sniperGuard: defaultSniperGuard(),
        isLaunching: false,
        logs: [],
        launched: false,
      },
      setLaunchStep: (step) =>
        set((s) => ({ launch: { ...s.launch, step } })),
      updateTokenConfig: (patch) =>
        set((s) => ({
          launch: {
            ...s.launch,
            tokenConfig: { ...s.launch.tokenConfig, ...patch },
          },
        })),
      updateBundleConfig: (patch) =>
        set((s) => ({
          launch: {
            ...s.launch,
            bundleConfig: { ...s.launch.bundleConfig, ...patch },
          },
        })),
      updateAutoSell: (patch) =>
        set((s) => ({
          launch: {
            ...s.launch,
            autoSell: { ...s.launch.autoSell, ...patch },
          },
        })),
      updateSniperGuard: (patch) =>
        set((s) => ({
          launch: {
            ...s.launch,
            sniperGuard: { ...s.launch.sniperGuard, ...patch },
          },
        })),
      setLaunching: (v) =>
        set((s) => ({ launch: { ...s.launch, isLaunching: v } })),
      addLaunchLog: (entry) =>
        set((s) => ({
          launch: {
            ...s.launch,
            logs: [
              ...s.launch.logs,
              { ...entry, id: randomId(), timestamp: new Date() },
            ],
          },
        })),
      setLaunched: (v) =>
        set((s) => ({ launch: { ...s.launch, launched: v } })),
      resetLaunch: () =>
        set(() => ({
          launch: {
            step: 1,
            tokenConfig: defaultTokenConfig(),
            bundleConfig: defaultBundleConfig(),
            autoSell: defaultAutoSell(),
            sniperGuard: defaultSniperGuard(),
            isLaunching: false,
            logs: [],
            launched: false,
          },
        })),

      // ── Launch history ───────────────────────────────────────────────────────
      launches: [],
      addLaunch: (record) =>
        set((s) => ({
          launches: [{ ...record, id: randomId() }, ...s.launches].slice(0, 50),
        })),
      updateLaunch: (id, patch) =>
        set((s) => ({
          launches: s.launches.map((l) => (l.id === id ? { ...l, ...patch } : l)),
        })),

      // ── Trades ───────────────────────────────────────────────────────────────
      trades: [],
      addTrade: (trade) =>
        set((s) => ({
          trades: [{ ...trade, id: randomId() }, ...s.trades].slice(0, 500),
        })),

      // ── Price ────────────────────────────────────────────────────────────────
      tokenPrice: null,
      setTokenPrice: (p) => set((s) => ({
        tokenPrice: p,
        priceHistory: [
          ...s.priceHistory,
          { time: Math.floor(Date.now() / 1000), price: p.price },
        ].slice(-2000),
      })),
      priceHistory: [],
      clearPriceHistory: () => set({ priceHistory: [] }),

      // ── UI ───────────────────────────────────────────────────────────────────
      importModalOpen: false,
      setImportModalOpen: (v) => set({ importModalOpen: v }),
    }),
    {
      name: getAccountStoreName(),
      version: 1,
      migrate: (persisted: any, version: number) => {
        if (version < 1) {
          const now = new Date().toISOString();
          persisted.wallets = (persisted.wallets ?? []).map((w: any) => ({
            ...w,
            importedAt: w.importedAt ?? now,
          }));
        }
        return persisted;
      },
      partialize: (s) => ({
        fundingWallet: s.fundingWallet,
        fundingBalance: s.fundingBalance,
        fundingDate: s.fundingDate,
        wallets: s.wallets.map((w) => ({ ...w, tokenBalance: 0, status: "idle" as const })),
        activeTokenMint: s.activeTokenMint,
        tokenMeta: s.tokenMeta,
        trades: s.trades,
        launches: s.launches,
        walletFunding: s.walletFunding,
      }),
    }
  )
);
