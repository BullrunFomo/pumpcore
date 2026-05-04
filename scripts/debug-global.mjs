import { Connection, PublicKey } from "@solana/web3.js";

const RPC = "https://mainnet.helius-rpc.com/?api-key=8f782b8d-f2de-47e9-8ce2-11dea01afa2f";
const PUMPFUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const [GLOBAL] = PublicKey.findProgramAddressSync([Buffer.from("global")], PUMPFUN_PROGRAM);

const conn = new Connection(RPC, "confirmed");
const info = await conn.getAccountInfo(GLOBAL);
if (!info) { console.error("Global not found"); process.exit(1); }

const d = info.data;
console.log("Global account size:", d.length, "bytes\n");

// Known fields
console.log("=== Known fields ===");
console.log("offset  8 [1]:  initialized =", d[8]);
console.log("offset  9 [32]: authority   =", new PublicKey(d.subarray(9, 41)).toBase58());
console.log("offset 41 [32]: fee_recipient =", new PublicKey(d.subarray(41, 73)).toBase58());
console.log("offset 73 [8]:  init_virt_tok_reserves =", d.readBigUInt64LE(73).toString());
console.log("offset 81 [8]:  init_virt_sol_reserves =", d.readBigUInt64LE(81).toString());
console.log("offset 89 [8]:  init_real_tok_reserves =", d.readBigUInt64LE(89).toString());
console.log("offset 97 [8]:  token_total_supply     =", d.readBigUInt64LE(97).toString());
console.log("offset 105[8]:  fee_basis_points       =", d.readBigUInt64LE(105).toString());

console.log("\n=== Candidate Pubkeys after offset 113 ===");
for (let off = 113; off + 32 <= d.length; off++) {
  const candidate = new PublicKey(d.subarray(off, off + 32));
  const base58 = candidate.toBase58();
  // Print every 32-byte boundary
  if ((off - 113) % 8 === 0) {
    console.log(`offset ${off.toString().padStart(3)} [32]: ${base58}`);
  }
}

console.log("\n=== Raw hex from offset 113 ===");
console.log(d.subarray(113).toString("hex"));
