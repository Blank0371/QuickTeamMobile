// =============================================================================
// Weekly-cycle harness — one month planned as ONE cycle vs FOUR one-week cycles.
//
// Run it:   deno run supabase/functions/plan-generieren/woche-harness.ts [cap]
//
// Emulates what index.ts feeds the solver for each weekly run: everything held
// earlier in the month as vorbelegung, the month's remaining working days from
// the templates (arbeitstageAusserhalb), and the DB trigger's raw HC-5 cap on
// insert. Prints hours per person per week and checks:
//   · weekly planning lands close to monthly planning (hours vs soll)
//   · a holiday covering half of a week halves that week's share
//   · no row the trigger would reject
// =============================================================================

import { dauerStunden, solve, type Instanz, type Mitarbeiter, type SolverInput } from "./solver.ts";

const ROLLE = "service";
const CAP = Deno.args[0] === "cap";
const AT = { mindestruhezeit: 11, maxTagStunden: 12, maxWocheStunden: 48,
  pausen: { schwelle1Std: 6, schwelle1Min: 30, schwelle2Std: null, schwelle2Min: null } };

const team: Mitarbeiter[] = ([
  ["minijob", 40], ["teil60", 60], ["teil80", 80], ["teil120", 120], ["voll173a", 173], ["voll173b", 173],
] as const).map(([id, soll]) => ({ id, soll_stunden: soll,
  max_stunden_hart: CAP ? Math.round(soll * 1.15) : null, ueberstunden: 0, toleranz_ueberstunden: 0, n_submitted: 0 }));

// teil120 is on holiday Thu–Sun of week 2 (4 of its 7 working days ≈ half of the week).
const urlaub = new Map([["teil120", [{ von: "2026-11-12", bis: "2026-11-15" }]]]);

const addDays = (d: string, n: number) => { const x = new Date(d + "T00:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const tage: string[] = [];
for (let d = "2026-11-01"; d <= "2026-11-30"; d = addDays(d, 1)) tage.push(d);
// 08–16 (2 people) and 16–22 (1 person) every day → 22 h/day.
const instanzenAm = (t: string): (Instanz & { need: number })[] => [
  { id: `${t}|F`, schicht_vorlage_id: "F", datum: t, start_zeit: "08:00:00", end_zeit: "16:00:00", need: 2 },
  { id: `${t}|S`, schicht_vorlage_id: "S", datum: t, start_zeit: "16:00:00", end_zeit: "22:00:00", need: 1 },
];
const alle = tage.flatMap(instanzenAm);
const byId = new Map(alle.map((i) => [i.id, i]));
const h = (id: string) => dauerStunden(byId.get(id)!.start_zeit, byId.get(id)!.end_zeit);

type Z = { m: string; i: string };
function lauf(start: string, ende: string, bestand: Z[]) {
  const inst = alle.filter((i) => i.datum >= start && i.datum <= ende);
  const geplant = new Set(bestand.map((z) => byId.get(z.i)!.datum));
  const vorbelegung = new Map<string, Instanz[]>();
  for (const z of bestand) {
    if (!vorbelegung.has(z.m)) vorbelegung.set(z.m, []);
    vorbelegung.get(z.m)!.push(byId.get(z.i)!);
  }
  const ausserhalb = new Map(team.map((m) => [m.id, new Map(
    tage.filter((t) => t < start || t > ende).map((t) => [t, t < start && geplant.has(t)] as const),
  )]));
  const input: SolverInput = {
    instanzen: inst, bedarfProInstanz: new Map(inst.map((i) => [i.id, [{ rolle_id: ROLLE, mindestanzahl: i.need }]])),
    mitarbeiter: team, rollenProMitarbeiter: new Map(team.map((m) => [m.id, new Set([ROLLE])])),
    urlaubProMitarbeiter: urlaub, vorliebe: new Map(), tagesvorliebe: new Map(),
    vorbelegung, zeitraum: { start, ende }, arbeitstageAusserhalb: ausserhalb, gesetzlich: AT,
  };
  const r = solve(input);
  // The DB trigger: raw calendar-month cap over everything held.
  const neu: Z[] = []; let abgelehnt = 0;
  for (const z of r.zuweisungen) {
    const m = team.find((x) => x.id === z.mitarbeiter_id)!;
    const summe = [...bestand, ...neu].filter((b) => b.m === m.id).reduce((s, b) => s + h(b.i), 0);
    if (m.max_stunden_hart != null && summe + h(z.schicht_instanz_id) > m.max_stunden_hart) { abgelehnt++; continue; }
    neu.push({ m: z.mitarbeiter_id, i: z.schicht_instanz_id });
  }
  return { neu, offen: r.fehlbesetzungen.reduce((s, f) => s + f.benoetigt - f.besetzt, 0), abgelehnt };
}

const WOCHEN = [["2026-11-01", "2026-11-08"], ["2026-11-09", "2026-11-15"], ["2026-11-16", "2026-11-22"], ["2026-11-23", "2026-11-30"]];
function bericht(titel: string, zuw: Z[], offen: number, abgelehnt: number) {
  console.log(`\n== ${titel}   offen: ${offen}   vom Trigger abgelehnt: ${abgelehnt}`);
  console.log("person      soll   ist  ist/soll | je Zeitraum (h)");
  for (const m of team) {
    const proWoche = WOCHEN.map(([a, b]) => zuw.filter((z) => z.m === m.id && byId.get(z.i)!.datum >= a && byId.get(z.i)!.datum <= b).reduce((s, z) => s + h(z.i), 0));
    const ist = proWoche.reduce((a, b) => a + b, 0);
    console.log(`${m.id.padEnd(10)} ${String(m.soll_stunden).padStart(4)} ${String(ist).padStart(5)}  ${(100 * ist / m.soll_stunden!).toFixed(0).padStart(5)} % | ${proWoche.map((x) => String(x).padStart(4)).join(" ")}`);
  }
}

console.log(`Szenario: November 2026, 6 Personen, 660 h Bedarf, ${CAP ? "max_stunden_hart = soll × 1,15" : "ohne max_stunden_hart"}; teil120 hat 12.–15.11. Urlaub`);
const monat = lauf("2026-11-01", "2026-11-30", []);
bericht("EIN Zyklus, ganzer Monat", monat.neu, monat.offen, monat.abgelehnt);

let bestand: Z[] = []; let offen = 0, abgelehnt = 0;
for (const [a, b] of WOCHEN) {
  const r = lauf(a, b, bestand);
  bestand = [...bestand, ...r.neu]; offen += r.offen; abgelehnt += r.abgelehnt;
}
bericht("VIER Zyklen à ~1 Woche", bestand, offen, abgelehnt);
