# PumpFun Bundler

A Next.js bundler app for Solana — manage wallets, launch tokens, and simulate buy/sell activity on PumpSwap.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Features

### Wallet Management
Generate and manage Solana wallets. Balances are fetched live from the RPC.

### Token Launch
Launch tokens on Pump.fun (Token2022). The launch flow splits the create and dev-buy into separate bundle transactions submitted via Jito.

### Generate Activity
Simulates buy/sell cycles across selected wallets on PumpSwap tokens with ≥ $300k market cap.

- Qualifying tokens are fetched from **DexScreener** (`api.dexscreener.com`) — filtered to PumpSwap pairs on Solana with `fdv >= 300_000`
- Swaps are executed via **Jupiter** (`api.jup.ag/swap/v1`) — both quote and swap endpoints
- Each wallet is assigned a distinct random token per loop
- Buy → hold 2–5s → sell 100%, repeated for the configured number of loops
- Results stream back to the UI in real time via SSE

**API endpoints used:**
| Service | URL |
|---|---|
| Token discovery | `https://api.dexscreener.com/latest/dex/search?q=pumpswap` |
| Jupiter quote | `https://api.jup.ag/swap/v1/quote` |
| Jupiter swap | `https://api.jup.ag/swap/v1/swap` |

> Note: The legacy `quote-api.jup.ag` and `frontend-api.pump.fun` domains are decommissioned and will return errors.

## Stack

- **Next.js 16** (App Router)
- **Solana web3.js** + **Jito** for transaction bundling
- **Jupiter v1** for swaps
- **Pinata** for IPFS metadata uploads
- **Tailwind CSS** + **Radix UI**
