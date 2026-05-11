"use client";
import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Crown, Zap, Layers, ChevronDown, Shuffle } from "lucide-react";
import { truncateAddress, formatSol } from "@/lib/utils";
import type { LaunchType } from "@/types";
import LaunchPresetPanel from "./LaunchPresetPanel";

const cardStyle = {
  background: "rgba(13,17,24,0.8)",
  border: "1px solid rgba(28,38,56,0.8)",
};


export default function Step2BundleConfig() {
  const wallets = useStore((s) => s.wallets);
  const bundleConfig = useStore((s) => s.launch.bundleConfig);
  const updateBundleConfig = useStore((s) => s.updateBundleConfig);
  const setLaunchStep = useStore((s) => s.setLaunchStep);

  const toggleWallet = (id: string) => {
    const sel = bundleConfig.selectedWalletIds;
    if (sel.includes(id)) {
      const next = sel.filter((x) => x !== id);
      const patch: Parameters<typeof updateBundleConfig>[0] = { selectedWalletIds: next };
      if (bundleConfig.devWalletId === id) patch.devWalletId = next[0] ?? "";
      updateBundleConfig(patch);
    } else {
      const next = [...sel, id];
      updateBundleConfig({ selectedWalletIds: next, devWalletId: bundleConfig.devWalletId || id });
    }
  };

  const toggleAll = () => {
    if (bundleConfig.selectedWalletIds.length === wallets.length) {
      updateBundleConfig({ selectedWalletIds: [], devWalletId: "" });
    } else {
      const ids = wallets.map((w) => w.id);
      updateBundleConfig({ selectedWalletIds: ids, devWalletId: bundleConfig.devWalletId || ids[0] });
    }
  };

  const setDevWallet = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const sel = bundleConfig.selectedWalletIds;
    updateBundleConfig({ devWalletId: id, selectedWalletIds: sel.includes(id) ? sel : [...sel, id] });
  };

  const [tipOpen, setTipOpen] = useState(false);
  const tipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tipOpen) return;
    const handler = (e: MouseEvent) => {
      if (tipRef.current && !tipRef.current.contains(e.target as Node)) setTipOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [tipOpen]);

  const canContinue =
    bundleConfig.selectedWalletIds.length > 0 &&
    bundleConfig.devWalletId !== "";

  return (
    <div className="space-y-4">

      {/* Toolbar + Presets row */}
      <div className="flex gap-3 items-stretch">
        {/* Toolbar */}
        <div className="rounded-lg px-3 py-3 flex flex-col gap-2 flex-1" style={cardStyle}>
          {/* Row 1: Launch mode */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: "classic" as LaunchType, label: "Classic", icon: <Zap className="h-3.5 w-3.5" /> },
              { value: "stagger" as LaunchType, label: "Stagger", icon: <Layers className="h-3.5 w-3.5" /> },
            ]).map((t) => {
              const active = bundleConfig.launchType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => updateBundleConfig({ launchType: t.value })}
                  className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
                  style={{
                    background: active ? "rgba(79,131,255,0.12)" : "rgba(7,10,18,0.6)",
                    border: `1px solid ${active ? "rgba(79,131,255,0.4)" : "rgba(28,38,56,0.9)"}`,
                    color: active ? "#4f83ff" : "#71717a",
                    boxShadow: active ? "0 0 10px rgba(79,131,255,0.15)" : "none",
                  }}
                >
                  {t.icon}
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Row 2: Tip */}
          <div className="relative" ref={tipRef}>
            <button
              onClick={() => setTipOpen((o) => !o)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
              style={{
                background: tipOpen ? "rgba(79,131,255,0.08)" : "rgba(7,10,18,0.6)",
                border: `1px solid ${tipOpen ? "rgba(79,131,255,0.35)" : "rgba(28,38,56,0.9)"}`,
                color: tipOpen ? "#4f83ff" : "#a1a1aa",
              }}
            >
              Tip: {bundleConfig.jitoTipSol} SOL
              <ChevronDown className="h-3 w-3" />
            </button>
            {tipOpen && (
              <div
                className="absolute left-0 top-full mt-2 z-50 rounded-md p-4 space-y-2 w-56"
                style={{ background: "rgba(10,14,22,0.98)", border: "1px solid rgba(28,38,56,0.9)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}
              >
                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Jito Tip (SOL)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.0001}
                    step={0.0005}
                    value={bundleConfig.jitoTipSol}
                    onChange={(e) => updateBundleConfig({ jitoTipSol: parseFloat(e.target.value) || 0.005 })}
                    className="h-8 text-sm"
                  />
                </div>
                <p className="text-[10px] text-zinc-600">Higher tip = faster inclusion</p>
              </div>
            )}
          </div>

          {/* Row 3: Stagger delay (when stagger selected) */}
          {bundleConfig.launchType === "stagger" && (
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Delay</span>
              <Slider
                min={0}
                max={10000}
                step={100}
                value={[bundleConfig.staggerDelayMs]}
                onValueChange={([v]) => updateBundleConfig({ staggerDelayMs: v })}
                className="flex-1"
              />
              <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#4f83ff" }}>
                {bundleConfig.staggerDelayMs}ms
              </span>
            </div>
          )}
        </div>

        {/* Bundle Presets */}
        <div className="flex-1">
          <LaunchPresetPanel />
        </div>
      </div>

      {/* Wallet list */}
      <div className="rounded-lg p-5" style={cardStyle}>
        {/* Header row */}
        <div className="grid items-center px-1 mb-2 grid-cols-[28px_1fr_80px_70px] sm:grid-cols-[28px_1fr_84px_90px_80px]">
          <div />
          <button
            onClick={toggleAll}
            className="text-[10px] font-semibold uppercase tracking-wider text-[#4f83ff]/70 hover:text-[#4f83ff] transition-colors text-left px-2"
          >
            {bundleConfig.selectedWalletIds.length === wallets.length ? "Deselect All" : "Select All"}
          </button>
          <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-wider text-zinc-600 text-right pr-12">Supply</span>
          <div className="flex items-center justify-end gap-1 pr-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Buy (SOL)</span>
            <button
              title="Randomize buy amounts (±30%)"
              onClick={() => {
                const amounts: Record<string, number> = { ...bundleConfig.walletBuyAmounts };
                wallets.forEach((w) => {
                  if (!bundleConfig.selectedWalletIds.includes(w.id)) {
                    amounts[w.id] = 0;
                    return;
                  }
                  const max = Math.max(0, w.solBalance - 0.01);
                  const min = max / 2;
                  const rand = min + Math.random() * (max - min);
                  amounts[w.id] = Math.round(Math.min(rand, max) * 1000) / 1000;
                });
                updateBundleConfig({ walletBuyAmounts: amounts });
              }}
              className="text-zinc-600 hover:text-[#4f83ff] transition-colors"
            >
              <Shuffle className="h-3 w-3" />
            </button>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 text-right">Balance</span>
        </div>

        {wallets.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-10">
            No wallets imported yet. Go to Dashboard first.
          </div>
        ) : (
          <div className="max-h-[22.5rem] overflow-y-auto">
            {(() => {
              // Pump.fun bonding curve constants
              const TOTAL_SUPPLY = 1_000_000_000;
              let vSol = 30;
              let vTok = 1_073_000_191;
              const k = vSol * vTok;

              // Calculate tokens each selected wallet receives sequentially
              const tokensByWallet: Record<string, number> = {};
              wallets.forEach((w) => {
                if (!bundleConfig.selectedWalletIds.includes(w.id)) return;
                const buy = bundleConfig.walletBuyAmounts[w.id] ?? 0.1;
                if (buy <= 0) return;
                const tokOut = vTok - k / (vSol + buy);
                tokensByWallet[w.id] = tokOut;
                vSol += buy;
                vTok -= tokOut;
              });

              return wallets.map((w, i) => {
                const sel = bundleConfig.selectedWalletIds.includes(w.id);
                const isDev = bundleConfig.devWalletId === w.id;
                const buyAmt = bundleConfig.walletBuyAmounts[w.id] ?? 0.1;
                const supplyPct = sel && tokensByWallet[w.id] ? (tokensByWallet[w.id] / TOTAL_SUPPLY) * 100 : null;
                return (
                  <div
                    key={w.id}
                    className="grid items-center px-1 py-1.5 grid-cols-[28px_1fr_80px_70px] sm:grid-cols-[28px_1fr_84px_90px_80px]"
                    style={{
                      borderBottom: i < wallets.length - 1 ? "1px solid rgba(28,38,56,0.6)" : "none",
                    }}
                  >
                    <Checkbox checked={sel} onCheckedChange={() => toggleWallet(w.id)} className="cursor-pointer" />
                    <div className="flex items-center gap-2 px-2 min-w-0">
                      <span className="font-mono text-xs text-zinc-200 truncate">
                        {truncateAddress(w.address, 5)}
                      </span>
                      <button
                        onClick={(e) => setDevWallet(e, w.id)}
                        title={isDev ? "Dev wallet" : "Set as dev wallet"}
                        className="flex items-center gap-1 px-2 py-1 rounded-sm shrink-0"
                        style={{
                          background: isDev ? "rgba(234,179,8,0.15)" : "transparent",
                          border: `1px solid ${isDev ? "rgba(234,179,8,0.5)" : "rgba(28,38,56,0.7)"}`,
                          color: isDev ? "#eab308" : "#3f3f46",
                        }}
                      >
                        <Crown className="h-3 w-3 shrink-0" />
                        {isDev && <span className="text-[9px] font-bold uppercase tracking-wider">Dev</span>}
                      </button>
                    </div>
                    <span className="hidden sm:block text-xs tabular-nums text-right pr-12" style={{ color: supplyPct !== null ? "#a1a1aa" : "#3f3f46" }}>
                      {supplyPct !== null ? `${supplyPct.toFixed(1)}%` : "0%"}
                    </span>
                    <div className="pr-2" onClick={(e) => e.stopPropagation()}>
                      <Input
                        type="number"
                        min={0.001}
                        step={0.01}
                        value={buyAmt}
                        onChange={(e) =>
                          updateBundleConfig({
                            walletBuyAmounts: {
                              ...bundleConfig.walletBuyAmounts,
                              [w.id]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        className="h-6 text-xs px-2 w-full text-right"
                        style={{ background: "rgba(7,10,18,0.6)", border: "1px solid rgba(28,38,56,0.9)" }}
                      />
                    </div>
                    <span className="text-xs font-medium tabular-nums text-right" style={{ color: "#71717a" }}>
                      {formatSol(w.solBalance, 3)}
                    </span>
                  </div>
                );
              });
            })()}
          </div>
        )}

        <div
          className="mt-4 pt-3 grid items-center text-xs grid-cols-[28px_1fr_80px_70px] sm:grid-cols-[28px_1fr_84px_90px_80px]"
          style={{ borderTop: "1px solid rgba(28,38,56,0.9)" }}
        >
          <div />
          <span className="text-zinc-600 text-[10px] uppercase tracking-wider px-2">
            {bundleConfig.selectedWalletIds.length > 0
              ? `${bundleConfig.selectedWalletIds.length} selected`
              : `${wallets.length} wallets`}
          </span>
          <span className="hidden sm:block text-xs font-semibold tabular-nums text-right pr-12 text-zinc-300">
            {(() => {
              const TOTAL_SUPPLY = 1_000_000_000;
              let vSol = 30, vTok = 1_073_000_191;
              const k = vSol * vTok;
              let totalTok = 0;
              wallets.forEach((w) => {
                if (!bundleConfig.selectedWalletIds.includes(w.id)) return;
                const buy = bundleConfig.walletBuyAmounts[w.id] ?? 0.1;
                if (buy <= 0) return;
                const tokOut = vTok - k / (vSol + buy);
                totalTok += tokOut;
                vSol += buy;
                vTok -= tokOut;
              });
              return bundleConfig.selectedWalletIds.length > 0
                ? `${((totalTok / TOTAL_SUPPLY) * 100).toFixed(1)}%`
                : "0%";
            })()}
          </span>
          <span className="text-xs font-semibold pr-2 tabular-nums text-right text-zinc-300">
            {formatSol(
              bundleConfig.selectedWalletIds.reduce(
                (sum, id) => sum + (bundleConfig.walletBuyAmounts[id] ?? 0.1),
                0
              ),
              3
            )}
          </span>
          <span className="text-xs font-semibold tabular-nums text-right text-zinc-300">
            {formatSol(wallets.reduce((s, w) => s + w.solBalance, 0), 3)}
          </span>
        </div>
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="outline" size="lg" onClick={() => setLaunchStep(1)}>
          ← Back
        </Button>
        <Button size="lg" disabled={!canContinue} onClick={() => setLaunchStep(3)}>
          Review & Launch →
        </Button>
      </div>
    </div>
  );
}
