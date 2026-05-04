"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useStore } from "@/store";
import { AlertCircle, CheckCircle2, ArrowDownToLine, Wallet, Loader2 } from "lucide-react";
import { formatSol, truncateAddress } from "@/lib/utils";

interface WithdrawModalProps {
  open: boolean;
  onClose: () => void;
}

const FEE_RESERVE = 0.000015;

function SolanaLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 397.7 311.7" xmlns="http://www.w3.org/2000/svg">
      <linearGradient id="wm-sol-a" x1="90.1" y1="317.4" x2="326.5" y2="-10.9" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/><stop offset=".42" stopColor="#6377d6"/><stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#wm-sol-a)"/>
      <linearGradient id="wm-sol-b" x1="64.1" y1="337.6" x2="300.5" y2="9.3" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/><stop offset=".42" stopColor="#6377d6"/><stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1z" fill="url(#wm-sol-b)"/>
      <linearGradient id="wm-sol-c" x1="77.3" y1="327.5" x2="313.7" y2="-.8" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9945ff"/><stop offset=".42" stopColor="#6377d6"/><stop offset="1" stopColor="#00d18c"/>
      </linearGradient>
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1z" fill="url(#wm-sol-c)"/>
    </svg>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 focus:outline-none"
      style={{
        background: on
          ? "linear-gradient(90deg, rgba(79,131,255,0.7), rgba(139,92,246,0.7))"
          : "rgba(60,60,70,0.8)",
        border: `1px solid ${on ? "rgba(79,131,255,0.6)" : "rgba(100,100,115,0.6)"}`,
        boxShadow: on ? "0 0 10px rgba(79,131,255,0.25)" : "none",
      }}
    >
      <span
        className="absolute rounded-full transition-all duration-300"
        style={{
          width: 18,
          height: 18,
          top: "50%",
          transform: "translateY(-50%)",
          left: on ? "calc(100% - 21px)" : "3px",
          background: on ? "#fff" : "#a1a1aa",
        }}
      />
    </button>
  );
}

export default function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const wallets = useStore((s) => s.wallets);
  const refreshBalances = useStore((s) => s.refreshBalances);

  const [destination, setDestination] = useState("");
  const [amount, setAmount] = useState("");
  const [isMax, setIsMax] = useState(false);
  const [leaveDust, setLeaveDust] = useState(false);
  const [dustAmount, setDustAmount] = useState("0.01");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ address: string; status: string; txSig?: string; sent?: number; error?: string }[]>([]);
  const [error, setError] = useState("");

  const dust = leaveDust ? (parseFloat(dustAmount) || 0) : 0;
  const totalSendable = wallets.reduce((s, w) => s + Math.max(0, w.solBalance - FEE_RESERVE - dust), 0);
  const totalBalance = wallets.reduce((s, w) => s + w.solBalance, 0);

  const handleMax = () => {
    setIsMax(true);
    setAmount(totalSendable > 0 ? totalSendable.toFixed(4) : "0");
  };

  const handleAmountChange = (v: string) => {
    setIsMax(false);
    setAmount(v);
  };

  const handleDustChange = (v: string) => {
    setDustAmount(v);
    if (isMax) {
      const d = parseFloat(v) || 0;
      const recalc = wallets.reduce((s, w) => s + Math.max(0, w.solBalance - FEE_RESERVE - d), 0);
      setAmount(recalc > 0 ? recalc.toFixed(4) : "0");
    }
  };

  const handleToggleDust = () => {
    const next = !leaveDust;
    setLeaveDust(next);
    if (isMax) {
      const d = next ? (parseFloat(dustAmount) || 0) : 0;
      const recalc = wallets.reduce((s, w) => s + Math.max(0, w.solBalance - FEE_RESERVE - d), 0);
      setAmount(recalc > 0 ? recalc.toFixed(4) : "0");
    }
  };

  const handleWithdraw = async () => {
    if (!destination.trim()) { setError("Enter a destination address"); return; }
    const parsedAmount = parseFloat(amount);
    if (!isMax && (isNaN(parsedAmount) || parsedAmount <= 0)) { setError("Enter a valid amount"); return; }

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const res = await fetch("/api/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallets: wallets.map((w) => ({ address: w.address, privateKey: w.privateKey, solBalance: w.solBalance })),
          destination: destination.trim(),
          amountSol: isMax ? "all" : parsedAmount,
          leaveDustSol: leaveDust ? (parseFloat(dustAmount) || 0) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Withdraw failed");
      if (!data.results) throw new Error("No results returned from server");
      setResults(data.results);
      await refreshBalances();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setDestination("");
    setAmount("");
    setIsMax(false);
    setLeaveDust(false);
    setDustAmount("0.01");
    setError("");
    setResults([]);
    onClose();
  };

  const succeeded = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error").length;
  const totalSent = results.filter((r) => r.status === "ok").reduce((s, r) => s + (r.sent ?? 0), 0);
  const done = results.length > 0;

  const canSubmit = !loading && destination.trim() && (isMax || (amount && parseFloat(amount) > 0));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-md p-0 overflow-hidden"
        style={{
          background: "rgba(9,9,11,0.97)",
          border: "1px solid rgba(79,131,255,0.3)",
          boxShadow: "0 0 0 1px rgba(79,131,255,0.1), 0 0 40px rgba(79,131,255,0.12), 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        <VisuallyHidden><DialogTitle>Withdraw SOL</DialogTitle></VisuallyHidden>
        {/* Header band */}
        <div
          className="relative px-6 pt-4 pb-3"
          style={{ borderBottom: "1px solid rgba(79,131,255,0.1)", background: "rgba(79,131,255,0.03)" }}
        >
          {/* Top glow line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(79,131,255,0.6) 40%, rgba(139,92,246,0.4) 60%, transparent)" }} />

          <div className="flex items-center gap-3">
            <div
              className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(79,131,255,0.2), rgba(139,92,246,0.15))",
                border: "1px solid rgba(79,131,255,0.3)",
                boxShadow: "0 0 16px rgba(79,131,255,0.15)",
              }}
            >
              <ArrowDownToLine className="h-4 w-4" style={{ color: "#93b4ff" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Withdraw SOL</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""} · {formatSol(totalBalance, 4)} SOL total</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-3 space-y-5">
          {!done ? (
            <>
              {/* Destination */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">To Address</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Wallet className="h-3.5 w-3.5 text-zinc-600" />
                  </div>
                  <input
                    placeholder="Destination wallet address…"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 rounded-lg font-mono text-xs outline-none transition-all"
                    style={{
                      background: "rgba(0,0,0,0.5)",
                      border: destination ? "1px solid rgba(79,131,255,0.35)" : "1px solid rgba(255,255,255,0.06)",
                      color: "#c4c4cc",
                      caretColor: "#4f83ff",
                    }}
                    onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(79,131,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,131,255,0.08)"; }}
                    onBlur={(e) => { e.currentTarget.style.border = destination ? "1px solid rgba(79,131,255,0.35)" : "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Amount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <SolanaLogo className="h-3 w-3" />
                    </div>
                    <input
                      placeholder="0.0000"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      className="w-full pl-7 pr-14 py-2.5 rounded-lg text-sm tabular-nums font-medium outline-none transition-all"
                      style={{
                        background: "rgba(0,0,0,0.5)",
                        border: isMax ? "1px solid rgba(79,131,255,0.5)" : "1px solid rgba(255,255,255,0.06)",
                        color: "#e4e4e7",
                        boxShadow: isMax ? "0 0 0 3px rgba(79,131,255,0.08)" : "none",
                        caretColor: "#4f83ff",
                      }}
                      onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(79,131,255,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79,131,255,0.08)"; }}
                      onBlur={(e) => { e.currentTarget.style.border = isMax ? "1px solid rgba(79,131,255,0.5)" : "1px solid rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = isMax ? "0 0 0 3px rgba(79,131,255,0.08)" : "none"; }}
                    />
                    {isMax && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(79,131,255,0.15)", color: "#4f83ff", border: "1px solid rgba(79,131,255,0.3)" }}>
                        MAX
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleMax}
                    className="px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-200"
                    style={{
                      background: isMax ? "linear-gradient(135deg, rgba(79,131,255,0.25), rgba(139,92,246,0.2))" : "rgba(79,131,255,0.08)",
                      border: `1px solid ${isMax ? "rgba(79,131,255,0.5)" : "rgba(79,131,255,0.2)"}`,
                      color: isMax ? "#93b4ff" : "#4f83ff",
                      boxShadow: isMax ? "0 0 12px rgba(79,131,255,0.2)" : "none",
                    }}
                  >
                    Max
                  </button>
                </div>
              </div>

              {/* Leave Dust */}
              <div
                className="rounded-xl p-4 space-y-3 transition-all duration-200"
                style={{
                  background: leaveDust ? "rgba(79,131,255,0.05)" : "rgba(0,0,0,0.25)",
                  border: `1px solid ${leaveDust ? "rgba(79,131,255,0.2)" : "rgba(255,255,255,0.05)"}`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-300">Leave Dust</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Keep a small balance in each wallet</p>
                  </div>
                  <Toggle on={leaveDust} onToggle={handleToggleDust} />
                </div>

                {leaveDust && (
                  <div
                    className="flex items-center gap-3 pt-3 mt-1"
                    style={{ borderTop: "1px solid rgba(79,131,255,0.15)" }}
                  >
                    <div className="relative flex-1">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <SolanaLogo className="h-3 w-3" />
                      </div>
                      <input
                        placeholder="0.01"
                        value={dustAmount}
                        onChange={(e) => handleDustChange(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 rounded-lg text-xs tabular-nums outline-none transition-all"
                        style={{
                          background: "rgba(0,0,0,0.4)",
                          border: "1px solid rgba(79,131,255,0.25)",
                          color: "#a1a1aa",
                          caretColor: "#4f83ff",
                        }}
                        onFocus={(e) => { e.currentTarget.style.border = "1px solid rgba(79,131,255,0.5)"; }}
                        onBlur={(e) => { e.currentTarget.style.border = "1px solid rgba(79,131,255,0.25)"; }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 shrink-0">SOL per wallet</span>
                  </div>
                )}
              </div>

              {/* Wallet rows */}
              {wallets.length > 0 && (
                <div className="space-y-1 max-h-28 overflow-y-auto no-scrollbar">
                  {wallets.map((w) => {
                    const sendable = Math.max(0, w.solBalance - FEE_RESERVE - dust);
                    const pct = w.solBalance > 0 ? (sendable / w.solBalance) * 100 : 0;
                    return (
                      <div
                        key={w.id}
                        className="flex items-center gap-3 px-3 py-1.5 rounded-lg"
                        style={{ background: "rgba(0,0,0,0.2)" }}
                      >
                        <span className="font-mono text-[11px] text-zinc-500 shrink-0 w-24">{truncateAddress(w.address, 4)}</span>
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.min(100, pct)}%`,
                              background: "linear-gradient(90deg, rgba(79,131,255,0.7), rgba(139,92,246,0.5))",
                            }}
                          />
                        </div>
                        <div className="text-right tabular-nums shrink-0">
                          <span className="text-[11px] text-zinc-400">{formatSol(sendable, 3)}</span>
                          {leaveDust && dust > 0 && (
                            <span className="text-[10px] text-zinc-700"> / {formatSol(w.solBalance, 3)}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {error && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-red-400"
                  style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)" }}
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {error}
                </div>
              )}
            </>
          ) : (
            /* Results */
            <div className="space-y-4">
              {/* Big summary */}
              <div
                className="rounded-xl p-4 text-center"
                style={{
                  background: succeeded > 0 ? "rgba(74,222,128,0.05)" : "rgba(248,113,113,0.05)",
                  border: `1px solid ${succeeded > 0 ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                }}
              >
                {succeeded > 0 ? (
                  <>
                    <CheckCircle2 className="h-7 w-7 text-green-400 mx-auto mb-2" />
                    <p className="text-xl font-bold text-zinc-100 tabular-nums">{formatSol(totalSent, 4)} SOL</p>
                    <p className="text-xs text-zinc-500 mt-1">sent from {succeeded} wallet{succeeded !== 1 ? "s" : ""}{failed > 0 ? `, ${failed} failed` : ""}</p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-7 w-7 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-red-400">All withdrawals failed</p>
                  </>
                )}
              </div>

              {/* Per-wallet rows */}
              <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                {results.map((r) => (
                  <div
                    key={r.address}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs gap-3"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <span className="font-mono text-zinc-500 shrink-0">{truncateAddress(r.address, 4)}</span>
                    {r.status === "ok" && (
                      <span className="text-green-400 tabular-nums font-medium">−{formatSol(r.sent ?? 0, 4)} SOL</span>
                    )}
                    {r.status === "skip" && <span className="text-zinc-700">skipped</span>}
                    {r.status === "error" && (
                      <span className="text-red-400 text-right">{r.error}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(0,0,0,0.2)" }}
        >
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#71717a",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#71717a"; }}
          >
            {done ? "Close" : "Cancel"}
          </button>
          {!done && (
            <button
              onClick={handleWithdraw}
              disabled={!canSubmit}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: canSubmit
                  ? "linear-gradient(135deg, rgba(79,131,255,0.25), rgba(139,92,246,0.2))"
                  : "rgba(79,131,255,0.05)",
                border: `1px solid ${canSubmit ? "rgba(79,131,255,0.5)" : "rgba(79,131,255,0.1)"}`,
                color: canSubmit ? "#93b4ff" : "#3f3f56",
                boxShadow: canSubmit ? "0 0 20px rgba(79,131,255,0.15)" : "none",
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Withdrawing…
                </>
              ) : (
                <>
                  <ArrowDownToLine className="h-3 w-3" />
                  Withdraw
                </>
              )}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
