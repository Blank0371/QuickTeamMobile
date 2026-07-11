import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // RN has no URL to detect from
    },
  }
);

type AuthContextType = {
  user: Session["user"] | null;
  loading: boolean;
  hostSignUp: (email: string, password: string) => Promise<void>;
  hostSignIn: (email: string, password: string) => Promise<void>;
  signUpWithHash: (hash: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session["user"] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- Host: standard Supabase email/password ---
  const hostSignUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const hostSignIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  // --- Employee (Mitarbeiter): redeem hash via edge function ---
  const signUpWithHash = async (hash: string) => {
    const { data, error } = await supabase.functions.invoke("signUpWithHash", {
      body: { hash },
    });
    if (error) throw error;

    // edge function returns a permanent session for the auth_id
    // tied to the mitarbeiter row
    const { error: sessErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (sessErr) throw sessErr;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        hostSignUp,
        hostSignIn,
        signUpWithHash,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}