import type { AnalysisResult } from "@/lib/types";
import { fmtPct, fmtSol, fmtUsd } from "@/lib/format";

function Card({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-rose-400" : "text-neutral-100";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color}`}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-neutral-500">{sub}</div> : null}
    </div>
  );
}

export function StatCards({
  analysis,
  solPriceUsd,
}: {
  analysis: AnalysisResult;
  solPriceUsd?: number;
}) {
  const { pnl } = analysis;
  const pnlTone = pnl.realizedSol > 0 ? "good" : pnl.realizedSol < 0 ? "bad" : "neutral";
  const pf = Number.isFinite(pnl.profitFactor) ? pnl.profitFactor.toFixed(2) : "∞";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      <Card
        label="Realized P&L"
        value={`${fmtSol(pnl.realizedSol)} SOL`}
        sub={fmtUsd(pnl.realizedSol, solPriceUsd) || undefined}
        tone={pnlTone}
      />
      <Card
        label="Win rate"
        value={fmtPct(pnl.winRate)}
        sub={`${pnl.wins}W / ${pnl.losses}L`}
        tone={pnl.winRate >= 0.5 ? "good" : "neutral"}
      />
      <Card
        label="Profit factor"
        value={pf}
        sub="gross win ÷ loss"
        tone={pnl.profitFactor >= 1.2 ? "good" : pnl.profitFactor < 1 ? "bad" : "neutral"}
      />
      <Card label="Round-trips" value={`${pnl.roundTrips}`} sub={`${pnl.totalTrades} swaps`} />
      <Card
        label="Best / worst"
        value={`${pnl.bestTrip ? fmtSol(pnl.bestTrip.pnlSol) : "0"}`}
        sub={pnl.worstTrip ? `worst ${fmtSol(pnl.worstTrip.pnlSol)} SOL` : undefined}
        tone="neutral"
      />
    </div>
  );
}
