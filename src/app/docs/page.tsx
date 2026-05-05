"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookOpen, Wallet, Rocket, BarChart2, Shield, Zap,
  ChevronRight, Info, AlertTriangle,
  Clock, TrendingUp,
  Layers, Settings, RefreshCw, Activity,
} from "lucide-react";

// ─── TOC sections ────────────────────────────────────────────────────────────

const sections = [
  { id: "overview",        label: "Overview",          icon: BookOpen },
  { id: "access-keys",     label: "Access Keys",       icon: Shield },
  { id: "wallets",         label: "Importing Wallets", icon: Wallet },
  { id: "dashboard",       label: "Dashboard",         icon: BarChart2 },
  { id: "launch",          label: "Launch a Token",    icon: Rocket },
  { id: "bundle",          label: "Bundle & Stagger",  icon: Layers },
  { id: "auto-sell",       label: "Auto-Sell",         icon: Zap },
  { id: "manage",          label: "Manage Positions",  icon: Settings },
  { id: "feed",            label: "Feed",              icon: Activity },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function SectionAnchor({ id }: { id: string }) {
  return <div id={id} className="scroll-mt-20" />;
}

function SectionTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
        style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: "#4f83ff" }} />
      </div>
      <h2 className="text-base font-semibold text-zinc-100 tracking-tight">{children}</h2>
    </div>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-xl p-5 ${className}`}
      style={{ background: "rgba(13,17,24,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
    >
      {children}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 rounded-lg p-4 text-sm"
      style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.18)" }}
    >
      <Info className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#4f83ff" }} />
      <span className="text-zinc-400 leading-relaxed">{children}</span>
    </div>
  );
}

function WarnBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex gap-3 rounded-lg p-4 text-sm"
      style={{ background: "rgba(234,179,8,0.05)", border: "1px solid rgba(234,179,8,0.2)" }}
    >
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-yellow-500" />
      <span className="text-zinc-400 leading-relaxed">{children}</span>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
          style={{ background: "rgba(79,131,255,0.12)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }}
        >
          {n}
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: "rgba(79,131,255,0.12)" }} />
      </div>
      <div className="pb-5 min-w-0">
        <p className="text-sm font-semibold text-zinc-200 mb-1">{title}</p>
        <p className="text-sm text-zinc-500 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  const palettes: Record<string, { bg: string; border: string; text: string }> = {
    blue:   { bg: "rgba(79,131,255,0.1)",  border: "rgba(79,131,255,0.25)",  text: "#4f83ff" },
    green:  { bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)",   text: "#22c55e" },
    red:    { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.25)",   text: "#ef4444" },
    yellow: { bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.25)",   text: "#eab308" },
    zinc:   { bg: "rgba(28,38,56,0.6)",    border: "rgba(28,38,56,0.9)",     text: "#71717a" },
  };
  const p = palettes[color] ?? palettes.zinc;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ background: p.bg, border: `1px solid ${p.border}`, color: p.text }}
    >
      {children}
    </span>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      className="px-1.5 py-0.5 rounded text-xs font-mono"
      style={{ background: "rgba(79,131,255,0.07)", color: "#93b4ff", border: "1px solid rgba(79,131,255,0.12)" }}
    >
      {children}
    </code>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollingRef = useRef(false);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const handler = () => {
      if (scrollingRef.current) return;
      const scrollTop = container.scrollTop;
      for (let i = sections.length - 1; i >= 0; i--) {
        const anchor = document.getElementById(sections[i].id);
        if (anchor && anchor.offsetTop - 100 <= scrollTop) {
          setActiveSection(sections[i].id);
          return;
        }
      }
      setActiveSection("overview");
    };
    container.addEventListener("scroll", handler, { passive: true });
    return () => container.removeEventListener("scroll", handler);
  }, []);

  function scrollTo(id: string) {
    const container = contentRef.current;
    const anchor = document.getElementById(id);
    if (!container || !anchor) return;
    setActiveSection(id);
    scrollingRef.current = true;
    container.scrollTo({ top: anchor.offsetTop - 80, behavior: "smooth" });
    setTimeout(() => { scrollingRef.current = false; }, 800);
  }

  return (
    <div ref={contentRef} className="flex flex-col flex-1 min-h-0 overflow-y-auto no-scrollbar">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex gap-8 items-start">

        {/* ── Sidebar TOC ───────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-48 shrink-0 sticky top-4 gap-1">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2 pl-3">
            Contents
          </p>
          {sections.map(({ id, label, icon: Icon }) => {
            const active = activeSection === id;
            return (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-r-md text-xs text-left transition-all duration-150 mr-4"
                style={{
                  color: active ? "#c4d4ff" : "#52525b",
                  background: active ? "rgba(79,131,255,0.07)" : "transparent",
                  borderLeft: active ? "2px solid #4f83ff" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#52525b";
                }}
              >
                <Icon className="w-3 h-3 shrink-0" style={{ color: active ? "#4f83ff" : "#3f3f46" }} />
                <span className={active ? "font-medium" : ""}>{label}</span>
              </button>
            );
          })}
        </aside>

        {/* ── Main content ──────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-10 pb-16">

          {/* Page header */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge color="blue">v1.0</Badge>
              <span className="text-xs text-zinc-600">Documentation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 tracking-tight mb-2">BundleX Docs</h1>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-xl">
              A professional PumpFun token launch &amp; bundle trading tool. This guide covers everything from
              importing wallets to executing multi-wallet token launches on Solana.
            </p>
          </div>

          {/* ── OVERVIEW ── */}
          <section>
            <SectionAnchor id="overview" />
            <Card>
              <SectionTitle icon={BookOpen}>Overview</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                BundleX lets you create PumpFun tokens and simultaneously buy them across multiple wallets in
                a single atomic Jito bundle — making your launch MEV-resistant and coordinated from block zero.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {[
                  { icon: Wallet,   title: "Multi-wallet",  desc: "Import and manage up to dozens of wallets, each with live SOL and token balances." },
                  { icon: Rocket,   title: "Atomic launch", desc: "Token creation + all buys land in the same Jito bundle. No front-running exposure." },
                  { icon: BarChart2,title: "Live PnL",      desc: "Real-time price polling every 10 seconds with per-wallet and bundle-wide PnL." },
                ].map(({ icon: Icon, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-lg p-4"
                    style={{ background: "rgba(20,28,40,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center mb-3"
                      style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.18)" }}
                    >
                      <Icon className="w-3 h-3" style={{ color: "#4f83ff" }} />
                    </div>
                    <p className="text-xs font-semibold text-zinc-200 mb-1">{title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </Card>
          </section>

          {/* ── ACCESS KEYS ── */}
          <section>
            <SectionAnchor id="access-keys" />
            <Card>
              <SectionTitle icon={Shield}>Access Keys</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                BundleX is gated behind unique access keys. Each key unlocks a private account whose data —
                wallets, launches, trades, and PnL — is completely isolated from every other account.
              </p>
              <div className="flex flex-col gap-3">
                <Step n={1} title="Receive your key">
                  Contact the admin to receive your personal access key. Keys are one-per-account and cannot
                  be shared without sharing your entire account data.
                </Step>
                <Step n={2} title="Enter the key on first visit">
                  On your first visit (or after clearing browser data) you will see the access key modal.
                  Type your key and press Enter. The app validates it server-side.
                </Step>
                <Step n={3} title="Data isolation">
                  Once authenticated, all your data is stored under a key-scoped namespace in your browser.
                  A different key on the same browser loads a completely different account.
                </Step>
              </div>
              <div className="mt-4">
                <WarnBox>
                  Authentication uses a secure <Code>bundlex-session</Code> cookie. Clearing cookies or
                  using a private window will log you out. Your account data is preserved — re-entering
                  your key restores everything. Rate limiting applies: 10 failed attempts per IP per 15 minutes.
                </WarnBox>
              </div>
            </Card>
          </section>

          {/* ── WALLETS ── */}
          <section>
            <SectionAnchor id="wallets" />
            <Card>
              <SectionTitle icon={Wallet}>Importing Wallets</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-4">
                All wallets are imported by private key and stored locally in your browser. Keys are never
                sent to any external server — only to your own Next.js backend for Solana transaction signing.
              </p>
              <div className="flex flex-col gap-3 mb-5">
                <Step n={1} title='Click "Import Wallets" on the Dashboard'>
                  Opens the import modal. You can paste one or multiple private keys.
                </Step>
                <Step n={2} title="Supported formats">
                  Base58 private key (standard Phantom/Solflare export) or a JSON array of bytes.
                  One key per line for bulk imports.
                </Step>
                <Step n={3} title="Balance auto-fetch">
                  After import, SOL balances are fetched from the RPC immediately. Token balances are
                  populated once you set an active token mint on the Manage page.
                </Step>
              </div>
              <InfoBox>
                Wallets are color-coded automatically and persist across sessions. Removing a wallet from
                the UI does not affect the on-chain account in any way.
              </InfoBox>
            </Card>
          </section>

          {/* ── DASHBOARD ── */}
          <section>
            <SectionAnchor id="dashboard" />
            <Card>
              <SectionTitle icon={BarChart2}>Dashboard</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                The dashboard is your command center: wallet overview, aggregate stats, and a quick-launch
                entry point.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Total PnL",       desc: "Sum of unrealised PnL across all wallets holding the active token, shown in SOL and USD." },
                  { label: "Total SOL",        desc: "Aggregate SOL balance across all imported wallets." },
                  { label: "Wallets",          desc: "Count of imported wallets. Clicking navigates to the wallet table." },
                  { label: "Active Token",     desc: "The token mint currently being tracked. Click any launch in the sidebar to switch." },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex gap-3">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4f83ff" }} />
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 mb-0.5">{label}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <InfoBox>
                Balances refresh automatically every 10 seconds while the dashboard is open. You can also
                force a refresh with the <RefreshCw className="inline w-3 h-3 mx-0.5" /> button.
              </InfoBox>
            </Card>
          </section>

          {/* ── LAUNCH ── */}
          <section>
            <SectionAnchor id="launch" />
            <Card>
              <SectionTitle icon={Rocket}>Launch a Token</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                The launch wizard is a 4-step flow. All steps must be completed before execution.
              </p>

              {[
                {
                  n: 1, title: "Token Config",
                  body: "Set the token name, ticker, logo (uploaded to IPFS via Pinata), and optional socials (website, Twitter, Telegram). Choose a token type:",
                  extra: (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Standard", "Mayhem Mode", "Cashback", "Agent"].map((t) => (
                        <Badge key={t} color={t === "Standard" ? "zinc" : "blue"}>{t}</Badge>
                      ))}
                    </div>
                  ),
                },
                {
                  n: 2, title: "Bundle Config",
                  body: "Select which wallets participate, assign the dev wallet, set SOL per wallet and the Jito tip. Choose Classic or Stagger launch mode (see below).",
                  extra: null,
                },
                {
                  n: 3, title: "Optional Settings",
                  body: "Configure Auto-Sell (time-based or market-cap target). Disabled by default.",
                  extra: null,
                },
                {
                  n: 4, title: "Review & Launch",
                  body: "Final review of all parameters. Pressing Launch streams real-time logs via SSE as the bundle is built, submitted to Jito, and confirmed on-chain.",
                  extra: null,
                },
              ].map(({ n, title, body, extra }) => (
                <div key={n} className="flex gap-4 mb-1">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ background: "rgba(79,131,255,0.12)", border: "1px solid rgba(79,131,255,0.3)", color: "#4f83ff" }}
                    >
                      {n}
                    </div>
                    {n < 4 && <div className="w-px flex-1 mt-2" style={{ background: "rgba(79,131,255,0.12)" }} />}
                  </div>
                  <div className="pb-5 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 mb-1">{title}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{body}</p>
                    {extra}
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {/* ── BUNDLE & STAGGER ── */}
          <section>
            <SectionAnchor id="bundle" />
            <Card>
              <SectionTitle icon={Layers}>Bundle &amp; Stagger Mode</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                <div
                  className="rounded-lg p-4"
                  style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.2)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: "#4f83ff" }} />
                    <span className="text-xs font-semibold text-zinc-200">Classic (Recommended)</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Token creation and <em>all</em> wallet buys are packed into a single Jito bundle.
                    Everything lands atomically in block 0 — no snipers can react between your
                    creation and your buys.
                  </p>
                </div>
                <div
                  className="rounded-lg p-4"
                  style={{ background: "rgba(20,28,40,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-xs font-semibold text-zinc-200">Stagger</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Dev wallet creates the token; remaining wallets buy sequentially with a
                    configurable per-wallet delay (set via slider in Step 2, in milliseconds).
                  </p>
                </div>
              </div>
              <InfoBox>
                Classic mode is the safest choice for most launches.
              </InfoBox>
            </Card>
          </section>

          {/* ── AUTO-SELL ── */}
          <section>
            <SectionAnchor id="auto-sell" />
            <Card>
              <SectionTitle icon={Zap}>Auto-Sell</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                Auto-Sell schedules an automatic liquidation of all wallet positions after launch.
                Two modes are available:
              </p>
              <div className="grid sm:grid-cols-2 gap-4 mb-5">
                {[
                  {
                    icon: Clock, label: "Time-based",
                    desc: "Sell all positions N seconds after the launch confirms. Useful for quick pump-and-exit strategies where you want a fixed exit window.",
                  },
                  {
                    icon: TrendingUp, label: "Market Cap Target",
                    desc: "Monitors the token's market cap via PumpFun's bonding curve. When the USD market cap crosses your target threshold, all positions are sold.",
                  },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="rounded-lg p-4"
                    style={{ background: "rgba(20,28,40,0.8)", border: "1px solid rgba(28,38,56,0.8)" }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className="w-3.5 h-3.5" style={{ color: "#4f83ff" }} />
                      <span className="text-xs font-semibold text-zinc-200">{label}</span>
                    </div>
                    <p className="text-xs text-zinc-400 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <WarnBox>
                Auto-Sell is executed server-side after the launch API call. If the server process is
                interrupted before the trigger fires, the sell will not execute. Monitor your positions
                manually as a fallback.
              </WarnBox>
            </Card>
          </section>

          {/* ── MANAGE ── */}
          <section>
            <SectionAnchor id="manage" />
            <Card>
              <SectionTitle icon={Settings}>Manage Positions</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                The Manage page shows a live candlestick chart for the active token mint alongside
                per-wallet positions. From here you can execute buys and sells without leaving the app.
              </p>
              <div className="flex flex-col gap-4 mb-5">
                {[
                  { label: "Individual Buy",   desc: "Enter a SOL amount and buy tokens from a specific wallet at the current bonding curve price." },
                  { label: "Partial Sell",      desc: "Sell 25%, 50%, 75%, or 100% of a wallet's token balance in one click." },
                  { label: "Sell All (bundle)", desc: "Liquidate 100% of all wallet positions at once. Executes sequentially with progress feedback per wallet." },
                ].map(({ label, desc }) => (
                  <div key={label} className="flex gap-3">
                    <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "#4f83ff" }} />
                    <div>
                      <p className="text-xs font-semibold text-zinc-300 mb-0.5">{label}</p>
                      <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">PnL Calculation</p>
              <div
                className="rounded-lg px-4 py-3 font-mono text-xs"
                style={{ background: "rgba(7,9,15,0.8)", border: "1px solid rgba(28,38,56,0.8)", color: "#93b4ff" }}
              >
                PnL (SOL) = (currentPrice − avgBuyPrice) × tokenBalance<br />
                PnL (USD) = PnL (SOL) × SOL/USD
              </div>
            </Card>
          </section>

          {/* ── FEED ── */}
          <section>
            <SectionAnchor id="feed" />
            <Card>
              <SectionTitle icon={Activity}>Feed</SectionTitle>
              <p className="text-sm text-zinc-400 leading-relaxed mb-5">
                The Feed page surfaces real-time social and news content across three panels to help you
                spot trending topics before they pump. All panels auto-refresh every 20 seconds.
              </p>
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                {[
                  {
                    color: "#4f83ff",
                    bg: "rgba(79,131,255,0.06)",
                    border: "rgba(79,131,255,0.2)",
                    title: "X Feed",
                    desc: "Search any query and get live posts from X/Twitter via Nitter proxies. Results auto-refresh every 20 s while a query is active.",
                  },
                  {
                    color: "#8b5cf6",
                    bg: "rgba(139,92,246,0.06)",
                    border: "rgba(139,92,246,0.2)",
                    title: "KYM Feed",
                    desc: "Know Your Meme trending memes. Click the rocket icon on any meme card to pre-fill a token launch with its name and image.",
                  },
                  {
                    color: "#eab308",
                    bg: "rgba(234,179,8,0.06)",
                    border: "rgba(234,179,8,0.2)",
                    title: "Viral News",
                    desc: "Dexerto gaming and internet-culture headlines. Click the rocket icon on any article to pre-fill a launch with the headline image.",
                  },
                ].map(({ color, bg, border, title, desc }) => (
                  <div
                    key={title}
                    className="rounded-lg p-4"
                    style={{ background: bg, border: `1px solid ${border}` }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color }}>{title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
              <InfoBox>
                On mobile, use the tab selector at the top of the Feed page to switch between panels.
                On desktop all three columns are shown side-by-side.
              </InfoBox>
              <div className="mt-4">
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-3">Quick Launch from Feed</p>
                <div className="flex flex-col gap-3">
                  <Step n={1} title="Click the rocket icon on any KYM or Viral News item">
                    The Quick Launch modal opens with the token name and image pre-filled from the
                    article or meme.
                  </Step>
                  <Step n={2} title="Configure buy amounts and tip">
                    Choose which wallets participate, set SOL per wallet, and set a Jito tip inside the modal.
                  </Step>
                  <Step n={3} title="Launch">
                    The token is created and all buys are submitted as a Jito bundle — without leaving the
                    Feed page.
                  </Step>
                </div>
              </div>
            </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
