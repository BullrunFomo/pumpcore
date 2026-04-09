"use client";
import { useEffect, useState } from "react";
import { BookOpen, Send, Activity } from "lucide-react";

export default function Footer() {
  const [latency, setLatency] = useState<number | null>(null);
  const [alive, setAlive] = useState(true);

  useEffect(() => {
    const ping = async () => {
      const start = performance.now();
      try {
        await fetch("/api/prices", { method: "HEAD" }).catch(() => fetch("/api/prices"));
        setLatency(Math.round(performance.now() - start));
        setAlive(true);
      } catch {
        setAlive(false);
        setLatency(null);
      }
    };
    ping();
    const id = setInterval(ping, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between px-5"
      style={{
        height: "36px",
        background: "rgba(7,7,9,0.98)",
        borderTop: "1px solid rgba(63,63,70,0.25)",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left — status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping"
              style={{ background: alive ? "#4ade80" : "#f87171" }}
            />
            <span
              className="relative inline-flex rounded-full h-2 w-2"
              style={{
                background: alive ? "#4ade80" : "#f87171",
                boxShadow: alive ? "0 0 6px #4ade80" : "0 0 6px #f87171",
              }}
            />
          </span>
          <span className="text-[11px] font-medium" style={{ color: alive ? "#4ade80" : "#f87171" }}>
            {alive ? "All Services Live" : "Service Degraded"}
          </span>
        </div>

        {latency !== null && (
          <div
            className="hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{
              background: "rgba(79,131,255,0.08)",
              border: "1px solid rgba(79,131,255,0.2)",
              color: "#4f83ff",
            }}
          >
            <Activity className="h-2.5 w-2.5" />
            {latency}ms
          </div>
        )}
      </div>

      <div />

      {/* Right — links */}
      <div className="flex items-center gap-1.5">
        {[
          {
            href: "https://x.com",
            icon: (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            ),
          },
          {
            href: "https://t.me",
            icon: <Send className="h-3.5 w-3.5" />,
          },
          {
            href: "#",
            icon: <BookOpen className="h-3.5 w-3.5" />,
            label: "Docs",
          },
        ].map((item, i) => (
          <a
            key={i}
            href={item.href}
            target={item.href !== "#" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all duration-150 text-zinc-600 hover:text-[#4f83ff]"
          >
            {item.icon}
            {item.label && <span>{item.label}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}
