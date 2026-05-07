"use client";
import { useState } from "react";
import { X, Crown, Save, SlidersHorizontal } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useStore } from "@/store";

const INPUT: React.CSSProperties = {
  background: "rgba(13,17,24,0.8)",
  border: "1px solid rgba(28,38,56,0.9)",
  color: "#e4e4e7",
  borderRadius: 6,
};
const SEP = "1px solid rgba(79,131,255,0.1)";
const SECTION = "text-[10px] font-semibold uppercase tracking-widest text-zinc-500";

interface Props {
  onClose: () => void;
}

export default function BundlePresetModal({ onClose }: Props) {
  const wallets = useStore((s) => s.wallets);
  const existing = useStore((s) => s.bundlePreset);
  const setBundlePreset = useStore((s) => s.setBundlePreset);

  const [selectedIds, setSelectedIds] = useState<string[]>(existing?.selectedWalletIds ?? []);
  const [devWalletId, setDevWalletId] = useState(existing?.devWalletId ?? "");
  const [walletBuyAmounts, setWalletBuyAmounts] = useState<Record<string, number>>(existing?.walletBuyAmounts ?? {});
  const [jitoTip, setJitoTip] = useState(existing?.jitoTip ?? 0.005);
  const [launchType, setLaunchType] = useState<"classic" | "stagger">(existing?.launchType ?? "classic");
  const [staggerDelayMs, setStaggerDelayMs] = useState(existing?.staggerDelayMs ?? 500);

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setDevWalletId((dev) => {
        if (next.includes(dev)) return dev;
        return next[0] ?? "";
      });
      return next;
    });
  };

  const save = () => {
    setBundlePreset({ selectedWalletIds: selectedIds, devWalletId, walletBuyAmounts, jitoTip, launchType, staggerDelayMs });
    onClose();
  };

  const clear = () => {
    setBundlePreset(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-xl overflow-hidden"
        style={{ background: "rgba(9,9,11,0.97)", border: "1px solid rgba(79,131,255,0.3)", boxShadow: "0 0 0 1px rgba(79,131,255,0.1), 0 0 40px rgba(79,131,255,0.12), 0 24px 48px rgba(0,0,0,0.5)" }}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4" style={{ borderBottom: SEP, background: "rgba(79,131,255,0.03)" }}>
          <div className="flex items-center justify-center w-7 h-7 rounded" style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}>
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#4f83ff]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-zinc-100">Bundle Preset</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Pre-fill bundle config when launching from Feed</p>
          </div>
          <button onClick={onClose} className="shrink-0 text-zinc-600 hover:text-zinc-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">

          {/* Launch type + Jito tip */}
          <div className="px-5 pt-5 pb-4" style={{ borderBottom: SEP }}>
            <p className={SECTION + " mb-3"}>Launch Config</p>
            <div className="flex gap-3 mb-3">
              <div className="flex gap-1.5 flex-1">
                {(["classic", "stagger"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setLaunchType(t)}
                    className="flex-1 py-1.5 rounded text-[10px] font-semibold transition-all"
                    style={{
                      background: launchType === t ? "rgba(79,131,255,0.15)" : "rgba(28,38,56,0.4)",
                      border: launchType === t ? "1px solid rgba(79,131,255,0.4)" : "1px solid rgba(28,38,56,0.6)",
                      color: launchType === t ? "#7aa3ff" : "#52525b",
                    }}
                  >
                    {t === "classic" ? "Classic (Jito)" : "Stagger"}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-zinc-500">Tip</span>
                <input
                  type="number" value={jitoTip} step={0.001} min={0}
                  onChange={(e) => setJitoTip(Number(e.target.value))}
                  className="w-16 px-2 py-1.5 text-xs outline-none rounded text-right"
                  style={INPUT}
                />
                <span className="text-[11px] text-zinc-600">SOL</span>
              </div>
            </div>

            {launchType === "stagger" && (
              <div className="flex items-center gap-3 mt-3">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Delay</span>
                <Slider
                  min={0} max={10000} step={100}
                  value={[staggerDelayMs]}
                  onValueChange={([v]) => setStaggerDelayMs(v)}
                  className="flex-1"
                />
                <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#4f83ff" }}>
                  {staggerDelayMs}ms
                </span>
              </div>
            )}
          </div>

          {/* Wallets */}
          <div className="px-5 pt-4 pb-4">
            <p className={SECTION + " mb-3"}>Wallets &amp; Buy Amounts</p>
            {wallets.length === 0 ? (
              <p className="text-xs text-zinc-600">No wallets imported. Import wallets first.</p>
            ) : (
              <div className="space-y-1.5 overflow-y-auto no-scrollbar" style={{ maxHeight: wallets.length > 6 ? "240px" : "none" }}>
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
                      onClick={() => toggle(w.id)}
                    >
                      <div
                        className="shrink-0 w-4 h-4 rounded flex items-center justify-center"
                        style={{
                          background: sel ? "rgba(79,131,255,0.3)" : "rgba(28,38,56,0.8)",
                          border: sel ? "1px solid rgba(79,131,255,0.5)" : "1px solid rgba(28,38,56,0.9)",
                        }}
                      >
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
                          value={walletBuyAmounts[w.id] ?? ""}
                          onChange={(e) => setWalletBuyAmounts((prev) => ({ ...prev, [w.id]: Number(e.target.value) }))}
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
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4" style={{ borderTop: SEP }}>
          {existing && (
            <button
              onClick={clear}
              className="px-3 py-2 rounded text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
              style={{ border: "1px solid rgba(28,38,56,0.8)" }}
            >
              Clear Preset
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-3 py-2 rounded text-[11px] font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-2 rounded text-[11px] font-bold transition-all"
            style={{ background: "rgba(79,131,255,0.15)", border: "1px solid rgba(79,131,255,0.35)", color: "#7aa3ff" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(79,131,255,0.15)"; }}
          >
            <Save className="h-3 w-3" />
            Save Preset
          </button>
        </div>
      </div>
    </div>
  );
}
