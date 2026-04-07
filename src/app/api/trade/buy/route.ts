import { NextRequest, NextResponse } from "next/server";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getConnection, getSolBalance, getTokenBalance, keypairFromPrivateKey } from "@/lib/solana";
import { executeBuy } from "@/lib/pumpfun";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, privateKey, mintAddress, solAmount, slippageBps } = body as {
      walletAddress: string;
      privateKey: string;
      mintAddress: string;
      solAmount: number;
      slippageBps?: number;
    };

    if (!privateKey || !mintAddress || !solAmount) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const connection = getConnection();
    const keypair = keypairFromPrivateKey(privateKey);
    const mint = new PublicKey(mintAddress);

    const result = await executeBuy(connection, keypair, mint, solAmount, slippageBps);

    const newSolBalance = await getSolBalance(connection, keypair.publicKey);
    const newTokenBalance = await getTokenBalance(connection, keypair.publicKey, mint);

    const curveData = await (await import("@/lib/solana")).getBondingCurveData(connection, mint);
    const price = curveData
      ? Number(curveData.virtualSolReserves) / Number(curveData.virtualTokenReserves) / 1e3
      : 0;

    return NextResponse.json({
      txSig: result.txSig,
      solAmount: result.solSpent,
      tokenAmount: result.tokenAmount,
      price,
      newSolBalance,
      newTokenBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
