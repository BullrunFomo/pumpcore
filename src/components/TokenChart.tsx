"use client";

import { useEffect, useState } from "react";

export default function TokenChart({ mint }: { mint: string }) {
  const [poolAddress, setPoolAddress] = useState<string | null>(null);

  useEffect(() => {
    if (!mint) return;
    setPoolAddress(null);
    fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        const pool = d?.data?.[0]?.attributes?.address;
        if (pool) setPoolAddress(pool);
      })
      .catch(() => {});
  }, [mint]);

  if (!poolAddress) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        {mint ? "Loading chart…" : "No token selected"}
      </div>
    );
  }

  const src =
    `https://www.geckoterminal.com/solana/pools/${poolAddress}` +
    `?embed=1&info=0&swaps=0&light_chart=0&resolution=1s&chart_type=market_cap`;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <iframe
        src={src}
        className="w-full"
        style={{ border: "none", display: "block", height: "calc(100% + 40px)" }}
        allow="clipboard-write"
        title="GeckoTerminal Chart"
      />
    </div>
  );
}
