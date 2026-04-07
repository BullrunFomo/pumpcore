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
    const { walletAddress, privateKey, mintAddress, percentage, tokenAmount: exactAmount, slippageBps } = body as {
      walletAddress: string;
      privateKey: string;
      mintAddress: string;
      percentage?: number;
      tokenAmount?: number;
      slippageBps?: number;
    };

    if (!privateKey || !mintAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const connection = getConnection();
    const keypair = keypairFromPrivateKey(privateKey);
    const mint = new PublicKey(mintAddress);

    // Determine token amount to sell
    let sellAmount: number;
    if (exactAmount !== undefined) {
      sellAmount = exactAmount;
    } else if (percentage !== undefined) {
      const balance = await getTokenBalance(connection, keypair.publicKey, mint);
      sellAmount = (balance * percentage) / 100;
    } else {
      return NextResponse.json({ error: "Either percentage or tokenAmount required" }, { status: 400 });
    }

    if (sellAmount <= 0) {
      return NextResponse.json({ error: "No tokens to sell" }, { status: 400 });
    }

    const result = await executeSell(connection, keypair, mint, sellAmount, slippageBps);

    const newSolBalance = await getSolBalance(connection, keypair.publicKey);
    const newTokenBalance = await getTokenBalance(connection, keypair.publicKey, mint);

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
      newTokenBalance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
