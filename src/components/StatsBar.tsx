"use client";
import { useState } from "react";
import { TrendingUp, Wallet, Rocket, Zap, Calendar, BarChart2 } from "lucide-react";
import { useStore } from "@/store";
import { formatSol, formatUsd } from "@/lib/utils";
import { computeAllLaunchesPnl } from "@/lib/pnl";
import OverallPnlCard from "@/components/OverallPnlCard";
import OverallPnlChart from "@/components/OverallPnlChart";
import PnlCalendar from "@/components/PnlCalendar";

export default function StatsBar() {
  const wallets = useStore((s) => s.wallets);
  const launches = useStore((s) => s.launches);
  const trades = useStore((s) => s.trades);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const launch = useStore((s) => s.launch);

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [chartOpen, setChartOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);

  const bundleSelectedIds = launch.bundleConfig.selectedWalletIds;
  const bundleWallets = bundleSelectedIds.length > 0
    ? wallets.filter((w) => bundleSelectedIds.includes(w.id))
    : wallets;

  const totalSol = wallets.reduce((sum, w) => sum + w.solBalance, 0);

  const currentTotalSol = bundleWallets.reduce((acc, w) => acc + w.solBalance, 0);
  const totalPnlSol = computeAllLaunchesPnl(launches, trades, currentTotalSol, activeTokenMint);
  const totalPnlUsd = totalPnlSol * (tokenPrice?.solPrice ?? 0);
  const isPositive = totalPnlSol >= 0;

  return (
    <>
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
            <div className="flex items-center gap-1">
              {[
                { icon: Calendar,  onClick: () => setCalendarOpen(true), title: "PnL Calendar" },
                { icon: BarChart2, onClick: () => setChartOpen(true),    title: "PnL Chart" },
              ].map(({ icon: Icon, onClick, title }) => (
                <button
                  key={title}
                  onClick={onClick}
                  title={title}
                  className="flex items-center justify-center rounded p-0.5 transition-all text-zinc-500 hover:text-[#4f83ff] hover:bg-[rgba(79,131,255,0.12)]"
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              ))}
              <button
                onClick={() => setCardOpen(true)}
                title="PnL Card"
                className="flex items-center justify-center rounded p-0.5 transition-all text-zinc-500 hover:text-[#4f83ff] hover:bg-[rgba(79,131,255,0.12)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12" />
                  <path d="M6 3v6a6 6 0 0 0 12 0V3" />
                  <path d="M4 3C4 3 2 3.5 2 7c0 2.5 2 4 4 4" />
                  <path d="M20 3c0 0 2 .5 2 4c0 2.5-2 4-4 4" />
                  <path d="M12 15v4" />
                  <path d="M8 19h8" />
                  <path d="M9 22h6" />
                </svg>
              </button>
            </div>
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

        {/* Row separator . mobile only */}
        <div className="col-span-2 sm:hidden h-px mx-4" style={{ background: "rgba(28,38,56,0.9)" }} />

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

        {/* Total Launches */}
        <div className="px-5 py-4 relative before:absolute before:left-0 before:top-3 before:bottom-3 before:w-px before:bg-[rgba(28,38,56,0.9)]">
          <div className="flex items-center gap-2 mb-2.5">
            <Rocket className="h-3 w-3 text-[#4f83ff]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
              Total Launches
            </span>
          </div>
          <div className="text-base font-bold text-white">{launches.length}</div>
          <div className="text-xs text-zinc-500 mt-0.5 font-medium">
            {launches.length === 1 ? "token launched" : "tokens launched"}
          </div>
        </div>

      </div>
    </div>

    <PnlCalendar
      open={calendarOpen}
      onClose={() => setCalendarOpen(false)}
      currentTotalSol={currentTotalSol}
    />
    <OverallPnlChart
      open={chartOpen}
      onClose={() => setChartOpen(false)}
      currentTotalSol={currentTotalSol}
    />
    <OverallPnlCard
      open={cardOpen}
      onClose={() => setCardOpen(false)}
      totalPnlSol={totalPnlSol}
      totalPnlUsd={totalPnlUsd}
      investedSol={launches.reduce((s, l) => s + (l.initialSolEquity ?? 0), 0)}
      currentPositionSol={currentTotalSol}
      solPrice={tokenPrice?.solPrice ?? 0}
    />
    </>
  );
}
