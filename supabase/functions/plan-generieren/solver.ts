// =============================================================================
// PURE SOLVER — no DB, no network, no Deno APIs. This is the algorithm itself,
// kept separate from I/O so it can be unit-tested / run in a harness without
// pulling in supabase-js. index.ts loads the data and calls solve(); harness.ts
// and scale-harness.ts feed it hand-made / generated scenarios.
//
// -----------------------------------------------------------------------------
// ALGORITHM (the "moderate" method): FEASIBILITY-FIRST FILL, then LOCAL SEARCH.
//
//   Phase A — fill the roster, hardest shifts first.
//     Every (instance, role) opening becomes a "slot". We rank shift instances
//     by how HARD they are to staff (few qualified/available people, tight legal
//     window) and fill the hardest first, so scarce specialists are locked in
//     before easy shifts consume them. For each slot we pick the eligible
//     candidate with the smallest MARGINAL objective delta. A slot with no
//     eligible candidate is left open and reported as a Fehlbesetzung.
//     Coverage is the hard priority: this phase only ever ADDS assignments.
//
//   Phase B — hill-climb toward a better roster without breaking anything.
//     Repeatedly look for a SWAP (two employees trade their two shifts) that
//     lowers the global objective while keeping every hard constraint satisfied,
//     and apply it. Stop when a full pass finds no improving move (local optimum)
//     or a pass budget is hit. Swaps never change how many slots are filled, so
//     feasibility/coverage from phase A is preserved as an invariant.
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
//   Pre-existing manuell/tausch assignments (vorbelegung / startSaldo) seed all
//   of the above.
//
// GLOBAL OBJECTIVE (a single scalar, lower = better) — priority preference >
// überstunden > fairness. Because phase B compares whole rosters, the objective
// is defined on the FINAL per-employee tallies, not on assignment order:
//   - Preference: concave reward for granted gerne shifts (sqrt → each further
//     wish is worth less) and convex penalty for forced ungerne shifts (square →
//     each further disliked shift hurts more, so the burden spreads). Someone
//     who filed FEWER preferences has both scaled up (their few wishes matter
//     more than a heavy-preferrer's many).
//   - Überstunden: employees over their toleranz_ueberstunden are taxed per hour
//     assigned, so banked overtime pushes them down the pick order.
//   - Fairness: quadratic distance of monthly hours from soll_stunden — pulls
//     everyone toward their target from both sides.
//
// DELIBERATELY OUT OF SCOPE (would belong in an "optimal" ILP/CP method):
//   - Proven optimality / exhaustive backtracking. Local search finds a good
//     local optimum, not necessarily the global one.
//   - Moves larger than a pairwise swap (3-cycles, chains).
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
  ueberstunden?: number;
  // Overtime is only penalized once it exceeds this tolerance band. Defaults to 0.
  toleranz_ueberstunden?: number;
  // How many preference rows this employee filed (standing + per-date, gerne and
  // ungerne alike). Fewer filed → each of their wishes is weighted more heavily.
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
// SOFT-OBJECTIVE WEIGHTS. Priority: preference > überstunden > fairness.
// ----------------------------------------------------------------------------
const W_PREF = 1.0; // #1: honour gerne, avoid ungerne
const W_OT = 0.6;   // #2: keep people off overtime
const W_FAIR = 0.3; // #3: pull everyone toward their monthly soll

// Fallback monthly hours used ONLY to normalize the fairness / overtime terms
// when an employee has no soll_stunden set. ~173h ≈ a full-time month. It is a
// SCALE only — a null soll still means "no real target", so fairness degrades to
// gentle least-hours-first balancing rather than steering toward 173h.
const FALLBACK_SOLL = 173;

// Phase B safety valves so a pathological input can never loop forever.
const MAX_SWAP_PASSES = 12;
const MAX_SWAP_CHECKS = 6_000_000; // hard cap on candidate-pair evaluations
// Two assignments are only considered as a swap pair when their shifts fall
// within this many days of each other. Rationale: legality only couples shifts
// through the daily/weekly caps and the rest gap (all local in time), and the
// most useful hour-rebalancing is within the same week. This turns the O(n²)
// pass into a near-linear sweep over a date-sorted list — the single biggest
// performance lever at 800+ assignments — for a negligible quality cost.
const SWAP_WINDOW_DAYS = 8;

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

// ----------------------------------------------------------------------------
// Per-employee mutable state, shared by both phases.
// ----------------------------------------------------------------------------
interface EmpState {
  m: Mitarbeiter;
  stunden: number;         // in-cycle hours (fairness + HC-5)
  belegt: Instanz[];       // every shift held (for the legal checks)
  gerne: number;           // gerne shifts granted so far
  ungerne: number;         // ungerne shifts forced so far
  target: number;          // soll_stunden, PRO-RATED for in-cycle urlaub (0 = unset)
  scale: number;           // normalizer for the fairness/overtime terms
  gSub: number;            // "fewer wishes weigh more" multiplier
  otPen: number;           // overtime beyond tolerance (>= 0)
  capHart: number;         // max_stunden_hart, PRO-RATED for in-cycle urlaub (Infinity = no cap)
}

// The concave/convex per-employee objective, defined purely on the tallies so it
// is order-independent and phase B can diff it.
function empCost(s: EmpState): number {
  const pref =
    -W_PREF * s.gSub * Math.sqrt(s.gerne) + // concave reward: each gerne worth less
    W_PREF * s.gSub * 0.5 * s.ungerne * s.ungerne; // convex penalty: each ungerne worse
  const fair = W_FAIR * ((s.stunden - s.target) / s.scale) ** 2; // pull toward soll
  const ot = W_OT * (s.otPen / s.scale) * (s.stunden / s.scale); // tax overtime carriers
  return pref + fair + ot;
}

// Objective contribution of an employee given a hypothetical (gerne, ungerne,
// stunden) — used to score a candidate/move without mutating state.
function empCostAt(s: EmpState, gerne: number, ungerne: number, stunden: number): number {
  const pref = -W_PREF * s.gSub * Math.sqrt(gerne) + W_PREF * s.gSub * 0.5 * ungerne * ungerne;
  const fair = W_FAIR * ((stunden - s.target) / s.scale) ** 2;
  const ot = W_OT * (s.otPen / s.scale) * (stunden / s.scale);
  return pref + fair + ot;
}

// ----------------------------------------------------------------------------
// THE SOLVER — pure function. This is the part to scrutinize.
// ----------------------------------------------------------------------------
export function solve(input: SolverInput): SolverResult {
  const { mindestruhezeit, maxTagStunden, maxWocheStunden } = input.gesetzlich;
  const ruheMs = mindestruhezeit * 3600 * 1000;

  // Auth peers: mitarbeiter ids sharing a non-null auth_id (incl. self). Only used
  // to union the overlap/rest window, exactly like the DB trigger.
  const byAuth = new Map<string, Uuid[]>();
  for (const m of input.mitarbeiter) {
    if (m.auth_id) {
      if (!byAuth.has(m.auth_id)) byAuth.set(m.auth_id, []);
      byAuth.get(m.auth_id)!.push(m.id);
    }
  }
  const authPeers = (id: Uuid): Uuid[] => {
    const m = stateById.get(id)!.m;
    return m.auth_id ? byAuth.get(m.auth_id)! : [id];
  };

  // "fewer wishes weigh more" reference point (team average, guarded).
  const submitted = input.mitarbeiter.map((m) => m.n_submitted ?? 0);
  const avgSubmitted = submitted.length ? submitted.reduce((a, b) => a + b, 0) / submitted.length : 0;
  const gSubOf = (m: Mitarbeiter) => {
    if (avgSubmitted <= 0) return 1;
    return Math.min(2, Math.max(0.5, avgSubmitted / Math.max(m.n_submitted ?? 0, 1)));
  };

  // Pro-rate each employee's MONTHLY targets by the share of their would-be
  // working days that approved urlaub removes. A "would-be working day" is a date
  // in the cycle carrying at least one shift instance whose required role the
  // employee holds — i.e. a day they could realistically be scheduled. Without
  // this, someone on two weeks' holiday keeps their full monthly soll_stunden as
  // the fairness target, so the solver tries to jam a whole month of hours into
  // the remaining days (and their hard max_stunden_hart cap stays untouched too).
  // Scaling both by the availability factor removes that bias. The factor only
  // ever shrinks the targets, so the solver stays at least as conservative as the
  // DB trigger (which enforces the un-prorated max_stunden_hart).
  const verfuegbarkeitsFaktor = new Map<Uuid, number>();
  for (const m of input.mitarbeiter) {
    const rollen = input.rollenProMitarbeiter.get(m.id) ?? new Set<Uuid>();
    const arbeitstage = new Set<IsoDate>();
    const urlaubstage = new Set<IsoDate>();
    for (const inst of input.instanzen) {
      const bedarf = input.bedarfProInstanz.get(inst.id) ?? [];
      if (!bedarf.some((b) => rollen.has(b.rolle_id))) continue; // can't fill this shift
      arbeitstage.add(inst.datum);
      if (istImUrlaub(input, m.id, inst.datum)) urlaubstage.add(inst.datum);
    }
    const faktor =
      arbeitstage.size > 0 ? (arbeitstage.size - urlaubstage.size) / arbeitstage.size : 1;
    verfuegbarkeitsFaktor.set(m.id, faktor);
  }

  // Initialize per-employee state, seeded from any pre-existing (manuell/tausch)
  // shifts and the in-cycle hours those already contribute.
  const stateById = new Map<Uuid, EmpState>();
  for (const m of input.mitarbeiter) {
    const faktor = verfuegbarkeitsFaktor.get(m.id) ?? 1;
    const target = (m.soll_stunden ?? 0) * faktor;
    stateById.set(m.id, {
      m,
      stunden: input.startSaldo.get(m.id) ?? 0,
      belegt: [...(input.vorbelegung.get(m.id) ?? [])],
      gerne: 0,
      ungerne: 0,
      target,
      scale: target > 0 ? target : FALLBACK_SOLL,
      gSub: gSubOf(m),
      otPen: Math.max(0, (m.ueberstunden ?? 0) - (m.toleranz_ueberstunden ?? 0)),
      capHart: m.max_stunden_hart != null ? m.max_stunden_hart * faktor : Infinity,
    });
  }

  // Pre-index instances for O(1) lookup and cache each instance's ms-range/duration.
  const instById = new Map<Uuid, Instanz>();
  const rangeCache = new Map<Uuid, { ns: number; ne: number; dauer: number; wk: string }>();
  for (const inst of input.instanzen) {
    instById.set(inst.id, inst);
    const [ns, ne] = bereichMs(inst.datum, inst.start_zeit, inst.end_zeit);
    rangeCache.set(inst.id, { ns, ne, dauer: dauerStunden(inst.start_zeit, inst.end_zeit), wk: wochenStart(inst.datum) });
  }

  // --- HARD feasibility: may `mId` take `inst` (ignoring the role, checked by
  // caller), given the shifts they currently hold? Mirrors the trigger exactly.
  // `ignore` lets phase B test a move as if a shift had already been removed.
  function zulaessig(mId: Uuid, inst: Instanz, ignore?: Set<string>): boolean {
    if (istImUrlaub(input, mId, inst.datum)) return false; // HC-1
    const { ns, ne, dauer, wk } = rangeCache.get(inst.id)!;

    // HC-2 (overlap) + HC-4 (rest), unioned over auth peers.
    for (const peerId of authPeers(mId)) {
      for (const h of stateById.get(peerId)!.belegt) {
        if (ignore?.has(`${peerId}|${h.id}`)) continue;
        if (h.id === inst.id) continue;
        const [hs, he] = bereichMs(h.datum, h.start_zeit, h.end_zeit);
        if (ns < he && hs < ne) return false;           // overlap
        const luecke = ns >= he ? ns - he : hs - ne;     // gap between them
        if (luecke < ruheMs) return false;               // too little rest
      }
    }

    // Legal daily / weekly max hours are per-mitarbeiter (not auth-unioned).
    const meine = stateById.get(mId)!.belegt;
    let tagSumme = 0, wocheSumme = 0;
    for (const h of meine) {
      if (ignore?.has(`${mId}|${h.id}`) || h.id === inst.id) continue;
      const r = rangeCache.get(h.id) ?? { dauer: dauerStunden(h.start_zeit, h.end_zeit), wk: wochenStart(h.datum) } as any;
      if (h.datum === inst.datum) tagSumme += r.dauer;
      if ((r.wk ?? wochenStart(h.datum)) === wk) wocheSumme += r.dauer;
    }
    if (tagSumme + dauer > maxTagStunden) return false;
    if (wocheSumme + dauer > maxWocheStunden) return false;

    // HC-5: MONTHLY (cycle) cap — max_stunden_hart, pro-rated for urlaub; null = no
    // cap. Only ever <= the raw cap the DB trigger enforces, so still trigger-safe.
    const cap = stateById.get(mId)!.capHart;
    let saldo = stateById.get(mId)!.stunden;
    if (ignore) for (const h of meine) if (ignore.has(`${mId}|${h.id}`)) saldo -= rangeCache.get(h.id)!.dauer;
    if (saldo + dauer > cap) return false;
    return true;
  }

  // Apply / undo an assignment against the mutable state.
  function assign(mId: Uuid, inst: Instanz): void {
    const s = stateById.get(mId)!;
    s.belegt.push(inst);
    s.stunden += rangeCache.get(inst.id)!.dauer;
    const p = preferenz(input, mId, inst.schicht_vorlage_id, inst.datum);
    if (p === "gerne") s.gerne++;
    else if (p === "ungerne") s.ungerne++;
  }
  function unassign(mId: Uuid, inst: Instanz): void {
    const s = stateById.get(mId)!;
    const i = s.belegt.findIndex((h) => h.id === inst.id);
    if (i >= 0) s.belegt.splice(i, 1);
    s.stunden -= rangeCache.get(inst.id)!.dauer;
    const p = preferenz(input, mId, inst.schicht_vorlage_id, inst.datum);
    if (p === "gerne") s.gerne--;
    else if (p === "ungerne") s.ungerne--;
  }

  // Marginal objective delta of giving `inst` to `mId` right now (lower = better).
  function marginalDelta(mId: Uuid, inst: Instanz): number {
    const s = stateById.get(mId)!;
    const p = preferenz(input, mId, inst.schicht_vorlage_id, inst.datum);
    const g = s.gerne + (p === "gerne" ? 1 : 0);
    const u = s.ungerne + (p === "ungerne" ? 1 : 0);
    const h = s.stunden + rangeCache.get(inst.id)!.dauer;
    return empCostAt(s, g, u, h) - empCost(s);
  }

  // ==========================================================================
  // PHASE A — feasibility-first fill, hardest shifts first.
  // ==========================================================================

  // Static difficulty per instance: how scarce is the staff for its roles?
  // Higher = fewer qualified/available bodies per required head → fill earlier.
  // "Available" ignores the dynamic saldo (cheap, computed once); the exact
  // legal feasibility is re-checked per slot below.
  const qualifiedForRole = new Map<Uuid, Uuid[]>();
  const roleOf = (mId: Uuid) => input.rollenProMitarbeiter.get(mId) ?? new Set<Uuid>();
  for (const m of input.mitarbeiter) {
    for (const r of roleOf(m.id)) {
      if (!qualifiedForRole.has(r)) qualifiedForRole.set(r, []);
      qualifiedForRole.get(r)!.push(m.id);
    }
  }
  const schwierigkeit = (inst: Instanz): number => {
    let score = 0;
    for (const b of input.bedarfProInstanz.get(inst.id) ?? []) {
      let frei = 0;
      for (const mId of qualifiedForRole.get(b.rolle_id) ?? []) {
        if (!istImUrlaub(input, mId, inst.datum)) frei++;
      }
      score += b.mindestanzahl / Math.max(1, frei); // demand ÷ supply
    }
    return score;
  };

  const sortierteInstanzen = [...input.instanzen].sort((a, b) => {
    const da = schwierigkeit(b) - schwierigkeit(a); // hardest first
    if (Math.abs(da) > 1e-9) return da > 0 ? 1 : -1;
    // stable, deterministic secondary order: chronological
    return a.datum === b.datum ? a.start_zeit.localeCompare(b.start_zeit) : a.datum.localeCompare(b.datum);
  });

  // All accepted assignments, plus the slots that stayed open.
  const zuweisungen: Zuweisung[] = [];
  const fehlbesetzungen: Fehlbesetzung[] = [];

  for (const inst of sortierteInstanzen) {
    for (const b of input.bedarfProInstanz.get(inst.id) ?? []) {
      // who is already on THIS instance (any role) — no double-booking one person
      const schonHier = new Set(
        zuweisungen.filter((z) => z.schicht_instanz_id === inst.id).map((z) => z.mitarbeiter_id),
      );
      let besetzt = 0;
      for (let slot = 0; slot < b.mindestanzahl; slot++) {
        let best: Uuid | null = null;
        let bestDelta = Infinity;
        for (const mId of qualifiedForRole.get(b.rolle_id) ?? []) {
          if (schonHier.has(mId)) continue;
          if (!zulaessig(mId, inst)) continue;
          const d = marginalDelta(mId, inst);
          if (d < bestDelta || (d === bestDelta && best !== null && mId < best)) {
            bestDelta = d;
            best = mId;
          }
        }
        if (best === null) break; // slot unfillable
        assign(best, inst);
        zuweisungen.push({ schicht_instanz_id: inst.id, mitarbeiter_id: best, rolle_id: b.rolle_id });
        schonHier.add(best);
        besetzt++;
      }
      if (besetzt < b.mindestanzahl) {
        fehlbesetzungen.push({
          schicht_instanz_id: inst.id,
          datum: inst.datum,
          rolle_id: b.rolle_id,
          benoetigt: b.mindestanzahl,
          besetzt,
        });
      }
    }
  }

  // ==========================================================================
  // PHASE B — hill-climb via feasible, objective-improving swaps.
  //
  // For a pair of assignments (a on X, b on Y) we test the trade a→Y, b→X. Both
  // people must qualify for the OTHER's role and stay legal with their own shift
  // removed; we accept only if the total objective strictly drops. Fill count is
  // invariant, so coverage from phase A is never sacrificed.
  // ==========================================================================
  const tageAbstand = (a: IsoDate, b: IsoDate) =>
    Math.abs((Date.parse(a) - Date.parse(b)) / 864e5);
  let checks = 0;
  for (let pass = 0; pass < MAX_SWAP_PASSES; pass++) {
    let improvedThisPass = false;
    // Date-sort so the windowed inner loop can break early. Re-sorted each pass
    // because swaps mutate which instance an assignment points at.
    zuweisungen.sort((p, q) => instById.get(p.schicht_instanz_id)!.datum.localeCompare(instById.get(q.schicht_instanz_id)!.datum));

    for (let i = 0; i < zuweisungen.length; i++) {
      const instX = instById.get(zuweisungen[i].schicht_instanz_id)!;
      for (let j = i + 1; j < zuweisungen.length; j++) {
        const za = zuweisungen[i];
        const zb = zuweisungen[j];
        const instY = instById.get(zb.schicht_instanz_id)!;
        // Sorted by date → once we pass the window, no later j can qualify.
        if (tageAbstand(instX.datum, instY.datum) > SWAP_WINDOW_DAYS) break;
        if (++checks > MAX_SWAP_CHECKS) { pass = MAX_SWAP_PASSES; break; }
        if (za.mitarbeiter_id === zb.mitarbeiter_id) continue;
        if (za.schicht_instanz_id === zb.schicht_instanz_id) continue; // same shift → no-op / double-book

        // Must qualify for the role they'd move INTO (cheap set lookups).
        if (!roleOf(za.mitarbeiter_id).has(zb.rolle_id)) continue;
        if (!roleOf(zb.mitarbeiter_id).has(za.rolle_id)) continue;

        // Objective delta is pure arithmetic — compute it BEFORE the expensive
        // feasibility test and skip non-improving pairs (the vast majority), so
        // legality is only ever checked for a swap we'd actually want to make.
        const delta = swapDelta(za.mitarbeiter_id, instX, instY) + swapDelta(zb.mitarbeiter_id, instY, instX);
        if (delta >= -1e-9) continue;

        // Neither may already be on the other's instance (would double-book).
        const aOnY = stateById.get(za.mitarbeiter_id)!.belegt.some((h) => h.id === instY.id);
        const bOnX = stateById.get(zb.mitarbeiter_id)!.belegt.some((h) => h.id === instX.id);
        if (aOnY || bOnX) continue;

        // Feasibility of the swapped world: test each person on the OTHER shift
        // while pretending both original shifts are already removed.
        const ignore = new Set([`${za.mitarbeiter_id}|${instX.id}`, `${zb.mitarbeiter_id}|${instY.id}`]);
        if (!zulaessig(za.mitarbeiter_id, instY, ignore)) continue;
        if (!zulaessig(zb.mitarbeiter_id, instX, ignore)) continue;

        {
          // apply
          unassign(za.mitarbeiter_id, instX);
          unassign(zb.mitarbeiter_id, instY);
          assign(za.mitarbeiter_id, instY);
          assign(zb.mitarbeiter_id, instX);
          const ra = za.rolle_id;
          za.schicht_instanz_id = instY.id; za.rolle_id = zb.rolle_id;
          zb.schicht_instanz_id = instX.id; zb.rolle_id = ra;
          improvedThisPass = true;
          break; // zuweisungen[i] (and instX) just changed — restart its inner scan
        }
      }
    }
    if (!improvedThisPass) break;
  }

  // Objective delta for `mId` losing shift `from` and gaining shift `to`.
  function swapDelta(mId: Uuid, from: Instanz, to: Instanz): number {
    const s = stateById.get(mId)!;
    const pFrom = preferenz(input, mId, from.schicht_vorlage_id, from.datum);
    const pTo = preferenz(input, mId, to.schicht_vorlage_id, to.datum);
    const g = s.gerne - (pFrom === "gerne" ? 1 : 0) + (pTo === "gerne" ? 1 : 0);
    const u = s.ungerne - (pFrom === "ungerne" ? 1 : 0) + (pTo === "ungerne" ? 1 : 0);
    const h = s.stunden - rangeCache.get(from.id)!.dauer + rangeCache.get(to.id)!.dauer;
    return empCostAt(s, g, u, h) - empCost(s);
  }

  return { zuweisungen, fehlbesetzungen };
}
