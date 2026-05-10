import { NextRequest, NextResponse } from "next/server";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getBondingCurveData, getCreatorVaultPDA } from "@/lib/solana";

export async function GET(req: NextRequest) {
  try {
    const mint = req.nextUrl.searchParams.get("mint");
    if (!mint) return NextResponse.json({ error: "Missing mint" }, { status: 400 });

    const connection = getConnection();
    const mintPubkey = new PublicKey(mint);
    const curveData = await getBondingCurveData(connection, mintPubkey);
    if (!curveData) return NextResponse.json({ error: "Bonding curve not found" }, { status: 404 });

    const creatorVault = getCreatorVaultPDA(curveData.creator);
    const lamports = await connection.getBalance(creatorVault);
    const solBalance = lamports / LAMPORTS_PER_SOL;

    return NextResponse.json({
      creator: curveData.creator.toBase58(),
      creatorVault: creatorVault.toBase58(),
      feeSol: solBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
