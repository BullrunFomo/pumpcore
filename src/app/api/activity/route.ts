import { NextRequest } from "next/server";
import { PublicKey, VersionedTransaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, keypairFromPrivateKey } from "@/lib/solana";

export const dynamic = "force-dynamic";

const SOL_MINT = "So11111111111111111111111111111111111111112";

interface PumpToken {
  mint: string;
  name: string;
  symbol: string;
  usd_market_cap: number;
  complete: boolean;
}

async function fetchQualifyingTokens(): Promise<PumpToken[]> {
  // DexScreener is accessible server-side; search for PumpSwap pairs on Solana
  const res = await fetch(
    "https://api.dexscreener.com/latest/dex/search?q=pumpswap",
    { headers: { Accept: "application/json" }, next: { revalidate: 0 } }
  );
  if (!res.ok) throw new Error(`DexScreener API error: ${res.status}`);
  const data = await res.json() as { pairs?: any[] };
  const pairs: any[] = data.pairs ?? [];

  const tokens: PumpToken[] = pairs
    .filter(
      (p) =>
        p.chainId === "solana" &&
        p.dexId === "pumpswap" &&
        typeof p.fdv === "number" &&
        p.fdv >= 300_000
    )
    .map((p) => ({
      mint: p.baseToken.address as string,
      name: p.baseToken.name as string,
      symbol: p.baseToken.symbol as string,
      usd_market_cap: p.fdv as number,
      complete: true,
    }));

  // Deduplicate by mint address
  const seen = new Set<string>();
  return tokens.filter((t) => {
    if (seen.has(t.mint)) return false;
    seen.add(t.mint);
    return true;
  });
}

// ─── Jupiter helpers ──────────────────────────────────────────────────────────

async function jupiterBuy(
  connection: Connection,
  keypair: ReturnType<typeof keypairFromPrivateKey>,
  tokenMint: string,
  solAmount: number
): Promise<{ txSig: string; tokenAmount: number }> {
  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);

  const quoteRes = await fetch(
    `https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=${tokenMint}&amount=${lamports}&slippageBps=500`
  );
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${quoteRes.status}`);
  const quote = await quoteRes.json();
  if (quote.error) throw new Error(`Jupiter quote error: ${quote.error}`);

  const swapRes = await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 10_000,
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap failed: ${swapRes.status}`);
  const { swapTransaction, error: swapError } = await swapRes.json();
  if (swapError) throw new Error(`Jupiter swap error: ${swapError}`);

  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  await connection.confirmTransaction(txSig, "confirmed");

  const outAmount = Number(quote.outAmount) / 1e6;
  return { txSig, tokenAmount: outAmount };
}

async function getRawTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: string
): Promise<bigint> {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: new PublicKey(mint),
  });
  if (!accounts.value.length) return BigInt(0);
  const raw = accounts.value[0].account.data.parsed.info.tokenAmount.amount as string;
  return BigInt(raw);
}

async function jupiterSell(
  connection: Connection,
  keypair: ReturnType<typeof keypairFromPrivateKey>,
  tokenMint: string,
  rawAmount: bigint
): Promise<{ txSig: string; solReceived: number }> {
  if (rawAmount === BigInt(0)) throw new Error("No token balance to sell");

  const quoteRes = await fetch(
    `https://api.jup.ag/swap/v1/quote?inputMint=${tokenMint}&outputMint=${SOL_MINT}&amount=${rawAmount.toString()}&slippageBps=500`
  );
  if (!quoteRes.ok) throw new Error(`Jupiter quote failed: ${quoteRes.status}`);
  const quote = await quoteRes.json();
  if (quote.error) throw new Error(`Jupiter quote error: ${quote.error}`);

  const swapRes = await fetch("https://api.jup.ag/swap/v1/swap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: keypair.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 10_000,
    }),
  });
  if (!swapRes.ok) throw new Error(`Jupiter swap failed: ${swapRes.status}`);
  const { swapTransaction, error: swapError } = await swapRes.json();
  if (swapError) throw new Error(`Jupiter swap error: ${swapError}`);

  const txBuf = Buffer.from(swapTransaction, "base64");
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([keypair]);

  const txSig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
  await connection.confirmTransaction(txSig, "confirmed");

  const solReceived = Number(quote.outAmount) / LAMPORTS_PER_SOL;
  return { txSig, solReceived };
}

// ─── SSE helpers ──────────────────────────────────────────────────────────────

function sseEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

function log(
  controller: ReadableStreamDefaultController,
  message: string,
  level: "info" | "success" | "error" | "warn" = "info",
  txSig?: string,
  walletAddress?: string
) {
  sseEvent(controller, { type: "log", level, message, txSig, walletAddress });
}

// ─── GET /api/activity ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const tokens = await fetchQualifyingTokens();
    return Response.json({ tokens: tokens.slice(0, 20) });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

// ─── POST /api/activity — SSE stream ─────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { wallets, solAmount, loops } = body as {
    wallets: { address: string; privateKey: string }[];
    solAmount: number;
    loops: number;
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        if (!wallets?.length || !solAmount || !loops) {
          sseEvent(controller, { type: "error", message: "Missing required fields" });
          controller.close();
          return;
        }

        log(controller, `Starting activity — ${loops} loop(s), ${wallets.length} wallet(s), ${solAmount} SOL each`);

        let tokens: PumpToken[];
        try {
          tokens = await fetchQualifyingTokens();
          if (tokens.length === 0) throw new Error("No qualifying tokens found (graduated PumpFun tokens ≥ $300k mcap)");
          log(controller, `Found ${tokens.length} qualifying token(s) with mcap ≥ $300k`);
        } catch (err: any) {
          log(controller, `Failed to fetch tokens: ${err.message}`, "error");
          sseEvent(controller, { type: "complete" });
          controller.close();
          return;
        }

        const connection = getConnection();
        let completedLoops = 0;

        for (let loop = 1; loop <= loops; loop++) {
          log(controller, `━━ Loop ${loop}/${loops} — assigning each wallet a random token`);
          sseEvent(controller, { type: "progress", loop: loop - 1, total: loops });

          // Assign each wallet a distinct random token
          const walletTokens = wallets.map((w) => ({
            wallet: w,
            token: tokens[Math.floor(Math.random() * tokens.length)],
          }));

          // Buy — all wallets in parallel, each on its own token
          log(controller, `Buying ${solAmount} SOL on ${wallets.length} wallet(s) via Jupiter → PumpSwap...`);
          const buyResults = await Promise.allSettled(
            walletTokens.map(async ({ wallet: w, token }) => {
              const keypair = keypairFromPrivateKey(w.privateKey);
              const result = await jupiterBuy(connection, keypair, token.mint, solAmount);
              log(
                controller,
                `Buy ✓ — ${solAmount} SOL → ~${result.tokenAmount.toFixed(0)} ${token.symbol} ($${Math.round(token.usd_market_cap / 1000)}k)`,
                "success",
                result.txSig,
                w.address
              );
              return { wallet: w, token };
            })
          );

          buyResults.forEach((r) => {
            if (r.status === "rejected") {
              log(controller, `Buy failed: ${r.reason?.message ?? r.reason}`, "error");
            }
          });

          // Random hold: 2–5 seconds
          const holdMs = 2000 + Math.random() * 3000;
          log(controller, `Holding for ${(holdMs / 1000).toFixed(1)}s...`);
          await new Promise((r) => setTimeout(r, holdMs));

          // Sell — each wallet sells the token it bought
          log(controller, `Selling 100% on ${wallets.length} wallet(s) via Jupiter → PumpSwap...`);
          await Promise.allSettled(
            buyResults.map(async (res) => {
              if (res.status !== "fulfilled") return;
              const { wallet: w, token } = res.value;
              const keypair = keypairFromPrivateKey(w.privateKey);
              const rawBalance = await getRawTokenBalance(connection, keypair.publicKey, token.mint);
              if (rawBalance === BigInt(0)) {
                log(controller, `No ${token.symbol} balance to sell`, "warn", undefined, w.address);
                return;
              }
              const sellResult = await jupiterSell(connection, keypair, token.mint, rawBalance);
              log(
                controller,
                `Sell ✓ — ${token.symbol} → ${sellResult.solReceived.toFixed(4)} SOL`,
                "success",
                sellResult.txSig,
                w.address
              );
            })
          );

          completedLoops++;
          sseEvent(controller, { type: "progress", loop, total: loops });

          if (loop < loops) {
            await new Promise((r) => setTimeout(r, 1500 + Math.random() * 2000));
          }
        }

        log(controller, `Activity complete — ${completedLoops}/${loops} loop(s) finished`, "success");
        sseEvent(controller, { type: "complete", completedLoops });
      } catch (err: any) {
        sseEvent(controller, { type: "error", message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
