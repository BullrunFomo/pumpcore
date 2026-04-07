import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { PUMPFUN_PROGRAM_ID } from "./solana";

// ─── Sniper Guard ─────────────────────────────────────────────────────────────

export class SniperGuard {
  private connection: Connection;
  private mint: PublicKey;
  private ownAddresses: Set<string>;
  private solThreshold: number;
  private onTrigger: (action: "stop" | "sell-all") => void;
  private action: "stop" | "sell-all";
  private totalExternalSol = 0;
  private subscriptionId: number | null = null;
  private triggered = false;

  constructor(params: {
    connection: Connection;
    mint: PublicKey;
    ownAddresses: string[];
    solThreshold: number;
    action: "stop" | "sell-all";
    onTrigger: (action: "stop" | "sell-all") => void;
  }) {
    this.connection = params.connection;
    this.mint = params.mint;
    this.ownAddresses = new Set(params.ownAddresses.map((a) => a.toLowerCase()));
    this.solThreshold = params.solThreshold;
    this.action = params.action;
    this.onTrigger = params.onTrigger;
  }

  start() {
    this.subscriptionId = this.connection.onLogs(
      this.mint,
      (logs) => {
        if (this.triggered) return;
        this.parseLogs(logs);
      },
      "confirmed"
    );
  }

  stop() {
    if (this.subscriptionId !== null) {
      this.connection.removeOnLogsListener(this.subscriptionId);
      this.subscriptionId = null;
    }
  }

  private parseLogs(logs: { logs: string[]; signature: string; err: unknown }) {
    // Look for buy instruction logs from external wallets
    for (const log of logs.logs) {
      if (log.includes("Buy")) {
        // Try to parse sol amount from log (heuristic)
        const match = log.match(/sol_amount[:\s]+(\d+)/i);
        if (match) {
          const lamports = parseInt(match[1]);
          const sol = lamports / LAMPORTS_PER_SOL;

          // We can't easily determine the buyer from logs alone without
          // fetching the transaction, but we accumulate total external volume
          this.totalExternalSol += sol;

          if (this.totalExternalSol >= this.solThreshold && !this.triggered) {
            this.triggered = true;
            this.stop();
            this.onTrigger(this.action);
          }
        }
      }
    }
  }

  getExternalVolume() {
    return this.totalExternalSol;
  }

  isTriggered() {
    return this.triggered;
  }
}

// ─── Auto-Sell Scheduler ──────────────────────────────────────────────────────

export class AutoSellScheduler {
  private timerId: NodeJS.Timeout | null = null;
  private pricePoller: NodeJS.Timeout | null = null;

  scheduleTimeBased(delayMs: number, onSell: () => void) {
    this.timerId = setTimeout(onSell, delayMs);
  }

  scheduleMcapBased(
    targetMcap: number,
    getMcap: () => Promise<number>,
    onSell: () => void
  ) {
    const poll = async () => {
      try {
        const mcap = await getMcap();
        if (mcap >= targetMcap) {
          this.stop();
          onSell();
          return;
        }
      } catch {}
      this.pricePoller = setTimeout(poll, 5_000);
    };
    poll();
  }

  stop() {
    if (this.timerId) clearTimeout(this.timerId);
    if (this.pricePoller) clearTimeout(this.pricePoller);
  }
}
