"use client";

import { useMemo } from "react";

import { fmtSol } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import type { AnalysisResult } from "@/lib/types";

interface RiskSettings {
  dailyLossLimit: number; // SOL; 0 = off
  accountSol: number;
  riskPct: number; // % of account risked per trade
  stopPct: number; // stop-loss distance as % of entry
}

const DEFAULTS: RiskSettings = { dailyLossLimit: 0, accountSol: 0, riskPct: 1, stopPct: 20 };

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** Daily loss-limit circuit breaker (#1) + position-size calculator (#2). */
export function RiskManager({ analysis, address }: { analysis: AnalysisResult; address: string }) {
  const [cfg, setCfg] = useLocalStorageState<RiskSettings>(`trading-os:risk:${address}`, DEFAULTS);

  // Today's realized P&L (only if the latest session is actually today).
  const todayRealized = analysis.session.date === todayUtc() ? analysis.session.realizedSol : 0;
  const limitHit =
    cfg.dailyLossLimit > 0 && todayRealized <= -cfg.dailyLossLimit;

  const suggested = useMemo(() => {
    if (cfg.accountSol <= 0 || cfg.stopPct <= 0) return 0;
    // Lose exactly riskPct of the account when the stop is hit.
    return (cfg.accountSol * (cfg.riskPct / 100)) / (cfg.stopPct / 100);
  }, [cfg]);

  const set = (patch: Partial<RiskSettings>) => setCfg({ ...cfg, ...patch });

  return (
    <div className="space-y-3">
      {limitHit ? (
        <div className="animate-pulse rounded-xl border-2 border-rose-600 bg-rose-950/50 p-4 text-center">
          <div className="text-lg font-bold text-rose-300">🛑 STOP TRADING</div>
          <div className="mt-1 text-sm text-rose-200">
            You&apos;re down {fmtSol(todayRealized)} SOL today — past your {cfg.dailyLossLimit} SOL daily
            loss limit. Walk away. The market will be here tomorrow.
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Risk controls
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Daily loss limit
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={cfg.dailyLossLimit || ""}
                onChange={(e) => set({ dailyLossLimit: Math.max(0, Number(e.target.value) || 0) })}
                placeholder="0"
                className="w-24 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-violet-600"
              />
              <span className="text-sm text-neutral-400">SOL</span>
            </div>
            {cfg.dailyLossLimit > 0 ? (
              <div className="mt-2 text-xs text-neutral-500">
                Today:{" "}
                <span className={todayRealized < 0 ? "text-rose-400" : "text-emerald-400"}>
                  {fmtSol(todayRealized)} SOL
                </span>{" "}
                of -{cfg.dailyLossLimit} limit
              </div>
            ) : (
              <div className="mt-2 text-xs text-neutral-600">Set a limit to arm the circuit breaker.</div>
            )}
          </div>

          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Position sizer
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Account" suffix="SOL" value={cfg.accountSol} onChange={(v) => set({ accountSol: v })} />
              <Field label="Risk" suffix="%" value={cfg.riskPct} onChange={(v) => set({ riskPct: v })} />
              <Field label="Stop" suffix="%" value={cfg.stopPct} onChange={(v) => set({ stopPct: v })} />
            </div>
            <div className="mt-2 rounded-lg border border-neutral-800 bg-neutral-950/50 p-2 text-sm">
              Suggested size:{" "}
              <span className="font-semibold text-violet-300">
                {suggested > 0 ? `${suggested.toFixed(3)} SOL` : "—"}
              </span>
              {suggested > 0 ? (
                <span className="text-xs text-neutral-500">
                  {" "}
                  (risks {((cfg.accountSol * cfg.riskPct) / 100).toFixed(3)} SOL at a {cfg.stopPct}% stop)
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase text-neutral-500">
        {label} ({suffix})
      </span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1.5 text-sm outline-none focus:border-violet-600"
      />
    </label>
  );
}
