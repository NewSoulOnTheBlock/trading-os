import type { Metrics, PnLSummary, SessionStats, Trade } from "@/lib/types";

const DAY = 86400;

function utcDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Behavioral metrics computed across all trades + closed round-trips. */
export function computeMetrics(trades: Trade[], pnl: PnLSummary): Metrics {
  const tradesByDay = new Map<string, number>();
  const hourHistogram = new Array(24).fill(0);
  let positionSum = 0;
  let positionCount = 0;
  let maxPosition = 0;

  for (const t of trades) {
    const day = utcDate(t.timestamp);
    tradesByDay.set(day, (tradesByDay.get(day) ?? 0) + 1);
    hourHistogram[new Date(t.timestamp * 1000).getUTCHours()]++;
    if (t.side === "buy") {
      positionSum += t.solAmount;
      positionCount++;
      if (t.solAmount > maxPosition) maxPosition = t.solAmount;
    }
  }

  const activeDays = tradesByDay.size;
  const maxTradesInDay = tradesByDay.size ? Math.max(...tradesByDay.values()) : 0;

  const holds = pnl.trips.map((t) => t.holdSeconds);
  const avgHold = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;
  const flips = pnl.trips.filter((t) => t.holdSeconds > 0 && t.holdSeconds < 120).length;
  const bigLosses = pnl.trips.filter((t) => t.roi < -0.5).length;

  // Revenge trading: a buy of the same mint within 30 min after a losing exit.
  const losingExits = pnl.trips
    .filter((t) => t.pnlSol < 0)
    .map((t) => ({ mint: t.mint, ts: t.closeTs }));
  let revenge = 0;
  for (const loss of losingExits) {
    const reentered = trades.some(
      (t) =>
        t.side === "buy" &&
        t.mint === loss.mint &&
        t.timestamp > loss.ts &&
        t.timestamp - loss.ts <= 1800,
    );
    if (reentered) revenge++;
  }

  const roundTrips = pnl.trips.length;
  return {
    activeDays,
    tradesPerActiveDay: activeDays ? trades.length / activeDays : 0,
    avgPositionSizeSol: positionCount ? positionSum / positionCount : 0,
    maxPositionSizeSol: maxPosition,
    avgHoldSeconds: avgHold,
    medianHoldSeconds: median(holds),
    flipRate: roundTrips ? flips / roundTrips : 0,
    revengeRate: losingExits.length ? revenge / losingExits.length : 0,
    maxTradesInDay,
    hourHistogram,
    bigLossRate: roundTrips ? bigLosses / roundTrips : 0,
  };
}

/**
 * Stats scoped to a single UTC day (defaults to the most recent active day),
 * which is what the daily session coach reacts to.
 */
export function computeSession(trades: Trade[], pnl: PnLSummary, date?: string): SessionStats {
  const day = date ?? (trades.length ? utcDate(Math.max(...trades.map((t) => t.timestamp))) : "all");
  const start = Date.parse(`${day}T00:00:00Z`) / 1000;
  const end = start + DAY;

  const inDay = (ts: number) => ts >= start && ts < end;
  const dayTrades = trades.filter((t) => inDay(t.timestamp));
  const dayTrips = pnl.trips.filter((t) => inDay(t.closeTs));

  const realized = dayTrips.reduce((a, t) => a + t.pnlSol, 0);
  const wins = dayTrips.filter((t) => t.pnlSol > 0).length;
  const buys = dayTrades.filter((t) => t.side === "buy");
  const posAvg = buys.length ? buys.reduce((a, t) => a + t.solAmount, 0) / buys.length : 0;
  const flips = dayTrips.filter((t) => t.holdSeconds > 0 && t.holdSeconds < 120).length;

  const losingExits = dayTrips.filter((t) => t.pnlSol < 0);
  let revenge = 0;
  for (const loss of losingExits) {
    if (
      trades.some(
        (t) =>
          t.side === "buy" &&
          t.mint === loss.mint &&
          t.timestamp > loss.closeTs &&
          t.timestamp - loss.closeTs <= 1800,
      )
    ) {
      revenge++;
    }
  }

  return {
    date: day,
    trades: dayTrades.length,
    realizedSol: realized,
    winRate: dayTrips.length ? wins / dayTrips.length : 0,
    roundTrips: dayTrips.length,
    avgPositionSizeSol: posAvg,
    flipRate: dayTrips.length ? flips / dayTrips.length : 0,
    revengeRate: losingExits.length ? revenge / losingExits.length : 0,
  };
}
