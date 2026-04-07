"use client";
import React from "react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Timer, TrendingUp, Shield, AlertTriangle } from "lucide-react";
import type { AutoSellMode, SniperAction } from "@/types";

export default function Step3OptionalSettings() {
  const autoSell = useStore((s) => s.launch.autoSell);
  const sniperGuard = useStore((s) => s.launch.sniperGuard);
  const updateAutoSell = useStore((s) => s.updateAutoSell);
  const updateSniperGuard = useStore((s) => s.updateSniperGuard);
  const setLaunchStep = useStore((s) => s.setLaunchStep);

  const cardStyle = {
    background: "rgba(24,24,27,0.8)",
    border: "1px solid rgba(63,63,70,0.25)",
  };

  return (
    <div className="space-y-4">
      {/* Auto-Sell */}
      <div className="rounded-md overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: autoSell.enabled ? "rgba(79,131,255,0.12)" : "rgba(39,39,42,0.8)",
                border: `1px solid ${autoSell.enabled ? "rgba(79,131,255,0.3)" : "rgba(63,63,70,0.25)"}`,
              }}
            >
              <Timer
                className="h-4 w-4"
                style={{ color: autoSell.enabled ? "#4f83ff" : "#71717a" }}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Auto-Sell</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Sell positions automatically post-launch
              </p>
            </div>
          </div>
          <Switch
            checked={autoSell.enabled}
            onCheckedChange={(v) => updateAutoSell({ enabled: v })}
          />
        </div>

        {autoSell.enabled && (
          <div
            className="px-5 pb-5 pt-0 space-y-4 border-t"
            style={{ borderColor: "rgba(63,63,70,0.25)" }}
          >
            <div className="grid grid-cols-2 gap-3 pt-4">
              {(
                [
                  {
                    mode: "time" as AutoSellMode,
                    icon: <Timer className="h-3.5 w-3.5" />,
                    label: "Time-based",
                    desc: "Sell after X seconds",
                  },
                  {
                    mode: "mcap" as AutoSellMode,
                    icon: <TrendingUp className="h-3.5 w-3.5" />,
                    label: "MCap-based",
                    desc: "Sell at target market cap",
                  },
                ] as const
              ).map((opt) => {
                const sel = autoSell.mode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    onClick={() => updateAutoSell({ mode: opt.mode })}
                    className="p-3.5 rounded text-left transition-all duration-150"
                    style={{
                      background: sel ? "rgba(79,131,255,0.08)" : "rgba(9,9,11,0.5)",
                      border: `1px solid ${sel ? "rgba(79,131,255,0.4)" : "rgba(63,63,70,0.25)"}`,
                      boxShadow: sel ? "0 0 12px rgba(79,131,255,0.12)" : "none",
                    }}
                  >
                    <div
                      className="mb-2"
                      style={{ color: sel ? "#4f83ff" : "#71717a" }}
                    >
                      {opt.icon}
                    </div>
                    <div
                      className="text-xs font-semibold mb-0.5"
                      style={{ color: sel ? "#e4e4e7" : "#a1a1aa" }}
                    >
                      {opt.label}
                    </div>
                    <div className="text-[10px] text-zinc-600">{opt.desc}</div>
                  </button>
                );
              })}
            </div>

            {autoSell.mode === "time" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Seconds after launch</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={autoSell.timeSeconds}
                    onChange={(e) =>
                      updateAutoSell({ timeSeconds: parseInt(e.target.value) || 0 })
                    }
                    className="w-28"
                  />
                  <span className="text-xs text-zinc-500">
                    ≈ {(autoSell.timeSeconds / 60).toFixed(1)} minutes
                  </span>
                </div>
              </div>
            )}

            {autoSell.mode === "mcap" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Market Cap Target (USD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500 text-sm">$</span>
                  <Input
                    type="number"
                    min={0}
                    value={autoSell.mcapTarget}
                    onChange={(e) =>
                      updateAutoSell({ mcapTarget: parseFloat(e.target.value) || 0 })
                    }
                    className="w-40"
                  />
                </div>
                <p className="text-[10px] text-zinc-600">
                  Triggers sell when MCap reaches ${autoSell.mcapTarget.toLocaleString()}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sniper Guard */}
      <div className="rounded-md overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: sniperGuard.enabled ? "rgba(255,79,79,0.1)" : "rgba(39,39,42,0.8)",
                border: `1px solid ${sniperGuard.enabled ? "rgba(255,79,79,0.3)" : "rgba(63,63,70,0.25)"}`,
              }}
            >
              <Shield
                className="h-4 w-4"
                style={{ color: sniperGuard.enabled ? "#ff6060" : "#71717a" }}
              />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Sniper Guard</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Protect against external volume spikes
              </p>
            </div>
          </div>
          <Switch
            checked={sniperGuard.enabled}
            onCheckedChange={(v) => updateSniperGuard({ enabled: v })}
          />
        </div>

        {sniperGuard.enabled && (
          <div
            className="px-5 pb-5 pt-0 space-y-4 border-t"
            style={{ borderColor: "rgba(63,63,70,0.25)" }}
          >
            <div
              className="flex items-start gap-2 mt-4 p-3 rounded text-xs"
              style={{
                background: "rgba(255,150,50,0.06)",
                border: "1px solid rgba(255,150,50,0.2)",
              }}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500/70 flex-shrink-0 mt-0.5" />
              <span className="text-amber-600/80">
                Monitors on-chain logs during launch. Triggers when external buy volume exceeds the threshold.
              </span>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">SOL Threshold</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0.1}
                  step={0.5}
                  value={sniperGuard.solThreshold}
                  onChange={(e) =>
                    updateSniperGuard({ solThreshold: parseFloat(e.target.value) || 0 })
                  }
                  className="w-28"
                />
                <span className="text-sm text-zinc-500">SOL</span>
              </div>
              <p className="text-[10px] text-zinc-600">
                Trigger if external buys exceed {sniperGuard.solThreshold} SOL
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Action on Trigger</Label>
              <Select
                value={sniperGuard.action}
                onValueChange={(v) => updateSniperGuard({ action: v as SniperAction })}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stop">Stop Buying</SelectItem>
                  <SelectItem value="sell-all">Sell All Wallets</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-zinc-600">
                {sniperGuard.action === "stop"
                  ? "Halt remaining wallet buys in queue"
                  : "Immediately liquidate all positions"}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={() => setLaunchStep(2)}>
          ← Back
        </Button>
        <Button size="lg" onClick={() => setLaunchStep(4)}>
          Review & Launch →
        </Button>
      </div>
    </div>
  );
}
