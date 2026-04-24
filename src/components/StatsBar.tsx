"use client";
import { TrendingUp, Wallet, Zap, Copy } from "lucide-react";
import { useStore } from "@/store";
import { formatSol, formatUsd, truncateAddress } from "@/lib/utils";

export default function StatsBar() {
  const wallets = useStore((s) => s.wallets);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);

  const totalSol = wallets.reduce((sum, w) => sum + w.solBalance, 0);
  const totalPnlSol = wallets.reduce((acc, w) => {
    if (tokenPrice && w.avgBuyPrice > 0) {
      return acc + (tokenPrice.price - w.avgBuyPrice) * w.tokenBalance;
    }
    return acc;
  }, 0);
  const totalPnlUsd = totalPnlSol * (tokenPrice?.solPrice ?? 0);
  const isPositive = totalPnlSol >= 0;

  const copyMint = () => {
    if (activeTokenMint) navigator.clipboard.writeText(activeTokenMint);
  };

  const cardBase = {
    background: "rgba(13,17,24,0.8)",
    border: "1px solid rgba(28,38,56,0.8)",
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      {/* PnL */}
      <div
        className="rounded-md p-4 relative overflow-hidden"
        style={{
          ...cardBase,
          borderColor: totalPnlSol !== 0
            ? isPositive ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)"
            : "rgba(28,38,56,0.8)",
        }}
      >
        <div
          className="absolute inset-0 opacity-40 pointer-events-none"
          style={{
            background: totalPnlSol !== 0
              ? isPositive
                ? "radial-gradient(ellipse at top left, rgba(74,222,128,0.1) 0%, transparent 60%)"
                : "radial-gradient(ellipse at top left, rgba(248,113,113,0.1) 0%, transparent 60%)"
              : "none",
          }}
        />
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Overall PnL
          </span>
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
          >
            <TrendingUp className="h-3 w-3 text-[#4f83ff]" />
          </div>
        </div>
        <div
          className="text-xl font-bold"
          style={{ color: isPositive ? "#4ade80" : "#f87171" }}
        >
          {isPositive ? "+" : ""}{formatSol(totalPnlSol, 4)}
          <span className="text-sm font-normal ml-1 opacity-70">SOL</span>
        </div>
        <div className="text-xs mt-0.5 font-medium" style={{ color: isPositive ? "#4ade8099" : "#f8717199" }}>
          {isPositive ? "+" : ""}{formatUsd(totalPnlUsd)}
        </div>
      </div>

      {/* Total SOL */}
      <div className="rounded-md p-4 relative overflow-hidden" style={cardBase}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Total SOL
          </span>
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
          >
            <Zap className="h-3 w-3 text-[#4f83ff]" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-100">
          {formatSol(totalSol, 4)}
          <span className="text-sm font-normal ml-1 text-zinc-400">SOL</span>
        </div>
        <div className="text-xs text-zinc-400 mt-0.5 font-medium">
          ≈ {formatUsd(totalSol * (tokenPrice?.solPrice ?? 0))}
        </div>
      </div>

      {/* Wallets */}
      <div className="rounded-md p-4 relative overflow-hidden" style={cardBase}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Wallets
          </span>
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
          >
            <Wallet className="h-3 w-3 text-[#4f83ff]" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-100">
          {wallets.length}
          <span className="text-sm font-normal ml-1 text-zinc-400">loaded</span>
        </div>
        <div className="text-xs text-zinc-400 mt-0.5 font-medium">
          {wallets.filter((w) => w.tokenBalance > 0).length} holding tokens
        </div>
      </div>

      {/* Active Token */}
      <div className="rounded-md p-4 relative overflow-hidden" style={cardBase}>
        <div className="flex items-start justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Active Token
          </span>
          <div
            className="w-2 h-2 rounded-full mt-1"
            style={{
              background: activeTokenMint ? "#4f83ff" : "#52525b",
              boxShadow: activeTokenMint ? "0 0 6px rgba(79,131,255,0.6)" : "none",
            }}
          />
        </div>
        {activeTokenMint ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-base font-bold text-[#4f83ff]">
                {truncateAddress(activeTokenMint, 6)}
              </span>
              <button
                onClick={copyMint}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Copy className="h-3 w-3" />
              </button>
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
  );
}
