"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Rocket, Wallet, Sparkles, Zap, Coins, ArrowDownToLine, Activity } from "lucide-react";
import { useStore } from "@/store";
import { formatSol } from "@/lib/utils";
import type { WalletInfo } from "@/types";
import StatsBar from "@/components/StatsBar";
import WalletTable from "@/components/WalletTable";
import ImportWalletsModal from "@/components/ImportWalletsModal";
import WithdrawModal from "@/components/WithdrawModal";
import FundModal from "@/components/FundModal";
import GenerateActivityModal from "@/components/GenerateActivityModal";
import { Button } from "@/components/ui/button";

const CHART_COLORS = [
  "#4f83ff","#7aa3ff","#5a8eff","#3d6fe8","#93b4ff",
  "#6b9aff","#2d5fd4","#b8cfff","#4475e8","#3360d4",
];

function WalletDistributionChart({ wallets }: { wallets: WalletInfo[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, []);

  const total = wallets.reduce((s, w) => s + w.solBalance, 0);
  const sorted = useMemo(
    () => [...wallets].sort((a, b) => b.solBalance - a.solBalance).slice(0, 10),
    [wallets],
  );

  const r = 42;
  const cx = 60;
  const cy = 60;
  const circumference = 2 * Math.PI * r;
  const gapLen = (3 / 360) * circumference;

  const segments = useMemo(() => {
    let cumulative = 0;
    return sorted.map((w) => {
      const pct = w.solBalance / total;
      const arcLen = Math.max(circumference * pct - gapLen, 0);
      const offset = circumference * (1 - cumulative);
      cumulative += pct;
      return { arcLen, offset, wallet: w, pct };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorted, total]);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-xs text-zinc-600">
        No SOL to display
      </div>
    );
  }

  const hov = hoveredIdx !== null ? segments[hoveredIdx] : null;

  return (
    <div className="p-4 pb-3">
      <svg
        viewBox="0 0 120 120"
        className="w-full max-w-[148px] mx-auto block"
        style={{ overflow: "visible" }}
      >
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(28,38,56,0.9)" strokeWidth="10" />
        {segments.map((seg, i) => (
          <circle
            key={seg.wallet.id}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={hoveredIdx === i ? 14 : 10}
            strokeDasharray={`${animated ? seg.arcLen : 0} ${circumference}`}
            strokeDashoffset={seg.offset}
            transform={`rotate(-90, ${cx}, ${cy})`}
            style={{
              transition: "stroke-dasharray 0.9s cubic-bezier(.4,0,.2,1), stroke-width 0.2s, opacity 0.2s",
              cursor: "pointer",
              opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1,
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}
        {/* Center text */}
        <text x={cx} y={cy - 5} textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="monospace">
          {formatSol(hov ? hov.wallet.solBalance : total, 2)}
        </text>
        <text x={cx} y={cy + 8} textAnchor="middle" fill="rgba(161,161,170,0.65)" fontSize="7.5">
          {hov ? `${(hov.pct * 100).toFixed(1)}% of total` : "total SOL"}
        </text>
        {hov && (
          <text x={cx} y={cy + 19} textAnchor="middle" fill="rgba(161,161,170,0.4)" fontSize="6" fontFamily="monospace">
            {hov.wallet.address.slice(0, 4)}…{hov.wallet.address.slice(-4)}
          </text>
        )}
      </svg>
      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
        {segments.map((seg, i) => (
          <button
            key={seg.wallet.id}
            className="flex items-center gap-1 transition-opacity"
            style={{ opacity: hoveredIdx !== null && hoveredIdx !== i ? 0.3 : 1 }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-[9px] font-mono text-zinc-500">
              {seg.wallet.address.slice(0, 4)}…{seg.wallet.address.slice(-3)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const wallets = useStore((s) => s.wallets);
  const devWalletId = useStore((s) => s.launch.bundleConfig.devWalletId);
  const launches = useStore((s) => s.launches);
  const setActiveTokenMint = useStore((s) => s.setActiveTokenMint);

  const [refreshing, setRefreshing] = useState(false);
  const [importInitialTab, setImportInitialTab] = useState<"import" | "generate">("import");
  const [fundModalOpen, setFundModalOpen] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshBalances(), new Promise((r) => setTimeout(r, 800))]);
    setRefreshing(false);
  };

  const importModalOpen = useStore((s) => s.importModalOpen);
  const setImportModalOpen = useStore((s) => s.setImportModalOpen);
  const refreshBalances = useStore((s) => s.refreshBalances);
  const setTokenPrice = useStore((s) => s.setTokenPrice);
  const activeTokenMint = useStore((s) => s.activeTokenMint);

  useEffect(() => {
    refreshBalances();
    const interval = setInterval(async () => {
      await refreshBalances();
      if (activeTokenMint) {
        try {
          const res = await fetch(`/api/prices?mint=${activeTokenMint}`);
          if (res.ok) {
            const data = await res.json();
            setTokenPrice(data);
          }
        } catch {}
      }
    }, 10_000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTokenMint]);

  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 py-3 sm:px-6 sm:py-5 max-w-7xl w-full mx-auto overflow-y-auto no-scrollbar">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-3 sm:mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-zinc-100 tracking-tight">Dashboard</h1>
            {wallets.length > 0 && (
              <div
                className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  color: "#4f83ff",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-md bg-[#4f83ff] animate-pulse"
                />
                Live
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">
            Manage and monitor<br className="sm:hidden" /> your wallets
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Generate Activity */}
          <button
            onClick={() => setActivityModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200"
            style={{
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#93b4ff",
              background: "rgba(79,131,255,0.08)",
              boxShadow: "0 0 8px rgba(79,131,255,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "#b8cfff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "#93b4ff";
            }}
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Generate Activity</span>
          </button>

          {/* Add Wallets */}
          <button
            onClick={() => { setImportInitialTab("import"); setImportModalOpen(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200"
            style={{
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#93b4ff",
              background: "rgba(79,131,255,0.08)",
              boxShadow: "0 0 8px rgba(79,131,255,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "#b8cfff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "#93b4ff";
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Add Wallets</span>
          </button>

          {/* Fund */}
          <button
            onClick={() => setFundModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200"
            style={{
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#93b4ff",
              background: "rgba(79,131,255,0.08)",
              boxShadow: "0 0 8px rgba(79,131,255,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "#b8cfff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "#93b4ff";
            }}
          >
            <Coins className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Fund</span>
          </button>

          {/* Withdraw */}
          <button
            onClick={() => setWithdrawModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200"
            style={{
              border: "1px solid rgba(79,131,255,0.4)",
              color: "#93b4ff",
              background: "rgba(79,131,255,0.08)",
              boxShadow: "0 0 8px rgba(79,131,255,0.15)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.14)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.3)";
              (e.currentTarget as HTMLButtonElement).style.color = "#b8cfff";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.08)";
              (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.15)";
              (e.currentTarget as HTMLButtonElement).style.color = "#93b4ff";
            }}
          >
            <ArrowDownToLine className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Withdraw</span>
          </button>

        </div>
      </div>

      {/* Stats */}
      <div className="shrink-0 mb-3 sm:mb-5">
        <StatsBar />
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-5 min-h-0 flex-1">

        {/* Wallet panel */}
        <div className="flex flex-col flex-1 min-h-[300px]">

          {wallets.length === 0 ? (
            <div
              className="flex-1 rounded-md flex flex-col items-center justify-center gap-4"
              style={{
                background: "rgba(13,17,24,0.8)",
                border: "1px solid rgba(28,38,56,0.8)",
              }}
            >
              <div
                className="w-14 h-14 rounded-md flex items-center justify-center"
                style={{
                  background: "rgba(79,131,255,0.06)",
                  border: "1px solid rgba(79,131,255,0.15)",
                  boxShadow: "0 0 20px rgba(79,131,255,0.08)",
                }}
              >
                <Wallet className="h-6 w-6 text-zinc-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-zinc-400">No wallets imported</p>
                <p className="text-xs text-zinc-600 mt-0.5">Import your wallets to get started</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setImportInitialTab("import"); setImportModalOpen(true); }}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Import Wallets
              </Button>
            </div>
          ) : (
            <WalletTable wallets={wallets} />
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col lg:w-72 shrink-0 gap-3">

          {/* Launch CTA */}
          <div
            className="shrink-0 rounded-md p-5 text-center relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, rgba(15,22,45,0.98) 0%, rgba(18,18,24,0.95) 100%)",
              border: "1px solid rgba(79,131,255,0.4)",
              boxShadow: "0 0 40px rgba(79,131,255,0.1), 0 0 80px rgba(79,131,255,0.04), inset 0 1px 0 rgba(79,131,255,0.12)",
            }}
          >
            {/* Top radial glow */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% -5%, rgba(79,131,255,0.28) 0%, transparent 60%)" }} />
            {/* Subtle grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(79,131,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(79,131,255,1) 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
            {/* Bottom shine line */}
            <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: "1px", background: "linear-gradient(90deg, transparent 10%, rgba(79,131,255,0.5) 50%, transparent 90%)" }} />

            <div className="relative">

              <div className="text-base font-bold text-white mb-1 tracking-tight">Ready to launch?</div>
              <p className="text-xs mb-5 leading-relaxed" style={{ color: "rgba(161,161,170,0.55)" }}>
                Deploy and bundle-buy your PumpFun token.
              </p>

              <button
                onClick={() => router.push("/launch")}
                className="launch-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-bold"
                style={{
                  background: "linear-gradient(135deg, rgba(79,131,255,0.28) 0%, rgba(79,131,255,0.12) 100%)",
                  border: "1px solid rgba(79,131,255,0.55)",
                  color: "#4f83ff",
                  boxShadow: "0 0 20px rgba(79,131,255,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
                }}
              >
                <Rocket className="btn-rocket h-4 w-4" style={{ filter: "drop-shadow(0 0 4px rgba(79,131,255,0.7))", transform: "rotate(-45deg)" }} />
                Launch Token
              </button>
            </div>
          </div>

          {/* SOL Distribution */}
          {wallets.length > 0 && (
            <div
              className="shrink-0 rounded-md overflow-hidden"
              style={{
                background: "rgba(13,17,24,0.8)",
                border: "1px solid rgba(28,38,56,0.8)",
              }}
            >
              <div className="flex items-center justify-between px-3 pt-3 pb-0">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                  SOL Distribution
                </span>
                <span className="text-[10px] text-zinc-600">{wallets.length} wallets</span>
              </div>
              <WalletDistributionChart wallets={wallets} />
            </div>
          )}

          {/* Latest Launches */}
          <div className="flex flex-col min-h-0">
            <div className="shrink-0 flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">
                Latest Launches
              </span>
              {launches.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(79,131,255,0.1)", color: "#7aa3ff", border: "1px solid rgba(79,131,255,0.2)" }}
                >
                  {launches.length}
                </span>
              )}
            </div>
            <div
              className="rounded-md overflow-hidden"
              style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
            >
              {launches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(28,38,56,0.5)", border: "1px solid rgba(28,38,56,0.8)" }}
                  >
                    <Sparkles className="h-4 w-4 text-zinc-600" />
                  </div>
                  <span className="text-xs text-zinc-400">No launches yet</span>
                </div>
              ) : (
                <div>
                  {launches.slice(0, 20).map((launch) => (
                    <button
                      key={launch.id}
                      onClick={() => {
                        setActiveTokenMint(launch.mintAddress);
                        router.push("/manage");
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.02]"
                    >
                      {launch.logoUri ? (
                        <img
                          src={launch.logoUri}
                          alt={launch.symbol}
                          className="w-8 h-8 rounded-md object-cover shrink-0"
                          style={{ border: "1px solid rgba(63,63,70,0.4)" }}
                        />
                      ) : (
                        <div
                          className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold text-zinc-400"
                          style={{ background: "rgba(63,63,70,0.4)", border: "1px solid rgba(63,63,70,0.4)" }}
                        >
                          {launch.symbol.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{launch.name}</div>
                        <div className="text-[10px] text-zinc-400">${launch.symbol}</div>
                      </div>
                      <div className="text-[10px] text-zinc-500 shrink-0">
                        {new Date(launch.launchedAt).toLocaleDateString([], { month: "short", day: "numeric" })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ImportWalletsModal open={importModalOpen} onClose={() => setImportModalOpen(false)} initialTab={importInitialTab} />
      <WithdrawModal open={withdrawModalOpen} onClose={() => setWithdrawModalOpen(false)} />
      <FundModal open={fundModalOpen} onClose={() => setFundModalOpen(false)} />
      <GenerateActivityModal open={activityModalOpen} onClose={() => setActivityModalOpen(false)} />
    </div>
  );
}
