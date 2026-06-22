"use client";

import { useMemo, useState } from "react";

import { useLocalStorageState } from "@/lib/useLocalStorage";

const ITEMS = [
  { id: "thesis", text: "I have a clear thesis / catalyst for this entry" },
  { id: "invalidation", text: "I know my invalidation (stop) before I buy" },
  { id: "size", text: "Size is within my plan — not oversized / FOMO" },
  { id: "notrevenge", text: "This is a setup, not revenge for a prior loss" },
];

interface Tally {
  date: string;
  count: number;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** A forced pre-trade ritual: all boxes must be checked before you're "cleared". */
export function PreTradeChecklist({ address }: { address: string }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [tally, setTally] = useLocalStorageState<Tally>(`trading-os:checklist:${address}`, {
    date: todayUtc(),
    count: 0,
  });

  const allChecked = ITEMS.every((i) => checked[i.id]);
  const todayCount = tally.date === todayUtc() ? tally.count : 0;

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const logEntry = () => {
    setTally({ date: todayUtc(), count: todayCount + 1 });
    setChecked({});
  };

  const progress = useMemo(() => ITEMS.filter((i) => checked[i.id]).length, [checked]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Pre-trade checklist
        </h3>
        <span className="text-xs text-neutral-500">{todayCount} cleared today</span>
      </div>

      <ul className="space-y-2">
        {ITEMS.map((i) => (
          <li key={i.id}>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!checked[i.id]}
                onChange={() => toggle(i.id)}
                className="mt-0.5 h-4 w-4 accent-violet-600"
              />
              <span className={checked[i.id] ? "text-neutral-300" : "text-neutral-400"}>{i.text}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={logEntry}
          disabled={!allChecked}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            allChecked
              ? "bg-emerald-700 text-white hover:bg-emerald-600"
              : "cursor-not-allowed bg-neutral-800 text-neutral-500"
          }`}
        >
          {allChecked ? "✓ Cleared — log entry" : `Check all ${progress}/${ITEMS.length}`}
        </button>
        {progress > 0 && !allChecked ? (
          <button onClick={() => setChecked({})} className="text-xs text-neutral-500 hover:text-neutral-300">
            reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
