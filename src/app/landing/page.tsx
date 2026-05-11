"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Rocket, Zap, Shield, ArrowRight, ChevronDown, ChevronUp, Layers, Target,
  TrendingUp, TrendingDown, Wallet, Activity, ExternalLink, Sparkles, ArrowDown,
  Coins, ArrowDownToLine, BookImage, Globe, Search, Shuffle, Crown, Flame,
  Plus, SlidersHorizontal,
} from "lucide-react";

/* ─────────────────────────── helpers ─────────────────────────── */

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded"
        style={{ background: "rgba(79,131,255,0.08)", border: "1px solid rgba(79,131,255,0.2)", color: "#4f83ff" }}>
        {index}
      </span>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">{label}</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-3 p-5 rounded-lg transition-all duration-300"
      style={{ background: "rgba(13,17,24,0.6)", border: "1px solid rgba(28,38,56,0.8)" }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(79,131,255,0.25)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(13,17,24,0.9)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(28,38,56,0.8)";
        (e.currentTarget as HTMLDivElement).style.background = "rgba(13,17,24,0.6)";
      }}
    >
      <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}>
        <Icon className="w-4 h-4" style={{ color: "#4f83ff" }} />
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100 mb-1">{title}</p>
        <p className="text-xs text-zinc-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function useCountUp(target: number, duration = 1600) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      setValue(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function AnimatedStatCard({ target, label, prefix = "", suffix = "", decimals = 0, showDivider = false }: {
  target: number; label: string; prefix?: string; suffix?: string; decimals?: number; showDivider?: boolean;
}) {
  const value = useCountUp(target);
  return (
    <div className="relative flex flex-col items-center justify-center py-7 px-4 gap-1.5"
      style={{ background: "rgba(10,13,20,0.97)" }}>
      {showDivider && (
        <div className="hidden sm:block absolute left-0 top-4 bottom-4 w-px"
          style={{ background: "rgba(79,131,255,0.14)" }} />
      )}
      <span className="text-2xl sm:text-3xl font-bold tracking-tight"
        style={{ color: "#4f83ff", textShadow: "0 0 24px rgba(79,131,255,0.4)" }}>
        {prefix}{value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        {suffix && <span className="text-base font-semibold ml-0.5" style={{ color: "rgba(79,131,255,0.55)" }}>{suffix}</span>}
      </span>
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(79,131,255,0.35)" }}>{label}</span>
    </div>
  );
}

/* ─────────────────────────── constants ─────────────────────────── */


const FAQ_ITEMS = [
  {
    q: "What is BundleX?",
    a: "BundleX is an all-in-one professional infrastructure platform for Solana token lifecycle management — wallet generation, atomic launches, post-launch trading, and feed intelligence, all from a single interface.",
  },
  {
    q: "Why are the bundle wallets difficult to track?",
    a: "Bundle wallets are generated fresh in your browser using Solana's cryptography — they've never appeared on-chain, so analytics tools have no prior identity to link them to. Activity is distributed across many wallets with randomized amounts and timing, mimicking organic trading rather than bot patterns.",
  },
  {
    q: "What does atomic launch mean?",
    a: "BundleX packages your token creation and all bundle buy transactions into a single Jito bundle. They either all land in the same block, or none of them do — so your wallets buy at launch price with zero front-run exposure.",
  },
  {
    q: "How are sell executions optimized for velocity?",
    a: "Every wallet row on the token page has inline sell buttons (10%, 25%, 50%, 100%) that fire immediately on click — no confirmation modal. The NUKE button sells 100% from all holding wallets simultaneously, ideal for fast exits.",
  },
  {
    q: "What is Quick Launch from the Feed?",
    a: "Every item in the X, KYM, and Viral News feeds has a Rocket button. Clicking it opens the launch modal with the meme name and image pre-filled. Set a Bundle Preset once and you can go from spotting a trend to launching a token in under 30 seconds.",
  },
  {
    q: "Are my private keys safe?",
    a: "Yes. All key generation and transaction signing happens client-side in your browser. Private keys are never transmitted to any server. Jito bundles ensure your launch either fully succeeds or fully reverts — no partial states.",
  },
];

const FEED_MOCK = {
  x: [
    { user: "degen.eth",    handle: "@degen_eth",    time: "2m",  content: "pepe with a gun is literally the next 100x, no debate" },
    { user: "moonhunter",   handle: "@moonhunter99", time: "5m",  content: "someone just bundled 12 wallets on a new launch, already at 50k mc 👀" },
    { user: "solana.gg",    handle: "@solana_gg",    time: "8m",  content: "pump.fun volume 3x today. meme season is officially on" },
  ],
  kym: [
    { title: "Giga Chad",           meta: "confirmed"      },
    { title: "Skibidi Toilet 2.0",  meta: "new submission" },
    { title: "Sigma Grindset",      meta: "trending"       },
  ],
  viral: [
    { title: "Ninja announces major comeback tournament with $1M prize",  cat: "Esports",   time: "12m" },
    { title: "xQc hits 500k concurrent viewers during IRL stream",         cat: "Streaming", time: "34m" },
    { title: "Fortnite Peely collab breaks record on Twitter engagement",  cat: "Gaming",    time: "1h"  },
  ],
};

const SETUP_WALLETS = [
  { id: "W-01", addr: "4Xs...3Rk", sol: "12.4 SOL" },
  { id: "W-02", addr: "7mQ...9Lp", sol: "8.7 SOL"  },
  { id: "W-03", addr: "2Zr...6Nw", sol: "15.1 SOL" },
  { id: "W-04", addr: "8Kv...4Tm", sol: "6.3 SOL"  },
];

const TOKEN_WALLETS = [
  { id: "W-01", addr: "4Xs...3Rk", sol: "12.4", tokens: "2.1M", dev: true  },
  { id: "W-02", addr: "7mQ...9Lp", sol: "8.7",  tokens: "1.8M", dev: false },
  { id: "W-03", addr: "2Zr...6Nw", sol: "15.1", tokens: "2.4M", dev: false },
];

/* ─────────────────────────── page ─────────────────────────── */

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [rowsAnimated, setRowsAnimated] = useState(false);
  const [activeTokenType, setActiveTokenType] = useState("Standard");
  const [activeLaunchMode, setActiveLaunchMode] = useState<"classic" | "stagger">("classic");
  const [bundlePhase, setBundlePhase] = useState(0);
  const [launchStep, setLaunchStep] = useState<1 | 2 | 3>(1);
  const [activeFeedTab, setActiveFeedTab] = useState<"x" | "kym" | "viral">("viral");
  const [sellActiveKey, setSellActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setBarsAnimated(true), 400);
    const t2 = setTimeout(() => setRowsAnimated(true), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    const durations = [700, 1300, 1200, 1800];
    let phase = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      phase = (phase + 1) % 4;
      setBundlePhase(phase);
      timer = setTimeout(advance, durations[phase]);
    };
    timer = setTimeout(advance, durations[0]);
    return () => clearTimeout(timer);
  }, []);

  const handleSell = (key: string) => {
    setSellActiveKey(key);
    setTimeout(() => setSellActiveKey(null), 800);
  };

  const SPARKLINE = [30, 45, 35, 60, 55, 70, 50, 80, 65, 90, 75, 85, 60, 95, 72, 88];

  return (
    <div className="relative min-h-full w-full overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,131,255,0.13) 0%, transparent 70%)" }} />
        <div className="absolute top-24 left-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(79,131,255,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div className="absolute top-32 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(79,131,255,0.05) 0%, transparent 70%)", filter: "blur(30px)" }} />

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 z-10"
          style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#4f83ff", boxShadow: "0 0 6px rgba(79,131,255,0.8)" }} />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400">Live on Solana</span>
        </div>

        <h1 className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-50 max-w-3xl leading-[1.1] mb-6">
          Launch tokens and{" "}
          <span className="inline-block" style={{ color: "#4f83ff", textShadow: "0 0 32px rgba(79,131,255,0.45)" }}>
            bundle-buy
          </span>
          <br />
          in one atomic transaction
        </h1>

        <p className="relative z-10 text-sm sm:text-base text-zinc-400 max-w-xl leading-relaxed mb-10">
          Deploy your Solana token and have multiple wallets buy supply simultaneously —
          all settled atomically via Jito. One dashboard for wallet management,
          token launches, and post-launch automation.
        </p>

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 mb-10">
          <Link href="/"
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200"
            style={{ background: "rgba(79,131,255,0.16)", border: "1px solid rgba(79,131,255,0.45)", color: "#93b4ff", boxShadow: "0 0 12px rgba(79,131,255,0.12)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.24)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(79,131,255,0.25)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.16)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 12px rgba(79,131,255,0.12)"; }}
          >
            <Rocket className="w-4 h-4" />
            Open App
          </Link>
          <Link href="/docs"
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 text-zinc-400 hover:text-zinc-200"
            style={{ background: "transparent", border: "1px solid rgba(42,54,76,0.8)" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(79,131,255,0.2)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(42,54,76,0.8)"; }}
          >
            View Documentation
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-4xl mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px sm:gap-0 rounded-xl overflow-hidden"
            style={{ background: "rgba(79,131,255,0.07)", border: "1px solid rgba(79,131,255,0.14)", boxShadow: "0 0 40px rgba(79,131,255,0.07), inset 0 1px 0 rgba(79,131,255,0.08)" }}>
            <AnimatedStatCard target={12400} suffix="+" label="Tokens Launched" />
            <AnimatedStatCard target={84000} suffix="SOL" label="Total Bundled" showDivider />
            <AnimatedStatCard target={3200} suffix="+" label="Active Users" showDivider />
            <AnimatedStatCard target={0.8} suffix="s" label="Avg Bundle Time" decimals={1} showDivider />
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-600 animate-bounce z-10" />
      </section>

      {/* ── SECTION 01: WALLET SETUP ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="01" label="Wallet Setup" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Wallets analytics tools can't fingerprint
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Every bundle wallet is generated fresh in your browser — no prior on-chain history means analytics platforms have nothing to link them to. Activity is spread across multiple addresses with randomized amounts, producing patterns that look organic rather than coordinated.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard icon={Plus} title="Import or Generate On-Demand"
                description="Paste private keys to import existing wallets, or generate fresh keypairs in one click. Keys are derived entirely client-side using Solana's cryptography and can be exported as a CSV backup." />
              <FeatureCard icon={Coins} title="Single-Transaction Fan-Out Funding"
                description="Fund all bundle wallets from your dev wallet in one transaction. Set a target SOL per wallet — BundleX calculates the distribution and signs it as a single tx." />
              <FeatureCard icon={ArrowDownToLine} title="Consolidated Withdraw"
                description="Sweep SOL from all wallets back to any destination address. Optionally leave a configurable dust amount per wallet to cover future gas." />
              <FeatureCard icon={Activity} title="Generate Activity — Organic Volume Loops"
                description="Select wallets, set SOL per trade and number of rounds, and run. Amounts are randomized within your range on each loop so the resulting on-chain pattern doesn't flag token analytics as bot activity." />
            </div>
          </div>

          {/* Wallet mock */}
          <div className="rounded-lg overflow-hidden" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Dashboard</span>
              <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(79,131,255,0.1)", color: "#7aa3ff", border: "1px solid rgba(79,131,255,0.2)" }}>
                4 wallets
              </span>
            </div>

            {/* Action row */}
            <div className="flex gap-2 px-4 py-2.5 flex-wrap" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)", background: "rgba(7,9,15,0.5)" }}>
              {([
                { Icon: Plus, label: "Add Wallets" },
                { Icon: Coins, label: "Fund" },
                { Icon: ArrowDownToLine, label: "Withdraw" },
                { Icon: Activity, label: "Activity" },
              ] as const).map(({ Icon, label }) => (
                <div key={label} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium"
                  style={{ border: "1px solid rgba(79,131,255,0.3)", color: "#7aa3ff", background: "rgba(79,131,255,0.07)" }}>
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Wallet rows */}
            {SETUP_WALLETS.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 px-4 py-2.5"
                style={{
                  borderBottom: "1px solid rgba(28,38,56,0.6)",
                  opacity: rowsAnimated ? 1 : 0,
                  transform: rowsAnimated ? "none" : "translateY(6px)",
                  transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
                }}>
                <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[9px] font-bold"
                  style={{ background: "rgba(28,38,56,0.6)", border: "1px solid rgba(28,38,56,0.9)", color: "#71717a" }}>
                  {w.id.slice(-2)}
                </div>
                <span className="font-mono text-[11px] text-zinc-500 flex-1">{w.addr}</span>
                <span className="text-[11px] font-bold tabular-nums text-zinc-300">{w.sol}</span>
                <div className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "rgba(79,255,145,0.7)", boxShadow: "0 0 4px rgba(79,255,145,0.5)" }} />
              </div>
            ))}

            {/* Security note */}
            <div className="flex items-center gap-2 px-4 py-3"
              style={{ background: "rgba(79,131,255,0.04)", borderTop: "1px solid rgba(79,131,255,0.1)" }}>
              <Shield className="h-3.5 w-3.5 shrink-0" style={{ color: "#4f83ff" }} />
              <span className="text-[10px] text-zinc-500">Keys generated and stored client-side — never transmitted</span>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 02: LAUNCH ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Launch mock */}
          <div className="rounded-lg overflow-hidden order-2 lg:order-1" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Launch a Token</span>
            </div>

            {/* Step pills */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)", background: "rgba(7,9,15,0.5)" }}>
              {([
                [1, "Token Config"],
                [2, "Bundle"],
                [3, "Launch"],
              ] as const).map(([s, label], idx) => (
                <button key={s} onClick={() => setLaunchStep(s)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: launchStep === s ? "rgba(79,131,255,0.1)" : "transparent",
                    color: launchStep === s ? "#4f83ff" : "#52525b",
                    borderBottom: launchStep === s ? "2px solid #4f83ff" : "2px solid transparent",
                    borderRight: idx < 2 ? "1px solid rgba(28,38,56,0.8)" : "none",
                  }}>
                  <span className="flex items-center justify-center w-4 h-4 rounded-full text-[9px] font-bold"
                    style={{ background: launchStep === s ? "rgba(79,131,255,0.2)" : "rgba(28,38,56,0.8)", color: launchStep === s ? "#4f83ff" : "#52525b" }}>
                    {s}
                  </span>
                  {label}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* Step 1: Token Config */}
              {launchStep === 1 && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[{ label: "Name", value: "BundleX" }, { label: "Symbol", value: "$BDX" }].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600">{label}</span>
                        <div className="rounded px-3 py-2 text-xs text-zinc-300 font-mono"
                          style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600 block mb-2">Token Type</span>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { key: "Standard",    label: "Standard",  desc: "Classic launch",        color: "#4f83ff" },
                        { key: "Mayhem Mode", label: "Mayhem",    desc: "Max volatility pump",   color: "#ff4f4f" },
                        { key: "Cashback",    label: "Cashback",  desc: "SOL rewards on trades", color: "#4fff91" },
                        { key: "Agent",       label: "AI Agent",  desc: "Autonomous trading",    color: "#a855f7" },
                      ] as const).map(({ key, label, desc, color }) => {
                        const sel = activeTokenType === key;
                        return (
                          <button key={key} onClick={() => setActiveTokenType(key)}
                            className="flex flex-col gap-0.5 px-3 py-2.5 rounded text-left transition-all duration-200"
                            style={{
                              background: sel ? `${color}14` : "rgba(7,9,15,0.8)",
                              border: `1px solid ${sel ? color + "55" : "rgba(28,38,56,0.8)"}`,
                              boxShadow: sel ? `0 0 12px ${color}22` : "none",
                            }}>
                            <span className="text-xs font-semibold" style={{ color: sel ? color : "#a1a1aa" }}>{label}</span>
                            <span className="text-[10px]" style={{ color: sel ? color + "99" : "#52525b" }}>{desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {["x.com/bdx", "t.me/bdx", "bdx.app"].map((v) => (
                      <div key={v} className="flex-1 rounded px-2 py-1.5 text-[10px] font-mono text-zinc-600 truncate"
                        style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>{v}</div>
                    ))}
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setLaunchStep(2)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold"
                      style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }}>
                      Bundle Config →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Bundle Config */}
              {launchStep === 2 && (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    {(["classic", "stagger"] as const).map((mode) => (
                      <button key={mode} onClick={() => setActiveLaunchMode(mode)}
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold capitalize transition-all"
                        style={{
                          background: activeLaunchMode === mode ? "rgba(79,131,255,0.12)" : "rgba(7,10,18,0.6)",
                          border: `1px solid ${activeLaunchMode === mode ? "rgba(79,131,255,0.4)" : "rgba(28,38,56,0.9)"}`,
                          color: activeLaunchMode === mode ? "#4f83ff" : "#71717a",
                        }}>
                        {mode === "classic" ? <Zap className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                        {mode}
                      </button>
                    ))}
                  </div>
                  {activeLaunchMode === "stagger" && (
                    <div className="flex items-center gap-3 px-1">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Delay</span>
                      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(28,38,56,0.8)" }}>
                        <div className="h-full w-2/5 rounded-full" style={{ background: "linear-gradient(to right, #4f83ff, #93b4ff)" }} />
                      </div>
                      <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#4f83ff" }}>400ms</span>
                    </div>
                  )}
                  {([
                    { id: "W-01", sol: "12.4", pct: 8.2,  bar: 41, dev: true  },
                    { id: "W-02", sol: "9.8",  pct: 6.5,  bar: 33, dev: false },
                    { id: "W-03", sol: "15.2", pct: 10.1, bar: 51, dev: false },
                    { id: "W-04", sol: "7.6",  pct: 5.0,  bar: 25, dev: false },
                  ]).map((w, i) => (
                    <div key={w.id} className="flex items-center justify-between px-3 py-2 rounded"
                      style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-zinc-500">{w.id}</span>
                        {w.dev && <Crown className="h-2.5 w-2.5" style={{ color: "#f59e0b" }} />}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(28,38,56,0.8)" }}>
                          <div className="h-full rounded-full"
                            style={{ width: rowsAnimated ? `${w.bar}%` : "0%", background: "linear-gradient(to right, #4f83ff, #93b4ff)", transition: `width 0.7s cubic-bezier(.4,0,.2,1) ${i * 80 + 200}ms` }} />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-300 w-14 text-right">{w.sol} SOL</span>
                        <span className="text-[10px] font-bold w-10 text-right" style={{ color: "#4f83ff" }}>{w.pct}%</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2 rounded"
                    style={{ background: "rgba(79,131,255,0.04)", border: "1px solid rgba(79,131,255,0.15)" }}>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">Total Bundle</span>
                    <span className="text-xs font-bold" style={{ color: "#4f83ff" }}>45.0 SOL · 29.8%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <button onClick={() => setLaunchStep(1)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">← Back</button>
                    <button onClick={() => setLaunchStep(3)}
                      className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold"
                      style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }}>
                      Review & Launch →
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Atomic Launch */}
              {launchStep === 3 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600">Jito Bundle</span>
                    <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-all duration-500"
                      style={{
                        background: bundlePhase >= 3 ? "rgba(79,255,145,0.08)" : bundlePhase >= 2 ? "rgba(79,131,255,0.1)" : "rgba(28,38,56,0.4)",
                        border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.3)" : bundlePhase >= 2 ? "rgba(79,131,255,0.35)" : "rgba(28,38,56,0.9)"}`,
                        color: bundlePhase >= 3 ? "#4fff91" : bundlePhase >= 2 ? "#4f83ff" : "#52525b",
                      }}>
                      <span className="w-1 h-1 rounded-full"
                        style={{ background: bundlePhase >= 3 ? "#4fff91" : bundlePhase >= 2 ? "#4f83ff" : "#52525b", boxShadow: bundlePhase >= 2 ? `0 0 4px ${bundlePhase >= 3 ? "#4fff91" : "#4f83ff"}` : "none" }} />
                      {bundlePhase >= 3 ? "Confirmed" : bundlePhase >= 2 ? "Submitted" : bundlePhase >= 1 ? "Assembling" : "Idle"}
                    </span>
                  </div>
                  {([
                    { label: "Token Creation",   tag: "CREATE", color: "#a855f7" },
                    { label: "W-01 · 12.4 SOL",  tag: "BUY",    color: "#4f83ff" },
                    { label: "W-02 · 9.8 SOL",   tag: "BUY",    color: "#4f83ff" },
                    { label: "W-03 · 15.2 SOL",  tag: "BUY",    color: "#4f83ff" },
                    { label: "W-04 · 7.6 SOL",   tag: "BUY",    color: "#4f83ff" },
                  ]).map(({ label, tag, color }, i) => (
                    <div key={label} className="flex items-center justify-between px-3 py-2 rounded transition-colors duration-500"
                      style={{
                        background: "rgba(7,9,15,0.8)",
                        border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.12)" : "rgba(28,38,56,0.8)"}`,
                        opacity: bundlePhase >= 1 ? 1 : 0,
                        transform: bundlePhase >= 1 ? "none" : "translateY(6px)",
                        transition: `opacity 0.35s ease ${i * 65}ms, transform 0.35s ease ${i * 65}ms, border-color 0.5s ease`,
                      }}>
                      <span className="text-xs text-zinc-400 font-mono">{label}</span>
                      <span className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded uppercase"
                        style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}>{tag}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between px-3 py-2.5 rounded mt-1 transition-all duration-500"
                    style={{
                      background: bundlePhase >= 3 ? "rgba(79,255,145,0.04)" : "rgba(79,131,255,0.04)",
                      border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.2)" : "rgba(79,131,255,0.12)"}`,
                      opacity: bundlePhase >= 2 ? 1 : 0,
                    }}>
                    <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: bundlePhase >= 3 ? "#4fff91" : "#4f83ff" }}>
                      {bundlePhase >= 3 ? "Block #12,847,293" : "Submitting to validators…"}
                    </span>
                    <span className="text-[10px] font-bold" style={{ color: bundlePhase >= 3 ? "#4fff91" : "#4f83ff" }}>
                      {bundlePhase >= 3 ? "5 / 5 txs ✓" : "5 txs"}
                    </span>
                  </div>
                  <button onClick={() => setLaunchStep(2)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors mt-1 text-left">← Back to Bundle</button>
                </div>
              )}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel index="02" label="Launch" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Three steps from idea to on-chain
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Configure your token, assign per-wallet buy amounts, and deploy — all transactions land atomically in one Jito bundle. Your wallets are the first buyers because they share the exact same block as token creation.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard icon={Layers} title="Four Token Types"
                description="Standard PumpFun launch, Mayhem Mode for max volatility, Cashback so holders earn SOL on every trade, or AI Agent for autonomous strategies." />
              <FeatureCard icon={Shuffle} title="Per-Wallet Allocation + Shuffle"
                description="Assign exact SOL to each wallet or hit Shuffle to randomize within available balance. Supply percentages calculate live against the bonding curve." />
              <FeatureCard icon={Zap} title="Classic vs Stagger Mode"
                description="Classic packs all buys into one Jito bundle. Stagger sends them sequentially with a configurable delay — useful when avoiding supply concentration flags." />
              <FeatureCard icon={Target} title="Tunable Jito Tip & Launch Presets"
                description="Control block priority per launch with an adjustable tip. Save any configuration as a preset for instant reuse — one click from the Feed page." />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 03: TOKEN PAGE ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="03" label="Token Page" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Sell execution optimized for velocity
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Every wallet row has inline sell buttons — no modal, no confirmation step. Click 25% and the order fires. Need to exit everything immediately? NUKE sells 100% from all holding wallets in parallel.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard icon={Zap} title="Inline One-Click Sell Buttons"
                description="10%, 25%, 50%, and 100% sell buttons sit directly in each wallet row. They execute immediately on click — no modal friction between you and the exit." />
              <FeatureCard icon={Flame} title="NUKE — Simultaneous Full Exit"
                description="One button to dump 100% of tokens from every holding wallet at once. All sells are fired in parallel to minimize slippage from sequential ordering." />
              <FeatureCard icon={TrendingUp} title="Live P&L with Shareable Card"
                description="Total P&L tracks against initial SOL equity at launch in real time. Hit the trophy icon to export a shareable PNG — token logo, SOL and USD gain, percentage return." />
              <FeatureCard icon={Coins} title="Creator Fees Claim"
                description="If your dev wallet is the on-chain token creator, BundleX detects accumulated vault fees and surfaces a Claim button in the header. No external tools needed." />
            </div>
          </div>

          {/* Token page mock */}
          <div className="rounded-lg overflow-hidden" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            {/* Header */}
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">BDX / SOL</span>
              <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded"
                style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.2)" }}>
                <TrendingUp className="h-3 w-3" style={{ color: "#4ade80" }} />
                <span className="text-[11px] font-bold tabular-nums" style={{ color: "#4ade80" }}>+4.2 SOL</span>
                <span className="text-[10px]" style={{ color: "rgba(74,222,128,0.6)" }}>(+18.4%)</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold ml-2"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171" }}>
                <Flame className="h-3 w-3" />
                NUKE
              </div>
            </div>

            {/* Sparkline */}
            <div className="px-4 pt-4 pb-2">
              <div className="flex items-end gap-1 h-16">
                {SPARKLINE.map((h, i) => (
                  <div key={i} className="flex-1 rounded-sm" style={{
                    height: barsAnimated ? `${h}%` : "0%",
                    background: i >= 13 ? "linear-gradient(to top, #4f83ff, #93b4ff)" : "rgba(79,131,255,0.2)",
                    boxShadow: i >= 13 ? "0 0 6px rgba(79,131,255,0.3)" : "none",
                    transition: `height 0.5s cubic-bezier(.4,0,.2,1) ${i * 35}ms`,
                  }} />
                ))}
              </div>
            </div>

            {/* Wallet table */}
            <div className="px-3 pb-3">
              <div className="flex items-center px-2 py-1.5 mb-1 gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 w-20">Wallet</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 w-10">SOL</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 w-10">Tokens</span>
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 ml-auto">Buy · Sell</span>
              </div>
              {TOKEN_WALLETS.map((w, i) => (
                <div key={w.id} className="flex items-center gap-2 px-2 py-2 rounded mb-1.5"
                  style={{
                    background: "rgba(7,9,15,0.6)",
                    border: "1px solid rgba(28,38,56,0.7)",
                    opacity: rowsAnimated ? 1 : 0,
                    transform: rowsAnimated ? "none" : "translateY(4px)",
                    transition: `opacity 0.4s ease ${i * 80 + 400}ms, transform 0.4s ease ${i * 80 + 400}ms`,
                  }}>
                  <div className="flex items-center gap-1 w-20 min-w-0">
                    <span className="font-mono text-[10px] text-zinc-500 truncate">{w.addr}</span>
                    {w.dev && <Crown className="h-2.5 w-2.5 shrink-0" style={{ color: "#f59e0b" }} />}
                  </div>
                  <span className="text-[10px] font-bold tabular-nums text-zinc-400 w-10">{w.sol}</span>
                  <span className="text-[10px] font-bold tabular-nums text-zinc-400 w-10">{w.tokens}</span>
                  <div className="flex items-center gap-1 ml-auto shrink-0">
                    {([0.5, 1, 2] as const).map((sol) => {
                      const k = `${w.id}-buy-${sol}`;
                      return (
                        <button key={sol} onClick={() => handleSell(k)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded tabular-nums transition-all"
                          style={{
                            background: sellActiveKey === k ? "rgba(74,222,128,0.25)" : "rgba(74,222,128,0.08)",
                            border: "1px solid rgba(74,222,128,0.2)",
                            color: "#4ade80",
                            transform: sellActiveKey === k ? "scale(0.9)" : "scale(1)",
                          }}>
                          {sol}
                        </button>
                      );
                    })}
                    <div className="w-px h-3 mx-0.5" style={{ background: "rgba(28,38,56,0.9)" }} />
                    {([10, 25, 50, 100] as const).map((pct) => {
                      const k = `${w.id}-sell-${pct}`;
                      return (
                        <button key={pct} onClick={() => handleSell(k)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded tabular-nums transition-all"
                          style={{
                            background: sellActiveKey === k ? "rgba(248,113,113,0.25)" : "rgba(248,113,113,0.08)",
                            border: "1px solid rgba(248,113,113,0.2)",
                            color: "#f87171",
                            transform: sellActiveKey === k ? "scale(0.9)" : "scale(1)",
                          }}>
                          {pct}%
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Recent trades */}
            <div className="px-4 pt-2 pb-3" style={{ borderTop: "1px solid rgba(28,38,56,0.8)" }}>
              <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 block mb-2">Recent Trades</span>
              {[
                { type: "sell", wallet: "4Xs...3Rk", pct: "25%",   result: "→ 1.8 SOL" },
                { type: "buy",  wallet: "7mQ...9Lp", pct: "1 SOL", result: "→ +240k" },
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 py-1">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    style={{
                      background: t.type === "buy" ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                      border: `1px solid ${t.type === "buy" ? "rgba(74,222,128,0.2)" : "rgba(248,113,113,0.2)"}`,
                      color: t.type === "buy" ? "#4ade80" : "#f87171",
                    }}>
                    {t.type}
                  </span>
                  <span className="font-mono text-[10px] text-zinc-500">{t.wallet}</span>
                  <span className="text-[10px] text-zinc-600">{t.pct}</span>
                  <span className="ml-auto text-[10px] font-semibold text-zinc-400">{t.result}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 04: FEED ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">

          {/* Feed mock */}
          <div className="rounded-lg overflow-hidden order-2 lg:order-1" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Feed</span>
              <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold"
                style={{ border: "1px solid rgba(79,131,255,0.3)", color: "#7aa3ff", background: "rgba(79,131,255,0.07)" }}>
                <SlidersHorizontal className="h-3 w-3" />
                Bundle Preset
                <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: "#4f83ff" }} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex" style={{ borderBottom: "1px solid rgba(28,38,56,0.8)", background: "rgba(7,9,15,0.5)" }}>
              {([
                { id: "x"     as const, label: "X Feed",     color: "79,131,255" },
                { id: "kym"   as const, label: "KYM",         color: "139,92,246" },
                { id: "viral" as const, label: "Viral News",  color: "234,179,8"  },
              ]).map((tab, i) => (
                <button key={tab.id} onClick={() => setActiveFeedTab(tab.id)}
                  className="flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    background: activeFeedTab === tab.id ? `rgba(${tab.color},0.1)` : "transparent",
                    color: activeFeedTab === tab.id ? `rgb(${tab.color})` : "rgba(161,161,170,0.5)",
                    borderBottom: activeFeedTab === tab.id ? `2px solid rgb(${tab.color})` : "2px solid transparent",
                    borderRight: i < 2 ? "1px solid rgba(28,38,56,0.8)" : "none",
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* X Feed */}
            {activeFeedTab === "x" && (
              <div>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: "1px solid rgba(79,131,255,0.15)" }}>
                  <Search className="h-3.5 w-3.5 text-[#4f83ff] shrink-0" />
                  <span className="text-xs text-zinc-600 font-mono italic">pepe coin solana...</span>
                </div>
                {FEED_MOCK.x.map((p, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-3"
                    style={{ borderBottom: i < FEED_MOCK.x.length - 1 ? "1px solid rgba(28,38,56,0.5)" : "none" }}>
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold"
                      style={{ background: "linear-gradient(135deg, rgba(79,131,255,0.3), rgba(79,131,255,0.1))", border: "1px solid rgba(79,131,255,0.25)", color: "#7aa3ff" }}>
                      {p.user[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="text-[11px] font-semibold text-zinc-200">{p.user}</span>
                        <span className="text-[10px] text-zinc-500">{p.handle}</span>
                        <span className="ml-auto text-[10px] text-zinc-600 shrink-0">{p.time}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">{p.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* KYM Feed */}
            {activeFeedTab === "kym" && (
              <div>
                <div className="flex h-9" style={{ borderBottom: "1px solid rgba(139,92,246,0.18)", background: "rgba(13,10,20,0.6)" }}>
                  {(["Confirmed", "Submissions"] as const).map((s, i) => (
                    <button key={s} className="flex-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: i === 0 ? "rgba(139,92,246,0.18)" : "transparent",
                        color: i === 0 ? "#c4b5fd" : "rgba(161,161,170,0.5)",
                        borderRight: i === 0 ? "1px solid rgba(139,92,246,0.2)" : "none",
                      }}>{s}</button>
                  ))}
                </div>
                {FEED_MOCK.kym.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3"
                    style={{ borderBottom: i < FEED_MOCK.kym.length - 1 ? "1px solid rgba(28,38,56,0.55)" : "none" }}>
                    <div className="w-20 h-14 rounded shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}>
                      KYM
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-zinc-200 leading-tight">{e.title}</p>
                      <span className="text-[10px] text-zinc-500 mt-0.5 block">{e.meta}</span>
                    </div>
                    <button className="shrink-0 flex items-center justify-center w-8 h-8 rounded transition-all"
                      style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "#a78bfa" }}>
                      <Rocket className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Viral News */}
            {activeFeedTab === "viral" && (
              <div>
                <div className="flex h-9" style={{ borderBottom: "1px solid rgba(234,179,8,0.18)", background: "rgba(20,17,10,0.6)" }}>
                  {(["All", "Esports", "Gaming", "Streaming"] as const).map((cat, i, arr) => (
                    <button key={cat} className="flex-1 text-[10px] font-semibold uppercase tracking-wider"
                      style={{
                        background: i === 0 ? "rgba(234,179,8,0.18)" : "transparent",
                        color: i === 0 ? "#facc15" : "rgba(250,204,21,0.45)",
                        borderRight: i < arr.length - 1 ? "1px solid rgba(234,179,8,0.15)" : "none",
                      }}>{cat}</button>
                  ))}
                </div>
                {FEED_MOCK.viral.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-3"
                    style={{ borderBottom: i < FEED_MOCK.viral.length - 1 ? "1px solid rgba(28,38,56,0.55)" : "none" }}>
                    <div className="w-20 h-14 rounded shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)", color: "#facc15" }}>
                      DXT
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-[9px] font-bold uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded"
                        style={{ background: "rgba(234,179,8,0.08)", color: "#facc15", border: "1px solid rgba(234,179,8,0.15)" }}>
                        {a.cat}
                      </span>
                      <p className="text-[12px] font-medium text-zinc-200 leading-tight line-clamp-2">{a.title}</p>
                      <span className="text-[11px] text-zinc-500 mt-0.5 block">{a.time} ago</span>
                    </div>
                    <button className="shrink-0 flex items-center justify-center w-8 h-8 rounded transition-all"
                      style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.2)", color: "#facc15" }}>
                      <Rocket className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel index="04" label="Feed" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Spot the narrative. Launch in seconds.
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Three live feeds in one view — X, Know Your Meme, and Viral News. When you spot the moment, hit the Rocket button on any item and the launch modal opens with name and image pre-filled.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard icon={Search} title="X Feed — Any Search, Live"
                description="Enter any keyword and get live X posts refreshed every 20 seconds. Spot traders talking about a meme before it has a token, then launch while the narrative is fresh." />
              <FeatureCard icon={BookImage} title="Know Your Meme — Confirmed & Submissions"
                description="Browse confirmed viral memes and new KYM submissions side by side. The Submissions tab shows what's trending before it's even confirmed — alpha before the alpha." />
              <FeatureCard icon={Globe} title="Viral News — Dexerto by Category"
                description="Live gaming and esports articles from Dexerto, filtered by category. Major events drive meme culture — launch the collab coin before anyone else has the idea." />
              <FeatureCard icon={Rocket} title="Quick Launch from Any Feed Item"
                description="Every feed item has a Rocket button that opens the launch modal with name and image pre-filled. Set a Bundle Preset once and the entire flow — spot to live token — takes under 30 seconds." />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <SectionLabel index="05" label="FAQ" />
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-10">
          Frequently asked questions
        </h2>
        <div className="flex flex-col gap-2">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <button key={i} onClick={() => setOpenFaq(isOpen ? null : i)}
                className="w-full text-left rounded-lg px-5 py-4 transition-all duration-200"
                style={{
                  background: isOpen ? "rgba(13,17,24,0.9)" : "rgba(13,17,24,0.5)",
                  border: isOpen ? "1px solid rgba(79,131,255,0.2)" : "1px solid rgba(28,38,56,0.8)",
                }}>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-zinc-200">{item.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />}
                </div>
                {isOpen && <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{item.a}</p>}
              </button>
            );
          })}
        </div>
        <p className="mt-6 text-xs text-zinc-600">
          More questions?{" "}
          <Link href="/docs" className="text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">
            Read the full documentation
          </Link>
        </p>
      </section>

      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── FINAL CTA ── */}
      <section className="relative px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-16 text-center overflow-hidden">
        <div className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(79,131,255,0.07) 0%, transparent 70%)" }} />
        <div className="relative rounded-xl px-8 py-16"
          style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>
          <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full mb-6 mx-auto w-fit"
            style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.2)" }}>
            <Sparkles className="w-3 h-3" style={{ color: "#4f83ff" }} />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400">Ready to launch?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-50 tracking-tight mb-4">
            Launch your next token
            <br />
            <span style={{ color: "#4f83ff" }}>the professional way</span>
          </h2>
          <p className="text-sm text-zinc-500 max-w-md mx-auto mb-10 leading-relaxed">
            Join thousands of token launchers using BundleX to deploy, bundle,
            and manage their Solana tokens at scale.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/"
              className="flex items-center gap-2 px-8 py-3 rounded-md text-sm font-semibold transition-all duration-200"
              style={{ background: "rgba(79,131,255,0.16)", border: "1px solid rgba(79,131,255,0.45)", color: "#93b4ff", boxShadow: "0 0 16px rgba(79,131,255,0.12)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.24)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(79,131,255,0.25)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.16)"; (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.12)"; }}
            >
              <Rocket className="w-4 h-4" />
              Open App
            </Link>
            <Link href="/docs"
              className="flex items-center gap-2 px-8 py-3 rounded-md text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              style={{ background: "transparent", border: "1px solid rgba(42,54,76,0.8)" }}>
              Documentation
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
