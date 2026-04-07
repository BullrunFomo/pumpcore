"use client";
import { useEffect, useState } from "react";
import {
  Copy,
  Crown,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import { useStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ActivityLog from "@/components/ActivityLog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  truncateAddress,
  formatSol,
  formatUsd,
  pnlColor,
  formatNumber,
} from "@/lib/utils";
import type { WalletInfo } from "@/types";

// ─── Trade Modal ──────────────────────────────────────────────────────────────

interface TradeModalProps {
  wallet: WalletInfo | null;
  mode: "buy" | "sell" | null;
  onClose: () => void;
}

function TradeModal({ wallet, mode, onClose }: TradeModalProps) {
  const addTrade = useStore((s) => s.addTrade);
  const updateWallet = useStore((s) => s.updateWallet);
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const [amount, setAmount] = useState("");
  const [sellPct, setSellPct] = useState(100);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrade = async () => {
    if (!wallet || !mode) return;
    setLoading(true);
    setError("");
    try {
      const endpoint = mode === "buy" ? "/api/trade/buy" : "/api/trade/sell";
      const body =
        mode === "buy"
          ? { walletAddress: wallet.address, privateKey: wallet.privateKey, mintAddress: activeTokenMint, solAmount: parseFloat(amount) }
          : { walletAddress: wallet.address, privateKey: wallet.privateKey, mintAddress: activeTokenMint, percentage: sellPct };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Trade failed");

      addTrade({
        walletAddress: wallet.address,
        type: mode,
        solAmount: data.solAmount,
        tokenAmount: data.tokenAmount,
        price: data.price,
        txSig: data.txSig,
        timestamp: new Date(),
        status: "confirmed",
      });

      updateWallet(wallet.id, {
        solBalance: data.newSolBalance ?? wallet.solBalance,
        tokenBalance: data.newTokenBalance ?? wallet.tokenBalance,
      });

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!wallet && !!mode} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "buy" ? "Buy Tokens" : "Sell Tokens"} —{" "}
            <span className="font-mono text-blue-400">
              {truncateAddress(wallet?.address || "", 6)}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "buy" ? (
            <div className="space-y-1.5">
              <Label>SOL Amount</Label>
              <Input
                type="number"
                placeholder="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <p className="text-xs text-zinc-500">
                Wallet balance: {formatSol(wallet?.solBalance || 0, 4)} SOL
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Sell Percentage</Label>
              <div className="h-1" />
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => setSellPct(pct)}
                    className={`flex-1 py-1.5 rounded-md text-sm font-medium border transition-colors ${
                      sellPct === pct
                        ? "border-blue-400 bg-blue-950/50 text-blue-300"
                        : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={1}
                max={100}
                value={sellPct}
                onChange={(e) => setSellPct(parseInt(e.target.value) || 0)}
              />
              <p className="text-xs text-zinc-500">
                ≈{" "}
                {(((wallet?.tokenBalance || 0) * sellPct) / 100).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                tokens
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={mode === "buy" ? "success" : "destructive"}
            onClick={handleTrade}
            disabled={loading || (mode === "buy" && !amount)}
          >
            {loading
              ? "Processing..."
              : mode === "buy"
              ? "Buy"
              : `Sell ${sellPct}%`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sell All Modal ───────────────────────────────────────────────────────────

function SellAllModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allWallets = useStore((s) => s.wallets);
  const bundleSelectedIds = useStore((s) => s.launch.bundleConfig.selectedWalletIds);
  const wallets = bundleSelectedIds.length > 0
    ? allWallets.filter((w) => bundleSelectedIds.includes(w.id))
    : allWallets;
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const addTrade = useStore((s) => s.addTrade);
  const updateWallet = useStore((s) => s.updateWallet);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<string[]>([]);

  const handleSellAll = async () => {
    setLoading(true);
    const holdingWallets = wallets.filter((w) => w.tokenBalance > 0);
    const newResults: string[] = [];

    for (const w of holdingWallets) {
      try {
        const res = await fetch("/api/trade/sell-all", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: w.address,
            privateKey: w.privateKey,
            mintAddress: activeTokenMint,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        addTrade({
          walletAddress: w.address,
          type: "sell",
          solAmount: data.solAmount,
          tokenAmount: data.tokenAmount,
          price: data.price,
          txSig: data.txSig,
          timestamp: new Date(),
          status: "confirmed",
        });
        updateWallet(w.id, { tokenBalance: 0, solBalance: data.newSolBalance ?? w.solBalance });
        newResults.push(`✓ ${truncateAddress(w.address, 4)}`);
      } catch (err: any) {
        newResults.push(`✗ ${truncateAddress(w.address, 4)}: ${err.message}`);
      }
    }

    setResults(newResults);
    setDone(true);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Sell All Wallets
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!done ? (
            <p className="text-sm text-zinc-400">
              This will sell{" "}
              <strong className="text-zinc-100">100%</strong> of tokens from all{" "}
              <strong className="text-zinc-100">
                {wallets.filter((w) => w.tokenBalance > 0).length}
              </strong>{" "}
              holding wallets. This action cannot be undone.
            </p>
          ) : (
            <div className="space-y-1 font-mono text-xs">
              {results.map((r, i) => (
                <div
                  key={i}
                  className={r.startsWith("✓") ? "text-green-400" : "text-red-400"}
                >
                  {r}
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {done ? "Close" : "Cancel"}
          </Button>
          {!done && (
            <Button variant="destructive" onClick={handleSellAll} disabled={loading}>
              {loading ? "Selling..." : "Confirm Sell All"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagePage() {
  const wallets = useStore((s) => s.wallets);
  const trades = useStore((s) => s.trades);
  const launch = useStore((s) => s.launch);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const refreshBalances = useStore((s) => s.refreshBalances);
  const setTokenPrice = useStore((s) => s.setTokenPrice);

  const [tradeWallet, setTradeWallet] = useState<WalletInfo | null>(null);
  const [tradeMode, setTradeMode] = useState<"buy" | "sell" | null>(null);
  const [sellAllOpen, setSellAllOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  };

  const { tokenConfig, bundleConfig } = launch;
  const devWalletId = bundleConfig.devWalletId;

  // Only show wallets that participated in the bundle
  const bundleWallets = bundleConfig.selectedWalletIds.length > 0
    ? wallets.filter((w) => bundleConfig.selectedWalletIds.includes(w.id))
    : wallets;

  const totalPnlSol = bundleWallets.reduce((acc, w) => {
    if (tokenPrice && w.avgBuyPrice > 0) {
      return acc + (tokenPrice.price - w.avgBuyPrice) * w.tokenBalance;
    }
    return acc;
  }, 0);
  const totalPnlUsd = totalPnlSol * (tokenPrice?.solPrice ?? 0);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(async () => {
      await refreshBalances();
      if (activeTokenMint) {
        try {
          const res = await fetch(`/api/prices?mint=${activeTokenMint}`);
          if (res.ok) {
            const data = await res.json();
            setTokenPrice(data);
          }
        } catch {}
      }
    }, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTokenMint]);

  const openTrade = (wallet: WalletInfo, mode: "buy" | "sell") => {
    setTradeWallet(wallet);
    setTradeMode(mode);
  };

  const copyMint = () => {
    if (activeTokenMint) navigator.clipboard.writeText(activeTokenMint);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-100">
              {tokenConfig.name || "Token"}{" "}
              <span className="text-zinc-500 font-normal text-lg">
                ({tokenConfig.symbol || "—"})
              </span>
            </h1>
            <Badge
              variant={
                tokenConfig.tokenType === "Mayhem Mode"
                  ? "mayhem"
                  : tokenConfig.tokenType === "Cashback"
                  ? "cashback"
                  : "agent"
              }
            >
              {tokenConfig.tokenType || "—"}
            </Badge>
          </div>

          {activeTokenMint && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500">
                {truncateAddress(activeTokenMint, 10)}
              </span>
              <button onClick={copyMint} className="text-zinc-500 hover:text-zinc-300">
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://pump.fun/${activeTokenMint}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* Live PnL */}
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1 text-sm font-semibold ${pnlColor(totalPnlSol)}`}>
              {totalPnlSol >= 0 ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              Overall PnL:{" "}
              {totalPnlSol >= 0 ? "+" : ""}
              {formatSol(totalPnlSol, 4)} SOL ({totalPnlSol >= 0 ? "+" : ""}
              {formatUsd(totalPnlUsd)})
            </div>
            {tokenPrice && (
              <span className="text-xs font-semibold" style={{ color: "#4f83ff" }}>
                MCap: ${Math.round(tokenPrice.mcap).toLocaleString("en-US")}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1.5">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setSellAllOpen(true)}
            className="gap-1.5"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Sell All Wallets
          </Button>
        </div>
      </div>

      {/* ── Wallet Table ─────────────────────────────────────────────────────── */}
      <div className="rounded-md border border-zinc-800 bg-zinc-900 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">
            Wallet Positions ({bundleWallets.length})
          </h2>
          {tokenPrice && (
            <span className="text-xs text-zinc-500">
              Current price: {tokenPrice.price.toFixed(10)} SOL
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left">
                {["Wallet", "SOL Balance", "Token Balance", "Avg Buy Price", "Current Value", "PnL", "Actions"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2.5 text-xs font-medium text-zinc-500">
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {bundleWallets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-zinc-500 text-sm">
                    No wallets loaded.
                  </td>
                </tr>
              ) : (
                bundleWallets.map((w) => {
                  const currentValue = tokenPrice
                    ? tokenPrice.price * w.tokenBalance
                    : 0;
                  const pnl =
                    tokenPrice && w.avgBuyPrice > 0
                      ? (tokenPrice.price - w.avgBuyPrice) * w.tokenBalance
                      : 0;
                  return (
                    <tr key={w.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ background: w.color }}
                          />
                          <span className="font-mono text-sm text-zinc-200">
                            {truncateAddress(w.address, 6)}
                          </span>
                          {w.id === devWalletId && (
                            <Crown className="h-3 w-3 flex-shrink-0" style={{ color: "#f59e0b" }} />
                          )}
                          <button
                            onClick={() => navigator.clipboard.writeText(w.address)}
                            className="text-zinc-600 hover:text-zinc-400"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {formatSol(w.solBalance, 4)}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {w.tokenBalance > 0
                          ? formatNumber(w.tokenBalance, 0)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">
                        {w.avgBuyPrice > 0
                          ? w.avgBuyPrice.toFixed(10)
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-300">
                        {tokenPrice && w.tokenBalance > 0
                          ? `${formatSol(currentValue, 5)} SOL`
                          : "—"}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${pnlColor(pnl)}`}>
                        {w.avgBuyPrice > 0 && tokenPrice
                          ? `${pnl >= 0 ? "+" : ""}${formatSol(pnl, 5)} SOL`
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="success"
                            className="h-7 px-2.5 text-xs gap-1"
                            onClick={() => openTrade(w, "buy")}
                          >
                            <ArrowDownLeft className="h-3 w-3" />
                            BUY
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 px-2.5 text-xs gap-1"
                            onClick={() => openTrade(w, "sell")}
                            disabled={w.tokenBalance === 0}
                          >
                            <ArrowUpRight className="h-3 w-3" />
                            SELL
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Activity Log ─────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Transaction History</h2>
        <ActivityLog trades={trades} maxItems={100} />
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <TradeModal
        wallet={tradeWallet}
        mode={tradeMode}
        onClose={() => {
          setTradeWallet(null);
          setTradeMode(null);
        }}
      />
      <SellAllModal open={sellAllOpen} onClose={() => setSellAllOpen(false)} />
    </div>
  );
}
