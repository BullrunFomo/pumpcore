import { Connection, PublicKey } from "@solana/web3.js";

const RPC = "https://mainnet.helius-rpc.com/?api-key=8f782b8d-f2de-47e9-8ce2-11dea01afa2f";
const PUMPFUN_PROGRAM = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
const BUY_DISC = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

const conn = new Connection(RPC, "confirmed");

// Get recent signatures for the pump.fun program
const sigs = await conn.getSignaturesForAddress(PUMPFUN_PROGRAM, { limit: 50 });

for (const sig of sigs) {
  const tx = await conn.getTransaction(sig.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx?.transaction) continue;

  // Look for a buy instruction (disc matches BUY_DISC)
  const msg = tx.transaction.message;
  const accountKeys = "staticAccountKeys" in msg
    ? msg.staticAccountKeys
    : msg.accountKeys;

  let found = false;
  const instructions = "compiledInstructions" in msg ? msg.compiledInstructions : msg.instructions;
  for (const ix of instructions) {
    const progIdx = "programIdIndex" in ix ? ix.programIdIndex : ix.programIdIndex;
    const prog = accountKeys[progIdx];
    if (!prog?.equals(PUMPFUN_PROGRAM)) continue;

    const data = Buffer.from(
      "data" in ix && typeof ix.data === "string"
        ? Buffer.from(ix.data, "base64")
        : ix.data
    );
    if (data.length < 8) continue;
    if (!data.subarray(0, 8).equals(BUY_DISC)) continue;

    // Found a buy instruction
    const acctIdxs = ix.accountKeyIndexes ?? ix.accounts;
    if (acctIdxs.length < 18) continue;

    console.log("=== Found Buy Instruction ===");
    console.log("Tx sig:", sig.signature);
    console.log("Accounts count:", acctIdxs.length);
    for (let i = 0; i < acctIdxs.length; i++) {
      const key = accountKeys[acctIdxs[i]];
      console.log(`  [${i.toString().padStart(2)}]: ${key?.toBase58() ?? "unknown"}`);
    }
    found = true;
    break;
  }
  if (found) break;
}
