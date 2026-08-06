import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

type AuthContextType = {
  user: Session["user"] | null;
  loading: boolean;
  /** True once the user has picked which position to enter. */
  entered: boolean;
  /** The mitarbeiter position the user entered as (drives role-based UI). */
  activeMitarbeiter: { id: string; betrieb_id: string; rolle_typ: string } | null;
  /** Standard email/password sign-in. */
  signIn: (email: string, password: string) => Promise<void>;
  /**
   * Standard email/password sign-up.
   * - `needsVerification`: the project requires email confirmation (code emailed).
   * - `alreadyRegistered`: the email already belongs to a confirmed account
   *   (Supabase's enumeration protection returns a user with no identities and
   *   no session), so the caller should steer the user to sign in instead.
   */
  signUp: (email: string, password: string) =>
    Promise<{ needsVerification: boolean; alreadyRegistered: boolean }>;
  /** Confirm a sign-up with the 6-digit code from the email. */
  verifySignUp: (email: string, code: string) => Promise<void>;
  /** Re-send the sign-up confirmation code. */
  resendCode: (email: string) => Promise<void>;
  /** Enter the app as a specific mitarbeiter position (from the select screen). */
  enterApp: (m: { id: string; betrieb_id: string; rolle_typ: string }) => void;
  /** Return to the business-selection screen (manage connections / switch). */
  exitToSelection: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [activeMitarbeiter, setActiveMitarbeiter] =
    useState<{ id: string; betrieb_id: string; rolle_typ: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) { setEntered(false); setActiveMitarbeiter(null); } // reset on sign-out
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // Enumeration protection: an already-confirmed email returns a user with an
    // empty identities array and no session (no email is actually sent).
    const alreadyRegistered = !data.session && data.user?.identities?.length === 0;
    // When email confirmation is enabled, a genuine new sign-up has no session yet.
    return { needsVerification: !data.session && !alreadyRegistered, alreadyRegistered };
  };

  const verifySignUp = async (email: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "signup",
    });
    if (error) throw error;
  };

  const resendCode = async (email: string) => {
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) throw error;
  };

  const enterApp = (m: { id: string; betrieb_id: string; rolle_typ: string }) => {
    setActiveMitarbeiter(m);
    setEntered(true);
    // Land on Home. The (tabs) group anchors on "index", but flipping the
    // `entered` guard doesn't always re-target the group's initial route, so
    // redirect explicitly once the tabs mount on the next tick.
    setTimeout(() => router.replace("/"), 0);
  };
  const exitToSelection = () => setEntered(false);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{
        user,
        loading,
        entered,
        activeMitarbeiter,
        signIn,
        signUp,
        verifySignUp,
        resendCode,
        enterApp,
        exitToSelection,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
