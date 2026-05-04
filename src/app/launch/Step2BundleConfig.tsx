"use client";
import React, { useState, useRef, useEffect } from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Crown, Timer, TrendingUp, Zap, Layers, ChevronDown, X, Shield, Shuffle } from "lucide-react";
import { truncateAddress, formatSol } from "@/lib/utils";
import type { LaunchType, AutoSellMode, SniperAction } from "@/types";

const cardStyle = {
  background: "rgba(13,17,24,0.8)",
  border: "1px solid rgba(28,38,56,0.8)",
};


export default function Step2BundleConfig() {
  const wallets = useStore((s) => s.wallets);
  const bundleConfig = useStore((s) => s.launch.bundleConfig);
  const updateBundleConfig = useStore((s) => s.updateBundleConfig);
  const autoSell = useStore((s) => s.launch.autoSell);
  const updateAutoSell = useStore((s) => s.updateAutoSell);
  const sniperGuard = useStore((s) => s.launch.sniperGuard);
  const updateSniperGuard = useStore((s) => s.updateSniperGuard);
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
  const [autoSellOpen, setAutoSellOpen] = useState(false);
  const [sniperOpen, setSniperOpen] = useState(false);
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

      {/* Toolbar */}
      <div className="rounded-lg px-4 py-3 flex items-center gap-3" style={cardStyle}>
        {/* Launch mode */}
        <div className="flex items-center gap-1.5">
          {([
            { value: "classic" as LaunchType, label: "Classic", icon: <Zap className="h-3.5 w-3.5" /> },
            { value: "stagger" as LaunchType, label: "Stagger", icon: <Layers className="h-3.5 w-3.5" /> },
          ]).map((t) => {
            const active = bundleConfig.launchType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => updateBundleConfig({ launchType: t.value })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
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

        <div className="w-px h-5 bg-zinc-800 mx-1" />

        {/* Tip button */}
        <div className="relative" ref={tipRef}>
          <button
            onClick={() => setTipOpen((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
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

        {/* Auto-Sell button */}
        <button
          onClick={() => setAutoSellOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
          style={{
            background: autoSell.enabled ? "rgba(79,131,255,0.08)" : "rgba(7,10,18,0.6)",
            border: `1px solid ${autoSell.enabled ? "rgba(79,131,255,0.35)" : "rgba(28,38,56,0.9)"}`,
            color: autoSell.enabled ? "#4f83ff" : "#a1a1aa",
          }}
        >
          <Timer className="h-3.5 w-3.5" />
          Auto-Sell
          {autoSell.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#4f83ff]" style={{ boxShadow: "0 0 6px rgba(79,131,255,0.8)" }} />
          )}
        </button>

        {/* Sniper Guard button */}
        <button
          onClick={() => setSniperOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold"
          style={{
            background: sniperGuard.enabled ? "rgba(255,96,96,0.08)" : "rgba(7,10,18,0.6)",
            border: `1px solid ${sniperGuard.enabled ? "rgba(255,96,96,0.35)" : "rgba(28,38,56,0.9)"}`,
            color: sniperGuard.enabled ? "#ff6060" : "#a1a1aa",
          }}
        >
          <Shield className="h-3.5 w-3.5" />
          Sniper Guard
          {sniperGuard.enabled && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff6060]" style={{ boxShadow: "0 0 6px rgba(255,96,96,0.8)" }} />
          )}
        </button>

        {/* Stagger delay inline */}
        {bundleConfig.launchType === "stagger" && (
          <>
            <div className="w-px h-5 bg-zinc-800 mx-1" />
            <div className="flex items-center gap-3 flex-1">
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
          </>
        )}
      </div>

      {/* Auto-Sell modal */}
      {autoSellOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setAutoSellOpen(false); }}
        >
          <div
            className="rounded-lg w-full max-w-sm mx-4"
            style={{
              background: "rgba(13,17,24,0.95)",
              border: "1px solid rgba(28,38,56,0.8)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(28,38,56,0.8)]">
              <div className="flex items-center gap-3">
                <Timer className="h-4 w-4" style={{ color: autoSell.enabled ? "#4f83ff" : "#3f3f46" }} />
                <span className="text-sm font-semibold text-zinc-100">Auto-Sell</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={autoSell.enabled} onCheckedChange={(v) => updateAutoSell({ enabled: v })} />
                <button onClick={() => setAutoSellOpen(false)} className="text-zinc-600 hover:text-zinc-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {([
                  { mode: "time" as AutoSellMode, icon: <Timer className="h-3.5 w-3.5" />, label: "Time-based", desc: "Sell after X seconds" },
                  { mode: "mcap" as AutoSellMode, icon: <TrendingUp className="h-3.5 w-3.5" />, label: "MCap-based", desc: "Sell at target MCap" },
                ] as const).map((opt) => {
                  const sel = autoSell.mode === opt.mode;
                  return (
                    <button
                      key={opt.mode}
                      onClick={() => updateAutoSell({ mode: opt.mode })}
                      className="p-3.5 rounded text-left"
                      style={{
                        background: sel ? "rgba(79,131,255,0.08)" : "rgba(7,10,18,0.6)",
                        border: `1px solid ${sel ? "rgba(79,131,255,0.4)" : "rgba(28,38,56,0.9)"}`,
                        boxShadow: sel ? "0 0 12px rgba(79,131,255,0.12)" : "none",
                      }}
                    >
                      <div className="mb-2" style={{ color: sel ? "#4f83ff" : "#3f3f46" }}>{opt.icon}</div>
                      <div className="text-xs font-semibold mb-0.5" style={{ color: sel ? "#e4e4e7" : "#a1a1aa" }}>{opt.label}</div>
                      <div className="text-[10px]" style={{ color: sel ? "rgba(79,131,255,0.6)" : "#52525b" }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {autoSell.mode === "time" && (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-zinc-400 shrink-0">Sell</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={autoSell.sellPct}
                    onChange={(e) => updateAutoSell({ sellPct: Math.min(100, parseInt(e.target.value) || 1) })}
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-zinc-500 shrink-0">%</span>
                  <span className="text-xs text-zinc-400 shrink-0">every</span>
                  <Input
                    type="number"
                    min={1}
                    value={autoSell.timeSeconds}
                    onChange={(e) => updateAutoSell({ timeSeconds: parseInt(e.target.value) || 1 })}
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-zinc-500 shrink-0">sec</span>
                </div>
              )}

              {autoSell.mode === "mcap" && (
                <div className="flex items-center gap-2 w-full">
                  <span className="text-xs text-zinc-400 shrink-0">Sell</span>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={autoSell.sellPct}
                    onChange={(e) => updateAutoSell({ sellPct: Math.min(100, parseInt(e.target.value) || 1) })}
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-zinc-500 shrink-0">% at</span>
                  <span className="text-xs text-zinc-500 shrink-0">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={autoSell.mcapTarget}
                    onChange={(e) => updateAutoSell({ mcapTarget: parseFloat(e.target.value) || 0 })}
                    className="flex-1 h-8 text-sm"
                  />
                  <span className="text-xs text-zinc-500 shrink-0">MCap</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sniper Guard modal */}
      {sniperOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setSniperOpen(false); }}
        >
          <div
            className="rounded-lg w-full max-w-sm mx-4"
            style={{
              background: "rgba(13,17,24,0.95)",
              border: "1px solid rgba(28,38,56,0.8)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(28,38,56,0.8)]">
              <div className="flex items-center gap-3">
                <Shield className="h-4 w-4" style={{ color: sniperGuard.enabled ? "#ff6060" : "#3f3f46" }} />
                <span className="text-sm font-semibold text-zinc-100">Sniper Guard</span>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={sniperGuard.enabled} onCheckedChange={(v) => updateSniperGuard({ enabled: v })} />
                <button onClick={() => setSniperOpen(false)} className="text-zinc-600 hover:text-zinc-300">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="px-5 py-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">SOL Threshold</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.1}
                    step={0.5}
                    value={sniperGuard.solThreshold}
                    onChange={(e) => updateSniperGuard({ solThreshold: parseFloat(e.target.value) || 0 })}
                    className="w-28"
                  />
                  <span className="text-xs text-zinc-500">SOL</span>
                </div>
                <p className="text-[10px] text-zinc-600">
                  Trigger if external buys exceed {sniperGuard.solThreshold} SOL
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Action on Trigger</Label>
                <div className="flex gap-2">
                  {([
                    { value: "stop" as SniperAction, label: "Stop Buying" },
                    { value: "sell-all" as SniperAction, label: "Sell All" },
                  ]).map((opt) => {
                    const active = sniperGuard.action === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => updateSniperGuard({ action: opt.value })}
                        className="flex-1 py-1.5 rounded text-xs font-semibold"
                        style={{
                          background: active ? "rgba(255,96,96,0.1)" : "rgba(7,10,18,0.6)",
                          border: `1px solid ${active ? "rgba(255,96,96,0.4)" : "rgba(28,38,56,0.9)"}`,
                          color: active ? "#ff6060" : "#71717a",
                        }}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-zinc-600">
                  {sniperGuard.action === "stop" ? "Halt remaining wallet buys in queue" : "Immediately liquidate all positions"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet list */}
      <div className="rounded-lg p-5" style={cardStyle}>
        {/* Header row */}
        <div className="grid items-center px-1 mb-2" style={{ gridTemplateColumns: "28px 1fr 84px 90px 80px" }}>
          <div />
          <button
            onClick={toggleAll}
            className="text-[10px] font-semibold uppercase tracking-wider text-[#4f83ff]/70 hover:text-[#4f83ff] transition-colors text-left px-2"
          >
            {bundleConfig.selectedWalletIds.length === wallets.length ? "Deselect All" : "Select All"}
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 text-right pr-12">Supply</span>
          <div className="flex items-center justify-end gap-1 pr-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Buy (SOL)</span>
            <button
              title="Randomize buy amounts (±30%)"
              onClick={() => {
                const amounts: Record<string, number> = {};
                wallets.forEach((w) => {
                  const max = Math.max(0, w.solBalance - 0.01);
                  const rand = Math.random() * max;
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
          <div className="max-h-[26rem] overflow-y-auto">
            {(() => {
              const totalBuySOL = bundleConfig.selectedWalletIds.reduce(
                (sum, id) => sum + (bundleConfig.walletBuyAmounts[id] ?? 0.1),
                0
              );
              return wallets.map((w, i) => {
                const sel = bundleConfig.selectedWalletIds.includes(w.id);
                const isDev = bundleConfig.devWalletId === w.id;
                const buyAmt = bundleConfig.walletBuyAmounts[w.id] ?? 0.1;
                const supplyPct = sel && totalBuySOL > 0 ? (buyAmt / totalBuySOL) * 100 : null;
                return (
                  <div
                    key={w.id}
                    onClick={() => toggleWallet(w.id)}
                    className="grid items-center px-1 py-1.5 cursor-pointer"
                    style={{
                      gridTemplateColumns: "28px 1fr 84px 90px 80px",
                      borderBottom: i < wallets.length - 1 ? "1px solid rgba(28,38,56,0.6)" : "none",
                    }}
                  >
                    <Checkbox checked={sel} onCheckedChange={() => toggleWallet(w.id)} />
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
                    <span className="text-xs tabular-nums text-right pr-12" style={{ color: supplyPct !== null ? "#a1a1aa" : "#3f3f46" }}>
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
          className="mt-4 pt-3 grid items-center text-xs"
          style={{
            gridTemplateColumns: "28px 1fr 84px 90px 80px",
            borderTop: "1px solid rgba(28,38,56,0.9)",
          }}
        >
          <div />
          <span className="text-zinc-600 text-[10px] uppercase tracking-wider px-2">
            {bundleConfig.selectedWalletIds.length > 0
              ? `${bundleConfig.selectedWalletIds.length} selected`
              : `${wallets.length} wallets`}
          </span>
          <span className="text-xs font-semibold tabular-nums text-right pr-12 text-zinc-300">
            {bundleConfig.selectedWalletIds.length > 0 ? "100%" : "0%"}
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
