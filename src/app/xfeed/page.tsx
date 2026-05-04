"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Search, BookImage, Siren, Globe } from "lucide-react";

function XLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.258 5.626L18.244 2.25Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}
import type { XPost } from "@/app/api/feeds/x/route";
import type { KYMEntry } from "@/app/api/feeds/kym/route";
import type { DexertoArticle } from "@/app/api/feeds/dexerto/route";

function relativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(13,17,24,0.85)",
  border: "1px solid rgba(28,38,56,0.85)",
};

const CARD_HOVER_BG = "rgba(255,255,255,0.025)";

function timeAgo(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw.slice(0, 16);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function Skeleton({ h = "h-4", w = "w-full", className = "" }: { h?: string; w?: string; className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${h} ${w} ${className}`}
      style={{ background: "rgba(79,131,255,0.06)" }}
    />
  );
}

// ─── X Feed Panel ─────────────────────────────────────────────────────────────

function XFeedPanel() {
  const [posts, setPosts] = useState<XPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const load = useCallback(async (q: string, silent = false) => {
    if (!q.trim()) return;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feeds/x?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.posts?.length) {
        setPosts(data.posts);
      } else if (!silent) {
        setError("No posts returned. Nitter instances may be down.");
      }
    } catch {
      if (!silent) setError("Failed to load X feed.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const queryRef = useRef(query);
  useEffect(() => { queryRef.current = query; }, [query]);

  useEffect(() => {
    const id = setInterval(() => { if (queryRef.current) load(queryRef.current, true); }, 20000);
    return () => clearInterval(id);
  }, [load]);

  const handleSearch = () => {
    setQuery(draft);
    load(draft);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ background: "rgba(79,131,255,0.1)", border: "1px solid rgba(79,131,255,0.2)" }}
        >
          <XLogo className="h-3.5 w-3.5 text-[#4f83ff]" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">X Feed</span>
        {posts.length > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: "rgba(79,131,255,0.1)", color: "#7aa3ff", border: "1px solid rgba(79,131,255,0.2)" }}
          >
            {posts.length}
          </span>
        )}
        <button
          onClick={() => load(query)}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
          style={{
            border: "1px solid rgba(79,131,255,0.25)",
            color: "#7aa3ff",
            background: "rgba(79,131,255,0.06)",
          }}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Search bar */}
      <div className="shrink-0 flex gap-2 mb-3 h-8">
        <div className="flex flex-1 items-center gap-2 px-3 rounded" style={PANEL_STYLE}>
          <Search className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search query…"
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-600 outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-3 rounded text-[11px] font-semibold transition-all"
          style={{
            background: "rgba(79,131,255,0.14)",
            border: "1px solid rgba(79,131,255,0.4)",
            color: "#93b4ff",
          }}
        >
          Search
        </button>
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded no-scrollbar" style={PANEL_STYLE}>
        {loading && (
          <div className="p-4 flex flex-col gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2 pb-4" style={{ borderBottom: "1px solid rgba(28,38,56,0.6)" }}>
                <div className="flex items-center gap-2">
                  <Skeleton h="h-7" w="w-7" className="rounded-full shrink-0" />
                  <Skeleton h="h-3" w="w-28" />
                </div>
                <Skeleton h="h-3" />
                <Skeleton h="h-3" w="w-4/5" />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-3 p-6 text-center">
            <XLogo className="h-8 w-8 text-zinc-600" />
            <p className="text-xs text-zinc-500">{error}</p>
            <p className="text-[10px] text-zinc-700 max-w-[240px]">
              Nitter is an open-source Twitter mirror. Public instances may be rate-limited or offline.
            </p>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-2xl"
              style={{ background: "rgba(79,131,255,0.08)", border: "1px solid rgba(79,131,255,0.2)" }}
            >
              <XLogo className="h-8 w-8 text-[#4f83ff]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">X Feed</p>
              <p className="text-xs text-zinc-500 mt-1">Launch and bundle coins directly<br />from the X feed in one click.</p>
            </div>
            <span
              className="text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest"
              style={{ border: "1px solid rgba(79,131,255,0.4)", color: "#7aa3ff", background: "rgba(79,131,255,0.08)" }}
            >In Development</span>
          </div>
        )}

        {!loading && posts.map((post, idx) => (
          <a
            key={post.id}
            href={post.twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-4 py-3 transition-colors"
            style={{
              background: hoveredId === post.id ? CARD_HOVER_BG : "transparent",
              borderBottom: idx < posts.length - 1 ? "1px solid rgba(28,38,56,0.6)" : "none",
            }}
            onMouseEnter={() => setHoveredId(post.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            {/* Author row */}
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                style={{
                  background: "linear-gradient(135deg, rgba(79,131,255,0.3) 0%, rgba(79,131,255,0.1) 100%)",
                  border: "1px solid rgba(79,131,255,0.25)",
                  color: "#7aa3ff",
                }}
              >
                {post.username.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-zinc-200 truncate">
                  {post.displayName || post.username}
                </span>
                <span className="text-[10px] text-zinc-500 ml-1">@{post.username}</span>
              </div>
              {post.timestamp && (
                <span className="ml-auto text-[10px] text-zinc-600 shrink-0">
                  {timeAgo(post.timestamp)}
                </span>
              )}
            </div>

            {/* Content */}
            <p className="text-[12px] text-zinc-300 leading-relaxed whitespace-pre-line break-words">
              {post.content}
            </p>

            {/* Images */}
            {post.images.length > 0 && (
              <div className={`mt-2 grid gap-1 ${post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {post.images.slice(0, 4).map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt=""
                    className="w-full rounded object-cover"
                    style={{ maxHeight: 180, border: "1px solid rgba(28,38,56,0.8)" }}
                    onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                  />
                ))}
              </div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── KYM Feed Panel ───────────────────────────────────────────────────────────

function KYMFeedPanel() {
  const [section, setSection] = useState<"submissions" | "confirmed">("confirmed");
  const [entries, setEntries] = useState<KYMEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);

  const load = useCallback(async (sec: "submissions" | "confirmed", silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/feeds/kym?section=${sec}`);
      const data = await res.json();
      if (data.entries?.length) {
        setEntries(data.entries);
      } else if (!silent) {
        setEntries([]);
        setError(data.error ? `Scrape error: ${data.error}` : "No entries found.");
      }
    } catch {
      if (!silent) setError("Failed to load KYM feed.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const sectionRef = useRef(section);
  useEffect(() => { sectionRef.current = section; }, [section]);

  useEffect(() => { load(section); }, [section]);

  useEffect(() => {
    const id = setInterval(() => { load(sectionRef.current, true); }, 20000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}
        >
          <BookImage className="h-3.5 w-3.5 text-violet-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">Know Your Meme</span>
        <button
          onClick={() => load(section)}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
          style={{
            border: "1px solid rgba(139,92,246,0.2)",
            color: "rgba(167,139,250,0.8)",
            background: "rgba(139,92,246,0.06)",
          }}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Toggle */}
      <div
        className="shrink-0 flex mb-3 h-8 rounded overflow-hidden"
        style={{ border: "1px solid rgba(139,92,246,0.2)", background: "rgba(13,17,24,0.6)" }}
      >
        {(["confirmed", "submissions"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className="flex-1 text-[10px] font-semibold uppercase tracking-wider transition-all"
            style={{
              background: section === s ? "rgba(139,92,246,0.18)" : "transparent",
              color: section === s ? "#c4b5fd" : "rgba(161,161,170,0.5)",
              borderRight: s === "submissions" ? "1px solid rgba(139,92,246,0.2)" : "none",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded no-scrollbar" style={PANEL_STYLE}>
        {loading && (
          <div className="p-3 flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-2 items-center pb-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.6)" }}>
                <Skeleton h="h-10" w="w-10" className="rounded shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton h="h-3" />
                  <Skeleton h="h-2.5" w="w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <BookImage className="h-6 w-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <BookImage className="h-6 w-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">No entries</p>
          </div>
        )}

        {!loading && entries.map((entry, idx) => (
          <a
            key={entry.url}
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 transition-colors"
            style={{
              background: hoveredUrl === entry.url ? CARD_HOVER_BG : "transparent",
              borderBottom: idx < entries.length - 1 ? "1px solid rgba(28,38,56,0.55)" : "none",
            }}
            onMouseEnter={() => setHoveredUrl(entry.url)}
            onMouseLeave={() => setHoveredUrl(null)}
          >
            {entry.thumbnail ? (
              <img
                src={entry.thumbnail}
                alt={entry.title}
                className="w-10 h-10 rounded object-cover shrink-0"
                style={{ border: "1px solid rgba(28,38,56,0.8)" }}
                onError={(e) => {
                  const el = e.currentTarget as HTMLImageElement;
                  el.style.display = "none";
                }}
              />
            ) : (
              <div
                className="w-10 h-10 rounded shrink-0 flex items-center justify-center text-[9px] font-bold"
                style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)", color: "#a78bfa" }}
              >
                KYM
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-zinc-200 leading-tight line-clamp-2">{entry.title}</p>
              {entry.date && (
                <p className="text-[10px] text-zinc-600 mt-0.5">{entry.date}</p>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Dexerto Feed Panel ───────────────────────────────────────────────────────

function DexertoFeedPanel() {
  const [articles, setArticles] = useState<DexertoArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredUrl, setHoveredUrl] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feeds/dexerto");
      const data = await res.json();
      if (data.articles?.length) {
        setArticles(data.articles);
      } else if (!silent) {
        setArticles([]);
        setError(data.error ? `Scrape error: ${data.error}` : "No articles found.");
      }
    } catch {
      if (!silent) setError("Failed to load Dexerto feed.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const id = setInterval(() => { load(true); }, 20000);
    return () => clearInterval(id);
  }, [load]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 mb-3">
        <div
          className="flex items-center justify-center w-6 h-6 rounded"
          style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}
        >
          <Globe className="h-3.5 w-3.5 text-yellow-400" />
        </div>
        <span className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">VIRAL NEWS</span>

        <button
          onClick={() => load()}
          disabled={loading}
          className="ml-auto flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all"
          style={{
            border: "1px solid rgba(234,179,8,0.18)",
            color: "rgba(250,204,21,0.7)",
            background: "rgba(234,179,8,0.06)",
          }}
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Category filters */}
      {articles.length > 0 && (() => {
        const cats = Array.from(new Set(articles.map(a => a.category).filter(Boolean))) as string[];
        return (
          <div className="shrink-0 flex items-center gap-1 mb-2 h-8 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveCategory(null)}
              className="px-2 h-full rounded text-[9px] font-bold uppercase tracking-wider transition-all shrink-0"
              style={{
                background: activeCategory === null ? "rgba(234,179,8,0.18)" : "rgba(234,179,8,0.05)",
                color: activeCategory === null ? "#facc15" : "rgba(250,204,21,0.45)",
                border: `1px solid ${activeCategory === null ? "rgba(234,179,8,0.35)" : "rgba(234,179,8,0.12)"}`,
              }}
            >All</button>
            {cats.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(c => c === cat ? null : cat)}
                className="px-2 h-full rounded text-[9px] font-bold uppercase tracking-wider transition-all shrink-0"
                style={{
                  background: activeCategory === cat ? "rgba(234,179,8,0.18)" : "rgba(234,179,8,0.05)",
                  color: activeCategory === cat ? "#facc15" : "rgba(250,204,21,0.45)",
                  border: `1px solid ${activeCategory === cat ? "rgba(234,179,8,0.35)" : "rgba(234,179,8,0.12)"}`,
                }}
              >{cat}</button>
            ))}
          </div>
        );
      })()}

      {/* Feed */}
      <div className="flex-1 min-h-0 overflow-y-auto rounded no-scrollbar" style={PANEL_STYLE}>
        {loading && (
          <div className="p-3 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3 pb-3" style={{ borderBottom: "1px solid rgba(28,38,56,0.6)" }}>
                <Skeleton h="h-14" w="w-20" className="rounded shrink-0" />
                <div className="flex-1 flex flex-col gap-2 pt-0.5">
                  <Skeleton h="h-3" />
                  <Skeleton h="h-3" w="w-3/4" />
                  <Skeleton h="h-2.5" w="w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <Siren className="h-6 w-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">{error}</p>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 p-4 text-center">
            <Siren className="h-6 w-6 text-zinc-600" />
            <p className="text-xs text-zinc-500">No articles</p>
          </div>
        )}

        {!loading && articles.filter(a => !activeCategory || a.category === activeCategory).map((article, idx, arr) => (
          <a
            key={article.url}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-3 px-3 py-3 transition-colors"
            style={{
              background: hoveredUrl === article.url ? CARD_HOVER_BG : "transparent",
              borderBottom: idx < arr.length - 1 ? "1px solid rgba(28,38,56,0.55)" : "none",
            }}
            onMouseEnter={() => setHoveredUrl(article.url)}
            onMouseLeave={() => setHoveredUrl(null)}
          >
            {article.image ? (
              <img
                src={article.image}
                alt={article.title}
                className="w-20 h-14 rounded object-cover shrink-0"
                style={{ border: "1px solid rgba(28,38,56,0.8)" }}
                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
              />
            ) : (
              <div
                className="w-20 h-14 rounded shrink-0 flex items-center justify-center text-[9px] font-bold"
                style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.15)", color: "#facc15" }}
              >
                DXT
              </div>
            )}
            <div className="flex-1 min-w-0">
              {article.category && (
                <span
                  className="inline-block text-[9px] font-bold uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(234,179,8,0.08)", color: "#facc15", border: "1px solid rgba(234,179,8,0.15)" }}
                >
                  {article.category}
                </span>
              )}
              <p className="text-[11px] font-medium text-zinc-200 leading-tight line-clamp-2">{article.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {relativeTime(article.publishedAt) && (
                  <p className="text-[10px] text-zinc-500">{relativeTime(article.publishedAt)}</p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function XFeedPage() {
  return (
    <div className="flex flex-col flex-1 min-h-0 px-3 py-3 sm:px-6 sm:py-5 max-w-[1400px] w-full mx-auto">
      {/* Page header */}
      <div className="shrink-0 mb-4">
        <h1 className="text-lg sm:text-2xl font-bold text-zinc-100 tracking-tight">Feed</h1>
        <p className="text-xs text-zinc-600 mt-0.5">Live X feed, latest memes and viral news.</p>
      </div>

      {/* Layout: 3 equal columns */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4">

        <div className="flex flex-col min-h-[500px] lg:flex-1 lg:min-h-0">
          <XFeedPanel />
        </div>

        <div className="flex flex-col min-h-[500px] lg:flex-1 lg:min-h-0">
          <KYMFeedPanel />
        </div>

        <div className="flex flex-col min-h-[500px] lg:flex-1 lg:min-h-0">
          <DexertoFeedPanel />
        </div>

      </div>
    </div>
  );
}
