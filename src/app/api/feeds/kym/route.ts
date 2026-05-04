import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface KYMEntry {
  title: string;
  url: string;
  thumbnail: string | null;
  author: string | null;
  date: string | null;
}

const BASE = "https://knowyourmeme.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

// Slugs that are KYM status/category nav links, not actual meme entries
const NAV_SLUGS = new Set([
  "submissions", "confirmed", "researching", "deadpool", "newsworthy",
  "popular", "trending", "all", "new", "search", "categories",
  "cultures", "events", "people", "sites", "subcultures",
]);

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") ?? "submissions";
  // Default sort: newest first so the feed is chronological
  const path = section === "confirmed" ? "/memes" : "/memes/submissions";

  try {
    const res = await fetch(`${BASE}${path}`, {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ entries: [], error: `HTTP ${res.status}` });
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const entries: KYMEntry[] = [];

    // Real KYM gallery item selector — each entry is an <a class="item"> anchor
    $("a.item").each((_i, el) => {
      const href = $(el).attr("href") ?? "";
      if (!href.startsWith("/memes/")) return;

      const slug = href.replace(/^\/memes\//, "").split("/")[0];
      if (!slug || NAV_SLUGS.has(slug)) return;

      // Title from data-title attribute or <h3> inside the card
      const title =
        $(el).attr("data-title") ||
        $(el).find("h3").first().text().trim() ||
        slug.replace(/-/g, " ");

      // Thumbnail: prefer newsfeed-sized src; fall back to data-image (original)
      const img = $(el).find("img").first();
      const thumbnail =
        img.attr("src") ||
        img.attr("data-image") ||
        img.attr("data-src") ||
        null;

      const author = $(el).attr("data-author") || null;

      entries.push({
        title: title.charAt(0).toUpperCase() + title.slice(1),
        url: `${BASE}${href}`,
        thumbnail: thumbnail && thumbnail.startsWith("http") ? thumbnail : null,
        author,
        date: null,
      });
    });

    // Deduplicate by URL (page may repeat items)
    const seen = new Set<string>();
    const deduped = entries.filter((e) => {
      if (seen.has(e.url)) return false;
      seen.add(e.url);
      return true;
    });

    return NextResponse.json({ entries: deduped.slice(0, 40) });
  } catch (err) {
    return NextResponse.json({ entries: [], error: String(err) });
  }
}
