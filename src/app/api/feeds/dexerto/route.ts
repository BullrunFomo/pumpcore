import { NextResponse } from "next/server";

export interface DexertoArticle {
  title: string;
  url: string;
  image: string | null;
  category: string | null;
  author: string | null;
  publishedAt: string | null;
}

const RSS_URL = "https://www.dexerto.com/feed/";
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/rss+xml, application/xml, text/xml, */*",
};

function extractTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

function extractAttr(xml: string, tag: string, attr: string): string | null {
  const re = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, "i");
  const m = xml.match(re);
  return m ? m[1] : null;
}

export async function GET() {
  try {
    const res = await fetch(RSS_URL, {
      cache: "no-store",
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      return NextResponse.json({ articles: [], error: `HTTP ${res.status}` });
    }

    const xml = await res.text();

    // Split into <item> blocks
    const itemBlocks = xml.split(/<item[\s>]/i).slice(1);

    const articles: DexertoArticle[] = itemBlocks.map((block) => {
      const title = extractTag(block, "title") ?? "";
      const url = extractTag(block, "link") ?? "";
      const author = extractTag(block, "dc:creator");
      const pubDate = extractTag(block, "pubDate");
      const publishedAt = pubDate ? new Date(pubDate).toISOString() : null;

      // All category tags — skip sub-categories (game titles etc), keep first top-level section
      const TOP_LEVEL = new Set([
        "Gaming", "Entertainment", "Anime", "TV & Movies", "Twitch",
        "YouTube", "Celebrity", "Tech", "Sports", "Esports", "AI",
      ]);
      const allCats = [...block.matchAll(/<category[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/category>/gi)]
        .map(m => m[1].trim());
      const category = allCats.find(c => TOP_LEVEL.has(c)) ?? null;

      // Image from media:thumbnail or enclosure
      const image =
        extractAttr(block, "media:thumbnail", "url") ||
        extractAttr(block, "enclosure", "url") ||
        null;

      return { title, url, image, category, author, publishedAt };
    }).filter((a) => a.title && a.url);

    // Already newest-first from the feed, but sort explicitly to be safe
    articles.sort((a, b) => {
      if (!a.publishedAt && !b.publishedAt) return 0;
      if (!a.publishedAt) return 1;
      if (!b.publishedAt) return -1;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });

    return NextResponse.json({ articles: articles.slice(0, 20) });
  } catch (err) {
    return NextResponse.json({ articles: [], error: String(err) });
  }
}
