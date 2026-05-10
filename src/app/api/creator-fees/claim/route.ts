import { NextRequest, NextResponse } from "next/server";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import crypto from "crypto";
import {
  getConnection,
  keypairFromPrivateKey,
  getBondingCurveData,
  getCreatorVaultPDA,
  PUMPFUN_PROGRAM_ID,
  PUMPFUN_EVENT_AUTHORITY,
  priorityFeeIx,
} from "@/lib/solana";

function disc(name: string): Buffer {
  return Buffer.from(
    crypto.createHash("sha256").update("global:" + name).digest().subarray(0, 8)
  );
}

// Try both known candidate names for the creator fee withdrawal instruction
const CANDIDATES = ["withdraw", "withdrawCreatorFees", "withdrawFees"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { mint, privateKey } = body as { mint: string; privateKey: string };

    if (!mint || !privateKey) {
      return NextResponse.json({ error: "Missing mint or privateKey" }, { status: 400 });
    }

    const connection = getConnection();
    const mintPubkey = new PublicKey(mint);
    const creator = keypairFromPrivateKey(privateKey);

    const curveData = await getBondingCurveData(connection, mintPubkey);
    if (!curveData) {
      return NextResponse.json({ error: "Bonding curve not found" }, { status: 404 });
    }

    if (!curveData.creator.equals(creator.publicKey)) {
      return NextResponse.json(
        { error: "Provided wallet is not the token creator" },
        { status: 403 }
      );
    }

    const creatorVault = getCreatorVaultPDA(creator.publicKey);
    const vaultBalance = await connection.getBalance(creatorVault);

    if (vaultBalance === 0) {
      return NextResponse.json({ error: "No fees to claim" }, { status: 400 });
    }

    const { blockhash } = await connection.getLatestBlockhash();

    // Try each candidate discriminator; use the first one that simulates without error
    let chosenDisc: Buffer | null = null;
    const simErrors: Record<string, string> = {};

    for (const name of CANDIDATES) {
      const d = disc(name);
      const ix = new TransactionInstruction({
        programId: PUMPFUN_PROGRAM_ID,
        keys: [
          { pubkey: creator.publicKey, isSigner: true, isWritable: true },
          { pubkey: creatorVault, isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
          { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: d,
      });

      const testTx = new Transaction().add(priorityFeeIx(50_000), ix);
      testTx.feePayer = creator.publicKey;
      testTx.recentBlockhash = blockhash;
      testTx.sign(creator);

      const sim = await connection.simulateTransaction(testTx);
      console.log(`[creator-fees/claim] simulate ${name}:`, JSON.stringify(sim.value.err), sim.value.logs?.slice(-5));

      if (!sim.value.err) {
        chosenDisc = d;
        console.log(`[creator-fees/claim] using discriminator: ${name}`);
        break;
      }
      simErrors[name] = JSON.stringify(sim.value.err);
    }

    if (!chosenDisc) {
      return NextResponse.json(
        { error: "All discriminator candidates failed simulation", details: simErrors },
        { status: 500 }
      );
    }

    const withdrawIx = new TransactionInstruction({
      programId: PUMPFUN_PROGRAM_ID,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: creatorVault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: chosenDisc,
    });

    const tx = new Transaction().add(priorityFeeIx(50_000), withdrawIx);
    tx.feePayer = creator.publicKey;
    tx.recentBlockhash = blockhash;

    const txSig = await sendAndConfirmTransaction(connection, tx, [creator], {
      commitment: "confirmed",
    });

    const claimedSol = vaultBalance / LAMPORTS_PER_SOL;
    console.log(`[creator-fees/claim] success: ${txSig}, claimed ${claimedSol} SOL`);

    return NextResponse.json({ txSig, claimedSol });
  } catch (err: any) {
    console.error("[creator-fees/claim] error:", err.message, err.logs);
    return NextResponse.json({ error: err.message, logs: err.logs }, { status: 500 });
  }
}
