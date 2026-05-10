import { NextRequest, NextResponse } from "next/server";

const BASE = "https://splitnow.io/api";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.SPLITNOW_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "SplitNOW API key not configured" }, { status: 500 });

  const { id } = await ctx.params;
  const res = await fetch(`${BASE}/orders/${id}`, {
    headers: { "x-api-key": apiKey },
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
