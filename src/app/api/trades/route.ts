import { analyze } from "@/lib/analytics/analyze";
import { demoTrades } from "@/lib/solana/demo";
import { fetchSolPriceUsd, fetchTokenSymbols, fetchTrades } from "@/lib/solana/helius";
import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

interface TradesResponse extends AnalysisResult {
  solPriceUsd?: number;
}

export async function POST(request: Request) {
  let address = "";
  try {
    const body = (await request.json()) as { address?: string };
    address = (body.address ?? "").trim();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!BASE58.test(address)) {
    return Response.json({ error: "Invalid Solana address" }, { status: 400 });
  }

  const apiKey = process.env.HELIUS_API_KEY ?? "";
  const solPriceUsd = await fetchSolPriceUsd();

  // No key configured -> demo dataset so the product is always usable.
  if (!apiKey) {
    const result = analyze(address, demoTrades());
    const payload: TradesResponse = {
      ...result,
      demo: true,
      note: "No HELIUS_API_KEY configured — showing demo data. Add a key in .env.local for live wallet analysis.",
      solPriceUsd,
    };
    return Response.json(payload);
  }

  try {
    const trades = await fetchTrades(address, { apiKey });
    if (trades.length === 0) {
      const result = analyze(address, demoTrades());
      const payload: TradesResponse = {
        ...result,
        demo: true,
        note: "No swap history found for this wallet — showing demo data instead.",
        solPriceUsd,
      };
      return Response.json(payload);
    }
    // Attach real token symbols/names (pump.fun trades carry no symbol).
    const symbols = await fetchTokenSymbols(
      trades.map((t) => t.mint),
      apiKey,
    );
    for (const t of trades) {
      const label = symbols.get(t.mint);
      if (label) t.symbol = label;
    }

    const result = analyze(address, trades);
    return Response.json({ ...result, solPriceUsd } satisfies TradesResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const result = analyze(address, demoTrades());
    const payload: TradesResponse = {
      ...result,
      demo: true,
      note: `Live fetch failed (${message}) — showing demo data.`,
      solPriceUsd,
    };
    return Response.json(payload, { status: 200 });
  }
}
