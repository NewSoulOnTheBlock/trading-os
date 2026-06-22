import { fmtDuration, fmtPct, fmtSol, shortMint } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

/** End-of-day debrief: the latest session's scorecard + one concrete focus. */
export function SessionReport({ analysis }: { analysis: AnalysisResult }) {
  const s = analysis.session;
  const start = Date.parse(`${s.date}T00:00:00Z`) / 1000;
  const end = start + 86400;
  const dayTrips = analysis.pnl.trips.filter((t) => t.closeTs >= start && t.closeTs < end);
  const best = dayTrips.reduce<(typeof dayTrips)[number] | null>(
    (b, t) => (!b || t.pnlSol > b.pnlSol ? t : b),
    null,
  );
  const worst = dayTrips.reduce<(typeof dayTrips)[number] | null>(
    (w, t) => (!w || t.pnlSol < w.pnlSol ? t : w),
    null,
  );

  const focus = buildFocus(s.realizedSol, s.winRate, s.flipRate, s.revengeRate, s.trades);
  const tone = s.realizedSol > 0 ? "text-emerald-400" : s.realizedSol < 0 ? "text-rose-400" : "";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Daily session report
        </h3>
        <span className="text-xs text-neutral-500">{s.date}</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="Realized" value={`${fmtSol(s.realizedSol)} SOL`} tone={tone} />
        <Cell label="Trades" value={`${s.trades}`} />
        <Cell label="Win rate" value={fmtPct(s.winRate)} />
        <Cell label="Round-trips" value={`${s.roundTrips}`} />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {best && best.pnlSol > 0 ? (
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/20 p-2 text-sm">
            <span className="text-xs uppercase text-neutral-500">Best trade</span>
            <div className="text-emerald-300">
              {best.symbol ?? shortMint(best.mint)} · {fmtSol(best.pnlSol)} SOL ·{" "}
              {fmtDuration(best.holdSeconds)} hold
            </div>
          </div>
        ) : null}
        {worst && worst.pnlSol < 0 ? (
          <div className="rounded-lg border border-rose-900 bg-rose-950/20 p-2 text-sm">
            <span className="text-xs uppercase text-neutral-500">Worst trade</span>
            <div className="text-rose-300">
              {worst.symbol ?? shortMint(worst.mint)} · {fmtSol(worst.pnlSol)} SOL ·{" "}
              {fmtDuration(worst.holdSeconds)} hold
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-3 rounded-lg border border-violet-900 bg-violet-950/20 p-3 text-sm text-violet-200">
        <span className="text-xs uppercase tracking-wide text-violet-400">Tomorrow&apos;s focus</span>
        <div className="mt-0.5">{focus}</div>
      </div>
    </div>
  );
}

function buildFocus(
  realized: number,
  winRate: number,
  flipRate: number,
  revengeRate: number,
  trades: number,
): string {
  if (trades === 0) return "No trades closed in the latest session — review your watchlist and wait for A+ setups.";
  if (revengeRate > 0.3)
    return "You chased losing trades. Tomorrow: after any red exit, close the terminal for 15 minutes before re-entering.";
  if (flipRate > 0.5)
    return "Over half your trades were sub-2-minute flips. Tomorrow: require a defined target and invalidation before every entry.";
  if (realized < 0 && winRate < 0.4)
    return "Low win rate dragged P&L negative. Tomorrow: cut position size in half and only take your highest-conviction setup.";
  if (realized < 0)
    return "Losses outweighed wins despite a decent hit rate — your losers are too big. Tomorrow: set a hard stop and respect it.";
  if (winRate > 0.6 && realized > 0)
    return "Strong, disciplined session. Tomorrow: repeat the exact process — don't size up out of euphoria.";
  return "Solid session. Tomorrow: keep doing what worked and journal why each trade met your plan.";
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-0.5 font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
