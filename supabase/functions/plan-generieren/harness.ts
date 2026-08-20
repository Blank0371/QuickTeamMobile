// =============================================================================
// Local test harness for the pure solver — NO database, NO deploy needed.
//
// Run it:   deno run supabase/functions/plan-generieren/harness.ts
//
// It builds one small, hand-checkable scenario, runs solve(), and prints the
// assignments + any unfilled slots so you can eyeball whether the ranking behaves.
// Tweak the scenario below and re-run to probe edge cases.
// =============================================================================

import { solve, type SolverInput, type Bedarf, type Instanz, type Mitarbeiter } from "./solver.ts";

// --- readable ids ---------------------------------------------------------
const KOCH = "rolle-koch";
const KELLNER = "rolle-kellner";
const V_FRUEH = "vorlage-frueh";
const V_SPAET = "vorlage-spaet";

// Anna filed FEW preferences (each weighs more); Carla filed MANY (each weighs less).
// Ben carries overtime, so he should be picked later even when eligible.
const anna: Mitarbeiter = { id: "anna", soll_stunden: 173, max_stunden_hart: 200, n_submitted: 1 };
const ben: Mitarbeiter = { id: "ben", soll_stunden: 80, max_stunden_hart: 100, n_submitted: 1, ueberstunden: 40, toleranz_ueberstunden: 10 };  // part-time, in overtime
const carla: Mitarbeiter = { id: "carla", soll_stunden: 173, max_stunden_hart: 200, n_submitted: 3 };
const namen: Record<string, string> = { anna: "Anna", ben: "Ben", carla: "Carla" };
const rollenNamen: Record<string, string> = { [KOCH]: "Koch", [KELLNER]: "Kellner" };

// --- two Mondays of shifts ------------------------------------------------
const instanzen: Instanz[] = [
  { id: "i1", schicht_vorlage_id: V_FRUEH, datum: "2026-08-03", start_zeit: "08:00:00", end_zeit: "16:00:00" }, // 8h
  { id: "i2", schicht_vorlage_id: V_SPAET, datum: "2026-08-03", start_zeit: "16:00:00", end_zeit: "23:00:00" }, // 7h
  { id: "i3", schicht_vorlage_id: V_FRUEH, datum: "2026-08-10", start_zeit: "08:00:00", end_zeit: "16:00:00" }, // 8h
  { id: "i4", schicht_vorlage_id: V_SPAET, datum: "2026-08-10", start_zeit: "16:00:00", end_zeit: "23:00:00" }, // 7h
];

// --- who/how many each shift needs ---------------------------------------
const bedarfProInstanz = new Map<string, Bedarf[]>([
  ["i1", [{ rolle_id: KOCH, mindestanzahl: 1 }, { rolle_id: KELLNER, mindestanzahl: 1 }]],
  ["i2", [{ rolle_id: KELLNER, mindestanzahl: 1 }]],
  // i3 needs TWO Kochs on purpose — Carla is on holiday that day, so expect a shortfall.
  ["i3", [{ rolle_id: KOCH, mindestanzahl: 2 }, { rolle_id: KELLNER, mindestanzahl: 1 }]],
  ["i4", [{ rolle_id: KELLNER, mindestanzahl: 1 }]],
]);

// --- role membership ------------------------------------------------------
const rollenProMitarbeiter = new Map<string, Set<string>>([
  ["anna", new Set([KOCH, KELLNER])], // Anna can do both
  ["ben", new Set([KELLNER])],
  ["carla", new Set([KOCH])],
]);

// --- Carla is on approved holiday on the 10th ----------------------------
const urlaubProMitarbeiter = new Map<string, { von: string; bis: string }[]>([
  ["carla", [{ von: "2026-08-10", bis: "2026-08-10" }]],
]);


// --- preferences ----------------------------------------------------------
const vorliebe = new Map<string, "gerne" | "ungerne">([
  [`anna|${V_FRUEH}`, "gerne"],    // Anna likes early
  [`carla|${V_FRUEH}`, "ungerne"], // Carla dislikes early
  [`ben|${V_SPAET}`, "gerne"],     // Ben likes late
]);
const tagesvorliebe = new Map<string, "gerne" | "ungerne">();

const input: SolverInput = {
  instanzen,
  bedarfProInstanz,
  mitarbeiter: [anna, ben, carla],
  rollenProMitarbeiter,
  urlaubProMitarbeiter,
  vorliebe,
  tagesvorliebe,
  vorbelegung: new Map(),   // no pre-existing shifts in this scenario
  startSaldo: new Map(),    // everyone starts the cycle at 0h
  gesetzlich: { mindestruhezeit: 11, maxTagStunden: 10, maxWocheStunden: 48,
    pausen: { schwelle1Std: 6, schwelle1Min: 30, schwelle2Std: 9, schwelle2Min: 45 } }, // DE
};

// --- run it ---------------------------------------------------------------
const result = solve(input);

// --- pretty-print ---------------------------------------------------------
const dauer = (i: Instanz) => {
  const [sh, sm] = i.start_zeit.split(":").map(Number);
  let [eh, em] = i.end_zeit.split(":").map(Number);
  let d = eh * 60 + em - (sh * 60 + sm);
  if (d <= 0) d += 1440;
  return d / 60;
};
const byId = new Map(instanzen.map((i) => [i.id, i]));

console.log("\n=== ASSIGNMENTS ===");
for (const inst of instanzen) {
  const zForInst = result.zuweisungen.filter((z) => z.schicht_instanz_id === inst.id);
  console.log(`\n${inst.datum}  ${inst.start_zeit.slice(0, 5)}–${inst.end_zeit.slice(0, 5)}  (${dauer(inst)}h)`);
  for (const b of bedarfProInstanz.get(inst.id) ?? []) {
    const filled = zForInst.filter((z) => z.rolle_id === b.rolle_id).map((z) => namen[z.mitarbeiter_id]);
    const flag = filled.length < b.mindestanzahl ? "  ⚠ UNDERSTAFFED" : "";
    console.log(`   ${rollenNamen[b.rolle_id]}: ${filled.join(", ") || "—"}  (need ${b.mindestanzahl})${flag}`);
  }
}

console.log("\n=== HOURS PER EMPLOYEE (vs soll_stunden) ===");
const stunden: Record<string, number> = { anna: 0, ben: 0, carla: 0 };
for (const z of result.zuweisungen) stunden[z.mitarbeiter_id] += dauer(byId.get(z.schicht_instanz_id)!);
for (const m of [anna, ben, carla]) {
  console.log(`   ${namen[m.id].padEnd(6)} ${stunden[m.id]}h / ${m.soll_stunden}h soll  (cap ${m.max_stunden_hart}h)`);
}

console.log("\n=== SHORTFALLS ===");
if (result.fehlbesetzungen.length === 0) {
  console.log("   none");
} else {
  for (const f of result.fehlbesetzungen) {
    console.log(`   ${f.datum}  ${rollenNamen[f.rolle_id]}: ${f.besetzt}/${f.benoetigt} filled`);
  }
}
console.log();
