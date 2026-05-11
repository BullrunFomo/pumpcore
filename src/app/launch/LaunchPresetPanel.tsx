"use client";
import React, { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { useStore } from "@/store";
import type { LaunchPreset } from "@/types";
import LaunchPresetModal from "./LaunchPresetModal";

const cardStyle = {
  background: "rgba(13,17,24,0.8)",
  border: "1px solid rgba(28,38,56,0.8)",
};

export default function LaunchPresetPanel() {
  const presets = useStore((s) => s.bundlePresets);
  const updateBundleConfig = useStore((s) => s.updateBundleConfig);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  const applyPreset = (preset: LaunchPreset) => {
    updateBundleConfig({
      selectedWalletIds: preset.selectedWalletIds,
      devWalletId: preset.devWalletId,
      walletBuyAmounts: preset.walletBuyAmounts,
      jitoTipSol: preset.jitoTipSol,
      launchType: preset.launchType,
      staggerDelayMs: preset.staggerDelayMs,
    });
    setActivePresetId(preset.id);
  };

  return (
    <>
      <div className="rounded-lg px-3 py-3 flex flex-col gap-1.5" style={cardStyle}>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 px-0.5 mb-1">
          Bundle Presets
        </span>

        <div className="flex gap-2 flex-1">
          {[0, 1].map((slot) => {
            const preset = presets[slot];
            const isActive = !!preset && activePresetId === preset.id;

            const toggle = () => {
              if (!preset) return;
              if (isActive) {
                setActivePresetId(null);
              } else {
                applyPreset(preset);
              }
            };

            return (
              <div
                key={slot}
                className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded"
                style={{
                  background: isActive ? "rgba(79,131,255,0.12)" : preset ? "rgba(7,10,18,0.6)" : "rgba(7,10,18,0.3)",
                  border: `1px solid ${isActive ? "rgba(79,131,255,0.4)" : preset ? "rgba(28,38,56,0.9)" : "rgba(28,38,56,0.4)"}`,
                }}
              >
                {/* Checkbox */}
                <div
                  onClick={toggle}
                  className="shrink-0 w-4 h-4 rounded flex items-center justify-center transition-all"
                  style={{
                    background: isActive ? "#4f83ff" : "rgba(28,38,56,0.8)",
                    border: isActive ? "1px solid #4f83ff" : "1px solid rgba(28,38,56,0.9)",
                    cursor: preset ? "pointer" : "default",
                  }}
                >
                  {isActive && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>

                {/* Info — clickable to apply */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={toggle}
                  style={{ cursor: preset ? "pointer" : "default" }}
                >
                  <div
                    className="text-[11px] font-semibold truncate leading-tight"
                    style={{ color: isActive ? "#93b4ff" : preset ? "#a1a1aa" : "#3f3f46" }}
                  >
                    {preset ? preset.name : "Empty slot"}
                  </div>
                </div>

                {/* Edit / create */}
                <button
                  onClick={() => setEditingSlot(slot)}
                  className="shrink-0 p-1 rounded transition-colors"
                  style={{ color: "#3f3f46" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#4f83ff"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#3f3f46"; }}
                  title={preset ? "Edit preset" : "Create preset"}
                >
                  {preset ? <Pencil className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {editingSlot !== null && (
        <LaunchPresetModal
          slot={editingSlot}
          existing={presets[editingSlot] ?? null}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </>
  );
}
