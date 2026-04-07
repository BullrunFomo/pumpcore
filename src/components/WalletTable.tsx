"use client";
import { useState, useEffect } from "react";

function timeAgo(ms: string | number): string {
  const diff = Date.now() - (typeof ms === "number" ? ms : new Date(ms).getTime());
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function SolanaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg">
      <linearGradient id="sol-a" x1="90.1" y1="317.4" x2="326.5" y2="-10.9" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/>
        <stop offset=".14" stopColor="#8a53f4"/>
        <stop offset=".42" stopColor="#6377d6"/>
        <stop offset=".79" stopColor="#24b0a7"/>
        <stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#sol-a)"/>
      <linearGradient id="sol-b" x1="64.1" y1="337.6" x2="300.5" y2="9.3" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/>
        <stop offset=".14" stopColor="#8a53f4"/>
        <stop offset=".42" stopColor="#6377d6"/>
        <stop offset=".79" stopColor="#24b0a7"/>
        <stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#sol-b)"/>
      <linearGradient id="sol-c" x1="77.3" y1="327.5" x2="313.7" y2="-.8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/>
        <stop offset=".14" stopColor="#8a53f4"/>
        <stop offset=".42" stopColor="#6377d6"/>
        <stop offset=".79" stopColor="#24b0a7"/>
        <stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" fill="url(#sol-c)"/>
    </svg>
  );
}
import { Copy, Trash2, ArrowUpDown } from "lucide-react";
import type { WalletInfo } from "@/types";
import { truncateAddress, formatSol } from "@/lib/utils";
import { useStore } from "@/store";

interface WalletTableProps {
  wallets: WalletInfo[];
}

type SortKey = "address" | "balance";
type SortDir = "asc" | "desc";

export default function WalletTable({ wallets }: WalletTableProps) {
  const removeWallet = useStore((s) => s.removeWallet);
  const [sortKey, setSortKey] = useState<SortKey>("balance");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  const sorted = [...wallets].sort((a, b) => {
    let diff = 0;
    if (sortKey === "balance") diff = a.solBalance - b.solBalance;
    else diff = a.address.localeCompare(b.address);
    return sortDir === "asc" ? diff : -diff;
  });

  const statusDot: Record<WalletInfo["status"], string> = {
    idle: "bg-zinc-600",
    pending: "bg-yellow-400",
    confirmed: "bg-green-400",
    failed: "bg-red-400",
  };

  // ── Funding data ────────────────────────────────────────────────────────────
  type FundingMap = Record<string, { sourceLabel: string | null; timestamp: number | null; amountSol: number }>;
  const [funding, setFunding] = useState<FundingMap>({});

  useEffect(() => {
    if (!wallets.length) return;
    const addresses = wallets.map((w) => w.address).join(",");
    fetch(`/api/funding?addresses=${addresses}`)
      .then((r) => r.json())
      .then((data) => {
        const map: FundingMap = {};
        for (const f of data.funding ?? []) {
          map[f.address] = { sourceLabel: f.sourceLabel, timestamp: f.timestamp, amountSol: f.amountSol };
        }
        setFunding(map);
      })
      .catch(() => {});
  // re-fetch only when wallet set changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.map((w) => w.address).join(",")]);

  // Tick every 30s to keep relative timestamps fresh
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const totalSol = wallets.reduce((s, w) => s + w.solBalance, 0);

  return (
    <div
      className="flex flex-col min-h-0 flex-1 rounded-md overflow-hidden"
      style={{
        background: "rgba(24,24,27,0.8)",
        border: "1px solid rgba(63,63,70,0.25)",
      }}
    >
      {/* Table header */}
      <div
        className="shrink-0 grid items-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-3 py-2"
        style={{
          gridTemplateColumns: "28px 1fr 1fr 1fr 36px",
          borderBottom: "1px solid rgba(63,63,70,0.25)",
          background: "rgba(9,9,11,0.3)",
        }}
      >
        <div />
        <button
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left"
          onClick={() => handleSort("address")}
        >
          Wallet
          <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
        </button>
        <button
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
          onClick={() => handleSort("balance")}
        >
          Balance
          <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
        </button>
        <span>Funding</span>
        <div />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {sorted.map((w, i) => (
          <div
            key={w.id}
            className="grid items-center px-3 py-1.5 group hover:bg-white/[0.02] transition-colors cursor-default"
            style={{
              gridTemplateColumns: "28px 1fr 1fr 1fr 36px",
              borderBottom:
                i < sorted.length - 1
                  ? "1px solid rgba(63,63,70,0.2)"
                  : "none",
            }}
          >
            {/* Status dot */}
            <div className="flex items-center justify-center">
              <span className={`h-1.5 w-1.5 rounded-full ${statusDot[w.status]}`} />
            </div>

            {/* Wallet info */}
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-mono text-xs text-zinc-200 truncate">
                {truncateAddress(w.address, 4)}
              </span>
              <button
                onClick={() => navigator.clipboard.writeText(w.address)}
                className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>


            {/* Balance */}
            <div className="flex items-center gap-1.5">
              <SolanaLogo className="h-3 w-3 shrink-0" />
              <span className="text-xs text-zinc-200 font-medium tabular-nums">
                {formatSol(w.solBalance, 3)}
              </span>
            </div>

            {/* Funding */}
            <div className="flex flex-col gap-0.5 min-w-0">
              {funding[w.address] ? (
                <>
                  <span className="text-xs text-zinc-200 truncate">
                    {funding[w.address].sourceLabel ?? "—"}
                  </span>
                  <span className="text-[10px] text-zinc-500 tabular-nums">
                    {funding[w.address].timestamp ? timeAgo(funding[w.address].timestamp!) : "—"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-zinc-600">—</span>
              )}
            </div>

            {/* Delete */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => removeWallet(w.id)}
                className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer total */}
      {wallets.length > 0 && (
        <div
          className="shrink-0 grid items-center px-3 py-2 text-xs"
          style={{
            gridTemplateColumns: "28px 1fr 1fr 1fr 36px",
            borderTop: "1px solid rgba(63,63,70,0.25)",
            background: "rgba(9,9,11,0.3)",
          }}
        >
          <div />
          <span className="text-zinc-600 text-[10px]">{wallets.length} wallets</span>
          <div className="flex items-center gap-1.5">
            <SolanaLogo className="h-3 w-3 shrink-0" />
            <span className="text-zinc-300 font-semibold tabular-nums">
              {formatSol(totalSol, 3)}
            </span>
          </div>
          <div />
          <div />
        </div>
      )}
    </div>
  );
}
