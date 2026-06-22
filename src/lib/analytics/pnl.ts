import type { PnLSummary, RoundTrip, TokenPnL, Trade } from "@/lib/types";

interface Lot {
  tokens: number;
  costSol: number;
  ts: number;
}

const EPS = 1e-9;

/**
 * Compute realized PnL (in SOL) per mint using FIFO lot matching.
 * Each sell is matched against the oldest open buys; every matched slice
 * produces a closed RoundTrip with its own pnl and ROI.
 */
export function computePnL(trades: Trade[]): PnLSummary {
  const ordered = [...trades].sort((a, b) => a.timestamp - b.timestamp);

  const lotsByMint = new Map<string, Lot[]>();
  const tokenAgg = new Map<string, TokenPnL>();
  const trips: RoundTrip[] = [];

  const tokenOf = (t: Trade): TokenPnL => {
    let agg = tokenAgg.get(t.mint);
    if (!agg) {
      agg = {
        mint: t.mint,
        symbol: t.symbol,
        realizedSol: 0,
        buys: 0,
        sells: 0,
        totalBoughtSol: 0,
        totalSoldSol: 0,
        openTokens: 0,
        openCostSol: 0,
        roundTrips: 0,
        wins: 0,
      };
      tokenAgg.set(t.mint, agg);
    }
    if (!agg.symbol && t.symbol) agg.symbol = t.symbol;
    return agg;
  };

  let buys = 0;
  let sells = 0;

  for (const t of ordered) {
    const agg = tokenOf(t);
    const lots = lotsByMint.get(t.mint) ?? [];
    lotsByMint.set(t.mint, lots);

    if (t.side === "buy") {
      buys++;
      agg.buys++;
      agg.totalBoughtSol += t.solAmount;
      lots.push({ tokens: t.tokenAmount, costSol: t.solAmount, ts: t.timestamp });
      continue;
    }

    // sell: match FIFO against open lots
    sells++;
    agg.sells++;
    agg.totalSoldSol += t.solAmount;

    let remaining = t.tokenAmount;
    const proceedsPerToken = t.tokenAmount > EPS ? t.solAmount / t.tokenAmount : 0;

    while (remaining > EPS && lots.length > 0) {
      const lot = lots[0];
      const take = Math.min(remaining, lot.tokens);
      const fraction = lot.tokens > EPS ? take / lot.tokens : 0;
      const cost = lot.costSol * fraction;
      const proceeds = proceedsPerToken * take;
      const pnl = proceeds - cost;

      trips.push({
        mint: t.mint,
        symbol: t.symbol ?? agg.symbol,
        openTs: lot.ts,
        closeTs: t.timestamp,
        holdSeconds: Math.max(0, t.timestamp - lot.ts),
        tokenAmount: take,
        costSol: cost,
        proceedsSol: proceeds,
        pnlSol: pnl,
        roi: cost > EPS ? pnl / cost : 0,
      });

      agg.realizedSol += pnl;
      agg.roundTrips++;
      if (pnl > 0) agg.wins++;

      lot.tokens -= take;
      lot.costSol -= cost;
      remaining -= take;
      if (lot.tokens <= EPS) lots.shift();
    }
    // Tokens sold without a matching buy (transfers in, airdrops) are treated as
    // pure proceeds against zero cost basis.
    if (remaining > EPS) {
      const proceeds = proceedsPerToken * remaining;
      trips.push({
        mint: t.mint,
        symbol: t.symbol ?? agg.symbol,
        openTs: t.timestamp,
        closeTs: t.timestamp,
        holdSeconds: 0,
        tokenAmount: remaining,
        costSol: 0,
        proceedsSol: proceeds,
        pnlSol: proceeds,
        roi: 0,
      });
      agg.realizedSol += proceeds;
      agg.roundTrips++;
      if (proceeds > 0) agg.wins++;
    }
  }

  // Roll up open positions per mint.
  for (const [mint, lots] of lotsByMint) {
    const agg = tokenAgg.get(mint);
    if (!agg) continue;
    for (const lot of lots) {
      agg.openTokens += lot.tokens;
      agg.openCostSol += lot.costSol;
    }
  }

  let grossProfit = 0;
  let grossLoss = 0;
  let wins = 0;
  let bestTrip: RoundTrip | undefined;
  let worstTrip: RoundTrip | undefined;
  for (const trip of trips) {
    if (trip.pnlSol > 0) {
      grossProfit += trip.pnlSol;
      wins++;
    } else {
      grossLoss += -trip.pnlSol;
    }
    if (!bestTrip || trip.pnlSol > bestTrip.pnlSol) bestTrip = trip;
    if (!worstTrip || trip.pnlSol < worstTrip.pnlSol) worstTrip = trip;
  }

  const realizedSol = grossProfit - grossLoss;
  const roundTrips = trips.length;

  return {
    realizedSol,
    totalTrades: trades.length,
    buys,
    sells,
    roundTrips,
    wins,
    losses: roundTrips - wins,
    winRate: roundTrips > 0 ? wins / roundTrips : 0,
    grossProfitSol: grossProfit,
    grossLossSol: grossLoss,
    profitFactor: grossLoss > EPS ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    bestTrip,
    worstTrip,
    perToken: [...tokenAgg.values()].sort((a, b) => b.realizedSol - a.realizedSol),
    trips,
  };
}
