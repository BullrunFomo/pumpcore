"use client";
import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  Loader2,
  Rocket,
  Crown,
} from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { truncateAddress, formatSol } from "@/lib/utils";
import type { LaunchLogEntry } from "@/types";

const LOG_ICONS: Record<LaunchLogEntry["level"], React.ReactNode> = {
  info: <Info className="h-3 w-3 text-[#4f83ff]" />,
  success: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  error: <XCircle className="h-3 w-3 text-red-400" />,
  warn: <AlertTriangle className="h-3 w-3 text-amber-400" />,
};

const LOG_COLORS: Record<LaunchLogEntry["level"], string> = {
  info: "#a1a1aa",
  success: "#4ade80",
  error: "#f87171",
  warn: "#fbbf24",
};

export default function Step4ReviewLaunch() {
  const router = useRouter();
  const launch = useStore((s) => s.launch);
  const wallets = useStore((s) => s.wallets);
  const setLaunchStep = useStore((s) => s.setLaunchStep);
  const setLaunching = useStore((s) => s.setLaunching);
  const addLaunchLog = useStore((s) => s.addLaunchLog);
  const setLaunched = useStore((s) => s.setLaunched);
  const setActiveTokenMint = useStore((s) => s.setActiveTokenMint);
  const updateTokenConfig = useStore((s) => s.updateTokenConfig);
  const addLaunch = useStore((s) => s.addLaunch);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [, setSseActive] = useState(false);

  const { tokenConfig, bundleConfig, autoSell, sniperGuard } = launch;
  const selectedWallets = wallets.filter((w) =>
    bundleConfig.selectedWalletIds.includes(w.id)
  );

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [launch.logs]);

  const handleLaunch = async () => {
    if (launch.isLaunching) return;
    setLaunching(true);
    setSseActive(true);

    try {
      const formData = new FormData();
      if (tokenConfig.logoFile) {
        formData.append("logo", tokenConfig.logoFile);
      }
      formData.append(
        "config",
        JSON.stringify({
          tokenConfig: {
            name: tokenConfig.name,
            symbol: tokenConfig.symbol,
            website: tokenConfig.website,
            twitter: tokenConfig.twitter,
            telegram: tokenConfig.telegram,
            tokenType: tokenConfig.tokenType,
          },
          bundleConfig: {
            // Dev wallet always first so route.ts picks it as creator
            selectedWallets: [
              ...selectedWallets.filter((w) => w.id === bundleConfig.devWalletId),
              ...selectedWallets.filter((w) => w.id !== bundleConfig.devWalletId),
            ].map((w) => ({ address: w.address, privateKey: w.privateKey })),
            devWalletId: bundleConfig.devWalletId,
            solPerWallet: bundleConfig.solPerWallet,
            jitoTipSol: bundleConfig.jitoTipSol,
            launchType: bundleConfig.launchType,
            staggerDelayMs: bundleConfig.staggerDelayMs,
          },
          autoSell,
          sniperGuard,
        })
      );

      const res = await fetch("/api/launch", {
        method: "POST",
        body: formData,
      });

      if (!res.body) throw new Error("No response stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.type === "log") {
                addLaunchLog({
                  level: event.level,
                  message: event.message,
                  txSig: event.txSig,
                  walletAddress: event.walletAddress,
                });
              } else if (event.type === "complete") {
                setLaunched(true);
                setLaunching(false);
                setSseActive(false);
                if (event.mintAddress) {
                  setActiveTokenMint(event.mintAddress);
                  updateTokenConfig({ mintAddress: event.mintAddress });
                  addLaunch({
                    mintAddress: event.mintAddress,
                    name: tokenConfig.name,
                    symbol: tokenConfig.symbol,
                    logoUri: tokenConfig.logoUri,
                    launchedAt: new Date().toISOString(),
                  });
                }
                setTimeout(() => router.push("/manage"), 1500);
              } else if (event.type === "error") {
                addLaunchLog({ level: "error", message: event.message });
                setLaunching(false);
                setSseActive(false);
              }
            } catch {}
          }
        }
      }
    } catch (err: any) {
      addLaunchLog({ level: "error", message: err.message || "Launch failed" });
      setLaunching(false);
      setSseActive(false);
    }
  };

  const cardStyle = {
    background: "rgba(24,24,27,0.8)",
    border: "1px solid rgba(63,63,70,0.25)",
  };

  const totalSol = selectedWallets.length * bundleConfig.solPerWallet;

  // ~0.006 SOL buffer per wallet: priority fee + ATA creation + tx fee
  const MIN_BUFFER = 0.006;
  const insufficientWallets = selectedWallets.filter(
    (w) => w.solBalance < bundleConfig.solPerWallet + MIN_BUFFER
  );

  return (
    <div className="space-y-4">
      {/* Review card */}
      <div className="rounded-md p-5 space-y-4" style={cardStyle}>
        <div className="flex items-center gap-2">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Review Configuration
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Token</div>
            <div className="text-zinc-100 font-semibold">
              {tokenConfig.name}{" "}
              <span className="text-zinc-500 font-normal">({tokenConfig.symbol})</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Type</div>
            <Badge
              variant={
                tokenConfig.tokenType === "Mayhem Mode"
                  ? "mayhem"
                  : tokenConfig.tokenType === "Cashback"
                  ? "cashback"
                  : tokenConfig.tokenType === "Agent"
                  ? "agent"
                  : "secondary"
              }
            >
              {tokenConfig.tokenType}
            </Badge>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Launch Mode</div>
            <div className="text-zinc-300 text-sm">
              {bundleConfig.launchType === "classic"
                ? "Classic Bundle (Jito)"
                : `Stagger (${bundleConfig.staggerDelayMs}ms)`}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Buy</div>
            <div className="text-zinc-300 text-sm">
              {selectedWallets.length}w ×{" "}
              <span style={{ color: "#4f83ff" }}>
                {formatSol(bundleConfig.solPerWallet, 3)} SOL
              </span>{" "}
              ={" "}
              <span className="font-bold text-zinc-100">
                {formatSol(totalSol, 3)} SOL
              </span>
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Auto-Sell</div>
            <div className="text-zinc-300 text-sm">
              {autoSell.enabled
                ? autoSell.mode === "time"
                  ? `${autoSell.timeSeconds}s after launch`
                  : `$${autoSell.mcapTarget.toLocaleString()} MCap`
                : <span className="text-zinc-600">Disabled</span>}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-0.5">Sniper Guard</div>
            <div className="text-zinc-300 text-sm">
              {sniperGuard.enabled
                ? `>${sniperGuard.solThreshold} SOL → ${sniperGuard.action === "stop" ? "Stop" : "Sell All"}`
                : <span className="text-zinc-600">Disabled</span>}
            </div>
          </div>
        </div>

        {/* Insufficient balance warning */}
        {insufficientWallets.length > 0 && (
          <div
            className="rounded p-3 flex items-start gap-2"
            style={{
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.3)",
            }}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-red-300 space-y-0.5">
              <div className="font-semibold">
                {insufficientWallets.length} wallet{insufficientWallets.length !== 1 ? "s" : ""} may have insufficient SOL
              </div>
              <div className="text-red-400/70">
                Each wallet needs at least{" "}
                <span className="text-red-300 font-medium">
                  {formatSol(bundleConfig.solPerWallet + MIN_BUFFER, 4)} SOL
                </span>{" "}
                ({formatSol(bundleConfig.solPerWallet, 3)} buy + ~{formatSol(MIN_BUFFER, 3)} fees).
                Low-balance wallets will be skipped.
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5">
                {insufficientWallets.map((w) => (
                  <span
                    key={w.id}
                    className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.25)",
                      color: "#f87171",
                    }}
                  >
                    {w.address.slice(0, 6)}…{" "}
                    <span style={{ color: "#ef4444" }}>
                      {formatSol(w.solBalance, 4)} SOL
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Wallet chips */}
        <div>
          <div className="text-[10px] uppercase tracking-wider text-zinc-600 mb-2">
            Participating Wallets
          </div>
          <div className="flex flex-wrap gap-1.5">
            {selectedWallets.map((w) => {
              const isDev = w.id === bundleConfig.devWalletId;
              return (
                <div
                  key={w.id}
                  className="flex items-center gap-1.5 rounded px-2 py-1"
                  style={{
                    background: isDev ? "rgba(234,179,8,0.08)" : "rgba(9,9,11,0.7)",
                    border: `1px solid ${isDev ? "rgba(234,179,8,0.4)" : "rgba(63,63,70,0.25)"}`,
                  }}
                >
                  {isDev && <Crown className="h-3 w-3 text-yellow-500 flex-shrink-0" />}
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: w.color, boxShadow: `0 0 4px ${w.color}` }}
                  />
                  <span className="font-mono text-[11px] text-zinc-400">
                    {truncateAddress(w.address, 4)}
                  </span>
                  {isDev && (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-yellow-600">
                      Dev
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Launch log */}
      {(launch.logs.length > 0 || launch.isLaunching) && (
        <div
          className="rounded-md overflow-hidden"
          style={{ border: "1px solid rgba(63,63,70,0.25)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: "rgba(9,9,11,0.9)", borderBottom: "1px solid rgba(63,63,70,0.25)" }}
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <div className="h-2 w-2 rounded-full bg-amber-400" />
              <div className="h-2 w-2 rounded-full bg-green-400" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 ml-2">
                Launch Log
              </span>
            </div>
            {launch.isLaunching && (
              <Loader2 className="h-3 w-3 text-[#4f83ff] animate-spin" />
            )}
          </div>
          <div
            className="p-4 font-mono text-xs space-y-1.5 max-h-60 overflow-y-auto"
            style={{ background: "rgba(5,5,8,0.95)" }}
          >
            {launch.logs.map((log) => (
              <div key={log.id} className="log-entry flex items-start gap-2">
                <span className="flex-shrink-0 mt-0.5">{LOG_ICONS[log.level]}</span>
                <span className="text-zinc-700 flex-shrink-0 tabular-nums">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ color: LOG_COLORS[log.level] }}>{log.message}</span>
                {log.txSig && (
                  <a
                    href={`https://solscan.io/tx/${log.txSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto flex-shrink-0 text-[#4f83ff]/50 hover:text-[#4f83ff] transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            ))}
            {launch.launched && (
              <div className="log-entry flex items-center gap-2 text-green-400 font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Launch complete! Redirecting...
              </div>
            )}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      <div className="flex justify-between items-center pt-1">
        <Button variant="outline" onClick={() => setLaunchStep(3)} disabled={launch.isLaunching}>
          ← Back
        </Button>

        <button
          onClick={handleLaunch}
          disabled={launch.isLaunching || launch.launched || selectedWallets.length === 0}
          className="relative px-10 py-3 text-sm font-bold rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
          style={
            launch.launched
              ? {
                  background: "rgba(34,197,94,0.12)",
                  border: "1px solid rgba(34,197,94,0.5)",
                  color: "#4ade80",
                  boxShadow: "0 0 20px rgba(34,197,94,0.3), inset 0 0 20px rgba(34,197,94,0.06)",
                }
              : launch.isLaunching
              ? {
                  background: "rgba(79,131,255,0.08)",
                  border: "1px solid rgba(79,131,255,0.3)",
                  color: "#4f83ff",
                  boxShadow: "0 0 16px rgba(79,131,255,0.25)",
                }
              : {
                  background: "rgba(79,131,255,0.1)",
                  border: "1px solid rgba(79,131,255,0.5)",
                  color: "#4f83ff",
                  boxShadow:
                    "0 0 20px rgba(79,131,255,0.3), inset 0 0 20px rgba(79,131,255,0.06)",
                }
          }
        >
          {/* Animated shimmer */}
          {!launch.isLaunching && !launch.launched && (
            <span
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 40%, rgba(79,131,255,0.12) 50%, transparent 60%)",
                animation: "shimmer 2.5s infinite",
              }}
            />
          )}
          <span className="relative flex items-center gap-2">
            {launch.isLaunching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Launching...
              </>
            ) : launch.launched ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Launched!
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" />
                Launch Token
              </>
            )}
          </span>
        </button>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
