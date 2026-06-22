import type { Metrics } from "@/lib/types";

/**
 * Overtrading meter: compares average trade count on green (profitable) days vs
 * red days. Trading far more on red days is the classic overtrading/tilt tell.
 */
export function OvertradingMeter({ metrics }: { metrics: Metrics }) {
  const green = metrics.avgTradesGreenDay;
  const red = metrics.avgTradesRedDay;
  const ratio = green > 0 ? red / green : red > 0 ? Infinity : 0;
  const overtrading = ratio >= 1.5 && metrics.redDays >= 2;
  const max = Math.max(green, red, 1);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Overtrading meter
      </h3>

      <Bar label="Avg trades · green days" value={green} max={max} color="#34d399" />
      <Bar label="Avg trades · red days" value={red} max={max} color="#fb7185" />

      <div className="mt-3">
        {overtrading ? (
          <div className="rounded-lg border border-amber-900 bg-amber-950/30 p-3 text-amber-200">
            You trade <strong>{ratio === Infinity ? "∞" : `${ratio.toFixed(1)}×`}</strong> more on losing
            days ({red.toFixed(0)} vs {green.toFixed(0)}). That&apos;s overtrading — when it&apos;s not
            working, the fix is fewer trades, not more.
          </div>
        ) : (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/50 p-3 text-neutral-300">
            Trade volume is balanced across green and red days ({metrics.greenDays}🟢 / {metrics.redDays}🔴).
            Keep your activity disciplined regardless of how the day is going.
          </div>
        )}
      </div>
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="font-medium text-neutral-200">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-neutral-800">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
