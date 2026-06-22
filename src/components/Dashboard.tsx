"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

import { Alerts } from "@/components/Alerts";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { EfficiencyPanel } from "@/components/EfficiencyPanel";
import { EquityCurve } from "@/components/EquityCurve";
import { Journal } from "@/components/Journal";
import { LlmBriefing } from "@/components/LlmBriefing";
import { MetricsPanel } from "@/components/MetricsPanel";
import { OvertradingMeter } from "@/components/OvertradingMeter";
import { Pointers } from "@/components/Pointers";
import { PreTradeChecklist } from "@/components/PreTradeChecklist";
import { RiskManager } from "@/components/RiskManager";
import { SessionReport } from "@/components/SessionReport";
import { StatCards } from "@/components/StatCards";
import { StreakTracker } from "@/components/StreakTracker";
import { TagSummary } from "@/components/TagSummary";
import { TokenDetail } from "@/components/TokenDetail";
import { TokenTable } from "@/components/TokenTable";
import { Watchlist } from "@/components/Watchlist";
import { fmtSol } from "@/lib/format";
import type { AnalysisResult } from "@/lib/types";

const WalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((m) => m.WalletMultiButton),
  { ssr: false },
);

interface TradesResponse extends AnalysisResult {
  solPriceUsd?: number;
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function Dashboard() {
  const { publicKey } = useWallet();
  const [manual, setManual] = useState("");
  const [data, setData] = useState<TradesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMint, setSelectedMint] = useState<string | null>(null);
  const lastAnalyzed = useRef<string | null>(null);

  const walletAddress = publicKey?.toBase58();

  const analyze = useCallback(async (address: string) => {
    if (!BASE58.test(address)) {
      setError("Enter a valid Solana wallet address.");
      return;
    }
    setLoading(true);
    setError(null);
    setSelectedMint(null);
    lastAnalyzed.current = address;
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to analyze wallet.");
        setData(null);
      } else {
        setData(json as TradesResponse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-analyze on wallet connect.
  useEffect(() => {
    if (walletAddress && lastAnalyzed.current !== walletAddress) {
      setManual(walletAddress);
      void analyze(walletAddress);
    }
  }, [walletAddress, analyze]);

  const address = data?.address ?? walletAddress ?? manual;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Trading <span className="text-violet-400">OS</span>
          </h1>
          <p className="text-sm text-neutral-400">
            Connect a wallet, analyze its trades, get a daily coaching briefing.
          </p>
        </div>
        <WalletMultiButton />
      </header>

      <div className="mb-6 flex flex-col gap-2 sm:flex-row">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") void analyze(manual);
          }}
          placeholder="…or paste any Solana wallet address to analyze (read-only)"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button
          onClick={() => void analyze(manual)}
          disabled={loading}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : "Analyze"}
        </button>
      </div>

      {error ? (
        <div className="mb-6 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {!data && !loading ? (
        <EmptyState />
      ) : null}

      {data && selectedMint ? (
        <TokenDetail
          mint={selectedMint}
          address={address}
          trades={data.trades}
          pnl={data.pnl}
          onBack={() => setSelectedMint(null)}
        />
      ) : data ? (
        <div className="space-y-6">
          <SessionBanner data={data} />

          {data.note ? (
            <div className="rounded-lg border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-300">
              {data.note}
            </div>
          ) : null}

          <StatCards analysis={data} solPriceUsd={data.solPriceUsd} />

          <RiskManager analysis={data} address={address} />

          <SessionReport analysis={data} />

          <section>
            <h2 className="mb-2 text-lg font-semibold">Daily pointers</h2>
            <Pointers pointers={data.pointers} />
          </section>

          <LlmBriefing analysis={data} />

          <EquityCurve metrics={data.metrics} />

          <div className="grid gap-6 lg:grid-cols-2">
            <ActivityHeatmap metrics={data.metrics} />
            <StreakTracker metrics={data.metrics} address={address} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <OvertradingMeter metrics={data.metrics} />
            <EfficiencyPanel metrics={data.metrics} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <MetricsPanel metrics={data.metrics} />
            <Alerts analysis={data} />
          </div>

          <TokenTable pnl={data.pnl} onSelect={setSelectedMint} />

          <TagSummary pnl={data.pnl} address={address} />

          <div className="grid gap-6 lg:grid-cols-2">
            <PreTradeChecklist address={address} />
            <Watchlist address={address} />
          </div>

          {address ? <Journal address={address} /> : null}
        </div>
      ) : null}

      <footer className="mt-10 border-t border-neutral-900 pt-4 text-xs text-neutral-600">
        P&L is measured in SOL from realized swap flows (FIFO). Not financial advice.
      </footer>
    </main>
  );
}

function SessionBanner({ data }: { data: TradesResponse }) {
  const s = data.session;
  const tone = s.realizedSol > 0 ? "text-emerald-400" : s.realizedSol < 0 ? "text-rose-400" : "";
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <div className="text-xs uppercase tracking-wide text-neutral-500">
        Latest session · {s.date}
      </div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-6 gap-y-1">
        <span className={`text-xl font-semibold ${tone}`}>{fmtSol(s.realizedSol)} SOL</span>
        <span className="text-sm text-neutral-400">{s.trades} trades</span>
        <span className="text-sm text-neutral-400">
          {(s.winRate * 100).toFixed(0)}% win · {s.roundTrips} round-trips
        </span>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-neutral-800 p-10 text-center">
      <p className="text-neutral-300">Connect a wallet or paste an address to begin.</p>
      <p className="mt-1 text-sm text-neutral-500">
        Trading OS reads your on-chain DEX swaps, computes realized P&L and behavioral metrics, and
        coaches you toward consistency.
      </p>
    </div>
  );
}
