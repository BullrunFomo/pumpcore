"use client";
import React from "react";
import { Trash2, Circle } from "lucide-react";
import CopyButton from "./CopyButton";
import type { WalletInfo } from "@/types";
import { truncateAddress, formatSol, pnlColor } from "@/lib/utils";
import { useStore } from "@/store";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

interface WalletCardProps {
  wallet: WalletInfo;
  tokenPrice?: number;
}

const statusColors: Record<WalletInfo["status"], string> = {
  idle: "text-zinc-500",
  pending: "text-yellow-400",
  confirmed: "text-green-400",
  failed: "text-red-400",
};

export default function WalletCard({ wallet, tokenPrice }: WalletCardProps) {
  const removeWallet = useStore((s) => s.removeWallet);

  const pnl =
    tokenPrice && wallet.avgBuyPrice > 0
      ? (tokenPrice - wallet.avgBuyPrice) * wallet.tokenBalance
      : 0;

  return (
    <div
      className="relative rounded-md border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
      style={{ borderLeftColor: wallet.color, borderLeftWidth: 3 }}
    >
      {/* Status dot */}
      <div className={`absolute top-3 right-3 ${statusColors[wallet.status]}`}>
        <Circle className="h-2.5 w-2.5 fill-current" />
      </div>

      {/* Address row */}
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-sm text-zinc-100">
          {truncateAddress(wallet.address, 6)}
        </span>
        <CopyButton
          text={wallet.address}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          iconClassName="h-3.5 w-3.5"
        />
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
        <div>
          <span className="text-zinc-500">SOL</span>
          <div className="text-zinc-100 font-medium">{formatSol(wallet.solBalance, 4)}</div>
        </div>
        <div>
          <span className="text-zinc-500">Tokens</span>
          <div className="text-zinc-100 font-medium">
            {wallet.tokenBalance > 0
              ? wallet.tokenBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })
              : "—"}
          </div>
        </div>
        {wallet.avgBuyPrice > 0 && (
          <>
            <div>
              <span className="text-zinc-500">Avg Buy</span>
              <div className="text-zinc-100 font-medium">
                {wallet.avgBuyPrice.toFixed(8)} SOL
              </div>
            </div>
            <div>
              <span className="text-zinc-500">PnL</span>
              <div className={`font-medium ${pnlColor(pnl)}`}>
                {pnl >= 0 ? "+" : ""}
                {formatSol(pnl, 4)} SOL
              </div>
            </div>
          </>
        )}
      </div>

      {/* Status badge */}
      <div className="flex items-center justify-between">
        <Badge
          variant={
            wallet.status === "confirmed"
              ? "success"
              : wallet.status === "failed"
              ? "destructive"
              : wallet.status === "pending"
              ? "warning"
              : "secondary"
          }
          className="text-xs capitalize"
        >
          {wallet.status}
        </Badge>
        <button
          onClick={() => removeWallet(wallet.id)}
          className="text-zinc-600 hover:text-red-400 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
