import { NextRequest, NextResponse } from "next/server";
import { KNOWN_LABELS } from "@/lib/cex-labels";

function labelAddress(address: string): string {
  return address.slice(0, 4) + "..." + address.slice(-4);
}

// Helius enhanced transactions describe known entities in plain text:
//   "Binance transferred 1.5 SOL to AbCd..."
//   "Coinbase transferred 2 SOL to AbCd..."
// Extract the sender name when it looks like a label (not a raw address).
function extractSenderFromDescription(description: string | undefined): string | null {
  if (!description) return null;
  const match = description.match(/^(.+?)\s+transferred\s/i);
  if (!match) return null;
  const candidate = match[1].trim();
  // Solana addresses are 32–44 base58 chars — a real name is short
  if (candidate.length > 30 || /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(candidate)) return null;
  return candidate;
}

// Known CEX name fragments so we can mark Helius-described senders as isCex
// even when they're not in KNOWN_LABELS (covers unlisted hot wallets).
const CEX_NAME_FRAGMENTS = [
  "binance", "coinbase", "kraken", "okx", "bybit", "kucoin", "gate",
  "bitget", "mexc", "huobi", "htx", "crypto.com", "robinhood", "bitfinex",
  "upbit", "bithumb", "gemini", "bitstamp", "bittrex", "poloniex",
  "ftx", "celsius", "nexo",
];

function isCexName(name: string): boolean {
  const lower = name.toLowerCase();
  return CEX_NAME_FRAGMENTS.some((f) => lower.includes(f));
}

function getHeliusApiKey(): string | null {
  const rpc = process.env.SOLANA_RPC_URL ?? process.env.HELIUS_RPC_URL ?? "";
  const match = rpc.match(/api-key=([^&]+)/);
  return match ? match[1] : null;
}

export interface FundingInfo {
  address: string;
  sourceAddress: string | null;
  sourceLabel: string | null;
  isCex: boolean;
  timestamp: number | null; // ms
  amountSol: number;
}

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

  // Resolution priority:
  //   1. Static KNOWN_LABELS list (exact address match)
  //   2. Helius description label that contains a known CEX fragment
  //   3. Any Helius description label (non-address human name)
  const staticLabel = KNOWN_LABELS[fromAddr];
  const descIsCex = descLabel ? isCexName(descLabel) : false;

  const isCex = !!(staticLabel || descIsCex);
  const sourceLabel = staticLabel ?? descLabel ?? labelAddress(fromAddr);

  return { address, sourceAddress: fromAddr, sourceLabel, isCex, timestamp, amountSol };
}

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
