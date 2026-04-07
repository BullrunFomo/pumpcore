import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  getConnection,
  getSolBalance,
  getTokenBalance,
  keypairFromPrivateKey,
} from "@/lib/solana";
import { executeSell } from "@/lib/pumpfun";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, privateKey, mintAddress } = body as {
      walletAddress: string;
      privateKey: string;
      mintAddress: string;
    };

    if (!privateKey || !mintAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const connection = getConnection();
    const keypair = keypairFromPrivateKey(privateKey);
    const mint = new PublicKey(mintAddress);

    const tokenBalance = await getTokenBalance(connection, keypair.publicKey, mint);

    if (tokenBalance <= 0) {
      return NextResponse.json({ error: "No tokens to sell" }, { status: 400 });
    }

    const result = await executeSell(connection, keypair, mint, tokenBalance);

    const newSolBalance = await getSolBalance(connection, keypair.publicKey);

    const curveData = await (
      await import("@/lib/solana")
    ).getBondingCurveData(connection, mint);
    const price = curveData
      ? Number(curveData.virtualSolReserves) /
        Number(curveData.virtualTokenReserves) /
        1e3
      : 0;

    return NextResponse.json({
      txSig: result.txSig,
      solAmount: result.solReceived,
      tokenAmount: result.tokensSold,
      price,
      newSolBalance,
      newTokenBalance: 0,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
