"use client";
import { useState, useEffect, useRef } from "react";

function formatFundingDate(ms: string | number): string {
  const d = new Date(typeof ms === "number" ? ms : ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (sameDay) return `Today, ${time}`;
  const month = d.toLocaleString("default", { month: "short" });
  return `${month} ${d.getDate()}, ${time}`;
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
import { Trash2, ArrowUpDown } from "lucide-react";
import CopyButton from "./CopyButton";
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

  // ── Funding data (persisted in store) ──────────────────────────────────────
  const walletFunding = useStore((s) => s.walletFunding);
  const mergeWalletFunding = useStore((s) => s.mergeWalletFunding);
  // Tracks addresses retried this session so we don't loop on genuine empty results
  const retriedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!wallets.length) return;
    // Include addresses that:
    //  1. Have never been fetched, OR
    //  2. Were fetched but returned no data AND haven't been retried this session yet
    //     (handles stale empty results from before the pagination fix)
    const unfetched = wallets
      .filter((w) => {
        const f = walletFunding[w.address];
        if (!f?.fetched) return true;
        if (f.sourceLabel === null && f.timestamp === null && !retriedRef.current.has(w.address)) return true;
        return false;
      })
      .map((w) => w.address);
    if (!unfetched.length) return;

    // Mark all of them as retried so this session won't retry again
    unfetched.forEach((a) => retriedRef.current.add(a));

    fetch(`/api/funding?addresses=${unfetched.join(",")}`)
      .then((r) => r.json())
      .then((data) => {
        const update: Record<string, import("@/types").WalletFundingRecord> = {};
        // Build a lookup from the API response
        const byAddress: Record<string, any> = {};
        for (const f of data.funding ?? []) byAddress[f.address] = f;

        for (const addr of unfetched) {
          const f = byAddress[addr];
          update[addr] = {
            sourceAddress: f?.sourceAddress ?? null,
            sourceLabel: f?.sourceLabel ?? null,
            timestamp: f?.timestamp ?? null,
            amountSol: f?.amountSol ?? 0,
            fetched: true,
          };
        }
        mergeWalletFunding(update);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallets.map((w) => w.address).join(",")]);

const totalSol = wallets.reduce((s, w) => s + w.solBalance, 0);

  return (
    <div
      className="flex flex-col min-h-0 flex-1 rounded-md overflow-hidden"
      style={{
        background: "rgba(13,17,24,0.8)",
        border: "1px solid rgba(28,38,56,0.8)",
      }}
    >
      {/* Table header */}
      <div
        className="shrink-0 grid items-center text-[10px] font-semibold uppercase tracking-widest text-zinc-500 px-3 py-2"
        style={{
          gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 36px",
          borderBottom: "1px solid rgba(28,38,56,0.8)",
          background: "rgba(9,13,20,0.5)",
        }}
      >
        <div />
        <button
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors text-left"
          onClick={() => handleSort("address")}
        >
          WALLET
          <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
        </button>
        <button
          className="flex items-center gap-1 hover:text-zinc-300 transition-colors"
          onClick={() => handleSort("balance")}
        >
          BALANCE
          <ArrowUpDown className="h-2.5 w-2.5 opacity-50" />
        </button>
        <span>Funding</span>
        <span>Funding Date</span>
        <div />
      </div>

      {/* Rows */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {sorted.map((w, i) => (
          <div
            key={w.id}
            className="grid items-center px-3 py-0.5 mx-2 group hover:bg-white/[0.02] transition-colors cursor-default"
            style={{
              gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 36px",
              borderBottom:
                i < sorted.length - 1
                  ? "1px solid rgba(28,38,56,0.6)"
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
              <CopyButton
                text={w.address}
                className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors opacity-0 group-hover:opacity-100"
                iconClassName="h-3 w-3"
              />
            </div>


            {/* Balance */}
            <div className="flex items-center gap-1.5">
              <SolanaLogo className="h-3 w-3 shrink-0" />
              <span className="text-xs text-zinc-200 font-medium tabular-nums">
                {formatSol(w.solBalance, 3)}
              </span>
            </div>

            {/* Funding source */}
            <div className="min-w-0">
              <span className="text-xs text-zinc-200 truncate block">
                {walletFunding[w.address]?.sourceLabel ?? <span className="text-zinc-600">—</span>}
              </span>
            </div>

            {/* Funding date */}
            <div className="min-w-0">
              <span className="text-xs text-zinc-400 tabular-nums">
                {walletFunding[w.address]?.timestamp
                  ? formatFundingDate(walletFunding[w.address].timestamp!)
                  : <span className="text-zinc-600">—</span>
                }
              </span>
            </div>

            {/* Delete */}
            <div className="flex items-center justify-center">
              <button
                onClick={() => removeWallet(w.id)}
                className="text-zinc-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
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
            gridTemplateColumns: "28px 1fr 1fr 1fr 1fr 36px",
            borderTop: "1px solid rgba(28,38,56,0.8)",
            background: "rgba(9,13,20,0.5)",
          }}
        >
          <div />
          <span className="text-zinc-600 text-[10px]">{wallets.length} WALLETS</span>
          <div className="flex items-center gap-1.5">
            <SolanaLogo className="h-3 w-3 shrink-0" />
            <span className="text-zinc-300 font-semibold tabular-nums">
              {formatSol(totalSol, 3)}
            </span>
          </div>
          <div />
          <div />
          <div />
        </div>
      )}
    </div>
  );
}
