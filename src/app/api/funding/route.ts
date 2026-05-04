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

  // We want the OLDEST inbound SOL transfer — that's the original funding, not a recent
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
      oldest = {
        address,
        sourceAddress: incoming.fromUserAccount,
        sourceLabel: labelAddress(incoming.fromUserAccount),
        timestamp: tx.timestamp ? tx.timestamp * 1000 : null,
        amountSol: incoming.amount / 1_000_000_000,
      };
    }

    // Fewer than 100 results means we've seen the full history — stop paginating
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
