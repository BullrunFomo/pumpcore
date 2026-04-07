import { NextRequest, NextResponse } from "next/server";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { getConnection, getSolBalance, getTokenBalance } from "@/lib/solana";

// ─── Parse private keys from raw input ────────────────────────────────────────

function parsePrivateKeys(raw: string): string[] {
  raw = raw.trim();
  // JSON array
  if (raw.startsWith("[")) {
    const arr = JSON.parse(raw) as (string | number[])[];
    return arr.map((k) => {
      if (typeof k === "string") return k;
      return bs58.encode(Uint8Array.from(k));
    });
  }
  // One per line (base58 or JSON array per line)
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (l.startsWith("[")) {
        const arr = JSON.parse(l) as number[];
        return bs58.encode(Uint8Array.from(arr));
      }
      return l;
    });
}

function keypairFromBase58(key: string): Keypair {
  const decoded = bs58.decode(key);
  return Keypair.fromSecretKey(decoded);
}

// ─── POST /api/wallets — import wallets ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { privateKeys } = body as { privateKeys: string };

    if (!privateKeys) {
      return NextResponse.json({ error: "privateKeys required" }, { status: 400 });
    }

    const keys = parsePrivateKeys(privateKeys);
    if (keys.length === 0) {
      return NextResponse.json({ error: "No valid keys found" }, { status: 400 });
    }

    const connection = getConnection();
    const wallets = await Promise.all(
      keys.map(async (k, i) => {
        try {
          const kp = keypairFromBase58(k);
          const address = kp.publicKey.toBase58();
          const solBalance = await getSolBalance(connection, kp.publicKey);
          return {
            id: `wallet-${Date.now()}-${i}`,
            address,
            privateKey: k,
            solBalance,
            tokenBalance: 0,
            avgBuyPrice: 0,
            totalSolSpent: 0,
            status: "idle" as const,
            color: "#6366f1",
            importedAt: new Date().toISOString(),
          };
        } catch (err: any) {
          return null;
        }
      })
    );

    const valid = wallets.filter(Boolean);
    if (valid.length === 0) {
      return NextResponse.json({ error: "No valid wallets" }, { status: 400 });
    }

    return NextResponse.json({ wallets: valid });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── GET /api/wallets — refresh balances ──────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const addressesParam = searchParams.get("addresses");
    const mintParam = searchParams.get("mint");

    if (!addressesParam) {
      return NextResponse.json({ wallets: [] });
    }

    const addresses = addressesParam.split(",").filter(Boolean);
    const connection = getConnection();
    const mintPubkey = mintParam ? new PublicKey(mintParam) : null;

    const wallets = await Promise.all(
      addresses.map(async (address) => {
        const pub = new PublicKey(address);
        const solBalance = await getSolBalance(connection, pub);
        const tokenBalance = mintPubkey
          ? await getTokenBalance(connection, pub, mintPubkey)
          : 0;
        return { address, solBalance, tokenBalance };
      })
    );

    return NextResponse.json({ wallets });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
