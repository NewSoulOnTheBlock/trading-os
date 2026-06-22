import type { Side, Trade } from "@/lib/types";

const WSOL = "So11111111111111111111111111111111111111112";
const LAMPORTS = 1e9;

// ---- Minimal shapes of the Helius Enhanced Transactions payload we consume ----
interface HeliusNative {
  account?: string;
  amount: number;
}
interface HeliusRawAmount {
  tokenAmount: string;
  decimals: number;
}
interface HeliusTokenBalance {
  userAccount?: string;
  tokenAccount?: string;
  mint: string;
  rawTokenAmount: HeliusRawAmount;
}
interface HeliusSwapEvent {
  nativeInput?: HeliusNative | null;
  nativeOutput?: HeliusNative | null;
  tokenInputs?: HeliusTokenBalance[];
  tokenOutputs?: HeliusTokenBalance[];
}
interface HeliusTx {
  signature: string;
  timestamp: number;
  source?: string;
  type?: string;
  events?: { swap?: HeliusSwapEvent };
}

function rawToNum(b?: HeliusTokenBalance): number {
  if (!b?.rawTokenAmount) return 0;
  const { tokenAmount, decimals } = b.rawTokenAmount;
  const n = Number(tokenAmount);
  if (!Number.isFinite(n)) return 0;
  return n / Math.pow(10, decimals ?? 0);
}

function pickLegs(balances: HeliusTokenBalance[] | undefined, address: string): HeliusTokenBalance[] {
  const list = balances ?? [];
  const owned = list.filter((b) => b.userAccount === address);
  return owned.length ? owned : list;
}

/** Sum WSOL legs (in SOL) and return the dominant non-WSOL token leg. */
function splitSol(legs: HeliusTokenBalance[]): { sol: number; token?: HeliusTokenBalance; tokenAmt: number } {
  let sol = 0;
  let token: HeliusTokenBalance | undefined;
  let tokenAmt = 0;
  for (const leg of legs) {
    if (leg.mint === WSOL) {
      sol += rawToNum(leg);
    } else {
      const amt = rawToNum(leg);
      if (amt > tokenAmt) {
        tokenAmt = amt;
        token = leg;
      }
    }
  }
  return { sol, token, tokenAmt };
}

/** Convert one Helius SWAP transaction into a normalized Trade (or null). */
export function parseSwap(tx: HeliusTx, address: string): Trade | null {
  const swap = tx.events?.swap;
  if (!swap) return null;

  const inLegs = pickLegs(swap.tokenInputs, address);
  const outLegs = pickLegs(swap.tokenOutputs, address);
  const inSplit = splitSol(inLegs);
  const outSplit = splitSol(outLegs);

  const solIn = (swap.nativeInput?.amount ?? 0) / LAMPORTS + inSplit.sol;
  const solOut = (swap.nativeOutput?.amount ?? 0) / LAMPORTS + outSplit.sol;

  let side: Side;
  let solAmount: number;
  let token: HeliusTokenBalance | undefined;
  let tokenAmount: number;

  if (solIn > 0 && solOut === 0) {
    side = "buy";
    solAmount = solIn;
    token = outSplit.token;
    tokenAmount = outSplit.tokenAmt;
  } else if (solOut > 0 && solIn === 0) {
    side = "sell";
    solAmount = solOut;
    token = inSplit.token;
    tokenAmount = inSplit.tokenAmt;
  } else {
    // token-to-token or ambiguous: no clean SOL leg to value against.
    return null;
  }

  if (!token || tokenAmount <= 0 || solAmount <= 0) return null;

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    mint: token.mint,
    side,
    solAmount,
    tokenAmount,
    priceSol: solAmount / tokenAmount,
    source: tx.source,
  };
}

/**
 * Fetch and normalize a wallet's swap history from the Helius Enhanced
 * Transactions API. Paginates with `before` up to `maxPages` (100 tx/page).
 */
export async function fetchTrades(
  address: string,
  opts: { apiKey: string; maxPages?: number } = { apiKey: "" },
): Promise<Trade[]> {
  const { apiKey, maxPages = 10 } = opts;
  if (!apiKey) throw new Error("Missing Helius API key");

  const trades: Trade[] = [];
  let before: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("type", "SWAP");
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Helius ${res.status}: ${body.slice(0, 200)}`);
    }
    const batch = (await res.json()) as HeliusTx[];
    if (!Array.isArray(batch) || batch.length === 0) break;

    for (const tx of batch) {
      const trade = parseSwap(tx, address);
      if (trade) trades.push(trade);
    }
    before = batch[batch.length - 1]?.signature;
    if (batch.length < 100) break;
  }

  return trades.sort((a, b) => a.timestamp - b.timestamp);
}

/** Best-effort current SOL/USD price for display only (never throws). */
export async function fetchSolPriceUsd(): Promise<number | undefined> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate: 300 } } as RequestInit,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { solana?: { usd?: number } };
    return data.solana?.usd;
  } catch {
    return undefined;
  }
}
