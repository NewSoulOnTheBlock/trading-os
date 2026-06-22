"use client";

import { useLocalStorageState } from "@/lib/useLocalStorage";

export const STRATEGIES = [
  "Breakout",
  "Dip buy",
  "News / catalyst",
  "Trend follow",
  "Scalp",
  "Tip / call",
  "FOMO",
  "Other",
];

export function tagsKey(address: string) {
  return `trading-os:tags:${address}`;
}

/** Tag a single token with a strategy label (shared localStorage map). */
export function TokenTagSelect({ address, mint }: { address: string; mint: string }) {
  const [tags, setTags] = useLocalStorageState<Record<string, string>>(tagsKey(address), {});
  const current = tags[mint] ?? "";

  const setTag = (value: string) => {
    const next = { ...tags };
    if (value) next[mint] = value;
    else delete next[mint];
    setTags(next);
  };

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-neutral-400">Strategy tag:</span>
      <select
        value={current}
        onChange={(e) => setTag(e.target.value)}
        className="rounded-lg border border-neutral-700 bg-neutral-950 px-2 py-1 text-sm outline-none focus:border-violet-600"
      >
        <option value="">— untagged —</option>
        {STRATEGIES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </label>
  );
}
