"use client";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useStore } from "@/store";
import { getTradesForLaunch } from "@/lib/pnl";

interface Props {
  open: boolean;
  onClose: () => void;
  currentTotalSol: number;
}

export default function OverallPnlChart({ open, onClose, currentTotalSol }: Props) {
  const launches = useStore((s) => s.launches);
  const trades = useStore((s) => s.trades);
  const activeTokenMint = useStore((s) => s.activeTokenMint);

  const points = useMemo(() => {
    const sorted = [...launches].sort(
      (a, b) => new Date(a.launchedAt).getTime() - new Date(b.launchedAt).getTime()
    );
    let cum = 0;
    return sorted.map((l) => {
      let pnl = 0;
      if (l.finalSolEquity != null && l.initialSolEquity != null) {
        pnl = l.finalSolEquity - l.initialSolEquity;
      } else if (l.initialSolEquity != null && l.mintAddress === activeTokenMint) {
        pnl = currentTotalSol - l.initialSolEquity;
      } else if (l.initialSolEquity == null) {
        const lt = getTradesForLaunch(l.mintAddress, launches, trades);
        pnl = lt.reduce((acc, t) => {
          if (t.type === "sell") return acc + t.solAmount;
          if (t.type === "buy") return acc - t.solAmount;
          return acc;
        }, 0);
      }
      cum += pnl;
      return {
        name: l.symbol || l.name,
        date: new Date(l.launchedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        pnl,
        cum,
      };
    });
  }, [launches, trades, activeTokenMint, currentTotalSol]);

  const hasData = points.some((p) => p.pnl !== 0);

  const TOP_PAD = 24;
  const BOT_PAD = 46;
  const CHART_H = 210;
  const SIDE_PAD = 48;
  const minChartW = Math.max(600, points.length * 60);
  const svgW = minChartW + SIDE_PAD * 2;
  const svgH = TOP_PAD + CHART_H + BOT_PAD;

  const cumValues = points.map((p) => p.cum);
  const rawMin = Math.min(...cumValues);
  const rawMax = Math.max(...cumValues);
  const vPad = Math.max((rawMax - rawMin) * 0.12, 0.001);
  const yMin = rawMin - vPad;
  const yMax = rawMax + vPad;
  const range = yMax - yMin;

  const innerPad = points.length <= 1 ? minChartW / 2 : Math.min(40, minChartW * 0.06);
  const usableW = minChartW - 2 * innerPad;
  const xFor = (i: number) =>
    SIDE_PAD + innerPad + (points.length > 1 ? (i * usableW) / (points.length - 1) : 0);
  const yFor = (v: number) => TOP_PAD + CHART_H * (1 - (v - yMin) / range);
  const chartBottom = TOP_PAD + CHART_H;

  const finalCum = points.length > 0 ? points[points.length - 1].cum : 0;
  const isPositive = finalCum >= 0;
  const color = isPositive ? "#4f83ff" : "#f87171";
  const colorRgb = isPositive ? "79,131,255" : "248,113,113";

  const areaPath =
    points.length > 0
      ? `M ${xFor(0)},${chartBottom} ` +
        points.map((p, i) => `L ${xFor(i)},${yFor(p.cum)}`).join(" ") +
        ` L ${xFor(points.length - 1)},${chartBottom} Z`
      : "";

  const linePath =
    points.length > 0
      ? "M " + points.map((p, i) => `${xFor(i)},${yFor(p.cum)}`).join(" L ")
      : "";

  // Zero reference line — only if chart crosses zero
  const zeroY = yFor(0);
  const showZeroLine = zeroY > TOP_PAD && zeroY < chartBottom;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        style={{
          maxWidth: "min(860px, 95vw)",
          background: "rgba(11,15,23,0.98)",
          border: "1px solid rgba(28,38,56,0.8)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold text-zinc-300">
            Overall PnL
          </DialogTitle>
        </DialogHeader>

        {!hasData ? (
          <p className="text-zinc-500 text-sm text-center py-10">
            No PnL data yet. Launch a token to start tracking.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <svg
              width={svgW}
              height={svgH}
              className="block mx-auto"
              style={{ fontFamily: "system-ui, sans-serif" }}
            >
              <defs>
                <linearGradient id="pnl-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Zero reference (only when chart crosses zero) */}
              {showZeroLine && (
                <line
                  x1={SIDE_PAD} y1={zeroY}
                  x2={SIDE_PAD + minChartW} y2={zeroY}
                  stroke={`rgba(${colorRgb},0.2)`}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
              )}

              {/* Area fill */}
              <path d={areaPath} fill="url(#pnl-area-grad)" />

              {/* Line */}
              <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Last point dot */}
              {points.length > 0 && (() => {
                const last = points[points.length - 1];
                const cx = xFor(points.length - 1);
                const cy = yFor(last.cum);
                const sign = last.cum > 0 ? "+" : "";
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={8} fill={color} opacity={0.15} />
                    <circle cx={cx} cy={cy} r={4} fill={color} opacity={0.9} />
                    <text
                      x={cx}
                      y={cy - 12}
                      textAnchor="middle"
                      fill={color}
                      fontSize="9"
                      fontWeight="700"
                    >
                      {sign}{Math.abs(last.cum).toFixed(3)} SOL
                    </text>
                  </g>
                );
              })()}

              {/* Ticker + date labels */}
              {points.map((p, i) => (
                <g key={i}>
                  <text
                    x={xFor(i)}
                    y={chartBottom + 16}
                    textAnchor="middle"
                    fill="rgba(100,116,139,0.75)"
                    fontSize="9"
                  >
                    {p.name.length > 6 ? p.name.slice(0, 6) + "…" : p.name}
                  </text>
                  <text
                    x={xFor(i)}
                    y={chartBottom + 28}
                    textAnchor="middle"
                    fill="rgba(100,116,139,0.4)"
                    fontSize="8"
                  >
                    {p.date}
                  </text>
                </g>
              ))}

              {/* Y-axis: min and max labels */}
              <text
                x={SIDE_PAD - 6} y={yFor(rawMax) + 4}
                textAnchor="end" fill={`rgba(${colorRgb},0.45)`} fontSize="8"
              >
                {rawMax > 0 ? "+" : ""}{rawMax.toFixed(2)}
              </text>
              <text
                x={SIDE_PAD - 6} y={yFor(rawMin) + 4}
                textAnchor="end" fill={`rgba(${colorRgb},0.45)`} fontSize="8"
              >
                {rawMin > 0 ? "+" : ""}{rawMin.toFixed(2)}
              </text>
            </svg>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
