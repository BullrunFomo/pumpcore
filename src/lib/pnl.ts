import type { LaunchRecord, TradeRecord } from "@/types";

/**
 * Returns all trades that belong to a given launch.
 * Uses mintAddress tag when available; falls back to timestamp window inference
 * for older trades that predate the tagging.
 */
export function getTradesForLaunch(
  mintAddress: string,
  launches: LaunchRecord[],
  trades: TradeRecord[]
): TradeRecord[] {
  const sorted = [...launches].sort(
    (a, b) => new Date(a.launchedAt).getTime() - new Date(b.launchedAt).getTime()
  );
  const idx = sorted.findIndex((l) => l.mintAddress === mintAddress);
  if (idx === -1) return [];

  const start = new Date(sorted[idx].launchedAt).getTime();
  const next = sorted[idx + 1];
  const end = next ? new Date(next.launchedAt).getTime() : Infinity;

  return trades.filter((t) => {
    if (t.mintAddress) return t.mintAddress === mintAddress;
    const ts = new Date(t.timestamp).getTime();
    return ts >= start && ts < end;
  });
}

/**
 * Computes PnL in SOL for the active launch.
 *
 * Formula (new launches): currentTotalSol - initialSolEquity
 * Formula (old launches): filtered sells - filtered buys (trade-based fallback)
 */
export function computeLaunchPnl(
  activeLaunch: LaunchRecord | undefined,
  launches: LaunchRecord[],
  trades: TradeRecord[],
  currentTotalSol: number
): number {
  if (!activeLaunch) return 0;

  if (activeLaunch.initialSolEquity != null) {
    return currentTotalSol - activeLaunch.initialSolEquity;
  }

  const launchTrades = getTradesForLaunch(activeLaunch.mintAddress, launches, trades);
  return launchTrades.reduce((acc, t) => {
    if (t.type === "sell") return acc + t.solAmount;
    if (t.type === "buy") return acc - t.solAmount;
    return acc;
  }, 0);
}
