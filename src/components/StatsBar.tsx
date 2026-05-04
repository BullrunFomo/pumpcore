"use client";
import { TrendingUp, Wallet, Zap } from "lucide-react";
import CopyButton from "./CopyButton";
import { useStore } from "@/store";
import { formatSol, formatUsd, truncateAddress } from "@/lib/utils";

export default function StatsBar() {
  const wallets = useStore((s) => s.wallets);
  const trades = useStore((s) => s.trades);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);

  const totalSol = wallets.reduce((sum, w) => sum + w.solBalance, 0);
  const totalPnlSol = trades.reduce((acc, t) => {
    if (t.type === "sell") return acc + t.solAmount;
    if (t.type === "buy") return acc - t.solAmount;
    return acc;
  }, 0);
  const totalPnlUsd = totalPnlSol * (tokenPrice?.solPrice ?? 0);
  const isPositive = totalPnlSol >= 0;

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{
        background: "rgba(13,17,24,0.8)",
        border: "1px solid rgba(28,38,56,0.8)",
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-4">

        {/* PnL */}
        <div className="px-5 py-4 relative overflow-hidden">
          {totalPnlSol !== 0 && (
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background: isPositive
                  ? "radial-gradient(ellipse at top left, rgba(79,131,255,0.12) 0%, transparent 60%)"
                  : "radial-gradient(ellipse at top left, rgba(248,113,113,0.12) 0%, transparent 60%)",
              }}
            />
          )}
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp className="h-3 w-3 text-[#4f83ff]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Overall PnL
            </span>
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: isPositive ? "#4f83ff" : "#f87171" }}
          >
            {isPositive ? "+" : ""}{formatSol(totalPnlSol, 4)}
            <span className="text-xs font-normal ml-1 opacity-60">SOL</span>
          </div>
          <div className="text-xs mt-0.5 font-medium" style={{ color: isPositive ? "#4f83ff99" : "#f8717199" }}>
            {isPositive ? "+" : ""}{formatUsd(totalPnlUsd)}
          </div>
        </div>

        {/* Total SOL */}
        <div className="px-5 py-4 relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-[rgba(28,38,56,0.9)]">
          <div className="flex items-center gap-2 mb-2.5">
            <Zap className="h-3 w-3 text-[#4f83ff]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Total SOL
            </span>
          </div>
          <div className="text-lg font-bold text-zinc-100">
            {formatSol(totalSol, 4)}
            <span className="text-xs font-normal ml-1 text-zinc-500">SOL</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-medium">
            ≈ {formatUsd(totalSol * (tokenPrice?.solPrice ?? 0))}
          </div>
        </div>

        {/* Wallets */}
        <div className="px-5 py-4 relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-[rgba(28,38,56,0.9)]">
          <div className="flex items-center gap-2 mb-2.5">
            <Wallet className="h-3 w-3 text-[#4f83ff]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Wallets
            </span>
          </div>
          <div className="text-lg font-bold text-zinc-100">
            {wallets.length}
            <span className="text-xs font-normal ml-1 text-zinc-500">loaded</span>
          </div>
          <div className="text-xs text-zinc-500 mt-0.5 font-medium">
            {wallets.filter((w) => w.tokenBalance > 0).length} holding tokens
          </div>
        </div>

        {/* Active Token */}
        <div className="px-5 py-4 relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-[rgba(28,38,56,0.9)]">
          <div className="flex items-center gap-2 mb-2.5">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: activeTokenMint ? "#4f83ff" : "#52525b",
                boxShadow: activeTokenMint ? "0 0 6px rgba(79,131,255,0.6)" : "none",
              }}
            />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Active Token
            </span>
          </div>
          {activeTokenMint ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-base font-bold text-[#4f83ff]">
                  {truncateAddress(activeTokenMint, 6)}
                </span>
                <CopyButton
                  text={activeTokenMint}
                  className="text-zinc-500 hover:text-zinc-200 transition-colors"
                  iconClassName="h-3 w-3"
                />
              </div>
              {tokenPrice && (
                <div className="text-xs font-semibold mt-0.5" style={{ color: "#4f83ff" }}>
                  MCap ${Math.round(tokenPrice.mcap).toLocaleString("en-US")}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="text-base font-bold text-zinc-500">None</div>
              <div className="text-xs text-zinc-500 mt-0.5">Launch a token first</div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
