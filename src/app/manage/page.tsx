"use client";
import { useEffect, useState } from "react";
import {
  Crown,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";
import CopyButton from "@/components/CopyButton";
import { useStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ActivityLog from "@/components/ActivityLog";
import TokenChart from "@/components/TokenChart";
import BombIcon from "@/components/icons/BombIcon";
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
      <DialogContent className="p-0 overflow-hidden" style={{ background: "rgba(9,13,20,0.98)", border: "1px solid rgba(248,113,113,0.2)", maxWidth: "400px" }}>
        {/* Top accent bar */}
        <div className="h-0.5 w-full" style={{ background: "linear-gradient(90deg, transparent, #f87171, transparent)" }} />

        <div className="px-6 pt-5 pb-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-md flex-shrink-0" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}>
              <BombIcon className="h-5 w-5" style={{ color: "#f87171" }} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-100">NUKE</h2>
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest">Sell All Wallets</p>
            </div>
          </div>

          {/* Body */}
          {!done ? (
            <div className="rounded-md px-4 py-3 text-sm text-zinc-400 leading-relaxed" style={{ background: "rgba(248,113,113,0.05)", border: "1px solid rgba(248,113,113,0.12)" }}>
              This will dump{" "}
              <span className="font-bold text-zinc-100">100%</span> of tokens from{" "}
              <span className="font-bold text-zinc-100">{wallets.filter((w) => w.tokenBalance > 0).length}</span>{" "}
              holding wallets simultaneously. This action{" "}
              <span className="text-red-400 font-semibold">cannot be undone</span>.
            </div>
          ) : (
            <div className="rounded-md px-4 py-3 space-y-1 font-mono text-xs max-h-40 overflow-y-auto" style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>
              {results.map((r, i) => (
                <div key={i} style={{ color: r.startsWith("✓") ? "#4ade80" : "#f87171" }}>{r}</div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose} disabled={loading} className="text-zinc-400">
              {done ? "Close" : "Cancel"}
            </Button>
            {!done && (
              <Button
                variant="destructive"
                onClick={handleSellAll}
                disabled={loading}
                className="gap-2 font-bold"
              >
                <BombIcon className="h-4 w-4" />
                {loading ? "Nuking..." : "Confirm Nuke"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ManagePage() {
  const wallets = useStore((s) => s.wallets);
  const trades = useStore((s) => s.trades);
  const launch = useStore((s) => s.launch);
  const launches = useStore((s) => s.launches);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const refreshBalances = useStore((s) => s.refreshBalances);
  const setTokenPrice = useStore((s) => s.setTokenPrice);
  const addTrade = useStore((s) => s.addTrade);
  const updateWallet = useStore((s) => s.updateWallet);
  const tokenMeta = useStore((s) => s.tokenMeta);
  const setTokenMeta = useStore((s) => s.setTokenMeta);

  const [sellAllOpen, setSellAllOpen] = useState(false);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);

  const { tokenConfig, bundleConfig } = launch;
  const devWalletId = bundleConfig.devWalletId;

  // Only show wallets that participated in the bundle
  const bundleWallets = bundleConfig.selectedWalletIds.length > 0
    ? wallets.filter((w) => bundleConfig.selectedWalletIds.includes(w.id))
    : wallets;

  // PNL: sells add SOL, buys (including bundle buys recorded at launch) subtract SOL
  const totalPnlSol = trades.reduce((acc, t) => {
    if (t.type === "sell") return acc + (t.solAmount ?? 0);
    if (t.type === "buy") return acc - (t.solAmount ?? 0);
    return acc;
  }, 0);
  const totalPnlUsd = totalPnlSol * (tokenPrice?.solPrice ?? 0);

  useEffect(() => {
    refreshBalances();
    if (activeTokenMint && (!tokenMeta || !tokenMeta.image)) {
      // Use the stored launch record first — it has the direct logoUri already
      const record = launches.find((l) => l.mintAddress === activeTokenMint);
      if (record?.logoUri) {
        setTokenMeta({ name: record.name, symbol: record.symbol, image: record.logoUri });
      } else {
        fetch(`/api/token-meta?mint=${activeTokenMint}`)
          .then((r) => r.ok ? r.json() : null)
          .then((d) => {
            if (d?.name || d?.symbol || d?.image) {
              setTokenMeta({
                name: d.name ?? "",
                symbol: d.symbol ?? "",
                image: d.image ? `/api/token-image?url=${encodeURIComponent(d.image)}` : "",
              });
            }
          })
          .catch(() => {});
      }
    }
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

  const quickTrade = async (wallet: WalletInfo, mode: "buy" | "sell", value: number) => {
    const key = `${wallet.id}-${mode}-${value}`;
    setLoadingKey(key);
    try {
      const endpoint = mode === "buy" ? "/api/trade/buy" : "/api/trade/sell";
      const body = mode === "buy"
        ? { walletAddress: wallet.address, privateKey: wallet.privateKey, mintAddress: activeTokenMint, solAmount: value }
        : { walletAddress: wallet.address, privateKey: wallet.privateKey, mintAddress: activeTokenMint, percentage: value };
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
    } catch (err: any) {
      console.error("Trade failed:", err.message);
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 gap-6 flex-wrap flex-shrink-0">
        {/* Left: logo + token info */}
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-md flex-shrink-0 overflow-hidden"
            style={{ border: "1px solid rgba(28,38,56,0.8)", background: "rgba(28,38,56,0.5)" }}
          >
            {tokenMeta?.image && (
              <img
                src={tokenMeta.image}
                alt="token logo"
                className="w-full h-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-100">
                {tokenMeta?.name || tokenConfig.name || "Token"}{" "}
                <span className="text-zinc-500 font-normal text-lg">
                  ({tokenMeta?.symbol || tokenConfig.symbol || "—"})
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
                <CopyButton
                  text={activeTokenMint ?? ""}
                  className="text-zinc-500 hover:text-zinc-300"
                  iconClassName="h-3.5 w-3.5"
                />
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
          </div>
        </div>

        {/* PNL Card */}
        <div
          className="flex flex-col gap-0.5 px-4 py-1.5 rounded-md flex-shrink-0 mr-auto"
          style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)", minWidth: "148px" }}
        >
          <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(100,116,139,0.7)" }}>
            Total P&amp;L
          </span>
          <div className="flex items-center gap-1.5">
            {totalPnlSol >= 0
              ? <TrendingUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#4ade80" }} />
              : <TrendingDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "#f87171" }} />}
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: totalPnlSol >= 0 ? "#4ade80" : "#f87171" }}
            >
              {totalPnlSol >= 0 ? "+" : ""}{formatSol(Math.abs(totalPnlSol), 3)} SOL
            </span>
          </div>
          <span className="text-[11px] tabular-nums" style={{ color: "rgba(100,116,139,0.6)" }}>
            {totalPnlUsd >= 0 ? "+" : "-"}{formatUsd(Math.abs(totalPnlUsd))}
          </span>
        </div>

        {/* Right: Sell All */}
        <div className="flex items-center gap-4">
          <Button
            variant="destructive"
            size="default"
            onClick={() => setSellAllOpen(true)}
            className="gap-2 self-stretch"
          >
            <BombIcon className="h-4 w-4" />
            NUKE
          </Button>
        </div>
      </div>

      {/* ── Main grid: chart + tx left, wallet table right ───────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Left column: chart + tx history */}
        <div className="flex flex-col gap-4 min-w-0 min-h-0" style={{ flex: "1 1 0", width: "50%" }}>

          {/* Token chart */}
          <div className="rounded-md overflow-hidden flex-1 min-h-0" style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>
            {activeTokenMint ? (
              <TokenChart mint={activeTokenMint} />
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                No token selected
              </div>
            )}
          </div>

          {/* Transaction history */}
          <div className="flex-shrink-0 flex flex-col" style={{ maxHeight: "220px" }}>
            <div className="flex items-center gap-2 mb-2 mt-2 flex-shrink-0">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Transaction History</span>
              {trades.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(79,131,255,0.1)", color: "#7aa3ff", border: "1px solid rgba(79,131,255,0.2)" }}
                >
                  {trades.length}
                </span>
              )}
            </div>
            <div className="overflow-y-auto">
              <ActivityLog trades={trades} maxItems={100} ticker={tokenMeta?.symbol || tokenConfig.symbol} />
            </div>
          </div>
        </div>

        {/* Right column: wallet positions */}
        <div className="min-w-0 flex flex-col" style={{ flex: "1 1 0", width: "50%" }}>
          <div className="rounded-md overflow-hidden flex flex-col flex-1" style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>

            <div className="overflow-x-hidden overflow-y-auto flex-1">
              <table className="w-full">
                <thead>
                  <tr className="text-left" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}>
                    {["Wallet", "SOL", "Tokens", "Value", "Actions"].map((h) => (
                      <th key={h} className="px-3 py-2 text-[9px] font-semibold uppercase tracking-widest" style={{ color: "rgba(100,116,139,0.7)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bundleWallets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-zinc-500 text-sm">
                        No wallets loaded.
                      </td>
                    </tr>
                  ) : (
                    bundleWallets.map((w) => {
                      const currentValue = tokenPrice ? tokenPrice.price * w.tokenBalance : 0;
                      return (
                        <tr
                          key={w.id}
                          className="transition-all group"
                          style={{ borderBottom: "1px solid rgba(28,38,56,0.5)" }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "rgba(79,131,255,0.04)")}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              {w.id === devWalletId && (
                                <Crown className="h-2.5 w-2.5 flex-shrink-0" style={{ color: "#f59e0b" }} />
                              )}
                              <span className="font-mono font-bold text-[11px] text-zinc-400">
                                {truncateAddress(w.address, 3)}
                              </span>
                              <CopyButton
                                text={w.address}
                                className="text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                                iconClassName="h-2.5 w-2.5"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-bold tabular-nums text-zinc-400">
                            {formatSol(w.solBalance, 4)}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-bold tabular-nums text-zinc-400">
                            {w.tokenBalance > 0 ? formatNumber(w.tokenBalance, 0) : "0"}
                          </td>
                          <td className="px-3 py-2.5 text-[11px] font-bold tabular-nums" style={{ color: w.tokenBalance > 0 ? "#94a3b8" : "rgba(100,116,139,0.6)" }}>
                            {tokenPrice && w.tokenBalance > 0 ? formatUsd(currentValue * tokenPrice.solPrice) : "$0"}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex gap-1.5 items-center">
                              <div className="flex gap-1">
                                {([0.5, 1, 2] as const).map((sol) => {
                                  const key = `${w.id}-buy-${sol}`;
                                  const busy = loadingKey === key;
                                  return (
                                    <button
                                      key={sol}
                                      disabled={!!loadingKey}
                                      onClick={() => quickTrade(w, "buy", sol)}
                                      className="text-[10px] font-bold px-2 py-1 rounded transition-all disabled:opacity-40 tabular-nums"
                                      style={{
                                        background: busy ? "rgba(74,222,128,0.2)" : "rgba(74,222,128,0.07)",
                                        border: "1px solid rgba(74,222,128,0.2)",
                                        color: "#4ade80",
                                        minWidth: "28px",
                                      }}
                                    >
                                      {busy ? "…" : `${sol}`}
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="w-px h-4 flex-shrink-0" style={{ background: "rgba(28,38,56,0.8)" }} />
                              <div className="flex gap-1">
                                {([10, 25, 50, 100] as const).map((pct) => {
                                  const key = `${w.id}-sell-${pct}`;
                                  const busy = loadingKey === key;
                                  return (
                                    <button
                                      key={pct}
                                      disabled={!!loadingKey || w.tokenBalance === 0}
                                      onClick={() => quickTrade(w, "sell", pct)}
                                      className="text-[10px] font-bold px-2 py-1 rounded transition-all disabled:opacity-40 tabular-nums"
                                      style={{
                                        background: busy ? "rgba(248,113,113,0.2)" : "rgba(248,113,113,0.07)",
                                        border: "1px solid rgba(248,113,113,0.2)",
                                        color: "#f87171",
                                        minWidth: "32px",
                                      }}
                                    >
                                      {busy ? "…" : `${pct}%`}
                                    </button>
                                  );
                                })}
                              </div>
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
        </div>

      </div>

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <SellAllModal open={sellAllOpen} onClose={() => setSellAllOpen(false)} />
    </div>
  );
}
