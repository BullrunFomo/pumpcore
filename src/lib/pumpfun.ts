import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  PUMPFUN_PROGRAM_ID,
  PUMPFUN_EVENT_AUTHORITY,
  PUMPFUN_GLOBAL,
  MINT_AUTHORITY,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  FEE_PROGRAM,
  FEE_CONFIG,
  GLOBAL_VOLUME_ACCUMULATOR,
  TOKEN_2022_PROGRAM_ID,
  getBondingCurvePDA,
  getCreatorVaultPDA,
  getUserVolumeAccumulatorPDA,
  getBondingCurveV2PDA,
  calculateBuyAmount,
  calculateSellAmount,
  getFeeRecipient,
  getBondingCurveData,
  priorityFeeIx,
  computeUnitLimitIx,
  getOrCreateATA,
} from "./solana";

// ─── Token2022 / Mayhem constants ─────────────────────────────────────────────

const MAYHEM_PROGRAM_ID = new PublicKey("MAyhSmzXzV1pTf7LsNkrNwkWKTo4ougAJ1PPg47MD4e");
const CREATE_V2_DISCRIMINATOR = Buffer.from([214, 144, 76, 236, 95, 139, 49, 180]);

function getMayhemGlobalParams(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("global-params")], MAYHEM_PROGRAM_ID);
  return pda;
}
function getMayhemSolVault(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([Buffer.from("sol-vault")], MAYHEM_PROGRAM_ID);
  return pda;
}
function getMayhemState(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mayhem-state"), mint.toBuffer()],
    MAYHEM_PROGRAM_ID
  );
  return pda;
}

/** Borsh-encodes Option<bool>: None→[0], Some(false)→[1,0], Some(true)→[1,1] */
function encodeOptionBool(val: boolean | null): Buffer {
  if (val === null) return Buffer.from([0]);
  return Buffer.from([1, val ? 1 : 0]);
}
import { uploadMetadata } from "./ipfs";

// ─── Instruction discriminators (Anchor 8-byte selectors) ─────────────────────

// sha256("global:create")[0..8]
const CREATE_DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
// sha256("global:buy")[0..8]
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
// sha256("global:sell")[0..8]
const SELL_DISCRIMINATOR = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

// ─── Token Metadata ───────────────────────────────────────────────────────────

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    MPL_TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

// ─── Create Token ─────────────────────────────────────────────────────────────

export interface CreateTokenParams {
  creator: Keypair;
  name: string;
  symbol: string;
  metadataUri: string;
}

export async function buildCreateTokenIx(
  params: CreateTokenParams,
  mint: Keypair
): Promise<{ instructions: TransactionInstruction[]; mint: Keypair }> {
  const { creator, name, symbol, metadataUri } = params;

  const [bondingCurve] = getBondingCurvePDA(mint.publicKey);

  // Associated bonding curve token account
  const associatedBondingCurve = await getAssociatedTokenAddress(
    mint.publicKey,
    bondingCurve,
    true
  );

  const metadata = getMetadataPDA(mint.publicKey);

  // Encode create instruction data
  const nameBuffer = Buffer.from(name, "utf8");
  const symbolBuffer = Buffer.from(symbol, "utf8");
  const uriBuffer = Buffer.from(metadataUri, "utf8");

  // u32 LE length prefix helper
  const lenBuf = (b: Buffer) => {
    const l = Buffer.alloc(4);
    l.writeUInt32LE(b.length, 0);
    return l;
  };

  const data = Buffer.concat([
    CREATE_DISCRIMINATOR,
    lenBuf(nameBuffer),   nameBuffer,
    lenBuf(symbolBuffer), symbolBuffer,
    lenBuf(uriBuffer),    uriBuffer,
    creator.publicKey.toBuffer(), // required in current PumpFun program version
  ]);

  const createIx = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: mint.publicKey, isSigner: true, isWritable: true },
      { pubkey: MINT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: PUMPFUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: MPL_TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  // 600k CUs: create (~150k) + buy (~200k) + ATA create (~25k) + tip transfer (~5k) + buffer
  return {
    instructions: [priorityFeeIx(200_000), computeUnitLimitIx(600_000), createIx],
    mint,
  };
}

// ─── Create Token v2 (Token2022 — Mayhem / Cashback / Agent) ─────────────────

export async function buildCreateTokenV2Ix(
  params: CreateTokenParams & { isMayhemMode: boolean; isCashbackEnabled: boolean | null },
  mint: Keypair
): Promise<{ instructions: TransactionInstruction[]; mint: Keypair }> {
  const { creator, name, symbol, metadataUri, isMayhemMode, isCashbackEnabled } = params;

  const [bondingCurve] = getBondingCurvePDA(mint.publicKey);

  // Token2022 ATA: seeds use TOKEN_2022_PROGRAM_ID instead of legacy TOKEN_PROGRAM_ID
  const associatedBondingCurve = await getAssociatedTokenAddress(
    mint.publicKey, bondingCurve, true, TOKEN_2022_PROGRAM_ID
  );

  const mayhemGlobalParams = getMayhemGlobalParams();
  const mayhemSolVault = getMayhemSolVault();
  const mayhemState = getMayhemState(mint.publicKey);
  // mayhem_token_vault: Token2022 ATA of the sol_vault PDA for this mint
  const mayhemTokenVault = await getAssociatedTokenAddress(
    mint.publicKey, mayhemSolVault, true, TOKEN_2022_PROGRAM_ID
  );

  const nameBuffer = Buffer.from(name, "utf8");
  const symbolBuffer = Buffer.from(symbol, "utf8");
  const uriBuffer = Buffer.from(metadataUri, "utf8");
  const lenBuf = (b: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32LE(b.length, 0); return l; };

  const data = Buffer.concat([
    CREATE_V2_DISCRIMINATOR,
    lenBuf(nameBuffer), nameBuffer,
    lenBuf(symbolBuffer), symbolBuffer,
    lenBuf(uriBuffer), uriBuffer,
    creator.publicKey.toBuffer(),
    Buffer.from([isMayhemMode ? 1 : 0]),
    encodeOptionBool(isCashbackEnabled),
  ]);

  const createIx = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: mint.publicKey, isSigner: true, isWritable: true },
      { pubkey: MINT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: PUMPFUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: creator.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: MAYHEM_PROGRAM_ID, isSigner: false, isWritable: true },
      { pubkey: mayhemGlobalParams, isSigner: false, isWritable: false },
      { pubkey: mayhemSolVault, isSigner: false, isWritable: true },
      { pubkey: mayhemState, isSigner: false, isWritable: true },
      { pubkey: mayhemTokenVault, isSigner: false, isWritable: true },
      { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data,
  });

  return {
    instructions: [priorityFeeIx(200_000), computeUnitLimitIx(600_000), createIx],
    mint,
  };
}

// ─── Buy ──────────────────────────────────────────────────────────────────────

export async function buildBuyIx(
  connection: Connection,
  buyer: Keypair,
  mint: PublicKey,
  solAmount: number,
  slippageBps = 500,
  isToken2022 = false
): Promise<{ instructions: TransactionInstruction[]; tokenAmount: bigint }> {
  const tokenProgram = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;

  const [curveData, feeRecipient] = await Promise.all([
    getBondingCurveData(connection, mint),
    getFeeRecipient(connection),
  ]);
  if (!curveData) throw new Error("Bonding curve not found");

  const { tokenAmount, maxSolCost } = calculateBuyAmount(solAmount, curveData, slippageBps);

  const [bondingCurve] = getBondingCurvePDA(mint);
  const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurve, true, tokenProgram);
  const { ataAddress: buyerAta, createIx } = await getOrCreateATA(
    connection,
    mint,
    buyer.publicKey,
    buyer,
    tokenProgram
  );

  const data = Buffer.alloc(24);
  BUY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(tokenAmount, 8);
  data.writeBigUInt64LE(maxSolCost, 16);

  const creatorVault = getCreatorVaultPDA(curveData.creator);
  const userVolumeAccumulator = getUserVolumeAccumulatorPDA(buyer.publicKey);
  const bondingCurveV2 = getBondingCurveV2PDA(mint);

  const buyIx = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: PUMPFUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: feeRecipient, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: GLOBAL_VOLUME_ACCUMULATOR, isSigner: false, isWritable: false },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: FEE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: FEE_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: bondingCurveV2, isSigner: false, isWritable: false },
    ],
    data,
  });

  const ixs: TransactionInstruction[] = [
    priorityFeeIx(100_000),
    computeUnitLimitIx(200_000),
  ];
  if (createIx) ixs.push(createIx);
  ixs.push(buyIx);

  return { instructions: ixs, tokenAmount };
}

// ─── Sell ─────────────────────────────────────────────────────────────────────

async function getMintTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error("Mint account not found");
  return info.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

export async function buildSellIx(
  connection: Connection,
  seller: Keypair,
  mint: PublicKey,
  tokenAmount: bigint,
  slippageBps = 500
): Promise<{ instructions: TransactionInstruction[]; minSolOut: bigint }> {
  const [curveData, feeRecipient, tokenProgram] = await Promise.all([
    getBondingCurveData(connection, mint),
    getFeeRecipient(connection),
    getMintTokenProgram(connection, mint),
  ]);
  if (!curveData) throw new Error("Bonding curve not found");

  const { minSolOut } = calculateSellAmount(tokenAmount, curveData, slippageBps);

  const [bondingCurve] = getBondingCurvePDA(mint);
  const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurve, true, tokenProgram);
  const sellerAta = await getAssociatedTokenAddress(mint, seller.publicKey, false, tokenProgram);

  const data = Buffer.alloc(24);
  SELL_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(tokenAmount, 8);
  data.writeBigUInt64LE(minSolOut, 16);

  const creatorVault = getCreatorVaultPDA(curveData.creator);
  const bondingCurveV2 = getBondingCurveV2PDA(mint);
  const isToken2022 = tokenProgram.equals(TOKEN_2022_PROGRAM_ID);

  const baseKeys = [
    { pubkey: PUMPFUN_GLOBAL, isSigner: false, isWritable: false },
    { pubkey: feeRecipient, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: sellerAta, isSigner: false, isWritable: true },
    { pubkey: seller.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: creatorVault, isSigner: false, isWritable: true },
    { pubkey: tokenProgram, isSigner: false, isWritable: false },
    { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: FEE_CONFIG, isSigner: false, isWritable: false },
    { pubkey: FEE_PROGRAM, isSigner: false, isWritable: false },
  ];

  // Token2022 sells need userVolumeAccumulator before bondingCurveV2
  if (isToken2022) {
    const userVolumeAccumulator = getUserVolumeAccumulatorPDA(seller.publicKey);
    baseKeys.push({ pubkey: userVolumeAccumulator, isSigner: false, isWritable: true });
  }
  baseKeys.push({ pubkey: bondingCurveV2, isSigner: false, isWritable: false });

  const sellIx = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: baseKeys,
    data,
  });

  return {
    instructions: [priorityFeeIx(100_000), computeUnitLimitIx(200_000), sellIx],
    minSolOut,
  };
}

// ─── Execute Buy ──────────────────────────────────────────────────────────────

export async function executeBuy(
  connection: Connection,
  buyer: Keypair,
  mint: PublicKey,
  solAmount: number,
  slippageBps = 500
): Promise<{ txSig: string; tokenAmount: number; solSpent: number }> {
  const { instructions, tokenAmount } = await buildBuyIx(
    connection,
    buyer,
    mint,
    solAmount,
    slippageBps
  );

  const tx = new Transaction().add(...instructions);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = buyer.publicKey;

  const txSig = await sendAndConfirmTransaction(connection, tx, [buyer], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  return {
    txSig,
    tokenAmount: Number(tokenAmount) / 1e6,
    solSpent: solAmount,
  };
}

// ─── Execute Sell ─────────────────────────────────────────────────────────────

export async function executeSell(
  connection: Connection,
  seller: Keypair,
  mint: PublicKey,
  tokenAmountUi: number,
  slippageBps = 500
): Promise<{ txSig: string; tokensSold: number; solReceived: number }> {
  const tokenAmount = BigInt(Math.floor(tokenAmountUi * 1e6));
  const { instructions, minSolOut } = await buildSellIx(
    connection,
    seller,
    mint,
    tokenAmount,
    slippageBps
  );

  const tx = new Transaction().add(...instructions);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = seller.publicKey;

  const txSig = await sendAndConfirmTransaction(connection, tx, [seller], {
    commitment: "confirmed",
    maxRetries: 3,
  });

  return {
    txSig,
    tokensSold: tokenAmountUi,
    solReceived: Number(minSolOut) / LAMPORTS_PER_SOL,
  };
}

// ─── Initial bonding curve state (same for every new PumpFun token) ──────────

export const INITIAL_CURVE: import("./solana").BondingCurveData = {
  virtualTokenReserves: BigInt(1_073_000_000) * BigInt(1_000_000), // 1.073B tokens * 1e6
  virtualSolReserves: BigInt(30) * BigInt(1_000_000_000),          // 30 SOL in lamports
  realTokenReserves: BigInt(793_100_000) * BigInt(1_000_000),
  realSolReserves: BigInt(0),
  tokenTotalSupply: BigInt(1_000_000_000) * BigInt(1_000_000),
  complete: false,
  creator: SystemProgram.programId,
};

// Builds a buy instruction without fetching curve data from chain (used pre-creation)
export async function buildBuyIxFromCurve(
  connection: Connection,
  buyer: Keypair,
  mint: PublicKey,
  solAmount: number,
  curveData: import("./solana").BondingCurveData,
  slippageBps = 500,
  isToken2022 = false
): Promise<{ instructions: TransactionInstruction[]; tokenAmount: bigint }> {
  const tokenProgram = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const { tokenAmount, maxSolCost } = calculateBuyAmount(solAmount, curveData, slippageBps);

  const feeRecipient = await getFeeRecipient(connection);

  const [bondingCurve] = getBondingCurvePDA(mint);
  const associatedBondingCurve = await getAssociatedTokenAddress(mint, bondingCurve, true, tokenProgram);
  const { ataAddress: buyerAta, createIx } = await getOrCreateATA(
    connection,
    mint,
    buyer.publicKey,
    buyer,
    tokenProgram
  );

  const data = Buffer.alloc(24);
  BUY_DISCRIMINATOR.copy(data, 0);
  data.writeBigUInt64LE(tokenAmount, 8);
  data.writeBigUInt64LE(maxSolCost, 16);

  // Use curve's creator for the vault; fall back to buyer when creator is unset (dev buy)
  const creatorVault = getCreatorVaultPDA(
    curveData.creator.equals(SystemProgram.programId) ? buyer.publicKey : curveData.creator
  );
  const userVolumeAccumulator = getUserVolumeAccumulatorPDA(buyer.publicKey);
  const bondingCurveV2 = getBondingCurveV2PDA(mint);

  const buyIx = new TransactionInstruction({
    programId: PUMPFUN_PROGRAM_ID,
    keys: [
      { pubkey: PUMPFUN_GLOBAL, isSigner: false, isWritable: false },
      { pubkey: feeRecipient, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: buyer.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: creatorVault, isSigner: false, isWritable: true },
      { pubkey: PUMPFUN_EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: GLOBAL_VOLUME_ACCUMULATOR, isSigner: false, isWritable: false },
      { pubkey: userVolumeAccumulator, isSigner: false, isWritable: true },
      { pubkey: FEE_CONFIG, isSigner: false, isWritable: false },
      { pubkey: FEE_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: bondingCurveV2, isSigner: false, isWritable: false },
    ],
    data,
  });

  const ixs: TransactionInstruction[] = [];
  if (createIx) ixs.push(createIx);
  ixs.push(buyIx);

  return { instructions: ixs, tokenAmount };
}

// ─── Create + Dev Buy (atomic) ────────────────────────────────────────────────

export interface LaunchTokenParams {
  creator: Keypair;
  name: string;
  symbol: string;
  logoFile: Buffer;
  logoFileName: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  tokenType?: string;
}

export async function createAndDevBuy(
  connection: Connection,
  params: LaunchTokenParams,
  devBuySol: number
): Promise<{ mintAddress: string; txSig: string; tokenAmount: number }> {
  const { creator, name, symbol, logoFile, logoFileName } = params;

  // 1. Upload to IPFS
  const metadataUri = await uploadMetadata({
    name,
    symbol,
    logoBuffer: logoFile,
    logoFileName,
    description: `${name} — ${params.tokenType || "Token"} on PumpFun`,
    website: params.website,
    twitter: params.twitter,
    telegram: params.telegram,
  });

  // 2. Create fresh mint keypair
  const mintKp = Keypair.generate();

  // 3. Build create instruction
  const { instructions: createIxs } = await buildCreateTokenIx(
    { creator, name, symbol, metadataUri },
    mintKp
  );

  // 4. Build buy instruction using initial curve state (token doesn't exist on-chain yet)
  const { instructions: buyIxs, tokenAmount } = await buildBuyIxFromCurve(
    connection,
    creator,
    mintKp.publicKey,
    devBuySol,
    INITIAL_CURVE
  );

  // 5. Combine into single transaction
  const tx = new Transaction().add(...createIxs, ...buyIxs);
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = creator.publicKey;

  const txSig = await sendAndConfirmTransaction(
    connection,
    tx,
    [creator, mintKp],
    { commitment: "confirmed" }
  );

  return {
    mintAddress: mintKp.publicKey.toBase58(),
    txSig,
    tokenAmount: Number(tokenAmount) / 1e6,
  };
}
