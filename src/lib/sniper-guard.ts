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
