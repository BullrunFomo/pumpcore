import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.geckoterminal.com/api/v2";
const HEADERS = { Accept: "application/json;version=20230302" };

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mint = searchParams.get("mint");
  const timeframe = searchParams.get("timeframe") || "minute";
  const limit = Math.min(parseInt(searchParams.get("limit") || "200"), 1000);

  if (!mint) return NextResponse.json({ error: "mint required" }, { status: 400 });

  try {
    const poolsRes = await fetch(
      `${BASE}/networks/solana/tokens/${mint}/pools?limit=1`,
      { headers: HEADERS }
    );
    if (!poolsRes.ok) throw new Error("Could not find token pools");

    const poolsData = await poolsRes.json();
    const pools = poolsData?.data;
    if (!pools?.length) throw new Error("No trading pools found for this token");

    const poolAddress = pools[0].attributes.address;

    const ohlcvRes = await fetch(
      `${BASE}/networks/solana/pools/${poolAddress}/ohlcv/${timeframe}?limit=${limit}&currency=usd`,
      { headers: HEADERS }
    );
    if (!ohlcvRes.ok) throw new Error("Failed to fetch chart data");

    const ohlcvData = await ohlcvRes.json();
    const list: number[][] = ohlcvData?.data?.attributes?.ohlcv_list ?? [];
    if (!list.length) throw new Error("No candle data available");

    return NextResponse.json({
      candles: list.map(([t, o, h, l, c, v]) => ({
        time: t,
        open: o,
        high: h,
        low: l,
        close: c,
        volume: v,
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
