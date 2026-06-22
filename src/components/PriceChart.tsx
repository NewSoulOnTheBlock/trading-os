"use client";

import { useMemo, useState } from "react";

import { fmtDuration, fmtNum } from "@/lib/format";
import type { Trade } from "@/lib/types";

interface Point {
  x: number;
  y: number;
  trade: Trade;
}

/**
 * Lightweight dependency-free SVG chart plotting fill price (SOL/token) over
 * time. Buys render as green up-markers (entries), sells as red down-markers
 * (exits). Hovering a marker reveals the fill detail.
 */
export function PriceChart({ trades }: { trades: Trade[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const W = 720;
  const H = 260;
  const padL = 8;
  const padR = 8;
  const padT = 16;
  const padB = 28;

  const sorted = useMemo(
    () => [...trades].sort((a, b) => a.timestamp - b.timestamp),
    [trades],
  );

  const layout = useMemo(() => {
    if (sorted.length === 0) return null;
    const tMin = sorted[0].timestamp;
    const tMax = sorted[sorted.length - 1].timestamp;
    const tSpan = Math.max(1, tMax - tMin);
    const prices = sorted.map((t) => t.priceSol).filter((p) => p > 0);
    const pMin = Math.min(...prices);
    const pMax = Math.max(...prices);
    const pSpan = Math.max(pMax - pMin, pMax * 1e-6 || 1e-12);

    const innerW = W - padL - padR;
    const innerH = H - padT - padB;

    const points: Point[] = sorted.map((trade) => {
      const x = padL + ((trade.timestamp - tMin) / tSpan) * innerW;
      const y = padT + (1 - (trade.priceSol - pMin) / pSpan) * innerH;
      return { x, y, trade };
    });

    return { points, tMin, tMax };
  }, [sorted]);

  if (!layout) {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-6 text-center text-sm text-neutral-500">
        No fills to chart.
      </div>
    );
  }

  const { points } = layout;
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const active = hover != null ? points[hover] : null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "auto" }}>
        {/* price path connecting fills chronologically */}
        <path d={linePath} fill="none" stroke="#3f3f46" strokeWidth={1} />

        {points.map((p, i) => {
          const buy = p.trade.side === "buy";
          const color = buy ? "#34d399" : "#fb7185";
          return (
            <g
              key={`${p.trade.signature}-${i}`}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((h) => (h === i ? null : h))}
              style={{ cursor: "pointer" }}
            >
              {/* invisible wide hit area */}
              <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
              <path
                d={
                  buy
                    ? `M${p.x},${p.y - 6} L${p.x - 5},${p.y + 4} L${p.x + 5},${p.y + 4} Z`
                    : `M${p.x},${p.y + 6} L${p.x - 5},${p.y - 4} L${p.x + 5},${p.y - 4} Z`
                }
                fill={color}
                stroke={hover === i ? "#fff" : "none"}
                strokeWidth={1}
              />
            </g>
          );
        })}

        {active ? (
          <line
            x1={active.x}
            y1={padT}
            x2={active.x}
            y2={H - padB}
            stroke="#52525b"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        ) : null}
      </svg>

      <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rotate-0" style={{ background: "#34d399" }} /> Buy
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2" style={{ background: "#fb7185" }} /> Sell
          </span>
        </span>
        {active ? (
          <span className="text-neutral-300">
            {active.trade.side.toUpperCase()} · {fmtNum(active.trade.tokenAmount)} tok ·{" "}
            {active.trade.solAmount.toFixed(4)} SOL · {active.trade.priceSol.toExponential(2)} SOL/tok ·{" "}
            {new Date(active.trade.timestamp * 1000).toLocaleString()}
          </span>
        ) : (
          <span>
            {points.length} fills over{" "}
            {fmtDuration(points[points.length - 1].trade.timestamp - points[0].trade.timestamp)}
          </span>
        )}
      </div>
    </div>
  );
}
