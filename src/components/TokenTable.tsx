import type { PnLSummary } from "@/lib/types";
import { fmtSol, shortMint } from "@/lib/format";

export function TokenTable({ pnl }: { pnl: PnLSummary }) {
  const rows = pnl.perToken.slice(0, 15);
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Per-token realized P&L
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="py-1 pr-2">Token</th>
              <th className="py-1 pr-2 text-right">Trips</th>
              <th className="py-1 pr-2 text-right">Wins</th>
              <th className="py-1 pr-2 text-right">Realized</th>
              <th className="py-1 pr-2 text-right">Open cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.mint} className="border-t border-neutral-800">
                <td className="py-1.5 pr-2 font-medium">{t.symbol ?? shortMint(t.mint)}</td>
                <td className="py-1.5 pr-2 text-right text-neutral-400">{t.roundTrips}</td>
                <td className="py-1.5 pr-2 text-right text-neutral-400">{t.wins}</td>
                <td
                  className={`py-1.5 pr-2 text-right font-medium ${
                    t.realizedSol > 0 ? "text-emerald-400" : t.realizedSol < 0 ? "text-rose-400" : ""
                  }`}
                >
                  {fmtSol(t.realizedSol)}
                </td>
                <td className="py-1.5 pr-2 text-right text-neutral-400">
                  {t.openCostSol > 0.0005 ? t.openCostSol.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="py-2 text-neutral-500" colSpan={5}>
                  No closed positions yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
