"use client";
import { Rss } from "lucide-react";

export default function XFeedPage() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-5 text-center px-6">
      <div
        className="w-16 h-16 rounded-xl flex items-center justify-center"
        style={{
          background: "rgba(79,131,255,0.07)",
          border: "1px solid rgba(79,131,255,0.18)",
          boxShadow: "0 0 32px rgba(79,131,255,0.08)",
        }}
      >
        <Rss className="h-7 w-7 text-[#4f83ff]" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-zinc-100 tracking-tight mb-1">X Feed</h1>
        <p className="text-sm text-zinc-600">Launch and bundle coins directly<br />from the X feed in one click.</p>
      </div>

      <div
        className="px-4 py-2 rounded-full text-[11px] font-semibold uppercase tracking-widest"
        style={{
          background: "rgba(79,131,255,0.08)",
          border: "1px solid rgba(79,131,255,0.2)",
          color: "#4f83ff",
        }}
      >
        In development
      </div>
    </div>
  );
}
