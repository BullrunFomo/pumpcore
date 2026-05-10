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

// sha256("global:withdraw")[0..8]
const WITHDRAW_DISCRIMINATOR = crypto
  .createHash("sha256")
  .update("global:withdraw")
  .digest()
  .subarray(0, 8);

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

    const withdrawIx = new TransactionInstruction({
      programId: PUMPFUN_PROGRAM_ID,
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: true },
        { pubkey: creatorVault, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
        { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(WITHDRAW_DISCRIMINATOR),
    });

    const tx = new Transaction().add(priorityFeeIx(50_000), withdrawIx);
    tx.feePayer = creator.publicKey;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const txSig = await sendAndConfirmTransaction(connection, tx, [creator], {
      commitment: "confirmed",
    });

    const claimedSol = vaultBalance / LAMPORTS_PER_SOL;

    return NextResponse.json({ txSig, claimedSol });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
