"use client";

import { useState } from "react";
import type { AnalysisResult } from "@/lib/types";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; text: string }
  | { kind: "disabled"; note: string }
  | { kind: "error"; message: string };

export function LlmBriefing({ analysis }: { analysis: AnalysisResult }) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function generate() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/advice", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(analysis),
      });
      const data = await res.json();
      if (data.disabled) {
        setState({ kind: "disabled", note: data.note });
      } else if (data.advice) {
        setState({ kind: "ok", text: data.advice });
      } else {
        setState({ kind: "error", message: data.error ?? "Unknown error" });
      }
    } catch (err) {
      setState({ kind: "error", message: err instanceof Error ? err.message : "Request failed" });
    }
  }

  return (
    <div className="rounded-xl border border-violet-900 bg-violet-950/30 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-violet-300">
          AI session briefing
        </h3>
        <button
          onClick={generate}
          disabled={state.kind === "loading"}
          className="rounded-lg bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
        >
          {state.kind === "loading" ? "Thinking…" : state.kind === "ok" ? "Regenerate" : "Generate"}
        </button>
      </div>

      {state.kind === "idle" ? (
        <p className="mt-2 text-sm text-neutral-400">
          Generate a personalized, plain-English briefing for today&apos;s session based on your
          stats.
        </p>
      ) : null}
      {state.kind === "ok" ? (
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-neutral-100">
          {state.text}
        </p>
      ) : null}
      {state.kind === "disabled" ? (
        <p className="mt-2 text-sm text-amber-400">{state.note}</p>
      ) : null}
      {state.kind === "error" ? (
        <p className="mt-2 text-sm text-rose-400">{state.message}</p>
      ) : null}
    </div>
  );
}
