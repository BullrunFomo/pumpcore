import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("missing url", { status: 400 });

  try {
    let fetchUrl = decodeURIComponent(url);
    if (fetchUrl.startsWith("ipfs://")) {
      fetchUrl = `https://cf-ipfs.com/ipfs/${fetchUrl.slice(7)}`;
    }
    const res = await fetch(fetchUrl, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (!res.ok) return new NextResponse("upstream error", { status: 502 });

    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const buffer = await res.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e: any) {
    return new NextResponse(e.message, { status: 502 });
  }
}
