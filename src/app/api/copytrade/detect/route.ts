import { NextRequest, NextResponse } from "next/server";

const PUMPFUN = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

function getHeliusApiKey(): string | null {
  // Direct env var takes priority
  if (process.env.HELIUS_API_KEY) return process.env.HELIUS_API_KEY;
  // Fall back to extracting from RPC URL
  const rpc = process.env.SOLANA_RPC_URL ?? process.env.HELIUS_RPC_URL ?? "";
  const match = rpc.match(/api-key=([^&]+)/);
  return match ? match[1] : null;
}

function isPumpFunTx(tx: any): boolean {
  // Helius labels pump.fun txs with source "PUMP_FUN" — most reliable
  if (tx.source === "PUMP_FUN") return true;
  // Fall back to scanning instruction programIds
  const inInstructions = (tx.instructions ?? []).some(
    (ix: any) => ix.programId === PUMPFUN
  );
  const inInner = (tx.innerInstructions ?? []).some((inner: any) =>
    (inner.instructions ?? []).some((ix: any) => ix.programId === PUMPFUN)
  );
  return inInstructions || inInner;
}

export interface DetectedTrade {
  signature: string;
  timestamp: number;
  type: "buy" | "sell";
  mint: string;
  solAmount: number;   // SOL spent (buy) or received (sell)
  tokenAmount: number; // tokens received (buy) or sent (sell)
}

function detectTrade(tx: any, address: string): DetectedTrade | null {
  if (!isPumpFunTx(tx)) return null;

  const tokenTransfers: any[] = tx.tokenTransfers ?? [];
  const nativeTransfers: any[] = tx.nativeTransfers ?? [];

  const receivedTokens = tokenTransfers.filter(
    (t) => t.toUserAccount === address && t.tokenAmount > 0
  );
  const sentTokens = tokenTransfers.filter(
    (t) => t.fromUserAccount === address && t.tokenAmount > 0
  );

  const solSent = nativeTransfers
    .filter((t) => t.fromUserAccount === address)
    .reduce((s, t) => s + t.amount, 0);
  const solReceived = nativeTransfers
    .filter((t) => t.toUserAccount === address)
    .reduce((s, t) => s + t.amount, 0);

  if (receivedTokens.length > 0 && solSent > 0) {
    return {
      signature: tx.signature,
      timestamp: (tx.timestamp ?? 0) * 1000,
      type: "buy",
      mint: receivedTokens[0].mint,
      solAmount: solSent / 1e9,
      tokenAmount: receivedTokens[0].tokenAmount,
    };
  }

  if (sentTokens.length > 0 && solReceived > 0) {
    return {
      signature: tx.signature,
      timestamp: (tx.timestamp ?? 0) * 1000,
      type: "sell",
      mint: sentTokens[0].mint,
      solAmount: solReceived / 1e9,
      tokenAmount: sentTokens[0].tokenAmount,
    };
  }

  return null;
}

// GET /api/copytrade/detect?address=...&after=<lastSignature>
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  const after = req.nextUrl.searchParams.get("after"); // last known signature

  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const apiKey = getHeliusApiKey();
  if (!apiKey) return NextResponse.json({ error: "No Helius API key configured. Set HELIUS_API_KEY in .env.local" }, { status: 500 });

  const url =
    `https://api.helius.xyz/v0/addresses/${address}/transactions` +
    `?api-key=${apiKey}&limit=10&type=SWAP`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json({ error: `Helius error ${res.status}: ${text}` }, { status: 502 });
  }

  const txs: any[] = await res.json();
  if (!Array.isArray(txs) || txs.length === 0) {
    return NextResponse.json({ trades: [], latestSignature: null });
  }

  const latestSignature = txs[0].signature;

  // If no cursor provided, just return the latest sig so next poll can diff
  if (!after) {
    return NextResponse.json({ trades: [], latestSignature });
  }

  // Collect only txs that came after the cursor
  const newTxs: any[] = [];
  for (const tx of txs) {
    if (tx.signature === after) break;
    newTxs.push(tx);
  }

  const trades: DetectedTrade[] = newTxs
    .map((tx) => detectTrade(tx, address))
    .filter((t): t is DetectedTrade => t !== null);

  return NextResponse.json({ trades, latestSignature });
}
