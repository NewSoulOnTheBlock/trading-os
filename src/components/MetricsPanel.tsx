import type { Metrics } from "@/lib/types";
import { fmtDuration, fmtPct } from "@/lib/format";

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-neutral-800 py-2 text-sm last:border-0">
      <span className="text-neutral-400">{label}</span>
      <span className={warn ? "font-semibold text-amber-400" : "font-medium"}>{value}</span>
    </div>
  );
}

export function MetricsPanel({ metrics }: { metrics: Metrics }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Behavior
      </h3>
      <Row label="Active days" value={`${metrics.activeDays}`} />
      <Row
        label="Trades / active day"
        value={metrics.tradesPerActiveDay.toFixed(1)}
        warn={metrics.tradesPerActiveDay > 20}
      />
      <Row label="Busiest day" value={`${metrics.maxTradesInDay} trades`} warn={metrics.maxTradesInDay >= 30} />
      <Row label="Avg position" value={`${metrics.avgPositionSizeSol.toFixed(2)} SOL`} />
      <Row
        label="Max position"
        value={`${metrics.maxPositionSizeSol.toFixed(2)} SOL`}
        warn={metrics.maxPositionSizeSol > metrics.avgPositionSizeSol * 4}
      />
      <Row label="Avg hold" value={fmtDuration(metrics.avgHoldSeconds)} />
      <Row label="Median hold" value={fmtDuration(metrics.medianHoldSeconds)} />
      <Row label="Sub-2min flips" value={fmtPct(metrics.flipRate)} warn={metrics.flipRate > 0.5} />
      <Row label="Revenge trades" value={fmtPct(metrics.revengeRate)} warn={metrics.revengeRate > 0.3} />
      <Row label=">50% losses" value={fmtPct(metrics.bigLossRate)} warn={metrics.bigLossRate > 0.2} />
    </div>
  );
}
