import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { getConnection, keypairFromPrivateKey, priorityFeeIx, computeUnitLimitIx } from "@/lib/solana";

// CU budget: well above what 15 SOL transfers actually consume (~3,000 CU)
const BATCH_CU = 50_000;
// Priority: 100,000 microlamports/CU — ensures reliable landing
const BATCH_PRIORITY_MICRO = 100_000;
// priority_fee = BATCH_CU * BATCH_PRIORITY_MICRO / 1_000_000 = 5_000 lamports
const PRIORITY_FEE_LAMPORTS = Math.ceil(BATCH_CU * BATCH_PRIORITY_MICRO / 1_000_000);
// Base fee: 1 signature × 5_000 lamports
const BASE_FEE_LAMPORTS = 5_000;
const FEE_PER_BATCH = BASE_FEE_LAMPORTS + PRIORITY_FEE_LAMPORTS;
// Safe max per tx: 15 transfers fits well within 1232-byte limit
const BATCH_SIZE = 15;

const MIN_SWEEP_LAMPORTS = 5_000;

function parsePublicKey(address: string): PublicKey | null {
  try { return new PublicKey(address); } catch { return null; }
}

/**
 * Poll getSignatureStatuses until confirmed, expired, or timed out.
 * Also rebroadcasts the raw transaction every ~4 seconds to avoid drops.
 */
async function sendAndConfirm(
  connection: Connection,
  rawTx: Buffer,
  sig: string,
  lastValidBlockHeight: number,
): Promise<void> {
  const TIMEOUT_MS = 90_000;
  const POLL_INTERVAL = 1_500;
  const REBROADCAST_INTERVAL = 4_000;

  const deadline = Date.now() + TIMEOUT_MS;
  let lastBroadcast = Date.now();

  while (Date.now() < deadline) {
    // Rebroadcast periodically so the tx doesn't get dropped
    if (Date.now() - lastBroadcast >= REBROADCAST_INTERVAL) {
      try {
        await connection.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 0 });
      } catch { /* ignore — may already be on-chain */ }
      lastBroadcast = Date.now();
    }

    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value?.[0];

    if (status) {
      if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") return;
    } else {
      // Transaction not yet visible — check if blockhash has expired
      const blockHeight = await connection.getBlockHeight("confirmed");
      if (blockHeight > lastValidBlockHeight) {
        throw new Error("Transaction expired — blockhash too old. Please retry.");
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  // One final status check before giving up
  const { value: finalValue } = await connection.getSignatureStatuses([sig]);
  const finalStatus = finalValue?.[0];
  if (finalStatus && !finalStatus.err &&
    (finalStatus.confirmationStatus === "confirmed" || finalStatus.confirmationStatus === "finalized")) {
    return;
  }

  throw new Error("Confirmation timeout — the transaction may still land. Check the signature on Solscan.");
}

async function sendBatch(
  from: Keypair,
  targets: Array<{ pubkey: PublicKey; lamports: number }>,
  connection: Connection,
): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction({ recentBlockhash: blockhash, feePayer: from.publicKey }).add(
    computeUnitLimitIx(BATCH_CU),
    priorityFeeIx(BATCH_PRIORITY_MICRO),
  );
  for (const { pubkey, lamports } of targets) {
    tx.add(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: pubkey, lamports }));
  }
  tx.sign(from);

  const rawTx = tx.serialize();
  const sig = await connection.sendRawTransaction(rawTx, {
    skipPreflight: true,
    maxRetries: 0,
  });

  await sendAndConfirm(connection, rawTx, sig, lastValidBlockHeight);
  return sig;
}

async function sendBatchWithRetry(
  from: Keypair,
  targets: Array<{ pubkey: PublicKey; lamports: number }>,
  connection: Connection,
  retries = 2,
): Promise<string> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await sendBatch(from, targets, connection);
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, 2_000 * (i + 1)));
    }
  }
  throw lastErr;
}

// Find who sent SOL to this address to refund leftover to them.
async function findInboundSender(connection: Connection, address: PublicKey): Promise<PublicKey | null> {
  try {
    const sigs = await connection.getSignaturesForAddress(address, { limit: 10 }, "confirmed");
    for (const sigInfo of sigs) {
      const tx = await connection.getTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
        commitment: "confirmed",
      });
      if (!tx) continue;
      const msg = tx.transaction.message;
      const keys: PublicKey[] = (msg as any).staticAccountKeys ?? (msg as any).accountKeys ?? [];
      if (keys.length > 0 && !keys[0].equals(address)) return keys[0];
    }
  } catch {}
  return null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ error: "Missing address" }, { status: 400 });
  const pubkey = parsePublicKey(address);
  if (!pubkey) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  try {
    const balance = await getConnection().getBalance(pubkey, "confirmed");
    return NextResponse.json({ balanceSol: balance / LAMPORTS_PER_SOL, balanceLamports: balance });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch balance" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { fundingWalletPrivateKey, targetWallets, recoverTo } = await req.json() as {
      fundingWalletPrivateKey: string;
      targetWallets: string[];
      recoverTo?: string;
    };

    // ── Recovery mode: sweep entire balance to a specified address ────────────
    if (recoverTo) {
      const destPubkey = parsePublicKey(recoverTo);
      if (!destPubkey) return NextResponse.json({ error: "Invalid recovery address" }, { status: 400 });
      let keypair: Keypair;
      try { keypair = keypairFromPrivateKey(fundingWalletPrivateKey); } catch {
        return NextResponse.json({ error: "Invalid funding wallet private key" }, { status: 400 });
      }
      const connection = getConnection();
      const balance = await connection.getBalance(keypair.publicKey, "confirmed");
      const sweepable = balance - FEE_PER_BATCH;
      if (sweepable <= 0) return NextResponse.json({ error: "Insufficient balance to cover fees" }, { status: 400 });
      const sig = await sendBatchWithRetry(keypair, [{ pubkey: destPubkey, lamports: sweepable }], connection);
      return NextResponse.json({ txSig: sig, recoveredSol: sweepable / LAMPORTS_PER_SOL });
    }

    // ── Distribution mode ─────────────────────────────────────────────────────
    if (!fundingWalletPrivateKey)
      return NextResponse.json({ error: "No funding wallet key" }, { status: 400 });
    if (!targetWallets?.length)
      return NextResponse.json({ error: "No target wallets" }, { status: 400 });

    const invalidAddresses = targetWallets.filter((a) => !parsePublicKey(a));
    if (invalidAddresses.length > 0) {
      return NextResponse.json(
        { error: `Invalid wallet address(es): ${invalidAddresses.slice(0, 3).join(", ")}` },
        { status: 400 },
      );
    }

    let fundingKeypair: Keypair;
    try {
      fundingKeypair = keypairFromPrivateKey(fundingWalletPrivateKey);
    } catch {
      return NextResponse.json({ error: "Invalid funding wallet private key" }, { status: 400 });
    }

    const connection = getConnection();
    const N = targetWallets.length;
    const numBatches = Math.ceil(N / BATCH_SIZE);
    const balanceLamports = await connection.getBalance(fundingKeypair.publicKey, "confirmed");

    // Reserve one FEE_PER_BATCH per batch transaction, plus one extra for the optional refund sweep
    const totalFeeLamports = (numBatches + 1) * FEE_PER_BATCH;
    const distributableLamports = balanceLamports - totalFeeLamports;

    if (distributableLamports <= 0) {
      return NextResponse.json(
        { error: `Insufficient balance — need at least ${(totalFeeLamports / LAMPORTS_PER_SOL).toFixed(6)} SOL to cover fees` },
        { status: 400 },
      );
    }

    const perWalletLamports = Math.floor(distributableLamports / N);
    if (perWalletLamports <= 0) {
      return NextResponse.json({ error: "Amount per wallet too small after fees" }, { status: 400 });
    }

    // Split into BATCH_SIZE chunks and send sequentially to avoid blockhash races
    const batches: Array<{ addresses: string[]; txSig: string | null; error: string | null }> = [];

    for (let i = 0; i < N; i += BATCH_SIZE) {
      const chunk = targetWallets.slice(i, i + BATCH_SIZE);
      const targets = chunk.map((addr) => ({
        pubkey: new PublicKey(addr),
        lamports: perWalletLamports,
      }));
      try {
        const sig = await sendBatchWithRetry(fundingKeypair, targets, connection);
        batches.push({ addresses: chunk, txSig: sig, error: null });
      } catch (err: any) {
        batches.push({ addresses: chunk, txSig: null, error: err?.message ?? "Batch failed" });
      }
    }

    const results = targetWallets.map((addr) => {
      const batch = batches.find((b) => b.addresses.includes(addr))!;
      return {
        address: addr,
        status: batch.txSig ? "ok" : "error",
        received: batch.txSig ? perWalletLamports / LAMPORTS_PER_SOL : undefined,
        txSig: batch.txSig ?? undefined,
        error: batch.error ?? undefined,
      };
    });

    // Sweep leftover (floor remainder + unused fee reserve) back to original sender
    let refundedSol = 0;
    try {
      const remaining = await connection.getBalance(fundingKeypair.publicKey, "confirmed");
      const sweepable = remaining - FEE_PER_BATCH;
      if (sweepable >= MIN_SWEEP_LAMPORTS) {
        const sender = await findInboundSender(connection, fundingKeypair.publicKey);
        if (sender) {
          await sendBatchWithRetry(fundingKeypair, [{ pubkey: sender, lamports: sweepable }], connection);
          refundedSol = sweepable / LAMPORTS_PER_SOL;
        }
      }
    } catch {}

    return NextResponse.json({
      results,
      perWalletSol: perWalletLamports / LAMPORTS_PER_SOL,
      totalSol: balanceLamports / LAMPORTS_PER_SOL,
      refundedSol,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Unexpected error" }, { status: 500 });
  }
}
