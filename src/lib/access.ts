// Access gate for the position the user entered (AGB § 5(3), § 6(2)).
//
// - Contract ended (`betrieb_abonnements.status = 'gekuendigt'`): access ends for
//   everyone in the business. Employees can't read the subscription row, so this
//   asks the RPC `betrieb_vertrag_beendet` (true only for a member AND
//   'gekuendigt'; 'pausiert' returns false on purpose).
// - Trial paused without a payment method ('pausiert'): only the manager is
//   blocked, as on the website; employees keep their schedule. Managers read
//   the row directly (policy `abonnement_select_chef`).
// - Position gone (business deleted after the contract ended, or the position
//   was deactivated): the caller falls back to the selection screen.
//
// Every read error or timeout lets the user through and is logged — the same
// choice as the website (`pruefeVertragsende` in QuickTeamFront): locking
// someone out of their schedule because of an outage costs more than a few
// hours of access to a business that is deleted anyway.
import { supabase } from "./supabase";

export type Position = { id: string; betrieb_id: string; rolle_typ: string };

export type AccessBlock = {
  kind: "ended" | "paused";
  betriebName: string;
  /** Another active position exists that isn't blocked for the same reason. */
  canSwitch: boolean;
};

export type AccessResult =
  | { status: "ok" }
  | { status: "gone" }
  | { status: "blocked"; block: AccessBlock };

// Offline use is a feature (cached calendar), so a hanging request must not
// keep the user on a spinner.
const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout after ${ms} ms`)), ms);
    p.then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
}

export async function checkAccess(p: Position, authId: string): Promise<AccessResult> {
  try {
    return await withTimeout(runChecks(p, authId), TIMEOUT_MS);
  } catch (e) {
    console.warn("[access] check failed, letting through:", e);
    return { status: "ok" };
  }
}

async function runChecks(p: Position, authId: string): Promise<AccessResult> {
  const isChef = p.rolle_typ === "chef";
  const [pos, ended, abo] = await Promise.all([
    supabase
      .from("mitarbeiter")
      .select("id, betriebe(name)")
      .eq("id", p.id)
      .eq("auth_id", authId)
      .eq("status", "aktiv")
      .is("anonymisiert_am", null)
      .maybeSingle(),
    supabase.rpc("betrieb_vertrag_beendet", { p_betrieb_id: p.betrieb_id }),
    isChef
      ? supabase.from("betrieb_abonnements").select("status").eq("betrieb_id", p.betrieb_id).maybeSingle()
      : Promise.resolve(null),
  ]);

  if (pos.error) console.warn("[access] position lookup:", pos.error.message);
  else if (!pos.data) return { status: "gone" };

  let kind: AccessBlock["kind"] | null = null;
  if (ended.error) console.warn("[access] betrieb_vertrag_beendet:", ended.error.message);
  else if (ended.data === true) kind = "ended";

  if (!kind && abo) {
    if (abo.error) console.warn("[access] betrieb_abonnements:", abo.error.message);
    else if (abo.data?.status === "pausiert") kind = "paused";
  }
  if (!kind) return { status: "ok" };

  // Ended blocks every position in the business, so only other businesses
  // help; paused blocks only the manager, so the same person's employee
  // position in that business still works.
  const others = await supabase
    .from("mitarbeiter")
    .select("id", { count: "exact", head: true })
    .eq("auth_id", authId)
    .eq("status", "aktiv")
    .is("anonymisiert_am", null)
    .neq(kind === "ended" ? "betrieb_id" : "id", kind === "ended" ? p.betrieb_id : p.id);

  return {
    status: "blocked",
    block: {
      kind,
      betriebName: (pos.data as any)?.betriebe?.name ?? "",
      // On a read error offer the switch anyway; the selection screen is harmless.
      canSwitch: others.error ? true : (others.count ?? 0) > 0,
    },
  };
}

/**
 * True when the server says the signed-in account no longer exists (deleted
 * with its business, or elsewhere). supabase-js only drops the session by
 * itself on `session_not_found` or a rejected refresh token; a deleted user
 * gets `user_not_found`, and the stored access token would otherwise keep
 * "working" (with empty results) until it expires.
 */
export async function accountDeleted(): Promise<boolean> {
  const { error } = await supabase.auth.getUser();
  return error?.code === "user_not_found";
}
