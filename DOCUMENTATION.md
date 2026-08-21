# QuickTeam — App Documentation

QuickTeam (package `quickteammobile`) is a cross-platform mobile app for **shift-based team scheduling and communication**. Managers ("Chefs") build rosters, generate shifts with a constraint solver, and broadcast announcements; employees see their upcoming shifts, log preferences, request time off, swap shifts, and cover emergencies.

It is built with **Expo (SDK 57) / React Native** on the client and **Supabase (Postgres + Auth + Edge Functions)** on the backend. The UI is fully multilingual (7 languages) and role-aware.

> **Note for contributors:** Expo has changed significantly. Always read the exact versioned docs at <https://docs.expo.dev/versions/v57.0.0/> before writing code (see `AGENTS.md`).

---

## 1. Technology stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK `~57.0`, React Native `0.86`, React `19.2` |
| Routing | `expo-router` (file-based, typed routes, React Compiler enabled) |
| Backend | Supabase (`@supabase/supabase-js` v2) — Postgres, Auth, Realtime, Edge Functions |
| Local storage | `@react-native-async-storage/async-storage` (session, theme, language, consent, notif prefs, offline read-cache) |
| Notifications | `expo-notifications` (remote push + on-device reminders), `expo-device`; connectivity via `@react-native-community/netinfo` |
| UI / icons | `@expo/ui`, `lucide-react-native`, `expo-linear-gradient`, `expo-glass-effect`, `expo-symbols` |
| Animation | `react-native-reanimated` v4, `react-native-gesture-handler` |
| Localization | `expo-localization` + custom i18n provider |
| Build / deploy | EAS Build (`eas.json`), bundle IDs `com.blank037.QuickTeamMobile` |

Targets **iOS, Android, and Web** (static output). Project scheme: `quickteammobile`.

---

## 2. Repository layout

```
src/
  app/                         # expo-router routes (file = screen)
    _layout.tsx                # root: providers + auth-guarded navigation stack
    (auth)/index.tsx           # sign-in / sign-up / OTP / password reset
    select.tsx                 # pick which business/position to enter
    (tabs)/                    # main app, tab bar
      _layout.tsx              # tab config (role-aware: Manager vs Scheduling)
      index.tsx                # Home (greeting, approvals, hours, next shifts, messages)
      messages.tsx             # Announcements / polls / checklists feed
      scheduling.tsx           # (employees) preferences, availability, vacation
      manager.tsx              # (chefs) roster, roles, planning cycles, custom shifts
      calendar.tsx             # month calendar of real shift instances
      settings.tsx             # theme, language, connections, legal, notifications
      todos.tsx                # (disabled/hidden tab)
    shift/[id].tsx             # shift detail modal
    compose.tsx                # create announcement/poll/checklist (modal)
    notifications.tsx          # notification preferences (server-backed, per-type opt-out)
    bug-report.tsx             # user bug reports
    legal/[doc].tsx            # renders a legal document
  components/                  # DateTimeField (per-platform), HoldButton, Flag,
                               # LegalConsentGate, RefreshScrollView, ScreenGradient
  context/auth.tsx             # AuthProvider: session + active position + all auth flows
  i18n/                        # I18nProvider + locales/{de,en,es,fr,ru,tr,uk}.json
  theme/                       # ThemeProvider + palette (light/dark)
  lib/                         # supabase client, shifts, legal registries,
                               # notifications (push + reminders), cache (offline read)
supabase/
  functions/plan-generieren/  # Edge Function: shift-generation solver
  functions/push-versenden/   # Edge Function: sends Expo push for a notification row
  email-templates/            # signup + password-reset code emails
```

---

## 3. Core concepts / domain model

The backend (Supabase project **QuickTeam**, `jqpfuotwsgnqihspsmmf`, eu-west-1) uses German-named tables. Key entities:

- **`betriebe`** — a *business/company*. **`betriebs_einstellungen`** holds its settings (visibility toggles, solver method, accounting cutoff, etc.). **`betrieb_abonnements`** tracks subscription/seat allowance.
- **`mitarbeiter`** — a *position/employment* a person holds in a business. A single auth account (`auth_id`) can hold **several positions** across businesses, each with its own `rolle_typ` (`chef` = manager, else employee). This is why sign-in leads to a **selection screen**.
- **`rollen` / `mitarbeiter_rollen`** — job roles (e.g. waiter, cook) and which employees hold them. Roles gate who may be assigned to a shift.
- **`einladungen`** — pending invitations: a business invites a person by email; the invitee accepts to create their `mitarbeiter` position.
- **Shifts**
  - **`schicht_vorlagen`** — weekly shift *templates* (weekday, start/end, roles) with **`schicht_vorlage_mindestbesetzung`** (minimum staffing per role).
  - **`schicht_instanzen`** — concrete dated shift instances, materialized from templates, with **`schicht_instanz_mindestbesetzung`**.
  - **`schicht_zuweisungen`** — assignments of employees to instances (`quelle` = `manuell` / `solver` / `tausch`).
  - **`planungszyklen`** — planning cycles (typically one month) that drive shift generation; states include `offen`, `deadline_erreicht`, `vorschlag_bereit`, published.
- **Preferences & availability**
  - **`mitarbeiter_schicht_vorlieben`** — standing *gerne/ungerne* (like/dislike) preferences.
  - **`mitarbeiter_schicht_tagesvorlieben`** — per-date preference overrides.
  - **`verfuegbarkeiten`** — availability windows; **`urlaub`** — vacation/leave requests; **`abwesenheit`** — absences.
- **`gesetzliche_parameter`** — legal working-time parameters per country (`betriebe.land`): daily/weekly maxima, minimum rest.
- **Communication**
  - **`benachrichtigungen`** — a *universal notification envelope* used for all broadcasts (announcements, polls, checklists, and system events like shift swaps, emergencies, shift postings). Satellites: **`benachrichtigung_gelesen`** (read state), **`umfrage_optionen` / `umfrage_stimmen`** (poll options/votes), **`aufgaben`** (checklist items), **`nachricht_anhaenge`** (attachments).
  - **Push & preferences** — **`push_tokens`** (one Expo push token per device, keyed to `auth_id`), **`benachrichtigung_prefs`** (`mitarbeiter_id, schluessel, aktiv`; per-type opt-out, absence = ON, `schluessel` == the notification `typ`). `mitarbeiter.sprache` records the UI language so pushes are localized server-side.
  - **`schicht_notizen`** — per-shift *sticky notes*. Anyone assigned to the shift (or the chef) may add a note; each author edits/deletes only their own.
- **Swaps & emergencies**
  - **`schichttausch_anfragen`** — shift-swap requests (bidirectional swap flow).
  - **`notfaelle`** — emergency call-outs needing coverage.
  - **`schicht_ausschreibung_bedarf`** — open-posting demand for custom/ad-hoc shifts.
- **Misc:** `bug_reports`, `konto_merge_token` (account-merge), `plan_aenderungen` (change log).

---

## 4. Authentication & session

Managed by `src/context/auth.tsx` (`AuthProvider` / `useAuth`). Supabase Auth backs everything.

Supported flows:
- **Email + password** sign-up (8-digit email code confirmation), sign-in, resend code, and **password reset** (8-digit recovery code → set new password). Enumeration-protected: an already-registered email is detected and the user is steered to sign-in.
- **Phone / SMS OTP** — `signInWithPhone` sends a 6-digit SMS code; the same call creates the account on first use (no separate phone sign-up). `verifyPhone` opens the session.
- **Add a channel** to an existing account — `addPhone` / `addEmail` + `verifyChannelChange` (for phone-first or email-first users to link the other).
- **Account merge** (rare fallback) — `konto_merge_start` on the duplicate account mints a token; `konto_merge_confirm` on the keeper account re-points all positions.

> Auth email templates (signup code, password-reset code) live in `supabase/email-templates/`. The signup template needs `{{ .Token }}` to deliver the OTP.

### Navigation gating (`src/app/_layout.tsx`)
`Stack.Protected` guards route on two flags:
1. `!user` → **`(auth)`** sign-in group.
2. `user && !entered` → **`select`** screen (choose a business/position).
3. `user && entered` → **`(tabs)`** main app + modal routes.

`enterApp(position)` sets the **active `mitarbeiter`** (id, betrieb_id, rolle_typ) and lands on Home; `exitToSelection()` returns to the picker to switch business or manage connections. The active position's `rolle_typ` drives all role-based UI.

---

## 5. Screens & features

### Selection (`select.tsx`)
Lists **pending invitations** (`meine_einladungen` RPC → `einladung_annehmen`) and **joined positions** (active `mitarbeiter` rows with business names). The user taps a position to enter the app as that role.

### Tabs (`(tabs)/_layout.tsx`)
Seven tab screens, but the bar is **role-aware**:
- **Manager** tab shows only for `chef`; **Scheduling** tab shows only for employees.
- **Todos** tab is disabled (`href: null`).
- Everyone sees **Messages, Home, Calendar, Settings**.

#### Home (`index.tsx`)
Personalized dashboard: greeting; **pending approvals** section (for chefs: shifts ready to publish, emergencies waiting, vacation requests, swap approvals); **hours worked** per month vs. monthly target (`soll_stunden`); **next shifts**; and **new messages** preview.

#### Messages (`messages.tsx`)
Feed of `benachrichtigungen`: **announcements** (with priority + pinning), **polls** (single/multi-choice, optionally anonymous — `abstimmen` RPC), and **checklists** (`aufgabe_umschalten`). Also surfaces system broadcasts (swaps, emergencies, shift postings) with inline actions. `compose.tsx` (modal) creates new announcements/polls/checklists via `ankuendigung_erstellen`.

#### Scheduling (employees, `scheduling.tsx`)
Employees set **gerne/ungerne** shift preferences (standing + per-date overrides), submit **availability** before a cycle deadline, and request **vacation** (`urlaub`).

#### Manager (chefs, `manager.tsx`)
The largest screen (~1700 lines). Manager tools:
- **Roster & role management** — add/edit employees and roles, invitations, anonymize (`mitarbeiter_anonymisieren`), make a position universal.
- **Shift templates** & minimum staffing.
- **Planning cycles** — create (`planungszyklus_erstellen`), track open positions per cycle, **generate shifts** (invokes the `plan-generieren` Edge Function), then **publish** (`geplante_schichten_veroeffentlichen`) or **discard** (`geplante_schichten_verwerfen`).
- **Manual assignment** — assign/remove people on instances (`schicht_zuweisen` / `schicht_zuweisung_loeschen`), with live constraint warnings (`schicht_zuweisung_warnungen`; overlap, rest, role, vacation, daily/weekly max).
- **Custom / ad-hoc shifts** — `benutzerdefinierte_schicht_erstellen`: either direct-assign people or open a posting eligible roles can claim first-come-first-serve.
- Approvals for vacation, swaps, and emergencies.

#### Calendar (`calendar.tsx`)
Month view rendering real `schicht_instanzen` via `kalender_schichten` / `schicht_ansehen` RPCs. Visibility is gated by the business settings `mitarbeiter_sehen_andere_schichten` / `_mitarbeiter`. Chefs can edit a shift inline. Coworker names are resolved through the privacy-preserving `mitarbeiter_namen` RPC — never a raw roster select.

#### Shift detail (`shift/[id].tsx`)
Modal showing one shift's details, coworkers, and the actions available (swap offer, emergency call-out). Also hosts the **shift-notes** card (`schicht_notizen_holen` / `_notiz_schreiben` / `_bearbeiten` / `_loeschen`): anyone on the shift (or the chef) can add a note; edit/delete controls appear only on the caller's own notes. A `notiz_anzahl` count (returned by `kalender_schichten`) drives a sticky-note marker on the calendar.

#### Settings (`settings.tsx`)
Theme (light/dark/system), language picker, **manage connections** (switch business / add phone or email), **notifications** screen, **legal** documents list, and **bug report**.

---

## 6. Key domain workflows

These are the app's signature flows, each backed by dedicated RPCs and a `benachrichtigungen` broadcast:

- **Shift swap** (bidirectional): offerer offers a shift + up to 3 preferred days → a responder gives a shift back → offerer (and optionally chef) approves → both assignments swap. RPCs: `tausch_anbieten`, `tausch_annehmen`, `tausch_anbieter_entscheiden`, `tausch_entscheiden`, `tausch_zurueckziehen`; broadcast type `schicht_tausch`.
- **Emergency cover**: employee calls out of a shift (`notfall_melden`) → manager sees an urgent section → posts for replacement (`notfall_vertretung_ausschreiben`) → an eligible employee takes it over (`notfall_vertretung_uebernehmen`), broadcast `notfall_vertretung`.
- **Custom shift posting**: `benutzerdefinierte_schicht_erstellen` with direct assignments or an open posting → eligible roles claim it (`schicht_ausschreibung_annehmen`), broadcast `schicht_ausschreibung`.
- **Announcements / polls / checklists**: `ankuendigung_erstellen` → `abstimmen` (vote), `aufgabe_umschalten` (check item), `als_gelesen_markieren` (read).

---

## 7. Shift-generation solver (Edge Function)

`supabase/functions/plan-generieren/` implements automatic roster generation. `index.ts` is the DB load/persist/HTTP layer; `solver.ts` is the pure algorithm (also `harness.ts`, `scale-harness.ts` for testing/scaling).

**Pipeline:** load an open `planungszyklen` → materialize `schicht_instanzen` from weekly `schicht_vorlagen` across the cycle's date range → assign employees (**feasibility-first greedy fill, hardest shifts first**, then a **hill-climbing swap phase**) → write `schicht_zuweisungen` (`quelle='solver'`) and flip the cycle to `vorschlag_bereit`, recording unfilled slots as warnings.

**Hard constraints** (mirror the `pruefe_zuweisung_constraints()` DB trigger exactly, so the solver never proposes a row the DB would reject):
- HC-3: employee holds the required active role.
- HC-1: not on approved `urlaub` for that date.
- HC-2: no overlapping shift (unioned across positions sharing an `auth_id`).
- HC-4: rest gap ≥ legal minimum rest.
- Legal daily/weekly maxima (`gesetzliche_parameter` by country).
- HC-5: monthly (cycle) hours ≤ `max_stunden_hart`.

**Soft objective** (priority: preference > overtime > fairness): decaying **gerne** rewards / growing **ungerne** penalties (per-date overrides standing), historical overtime beyond tolerance, and distance above the monthly `soll_stunden` target. Monthly targets/caps are **pro-rated down** by approved vacation.

**Out of scope:** proven optimality, moves larger than pairwise swaps. Standing availability (`verfuegbarkeiten`) is ignored — only approved `urlaub` blocks a day. Reruns are refused (409) unless `{ force: true }`, which wipes prior `solver` rows but never touches `manuell`/`tausch`.

---

## 8. Cross-cutting systems

### Theming (`src/theme/`)
`ThemeProvider` exposes `theme` colors, `mode` (light/dark/**system**), `isDark`, `setMode`. Mode persists in AsyncStorage (`themeMode`); `system` follows the OS color scheme. Colors come from `palette.ts`.

### Internationalization (`src/i18n/`)
`I18nProvider` exposes `t(key, params)` and `setLang`. Seven locales: **de, en, es, fr, ru, tr, uk** (JSON files under `locales/`). Keys are dot-nested; `{{placeholder}}` interpolation. Default language follows the OS locale, falling back to English; user choice persists in AsyncStorage (`lang`).

### Legal / consent (`src/lib/legal.ts`, `LegalConsentGate.tsx`)
A registry of legal docs (`privacy`, `terms`, `eula`, `dmca`). **Privacy Policy** and **Terms** are consent documents with versions; `LegalConsentGate` blocks the app whenever either version bumps beyond what the user last accepted (stored per-doc in AsyncStorage). EULA points to Apple's standard hosted EULA; DMCA is reference-only.

### Notifications, push & reminders
Three layers, added in V1.0.0 (see the `notifications-model` memory):
- **Remote push.** `src/lib/notifications.ts` registers each device's Expo push token (`push_token_speichern`). An `AFTER INSERT` trigger on `benachrichtigungen` (`trg_benachrichtigung_push`) calls the **`push-versenden`** Edge Function via `pg_net`, authenticated by a shared secret in `app_private.config` (read through the service-role-only `push_secret_lesen()` RPC). The function resolves recipient → tokens, **skips if the per-type opt-out is set**, composes localized text (de/en catalog keyed by `typ`, using `mitarbeiter.sprache`), and POSTs to the Expo push service. Because it hangs off the envelope insert, **every** notification `typ` auto-pushes with no change to the existing broadcast RPCs.
- **On-device reminders.** `scheduleShiftReminders()` schedules local notifications for the user's upcoming shifts — an **evening-before 18:00 summary** and a **2 h-before heads-up** — gated by the `shiftReminder` preference. Local, so they fire offline. Scheduled from the calendar's `load()`.
- **Preferences.** `notifications.tsx` reads/writes server-side prefs (`benachrichtigung_prefs_holen` / `_pref_setzen`), cached in AsyncStorage (`notifPrefs`) so the reminder gate is readable offline; item keys equal the notification `typ` so an "off" toggle suppresses the matching push. Registration + notification-tap deep-linking live in `(tabs)/_layout.tsx`.

> **Native build required:** `expo-notifications` means push/reminders need a fresh **EAS dev-client / production build**, plus **FCM (Android) + APNs (iOS)** credentials. They do not work in Expo Go.

### Offline read (`src/lib/cache.ts`)
A lightweight read-through cache over AsyncStorage. The calendar hydrates from the last synced copy first, then revalidates when the `kalender_schichten` fetch succeeds (or on reconnect via NetInfo), showing an "offline — last synced" banner while stale. Read-only — offline *writes* (swaps, claims, roster edits) are out of scope for V1.

### Bug reports
`bug-report.tsx` writes to `bug_reports`.

---

## 9. Data-access & security model

- **Everything goes through Supabase** using the anon key (`EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` from `.env` locally or the EAS profile). See `src/lib/supabase.ts`.
- **RLS is enforced** on all tables; sensitive mutations run through **`SECURITY DEFINER` RPCs** (the ~50 functions listed under `public`). Helper predicates: `ist_chef`, `meine_mitarbeiter_id`, `kann_schicht_sehen`, `ich_bin_zugewiesen`.
- **Roster privacy:** the `mitarbeiter` table is RLS-locked to self / chef / setting-enabled. Coworker names are resolved only via `mitarbeiter_namen(betrieb, ids[])`, never a raw roster select for non-chefs.
- **Hardening:** a full security audit was completed — `PUBLIC`/`anon` EXECUTE was revoked (anon-callable functions reduced 36 → 0). Outstanding TODO: enable Supabase leaked-password protection.
- Triggers enforce integrity: `pruefe_zuweisung_constraints` (assignment legality), `pruefe_letzter_chef` (can't remove the last chef), `schreibe_audit_log`, `set_aktualisiert_am`, `rls_auto_enable`.
- **Push fan-out:** `trg_benachrichtigung_push` (AFTER INSERT on `benachrichtigungen`) posts to the `push-versenden` Edge Function via `pg_net`. The shared auth secret lives in the non-API `app_private.config` schema and is exposed only to the function via the `service_role`-only `push_secret_lesen()` RPC. New tables `push_tokens` / `benachrichtigung_prefs` / `schicht_notizen` are RLS-scoped to the owner; their mutations go through `SECURITY DEFINER` RPCs that re-derive ownership from `auth.uid()`.

---

## 10. Configuration & build

- **`app.json`** — Expo config: name/slug `QuickTeamMobile`, scheme `quickteammobile`, portrait, automatic UI style, splash `#208AEF`, plugins (`expo-router`, `expo-splash-screen`, `expo-localization`, `expo-notifications`), experiments `typedRoutes` + `reactCompiler`, EAS project `49bac53f-…`.
- **`eas.json`** — EAS build profiles (env vars for Supabase URL/anon key must be set per profile since `.env` is gitignored).
- **`.env`** — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **Scripts:** `npm start` (Expo dev), `npm run android` / `ios` / `web`, `npm run lint`.

---

## 11. Glossary (German → English)

| German | Meaning |
|--------|---------|
| Betrieb / Betriebe | Business / company |
| Mitarbeiter | Employee / position |
| Chef | Manager / owner |
| Rolle(n) | Role(s) / job function |
| Schicht(en) | Shift(s) |
| Schicht-Vorlage | Shift template |
| Schicht-Instanz | Concrete dated shift |
| Zuweisung | Assignment |
| Planungszyklus | Planning cycle |
| Vorliebe (gerne/ungerne) | Preference (like/dislike) |
| Verfügbarkeit | Availability |
| Urlaub | Vacation / leave |
| Abwesenheit | Absence |
| Notfall | Emergency |
| Tausch | Swap |
| Ausschreibung | Posting / call for applicants |
| Benachrichtigung | Notification / broadcast |
| Umfrage | Poll / survey |
| Aufgabe | Task / checklist item |
| Einladung | Invitation |
| Gesetzliche Parameter | Legal (working-time) parameters |
| Mindestbesetzung | Minimum staffing |
| Soll-Stunden | Target hours |
| Notiz(en) | (Shift) note(s) |
| Sprache | Language |
