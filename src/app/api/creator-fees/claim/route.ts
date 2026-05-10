import { NextRequest, NextResponse } from "next/server";
import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getConnection,
  keypairFromPrivateKey,
  getBondingCurveData,
  getBondingCurvePDA,
  getCreatorVaultPDA,
  PUMPFUN_PROGRAM_ID,
  priorityFeeIx,
} from "@/lib/solana";

// sha256("global:collect_creator_fee")[0..8]
const COLLECT_CREATOR_FEE_DISC = Buffer.from([138, 96, 174, 217, 48, 85, 197, 246]);

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

    const [bondingCurve] = getBondingCurvePDA(mintPubkey);
    const creatorVault = getCreatorVaultPDA(creator.publicKey);

    const vaultBalance = await connection.getBalance(creatorVault);
    if (vaultBalance === 0) {
      return NextResponse.json({ error: "No fees to claim" }, { status: 400 });
    }

    const ix = new TransactionInstruction({
      programId: PUMPFUN_PROGRAM_ID,
      keys: [
        { pubkey: bondingCurve,             isSigner: false, isWritable: true  },
        { pubkey: mintPubkey,               isSigner: false, isWritable: false },
        { pubkey: creatorVault,             isSigner: false, isWritable: true  },
        { pubkey: creator.publicKey,        isSigner: true,  isWritable: true  },
        { pubkey: SystemProgram.programId,  isSigner: false, isWritable: false },
      ],
      data: COLLECT_CREATOR_FEE_DISC,
    });

    const { blockhash } = await connection.getLatestBlockhash();
    const tx = new Transaction().add(priorityFeeIx(50_000), ix);
    tx.feePayer = creator.publicKey;
    tx.recentBlockhash = blockhash;

    const txSig = await sendAndConfirmTransaction(connection, tx, [creator], { commitment: "confirmed" });
    const claimedSol = vaultBalance / LAMPORTS_PER_SOL;
    console.log(`[creator-fees/claim] success: ${txSig}, claimed ${claimedSol} SOL`);

    return NextResponse.json({ txSig, claimedSol });
  } catch (err: any) {
    console.error("[creator-fees/claim] error:", err.message, err.logs);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
