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

// Try to extract the real withdraw discriminator from a past vault outflow tx
async function findDiscriminatorFromHistory(
  connection: ReturnType<typeof getConnection>,
  creatorVault: PublicKey
): Promise<Buffer | null> {
  try {
    const sigs = await connection.getSignaturesForAddress(creatorVault, { limit: 20 });
    for (const { signature } of sigs) {
      const tx = await connection.getTransaction(signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (!tx) continue;
      // Look for instructions addressed to PUMPFUN_PROGRAM_ID that aren't buy/sell
      const BUY_DISC  = disc("buy");  // won't match because those are sha256(global:buy)[0..8]
      const SELL_DISC = disc("sell");
      const BUY_RAW  = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
      const SELL_RAW = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
      const CREATE_RAW = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

      const msg = tx.transaction.message;
      const accountKeys = "staticAccountKeys" in msg
        ? msg.staticAccountKeys
        : (msg as any).accountKeys;

      for (const ix of msg.compiledInstructions ?? (msg as any).instructions ?? []) {
        const progKey = accountKeys[ix.programIdIndex];
        if (!progKey || progKey.toBase58() !== PUMPFUN_PROGRAM_ID.toBase58()) continue;
        const data: Buffer = Buffer.isBuffer(ix.data) ? ix.data : Buffer.from(ix.data);
        if (data.length < 8) continue;
        const ixDisc = data.subarray(0, 8);
        // Skip known buy/sell/create discriminators
        if (ixDisc.equals(BUY_RAW) || ixDisc.equals(SELL_RAW) || ixDisc.equals(CREATE_RAW)) continue;
        // Check if creatorVault is an account in this ix with isWritable=true (outflow)
        const vaultIdx = accountKeys.findIndex(
          (k: PublicKey) => k.toBase58() === creatorVault.toBase58()
        );
        if (vaultIdx === -1) continue;
        const accs: number[] = Array.from(ix.accounts ?? ix.accountKeyIndexes ?? []);
        if (!accs.includes(vaultIdx)) continue;
        console.log("[creator-fees/claim] found discriminator from history:", [...ixDisc], "in tx", signature);
        return ixDisc;
      }
    }
  } catch (e) {
    console.warn("[creator-fees/claim] history scan failed:", e);
  }
  return null;
}

// Account sets to try (ordered by likelihood)
function buildAccountSets(creator: PublicKey, creatorVault: PublicKey) {
  return [
    // Minimal
    [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    // With event authority + self
    [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
  ];
}

const DISC_CANDIDATES = ["withdraw", "withdrawCreatorFees", "withdrawFees", "claimFees", "claim"];

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
    const accountSets = buildAccountSets(creator.publicKey, creatorVault);

    // First try to find the real discriminator from on-chain history
    const historyDisc = await findDiscriminatorFromHistory(connection, creatorVault);

    // Build candidate list: history disc first, then named candidates
    const discCandidates: Buffer[] = historyDisc
      ? [historyDisc]
      : DISC_CANDIDATES.map(disc);

    let chosenDisc: Buffer | null = null;
    let chosenAccounts: typeof accountSets[0] | null = null;
    const simErrors: string[] = [];

    outer: for (const d of discCandidates) {
      for (const accounts of accountSets) {
        const ix = new TransactionInstruction({ programId: PUMPFUN_PROGRAM_ID, keys: accounts, data: d });
        const testTx = new Transaction().add(priorityFeeIx(50_000), ix);
        testTx.feePayer = creator.publicKey;
        testTx.recentBlockhash = blockhash;
        testTx.sign(creator);

        const sim = await connection.simulateTransaction(testTx);
        const label = `disc=[${[...d]}] accounts=${accounts.length}`;
        console.log(`[creator-fees/claim] simulate ${label}:`, JSON.stringify(sim.value.err));

        if (!sim.value.err) {
          chosenDisc = d;
          chosenAccounts = accounts;
          console.log(`[creator-fees/claim] simulation passed: ${label}`);
          break outer;
        }
        simErrors.push(`${label}: ${JSON.stringify(sim.value.err)}`);
      }
    }

    if (!chosenDisc || !chosenAccounts) {
      console.error("[creator-fees/claim] all combinations failed:", simErrors);
      return NextResponse.json({ error: "Instruction not found", details: simErrors }, { status: 500 });
    }

    const withdrawIx = new TransactionInstruction({
      programId: PUMPFUN_PROGRAM_ID,
      keys: chosenAccounts,
      data: chosenDisc,
    });

    const tx = new Transaction().add(priorityFeeIx(50_000), withdrawIx);
    tx.feePayer = creator.publicKey;
    tx.recentBlockhash = blockhash;

    const txSig = await sendAndConfirmTransaction(connection, tx, [creator], { commitment: "confirmed" });
    const claimedSol = vaultBalance / LAMPORTS_PER_SOL;
    console.log(`[creator-fees/claim] success: ${txSig}, claimed ${claimedSol} SOL`);

    return NextResponse.json({ txSig, claimedSol });
  } catch (err: any) {
    console.error("[creator-fees/claim] fatal:", err.message, err.logs);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
