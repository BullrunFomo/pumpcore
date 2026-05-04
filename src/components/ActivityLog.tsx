"use client";
import React from "react";
import type { TradeRecord } from "@/types";
import { truncateAddress, formatSol } from "@/lib/utils";
import { ExternalLink, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface ActivityLogProps {
  trades: TradeRecord[];
  maxItems?: number;
  ticker?: string;
}

export default function ActivityLog({ trades, maxItems = 50, ticker }: ActivityLogProps) {
  const shown = trades.slice(0, maxItems);

  return (
    <div
      className="rounded-md overflow-hidden"
      style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
    >
      {shown.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: "rgba(28,38,56,0.5)", border: "1px solid rgba(28,38,56,0.8)" }}
          >
            <ArrowUpRight className="h-4 w-4 text-zinc-600" />
          </div>
          <span className="text-xs text-zinc-500">No activity yet</span>
        </div>
      ) : (
        <div>
          {shown.map((t, i) => {
            const isBuy = t.type === "buy";
            return (
              <div
                key={t.id}
                className="flex items-center gap-4 px-3 py-1.5 transition-colors"
                style={{ borderBottom: i < shown.length - 1 ? "1px solid rgba(28,38,56,0.6)" : "none" }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "rgba(79,131,255,0.03)")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = "transparent")
                }
              >
                {/* Type + wallet */}
                <div className="flex items-center gap-2 w-36 shrink-0">
                  <div
                    className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center"
                    style={{
                      background: isBuy ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                      border: `1px solid ${isBuy ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)"}`,
                    }}
                  >
                    {isBuy ? (
                      <ArrowDownLeft className="h-2.5 w-2.5 text-green-400" />
                    ) : (
                      <ArrowUpRight className="h-2.5 w-2.5 text-red-400" />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isBuy ? "#4ade80" : "#f87171" }}>
                    {t.type}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "rgba(148,163,184,0.5)" }}>
                    {truncateAddress(t.walletAddress, 4)}
                  </span>
                </div>

                {/* SOL amount */}
                <span className="text-[10px] tabular-nums text-zinc-400 w-24 shrink-0">
                  {formatSol(t.solAmount, 4)} SOL
                </span>

                {/* Token amount */}
                <span className="text-[10px] tabular-nums flex-1" style={{ color: "rgba(100,116,139,0.8)" }}>
                  {t.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} {ticker ? `$${ticker}` : "tkn"}
                </span>

                {/* Time + link */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] tabular-nums" style={{ color: "rgba(71,85,105,0.9)" }}>
                    {new Date(t.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {t.txSig && (
                    <a
                      href={`https://solscan.io/tx/${t.txSig}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors"
                      style={{ color: "rgba(71,85,105,0.9)" }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "#4f83ff")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = "rgba(71,85,105,0.9)")}
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
