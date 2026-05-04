"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { useStore } from "@/store";
import { Coins, Copy, Check, AlertCircle, CheckCircle2, Loader2, RefreshCw, Circle, Eye, RotateCcw } from "lucide-react";
import { formatSol, truncateAddress } from "@/lib/utils";

interface FundModalProps {
  open: boolean;
  onClose: () => void;
}

type Phase = "idle" | "distributing" | "done" | "recovering" | "recovered";

interface FundResult {
  address: string;
  status: "ok" | "error";
  received?: number;
  txSig?: string;
}

const TX_FEE_SOL = 0.00001;

export default function FundModal({ open, onClose }: FundModalProps) {
  const wallets = useStore((s) => s.wallets);
  const refreshBalances = useStore((s) => s.refreshBalances);
  const fundingWallet = useStore((s) => s.fundingWallet);
  const rotateFundingWallet = useStore((s) => s.rotateFundingWallet);
  const storedBalance = useStore((s) => s.fundingBalance);
  const setFundingBalance = useStore((s) => s.setFundingBalance);
  const setFundingDate = useStore((s) => s.setFundingDate);

  const [balance, setBalance] = useState(storedBalance);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [results, setResults] = useState<FundResult[]>([]);
  const [error, setError] = useState("");
  const [refundedSol, setRefundedSol] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [recoverAddress, setRecoverAddress] = useState("");
  const [recoverResult, setRecoverResult] = useState<{ txSig: string; recoveredSol: number } | null>(null);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async (address: string) => {
    if (!address) return;
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/fund?address=${address}`);
      const data = await res.json();
      if (res.ok) {
        const bal = data.balanceSol ?? 0;
        setBalance(bal);
        setFundingBalance(bal);
        setError("");
      } else {
        setError(data.error ?? "Failed to fetch balance");
      }
    } catch {
      setError("Network error — could not fetch balance");
    }
    setBalanceLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setBalance(storedBalance);
      setResults([]);
      setError("");
      setPhase("idle");
      setRefundedSol(0);
      setRecoverAddress("");
      setRecoverResult(null);
      setShowPrivateKey(false);
      setSelectedIds(new Set(wallets.map((w) => w.id)));
      pollRef.current = setInterval(() => fetchBalance(fundingWallet.address), 5_000);
      fetchBalance(fundingWallet.address);
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, fetchBalance]);

  // Re-poll when funding wallet rotates
  useEffect(() => {
    if (!open) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setBalance(storedBalance);
    fetchBalance(fundingWallet.address);
    pollRef.current = setInterval(() => fetchBalance(fundingWallet.address), 5_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fundingWallet.address]);

  const selectedCount = selectedIds.size;
  const estimatedPerWallet = selectedCount > 0 && balance > 0
    ? Math.max(0, (balance - selectedCount * TX_FEE_SOL) / selectedCount)
    : 0;

  const canDistribute = balance > 0 && selectedCount > 0 && phase === "idle";

  const toggleWallet = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCount === wallets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(wallets.map((w) => w.id)));
  };

  const handleDistribute = async () => {
    if (!canDistribute) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("distributing");
    setError("");
    try {
      const selected = wallets.filter((w) => selectedIds.has(w.id));
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundingWalletPrivateKey: fundingWallet.privateKey,
          targetWallets: selected.map((w) => w.address),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Distribution failed");
      setResults(data.results);
      setRefundedSol(data.refundedSol ?? 0);
      setFundingDate(new Date().toISOString());
      setFundingBalance(0);
      setBalance(0);
      setPhase("done");
      await refreshBalances();
    } catch (err: any) {
      setError(err.message);
      setPhase("idle");
      pollRef.current = setInterval(() => fetchBalance(fundingWallet.address), 5_000);
    }
  };

  const handleRecover = async () => {
    if (!recoverAddress.trim()) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setPhase("recovering");
    setError("");
    try {
      const res = await fetch("/api/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fundingWalletPrivateKey: fundingWallet.privateKey,
          targetWallets: [],
          recoverTo: recoverAddress.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recovery failed");
      setRecoverResult({ txSig: data.txSig, recoveredSol: data.recoveredSol });
      setPhase("recovered");
    } catch (err: any) {
      setError(err.message);
      setPhase("idle");
      pollRef.current = setInterval(() => fetchBalance(fundingWallet.address), 5_000);
    }
  };

  const handleRotate = () => {
    if (balance > 0) return;
    setShowRotateConfirm(true);
  };

  const confirmRotate = () => {
    rotateFundingWallet();
    setPhase("idle");
    setResults([]);
    setError("");
    setShowRotateConfirm(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(fundingWallet.address);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(fundingWallet.privateKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleClose = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  };

  const succeeded = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status !== "ok").length;
  const totalReceived = results.reduce((s, r) => s + (r.received ?? 0), 0);

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
        <VisuallyHidden><DialogTitle>Fund Wallets</DialogTitle></VisuallyHidden>

        {/* Header */}
        <div
          className="relative px-6 pt-4 pb-4"
          style={{ borderBottom: "1px solid rgba(79,131,255,0.1)", background: "rgba(79,131,255,0.03)" }}
        >
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
              <Coins className="h-4 w-4" style={{ color: "#93b4ff" }} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Fund Wallets</h2>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} · direct SOL distribution
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3">
          {phase === "idle" && (
            <>
              {/* Funding wallet card */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      Funding Wallet
                    </label>
                    <button
                      onClick={() => setShowPrivateKey(true)}
                      className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      <Eye className="h-2.5 w-2.5" />
                      show PK
                    </button>
                  </div>
                  <button
                    onClick={handleRotate}
                    disabled={balance > 0}
                    className="flex items-center gap-1 text-[10px] transition-colors"
                    style={{ color: balance > 0 ? "#3f3f46" : "#52525b", cursor: balance > 0 ? "not-allowed" : "pointer" }}
                    title={balance > 0 ? "Drain balance before rotating" : "Generate new funding wallet"}
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Rotate
                  </button>
                </div>

                <div
                  className="rounded-lg p-3"
                  style={{ background: "rgba(79,131,255,0.04)", border: "1px solid rgba(79,131,255,0.15)" }}
                >
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span className="font-mono text-xs text-zinc-300 flex-1 break-all leading-relaxed">
                      {fundingWallet.address}
                    </span>
                    <button
                      onClick={copyAddress}
                      className="shrink-0 p-1.5 rounded transition-all"
                      style={{
                        background: copiedAddress ? "rgba(74,222,128,0.1)" : "rgba(79,131,255,0.1)",
                        border: `1px solid ${copiedAddress ? "rgba(74,222,128,0.3)" : "rgba(79,131,255,0.2)"}`,
                      }}
                    >
                      {copiedAddress ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" style={{ color: "#93b4ff" }} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balance */}
              <div
                className="rounded-lg px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-0.5">Balance</p>
                  <p className="text-lg font-bold tabular-nums" style={{ color: balance > 0 ? "#93b4ff" : "#52525b" }}>
                    {formatSol(balance, 4)} SOL
                  </p>
                </div>
                <button
                  onClick={() => fetchBalance(fundingWallet.address)}
                  disabled={balanceLoading}
                  className="p-2 rounded-lg transition-all"
                  style={{ background: "rgba(79,131,255,0.08)", border: "1px solid rgba(79,131,255,0.15)" }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${balanceLoading ? "animate-spin" : ""}`} style={{ color: "#4f83ff" }} />
                </button>
              </div>

              {/* Wallet selection */}
              {wallets.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                      Wallets to Fund
                    </label>
                    <div className="flex items-center gap-2">
                      {balance > 0 && selectedCount > 0 && (
                        <span className="text-[10px] text-zinc-600">
                          ~{formatSol(estimatedPerWallet, 4)} SOL each
                        </span>
                      )}
                      <button
                        onClick={toggleAll}
                        className="text-[10px] font-medium transition-colors"
                        style={{ color: selectedCount === wallets.length ? "#71717a" : "#93b4ff" }}
                      >
                        {selectedCount === wallets.length ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                  </div>
                  <div className="max-h-36 overflow-y-auto no-scrollbar space-y-1">
                    {wallets.map((w) => {
                      const isSelected = selectedIds.has(w.id);
                      return (
                        <button
                          key={w.id}
                          onClick={() => toggleWallet(w.id)}
                          className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all text-left"
                          style={{
                            background: isSelected ? "rgba(79,131,255,0.07)" : "rgba(0,0,0,0.2)",
                            border: `1px solid ${isSelected ? "rgba(79,131,255,0.15)" : "transparent"}`,
                          }}
                        >
                          <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: isSelected ? w.color : "#3f3f46" }} />
                          <span className="font-mono text-[11px] flex-1" style={{ color: isSelected ? "#a1a1aa" : "#52525b" }}>
                            {truncateAddress(w.address, 4)}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isSelected && balance > 0 && (
                              <span className="text-[11px] tabular-nums" style={{ color: "#93b4ff" }}>
                                +{formatSol(estimatedPerWallet, 4)}
                              </span>
                            )}
                            {isSelected
                              ? <Check className="h-3 w-3" style={{ color: "#4f83ff" }} />
                              : <Circle className="h-3 w-3" style={{ color: "#3f3f46" }} />
                            }
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {wallets.length === 0 && (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-zinc-500"
                  style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.04)" }}
                >
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  No wallets to fund. Generate or import wallets first.
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
          )}

          {phase === "distributing" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div
                className="relative flex items-center justify-center w-14 h-14 rounded-full"
                style={{ border: "1px solid rgba(79,131,255,0.2)", background: "rgba(79,131,255,0.06)" }}
              >
                <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#4f83ff" }} />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm font-semibold text-zinc-200">Distributing SOL…</p>
                <p className="text-[11px] text-zinc-600">
                  Sending directly to {selectedCount} wallet{selectedCount !== 1 ? "s" : ""}. This may take a few seconds.
                </p>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="space-y-4">
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
                    <p className="text-xl font-bold text-zinc-100 tabular-nums">{formatSol(totalReceived, 4)} SOL</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      distributed to {succeeded} wallet{succeeded !== 1 ? "s" : ""}
                      {failed > 0 ? `, ${failed} failed` : ""}
                    </p>
                    {refundedSol > 0 && (
                      <p className="text-xs mt-1" style={{ color: "#93b4ff" }}>
                        +{formatSol(refundedSol, 4)} SOL refunded
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-7 w-7 text-red-400 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-red-400">Distribution failed</p>
                  </>
                )}
              </div>

              <div className="space-y-1 max-h-48 overflow-y-auto no-scrollbar">
                {results.map((r) => (
                  <div
                    key={r.address}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs gap-3"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <span className="font-mono text-zinc-500 shrink-0">{truncateAddress(r.address, 4)}</span>
                    {r.status === "ok" ? (
                      <span className="text-green-400 tabular-nums font-medium">+{formatSol(r.received ?? 0, 4)} SOL</span>
                    ) : (
                      <span className="text-red-400">failed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-3"
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
            {phase === "done" || phase === "recovered" ? "Close" : "Cancel"}
          </button>
          {phase === "idle" && (
            <button
              onClick={handleDistribute}
              disabled={!canDistribute}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={{
                background: canDistribute
                  ? "linear-gradient(135deg, rgba(79,131,255,0.25), rgba(139,92,246,0.2))"
                  : "rgba(79,131,255,0.05)",
                border: `1px solid ${canDistribute ? "rgba(79,131,255,0.5)" : "rgba(79,131,255,0.1)"}`,
                color: canDistribute ? "#93b4ff" : "#3f3f56",
                boxShadow: canDistribute ? "0 0 20px rgba(79,131,255,0.15)" : "none",
                cursor: canDistribute ? "pointer" : "not-allowed",
              }}
            >
              Distribute{selectedCount > 0 && selectedCount < wallets.length ? ` (${selectedCount})` : ""}
            </button>
          )}
        </div>
        {/* Rotate confirm popup */}
        {showRotateConfirm && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowRotateConfirm(false)}
          >
            <div
              className="mx-6 w-full rounded-xl p-5 space-y-4"
              style={{
                background: "rgba(13,13,18,0.98)",
                border: "1px solid rgba(248,113,113,0.3)",
                boxShadow: "0 0 40px rgba(248,113,113,0.06)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-zinc-200">Rotate funding wallet?</p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#71717a" }}>
                    If you haven't saved the private key for the current wallet, any SOL sent to it will be permanently inaccessible. Make sure you've backed it up before continuing.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRotateConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    color: "#71717a",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRotate}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: "rgba(248,113,113,0.12)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    color: "#f87171",
                  }}
                >
                  Rotate anyway
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Private key popup */}
        {showPrivateKey && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setShowPrivateKey(false)}
          >
            <div
              className="mx-6 w-full rounded-xl p-5 space-y-4"
              style={{
                background: "rgba(13,13,18,0.98)",
                border: "1px solid rgba(79,131,255,0.3)",
                boxShadow: "0 0 40px rgba(79,131,255,0.08)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-300">Private Key</p>
                <button onClick={() => setShowPrivateKey(false)} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">close</button>
              </div>
              <div
                className="rounded-lg px-3 py-3 font-mono text-xs break-all leading-relaxed"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.06)", color: "#a1a1aa" }}
              >
                {fundingWallet.privateKey}
              </div>
              <button
                onClick={copyKey}
                className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: copiedKey ? "rgba(74,222,128,0.12)" : "rgba(79,131,255,0.1)",
                  border: `1px solid ${copiedKey ? "rgba(74,222,128,0.3)" : "rgba(79,131,255,0.25)"}`,
                  color: copiedKey ? "#4ade80" : "#93b4ff",
                }}
              >
                {copiedKey ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
