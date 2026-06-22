import type { AnalysisResult } from "@/lib/types";

export const runtime = "nodejs";

function resolveProvider() {
  const openrouter = process.env.OPENROUTER_API_KEY;
  if (openrouter) {
    return {
      key: openrouter,
      url: "https://openrouter.ai/api/v1/chat/completions",
      model: process.env.LLM_MODEL ?? "openai/gpt-4o-mini",
    };
  }
  const openai = process.env.OPENAI_API_KEY;
  if (openai) {
    return {
      key: openai,
      url: "https://api.openai.com/v1/chat/completions",
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    };
  }
  return null;
}

function summarize(a: AnalysisResult): string {
  const p = a.pnl;
  const m = a.metrics;
  const s = a.session;
  const lines = [
    `Wallet ${a.address} — ${a.fetchedTrades} swaps, ${p.roundTrips} closed round-trips.`,
    `Realized P&L: ${p.realizedSol.toFixed(3)} SOL. Win rate ${(p.winRate * 100).toFixed(
      0,
    )}%. Profit factor ${Number.isFinite(p.profitFactor) ? p.profitFactor.toFixed(2) : "inf"}.`,
    `Gross profit ${p.grossProfitSol.toFixed(3)} / gross loss ${p.grossLossSol.toFixed(3)} SOL.`,
    `Avg position ${m.avgPositionSizeSol.toFixed(2)} SOL, max ${m.maxPositionSizeSol.toFixed(2)} SOL.`,
    `Avg hold ${(m.avgHoldSeconds / 60).toFixed(0)} min. Flip rate ${(m.flipRate * 100).toFixed(
      0,
    )}%. Revenge-trade rate ${(m.revengeRate * 100).toFixed(0)}%. Big-loss rate ${(
      m.bigLossRate * 100
    ).toFixed(0)}%. Busiest day ${m.maxTradesInDay} trades.`,
    `Today's session (${s.date}): ${s.trades} trades, ${s.realizedSol.toFixed(
      3,
    )} SOL, win rate ${(s.winRate * 100).toFixed(0)}%.`,
    `Rule-engine flags: ${a.pointers.map((x) => `${x.severity}:${x.title}`).join("; ")}.`,
  ];
  return lines.join("\n");
}

const SYSTEM = `You are a disciplined trading coach for a Solana memecoin trader.
Given computed statistics and rule-engine flags, write a SHORT daily session briefing.
Rules:
- Max 130 words. Direct, specific, no fluff or hedging.
- Lead with the single most important thing to fix or keep doing today.
- Reference the actual numbers provided. Do NOT invent data.
- End with one concrete rule to follow this session (e.g. a max loss, trade cap, or unit size).
- You are a coach, not a financial advisor; never tell them what specific token to buy.`;

export async function POST(request: Request) {
  let analysis: AnalysisResult;
  try {
    analysis = (await request.json()) as AnalysisResult;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!analysis?.pnl || !analysis?.metrics) {
    return Response.json({ error: "Missing analysis payload" }, { status: 400 });
  }

  const provider = resolveProvider();
  if (!provider) {
    return Response.json({
      disabled: true,
      note: "LLM advice disabled — set OPENROUTER_API_KEY or OPENAI_API_KEY in .env.local.",
    });
  }

  try {
    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${provider.key}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.4,
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: summarize(analysis) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return Response.json(
        { error: `LLM ${res.status}: ${body.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const advice = data.choices?.[0]?.message?.content?.trim();
    if (!advice) {
      return Response.json({ error: "Empty LLM response" }, { status: 502 });
    }
    return Response.json({ advice });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
