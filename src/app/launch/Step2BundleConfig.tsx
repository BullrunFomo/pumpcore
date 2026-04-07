"use client";
import React from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Zap, Layers, Crown } from "lucide-react";
import { truncateAddress, formatSol } from "@/lib/utils";
import type { LaunchType } from "@/types";

const LAUNCH_TYPES: { value: LaunchType; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "classic",
    label: "Classic Bundle",
    desc: "All buys atomic via Jito in block 0",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    value: "stagger",
    label: "Stagger Buy",
    desc: "Spread across blocks with delay",
    icon: <Layers className="h-4 w-4" />,
  },
];

export default function Step2BundleConfig() {
  const wallets = useStore((s) => s.wallets);
  const bundleConfig = useStore((s) => s.launch.bundleConfig);
  const updateBundleConfig = useStore((s) => s.updateBundleConfig);
  const setLaunchStep = useStore((s) => s.setLaunchStep);

  const toggleWallet = (id: string) => {
    const sel = bundleConfig.selectedWalletIds;
    if (sel.includes(id)) {
      const next = sel.filter((x) => x !== id);
      // If removing the dev wallet, clear devWalletId
      const patch: Parameters<typeof updateBundleConfig>[0] = { selectedWalletIds: next };
      if (bundleConfig.devWalletId === id) patch.devWalletId = next[0] ?? "";
      updateBundleConfig(patch);
    } else {
      const next = [...sel, id];
      // Auto-assign first selected wallet as dev if none set
      updateBundleConfig({
        selectedWalletIds: next,
        devWalletId: bundleConfig.devWalletId || id,
      });
    }
  };

  const toggleAll = () => {
    if (bundleConfig.selectedWalletIds.length === wallets.length) {
      updateBundleConfig({ selectedWalletIds: [], devWalletId: "" });
    } else {
      const ids = wallets.map((w) => w.id);
      updateBundleConfig({
        selectedWalletIds: ids,
        devWalletId: bundleConfig.devWalletId || ids[0],
      });
    }
  };

  const setDevWallet = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Selecting dev wallet also ensures it's in the selection
    const sel = bundleConfig.selectedWalletIds;
    updateBundleConfig({
      devWalletId: id,
      selectedWalletIds: sel.includes(id) ? sel : [...sel, id],
    });
  };

  const canContinue =
    bundleConfig.selectedWalletIds.length > 0 &&
    bundleConfig.devWalletId !== "" &&
    bundleConfig.solPerWallet > 0;

  const totalSol = bundleConfig.selectedWalletIds.length * bundleConfig.solPerWallet;

  const cardStyle = {
    background: "rgba(24,24,27,0.8)",
    border: "1px solid rgba(63,63,70,0.25)",
  };

  const sectionHeader = (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-px flex-1 bg-zinc-800" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Wallet selection */}
      <div className="rounded-md p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Select Wallets
          </span>
          <button
            onClick={toggleAll}
            className="text-[10px] font-semibold uppercase tracking-wider text-[#4f83ff]/70 hover:text-[#4f83ff] transition-colors"
          >
            {bundleConfig.selectedWalletIds.length === wallets.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>

        {wallets.length === 0 ? (
          <div className="text-sm text-zinc-500 text-center py-8">
            No wallets imported yet. Go to Dashboard first.
          </div>
        ) : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {wallets.map((w) => {
              const sel = bundleConfig.selectedWalletIds.includes(w.id);
              const isDev = bundleConfig.devWalletId === w.id;
              return (
                <div
                  key={w.id}
                  onClick={() => toggleWallet(w.id)}
                  className="flex items-center gap-3 p-3 rounded cursor-pointer transition-all duration-150"
                  style={{
                    background: isDev
                      ? "rgba(234,179,8,0.06)"
                      : sel
                      ? "rgba(79,131,255,0.07)"
                      : "rgba(9,9,11,0.5)",
                    border: `1px solid ${
                      isDev
                        ? "rgba(234,179,8,0.4)"
                        : sel
                        ? "rgba(79,131,255,0.35)"
                        : "rgba(63,63,70,0.25)"
                    }`,
                    boxShadow: isDev
                      ? "inset 0 0 20px rgba(234,179,8,0.04)"
                      : sel
                      ? "inset 0 0 20px rgba(79,131,255,0.04)"
                      : "none",
                  }}
                >
                  <Checkbox
                    checked={sel}
                    onCheckedChange={() => toggleWallet(w.id)}
                  />
                  <div
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                    style={{
                      background: w.color,
                      boxShadow: sel ? `0 0 6px ${w.color}` : "none",
                    }}
                  />
                  <span className="font-mono text-sm text-zinc-200 flex-1">
                    {truncateAddress(w.address, 6)}
                  </span>
                  <span
                    className="text-xs font-medium mr-2"
                    style={{ color: sel ? "#4f83ff" : "#71717a" }}
                  >
                    {formatSol(w.solBalance, 4)} SOL
                  </span>
                  {/* Dev wallet selector */}
                  <button
                    onClick={(e) => setDevWallet(e, w.id)}
                    title={isDev ? "Dev wallet" : "Set as dev wallet"}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-all duration-150 flex-shrink-0"
                    style={{
                      background: isDev ? "rgba(234,179,8,0.15)" : "transparent",
                      border: `1px solid ${isDev ? "rgba(234,179,8,0.5)" : "rgba(63,63,70,0.3)"}`,
                      color: isDev ? "#eab308" : "#52525b",
                    }}
                  >
                    <Crown className="h-3 w-3" />
                    {isDev && (
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        Dev
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {bundleConfig.selectedWalletIds.length > 0 && (
          <div
            className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs"
          >
            <span className="text-zinc-500">
              {bundleConfig.selectedWalletIds.length} wallet
              {bundleConfig.selectedWalletIds.length !== 1 ? "s" : ""} selected
            </span>
          </div>
        )}
      </div>

      {/* SOL per wallet + total */}
      <div className="rounded-md px-4 py-3" style={cardStyle}>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 shrink-0">
            SOL / Wallet
          </span>
          <Input
            type="number"
            min={0.001}
            step={0.01}
            value={bundleConfig.solPerWallet}
            onChange={(e) =>
              updateBundleConfig({ solPerWallet: parseFloat(e.target.value) || 0 })
            }
            className="w-28 h-7 text-sm"
          />
          <span className="text-xs text-zinc-500">SOL</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">Total</span>
            <span
              className="text-sm font-bold"
              style={{
                color: totalSol > 0 ? "#4f83ff" : "#52525b",
                textShadow: totalSol > 0 ? "0 0 12px rgba(79,131,255,0.5)" : "none",
              }}
            >
              {formatSol(totalSol, 3)} SOL
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-800/60">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 shrink-0">
            Jito Tip
          </span>
          <Input
            type="number"
            min={0.0001}
            step={0.0005}
            value={bundleConfig.jitoTipSol}
            onChange={(e) =>
              updateBundleConfig({ jitoTipSol: parseFloat(e.target.value) || 0.005 })
            }
            className="w-28 h-7 text-sm"
          />
          <span className="text-xs text-zinc-500">SOL</span>
          <span className="ml-auto text-[10px] text-zinc-600">
            Higher tip = faster landing
          </span>
        </div>
      </div>

      {/* Launch type */}
      <div className="rounded-md p-5" style={cardStyle}>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Launch Mode
        </span>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {LAUNCH_TYPES.map((t) => {
            const selected = bundleConfig.launchType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => updateBundleConfig({ launchType: t.value })}
                className="p-4 rounded text-left transition-all duration-200"
                style={{
                  background: selected ? "rgba(79,131,255,0.08)" : "rgba(9,9,11,0.5)",
                  border: `1px solid ${selected ? "rgba(79,131,255,0.4)" : "rgba(63,63,70,0.25)"}`,
                  boxShadow: selected
                    ? "0 0 14px rgba(79,131,255,0.15), inset 0 0 20px rgba(79,131,255,0.04)"
                    : "none",
                }}
              >
                <div
                  className="mb-2"
                  style={{ color: selected ? "#4f83ff" : "#71717a" }}
                >
                  {t.icon}
                </div>
                <div
                  className="text-sm font-semibold mb-1"
                  style={{ color: selected ? "#e4e4e7" : "#a1a1aa" }}
                >
                  {t.label}
                </div>
                <div className="text-xs text-zinc-500">{t.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Stagger options */}
        {bundleConfig.launchType === "stagger" && (
          <div className="mt-4 space-y-3 pt-4 border-t border-zinc-800">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Stagger Delay</Label>
              <span
                className="text-sm font-bold"
                style={{ color: "#4f83ff", textShadow: "0 0 10px rgba(79,131,255,0.4)" }}
              >
                {bundleConfig.staggerDelayMs}ms
              </span>
            </div>
            <Slider
              min={0}
              max={10000}
              step={100}
              value={[bundleConfig.staggerDelayMs]}
              onValueChange={([v]) => updateBundleConfig({ staggerDelayMs: v })}
            />
            <div className="flex justify-between text-[10px] text-zinc-700">
              <span>Instant</span>
              <span>10s</span>
            </div>

            {bundleConfig.selectedWalletIds.length > 0 && (
              <div
                className="rounded p-3 mt-1"
                style={{ background: "rgba(9,9,11,0.7)", border: "1px solid rgba(63,63,70,0.25)" }}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600 mb-2">
                  Execution Order
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {bundleConfig.selectedWalletIds.map((id, idx) => {
                    const wallet = wallets.find((w) => w.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 text-xs">
                        <span className="text-zinc-700 w-4 text-right font-mono">{idx + 1}</span>
                        <div
                          className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                          style={{ background: wallet?.color || "#6366f1" }}
                        />
                        <span className="font-mono text-zinc-500 flex-1">
                          {truncateAddress(wallet?.address || "", 4)}
                        </span>
                        <span className="text-[#4f83ff]/60 font-mono">
                          +{idx * bundleConfig.staggerDelayMs}ms
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={() => setLaunchStep(1)}>
          ← Back
        </Button>
        <Button size="lg" disabled={!canContinue} onClick={() => setLaunchStep(3)}>
          Settings →
        </Button>
      </div>
    </div>
  );
}
