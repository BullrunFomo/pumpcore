"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Rocket,
  Zap,
  BarChart3,
  Coins,
  Shield,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Target,
  TrendingUp,
  Wallet,
  Activity,
  ExternalLink,
  Sparkles,
  ArrowDown,
} from "lucide-react";

/* ─────────────────────────── helpers ─────────────────────────── */

function SectionLabel({ index, label }: { index: string; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span
        className="text-[10px] font-bold tracking-[0.2em] uppercase px-2 py-1 rounded"
        style={{
          background: "rgba(79,131,255,0.08)",
          border: "1px solid rgba(79,131,255,0.2)",
          color: "#4f83ff",
        }}
      >
        {index}
      </span>
      <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">
        {label}
      </span>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div
      className="flex flex-col gap-3 p-5 rounded-lg transition-all duration-300 group"
      style={{
        background: "rgba(13,17,24,0.6)",
        border: "1px solid rgba(28,38,56,0.8)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.border =
          "1px solid rgba(79,131,255,0.25)";
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(13,17,24,0.9)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.border =
          "1px solid rgba(28,38,56,0.8)";
        (e.currentTarget as HTMLDivElement).style.background =
          "rgba(13,17,24,0.6)";
      }}
    >
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
        style={{
          background: "rgba(79,131,255,0.1)",
          border: "1px solid rgba(79,131,255,0.2)",
        }}
      >
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
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

function AnimatedStatCard({
  target,
  label,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  target: number;
  label: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const value = useCountUp(target);
  return (
    <div className="bg-zinc-950 flex flex-col items-center justify-center py-6 px-4 gap-1">
      <span className="text-2xl sm:text-3xl font-bold text-blue-400 tracking-tight">
        {prefix}{value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        {suffix && <span className="text-base font-semibold text-zinc-400 ml-0.5">{suffix}</span>}
      </span>
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-zinc-500">
        {label}
      </span>
    </div>
  );
}

const PLATFORMS = [
  "Pump.fun",
  "Bonk.fun",
  "AnonCoin",
  "Bags.fm",
  "Heaven.xyz",
  "Moonshot",
  "LaunchLab",
  "Raydium",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Import Wallets",
    desc: "Load your dev wallet and generate bundle wallets instantly. Fund all of them from your dev wallet in a single transaction.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Configure Token",
    desc: "Set your token name, symbol, logo, and type. Choose which wallets participate in the bundle buy and how much each one spends.",
    icon: Layers,
  },
  {
    step: "03",
    title: "Atomic Launch",
    desc: "Hit launch. Token creation and all bundle buys are submitted as a single Jito bundle — they land in the same block or not at all.",
    icon: Rocket,
  },
  {
    step: "04",
    title: "Manage & Automate",
    desc: "Run volume strategies, sell, rebalance, or burn across every wallet from the dashboard. No scripts, no manual coordination.",
    icon: Activity,
  },
];

const FAQ_ITEMS = [
  {
    q: "What is BundleX?",
    a: "BundleX is an all-in-one professional infrastructure platform for Solana token lifecycle management. It lets you create, bundle, and manage tokens across every major Solana launchpad from a single unified interface.",
  },
  {
    q: "What does 'bundle buying' actually mean?",
    a: "When you launch a token, BundleX simultaneously submits the token creation transaction and buy transactions from multiple wallets as a single Jito bundle. All transactions land in the same block atomically — your wallets accumulate supply at launch price without any exposure to front-running.",
  },
  {
    q: "How many wallets do I need?",
    a: "You can start with just a dev wallet. BundleX lets you generate bundle wallets on demand, fund them in a single transaction, and coordinate their activity automatically — no manual wallet juggling required.",
  },
  {
    q: "Which launchpads are supported?",
    a: "BundleX supports Pump.fun, Bonk.fun, AnonCoin, Bags.fm, Heaven.xyz, Moonshot, LaunchLab, and Raydium. New integrations are added regularly — check the changelog for updates.",
  },
  {
    q: "Is BundleX safe to use?",
    a: "Yes. Your private keys never leave your device. All signing happens client-side. BundleX uses Jito bundles for atomic execution, meaning your entire launch either succeeds completely or fails completely — no partial fills.",
  },
  {
    q: "Can I automate post-launch activity?",
    a: "Yes. The Generate Activity feature deploys configurable volume strategies automatically — you set the parameters, BundleX handles the coordination. You can start, pause, or stop activity at any time from the dashboard.",
  },
];

/* ─────────────────────────── main page ─────────────────────────── */

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [barsAnimated, setBarsAnimated] = useState(false);
  const [rowsAnimated, setRowsAnimated] = useState(false);
  const [activeTokenType, setActiveTokenType] = useState("Standard");
  const [activeLaunchMode, setActiveLaunchMode] = useState<"classic" | "stagger">("classic");
  const [bundlePhase, setBundlePhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setBarsAnimated(true), 400);
    const t2 = setTimeout(() => setRowsAnimated(true), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  useEffect(() => {
    // Cycle: 0 idle → 1 assembling → 2 submitted → 3 confirmed → reset
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

  const SPARKLINE = [30, 45, 35, 60, 55, 70, 50, 80, 65, 90, 75, 85, 60, 95, 72, 88];

  return (
    <div className="relative min-h-full w-full overflow-x-hidden">
      {/* ── HERO ── */}
      <section className="relative flex flex-col items-center justify-center text-center px-4 pt-16 pb-20 overflow-hidden">
        {/* ambient orbs */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,131,255,0.13) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-24 left-1/4 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(79,131,255,0.06) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        <div
          className="absolute top-32 right-1/4 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(79,131,255,0.05) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />

        {/* live badge */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 z-10"
          style={{
            background: "rgba(79,131,255,0.06)",
            border: "1px solid rgba(79,131,255,0.2)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "#4f83ff", boxShadow: "0 0 6px rgba(79,131,255,0.8)" }}
          />
          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400">
            Live on Solana
          </span>
        </div>

        {/* headline */}
        <h1 className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-50 max-w-3xl leading-[1.1] mb-6">
          Launch tokens and{" "}
          <span
            className="inline-block"
            style={{
              color: "#4f83ff",
              textShadow: "0 0 32px rgba(79,131,255,0.45)",
            }}
          >
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

        {/* CTAs */}
        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 mb-10">
          <Link
            href="/"
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200"
            style={{
              background: "rgba(79,131,255,0.16)",
              border: "1px solid rgba(79,131,255,0.45)",
              color: "#93b4ff",
              boxShadow: "0 0 12px rgba(79,131,255,0.12)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.24)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(79,131,255,0.25)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.16)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 12px rgba(79,131,255,0.12)";
            }}
          >
            <Rocket className="w-4 h-4" />
            Open App
          </Link>
          <Link
            href="/docs"
            className="flex items-center gap-2 px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 text-zinc-400 hover:text-zinc-200"
            style={{ background: "transparent", border: "1px solid rgba(42,54,76,0.8)" }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(79,131,255,0.2)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(42,54,76,0.8)";
            }}
          >
            View Documentation
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ── STATS ── */}
        <div className="relative z-10 w-full max-w-4xl mb-10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-zinc-800 rounded-xl overflow-hidden border border-zinc-800">
            <AnimatedStatCard target={12400}  suffix="+"   label="Tokens Launched" />
            <AnimatedStatCard target={84000}  suffix="SOL" label="Total Bundled"   />
            <AnimatedStatCard target={3200}   suffix="+"   label="Active Users"    />
            <AnimatedStatCard target={0.8}    suffix="s"   label="Avg Bundle Time" decimals={1} />
          </div>
        </div>

        <ArrowDown className="w-4 h-4 text-zinc-600 animate-bounce z-10" />
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-20">
        <div className="text-center mb-8">
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-zinc-500">How it works</span>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight mt-1">
            From wallets to launch in four steps
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 relative">
          {/* connector line on desktop */}
          <div
            className="absolute top-[28px] left-[12.5%] right-[12.5%] h-px hidden sm:block pointer-events-none"
            style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), rgba(79,131,255,0.15), transparent)" }}
          />
          {HOW_IT_WORKS.map(({ step, title, desc, icon: Icon }, i) => (
            <div
              key={step}
              className="relative flex flex-col gap-3 p-4 rounded-lg transition-all duration-300"
              style={{
                background: "rgba(13,17,24,0.6)",
                border: "1px solid rgba(28,38,56,0.8)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(79,131,255,0.3)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(13,17,24,0.95)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(28,38,56,0.8)";
                (e.currentTarget as HTMLDivElement).style.background = "rgba(13,17,24,0.6)";
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.25)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: "#4f83ff" }} />
                </div>
                <span className="text-[10px] font-bold tracking-widest" style={{ color: "#4f83ff" }}>{step}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100 mb-1">{title}</p>
                <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* divider */}
      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24" style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 01: TOKEN SETUP ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="01" label="Token Setup" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Design your token and pick your launch type
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Configure name, symbol, logo, and social links in one screen — then choose from four token types. Everything set once, deployed with a click.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Layers}
                title="Four Token Types"
                description="Standard PumpFun launch, Mayhem Mode for max volatility, Cashback so holders earn SOL on every trade, or AI Agent for autonomous strategies."
              />
              <FeatureCard
                icon={Zap}
                title="Social Links at Creation"
                description="Attach Twitter, Telegram, and website directly at token creation — community links go live the moment the token does."
              />
            </div>
          </div>

          {/* Interactive token type selector */}
          <div className="rounded-lg overflow-hidden" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Token Setup</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                {[{ label: "Name", value: "BundleX" }, { label: "Symbol", value: "$BDX" }].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600">{label}</span>
                    <div className="rounded px-3 py-2 text-xs text-zinc-300 font-mono" style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>{value}</div>
                  </div>
                ))}
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600 block mb-2">Token Type</span>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { key: "Standard",    label: "Standard",   desc: "Classic PumpFun launch",   color: "#4f83ff" },
                    { key: "Mayhem Mode", label: "Mayhem",     desc: "Max volatility pump",       color: "#ff4f4f" },
                    { key: "Cashback",    label: "Cashback",   desc: "SOL rewards on trades",     color: "#4fff91" },
                    { key: "Agent",       label: "AI Agent",   desc: "Autonomous trading",        color: "#a855f7" },
                  ] as const).map(({ key, label, desc, color }) => {
                    const sel = activeTokenType === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setActiveTokenType(key)}
                        className="flex flex-col gap-0.5 px-3 py-2.5 rounded text-left transition-all duration-200"
                        style={{
                          background: sel ? `${color}14` : "rgba(7,9,15,0.8)",
                          border: `1px solid ${sel ? color + "55" : "rgba(28,38,56,0.8)"}`,
                          boxShadow: sel ? `0 0 12px ${color}22` : "none",
                        }}
                      >
                        <span className="text-xs font-semibold" style={{ color: sel ? color : "#a1a1aa" }}>{label}</span>
                        <span className="text-[10px]" style={{ color: sel ? color + "99" : "#52525b" }}>{desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2">
                {["x.com/bdx", "t.me/bdx", "bdx.app"].map((v) => (
                  <div key={v} className="flex-1 rounded px-2 py-1.5 text-[10px] font-mono text-zinc-600 truncate" style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>{v}</div>
                ))}
              </div>
              <div className="flex justify-end">
                <div className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold" style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }}>
                  Bundle Config →
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24" style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 02: BUNDLE CONFIG ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Interactive bundle config mock */}
          <div className="rounded-lg overflow-hidden order-2 lg:order-1" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "rgba(28,38,56,0.8)" }}>
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Bundle Config</span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* Classic / Stagger toggle */}
              <div className="grid grid-cols-2 gap-2">
                {(["classic", "stagger"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setActiveLaunchMode(mode)}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded text-xs font-semibold capitalize transition-all duration-200"
                    style={{
                      background: activeLaunchMode === mode ? "rgba(79,131,255,0.12)" : "rgba(7,10,18,0.6)",
                      border: `1px solid ${activeLaunchMode === mode ? "rgba(79,131,255,0.4)" : "rgba(28,38,56,0.9)"}`,
                      color: activeLaunchMode === mode ? "#4f83ff" : "#71717a",
                      boxShadow: activeLaunchMode === mode ? "0 0 10px rgba(79,131,255,0.15)" : "none",
                    }}
                  >
                    {mode === "classic" ? <Zap className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                    {mode}
                  </button>
                ))}
              </div>
              {/* Stagger delay indicator */}
              {activeLaunchMode === "stagger" && (
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Delay</span>
                  <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(28,38,56,0.8)" }}>
                    <div className="h-full w-2/5 rounded-full" style={{ background: "linear-gradient(to right, #4f83ff, #93b4ff)" }} />
                  </div>
                  <span className="text-xs font-semibold tabular-nums shrink-0" style={{ color: "#4f83ff" }}>400ms</span>
                </div>
              )}
              {/* Wallet rows */}
              {([
                { id: "W-01", sol: "12.4", pct: 8.2,  bar: 41 },
                { id: "W-02", sol: "9.8",  pct: 6.5,  bar: 33 },
                { id: "W-03", sol: "15.2", pct: 10.1, bar: 51 },
                { id: "W-04", sol: "7.6",  pct: 5.0,  bar: 25 },
              ]).map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3 py-2 rounded"
                  style={{
                    background: "rgba(7,9,15,0.8)",
                    border: "1px solid rgba(28,38,56,0.8)",
                    opacity: rowsAnimated ? 1 : 0,
                    transform: rowsAnimated ? "none" : "translateY(6px)",
                    transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
                  }}
                >
                  <span className="text-[10px] font-mono text-zinc-500">{w.id}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-20 h-1 rounded-full overflow-hidden" style={{ background: "rgba(28,38,56,0.8)" }}>
                      <div className="h-full rounded-full" style={{ width: rowsAnimated ? `${w.bar}%` : "0%", background: "linear-gradient(to right, #4f83ff, #93b4ff)", transition: `width 0.7s cubic-bezier(.4,0,.2,1) ${i * 80 + 200}ms` }} />
                    </div>
                    <span className="text-[10px] font-mono text-zinc-300 w-14 text-right">{w.sol} SOL</span>
                    <span className="text-[10px] font-bold w-10 text-right" style={{ color: "#4f83ff" }}>{w.pct}%</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 rounded mt-1" style={{ background: "rgba(79,131,255,0.04)", border: "1px solid rgba(79,131,255,0.15)" }}>
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">Total Bundle</span>
                <span className="text-xs font-bold" style={{ color: "#4f83ff" }}>45.0 SOL · 29.8%</span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel index="02" label="Bundle Config" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Configure exactly who buys and how much
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Pick which wallets join the launch, assign exact SOL amounts, and choose Classic or Stagger mode. Supply percentages update live against the PumpFun bonding curve.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Target}
                title="Per-Wallet SOL Allocation"
                description="Set precise buy amounts for each wallet. Hit shuffle to randomize within available balance. Supply percentages calculate live against the bonding curve."
              />
              <FeatureCard
                icon={Layers}
                title="Classic vs Stagger Mode"
                description="Classic packs all buys into one Jito bundle. Stagger sends them sequentially with a configurable delay — useful when avoiding supply concentration flags."
              />
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24" style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 03: ATOMIC LAUNCH ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="03" label="Atomic Launch" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Token creation and every buy land in one block
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              BundleX packages your token creation and all bundle buys into a single Jito bundle. Every transaction lands atomically — or none of them do.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Shield}
                title="Zero Front-Run Exposure"
                description="Your wallets are the first buyers because they're in the same block as the token creation. No bot can see the creation and front-run the buy."
              />
              <FeatureCard
                icon={Zap}
                title="Tunable Jito Tip"
                description="Higher tip = higher priority in the block builder queue. Adjust per-launch to match network congestion and land when it matters."
              />
            </div>
          </div>

          {/* Animated Jito bundle flow */}
          <div className="rounded-lg overflow-hidden" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(28,38,56,0.8)" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Jito Bundle</span>
              </div>
              <span
                className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded transition-all duration-500"
                style={{
                  background: bundlePhase >= 3 ? "rgba(79,255,145,0.08)" : bundlePhase >= 2 ? "rgba(79,131,255,0.1)" : "rgba(28,38,56,0.4)",
                  border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.3)" : bundlePhase >= 2 ? "rgba(79,131,255,0.35)" : "rgba(28,38,56,0.9)"}`,
                  color: bundlePhase >= 3 ? "#4fff91" : bundlePhase >= 2 ? "#4f83ff" : "#52525b",
                }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: bundlePhase >= 3 ? "#4fff91" : bundlePhase >= 2 ? "#4f83ff" : "#52525b", boxShadow: bundlePhase >= 2 ? `0 0 4px ${bundlePhase >= 3 ? "#4fff91" : "#4f83ff"}` : "none" }} />
                {bundlePhase >= 3 ? "Confirmed" : bundlePhase >= 2 ? "Submitted" : bundlePhase >= 1 ? "Assembling" : "Idle"}
              </span>
            </div>
            <div className="p-5 flex flex-col gap-2">
              {([
                { label: "Token Creation",  tag: "CREATE", color: "#a855f7" },
                { label: "W-01 · 12.4 SOL", tag: "BUY",   color: "#4f83ff" },
                { label: "W-02 · 9.8 SOL",  tag: "BUY",   color: "#4f83ff" },
                { label: "W-03 · 15.2 SOL", tag: "BUY",   color: "#4f83ff" },
                { label: "W-04 · 7.6 SOL",  tag: "BUY",   color: "#4f83ff" },
              ]).map(({ label, tag, color }, i) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-3 py-2 rounded transition-colors duration-500"
                  style={{
                    background: "rgba(7,9,15,0.8)",
                    border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.12)" : "rgba(28,38,56,0.8)"}`,
                    opacity: bundlePhase >= 1 ? 1 : 0,
                    transform: bundlePhase >= 1 ? "none" : "translateY(6px)",
                    transition: `opacity 0.35s ease ${i * 65}ms, transform 0.35s ease ${i * 65}ms, border-color 0.5s ease`,
                  }}
                >
                  <span className="text-xs text-zinc-400 font-mono">{label}</span>
                  <span
                    className="text-[9px] font-bold tracking-widest px-2 py-0.5 rounded uppercase"
                    style={{ background: `${color}14`, border: `1px solid ${color}40`, color }}
                  >
                    {tag}
                  </span>
                </div>
              ))}
              {/* Block row */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded mt-1 transition-all duration-500"
                style={{
                  background: bundlePhase >= 3 ? "rgba(79,255,145,0.04)" : "rgba(79,131,255,0.04)",
                  border: `1px solid ${bundlePhase >= 3 ? "rgba(79,255,145,0.2)" : "rgba(79,131,255,0.12)"}`,
                  opacity: bundlePhase >= 2 ? 1 : 0,
                  transform: bundlePhase >= 2 ? "none" : "translateY(4px)",
                }}
              >
                <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: bundlePhase >= 3 ? "#4fff91" : "#4f83ff" }}>
                  {bundlePhase >= 3 ? "Block #12,847,293" : "Submitting to validators…"}
                </span>
                <span className="text-[10px] font-bold" style={{ color: bundlePhase >= 3 ? "#4fff91" : "#4f83ff" }}>
                  {bundlePhase >= 3 ? "5 / 5 txs ✓" : "5 txs"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24" style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

      {/* ── SECTION 04: POST-LAUNCH CONTROL ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Activity + per-wallet trade mock */}
          <div className="rounded-lg overflow-hidden order-2 lg:order-1" style={{ background: "rgba(13,17,24,0.9)", border: "1px solid rgba(28,38,56,0.8)" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(28,38,56,0.8)" }}>
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">Dashboard</span>
              </div>
              <span className="flex items-center gap-1.5 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded" style={{ background: "rgba(79,131,255,0.08)", border: "1px solid rgba(79,131,255,0.2)", color: "#4f83ff" }}>
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#4f83ff" }} />
                Running
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {/* Sparkline */}
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
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Trades Today", value: "247" },
                  { label: "SOL Volume",   value: "18.4" },
                  { label: "Active Wallets", value: "8/12" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5 px-3 py-2 rounded" style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}>
                    <span className="text-[10px] text-zinc-600">{label}</span>
                    <span className="text-sm font-bold text-zinc-200">{value}</span>
                  </div>
                ))}
              </div>
              {/* Per-wallet rows with Buy/Sell + PnL */}
              {([
                { id: "W-01", sol: "12.4", pnl: "+4.2%", pos: true  },
                { id: "W-02", sol: "9.8",  pnl: "+1.8%", pos: true  },
                { id: "W-03", sol: "15.2", pnl: "-0.9%", pos: false },
              ]).map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3 py-2 rounded"
                  style={{
                    background: "rgba(7,9,15,0.8)",
                    border: "1px solid rgba(28,38,56,0.8)",
                    opacity: rowsAnimated ? 1 : 0,
                    transform: rowsAnimated ? "none" : "translateY(6px)",
                    transition: `opacity 0.4s ease ${i * 80 + 400}ms, transform 0.4s ease ${i * 80 + 400}ms`,
                  }}
                >
                  <span className="text-[10px] font-mono text-zinc-500">{w.id}</span>
                  <span className="text-xs font-mono text-zinc-400">{w.sol} SOL</span>
                  <span className="text-[10px] font-bold" style={{ color: w.pos ? "#4fff91" : "#ff4f4f" }}>{w.pnl}</span>
                  <div className="flex gap-1">
                    {(["Buy", "Sell"] as const).map((action) => (
                      <span key={action} className="text-[9px] font-bold px-2 py-1 rounded" style={{
                        background: action === "Buy" ? "rgba(79,131,255,0.1)" : "rgba(255,79,79,0.1)",
                        border: `1px solid ${action === "Buy" ? "rgba(79,131,255,0.25)" : "rgba(255,79,79,0.25)"}`,
                        color: action === "Buy" ? "#4f83ff" : "#ff4f4f",
                      }}>{action}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel index="04" label="Post-Launch Control" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Trade, automate, and track every wallet
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Buy, sell, burn, and rebalance across your entire wallet portfolio from one dashboard. Run automated volume strategies without writing a single script.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={TrendingUp}
                title="Per-Wallet Trading"
                description="Buy or sell any percentage from any wallet with one click. SOL balance, token holdings, and PnL are tracked per wallet in real time."
              />
              <FeatureCard
                icon={Activity}
                title="Automated Activity"
                description="Set min/max SOL per trade, interval, and which wallets participate — BundleX runs the strategy continuously. Start, pause, or stop any time."
              />
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24" style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }} />

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
              <button
                key={i}
                onClick={() => setOpenFaq(isOpen ? null : i)}
                className="w-full text-left rounded-lg px-5 py-4 transition-all duration-200"
                style={{
                  background: isOpen ? "rgba(13,17,24,0.9)" : "rgba(13,17,24,0.5)",
                  border: isOpen
                    ? "1px solid rgba(79,131,255,0.2)"
                    : "1px solid rgba(28,38,56,0.8)",
                }}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm font-semibold text-zinc-200">{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                </div>
                {isOpen && (
                  <p className="mt-3 text-sm text-zinc-500 leading-relaxed">{item.a}</p>
                )}
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

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

      {/* ── FINAL CTA ── */}
      <section className="relative px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-16 text-center overflow-hidden">
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(79,131,255,0.07) 0%, transparent 70%)",
          }}
        />
        <div
          className="relative rounded-xl px-8 py-16"
          style={{
            background: "rgba(13,17,24,0.8)",
            border: "1px solid rgba(28,38,56,0.8)",
          }}
        >
          <div
            className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-full mb-6 mx-auto w-fit"
            style={{
              background: "rgba(79,131,255,0.06)",
              border: "1px solid rgba(79,131,255,0.2)",
            }}
          >
            <Sparkles className="w-3 h-3" style={{ color: "#4f83ff" }} />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400">
              Ready to launch?
            </span>
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
            <Link
              href="/"
              className="flex items-center gap-2 px-8 py-3 rounded-md text-sm font-semibold transition-all duration-200"
              style={{
                background: "rgba(79,131,255,0.16)",
                border: "1px solid rgba(79,131,255,0.45)",
                color: "#93b4ff",
                boxShadow: "0 0 16px rgba(79,131,255,0.12)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.24)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(79,131,255,0.25)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.background = "rgba(79,131,255,0.16)";
                (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px rgba(79,131,255,0.12)";
              }}
            >
              <Rocket className="w-4 h-4" />
              Open App
            </Link>
            <Link
              href="/docs"
              className="flex items-center gap-2 px-8 py-3 rounded-md text-sm font-semibold text-zinc-400 hover:text-zinc-200 transition-colors"
              style={{
                background: "transparent",
                border: "1px solid rgba(42,54,76,0.8)",
              }}
            >
              Documentation
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
