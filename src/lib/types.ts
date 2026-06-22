// Shared domain types for Trading OS.

export type Side = "buy" | "sell";

/** A single normalized DEX swap from the wallet's perspective. */
export interface Trade {
  signature: string;
  /** Unix seconds. */
  timestamp: number;
  /** Token mint that was bought or sold (the non-SOL leg). */
  mint: string;
  symbol?: string;
  side: Side;
  /** SOL spent (buy) or received (sell), always positive. */
  solAmount: number;
  /** Token quantity bought or sold, always positive. */
  tokenAmount: number;
  /** Price in SOL per token for this fill. */
  priceSol: number;
  /** DEX / aggregator label, when known. */
  source?: string;
}

/** One closed round-trip: a sell matched (FIFO) against earlier buys. */
export interface RoundTrip {
  mint: string;
  symbol?: string;
  openTs: number;
  closeTs: number;
  holdSeconds: number;
  tokenAmount: number;
  costSol: number;
  proceedsSol: number;
  pnlSol: number;
  /** Return on cost, e.g. 0.25 == +25%. */
  roi: number;
}

export interface TokenPnL {
  mint: string;
  symbol?: string;
  realizedSol: number;
  buys: number;
  sells: number;
  totalBoughtSol: number;
  totalSoldSol: number;
  /** Tokens still held (unmatched buys). */
  openTokens: number;
  /** Cost basis of the still-open position, in SOL. */
  openCostSol: number;
  roundTrips: number;
  wins: number;
}

export interface PnLSummary {
  realizedSol: number;
  totalTrades: number;
  buys: number;
  sells: number;
  roundTrips: number;
  wins: number;
  losses: number;
  winRate: number; // 0..1 over closed round-trips
  grossProfitSol: number;
  grossLossSol: number;
  profitFactor: number; // grossProfit / grossLoss
  bestTrip?: RoundTrip;
  worstTrip?: RoundTrip;
  perToken: TokenPnL[];
  trips: RoundTrip[];
}

export interface Metrics {
  activeDays: number;
  tradesPerActiveDay: number;
  avgPositionSizeSol: number;
  maxPositionSizeSol: number;
  avgHoldSeconds: number;
  medianHoldSeconds: number;
  /** Quick flips closed in under 2 minutes, as a share of round-trips. */
  flipRate: number;
  /** Re-entries within 30 min after a losing exit, as a share of losses. */
  revengeRate: number;
  /** Busiest single-day trade count. */
  maxTradesInDay: number;
  /** Hour-of-day (UTC) -> trade count. */
  hourHistogram: number[];
  /** Share of round-trips with ROI < -50%. */
  bigLossRate: number;
}

/** A scored, day-scoped snapshot used to drive advice. */
export interface SessionStats {
  /** ISO date (UTC) of the session, or "all". */
  date: string;
  trades: number;
  realizedSol: number;
  winRate: number;
  roundTrips: number;
  avgPositionSizeSol: number;
  flipRate: number;
  revengeRate: number;
}

export type Severity = "good" | "warn" | "bad" | "info";

export interface AdvicePointer {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface AnalysisResult {
  address: string;
  fetchedTrades: number;
  pnl: PnLSummary;
  metrics: Metrics;
  session: SessionStats;
  pointers: AdvicePointer[];
  /** Set when live data was unavailable and demo data was substituted. */
  demo?: boolean;
  note?: string;
}
