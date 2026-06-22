"use client";

import { useState } from "react";
import { useLocalStorageState } from "@/lib/useLocalStorage";

interface JournalEntry {
  id: string;
  ts: number;
  date: string;
  text: string;
}

const EMPTY: JournalEntry[] = [];

function storageKey(address: string) {
  return `trading-os:journal:${address}`;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

export function Journal({ address }: { address: string }) {
  const [entries, setEntries] = useLocalStorageState<JournalEntry[]>(storageKey(address), EMPTY);
  const [text, setText] = useState("");

  function add() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const entry: JournalEntry = {
      id: crypto.randomUUID(),
      ts: Date.now(),
      date: todayUtc(),
      text: trimmed,
    };
    setEntries([entry, ...entries]);
    setText("");
  }

  function remove(id: string) {
    setEntries(entries.filter((e) => e.id !== id));
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Trade journal
      </h3>
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add();
          }}
          rows={2}
          placeholder="What's your plan / thesis / mistake today? (⌘/Ctrl+Enter to save)"
          className="flex-1 resize-none rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-violet-600"
        />
        <button
          onClick={add}
          className="self-stretch rounded-lg bg-neutral-700 px-3 text-sm font-medium hover:bg-neutral-600"
        >
          Save
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-2 text-sm">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>
                {e.date} · {new Date(e.ts).toLocaleTimeString()}
              </span>
              <button onClick={() => remove(e.id)} className="text-neutral-500 hover:text-rose-400">
                delete
              </button>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-neutral-200">{e.text}</p>
          </li>
        ))}
        {entries.length === 0 ? (
          <li className="text-sm text-neutral-500">No journal entries yet.</li>
        ) : null}
      </ul>
    </div>
  );
}
