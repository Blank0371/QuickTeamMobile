// =============================================================================
// PURE SOLVER — no DB, no network, no Deno APIs. This is the algorithm itself,
// kept separate from I/O so it can be unit-tested / run in the harness without
// pulling in supabase-js. index.ts loads the data and calls solve(); harness.ts
// feeds it a hand-made scenario.
//
// See index.ts for the full description of hard constraints and soft ranking.
// =============================================================================

export type Uuid = string;
export type IsoDate = string; // 'YYYY-MM-DD'
export type Time = string;    // 'HH:MM:SS'

export interface Instanz {
  id: Uuid;
  schicht_vorlage_id: Uuid;
  datum: IsoDate;
  start_zeit: Time;
  end_zeit: Time;
}

// mindestanzahl of a given role required by a shift (template default or instance override)
export interface Bedarf {
  rolle_id: Uuid;
  mindestanzahl: number;
}

export interface Mitarbeiter {
  id: Uuid;
  // The account that controls this mitarbeiter. Two mitarbeiter that share an
  // auth_id are STILL treated as two independent people for hours, preferences
  // and fairness — the DB trigger only unions them for the overlap/rest checks
  // (HC-2/HC-4), so we mirror exactly that and nothing more.
  auth_id?: string | null;
  soll_stunden: number | null;      // optimal MONTHLY hours = the per-cycle target
  max_stunden_hart: number | null;  // hard MONTHLY (cycle) cap; null → no cap
  // Historical overtime accrued up to the accounting cutoff (opening balance +
  // Σ over past full months of worked − soll). Optional; defaults to 0.
  // The more overtime, the less likely they are to be given further shifts.
  ueberstunden?: number;
  // Overtime is only penalized once it exceeds this tolerance band. Defaults to 0.
  toleranz_ueberstunden?: number;
  // How many preference rows this employee filed (standing + per-date, gerne and
  // ungerne alike). Someone who filed FEWER preferences has each one weighted
  // more heavily — their few wishes matter more than a heavy-preferrer's many.
  n_submitted?: number;
}

// Everything the pure solver needs, already fetched from the DB.
export interface SolverInput {
  instanzen: Instanz[];
  // required roles+counts per instance id
  bedarfProInstanz: Map<Uuid, Bedarf[]>;
  mitarbeiter: Mitarbeiter[];
  // role membership: mitarbeiter_id -> set of role ids
  rollenProMitarbeiter: Map<Uuid, Set<Uuid>>;
  // approved holidays: mitarbeiter_id -> array of {von,bis}
  urlaubProMitarbeiter: Map<Uuid, { von: IsoDate; bis: IsoDate }[]>;
  // standing preference: `${mitarbeiter_id}|${vorlage_id}` -> 'gerne' | 'ungerne'
  vorliebe: Map<string, "gerne" | "ungerne">;
  // per-date preference override: `${mitarbeiter_id}|${vorlage_id}|${datum}` -> 'gerne' | 'ungerne'
  tagesvorliebe: Map<string, "gerne" | "ungerne">;
  // Shifts the employee ALREADY holds (manuell / tausch assignments, other cycles),
  // loaded for the cycle window ± a rest-buffer. Seeds overlap/rest/day/week checks
  // so the solver never proposes a row the trigger would reject.
  vorbelegung: Map<Uuid, Instanz[]>;
  // Hours the employee already has WITHIN this cycle (from vorbelegung that falls
  // inside the cycle range). Seeds the monthly saldo used for HC-5 + fairness.
  startSaldo: Map<Uuid, number>;
  // Legal limits for the business's country (gesetzliche_parameter by betriebe.land).
  gesetzlich: { mindestruhezeit: number; maxTagStunden: number; maxWocheStunden: number };
}

export interface Zuweisung {
  schicht_instanz_id: Uuid;
  mitarbeiter_id: Uuid;
  rolle_id: Uuid;
}

export interface Fehlbesetzung {
  schicht_instanz_id: Uuid;
  datum: IsoDate;
  rolle_id: Uuid;
  benoetigt: number;
  besetzt: number;
}

export interface SolverResult {
  zuweisungen: Zuweisung[];
  fehlbesetzungen: Fehlbesetzung[];
}

// ----------------------------------------------------------------------------
// SOFT-RANKING WEIGHTS. Priority: preference > überstunden > fairness.
// Preference is self-limiting (see COST): its pull decays as someone gets the
// shifts they want, and its push grows as someone is forced onto shifts they
// dislike — so "too many preferences" is naturally reined back in by the rest.
// ----------------------------------------------------------------------------
const W_PREF = 1.0; // #1 soft priority: honour gerne, avoid ungerne
const W_OT = 0.6;   // #2 soft priority: keep people off overtime
const W_FAIR = 0.3; // #3 soft priority: pull everyone toward their monthly soll

// Fallback monthly hours used ONLY to normalize the fairness / overtime terms
// when an employee has no soll_stunden set (currently the common case). Without
// it, a null soll would collapse the denominator to 1 and let raw hour counts
// dominate preferences. ~173h ≈ a full-time month. It is a SCALE only — a null
// soll still means "no real target", so fairness degrades to gentle
// least-hours-first balancing rather than steering toward 173h.
const FALLBACK_SOLL = 173;

// ----------------------------------------------------------------------------
// Small time helpers
// ----------------------------------------------------------------------------

// hours between two 'HH:MM:SS' times; if end <= start we assume it crosses midnight
export function dauerStunden(start: Time, end: Time): number {
  const toMin = (t: Time) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  let diff = toMin(end) - toMin(start);
  if (diff <= 0) diff += 24 * 60; // overnight shift
  return diff / 60;
}

function preferenz(
  input: SolverInput,
  mitarbeiterId: Uuid,
  vorlageId: Uuid,
  datum: IsoDate,
): "gerne" | "ungerne" | null {
  const tag = input.tagesvorliebe.get(`${mitarbeiterId}|${vorlageId}|${datum}`);
  if (tag) return tag; // per-date choice wins over the standing preference
  return input.vorliebe.get(`${mitarbeiterId}|${vorlageId}`) ?? null;
}

function istImUrlaub(input: SolverInput, mitarbeiterId: Uuid, datum: IsoDate): boolean {
  const perioden = input.urlaubProMitarbeiter.get(mitarbeiterId);
  if (!perioden) return false;
  return perioden.some((p) => datum >= p.von && datum <= p.bis);
}

// Absolute [start, end] of a shift in ms, handling overnight (end <= start → +1 day).
function bereichMs(datum: IsoDate, start: Time, end: Time): [number, number] {
  const s = new Date(`${datum}T${start}`).getTime();
  let e = new Date(`${datum}T${end}`).getTime();
  if (e <= s) e += 24 * 3600 * 1000;
  return [s, e];
}

// Monday-based week key for a date (matches Postgres date_trunc('week')).
function wochenStart(datum: IsoDate): string {
  const d = new Date(`${datum}T00:00:00`);
  const tag = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - tag);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ----------------------------------------------------------------------------
// THE SOLVER — pure function. This is the part to scrutinize.
// ----------------------------------------------------------------------------
export function solve(input: SolverInput): SolverResult {
  const zuweisungen: Zuweisung[] = [];
  const fehlbesetzungen: Fehlbesetzung[] = [];

  // Running per-employee state across the whole cycle.
  const stundenSaldo = new Map<Uuid, number>();            // in-cycle hours (fairness + HC-5)
  const belegtProMitarbeiter = new Map<Uuid, Instanz[]>(); // every shift held (for legal checks)
  const nGerne = new Map<Uuid, number>();                  // gerne shifts granted so far
  const nUngerne = new Map<Uuid, number>();                // ungerne shifts forced so far

  for (const m of input.mitarbeiter) {
    stundenSaldo.set(m.id, input.startSaldo.get(m.id) ?? 0);
    belegtProMitarbeiter.set(m.id, [...(input.vorbelegung.get(m.id) ?? [])]);
    nGerne.set(m.id, 0);
    nUngerne.set(m.id, 0);
  }

  // Team-average number of preferences filed — the reference point for the
  // "fewer wishes weigh more" factor. Guarded against an all-zero team.
  const submittedWerte = input.mitarbeiter.map((m) => m.n_submitted ?? 0);
  const avgSubmitted =
    submittedWerte.length > 0
      ? submittedWerte.reduce((s, n) => s + n, 0) / submittedWerte.length
      : 0;
  // fewer filed → factor > 1 (their wish counts more); more filed → < 1. Clamped.
  const gSub = (m: Mitarbeiter) => {
    if (avgSubmitted <= 0) return 1;
    const n = Math.max(m.n_submitted ?? 0, 1);
    return Math.min(2, Math.max(0.5, avgSubmitted / n));
  };

  // Auth peers: mitarbeiter ids that share a non-null auth_id (incl. self). Only
  // used to union the overlap/rest window, exactly like the DB trigger.
  const authPeers = new Map<Uuid, Uuid[]>();
  const byAuth = new Map<string, Uuid[]>();
  for (const m of input.mitarbeiter) {
    if (m.auth_id) {
      if (!byAuth.has(m.auth_id)) byAuth.set(m.auth_id, []);
      byAuth.get(m.auth_id)!.push(m.id);
    }
  }
  for (const m of input.mitarbeiter) {
    authPeers.set(m.id, m.auth_id ? byAuth.get(m.auth_id)! : [m.id]);
  }

  const { mindestruhezeit, maxTagStunden, maxWocheStunden } = input.gesetzlich;
  const ruheMs = mindestruhezeit * 3600 * 1000;

  // Process shifts chronologically so earlier days seed the fairness saldo.
  const instanzen = [...input.instanzen].sort((a, b) =>
    a.datum === b.datum ? a.start_zeit.localeCompare(b.start_zeit) : a.datum.localeCompare(b.datum)
  );

  for (const inst of instanzen) {
    const dauer = dauerStunden(inst.start_zeit, inst.end_zeit);
    const bedarfe = input.bedarfProInstanz.get(inst.id) ?? [];
    const [ns, ne] = bereichMs(inst.datum, inst.start_zeit, inst.end_zeit);
    const wk = wochenStart(inst.datum);

    for (const bedarf of bedarfe) {
      let besetzt = 0;
      // Track who is already on THIS instance so we don't assign one person twice.
      const schonAufInstanz = new Set(
        zuweisungen.filter((z) => z.schicht_instanz_id === inst.id).map((z) => z.mitarbeiter_id),
      );

      // Running team mean of in-cycle hours — the reference point for relative
      // fairness when no monthly soll is set. Recomputed per slot (the quick
      // method runs on small teams) because saldi shift as we assign.
      const alleSaldos = input.mitarbeiter.map((m) => stundenSaldo.get(m.id) ?? 0);
      const teamMittel =
        alleSaldos.length > 0 ? alleSaldos.reduce((s, h) => s + h, 0) / alleSaldos.length : 0;

      for (let slot = 0; slot < bedarf.mindestanzahl; slot++) {
        // Build the eligible candidate pool for this one slot.
        const kandidaten = input.mitarbeiter.filter((m) => {
          if (schonAufInstanz.has(m.id)) return false;
          // Hard (HC-3): holds the (active) role.
          if (!input.rollenProMitarbeiter.get(m.id)?.has(bedarf.rolle_id)) return false;
          // Hard (HC-1): not on a confirmed holiday. Availability is ignored.
          if (istImUrlaub(input, m.id, inst.datum)) return false;

          // HC-2 (no overlap) + HC-4 (rest) — unioned over auth peers.
          for (const peerId of authPeers.get(m.id) ?? [m.id]) {
            for (const h of belegtProMitarbeiter.get(peerId) ?? []) {
              const [hs, he] = bereichMs(h.datum, h.start_zeit, h.end_zeit);
              if (ns < he && hs < ne) return false;          // overlap
              const luecke = ns >= he ? ns - he : hs - ne;   // gap between them
              if (luecke < ruheMs) return false;             // too little rest
            }
          }

          // Legal daily / weekly max hours are per-mitarbeiter (not auth-unioned).
          const meine = belegtProMitarbeiter.get(m.id) ?? [];
          const tagSumme = meine
            .filter((h) => h.datum === inst.datum)
            .reduce((s, h) => s + dauerStunden(h.start_zeit, h.end_zeit), 0);
          if (tagSumme + dauer > maxTagStunden) return false;

          const wocheSumme = meine
            .filter((h) => wochenStart(h.datum) === wk)
            .reduce((s, h) => s + dauerStunden(h.start_zeit, h.end_zeit), 0);
          if (wocheSumme + dauer > maxWocheStunden) return false;

          // HC-5: MONTHLY (cycle) cap — max_stunden_hart; null = no cap.
          const cap = m.max_stunden_hart ?? Infinity;
          if ((stundenSaldo.get(m.id) ?? 0) + dauer > cap) return false;
          return true;
        });

        if (kandidaten.length === 0) break; // slot cannot be filled

        // Score candidates. LOWER cost = picked first.
        const cost = (m: Mitarbeiter): number => {
          const pref = preferenz(input, m.id, inst.schicht_vorlage_id, inst.datum);
          let prefTerm = 0;
          if (pref === "gerne") {
            // reward, decays as they get more of what they want
            prefTerm = -W_PREF * gSub(m) / (1 + (nGerne.get(m.id) ?? 0));
          } else if (pref === "ungerne") {
            // penalty, grows as they are forced onto more disliked shifts, so the
            // person who has eaten the fewest unwanted shifts takes this one
            prefTerm = W_PREF * gSub(m) * (1 + (nUngerne.get(m.id) ?? 0));
          }

          // target = the real monthly goal; scale = a stable normalizer so the
          // overtime term stays comparable to the preference term.
          const target = m.soll_stunden ?? 0;
          const scale = target > 0 ? target : FALLBACK_SOLL;
          const otPen = Math.max(0, (m.ueberstunden ?? 0) - (m.toleranz_ueberstunden ?? 0));
          const otTerm = W_OT * (otPen / scale);

          // Fairness: how far this shift would push the employee ABOVE where they
          // should be — their soll if set, otherwise the team's current mean load
          // (relative balancing when nobody has a target). Normalized by that same
          // reference so "twice the load" reads the same at any absolute hour count,
          // and made PROGRESSIVE: being a little over is a gentle nudge, being far
          // over grows quadratically, so an already-overloaded person's priority
          // drops off steeply and can outweigh a preference at the extremes.
          const projected = (stundenSaldo.get(m.id) ?? 0) + dauer;
          const bezug = target > 0 ? target : Math.max(teamMittel, dauer);
          const rel = (projected - (target > 0 ? target : teamMittel)) / bezug;
          const fairTerm = W_FAIR * (rel > 0 ? rel * rel : rel);

          return prefTerm + otTerm + fairTerm;
        };

        kandidaten.sort((a, b) => {
          const ca = cost(a);
          const cb = cost(b);
          if (ca !== cb) return ca - cb;
          // deterministic tie-break: fewest in-cycle hours, then stable by id
          const sa = stundenSaldo.get(a.id) ?? 0;
          const sb = stundenSaldo.get(b.id) ?? 0;
          if (sa !== sb) return sa - sb;
          return a.id.localeCompare(b.id);
        });

        const gewaehlt = kandidaten[0];
        const prefG = preferenz(input, gewaehlt.id, inst.schicht_vorlage_id, inst.datum);
        zuweisungen.push({
          schicht_instanz_id: inst.id,
          mitarbeiter_id: gewaehlt.id,
          rolle_id: bedarf.rolle_id,
        });
        schonAufInstanz.add(gewaehlt.id);
        stundenSaldo.set(gewaehlt.id, (stundenSaldo.get(gewaehlt.id) ?? 0) + dauer);
        belegtProMitarbeiter.set(gewaehlt.id, [...(belegtProMitarbeiter.get(gewaehlt.id) ?? []), inst]);
        if (prefG === "gerne") nGerne.set(gewaehlt.id, (nGerne.get(gewaehlt.id) ?? 0) + 1);
        if (prefG === "ungerne") nUngerne.set(gewaehlt.id, (nUngerne.get(gewaehlt.id) ?? 0) + 1);
        besetzt++;
      }

      if (besetzt < bedarf.mindestanzahl) {
        fehlbesetzungen.push({
          schicht_instanz_id: inst.id,
          datum: inst.datum,
          rolle_id: bedarf.rolle_id,
          benoetigt: bedarf.mindestanzahl,
          besetzt,
        });
      }
    }
  }

  return { zuweisungen, fehlbesetzungen };
}
