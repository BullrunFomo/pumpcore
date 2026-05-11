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
  RefreshCw,
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
    <div className="flex flex-col items-center gap-1">
      <span className="text-2xl sm:text-3xl font-bold" style={{ color: "#4f83ff" }}>
        {prefix}{value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        <span className="text-lg font-semibold text-zinc-400">{suffix}</span>
      </span>
      <span className="text-[11px] font-medium tracking-wider uppercase text-zinc-500">
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

  useEffect(() => {
    const t1 = setTimeout(() => setBarsAnimated(true), 400);
    const t2 = setTimeout(() => setRowsAnimated(true), 200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const SPARKLINE = [30, 45, 35, 60, 55, 70, 50, 80, 65, 90, 75, 85, 60, 95, 72, 88];
  const BUNDLE_WALLETS = [
    { id: "W-01", sol: "12.4", pct: 8.2 },
    { id: "W-02", sol: "9.8",  pct: 6.5 },
    { id: "W-03", sol: "15.2", pct: 10.1 },
    { id: "W-04", sol: "7.6",  pct: 5.0 },
  ];

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

      {/* ── STATS ── */}
      <section
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl rounded-lg px-8 py-6 mb-20"
        style={{
          background: "rgba(13,17,24,0.8)",
          border: "1px solid rgba(28,38,56,0.8)",
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800/60">
          <AnimatedStatCard target={12400}  suffix="+"   label="Tokens Launched"  />
          <AnimatedStatCard target={84000}  suffix=" SOL" label="Total Bundled"   />
          <AnimatedStatCard target={3200}   suffix="+"   label="Active Users"     />
          <AnimatedStatCard target={0.8}    suffix="s"   label="Avg Bundle Time"  decimals={1} />
        </div>
      </section>

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-20"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

      {/* ── SECTION 01: LAUNCH ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <SectionLabel index="01" label="Launch" />
        <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
          Built for the leading Solana launchpads
        </h2>
        <p className="text-sm text-zinc-500 max-w-lg mb-10 leading-relaxed">
          Deploy to any supported platform without switching tools. BundleX
          maintains a single unified interface across every integration.
        </p>

        {/* platform grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {PLATFORMS.map((name) => (
            <div
              key={name}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-md text-xs font-semibold text-zinc-400 transition-all duration-200 hover:text-zinc-200 cursor-default"
              style={{
                background: "rgba(13,17,24,0.6)",
                border: "1px solid rgba(28,38,56,0.8)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(79,131,255,0.2)";
                (e.currentTarget as HTMLDivElement).style.color = "#93b4ff";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.border = "1px solid rgba(28,38,56,0.8)";
                (e.currentTarget as HTMLDivElement).style.color = "";
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "rgba(79,131,255,0.5)" }} />
              {name}
            </div>
          ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <FeatureCard
            icon={Layers}
            title="Unified Launch Interface"
            description="Deploy to any supported launchpad from a single creation flow. No switching tabs, no copy-pasting — one action across all platforms."
          />
          <FeatureCard
            icon={Zap}
            title="Jito Bundle Execution"
            description="Every launch is submitted as an atomic Jito bundle. Your token creation and bundle buys land in the same block or not at all."
          />
        </div>
      </section>

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

      {/* ── SECTION 02: CREATE ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="02" label="Create" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Create and deploy with professional infrastructure
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Configure your token once — metadata, supply, token type, and
              bundle parameters — then deploy with a single click.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Rocket}
                title="Unified Creation Flow"
                description="Name, symbol, description, logo, and token type all configured in one guided wizard. Pick Standard, Mayhem, Cashback, or AI Agent token types."
              />
              <FeatureCard
                icon={Wallet}
                title="Centralised Wallet Funding"
                description="Fund all bundle wallets from your dev wallet in a single transaction. Set amounts per wallet and confirm once — BundleX handles the distribution."
              />
            </div>
          </div>

          {/* mock: token config */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: "rgba(13,17,24,0.9)",
              border: "1px solid rgba(28,38,56,0.8)",
              boxShadow: "0 0 40px rgba(79,131,255,0.04)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "rgba(28,38,56,0.8)" }}
            >
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">
                Token Configuration
              </span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[
                { label: "Token Name", value: "SupremeToken" },
                { label: "Symbol", value: "SPRM" },
                { label: "Initial Supply", value: "1,000,000,000" },
              ].map(({ label, value }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600">
                    {label}
                  </span>
                  <div
                    className="rounded px-3 py-2 text-xs text-zinc-300 font-mono"
                    style={{
                      background: "rgba(7,9,15,0.8)",
                      border: "1px solid rgba(28,38,56,0.8)",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-600">
                  Token Type
                </span>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { label: "Standard", color: "#4f83ff" },
                    { label: "Mayhem", color: "#ff4f4f" },
                    { label: "Cashback", color: "#4fff91" },
                    { label: "AI Agent", color: "#a855f7" },
                  ].map(({ label, color }) => (
                    <span
                      key={label}
                      className="text-[10px] font-bold tracking-wider px-2.5 py-1 rounded"
                      style={{
                        background: label === "Standard" ? "rgba(79,131,255,0.14)" : "rgba(255,255,255,0.04)",
                        border: `1px solid ${label === "Standard" ? "rgba(79,131,255,0.35)" : "rgba(255,255,255,0.07)"}`,
                        color: label === "Standard" ? color : "#445068",
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-xs font-bold tracking-wider mt-1"
                style={{
                  background: "rgba(79,131,255,0.1)",
                  border: "1px solid rgba(79,131,255,0.3)",
                  color: "#4f83ff",
                }}
              >
                <Rocket className="w-3.5 h-3.5" />
                Deploy Token
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

      {/* ── SECTION 03: BUNDLE ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* mock: bundle config with animated rows */}
          <div
            className="rounded-lg overflow-hidden order-2 lg:order-1"
            style={{
              background: "rgba(13,17,24,0.9)",
              border: "1px solid rgba(28,38,56,0.8)",
            }}
          >
            <div
              className="flex items-center gap-2 px-4 py-3 border-b"
              style={{ borderColor: "rgba(28,38,56,0.8)" }}
            >
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">
                Bundle Configuration
              </span>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {BUNDLE_WALLETS.map((w, i) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-3 py-2 rounded"
                  style={{
                    background: "rgba(7,9,15,0.8)",
                    border: "1px solid rgba(28,38,56,0.8)",
                    opacity: rowsAnimated ? 1 : 0,
                    transform: rowsAnimated ? "translateY(0)" : "translateY(8px)",
                    transition: `opacity 0.4s ease ${i * 80}ms, transform 0.4s ease ${i * 80}ms`,
                  }}
                >
                  <span className="text-[10px] font-mono text-zinc-500">{w.id}</span>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-24 h-1 rounded-full overflow-hidden"
                      style={{ background: "rgba(28,38,56,0.8)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: rowsAnimated ? `${w.pct * 5}%` : "0%",
                          background: "linear-gradient(to right, #4f83ff, #93b4ff)",
                          transition: `width 0.7s cubic-bezier(.4,0,.2,1) ${i * 80 + 200}ms`,
                        }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-zinc-300 w-12 text-right">
                      {w.sol} SOL
                    </span>
                    <span className="text-[10px] font-bold w-10 text-right" style={{ color: "#4f83ff" }}>
                      {w.pct}%
                    </span>
                  </div>
                </div>
              ))}
              <div
                className="flex items-center justify-between px-3 py-2 rounded mt-1"
                style={{
                  background: "rgba(79,131,255,0.04)",
                  border: "1px solid rgba(79,131,255,0.15)",
                }}
              >
                <span className="text-[10px] font-bold tracking-wider uppercase text-zinc-500">
                  Total Bundle
                </span>
                <span className="text-xs font-bold" style={{ color: "#4f83ff" }}>
                  45.0 SOL · 29.8%
                </span>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionLabel index="03" label="Bundle" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Take control of your token's supply
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Distribute supply across wallets with precision. BundleX
              coordinates allocation logic so every wallet buys its target
              percentage atomically.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Target}
                title="Strategic Supply Acquisition"
                description="Secure your desired percentage across multiple wallets with a single bundle. Set per-wallet SOL amounts and let BundleX calculate the rest."
              />
              <FeatureCard
                icon={Shield}
                title="Atomic Execution Layer"
                description="All bundle transactions either land together or none do. No partial fills, no front-running exposure — Jito bundles guarantee atomic settlement."
              />
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

      {/* ── SECTION 04: MANAGE ── */}
      <section className="px-4 sm:px-8 lg:px-0 mx-auto max-w-4xl mb-24">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <SectionLabel index="04" label="Manage" />
            <h2 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight mb-3">
              Automate and manage market performance
            </h2>
            <p className="text-sm text-zinc-500 mb-8 leading-relaxed">
              Run volume strategies, rebalance wallets, and execute bulk
              operations — all from the dashboard without writing a single
              script.
            </p>
            <div className="flex flex-col gap-3">
              <FeatureCard
                icon={Activity}
                title="Automated Activity Generation"
                description="Configure volume parameters and deploy a self-running activity strategy. Set min/max SOL per trade, interval, and wallet selection — BundleX does the rest."
              />
              <FeatureCard
                icon={RefreshCw}
                title="Full Portfolio Operations"
                description="Buy, sell, burn, transfer, and rebalance across your entire wallet portfolio in a single click. No more manual coordination between wallets."
              />
            </div>
          </div>

          {/* mock: activity monitor with animated sparkline */}
          <div
            className="rounded-lg overflow-hidden"
            style={{
              background: "rgba(13,17,24,0.9)",
              border: "1px solid rgba(28,38,56,0.8)",
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ borderColor: "rgba(28,38,56,0.8)" }}
            >
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <span className="text-[10px] font-bold tracking-widest uppercase text-zinc-600 ml-2">
                  Activity Monitor
                </span>
              </div>
              <span
                className="flex items-center gap-1 text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                style={{
                  background: "rgba(79,131,255,0.08)",
                  border: "1px solid rgba(79,131,255,0.2)",
                  color: "#4f83ff",
                }}
              >
                <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "#4f83ff" }} />
                Running
              </span>
            </div>
            <div className="p-5">
              {/* animated sparkline */}
              <div className="flex items-end gap-1 h-20 mb-4">
                {SPARKLINE.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: barsAnimated ? `${h}%` : "0%",
                      background:
                        i >= 13
                          ? "linear-gradient(to top, #4f83ff, #93b4ff)"
                          : "rgba(79,131,255,0.2)",
                      boxShadow: i >= 13 ? "0 0 6px rgba(79,131,255,0.3)" : "none",
                      transition: `height 0.5s cubic-bezier(.4,0,.2,1) ${i * 35}ms`,
                    }}
                  />
                ))}
              </div>
              {/* stats row */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { label: "Trades Today", value: "247" },
                  { label: "SOL Volume", value: "18.4" },
                  { label: "Active Wallets", value: "8/12" },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded"
                    style={{
                      background: "rgba(7,9,15,0.8)",
                      border: "1px solid rgba(28,38,56,0.8)",
                    }}
                  >
                    <span className="text-[10px] text-zinc-600 font-medium">{label}</span>
                    <span className="text-sm font-bold text-zinc-200">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* divider */}
      <div
        className="mx-4 sm:mx-8 lg:mx-auto max-w-4xl h-px mb-24"
        style={{ background: "linear-gradient(to right, transparent, rgba(79,131,255,0.15), transparent)" }}
      />

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
