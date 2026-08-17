// =============================================================================
// SCALE + CORRECTNESS harness for the pure solver — NO database, NO deploy.
//
// Run it:  deno run supabase/functions/plan-generieren/scale-harness.ts
//
// Generates a realistic BIG scenario (100 employees, 1–5 roles each, a full
// month of templated shifts, random gerne/ungerne preferences, random holidays),
// runs solve(), then:
//   1. INDEPENDENTLY re-validates every hard constraint against the output, so a
//      "0 violations" line actually proves the solver obeyed the DB trigger.
//   2. Reports timing, fill rate, preference satisfaction and fairness spread.
//
// Deterministic: a seeded PRNG means every run produces the same scenario, so
// numbers are comparable across code changes.
// =============================================================================

import { dauerStunden, solve, type Bedarf, type Instanz, type Mitarbeiter, type SolverInput } from "./solver.ts";

// ---- seeded PRNG (mulberry32) so runs are reproducible ---------------------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(20260901);
// Multiply every template's role demand — lets us dial the roster from
// "overstaffed" (1) to "demand ≈ capacity" (~4) to stress fairness + legal caps.
const DEMAND_SCALE = Number(Deno.args[0] ?? 1);
const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const randint = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

// ---- scenario parameters ---------------------------------------------------
const N_EMP = 100;
const LAND = { mindestruhezeit: 11, maxTagStunden: 10, maxWocheStunden: 48 }; // DE
const MONTH_START = "2026-09-01";
const MONTH_END = "2026-09-30";

const ROLLEN = ["koch", "kellner", "bar", "spuel", "schichtleiter", "aushilfe"];

// Weekly shift templates: (weekday 0=Mon..6=Sun, label, start, end, demand per role).
// Weekdays lighter, Fri/Sat heavier — a plausible gastro week.
type TplDef = { wt: number; label: string; s: string; e: string; bedarf: Record<string, number> };
const TEMPLATES: TplDef[] = [];
for (let wt = 0; wt <= 6; wt++) {
  const busy = wt === 4 || wt === 5; // Fri/Sat
  TEMPLATES.push({
    wt, label: "frueh", s: "08:00:00", e: "16:00:00",
    bedarf: { koch: busy ? 2 : 1, kellner: busy ? 3 : 2, bar: 1, spuel: 1, schichtleiter: 1 },
  });
  TEMPLATES.push({
    wt, label: "spaet", s: "16:00:00", e: "23:30:00",
    bedarf: { koch: busy ? 2 : 1, kellner: busy ? 4 : 2, bar: busy ? 2 : 1, spuel: 1, schichtleiter: 1, aushilfe: busy ? 1 : 0 },
  });
}

// ---- employees: 1–5 roles, soll/cap, preference count -----------------------
const mitarbeiter: Mitarbeiter[] = [];
const rollenProMitarbeiter = new Map<string, Set<string>>();
for (let i = 0; i < N_EMP; i++) {
  const id = `emp-${String(i).padStart(3, "0")}`;
  const nRoles = randint(1, 5);
  const roles = new Set<string>();
  while (roles.size < nRoles) roles.add(pick(ROLLEN));
  rollenProMitarbeiter.set(id, roles);
  // Contract mix: full-timers (~150h) and part-timers (~60–100h).
  const fulltime = rand() < 0.5;
  const soll = fulltime ? randint(140, 173) : randint(50, 100);
  mitarbeiter.push({
    id,
    soll_stunden: soll,
    max_stunden_hart: Math.round(soll * 1.2), // 20% headroom over target
    ueberstunden: rand() < 0.2 ? randint(5, 40) : 0, // 1 in 5 carries overtime
    toleranz_ueberstunden: 10,
    n_submitted: 0, // filled in below
  });
}

// ---- templated instances across the month ----------------------------------
function* days(start: string, end: string) {
  const d = new Date(start + "T00:00:00Z"), last = new Date(end + "T00:00:00Z");
  while (d <= last) { yield d.toISOString().slice(0, 10); d.setUTCDate(d.getUTCDate() + 1); }
}
const wtOf = (datum: string) => (new Date(datum + "T00:00:00Z").getUTCDay() + 6) % 7; // Mon=0

const instanzen: Instanz[] = [];
const bedarfProInstanz = new Map<string, Bedarf[]>();
const vorlageIdOf = (t: TplDef) => `tpl-${t.wt}-${t.label}`;
let instCounter = 0;
for (const datum of days(MONTH_START, MONTH_END)) {
  for (const t of TEMPLATES.filter((t) => t.wt === wtOf(datum))) {
    const id = `inst-${String(instCounter++).padStart(4, "0")}`;
    instanzen.push({ id, schicht_vorlage_id: vorlageIdOf(t), datum, start_zeit: t.s, end_zeit: t.e });
    bedarfProInstanz.set(
      id,
      Object.entries(t.bedarf).filter(([, n]) => n > 0).map(([rolle_id, n]) => ({ rolle_id, mindestanzahl: Math.round(n * DEMAND_SCALE) })),
    );
  }
}

// ---- random preferences on templates (per employee, only roles they hold) ---
const vorliebe = new Map<string, "gerne" | "ungerne">();
const nSub = new Map<string, number>();
const alleVorlagen = TEMPLATES.map(vorlageIdOf);
for (const m of mitarbeiter) {
  const nPrefs = randint(0, 6);
  const chosen = new Set<string>();
  for (let k = 0; k < nPrefs; k++) {
    const v = pick(alleVorlagen);
    if (chosen.has(v)) continue;
    chosen.add(v);
    vorliebe.set(`${m.id}|${v}`, rand() < 0.6 ? "gerne" : "ungerne"); // 60% gerne
  }
  nSub.set(m.id, chosen.size);
}
for (const m of mitarbeiter) m.n_submitted = nSub.get(m.id) ?? 0;

// ---- random holidays: ~30% take a 2–7 day block somewhere in the month ------
const urlaubProMitarbeiter = new Map<string, { von: string; bis: string }[]>();
const addDays = (d: string, n: number) => {
  const dt = new Date(d + "T00:00:00Z"); dt.setUTCDate(dt.getUTCDate() + n); return dt.toISOString().slice(0, 10);
};
for (const m of mitarbeiter) {
  if (rand() < 0.3) {
    const von = addDays(MONTH_START, randint(0, 25));
    urlaubProMitarbeiter.set(m.id, [{ von, bis: addDays(von, randint(1, 6)) }]);
  }
}

const input: SolverInput = {
  instanzen, bedarfProInstanz, mitarbeiter, rollenProMitarbeiter, urlaubProMitarbeiter,
  vorliebe, tagesvorliebe: new Map(), vorbelegung: new Map(), startSaldo: new Map(), gesetzlich: LAND,
};

// ---- run + time ------------------------------------------------------------
const totalDemand = [...bedarfProInstanz.values()].reduce((s, bs) => s + bs.reduce((x, b) => x + b.mindestanzahl, 0), 0);
console.log(`\n=== SCENARIO ===`);
console.log(`  employees: ${N_EMP}   roles: ${ROLLEN.length}   instances: ${instanzen.length}   slots demanded: ${totalDemand}`);
console.log(`  on holiday at some point: ${urlaubProMitarbeiter.size}   with preferences: ${[...nSub.values()].filter((n) => n > 0).length}`);

const t0 = performance.now();
const result = solve(input);
const ms = performance.now() - t0;

// ---- INDEPENDENT hard-constraint validation --------------------------------
// Rebuild each employee's shift list from the output and re-check every rule the
// DB trigger enforces. Any violation here means the solver produced an illegal row.
const byId = new Map(instanzen.map((i) => [i.id, i]));
const shiftsOf = new Map<string, Instanz[]>();
for (const z of result.zuweisungen) {
  const inst = byId.get(z.schicht_instanz_id)!;
  if (!shiftsOf.has(z.mitarbeiter_id)) shiftsOf.set(z.mitarbeiter_id, []);
  shiftsOf.get(z.mitarbeiter_id)!.push(inst);
}
const rangeMs = (i: Instanz) => {
  const s = new Date(`${i.datum}T${i.start_zeit}`).getTime();
  let e = new Date(`${i.datum}T${i.end_zeit}`).getTime();
  if (e <= s) e += 864e5;
  return [s, e] as const;
};
const wkOf = (d: string) => { const x = new Date(`${d}T00:00:00`); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x.toISOString().slice(0, 10); };

const violations: string[] = [];
for (const z of result.zuweisungen) {
  const inst = byId.get(z.schicht_instanz_id)!;
  // HC-3 role held
  if (!rollenProMitarbeiter.get(z.mitarbeiter_id)?.has(z.rolle_id)) violations.push(`HC-3 ${z.mitarbeiter_id} lacks role ${z.rolle_id}`);
  // HC-1 not on holiday
  for (const u of urlaubProMitarbeiter.get(z.mitarbeiter_id) ?? []) {
    if (inst.datum >= u.von && inst.datum <= u.bis) violations.push(`HC-1 ${z.mitarbeiter_id} on holiday ${inst.datum}`);
  }
}
for (const [mId, shifts] of shiftsOf) {
  const s = [...shifts].sort((a, b) => rangeMs(a)[0] - rangeMs(b)[0]);
  // HC-2 overlap + HC-4 rest
  for (let i = 1; i < s.length; i++) {
    const [, pe] = rangeMs(s[i - 1]); const [cs] = rangeMs(s[i]);
    if (cs < pe) violations.push(`HC-2 overlap ${mId} @ ${s[i].datum}`);
    else if ((cs - pe) / 36e5 < LAND.mindestruhezeit) violations.push(`HC-4 rest ${((cs - pe) / 36e5).toFixed(1)}h ${mId} @ ${s[i].datum}`);
  }
  // daily / weekly / monthly caps
  const perDay = new Map<string, number>(), perWeek = new Map<string, number>();
  let month = 0;
  for (const i of s) {
    const d = dauerStunden(i.start_zeit, i.end_zeit);
    perDay.set(i.datum, (perDay.get(i.datum) ?? 0) + d);
    perWeek.set(wkOf(i.datum), (perWeek.get(wkOf(i.datum)) ?? 0) + d);
    month += d;
  }
  for (const [d, h] of perDay) if (h > LAND.maxTagStunden + 1e-9) violations.push(`DAY ${mId} ${d} ${h}h`);
  for (const [w, h] of perWeek) if (h > LAND.maxWocheStunden + 1e-9) violations.push(`WEEK ${mId} ${w} ${h}h`);
  const cap = mitarbeiter.find((m) => m.id === mId)!.max_stunden_hart ?? Infinity;
  if (month > cap + 1e-9) violations.push(`HC-5 ${mId} ${month}h > cap ${cap}`);
}

// ---- quality metrics -------------------------------------------------------
const filled = result.zuweisungen.length;
let gerneGranted = 0, gerneWanted = 0, ungerneForced = 0;
for (const m of mitarbeiter) {
  for (const inst of shiftsOf.get(m.id) ?? []) {
    const p = vorliebe.get(`${m.id}|${inst.schicht_vorlage_id}`);
    if (p === "gerne") gerneGranted++;
    if (p === "ungerne") ungerneForced++;
  }
}
// how many gerne-marked (template) opportunities actually occurred for each emp
for (const [key, p] of vorliebe) {
  if (p !== "gerne") continue;
  const [mId, v] = key.split("|");
  gerneWanted += instanzen.filter((i) => i.schicht_vorlage_id === v).length > 0 ? 1 : 0;
}
const hours = mitarbeiter.map((m) => {
  const h = (shiftsOf.get(m.id) ?? []).reduce((x, i) => x + dauerStunden(i.start_zeit, i.end_zeit), 0);
  return { id: m.id, h, soll: m.soll_stunden ?? 0, dev: h - (m.soll_stunden ?? 0) };
});
const devs = hours.map((x) => x.dev);
const meanDev = devs.reduce((a, b) => a + b, 0) / devs.length;
const sd = Math.sqrt(devs.reduce((a, b) => a + (b - meanDev) ** 2, 0) / devs.length);
const worked = hours.filter((x) => x.h > 0).length;

console.log(`\n=== RESULT ===`);
console.log(`  solve time:            ${ms.toFixed(0)} ms`);
console.log(`  slots filled:          ${filled} / ${totalDemand}  (${(100 * filled / totalDemand).toFixed(1)}%)`);
console.log(`  shortfalls:            ${result.fehlbesetzungen.length} slots across ${new Set(result.fehlbesetzungen.map((f) => f.schicht_instanz_id)).size} shifts`);
console.log(`  employees used:        ${worked} / ${N_EMP}`);
console.log(`\n=== HARD CONSTRAINTS (independent re-check) ===`);
console.log(`  violations:            ${violations.length}`);
for (const v of violations.slice(0, 12)) console.log(`     ✗ ${v}`);
console.log(`\n=== SOFT QUALITY ===`);
console.log(`  gerne shifts granted:  ${gerneGranted}`);
console.log(`  ungerne shifts forced: ${ungerneForced}`);
console.log(`  hours vs soll — mean deviation: ${meanDev.toFixed(1)}h   std dev: ${sd.toFixed(1)}h`);
const over = hours.filter((x) => x.soll > 0 && x.h > (mitarbeiter.find((m) => m.id === x.id)!.max_stunden_hart ?? Infinity)).length;
console.log(`  over hard cap:         ${over}`);
console.log(`  sample (first 6):`);
for (const x of hours.slice(0, 6)) console.log(`     ${x.id}  ${x.h.toFixed(1)}h / ${x.soll}h soll  (dev ${x.dev >= 0 ? "+" : ""}${x.dev.toFixed(1)})`);
console.log();
