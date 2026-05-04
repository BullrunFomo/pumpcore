import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export interface KYMEntry {
  title: string;
  url: string;
  thumbnail: string | null;
  author: string | null;
  date: string | null;
  updatedDate: string | null;
}

const BASE = "https://knowyourmeme.com";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml,*/*",
  "Accept-Language": "en-US,en;q=0.9",
};

const NAV_SLUGS = new Set([
  "submissions", "confirmed", "researching", "deadpool", "newsworthy",
  "popular", "trending", "all", "new", "search", "categories",
  "cultures", "events", "people", "sites", "subcultures",
]);

// Try to parse a human-readable date string like "May 01, 2025" into ISO
function parseHumanDate(s: string): string | null {
  const d = new Date(s.trim());
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// Extract "Added <date>" and "Updated <date>" from KYM description HTML
function extractDatesFromDescription(html: string): { added: string | null; updated: string | null } {
  const $ = cheerio.load(html);
  let added: string | null = null;
  let updated: string | null = null;

  // KYM descriptions sometimes include <time datetime="..."> tags
  $("time").each((_i, el) => {
    const dt = $(el).attr("datetime");
    const label = $(el).parent().text().toLowerCase();
    if (!dt) return;
    const iso = new Date(dt).toISOString();
    if (label.includes("updated")) updated = iso;
    else added = iso;
  });

  // Also scan for "Added" / "Updated" text patterns like "Added May 01, 2025"
  const text = $.text();
  const addedMatch = text.match(/Added\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/);
  const updatedMatch = text.match(/Updated\s+([A-Z][a-z]+ \d{1,2},\s*\d{4})/);
  if (!added && addedMatch) added = parseHumanDate(addedMatch[1]);
  if (!updated && updatedMatch) updated = parseHumanDate(updatedMatch[1]);

  return { added, updated };
}

async function fetchRSS(url: string): Promise<KYMEntry[]> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true });
  const entries: KYMEntry[] = [];

  $("item").each((_i, el) => {
    const title = $(el).find("title").first().text().trim();
    const link = $(el).find("link").first().text().trim();
    const pubDate = $(el).find("pubDate").first().text().trim();
    const description = $(el).find("description").first().text();
    const author =
      $(el).find("dc\\:creator").first().text().trim() ||
      $(el).find("author").first().text().trim() ||
      null;

    // Pull first <img src> out of the description HTML
    const desc$ = cheerio.load(description);
    const imgSrc = desc$("img").first().attr("src") || null;

    // pubDate = added date; also try to pull updated from description
    const { added: descAdded, updated: descUpdated } = extractDatesFromDescription(description);
    const date = descAdded || (pubDate ? new Date(pubDate).toISOString() : null);
    const updatedDate =
      descUpdated ||
      $(el).find("updated").first().text().trim() ||
      $(el).find("dc\\:modified").first().text().trim() ||
      null;

    if (title && link) {
      entries.push({
        title,
        url: link,
        thumbnail: imgSrc && imgSrc.startsWith("http") ? imgSrc : null,
        author: author || null,
        date,
        updatedDate: updatedDate ? new Date(updatedDate).toISOString() : null,
      });
    }
  });

  return entries;
}

async function fetchHTML(path: string): Promise<KYMEntry[]> {
  const res = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers: { ...HEADERS, Accept: "text/html,application/xhtml+xml,*/*" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const html = await res.text();
  const $ = cheerio.load(html);
  const entries: KYMEntry[] = [];

  $("a.item").each((_i, el) => {
    const href = $(el).attr("href") ?? "";
    if (!href.startsWith("/memes/")) return;
    const slug = href.replace(/^\/memes\//, "").split("/")[0];
    if (!slug || NAV_SLUGS.has(slug)) return;

    const title =
      $(el).attr("data-title") ||
      $(el).find("h3").first().text().trim() ||
      slug.replace(/-/g, " ");

    const img = $(el).find("img").first();
    const thumbnail =
      img.attr("src") || img.attr("data-image") || img.attr("data-src") || null;

    entries.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      url: `${BASE}${href}`,
      thumbnail: thumbnail && thumbnail.startsWith("http") ? thumbnail : null,
      author: $(el).attr("data-author") || null,
      date: null,
      updatedDate: null,
    });
  });

  return entries;
}

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") ?? "submissions";

  try {
    let entries: KYMEntry[];

    if (section === "confirmed") {
      entries = await fetchRSS(`${BASE}/memes.rss`);
    } else {
      try {
        entries = await fetchRSS(`${BASE}/memes/submissions.rss`);
      } catch {
        entries = await fetchHTML("/memes/submissions");
      }
    }

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
