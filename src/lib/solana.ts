import {
  Connection,
  PublicKey,
  Keypair,
  TransactionInstruction,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

export { TOKEN_2022_PROGRAM_ID };
import bs58 from "bs58";

// ─── Constants ─────────────────────────────────────────────────────────────────

export const PUMPFUN_PROGRAM_ID = new PublicKey(
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
);

// Derived PDAs — correct regardless of program version
export const [PUMPFUN_GLOBAL] = PublicKey.findProgramAddressSync(
  [Buffer.from("global")],
  PUMPFUN_PROGRAM_ID
);

export const [MINT_AUTHORITY] = PublicKey.findProgramAddressSync(
  [Buffer.from("mint-authority")],
  PUMPFUN_PROGRAM_ID
);

export const [PUMPFUN_EVENT_AUTHORITY] = PublicKey.findProgramAddressSync(
  [Buffer.from("__event_authority")],
  PUMPFUN_PROGRAM_ID
);

// Fee recipient is a fixed known address stored in the global state
export const PUMPFUN_FEE_RECIPIENT = new PublicKey(
  "CebN5WGQ4jvEPvsVU4EoHEpgznyQHedrCNvcNQSZTCfA"
);

export const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const FEE_PROGRAM = new PublicKey(
  "pfeeUxB6jkeY1Hxd7CsFCAjcbHA9rWtchMGdZ6VojVZ"
);

export const [GLOBAL_VOLUME_ACCUMULATOR] = PublicKey.findProgramAddressSync(
  [Buffer.from("global_volume_accumulator")],
  PUMPFUN_PROGRAM_ID
);

export const [FEE_CONFIG] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("fee_config"),
    Buffer.from([1, 86, 224, 246, 147, 102, 90, 207, 68, 219, 21, 104, 191, 23, 91, 170, 81, 137, 203, 151, 245, 210, 255, 59, 101, 93, 43, 182, 253, 109, 24, 176]),
  ],
  FEE_PROGRAM
);

export function getCreatorVaultPDA(creator: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator-vault"), creator.toBuffer()],
    PUMPFUN_PROGRAM_ID
  );
  return pda;
}

export function getUserVolumeAccumulatorPDA(user: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("user_volume_accumulator"), user.toBuffer()],
    PUMPFUN_PROGRAM_ID
  );
  return pda;
}

export function getBondingCurveV2PDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve-v2"), mint.toBuffer()],
    PUMPFUN_PROGRAM_ID
  );
  return pda;
}

export const JITO_TIP_ACCOUNTS = [
  "96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5",
  "HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe",
  "Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY",
  "ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49",
  "DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh",
  "ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt",
  "DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL",
  "3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getConnection(): Connection {
  const rpc =
    process.env.HELIUS_RPC_URL ||
    process.env.SOLANA_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

export function keypairFromPrivateKey(privateKey: string): Keypair {
  try {
    // Try base58
    const decoded = bs58.decode(privateKey);
    return Keypair.fromSecretKey(decoded);
  } catch {
    // Try as JSON array
    const arr = JSON.parse(privateKey) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
}

export function randomTipAccount(): PublicKey {
  return new PublicKey(
    JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]
  );
}

// ─── Balance Fetching ─────────────────────────────────────────────────────────

export async function getSolBalance(
  connection: Connection,
  publicKey: PublicKey
): Promise<number> {
  const lamports = await connection.getBalance(publicKey);
  return lamports / LAMPORTS_PER_SOL;
}

export async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey
): Promise<number> {
  // Try Token2022 first, fall back to legacy SPL
  for (const program of [TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID]) {
    try {
      const ata = await getAssociatedTokenAddress(mint, owner, false, program);
      const account = await getAccount(connection, ata, undefined, program);
      return Number(account.amount) / 1e6;
    } catch {
      // try next program
    }
  }
  return 0;
}

// ─── PumpFun Bonding Curve ────────────────────────────────────────────────────

export function getBondingCurvePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), mint.toBuffer()],
    PUMPFUN_PROGRAM_ID
  );
}

export function getAssociatedBondingCurvePDA(
  mint: PublicKey,
  bondingCurve: PublicKey
): PublicKey {
  // The associated bonding curve ATA holds the tokens
  const [pda] = PublicKey.findProgramAddressSync(
    [
      bondingCurve.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return pda;
}

export interface BondingCurveData {
  virtualTokenReserves: bigint;
  virtualSolReserves: bigint;
  realTokenReserves: bigint;
  realSolReserves: bigint;
  tokenTotalSupply: bigint;
  complete: boolean;
  creator: PublicKey;
}

// Global account layout: discriminator(8) + initialized(1) + authority(32) + fee_recipient(32) + ...
export async function getFeeRecipient(connection: Connection): Promise<PublicKey> {
  const accountInfo = await connection.getAccountInfo(PUMPFUN_GLOBAL);
  if (!accountInfo) throw new Error("Pump.fun global account not found");
  const feeRecipient = new PublicKey(accountInfo.data.subarray(41, 73));
  return feeRecipient;
}

export async function getBondingCurveData(
  connection: Connection,
  mint: PublicKey
): Promise<BondingCurveData | null> {
  try {
    const [bondingCurve] = getBondingCurvePDA(mint);
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    if (!accountInfo) return null;

    // Parse bonding curve account data (skip 8 byte discriminator)
    const data = accountInfo.data;
    let offset = 8;

    const virtualTokenReserves = data.readBigUInt64LE(offset); offset += 8;
    const virtualSolReserves = data.readBigUInt64LE(offset); offset += 8;
    const realTokenReserves = data.readBigUInt64LE(offset); offset += 8;
    const realSolReserves = data.readBigUInt64LE(offset); offset += 8;
    const tokenTotalSupply = data.readBigUInt64LE(offset); offset += 8;
    const complete = data[offset] === 1; offset += 1;
    const creator = new PublicKey(data.slice(offset, offset + 32));

    return {
      virtualTokenReserves,
      virtualSolReserves,
      realTokenReserves,
      realSolReserves,
      tokenTotalSupply,
      complete,
      creator,
    };
  } catch {
    return null;
  }
}

export function calculateBuyAmount(
  solAmount: number,
  curveData: BondingCurveData,
  slippageBps = 500 // 5%
): { tokenAmount: bigint; maxSolCost: bigint } {
  const solLamports = BigInt(Math.floor(solAmount * LAMPORTS_PER_SOL));
  const { virtualSolReserves, virtualTokenReserves } = curveData;

  // tokens_out = virtual_token_reserves * sol_in / (virtual_sol_reserves + sol_in)
  const tokenAmount =
    (virtualTokenReserves * solLamports) / (virtualSolReserves + solLamports);

  const slippageMultiplier = BigInt(10000) + BigInt(slippageBps);
  const maxSolCost = (solLamports * slippageMultiplier) / BigInt(10000);

  return { tokenAmount, maxSolCost };
}

export function calculateSellAmount(
  tokenAmount: bigint,
  curveData: BondingCurveData,
  slippageBps = 500
): { solAmount: bigint; minSolOut: bigint } {
  const { virtualSolReserves, virtualTokenReserves } = curveData;

  // sol_out = virtual_sol_reserves * tokens_in / (virtual_token_reserves + tokens_in)
  const solAmount =
    (virtualSolReserves * tokenAmount) / (virtualTokenReserves + tokenAmount);

  const slippageDivisor = BigInt(10000) + BigInt(slippageBps);
  const minSolOut = (solAmount * BigInt(10000)) / slippageDivisor;

  return { solAmount, minSolOut };
}

// ─── Priority Fee ─────────────────────────────────────────────────────────────

export function priorityFeeIx(microLamports = 100_000): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitPrice({ microLamports });
}

export function computeUnitLimitIx(units = 200_000): TransactionInstruction {
  return ComputeBudgetProgram.setComputeUnitLimit({ units });
}

// ─── Get or Create ATA ────────────────────────────────────────────────────────

export async function getOrCreateATA(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  payer: Keypair,
  tokenProgram = TOKEN_PROGRAM_ID
): Promise<{ ataAddress: PublicKey; createIx: TransactionInstruction | null }> {
  const ata = await getAssociatedTokenAddress(mint, owner, false, tokenProgram);
  try {
    await getAccount(connection, ata, undefined, tokenProgram);
    return { ataAddress: ata, createIx: null };
  } catch {
    const createIx = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      owner,
      mint,
      tokenProgram
    );
    return { ataAddress: ata, createIx };
  }
}
