// Tiny read-through cache over AsyncStorage. Used to show the last synced data
// (e.g. the calendar) instantly and while offline, then revalidated from the
// server when a fetch succeeds. Read-only caching — no write queue.
import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "cache:";

export type Cached<T> = { value: T; savedAt: number };

export async function readCache<T>(key: string): Promise<Cached<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Cached<T>) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ value, savedAt: Date.now() }));
  } catch {
    // best-effort; a failed cache write must never break the screen
  }
}

// Drop every cached entry. Run on sign-out: the cache holds the previous user's
// roster, and on a shared device the next person must not see it offline.
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const ours = keys.filter((k) => k.startsWith(PREFIX));
    if (ours.length > 0) await AsyncStorage.multiRemove(ours);
  } catch {
    // best-effort, like the writes
  }
}
