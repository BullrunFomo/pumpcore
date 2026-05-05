import { NextRequest } from "next/server";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { getConnection, getBondingCurveData, getTokenBalance, keypairFromPrivateKey } from "@/lib/solana";
import {
  buildCreateTokenIx,
  buildCreateTokenV2Ix,
  buildBuyIxFromCurve,
  INITIAL_CURVE,
  executeSell,
} from "@/lib/pumpfun";
import { uploadMetadata } from "@/lib/ipfs";
import { executeAtomicLaunchBundle, executeStaggerBuy } from "@/lib/jito";

// ─── Auto-sell Helpers ────────────────────────────────────────────────────────

let _cachedSolPrice = 180;
let _lastSolPriceFetch = 0;

async function getSolPrice(): Promise<number> {
  const now = Date.now();
  if (now - _lastSolPriceFetch < 30_000) return _cachedSolPrice;
  try {
    const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json();
    _cachedSolPrice = data?.solana?.usd ?? _cachedSolPrice;
    _lastSolPriceFetch = now;
  } catch {}
  return _cachedSolPrice;
}

async function doAutoSell(
  controller: ReadableStreamDefaultController,
  connection: Connection,
  mint: PublicKey,
  wallets: { address: string; privateKey: string }[],
  pct: number
) {
  log(controller, `Executing auto-sell (${Math.round(pct * 100)}% of each position)...`, "info");
  for (const w of wallets) {
    try {
      const kp = keypairFromPrivateKey(w.privateKey);
      const balance = await getTokenBalance(connection, kp.publicKey, mint);
      if (balance <= 0) continue;
      const amount = balance * pct;
      const result = await executeSell(connection, kp, mint, amount);
      log(controller, `Sold ${amount.toFixed(2)} tokens → ${result.solReceived.toFixed(4)} SOL`, "success", result.txSig, w.address);
    } catch (err: any) {
      log(controller, `Auto-sell failed for ${w.address.slice(0, 8)}: ${err.message}`, "error", undefined, w.address);
    }
  }
  log(controller, "Auto-sell complete.", "success");
}

async function waitForMcap(
  connection: Connection,
  mint: PublicKey,
  targetUsd: number,
  timeoutMs: number
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const [curveData, solPrice] = await Promise.all([getBondingCurveData(connection, mint), getSolPrice()]);
      if (curveData) {
        const priceInSol = (Number(curveData.virtualSolReserves) / 1e9) / (Number(curveData.virtualTokenReserves) / 1e6);
        const mcap = priceInSol * solPrice * 1_000_000_000;
        if (mcap >= targetUsd) return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return false;
}

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

function sseEvent(
  controller: ReadableStreamDefaultController,
  data: object
) {
  const line = `data: ${JSON.stringify(data)}\n\n`;
  controller.enqueue(new TextEncoder().encode(line));
}

function log(
  controller: ReadableStreamDefaultController,
  message: string,
  level: "info" | "success" | "error" | "warn" = "info",
  txSig?: string,
  walletAddress?: string
) {
  sseEvent(controller, { type: "log", level, message, txSig, walletAddress });
}

// ─── POST /api/launch ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const formData = await req.formData();
        const logoFile = formData.get("logo") as File | null;
        const configRaw = formData.get("config") as string;

        if (!configRaw) {
          sseEvent(controller, { type: "error", message: "Missing config" });
          controller.close();
          return;
        }

        const config = JSON.parse(configRaw);
        const { tokenConfig, bundleConfig, autoSell } = config;

        const connection = getConnection();

        // Dev wallet is always first (sorted by client before sending)
        const creatorWallet = bundleConfig.selectedWallets[0];
        if (!creatorWallet) {
          sseEvent(controller, { type: "error", message: "No wallets selected" });
          controller.close();
          return;
        }

        const creatorKeypair = keypairFromPrivateKey(creatorWallet.privateKey);

        // ── Step 1: Upload logo + metadata ────────────────────────────────────
        log(controller, "Uploading token metadata to IPFS...");

        let logoBuffer = Buffer.alloc(0);
        let logoFileName = "logo.png";
        if (logoFile) {
          const arrayBuffer = await logoFile.arrayBuffer();
          logoBuffer = Buffer.from(arrayBuffer);
          logoFileName = logoFile.name;
        }

        let metadataUri: string;
        try {
          metadataUri = await uploadMetadata({
            name: tokenConfig.name,
            symbol: tokenConfig.symbol,
            logoBuffer: logoBuffer.length > 0 ? logoBuffer : Buffer.from("placeholder"),
            logoFileName,
            description: `${tokenConfig.name} — ${tokenConfig.tokenType || "Token"} on PumpFun`,
            website: tokenConfig.website,
            twitter: tokenConfig.twitter,
            telegram: tokenConfig.telegram,
          });
        } catch (err: any) {
          sseEvent(controller, { type: "error", message: `IPFS upload failed: ${err.message}` });
          controller.close();
          return;
        }

        // ── Step 2: Build create + dev buy instructions ───────────────────────
        log(controller, `Building ${tokenConfig.name} (${tokenConfig.symbol}) launch...`);

        const mintKp = Keypair.generate();
        const mintAddress = mintKp.publicKey.toBase58();
        const mintPubkey = mintKp.publicKey;

        // Map UI token type to on-chain create_v2 flags
        const tokenType: string = tokenConfig.tokenType ?? "Standard";
        const isToken2022 = tokenType !== "Standard";
        const isMayhemMode = tokenType === "Mayhem Mode" || tokenType === "Agent";
        const isCashbackEnabled: boolean | null =
          tokenType === "Cashback" || tokenType === "Agent" ? true : null;

        const { instructions: createIxs } = isToken2022
          ? await buildCreateTokenV2Ix(
              {
                creator: creatorKeypair,
                name: tokenConfig.name,
                symbol: tokenConfig.symbol,
                metadataUri,
                isMayhemMode,
                isCashbackEnabled,
              },
              mintKp
            )
          : await buildCreateTokenIx(
              { creator: creatorKeypair, name: tokenConfig.name, symbol: tokenConfig.symbol, metadataUri },
              mintKp
            );

        // Dev buy uses INITIAL_CURVE — the known state right after token creation.
        // For Token2022: create+devbuy in one tx is ~1668 bytes (Solana limit: 1232).
        // So for Token2022 we keep them separate and the bundle executor places the
        // dev buy in its own tx[1]; wallet buys then fill tx[2..4] (max 3 wallets).
        const devSolAmount: number = creatorWallet.solAmount ?? 0.1;
        let createAndDevBuyIxs = [...createIxs];
        let splitDevBuyIxs: typeof createIxs | undefined;
        if (devSolAmount > 0) {
          const { instructions: devBuyIxs } = await buildBuyIxFromCurve(
            connection,
            creatorKeypair,
            mintPubkey,
            devSolAmount,
            INITIAL_CURVE,
            500,
            isToken2022
          );
          if (isToken2022) {
            splitDevBuyIxs = devBuyIxs;
          } else {
            createAndDevBuyIxs.push(...devBuyIxs);
          }
        }
        const bundleWallets = bundleConfig.selectedWallets.slice(1); // all wallets except dev

        // ── Step 3: Launch ────────────────────────────────────────────────────
        if (bundleConfig.launchType === "classic") {
          // Jito bundle: create + dev buy + all wallet buys in the same block.
          log(controller, `Submitting bundle: create + dev buy + ${bundleWallets.length} wallet buys...`);

          await executeAtomicLaunchBundle(
            {
              connection,
              createAndDevBuyIxs,
              devBuyIxs: splitDevBuyIxs,
              creatorKeypair,
              mintKeypair: mintKp,
              bundleWallets,
              devSolAmount,
              solPerWallet: bundleConfig.solPerWallet,
              tokenCreator: creatorKeypair.publicKey,
              mint: mintPubkey,
              tipLamports: Math.round((bundleConfig.jitoTipSol ?? 0.005) * 1e9),
              isToken2022,
            },
            (msg, level, txSig, walletAddr) => {
              log(controller, msg, (level as any) || "info", txSig, walletAddr);
            }
          );

          log(controller, `Token created: ${mintAddress}`, "success", undefined, creatorWallet.address);
        } else {
          // Stagger: create + dev buy first, then time-delayed wallet buys
          log(controller, `Creating token ${tokenConfig.name}...`);

          try {
            const tx = new Transaction().add(...createAndDevBuyIxs);
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = creatorKeypair.publicKey;
            const createTxSig = await sendAndConfirmTransaction(
              connection, tx, [creatorKeypair, mintKp], { commitment: "confirmed" }
            );
            log(controller, `Token created: ${mintAddress}`, "success", createTxSig, creatorWallet.address);
          } catch (err: any) {
            sseEvent(controller, { type: "error", message: `Token creation failed: ${err.message}` });
            controller.close();
            return;
          }

          if (bundleWallets.length > 0) {
            log(controller, `Stagger buying for ${bundleWallets.length} wallets...`);
            await executeStaggerBuy(
              {
                connection,
                mint: mintPubkey,
                wallets: bundleWallets,
                solPerWallet: bundleConfig.solPerWallet,
                staggerDelayMs: bundleConfig.staggerDelayMs,
                isToken2022,
              },
              (msg, level, txSig, walletAddr) => {
                log(controller, msg, (level as any) || "info", txSig, walletAddr);
              }
            );
          }
        }

        // ── Step 4: Auto-sell ─────────────────────────────────────────────────
        if (autoSell.enabled) {
          const sellWallets: { address: string; privateKey: string }[] = bundleConfig.selectedWallets;
          const pct = Math.min(100, Math.max(1, autoSell.sellPct)) / 100;

          if (autoSell.mode === "time") {
            log(controller, `Auto-sell: waiting ${autoSell.timeSeconds}s then selling ${autoSell.sellPct}%...`, "info");
            await new Promise((r) => setTimeout(r, autoSell.timeSeconds * 1_000));
            await doAutoSell(controller, connection, mintPubkey, sellWallets, pct);
          } else {
            log(controller, `Auto-sell: watching for $${autoSell.mcapTarget.toLocaleString()} MCap (30 min timeout)...`, "info");
            const hit = await waitForMcap(connection, mintPubkey, autoSell.mcapTarget, 30 * 60 * 1_000);
            if (hit) {
              await doAutoSell(controller, connection, mintPubkey, sellWallets, pct);
            } else {
              log(controller, "Auto-sell: MCap target not reached within 30 minutes — skipped.", "warn");
            }
          }
        }

        log(controller, "Launch complete!", "success");
        sseEvent(controller, { type: "complete", mintAddress });
      } catch (err: any) {
        sseEvent(controller, { type: "error", message: err.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
