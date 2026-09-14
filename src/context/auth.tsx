import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { AccessBlock, accountDeleted, checkAccess } from "../lib/access";
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
   * Start phone sign-in / sign-up: sends a 6-digit SMS OTP to `phone` (E.164,
   * e.g. "+491701234567"). The same call creates the account on first use, so
   * there is no separate phone sign-up path.
   */
  signInWithPhone: (phone: string) => Promise<void>;
  /** Confirm a phone sign-in with the SMS code; opens a session on success. */
  verifyPhone: (phone: string, code: string) => Promise<void>;
  /**
   * Add a phone number to the CURRENTLY signed-in account. Sends an SMS OTP to
   * the new number; confirm it with `verifyChannelChange(phone, code, "phone")`.
   */
  addPhone: (phone: string) => Promise<void>;
  /**
   * Add an email address to the CURRENTLY signed-in account (typically a
   * phone-first user). Sends a confirmation code to the new address; confirm it
   * with `verifyChannelChange(email, code, "email")`.
   */
  addEmail: (email: string) => Promise<void>;
  /** Confirm an add-phone / add-email change with the code sent to it. */
  verifyChannelChange: (
    contact: string,
    code: string,
    kind: "phone" | "email",
  ) => Promise<void>;
  /**
   * Account-merge fallback (rare). Call while signed into the DUPLICATE account
   * to mint a short-lived one-time merge token, then hand it to the keeper
   * account's `confirmAccountMerge`. Returns the token string.
   */
  startAccountMerge: () => Promise<string>;
  /**
   * Call while signed into the KEEPER account with the token from
   * `startAccountMerge`. Re-points every position from the duplicate onto this
   * account and resolves with the number of positions moved.
   */
  confirmAccountMerge: (token: string) => Promise<number>;
  /**
   * Standard email/password sign-up.
   * - `needsVerification`: the project requires email confirmation (code emailed).
   * - `alreadyRegistered`: the email already belongs to a confirmed account
   *   (Supabase's enumeration protection returns a user with no identities and
   *   no session), so the caller should steer the user to sign in instead.
   */
  signUp: (email: string, password: string) =>
    Promise<{ needsVerification: boolean; alreadyRegistered: boolean }>;
  /** Confirm a sign-up with the 8-digit code from the email. */
  verifySignUp: (email: string, code: string) => Promise<void>;
  /** Re-send the sign-up confirmation code. */
  resendCode: (email: string) => Promise<void>;
  /** Email an 8-digit password-recovery code. Always resolves (no account enumeration). */
  sendPasswordReset: (email: string) => Promise<void>;
  /**
   * Confirm a recovery code and set a new password. Verifying the code opens a
   * short-lived session; the password update runs inside it, after which the
   * user is signed in with the new credentials.
   */
  confirmPasswordReset: (email: string, code: string, newPassword: string) => Promise<void>;
  /**
   * Permanently delete the signed-in account (Apple Guideline 5.1.1(v) + GDPR
   * erasure). Re-authenticates with `password` first when the account has one,
   * then anonymises every position and deletes the auth user server-side, and
   * finally signs out. Throws `Error("REAUTH_FAILED")` on a wrong password and
   * an error whose message contains `CHEF_MIT_MITGLIEDERN` when the account
   * still actively manages a team (must be handed over first).
   */
  deleteAccount: (password?: string) => Promise<void>;
  /**
   * Why the entered position may not use the app (contract ended, or a
   * manager's trial is paused); null when it may. See src/lib/access.ts.
   */
  block: AccessBlock | null;
  /**
   * Enter the app as a specific mitarbeiter position (from the select screen).
   * Runs the access check first; resolves "gone" when the position no longer
   * exists (the caller should reload its list).
   */
  enterApp: (m: { id: string; betrieb_id: string; rolle_typ: string }) => Promise<"entered" | "gone">;
  /** Re-run the access check for the entered position (also runs on app foreground). */
  recheckAccess: () => Promise<void>;
  /** Return to the business-selection screen (manage connections / switch). */
  exitToSelection: () => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthContextType>({} as AuthContextType);
export const useAuth = () => useContext(Ctx);

async function signOutIfAccountDeleted(): Promise<boolean> {
  if (!(await accountDeleted())) return false;
  // Local only: there is no server session left to end. Emits SIGNED_OUT,
  // which resets the position and lands on the sign-in screen.
  await supabase.auth.signOut({ scope: "local" });
  return true;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Session["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [entered, setEntered] = useState(false);
  const [activeMitarbeiter, setActiveMitarbeiter] =
    useState<{ id: string; betrieb_id: string; rolle_typ: string } | null>(null);
  const [block, setBlock] = useState<AccessBlock | null>(null);
  // The entered position as of now, so a check that resolves after the user
  // switched or left doesn't apply a stale result.
  const enteredIdRef = useRef<string | null>(null);

  const leavePosition = () => {
    enteredIdRef.current = null;
    setEntered(false);
    setActiveMitarbeiter(null);
    setBlock(null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
      // A stored session can outlive its account (deleted with its business);
      // drop it instead of showing an empty app until the token expires.
      if (data.session) signOutIfAccountDeleted();
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) leavePosition(); // reset on sign-out
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const recheckAccess = useCallback(async () => {
    if (!user) return;
    if (await signOutIfAccountDeleted()) return;
    const m = activeMitarbeiter;
    if (!entered || !m) return;
    const result = await checkAccess(m, user.id);
    if (enteredIdRef.current !== m.id) return;
    if (result.status === "gone") leavePosition();
    else setBlock(result.status === "blocked" ? result.block : null);
  }, [user, entered, activeMitarbeiter]);

  // Contracts end and businesses are deleted while the app sits in the
  // background; check again whenever it comes back.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") recheckAccess();
    });
    return () => sub.remove();
  }, [recheckAccess]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signInWithPhone = async (phone: string) => {
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) throw error;
  };

  const verifyPhone = async (phone: string, code: string) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "sms",
    });
    if (error) throw error;
  };

  const addPhone = async (phone: string) => {
    const { error } = await supabase.auth.updateUser({ phone });
    if (error) throw error;
  };

  const addEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    if (error) throw error;
  };

  const verifyChannelChange = async (
    contact: string,
    code: string,
    kind: "phone" | "email",
  ) => {
    const { error } = await supabase.auth.verifyOtp(
      kind === "phone"
        ? { phone: contact, token: code, type: "phone_change" }
        : { email: contact, token: code, type: "email_change" },
    );
    if (error) throw error;
    // Pull the refreshed user so `user.phone` / `user.email` reflect the change
    // immediately (updateUser's local user isn't updated until re-fetch).
    const { data } = await supabase.auth.getUser();
    if (data.user) setUser(data.user);
  };

  const startAccountMerge = async () => {
    const { data, error } = await supabase.rpc("konto_merge_start");
    if (error) throw error;
    return data as string;
  };

  const confirmAccountMerge = async (token: string) => {
    const { data, error } = await supabase.rpc("konto_merge_confirm", { p_token: token });
    if (error) throw error;
    return (data ?? 0) as number;
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

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const confirmPasswordReset = async (email: string, code: string, newPassword: string) => {
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "recovery" });
    if (error) throw error;
    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updErr) throw updErr;
  };

  const deleteAccount = async (password?: string) => {
    // Re-authenticate email/password accounts so a stolen unlocked phone can't
    // wipe the account. verifyOtp-only (phone) accounts skip this step.
    if (password && user?.email) {
      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (error) throw new Error("REAUTH_FAILED");
    }
    const { error } = await supabase.rpc("konto_selbst_loeschen");
    if (error) throw error;
    await supabase.auth.signOut();
  };

  const enterApp = async (m: { id: string; betrieb_id: string; rolle_typ: string }) => {
    const result = user ? await checkAccess(m, user.id) : ({ status: "ok" } as const);
    if (result.status === "gone") return "gone";
    enteredIdRef.current = m.id;
    setActiveMitarbeiter(m);
    setBlock(result.status === "blocked" ? result.block : null);
    setEntered(true);
    // Land on Home. The (tabs) group anchors on "index", but flipping the
    // `entered` guard doesn't always re-target the group's initial route, so
    // redirect explicitly once the tabs mount on the next tick. A blocked
    // position has a single screen (`locked`), which the guard picks itself.
    if (result.status !== "blocked") setTimeout(() => router.replace("/"), 0);
    return "entered";
  };
  const exitToSelection = () => {
    enteredIdRef.current = null;
    setEntered(false);
    setBlock(null);
  };

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
        signInWithPhone,
        verifyPhone,
        addPhone,
        addEmail,
        verifyChannelChange,
        startAccountMerge,
        confirmAccountMerge,
        signUp,
        verifySignUp,
        resendCode,
        sendPasswordReset,
        confirmPasswordReset,
        deleteAccount,
        block,
        enterApp,
        recheckAccess,
        exitToSelection,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
