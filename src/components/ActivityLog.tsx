"use client";
import React from "react";
import type { TradeRecord } from "@/types";
import { truncateAddress, formatSol } from "@/lib/utils";
import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface ActivityLogProps {
  trades: TradeRecord[];
  maxItems?: number;
}

export default function ActivityLog({ trades, maxItems = 50 }: ActivityLogProps) {
  const shown = trades.slice(0, maxItems);

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: "rgba(14,14,16,0.9)", border: "1px solid rgba(63,63,70,0.25)" }}
    >
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(63,63,70,0.25)", border: "1px solid rgba(63,63,70,0.25)" }}
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-600" />
          </div>
          <span className="text-xs text-zinc-600">No activity yet</span>
        </div>
      ) : (
        <div>
          {shown.map((t) => {
            const isBuy = t.type === "buy";
            return (
              <div
                key={t.id}
                className="flex items-center gap-3 px-3 py-2.5 transition-colors"
                style={{ "--hover-bg": "rgba(255,255,255,0.02)" } as React.CSSProperties}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "transparent")
                }
              >
                <div
                  className="flex-shrink-0 w-6 h-6 rounded flex items-center justify-center"
                  style={{
                    background: isBuy ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                    border: `1px solid ${isBuy ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                  }}
                >
                  {isBuy ? (
                    <ArrowDownLeft className="h-3 w-3 text-green-400" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3 text-red-400" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: isBuy ? "#4ade80" : "#f87171" }}
                    >
                      {t.type}
                    </span>
                    <span className="text-[10px] text-zinc-600 font-mono">
                      {truncateAddress(t.walletAddress, 4)}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-600">
                    {formatSol(t.solAmount, 4)} SOL
                    <span className="mx-1 text-zinc-800">·</span>
                    {t.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} tkn
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5 shrink-0">
                  <span className="text-[10px] text-zinc-700 tabular-nums">
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {t.txSig && (
                    <a
                      href={`https://solscan.io/tx/${t.txSig}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-700 hover:text-[#4f83ff] transition-colors"
                    >
                      <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
