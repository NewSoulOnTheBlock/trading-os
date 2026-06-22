# Trading OS

A Solana **trading operating system**: connect a wallet, analyze its on-chain DEX
trade history, and get a daily coaching briefing designed to make you a more
consistent, profitable trader.

## What it does

- **Connect a wallet** (Phantom / Solflare / Backpack / any Wallet Standard wallet)
  or paste any address for read-only analysis.
- **Fetches trade history** of parsed DEX swaps via the Helius Enhanced
  Transactions API.
- **Computes realized P&L in SOL** using FIFO lot matching (no unreliable
  memecoin USD oracle needed), plus win rate and profit factor.
- **Behavioral metrics**: position sizing consistency, hold time, overtrading,
  sub-2-minute flips, revenge-trading, and big-loss rate.
- **Daily pointers**: a deterministic rule engine flags exactly what to fix or
  keep doing today.
- **AI briefing**: an optional LLM turns your stats into a short, plain-English
  session plan.
- **Journal**: per-day notes saved locally in your browser.
- **Risk alerts**: set daily trade caps, loss limits, and max position size;
  the dashboard warns when you breach them.

## Stack

- Next.js (App Router) + TypeScript + Tailwind v4
- `@solana/wallet-adapter` for read-only wallet connection
- Helius Enhanced Transactions API for trade data (server-side)
- OpenRouter / OpenAI for the optional AI briefing (server-side)

## Setup

```bash
npm install
cp .env.example .env.local   # fill in keys (all optional)
npm run dev
```

Open http://localhost:3000.

### Environment variables (all optional)

| Var | Purpose |
| --- | --- |
| `HELIUS_API_KEY` | Live swap history. Without it, demo data is shown. |
| `OPENROUTER_API_KEY` / `OPENAI_API_KEY` | Enables the AI briefing. |
| `LLM_MODEL` | Override the chat model. |
| `NEXT_PUBLIC_SOLANA_RPC_URL` | Custom RPC for wallet connection. |

The app is fully usable with **no keys** — it falls back to a realistic demo
dataset so every feature is explorable.

## How P&L is computed

Each swap is normalized into a buy/sell of one token against SOL. Sells are
matched against earlier buys **FIFO**; every matched slice is a closed
round-trip with its own P&L and ROI. Token-to-token swaps without a SOL leg are
skipped (they can't be valued reliably).

## Notes

- This is an analytics + coaching tool, **not financial advice**, and it never
  recommends specific tokens to buy.
- Journal entries and alert thresholds are stored in `localStorage` only.

## Structure

```
src/
  app/
    api/trades/route.ts   Fetch + normalize swaps, run analytics (server)
    api/advice/route.ts   LLM session briefing (server)
    providers.tsx         Wallet + RPC providers
    page.tsx / layout.tsx
  components/             Dashboard + panels
  lib/
    solana/helius.ts      Helius fetch + swap parser
    solana/demo.ts        Demo dataset
    analytics/pnl.ts      FIFO realized P&L
    analytics/metrics.ts  Behavioral metrics + session stats
    analytics/analyze.ts  Pipeline orchestrator
    advice/rules.ts       Rule-based daily pointers
    types.ts / format.ts
```
