"use client";

import { useMemo } from "react";

import { tagsKey } from "@/components/TokenTagSelect";
import { fmtSol } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import type { PnLSummary } from "@/lib/types";

interface TagRow {
  tag: string;
  realizedSol: number;
  tokens: number;
  wins: number;
}

/** Realized P&L aggregated by the strategy tag you've assigned to each token. */
export function TagSummary({ pnl, address }: { pnl: PnLSummary; address: string }) {
  const [tags] = useLocalStorageState<Record<string, string>>(tagsKey(address), {});

  const rows = useMemo<TagRow[]>(() => {
    const byTag = new Map<string, TagRow>();
    for (const t of pnl.perToken) {
      const tag = tags[t.mint];
      if (!tag) continue;
      const r = byTag.get(tag) ?? { tag, realizedSol: 0, tokens: 0, wins: 0 };
      r.realizedSol += t.realizedSol;
      r.tokens += 1;
      if (t.realizedSol > 0) r.wins += 1;
      byTag.set(tag, r);
    }
    return [...byTag.values()].sort((a, b) => b.realizedSol - a.realizedSol);
  }, [pnl.perToken, tags]);

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        P&L by strategy
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Tag tokens with a strategy (open a token → Strategy tag) to see which approaches actually make
          you money.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-1 pr-2">Strategy</th>
              <th className="py-1 pr-2 text-right">Tokens</th>
              <th className="py-1 pr-2 text-right">Win rate</th>
              <th className="py-1 pr-2 text-right">Realized</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tag} className="border-t border-neutral-800">
                <td className="py-1.5 pr-2 font-medium">{r.tag}</td>
                <td className="py-1.5 pr-2 text-right text-neutral-400">{r.tokens}</td>
                <td className="py-1.5 pr-2 text-right text-neutral-400">
                  {Math.round((r.wins / r.tokens) * 100)}%
                </td>
                <td
                  className={`py-1.5 pr-2 text-right font-medium ${
                    r.realizedSol > 0 ? "text-emerald-400" : r.realizedSol < 0 ? "text-rose-400" : ""
                  }`}
                >
                  {fmtSol(r.realizedSol)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
