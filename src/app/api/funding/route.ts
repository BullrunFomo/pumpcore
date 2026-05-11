import { NextRequest, NextResponse } from "next/server";
import { KNOWN_LABELS } from "@/lib/cex-labels";

function labelAddress(address: string): string {
  return KNOWN_LABELS[address] ?? address.slice(0, 4) + "..." + address.slice(-4);
}

// Helius enhanced transactions include a human-readable description like:
//   "Binance transferred 1.5 SOL to AbCd..."
//   "FWzn...ouN5 transferred 2 SOL to AbCd..."
// Extract the sender label from the description when it looks like a name, not an address.
function extractSenderFromDescription(description: string | undefined): string | null {
  if (!description) return null;
  const match = description.match(/^(.+?)\s+transferred\s/i);
  if (!match) return null;
  const candidate = match[1].trim();
  // Solana addresses are 43–44 base58 chars; a real name is short
  if (candidate.length > 25 || /^[1-9A-HJ-NP-Za-km-z]{32,}$/.test(candidate)) return null;
  return candidate;
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
  const empty: FundingInfo = { address, sourceAddress: null, sourceLabel: null, isCex: false, timestamp: null, amountSol: 0 };

  // We want the OLDEST inbound SOL transfer . that's the original funding, not a recent
  // sell-proceeds deposit from an AMM. Helius returns newest-first, so we paginate up to
  // MAX_PAGES and keep overwriting the result; the last match found is the oldest.
  const MAX_PAGES = 3;
  let before: string | undefined;
  let oldest: FundingInfo | null = null;

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

    // Scan newest→oldest; keep overwriting so `oldest` ends up as the earliest inbound
    for (const tx of txs) {
      const transfers: { fromUserAccount: string; toUserAccount: string; amount: number }[] =
        tx.nativeTransfers ?? [];
      const incoming = transfers.find((t) => t.toUserAccount === address && t.amount > 0);
      if (!incoming) continue;
      const fromAddr = incoming.fromUserAccount;
      const descLabel = extractSenderFromDescription(tx.description);
      const staticLabel = KNOWN_LABELS[fromAddr];
      // Prefer Helius description label (covers unlisted CEX hot wallets) then static list
      const sourceLabel = descLabel ?? staticLabel ?? labelAddress(fromAddr);
      const isCex = !!(descLabel || staticLabel);
      oldest = {
        address,
        sourceAddress: fromAddr,
        sourceLabel,
        isCex,
        timestamp: tx.timestamp ? tx.timestamp * 1000 : null,
        amountSol: incoming.amount / 1_000_000_000,
      };
    }

    // Fewer than 100 results means we've seen the full history . stop paginating
    if (txs.length < 100) break;

    before = txs[txs.length - 1].signature;
  }

  return oldest ?? empty;
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("addresses");
  if (!param) return NextResponse.json({ funding: [] });

  const apiKey = getHeliusApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "No Helius API key found in SOLANA_RPC_URL" }, { status: 500 });
  }

  const addresses = param.split(",").filter(Boolean);

  // Sequential with a small delay to avoid Helius rate limits.
  const funding: FundingInfo[] = [];
  for (const addr of addresses) {
    funding.push(await fetchFundingForAddress(addr, apiKey));
    if (addresses.length > 1) await new Promise((r) => setTimeout(r, 120));
  }

  return NextResponse.json({ funding });
}
