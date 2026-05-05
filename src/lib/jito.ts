import {
  Connection,
  Keypair,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
import { randomTipAccount, priorityFeeIx, computeUnitLimitIx, keypairFromPrivateKey } from "./solana";
import { buildBuyIx, buildBuyIxFromCurve, INITIAL_CURVE } from "./pumpfun";

// Regional endpoints — rotated across retries to avoid 429s and improve landing odds
const JITO_ENDPOINTS = process.env.JITO_ENDPOINT
  ? [process.env.JITO_ENDPOINT]
  : [
      "https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://mainnet.block-engine.jito.wtf/api/v1/bundles",
      "https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles",
    ];

const JITO_TIP_LAMPORTS = parseInt(process.env.JITO_TIP_LAMPORTS || "1000000");

// ─── Jito Bundle ──────────────────────────────────────────────────────────────

// Poll Jito for bundle landing status. Returns true if landed, false on timeout.
// Check landing via Solana RPC only — no Jito status API calls (those count against the rate limit).
// Bundles either land within a few slots or are dropped; 45s is generous.
async function waitForBundleLanding(
  _bundleId: string,
  _endpoint: string,
  connection: Connection,
  txSignatures: string[],
  timeoutMs = 45_000
): Promise<boolean> {
  if (txSignatures.length === 0) return false;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 3_000));
    try {
      const statuses = await connection.getSignatureStatuses(txSignatures);
      const first = statuses.value[0];
      if (
        first?.confirmationStatus === "confirmed" ||
        first?.confirmationStatus === "finalized"
      ) return true;
      if (first?.err) return false; // tx landed but failed on-chain
    } catch {}
  }
  return false;
}

/** Sign transactions and return base58-encoded bytes + fee-payer signatures. */
function signBundle(
  transactions: Transaction[],
  signers: Keypair[][]
): { encodedTxs: string[]; signatures: string[] } {
  const signatures: string[] = [];
  const encodedTxs = transactions.map((tx, i) => {
    tx.sign(...(signers[i] || []));
    const sig = tx.signatures[0]?.signature;
    if (sig) signatures.push(bs58.encode(sig));
    return bs58.encode(tx.serialize());
  });
  return { encodedTxs, signatures };
}

/** Submit pre-signed (encoded) bundle to a single endpoint. */
async function submitEncodedBundle(
  encodedTxs: string[],
  endpoint: string
): Promise<string> {
  const payload = { jsonrpc: "2.0", id: 1, method: "sendBundle", params: [encodedTxs] };
  let res;
  try {
    res = await axios.post(endpoint, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 15_000,
    });
  } catch (err: any) {
    if (err.response?.status === 429) {
      const e = new Error(`RATE_LIMITED:${endpoint}`);
      (e as any).isRateLimit = true;
      throw e;
    }
    throw err;
  }
  if (res.data.error) throw new Error(`Jito error: ${JSON.stringify(res.data.error)}`);
  return res.data.result as string;
}

/**
 * Try endpoints one at a time — stop as soon as one accepts.
 * Sequential avoids blasting all endpoints simultaneously (wastes rate-limit quota).
 * Worst case: 5 API calls. Best case: 1.
 */
async function sendBundleSequential(
  encodedTxs: string[],
  signatures: string[]
): Promise<{ bundleId: string; signatures: string[]; endpoint: string }> {
  for (const endpoint of JITO_ENDPOINTS) {
    try {
      const bundleId = await submitEncodedBundle(encodedTxs, endpoint);
      return { bundleId, signatures, endpoint }; // return which endpoint accepted the bundle
    } catch (err: any) {
      if ((err as any).isRateLimit) {
        await new Promise((r) => setTimeout(r, 1_000));
        continue;
      }
      throw err;
    }
  }
  const e = new Error("All Jito endpoints rate-limited (429)");
  (e as any).isRateLimit = true;
  throw e;
}

export async function sendJitoBundle(
  transactions: Transaction[],
  signers: Keypair[][],
  _endpoint?: string
): Promise<{ bundleId: string; signatures: string[] }> {
  const { encodedTxs, signatures } = signBundle(transactions, signers);
  const { bundleId, signatures: sigs } = await sendBundleSequential(encodedTxs, signatures);
  return { bundleId, signatures: sigs };
}

// ─── Classic Bundle Launch ────────────────────────────────────────────────────

export interface BundleWallet {
  address: string;
  privateKey: string;
  solAmount?: number;
}

export interface ClassicBundleParams {
  connection: Connection;
  mint: PublicKey;
  wallets: BundleWallet[];
  solPerWallet: number;
  slippageBps?: number;
  isToken2022?: boolean;
}

export async function executeClassicBundle(
  params: ClassicBundleParams,
  onProgress: (msg: string, level?: string, txSig?: string, walletAddr?: string) => void
): Promise<{ bundleId: string; results: { address: string; tokenAmount: number }[] }> {
  const { connection, mint, wallets, solPerWallet, slippageBps = 500, isToken2022 = false } = params;

  const { blockhash } = await connection.getLatestBlockhash();
  const tipAccount = randomTipAccount();

  const transactions: Transaction[] = [];
  const signerSets: Keypair[][] = [];
  const results: { address: string; tokenAmount: number }[] = [];

  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    const bs58mod = (await import("bs58")).default;

    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58mod.decode(w.privateKey));
    } catch {
      keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(w.privateKey)));
    }

    const { instructions, tokenAmount } = await buildBuyIx(
      connection,
      keypair,
      mint,
      solPerWallet,
      slippageBps,
      isToken2022
    );

    const tx = new Transaction();

    // Add tip instruction to first tx in bundle
    if (i === 0) {
      tx.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: tipAccount,
          lamports: JITO_TIP_LAMPORTS,
        })
      );
    }

    tx.add(...instructions);
    tx.recentBlockhash = blockhash;
    tx.feePayer = keypair.publicKey;

    transactions.push(tx);
    signerSets.push([keypair]);
    results.push({ address: w.address, tokenAmount: Number(tokenAmount) / 1e6 });

    onProgress(`Built buy tx for ${w.address.slice(0, 8)}...`, "info", undefined, w.address);
  }

  onProgress("Submitting Jito bundle...", "info");

  let jitoFailed = false;
  try {
    const { bundleId, signatures } = await sendJitoBundle(transactions, signerSets, JITO_ENDPOINTS[0]);
    onProgress(`Bundle submitted: ${bundleId}, waiting for confirmation...`, "info");
    const landed = await waitForBundleLanding(bundleId, JITO_ENDPOINTS[0], connection, signatures);
    if (landed) {
      onProgress("Bundle confirmed on-chain.", "success");
      return { bundleId, results };
    }
    onProgress("Bundle did not land within timeout, falling back to sequential...", "warn");
    jitoFailed = true;
  } catch (err: any) {
    onProgress(`Jito bundle failed (${err.message}), falling back to sequential...`, "warn");
    jitoFailed = true;
  }

  // Sequential fallback — used when Jito fails or bundle doesn't land
  const fallbackResults: { address: string; tokenAmount: number }[] = [];
  for (const w of wallets) {
    const bs58mod = (await import("bs58")).default;
    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58mod.decode(w.privateKey));
    } catch {
      keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(w.privateKey)));
    }
    try {
      const { instructions, tokenAmount } = await buildBuyIx(
        connection, keypair, mint, solPerWallet, slippageBps, isToken2022
      );
      const tx = new Transaction().add(...instructions);
      const { blockhash: bh } = await connection.getLatestBlockhash();
      tx.recentBlockhash = bh;
      tx.feePayer = keypair.publicKey;
      const txSig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: "confirmed" });
      onProgress(`✓ Buy confirmed for ${w.address.slice(0, 8)}...`, "success", txSig, w.address);
      fallbackResults.push({ address: w.address, tokenAmount: Number(tokenAmount) / 1e6 });
    } catch (buyErr: any) {
      onProgress(`✗ Buy failed for ${w.address.slice(0, 8)}: ${buyErr.message}`, "error", undefined, w.address);
      fallbackResults.push({ address: w.address, tokenAmount: 0 });
    }
  }
  return { bundleId: jitoFailed ? "fallback" : "sequential", results: fallbackResults };
}

// ─── Atomic Launch Bundle (create + dev buy + all bundle buys in one block) ───

export interface AtomicLaunchParams {
  connection: Connection;
  /** Pre-built instructions for create + dev buy (no blockhash yet) */
  createAndDevBuyIxs: TransactionInstruction[];
  creatorKeypair: Keypair;
  mintKeypair: Keypair;
  bundleWallets: BundleWallet[];
  devSolAmount: number;
  solPerWallet: number;
  tokenCreator: PublicKey;
  mint: PublicKey;
  tipLamports?: number;
  slippageBps?: number;
  isToken2022?: boolean;
}

// Jito enforces a hard limit of 5 transactions per bundle.
// tx[0] = create + dev buy. tx[1..4] = one buy per wallet (max 4 bundle wallets).
// Each pump.fun buy is ~800 bytes serialized — packing two into one tx exceeds
// Solana's 1232-byte limit, so each wallet always gets its own transaction.
const JITO_MAX_TXS = 5;
const MAX_BUY_TXS = JITO_MAX_TXS - 1; // 4 wallet buy slots

const BUNDLE_MAX_RETRIES = 3;

export async function executeAtomicLaunchBundle(
  params: AtomicLaunchParams,
  onProgress: (msg: string, level?: string, txSig?: string, walletAddr?: string) => void
): Promise<{ bundleId: string; results: { address: string; tokenAmount: number }[] }> {
  const {
    connection, createAndDevBuyIxs, creatorKeypair, mintKeypair,
    bundleWallets, devSolAmount, solPerWallet, tokenCreator, mint,
    tipLamports = JITO_TIP_LAMPORTS, slippageBps = 500, isToken2022 = false,
  } = params;

  // ── Build buy instructions (once — instructions are blockhash-independent) ──
  const initialCurveWithCreator = { ...INITIAL_CURVE, creator: tokenCreator };

  // Bundle wallet buys run AFTER the dev buy in the same block. The dev buy
  // moves the bonding curve, so we must build bundle wallet instructions against
  // the predicted post-dev-buy curve — not INITIAL_CURVE. Jito simulates each
  // transaction in sequence; using the wrong curve state causes tx[1+] to fail
  // the on-chain tokenAmount (minimum tokens) check and the bundle is dropped.
  function predictCurveAfterBuy(
    curve: typeof INITIAL_CURVE,
    solAmount: number
  ): typeof INITIAL_CURVE {
    const solLamports = BigInt(Math.floor(solAmount * 1_000_000_000));
    const tokensOut = (curve.virtualTokenReserves * solLamports) / (curve.virtualSolReserves + solLamports);
    return {
      ...curve,
      virtualSolReserves: curve.virtualSolReserves + solLamports,
      virtualTokenReserves: curve.virtualTokenReserves - tokensOut,
      realSolReserves: curve.realSolReserves + solLamports,
      realTokenReserves: curve.realTokenReserves - tokensOut,
    };
  }

  const curveAfterDevBuy = predictCurveAfterBuy(initialCurveWithCreator, devSolAmount);

  type BuyEntry = { ixs: TransactionInstruction[]; keypair: Keypair; address: string; tokenAmount: number };
  const buyEntries: BuyEntry[] = [];

  for (const w of bundleWallets) {
    const walletSol = w.solAmount ?? solPerWallet;
    if (walletSol <= 0) continue;
    const keypair = keypairFromPrivateKey(w.privateKey);
    const { instructions: ixs, tokenAmount } = await buildBuyIxFromCurve(
      connection, keypair, mint, walletSol, curveAfterDevBuy, slippageBps, isToken2022
    );
    buyEntries.push({ ixs, keypair, address: w.address, tokenAmount: Number(tokenAmount) / 1e6 });
    onProgress(`Prepared buy for ${w.address.slice(0, 8)}...`, "info", undefined, w.address);
  }

  if (buyEntries.length > MAX_BUY_TXS) {
    onProgress(
      `Warning: only ${MAX_BUY_TXS} of ${buyEntries.length} wallets fit in one Jito bundle (5-tx limit).`,
      "warn"
    );
  }

  // ── Balance pre-checks ───────────────────────────────────────────────────────
  // Each wallet needs buy amount + ~0.005 SOL buffer for ATA rent, PDA init, fees.
  const RENT_BUFFER = 0.005 * LAMPORTS_PER_SOL;
  {
    const creatorBalance = await connection.getBalance(creatorKeypair.publicKey);
    const creatorNeed = tipLamports + Math.round(devSolAmount * LAMPORTS_PER_SOL) + RENT_BUFFER;
    if (creatorBalance < creatorNeed) {
      throw new Error(
        `Creator wallet has ${(creatorBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL but needs at least ` +
        `${(creatorNeed / LAMPORTS_PER_SOL).toFixed(4)} SOL (buy + tip + fees).`
      );
    }
    for (const entry of buyEntries) {
      const entryWallet = bundleWallets.find((w) => w.address === entry.address);
      const entrySol = entryWallet?.solAmount ?? solPerWallet;
      const bal = await connection.getBalance(entry.keypair.publicKey);
      const need = Math.round(entrySol * LAMPORTS_PER_SOL) + RENT_BUFFER;
      if (bal < need) {
        onProgress(
          `Warning: wallet ${entry.address.slice(0, 8)} has ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL, ` +
          `needs ${(need / LAMPORTS_PER_SOL).toFixed(4)} SOL — may fail on-chain`,
          "warn"
        );
      }
    }
  }

  // ── Pre-flight simulation ────────────────────────────────────────────────────
  onProgress("Simulating create+devbuy transaction...", "info");
  try {
    const { blockhash: simHash } = await connection.getLatestBlockhash();
    const simVtx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: creatorKeypair.publicKey,
        recentBlockhash: simHash,
        instructions: createAndDevBuyIxs,
      }).compileToV0Message()
    );
    const sim = await connection.simulateTransaction(simVtx, { sigVerify: false });
    if (sim.value.err) {
      const logs = (sim.value.logs ?? []).slice(-8).join("\n");
      throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}\n${logs}`);
    }
    onProgress("Simulation passed.", "info");
  } catch (err: any) {
    if (err.message.includes("Simulation failed")) throw err;
    onProgress(`Simulation skipped (${err.message})`, "warn");
  }

  // ── Assemble VersionedTransactions (v0) ──────────────────────────────────────
  // v0 is what every working pump.fun bundler uses with Jito's REST API.
  // Tip is the LAST instruction in tx[0] (matches how working bundlers structure it).
  function assembleTxs(blockhash: string): { encodedTxs: string[]; signatures: string[] } {
    const tipAccount = randomTipAccount();
    const encodedTxs: string[] = [];
    const signatures: string[] = [];

    // tx[0]: create + dev buy + tip (tip is LAST)
    const createVtx = new VersionedTransaction(
      new TransactionMessage({
        payerKey: creatorKeypair.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          ...createAndDevBuyIxs,
          SystemProgram.transfer({ fromPubkey: creatorKeypair.publicKey, toPubkey: tipAccount, lamports: tipLamports }),
        ],
      }).compileToV0Message()
    );
    createVtx.sign([creatorKeypair, mintKeypair]);
    encodedTxs.push(bs58.encode(createVtx.serialize()));
    signatures.push(bs58.encode(createVtx.signatures[0]));

    // tx[1..4]: one v0 transaction per wallet
    for (const entry of buyEntries.slice(0, MAX_BUY_TXS)) {
      const buyVtx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: entry.keypair.publicKey,
          recentBlockhash: blockhash,
          instructions: [
            priorityFeeIx(300_000),
            computeUnitLimitIx(300_000),
            ...entry.ixs,
          ],
        }).compileToV0Message()
      );
      buyVtx.sign([entry.keypair]);
      encodedTxs.push(bs58.encode(buyVtx.serialize()));
      signatures.push(bs58.encode(buyVtx.signatures[0]));
    }

    return { encodedTxs, signatures };
  }

  async function submitBundle(): Promise<{
    bundleId: string;
    signatures: string[];
    blockhash: string;
    lastValidBlockHeight: number;
    submittedEndpoint: string;
  }> {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("processed");
    const { encodedTxs, signatures } = assembleTxs(blockhash);
    const { bundleId, endpoint: submittedEndpoint } = await sendBundleSequential(encodedTxs, signatures);
    return { bundleId, signatures, blockhash, lastValidBlockHeight, submittedEndpoint };
  }

  const walletCount = Math.min(buyEntries.length, MAX_BUY_TXS);
  onProgress(
    `Launching: ${1 + walletCount} bundle txs, tip ${(tipLamports / 1e9).toFixed(4)} SOL...`,
    "info"
  );

  let lastError = "";
  for (let attempt = 1; attempt <= BUNDLE_MAX_RETRIES; attempt++) {
    if (attempt > 1) {
      onProgress(`Retry ${attempt}/${BUNDLE_MAX_RETRIES}...`, "warn");
    }

    let bundleId: string;
    let submittedSigs: string[];
    let confirmedBlockhash: string;
    let confirmedLVBH: number;
    let submittedEndpoint: string;
    try {
      const result = await submitBundle();
      bundleId = result.bundleId;
      submittedSigs = result.signatures;
      confirmedBlockhash = result.blockhash;
      confirmedLVBH = result.lastValidBlockHeight;
      submittedEndpoint = result.submittedEndpoint;
      onProgress(`Bundle accepted via ${submittedEndpoint.match(/\/\/([^.]+)/)?.[1] ?? "jito"} (${bundleId.slice(0, 16)}...)`, "info");
    } catch (err: any) {
      lastError = err.message;
      onProgress(`Submit failed: ${err.message}`, "warn");
      if (attempt < BUNDLE_MAX_RETRIES) await new Promise((r) => setTimeout(r, 2_000));
      continue;
    }

    // Race two signals:
    // 1. Jito status API polling — detects simulation failures within seconds,
    //    so we don't wait 60s for block expiry when Jito has already rejected us.
    // 2. confirmTransaction (WebSocket) — detects on-chain landing fast.
    // Whichever resolves first wins.
    type BundleOutcome = "landed" | "failed" | "expired";
    let outcome: BundleOutcome;
    let outcomeError = "";

    const statusPoll = (async (): Promise<BundleOutcome> => {
      // Must query the SAME endpoint that accepted the bundle — other regions won't have it
      const statusEndpoint = submittedEndpoint;
      for (let tick = 0; tick < 20; tick++) {
        await new Promise((r) => setTimeout(r, 3_000));
        try {
          const res = await axios.post(
            statusEndpoint,
            { jsonrpc: "2.0", id: 1, method: "getInflightBundleStatuses", params: [[bundleId]] },
            { timeout: 5_000, headers: { "Content-Type": "application/json" } }
          );
          const status: string | undefined = res.data?.result?.value?.[0]?.status;
          onProgress(`Jito bundle status: ${status ?? "unknown"}`, "info");
          if (status === "Failed" || status === "Invalid") return "failed";
          if (status === "Landed") return "landed";
        } catch { /* status endpoint unavailable — keep waiting */ }
      }
      return "expired"; // status stayed Pending for full 60s
    })();

    const wsConfirm = (async (): Promise<BundleOutcome> => {
      try {
        const conf = await connection.confirmTransaction(
          { signature: submittedSigs[0], blockhash: confirmedBlockhash, lastValidBlockHeight: confirmedLVBH },
          "confirmed"
        );
        if (conf.value.err) {
          outcomeError = `On-chain tx error: ${JSON.stringify(conf.value.err)}`;
          return "failed";
        }
        return "landed";
      } catch (err: any) {
        outcomeError = err.message;
        return "expired";
      }
    })();

    outcome = await Promise.race([statusPoll, wsConfirm]);

    if (outcome === "landed") {
      onProgress("Bundle confirmed on-chain.", "success");
      return {
        bundleId,
        results: buyEntries.map((e) => ({ address: e.address, tokenAmount: e.tokenAmount })),
      };
    }

    if (outcomeError.startsWith("On-chain tx error")) {
      throw new Error(outcomeError); // fatal — tx landed but failed; don't retry
    }

    lastError = outcomeError || `bundle status: ${outcome}`;
    onProgress(
      `Attempt ${attempt} did not land (${lastError}). ${attempt < BUNDLE_MAX_RETRIES ? "Retrying..." : ""}`,
      "warn"
    );
    if (attempt < BUNDLE_MAX_RETRIES) await new Promise((r) => setTimeout(r, 1_000));
  }

  throw new Error(
    `Bundle failed after ${BUNDLE_MAX_RETRIES} attempts (${lastError}). ` +
    `No token was created. Increase the Jito tip or retry.`
  );
}

// ─── Stagger Buy ──────────────────────────────────────────────────────────────

export async function executeStaggerBuy(
  params: ClassicBundleParams & { staggerDelayMs: number },
  onProgress: (msg: string, level?: string, txSig?: string, walletAddr?: string) => void
): Promise<{ results: { address: string; tokenAmount: number }[] }> {
  const { connection, mint, wallets, solPerWallet, staggerDelayMs, slippageBps = 500, isToken2022 = false } = params;
  const results: { address: string; tokenAmount: number }[] = [];

  for (let i = 0; i < wallets.length; i++) {
    const w = wallets[i];
    const bs58mod = (await import("bs58")).default;

    let keypair: Keypair;
    try {
      keypair = Keypair.fromSecretKey(bs58mod.decode(w.privateKey));
    } catch {
      keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(w.privateKey)));
    }

    const walletSol = w.solAmount ?? solPerWallet;
    if (walletSol <= 0) {
      onProgress(`[${i + 1}/${wallets.length}] Skipping ${w.address.slice(0, 8)} (buy amount is 0)`, "info", undefined, w.address);
      continue;
    }
    onProgress(`[${i + 1}/${wallets.length}] Buying for ${w.address.slice(0, 8)}...`, "info", undefined, w.address);

    try {
      const { instructions, tokenAmount } = await buildBuyIx(
        connection,
        keypair,
        mint,
        walletSol,
        slippageBps,
        isToken2022
      );
      const tx = new Transaction().add(...instructions);
      const { blockhash } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = keypair.publicKey;

      const txSig = await sendAndConfirmTransaction(connection, tx, [keypair], { commitment: "confirmed" });
      onProgress(`✓ Buy confirmed — ${(Number(tokenAmount) / 1e6).toLocaleString()} tokens`, "success", txSig, w.address);
      results.push({ address: w.address, tokenAmount: Number(tokenAmount) / 1e6 });
    } catch (err: any) {
      onProgress(`✗ Buy failed: ${err.message}`, "error", undefined, w.address);
      results.push({ address: w.address, tokenAmount: 0 });
    }

    // Stagger delay (except after last)
    if (i < wallets.length - 1 && staggerDelayMs > 0) {
      await new Promise((r) => setTimeout(r, staggerDelayMs));
    }
  }

  return { results };
}
