// push-versenden — sends an Expo push for a single benachrichtigungen row.
//
// Invoked by the AFTER INSERT trigger on public.benachrichtigungen via pg_net.
// The trigger passes { benachrichtigung_id } and an `x-push-secret` header; we
// verify that secret against app_private.config before doing anything. Runs with
// the service-role key (auto-injected into the edge runtime), so it can read the
// recipient's tokens, language, and per-type opt-out.
//
// verify_jwt is DISABLED for this function: it is a server-to-server webhook
// authenticated by the shared secret, not by a user JWT.
import { createClient } from "jsr:@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// Localized fallback copy keyed by notification `typ`. Rows that carry their own
// titel/text (announcements, polls) use those instead; this covers the
// system-generated events. `de` is the default; unknown langs fall back to de.
type Copy = { title: string; body: string };
const CATALOG: Record<string, Record<string, Copy>> = {
  schicht_tausch: {
    de: { title: "Schichttausch", body: "Es gibt eine neue Tauschanfrage." },
    en: { title: "Shift swap", body: "There's a new swap request." },
  },
  schicht_ausschreibung: {
    de: { title: "Offene Schicht", body: "Eine offene Schicht wurde ausgeschrieben." },
    en: { title: "Open shift", body: "An open shift is available to claim." },
  },
  umfrage: {
    de: { title: "Neue Umfrage", body: "Eine neue Umfrage wartet auf deine Stimme." },
    en: { title: "New poll", body: "A new poll is waiting for your vote." },
  },
  aenderungswunsch: {
    de: { title: "Änderungswunsch", body: "Ein Schichtwunsch wurde eingereicht." },
    en: { title: "Change request", body: "A shift change request was submitted." },
  },
  schicht_geaendert: {
    de: { title: "Schicht geändert", body: "Eine deiner Schichten wurde geändert." },
    en: { title: "Shift changed", body: "One of your shifts was changed." },
  },
  notfall_vertretung: {
    de: { title: "Vertretung gesucht", body: "Für eine Schicht wird dringend Vertretung gesucht." },
    en: { title: "Cover needed", body: "A shift urgently needs cover." },
  },
  allgemein: {
    de: { title: "Neue Nachricht", body: "Du hast eine neue Nachricht." },
    en: { title: "New message", body: "You have a new message." },
  },
};

function compose(typ: string, lang: string, titel: string | null, text: string | null): Copy {
  const base = (CATALOG[typ] ?? CATALOG.allgemein);
  const fallback = base[lang] ?? base.de;
  return {
    title: (titel && titel.trim()) || fallback.title,
    body: (text && text.trim()) || fallback.body,
  };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // --- authenticate the caller against the shared secret ---
  // (read via a service-role-only RPC: PostgREST only exposes `public`).
  const { data: expected } = await supabase.rpc("push_secret_lesen");
  if (!expected || req.headers.get("x-push-secret") !== expected) {
    return new Response("forbidden", { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const id = body?.benachrichtigung_id;
  if (!id) return new Response("bad request", { status: 400 });

  // --- load the notification ---
  const { data: bn } = await supabase.from("benachrichtigungen")
    .select("id, betrieb_id, mitarbeiter_id, typ, titel, text, geloescht_am")
    .eq("id", id).single();
  if (!bn || bn.geloescht_am || !bn.mitarbeiter_id) {
    return new Response(JSON.stringify({ skipped: "no-recipient" }), { status: 200 });
  }

  // --- respect the per-type opt-out ---
  const { data: pref } = await supabase.from("benachrichtigung_prefs")
    .select("aktiv").eq("mitarbeiter_id", bn.mitarbeiter_id).eq("schluessel", bn.typ).maybeSingle();
  if (pref && pref.aktiv === false) {
    return new Response(JSON.stringify({ skipped: "opted-out" }), { status: 200 });
  }

  // --- resolve recipient auth user, language, and device tokens ---
  const { data: ma } = await supabase.from("mitarbeiter")
    .select("auth_id, sprache").eq("id", bn.mitarbeiter_id).single();
  if (!ma?.auth_id) return new Response(JSON.stringify({ skipped: "no-auth" }), { status: 200 });

  const { data: tokens } = await supabase.from("push_tokens")
    .select("expo_token").eq("auth_id", ma.auth_id);
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ skipped: "no-tokens" }), { status: 200 });
  }

  const lang = (ma.sprache ?? "de").slice(0, 2);
  const { title, body: message } = compose(bn.typ, lang, bn.titel, bn.text);

  const messages = tokens.map((t) => ({
    to: t.expo_token,
    title,
    body: message,
    sound: "default",
    data: { typ: bn.typ, benachrichtigung_id: bn.id, betrieb_id: bn.betrieb_id },
  }));

  const res = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify(messages),
  });
  const receipt = await res.json().catch(() => null);

  return new Response(JSON.stringify({ sent: messages.length, receipt }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
