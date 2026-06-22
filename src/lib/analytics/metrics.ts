import type { DayStat, EquityPoint, Metrics, PnLSummary, SessionStats, Trade } from "@/lib/types";

const DAY = 86400;
const EPS = 1e-9;

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
  const dowHistogram = new Array(7).fill(0);
  let positionSum = 0;
  let positionCount = 0;
  let maxPosition = 0;

  for (const t of trades) {
    const day = utcDate(t.timestamp);
    tradesByDay.set(day, (tradesByDay.get(day) ?? 0) + 1);
    const d = new Date(t.timestamp * 1000);
    hourHistogram[d.getUTCHours()]++;
    dowHistogram[d.getUTCDay()]++;
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

  // --- Equity curve + max drawdown (over closed round-trips, chronological) ---
  const closed = [...pnl.trips].sort((a, b) => a.closeTs - b.closeTs);
  const equityCurve: EquityPoint[] = [];
  const dowPnl = new Array(7).fill(0);
  const hourPnl = new Array(24).fill(0);
  const pnlByDay = new Map<string, number>();
  let cum = 0;
  let peak = 0;
  let maxDrawdownSol = 0;
  let maxDrawdownPct = 0;
  for (const t of closed) {
    cum += t.pnlSol;
    equityCurve.push({ ts: t.closeTs, cum });
    if (cum > peak) peak = cum;
    const dd = peak - cum;
    if (dd > maxDrawdownSol) {
      maxDrawdownSol = dd;
      maxDrawdownPct = peak > EPS ? dd / peak : 0;
    }
    const cd = new Date(t.closeTs * 1000);
    dowPnl[cd.getUTCDay()] += t.pnlSol;
    hourPnl[cd.getUTCHours()] += t.pnlSol;
    const day = utcDate(t.closeTs);
    pnlByDay.set(day, (pnlByDay.get(day) ?? 0) + t.pnlSol);
  }

  // --- Per-day rollup, streaks, overtrading ---
  const allDays = new Set<string>([...tradesByDay.keys(), ...pnlByDay.keys()]);
  const dailyPnl: DayStat[] = [...allDays]
    .sort()
    .map((date) => ({
      date,
      trades: tradesByDay.get(date) ?? 0,
      realizedSol: pnlByDay.get(date) ?? 0,
    }));

  let greenDays = 0;
  let redDays = 0;
  let greenTradeSum = 0;
  let redTradeSum = 0;
  for (const d of dailyPnl) {
    if (d.realizedSol > EPS) {
      greenDays++;
      greenTradeSum += d.trades;
    } else if (d.realizedSol < -EPS) {
      redDays++;
      redTradeSum += d.trades;
    }
  }
  // Current trailing green streak (most-recent active days backward).
  let currentGreenStreak = 0;
  for (let i = dailyPnl.length - 1; i >= 0; i--) {
    if (dailyPnl[i].realizedSol > EPS) currentGreenStreak++;
    else break;
  }
  let longestGreenStreak = 0;
  let run = 0;
  for (const d of dailyPnl) {
    if (d.realizedSol > EPS) {
      run++;
      if (run > longestGreenStreak) longestGreenStreak = run;
    } else {
      run = 0;
    }
  }

  // --- Entry/exit efficiency vs each token's own observed price band ---
  const band = new Map<string, { min: number; max: number }>();
  for (const t of trades) {
    if (t.priceSol <= 0) continue;
    const b = band.get(t.mint);
    if (!b) band.set(t.mint, { min: t.priceSol, max: t.priceSol });
    else {
      if (t.priceSol < b.min) b.min = t.priceSol;
      if (t.priceSol > b.max) b.max = t.priceSol;
    }
  }
  let entryEffSum = 0;
  let entryEffN = 0;
  let exitEffSum = 0;
  let exitEffN = 0;
  for (const t of trades) {
    const b = band.get(t.mint);
    if (!b || b.max - b.min < EPS || t.priceSol <= 0) continue;
    const range = b.max - b.min;
    if (t.side === "buy") {
      entryEffSum += (b.max - t.priceSol) / range; // near low => 1
      entryEffN++;
    } else {
      exitEffSum += (t.priceSol - b.min) / range; // near high => 1
      exitEffN++;
    }
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
    equityCurve,
    maxDrawdownSol,
    maxDrawdownPct,
    dowHistogram,
    dowPnl,
    hourPnl,
    dailyPnl,
    greenDays,
    redDays,
    currentGreenStreak,
    longestGreenStreak,
    avgTradesGreenDay: greenDays ? greenTradeSum / greenDays : 0,
    avgTradesRedDay: redDays ? redTradeSum / redDays : 0,
    avgEntryEfficiency: entryEffN ? entryEffSum / entryEffN : 0,
    avgExitEfficiency: exitEffN ? exitEffSum / exitEffN : 0,
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
