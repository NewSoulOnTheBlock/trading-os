"use client";

import { useMemo, useState } from "react";

import { fmtSol } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import type { Metrics } from "@/lib/types";

/** Green-day streaks plus a user-set weekly realized-SOL goal. */
export function StreakTracker({ metrics, address }: { metrics: Metrics; address: string }) {
  const [goal, setGoal] = useLocalStorageState<number>(`trading-os:goal:${address}`, 0);
  const [draft, setDraft] = useState<string>("");

  const weekSol = useMemo(() => {
    if (metrics.dailyPnl.length === 0) return 0;
    // Anchor "last 7 days" to the most recent active trading day (deterministic).
    const latest = metrics.dailyPnl[metrics.dailyPnl.length - 1].date;
    const cutoff = Date.parse(`${latest}T00:00:00Z`) / 1000 - 6 * 86400;
    return metrics.dailyPnl
      .filter((d) => Date.parse(`${d.date}T00:00:00Z`) / 1000 >= cutoff)
      .reduce((s, d) => s + d.realizedSol, 0);
  }, [metrics.dailyPnl]);

  const pct = goal > 0 ? Math.max(0, Math.min(100, (weekSol / goal) * 100)) : 0;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Streaks & weekly goal
      </h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Cell label="Green streak" value={`${metrics.currentGreenStreak}🔥`} />
        <Cell label="Longest" value={`${metrics.longestGreenStreak}`} />
        <Cell label="Green days" value={`${metrics.greenDays}`} tone="text-emerald-400" />
        <Cell label="Red days" value={`${metrics.redDays}`} tone="text-rose-400" />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-neutral-400">
          <span>Last 7 days realized</span>
          <span className={weekSol >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmtSol(weekSol)} SOL</span>
        </div>
        {goal > 0 ? (
          <>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-800">
              <div
                className="h-full rounded bg-violet-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
              <span>
                {pct.toFixed(0)}% of {goal} SOL weekly goal
              </span>
              <button onClick={() => setGoal(0)} className="hover:text-rose-400">
                clear goal
              </button>
            </div>
          </>
        ) : (
          <div className="mt-1 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              inputMode="decimal"
              placeholder="Set a weekly SOL goal (e.g. 5)"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-violet-600"
            />
            <button
              onClick={() => {
                const v = parseFloat(draft);
                if (Number.isFinite(v) && v > 0) setGoal(v);
              }}
              className="rounded-lg bg-violet-700 px-3 text-sm font-medium text-white hover:bg-violet-600"
            >
              Set
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className={`mt-0.5 font-semibold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
