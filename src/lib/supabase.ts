import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

// During static web rendering (Node) there is no `window`, so AsyncStorage's
// web backend (localStorage) blows up. Fall back to a no-op store there; on
// native and in the real browser we keep the persistent AsyncStorage.
const memoryStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

const storage =
  Platform.OS === "web" && typeof window === "undefined"
    ? memoryStorage
    : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // These come from `.env` locally and from the `env` block of the active
  // EAS build profile in production. If they're missing in a build, `.env`
  // was almost certainly excluded (it's gitignored) — add the vars to the
  // matching profile in eas.json or via `eas env:create`.
  throw new Error(
    "Supabase env vars missing: " +
      [
        !supabaseUrl && "EXPO_PUBLIC_SUPABASE_URL",
        !supabaseAnonKey && "EXPO_PUBLIC_SUPABASE_ANON_KEY",
      ]
        .filter(Boolean)
        .join(", ") +
      ". Check your .env (local) or the EAS build profile's env block."
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN has no URL to detect from
    },
  }
);
