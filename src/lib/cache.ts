// Tiny read-through cache over AsyncStorage. Used to show the last synced data
// (calendar, feed, home, manager…) instantly and while offline, then revalidated
// from the server in the background. Read-only caching — no write queue.
//
// Entries are mirrored in memory, so revisiting a tab in the same session can
// hydrate synchronously (`peekCache` in a useState initializer) — no spinner,
// no AsyncStorage round trip. AsyncStorage covers cold starts and offline.
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "cache:";

export type Cached<T> = { value: T; savedAt: number };

const memory = new Map<string, Cached<unknown>>();

/** Synchronous, memory-only lookup (filled by readCache/writeCache this session). */
export function peekCache<T>(key: string): Cached<T> | null {
  return (memory.get(key) as Cached<T> | undefined) ?? null;
}

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  const hit = peekCache<T>(key);
  if (hit) return hit;
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached<T>;
    memory.set(key, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  const entry: Cached<T> = { value, savedAt: Date.now() };
  memory.set(key, entry);
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // best-effort; a failed cache write must never break the screen
  }
}

// Drop every cached entry. Run on sign-out: the cache holds the previous user's
// roster, and on a shared device the next person must not see it offline.
export async function clearCache(): Promise<void> {
  memory.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    // best-effort, like the writes
  }
}
