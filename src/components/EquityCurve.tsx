import type { Metrics } from "@/lib/types";
import { fmtSol } from "@/lib/format";

/** Cumulative realized SOL over time, with the max-drawdown segment shaded. */
export function EquityCurve({ metrics }: { metrics: Metrics }) {
  const pts = metrics.equityCurve;
  const W = 720;
  const H = 200;
  const padL = 8;
  const padR = 8;
  const padT = 12;
  const padB = 12;

  if (pts.length < 2) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <Header />
        <p className="text-sm text-neutral-500">Not enough closed trades to plot an equity curve.</p>
      </div>
    );
  }

  const xs = pts.map((p) => p.ts);
  const ys = pts.map((p) => p.cum);
  const tMin = xs[0];
  const tMax = xs[xs.length - 1];
  const tSpan = Math.max(1, tMax - tMin);
  const yMin = Math.min(0, ...ys);
  const yMax = Math.max(0, ...ys);
  const ySpan = Math.max(yMax - yMin, 1e-9);
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const sx = (t: number) => padL + ((t - tMin) / tSpan) * innerW;
  const sy = (v: number) => padT + (1 - (v - yMin) / ySpan) * innerH;

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.ts).toFixed(1)},${sy(p.cum).toFixed(1)}`).join(" ");
  const zeroY = sy(0);

  // Locate the max-drawdown segment (running peak -> deepest trough) for shading.
  let peak = -Infinity;
  let peakTs = tMin;
  let best = { dd: 0, fromTs: tMin, toTs: tMin };
  for (const p of pts) {
    if (p.cum > peak) {
      peak = p.cum;
      peakTs = p.ts;
    }
    const dd = peak - p.cum;
    if (dd > best.dd) best = { dd, fromTs: peakTs, toTs: p.ts };
  }

  const last = ys[ys.length - 1];
  const tone = last > 0 ? "#34d399" : last < 0 ? "#fb7185" : "#a1a1aa";

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <Header />
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {best.dd > 1e-9 ? (
          <rect
            x={sx(best.fromTs)}
            y={padT}
            width={Math.max(1, sx(best.toTs) - sx(best.fromTs))}
            height={innerH}
            fill="#fb718522"
          />
        ) : null}
        <line x1={padL} y1={zeroY} x2={W - padR} y2={zeroY} stroke="#3f3f46" strokeDasharray="3 3" strokeWidth={1} />
        <path d={line} fill="none" stroke={tone} strokeWidth={1.5} />
      </svg>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="text-neutral-500">Net realized </span>
          <span className={last >= 0 ? "text-emerald-400" : "text-rose-400"}>{fmtSol(last)} SOL</span>
        </span>
        <span>
          <span className="text-neutral-500">Max drawdown </span>
          <span className="text-rose-400">
            -{metrics.maxDrawdownSol.toFixed(2)} SOL ({(metrics.maxDrawdownPct * 100).toFixed(0)}%)
          </span>
        </span>
      </div>
    </div>
  );
}

function Header() {
  return (
    <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
      Equity curve & drawdown
    </h3>
  );
}
