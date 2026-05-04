import { NextRequest, NextResponse } from "next/server";

// Try these in order; first one that returns data wins
const NITTER_INSTANCES = [
  "https://nitter.privacydev.net",
  "https://nitter.poast.org",
  "https://nitter.cz",
  "https://lightbrd.com",
];

export interface XPost {
  id: string;
  username: string;
  displayName: string;
  content: string;
  images: string[];
  timestamp: string;
  url: string;
  twitterUrl: string;
}

function extractCDATA(xml: string, tag: string): string {
  const re = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    "i"
  );
  const m = xml.match(re);
  return m ? (m[1] ?? m[2] ?? "").trim() : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseItems(xml: string, instance: string): XPost[] {
  const posts: XPost[] = [];
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null) {
    const item = m[1];

    const link = extractCDATA(item, "link") || item.match(/<link\s*\/?>(.*?)<\/link>/i)?.[1]?.trim() || "";
    const pubDate = extractCDATA(item, "pubDate");
    const description = extractCDATA(item, "description");
    const creator = extractCDATA(item, "dc:creator");

    if (!link) continue;

    // Username from link path
    const usernameMatch = link.match(/\/([^/]+)\/status\//);
    const username = usernameMatch ? usernameMatch[1] : creator || "unknown";

    // Clean tweet text from description
    const contentDivMatch = description.match(
      /class=["']tweet-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/
    );
    const rawContent = contentDivMatch ? contentDivMatch[1] : description;
    const content = stripHtml(rawContent).replace(/^@\S+\s*/, "").slice(0, 500);

    // Extract images (skip emoji/avatar)
    const imgRe = /<img[^>]+src="([^"]+)"/g;
    const images: string[] = [];
    let imgM: RegExpExecArray | null;
    while ((imgM = imgRe.exec(description)) !== null) {
      const src = imgM[1];
      if (!src.includes("emoji") && !src.includes("avatar") && !src.includes("twitter_icon")) {
        // Rewrite to nitter instance URL if relative
        images.push(src.startsWith("http") ? src : `${instance}${src}`);
      }
    }

    // Convert nitter link → twitter.com URL
    const twitterUrl = link.replace(/https?:\/\/[^/]+/, "https://twitter.com");

    posts.push({
      id: link,
      username,
      displayName: creator || username,
      content: content || "(no text)",
      images,
      timestamp: pubDate,
      url: link,
      twitterUrl,
    });
  }

  return posts;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q") ?? "#pumpfun OR #solana meme";

  for (const instance of NITTER_INSTANCES) {
    try {
      const url = `${instance}/search/rss?q=${encodeURIComponent(query)}&f=tweets`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept: "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) continue;

      const xml = await res.text();
      if (!xml.includes("<item>")) continue;

      const posts = parseItems(xml, instance);
      if (posts.length > 0) {
        return NextResponse.json({ posts, instance }, { status: 200 });
      }
    } catch {
      // Try next instance
    }
  }

  return NextResponse.json({ posts: [], instance: null }, { status: 200 });
}
