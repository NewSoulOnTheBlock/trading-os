import type { Trade } from "@/lib/types";

interface Mulberry {
  (): number;
}
function mulberry32(seed: number): Mulberry {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TOKENS = ["BONK", "WIF", "POPCAT", "MEW", "SLERF", "MOTHER", "PNUT", "GIGA"];

/**
 * Deterministic, realistic-looking trade history used when no Helius key is
 * configured or live fetch fails — so the dashboard and analytics are always
 * demonstrable. Models a slightly-losing, overtrading memecoin trader.
 */
export function demoTrades(seed = 42): Trade[] {
  const rnd = mulberry32(seed);
  const trades: Trade[] = [];
  const now = Math.floor(Date.now() / 1000);
  const day = 86400;

  // 14 days of activity, several positions per day.
  for (let d = 13; d >= 0; d--) {
    const dayStart = now - d * day;
    const positions = 2 + Math.floor(rnd() * 5); // 2..6 positions/day
    for (let p = 0; p < positions; p++) {
      const sym = TOKENS[Math.floor(rnd() * TOKENS.length)];
      const mint = `Demo${sym}${(1111 + Math.floor(rnd() * 8888)).toString()}pump`;
      const entryTs = dayStart + Math.floor(rnd() * day * 0.8);
      const sizeSol = +(0.2 + rnd() * (rnd() < 0.15 ? 6 : 1.5)).toFixed(3); // occasional oversize
      const entryPrice = 1e-6 * (1 + rnd() * 50);
      const tokenAmount = +(sizeSol / entryPrice).toFixed(2);

      trades.push({
        signature: `demo-${d}-${p}-buy`,
        timestamp: entryTs,
        mint,
        symbol: sym,
        side: "buy",
        solAmount: sizeSol,
        tokenAmount,
        priceSol: entryPrice,
        source: "DEMO",
      });

      // 80% of positions are exited; bias toward small losses + a few big ones.
      if (rnd() < 0.8) {
        const roll = rnd();
        let move: number;
        if (roll < 0.4) move = -0.15 - rnd() * 0.2; // small loss
        else if (roll < 0.55) move = -0.5 - rnd() * 0.4; // big loss (no stop)
        else if (roll < 0.85) move = 0.1 + rnd() * 0.4; // small win
        else move = 0.6 + rnd() * 1.5; // runner
        const holdSec = rnd() < 0.5 ? 30 + rnd() * 200 : 600 + rnd() * day * 0.3;
        const exitPrice = entryPrice * (1 + move);
        const exitSol = +(tokenAmount * exitPrice).toFixed(3);

        trades.push({
          signature: `demo-${d}-${p}-sell`,
          timestamp: entryTs + Math.floor(holdSec),
          mint,
          symbol: sym,
          side: "sell",
          solAmount: Math.max(0.0001, exitSol),
          tokenAmount,
          priceSol: exitPrice,
          source: "DEMO",
        });

        // Revenge re-entry after a loss, sometimes.
        if (move < 0 && rnd() < 0.4) {
          const reTs = entryTs + Math.floor(holdSec) + 300 + Math.floor(rnd() * 1000);
          const reSize = +(sizeSol * (1 + rnd())).toFixed(3);
          trades.push({
            signature: `demo-${d}-${p}-revenge`,
            timestamp: reTs,
            mint,
            symbol: sym,
            side: "buy",
            solAmount: reSize,
            tokenAmount: +(reSize / exitPrice).toFixed(2),
            priceSol: exitPrice,
            source: "DEMO",
          });
        }
      }
    }
  }

  return trades.sort((a, b) => a.timestamp - b.timestamp);
}
