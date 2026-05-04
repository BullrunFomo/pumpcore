"use client";
import { useState } from "react";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useStore } from "@/store";
import {
  CheckCircle2,
  Copy,
  Download,
  Minus,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface GenerateWalletsModalProps {
  open: boolean;
  onClose: () => void;
}

interface GeneratedWallet {
  id: string;
  address: string;
  privateKey: string;
  solBalance: number;
  tokenBalance: number;
  avgBuyPrice: number;
  totalSolSpent: number;
  status: "idle";
  color: string;
  importedAt: string;
}

export default function GenerateWalletsModal({
  open,
  onClose,
}: GenerateWalletsModalProps) {
  const addWallets = useStore((s) => s.addWallets);

  const [count, setCount] = useState(5);
  const [step, setStep] = useState<"config" | "backup" | "done">("config");
  const [generated, setGenerated] = useState<GeneratedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const clampCount = (v: number) => Math.min(50, Math.max(1, v));

  const handleGenerate = () => {
    setLoading(true);
    const now = new Date().toISOString();
    // Keypair.generate() uses crypto.getRandomValues() — CSPRNG
    const wallets: GeneratedWallet[] = Array.from({ length: count }, (_, i) => {
      const kp = Keypair.generate();
      return {
        id: `wallet-${Date.now()}-${i}`,
        address: kp.publicKey.toBase58(),
        privateKey: bs58.encode(kp.secretKey),
        solBalance: 0,
        tokenBalance: 0,
        avgBuyPrice: 0,
        totalSolSpent: 0,
        status: "idle" as const,
        color: "#6366f1",
        importedAt: now,
      };
    });
    setGenerated(wallets);
    setLoading(false);
    setStep("backup");
  };

  const handleConfirm = async () => {
    // Fetch balances (all zero for fresh wallets, but keeps the pattern consistent)
    try {
      const addresses = generated.map((w) => w.address).join(",");
      const res = await fetch(`/api/wallets?addresses=${addresses}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.wallets)) {
          data.wallets.forEach((w: { address: string; solBalance: number }) => {
            const local = generated.find((g) => g.address === w.address);
            if (local) local.solBalance = w.solBalance ?? 0;
          });
        }
      }
    } catch {}

    addWallets(generated);
    setStep("done");
    setTimeout(() => {
      handleClose();
    }, 1200);
  };

  const handleClose = () => {
    setStep("config");
    setGenerated([]);
    setCount(5);
    setCopiedIndex(null);
    setCopiedAll(false);
    onClose();
  };

  const copyKey = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const copyAll = () => {
    const text = generated
      .map((w, i) => `Wallet ${i + 1}\nAddress: ${w.address}\nPrivate Key: ${w.privateKey}`)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const downloadKeys = () => {
    const text = generated
      .map((w, i) => `Wallet ${i + 1}\nAddress: ${w.address}\nPrivate Key: ${w.privateKey}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bundlex-wallets-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: "rgba(9,9,11,0.97)",
          border: "1px solid rgba(79,131,255,0.3)",
          boxShadow:
            "0 0 0 1px rgba(79,131,255,0.1), 0 0 40px rgba(79,131,255,0.12), 0 24px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Top glow line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(79,131,255,0.6) 50%, transparent 100%)",
          }}
        />

        {/* ── Step 1: Config ── */}
        {step === "config" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-zinc-100 text-base font-bold tracking-tight flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: "#4f83ff" }} />
                Generate Wallets
              </DialogTitle>
              <p className="text-sm text-zinc-500 mt-0.5">
                Fresh keypairs generated locally in your browser. Private keys never leave your device.
              </p>
            </DialogHeader>

            {/* Security badge */}
            <div
              className="flex items-center gap-2.5 rounded-lg px-4 py-3"
              style={{
                background: "rgba(79,131,255,0.05)",
                border: "1px solid rgba(79,131,255,0.2)",
              }}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" style={{ color: "#4f83ff" }} />
              <p className="text-xs text-zinc-400 leading-relaxed">
                Keys are generated with <span className="text-zinc-200 font-medium">crypto.getRandomValues()</span>{" "}and stored only in your browser&apos;s local storage.
              </p>
            </div>

            {/* Count picker */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                  Number of wallets
                </label>
                <span className="text-[10px] text-zinc-600 font-mono">max 50</span>
              </div>

              {/* Big counter row */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCount((v) => clampCount(v - 1))}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 text-zinc-400 hover:text-zinc-100"
                  style={{
                    border: "1px solid rgba(79,131,255,0.25)",
                    background: "rgba(79,131,255,0.05)",
                    boxShadow: "0 0 8px rgba(79,131,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(79,131,255,0.25)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,131,255,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,131,255,0.25)";
                  }}
                >
                  <Minus className="h-4 w-4" />
                </button>

                {/* Value display */}
                <div
                  className="flex-1 flex items-center justify-center rounded-lg py-2"
                  style={{
                    background: "rgba(79,131,255,0.04)",
                    border: "1px solid rgba(79,131,255,0.2)",
                    boxShadow: "0 0 20px rgba(79,131,255,0.06), inset 0 0 20px rgba(79,131,255,0.03)",
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={count}
                    onChange={(e) => setCount(clampCount(Number(e.target.value)))}
                    className="w-20 text-center text-3xl font-bold bg-transparent border-0 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={{
                      color: "#93b4ff",
                      textShadow: "0 0 20px rgba(79,131,255,0.6)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  />
                </div>

                <button
                  onClick={() => setCount((v) => clampCount(v + 1))}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-150 text-zinc-400 hover:text-zinc-100"
                  style={{
                    border: "1px solid rgba(79,131,255,0.25)",
                    background: "rgba(79,131,255,0.05)",
                    boxShadow: "0 0 8px rgba(79,131,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.12)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(79,131,255,0.25)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,131,255,0.5)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.05)";
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 8px rgba(79,131,255,0.08)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(79,131,255,0.25)";
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              {/* Quick-select presets */}
              <div className="flex gap-2">
                {[5, 10, 20, 50].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className="flex-1 py-1 rounded text-[11px] font-semibold transition-all duration-150"
                    style={{
                      background: count === n ? "rgba(79,131,255,0.15)" : "rgba(0,0,0,0.3)",
                      border: `1px solid ${count === n ? "rgba(79,131,255,0.5)" : "rgba(63,63,70,0.4)"}`,
                      color: count === n ? "#93b4ff" : "#52525b",
                      boxShadow: count === n ? "0 0 10px rgba(79,131,255,0.2)" : "none",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(63,63,70,0.6)",
                  color: "#71717a",
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={loading}
                style={{
                  background: "rgba(79,131,255,0.15)",
                  border: "1px solid rgba(79,131,255,0.5)",
                  color: "#93b4ff",
                  boxShadow: "0 0 16px rgba(79,131,255,0.2)",
                }}
              >
                <Zap className="h-3.5 w-3.5 mr-1.5" />
                Generate
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 2: Backup ── */}
        {step === "backup" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-zinc-100 text-base font-bold tracking-tight">
                Back Up Your Private Keys
              </DialogTitle>
              <p className="text-sm text-zinc-500 mt-0.5">
                Save these now — they cannot be recovered later.
              </p>
            </DialogHeader>

            {/* Warning */}
            <div
              className="flex items-start gap-2.5 rounded-lg px-4 py-3"
              style={{
                background: "rgba(234,179,8,0.06)",
                border: "1px solid rgba(234,179,8,0.25)",
              }}
            >
              <ShieldCheck className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
              <p className="text-xs text-zinc-400 leading-relaxed">
                These private keys are shown <span className="text-yellow-400 font-medium">once</span>. Download or copy them before continuing. Anyone with a private key controls that wallet.
              </p>
            </div>

            {/* Wallet list */}
            <div
              className="max-h-56 overflow-y-auto space-y-1.5 rounded-lg p-1 no-scrollbar"
              style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(63,63,70,0.3)" }}
            >
              {generated.map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-md"
                  style={{ background: "rgba(20,28,40,0.6)" }}
                >
                  <span
                    className="text-[10px] font-bold shrink-0 w-5 h-5 rounded flex items-center justify-center"
                    style={{ background: "rgba(79,131,255,0.15)", color: "#93b4ff" }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-mono truncate">{w.address}</p>
                    <p className="text-[10px] text-zinc-700 font-mono truncate">{w.privateKey.slice(0, 20)}…</p>
                  </div>
                  <button
                    onClick={() => copyKey(w.privateKey, i)}
                    className="shrink-0 text-zinc-600 hover:text-zinc-200 transition-colors"
                  >
                    {copiedIndex === i
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                      : <Copy className="h-3.5 w-3.5" />
                    }
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all flex-1 justify-center"
                style={{
                  border: "1px solid rgba(63,63,70,0.5)",
                  color: copiedAll ? "#4ade80" : "#a1a1aa",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                {copiedAll ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedAll ? "Copied!" : "Copy All"}
              </button>
              <button
                onClick={downloadKeys}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs transition-all flex-1 justify-center"
                style={{
                  border: "1px solid rgba(63,63,70,0.5)",
                  color: "#a1a1aa",
                  background: "rgba(0,0,0,0.2)",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Download .txt
              </button>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("config")}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(63,63,70,0.6)",
                  color: "#71717a",
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleConfirm}
                style={{
                  background: "rgba(79,131,255,0.15)",
                  border: "1px solid rgba(79,131,255,0.5)",
                  color: "#93b4ff",
                  boxShadow: "0 0 16px rgba(79,131,255,0.2)",
                }}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                I&apos;ve saved my keys. Add Wallets
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.3)" }}
            >
              <CheckCircle2 className="h-6 w-6" style={{ color: "#93b4ff" }} />
            </div>
            <p className="text-sm font-semibold text-zinc-200">
              {generated.length} wallet{generated.length !== 1 ? "s" : ""} added
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
