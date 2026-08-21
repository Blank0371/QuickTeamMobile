# QuickTeam — Test Playbook

> **Purpose:** a standardized, repeatable test of the app + database that Claude (or a
> human) can re-run in any future session. It is both a **checklist** (what to run) and a
> **living spec** (what "correct" looks like).
>
> ### ⚠️ Maintenance rule — READ THIS
> **Whenever you add or change a feature — a new table, RPC, edge function, screen, or
> flow — you MUST add a corresponding test entry to this file in the same change.**
> A feature that isn't listed here is considered untested. When you add an entry, note
> the RPC/table names, the happy path, and at least one failure/permission case.
> Keep the "Last run" line at the bottom up to date.

---

## 0. Environment & fixtures

| Thing | Value |
|---|---|
| Supabase project | **QuickTeam** — `jqpfuotwsgnqihspsmmf` (region eu-west-1) |
| App → project link | `.env` `EXPO_PUBLIC_SUPABASE_URL` = `https://jqpfuotwsgnqihspsmmf.supabase.co` |
| Primary test business | **"Testbetrieb 12"** — `3a1d698e-2a17-4612-8acd-7f3aa90b5153` (21 active, 1 chef) |
| Solver-scale business | **"SIM_Solver_Test"** — `f1005ada-0000-0000-0000-000000000001` (100 employees, no auth) |
| Shared test login (auth_id) | `0ea4ce17-8b7a-4633-8504-091069c3934b` — owns 3 profiles in Testbetrieb 12 |
| ↳ Chef profile | `2f1782cc-4169-4d7c-96f1-09e4b6e349ab` |
| ↳ Tim (mitarbeiter) | `5f1f25c9-8a2c-4068-8f18-0e75791df99d` |
| ↳ Anna (mitarbeiter) | `741276b4-0058-462a-b732-512af92ee4cc` |
| Role "Kellner" | `79ac3fed-b5c5-422e-9204-7564e04b9b95` |

**Quirk to remember:** the shared login maps to 3 `mitarbeiter` rows in one business, so
only Tim/Anna/Chef can be the *acting* user in RPC tests (the other ~18 employees have no
`auth_id` and can only be passive subjects). This is why swap/emergency tests use Tim↔Anna.

---

## 1. Method — how to test an RPC as a real authenticated user

RPCs are `SECURITY DEFINER` and gated by `auth.uid()`. To exercise both the logic **and**
the auth/RLS checks without persisting junk, run inside a **rolled-back transaction** with
a simulated JWT. Use the Supabase MCP `execute_sql`:

```sql
begin;
set local role authenticated;
set local request.jwt.claims = '{"sub":"<AUTH_ID>","role":"authenticated"}';
-- ... call RPCs here ...
rollback;   -- nothing persists
```

Tips learned the hard way:
- `execute_sql` returns **only the last statement's rows**. To collect multiple
  assertions, insert into a `create temp table _r(...) on commit drop;` and `select * from _r;`
  as the final statement.
- After a mutation that nulls a subject's `auth_id` (e.g. anonymize), RLS may hide the row
  from the `authenticated` context — do `reset role;` before the verification `select`.
- Notices (`raise notice`) are **not** returned; assert via returned rows instead.
- To test an RPC's *own* error paths, wrap the call in `begin ... exception when others
  then ... end;` and record `SQLERRM`.

---

## 2. Backend RPC checklist

Legend: run each as the indicated actor; ✅ = expected pass, ⛔ = expected rejection.

### 2.1 Auth / membership / identity
- [ ] `meine_betriebe()` → returns **distinct** business ids (regression: must not duplicate
  when a login has multiple profiles in one business).
- [ ] `ist_chef(betrieb)` → `true` for chef profile.
- [ ] `meine_mitarbeiter_id(betrieb)`, `meine_einladungen()`.
- [ ] `registriere_betrieb(name,land,vorname,nachname)` → creates business + chef row (roll back).
- [ ] `einladung_annehmen(mitarbeiter_id)`, `meine_einladungen()`.
- [ ] `konto_merge_start()` / `konto_merge_confirm(token)` — account merge (auth.tsx).

### 2.2 Messaging (`benachrichtigungen` envelope + satellites)
- [ ] `ankuendigung_erstellen` type `allgemein` / `aenderungswunsch` / `umfrage` (any member) ✅.
- [ ] `ankuendigung_erstellen` type `aufgabenliste` / `dokument` as chef ✅; as plain employee ⛔.
- [ ] Valid `p_prioritaet`: `normal` | `dringend` (others ⛔ via check constraint).
- [ ] Poll: create `umfrage` → `abstimmen(bid, option_ids[], mitarbeiter_id)` → rows in `umfrage_stimmen`.
- [ ] Checklist: create `aufgabenliste` → `aufgabe_umschalten(task_id)` flips `erledigt_am` null↔ts.
- [ ] `als_gelesen_markieren(bid)`.

### 2.3 Shifts — assignment & custom shifts
- [ ] `benutzerdefinierte_schicht_erstellen` mode `zuweisung` (direct, `p_zuweisungen` jsonb
  `[{mitarbeiter_id,rolle_id}]`) ✅.
- [ ] mode `ausschreibung` (open posting, `p_bedarf` jsonb `[{rolle_id,anzahl}]`) ✅.
- [ ] `schicht_zuweisung_warnungen(betrieb,datum,ids[])` → flags urlaub / ungerne.
- [ ] `schicht_zuweisen` ✅; duplicate/overlap must be ⛔ **HC-2** ("ueberlappende Schicht").
- [ ] `schicht_zuweisung_loeschen` → row removed.
- [ ] `schicht_ansehen(instanz, mitarbeiter)` → participants, `understaffed`, `can_edit`.
- [ ] `kalender_schichten(betrieb, von, bis, mitarbeiter?)`, `schicht_offen_ausgeschrieben`.

### 2.4 Shift swap (`tausch_*`) — full chain
Stage two future shifts (Anna, Tim), then:
- [ ] `tausch_anbieten(instanz, praeferenz_tage[], mitarbeiter_id)` → returns broadcast bid.
- [ ] `tausch_annehmen(bid, gegen_zuweisung_id, mitarbeiter_id)` → status `angefragt` (id via
  `schichttausch_anfragen`).
- [ ] `tausch_anbieter_entscheiden(anfrage, true, mitarbeiter)` → status `wartet_auf_chef`.
- [ ] `tausch_entscheiden(anfrage, true, grund)` → status `bestaetigt` **and assignments swap**.
- [ ] `tausch_zurueckziehen(anfrage, mitarbeiter)` — withdraw path.

### 2.5 Emergency (`notfall_*`)
- [ ] `notfall_melden(zuweisung_id, grund, mitarbeiter_id)` → `notfaelle.status='gemeldet'`.
- [ ] `notfall_vertretung_ausschreiben(notfall_id)` → broadcast bid.
- [ ] `notfall_vertretung_uebernehmen(bid, mitarbeiter_id)` → `besetzt`; substitute assigned.
  - Expected design: the called-out person **stays** in the roster with `attendet=false`
    (audit trail), the substitute joins with `attendet=true`. Confirm display counts only
    `attendet=true` for understaffing.

### 2.6 Open postings
- [ ] `schicht_ausschreibung_annehmen(bid, rolle_id, mitarbeiter_id)` → `angenommen`; claimant assigned.
  Eligibility gated by role. First-come-first-serve.

### 2.7 Planning cycle & solver plumbing
- [ ] `planungszyklus_erstellen(betrieb, start, ende, deadline?)` → `{id, solver_methode}`
  (`quick` for small teams). Range must not overlap existing `schicht_instanzen`.
- [ ] `offene_stellen_pro_zyklus(betrieb)`.
- [ ] `geplante_schichten_veroeffentlichen(betrieb)` / `_verwerfen(betrieb)` — publish/discard.

### 2.8 Roster privacy (see `roster-privacy` memory)
- [ ] `mitarbeiter_namen(betrieb, ids[])` resolves names (the ONLY sanctioned name lookup for
  non-chef). Raw `select * from mitarbeiter` as a non-chef employee must be RLS-limited.
- [ ] Coworker visibility gated by `betriebs_einstellungen.mitarbeiter_sehen_andere_*`.

### 2.9 GDPR / admin
- [ ] `mitarbeiter_anonymisieren(id)` as chef → sets `vorname='Geloescht'`, `status='inaktiv'`,
  `email/auth_id=null`, `anonymisiert_am` set; deletes einladungen + benachrichtigungen.
  (Regression: status MUST be an allowed value — `eingeladen|aktiv|pausiert|inaktiv`.)
- [ ] `mitarbeiter_universal_machen(id)`, `mitarbeiter_anonymisieren` as non-chef ⛔.

### 2.10 Notifications, preferences & shift notes (V1.0.0)
Tables `push_tokens`, `benachrichtigung_prefs`, `schicht_notizen`, `mitarbeiter.sprache`;
Edge Function `push-versenden`; trigger `trg_benachrichtigung_push`.

**Push tokens & prefs**
- [ ] `push_token_speichern(token, platform)` upserts one row per `expo_token` keyed to
  `auth.uid()`; `push_token_loeschen(token)` removes only your own.
- [ ] `benachrichtigung_pref_setzen(mitarbeiter_id, schluessel, aktiv)` ✅ for your own
  profile; passing another profile's `mitarbeiter_id` ⛔ `Nicht berechtigt`.
- [ ] `benachrichtigung_prefs_holen(mitarbeiter_id)` returns only your stored opt-outs.
- [ ] `mitarbeiter_sprache_setzen(mitarbeiter_id, 'de'|'en'|…)` updates only your own row.

**Shift notes** (act as someone assigned to the shift — Tim `5f1f25c9…`)
- [ ] `schicht_notiz_schreiben(instanz, text, p_mitarbeiter_id)` ✅ when assigned or chef;
  empty text ⛔ `Leerer Text`; not on the shift & not chef ⛔ `Nur Schichtbeteiligte…`.
- [ ] `schicht_notizen_holen(instanz, p_mitarbeiter_id)` returns notes with `is_me` +
  `autor_name` gated by roster privacy (name NULL unless chef / setting-on / own).
- [ ] `schicht_notiz_bearbeiten(id, text)` / `schicht_notiz_loeschen(id)` ✅ on your own note;
  **as a different auth user ⛔ `Nicht berechtigt` — verify the note text is unchanged.**
- [ ] `kalender_schichten` returns `notiz_anzahl` per shift (drives the sticky-note marker).

**Remote-push chain** (recipient with no `push_tokens` row → nothing is actually delivered)
- [ ] Insert a `benachrichtigungen` row with a concrete `mitarbeiter_id` → the trigger fires
  `pg_net` → check `net._http_response` (order by `created desc`): expect **200
  `{"skipped":"no-tokens"}`**. Wrong/absent `x-push-secret` → **403 forbidden**.
- [ ] Set that recipient's `benachrichtigung_prefs` for the row's `typ` to `aktiv=false`,
  insert again → **200 `{"skipped":"opted-out"}`** (verifies the opt-out suppresses push).
- [ ] Clean up: `delete from benachrichtigungen where titel='__pushtest__'` and the temp pref.
  _(2026-08-21: all four states — 403 / no-tokens / opted-out — confirmed via `net._http_response`.)_
- [ ] **Device-only (needs EAS dev-client):** token registers on entry, a real event delivers
  a localized push honoring prefs, tapping it deep-links to the shift/messages, and the
  evening-before + 2 h-before reminders fire. Not testable from the SQL harness or Expo Go.

**Regression rule reminder:** `schicht_notiz_schreiben` accepts a `p_mitarbeiter_id` → it is
re-verified against `auth.uid()` (§5.2 matrix). Edit/delete derive ownership from
`auth.uid()`, never from a passed id.

---

## 3. Solver (`supabase/functions/plan-generieren/`)

The deployed edge function may lag local code — test **local** code directly with Deno.

- [ ] **Break-math equivalence (critical):** JS `nettoStunden()` in `solver.ts` MUST equal DB
  `public.netto_arbeitszeit_stunden(land,start,end)` for every gross duration. Verify at
  boundaries 6.0 / 6.5 / 9.0 / 9.5 / 9.75 / 10.0 / 10.75h for DE **and** AT. If they
  diverge, the solver proposes rows the DB trigger (`schicht_zuweisungen` HC checks) rejects.
  - Legal params live in `gesetzliche_parameter` (`pause_schwelle{1,2}_{stunden,minuten}`).
- [ ] `deno run harness.ts` — small 3-person scenario (sanity, understaffing expected).
- [ ] `deno run scale-harness.ts` — 100 employees. Assert: **0 hard-constraint violations**,
  **0 over hard cap**, high fill rate. This is the real correctness gate.
- [ ] Hard constraints to keep green: HC-1 urlaub, HC-2 overlap, HC-4 rest (`mindestruhezeit`),
  HC-5 monthly cap (`max_stunden_hart`), daily/weekly caps **on net hours**.

---

## 4. App / UI

- [ ] `npx tsc --noEmit` → clean.
- [ ] `npx expo lint`.
- [ ] Boot web: `.claude/launch.json` profile `expo-web` (port 8081) → browser.
  - [ ] Sign-in screen renders (email/password, "Use phone number instead", Sign up).
  - [ ] Legal consent gate appears; scroll-to-agree works.
  - [ ] **0 console errors** on load.

**Getting an authenticated session (Claude can't type a password):** ask the user to sign
in themselves in the Browser pane, then take over the logged-in session. The selected
connection lives in memory, so **navigate via the in-app tab bar / buttons, never a hard
`navigate` to a URL** (a full reload drops the session-selection and bounces to the
connection picker). Test account: `blank037@web.de` (owns 3 profiles in Testbetrieb 12).

Authenticated UI checklist (both role surfaces — the tab bar differs by role):
- [ ] **Connection picker** ("Your Connections") lists each profile with role
  (Manager · Chef 1 / Employee · Tim / Employee · Anna). This intentionally shows every
  *profile*; distinct from `meine_betriebe()` which lists *businesses*.
- [ ] **Manager** role → tabs Messages / Manager / Home / Calendar / Settings.
  - [ ] Home: greeting, "Waiting for your approval", message feed.
  - [ ] Manager: Employees / Shifts / Business sub-tabs, vacation requests, editable roles, team roster with roles.
  - [ ] Calendar: week grid with real shifts + names, Week/Month toggle, "Confirm planned shifts / Delete planned" banner when a cycle is unpublished.
  - [ ] Shift detail (chef edit): editable date/time/comment, team chips (removable), Add-person list. Assigning someone with an overlap must show **"They already have an overlapping shift"** (HC-2 surfaced from a 400 — expected, not a bug).
  - [ ] Settings: phone linking, connections, theme, language, notifications, bug report, Legal.
- [ ] **Employee** role → tabs Messages / Scheduling / Home / Calendar / Settings.
  - [ ] Home: hours-worked meter, upcoming shifts, new messages.
  - [ ] Shift detail (employee, read-only): coworkers (names via `mitarbeiter_namen`),
    "Offer shift for swap" (`tausch_anbieten`) + "Can't attend" (`notfall_melden`).
  - [ ] **Notifications screen** (`notifications.tsx`): categories expand; toggling an item
    persists to `benachrichtigung_prefs` (server) **and** AsyncStorage `notifPrefs`; a denied
    OS-permission row offers "Open" → system settings.
  - [ ] **Shift notes**: on a shift you're assigned to, add a note → it appears with your name
    and edit/delete controls; a note by someone else shows **no** edit/delete for you; the
    calendar week/month cell shows a sticky-note marker when `notiz_anzahl > 0`.
  - [ ] **Offline calendar**: with the network off, the calendar still renders the last synced
    shifts and shows the "offline — last synced" banner; it revalidates on reconnect (NetInfo).
- [ ] **Limitation:** native iOS/Android behavior (gestures, push notifications, local
  reminders) needs a real device/simulator + an **EAS dev-client** build (`expo-notifications`
  is not in Expo Go). A handled Supabase RPC rejection shows as a `400` in the console —
  that's the DB constraint working, not a UI bug.
- [ ] Content check: Privacy Policy / Terms must be **real** text, not placeholders
  (`src/lib/privacyPolicy.ts`, `terms.ts`, `legalDocs.ts`).

---

## 5. Security / advisors
- [ ] `get_advisors(security)` — expected baseline: the `SECURITY DEFINER` warnings are
  by-design (RPCs are the sanctioned API). Real open item: **leaked-password protection**
  (enable in Auth settings). `konto_merge_token` RLS-no-policy is intentional (definer-only).
- [ ] `get_advisors(performance)` after any schema/index change.
- [ ] See `security-posture` memory for the full audit baseline.

### 5.1 Session handling (browser)
- [ ] Session in `localStorage` key `sb-jqpfuotwsgnqihspsmmf-auth-token` = standard
  supabase-js (access + refresh token). Access token **~1h expiry**.
- [ ] **JWT carries no authorization claims** (no `betrieb_id`, no app role) — authz is 100%
  server-side (RLS + definer RPCs). A tampered/forged claim can't escalate. Keep it that way:
  never gate access on a client-supplied claim.
- [ ] Transport: JWT in `Authorization: Bearer` + `apikey` headers; RPC args in POST body.
  PostgREST filters put the user's *own* UUIDs in query strings (normal, HTTPS, RLS-scoped).
  The publishable/anon key (`sb_publishable_…`) is public by design — not a secret.
- [ ] Only the user's own ids appear in `localStorage` (`home:lastMsgSeen:<own_ma_id>`, legal flags).

### 5.2 IDOR / tenant-isolation matrix (run as a member of ONE business against another's ids)
Use the §1 harness with the real session's `sub`. Target a business the user is NOT in
(e.g. ShiftTest1 `a0000000-0000-4000-8000-000000000001`). **Every one must be 0 / NULL / blocked.**
- [ ] Direct RLS reads of another tenant's `mitarbeiter / schicht_instanzen /
  schicht_zuweisungen / benachrichtigungen / betriebs_einstellungen / urlaub / bug_reports /
  plan_aenderungen / umfrage_stimmen` → **0 rows**. `count(distinct betrieb_id)` over
  `mitarbeiter` and `count(*)` over `betriebe` → **1** (own only).
- [ ] Cross-tenant RPCs → rejected: `ist_chef`→false, `meine_mitarbeiter_id`→NULL,
  `kalender_schichten`/`schicht_ansehen`→"Kein Mitglied", `ankuendigung_erstellen`→"Kein
  Mitglied", `benutzerdefinierte_schicht_erstellen`/`schicht_zuweisen`/`planungszyklus_erstellen`/
  `geplante_schichten_veroeffentlichen`→"Nur der Manager/Chef", `mitarbeiter_anonymisieren`→
  "Nur der Chef", `notfall_melden`→"Zuweisung nicht gefunden".
- [ ] **Parameter-spoofing / impersonation:** as user A, pass a `p_mitarbeiter_id` you don't
  own (an employee with a different/NULL `auth_id`). Must reject: `abstimmen`→"Ungültiger
  Mitarbeiter", `notfall_melden`→"Nur eigene Schichten", `tausch_anbieten`→"Du bist dieser
  Schicht nicht zugeteilt". (RPCs verify `p_mitarbeiter_id` belongs to `auth.uid()`.)
- [ ] **Regression rule:** any new RPC that accepts a `p_*_id` (mitarbeiter/betrieb/instanz/
  zuweisung) MUST re-derive or verify ownership from `auth.uid()` — never trust the id
  as-passed. Add it to this matrix.

_Last IDOR run: 2026-08-20 — full tenant isolation ✅, no impersonation ✅, session clean ✅._

---

## 6. Known issues / regressions guarded here
- **FIXED 2026-08-20:** `mitarbeiter_anonymisieren` set invalid `status='deaktiviert'` →
  now `'inaktiv'`. Guarded by §2.9.
- **FIXED 2026-08-20:** `meine_betriebe()` returned duplicate rows → added `distinct`.
  Guarded by §2.1.
- **FIXED 2026-08-20:** Privacy Policy was a joke placeholder → replaced with a real
  GDPR-aware draft (`src/lib/legalDocs.ts`). Still has `[BRACKETED]` operator blanks +
  needs counsel review; Terms/EULA/DMCA remain standard drafts with blanks.
- **OPEN:** leaked-password protection disabled (§5) — enable in Dashboard →
  Authentication → Sign In / Providers → Password / Attack Protection → "Leaked password
  protection" (HaveIBeenPwned). Not changeable via MCP; requires dashboard or Management API.

---

---

## 7. Focused run log — shift lifecycle

Run via the §1 rolled-back-transaction harness against Testbetrieb 12, acting as the shared
login (chef `2f1782cc…`, Tim `5f1f25c9…`, Anna `741276b4…`, Kellner `79ac3fed…`). All three
flows executed inside `begin … rollback` so nothing persisted.

**2026-08-21 — Shift creation, emergency covering, shift switching — all ✅**

| Flow | Steps exercised | Result |
|---|---|---|
| **Shift creation** | `benutzerdefinierte_schicht_erstellen` mode `zuweisung` (direct-assign Tim) → assignment persisted (1 row) → `schicht_ansehen` `can_edit=true` for chef; then mode `ausschreibung` (open posting, 1× Kellner) | ✅ instanz created both modes, assignment written, view RPC correct |
| **Emergency covering** | Tim assigned → `notfall_melden` → `notfaelle.status='gemeldet'` → `notfall_vertretung_ausschreiben` (broadcast) → Anna `notfall_vertretung_uebernehmen` → status `besetzt` | ✅ + audit trail correct: **Tim stays `attendet=false`, Anna joins `attendet=true`** |
| **Shift switching** | Anna `tausch_anbieten` (pref day) → Tim `tausch_annehmen` (gives his shift) → status `angefragt` → Anna `tausch_anbieter_entscheiden(true)` → `wartet_auf_chef` → chef `tausch_entscheiden(true)` → `bestaetigt` | ✅ + **assignments actually swapped** (shift A → Tim, shift B → Anna) |

Schema notes for re-runs: `schicht_zuweisungen` FK column is `schicht_instanz_id` (not
`instanz_id`); swap requests live in `schichttausch_anfragen` linked via
`gegen_schicht_zuweisung_id` (no `benachrichtigung_id` column there).

### 7.1 Failure / permission matrix — shift lifecycle

Same harness, all rolled back. Impersonation cases pass a `p_mitarbeiter_id` the acting
`auth.uid()` does **not** own (Emma `99d52b9f…`, NULL `auth_id`). ⛔ = correctly rejected.

| Case | Call | Expected | 2026-08-21 result |
|---|---|---|---|
| Overlap (HC-2) | `schicht_zuweisen` Tim to a shift overlapping one he holds | ⛔ | ⛔ `HC-2 verletzt … ueberlappende Schicht` |
| Emergency on foreign shift | `notfall_melden(Anna's zuweisung, …, p=Tim)` | ⛔ | ⛔ `Nur eigene Schichten koennen gemeldet werden` |
| Emergency impersonation | `notfall_melden(Tim's zuweisung, …, p=Emma)` | ⛔ | ⛔ `Nur eigene Schichten koennen gemeldet werden` |
| Double take-over (FCFS) | `notfall_vertretung_uebernehmen` twice on same posting | no double-assign | ✅ 2nd returns **`bereits_besetzt`** (sentinel, not an exception); no extra row, substitute unchanged |
| Offer foreign shift | `tausch_anbieten(Anna's shift, …, p=Tim)` | ⛔ | ⛔ `Du bist dieser Schicht nicht zugeteilt` |
| Offer impersonation | `tausch_anbieten(Tim's shift, …, p=Emma)` | ⛔ | ⛔ `Du bist dieser Schicht nicht zugeteilt` |

**Note on the FCFS case:** `notfall_vertretung_uebernehmen` guards against a race/double-fill
by **returning the string `bereits_besetzt`** rather than raising — callers must check the
return value, not rely on an exception. Verified no second assignment is created.

**Harness limitation:** the shared login owns the chef, Tim, and Anna profiles, so
`ist_chef(betrieb)` is always true for it — a genuine *non-manager tries to create/confirm*
rejection can't be exercised from this login. Covered instead by the cross-tenant matrix
below (a member of another business gets "Nur der Manager/…").

### 7.2 Cross-tenant / tenant-isolation matrix — shift lifecycle

Acting as the shared login (member of **Testbetrieb 12 only**), targeting **ShiftTest1**
`a0000000-0000-4000-8000-000000000001` ids. Every op must be blocked / return nothing.
🛡 = correctly blocked.

| Attack (as outsider) | 2026-08-21 result |
|---|---|
| `benutzerdefinierte_schicht_erstellen` in foreign business | 🛡 `Nur der Manager darf Schichten erstellen` |
| `schicht_zuweisen` into foreign shift | 🛡 `Nur Chef` |
| `schicht_ansehen` foreign shift | 🛡 `Kein Mitglied dieses Betriebs` |
| `kalender_schichten` foreign business | 🛡 `Kein Mitglied dieses Betriebs` |
| `notfall_melden` on foreign assignment | 🛡 `Nur eigene Schichten koennen gemeldet werden` |
| `tausch_anbieten` foreign shift | 🛡 `Kein Mitglied dieses Betriebs` |
| Direct RLS read of foreign `schicht_instanzen` | 🛡 0 rows |
| Direct RLS read of foreign `schicht_zuweisungen` | 🛡 0 rows |

Tenant isolation holds across all three shift flows: no create, assign, view, report, or
offer leaks across the business boundary, and RLS returns zero rows for direct reads.

### 7.3 Authenticated UI pass (Manager surface) — 2026-08-21

Via user login-handoff (`blank037@web.de`) into the Browser pane, driven through the
accessibility tree (in-app navigation only). Verified against the Expo web build on :8081.

| Item | Result |
|---|---|
| Load — 0 console errors (persisted across all tab navigation) | ✅ |
| Legal consent gate renders (Privacy Policy + Terms, scroll-to-agree, "I agree") | ✅ (⚠ preview still shows `[DATE]`/`[COMPANY]` operator blanks — known §6 item) |
| Connection picker lists 3 profiles w/ roles (Manager · Chef 1 / Employee · Tim / Employee · Anna) | ✅ |
| Manager tab bar: Messages / Manager / Home / Calendar / Settings | ✅ |
| Home: "Hello, Chef", "Waiting for your approval", New messages feed | ✅ |
| Messages: feed w/ Open-shift, Shift-switching, Poll, Announcement cards + filters | ✅ |
| Manager › Employees: vacation requests, editable Roles (+Add), team roster with roles | ✅ |
| Manager › Shifts: shift templates by weekday (Monday-first), time + role demand, +Add, "Generate shifts" | ✅ |
| Calendar: week grid renders **real** shifts with times + participant names (e.g. "Nachtschicht 22:00–06:00 · Jonas, Lena, Sophie…") | ✅ |
| **Chef shift-detail edit**: editable Date/Start/End/Comment + "Save changes"; TEAM with removable member chips (X); STAFFING counts (Empfang 1/1, Kellner 2/2, Putzkraft 1/1); ADD PERSON search + role-filter chips + addable list (+) | ✅ (visually confirmed, screenshotted) |
| Settings: phone linking, Manage connections, theme Light/Dark/System, Language, notifications, bug report, Legal (Privacy/Terms/EULA/DMCA) | ✅ |
| **Employee (Tim)** tab bar: Messages / **Scheduling** / Home / Calendar / Settings | ✅ |
| Employee Home: "Hello, Tim", hours-worked meter (136 h Aug 2026), upcoming shifts (Today/Tomorrow/Sunday w/ role), new messages | ✅ |
| **Employee read-only shift detail**: DETAILS (non-editable date/time), COWORKERS with names (via `mitarbeiter_namen`, self marked "(you)"), **"Offer shift for swap"** + **"Can't attend"** buttons present & labeled | ✅ (screenshotted) |

**Not exercised by design (side-effecting, logic already green in §7.1):**
- HC-2 "overlapping shift" toast in the chef Add-person flow — no employee in the business
  has an overlap that night, so triggering it would require manufacturing a conflicting
  assignment (a real write). The 400 it surfaces is proven at the RPC layer (§7.1).
- Clicking the employee "Offer shift for swap" / "Can't attend" buttons — each fires a real
  `tausch_anbieten` / `notfall_melden` broadcast to live profiles. Buttons confirmed present;
  RPC chains proven in §7.

_Result: full authenticated UI pass — Manager + Employee surfaces, 0 console errors, all
shift-lifecycle entry points render correctly. Screenshots captured for chef shift-detail
edit and employee shift detail._

---

_Last full run: 2026-08-20 — backend checklist ✅, solver harness ✅, authenticated UI
(manager + employee, via user login-handoff) ✅ 0 console errors, 2 bugs found & fixed.
Update this line each run._
_Last focused run: 2026-08-21 — shift creation + emergency covering + shift switching ✅
(backend RPC harness, all rolled back, 0 regressions). Incl. §7.1 failure/permission matrix
(6 cases) and §7.2 cross-tenant isolation matrix (8 attacks) — all correctly rejected.
§7.3 authenticated UI pass (Manager + Employee surfaces) ✅ 0 console errors, screenshots captured._
_Notifications/notes feature (§2.10) landed 2026-08-21: DB verified — shift-note write +
cross-user edit block (text unchanged), pref ownership check, and the full push chain
(403 / no-tokens / opted-out via `net._http_response`). `tsc` clean; lint clean on new files.
Device push/reminders pending an EAS dev-client build (+ FCM/APNs)._
