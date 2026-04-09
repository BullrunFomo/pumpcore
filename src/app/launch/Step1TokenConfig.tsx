"use client";
import React, { useRef, useState } from "react";
import { Upload, X, Flame, Coins, Bot, Send } from "lucide-react";
import { useStore } from "@/store";
import { Button } from "@/components/ui/button";
import type { TokenType } from "@/types";

const NAME_MAX = 32;
const SYMBOL_MAX = 13;

const TOKEN_TYPES: {
  value: TokenType;
  label: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  glow: string;
}[] = [
  {
    value: "Standard",
    label: "Standard",
    desc: "Classic PumpFun token launch",
    icon: <Send className="h-5 w-5" />,
    color: "#a1a1aa",
    glow: "rgba(161,161,170,0.2)",
  },
  {
    value: "Mayhem Mode",
    label: "Mayhem Mode",
    desc: "Max volatility, community-driven pump",
    icon: <Flame className="h-5 w-5" />,
    color: "#ff4f4f",
    glow: "rgba(255,79,79,0.25)",
  },
  {
    value: "Cashback",
    label: "Cashback",
    desc: "Holders earn SOL on every trade",
    icon: <Coins className="h-5 w-5" />,
    color: "#4fff91",
    glow: "rgba(79,255,145,0.2)",
  },
  {
    value: "Agent",
    label: "AI Agent",
    desc: "Autonomous AI-powered trading",
    icon: <Bot className="h-5 w-5" />,
    color: "#4f83ff",
    glow: "rgba(79,131,255,0.25)",
  },
];


function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-medium text-zinc-200">
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
          {!required && (
            <span className="text-[#4f83ff] text-xs font-normal ml-1">(optional)</span>
          )}
        </label>
        {hint && <span className="text-xs text-zinc-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Step1TokenConfig() {
  const tokenConfig = useStore((s) => s.launch.tokenConfig);
  const updateTokenConfig = useStore((s) => s.updateTokenConfig);
  const setLaunchStep = useStore((s) => s.setLaunchStep);
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string>(tokenConfig.logoUri);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setPreview(dataUrl);
      updateTokenConfig({ logoFile: file, logoUri: dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  };

  const canContinue = tokenConfig.name.trim() && tokenConfig.symbol.trim();

  const inputCls =
    "w-full rounded bg-[rgba(9,9,11,0.6)] border border-zinc-700/70 text-zinc-200 text-sm px-3 py-2.5 outline-none transition-colors placeholder:text-zinc-600 focus:border-zinc-500";

  return (
    <div className="space-y-4">
      <div
        className="rounded-md p-5 space-y-4"
        style={{ background: "rgba(18,18,20,0.9)", border: "1px solid rgba(63,63,70,0.25)" }}
      >
        {/* Name + Symbol row */}
        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Project Name"
            required
            hint={`${tokenConfig.name.length}/${NAME_MAX}`}
          >
            <input
              className={inputCls}
              placeholder="Proxima Industry"
              value={tokenConfig.name}
              maxLength={NAME_MAX}
              onChange={(e) => updateTokenConfig({ name: e.target.value })}
            />
          </Field>
          <Field
            label="Symbol"
            required
            hint={`${tokenConfig.symbol.length}/${SYMBOL_MAX}`}
          >
            <input
              className={inputCls}
              placeholder="$PXM"
              value={tokenConfig.symbol}
              maxLength={SYMBOL_MAX}
              onChange={(e) => updateTokenConfig({ symbol: e.target.value.toUpperCase() })}
            />
          </Field>
        </div>

        {/* Image + Preview */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-sm font-medium text-zinc-200">
              Image<span className="text-red-400 ml-0.5">*</span>
            </label>
            {preview && (
              <span className="text-xs text-zinc-600 uppercase tracking-wider">Preview</span>
            )}
          </div>
          <div className="flex gap-3">
            {/* Drop zone */}
            <div
              className="flex-1 rounded flex flex-col items-center justify-center gap-2 py-5 cursor-pointer transition-all"
              style={{
                background: dragOver
                  ? "rgba(79,131,255,0.06)"
                  : "rgba(9,9,11,0.5)",
                border: `1px solid ${dragOver ? "rgba(79,131,255,0.4)" : "rgba(63,63,70,0.25)"}`,
              }}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <Upload className="h-5 w-5 text-zinc-500" />
              <div className="text-center">
                <p className="text-sm text-zinc-400">
                  Drag & Drop or{" "}
                  <span className="text-[#4f83ff]">Choose file</span>{" "}
                  to upload
                </p>
                <p className="text-xs text-zinc-600 mt-0.5">.jpg or .png (Max 2 MB)</p>
              </div>
            </div>

            {/* Preview box */}
            {preview && (
              <div className="relative flex-shrink-0">
                <img
                  src={preview}
                  alt="preview"
                  className="h-full w-28 object-cover rounded"
                  style={{ border: "1px solid rgba(63,63,70,0.25)", minHeight: "100px" }}
                />
                <button
                  className="absolute top-1 right-1 rounded-full bg-black/70 p-0.5 text-zinc-400 hover:text-red-400 transition-colors"
                  onClick={() => {
                    setPreview("");
                    updateTokenConfig({ logoFile: null, logoUri: "" });
                  }}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>

        {/* Socials row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="X/ Twitter">
            <input
              className={inputCls}
              placeholder="x.com/proxima"
              value={tokenConfig.twitter}
              onChange={(e) => updateTokenConfig({ twitter: e.target.value })}
            />
          </Field>
          <Field label="Telegram">
            <input
              className={inputCls}
              placeholder="t.me/proxima"
              value={tokenConfig.telegram}
              onChange={(e) => updateTokenConfig({ telegram: e.target.value })}
            />
          </Field>
          <Field label="Website">
            <input
              className={inputCls}
              placeholder="proxima.io"
              value={tokenConfig.website}
              onChange={(e) => updateTokenConfig({ website: e.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Token Type */}
      <div
        className="rounded-md p-5"
        style={{ background: "rgba(18,18,20,0.9)", border: "1px solid rgba(63,63,70,0.25)" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px flex-1 bg-zinc-800" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
            Token Type
          </span>
          <div className="h-px flex-1 bg-zinc-800" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOKEN_TYPES.map((t) => {
            const selected = tokenConfig.tokenType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => updateTokenConfig({ tokenType: t.value })}
                className="p-4 rounded text-left transition-all duration-200"
                style={{
                  background: selected ? `rgba(${hexToRgb(t.color)},0.08)` : "rgba(9,9,11,0.5)",
                  border: `1px solid ${selected ? t.color + "60" : "rgba(63,63,70,0.25)"}`,
                  boxShadow: selected ? `0 0 16px ${t.glow}` : "none",
                }}
              >
                <div className="mb-2.5" style={{ color: selected ? t.color : "#71717a" }}>
                  {t.icon}
                </div>
                <div
                  className="text-sm font-semibold mb-1"
                  style={{ color: selected ? t.color : "#d4d4d8" }}
                >
                  {t.label}
                </div>
                <div className="text-xs text-zinc-500">{t.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button size="lg" disabled={!canContinue} onClick={() => setLaunchStep(2)}>
          Bundle Config →
        </Button>
      </div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}
