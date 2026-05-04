import { NextRequest, NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { getConnection } from "@/lib/solana";

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
  return pda;
}

export async function GET(req: NextRequest) {
  const mint = req.nextUrl.searchParams.get("mint");
  if (!mint) return NextResponse.json({ error: "missing mint" }, { status: 400 });

  try {
    const connection = getConnection();
    const metadataPDA = getMetadataPDA(new PublicKey(mint));
    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) throw new Error("metadata account not found");

    const data = accountInfo.data;
    // key(1) + update_authority(32) + mint(32) = offset 65
    let offset = 65;

    // name: 4-byte LE length + max 32 bytes (fixed 36 total)
    const nameLen = data.readUInt32LE(offset);
    const name = data.slice(offset + 4, offset + 4 + Math.min(nameLen, 32))
      .toString("utf8").replace(/\0/g, "").trim();
    offset += 36;

    // symbol: 4-byte LE length + max 10 bytes (fixed 14 total)
    const symbolLen = data.readUInt32LE(offset);
    const symbol = data.slice(offset + 4, offset + 4 + Math.min(symbolLen, 10))
      .toString("utf8").replace(/\0/g, "").trim();
    offset += 14;

    // uri: 4-byte LE length + max 200 bytes (fixed 204 total)
    const uriLen = data.readUInt32LE(offset);
    const uri = data.slice(offset + 4, offset + 4 + Math.min(uriLen, 200))
      .toString("utf8").replace(/\0/g, "").trim();

    // Fetch off-chain JSON to get image
    let image = "";
    if (uri) {
      try {
        const metaRes = await fetch(uri, {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(6000),
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          const raw = metaJson.image ?? metaJson.image_uri ?? "";
          image = raw.startsWith("ipfs://")
            ? `https://cf-ipfs.com/ipfs/${raw.slice(7)}`
            : raw;
        }
      } catch {}
    }

    return NextResponse.json({ name, symbol, image, uri });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
