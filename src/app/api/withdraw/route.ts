import { NextRequest, NextResponse } from "next/server";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";
import { getConnection, keypairFromPrivateKey } from "@/lib/solana";

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
      const blockHeight = await connection.getBlockHeight("confirmed");
      if (blockHeight > lastValidBlockHeight) {
        throw new Error("Transaction expired — blockhash too old. Please retry.");
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  const { value: finalValue } = await connection.getSignatureStatuses([sig]);
  const finalStatus = finalValue?.[0];
  if (finalStatus && !finalStatus.err &&
    (finalStatus.confirmationStatus === "confirmed" || finalStatus.confirmationStatus === "finalized")) {
    return;
  }

  throw new Error("Confirmation timeout — the transaction may still land. Check Solscan.");
}

async function sendWithdraw(
  keypair: Keypair,
  dest: PublicKey,
  amountSol: number | "all",
  dustLamports: number,
  retries = 2,
): Promise<{ txSig: string; sent: number }> {
  const connection = getConnection();
  let lastErr: unknown;

  for (let i = 0; i <= retries; i++) {
    try {
      const [balanceLamports, { blockhash, lastValidBlockHeight }] = await Promise.all([
        connection.getBalance(keypair.publicKey, "confirmed"),
        connection.getLatestBlockhash("confirmed"),
      ]);

      // Get the exact fee the network will charge for this transaction.
      // getFeeForMessage accounts for the actual lamports_per_signature on this
      // cluster — which may differ from the 5 000 lamport assumption.
      const probeMsg = new Transaction({ recentBlockhash: blockhash, feePayer: keypair.publicKey })
        .add(SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: dest, lamports: 1 }))
        .compileMessage();
      const feeRes = await connection.getFeeForMessage(probeMsg, "confirmed");
      const exactFee = feeRes.value ?? 5_000;

      const maxSendable = balanceLamports - exactFee - dustLamports;
      if (maxSendable <= 0) throw new Error("skip");

      const sendLamports = amountSol === "all"
        ? maxSendable
        : Math.min(Math.round((amountSol as number) * LAMPORTS_PER_SOL), maxSendable);

      if (sendLamports <= 0) throw new Error("skip");

      const tx = new Transaction({ recentBlockhash: blockhash, feePayer: keypair.publicKey }).add(
        SystemProgram.transfer({ fromPubkey: keypair.publicKey, toPubkey: dest, lamports: sendLamports })
      );
      tx.sign(keypair);
      const rawTx = tx.serialize();
      const sig = await connection.sendRawTransaction(rawTx, { skipPreflight: true, maxRetries: 0 });
      await sendAndConfirm(connection, rawTx, sig, lastValidBlockHeight);
      return { txSig: sig, sent: sendLamports };
    } catch (err) {
      lastErr = err;
      // Don't retry skip conditions
      if ((err as Error).message === "skip") throw err;
      if (i < retries) await new Promise((r) => setTimeout(r, 2_000 * (i + 1)));
    }
  }
  throw lastErr;
}

export async function POST(req: NextRequest) {
  try {
    const { wallets, destination, amountSol, leaveDustSol } = await req.json() as {
      wallets: { address: string; privateKey: string; solBalance: number }[];
      destination: string;
      amountSol: number | "all";
      leaveDustSol: number | null;
    };

    if (!wallets?.length) return NextResponse.json({ error: "No wallets provided" }, { status: 400 });

    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(destination);
    } catch {
      return NextResponse.json({ error: "Invalid destination address" }, { status: 400 });
    }

    const dustLamports = leaveDustSol != null ? Math.round(leaveDustSol * LAMPORTS_PER_SOL) : 0;

    const results: {
      address: string;
      status: "ok" | "skip" | "error";
      txSig?: string;
      sent?: number;
      error?: string;
    }[] = [];

    for (const w of wallets) {
      try {
        const keypair = keypairFromPrivateKey(w.privateKey);
        const { txSig, sent } = await sendWithdraw(keypair, destPubkey, amountSol, dustLamports);
        results.push({ address: w.address, status: "ok", txSig, sent: sent / LAMPORTS_PER_SOL });
      } catch (err: any) {
        if (err.message === "skip") {
          results.push({ address: w.address, status: "skip" });
        } else {
          results.push({ address: w.address, status: "error", error: err.message });
        }
      }
    }

    return NextResponse.json({ results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
