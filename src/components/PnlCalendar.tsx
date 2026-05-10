"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useStore } from "@/store";

interface Props {
  open: boolean;
  onClose: () => void;
  currentTotalSol: number;
}

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function localKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtUsd(n: number) {
  const abs = Math.abs(n);
  const sign = n >= 0 ? "+" : "-";
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export default function PnlCalendar({ open, onClose, currentTotalSol }: Props) {
  const launches = useStore((s) => s.launches);
  const activeTokenMint = useStore((s) => s.activeTokenMint);
  const tokenPrice = useStore((s) => s.tokenPrice);
  const solPrice = tokenPrice?.solPrice ?? 0;

  const [monthOffset, setMonthOffset] = useState(0);

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const dailyPnl = useMemo(() => {
    const map: Record<string, number> = {};
    launches.forEach((l) => {
      let pnl = 0;
      if (l.finalSolEquity != null && l.initialSolEquity != null) {
        pnl = l.finalSolEquity - l.initialSolEquity;
      } else if (l.initialSolEquity != null && l.mintAddress === activeTokenMint) {
        pnl = currentTotalSol - l.initialSolEquity;
      } else {
        return;
      }
      const key = localKey(new Date(l.launchedAt));
      map[key] = (map[key] ?? 0) + pnl;
    });
    return map;
  }, [launches, activeTokenMint, currentTotalSol]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // Monday-first: JS getDay() 0=Sun→6, 1=Mon→0, ..., 6=Sat→5
  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7;
  const todayKey = localKey(today);

  const monthLabel = viewDate.toLocaleDateString("en-US", { month: "short", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="flex flex-col rounded-lg overflow-hidden"
        style={{
          width: "min(860px, 95vw)",
          maxHeight: "92vh",
          background: "#0d1118",
          border: "1px solid rgba(28,38,56,0.8)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-3 shrink-0"
          style={{ borderBottom: "1px solid rgba(28,38,56,0.7)" }}
        >
          <span className="text-sm font-semibold text-zinc-200">
            PNL Calendar
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthOffset((o) => o - 1)}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-zinc-200 w-24 text-center">
              {monthLabel}
            </span>
            <button
              onClick={() => setMonthOffset((o) => o + 1)}
              disabled={monthOffset >= 0}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              onClick={onClose}
              className="ml-2 p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calendar grid */}
        <div className="p-4 overflow-y-auto">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold text-zinc-500 py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, idx) => {
              if (!day) {
                return (
                  <div
                    key={idx}
                    className="rounded"
                    style={{ height: "76px", background: "transparent" }}
                  />
                );
              }

              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

              // Hide future days — render as blank
              if (key > todayKey) {
                return (
                  <div
                    key={idx}
                    className="rounded"
                    style={{ height: "76px", background: "transparent" }}
                  />
                );
              }

              const pnlSol = dailyPnl[key];
              const hasPnl = pnlSol !== undefined;
              const pnlUsd = hasPnl ? pnlSol * solPrice : 0;
              const isProfit = hasPnl && pnlSol > 0;
              const isLoss = hasPnl && pnlSol < 0;

              let bg = "rgba(255,255,255,0.03)";
              let dayNumColor = "rgba(100,116,139,0.5)";
              let valueColor = "rgba(100,116,139,0.5)";

              if (isProfit) {
                bg = "rgba(34,85,54,0.55)";
                dayNumColor = "rgba(74,222,128,0.7)";
                valueColor = "#4ade80";
              } else if (isLoss) {
                bg = "rgba(90,28,40,0.55)";
                dayNumColor = "rgba(248,113,113,0.7)";
                valueColor = "#f87171";
              }

              return (
                <div
                  key={idx}
                  className="relative rounded flex flex-col items-center justify-center"
                  style={{
                    height: "76px",
                    background: bg,
                    border: "1px solid transparent",
                  }}
                  title={hasPnl ? `${pnlSol >= 0 ? "+" : ""}${pnlSol.toFixed(4)} SOL` : undefined}
                >
                  {/* Day number top-left */}
                  <span
                    className="absolute top-2 left-2.5 text-xs font-semibold leading-none"
                    style={{ color: dayNumColor }}
                  >
                    {day}
                  </span>

                  {/* PnL value centered */}
                  <span
                    className="text-sm font-bold"
                    style={{ color: valueColor }}
                  >
                    {hasPnl ? fmtUsd(pnlUsd) : "0$"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
