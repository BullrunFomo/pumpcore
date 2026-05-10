import { NextResponse } from "next/server";

const BASE = "https://splitnow.io/api";

export async function GET() {
  const apiKey = process.env.SPLITNOW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SplitNOW API key not configured" }, { status: 500 });

  const res = await fetch(`${BASE}/assets/`, {
    headers: { "x-api-key": apiKey },
    next: { revalidate: 300 },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
