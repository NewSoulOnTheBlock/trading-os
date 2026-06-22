/** Client-side token price lookups via DexScreener (no API key required). */

export interface TokenPrice {
  mint: string;
  symbol?: string;
  priceUsd?: number;
  priceSol?: number;
  change24h?: number;
  liquidityUsd?: number;
}

interface DexPair {
  baseToken?: { address?: string; symbol?: string };
  priceUsd?: string;
  priceNative?: string;
  priceChange?: { h24?: number };
  liquidity?: { usd?: number };
}

/**
 * Fetch current prices for up to ~30 mints. Returns the most-liquid pair per
 * mint. Never throws — failed lookups are simply absent from the map.
 */
export async function fetchTokenPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
  const out = new Map<string, TokenPrice>();
  const unique = [...new Set(mints)].filter(Boolean).slice(0, 30);
  if (unique.length === 0) return out;

  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${unique.join(",")}`,
      { headers: { accept: "application/json" } },
    );
    if (!res.ok) return out;
    const data = (await res.json()) as { pairs?: DexPair[] };
    for (const p of data.pairs ?? []) {
      const mint = p.baseToken?.address;
      if (!mint) continue;
      const liq = p.liquidity?.usd ?? 0;
      const prev = out.get(mint);
      if (prev && (prev.liquidityUsd ?? 0) >= liq) continue; // keep most-liquid pair
      out.set(mint, {
        mint,
        symbol: p.baseToken?.symbol,
        priceUsd: p.priceUsd ? Number(p.priceUsd) : undefined,
        priceSol: p.priceNative ? Number(p.priceNative) : undefined,
        change24h: p.priceChange?.h24,
        liquidityUsd: liq,
      });
    }
  } catch {
    // ignore network/parse failures
  }
  return out;
}
