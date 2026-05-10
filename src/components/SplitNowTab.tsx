"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Copy, Check, Loader2, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import type { WalletInfo } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnAsset {
  assetId: string;
  networkId: string;
  symbol: string;
  displayName: string;
  networkName: string;
  limits: { min: number; max: number };
  status?: { send: boolean; receive: boolean };
}

interface Exchanger {
  id: string;
  name: string;
  logoPath?: string;
}

interface WalletOrder {
  walletId: string;
  walletAddress: string;
  walletColor: string;
  fromAmount: number;
  exchangerName?: string;
  orderId?: string;
  depositAddress?: string;
  toAmount?: number;
  orderStatus: string;
  phase: "pending" | "creating" | "ready" | "error";
  error?: string;
}

type TabPhase = "config" | "creating" | "done";

const TERMINAL = new Set(["completed", "done", "failed", "expired", "refunded"]);

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  waiting:    { label: "Waiting",    color: "#93b4ff" },
  pending:    { label: "Waiting",    color: "#93b4ff" },
  processing: { label: "Processing", color: "#fbbf24" },
  exchanging: { label: "Exchanging", color: "#fbbf24" },
  sending:    { label: "Sending",    color: "#fbbf24" },
  completed:  { label: "Completed",  color: "#4ade80" },
  done:       { label: "Completed",  color: "#4ade80" },
  failed:     { label: "Failed",     color: "#f87171" },
  expired:    { label: "Expired",    color: "#71717a" },
  refunded:   { label: "Refunded",   color: "#fb923c" },
};

const DELAY_MAX = 600; // 10 minutes
const DELAY_STEP = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDelay(s: number): string {
  if (s === 0) return "none";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r === 0 ? `${m}m` : `${m}m ${r}s`;
}

function randomBetween(min: number, max: number): number {
  const v = min + Math.random() * (max - min);
  return Math.round(v * 10000) / 10000;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  wallets: WalletInfo[];
}

export default function SplitNowTab({ wallets }: Props) {
  // Bootstrap data
  const [assets, setAssets] = useState<SnAsset[]>([]);
  const [exchangers, setExchangers] = useState<Exchanger[]>([]);
  const [bootstrapping, setBootstrapping] = useState(true);

  // Config
  const [fromAsset, setFromAsset] = useState<SnAsset | null>(null);
  const [selectedExchangerIds, setSelectedExchangerIds] = useState<Set<string>>(new Set());
  const [amountMode, setAmountMode] = useState<"fixed" | "range">("fixed");
  const [fixedAmount, setFixedAmount] = useState("");
  const [rangeMin, setRangeMin] = useState("");
  const [rangeMax, setRangeMax] = useState("");
  const [delaySeconds, setDelaySeconds] = useState(0);
  const [selectedWalletIds, setSelectedWalletIds] = useState<Set<string>>(new Set());

  // Phase
  const [phase, setPhase] = useState<TabPhase>("config");
  const [walletOrders, setWalletOrders] = useState<WalletOrder[]>([]);
  const [error, setError] = useState("");

  // Per-wallet copy state
  const [copiedMap, setCopiedMap] = useState<Record<string, boolean>>({});

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ordersRef = useRef<WalletOrder[]>([]);
  ordersRef.current = walletOrders;

  useEffect(() => {
    setSelectedWalletIds(new Set(wallets.map((w) => w.id)));
  }, [wallets]);

  useEffect(() => {
    bootstrap();
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bootstrap() {
    setBootstrapping(true);
    const [assetsRes, exchRes] = await Promise.allSettled([
      fetch("/api/splitnow/assets").then((r) => r.json()),
      fetch("/api/splitnow/exchangers").then((r) => r.json()),
    ]);
    if (assetsRes.status === "fulfilled") {
      const list: SnAsset[] = (assetsRes.value.assets ?? []).filter(
        (a: SnAsset) =>
          a.assetId !== "sol" &&
          a.networkId === "solana" &&
          a.status?.send !== false
      );
      setAssets(list);
      setFromAsset(list.find((a) => a.assetId === "usdc") ?? list.find((a) => a.assetId === "usdt") ?? list[0] ?? null);
    }
    if (exchRes.status === "fulfilled") {
      setExchangers(exchRes.value.exchangers ?? []);
    }
    setBootstrapping(false);
  }

  // ─── Wallet selection ────────────────────────────────────────────────────────

  const toggleWallet = (id: string) =>
    setSelectedWalletIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAllWallets = () =>
    setSelectedWalletIds((prev) => prev.size === wallets.length ? new Set() : new Set(wallets.map((w) => w.id)));

  // ─── CEX selection ───────────────────────────────────────────────────────────

  const toggleExchanger = (id: string) =>
    setSelectedExchangerIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const toggleAllExchangers = () =>
    setSelectedExchangerIds((prev) => prev.size === exchangers.length ? new Set() : new Set(exchangers.map((e) => e.id)));

  // ─── Validation ─────────────────────────────────────────────────────────────

  const fixedNum = parseFloat(fixedAmount);
  const rangeMinNum = parseFloat(rangeMin);
  const rangeMaxNum = parseFloat(rangeMax);

  const amountValid =
    amountMode === "fixed"
      ? !isNaN(fixedNum) && fixedNum > 0 &&
        (!fromAsset || (fixedNum >= fromAsset.limits.min && fixedNum <= fromAsset.limits.max))
      : !isNaN(rangeMinNum) && !isNaN(rangeMaxNum) &&
        rangeMinNum > 0 && rangeMaxNum > rangeMinNum &&
        (!fromAsset || (rangeMinNum >= fromAsset.limits.min && rangeMaxNum <= fromAsset.limits.max));

  const canCreate = !bootstrapping && !!fromAsset && amountValid && selectedWalletIds.size > 0 && phase === "config";

  // ─── Order creation ─────────────────────────────────────────────────────────

  async function handleCreate() {
    if (!canCreate || !fromAsset) return;
    setError("");

    const exchangerPool =
      selectedExchangerIds.size === 0 || selectedExchangerIds.size === exchangers.length
        ? [] // best rate — don't pin to any exchanger
        : Array.from(selectedExchangerIds);

    const selected = wallets.filter((w) => selectedWalletIds.has(w.id));
    const initialOrders: WalletOrder[] = selected.map((w) => {
      const pickedId = exchangerPool.length > 0 ? pickRandom(exchangerPool) : undefined;
      const pickedName = pickedId ? exchangers.find((e) => e.id === pickedId)?.name : undefined;
      return {
        walletId: w.id,
        walletAddress: w.address,
        walletColor: w.color,
        fromAmount: amountMode === "fixed" ? fixedNum : randomBetween(rangeMinNum, rangeMaxNum),
        exchangerName: pickedName,
        orderStatus: "",
        phase: "pending" as const,
        ...(pickedId ? { _exchangerId: pickedId } : {}),
      };
    });

    // store picked exchangerIds separately for use during loop
    const pickedIds: (string | undefined)[] = selected.map((_, i) => {
      if (exchangerPool.length === 0) return undefined;
      return (initialOrders[i] as WalletOrder & { _exchangerId?: string })._exchangerId;
    });

    setWalletOrders(initialOrders);
    setPhase("creating");

    const results: WalletOrder[] = initialOrders.map((o) => ({ ...o }));

    for (let i = 0; i < results.length; i++) {
      results[i] = { ...results[i], phase: "creating" };
      setWalletOrders([...results]);

      try {
        const body: Record<string, unknown> = {
          fromAssetId: fromAsset.assetId,
          fromNetworkId: fromAsset.networkId,
          toAssetId: "sol",
          toNetworkId: "solana",
          fromAmount: results[i].fromAmount,
          toAddress: results[i].walletAddress,
        };
        if (pickedIds[i]) body.exchangerId = pickedIds[i];

        const res = await fetch("/api/splitnow/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? data.message ?? "Order failed");

        const ord = data.order ?? data;
        results[i] = {
          ...results[i],
          phase: "ready",
          orderId: ord.id,
          depositAddress: ord.depositAddress,
          toAmount: ord.toAmount,
          orderStatus: ord.status ?? "waiting",
        };
      } catch (err: unknown) {
        results[i] = {
          ...results[i],
          phase: "error",
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }

      setWalletOrders([...results]);

      if (delaySeconds > 0 && i < results.length - 1) {
        await sleep(delaySeconds * 1000);
      }
    }

    setPhase("done");
    pollRef.current = setInterval(pollAllOrders, 15_000);
  }

  const pollAllOrders = useCallback(async () => {
    const current = ordersRef.current;
    const toCheck = current.filter((o) => o.orderId && !TERMINAL.has(o.orderStatus));
    if (toCheck.length === 0) {
      if (pollRef.current) clearInterval(pollRef.current);
      return;
    }
    const updates = await Promise.allSettled(
      toCheck.map((o) => fetch(`/api/splitnow/order/${o.orderId}`).then((r) => r.json()))
    );
    setWalletOrders((prev) => {
      const next = [...prev];
      toCheck.forEach((o, idx) => {
        const res = updates[idx];
        if (res.status !== "fulfilled") return;
        const status: string = (res.value.order ?? res.value).status ?? o.orderStatus;
        const pos = next.findIndex((x) => x.orderId === o.orderId);
        if (pos !== -1) next[pos] = { ...next[pos], orderStatus: status };
      });
      return next;
    });
  }, []);

  function copyDeposit(walletId: string, addr: string) {
    navigator.clipboard.writeText(addr);
    setCopiedMap((p) => ({ ...p, [walletId]: true }));
    setTimeout(() => setCopiedMap((p) => ({ ...p, [walletId]: false })), 2000);
  }

  function copyAll() {
    const text = walletOrders
      .filter((o) => o.depositAddress)
      .map((o) => `${o.walletAddress} → ${o.depositAddress}`)
      .join("\n");
    navigator.clipboard.writeText(text);
  }

  const readyCount = walletOrders.filter((o) => o.phase === "ready").length;
  const errorCount = walletOrders.filter((o) => o.phase === "error").length;

  // ─── CEX label ──────────────────────────────────────────────────────────────

  const cexLabel =
    selectedExchangerIds.size === 0 || selectedExchangerIds.size === exchangers.length
      ? "Best Rate"
      : selectedExchangerIds.size === 1
        ? exchangers.find((e) => selectedExchangerIds.has(e.id))?.name ?? "1 CEX"
        : `${selectedExchangerIds.size} CEXes`;

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (bootstrapping) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-zinc-600" />
      </div>
    );
  }

  // ─── Config ──────────────────────────────────────────────────────────────────

  if (phase === "config") {
    return (
      <div className="space-y-3">

        {/* Asset row */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            From Asset
          </label>
          {assets.length <= 1 ? (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <span className="text-xs font-semibold text-zinc-200">{fromAsset?.symbol.toUpperCase() ?? "—"}</span>
              <span className="text-[10px] text-zinc-600">Solana</span>
            </div>
          ) : (
            <div className="relative">
              <select
                value={fromAsset ? `${fromAsset.assetId}::${fromAsset.networkId}` : ""}
                onChange={(e) => {
                  const [aId, nId] = e.target.value.split("::");
                  setFromAsset(assets.find((a) => a.assetId === aId && a.networkId === nId) ?? null);
                }}
                className="w-full rounded-lg pl-3 pr-7 py-2 text-xs font-medium appearance-none"
                style={{
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#a1a1aa",
                  outline: "none",
                }}
              >
                {assets.map((a) => (
                  <option key={`${a.assetId}-${a.networkId}`} value={`${a.assetId}::${a.networkId}`} style={{ background: "#0a0a0f" }}>
                    {a.symbol.toUpperCase()} · Solana
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </div>
          )}
        </div>

        {/* CEX multi-select */}
        {exchangers.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">CEX</label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] tabular-nums" style={{ color: "#93b4ff" }}>{cexLabel}</span>
                <button
                  onClick={toggleAllExchangers}
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: selectedExchangerIds.size === exchangers.length || selectedExchangerIds.size === 0 ? "#71717a" : "#93b4ff" }}
                >
                  {selectedExchangerIds.size === 0 ? "Pick specific" : selectedExchangerIds.size === exchangers.length ? "Clear" : "Select all"}
                </button>
              </div>
            </div>
            <div className="max-h-28 overflow-y-auto no-scrollbar space-y-1">
              {exchangers.map((ex) => {
                const sel = selectedExchangerIds.has(ex.id);
                return (
                  <button
                    key={ex.id}
                    onClick={() => toggleExchanger(ex.id)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all text-left"
                    style={{
                      background: sel ? "rgba(79,131,255,0.07)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${sel ? "rgba(79,131,255,0.15)" : "transparent"}`,
                    }}
                  >
                    <span className="text-[11px] flex-1" style={{ color: sel ? "#a1a1aa" : "#52525b" }}>{ex.name}</span>
                    {sel
                      ? <Check className="h-3 w-3 shrink-0" style={{ color: "#4f83ff" }} />
                      : <Circle className="h-3 w-3 shrink-0" style={{ color: "#3f3f46" }} />
                    }
                  </button>
                );
              })}
            </div>
            {selectedExchangerIds.size > 1 && (
              <p className="text-[10px] text-zinc-600">
                Each wallet order will be routed through a randomly chosen CEX from your selection.
              </p>
            )}
          </div>
        )}

        {/* Amount mode */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Amount per Wallet ({fromAsset?.symbol.toUpperCase() ?? "—"})
          </label>
          <div
            className="flex rounded-lg p-0.5 gap-0.5"
            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            {(["fixed", "range"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setAmountMode(mode)}
                className="flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all"
                style={{
                  background: amountMode === mode
                    ? "linear-gradient(135deg, rgba(79,131,255,0.18), rgba(139,92,246,0.12))"
                    : "transparent",
                  border: amountMode === mode ? "1px solid rgba(79,131,255,0.3)" : "1px solid transparent",
                  color: amountMode === mode ? "#93b4ff" : "#52525b",
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {amountMode === "fixed" ? (
            <input
              type="number"
              placeholder={fromAsset ? `${fromAsset.limits.min} – ${fromAsset.limits.max}` : "Amount"}
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs font-mono"
              style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", outline: "none" }}
            />
          ) : (
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="Min"
                value={rangeMin}
                onChange={(e) => setRangeMin(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-mono"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", outline: "none" }}
              />
              <span className="text-zinc-600 text-xs shrink-0">→</span>
              <input
                type="number"
                placeholder="Max"
                value={rangeMax}
                onChange={(e) => setRangeMax(e.target.value)}
                className="flex-1 rounded-lg px-3 py-2 text-xs font-mono"
                style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.08)", color: "#e4e4e7", outline: "none" }}
              />
            </div>
          )}
          {fromAsset && (
            <p className="text-[10px] text-zinc-600">
              Limits: {fromAsset.limits.min} – {fromAsset.limits.max} {fromAsset.symbol.toUpperCase()}
            </p>
          )}
        </div>

        {/* Delay slider */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Delay</span>
          <Slider
            min={0}
            max={DELAY_MAX}
            step={DELAY_STEP}
            value={[delaySeconds]}
            onValueChange={([v]) => setDelaySeconds(v)}
            className="flex-1"
          />
          <span className="text-xs font-semibold tabular-nums w-12 text-right shrink-0" style={{ color: "#4f83ff" }}>
            {formatDelay(delaySeconds)}
          </span>
        </div>

        {/* Wallet selection */}
        {wallets.length > 0 ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Wallets to Fund</label>
              <button
                onClick={toggleAllWallets}
                className="text-[10px] font-medium transition-colors"
                style={{ color: selectedWalletIds.size === wallets.length ? "#71717a" : "#93b4ff" }}
              >
                {selectedWalletIds.size === wallets.length ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">
              {wallets.map((w) => {
                const sel = selectedWalletIds.has(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWallet(w.id)}
                    className="w-full flex items-center gap-3 px-3 py-1.5 rounded-lg transition-all text-left"
                    style={{
                      background: sel ? "rgba(79,131,255,0.07)" : "rgba(0,0,0,0.2)",
                      border: `1px solid ${sel ? "rgba(79,131,255,0.15)" : "transparent"}`,
                    }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: sel ? w.color : "#3f3f46" }} />
                    <span className="font-mono text-[11px] flex-1" style={{ color: sel ? "#a1a1aa" : "#52525b" }}>
                      {truncateAddress(w.address, 4)}
                    </span>
                    {sel
                      ? <Check className="h-3 w-3 shrink-0" style={{ color: "#4f83ff" }} />
                      : <Circle className="h-3 w-3 shrink-0" style={{ color: "#3f3f46" }} />
                    }
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
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
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400"
            style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.18)" }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={!canCreate}
          className="w-full py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
          style={{
            background: canCreate ? "linear-gradient(135deg, rgba(79,131,255,0.25), rgba(139,92,246,0.2))" : "rgba(79,131,255,0.04)",
            border: `1px solid ${canCreate ? "rgba(79,131,255,0.5)" : "rgba(79,131,255,0.1)"}`,
            color: canCreate ? "#93b4ff" : "#3f3f56",
            boxShadow: canCreate ? "0 0 20px rgba(79,131,255,0.12)" : "none",
            cursor: canCreate ? "pointer" : "not-allowed",
          }}
        >
          Create {selectedWalletIds.size > 0 ? selectedWalletIds.size : ""} Order{selectedWalletIds.size !== 1 ? "s" : ""}
        </button>
      </div>
    );
  }

  // ─── Creating ────────────────────────────────────────────────────────────────

  if (phase === "creating") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-1">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" style={{ color: "#4f83ff" }} />
          <div>
            <p className="text-xs font-semibold text-zinc-200">Creating orders…</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">
              {readyCount + errorCount} of {walletOrders.length} done
              {delaySeconds > 0 && <span> · {formatDelay(delaySeconds)} delay</span>}
            </p>
          </div>
        </div>
        <div className="space-y-1 max-h-52 overflow-y-auto no-scrollbar">
          {walletOrders.map((o) => (
            <div
              key={o.walletId}
              className="flex items-center gap-3 px-3 py-2 rounded-lg"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: "1px solid rgba(255,255,255,0.04)",
                opacity: o.phase === "pending" ? 0.4 : 1,
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.walletColor }} />
              <span className="font-mono text-[11px] flex-1 text-zinc-400">{truncateAddress(o.walletAddress, 4)}</span>
              {o.exchangerName && (
                <span className="text-[10px] text-zinc-600 shrink-0">{o.exchangerName}</span>
              )}
              <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                {o.fromAmount} {fromAsset?.symbol.toUpperCase()}
              </span>
              <div className="shrink-0">
                {o.phase === "creating" && <Loader2 className="h-3 w-3 animate-spin" style={{ color: "#4f83ff" }} />}
                {o.phase === "ready" && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                {o.phase === "error" && <AlertCircle className="h-3 w-3 text-red-400" />}
                {o.phase === "pending" && <Circle className="h-3 w-3 text-zinc-700" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Done ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      <div
        className="rounded-lg px-4 py-3 flex items-center justify-between"
        style={{
          background: errorCount === 0 ? "rgba(74,222,128,0.04)" : "rgba(248,113,113,0.04)",
          border: `1px solid ${errorCount === 0 ? "rgba(74,222,128,0.15)" : "rgba(248,113,113,0.2)"}`,
        }}
      >
        <div>
          <p className="text-xs font-semibold text-zinc-200">
            {readyCount} order{readyCount !== 1 ? "s" : ""} created
            {errorCount > 0 && <span className="text-red-400 ml-1.5">· {errorCount} failed</span>}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5">
            Send {fromAsset?.symbol.toUpperCase()} to each deposit address below
          </p>
        </div>
        {readyCount > 1 && (
          <button
            onClick={copyAll}
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: "#4f83ff" }}
            title="Copy all: wallet → deposit address"
          >
            <Copy className="h-3 w-3" />
            Copy all
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto no-scrollbar">
        {walletOrders.map((o) => {
          const statusInfo = ORDER_STATUS_LABELS[o.orderStatus] ?? { label: o.orderStatus || "—", color: "#93b4ff" };
          const copied = copiedMap[o.walletId] ?? false;
          return (
            <div
              key={o.walletId}
              className="rounded-lg p-3 space-y-2"
              style={{
                background: "rgba(0,0,0,0.25)",
                border: o.phase === "error" ? "1px solid rgba(248,113,113,0.15)" : "1px solid rgba(255,255,255,0.05)",
              }}
            >
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: o.walletColor }} />
                <span className="font-mono text-[11px] text-zinc-400 flex-1">{truncateAddress(o.walletAddress, 5)}</span>
                {o.exchangerName && (
                  <span className="text-[9px] text-zinc-600 shrink-0">{o.exchangerName}</span>
                )}
                {o.toAmount != null && (
                  <span className="text-[11px] tabular-nums font-semibold shrink-0" style={{ color: "#4ade80" }}>
                    ~{o.toAmount.toFixed(4)} SOL
                  </span>
                )}
                {o.phase === "ready" && o.orderStatus && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0"
                    style={{ background: `${statusInfo.color}18`, color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}
                  >
                    {statusInfo.label}
                  </span>
                )}
                {o.phase === "error" && (
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded text-red-400 shrink-0"
                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)" }}
                  >
                    Failed
                  </span>
                )}
              </div>

              {o.phase === "ready" && o.depositAddress ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] text-zinc-600 block mb-0.5">
                      Send {o.fromAmount} {fromAsset?.symbol.toUpperCase()} to:
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400 break-all leading-relaxed">
                      {o.depositAddress}
                    </span>
                  </div>
                  <button
                    onClick={() => copyDeposit(o.walletId, o.depositAddress!)}
                    className="shrink-0 p-1.5 rounded transition-all"
                    style={{
                      background: copied ? "rgba(74,222,128,0.1)" : "rgba(79,131,255,0.08)",
                      border: `1px solid ${copied ? "rgba(74,222,128,0.3)" : "rgba(79,131,255,0.15)"}`,
                    }}
                  >
                    {copied
                      ? <Check className="h-3 w-3 text-green-400" />
                      : <Copy className="h-3 w-3" style={{ color: "#93b4ff" }} />
                    }
                  </button>
                </div>
              ) : o.phase === "error" ? (
                <p className="text-[10px] text-red-400 break-words">{o.error}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => {
          if (pollRef.current) clearInterval(pollRef.current);
          setPhase("config");
          setWalletOrders([]);
          setCopiedMap({});
          setError("");
        }}
        className="w-full py-2 rounded-lg text-xs font-medium transition-all"
        style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.15)", color: "#4f83ff" }}
      >
        New Round
      </button>
    </div>
  );
}
