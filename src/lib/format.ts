export function fmtSol(n: number, digits = 3): string {
  const v = n.toFixed(digits);
  return `${n > 0 ? "+" : ""}${v}`;
}

export function fmtSolAbs(n: number, digits = 3): string {
  return n.toFixed(digits);
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(0)}%`;
}

export function fmtUsd(sol: number, price?: number): string {
  if (!price) return "";
  const usd = sol * price;
  const sign = usd > 0 ? "+" : usd < 0 ? "-" : "";
  return `${sign}$${Math.abs(usd).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export function fmtDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`;
  return `${(seconds / 86400).toFixed(1)}d`;
}

export function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

export function fmtNum(n: number): string {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(2)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
