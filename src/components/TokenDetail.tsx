"use client";

import { useMemo } from "react";

import { PriceChart } from "@/components/PriceChart";
import { TokenTagSelect } from "@/components/TokenTagSelect";
import { fmtDuration, fmtNum, fmtSol, shortMint } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorage";
import type { AdvicePointer, PnLSummary, Trade } from "@/lib/types";

interface Props {
  mint: string;
  address: string;
  trades: Trade[];
  pnl: PnLSummary;
  onBack: () => void;
}

/** Per-token coaching advice derived from that token's fills + closed trips. */
function tokenAdvice(trades: Trade[], pnl: PnLSummary, mint: string): AdvicePointer[] {
  const out: AdvicePointer[] = [];
  const buys = trades.filter((t) => t.side === "buy");
  const sells = trades.filter((t) => t.side === "sell");
  const trips = pnl.trips.filter((t) => t.mint === mint);
  const token = pnl.perToken.find((t) => t.mint === mint);

  if (token) {
    out.push({
      id: "realized",
      severity: token.realizedSol > 0 ? "good" : token.realizedSol < 0 ? "bad" : "info",
      title: `Realized ${fmtSol(token.realizedSol)} SOL on this token`,
      detail: `${token.roundTrips} closed round-trips, ${token.wins} winners (${
        token.roundTrips ? Math.round((token.wins / token.roundTrips) * 100) : 0
      }% win rate).`,
    });
  }

  // Average entry vs exit price.
  const avg = (xs: Trade[]) =>
    xs.length ? xs.reduce((s, t) => s + t.priceSol, 0) / xs.length : 0;
  const avgIn = avg(buys);
  const avgOut = avg(sells);
  if (avgIn > 0 && avgOut > 0) {
    const edge = (avgOut - avgIn) / avgIn;
    out.push({
      id: "entry-exit",
      severity: edge >= 0 ? "good" : "warn",
      title: `Average exit ${edge >= 0 ? "above" : "below"} average entry (${(edge * 100).toFixed(0)}%)`,
      detail: `Avg entry ${avgIn.toExponential(2)} vs avg exit ${avgOut.toExponential(2)} SOL/token. ${
        edge < 0 ? "You're selling lower than you buy on this name — tighten exits or size down." : "Your fills have positive edge here."
      }`,
    });
  }

  // Hold time.
  if (trips.length) {
    const avgHold = trips.reduce((s, t) => s + t.holdSeconds, 0) / trips.length;
    const flips = trips.filter((t) => t.holdSeconds < 120).length;
    out.push({
      id: "hold",
      severity: flips / trips.length > 0.5 ? "warn" : "info",
      title: `Average hold ${fmtDuration(avgHold)}`,
      detail:
        flips / trips.length > 0.5
          ? `${flips}/${trips.length} round-trips closed in under 2 minutes — heavy flipping on this token.`
          : `Across ${trips.length} closed round-trips.`,
    });
  }

  // Revenge re-buys: a buy within 30 min after a losing exit.
  const losingExits = trips.filter((t) => t.pnlSol < 0).map((t) => t.closeTs);
  let revenge = 0;
  for (const b of buys) {
    if (losingExits.some((ts) => b.timestamp > ts && b.timestamp - ts <= 1800)) revenge++;
  }
  if (revenge > 0) {
    out.push({
      id: "revenge",
      severity: "bad",
      title: `${revenge} likely revenge re-${revenge === 1 ? "buy" : "buys"}`,
      detail: "You re-entered this token within 30 minutes of a losing exit. This is a classic tilt pattern — step away after a red trade.",
    });
  }

  // Still holding?
  if (token && token.openTokens > 1e-9 && token.openCostSol > 0.0005) {
    out.push({
      id: "open",
      severity: "info",
      title: `Open position: ${fmtNum(token.openTokens)} tokens`,
      detail: `Cost basis ${token.openCostSol.toFixed(3)} SOL still at risk. Realized P&L excludes this open bag.`,
    });
  }

  return out;
}

const SEV_STYLE: Record<string, string> = {
  good: "border-emerald-900 bg-emerald-950/30 text-emerald-200",
  warn: "border-amber-900 bg-amber-950/30 text-amber-200",
  bad: "border-rose-900 bg-rose-950/30 text-rose-200",
  info: "border-neutral-800 bg-neutral-900/50 text-neutral-300",
};

export function TokenDetail({ mint, address, trades, pnl, onBack }: Props) {
  const tokenTrades = useMemo(
    () => trades.filter((t) => t.mint === mint).sort((a, b) => a.timestamp - b.timestamp),
    [trades, mint],
  );
  const token = pnl.perToken.find((t) => t.mint === mint);
  const trips = useMemo(
    () => pnl.trips.filter((t) => t.mint === mint).sort((a, b) => b.closeTs - a.closeTs),
    [pnl.trips, mint],
  );
  const advice = useMemo(() => tokenAdvice(tokenTrades, pnl, mint), [tokenTrades, pnl, mint]);
  const label = token?.symbol ?? tokenTrades[0]?.symbol ?? shortMint(mint);

  const [notes, setNotes] = useLocalStorageState<string>(
    `trading-os:notes:${address}:${mint}`,
    "",
  );

  const realized = token?.realizedSol ?? 0;
  const tone = realized > 0 ? "text-emerald-400" : realized < 0 ? "text-rose-400" : "";

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200"
      >
        ← Back to dashboard
      </button>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold">{label}</h2>
            <a
              href={`https://solscan.io/token/${mint}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-neutral-500 hover:text-violet-400"
            >
              {shortMint(mint)} ↗
            </a>
          </div>
          <div className={`text-2xl font-semibold ${tone}`}>{fmtSol(realized)} SOL</div>
        </div>
        <div className="mt-3">
          <TokenTagSelect address={address} mint={mint} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Round-trips" value={`${token?.roundTrips ?? 0}`} />
          <Stat
            label="Win rate"
            value={`${
              token?.roundTrips ? Math.round(((token.wins ?? 0) / token.roundTrips) * 100) : 0
            }%`}
          />
          <Stat label="Buys / Sells" value={`${token?.buys ?? 0} / ${token?.sells ?? 0}`} />
          <Stat
            label="Open cost"
            value={token && token.openCostSol > 0.0005 ? `${token.openCostSol.toFixed(2)} SOL` : "—"}
          />
        </div>
      </div>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Entry / exit chart
        </h3>
        <PriceChart trades={tokenTrades} />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Trade advice & analytics
        </h3>
        <div className="grid gap-2">
          {advice.map((a) => (
            <div key={a.id} className={`rounded-lg border p-3 text-sm ${SEV_STYLE[a.severity]}`}>
              <div className="font-medium">{a.title}</div>
              <div className="mt-0.5 opacity-90">{a.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Closed round-trips
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                <th className="py-1 pr-2">Opened</th>
                <th className="py-1 pr-2">Closed</th>
                <th className="py-1 pr-2 text-right">Hold</th>
                <th className="py-1 pr-2 text-right">Cost</th>
                <th className="py-1 pr-2 text-right">Proceeds</th>
                <th className="py-1 pr-2 text-right">P&L</th>
                <th className="py-1 pr-2 text-right">ROI</th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t, i) => (
                <tr key={i} className="border-t border-neutral-800">
                  <td className="py-1.5 pr-2 text-neutral-400">
                    {new Date(t.openTs * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 pr-2 text-neutral-400">
                    {new Date(t.closeTs * 1000).toLocaleDateString()}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-neutral-400">
                    {t.holdSeconds > 0 ? fmtDuration(t.holdSeconds) : "—"}
                  </td>
                  <td className="py-1.5 pr-2 text-right text-neutral-400">{t.costSol.toFixed(3)}</td>
                  <td className="py-1.5 pr-2 text-right text-neutral-400">
                    {t.proceedsSol.toFixed(3)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right font-medium ${
                      t.pnlSol > 0 ? "text-emerald-400" : t.pnlSol < 0 ? "text-rose-400" : ""
                    }`}
                  >
                    {fmtSol(t.pnlSol)}
                  </td>
                  <td
                    className={`py-1.5 pr-2 text-right ${
                      t.roi > 0 ? "text-emerald-400" : t.roi < 0 ? "text-rose-400" : "text-neutral-400"
                    }`}
                  >
                    {t.costSol > 0 ? `${(t.roi * 100).toFixed(0)}%` : "—"}
                  </td>
                </tr>
              ))}
              {trips.length === 0 ? (
                <tr>
                  <td className="py-2 text-neutral-500" colSpan={7}>
                    No closed round-trips — position may still be open.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
          Notes on {label}
        </h3>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Why did you enter? What was your thesis, your plan, your mistake? Saved locally per token."
          className="h-28 w-full resize-y rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/40 px-3 py-2">
      <div className="text-xs uppercase tracking-wide text-neutral-500">{label}</div>
      <div className="mt-0.5 font-semibold">{value}</div>
    </div>
  );
}
