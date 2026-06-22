import type { Metrics } from "@/lib/types";
import { fmtSol } from "@/lib/format";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function tint(pnl: number, max: number): string {
  if (max < 1e-9 || Math.abs(pnl) < 1e-9) return "#27272a";
  const a = Math.min(1, Math.abs(pnl) / max);
  const alpha = (0.15 + a * 0.85).toFixed(2);
  return pnl > 0 ? `rgba(52,211,153,${alpha})` : `rgba(251,113,133,${alpha})`;
}

/**
 * When-you-make-money heatmap: realized P&L by UTC hour-of-day and by
 * day-of-week. Green = net profit in that bucket, red = net loss; intensity
 * scales with magnitude.
 */
export function ActivityHeatmap({ metrics }: { metrics: Metrics }) {
  const hourMax = Math.max(1e-9, ...metrics.hourPnl.map((v) => Math.abs(v)));
  const dowMax = Math.max(1e-9, ...metrics.dowPnl.map((v) => Math.abs(v)));

  const bestHour = metrics.hourPnl.indexOf(Math.max(...metrics.hourPnl));
  const worstHour = metrics.hourPnl.indexOf(Math.min(...metrics.hourPnl));
  const bestDow = metrics.dowPnl.indexOf(Math.max(...metrics.dowPnl));
  const worstDow = metrics.dowPnl.indexOf(Math.min(...metrics.dowPnl));

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        When you make money
      </h3>

      <div className="mb-1 text-xs text-neutral-500">By hour (UTC)</div>
      <div className="grid grid-cols-12 gap-1">
        {metrics.hourPnl.map((v, h) => (
          <div
            key={h}
            title={`${String(h).padStart(2, "0")}:00 — ${fmtSol(v)} SOL · ${metrics.hourHistogram[h]} trades`}
            className="flex aspect-square items-center justify-center rounded text-[9px] text-neutral-300"
            style={{ background: tint(v, hourMax) }}
          >
            {h}
          </div>
        ))}
      </div>

      <div className="mb-1 mt-4 text-xs text-neutral-500">By day of week (UTC)</div>
      <div className="grid grid-cols-7 gap-1">
        {metrics.dowPnl.map((v, d) => (
          <div
            key={d}
            title={`${DOW[d]} — ${fmtSol(v)} SOL · ${metrics.dowHistogram[d]} trades`}
            className="flex flex-col items-center justify-center rounded py-2 text-[10px] text-neutral-300"
            style={{ background: tint(v, dowMax) }}
          >
            <span>{DOW[d]}</span>
            <span className="font-medium">{fmtSol(v, 1)}</span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-neutral-500">
        Best: <span className="text-emerald-400">{DOW[bestDow]}</span> &{" "}
        <span className="text-emerald-400">{String(bestHour).padStart(2, "0")}:00 UTC</span> · Worst:{" "}
        <span className="text-rose-400">{DOW[worstDow]}</span> &{" "}
        <span className="text-rose-400">{String(worstHour).padStart(2, "0")}:00 UTC</span>
      </p>
    </div>
  );
}
