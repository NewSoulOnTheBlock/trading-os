import type { AnalysisResult } from "@/lib/types";

/** Defaults so the extension works out-of-the-box; user can override in popup. */
export const DEFAULT_HELIUS_KEY = "021f44ec-4a1a-4d35-ab8a-f7263ea0f2dd";

export interface Settings {
  heliusKey: string;
  wallet: string; // manual override; empty = auto-detect
  dailyLossLimit: number; // SOL; 0 = off
  weeklyGoal: number; // SOL; 0 = off
  panelOpen: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  heliusKey: DEFAULT_HELIUS_KEY,
  wallet: "",
  dailyLossLimit: 0,
  weeklyGoal: 0,
  panelOpen: true,
};

export async function getSettings(): Promise<Settings> {
  const stored = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...(stored.settings as Partial<Settings> | undefined) };
}

export async function setSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

// ---- Messaging contract (content/popup -> background) ----
export interface AnalyzeRequest {
  type: "ANALYZE";
  address: string;
}
export interface PricesRequest {
  type: "PRICES";
  mints: string[];
}
export type BgRequest = AnalyzeRequest | PricesRequest;

export interface AnalyzeResponse {
  ok: boolean;
  result?: AnalysisResult & { solPriceUsd?: number };
  error?: string;
}
export interface PricesResponse {
  ok: boolean;
  prices?: Record<string, { priceUsd?: number; priceSol?: number; change24h?: number; symbol?: string }>;
  error?: string;
}
