import { NextRequest, NextResponse } from "next/server";
import { KNOWN_LABELS } from "@/lib/cex-labels";

// ─── SolanaFM label cache ──────────────────────────────────────────────────
// Caches per-address results for 24 h to avoid repeated API calls.
// null = "checked, not a CEX"  |  string = CEX name
const sfmCache = new Map<string, { name: string | null; at: number }>();
const SFM_TTL = 24 * 60 * 60 * 1_000;

async function lookupSolanaFM(address: string): Promise<string | null> {
  const hit = sfmCache.get(address);
  if (hit && Date.now() - hit.at < SFM_TTL) return hit.name;

  try {
    const res = await fetch(
      `https://api.solana.fm/v0/accounts?accountHashes[]=${address}`,
      { cache: "no-store", signal: AbortSignal.timeout(4_000) }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const entry = json?.result?.data?.[address];
    // SolanaFM categories: "exchange", "cex", "centralized-exchange" etc.
    const isCex =
      entry?.category === "exchange" ||
      entry?.category === "cex" ||
      entry?.category === "centralized-exchange";
    const name: string | null = isCex ? (entry?.name ?? null) : null;
    sfmCache.set(address, { name, at: Date.now() });
    return name;
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function labelAddress(address: string): string {
  return address.slice(0, 4) + "..." + address.slice(-4);
}

function extractSenderFromDescription(description: string | undefined): string | null {
  if (!description) return null;
  const match = description.match(/^(.+?)\s+transferred\s/i);
  if (!match) return null;
  const candidate = match[1].trim();
  if (candidate.length > 25 || /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(candidate)) return null;
  return candidate;
}

function getHeliusApiKey(): string | null {
  const rpc = process.env.SOLANA_RPC_URL ?? process.env.HELIUS_RPC_URL ?? "";
  const match = rpc.match(/api-key=([^&]+)/);
  return match ? match[1] : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FundingInfo {
  address: string;
  sourceAddress: string | null;
  sourceLabel: string | null;
  isCex: boolean;
  timestamp: number | null; // ms
  amountSol: number;
}

// ─── Per-address fetch ────────────────────────────────────────────────────────

async function fetchFundingForAddress(address: string, apiKey: string): Promise<FundingInfo> {
  const empty: FundingInfo = {
    address,
    sourceAddress: null,
    sourceLabel: null,
    isCex: false,
    timestamp: null,
    amountSol: 0,
  };

  // Helius returns newest-first; paginate up to MAX_PAGES and keep overwriting
  // so `oldest` ends up as the earliest inbound SOL transfer (original funding).
  const MAX_PAGES = 3;
  let before: string | undefined;
  let oldest: { fromAddr: string; descLabel: string | null; timestamp: number | null; amountSol: number } | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    if (page > 0) await new Promise((r) => setTimeout(r, 200));

    const url =
      `https://api.helius.xyz/v0/addresses/${address}/transactions` +
      `?api-key=${apiKey}&limit=100` +
      (before ? `&before=${before}` : "");

    let txs: any[];
    try {
      let res = await fetch(url, { cache: "no-store" });
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1_500));
        res = await fetch(url, { cache: "no-store" });
      }
      if (!res.ok) break;
      txs = await res.json();
      if (!Array.isArray(txs) || txs.length === 0) break;
    } catch {
      break;
    }

    for (const tx of txs) {
      const transfers: { fromUserAccount: string; toUserAccount: string; amount: number }[] =
        tx.nativeTransfers ?? [];
      const incoming = transfers.find((t) => t.toUserAccount === address && t.amount > 0);
      if (!incoming) continue;
      oldest = {
        fromAddr: incoming.fromUserAccount,
        descLabel: extractSenderFromDescription(tx.description),
        timestamp: tx.timestamp ? tx.timestamp * 1000 : null,
        amountSol: incoming.amount / 1_000_000_000,
      };
    }

    if (txs.length < 100) break;
    before = txs[txs.length - 1].signature;
  }

  if (!oldest) return empty;

  const { fromAddr, descLabel, timestamp, amountSol } = oldest;

  // CEX resolution priority:
  //   1. Static list (instant, no I/O)
  //   2. Helius description label (already in tx data)
  //   3. SolanaFM labels API (cached 24h, ~50ms)
  const staticLabel = KNOWN_LABELS[fromAddr];
  const sfmLabel = (!staticLabel && !descLabel) ? await lookupSolanaFM(fromAddr) : null;

  const isCex = !!(staticLabel || descLabel || sfmLabel);
  const sourceLabel = staticLabel ?? descLabel ?? sfmLabel ?? labelAddress(fromAddr);

  return { address, sourceAddress: fromAddr, sourceLabel, isCex, timestamp, amountSol };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("addresses");
  if (!param) return NextResponse.json({ funding: [] });

  const apiKey = getHeliusApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "No Helius API key found in SOLANA_RPC_URL" },
      { status: 500 }
    );
  }

  const addresses = param.split(",").filter(Boolean);

  const funding: FundingInfo[] = [];
  for (const addr of addresses) {
    funding.push(await fetchFundingForAddress(addr, apiKey));
    if (addresses.length > 1) await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ funding });
}
