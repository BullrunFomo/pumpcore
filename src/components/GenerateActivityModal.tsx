"use client";
import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useStore } from "@/store";
import { Activity, CheckCircle2, XCircle, AlertTriangle, Info, Loader2, ExternalLink } from "lucide-react";
import { truncateAddress } from "@/lib/utils";

interface GenerateActivityModalProps {
  open: boolean;
  onClose: () => void;
}

type Phase = "idle" | "running" | "done";

interface LogEntry {
  level: "info" | "success" | "error" | "warn";
  message: string;
  txSig?: string;
  walletAddress?: string;
}

const LOG_ICONS: Record<string, React.ReactNode> = {
  info: <Info className="h-3 w-3 text-[#4f83ff]" />,
  success: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  error: <XCircle className="h-3 w-3 text-red-400" />,
  warn: <AlertTriangle className="h-3 w-3 text-amber-400" />,
};

const LOG_COLORS: Record<string, string> = {
  info: "#a1a1aa",
  success: "#4ade80",
  error: "#f87171",
  warn: "#fbbf24",
};

export default function GenerateActivityModal({ open, onClose }: GenerateActivityModalProps) {
  const wallets = useStore((s) => s.wallets);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [solAmount, setSolAmount] = useState("0.1");
  const [loops, setLoops] = useState("3");
  const [phase, setPhase] = useState<Phase>("idle");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState({ loop: 0, total: 0 });
  const logsEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      if (o) {
        setSelectedIds(new Set(wallets.map((w) => w.id)));
        setLogs([]);
        setPhase("idle");
        setProgress({ loop: 0, total: 0 });
      } else {
        onClose();
      }
    },
    [wallets, onClose]
  );

  const allSelected = wallets.length > 0 && selectedIds.size === wallets.length;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(wallets.map((w) => w.id)));
  };

  const toggleWallet = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addLog = (entry: LogEntry) => {
    setLogs((prev) => [...prev, entry]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleStart = async () => {
    const selectedWallets = wallets.filter((w) => selectedIds.has(w.id));
    const sol = parseFloat(solAmount);
    const loopCount = parseInt(loops, 10);
    if (!selectedWallets.length || isNaN(sol) || sol <= 0 || isNaN(loopCount) || loopCount <= 0) return;

    setPhase("running");
    setLogs([]);
    setProgress({ loop: 0, total: loopCount });

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallets: selectedWallets.map((w) => ({ address: w.address, privateKey: w.privateKey })),
          solAmount: sol,
          loops: loopCount,
        }),
        signal: abort.signal,
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
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.type === "log") {
              addLog({ level: event.level, message: event.message, txSig: event.txSig, walletAddress: event.walletAddress });
            } else if (event.type === "progress") {
              setProgress({ loop: event.loop, total: event.total });
            } else if (event.type === "complete") {
              setPhase("done");
            } else if (event.type === "error") {
              addLog({ level: "error", message: event.message });
              setPhase("done");
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        addLog({ level: "error", message: err.message });
      }
      setPhase("done");
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setPhase("done");
    addLog({ level: "warn", message: "Activity stopped by user" });
  };

  const canStart =
    selectedIds.size > 0 &&
    parseFloat(solAmount) > 0 &&
    parseInt(loops, 10) > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-w-lg w-full p-0 overflow-hidden"
        style={{
          background: "rgba(10,13,20,0.98)",
          border: "1px solid rgba(28,38,56,0.9)",
          boxShadow: "0 0 60px rgba(79,131,255,0.08)",
        }}
      >
        <VisuallyHidden>
          <DialogTitle>Generate Activity</DialogTitle>
        </VisuallyHidden>

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}
        >
          <div
            className="w-8 h-8 rounded flex items-center justify-center shrink-0"
            style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
          >
            <Activity className="h-4 w-4 text-[#4f83ff]" />
          </div>
          <div>
            <div className="text-sm font-semibold text-zinc-100">Generate Activity</div>
            <div className="text-[10px] text-zinc-500">Simulate buy + sell cycles on PumpSwap tokens ≥ $300k mcap</div>
          </div>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* ── Config panel ──────────────────────────────────────────────────── */}
          {phase === "idle" && (
            <>
              {/* Wallet selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-zinc-300">Wallets</span>
                  <button
                    onClick={toggleAll}
                    className="text-[10px] font-medium px-2 py-0.5 rounded transition-colors"
                    style={{
                      color: allSelected ? "#f87171" : "#7aa3ff",
                      background: allSelected ? "rgba(248,113,113,0.08)" : "rgba(79,131,255,0.08)",
                      border: allSelected ? "1px solid rgba(248,113,113,0.2)" : "1px solid rgba(79,131,255,0.2)",
                    }}
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </button>
                </div>

                <div
                  className="rounded"
                  style={{
                    background: "rgba(13,17,24,0.8)",
                    border: "1px solid rgba(28,38,56,0.8)",
                    maxHeight: 165,
                    overflowY: wallets.length > 5 ? "scroll" : "hidden",
                  }}
                >
                  {wallets.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">No wallets available</div>
                  ) : (
                    wallets.map((w, i) => (
                      <button
                        key={w.id}
                        onClick={() => toggleWallet(w.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-white/[0.02]"
                        style={{
                          borderBottom: i < wallets.length - 1 ? "1px solid rgba(28,38,56,0.5)" : "none",
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                          style={{
                            border: selectedIds.has(w.id)
                              ? "1.5px solid #4f83ff"
                              : "1.5px solid rgba(63,63,70,0.6)",
                            background: selectedIds.has(w.id) ? "rgba(79,131,255,0.15)" : "transparent",
                          }}
                        >
                          {selectedIds.has(w.id) && (
                            <div className="w-1.5 h-1.5 rounded-sm" style={{ background: "#4f83ff" }} />
                          )}
                        </div>
                        <span className="text-xs text-zinc-300 font-mono flex-1">{truncateAddress(w.address)}</span>
                        <span className="text-[10px] text-zinc-500">{w.solBalance.toFixed(3)} SOL</span>
                      </button>
                    ))
                  )}
                </div>
                {selectedIds.size > 0 && (
                  <div className="text-[10px] text-zinc-500 mt-1">{selectedIds.size} wallet(s) selected</div>
                )}
              </div>

              {/* SOL amount + Loop count */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">SOL per Buy</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0.001"
                      step="0.01"
                      value={solAmount}
                      onChange={(e) => setSolAmount(e.target.value)}
                      className="w-full text-xs px-3 py-2 pr-10 rounded outline-none"
                      style={{
                        background: "rgba(13,17,24,0.8)",
                        border: "1px solid rgba(28,38,56,0.9)",
                        color: "#e4e4e7",
                      }}
                      placeholder="0.1"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-500">SOL</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">Loop Count</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    step="1"
                    value={loops}
                    onChange={(e) => setLoops(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded outline-none"
                    style={{
                      background: "rgba(13,17,24,0.8)",
                      border: "1px solid rgba(28,38,56,0.9)",
                      color: "#e4e4e7",
                    }}
                    placeholder="3"
                  />
                </div>
              </div>

              {/* Info callout */}
              <div
                className="text-[10px] text-zinc-500 px-3 py-2.5 rounded flex items-start gap-2"
                style={{
                  background: "rgba(79,131,255,0.04)",
                  border: "1px solid rgba(79,131,255,0.1)",
                }}
              >
                <Info className="h-3 w-3 text-[#4f83ff] shrink-0 mt-0.5" />
                <span>
                  Each loop assigns each wallet a{" "}
                  <strong className="text-zinc-400">different random PumpSwap token</strong> with ≥ $300k market cap,
                  buys in parallel via Jupiter, holds 2–5 seconds, then sells 100% of each position.
                </span>
              </div>

              {/* Start */}
              <button
                onClick={handleStart}
                disabled={!canStart}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded text-sm font-semibold transition-all"
                style={
                  canStart
                    ? {
                        background: "rgba(79,131,255,0.15)",
                        border: "1px solid rgba(79,131,255,0.4)",
                        color: "#7aa3ff",
                        boxShadow: "0 0 20px rgba(79,131,255,0.1)",
                      }
                    : {
                        background: "rgba(28,38,56,0.4)",
                        border: "1px solid rgba(28,38,56,0.6)",
                        color: "#52525b",
                        cursor: "not-allowed",
                      }
                }
              >
                <Activity className="h-4 w-4" />
                Start Activity
              </button>
            </>
          )}

          {/* ── Running / Done panel ───────────────────────────────────────────── */}
          {(phase === "running" || phase === "done") && (
            <>
              {/* Progress bar */}
              <div className="flex items-center gap-3">
                {phase === "running" ? (
                  <Loader2 className="h-4 w-4 text-[#4f83ff] animate-spin shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-medium text-zinc-200">
                      {phase === "done" ? "Complete" : `Loop ${progress.loop} / ${progress.total}`}
                    </span>
                    {phase === "running" && (
                      <span className="text-[10px] text-zinc-500">
                        {progress.total > 0 ? Math.round((progress.loop / progress.total) * 100) : 0}%
                      </span>
                    )}
                  </div>
                  <div
                    className="h-1 rounded-full overflow-hidden"
                    style={{ background: "rgba(28,38,56,0.8)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width:
                          phase === "done"
                            ? "100%"
                            : progress.total > 0
                            ? `${(progress.loop / progress.total) * 100}%`
                            : "0%",
                        background:
                          phase === "done"
                            ? "linear-gradient(90deg, #22c55e, #16a34a)"
                            : "linear-gradient(90deg, #4f83ff, #7b5ea7)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Log panel */}
              <div
                className="rounded overflow-y-auto flex flex-col gap-0.5 p-3 font-mono text-[11px]"
                style={{
                  background: "rgba(8,11,18,0.9)",
                  border: "1px solid rgba(28,38,56,0.8)",
                  maxHeight: 260,
                }}
              >
                {logs.length === 0 && (
                  <span className="text-zinc-600">Waiting for activity...</span>
                )}
                {logs.map((entry, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span className="shrink-0 mt-0.5">{LOG_ICONS[entry.level]}</span>
                    <span style={{ color: LOG_COLORS[entry.level], wordBreak: "break-all" }}>
                      {entry.message}
                    </span>
                    {entry.txSig && (
                      <a
                        href={`https://solscan.io/tx/${entry.txSig}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto shrink-0 flex items-center gap-0.5 text-[10px] text-[#4f83ff] hover:underline"
                      >
                        tx <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                {phase === "running" && (
                  <button
                    onClick={handleStop}
                    className="flex-1 py-2 rounded text-xs font-semibold transition-all"
                    style={{
                      background: "rgba(248,113,113,0.08)",
                      border: "1px solid rgba(248,113,113,0.3)",
                      color: "#f87171",
                    }}
                  >
                    Stop
                  </button>
                )}
                {phase === "done" && (
                  <>
                    <button
                      onClick={() => {
                        setPhase("idle");
                        setLogs([]);
                        setProgress({ loop: 0, total: 0 });
                      }}
                      className="flex-1 py-2 rounded text-xs font-semibold"
                      style={{
                        background: "rgba(79,131,255,0.1)",
                        border: "1px solid rgba(79,131,255,0.3)",
                        color: "#7aa3ff",
                      }}
                    >
                      Run Again
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 rounded text-xs font-semibold"
                      style={{
                        background: "rgba(28,38,56,0.4)",
                        border: "1px solid rgba(28,38,56,0.6)",
                        color: "#a1a1aa",
                      }}
                    >
                      Close
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
