"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Rocket, Wallet, Sparkles } from "lucide-react";
import { useStore } from "@/store";
import StatsBar from "@/components/StatsBar";
import WalletTable from "@/components/WalletTable";
import ImportWalletsModal from "@/components/ImportWalletsModal";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const router = useRouter();
  const wallets = useStore((s) => s.wallets);
  const launches = useStore((s) => s.launches);
  const setActiveTokenMint = useStore((s) => s.setActiveTokenMint);

  const [refreshing, setRefreshing] = useState(false);

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
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  background: "rgba(79,131,255,0.08)",
                  border: "1px solid rgba(79,131,255,0.2)",
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
            Manage and monitor your wallets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs transition-all duration-200 disabled:opacity-50 ${
              refreshing
                ? "text-[#4f83ff] scale-95"
                : "text-zinc-500 hover:text-zinc-200"
            }`}
            style={{
              border: refreshing ? "1px solid rgba(79,131,255,0.4)" : "1px solid rgba(63,63,70,0.25)",
              boxShadow: refreshing ? "0 0 10px rgba(79,131,255,0.15)" : "none",
            }}
          >
            <RefreshCw className={`h-3.5 w-3.5 transition-transform ${refreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:block">Refresh</span>
          </button>
          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
            style={{ border: "1px solid rgba(63,63,70,0.25)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Import Wallets</span>
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
        <div className="flex flex-col min-h-0 flex-1 min-h-[300px]">

          {wallets.length === 0 ? (
            <div
              className="flex-1 rounded-md flex flex-col items-center justify-center gap-4"
              style={{
                background: "rgba(24,24,27,0.8)",
                border: "1px solid rgba(63,63,70,0.25)",
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
              <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
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

          {/* Latest Launches */}
          <div className="flex flex-col min-h-0">
            <div className="shrink-0 flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
                Latest Launches
              </span>
              {launches.length > 0 && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(63,63,70,0.25)", color: "#71717a" }}
                >
                  {launches.length}
                </span>
              )}
            </div>
            <div
              className="rounded-md overflow-hidden"
              style={{ background: "rgba(24,24,27,0.8)", border: "1px solid rgba(63,63,70,0.25)" }}
            >
              {launches.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <div
                    className="w-8 h-8 rounded-md flex items-center justify-center"
                    style={{ background: "rgba(63,63,70,0.25)", border: "1px solid rgba(63,63,70,0.25)" }}
                  >
                    <Sparkles className="h-4 w-4 text-zinc-600" />
                  </div>
                  <span className="text-xs text-zinc-600">No launches yet</span>
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
                        <div className="text-[10px] text-zinc-600">${launch.symbol}</div>
                      </div>
                      <div className="text-[10px] text-zinc-700 shrink-0">
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

      <ImportWalletsModal open={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
}
