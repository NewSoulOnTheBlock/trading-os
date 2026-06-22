"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const EVENT = "trading-os:local-storage";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

/**
 * SSR-safe localStorage-backed state via useSyncExternalStore.
 * The raw string is the external snapshot (a stable primitive), so reads never
 * trigger setState-in-effect; parsing happens in a memo during render.
 */
export function useLocalStorageState<T>(key: string, fallback: T): [T, (value: T) => void] {
  const getSnapshot = useCallback((): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }, [key]);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const value = useMemo<T>(() => {
    if (raw == null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }, [raw, fallback]);

  const setValue = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(new Event(EVENT));
      } catch {
        /* ignore quota / unavailable */
      }
    },
    [key],
  );

  return [value, setValue];
}
