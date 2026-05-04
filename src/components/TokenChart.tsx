"use client";

export default function TokenChart({ mint }: { mint: string }) {
  const src =
    `https://dexscreener.com/solana/${mint}` +
    `?embed=1&theme=dark&trades=0&info=0&chartLeftToolbar=0&chartDefaultOnMobile=1`;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <iframe
        src={src}
        className="w-full"
        style={{ border: "none", display: "block", height: "calc(100% + 44px)" }}
        allow="clipboard-write"
        title="DexScreener Chart"
      />
    </div>
  );
}
