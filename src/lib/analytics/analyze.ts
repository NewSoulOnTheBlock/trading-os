import { buildPointers } from "@/lib/advice/rules";
import { computeMetrics, computeSession } from "@/lib/analytics/metrics";
import { computePnL } from "@/lib/analytics/pnl";
import type { AnalysisResult, Trade } from "@/lib/types";

/** Run the full analytics + rule-based advice pipeline over a trade list. */
export function analyze(address: string, trades: Trade[]): AnalysisResult {
  const pnl = computePnL(trades);
  const metrics = computeMetrics(trades, pnl);
  const session = computeSession(trades, pnl);
  const pointers = buildPointers(pnl, metrics, session);
  return {
    address,
    fetchedTrades: trades.length,
    pnl,
    metrics,
    session,
    pointers,
    trades,
  };
}
