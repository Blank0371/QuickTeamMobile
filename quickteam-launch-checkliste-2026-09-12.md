# QuickTeam — Launch-Checkliste (Stand 2026-09-12)

Basierend auf dem Codex-Audit vom 2026-09-11. Abschnitt A wurde seither umgesetzt und
ist unten mit Status und den dabei getroffenen Entscheidungen versehen. Abschnitte B–F
und die Nice-to-have-Liste sind unverändert aus dem Original übernommen.

**Empfohlene Reihenfolge (von Codex):** Zuerst A und B, danach Zahlung und Löschung.
Rechtstexte parallel anhand der finalen Abläufe überarbeiten. Anschließend Planung,
Betrieb und vollständige Abnahme. Erst danach ein begrenzter, betreuter Start mit
wenigen Kunden — und erst nach stabilen ersten Durchläufen ein breiter Launch.

**Kritische Grenze:** Eine abgehakte Umsetzung ist noch kein bestandener Test. Gerade
bei Betriebstrennung, anonymen Umfragen, Zahlungen und Wiederherstellung braucht es
überprüfbare Ergebnisse, nicht nur committeten Code.

---

## Pausiert — liegt aktuell bei dir, nicht bei der CLI oder dem Kollegen

Bewusst zurückgestellt am 2026-09-12, keine Eile:

- [x] Supabase Management-API-Token erstellen (gescopt, nur dieses Projekt, nur Auth +
      Edge Functions) und als `SUPABASE_MANAGEMENT_TOKEN` exportieren. Erst danach
      können die zwei letzten A-Punkte fertig werden (Edge Function endgültig löschen,
      `plan-generieren` serverseitig absichern).
      **Erledigt am 2026-09-15 auf anderem Weg:** statt eines eigenen Tokens per
      `supabase login` (CLI) angemeldet; beide A-Punkte damit abgeschlossen.
- [x] Klären, warum der Sandbox-Testklick drei Zeilen in `rechtliche_zustimmungen`
      erzeugt hat, statt nur einer — relevant für Abschnitt B, muss aber nicht vor
      dessen Start geklärt sein.
      **Geklärt am 2026-09-12: Erwartetes Verhalten, kein Bug.** Die drei Zeilen sind
      drei verschiedene Dokumente (`agb`, `avv`, `datenschutz`), in einer einzigen
      Transaktion geschrieben (identischer Mikrosekunden-Zeitstempel). Ein bereits
      vorhandener Unique-Index `(betrieb_id, auth_id, dokument, version)` verhindert
      echte Duplikate; es gibt kein RPC/Trigger, die Website inserted direkt via
      PostgREST. Damit ist die Hypothese „ein Eintrag je Dokumenttyp" bestätigt.
      Dabei bestätigte Randbefunde für Abschnitt B (separat umzusetzen, nicht hier):
      · **P11:** INSERT-Policy `zustimmung_insert_selbst`
        (`auth_id = auth.uid() AND betrieb_id IN meine_betriebe()`) erlaubt jedem
        Mitglied — auch einfachen Mitarbeitern — das Anlegen von `agb`/`avv`-Zeilen
        (den betrieblichen Vertragsdokumenten). Keine Trennung von betrieblicher
        Vertragsannahme und persönlicher Kenntnisnahme → genau Punkt 11.
      · **P14:** Keine `sprache`-Spalte, obwohl Punkt 14 die angenommene Sprache
        verlangt. Unterzeichner, Betrieb, Zeitpunkt, Dokument, Version sind vorhanden.
      · **P12/13:** Insert läuft client-seitig; der Unique-Index wirft bei erneuter
        Annahme derselben Version einen 23505-Konflikt, den die Website korrekt
        behandeln muss (nicht als Erfolg, nicht stillschweigend).

---

## A. Sicherheit und Berechtigungen — vor echten Kundendaten zwingend

**Status: Abgeschlossen (2026-09-15). Alle zehn Punkte geschlossen; die zwei
Teilpunkte, die am Management-Zugang hingen, sind erledigt (Punkte 7 und 10).**

- [x] **1. Anonyme Umfragen wirklich anonym zugänglich machen.**
  Geschlossen. Einzelstimmen mit Mitarbeiter-ID nicht mehr für Betriebsmitglieder
  lesbar, nur aggregierte Ergebnisse über `umfrage_ergebnis()`. Web-Dashboard musste
  dafür zusätzlich angepasst werden (zählte vorher selbst aus Rohdaten), ist erledigt
  und im Browser verifiziert.
- [x] **2. Eigenmächtige Änderung des Urlaubsanspruchs verhindern.**
  Geschlossen. Spaltenschutz von einer Verbotsliste auf eine Erlaubnisliste
  umgestellt (nur `telefon` ist selbst änderbar), inklusive der drei Sonderfälle
  (Einladung annehmen, Kontozusammenführung, Selbstlöschung), die vorher am
  eigentlichen Schutz vorbeiliefen.
- [x] **3. Betriebstrennung bei Schichtnotizen schließen.**
  Geschlossen. Zusammengesetzte Fremdschlüssel erzwingen jetzt, dass Schicht und
  Autor zum selben Betrieb gehören müssen.
- [x] **4. Alle weiteren betriebsübergreifenden Verknüpfungen kontrollieren.**
  Geprüft. `umfrage_optionen` und `nachricht_anhaenge` waren die einzige noch offene
  Lücke, jetzt geschlossen. Alles andere bereits sauber.
- [x] **5. Urlaubsregeln auch außerhalb der vorgesehenen RPC erzwingen.**
  Geschlossen. **Entscheidung während der Umsetzung:** Mitarbeiter dürfen eigene
  Urlaubsanträge nie selbst löschen oder stornieren — egal ob offen, genehmigt oder
  vergangen. Nur die Betriebsleitung storniert. Der bisherige „Antrag zurückziehen“-
  Knopf in der App ist dadurch funktionslos und muss vom App-Entwickler entfernt oder
  umgebaut werden (siehe Handover-Dokument).
- [x] **6. Schutz des letzten aktiven Chefs tatsächlich aktivieren.**
  Geschlossen. Trigger war programmiert, aber an keine Tabelle gebunden — jetzt
  gebunden, mit Ausnahme für die gewollte Betriebsschließung per Kaskade.
- [x] **7. Einladungseinlösung gegen gleichzeitige Aufrufe absichern.**
  Geschlossen. Die tatsächlich genutzte Funktion `einladung_annehmen()` ist jetzt
  atomar (Race Condition geschlossen). Die separate, verwaiste Edge Function
  `einladung-einloesen` hatte denselben Fehler im eigenen Code, wurde aber nie von
  App oder Website aufgerufen — bestätigt tot. Erst per Tombstone (HTTP 410)
  stillgelegt, **am 2026-09-15 endgültig gelöscht** (Version 1.1.22).
- [x] **8. Sämtliche privilegierten Funktionen einzeln prüfen.**
  Geprüft. 51 erreichbare SECURITY DEFINER-Funktionen dokumentiert, keine eskaliert
  unbeabsichtigt. Unnötige Ausführungsrechte (`urlaub_benachrichtigen` u. a.)
  entzogen.
- [x] **9. Authentifizierung und Sitzungen vollständig prüfen.**
  Geprüft, bestätigt sicher. Rollen werden live gegen `auth.uid()` geprüft, keine im
  Token zwischengespeicherten Rechte — Entzug wirkt sofort, auch bei bestehender
  Sitzung.
- [x] **10. Missbrauchsschutz und Geheimnisse kontrollieren.**
  Geschlossen am 2026-09-15 (serverseitige Solver-Sperre live, siehe unten).
  - `disable_signup` war wiederholt offen. Ursache identifiziert: einmaliger
    Vorfall vom 2026-09-09, nie zurückgedreht — keine neue Verletzung. **Entscheidung:
    Öffentliche Registrierung bleibt dauerhaft offen.** Zugriffskontrolle liegt
    bewusst bei Vertragsannahme und Zahlung (Abschnitt B), nicht bei der
    Kontoerstellung. Damit wird Punkt 11 unten zur eigentlichen Sicherheitsgrenze.
  - Rate Limits gemessen (nicht nur ob gesetzt, sondern ob wirksam): Login,
    Registrierung, Passwort-Reset ausreichend geschützt (~30 Versuche/Fenster/IP).
    Einzige echte Lücke: `plan-generieren` (Planungslauf) hatte keinerlei Drosselung.
    Client-seitiger Komfort-Cooldown (5 s, verhindert versehentliche Doppelklicks) ist
    gebaut und verifiziert. Der eigentliche serverseitige Schutz (30 s pro Betrieb →
    429, atomarer Anspruch gegen gleichzeitige Läufe auf einem Zyklus → 409) ist
    **am 2026-09-15 als `plan-generieren` Version 13 deployed** (Version 1.1.18).
    Rauchtest bestanden; Sperrzeit und Anspruch selbst sind live noch nicht mit
    einem Chef-Token durchgespielt.

**Erledigt am 2026-09-15** (vorher „offen, sobald der Token gesetzt ist"):
- ~~Edge Function `einladung-einloesen` endgültig löschen~~ — gelöscht
- ~~`plan-generieren` serverseitig absichern~~ — deployed (Spezifikation in
  `QuickTeamFront/docs/audit-a/app-entwickler-handover.md` §5)

**Hinweis für die Weiterarbeit an Abschnitt B:** Beim Testen des Cooldowns musste ein
Sandbox-Konto real durch das Zustimmungs-Gate klicken, um die Planungsseite zu
erreichen. Dabei sind **drei Zeilen** in `rechtliche_zustimmungen` für einen einzigen
Klick entstanden — belassen als Testdaten, aber wert, früh zu prüfen, ob das erwartet
ist (z. B. ein Eintrag je Dokumenttyp) oder schon ein Symptom von Punkt 12/14.
**Geprüft am 2026-09-12: erwartet — ein Eintrag je Dokumenttyp (`agb`, `avv`,
`datenschutz`), eine Transaktion. Details siehe „Pausiert"-Abschnitt oben.**

---

## B. Vertragsannahme – technisch und rechtlich zusammenführen

- [x] **11. Vertragsannahme auf vertretungsberechtigte Personen beschränken. — Fehler**
  Gewöhnliche Mitarbeiter können aktuell Einträge erzeugen, die als Zustimmung des
  Betriebs zählen. Erledigt, wenn: Betriebliche Vertragsannahme und persönliche
  Kenntnisnahme getrennt gespeichert und ausgewertet werden.
  **DB-Seite geschlossen am 2026-09-12.** Die einzelne INSERT-Policy
  `zustimmung_insert_selbst` durch zwei getrennte ersetzt:
  `zustimmung_insert_betrieblich` (nur `agb`/`avv`, nur aktiver Chef via `ist_chef`,
  nur eigener `auth_id` als Unterzeichner) und `zustimmung_insert_persoenlich`
  (`datenschutz`, jedes aktive Mitglied für sich). Neue unveränderliche generierte
  Spalte `art` (`betrieblich`/`persoenlich`) trennt beide Arten in der Speicherung
  und macht sie getrennt auswertbar. Unter RLS getestet (Nicht-Chef→agb abgelehnt,
  Nicht-Chef→datenschutz erlaubt, Chef→beides, gefälschter Unterzeichner abgelehnt,
  unbekanntes Dokument via CHECK abgelehnt). Bestandsdaten sauber (alle agb/avv von
  Chefs). Migrationen `item11_*`. Version 1.1.3.
  **Offen (Website/App-Seite, andere Repos):** Die Onboarding-Gates müssen die
  Trennung konsumieren — betriebliche Freischaltung an `art='betrieblich'` durch
  einen Chef koppeln, persönliche Kenntnisnahme separat prüfen. Der Nachweis „durch
  wen als Vertreter" liegt jetzt in `auth_id` + der Chef-Policy vor.
  **Randfund für Punkt 32:** `ist_chef` ist bei Mehrfachprofilen mit gleichem Login
  schon dann wahr, wenn *irgendein* Profil dieses Logins im Betrieb Chef ist —
  beim Testen aufgefallen, gehört zur Vereinheitlichung in Punkt 32.
- **12. Fehler bei der Zustimmungsprüfung korrekt behandeln. — Fehler**
  Ein Datenbankfehler darf nicht als erfolgreiche Zustimmung gelten. Erledigt, wenn:
  „Zugestimmt“, „nicht zugestimmt“ und „Prüfung fehlgeschlagen“ technisch
  unterschieden werden und jeweils einen definierten Ablauf haben.
- **13. Speicherung und vollständige Einrichtung absichern. — Fehler**
  Speicherfehler werden derzeit teilweise ignoriert; die Einrichtung kann
  weitergehen. Erledigt, wenn: Vor der Verarbeitung betrieblicher Mitarbeiterdaten
  ein zuverlässiger Annahmenachweis vorliegt – auch bei Wiederaufnahme,
  Bestandskonten und alternativen Zugangswegen.
- [x] **14. Angenommene Dokumentfassungen dauerhaft nachweisbar machen. — Prüfung**
  Unterzeichner, Betrieb, Zeitpunkt, Sprache und exakt angenommene Fassung
  nachvollziehbar speichern. Alte Fassungen aufbewahren; unter derselben
  Versionskennung keine Texte austauschen. Datenschutzhinweise nicht pauschal als
  Einwilligung für sämtliche Verarbeitung behandeln.
  **DB-Seite geschlossen am 2026-09-12 (Version 1.1.4).** Unterzeichner (`auth_id`),
  Betrieb (`betrieb_id`), Zeitpunkt (`akzeptiert_am`) und Version (`version`) waren
  vorhanden; ergänzt: `sprache` (CHECK BCP-47-Form) und `inhalt_hash` (CHECK
  sha256-Hex) für den Nachweis der exakt angenommenen Fassung und zur Aufdeckung
  eines Texttauschs unter gleicher Version. Append-only bestätigt (keine
  UPDATE/DELETE-Policy → Nutzer können akzeptierte Zeilen nicht ändern/löschen; alte
  Fassungen bleiben als eigene Zeilen erhalten). Unter RLS getestet. Trennung
  „Datenschutz = Kenntnisnahme" strukturell über `art='persoenlich'` (Punkt 11).
  Migration `item14_zustimmung_sprache_und_inhalt_hash`.
  **Offen (Website/App-Seite, andere Repos):** `sprache` und `inhalt_hash` sind
  bewusst NULL-bar und müssen von den Clients beim Insert befüllt werden (Sprache
  der angezeigten Fassung + sha256 des exakt angezeigten Textes); danach auf
  NOT NULL verschärfen. Empfehlung fürs Härten: kanonisches Register der
  veröffentlichten Fassungen (`dokument`/`version`/`sprache`/`inhalt_hash`/
  `gueltig_ab`), gegen das der Client-Hash geprüft wird. Die pauschale-Einwilligung-
  Formulierung selbst gehört zu Abschnitt D.

## C. Bezahlung, Kündigung und Löschung

- **15. Rückleitung nach Bankbestätigung reparieren. — Fehler**
  Abgelaufene Testaccounts können nach 3-D-Secure auf der falschen Seite landen.
  Erledigt, wenn: Zahlungsmittelübernahme und Abo-Aktivierung sowohl während als
  auch nach der Testphase zuverlässig abgeschlossen werden.
- **16. Verbindlichen Bestellablauf eindeutig machen. — Prüfung**
  Festlegen, an welcher Stelle der kostenpflichtige Vertrag entsteht. Dort Tarif,
  Preis, Steuerbehandlung, Intervall, Testphase, erste Belastung und Kündigung
  verständlich anzeigen. Erledigt, wenn: Nutzer vor ihrer verbindlichen Erklärung die
  wirtschaftlichen Folgen erkennen.
- **17. Alle Abozustände mit Stripe abgleichen. — Prüfung**
  Testphase mit/ohne Zahlungsmittel, Ablauf, erfolgreiche und gescheiterte Zahlung,
  notwendige Bankbestätigung, Kündigung und Wiederaufnahme testen. Erledigt, wenn:
  Stripe, Datenbank und tatsächlicher Zugang in jedem Fall zusammenpassen.
- **18. Webhooks gegen Wiederholung und falsche Reihenfolge prüfen. — Prüfung**
  Signaturprüfung, doppelte Zustellungen, verzögerte Ereignisse und
  Fehlerwiederholung kontrollieren. Erledigt, wenn: Wiederholte Ereignisse keine
  falsche Freischaltung, Sperre oder widersprüchlichen Abostatus erzeugen.
- **19. Konto löschen, Betrieb schließen und Abo kündigen trennen. — Fehler/offen**
  Der geprüfte Kontolöschablauf enthält keine erkennbare Stripe-Kündigung; die
  Benutzerführung erklärt die Abofolge nicht ausreichend. Erledigt, wenn: Für jeden
  Vorgang klar ist, was mit Zugang, Betrieb, Daten und Abrechnung passiert. Keine
  unbemerkte Weiterzahlung nach Zugangsverlust.
- **20. Rechnungen und grenzüberschreitende Besteuerung prüfen. — Prüfung**
  Rechnungsangaben, Steuersätze und gegebenenfalls Reverse Charge für die
  tatsächlichen deutschen und österreichischen B2B-Kunden mit Steuerberatung
  abstimmen. Erledigt, wenn: Beispielrechnungen für die tatsächlich unterstützten
  Fälle fachlich geprüft sind.

## D. Rechtliches und Datenschutz

- [~] **21. Datenschutzerklärung an Website und App anpassen. — Fehler**
  Stripe, tatsächliches Website-Hosting, E-Mail-Versand, technische Protokolle und
  lokale Speicherung vollständig abbilden. Je Verarbeitung Zweck, Rechtsgrundlage,
  Empfänger und Speicherdauer beziehungsweise Kriterien benennen.
  **App-Seite geschlossen am 2026-09-12 (Version 1.1.9).** Die in der App
  ausgelieferte Datenschutzerklärung (`src/lib/legalDocs.ts`, DE + EN) ergänzt um
  Stripe (Zahlung, eigenständig Verantwortlicher), US-Push-Übermittlung
  (Expo/Apple/Google mit SCC bzw. DPF), Abrechnungsdaten als eigene Kategorie und
  lokale Gerätespeicherung; Supabase-Region auf Irland korrigiert; §5
  (internationale Übermittlung) sagte bisher fälschlich EU-only. Damit
  AVV-konform (Anlage 3 verwies für Stripe/Push ausdrücklich auf die
  Datenschutzerklärung → auch Punkt 22). Consent-Version gebumpt (Re-Prompt aller
  Nutzer). Anwalts-/Review-Kopien in `legals/` angeglichen (Region-Platzhalter
  aufgelöst, Stripe ergänzt).
  **Offen:** Website-Datenschutzerklärung muss dieselben Flüsse spiegeln;
  Website-Hosting-Anbieter und ggf. SMS-Anbieter dort belegen; anwaltliche
  Abnahme (Punkt 25).
- [~] **22. EU-/Drittlandaussagen in der AVV vereinheitlichen. — Fehler**
  Die EU/EWR-Regelung muss nachvollziehbar mit den eingesetzten US-Push-Diensten
  zusammenpassen. Erledigt, wenn: Vertrag, Unterauftragsverarbeiterliste und
  Datenschutzerklärung dieselben tatsächlichen Datenflüsse beschreiben.
  **Teilweise (2026-09-12, Version 1.1.9):** Datenschutzerklärung (App + `legals/`)
  jetzt deckungsgleich mit AVV/Anlage 3 (Supabase = EU/Irland; Expo = SCC; Apple/
  Google = DPF + SCC; Stripe = eigenständig Verantwortlicher, EU). Die drei
  Dokumente (AGB, AVV, Datenschutzerklärung) beschreiben nun dieselben Flüsse.
  **Offen:** Website-Fassungen der drei Dokumente gegen dieselbe Liste prüfen;
  anwaltliche Abnahme.
- **23. Dienstleisterverträge und zugesagte Schutzmaßnahmen belegen. — Prüfung**
  Erforderliche AVV/DPA und Übermittlungsgrundlagen tatsächlich vorhalten. Zusagen
  wie tägliche Backups, sieben Tage Aufbewahrung oder Admin-MFA gegen die
  Konfiguration prüfen. Eine EU-Datenbankregion allein belegt nicht sämtliche
  Aussagen.
- **24. Testphase, Zahlungsausfall und Vertragsende in den AGB bereinigen. — Fehler**
  Beginn und Ende der Testphase, automatische Kostenpflicht und Verhalten ohne
  Zahlungsmittel regeln. Den Widerspruch zwischen Vertragsende bei ausbleibender
  Zahlung und längerem Zahlungsverzug auflösen.
- **25. Übrige AGB gezielt juristisch prüfen lassen. — Prüfung**
  Besonders Änderungszustimmung durch Schweigen, Preisanpassungen, Freistellung,
  Haftung bei Datenverlust, Verfügbarkeit und Support. Erledigt, wenn: Eine im
  SaaS-/IT-Recht erfahrene Person die finalen Texte und den echten Bestellablauf für
  die Zielmärkte geprüft hat. Auch B2B-AGB unterliegen Transparenz- und
  Inhaltskontrollen (§ 307 BGB).
- **26. Impressum vervollständigen und Unternehmensangaben verifizieren. —
  Fehler/Prüfung**
  Einen zusätzlichen wirksamen Kommunikationsweg neben E-Mail bereitstellen. Firma,
  Anschrift, Vertretung, Register und USt-ID gegen die tatsächlichen Angaben prüfen
  (§ 5 DDG).
- **27. Cookies und externe Dienste auf der echten Domain prüfen. — Prüfung**
  Feststellen, welche Dienste schon vor Anmeldung oder Interaktion laden. Nicht
  erforderliche Speicherung beziehungsweise Zugriffe gegebenenfalls erst nach
  Einwilligung ermöglichen. Kein Cookiebanner nur aus Gewohnheit (§ 25 TDDDG).
- **28. Lösch- und Aufbewahrungskonzept praktisch umsetzen. — Prüfung**
  Für Accounts, Mitarbeiterdaten, Schichten, Freitexte, Einladungen, Logs,
  Rechnungen und Backups festlegen, was wann gelöscht oder weiter aufbewahrt wird.
  Erledigt, wenn: Ein vollständiger Testfall geprüft wurde. Das Entfernen eines
  Namens allein beweist keine irreversible Anonymisierung.
- **29. Datenexport und Anbieterwechsel ermöglichen. — Prüfung**
  Einen nutzbaren Export mit klaren Zuständigkeiten und Fristen vorsehen. Die
  AGB-Formulierung „soweit eine Funktion vorgesehen ist“ reicht als verlässlicher
  Prozess nicht. Die Anwendbarkeit und Anforderungen des Data Act auf QuickTeam
  prüfen lassen.
- **30. Datenschutzorganisation und Beschäftigtendaten klären. — Prüfung**
  Verantwortlichkeiten zwischen euch und Arbeitgebern, Verarbeitungsverzeichnis,
  Betroffenenanfragen und Datenschutzvorfälle dokumentieren. Bedarf an
  Datenschutzbeauftragtem und Datenschutz-Folgenabschätzung beurteilen. Für
  Abwesenheitsgründe und Freitexte den Umgang mit Gesundheitsdaten festlegen;
  Betriebsrats-/Mitbestimmungsfragen in Kundeninformationen berücksichtigen.
- **31. Deutsche und englische Fassungen synchronisieren. — Prüfung**
  Gleiche Leistungen, Fristen, Preise, Rechtsfolgen und Versionsstände
  sicherstellen. Erledigt, wenn: Beide Sprachen gemeinsam mit dem Vertragsablauf
  freigegeben sind.

## E. Dienstplanung und verlässlicher Betrieb

- [x] **32. Planungsalgorithmus und Datenbankregeln angleichen. — Konkrete
  Unstimmigkeiten**
  `max_stunden_hart` im Solver monatlich, im Datenbank-Trigger wöchentlich
  behandelt. Auch die Behandlung mehrerer Mitarbeiterprofile mit gleichem Login
  unterscheidet sich. Erledigt, wenn: Die fachliche Bedeutung definiert ist und
  sämtliche Planungswege dieselben Regeln verwenden.
  **Geschlossen am 2026-09-12 (Version 1.1.5). Fachliche Bedeutung definiert
  (Produktentscheidung):**
  · **`max_stunden_hart` = harte Obergrenze der BRUTTO-Stunden pro KALENDERMONAT.**
    Solver und DB-Trigger `pruefe_zuweisung_constraints` verwenden jetzt beide diese
    Regel (vorher Trigger wöchentlich/netto → Monatsgrenze bei manueller Zuweisung
    faktisch wirkungslos). Gesetzlicher Wochen-Höchstwert (netto) bleibt separat und
    unverändert.
  · **Mehrfachprofile mit gleichem Login = vollständig unabhängige Arbeiter.** Jede
    Prüfung (Überlappung, Ruhezeit, Stunden) läuft pro `mitarbeiter_id`. Der
    DB-Trigger arbeitete bereits so; der Solver wurde angepasst (auth-peer-
    Vereinigung bei Überlappung/Ruhezeit entfernt).
  Verifiziert: Solver-Tests (Kalendermonats-Cap; überlappende Schichten für zwei
  Profile) und Trigger-Tests unter Transaktion (Cap 20 → HC-5-Ablehnung bei
  wochenübergreifender Monatssumme; Cap 30 → Insert ok). Warn-RPC
  `schicht_zuweisung_warnungen` prüft nur Urlaub/Vorlieben, war nicht betroffen.
  Migration `item32_max_stunden_hart_monatlich`.
  **Hinweis:** Solver pro-ratet `capHart` weiterhin für Urlaub (nur strenger als der
  Trigger, daher trigger-sicher) — bewusste Solver-Konservativität, keine
  Regelabweichung. `soll_stunden`-Fairness bleibt zyklusbasiert (weiche Zielgröße).
- [x] **33. Schutz bei nachträglichen Schichtänderungen prüfen. — Prüfung**
  Kontrollen bei einer Zuweisung reichen nicht, wenn später Datum oder Zeiten
  verändert werden. Nachtarbeit, Mitternacht, Sommerzeit, Überschneidungen,
  Ruhezeiten, Urlaub und Tages-/Wochenlimits testen. Zusätzlich den Vergleich mit
  Status „deaktiviert“ korrigieren — dieser Wert gehört nicht zu den zulässigen
  Mitarbeiterstatus.
  **Geschlossen am 2026-09-12 (Version 1.1.6).**
  · **Statusvergleich korrigiert:** `'deaktiviert'` existiert nicht (gültig:
    eingeladen/aktiv/pausiert/inaktiv). Der Trigger ließ deaktivierte faktisch durch.
    Jetzt planbar nur `aktiv`+`eingeladen`; `pausiert`/`inaktiv` werden abgelehnt.
  · **Re-Validierung bei Schichtänderung:** Prüflogik in gemeinsame Routine
    `pruefe_zuweisung_regeln` ausgelagert; neuer Trigger
    `trg_instanz_aenderung_constraints` (AFTER UPDATE auf `schicht_instanzen`) prüft
    bei Datum-/Zeitänderung alle betroffenen Zuweisungen erneut (Urlaub,
    Überlappung, Ruhezeit, Tages-/Wochen-/Monatsgrenzen). Personenregeln (Rolle,
    Status) nur beim Zuweisen.
  · **Nacht/Mitternacht/Sommerzeit:** korrekt durch `schicht_intervall` auf
    `timestamp` ohne Zeitzone (Übernacht = +1 Tag) — kein DST-Problem.
  Getestet (rollback-Transaktionen und echter authenticated-Chef-Kontext):
  Status `pausiert` abgelehnt; Edit → Überlappung HC-2 abgelehnt; Edit in Nacht-
  Slot 9 Std. Ruhezeit HC-4 abgelehnt; harmloser Edit akzeptiert; Monatscap
  (Punkt 32) beim Zuweisen weiterhin erzwungen. Helper SECURITY INVOKER, EXECUTE
  nur authenticated/service_role. Migrationen `item33_*`.
- [x] **34. Aussagen zur rechtssicheren Planung begrenzen und belegen. — Prüfung**
  Klären, welche deutschen und österreichischen Arbeitszeitregeln, Ausnahmen und
  Beschäftigtengruppen unterstützt werden. Urlaubsberechnung in Kalender- versus
  Arbeitstagen prüfen. Erledigt, wenn: Werbung und Produkt keine rechtliche
  Vollständigkeit versprechen, die der Regelumfang nicht abdeckt.
  **Geprüft und dokumentiert am 2026-09-12 (Version 1.1.8):** Regelumfang in
  `legals/arbeitszeit-compliance-scope-de-at.md` festgehalten.
  · **Unterstützt (DB-Trigger + Solver, DE/AT):** tägl. Höchstarbeitszeit (DE 10 h /
    AT 12 h, netto), Wochen-Höchst (48 h/ISO-Woche), Mindestruhezeit 11 h, Pausen,
    kein Einsatz im Urlaub, keine Überlappung, optionale Monats-Obergrenze.
  · **Nicht unterstützt (darf nicht versprochen werden):** Ausgleichs-/
    Durchrechnungszeiträume, Wochenruhezeit, Sonn-/Feiertags- + Nachtarbeit-
    Sonderschutz, Gastro-/Tarif-Ausnahmen, Beschäftigtengruppen (Jugendliche,
    Schwangere/Stillende, Azubis).
  · **Urlaub = KALENDERTAGE**, nicht Werk-/Arbeitstage (BUrlG/UrlG) — als Grenze
    dokumentiert; `urlaubsanspruch_tage` ist ein frei gesetzter Wert, kein
    Feiertagskalender.
  · Mobile App enthält **keine** überzogenen Compliance-Aussagen; Rechtstexte
    formulieren Compliance korrekt als „Unterstützung".
  **Offen (extern/andere Repos):** anwaltliche Abnahme der Grenzwerte
  (`gesetzliche_parameter.geprueft_am` = NULL), Website-Marketing gegen das Dokument
  prüfen, Entscheidung je nicht-unterstützter Regel (ausschließen vs. nachrüsten).
- **35. Backups tatsächlich wiederherstellen. — Prüfung**
  Nicht nur kontrollieren, dass Backups angezeigt werden. Eine Wiederherstellung in
  einer getrennten Testumgebung durchführen und akzeptablen Datenverlust sowie
  Wiederanlaufzeit festlegen. Erledigt, wenn: Ein Wiederherstellungsprotokoll mit
  geprüftem Ergebnis vorliegt.
- **36. Produktionskonfiguration und E-Mail-Zustellung prüfen. — Prüfung**
  Echte Domain, HTTPS, Redirect-URLs, Supabase-Auth-URLs, Stripe-Live-Konfiguration,
  Absender und SPF/DKIM/DMARC prüfen. Testdaten und Testberechtigungen vom
  Kundenbetrieb abgrenzen. Registrierung, Passwortreset und Einladungen auf der
  tatsächlichen Domain testen.
- **37. Überwachung und Störungsablauf einrichten. — Prüfung**
  Fehler bei Anmeldung, Zahlung, Webhooks und Planung müssen auffallen. Zuständige
  Person, erreichbaren Support, Wiederanlauf und Rücknahme eines fehlerhaften
  Releases festlegen. Erledigt, wenn: Ein absichtlich ausgelöster Testfehler erkannt
  und nach dem vorgesehenen Ablauf bearbeitet wird.
- [x] **38. Performance-Befunde bewerten. — Prüfung**
  Die 44 gemeldeten nicht indexierten Fremdschlüssel und auffällige RLS-Abfragen
  gezielt prüfen. Keine Indizes blind hinzufügen oder wegen bisher fehlender Nutzung
  löschen. Erledigt, wenn: Kalender, Team, Mitteilungen und Planer mit einer
  realistischen Datenmenge ausreichend schnell bleiben.
  **Geschlossen am 2026-09-12 (Version 1.1.7).** Advisor-Deltas:
  · **auth_rls_initplan 12 → 0:** direktes `auth.uid()` in 12 Policies durch
    `(select auth.uid())` ersetzt (einmal pro Query statt pro Zeile).
  · **Nicht indexierte FKs 45 → 22:** 21 gezielte Indizes auf den vier heißen
    Pfaden + Trigger-Summen + Kaskadenpfaden. Verbleibende 22 bewusst offen gelassen
    (reine RESTRICT-Rollen-FKs, sekundäre bereits abgedeckte FKs, ungenutztes
    `verfuegbarkeiten`, `einladungen(mitarbeiter_id)`, `rechtliche_zustimmungen(auth_id)`).
  · **multiple_permissive 72 → 36:** sechs `FOR ALL`-Schreib-Policies in reine
    INSERT/UPDATE/DELETE-Policies aufgeteilt (keine SELECT-Überlappung mehr);
    Lesezugriff über `_select` unverändert. Rest (36) gewollt (Einzelzeilen-Writes)
    oder kleine/ungenutzte Tabellen.
  · **Hinweis:** Advisor meldet die 20 neu angelegten Indizes als „unused" (noch
    0 Scans) — laut Checkliste NICHT löschen; werden bei echtem Traffic genutzt.
  Verifiziert: Advisor-Deltas, Chef-CRUD auf `schicht_zuweisungen` unter
  authenticated funktioniert weiter, `_select`-Policies unverändert. Datenvolumen
  aktuell klein (<2k Zeilen) → Flows bereits schnell; Änderungen sichern Skalierung.
  Migrationen `item38_*`.

## F. Abschließende Abnahme – damit „erledigt“ etwas bedeutet

- **39. Rollen- und Betriebsmatrix testen.**
  Mindestens zwei getrennte Testbetriebe mit jeweils Chef und Mitarbeiter verwenden.
  Lesen, Erstellen, Ändern und Löschen jeweils über die vorgesehenen Wege und
  direkte API-Zugriffe testen. Zusätzlich nicht angemeldete, eingeladene und
  deaktivierte Nutzer berücksichtigen. Im späteren Testlauf nur ausdrücklich dafür
  vorgesehene Testdaten verändern.
- **40. Vollständige Kundenreise auf dem Release testen.**
  Registrierung → Vertragsannahme → Einrichtung → Einladung → Planung →
  Veröffentlichung → Mitarbeiterreaktion → Testphasenende → Zahlung → Kündigung →
  Export/Löschung. Fehlerfälle und Wiederaufnahme nach Abbruch gehören dazu. Wenn
  die mobile App zum Angebot gehört, muss diese dieselbe Abnahme bestehen.
- **41. Mobile Bedienbarkeit und Barrierefreiheit prüfen.**
  Kritische Abläufe mit Tastatur, sichtbarem Fokus, verständlichen
  Fehlermeldungen, Zoom und kleinen Bildschirmen testen. Die rechtliche
  Anwendbarkeit von Barrierefreiheitsanforderungen anhand des tatsächlichen
  Angebots beurteilen; ein B2B-Hinweis allein ersetzt diese Prüfung nicht.
- **42. Genau den freizugebenden Stand dokumentieren.**
  Codeversion, Datenbankschema, Edge-Function-Versionen, Konfiguration und
  Rechtstextfassungen festhalten. Launch erst, wenn: Keine offenen Fehler bei
  fremdem Datenzugriff, Berechtigungen, Abrechnung oder Datenverlust bestehen und
  alle oben genannten Pflichtprüfungen ein akzeptiertes Ergebnis haben.

---

## Was den Launch verbessern würde, ihn aber aktuell nicht blockieren sollte

- Echte Produktansichten statt ausschließlich dekorativer Kalenderanimation.
- Klarere Gegenüberstellung der Tarifleistungen und Grenzen.
- Kurze Einführung und Hilfetexte für neue Betriebsleiter.
- SEO, Social-Vorschau und eine überzeugendere Produktdemonstration.
