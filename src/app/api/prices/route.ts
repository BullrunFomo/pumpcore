import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection, getBondingCurveData } from "@/lib/solana";

const SOL_PRICE_URL = "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd";

let cachedSolPrice = 180; // fallback
let lastSolPriceFetch = 0;

async function getSolPrice(): Promise<number> {
  const now = Date.now();
  if (now - lastSolPriceFetch < 30_000) return cachedSolPrice;

  try {
    const res = await fetch(SOL_PRICE_URL, { next: { revalidate: 30 } });
    const data = await res.json();
    cachedSolPrice = data?.solana?.usd ?? cachedSolPrice;
    lastSolPriceFetch = now;
  } catch {}

  return cachedSolPrice;
}

// ─── GET /api/prices?mint=<address> ──────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mintParam = searchParams.get("mint");

    if (!mintParam) {
      return NextResponse.json({ error: "mint required" }, { status: 400 });
    }

    const connection = getConnection();
    const mint = new PublicKey(mintParam);

    const [curveData, solPrice] = await Promise.all([
      getBondingCurveData(connection, mint),
      getSolPrice(),
    ]);

    if (!curveData) {
      return NextResponse.json({ error: "Token not found on bonding curve" }, { status: 404 });
    }

    // Price in SOL per token: virtualSolReserves / virtualTokenReserves
    // PumpFun tokens have 6 decimals, SOL has 9
    const virtualSol = Number(curveData.virtualSolReserves) / 1e9;
    const virtualTokens = Number(curveData.virtualTokenReserves) / 1e6;
    const priceInSol = virtualSol / virtualTokens;
    const priceInUsd = priceInSol * solPrice;

    // MCap = price * total supply (1 billion tokens on PumpFun)
    const TOTAL_SUPPLY = 1_000_000_000;
    const mcap = priceInUsd * TOTAL_SUPPLY;

    return NextResponse.json({
      price: priceInSol,
      priceUsd: priceInUsd,
      mcap,
      solPrice,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
