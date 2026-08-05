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

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN has no URL to detect from
    },
  }
);
