// =============================================================================
// shift-generation solver (planungszyklen → schicht_zuweisungen)
// -----------------------------------------------------------------------------
// The manager "Generate shifts" flow invokes this. The pure algorithm lives in
// solver.ts — a FEASIBILITY-FIRST greedy fill (hardest shifts first) followed by
// a hill-climbing swap phase — and this file is just the DB load / persist / HTTP
// layer. See solver.ts for the full algorithm + objective description.
//
// What it does, end to end:
//   1. Loads an OFFEN planning cycle (planungszyklen).
//   2. Materializes shift instances (schicht_instanzen) from the weekly templates
//      (schicht_vorlagen) for every matching weekday in the cycle's date range.
//   3. Assigns employees to each instance's required roles (fill + swap), honoring
//      the hard constraints and optimizing the soft objective below.
//   4. Writes schicht_zuweisungen (quelle = 'solver') and flips the cycle to
//      'vorschlag_bereit', recording any unfilled slots as warnings.
//
// HARD constraints — mirror the pruefe_zuweisung_constraints() trigger EXACTLY,
// so the solver never proposes a row the DB would reject (priority #1):
//   - HC-3: employee holds the required role AND the role is active.
//   - HC-1: not on approved holiday (urlaub) covering that date.
//   - HC-2: no overlapping shift — unioned across mitarbeiter that share an
//     auth_id (the trigger treats them as one body for overlap/rest).
//   - HC-4: rest gap between any two shifts >= gesetzliche mindestruhezeit.
//   - legal daily / weekly maxima (gesetzliche_parameter by betriebe.land).
//   - HC-5: MONTHLY (cycle) hours must not exceed max_stunden_hart.
//   Pre-existing manuell/tausch assignments seed all of the above.
//
// SOFT ranking (priority: preference > überstunden > fairness) — lowest COST wins:
//   - Preference (gerne/ungerne; per-date tagesvorlieben override the standing
//     vorlieben). gerne is a reward that DECAYS the more of their wishes are
//     granted; ungerne is a penalty that GROWS the more disliked shifts they are
//     forced onto (so the least-burdened unwilling person takes an all-ungerne
//     slot). Someone who filed FEWER preferences has each wish weighted higher.
//   - Überstunden: historical overtime beyond toleranz_ueberstunden raises cost,
//     so the more overtime banked, the later they are picked.
//   - Fairness: distance above the monthly soll_stunden target raises cost.
//
// DELIBERATELY OUT OF SCOPE (belongs in an "optimal" ILP/CP method):
//   - Proven optimality / exhaustive backtracking — local search reaches a good
//     local optimum, not necessarily the global one.
//   - Moves larger than a pairwise swap (3-cycles, chains).
//
// CONFIRMED assumptions:
//   - A cycle is one month; soll_stunden is the optimal monthly hours, used
//     directly as the per-cycle fairness target (no scaling). max_stunden_hart is
//     likewise a MONTHLY cap.
//   - Availability (verfuegbarkeiten) is IGNORED; only approved urlaub blocks a day.
//   - Reruns are AVOIDED: the function only runs on a cycle in 'offen' or
//     'deadline_erreicht'. A cycle that is already running / has a proposal /
//     is published is refused (409) unless the caller passes { force: true }.
//     A forced rerun wipes the previous 'solver' assignments and redoes them;
//     'manuell' and 'tausch' assignments are always left untouched.
// =============================================================================


import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  dauerStunden,
  solve,
  type Bedarf,
  type Instanz,
  type IsoDate,
  type Mitarbeiter,
  type SolverInput,
  type SolverResult,
  type Time,
  type Uuid,
} from "./solver.ts";

// 'YYYY-MM' of a date, and the last calendar day of such a month.
const monthKey = (d: IsoDate) => d.slice(0, 7);
function lastDayOfMonth(ym: string): IsoDate {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

// ISO date shifted by n days (n may be negative).
function addDays(d: IsoDate, n: number): IsoDate {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// ----------------------------------------------------------------------------
// Types used only by this I/O layer
// ----------------------------------------------------------------------------
interface Zyklus {
  id: Uuid;
  betrieb_id: Uuid;
  zeitraum_start: IsoDate;
  zeitraum_ende: IsoDate;
}

interface Vorlage {
  id: Uuid;
  wochentag: number; // 0 = Montag ... 6 = Sonntag
  start_zeit: Time;
  end_zeit: Time;
}


// ----------------------------------------------------------------------------
// DB I/O — load everything the solver needs, then persist the result.
// ----------------------------------------------------------------------------

// weekday of an ISO date in the app's convention: 0 = Montag ... 6 = Sonntag
function wochentagMontagBasis(datum: IsoDate): number {
  const d = new Date(datum + "T00:00:00Z");
  return (d.getUTCDay() + 6) % 7; // JS: 0=Sonntag -> shift so Montag=0
}

function* datumsRange(start: IsoDate, ende: IsoDate): Generator<IsoDate> {
  const d = new Date(start + "T00:00:00Z");
  const last = new Date(ende + "T00:00:00Z");
  while (d <= last) {
    yield d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 1);
  }
}

// Phase 1: create schicht_instanzen from templates for the cycle's range (idempotent).
async function materialisiereInstanzen(db: SupabaseClient, zyklus: Zyklus): Promise<Instanz[]> {
  const { data: vorlagen } = await db
    .from("schicht_vorlagen")
    .select("id, wochentag, start_zeit, end_zeit")
    .eq("betrieb_id", zyklus.betrieb_id)
    .eq("aktiv", true);

  const { data: vorhandene } = await db
    .from("schicht_instanzen")
    .select("id, schicht_vorlage_id, datum, start_zeit, end_zeit")
    .eq("planungszyklus_id", zyklus.id);

  const existiert = new Set((vorhandene ?? []).map((i) => `${i.schicht_vorlage_id}|${i.datum}`));
  const neu: any[] = [];
  for (const datum of datumsRange(zyklus.zeitraum_start, zyklus.zeitraum_ende)) {
    const wt = wochentagMontagBasis(datum);
    for (const v of (vorlagen ?? []) as Vorlage[]) {
      if (v.wochentag !== wt) continue;
      if (existiert.has(`${v.id}|${datum}`)) continue;
      neu.push({
        betrieb_id: zyklus.betrieb_id,
        schicht_vorlage_id: v.id,
        planungszyklus_id: zyklus.id,
        datum,
        start_zeit: v.start_zeit,
        end_zeit: v.end_zeit,
        status: "geplant",
      });
    }
  }

  if (neu.length > 0) {
    const { data: eingefuegt, error } = await db
      .from("schicht_instanzen")
      .insert(neu)
      .select("id, schicht_vorlage_id, datum, start_zeit, end_zeit");
    if (error) throw new Error(`Instanzen anlegen fehlgeschlagen: ${error.message}`);
    return [...(vorhandene ?? []), ...(eingefuegt ?? [])] as Instanz[];
  }
  return (vorhandene ?? []) as Instanz[];
}

// Phase 2: gather everything the pure solver needs.
async function ladeSolverInput(db: SupabaseClient, zyklus: Zyklus, instanzen: Instanz[]): Promise<SolverInput> {
  const instanzIds = instanzen.map((i) => i.id);
  const vorlageIds = [...new Set(instanzen.map((i) => i.schicht_vorlage_id))];

  const [
    mitarbeiterRes,
    betriebeRes,
    aktiveRollenRes,
    rollenRes,
    urlaubRes,
    vorliebeRes,
    tagesvorliebeRes,
    vorlageBedarfRes,
    instanzBedarfRes,
  ] = await Promise.all([
    // Invited staff (status 'eingeladen') are scheduled exactly like active ones —
    // the chef plans around them before they have finished onboarding.
    db.from("mitarbeiter").select("id, auth_id, soll_stunden, max_stunden_hart, ueberstunden_saldo, toleranz_ueberstunden")
      .eq("betrieb_id", zyklus.betrieb_id).in("status", ["aktiv", "eingeladen"]).eq("rolle_typ", "mitarbeiter"),
    db.from("betriebe").select("land").eq("id", zyklus.betrieb_id).single(),
    db.from("rollen").select("id").eq("betrieb_id", zyklus.betrieb_id).eq("aktiv", true),
    db.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", zyklus.betrieb_id),
    db.from("urlaub").select("mitarbeiter_id, von, bis")
      .eq("betrieb_id", zyklus.betrieb_id).eq("status", "approved")
      .lte("von", zyklus.zeitraum_ende).gte("bis", zyklus.zeitraum_start),
    db.from("mitarbeiter_schicht_vorlieben").select("mitarbeiter_id, schicht_vorlage_id, praeferenz")
      .eq("betrieb_id", zyklus.betrieb_id),
    db.from("mitarbeiter_schicht_tagesvorlieben").select("mitarbeiter_id, schicht_vorlage_id, datum, praeferenz")
      .eq("betrieb_id", zyklus.betrieb_id).is("geloescht_am", null)
      .gte("datum", zyklus.zeitraum_start).lte("datum", zyklus.zeitraum_ende),
    db.from("schicht_vorlage_mindestbesetzung").select("schicht_vorlage_id, rolle_id, mindestanzahl")
      .eq("betrieb_id", zyklus.betrieb_id).in("schicht_vorlage_id", vorlageIds.length ? vorlageIds : ["00000000-0000-0000-0000-000000000000"]),
    db.from("schicht_instanz_mindestbesetzung").select("schicht_instanz_id, rolle_id, mindestanzahl")
      .eq("betrieb_id", zyklus.betrieb_id).in("schicht_instanz_id", instanzIds.length ? instanzIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  // Legal limits for the business's country (gesetzliche_parameter by betriebe.land).
  const land = (betriebeRes.data as any)?.land;
  const { data: paramRow } = await db.from("gesetzliche_parameter")
    .select("mindestruhezeit_stunden, hoechstarbeitszeit_tag_stunden, hoechstarbeitszeit_woche_stunden")
    .eq("land", land).maybeSingle();
  if (!paramRow) throw new Error(`Keine gesetzlichen Parameter fuer Land ${land} hinterlegt`);
  const gesetzlich = {
    mindestruhezeit: Number(paramRow.mindestruhezeit_stunden),
    maxTagStunden: Number(paramRow.hoechstarbeitszeit_tag_stunden),
    maxWocheStunden: Number(paramRow.hoechstarbeitszeit_woche_stunden),
  };

  // ---- Historical overtime (negative fairness weight in the solver) ----------
  // Overtime per employee = opening balance (ueberstunden_saldo) + Σ over every
  // FULL calendar month ending on/before the accounting cutoff (abrechnung_bis)
  // of (hours actually worked that month − monthly soll_stunden). Emergency
  // (non-attended) shifts count only when the business opted in.
  const [settingsRes, histInstRes] = await Promise.all([
    db.from("betriebs_einstellungen")
      .select("abrechnung_bis, notfall_stunden_anrechnen")
      .eq("betrieb_id", zyklus.betrieb_id).maybeSingle(),
    db.from("schicht_instanzen").select("id, datum, start_zeit, end_zeit")
      .eq("betrieb_id", zyklus.betrieb_id),
  ]);
  const cutoff = (settingsRes.data as any)?.abrechnung_bis as IsoDate | null ?? null;
  const countEmergency = (settingsRes.data as any)?.notfall_stunden_anrechnen ?? false;

  const ueberstundenProMitarbeiter = new Map<Uuid, number>();
  if (cutoff) {
    const histInst = new Map<Uuid, { datum: IsoDate; start_zeit: Time; end_zeit: Time }>(
      (histInstRes.data ?? []).map((i: any) => [i.id, i]),
    );
    // Only need assignments for instances up to the cutoff month.
    const { data: histZuw } = await db.from("schicht_zuweisungen")
      .select("mitarbeiter_id, schicht_instanz_id, attendet")
      .eq("betrieb_id", zyklus.betrieb_id);
    // id -> 'YYYY-MM' -> worked hours
    const monthly = new Map<Uuid, Map<string, number>>();
    for (const z of histZuw ?? []) {
      const inst = histInst.get(z.schicht_instanz_id);
      if (!inst) continue;
      if (z.attendet === false && !countEmergency) continue;
      const ym = monthKey(inst.datum);
      if (lastDayOfMonth(ym) > cutoff) continue; // month not fully within the period
      const perMonth = monthly.get(z.mitarbeiter_id) ?? new Map<string, number>();
      perMonth.set(ym, (perMonth.get(ym) ?? 0) + dauerStunden(inst.start_zeit, inst.end_zeit));
      monthly.set(z.mitarbeiter_id, perMonth);
    }
    for (const m of (mitarbeiterRes.data ?? []) as any[]) {
      let ot = Number(m.ueberstunden_saldo ?? 0);
      const soll = Number(m.soll_stunden ?? 0);
      for (const [, hrs] of monthly.get(m.id) ?? []) ot += hrs - soll;
      ueberstundenProMitarbeiter.set(m.id, ot);
    }
  } else {
    // No accounting period → overtime is just the stored opening balance.
    for (const m of (mitarbeiterRes.data ?? []) as any[]) {
      ueberstundenProMitarbeiter.set(m.id, Number(m.ueberstunden_saldo ?? 0));
    }
  }

  // ---- Pre-existing shifts (seed overlap / rest / day-week / cycle checks) ----
  // The solver must never propose a row the HC trigger would reject, so it needs
  // to see the shifts each employee ALREADY holds: manuell/tausch assignments on
  // this cycle, and any assignment on neighbouring cycles/dates. We load a window
  // of ±2 days around the cycle (the rest-check reach) and drop only the stale
  // solver rows for THIS cycle's instances (they get regenerated below).
  const cycleInstanzIds = new Set(instanzen.map((i) => i.id));
  const windowVon = addDays(zyklus.zeitraum_start, -2);
  const windowBis = addDays(zyklus.zeitraum_ende, 2);
  const instById = new Map<Uuid, { datum: IsoDate; start_zeit: Time; end_zeit: Time }>(
    (histInstRes.data ?? []).map((i: any) => [i.id, i]),
  );
  const { data: bestehendeZuw } = await db.from("schicht_zuweisungen")
    .select("mitarbeiter_id, schicht_instanz_id, quelle")
    .eq("betrieb_id", zyklus.betrieb_id);

  const vorbelegung = new Map<Uuid, Instanz[]>();
  const startSaldo = new Map<Uuid, number>();
  for (const z of bestehendeZuw ?? []) {
    // Skip the stale solver rows for this cycle — we're about to redo them.
    if (cycleInstanzIds.has(z.schicht_instanz_id) && z.quelle === "solver") continue;
    const inst = instById.get(z.schicht_instanz_id);
    if (!inst) continue;
    if (inst.datum < windowVon || inst.datum > windowBis) continue; // outside rest reach
    const held: Instanz = {
      id: z.schicht_instanz_id,
      schicht_vorlage_id: "", // unused for legal checks
      datum: inst.datum,
      start_zeit: inst.start_zeit,
      end_zeit: inst.end_zeit,
    };
    if (!vorbelegung.has(z.mitarbeiter_id)) vorbelegung.set(z.mitarbeiter_id, []);
    vorbelegung.get(z.mitarbeiter_id)!.push(held);
    // Count toward the monthly saldo only if it falls inside the cycle itself.
    if (inst.datum >= zyklus.zeitraum_start && inst.datum <= zyklus.zeitraum_ende) {
      startSaldo.set(
        z.mitarbeiter_id,
        (startSaldo.get(z.mitarbeiter_id) ?? 0) + dauerStunden(inst.start_zeit, inst.end_zeit),
      );
    }
  }

  const rollenProMitarbeiter = new Map<Uuid, Set<Uuid>>();
  for (const r of rollenRes.data ?? []) {
    if (!rollenProMitarbeiter.has(r.mitarbeiter_id)) rollenProMitarbeiter.set(r.mitarbeiter_id, new Set());
    rollenProMitarbeiter.get(r.mitarbeiter_id)!.add(r.rolle_id);
  }

  const urlaubProMitarbeiter = new Map<Uuid, { von: IsoDate; bis: IsoDate }[]>();
  for (const u of urlaubRes.data ?? []) {
    if (!urlaubProMitarbeiter.has(u.mitarbeiter_id)) urlaubProMitarbeiter.set(u.mitarbeiter_id, []);
    urlaubProMitarbeiter.get(u.mitarbeiter_id)!.push({ von: u.von, bis: u.bis });
  }

  const vorliebe = new Map<string, "gerne" | "ungerne">();
  for (const p of vorliebeRes.data ?? []) vorliebe.set(`${p.mitarbeiter_id}|${p.schicht_vorlage_id}`, p.praeferenz);

  const tagesvorliebe = new Map<string, "gerne" | "ungerne">();
  for (const p of tagesvorliebeRes.data ?? []) {
    tagesvorliebe.set(`${p.mitarbeiter_id}|${p.schicht_vorlage_id}|${p.datum}`, p.praeferenz);
  }

  // How many preferences (standing + per-date, gerne AND ungerne) each employee
  // filed — used to weight the wishes of a light-preferrer more heavily.
  const nSubmitted = new Map<Uuid, number>();
  for (const p of vorliebeRes.data ?? []) {
    nSubmitted.set(p.mitarbeiter_id, (nSubmitted.get(p.mitarbeiter_id) ?? 0) + 1);
  }
  for (const p of tagesvorliebeRes.data ?? []) {
    nSubmitted.set(p.mitarbeiter_id, (nSubmitted.get(p.mitarbeiter_id) ?? 0) + 1);
  }

  // Only ACTIVE roles may be staffed — the DB rejects assigning anyone to an
  // inactive role (HC-3), so demand for inactive roles is dropped up front.
  const aktiveRollen = new Set<Uuid>((aktiveRollenRes.data ?? []).map((r: any) => r.id));

  // Bedarf: start from template defaults, then let instance-level rows override per (instance, role).
  const bedarfProVorlage = new Map<Uuid, Bedarf[]>();
  for (const b of vorlageBedarfRes.data ?? []) {
    if (!aktiveRollen.has(b.rolle_id)) continue;
    if (!bedarfProVorlage.has(b.schicht_vorlage_id)) bedarfProVorlage.set(b.schicht_vorlage_id, []);
    bedarfProVorlage.get(b.schicht_vorlage_id)!.push({ rolle_id: b.rolle_id, mindestanzahl: b.mindestanzahl });
  }
  const instanzOverride = new Map<Uuid, Map<Uuid, number>>();
  for (const b of instanzBedarfRes.data ?? []) {
    if (!aktiveRollen.has(b.rolle_id)) continue;
    if (!instanzOverride.has(b.schicht_instanz_id)) instanzOverride.set(b.schicht_instanz_id, new Map());
    instanzOverride.get(b.schicht_instanz_id)!.set(b.rolle_id, b.mindestanzahl);
  }
  const bedarfProInstanz = new Map<Uuid, Bedarf[]>();
  for (const inst of instanzen) {
    const base = new Map<Uuid, number>();
    for (const b of bedarfProVorlage.get(inst.schicht_vorlage_id) ?? []) base.set(b.rolle_id, b.mindestanzahl);
    for (const [rolle, anzahl] of instanzOverride.get(inst.id) ?? new Map()) base.set(rolle, anzahl);
    bedarfProInstanz.set(inst.id, [...base].map(([rolle_id, mindestanzahl]) => ({ rolle_id, mindestanzahl })));
  }

  return {
    instanzen,
    bedarfProInstanz,
    mitarbeiter: ((mitarbeiterRes.data ?? []) as any[]).map((m) => ({
      id: m.id,
      auth_id: m.auth_id ?? null,
      soll_stunden: m.soll_stunden,
      max_stunden_hart: m.max_stunden_hart,
      ueberstunden: ueberstundenProMitarbeiter.get(m.id) ?? 0,
      toleranz_ueberstunden: Number(m.toleranz_ueberstunden ?? 0),
      n_submitted: nSubmitted.get(m.id) ?? 0,
    })) as Mitarbeiter[],
    rollenProMitarbeiter,
    urlaubProMitarbeiter,
    vorliebe,
    tagesvorliebe,
    vorbelegung,
    startSaldo,
    gesetzlich,
  };
}

// Phase 4: persist. Wipe previous solver output (leave manuell/tausch), insert new.
// The HC-1..HC-5 trigger fires on every insert — even for the service-role client.
// The solver mirrors those rules, so a rejection should never happen; but to make
// priority #1 (never break a rule) robust against any edge the solver can't see
// (e.g. an overlap with a same-auth peer in ANOTHER business), we insert row by
// row: a rejected row is simply skipped and reported, instead of failing the whole
// batch and losing every valid assignment.
async function speichereZuweisungen(
  db: SupabaseClient,
  zyklus: Zyklus,
  instanzen: Instanz[],
  result: SolverResult,
): Promise<{ eingefuegt: number; abgelehnt: { zuweisung: SolverResult["zuweisungen"][number]; grund: string }[] }> {
  const instanzIds = instanzen.map((i) => i.id);
  if (instanzIds.length > 0) {
    await db.from("schicht_zuweisungen").delete()
      .eq("quelle", "solver").in("schicht_instanz_id", instanzIds);
  }
  const rows = result.zuweisungen.map((z) => ({ betrieb_id: zyklus.betrieb_id, quelle: "solver", ...z }));
  if (rows.length === 0) return { eingefuegt: 0, abgelehnt: [] };

  // Fast path: one bulk insert. If it succeeds we're done.
  const bulk = await db.from("schicht_zuweisungen").insert(rows);
  if (!bulk.error) return { eingefuegt: rows.length, abgelehnt: [] };

  // Slow path: something was rejected — redo row by row so the valid ones land.
  let eingefuegt = 0;
  const abgelehnt: { zuweisung: SolverResult["zuweisungen"][number]; grund: string }[] = [];
  for (let i = 0; i < rows.length; i++) {
    const { error } = await db.from("schicht_zuweisungen").insert(rows[i]);
    if (error) abgelehnt.push({ zuweisung: result.zuweisungen[i], grund: error.message });
    else eingefuegt++;
  }
  return { eingefuegt, abgelehnt };
}

// ----------------------------------------------------------------------------
// HTTP entrypoint
// ----------------------------------------------------------------------------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handler(req: Request): Promise<Response> {
  // CORS preflight (browsers / Expo Web send this before the real POST).
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { planungszyklus_id, force } = await req.json();
    if (!planungszyklus_id) return json({ error: "planungszyklus_id erforderlich" }, 400);

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: zyklus, error: zErr } = await db
      .from("planungszyklen")
      .select("id, betrieb_id, zeitraum_start, zeitraum_ende, status")
      .eq("id", planungszyklus_id)
      .single();
    if (zErr || !zyklus) return json({ error: "Planungszyklus nicht gefunden" }, 404);

    // Authorize the CALLER: they must be the chef of this cycle's business. We
    // check with a user-scoped client so ist_chef() sees their auth.uid(); the
    // service-role client above is only for the privileged reads/writes below.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: istChef } = await caller.rpc("ist_chef", { p_betrieb_id: zyklus.betrieb_id });
    if (istChef !== true) return json({ error: "Nicht berechtigt" }, 403);

    // Guard against reruns. Only a fresh cycle may be solved; anything already
    // running / proposed / published is refused unless { force: true }.
    const startbar = zyklus.status === "offen" || zyklus.status === "deadline_erreicht";
    if (!startbar && !force) {
      return json({ error: `Zyklus bereits bearbeitet (Status: ${zyklus.status})`, status: zyklus.status }, 409);
    }

    // mark solver as running
    await db.from("planungszyklen").update({
      status: "solver_laeuft",
      solver_gestartet_am: new Date().toISOString(),
      solver_methode: "moderate",
      solver_fehler: null,
    }).eq("id", zyklus.id);

    try {
      const instanzen = await materialisiereInstanzen(db, zyklus as Zyklus);
      const input = await ladeSolverInput(db, zyklus as Zyklus, instanzen);
      const result = solve(input);
      const persist = await speichereZuweisungen(db, zyklus as Zyklus, instanzen, result);

      await db.from("planungszyklen").update({
        status: "vorschlag_bereit",
        solver_beendet_am: new Date().toISOString(),
      }).eq("id", zyklus.id);

      return json({
        ok: true,
        instanzen: instanzen.length,
        zuweisungen: persist.eingefuegt,
        fehlbesetzungen: result.fehlbesetzungen,
        // Rows the HC trigger rejected despite the solver's checks (should be empty).
        abgelehnt: persist.abgelehnt,
      });
    } catch (inner) {
      await db.from("planungszyklen").update({
        status: zyklus.status, // restore the pre-run status on failure
        solver_fehler: String(inner),
        solver_beendet_am: new Date().toISOString(),
      }).eq("id", zyklus.id);
      return json({ error: String(inner) }, 500);
    }
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

Deno.serve(handler);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
