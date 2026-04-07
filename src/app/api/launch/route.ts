import { NextRequest } from "next/server";
import { Keypair, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { getConnection, getTokenBalance, keypairFromPrivateKey } from "@/lib/solana";
import {
  buildCreateTokenIx,
  buildCreateTokenV2Ix,
  buildBuyIxFromCurve,
  INITIAL_CURVE,
  executeSell,
} from "@/lib/pumpfun";
import { uploadMetadata } from "@/lib/ipfs";
import { executeAtomicLaunchBundle, executeStaggerBuy } from "@/lib/jito";
import { SniperGuard } from "@/lib/sniper-guard";

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
        const { tokenConfig, bundleConfig, autoSell, sniperGuard } = config;

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
        // This runs as part of tx[0] in the bundle alongside the create instruction.
        const { instructions: devBuyIxs } = await buildBuyIxFromCurve(
          connection,
          creatorKeypair,
          mintPubkey,
          bundleConfig.solPerWallet,
          INITIAL_CURVE,
          500,
          isToken2022
        );

        const createAndDevBuyIxs = [...createIxs, ...devBuyIxs];
        const bundleWallets = bundleConfig.selectedWallets.slice(1); // all wallets except dev
        let stopped = false;

        // ── Step 3: Launch ────────────────────────────────────────────────────
        if (bundleConfig.launchType === "classic") {
          // Jito bundle: create + dev buy + all wallet buys in the same block.
          log(controller, `Submitting bundle: create + dev buy + ${bundleWallets.length} wallet buys...`);

          await executeAtomicLaunchBundle(
            {
              connection,
              createAndDevBuyIxs,
              creatorKeypair,
              mintKeypair: mintKp,
              bundleWallets,
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
            let sniperInstance: SniperGuard | null = null;
            if (sniperGuard.enabled) {
              log(controller, `Sniper guard active: threshold ${sniperGuard.solThreshold} SOL`, "info");
              sniperInstance = new SniperGuard({
                connection,
                mint: mintPubkey,
                ownAddresses: bundleConfig.selectedWallets.map((w: { address: string }) => w.address),
                solThreshold: sniperGuard.solThreshold,
                action: sniperGuard.action,
                onTrigger: async (action: string) => {
                  log(controller, `Sniper guard triggered! Action: ${action}`, "warn");
                  if (action === "stop") {
                    stopped = true;
                  } else if (action === "sell-all") {
                    stopped = true;
                    log(controller, "Executing emergency sell-all...", "warn");
                    for (const w of bundleConfig.selectedWallets) {
                      try {
                        const kp = keypairFromPrivateKey(w.privateKey);
                        const tokenBal = await getTokenBalance(connection, kp.publicKey, mintPubkey);
                        if (tokenBal > 0) {
                          const result = await executeSell(connection, kp, mintPubkey, tokenBal);
                          log(controller, `Emergency sell: ${w.address.slice(0, 8)}`, "success", result.txSig, w.address);
                        }
                      } catch {}
                    }
                  }
                },
              });
              sniperInstance.start();
            }

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
              },
              () => stopped
            );

            sniperInstance?.stop();
          }
        }

        // ── Step 4: Auto-sell setup ───────────────────────────────────────────
        if (autoSell.enabled && !stopped) {
          if (autoSell.mode === "time") {
            log(controller, `Auto-sell scheduled in ${autoSell.timeSeconds}s`, "info");
          } else {
            log(controller, `Auto-sell MCap target: $${autoSell.mcapTarget.toLocaleString()}`, "info");
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
