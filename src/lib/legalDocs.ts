// Full text of the app's legal documents.
//
// WHY THIS FILE (and not the i18n JSON):
// Long legal text is far easier to manage as template literals here than as
// escaped one-line JSON strings. Short UI labels (titles, buttons) stay in i18n.
//
// LOCALIZATION POLICY:
// Each document ships in exactly two variants — German for German-speaking users
// ("de"), and English for every other language. "en" is the fallback that
// legalBody() returns for any language without its own entry, so es/fr/ru/tr/uk
// all resolve to the English text. To change the German text edit the *_DE
// constant; to change everything else edit the *_EN constant.

export type LegalDocId = "privacy" | "terms" | "eula" | "dmca";

type DocBodies = Record<string, string> & { en: string };

const PRIVACY_EN = `PRIVACY POLICY

Last updated: 30 August 2026

This Privacy Policy explains how BlankTrading UG (haftungsbeschränkt) (hereinafter the "Provider", "we" or "us") handles personal data in the QuickTeam application and related services (the "Service"). It is written for the European Union's General Data Protection Regulation (GDPR) and applicable national data-protection law.

1. Who is responsible for your data
QuickTeam is a staff-scheduling tool used by businesses (each an "Employer") to organise their teams.
- For most operational data about employees (shifts, availability, preferences, vacation, absences, working-time records, messages within a team), the Employer that invited you is the data controller and decides why and how that data is processed. We act as the Employer's processor and handle that data on their documented instructions. Questions about that data should go to your Employer first.
- For account-level data needed to run the Service itself (login credentials, the link between your login and your profiles, security logs, support and bug reports you send us), we are the controller.
If you are unsure who to contact, write to us at blanktrading@web.de and we will help route your request.

2. What data we process
- Account data: email address, and (optionally) phone number; an authentication record and password managed by our authentication provider (we never see your password in plain text).
- Profile data: first and last name, role(s), contract type, target/maximum hours, overtime balance, vacation entitlement, and membership in one or more businesses.
- Operational data: shift assignments and history, availability and shift preferences, vacation and absence requests, shift-swap and emergency-substitution records, announcements, poll votes, checklist/task completion, and messages you send or receive within a business.
- Support data: bug reports and any content you include in them.
- Technical data: information needed to operate and secure the Service, such as session identifiers, timestamps, and error logs.
We do not knowingly collect special categories of data (e.g. health data). Please do not enter such data into free-text fields.

3. Why we process it, and the legal bases (GDPR Art. 6)
- To provide the Service and your scheduling features — performance of a contract, and/or the legitimate interests of your Employer in organising its workforce (Art. 6(1)(b) and (f)).
- To operate accounts, authenticate you, and keep the Service secure — legitimate interests in a safe, functioning service (Art. 6(1)(f)).
- To help your Employer comply with working-time and record-keeping obligations — compliance with a legal obligation to which the Employer is subject (Art. 6(1)(c)).
- Optional features that rely on your choice (e.g. linking a phone number for SMS login) — consent, which you may withdraw at any time (Art. 6(1)(a)).

4. Who can see your data
- People inside your business: your Employer/manager can see the operational data needed to schedule you. Coworkers can see limited information (such as your name and shared shifts) only where your Employer has enabled that in the business's visibility settings; otherwise coworker details are restricted.
- Our service providers (processors): we use Supabase for hosting, database, and authentication, operating in the European Union (Frankfurt / Ireland regions). They process data only to provide infrastructure to us under a data-processing agreement.
- We do not sell your personal data and do not use it for advertising.
- We may disclose data if required by law or to protect rights and safety.

5. International transfers
The Service is hosted within the EU/EEA. If any processing ever occurs outside the EEA, we will rely on appropriate safeguards such as the European Commission's Standard Contractual Clauses.

6. How long we keep it
- Operational data is retained for as long as the Employer's account is active and as needed for their working-time and record-keeping obligations; the Employer controls its retention and deletion.
- Account data is kept while your account exists and for a limited period afterwards as needed for security and legal purposes, then deleted or anonymised.
- When an employee record is anonymised or deleted, identifying fields (name, email, login link) are removed and the record can no longer be attributed to you.

7. Your rights
Subject to the conditions in the GDPR, you have the right to: access your data; correct inaccurate data; erase data ("right to be forgotten"); restrict or object to processing; and receive your data in a portable format. Where processing is based on consent, you may withdraw it at any time without affecting prior processing. To exercise rights over operational data, contact your Employer (the controller); for account data, contact us at blanktrading@web.de. You also have the right to lodge a complaint with your local data-protection supervisory authority.

8. Security
We use technical and organisational measures to protect your data, including encryption in transit, row-level access controls that isolate each business's data, server-enforced authorisation, and least-privilege access. No system is perfectly secure, but we work to protect your information and to respond to incidents.
Certain security measures for the underlying infrastructure — including physical data-centre security, network protection, and encryption at rest — are provided on our behalf by Supabase acting as our processor under a data-processing agreement, and Supabase is responsible for the security of the hosting infrastructure it operates. This does not relieve us of our own responsibilities: we remain responsible under the GDPR for the processing we carry out and for the security measures within our control, and we have selected a processor that provides sufficient guarantees of appropriate technical and organisational measures.

9. Children
The Service is intended for use in a work context by people of legal working age. It is not directed at children, and we do not knowingly create accounts for anyone below the minimum age permitted by applicable law.

10. Changes to this policy
We may update this policy from time to time. When we make material changes we will update the "Last updated" date and, where appropriate, ask you to review the revised policy in the app.

11. Contact
Provider: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Germany.
Privacy contact / Data Protection Officer: blanktrading@web.de.`;

const TERMS_EN = `TERMS & CONDITIONS

Last updated: 30 August 2026

These Terms & Conditions ("Terms") govern your access to and use of the QuickTeam application and related services (the "Service") provided by BlankTrading UG (haftungsbeschränkt) ("we", "us"). By using the Service you agree to these Terms. If you do not agree, do not use the Service.

1. Eligibility and accounts
You must provide accurate information and keep your credentials secure. You are responsible for activity that occurs under your account.

2. Acceptable use
You agree not to misuse the Service, including by attempting unauthorized access, disrupting the Service, or using it to violate any law or the rights of others.

3. Your content
You retain your rights to the content you submit. You grant us a license to host and process that content as needed to provide the Service.

4. Availability and changes
We may modify, suspend, or discontinue the Service or these Terms at any time. Continued use after changes take effect constitutes acceptance of the updated Terms.

5. Termination
We may suspend or terminate access if you breach these Terms. You may stop using the Service at any time.

6. Disclaimers
The Service is provided "as is" and "as available" without warranties of any kind to the maximum extent permitted by law.

7. Limitation of liability
To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.

8. Governing law and jurisdiction
These Terms are governed by the laws of the Federal Republic of Germany, without regard to its conflict-of-law rules. To the extent legally permissible, the exclusive place of jurisdiction for disputes arising out of or in connection with these Terms is the registered seat of BlankTrading UG (haftungsbeschränkt).

9. Contact
Provider: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Germany.
Questions about these Terms: blanktrading@web.de.`;

const EULA_EN = `END USER LICENSE AGREEMENT

This application is licensed to you by BlankTrading UG (haftungsbeschränkt) under Apple's standard Licensed Application End User License Agreement (the "Standard EULA").

Tapping this item opens the full Standard EULA on Apple's website:
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

The same Standard EULA is selected for this app in App Store Connect.`;

const DMCA_EN = `DMCA COPYRIGHT POLICY

Last updated: 30 August 2026

BlankTrading UG (haftungsbeschränkt) ("we", "us") respects the intellectual property rights of others and expects users of the QuickTeam app to do the same. We respond to notices of alleged copyright infringement that comply with the U.S. Digital Millennium Copyright Act ("DMCA").

1. Reporting claimed infringement
If you believe content available through the App infringes your copyright, please send a written notice to our Designated Agent (below) that includes:
(a) your physical or electronic signature;
(b) identification of the copyrighted work claimed to have been infringed;
(c) identification of the material claimed to be infringing and information reasonably sufficient to let us locate it;
(d) your contact information (address, telephone number, and email);
(e) a statement that you have a good-faith belief the use is not authorized by the copyright owner, its agent, or the law; and
(f) a statement, under penalty of perjury, that the information in the notice is accurate and that you are the copyright owner or authorized to act on its behalf.

2. Designated agent
Takedown notices must be sent to our Designated Agent for copyright claims:
Provider: BlankTrading UG (haftungsbeschränkt)
Attention: Copyright Agent
Address: Gabriele-Münter-Straße 31, 73760 Ostfildern, Germany
Email: blanktrading@web.de

3. Counter-notification
If you believe material you posted was removed by mistake or misidentification, you may send a counter-notification to the Designated Agent containing the information required by the DMCA (17 U.S.C. § 512(g)).

4. Repeat infringers
In appropriate circumstances we may disable or terminate the accounts of users who are repeat infringers.`;

const PRIVACY_DE = `DATENSCHUTZERKLÄRUNG

Stand: 30. August 2026

Diese Datenschutzerklärung erläutert, wie die BlankTrading UG (haftungsbeschränkt) (nachfolgend „Anbieter", „wir" oder „uns") personenbezogene Daten in der QuickTeam-Anwendung und den zugehörigen Diensten (der „Dienst") verarbeitet. Sie orientiert sich an der Datenschutz-Grundverordnung (DSGVO) der Europäischen Union und den geltenden nationalen Datenschutzgesetzen.

1. Wer für Ihre Daten verantwortlich ist
QuickTeam ist ein Werkzeug zur Personaleinsatzplanung, das von Unternehmen (jeweils ein „Arbeitgeber") zur Organisation ihrer Teams genutzt wird.
- Für die meisten betrieblichen Daten über Beschäftigte (Schichten, Verfügbarkeiten, Präferenzen, Urlaub, Abwesenheiten, Arbeitszeitaufzeichnungen, Nachrichten innerhalb eines Teams) ist der Arbeitgeber, der Sie eingeladen hat, der Verantwortliche und entscheidet über Zweck und Mittel der Verarbeitung. Wir handeln als Auftragsverarbeiter des Arbeitgebers und verarbeiten diese Daten nach dessen dokumentierten Weisungen. Fragen zu diesen Daten richten Sie bitte zuerst an Ihren Arbeitgeber.
- Für Kontodaten, die für den Betrieb des Dienstes selbst erforderlich sind (Anmeldedaten, die Verknüpfung zwischen Ihrem Login und Ihren Profilen, Sicherheitsprotokolle, an uns gesendete Support- und Fehlermeldungen), sind wir der Verantwortliche.
Wenn Sie unsicher sind, an wen Sie sich wenden sollen, schreiben Sie uns an blanktrading@web.de, und wir helfen Ihnen weiter.

2. Welche Daten wir verarbeiten
- Kontodaten: E-Mail-Adresse und (optional) Telefonnummer; ein Authentifizierungsdatensatz und ein Passwort, die von unserem Authentifizierungsanbieter verwaltet werden (Ihr Passwort sehen wir niemals im Klartext).
- Profildaten: Vor- und Nachname, Rolle(n), Vertragsart, Soll-/Höchststunden, Überstundensaldo, Urlaubsanspruch sowie die Mitgliedschaft in einem oder mehreren Betrieben.
- Betriebliche Daten: Schichtzuweisungen und -verlauf, Verfügbarkeiten und Schichtpräferenzen, Urlaubs- und Abwesenheitsanträge, Schichttausch- und Notfallvertretungsvorgänge, Ankündigungen, Umfrageabstimmungen, Erledigung von Aufgaben/Checklisten sowie Nachrichten, die Sie innerhalb eines Betriebs senden oder empfangen.
- Support-Daten: Fehlermeldungen und die darin enthaltenen Inhalte.
- Technische Daten: Informationen, die zum Betrieb und zur Sicherung des Dienstes erforderlich sind, etwa Sitzungskennungen, Zeitstempel und Fehlerprotokolle.
Wir erheben wissentlich keine besonderen Kategorien personenbezogener Daten (z. B. Gesundheitsdaten). Bitte geben Sie solche Daten nicht in Freitextfelder ein.

3. Warum wir sie verarbeiten und die Rechtsgrundlagen (Art. 6 DSGVO)
- Zur Bereitstellung des Dienstes und Ihrer Planungsfunktionen – Erfüllung eines Vertrags und/oder berechtigte Interessen Ihres Arbeitgebers an der Organisation seiner Belegschaft (Art. 6 Abs. 1 lit. b und f).
- Zum Betrieb von Konten, zu Ihrer Authentifizierung und zur Absicherung des Dienstes – berechtigte Interessen an einem sicheren, funktionsfähigen Dienst (Art. 6 Abs. 1 lit. f).
- Zur Unterstützung Ihres Arbeitgebers bei der Einhaltung arbeitszeit- und aufzeichnungsrechtlicher Pflichten – Erfüllung einer rechtlichen Verpflichtung, der der Arbeitgeber unterliegt (Art. 6 Abs. 1 lit. c).
- Optionale Funktionen, die auf Ihrer Wahl beruhen (z. B. Verknüpfung einer Telefonnummer für die SMS-Anmeldung) – Einwilligung, die Sie jederzeit widerrufen können (Art. 6 Abs. 1 lit. a).

4. Wer Ihre Daten sehen kann
- Personen in Ihrem Betrieb: Ihr Arbeitgeber/Manager kann die betrieblichen Daten sehen, die zur Planung erforderlich sind. Kolleginnen und Kollegen sehen begrenzte Informationen (etwa Ihren Namen und gemeinsame Schichten) nur dann, wenn Ihr Arbeitgeber dies in den Sichtbarkeitseinstellungen des Betriebs aktiviert hat; andernfalls sind Angaben zu Kollegen eingeschränkt.
- Unsere Dienstleister (Auftragsverarbeiter): Wir nutzen Supabase für Hosting, Datenbank und Authentifizierung mit Betrieb in der Europäischen Union (Regionen Frankfurt/Irland). Diese verarbeiten Daten ausschließlich zur Bereitstellung der Infrastruktur für uns auf Grundlage eines Auftragsverarbeitungsvertrags.
- Wir verkaufen Ihre personenbezogenen Daten nicht und nutzen sie nicht für Werbung.
- Wir können Daten offenlegen, wenn dies gesetzlich vorgeschrieben ist oder um Rechte und Sicherheit zu schützen.

5. Internationale Datenübermittlungen
Der Dienst wird innerhalb der EU/des EWR gehostet. Sollte eine Verarbeitung außerhalb des EWR stattfinden, stützen wir uns auf geeignete Garantien wie die Standardvertragsklauseln der Europäischen Kommission.

6. Wie lange wir sie speichern
- Betriebliche Daten werden so lange gespeichert, wie das Konto des Arbeitgebers aktiv ist und wie es für dessen arbeitszeit- und aufzeichnungsrechtliche Pflichten erforderlich ist; der Arbeitgeber steuert deren Aufbewahrung und Löschung.
- Kontodaten werden für die Dauer Ihres Kontos und für einen begrenzten Zeitraum danach gespeichert, soweit dies aus Sicherheits- und rechtlichen Gründen erforderlich ist, und anschließend gelöscht oder anonymisiert.
- Wird ein Beschäftigtendatensatz anonymisiert oder gelöscht, werden identifizierende Felder (Name, E-Mail, Login-Verknüpfung) entfernt, und der Datensatz kann Ihnen nicht mehr zugeordnet werden.

7. Ihre Rechte
Vorbehaltlich der Voraussetzungen der DSGVO haben Sie das Recht: auf Auskunft über Ihre Daten; auf Berichtigung unrichtiger Daten; auf Löschung („Recht auf Vergessenwerden"); auf Einschränkung der Verarbeitung oder Widerspruch dagegen; sowie auf Erhalt Ihrer Daten in einem übertragbaren Format. Beruht die Verarbeitung auf einer Einwilligung, können Sie diese jederzeit widerrufen, ohne dass die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung berührt wird. Zur Ausübung von Rechten an betrieblichen Daten wenden Sie sich an Ihren Arbeitgeber (den Verantwortlichen); bei Kontodaten an uns unter blanktrading@web.de. Sie haben außerdem das Recht, eine Beschwerde bei Ihrer zuständigen Datenschutzaufsichtsbehörde einzureichen.

8. Sicherheit
Wir setzen technische und organisatorische Maßnahmen zum Schutz Ihrer Daten ein, darunter Verschlüsselung bei der Übertragung, zeilenbasierte Zugriffskontrollen, die die Daten jedes Betriebs voneinander trennen, serverseitig durchgesetzte Autorisierung und Zugriff nach dem Prinzip der geringsten Rechte. Kein System ist vollkommen sicher, aber wir arbeiten daran, Ihre Informationen zu schützen und auf Vorfälle zu reagieren.
Bestimmte Sicherheitsmaßnahmen für die zugrunde liegende Infrastruktur – einschließlich physischer Rechenzentrumssicherheit, Netzwerkschutz und Verschlüsselung im Ruhezustand – werden in unserem Auftrag von Supabase als unserem Auftragsverarbeiter auf Grundlage eines Auftragsverarbeitungsvertrags (AVV) erbracht; Supabase ist für die Sicherheit der von ihm betriebenen Hosting-Infrastruktur verantwortlich. Dies entbindet uns nicht von unseren eigenen Pflichten: Im Sinne der DSGVO bleiben wir für die von uns durchgeführte Verarbeitung und für die in unserem Einflussbereich liegenden Sicherheitsmaßnahmen verantwortlich, und wir haben einen Auftragsverarbeiter ausgewählt, der hinreichende Garantien für geeignete technische und organisatorische Maßnahmen bietet.

9. Kinder
Der Dienst ist für die Nutzung im beruflichen Kontext durch Personen im gesetzlichen Arbeitsalter bestimmt. Er richtet sich nicht an Kinder, und wir legen wissentlich keine Konten für Personen unterhalb des nach geltendem Recht zulässigen Mindestalters an.

10. Änderungen dieser Erklärung
Wir können diese Erklärung von Zeit zu Zeit aktualisieren. Bei wesentlichen Änderungen aktualisieren wir das Datum „Stand" und bitten Sie gegebenenfalls, die überarbeitete Erklärung in der App zu prüfen.

11. Kontakt
Anbieter: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Deutschland.
Datenschutzkontakt / Datenschutzbeauftragter: blanktrading@web.de.`;

const TERMS_DE = `ALLGEMEINE GESCHÄFTSBEDINGUNGEN

Stand: 30. August 2026

Diese Allgemeinen Geschäftsbedingungen („AGB") regeln Ihren Zugang zu und Ihre Nutzung der QuickTeam-Anwendung und der zugehörigen Dienste (der „Dienst"), bereitgestellt von der BlankTrading UG (haftungsbeschränkt) (nachfolgend „wir" oder „uns"). Durch die Nutzung des Dienstes erklären Sie sich mit diesen AGB einverstanden. Wenn Sie nicht einverstanden sind, nutzen Sie den Dienst nicht.

1. Zugangsberechtigung und Konten
Sie müssen zutreffende Angaben machen und Ihre Zugangsdaten sicher aufbewahren. Für Aktivitäten, die unter Ihrem Konto erfolgen, sind Sie verantwortlich.

2. Zulässige Nutzung
Sie verpflichten sich, den Dienst nicht zu missbrauchen, insbesondere nicht durch den Versuch unbefugten Zugriffs, durch Störung des Dienstes oder durch eine Nutzung, die gegen geltendes Recht oder die Rechte Dritter verstößt.

3. Ihre Inhalte
Sie behalten Ihre Rechte an den von Ihnen eingestellten Inhalten. Sie räumen uns das Recht ein, diese Inhalte zu hosten und zu verarbeiten, soweit dies zur Bereitstellung des Dienstes erforderlich ist.

4. Verfügbarkeit und Änderungen
Wir können den Dienst oder diese AGB jederzeit ändern, aussetzen oder einstellen. Die fortgesetzte Nutzung nach Wirksamwerden von Änderungen gilt als Annahme der aktualisierten AGB.

5. Beendigung
Wir können den Zugang aussetzen oder beenden, wenn Sie gegen diese AGB verstoßen. Sie können die Nutzung des Dienstes jederzeit einstellen.

6. Haftungsausschlüsse
Der Dienst wird „wie besehen" und „wie verfügbar" ohne jegliche Gewährleistung im größtmöglichen gesetzlich zulässigen Umfang bereitgestellt.

7. Haftungsbeschränkung
Im größtmöglichen gesetzlich zulässigen Umfang haften wir nicht für mittelbare Schäden, Begleit-, Sonder- oder Folgeschäden, die aus Ihrer Nutzung des Dienstes entstehen. Zwingende gesetzliche Haftungsregelungen, insbesondere bei Vorsatz und grober Fahrlässigkeit sowie bei der Verletzung von Leben, Körper oder Gesundheit, bleiben unberührt.

8. Anwendbares Recht und Gerichtsstand
Diese AGB unterliegen dem Recht der Bundesrepublik Deutschland unter Ausschluss seiner Kollisionsnormen. Ausschließlicher Gerichtsstand für Streitigkeiten aus oder im Zusammenhang mit diesen AGB ist, soweit gesetzlich zulässig, der Sitz der BlankTrading UG (haftungsbeschränkt).

9. Kontakt
Anbieter: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Deutschland.
Fragen zu diesen AGB: blanktrading@web.de.`;

const EULA_DE = `ENDBENUTZER-LIZENZVERTRAG

Diese Anwendung wird Ihnen von der BlankTrading UG (haftungsbeschränkt) im Rahmen des standardmäßigen Lizenzvertrags für Endbenutzer von Apple (der „Standard-EULA") lizenziert.

Durch Antippen dieses Eintrags öffnen Sie die vollständige Standard-EULA auf der Website von Apple:
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

Dieselbe Standard-EULA ist für diese App in App Store Connect ausgewählt.`;

const DMCA_DE = `DMCA-URHEBERRECHTSRICHTLINIE

Stand: 30. August 2026

Die BlankTrading UG (haftungsbeschränkt) (nachfolgend „wir" oder „uns") respektiert die Rechte am geistigen Eigentum Dritter und erwartet dasselbe von den Nutzern der QuickTeam-App. Wir reagieren auf Mitteilungen über behauptete Urheberrechtsverletzungen, die dem US-amerikanischen Digital Millennium Copyright Act („DMCA") entsprechen.

1. Meldung einer behaupteten Rechtsverletzung
Wenn Sie der Auffassung sind, dass über die App zugängliche Inhalte Ihr Urheberrecht verletzen, senden Sie bitte eine schriftliche Mitteilung an unseren benannten Bevollmächtigten (siehe unten), die Folgendes enthält:
(a) Ihre handschriftliche oder elektronische Unterschrift;
(b) die Bezeichnung des urheberrechtlich geschützten Werks, dessen Verletzung geltend gemacht wird;
(c) die Bezeichnung des angeblich rechtsverletzenden Materials und Angaben, die vernünftigerweise ausreichen, damit wir es auffinden können;
(d) Ihre Kontaktdaten (Anschrift, Telefonnummer und E-Mail-Adresse);
(e) eine Erklärung, dass Sie in gutem Glauben davon ausgehen, dass die Nutzung nicht vom Rechteinhaber, seinem Bevollmächtigten oder dem Gesetz gestattet ist; und
(f) eine Erklärung unter Strafandrohung des Meineids, dass die Angaben in der Mitteilung zutreffen und dass Sie der Rechteinhaber sind oder befugt sind, in dessen Namen zu handeln.

2. Benannter Bevollmächtigter
Mitteilungen zur Entfernung von Inhalten sind an unseren für Urheberrechtsansprüche benannten Bevollmächtigten zu richten:
Anbieter: BlankTrading UG (haftungsbeschränkt)
Zu Händen: Urheberrechtsbevollmächtigter
Anschrift: Gabriele-Münter-Straße 31, 73760 Ostfildern, Deutschland
E-Mail: blanktrading@web.de

3. Gegendarstellung
Wenn Sie der Auffassung sind, dass von Ihnen eingestelltes Material irrtümlich oder aufgrund einer Verwechslung entfernt wurde, können Sie dem benannten Bevollmächtigten eine Gegendarstellung mit den nach dem DMCA (17 U.S.C. § 512(g)) erforderlichen Angaben übermitteln.

4. Wiederholte Rechtsverletzungen
In geeigneten Fällen können wir die Konten von Nutzern sperren oder kündigen, die wiederholt Rechte verletzen.`;

const BODIES: Record<LegalDocId, DocBodies> = {
  privacy: { en: PRIVACY_EN, de: PRIVACY_DE },
  terms: { en: TERMS_EN, de: TERMS_DE },
  eula: { en: EULA_EN, de: EULA_DE },
  dmca: { en: DMCA_EN, de: DMCA_DE },
};

// Body text for a document in the given language, falling back to English.
export function legalBody(id: LegalDocId, lang: string): string {
  const doc = BODIES[id];
  return doc[lang] ?? doc.en;
}
