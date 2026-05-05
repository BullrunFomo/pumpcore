"use client";
import { useState, useRef, useCallback } from "react";
import {
  X, Rocket, Upload, Crown, CheckCircle2, XCircle, AlertTriangle,
  Info, Loader2, ExternalLink,
} from "lucide-react";
import { useStore } from "@/store";
import { useRouter } from "next/navigation";
import type { LaunchLogEntry } from "@/types";

const TOKEN_TYPES = ["Standard", "Mayhem Mode", "Cashback", "Agent"] as const;
type TokenType = typeof TOKEN_TYPES[number];

const LOG_ICONS: Record<LaunchLogEntry["level"], React.ReactNode> = {
  info: <Info className="h-3 w-3 text-[#4f83ff]" />,
  success: <CheckCircle2 className="h-3 w-3 text-green-400" />,
  error: <XCircle className="h-3 w-3 text-red-400" />,
  warn: <AlertTriangle className="h-3 w-3 text-amber-400" />,
};
const LOG_COLORS: Record<LaunchLogEntry["level"], string> = {
  info: "#a1a1aa", success: "#4ade80", error: "#f87171", warn: "#fbbf24",
};

interface Props {
  prefillUrl: string;
  prefillImage?: string | null;
  onClose: () => void;
}

const INPUT: React.CSSProperties = {
  background: "rgba(13,17,24,0.8)",
  border: "1px solid rgba(28,38,56,0.9)",
  color: "#e4e4e7",
  borderRadius: 6,
};



function SegmentedControl<T extends string>({
  options, value, onChange, labels,
}: { options: readonly T[]; value: T; onChange: (v: T) => void; labels?: Record<T, string> }) {
  return (
    <div className="flex gap-1.5">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className="flex-1 py-1.5 rounded text-[10px] font-semibold transition-all"
          style={{
            background: value === o ? "rgba(79,131,255,0.15)" : "rgba(28,38,56,0.4)",
            border: value === o ? "1px solid rgba(79,131,255,0.4)" : "1px solid rgba(28,38,56,0.6)",
            color: value === o ? "#7aa3ff" : "#52525b",
          }}
        >
          {labels ? labels[o] : o}
        </button>
      ))}
    </div>
  );
}

export default function QuickLaunchModal({ prefillUrl, prefillImage, onClose }: Props) {
  const router = useRouter();
  const wallets = useStore((s) => s.wallets);
  const addLaunch = useStore((s) => s.addLaunch);
  const addTrade = useStore((s) => s.addTrade);
  const setActiveTokenMint = useStore((s) => s.setActiveTokenMint);

  // ── Token config ─────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUri, setLogoUri] = useState(prefillImage ?? "");
  const [tokenType, setTokenType] = useState<TokenType>("Standard");
  const [website, setWebsite] = useState(prefillUrl);
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");

  // ── Bundle config ─────────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [devWalletId, setDevWalletId] = useState("");
  const [walletAmounts, setWalletAmounts] = useState<Record<string, number>>({});
  const [jitoTip, setJitoTip] = useState(0.005);
  const [launchType, setLaunchType] = useState<"classic" | "stagger">("classic");
  const [staggerDelayMs, setStaggerDelayMs] = useState(500);

  // ── Launch state ──────────────────────────────────────────────────────────────
  const [isLaunching, setIsLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [logs, setLogs] = useState<Array<{
    id: string; level: LaunchLogEntry["level"]; message: string; txSig?: string; timestamp: Date;
  }>>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((level: LaunchLogEntry["level"], message: string, txSig?: string) => {
    setLogs((prev) => [...prev, { id: Math.random().toString(36).slice(2), level, message, txSig, timestamp: new Date() }]);
    setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }, []);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setLogoUri(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const toggleWallet = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Auto-assign dev wallet: keep existing if still selected, else pick first
      setDevWalletId((dev) => {
        if (next.includes(dev)) return dev;
        return next[0] ?? "";
      });
      return next;
    });
  };

  const handleLaunch = async () => {
    if (isLaunching) return;
    if (!name.trim() || !symbol.trim()) { addLog("error", "Token name and symbol are required."); return; }
    if (selectedIds.length === 0) { addLog("error", "Select at least one wallet."); return; }
    if (!devWalletId) { addLog("error", "Crown a dev wallet."); return; }

    setIsLaunching(true);
    const selectedWallets = wallets.filter((w) => selectedIds.includes(w.id));

    try {
      const formData = new FormData();
      if (logoFile) formData.append("logo", logoFile);
      formData.append("config", JSON.stringify({
        tokenConfig: { name, symbol, website, twitter, telegram, tokenType },
        bundleConfig: {
          selectedWallets: [
            ...selectedWallets.filter((w) => w.id === devWalletId),
            ...selectedWallets.filter((w) => w.id !== devWalletId),
          ].map((w) => ({ address: w.address, privateKey: w.privateKey, solAmount: walletAmounts[w.id] ?? 0.1 })),
          devWalletId,
          solPerWallet: 0.1,
          jitoTipSol: jitoTip,
          launchType,
          staggerDelayMs,
        },
        autoSell: { enabled: false, mode: "time", sellPct: 100, timeSeconds: 300, mcapTarget: 50000 },
      }));

      const res = await fetch("/api/launch", { method: "POST", body: formData });
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
              addLog(event.level, event.message, event.txSig);
            } else if (event.type === "complete") {
              setLaunched(true);
              setIsLaunching(false);
              if (event.mintAddress) {
                setActiveTokenMint(event.mintAddress);
                addLaunch({ mintAddress: event.mintAddress, name, symbol, logoUri, launchedAt: new Date().toISOString() });
                const now = new Date();
                for (const w of selectedWallets) {
                  const solAmount = walletAmounts[w.id] ?? 0.1;
                  if (solAmount > 0) {
                    addTrade({ walletAddress: w.address, type: "buy", solAmount, tokenAmount: 0, price: 0, txSig: "bundle", timestamp: now, status: "confirmed" });
                  }
                }
              }
              setTimeout(() => { onClose(); router.push("/manage"); }, 1500);
            } else if (event.type === "error") {
              addLog("error", event.message);
              setIsLaunching(false);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      addLog("error", err.message || "Launch failed");
      setIsLaunching(false);
    }
  };

  const SECTION = "text-[10px] font-semibold uppercase tracking-widest text-zinc-500";
  const SEP = "1px solid rgba(28,38,56,0.8)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget && !isLaunching) onClose(); }}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "rgba(10,13,20,0.98)", border: "1px solid rgba(79,131,255,0.2)", boxShadow: "0 0 40px rgba(79,131,255,0.08)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4" style={{ borderBottom: SEP }}>
          <div className="flex items-center justify-center w-7 h-7 rounded" style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}>
            <Rocket className="h-3.5 w-3.5 text-[#4f83ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-100">Quick Launch</p>
          </div>
          {!isLaunching && (
            <button onClick={onClose} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* ── Token ── */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: SEP }}>
            <p className={SECTION + " mb-3"}>Token</p>
            <div className="flex items-stretch gap-3 mb-3">
              <label className="shrink-0 cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <div className="w-[85px] h-[85px] rounded-lg flex items-center justify-center overflow-hidden" style={{ background: "rgba(28,38,56,0.6)", border: "1px solid rgba(28,38,56,0.9)" }}>
                  {logoUri ? <img src={logoUri} alt="" className="w-full h-full object-cover" /> : <Upload className="h-5 w-5 text-zinc-600" />}
                </div>
              </label>
              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <input type="text" placeholder="Token name" value={name} maxLength={32}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm outline-none rounded ql-input" style={INPUT} />
                <input type="text" placeholder="TICKER" value={symbol} maxLength={13}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 text-sm outline-none rounded font-mono ql-input" style={INPUT} />
              </div>
            </div>
            <SegmentedControl options={TOKEN_TYPES} value={tokenType} onChange={setTokenType} />
          </div>

          {/* ── Socials ── */}
          <div className="px-5 pt-4 pb-4" style={{ borderBottom: SEP }}>
            <p className={SECTION + " mb-3"}>Socials</p>
            <div className="flex gap-2">
              <input type="text" placeholder="Website" value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-0 flex-1 min-w-0 px-2 py-1.5 text-xs outline-none rounded truncate" style={{ ...INPUT, borderColor: website ? "rgba(79,131,255,0.35)" : "rgba(28,38,56,0.9)" }} />
              <input type="text" placeholder="Twitter" value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                className="w-0 flex-1 min-w-0 px-2 py-1.5 text-xs outline-none rounded" style={INPUT} />
              <input type="text" placeholder="Telegram" value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                className="w-0 flex-1 min-w-0 px-2 py-1.5 text-xs outline-none rounded" style={INPUT} />
            </div>
          </div>

          {/* ── Bundle ── */}
          <div className="px-5 pt-4 pb-4" style={{ borderBottom: SEP }}>
            <p className={SECTION + " mb-3"}>Bundle</p>

            {/* Launch type + Jito tip */}
            <div className="flex gap-3 mb-3">
              <div className="flex-1">
                <SegmentedControl
                  options={["classic", "stagger"] as const}
                  value={launchType}
                  onChange={setLaunchType}
                  labels={{ classic: "Classic (Jito)", stagger: "Stagger" }}
                />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-zinc-500">Tip</span>
                <input type="number" value={jitoTip} step={0.001} min={0}
                  onChange={(e) => setJitoTip(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs outline-none rounded text-right" style={INPUT} />
                <span className="text-[11px] text-zinc-600">SOL</span>
              </div>
            </div>

            {launchType === "stagger" && (
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] text-zinc-500">Delay</span>
                <input type="number" value={staggerDelayMs} min={0} max={10000}
                  onChange={(e) => setStaggerDelayMs(Number(e.target.value))}
                  className="w-20 px-2 py-1 text-xs outline-none rounded text-right" style={INPUT} />
                <span className="text-[11px] text-zinc-600">ms</span>
              </div>
            )}

            {/* Wallets */}
            {wallets.length === 0 ? (
              <p className="text-xs text-zinc-600">No wallets imported.</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto no-scrollbar" style={{ maxHeight: wallets.length > 5 ? "205px" : "none" }}>
                {wallets.map((w) => {
                  const sel = selectedIds.includes(w.id);
                  const isDev = devWalletId === w.id;
                  return (
                    <div
                      key={w.id}
                      className="flex items-center gap-2 rounded px-3 py-2 cursor-pointer transition-all"
                      style={{
                        background: sel ? "rgba(79,131,255,0.07)" : "rgba(13,17,24,0.6)",
                        border: sel ? "1px solid rgba(79,131,255,0.2)" : "1px solid rgba(28,38,56,0.6)",
                      }}
                      onClick={() => toggleWallet(w.id)}
                    >
                      <div className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                        style={{ background: sel ? "rgba(79,131,255,0.3)" : "rgba(28,38,56,0.8)", border: sel ? "1px solid rgba(79,131,255,0.5)" : "1px solid rgba(28,38,56,0.9)" }}>
                        {sel && <div className="w-2 h-2 rounded-sm bg-[#4f83ff]" />}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDevWalletId(w.id); }}
                        title="Set as dev wallet"
                        className="shrink-0 transition-colors"
                      >
                        <Crown className={`h-3.5 w-3.5 ${isDev ? "text-yellow-400" : "text-zinc-500 hover:text-zinc-300"}`} />
                      </button>
                      <span className="flex-1 font-mono text-[11px] text-zinc-400">{w.address.slice(0, 6)}…{w.address.slice(-4)}</span>
                      <span className="text-[11px] text-zinc-500 shrink-0 tabular-nums">{(w.solBalance ?? 0).toFixed(3)}</span>
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="number"
                          placeholder="0.1"
                          value={walletAmounts[w.id] ?? ""}
                          onChange={(e) => setWalletAmounts((prev) => ({ ...prev, [w.id]: Number(e.target.value) }))}
                          className="w-14 px-2 py-0.5 text-xs outline-none rounded text-right"
                          style={INPUT}
                          step={0.01} min={0.001}
                        />
                        <span className="text-[10px] text-zinc-600">SOL</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Launch log ── */}
          {logs.length > 0 && (
            <div className="mx-5 mb-5 rounded-lg overflow-hidden" style={{ background: "rgba(5,5,8,0.95)", border: "1px solid rgba(28,38,56,0.8)" }}>
              <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)", background: "rgba(7,10,18,0.95)" }}>
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 ml-1">Launch Log</span>
                {isLaunching && <Loader2 className="h-3 w-3 text-[#4f83ff] animate-spin ml-auto" />}
              </div>
              <div className="p-3 font-mono text-xs space-y-1.5 max-h-40 overflow-y-auto no-scrollbar">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <span className="shrink-0 mt-0.5">{LOG_ICONS[log.level]}</span>
                    <span className="text-zinc-700 shrink-0 tabular-nums">{log.timestamp.toLocaleTimeString()}</span>
                    <span style={{ color: LOG_COLORS[log.level] }}>{log.message}</span>
                    {log.txSig && (
                      <a href={`https://solscan.io/tx/${log.txSig}`} target="_blank" rel="noopener noreferrer" className="ml-auto shrink-0 text-[#4f83ff]/50 hover:text-[#4f83ff] transition-colors">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ))}
                {launched && (
                  <div className="flex items-center gap-2 text-green-400 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Launch complete! Redirecting…
                  </div>
                )}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4" style={{ borderTop: SEP }}>
          <button
            onClick={handleLaunch}
            disabled={isLaunching || launched}
            className="relative w-full py-3 text-sm font-bold rounded transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
            style={
              launched
                ? { background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.5)", color: "#4ade80", boxShadow: "0 0 20px rgba(34,197,94,0.3)" }
                : isLaunching
                ? { background: "rgba(79,131,255,0.08)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }
                : { background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.5)", color: "#4f83ff", boxShadow: "0 0 20px rgba(79,131,255,0.3), inset 0 0 20px rgba(79,131,255,0.06)" }
            }
            onMouseEnter={(e) => {
              if (!isLaunching && !launched) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.2)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 30px rgba(79,131,255,0.5), inset 0 0 20px rgba(79,131,255,0.1)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isLaunching && !launched) {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(79,131,255,0.3), inset 0 0 20px rgba(79,131,255,0.06)";
              }
            }}
          >
            {!isLaunching && !launched && (
              <span className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(105deg,transparent 40%,rgba(79,131,255,0.12) 50%,transparent 60%)", animation: "shimmer 2.5s infinite" }} />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isLaunching ? <><Loader2 className="h-4 w-4 animate-spin" />Launching…</>
                : launched ? <><CheckCircle2 className="h-4 w-4" />Launched!</>
                : <><Rocket className="h-4 w-4" />Launch Token</>}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .ql-input { color: #52525b; }
        .ql-input::placeholder { color: #52525b; }
      `}</style>
    </div>
  );
}
