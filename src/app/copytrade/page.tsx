"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Copy,
  Play,
  Square,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Settings2,
} from "lucide-react";
import { useStore } from "@/store";
import { truncateAddress } from "@/lib/utils";

import type { DetectedTrade } from "@/app/api/copytrade/detect/route";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CopyLog {
  id: string;
  timestamp: number;
  trade: DetectedTrade;
  status: "pending" | "success" | "error";
  txSig?: string;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function randomId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CopytradePage() {
  const wallets = useStore((s) => s.wallets);

  // Config
  const [followerWalletId, setFollowerWalletId] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [buyMode, setBuyMode] = useState<"fixed" | "proportional">("fixed");
  const [fixedSolAmount, setFixedSolAmount] = useState("0.1");

  // Runtime
  const [isActive, setIsActive] = useState(false);
  const [logs, setLogs] = useState<CopyLog[]>([]);
  const [, setTick] = useState(0);
  const [pollError, setPollError] = useState<string | null>(null);

  const lastSigRef = useRef<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  // Keep all mutable config in refs so poll() never needs to be recreated
  const followerWallet = wallets.find((w) => w.id === followerWalletId);
  const followerWalletRef = useRef(followerWallet);
  const targetAddressRef = useRef(targetAddress);
  const buyModeRef = useRef(buyMode);
  const fixedSolAmountRef = useRef(fixedSolAmount);

  useEffect(() => { followerWalletRef.current = followerWallet; }, [followerWallet]);
  useEffect(() => { targetAddressRef.current = targetAddress; }, [targetAddress]);
  useEffect(() => { buyModeRef.current = buyMode; }, [buyMode]);
  useEffect(() => { fixedSolAmountRef.current = fixedSolAmount; }, [fixedSolAmount]);

  // ── Execution ────────────────────────────────────────────────────────────────

  const executeCopy = useCallback(async (trade: DetectedTrade) => {
    const wallet = followerWalletRef.current;
    if (!wallet) return;

    const logId = randomId();
    setLogs((prev) => [{ id: logId, timestamp: Date.now(), trade, status: "pending" as const }, ...prev].slice(0, 100));

    try {
      if (trade.type === "buy") {
        const solAmount = buyModeRef.current === "proportional"
          ? trade.solAmount
          : parseFloat(fixedSolAmountRef.current);

        const res = await fetch("/api/trade/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateKey: wallet.privateKey,
            mintAddress: trade.mint,
            solAmount,
            slippageBps: 9900,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Buy failed");
        setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, status: "success", txSig: data.txSig } : l));
      } else {
        const res = await fetch("/api/trade/sell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privateKey: wallet.privateKey,
            mintAddress: trade.mint,
            percentage: 100,
            slippageBps: 9900,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Sell failed");
        setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, status: "success", txSig: data.txSig } : l));
      }
    } catch (err: any) {
      setLogs((prev) => prev.map((l) => l.id === logId ? { ...l, status: "error", error: err.message } : l));
    }
  }, []); // no deps — reads everything from refs

  // ── Polling ──────────────────────────────────────────────────────────────────

  const poll = useCallback(async () => {
    const address = targetAddressRef.current;
    if (!address) return;

    const params = new URLSearchParams({ address });
    if (lastSigRef.current) params.set("after", lastSigRef.current);

    const res = await fetch(`/api/copytrade/detect?${params}`).catch(() => null);
    if (!res) { setPollError("Network error — cannot reach detection API"); return; }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setPollError(body.error ?? `API error ${res.status}`);
      return;
    }

    setPollError(null);
    const data = await res.json();

    if (data.latestSignature) lastSigRef.current = data.latestSignature;

    // Fire all detected trades in parallel for minimum latency
    await Promise.all((data.trades ?? []).map((t: DetectedTrade) => executeCopy(t)));
  }, [executeCopy]); // stable — executeCopy has no deps

  // Start / stop — only re-runs when isActive changes, never on config changes
  useEffect(() => {
    if (isActive) {
      isPollingRef.current = true;
      lastSigRef.current = null;
      // First call initialises cursor only (no trades executed yet)
      poll();
      intervalRef.current = setInterval(poll, 1_500);
    } else {
      isPollingRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      lastSigRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive]); // intentionally NOT including poll — interval must never restart on config change

  // Keep timestamps fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(id);
  }, []);

  const canStart =
    !!followerWalletId &&
    targetAddress.trim().length >= 32 &&
    (buyMode === "proportional" || parseFloat(fixedSolAmount) > 0);

  const handleToggle = () => {
    if (!canStart && !isActive) return;
    setIsActive((v) => !v);
  };

  // ── UI ───────────────────────────────────────────────────────────────────────

  const card = {
    background: "rgba(24,24,27,0.8)",
    border: "1px solid rgba(63,63,70,0.25)",
  };

  const inputStyle = {
    background: "rgba(9,9,11,0.5)",
    border: "1px solid rgba(63,63,70,0.4)",
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 px-6 py-5 max-w-7xl w-full mx-auto">

      {/* Header */}
      <div className="shrink-0 flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">CopyTrade</h1>
            {isActive && (
              <div
                className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)", color: "#4ade80" }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                Live
              </div>
            )}
          </div>
          <p className="text-xs text-zinc-600 mt-0.5">Mirror trades from any wallet in real time</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex gap-5 min-h-0 flex-1">

        {/* Config panel */}
        <div className="w-72 shrink-0 flex flex-col gap-3">

          {/* Follower wallet */}
          <div className="rounded-md p-4" style={card}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="h-3.5 w-3.5 text-[#4f83ff]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Your Wallet</span>
            </div>
            {wallets.length === 0 ? (
              <p className="text-xs text-zinc-600">No wallets imported</p>
            ) : (
              <select
                value={followerWalletId}
                onChange={(e) => setFollowerWalletId(e.target.value)}
                disabled={isActive}
                className="w-full rounded px-2.5 py-1.5 text-xs font-mono text-zinc-200 disabled:opacity-50 outline-none"
                style={inputStyle}
              >
                <option value="">Select wallet…</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {truncateAddress(w.address, 6)} — {w.solBalance.toFixed(3)} SOL
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Target address */}
          <div className="rounded-md p-4" style={card}>
            <div className="flex items-center gap-2 mb-3">
              <Copy className="h-3.5 w-3.5 text-[#4f83ff]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Target Address</span>
            </div>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value.trim())}
              disabled={isActive}
              placeholder="Wallet to copy…"
              className="w-full rounded px-2.5 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-700 placeholder:font-sans disabled:opacity-50 outline-none"
              style={inputStyle}
            />
          </div>

          {/* Settings */}
          <div className="rounded-md p-4" style={card}>
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-3.5 w-3.5 text-[#4f83ff]" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Settings</span>
            </div>

            <div className="space-y-4">
              {/* Buy mode */}
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 block mb-2">
                  Buy Amount
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["fixed", "proportional"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => !isActive && setBuyMode(m)}
                      disabled={isActive}
                      className="py-2 text-[11px] font-medium capitalize rounded transition-all duration-150 disabled:opacity-50"
                      style={{
                        background: buyMode === m ? "rgba(79,131,255,0.1)" : "rgba(9,9,11,0.5)",
                        border: `1px solid ${buyMode === m ? "rgba(79,131,255,0.4)" : "rgba(63,63,70,0.25)"}`,
                        color: buyMode === m ? "#4f83ff" : "#71717a",
                        boxShadow: buyMode === m ? "0 0 12px rgba(79,131,255,0.12)" : "none",
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {buyMode === "fixed" && (
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 block mb-2">
                    SOL per buy
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={fixedSolAmount}
                    onChange={(e) => setFixedSolAmount(e.target.value)}
                    disabled={isActive}
                    className="w-full rounded px-2.5 py-1.5 text-xs text-zinc-200 disabled:opacity-50 outline-none"
                    style={inputStyle}
                  />
                </div>
              )}

              <p className="text-[10px] text-zinc-600 leading-relaxed">
                Sells copy 100% of your position for that token.
              </p>
            </div>
          </div>

          {/* Start / Stop */}
          <button
            onClick={handleToggle}
            disabled={!canStart && !isActive}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            style={
              isActive
                ? { background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }
                : { background: "rgba(79,131,255,0.12)", border: "1px solid rgba(79,131,255,0.35)", color: "#4f83ff", boxShadow: "0 0 16px rgba(79,131,255,0.15)" }
            }
          >
            {isActive ? (
              <><Square className="h-3.5 w-3.5" /> Stop Copying</>
            ) : (
              <><Play className="h-3.5 w-3.5" /> Start Copying</>
            )}
          </button>

          {pollError && (
            <div
              className="flex items-start gap-2 rounded-md px-3 py-2 text-[11px] leading-snug"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
            >
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-px" />
              <span>{pollError}</span>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="flex flex-col flex-1 min-h-0 rounded-md overflow-hidden" style={card}>
          {/* Title bar */}
          <div
            className="shrink-0 flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: "1px solid rgba(63,63,70,0.25)", background: "rgba(14,14,18,0.6)" }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Activity</span>
            {logs.length > 0 && (
              <button onClick={() => setLogs([])} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                Clear
              </button>
            )}
          </div>

          {/* Column headers */}
          <div
            className="shrink-0 grid px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-600"
            style={{
              gridTemplateColumns: "70px 1fr 100px 90px 110px 90px",
              borderBottom: "1px solid rgba(63,63,70,0.15)",
              background: "rgba(9,9,11,0.3)",
            }}
          >
            <span>Type</span><span>Mint</span><span>SOL</span><span>Tokens</span><span>Status</span><span>Time</span>
          </div>

          {/* Rows */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.15)" }}
                >
                  <Copy className="h-5 w-5 text-zinc-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-500">No trades copied yet</p>
                  <p className="text-xs text-zinc-700 mt-0.5">
                    {isActive ? "Watching for trades…" : "Configure and start to begin copying"}
                  </p>
                </div>
              </div>
            ) : (
              logs.map((log, i) => (
                <div
                  key={log.id}
                  className="grid items-center px-4 py-2.5 text-xs transition-colors hover:bg-white/[0.02]"
                  style={{
                    gridTemplateColumns: "70px 1fr 100px 90px 110px 90px",
                    borderBottom: i < logs.length - 1 ? "1px solid rgba(63,63,70,0.12)" : "none",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    {log.trade.type === "buy" ? (
                      <><TrendingUp className="h-3 w-3 text-green-400 shrink-0" /><span className="text-green-400 font-semibold">BUY</span></>
                    ) : (
                      <><TrendingDown className="h-3 w-3 text-red-400 shrink-0" /><span className="text-red-400 font-semibold">SELL</span></>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-zinc-300 truncate">{truncateAddress(log.trade.mint, 5)}</span>
                    <button onClick={() => navigator.clipboard.writeText(log.trade.mint)} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors">
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="text-zinc-300 tabular-nums">{log.trade.solAmount.toFixed(4)} SOL</span>
                  <span className="text-zinc-400 tabular-nums">{log.trade.tokenAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <div className="flex items-center gap-1">
                    {log.status === "pending" && <span className="text-yellow-400 text-[10px] font-medium">Pending…</span>}
                    {log.status === "success" && (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />
                        {log.txSig && (
                          <a href={`https://solscan.io/tx/${log.txSig}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-zinc-500 hover:text-[#4f83ff] transition-colors font-mono">
                            {log.txSig.slice(0, 6)}…
                          </a>
                        )}
                      </>
                    )}
                    {log.status === "error" && (
                      <div className="flex items-center gap-1" title={log.error}>
                        <AlertCircle className="h-3 w-3 text-red-400 shrink-0" />
                        <span className="text-[10px] text-red-400 truncate max-w-[60px]">{log.error}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-zinc-600 text-[10px] tabular-nums">{timeAgo(log.timestamp)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
