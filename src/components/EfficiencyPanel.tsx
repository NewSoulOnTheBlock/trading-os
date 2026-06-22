import type { Metrics } from "@/lib/types";

/**
 * Execution-quality gauges: how close your buys land to each token's low and
 * your sells to its high, measured against that token's own observed price band.
 */
export function EfficiencyPanel({ metrics }: { metrics: Metrics }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Execution quality
      </h3>
      <Gauge label="Entry efficiency" hint="buying near the low" value={metrics.avgEntryEfficiency} />
      <Gauge label="Exit efficiency" hint="selling near the high" value={metrics.avgExitEfficiency} />
      <p className="mt-2 text-xs text-neutral-500">
        Scored against each token&apos;s own price range across your fills. 50% ≈ average fill; higher is
        better timing.
      </p>
    </div>
  );
}

function Gauge({ label, hint, value }: { label: string; hint: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.6 ? "#34d399" : value >= 0.4 ? "#fbbf24" : "#fb7185";
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-neutral-300">
          {label} <span className="text-xs text-neutral-500">({hint})</span>
        </span>
        <span className="font-semibold" style={{ color }}>
          {pct}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-neutral-800">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
