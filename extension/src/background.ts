import { analyze } from "@/lib/analytics/analyze";
import { fetchSolPriceUsd, fetchTokenSymbols, fetchTrades } from "@/lib/solana/helius";
import { fetchTokenPrices } from "@/lib/solana/prices";

import {
  type AnalyzeResponse,
  type BgRequest,
  type PricesResponse,
  getSettings,
} from "./config";

/**
 * All network calls run here in the service worker, where extension
 * host_permissions apply and the page's CSP does not — so fetches to Helius /
 * DexScreener that Axiom would otherwise block succeed.
 */
async function handleAnalyze(address: string): Promise<AnalyzeResponse> {
  const { heliusKey } = await getSettings();
  if (!heliusKey) return { ok: false, error: "No Helius key configured (set one in the popup)." };
  try {
    const [trades, solPriceUsd] = await Promise.all([
      fetchTrades(address, { apiKey: heliusKey }),
      fetchSolPriceUsd(),
    ]);
    if (trades.length === 0) {
      return { ok: false, error: "No swap history found for this wallet." };
    }
    const symbols = await fetchTokenSymbols(
      trades.map((t) => t.mint),
      heliusKey,
    );
    for (const t of trades) {
      const label = symbols.get(t.mint);
      if (label) t.symbol = label;
    }
    const result = analyze(address, trades);
    return { ok: true, result: { ...result, solPriceUsd } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Analyze failed" };
  }
}

async function handlePrices(mints: string[]): Promise<PricesResponse> {
  try {
    const map = await fetchTokenPrices(mints);
    const prices: PricesResponse["prices"] = {};
    for (const [mint, p] of map) {
      prices[mint] = {
        priceUsd: p.priceUsd,
        priceSol: p.priceSol,
        change24h: p.change24h,
        symbol: p.symbol,
      };
    }
    return { ok: true, prices };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Prices failed" };
  }
}

chrome.runtime.onMessage.addListener((msg: BgRequest, _sender, sendResponse) => {
  (async () => {
    if (msg.type === "ANALYZE") sendResponse(await handleAnalyze(msg.address));
    else if (msg.type === "PRICES") sendResponse(await handlePrices(msg.mints));
    else sendResponse({ ok: false, error: "Unknown message" });
  })();
  return true; // keep the message channel open for the async response
});
