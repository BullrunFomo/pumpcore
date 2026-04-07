import { NextRequest, NextResponse } from "next/server";

// ─── Known exchange / entity labels ──────────────────────────────────────────
const KNOWN_LABELS: Record<string, string> = {
  // Binance
  "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM": "Binance",
  "5tzFkiKscXHK5ZXCGbXZxdw7gE8Gc7t5zjX3ZE3gAnAK": "Binance",
  "AC5RDfQFmDS1deWZos921JpqBlSPHnZGnHeGaWBL4Bxn": "Binance",
  "2ojv9BAiHUrvsm9gxDe7fJSzbNZSJcxZvf8dqmWGHG8S": "Binance",
  // Coinbase
  "H8sMJSCQxfKiFTCfDR3DUMLPwcRbM61LGFJ8N4dK3WjS": "Coinbase",
  "GJRs4FwHtemZ5ZE9x3FNvJ8TMwitKTh21yxdRPqn7npE": "Coinbase",
  "CcEVyz2fJvJKaqJNMKFnW7hANBFBZkrSkdLCYLDWk7UE": "Coinbase",
  // Kraken
  "FWznbcNXWQuHTawe9RxvQ2LdCENssh12dsznf4RiouN5": "Kraken",
  // OKX
  "5VCwKtCXgCJ6kit5FybXjvriW3xELsFDhx5Lt2yBqLog": "OKX",
  // Bybit
  "2SiSpNowr7zUv7ZWZbbb5Bm4FGR5jSNoBSQFpNBRsaqu": "Bybit",
  // KuCoin
  "BmFdpraQhkiDnE9SmkQbQDSZ9retTGqpMnkPMCJhxcJW": "KuCoin",
};

function labelAddress(address: string): string {
  return KNOWN_LABELS[address] ?? address.slice(0, 4) + "..." + address.slice(-4);
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
  timestamp: number | null; // ms
  amountSol: number;
}

async function fetchFundingForAddress(address: string, apiKey: string): Promise<FundingInfo> {
  const empty: FundingInfo = { address, sourceAddress: null, sourceLabel: null, timestamp: null, amountSol: 0 };

  // Helius returns transactions newest-first. Paginate until exhausted to find
  // the oldest incoming SOL transfer (= first ever funding of this wallet).
  const PAGE_SIZE = 100;
  const MAX_PAGES = 10; // cap at 1000 txs to avoid excessive calls

  let oldest: { sourceAddress: string; timestamp: number; amountSol: number } | null = null;
  let before: string | undefined = undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url =
      `https://api.helius.xyz/v0/addresses/${address}/transactions` +
      `?api-key=${apiKey}&limit=${PAGE_SIZE}` +
      (before ? `&before=${before}` : "");

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) break;

    const txs: any[] = await res.json();
    if (!Array.isArray(txs) || txs.length === 0) break;

    for (const tx of txs) {
      const transfers: { fromUserAccount: string; toUserAccount: string; amount: number }[] =
        tx.nativeTransfers ?? [];

      const incoming = transfers.find((t) => t.toUserAccount === address && t.amount > 0);
      if (!incoming) continue;

      // This is older than anything we've seen so far (list is newest-first)
      oldest = {
        sourceAddress: incoming.fromUserAccount,
        timestamp: tx.timestamp ? tx.timestamp * 1000 : 0,
        amountSol: incoming.amount / 1_000_000_000,
      };
    }

    // If fewer results than page size, we've reached the beginning of history
    if (txs.length < PAGE_SIZE) break;

    // Cursor for the next (older) page
    before = txs[txs.length - 1].signature;
  }

  if (!oldest) return empty;

  return {
    address,
    sourceAddress: oldest.sourceAddress,
    sourceLabel: labelAddress(oldest.sourceAddress),
    timestamp: oldest.timestamp,
    amountSol: oldest.amountSol,
  };
}

export async function GET(req: NextRequest) {
  const param = req.nextUrl.searchParams.get("addresses");
  if (!param) return NextResponse.json({ funding: [] });

  const apiKey = getHeliusApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: "No Helius API key found in SOLANA_RPC_URL" }, { status: 500 });
  }

  const addresses = param.split(",").filter(Boolean);

  const funding = await Promise.all(
    addresses.map((addr) => fetchFundingForAddress(addr, apiKey))
  );

  return NextResponse.json({ funding });
}
