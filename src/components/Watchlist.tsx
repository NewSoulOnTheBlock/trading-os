"use client";

import { useEffect, useMemo, useState } from "react";

import { fmtNum, shortMint } from "@/lib/format";
import { fetchTokenPrices, type TokenPrice } from "@/lib/solana/prices";
import { useLocalStorageState } from "@/lib/useLocalStorage";

interface WatchItem {
  mint: string;
  label?: string;
  target?: number; // price in USD
  dir: "above" | "below";
}

const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Token watchlist with live DexScreener prices + target-price alerts (#17). */
export function Watchlist({ address }: { address: string }) {
  const [items, setItems] = useLocalStorageState<WatchItem[]>(`trading-os:watchlist:${address}`, []);
  const [input, setInput] = useState("");
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());

  const mintsKey = useMemo(() => items.map((i) => i.mint).join(","), [items]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const m = await fetchTokenPrices(mintsKey ? mintsKey.split(",") : []);
      if (alive) setPrices(m);
    };
    void load();
    const id = mintsKey ? setInterval(() => void load(), 30000) : undefined;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [mintsKey]);

  const add = () => {
    const mint = input.trim();
    if (!BASE58.test(mint) || items.some((i) => i.mint === mint)) return;
    setItems([...items, { mint, dir: "above" }]);
    setInput("");
  };

  const update = (mint: string, patch: Partial<WatchItem>) =>
    setItems(items.map((i) => (i.mint === mint ? { ...i, ...patch } : i)));

  const remove = (mint: string) => setItems(items.filter((i) => i.mint !== mint));

  const triggered = (i: WatchItem): boolean => {
    const p = prices.get(i.mint)?.priceUsd;
    if (p == null || i.target == null) return false;
    return i.dir === "above" ? p >= i.target : p <= i.target;
  };

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Watchlist & price alerts
      </h3>

      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
          placeholder="Paste a token mint to watch"
          className="flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm outline-none focus:border-violet-600"
        />
        <button
          onClick={add}
          className="rounded-lg bg-violet-700 px-3 text-sm font-medium text-white hover:bg-violet-600"
        >
          Add
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No tokens watched. Add a mint to track its live price and set a target alert.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((i) => {
            const p = prices.get(i.mint);
            const hit = triggered(i);
            return (
              <li
                key={i.mint}
                className={`rounded-lg border p-2 ${
                  hit ? "border-emerald-600 bg-emerald-950/30" : "border-neutral-800 bg-neutral-950/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://dexscreener.com/solana/${i.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-violet-300 hover:underline"
                      >
                        {p?.symbol ?? i.label ?? shortMint(i.mint)}
                      </a>
                      {hit ? (
                        <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                          ALERT
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-neutral-500">{shortMint(i.mint)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {p?.priceUsd != null ? `$${fmtNum(p.priceUsd)}` : "…"}
                    </div>
                    {p?.change24h != null ? (
                      <div className={`text-xs ${p.change24h >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {p.change24h >= 0 ? "+" : ""}
                        {p.change24h.toFixed(1)}% 24h
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span className="text-neutral-500">Alert when</span>
                  <select
                    value={i.dir}
                    onChange={(e) => update(i.mint, { dir: e.target.value as WatchItem["dir"] })}
                    className="rounded border border-neutral-700 bg-neutral-950 px-1.5 py-1 outline-none"
                  >
                    <option value="above">≥</option>
                    <option value="below">≤</option>
                  </select>
                  <span className="text-neutral-500">$</span>
                  <input
                    type="number"
                    value={i.target ?? ""}
                    onChange={(e) =>
                      update(i.mint, {
                        target: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="target"
                    className="w-24 rounded border border-neutral-700 bg-neutral-950 px-2 py-1 outline-none focus:border-violet-600"
                  />
                  <button
                    onClick={() => remove(i.mint)}
                    className="ml-auto text-neutral-500 hover:text-rose-400"
                  >
                    remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-neutral-600">Prices via DexScreener, refreshed every 30s.</p>
    </div>
  );
}
