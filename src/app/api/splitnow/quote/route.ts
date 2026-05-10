import { NextRequest, NextResponse } from "next/server";

const BASE = "https://splitnow.io/api";

export async function POST(req: NextRequest) {
  const apiKey = process.env.SPLITNOW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SplitNOW API key not configured" }, { status: 500 });

  const body = await req.json();
  const res = await fetch(`${BASE}/quotes/`, {
    method: "POST",
    headers: { "x-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
