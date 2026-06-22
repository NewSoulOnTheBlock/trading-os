import type { AdvicePointer, Metrics, PnLSummary, SessionStats } from "@/lib/types";

function fmtSol(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(3)} SOL`;
}
function pct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

/**
 * Deterministic, explainable trading-coach heuristics. These run on every
 * analysis and form the backbone of the daily pointers (the LLM layer only
 * summarizes / prioritizes these).
 */
export function buildPointers(
  pnl: PnLSummary,
  metrics: Metrics,
  session: SessionStats,
): AdvicePointer[] {
  const out: AdvicePointer[] = [];

  // ---- Overall edge ----
  if (pnl.roundTrips >= 5) {
    if (pnl.profitFactor >= 1.5) {
      out.push({
        id: "profit-factor-strong",
        severity: "good",
        title: "Your edge is real",
        detail: `Profit factor ${pnl.profitFactor.toFixed(2)} (gross win ${fmtSol(
          pnl.grossProfitSol,
        )} vs loss ${fmtSol(-pnl.grossLossSol)}). Keep doing more of what works — size up winners, not losers.`,
      });
    } else if (pnl.profitFactor < 1) {
      out.push({
        id: "profit-factor-weak",
        severity: "bad",
        title: "Losing more than you win",
        detail: `Profit factor ${pnl.profitFactor.toFixed(2)} — your losses outweigh your wins. Tighten entries and cut losers faster before adding size.`,
      });
    }
  }

  // ---- Win rate vs payoff ----
  if (pnl.roundTrips >= 10 && pnl.winRate < 0.35 && pnl.profitFactor < 1.2) {
    out.push({
      id: "low-winrate",
      severity: "warn",
      title: "Low hit-rate without the payoff",
      detail: `Win rate ${pct(pnl.winRate)}. A low win rate is fine only if winners are much bigger than losers — yours aren't. Either be more selective or let winners run longer.`,
    });
  }

  // ---- Risk: outsized loss ----
  if (pnl.worstTrip && pnl.grossLossSol > 0) {
    const share = -pnl.worstTrip.pnlSol / pnl.grossLossSol;
    if (share > 0.4 && -pnl.worstTrip.pnlSol > 0.05) {
      out.push({
        id: "concentrated-loss",
        severity: "bad",
        title: "One trade is wrecking your book",
        detail: `Your worst trade (${
          pnl.worstTrip.symbol ?? pnl.worstTrip.mint.slice(0, 4)
        }) lost ${fmtSol(pnl.worstTrip.pnlSol)} — ${pct(
          share,
        )} of all your losses. Set a hard stop per position; no single trade should be able to do this.`,
      });
    }
  }

  // ---- Position sizing consistency ----
  if (metrics.avgPositionSizeSol > 0 && metrics.maxPositionSizeSol > metrics.avgPositionSizeSol * 4) {
    out.push({
      id: "sizing-inconsistent",
      severity: "warn",
      title: "Inconsistent position sizing",
      detail: `Biggest buy (${metrics.maxPositionSizeSol.toFixed(
        2,
      )} SOL) was ${(metrics.maxPositionSizeSol / metrics.avgPositionSizeSol).toFixed(
        1,
      )}x your average (${metrics.avgPositionSizeSol.toFixed(
        2,
      )} SOL). Random sizing turns a few bad calls into account killers. Fix a unit size.`,
    });
  }

  // ---- Overtrading ----
  if (metrics.maxTradesInDay >= 30) {
    out.push({
      id: "overtrading",
      severity: "warn",
      title: "Signs of overtrading",
      detail: `Up to ${metrics.maxTradesInDay} trades in a single day. High volume usually feeds fees and tilt, not profit. Set a daily trade cap.`,
    });
  }

  // ---- Flipping too fast ----
  if (pnl.roundTrips >= 8 && metrics.flipRate > 0.5) {
    out.push({
      id: "flipping",
      severity: "warn",
      title: "Flipping on impulse",
      detail: `${pct(
        metrics.flipRate,
      )} of your exits happen within 2 minutes. Sub-2-minute flips are usually reactions, not plans. Define a target/stop before you enter.`,
    });
  }

  // ---- Revenge trading ----
  if (metrics.revengeRate > 0.3) {
    out.push({
      id: "revenge",
      severity: "bad",
      title: "Revenge trading detected",
      detail: `You re-bought the same token within 30 min of a loss ${pct(
        metrics.revengeRate,
      )} of the time. Chasing a loss is the fastest way to compound it. After a red trade, step away for 15 minutes.`,
    });
  }

  // ---- Big-loss tail ----
  if (pnl.roundTrips >= 8 && metrics.bigLossRate > 0.2) {
    out.push({
      id: "no-stops",
      severity: "bad",
      title: "You're not using stops",
      detail: `${pct(
        metrics.bigLossRate,
      )} of round-trips lost more than half their cost. That pattern means no stop discipline. Decide your max loss (e.g. -25%) before entering.`,
    });
  }

  // ---- Today's session ----
  if (session.trades > 0) {
    if (session.realizedSol < 0 && session.trades >= 8) {
      out.push({
        id: "session-red",
        severity: "bad",
        title: `Today is red — consider stopping`,
        detail: `Session P&L ${fmtSol(session.realizedSol)} across ${
          session.trades
        } trades. Red days tend to get worse when you keep clicking. Walk away and review.`,
      });
    } else if (session.realizedSol > 0 && session.winRate >= 0.5) {
      out.push({
        id: "session-green",
        severity: "good",
        title: "Solid session — lock it in",
        detail: `Session P&L ${fmtSol(session.realizedSol)} at ${pct(
          session.winRate,
        )} win rate. Protect green days: bank profit and resist the "one more trade" urge.`,
      });
    }
  }

  // ---- Open positions / bag-holding ----
  const heavyBags = pnl.perToken
    .filter((t) => t.openCostSol > 0.05 && t.openTokens > 0)
    .sort((a, b) => b.openCostSol - a.openCostSol);
  if (heavyBags.length > 0) {
    const top = heavyBags[0];
    out.push({
      id: "open-bags",
      severity: "info",
      title: "Open positions to review",
      detail: `You still hold ${heavyBags.length} position(s) with cost basis on the book — largest is ${
        top.symbol ?? top.mint.slice(0, 4)
      } at ${top.openCostSol.toFixed(
        2,
      )} SOL. Have an exit plan for each; unrealized losses become realized eventually.`,
    });
  }

  if (out.length === 0) {
    out.push({
      id: "all-clear",
      severity: "info",
      title: "Not enough signal yet",
      detail:
        "No major red flags in this history. Keep a consistent unit size, predefined stops, and a daily trade cap, and re-check after more sessions.",
    });
  }

  const rank: Record<AdvicePointer["severity"], number> = { bad: 0, warn: 1, good: 2, info: 3 };
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
