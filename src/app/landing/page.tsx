"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Rocket, ArrowRight } from "lucide-react";

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

function AnimatedStatCard({ target, label, suffix = "", decimals = 0, showDivider = false }: {
  target: number; label: string; suffix?: string; decimals?: number; showDivider?: boolean;
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
        {value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
        {suffix && <span className="text-base font-semibold ml-0.5" style={{ color: "rgba(79,131,255,0.55)" }}>{suffix}</span>}
      </span>
      <span className="text-[9px] font-bold tracking-[0.2em] uppercase" style={{ color: "rgba(79,131,255,0.35)" }}>{label}</span>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative h-screen overflow-hidden w-full flex flex-col items-center justify-center text-center px-4">

      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(79,131,255,0.13) 0%, transparent 70%)" }} />
      <div className="absolute top-24 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,131,255,0.06) 0%, transparent 70%)", filter: "blur(40px)" }} />
      <div className="absolute top-32 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(79,131,255,0.05) 0%, transparent 70%)", filter: "blur(30px)" }} />

      {/* Live badge */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full mb-8 z-10"
        style={{ background: "rgba(79,131,255,0.06)", border: "1px solid rgba(79,131,255,0.2)" }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ background: "#4f83ff", boxShadow: "0 0 6px rgba(79,131,255,0.8)" }} />
        <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-zinc-400">Live on Solana</span>
      </div>

      {/* Heading */}
      <h1 className="relative z-10 text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-50 max-w-3xl leading-[1.1] mb-6">
        The first{" "}
        <span style={{ color: "#4f83ff", textShadow: "0 0 32px rgba(79,131,255,0.45)" }}>fullstack</span>
        <br />
        <span style={{ color: "#4f83ff", textShadow: "0 0 32px rgba(79,131,255,0.45)" }}>bundler</span>
        {" "}on Solana
      </h1>

      {/* Subtext */}
      <p className="relative z-10 text-sm sm:text-base text-zinc-400 max-w-md leading-relaxed mb-10">
        Deploy tokens and bundle-buy across multiple wallets atomically via Jito — all from one dashboard.
      </p>

      {/* CTA buttons */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 mb-10 w-full sm:w-auto max-w-xs sm:max-w-none">
        <Link href="/"
          className="group relative flex items-center justify-center gap-2 w-full sm:w-auto px-7 py-3 rounded-md text-sm font-bold overflow-hidden transition-all duration-300"
          style={{
            background: "linear-gradient(135deg, #3b6fd4 0%, #4f83ff 50%, #6fa0ff 100%)",
            boxShadow: "0 0 24px rgba(79,131,255,0.45), 0 0 60px rgba(79,131,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)",
            color: "#fff",
            border: "1px solid rgba(111,160,255,0.6)",
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.boxShadow = "0 0 36px rgba(79,131,255,0.65), 0 0 80px rgba(79,131,255,0.25), inset 0 1px 0 rgba(255,255,255,0.2)";
            el.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement;
            el.style.boxShadow = "0 0 24px rgba(79,131,255,0.45), 0 0 60px rgba(79,131,255,0.15), inset 0 1px 0 rgba(255,255,255,0.15)";
            el.style.transform = "translateY(0)";
          }}
        >
          <span className="absolute inset-0 pointer-events-none"
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 60%)" }} />
          <Rocket className="w-4 h-4 relative z-10" style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.6))" }} />
          <span className="relative z-10 tracking-wide">Open App</span>
        </Link>
        <Link href="/docs"
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-2.5 rounded-md text-sm font-semibold transition-all duration-200 text-zinc-400 hover:text-zinc-200"
          style={{ background: "transparent", border: "1px solid rgba(42,54,76,0.8)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(79,131,255,0.2)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.border = "1px solid rgba(42,54,76,0.8)"; }}
        >
          Documentation
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Stats */}
      <div className="relative z-10 w-full max-w-4xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px sm:gap-0 rounded-xl overflow-hidden"
          style={{ background: "rgba(79,131,255,0.07)", border: "1px solid rgba(79,131,255,0.14)", boxShadow: "0 0 40px rgba(79,131,255,0.07), inset 0 1px 0 rgba(79,131,255,0.08)" }}>
          <AnimatedStatCard target={12400} suffix="+" label="Tokens Launched" />
          <AnimatedStatCard target={84000} suffix="SOL" label="Total Bundled" showDivider />
          <AnimatedStatCard target={3200} suffix="+" label="Active Users" showDivider />
          <AnimatedStatCard target={0.8} suffix="s" label="Avg Bundle Time" decimals={1} showDivider />
        </div>
      </div>

    </div>
  );
}
