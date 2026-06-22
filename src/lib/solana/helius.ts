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
interface HeliusTokenTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  mint: string;
  /** UI (decimal-adjusted) amount. */
  tokenAmount: number;
}
interface HeliusNativeTransfer {
  fromUserAccount?: string;
  toUserAccount?: string;
  /** Lamports. */
  amount: number;
}
interface HeliusAccountData {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges?: HeliusTokenBalance[];
}
interface HeliusTx {
  signature: string;
  timestamp: number;
  source?: string;
  type?: string;
  events?: { swap?: HeliusSwapEvent };
  tokenTransfers?: HeliusTokenTransfer[];
  nativeTransfers?: HeliusNativeTransfer[];
  accountData?: HeliusAccountData[];
}

const EPS = 1e-9;
/** Minimum SOL leg to treat a token movement as a trade (filters dust/airdrops). */
const SOL_DUST = 0.0005;

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
  return parseFromSwapEvent(tx, address) ?? parseFromTransfers(tx, address);
}

/** Primary path: aggregators (e.g. Jupiter) that populate `events.swap`. */
function parseFromSwapEvent(tx: HeliusTx, address: string): Trade | null {
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
 * Fallback path: many venues (pump.fun, Axiom/router-routed, bots) are NOT
 * tagged with a populated `events.swap` — and some aren't even tagged
 * `type=SWAP`. Derive the trade from the user's net token change
 * (tokenTransfers) and net SOL change (WSOL leg, else native balance change),
 * requiring the token and SOL legs to move in OPPOSITE directions so plain
 * transfers / airdrops are not mistaken for trades.
 */
function parseFromTransfers(tx: HeliusTx, address: string): Trade | null {
  const tokenNet = new Map<string, number>();
  let wsolNet = 0;

  for (const t of tx.tokenTransfers ?? []) {
    const amt = Number(t.tokenAmount) || 0;
    if (amt === 0) continue;
    let delta = 0;
    if (t.toUserAccount === address) delta += amt;
    if (t.fromUserAccount === address) delta -= amt;
    if (delta === 0) continue;
    if (t.mint === WSOL) wsolNet += delta;
    else tokenNet.set(t.mint, (tokenNet.get(t.mint) ?? 0) + delta);
  }

  // Dominant non-WSOL token leg by absolute net change.
  let mint: string | undefined;
  let net = 0;
  for (const [m, v] of tokenNet) {
    if (Math.abs(v) > Math.abs(net)) {
      net = v;
      mint = m;
    }
  }
  if (!mint || Math.abs(net) < EPS) return null;

  // Signed SOL delta: prefer the explicit WSOL leg, else the native balance
  // change (which nets fees/rent). Receiving SOL is positive.
  const userAcct = (tx.accountData ?? []).find((a) => a.account === address);
  const nativeDelta = userAcct ? userAcct.nativeBalanceChange / LAMPORTS : 0;
  const solSigned = Math.abs(wsolNet) > EPS ? wsolNet : nativeDelta;

  let side: Side;
  if (net > 0 && solSigned < -SOL_DUST) {
    side = "buy"; // received token, spent SOL
  } else if (net < 0 && solSigned > SOL_DUST) {
    side = "sell"; // sent token, received SOL
  } else {
    return null; // not a SOL<->token swap (transfer, airdrop, deposit, etc.)
  }

  const tokenAmount = Math.abs(net);
  const solAmount = Math.abs(solSigned);

  return {
    signature: tx.signature,
    timestamp: tx.timestamp,
    mint,
    side,
    solAmount,
    tokenAmount,
    priceSol: solAmount / tokenAmount,
    source: tx.source,
  };
}

// Legacy: when the `type=SWAP` filter found no events in a scan window, Helius
// returned 404 with a continuation hint. We no longer use the type filter (it
// drops Axiom/router-routed and other untagged swaps), but keep the pattern in
// case a 404 with a hint is ever returned mid-scan.
const BEFORE_HINT = /before-signature[`'" ]*parameter set to[`'" ]*([1-9A-HJ-NP-Za-km-z]{32,88})/i;

/**
 * Fetch and normalize a wallet's swap history from the Helius Enhanced
 * Transactions API. Paginates with `before` up to `maxPages` (100 tx/page).
 *
 * We deliberately do NOT use the `type=SWAP` filter: Helius only tags swaps it
 * recognizes from known DEX programs, which misses Axiom/router-routed, bot, and
 * many pump.fun trades (often tagged `TRANSFER`). Instead we scan every
 * transaction and detect swaps ourselves via `parseSwap` (swap-event first, then
 * a signed token<->SOL transfer heuristic).
 */
export async function fetchTrades(
  address: string,
  opts: { apiKey: string; maxPages?: number } = { apiKey: "" },
): Promise<Trade[]> {
  const { apiKey, maxPages = 40 } = opts;
  if (!apiKey) throw new Error("Missing Helius API key");

  const trades: Trade[] = [];
  let before: string | undefined;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (let page = 0; page < maxPages; page++) {
    const url = new URL(`https://api.helius.xyz/v0/addresses/${address}/transactions`);
    url.searchParams.set("api-key", apiKey);
    url.searchParams.set("limit", "100");
    if (before) url.searchParams.set("before", before);

    // Fetch with bounded retry on rate limiting (free tier is easily tripped).
    let res: Response | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await fetch(url, { headers: { accept: "application/json" } });
      if (res.status !== 429) break;
      const retryAfter = Number(res.headers.get("retry-after")) || 0;
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 400 * (attempt + 1));
    }
    if (!res) break;

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      if (res.status === 404) {
        const hint = body.match(BEFORE_HINT)?.[1];
        if (hint && hint !== before) {
          before = hint;
          continue;
        }
        break; // no more transactions
      }
      // Rate-limited past our retries: return what we have rather than failing.
      if (res.status === 429) break;
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

    // Gentle pacing to stay under the free-tier rate limit.
    await sleep(120);
  }

  return trades.sort((a, b) => a.timestamp - b.timestamp);
}

interface DasAsset {
  id: string;
  content?: { metadata?: { name?: string; symbol?: string } };
  token_info?: { symbol?: string };
}

/**
 * Resolve token symbols/names for a set of mints via the Helius DAS
 * `getAssetBatch` RPC. Returns a mint -> display label map. Never throws —
 * unresolved mints simply fall back to a shortened address in the UI.
 */
export async function fetchTokenSymbols(
  mints: string[],
  apiKey: string,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(mints)].filter(Boolean);
  if (!apiKey || unique.length === 0) return out;

  const rpc = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;

  for (let i = 0; i < unique.length; i += 1000) {
    const ids = unique.slice(i, i + 1000);
    try {
      const res = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "trading-os",
          method: "getAssetBatch",
          params: { ids },
        }),
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { result?: (DasAsset | null)[] };
      for (const asset of data.result ?? []) {
        if (!asset) continue;
        const label =
          asset.content?.metadata?.symbol ||
          asset.token_info?.symbol ||
          asset.content?.metadata?.name;
        if (label) out.set(asset.id, label.trim());
      }
    } catch {
      // ignore; leave these mints unresolved
    }
  }

  return out;
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
