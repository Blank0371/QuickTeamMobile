# QuickTeam — Version History

This file is the changelog / feature ledger for QuickTeam. Every change to the app is recorded here under a version header.

## Versioning scheme: `1.Y.X`

| Part | Name | When it increments |
|------|------|--------------------|
| `1` (major) | **Major** | Only on a **MAJOR** update (a large, breaking, or milestone release). Stays `1` for now. |
| `Y` (minor) | **Build** | **Every time the app is built** (a new EAS build goes out). |
| `X` (patch) | **Change** | **Every app change** — incremented once per documented change within the current build. |

**Rules**
- Every request that changes the app **must** be documented here under a version header, with the next patch number (`X` + 1).
- When a new build is made, bump `Y`, reset `X` to `0`, and open a new header for the next cycle.
- `1.0.0` is the current production build (see below). All changes made **after** this build go under `1.1.X`.

---

## 1.1.X — (in development, next build)

_Changes made after the `1.0.0` build land here. Add a `### 1.1.X` entry per change._

### 1.1.0
- Rewrote the Terms & Conditions (AGB) as a comprehensive B2B SaaS subscription contract (Unternehmer/§14 BGB only, German-law, court-safe under §§305–310 BGB), in German (authoritative) and English (convenience translation). German AGB now covers scope/definitions, service description, registration & contract formation, availability/maintenance/support, prices & payment, term & termination, customer duties & data-controller responsibility (AVV/Art. 28 GDPR), rights of use, warranty (§536a carve-out), a court-safe liability clause, force majeure, confidentiality, change-of-terms with objection right, and final provisions (German law, CISG excluded, jurisdiction at seat). Marked-up placeholders left for facts only the operator can supply. Pre-lawyer draft. — `src/lib/legalDocs.ts`, `src/lib/terms.ts`
- Bumped `TERMS_VERSION` to `2026-09-10-draft`, which re-prompts all users to accept via the consent gate. — `src/lib/terms.ts`

### 1.1.1
- Filled in all AGB placeholders with the operator's real details: Geschäftsführer Leo Solomon, Amtsgericht Stuttgart HRB 795737, USt-IdNr DE369517679; Stripe as sole payment provider (owner pays, employees free); monthly billing with month-to-month term and cancellation/non-payment ending the contract at the end of the paid period; dropped the fixed availability figure (best-effort, no SLA quota); AVV referenced as concluded at registration. Applied to German (binding) and English versions in lockstep. — `src/lib/legalDocs.ts`
- Added a `/legal` folder at the repo root with review copies for the lawyer: `AGB-QuickTeam-de.md`, `Terms-QuickTeam-en.md`, a new Art. 28 GDPR data-processing agreement (`AVV-QuickTeam-de.md` / `DPA-QuickTeam-en.md`, each with the three annexes), and a `README.md` index. These are stand-alone copies of the in-app text plus the newly drafted AVV/DPA; not yet wired into an in-app acceptance flow. — `legal/`

### 1.1.2
- Filled the remaining AVV/DPA gaps with operator-confirmed facts (no `[BITTE PRÜFEN]`/`[TO BE REVIEWED]` markers left): no DPO required (§ 38 Abs. 1 BDSG, ≤2 processors); Supabase hosting in the Ireland region with an active DPA; Stripe treated as an independent controller with an accepted DPA; US push transfers based on the EU-U.S. Data Privacy Framework (Apple, Google) plus EU Standard Contractual Clauses (Expo); TOM annex hardened with admin 2FA and daily backups retained 7 days. German (binding) and English versions updated in lockstep; README "resolved/open" sections refreshed. — `legal/AVV-QuickTeam-de.md`, `legal/DPA-QuickTeam-en.md`, `legal/README.md`

### 1.1.3
- **Launch-Checkliste Punkt 11 — betriebliche Vertragsannahme auf vertretungsberechtigte Personen beschränkt.** Backend/DB (`rechtliche_zustimmungen`, Supabase-Projekt `jqpfuotwsgnqihspsmmf`): Die einzelne erlaubende INSERT-Policy `zustimmung_insert_selbst` durch zwei getrennte Policies ersetzt — betriebliche Vertragsdokumente (`agb`, `avv`) dürfen nur noch von einem **aktiven Chef** (`ist_chef`) und nur für sich selbst als Unterzeichner eingetragen werden (`zustimmung_insert_betrieblich`); die persönliche Kenntnisnahme (`datenschutz`) darf weiterhin jedes aktive Mitglied für sich selbst eintragen (`zustimmung_insert_persoenlich`). Zusätzlich neue, unveränderliche generierte Spalte `art` (`betrieblich`/`persoenlich`), die die beiden Zustimmungsarten getrennt speicherbar und auswertbar macht. Unter RLS verifiziert: Nicht-Chef → `agb` abgelehnt (42501), Nicht-Chef → `datenschutz` erlaubt, Chef → beides erlaubt, gefälschter Unterzeichner (fremde `auth_id`) abgelehnt, unbekanntes Dokument via bestehende CHECK-Constraint abgelehnt (23514). Keine Bestandsdaten zu bereinigen (alle vorhandenen `agb`/`avv`-Zeilen stammen von Chefs). Migrationen: `item11_trenne_betriebliche_von_persoenlicher_zustimmung`, `item11_drop_redundante_dokument_check`.

### 1.1.4
- **Launch-Checkliste Punkt 14 — angenommene Dokumentfassungen dauerhaft nachweisbar.** Backend/DB (`rechtliche_zustimmungen`, Supabase `jqpfuotwsgnqihspsmmf`): Zwei neue Spalten ergänzt, damit Unterzeichner/Betrieb/Zeitpunkt/Version **plus Sprache und exakte Fassung** belegbar sind: `sprache` (NULL-bar, CHECK BCP-47-Form `^[a-z]{2}(-[A-Za-z]{2,4})?$`) und `inhalt_hash` (NULL-bar, CHECK sha256-Hex `^[0-9a-f]{64}$`) für den Hash des exakt angenommenen Textes — deckt einen Texttausch unter derselben Versionskennung auf. Beide bewusst NULL-bar, damit bestehende Client-Inserts nicht brechen; nach Client-Anpassung auf NOT NULL verschärfbar. Append-only bestätigt: keine UPDATE/DELETE-Policy → Nutzer können akzeptierte Zeilen nicht mehr ändern (UPDATE traf 0 Zeilen), alte Fassungen bleiben als getrennte Zeilen erhalten (Unique-Index auf betrieb/auth/dokument/version). Unter RLS verifiziert: gültiger Insert mit sprache+hash ok, ungültige Sprache/Hash via CHECK abgelehnt (23514). Die semantische Trennung „Datenschutz = Kenntnisnahme, kein Pauschal-Consent" erfolgt strukturell über `art='persoenlich'` (Punkt 11); die Formulierung selbst gehört zu Abschnitt D. Migration: `item14_zustimmung_sprache_und_inhalt_hash`.

### 1.1.5
- **Launch-Checkliste Punkt 32 — Planungsalgorithmus und Datenbankregeln angeglichen.** Zwei Unstimmigkeiten zwischen Solver und DB-Trigger behoben, gemäß Produktentscheidung. (1) **`max_stunden_hart` = harte KALENDERMONATS-Obergrenze auf BRUTTO-Stunden** (vorher: Solver monatlich/brutto, DB-Trigger woechentlich/netto — dadurch war die Monatsgrenze bei manueller Zuweisung faktisch wirkungslos). DB-Trigger `pruefe_zuweisung_constraints` prüft jetzt die Bruttostunden im Kalendermonat der Schicht (nach Startdatum) gegen `max_stunden_hart`; der gesetzliche Wochen-Höchstwert (netto) bleibt separat. Solver-HC-5 summiert ebenfalls pro Kalendermonat aus `belegt`. Migration `item32_max_stunden_hart_monatlich`. — `supabase/functions/plan-generieren/solver.ts`, DB (`jqpfuotwsgnqihspsmmf`). (2) **Mehrfachprofile mit gleichem Login = vollständig unabhängige Arbeiter** (Entscheidung): Der Solver behandelt Profile mit gleichem `auth_id` nicht mehr als einen Körper — die auth-peer-Vereinigung bei Überlappung/Ruhezeit wurde entfernt; jede Prüfung läuft nun pro `mitarbeiter_id`, exakt wie der DB-Trigger (der bereits so arbeitete, daher trigger-seitig keine Änderung). Verifiziert: Solver-Tests (Kalendermonats-Cap 2/Monat statt 2/Zyklus; zwei Profile dürfen sich zeitlich überlappen) und Trigger unter RLS-freien Transaktionen (Cap 20 → HC-5-Ablehnung „Monat ab …" bei wochenübergreifender Monatssumme 16+8; Cap 30 → Insert erfolgreich). Die Warn-RPC `schicht_zuweisung_warnungen` prüft nur Urlaub/Vorlieben (keine Stunden/Überlappung) und war nicht betroffen.

### 1.1.6
- **Launch-Checkliste Punkt 33 — Schutz bei nachträglichen Schichtänderungen + Statusvergleich korrigiert.** Backend/DB (`jqpfuotwsgnqihspsmmf`). (a) **Statusfix:** Der Trigger prüfte auf `status = 'deaktiviert'` — diesen Wert gibt es nicht (gültig: `eingeladen`/`aktiv`/`pausiert`/`inaktiv`), die Sperre war also wirkungslos. Jetzt: nur `aktiv` und `eingeladen` sind planbar; `pausiert`/`inaktiv` werden abgelehnt (deckt sich mit dem Solver). (b) **Re-Validierung bei Schichtänderung:** Bisher liefen die Regeln (HC-1..HC-5, Überlappung, Ruhezeit, Tages-/Wochen-/Monatsgrenzen) nur beim Zuweisen; eine spätere Änderung von Datum/Zeiten an `schicht_instanzen` wurde nicht erneut geprüft. Die gesamte Prüflogik wurde in eine gemeinsame Routine `pruefe_zuweisung_regeln(...)` ausgelagert (kein Logik-Duplikat/Drift). Neuer Trigger `trg_instanz_aenderung_constraints` (AFTER UPDATE auf `schicht_instanzen`) prüft bei zeitrelevanter Änderung alle betroffenen Zuweisungen erneut; personenbezogene Regeln (Rollenqualifikation, Status) laufen nur beim Zuweisen, zeitabhängige Regeln (Urlaub, Überlappung, Ruhezeit, Grenzen) in beiden Pfaden. Nacht/Mitternacht/Sommerzeit sind durch die bestehenden Primitive (`schicht_intervall` auf `timestamp` ohne Zeitzone, Übernacht = +1 Tag) korrekt. Helper ist SECURITY INVOKER (RLS wie beim Aufrufer, kein betriebsübergreifender Leak), EXECUTE nur für `authenticated`/`service_role`. Verifiziert unter RLS-freien Transaktionen und im echten authenticated-Chef-Kontext: `pausiert` abgelehnt; Schicht-Edit mit Überlappung → HC-2 abgelehnt; Edit in Nacht-Slot mit 9 Std. Ruhezeit → HC-4 abgelehnt; harmloser Edit akzeptiert; Monatscap (Punkt 32) beim Zuweisen weiterhin erzwungen. Migrationen: `item33_revalidate_on_shift_edit_and_status_fix`, `item33_helper_security_invoker`.

### 1.1.7
- **Launch-Checkliste Punkt 38 — Performance-Befunde gezielt bewertet und behoben.** Backend/DB (`jqpfuotwsgnqihspsmmf`), drei Bereiche:
  - **RLS pro Zeile (auth_rls_initplan, 12→0):** In 12 Policies direktes `auth.uid()` durch `(select auth.uid())` ersetzt (per `ALTER POLICY`, Semantik identisch), sodass Postgres den Wert einmal pro Query statt pro Zeile auswertet. Betrifft Team (`mitarbeiter`), Kalender/Planer (`schicht_zuweisungen`), `schicht_notizen`, `benachrichtigung_prefs`, `push_tokens`, `rechtliche_zustimmungen`. Migration `item38_rls_initplan_wrap_auth_uid`.
  - **Nicht indexierte FKs (45→22):** 21 gezielte Indizes auf den heißen Pfaden (Kalender, Team, Mitteilungen, Planer), den Constraint-Trigger-Summen und Kaskadenpfaden ab häufig gelöschten Eltern angelegt. Bewusst NICHT indexiert (dokumentiert): reine RESTRICT-Rollen-FKs, sekundäre bereits abgedeckte FKs, ungenutztes `verfuegbarkeiten`-Feature, `einladungen(mitarbeiter_id)`, `rechtliche_zustimmungen(auth_id)`. Migration `item38_targeted_fk_indexes`.
  - **Mehrfache permissive Policies (72→36):** Sechs `FOR ALL`-Schreib-Policies (schicht_zuweisungen, schicht_instanzen, mitarbeiter_rollen, schicht_vorlage_mindestbesetzung, schicht_vorlagen, mitarbeiter_schicht_vorlieben) in reine INSERT/UPDATE/DELETE-Policies aufgeteilt, sodass sie nicht mehr bei jedem SELECT-Scan zusätzlich pro Zeile ausgewertet werden. Lesezugriff bleibt vollständig über die jeweilige `_select`-Policy erhalten (verifiziert: Chef via ist_chef/meine_betriebe/kann_schicht_sehen, Selbst via meine_mitarbeiter_id). `prefs`/`push` bewusst unangetastet (dort ist `FOR ALL` zugleich die Lese-Policy). Migration `item38_split_for_all_write_policies`.
  - Verbleibende 36 multiple_permissive sind gewollt (mitarbeiter UPDATE chef+selbst; Zustimmungs-INSERT betrieblich+persönlich — beides Einzelzeilen-Writes) oder betreffen sehr kleine/ungenutzte Tabellen. Die vom Advisor neu als „unused index" gemeldeten 20 Indizes sind die eben erst angelegten (noch 0 Scans) — laut Checkliste NICHT wegen fehlender Nutzung löschen. Verifiziert: Advisor-Deltas, Chef-CRUD auf schicht_zuweisungen unter authenticated funktioniert, Lese-Policies unverändert. Datenvolumen aktuell klein (<2k Zeilen); Änderungen sichern die Geschwindigkeit bei realistischem Wachstum.

### 1.1.8
- **Launch-Checkliste Punkt 34 — Aussagen zur rechtssicheren Planung begrenzt und belegt.** Prüfung durchgeführt und als Referenzdokument festgehalten: `legals/arbeitszeit-compliance-scope-de-at.md` listet, welche Arbeitszeitregeln QuickTeam für DE/AT tatsächlich prüft (tägliche/wöchentliche Höchstarbeitszeit, Mindestruhezeit, Pausen, kein Einsatz im Urlaub, keine Überlappung, optionale Monats-Obergrenze) und welche **nicht** (Ausgleichs-/Durchrechnungszeiträume, Wochenruhezeit, Sonn-/Feiertags- und Nachtarbeit-Sonderschutz, Branchen-/Tarif-Ausnahmen, Beschäftigtengruppen wie Jugendliche/Schwangere). **Urlaub wird in KALENDERTAGEN gezählt** (inkl. Wochenende/Feiertage, `dayDiff`/`usedDays`), nicht in Werk-/Arbeitstagen wie BUrlG/UrlG — als Grenze dokumentiert. Die Parameterwerte (`gesetzliche_parameter.geprueft_am` = NULL) sind noch nicht anwaltlich abgenommen; bis dahin keine „rechtssicher/gesetzeskonform"-Werbung. Geprüft: die mobile App enthält aktuell **keine** überzogenen Compliance-Aussagen (i18n, `legalDocs.ts`, `terms.ts`); die Rechtstexte formulieren Compliance korrekt als „Unterstützung" der Kundenpflichten. Offen (andere Repos/extern): Website-Marketing gegen dieses Dokument prüfen, anwaltliche Abnahme der Grenzwerte, Entscheidung je nicht-unterstützter Regel (ausschließen vs. nachrüsten). — `legals/arbeitszeit-compliance-scope-de-at.md`, `legals/README.md`

### 1.1.9
- **Launch-Checkliste Punkt 21 (+ Punkt 22) — Datenschutzerklärung an die tatsächlichen Datenflüsse angepasst und mit der AVV vereinheitlicht.** Die in der App ausgelieferte Datenschutzerklärung (`PRIVACY_EN`/`PRIVACY_DE` in `src/lib/legalDocs.ts`) bildete Stripe, die US-Push-Zustellung und die lokale Gerätespeicherung nicht ab und war damit widersprüchlich zur bereits erstellten AVV (deren Anlage 3 die Stripe- und Push-Übermittlungsdetails ausdrücklich „der Datenschutzerklärung" zuweist). Ergänzt (DE + EN im Gleichlauf, aus in der AVV belegten Fakten): (a) **Stripe** als eigenständig Verantwortlicher für die Zahlungs-/Rechnungsdaten des Betriebsinhabers (Stripe Payments Europe, Limited; DPA vorhanden; keine Speicherung vollständiger Kartennummern); (b) **US-Drittlandübermittlung für Push** — Expo (SCC, Art. 46 DSGVO) sowie Apple/Google (EU-U.S. Data Privacy Framework + ergänzend SCC) — §5 sagte bisher fälschlich EU-only; (c) **Abrechnungsdaten** als eigene Datenkategorie; (d) **lokale Speicherung auf dem Gerät** (Session, Zustimmungsnachweis, Offline-Dienstplan-Cache, Benachrichtigungs-/Anzeige-Einstellungen, Push-Token); (e) **Supabase-Region** von „Frankfurt/Irland" auf „Irland" korrigiert (AVV-konform). `PRIVACY_POLICY_VERSION` auf `2026-09-12-draft` gebumpt → alle Nutzer werden über das Consent-Gate erneut zur Zustimmung aufgefordert; Stand-Datum in beiden Sprachen auf den 12. September 2026 aktualisiert. Der veraltete Kommentar in `src/lib/privacyPolicy.ts` (Text liege in den i18n-Locale-Dateien) korrigiert (Quelle ist `legalDocs.ts`). Die eigenständigen Anwalts-/Review-Kopien in `legals/` (`datenschutzerklaerung-de.md`, `privacy-policy-en.md`, ausführlichere Sep-9-Fassung) ebenfalls angeglichen: offener Region-Platzhalter „[zu bestätigen … Frankfurt]" → Irland aufgelöst und Stripe ergänzt (deckten Push/US-Transfer bereits ab). — `src/lib/legalDocs.ts`, `src/lib/privacyPolicy.ts`, `legals/datenschutzerklaerung-de.md`, `legals/privacy-policy-en.md`
  - **Offen (andere Repos/extern):** Die auf der Website ausgelieferte Datenschutzerklärung muss dieselben Datenflüsse spiegeln (Stripe/Push/USA/Region Irland); anwaltliche Abnahme (Abschnitt D, Punkt 25); Website-Hosting-Anbieter und ggf. SMS-Anbieter der Telefon-Anmeldung sind hier bewusst nicht behauptet, weil nicht aus dem App-Repo belegbar. Die zwei in der App gepflegten Kurzfassungen (`legalDocs.ts`) und die ausführlicheren `legals/`-Fassungen sind inhaltlich noch nicht vollständig zusammengeführt (bewusst offen gelassen).

### 1.1.10
- **Rechtstexte mit der Website (QuickTeamFront) gleichgezogen.** Datenschutzerklärung, AGB und AVV/DPA in der App sind jetzt wortgleich mit `QuickTeamFront/docs/rechtliches/legals/` (Stand 13. September 2026, DE + EN), nur ohne Markdown-Syntax (Tabellen als eingerückte Listen). Ersetzt die bisherigen App-Fassungen (AGB 10.09., Datenschutz 12.09.) vollständig — u. a. einheitliche Datenschutzerklärung für Website/Dashboard/App (Vercel, Resend, WEB.DE, Cookies, Speicherdauern, Kontolöschung), AGB mit Testphase, Beendigung bei Nichtzahlung, Datenexport/Data Act und Zustimmungspflicht bei AGB-Änderungen. `PRIVACY_POLICY_VERSION` und `TERMS_VERSION` auf `2026-09-13-draft` (= Website `rechtstexte.ts`) → alle Nutzer werden erneut über das Consent-Gate gefragt. **AVV/DPA neu** als reines Ansichtsdokument unter Einstellungen > Rechtliches (nicht im Consent-Gate, da vom Betrieb bei der Registrierung geschlossen); Titel in allen 9 Sprachen. Review-Kopien in `legals/` byte-identisch mit der Website aktualisiert, README angepasst. — `src/lib/legalDocs.ts`, `src/lib/legal.ts`, `src/lib/privacyPolicy.ts`, `src/lib/terms.ts`, `src/app/(tabs)/settings.tsx`, `src/i18n/locales/*.json`, `legals/`

### 1.1.11
- **Consent-Gate: „Zur Kenntnis genommen" statt „Ich stimme zu".** Button und Hinweistext in allen 9 Sprachen an die Website-Formulierung angepasst (Datenschutzerklärung wird zur Kenntnis genommen, nicht akzeptiert; die App schließt keinen Vertrag — AGB/AVV schließt der Betrieb bei der Registrierung auf der Website). Versionen unverändert, kein erneutes Nachfragen. — `src/i18n/locales/*.json`, `src/components/LegalConsentGate.tsx`
- **Einstellungen > Rechtliches verlinkt auf die Website.** Datenschutz, AGB und AVV/DPA öffnen quickteam.at/datenschutz, /agb und /avv im In-App-Browser (`expo-web-browser`) statt des In-App-Textes; EULA weiter bei Apple, DMCA weiter in der App (nicht auf der Website). Die In-App-Texte von Datenschutz/AGB bleiben für das Consent-Gate; der AVV-Text ist aus dem Bundle entfernt. — `src/app/(tabs)/settings.tsx`, `src/lib/legal.ts`, `src/lib/legalDocs.ts`, `legals/README.md`

### 1.1.12
- **Rechtliches-Links öffnen in der App-Sprache.** Die Links auf quickteam.at tragen jetzt `?lang=de` (App auf Deutsch) bzw. `?lang=en` (alle anderen Sprachen — die Website kennt nur DE/EN). Gegenstück auf der Website (QuickTeamFront, `src/i18n/sprach-parameter.ts`): der Parameter gilt nur für den Seitenaufruf, es wird kein Cookie gesetzt. — `src/lib/legal.ts`, `src/app/(tabs)/settings.tsx`

### 1.1.13
- **Rechtstexte erneut mit der Website gleichgezogen (Löschung nach Vertragsende).** Datenschutzerklärung auf Stand 14. September 2026 (neuer Abschnitt Rechnungsangaben vor dem kostenpflichtigen Abo, Zustimmungsarchiv für AGB/AVV bis Ende des dritten Kalenderjahres nach Vertragsende in 5.2 und Speicherdauer, Löschung von Anmeldekonten ohne verbleibende Anstellung in 15.3), AGB auf Fassung r2 vom 13. September 2026 (§ 5 Abs. 3: nach nicht fortgesetzter Pause gilt § 6 Abs. 4, also Tag 90 + 30; § 6 Abs. 4: Selbstbedienungs-Export auch bei Sperre/Vertragsende, 14 Tage Abrufzeit nach einem Exportverlangen in Textform). Wortgleich aus `QuickTeamFront/docs/rechtliches/legals/`, nur ohne Markdown (Konvertierung geprüft: die Vorfassung ergibt exakt den bisherigen App-Text). `PRIVACY_POLICY_VERSION = "2026-09-14-draft"`, `TERMS_VERSION = "2026-09-13-r2-draft"` (= Website `rechtstexte.ts`). Review-Kopien in `legals/` byte-identisch aktualisiert. — `src/lib/legalDocs.ts`, `src/lib/privacyPolicy.ts`, `src/lib/terms.ts`, `legals/`

### 1.1.14
- **Consent-Gate sperrt nur noch beim ersten Start.** Vorher zeigte jede Versionsänderung allen Nutzern (auch vor der Anmeldung) das blockierende Fenster mit beiden Volltexten. Jetzt wie auf der Website (seit 2026-09-13, AGB § 13 Abs. 2–3: Schweigen ist keine Zustimmung, bis dahin gilt die alte Fassung): blockiert wird nur, wenn auf dem Gerät noch nichts zur Kenntnis genommen wurde; bei einer älteren gespeicherten Fassung erscheint ein Hinweis „Rechtstexte aktualisiert", der nur die geänderten Dokumente nennt, auf quickteam.at verlinkt und mit einem Tippen schließt. Einleitungstext des Gates in allen 9 Sprachen neutral formuliert (`legal.consentIntro` statt „haben sich geändert"); Hinweistexte in DE/EN (andere Sprachen fallen auf EN zurück). — `src/components/LegalConsentGate.tsx`, `src/lib/legal.ts`, `src/lib/privacyPolicy.ts`, `src/lib/terms.ts`, `src/i18n/locales/*.json`

### 1.1.15
- **Zugangssperre nach Vertragsende (AGB § 6 Abs. 2) und bei pausierter Testphase (§ 5 Abs. 3).** Nach der Wahl einer Verbindung und bei jeder Rückkehr in den Vordergrund prüft die App `betrieb_vertrag_beendet()`; bei `true` sehen **alle Rollen** statt der App den Bildschirm „Dieser Betrieb nutzt QuickTeam nicht mehr" mit Betriebsname, Löschhinweis, „Zu deinen Verbindungen" (nur bei einer Anstellung in einem anderen Betrieb) und Abmelden; Chefs zusätzlich „quickteam.at öffnen" für Neuabschluss oder Export. Entscheidung der Betreiberin: ein **Chef** eines pausierten Betriebs (`betrieb_abonnements.status = 'pausiert'`, lesbar über `abonnement_select_chef`) wird ebenfalls gesperrt („Die Testphase ist abgelaufen"), Mitarbeiter nicht. Lese-/Netzfehler oder Zeitüberschreitung (8 s) lassen durch und werden geloggt — wie auf der Website. Nach Schließen des In-App-Browsers wird erneut geprüft. Keine Schemaänderung. — `src/lib/access.ts`, `src/app/locked.tsx`, `src/app/_layout.tsx`, `src/context/auth.tsx`, `src/i18n/locales/{de,en}.json`
- **Serverseitig gelöschte Daten.** (a) Gelöschtes Konto: ein abgelaufener Token wird von supabase-js beim fehlgeschlagenen Refresh verworfen (→ Anmeldung); ein noch gültiger Token eines gelöschten Kontos wird jetzt beim Start und bei Rückkehr in den Vordergrund über `getUser()` → `user_not_found` erkannt und lokal abgemeldet, statt bis zu einer Stunde eine leere App zu zeigen. (b) Gelöschter Betrieb / entfernte Anstellung: die aktive Verbindung wird bei Rückkehr in den Vordergrund gegen `mitarbeiter` geprüft und fällt auf die Verbindungsauswahl zurück; ein veralteter Eintrag in der Auswahl lädt die Liste neu, statt einzutreten. — `src/context/auth.tsx`, `src/lib/access.ts`, `src/app/select.tsx`

<!-- Example:
### 1.1.0
- Short description of the change. — `path/to/file.tsx`
-->

---

## 1.0.0 — Initial production build

The first production release. Full feature set below.

### Platform & stack
- Cross-platform app (**iOS, Android, Web**) built with **Expo SDK 57 / React Native 0.86 / React 19.2**, `expo-router` file-based typed routes, React Compiler enabled.
- **Supabase** backend (Postgres + Auth + Realtime + Edge Functions), accessed via the anon key with **RLS on all tables** and `SECURITY DEFINER` RPCs for sensitive mutations.
- Full **security audit** completed: `PUBLIC`/`anon` EXECUTE revoked (anon-callable functions 36 → 0).

### Authentication & session
- **Email + password** sign-up (8-digit email code confirmation), sign-in, resend code, and **password reset** (8-digit recovery code → new password), with enumeration protection.
- **Phone / SMS OTP** sign-in (6-digit code, account auto-created on first use).
- **Add a channel** to an existing account (link phone or email) with verification.
- **Account merge** fallback for duplicate accounts.
- One auth account can hold **multiple positions** across businesses → post-login **selection screen** to choose which business/position to enter; role (`chef` vs employee) drives all role-based UI.

### Selection screen
- Lists **pending invitations** (accept to create a position) and **joined positions** with business names.

### Home dashboard
- Personalized greeting; **pending approvals** section for chefs (shifts ready to publish, emergencies, vacation requests, swap approvals); **hours worked** per month vs. monthly target; **next shifts**; **new messages** preview.

### Messages / communication
- Feed of **announcements** (priority + pinning), **polls** (single/multi-choice, optionally anonymous), and **checklists** (togglable items).
- Surfaces system broadcasts (swaps, emergencies, shift postings) with inline actions.
- **Compose** modal creates announcements/polls/checklists.

### Scheduling (employees)
- Set **gerne/ungerne** shift preferences (standing + per-date overrides).
- Submit **availability** before a cycle deadline.
- Request **vacation** (Urlaub).

### Manager tools (chefs)
- **Roster & role management** — add/edit employees and roles, invitations, anonymize, make a position universal.
- **Shift templates** with minimum staffing per role.
- **Planning cycles** — create, track open positions, **generate shifts** (constraint solver), then **publish** or **discard**.
- **Manual assignment** with live constraint warnings (overlap, rest, role, vacation, daily/weekly max).
- **Custom / ad-hoc shifts** — direct-assign people or open a first-come-first-serve posting.
- Approvals for vacation, swaps, and emergencies.

### Calendar
- Month view of real shift instances, gated by business visibility settings.
- Chefs edit a shift inline. Coworker names resolved via privacy-preserving RPC.
- **Offline read-cache**: hydrates from last synced copy, revalidates on reconnect, shows an "offline — last synced" banner.
- **Sticky-note markers** on days with shift notes.

### Shift detail
- One shift's details, coworkers, and available actions (swap offer, emergency call-out).
- **Shift notes** card: anyone on the shift (or the chef) adds a note; edit/delete only your own.

### Signature workflows
- **Shift swap** (bidirectional): offer a shift + up to 3 preferred days → responder gives a shift back → offerer (and optionally chef) approves → both assignments swap.
- **Emergency cover**: call out of a shift → manager posts for replacement → eligible employee takes it over.
- **Custom shift posting**: direct-assign or open posting claimed first-come-first-serve by eligible roles.
- **Announcements / polls / checklists**: create → vote / check items / mark read.

### Shift-generation solver (Edge Function `plan-generieren`)
- Materializes shift instances from weekly templates across a cycle, then **feasibility-first greedy fill (hardest shifts first) + hill-climbing swap phase**.
- **Hard constraints** mirror the DB trigger exactly: required active role, no approved vacation clash, no overlapping shift, legal minimum rest, legal daily/weekly maxima, monthly hours cap.
- **Soft objective**: preference > overtime > fairness; monthly targets pro-rated by approved vacation.

### Notifications, push & reminders
- **Remote push** via Expo (AFTER-INSERT trigger on the notification envelope → `pg_net` → `push-versenden` Edge Function); every notification type auto-pushes, localized server-side (de/en), respecting per-type opt-out.
- **On-device reminders**: evening-before 18:00 summary + 2 h-before heads-up, gated by preference, fire offline.
- **Preferences** screen: server-backed per-type opt-out, cached locally for offline reminder gating.

### Cross-cutting systems
- **Theming**: light / dark / system, persisted.
- **Internationalization**: 7 languages (de, en, es, fr, ru, tr, uk), OS-locale default, persisted choice.
- **Legal / consent**: privacy, terms, EULA, DMCA registry; consent gate blocks the app when privacy or terms version bumps.
- **Bug reports** screen.
- **Account deletion**: self-service delete-account (Apple 5.1.1(v) / GDPR); chef-with-members blocked.

### Settings
- Theme, language picker, manage connections (switch business / add phone or email), notifications, legal documents, bug report.
