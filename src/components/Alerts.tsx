"use client";

import { useLocalStorageState } from "@/lib/useLocalStorage";
import type { AnalysisResult } from "@/lib/types";

interface Thresholds {
  maxTradesPerDay: number;
  maxDailyLossSol: number;
  maxPositionSol: number;
  maxRevengeRate: number; // 0..1
}

const DEFAULTS: Thresholds = {
  maxTradesPerDay: 30,
  maxDailyLossSol: 1,
  maxPositionSol: 5,
  maxRevengeRate: 0.3,
};

const KEY = "trading-os:alerts";

interface FiredAlert {
  id: string;
  message: string;
}

function evaluate(t: Thresholds, a: AnalysisResult): FiredAlert[] {
  const fired: FiredAlert[] = [];
  if (a.session.trades > t.maxTradesPerDay) {
    fired.push({
      id: "trades",
      message: `Daily trade cap exceeded: ${a.session.trades} > ${t.maxTradesPerDay}. Stop adding new positions.`,
    });
  }
  if (a.session.realizedSol < -t.maxDailyLossSol) {
    fired.push({
      id: "loss",
      message: `Daily loss limit hit: ${a.session.realizedSol.toFixed(2)} SOL (limit -${t.maxDailyLossSol}). Walk away.`,
    });
  }
  if (a.metrics.maxPositionSizeSol > t.maxPositionSol) {
    fired.push({
      id: "size",
      message: `Position too large: ${a.metrics.maxPositionSizeSol.toFixed(2)} SOL > ${t.maxPositionSol}. Reduce unit size.`,
    });
  }
  if (a.metrics.revengeRate > t.maxRevengeRate) {
    fired.push({
      id: "revenge",
      message: `Revenge-trading above limit: ${(a.metrics.revengeRate * 100).toFixed(0)}% > ${(
        t.maxRevengeRate * 100
      ).toFixed(0)}%.`,
    });
  }
  return fired;
}

function NumField({
  label,
  value,
  step,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="text-neutral-400">{label}</span>
      <input
        type="number"
        value={value}
        step={step}
        min={0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-right outline-none focus:border-violet-600"
      />
    </label>
  );
}

export function Alerts({ analysis }: { analysis: AnalysisResult }) {
  const [stored, setStored] = useLocalStorageState<Thresholds>(KEY, DEFAULTS);
  const t: Thresholds = { ...DEFAULTS, ...stored };

  function update(patch: Partial<Thresholds>) {
    setStored({ ...t, ...patch });
  }

  const fired = evaluate(t, analysis);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Risk alerts
      </h3>

      <div className="space-y-2">
        <NumField
          label="Max trades / day"
          value={t.maxTradesPerDay}
          step={1}
          onChange={(v) => update({ maxTradesPerDay: v })}
        />
        <NumField
          label="Max daily loss (SOL)"
          value={t.maxDailyLossSol}
          step={0.1}
          onChange={(v) => update({ maxDailyLossSol: v })}
        />
        <NumField
          label="Max position (SOL)"
          value={t.maxPositionSol}
          step={0.1}
          onChange={(v) => update({ maxPositionSol: v })}
        />
        <NumField
          label="Max revenge rate (%)"
          value={Math.round(t.maxRevengeRate * 100)}
          step={5}
          onChange={(v) => update({ maxRevengeRate: v / 100 })}
        />
      </div>

      <div className="mt-3 space-y-2">
        {fired.length === 0 ? (
          <div className="rounded-lg border border-emerald-900 bg-emerald-950/40 p-2 text-sm text-emerald-300">
            ✓ All clear — no risk limits breached.
          </div>
        ) : (
          fired.map((f) => (
            <div
              key={f.id}
              className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-sm text-rose-200"
            >
              ⚠ {f.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
