// Full text of the app's legal documents.
//
// WHY THIS FILE (and not the i18n JSON):
// Long legal text is far easier to manage as template literals here than as
// escaped one-line JSON strings. Short UI labels (titles, buttons) stay in i18n.
//
// LOCALIZATION:
// Each document maps a language code to its text, and always has an "en" entry
// used as the fallback. To translate a document, add e.g. `de: \`...\`` next to
// its `en` entry — legalBody() picks the user's language when present.
//
// These are PLACEHOLDER / STANDARD drafts. Review and complete every [BRACKETED]
// item with your real legal details before release.

export type LegalDocId = "privacy" | "terms" | "eula" | "dmca";

type DocBodies = Record<string, string> & { en: string };

const PRIVACY_EN = `PRIVACY POLICY

Last updated: [DATE]

This Privacy Policy explains how [COMPANY] ("we", "us", "the provider") handles personal data in the QuickTeam application and related services (the "Service"). It is written for the European Union's General Data Protection Regulation (GDPR) and applicable national data-protection law.

1. Who is responsible for your data
QuickTeam is a staff-scheduling tool used by businesses (each an "Employer") to organise their teams.
- For most operational data about employees (shifts, availability, preferences, vacation, absences, working-time records, messages within a team), the Employer that invited you is the data controller and decides why and how that data is processed. We act as the Employer's processor and handle that data on their documented instructions. Questions about that data should go to your Employer first.
- For account-level data needed to run the Service itself (login credentials, the link between your login and your profiles, security logs, support and bug reports you send us), we are the controller.
If you are unsure who to contact, write to us at [CONTACT EMAIL] and we will help route your request.

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
Subject to the conditions in the GDPR, you have the right to: access your data; correct inaccurate data; erase data ("right to be forgotten"); restrict or object to processing; and receive your data in a portable format. Where processing is based on consent, you may withdraw it at any time without affecting prior processing. To exercise rights over operational data, contact your Employer (the controller); for account data, contact us at [CONTACT EMAIL]. You also have the right to lodge a complaint with your local data-protection supervisory authority.

8. Security
We use technical and organisational measures to protect your data, including encryption in transit, row-level access controls that isolate each business's data, server-enforced authorisation, and least-privilege access. No system is perfectly secure, but we work to protect your information and to respond to incidents.

9. Children
The Service is intended for use in a work context by people of legal working age. It is not directed at children, and we do not knowingly create accounts for anyone below the minimum age permitted by applicable law.

10. Changes to this policy
We may update this policy from time to time. When we make material changes we will update the "Last updated" date and, where appropriate, ask you to review the revised policy in the app.

11. Contact
Provider: [COMPANY], [MAILING ADDRESS].
Privacy contact / Data Protection Officer (if appointed): [CONTACT EMAIL].

PLACEHOLDER — this is a good-faith draft, not legal advice. Have it reviewed by qualified counsel and complete every [BRACKETED] item (and confirm the controller/processor roles, hosting regions, and retention periods match your actual setup) before release.`;

const TERMS_EN = `TERMS & CONDITIONS

Last updated: [DATE]

These Terms & Conditions ("Terms") govern your access to and use of the QuickTeam application and related services (the "Service") provided by [COMPANY] ("we", "us"). By using the Service you agree to these Terms. If you do not agree, do not use the Service.

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

8. Governing law
These Terms are governed by the laws of [JURISDICTION], without regard to its conflict-of-law rules.

9. Contact
Questions about these Terms: [CONTACT EMAIL].

PLACEHOLDER — review and complete the bracketed items with your legal details before release.`;

const EULA_EN = `END USER LICENSE AGREEMENT

This application is licensed to you under Apple's standard Licensed Application End User License Agreement (the "Standard EULA").

Tapping this item opens the full Standard EULA on Apple's website:
https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

The same Standard EULA is selected for this app in App Store Connect.`;

const DMCA_EN = `DMCA COPYRIGHT POLICY

Last updated: [DATE]

[COMPANY] ("we", "us") respects the intellectual property rights of others and expects users of the QuickTeam app to do the same. We respond to notices of alleged copyright infringement that comply with the U.S. Digital Millennium Copyright Act ("DMCA").

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
Name: [DESIGNATED AGENT NAME]
Company: [COMPANY]
Address: [MAILING ADDRESS]
Email: [dmca@yourcompany.com]
Phone: [PHONE]

3. Counter-notification
If you believe material you posted was removed by mistake or misidentification, you may send a counter-notification to the Designated Agent containing the information required by the DMCA (17 U.S.C. § 512(g)).

4. Repeat infringers
In appropriate circumstances we may disable or terminate the accounts of users who are repeat infringers.

PLACEHOLDER — complete the bracketed details and register your Designated Agent with the U.S. Copyright Office before release.`;

const PRIVACY_DE = `DATENSCHUTZERKLÄRUNG

Stand: [DATE]

Diese Datenschutzerklärung erläutert, wie [COMPANY] („wir", „uns", „der Anbieter") personenbezogene Daten in der QuickTeam-Anwendung und den zugehörigen Diensten (der „Dienst") verarbeitet. Sie orientiert sich an der Datenschutz-Grundverordnung (DSGVO) der Europäischen Union und den geltenden nationalen Datenschutzgesetzen.

1. Wer für Ihre Daten verantwortlich ist
QuickTeam ist ein Werkzeug zur Personaleinsatzplanung, das von Unternehmen (jeweils ein „Arbeitgeber") zur Organisation ihrer Teams genutzt wird.
- Für die meisten betrieblichen Daten über Beschäftigte (Schichten, Verfügbarkeiten, Präferenzen, Urlaub, Abwesenheiten, Arbeitszeitaufzeichnungen, Nachrichten innerhalb eines Teams) ist der Arbeitgeber, der Sie eingeladen hat, der Verantwortliche und entscheidet über Zweck und Mittel der Verarbeitung. Wir handeln als Auftragsverarbeiter des Arbeitgebers und verarbeiten diese Daten nach dessen dokumentierten Weisungen. Fragen zu diesen Daten richten Sie bitte zuerst an Ihren Arbeitgeber.
- Für Kontodaten, die für den Betrieb des Dienstes selbst erforderlich sind (Anmeldedaten, die Verknüpfung zwischen Ihrem Login und Ihren Profilen, Sicherheitsprotokolle, an uns gesendete Support- und Fehlermeldungen), sind wir der Verantwortliche.
Wenn Sie unsicher sind, an wen Sie sich wenden sollen, schreiben Sie uns an [CONTACT EMAIL], und wir helfen Ihnen weiter.

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
Vorbehaltlich der Voraussetzungen der DSGVO haben Sie das Recht: auf Auskunft über Ihre Daten; auf Berichtigung unrichtiger Daten; auf Löschung („Recht auf Vergessenwerden"); auf Einschränkung der Verarbeitung oder Widerspruch dagegen; sowie auf Erhalt Ihrer Daten in einem übertragbaren Format. Beruht die Verarbeitung auf einer Einwilligung, können Sie diese jederzeit widerrufen, ohne dass die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung berührt wird. Zur Ausübung von Rechten an betrieblichen Daten wenden Sie sich an Ihren Arbeitgeber (den Verantwortlichen); bei Kontodaten an uns unter [CONTACT EMAIL]. Sie haben außerdem das Recht, eine Beschwerde bei Ihrer zuständigen Datenschutzaufsichtsbehörde einzureichen.

8. Sicherheit
Wir setzen technische und organisatorische Maßnahmen zum Schutz Ihrer Daten ein, darunter Verschlüsselung bei der Übertragung, zeilenbasierte Zugriffskontrollen, die die Daten jedes Betriebs voneinander trennen, serverseitig durchgesetzte Autorisierung und Zugriff nach dem Prinzip der geringsten Rechte. Kein System ist vollkommen sicher, aber wir arbeiten daran, Ihre Informationen zu schützen und auf Vorfälle zu reagieren.

9. Kinder
Der Dienst ist für die Nutzung im beruflichen Kontext durch Personen im gesetzlichen Arbeitsalter bestimmt. Er richtet sich nicht an Kinder, und wir legen wissentlich keine Konten für Personen unterhalb des nach geltendem Recht zulässigen Mindestalters an.

10. Änderungen dieser Erklärung
Wir können diese Erklärung von Zeit zu Zeit aktualisieren. Bei wesentlichen Änderungen aktualisieren wir das Datum „Stand" und bitten Sie gegebenenfalls, die überarbeitete Erklärung in der App zu prüfen.

11. Kontakt
Anbieter: [COMPANY], [MAILING ADDRESS].
Datenschutzkontakt / Datenschutzbeauftragter (falls bestellt): [CONTACT EMAIL].

PLATZHALTER – dies ist ein nach bestem Wissen erstellter Entwurf und keine Rechtsberatung. Lassen Sie ihn von qualifizierten Rechtsberatern prüfen und vervollständigen Sie jeden [BRACKETED]-Eintrag (und stellen Sie sicher, dass die Rollen als Verantwortlicher/Auftragsverarbeiter, die Hosting-Regionen und die Speicherfristen Ihrer tatsächlichen Einrichtung entsprechen), bevor Sie veröffentlichen.`;

const PRIVACY_ES = `POLÍTICA DE PRIVACIDAD

Última actualización: [DATE]

Esta Política de Privacidad explica cómo [COMPANY] («nosotros», «nos», «el proveedor») trata los datos personales en la aplicación QuickTeam y los servicios relacionados (el «Servicio»). Está redactada conforme al Reglamento General de Protección de Datos (RGPD) de la Unión Europea y a la legislación nacional de protección de datos aplicable.

1. Quién es responsable de sus datos
QuickTeam es una herramienta de planificación de personal utilizada por empresas (cada una, un «Empleador») para organizar sus equipos.
- Para la mayoría de los datos operativos sobre los empleados (turnos, disponibilidad, preferencias, vacaciones, ausencias, registros de jornada, mensajes dentro de un equipo), el Empleador que le invitó es el responsable del tratamiento y decide por qué y cómo se tratan esos datos. Nosotros actuamos como encargado del tratamiento del Empleador y tratamos esos datos siguiendo sus instrucciones documentadas. Las preguntas sobre esos datos deben dirigirse primero a su Empleador.
- Para los datos de cuenta necesarios para operar el propio Servicio (credenciales de acceso, el vínculo entre su inicio de sesión y sus perfiles, registros de seguridad, solicitudes de soporte e informes de errores que nos envía), nosotros somos el responsable.
Si no está seguro de a quién dirigirse, escríbanos a [CONTACT EMAIL] y le ayudaremos a orientar su solicitud.

2. Qué datos tratamos
- Datos de cuenta: dirección de correo electrónico y (opcionalmente) número de teléfono; un registro de autenticación y una contraseña gestionados por nuestro proveedor de autenticación (nunca vemos su contraseña en texto claro).
- Datos de perfil: nombre y apellidos, rol(es), tipo de contrato, horas objetivo/máximas, saldo de horas extra, derecho a vacaciones y pertenencia a uno o varios negocios.
- Datos operativos: asignaciones e historial de turnos, disponibilidad y preferencias de turno, solicitudes de vacaciones y ausencias, registros de intercambio de turnos y sustituciones de emergencia, anuncios, votaciones en encuestas, finalización de tareas/listas de verificación y mensajes que envía o recibe dentro de un negocio.
- Datos de soporte: informes de errores y el contenido que incluya en ellos.
- Datos técnicos: información necesaria para operar y proteger el Servicio, como identificadores de sesión, marcas de tiempo y registros de errores.
No recabamos a sabiendas categorías especiales de datos (p. ej., datos de salud). No introduzca ese tipo de datos en campos de texto libre.

3. Por qué los tratamos y las bases jurídicas (art. 6 RGPD)
- Para prestar el Servicio y sus funciones de planificación: ejecución de un contrato o los intereses legítimos de su Empleador en organizar su plantilla (art. 6.1.b y f).
- Para gestionar cuentas, autenticarle y mantener seguro el Servicio: intereses legítimos en un servicio seguro y operativo (art. 6.1.f).
- Para ayudar a su Empleador a cumplir obligaciones de jornada y registro: cumplimiento de una obligación legal a la que está sujeto el Empleador (art. 6.1.c).
- Funciones opcionales basadas en su elección (p. ej., vincular un número de teléfono para el inicio de sesión por SMS): consentimiento, que puede retirar en cualquier momento (art. 6.1.a).

4. Quién puede ver sus datos
- Personas de su negocio: su Empleador/responsable puede ver los datos operativos necesarios para planificarle. Los compañeros ven información limitada (como su nombre y los turnos compartidos) solo cuando su Empleador lo haya habilitado en la configuración de visibilidad del negocio; de lo contrario, los datos de los compañeros están restringidos.
- Nuestros proveedores de servicios (encargados del tratamiento): utilizamos Supabase para alojamiento, base de datos y autenticación, con operación en la Unión Europea (regiones de Fráncfort/Irlanda). Tratan los datos únicamente para proporcionarnos infraestructura, en virtud de un contrato de encargo del tratamiento.
- No vendemos sus datos personales ni los utilizamos con fines publicitarios.
- Podemos divulgar datos si así lo exige la ley o para proteger derechos y la seguridad.

5. Transferencias internacionales
El Servicio se aloja dentro de la UE/EEE. Si alguna vez se produce un tratamiento fuera del EEE, nos basaremos en garantías adecuadas, como las Cláusulas Contractuales Tipo de la Comisión Europea.

6. Durante cuánto tiempo los conservamos
- Los datos operativos se conservan mientras la cuenta del Empleador esté activa y según sea necesario para sus obligaciones de jornada y registro; el Empleador controla su conservación y supresión.
- Los datos de cuenta se conservan mientras exista su cuenta y durante un periodo limitado posterior según sea necesario por motivos de seguridad y legales, tras lo cual se suprimen o anonimizan.
- Cuando un registro de empleado se anonimiza o suprime, se eliminan los campos identificativos (nombre, correo electrónico, vínculo de acceso) y el registro ya no puede atribuirse a usted.

7. Sus derechos
Con sujeción a las condiciones del RGPD, tiene derecho a: acceder a sus datos; rectificar datos inexactos; suprimir datos («derecho al olvido»); limitar u oponerse al tratamiento; y recibir sus datos en un formato portátil. Cuando el tratamiento se base en el consentimiento, puede retirarlo en cualquier momento sin que ello afecte al tratamiento previo. Para ejercer derechos sobre datos operativos, contacte con su Empleador (el responsable); para datos de cuenta, contáctenos en [CONTACT EMAIL]. También tiene derecho a presentar una reclamación ante su autoridad de control de protección de datos local.

8. Seguridad
Aplicamos medidas técnicas y organizativas para proteger sus datos, incluidos el cifrado en tránsito, controles de acceso a nivel de fila que aíslan los datos de cada negocio, autorización aplicada en el servidor y acceso con privilegios mínimos. Ningún sistema es perfectamente seguro, pero trabajamos para proteger su información y responder ante incidentes.

9. Menores
El Servicio está destinado a un uso en contexto laboral por personas en edad legal de trabajar. No se dirige a menores y no creamos a sabiendas cuentas para personas por debajo de la edad mínima permitida por la legislación aplicable.

10. Cambios en esta política
Podemos actualizar esta política de vez en cuando. Cuando realicemos cambios sustanciales, actualizaremos la fecha de «Última actualización» y, cuando proceda, le pediremos que revise la política revisada en la aplicación.

11. Contacto
Proveedor: [COMPANY], [MAILING ADDRESS].
Contacto de privacidad / Delegado de Protección de Datos (si se ha designado): [CONTACT EMAIL].

MARCADOR DE POSICIÓN: este es un borrador de buena fe, no asesoramiento jurídico. Hágalo revisar por asesores legales cualificados y complete cada elemento [BRACKETED] (y confirme que los roles de responsable/encargado, las regiones de alojamiento y los plazos de conservación coinciden con su configuración real) antes de su publicación.`;

const PRIVACY_FR = `POLITIQUE DE CONFIDENTIALITÉ

Dernière mise à jour : [DATE]

La présente Politique de confidentialité explique comment [COMPANY] (« nous », « notre », « le fournisseur ») traite les données personnelles dans l'application QuickTeam et les services associés (le « Service »). Elle est rédigée conformément au Règlement général sur la protection des données (RGPD) de l'Union européenne et à la législation nationale applicable en matière de protection des données.

1. Qui est responsable de vos données
QuickTeam est un outil de planification du personnel utilisé par des entreprises (chacune un « Employeur ») pour organiser leurs équipes.
- Pour la plupart des données opérationnelles concernant les employés (horaires, disponibilités, préférences, congés, absences, relevés de temps de travail, messages au sein d'une équipe), l'Employeur qui vous a invité est le responsable du traitement et décide des finalités et des moyens du traitement. Nous agissons en tant que sous-traitant de l'Employeur et traitons ces données selon ses instructions documentées. Les questions relatives à ces données doivent d'abord être adressées à votre Employeur.
- Pour les données de compte nécessaires au fonctionnement du Service lui-même (identifiants de connexion, lien entre votre connexion et vos profils, journaux de sécurité, demandes d'assistance et rapports de bogue que vous nous envoyez), nous sommes le responsable du traitement.
Si vous ne savez pas à qui vous adresser, écrivez-nous à [CONTACT EMAIL] et nous vous aiderons à orienter votre demande.

2. Quelles données nous traitons
- Données de compte : adresse e-mail et (facultativement) numéro de téléphone ; un enregistrement d'authentification et un mot de passe gérés par notre fournisseur d'authentification (nous ne voyons jamais votre mot de passe en clair).
- Données de profil : nom et prénom, rôle(s), type de contrat, heures cibles/maximales, solde d'heures supplémentaires, droit aux congés et appartenance à un ou plusieurs établissements.
- Données opérationnelles : affectations et historique d'horaires, disponibilités et préférences d'horaires, demandes de congés et d'absences, enregistrements d'échanges d'horaires et de remplacements d'urgence, annonces, votes de sondage, réalisation de tâches/listes de contrôle, et messages que vous envoyez ou recevez au sein d'un établissement.
- Données d'assistance : rapports de bogue et le contenu que vous y incluez.
- Données techniques : informations nécessaires au fonctionnement et à la sécurisation du Service, telles que les identifiants de session, les horodatages et les journaux d'erreurs.
Nous ne collectons pas sciemment de catégories particulières de données (p. ex. données de santé). Veuillez ne pas saisir de telles données dans les champs de texte libre.

3. Pourquoi nous les traitons et les bases légales (art. 6 RGPD)
- Pour fournir le Service et vos fonctionnalités de planification : exécution d'un contrat et/ou intérêts légitimes de votre Employeur à organiser son personnel (art. 6, § 1, b et f).
- Pour gérer les comptes, vous authentifier et sécuriser le Service : intérêts légitimes à un service sûr et fonctionnel (art. 6, § 1, f).
- Pour aider votre Employeur à respecter ses obligations en matière de temps de travail et de tenue de registres : respect d'une obligation légale à laquelle l'Employeur est soumis (art. 6, § 1, c).
- Fonctionnalités facultatives reposant sur votre choix (p. ex. lier un numéro de téléphone pour la connexion par SMS) : consentement, que vous pouvez retirer à tout moment (art. 6, § 1, a).

4. Qui peut voir vos données
- Les personnes de votre établissement : votre Employeur/responsable peut voir les données opérationnelles nécessaires à votre planification. Les collègues ne voient que des informations limitées (comme votre nom et les horaires partagés) uniquement lorsque votre Employeur l'a activé dans les paramètres de visibilité de l'établissement ; sinon, les informations sur les collègues sont restreintes.
- Nos prestataires (sous-traitants) : nous utilisons Supabase pour l'hébergement, la base de données et l'authentification, avec un fonctionnement dans l'Union européenne (régions de Francfort/Irlande). Ils traitent les données uniquement pour nous fournir l'infrastructure, dans le cadre d'un accord de sous-traitance.
- Nous ne vendons pas vos données personnelles et ne les utilisons pas à des fins publicitaires.
- Nous pouvons divulguer des données si la loi l'exige ou pour protéger des droits et la sécurité.

5. Transferts internationaux
Le Service est hébergé au sein de l'UE/EEE. Si un traitement devait avoir lieu en dehors de l'EEE, nous nous appuierons sur des garanties appropriées telles que les Clauses contractuelles types de la Commission européenne.

6. Durée de conservation
- Les données opérationnelles sont conservées tant que le compte de l'Employeur est actif et aussi longtemps que nécessaire pour ses obligations en matière de temps de travail et de tenue de registres ; l'Employeur en contrôle la conservation et la suppression.
- Les données de compte sont conservées pendant l'existence de votre compte et pour une période limitée par la suite, dans la mesure nécessaire à des fins de sécurité et légales, puis supprimées ou anonymisées.
- Lorsqu'un dossier d'employé est anonymisé ou supprimé, les champs identifiants (nom, e-mail, lien de connexion) sont retirés et le dossier ne peut plus vous être attribué.

7. Vos droits
Sous réserve des conditions du RGPD, vous avez le droit : d'accéder à vos données ; de rectifier des données inexactes ; d'effacer des données (« droit à l'oubli ») ; de limiter le traitement ou de vous y opposer ; et de recevoir vos données dans un format portable. Lorsque le traitement est fondé sur le consentement, vous pouvez le retirer à tout moment sans que cela n'affecte le traitement antérieur. Pour exercer des droits sur les données opérationnelles, contactez votre Employeur (le responsable du traitement) ; pour les données de compte, contactez-nous à [CONTACT EMAIL]. Vous avez également le droit d'introduire une réclamation auprès de votre autorité de contrôle locale en matière de protection des données.

8. Sécurité
Nous mettons en œuvre des mesures techniques et organisationnelles pour protéger vos données, notamment le chiffrement en transit, des contrôles d'accès au niveau des lignes qui isolent les données de chaque établissement, une autorisation appliquée côté serveur et un accès selon le principe du moindre privilège. Aucun système n'est parfaitement sûr, mais nous nous efforçons de protéger vos informations et de réagir aux incidents.

9. Enfants
Le Service est destiné à une utilisation dans un cadre professionnel par des personnes ayant l'âge légal de travailler. Il ne s'adresse pas aux enfants et nous ne créons pas sciemment de comptes pour des personnes en dessous de l'âge minimal autorisé par la législation applicable.

10. Modifications de cette politique
Nous pouvons mettre à jour cette politique de temps à autre. En cas de modifications importantes, nous mettrons à jour la date de « Dernière mise à jour » et, le cas échéant, vous demanderons d'examiner la politique révisée dans l'application.

11. Contact
Fournisseur : [COMPANY], [MAILING ADDRESS].
Contact confidentialité / Délégué à la protection des données (si désigné) : [CONTACT EMAIL].

TEXTE PROVISOIRE — il s'agit d'un projet de bonne foi, et non d'un conseil juridique. Faites-le examiner par un conseil qualifié et complétez chaque élément [BRACKETED] (et vérifiez que les rôles responsable/sous-traitant, les régions d'hébergement et les durées de conservation correspondent à votre configuration réelle) avant toute publication.`;

const PRIVACY_RU = `ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ

Последнее обновление: [DATE]

Настоящая Политика конфиденциальности описывает, как [COMPANY] («мы», «нас», «поставщик») обрабатывает персональные данные в приложении QuickTeam и связанных сервисах («Сервис»). Она составлена с учётом Общего регламента по защите данных (GDPR) Европейского союза и применимого национального законодательства о защите данных.

1. Кто отвечает за ваши данные
QuickTeam — это инструмент планирования персонала, используемый компаниями (каждая — «Работодатель») для организации своих команд.
- В отношении большинства операционных данных о сотрудниках (смены, доступность, предпочтения, отпуска, отсутствия, учёт рабочего времени, сообщения внутри команды) Работодатель, пригласивший вас, является контролёром данных и определяет цели и способы обработки. Мы выступаем как обработчик по поручению Работодателя и обрабатываем эти данные согласно его документированным указаниям. Вопросы по таким данным следует сначала направлять вашему Работодателю.
- В отношении данных учётной записи, необходимых для работы самого Сервиса (учётные данные для входа, связь между вашим входом и вашими профилями, журналы безопасности, обращения в поддержку и отчёты об ошибках, которые вы нам отправляете), контролёром являемся мы.
Если вы не уверены, к кому обратиться, напишите нам на [CONTACT EMAIL], и мы поможем направить ваш запрос.

2. Какие данные мы обрабатываем
- Данные учётной записи: адрес электронной почты и (по желанию) номер телефона; запись аутентификации и пароль, управляемые нашим поставщиком аутентификации (мы никогда не видим ваш пароль в открытом виде).
- Данные профиля: имя и фамилия, роль(и), тип договора, целевые/максимальные часы, баланс сверхурочных, право на отпуск и членство в одном или нескольких заведениях.
- Операционные данные: назначения смен и их история, доступность и предпочтения по сменам, заявки на отпуск и отсутствие, записи об обмене сменами и экстренных заменах, объявления, голосования в опросах, выполнение задач/чек-листов, а также сообщения, которые вы отправляете или получаете в рамках заведения.
- Данные поддержки: отчёты об ошибках и содержимое, которое вы в них включаете.
- Технические данные: сведения, необходимые для работы и защиты Сервиса, такие как идентификаторы сессий, метки времени и журналы ошибок.
Мы сознательно не собираем особые категории данных (например, данные о здоровье). Пожалуйста, не вводите такие данные в поля свободного текста.

3. Зачем мы их обрабатываем и правовые основания (ст. 6 GDPR)
- Для предоставления Сервиса и функций планирования — исполнение договора и/или законные интересы вашего Работодателя в организации персонала (ст. 6(1)(b) и (f)).
- Для управления учётными записями, вашей аутентификации и защиты Сервиса — законные интересы в безопасном и работоспособном сервисе (ст. 6(1)(f)).
- Для содействия вашему Работодателю в соблюдении обязанностей по учёту рабочего времени — исполнение юридической обязанности, которой подчиняется Работодатель (ст. 6(1)(c)).
- Дополнительные функции, основанные на вашем выборе (например, привязка номера телефона для входа по SMS) — согласие, которое вы можете отозвать в любой момент (ст. 6(1)(a)).

4. Кто может видеть ваши данные
- Люди в вашем заведении: ваш Работодатель/руководитель может видеть операционные данные, необходимые для вашего планирования. Коллеги видят ограниченную информацию (например, ваше имя и общие смены) только если ваш Работодатель включил это в настройках видимости заведения; в противном случае сведения о коллегах ограничены.
- Наши поставщики услуг (обработчики): мы используем Supabase для хостинга, базы данных и аутентификации с работой в Европейском союзе (регионы Франкфурт/Ирландия). Они обрабатывают данные только для предоставления нам инфраструктуры на основании договора об обработке данных.
- Мы не продаём ваши персональные данные и не используем их для рекламы.
- Мы можем раскрывать данные, если это требуется по закону или для защиты прав и безопасности.

5. Международная передача данных
Сервис размещается в пределах ЕС/ЕЭП. Если обработка когда-либо будет происходить за пределами ЕЭП, мы будем опираться на надлежащие гарантии, такие как Стандартные договорные положения Европейской комиссии.

6. Как долго мы храним данные
- Операционные данные хранятся до тех пор, пока учётная запись Работодателя активна, и столько, сколько необходимо для его обязанностей по учёту рабочего времени; Работодатель контролирует их хранение и удаление.
- Данные учётной записи хранятся в течение существования вашей учётной записи и ограниченный период после этого, насколько это необходимо в целях безопасности и по юридическим причинам, после чего удаляются или анонимизируются.
- При анонимизации или удалении записи сотрудника идентифицирующие поля (имя, электронная почта, связь входа) удаляются, и запись больше не может быть отнесена к вам.

7. Ваши права
С учётом условий GDPR вы имеете право: на доступ к своим данным; на исправление неточных данных; на удаление данных («право быть забытым»); на ограничение обработки или возражение против неё; а также на получение своих данных в переносимом формате. Если обработка основана на согласии, вы можете отозвать его в любой момент без ущерба для ранее осуществлённой обработки. Для реализации прав в отношении операционных данных обращайтесь к вашему Работодателю (контролёру); по данным учётной записи — к нам по адресу [CONTACT EMAIL]. Вы также имеете право подать жалобу в местный надзорный орган по защите данных.

8. Безопасность
Мы применяем технические и организационные меры для защиты ваших данных, включая шифрование при передаче, построчный контроль доступа, изолирующий данные каждого заведения, авторизацию, обеспечиваемую на стороне сервера, и доступ по принципу наименьших привилегий. Ни одна система не является абсолютно безопасной, но мы работаем над защитой вашей информации и реагированием на инциденты.

9. Дети
Сервис предназначен для использования в рабочем контексте лицами, достигшими установленного законом трудового возраста. Он не адресован детям, и мы сознательно не создаём учётные записи для лиц младше минимального возраста, допускаемого применимым законодательством.

10. Изменения в настоящей политике
Мы можем время от времени обновлять настоящую политику. При существенных изменениях мы обновим дату «Последнее обновление» и, при необходимости, попросим вас ознакомиться с изменённой политикой в приложении.

11. Контакты
Поставщик: [COMPANY], [MAILING ADDRESS].
Контакт по вопросам конфиденциальности / ответственный за защиту данных (если назначен): [CONTACT EMAIL].

ЗАПОЛНИТЕЛЬ — это добросовестный черновик, а не юридическая консультация. Передайте его на проверку квалифицированным юристам и заполните каждый пункт [BRACKETED] (а также убедитесь, что роли контролёра/обработчика, регионы хостинга и сроки хранения соответствуют вашей фактической конфигурации) перед публикацией.`;

const PRIVACY_TR = `GİZLİLİK POLİTİKASI

Son güncelleme: [DATE]

Bu Gizlilik Politikası, [COMPANY] («biz», «bize», «sağlayıcı») olarak QuickTeam uygulamasında ve ilgili hizmetlerde («Hizmet») kişisel verileri nasıl işlediğimizi açıklar. Avrupa Birliği Genel Veri Koruma Tüzüğü (GDPR) ve geçerli ulusal veri koruma mevzuatı dikkate alınarak hazırlanmıştır.

1. Verilerinizden kim sorumlu
QuickTeam, işletmelerin (her biri bir «İşveren») ekiplerini organize etmek için kullandığı bir personel planlama aracıdır.
- Çalışanlara ilişkin çoğu operasyonel veri (vardiyalar, uygunluk, tercihler, izin, devamsızlık, çalışma süresi kayıtları, ekip içi mesajlar) bakımından sizi davet eden İşveren veri sorumlusudur ve işlemenin amaç ve yöntemlerini belirler. Biz, İşverenin veri işleyeni olarak hareket eder ve bu verileri onun belgelenmiş talimatları doğrultusunda işleriz. Bu verilerle ilgili sorularınızı öncelikle İşvereninize iletin.
- Hizmetin kendisini çalıştırmak için gereken hesap verileri (oturum açma kimlik bilgileri, oturumunuz ile profilleriniz arasındaki bağlantı, güvenlik günlükleri, bize gönderdiğiniz destek ve hata bildirimleri) bakımından veri sorumlusu biziz.
Kime başvuracağınızdan emin değilseniz [CONTACT EMAIL] adresinden bize yazın, talebinizi yönlendirmenize yardımcı olalım.

2. Hangi verileri işliyoruz
- Hesap verileri: e-posta adresi ve (isteğe bağlı) telefon numarası; kimlik doğrulama sağlayıcımız tarafından yönetilen bir kimlik doğrulama kaydı ve parola (parolanızı hiçbir zaman açık metin olarak görmeyiz).
- Profil verileri: ad ve soyad, rol(ler), sözleşme türü, hedef/azami çalışma saatleri, fazla mesai bakiyesi, izin hakkı ve bir veya birden fazla işletmeye üyelik.
- Operasyonel veriler: vardiya atamaları ve geçmişi, uygunluk ve vardiya tercihleri, izin ve devamsızlık talepleri, vardiya değişimi ve acil yerine geçme kayıtları, duyurular, anket oyları, görev/kontrol listesi tamamlama ve bir işletme içinde gönderdiğiniz veya aldığınız mesajlar.
- Destek verileri: hata bildirimleri ve bunlara eklediğiniz içerik.
- Teknik veriler: Hizmeti çalıştırmak ve güvenliğini sağlamak için gereken bilgiler; örneğin oturum tanımlayıcıları, zaman damgaları ve hata günlükleri.
Bilerek özel nitelikli veri (ör. sağlık verileri) toplamayız. Lütfen bu tür verileri serbest metin alanlarına girmeyin.

3. Neden işliyoruz ve hukuki dayanaklar (GDPR md. 6)
- Hizmeti ve planlama özelliklerinizi sunmak için — bir sözleşmenin ifası ve/veya İşvereninizin iş gücünü organize etmedeki meşru menfaatleri (md. 6(1)(b) ve (f)).
- Hesapları işletmek, kimliğinizi doğrulamak ve Hizmeti güvende tutmak için — güvenli ve işleyen bir hizmete yönelik meşru menfaatler (md. 6(1)(f)).
- İşvereninizin çalışma süresi ve kayıt tutma yükümlülüklerine uymasına yardımcı olmak için — İşverenin tabi olduğu bir hukuki yükümlülüğün yerine getirilmesi (md. 6(1)(c)).
- Tercihinize dayalı isteğe bağlı özellikler (ör. SMS ile oturum açmak için telefon numarası bağlama) — istediğiniz zaman geri alabileceğiniz açık rıza (md. 6(1)(a)).

4. Verilerinizi kimler görebilir
- İşletmenizdeki kişiler: İşvereniniz/yöneticiniz sizi planlamak için gereken operasyonel verileri görebilir. İş arkadaşlarınız yalnızca İşvereniniz işletmenin görünürlük ayarlarında etkinleştirdiyse sınırlı bilgileri (adınız ve ortak vardiyalar gibi) görür; aksi hâlde iş arkadaşı bilgileri kısıtlıdır.
- Hizmet sağlayıcılarımız (veri işleyenler): barındırma, veritabanı ve kimlik doğrulama için Avrupa Birliği'nde (Frankfurt/İrlanda bölgeleri) çalışan Supabase'i kullanırız. Verileri yalnızca bir veri işleme sözleşmesi kapsamında bize altyapı sağlamak için işlerler.
- Kişisel verilerinizi satmayız ve reklam için kullanmayız.
- Yasa gerektirdiğinde veya hakları ve güvenliği korumak için verileri açıklayabiliriz.

5. Uluslararası aktarımlar
Hizmet AB/AEA içinde barındırılır. İşlemenin AEA dışında gerçekleşmesi hâlinde, Avrupa Komisyonu'nun Standart Sözleşme Hükümleri gibi uygun güvencelere dayanırız.

6. Ne kadar süre saklarız
- Operasyonel veriler, İşverenin hesabı etkin olduğu sürece ve çalışma süresi ile kayıt tutma yükümlülükleri için gerekli olduğu sürece saklanır; saklama ve silmeyi İşveren denetler.
- Hesap verileri, hesabınız var olduğu sürece ve güvenlik ile yasal amaçlarla gerekli olan sınırlı bir süre boyunca saklanır, ardından silinir veya anonim hâle getirilir.
- Bir çalışan kaydı anonimleştirildiğinde veya silindiğinde, kimlik belirleyici alanlar (ad, e-posta, oturum bağlantısı) kaldırılır ve kayıt artık size atfedilemez.

7. Haklarınız
GDPR'daki koşullara tabi olarak şu haklara sahipsiniz: verilerinize erişme; yanlış verileri düzeltme; verileri silme («unutulma hakkı»); işlemeyi kısıtlama veya buna itiraz etme; ve verilerinizi taşınabilir bir biçimde alma. İşleme açık rızaya dayanıyorsa, önceki işlemeyi etkilemeksizin rızanızı istediğiniz zaman geri alabilirsiniz. Operasyonel veriler üzerindeki hakları kullanmak için İşvereninizle (veri sorumlusu) iletişime geçin; hesap verileri için [CONTACT EMAIL] adresinden bize ulaşın. Ayrıca yerel veri koruma denetim makamına şikâyette bulunma hakkınız vardır.

8. Güvenlik
Verilerinizi korumak için teknik ve idari önlemler uygularız; bunlar arasında aktarım sırasında şifreleme, her işletmenin verilerini birbirinden yalıtan satır düzeyinde erişim denetimleri, sunucu tarafında uygulanan yetkilendirme ve en az ayrıcalık ilkesine göre erişim yer alır. Hiçbir sistem tümüyle güvenli değildir, ancak bilgilerinizi korumak ve olaylara yanıt vermek için çalışırız.

9. Çocuklar
Hizmet, yasal çalışma yaşındaki kişilerin iş bağlamında kullanması için tasarlanmıştır. Çocuklara yönelik değildir ve geçerli yasaların izin verdiği asgari yaşın altındaki kişiler için bilerek hesap oluşturmayız.

10. Bu politikadaki değişiklikler
Bu politikayı zaman zaman güncelleyebiliriz. Önemli değişiklikler yaptığımızda «Son güncelleme» tarihini güncelleriz ve uygun olduğunda gözden geçirilmiş politikayı uygulamada incelemenizi isteriz.

11. İletişim
Sağlayıcı: [COMPANY], [MAILING ADDRESS].
Gizlilik iletişimi / Veri Koruma Görevlisi (atandıysa): [CONTACT EMAIL].

YER TUTUCU — bu, hukuki tavsiye değil, iyi niyetle hazırlanmış bir taslaktır. Yayımlamadan önce nitelikli hukuk danışmanlarına inceletin ve her [BRACKETED] öğesini tamamlayın (ayrıca veri sorumlusu/işleyen rollerinin, barındırma bölgelerinin ve saklama sürelerinin gerçek kurulumunuzla eşleştiğini doğrulayın).`;

const PRIVACY_UK = `ПОЛІТИКА КОНФІДЕНЦІЙНОСТІ

Останнє оновлення: [DATE]

Ця Політика конфіденційності пояснює, як [COMPANY] («ми», «нас», «постачальник») обробляє персональні дані в застосунку QuickTeam та пов'язаних сервісах («Сервіс»). Її складено з урахуванням Загального регламенту про захист даних (GDPR) Європейського Союзу та застосовного національного законодавства про захист даних.

1. Хто відповідає за ваші дані
QuickTeam — це інструмент планування персоналу, який використовують компанії (кожна — «Роботодавець») для організації своїх команд.
- Щодо більшості операційних даних про працівників (зміни, доступність, уподобання, відпустки, відсутності, облік робочого часу, повідомлення в межах команди) Роботодавець, який вас запросив, є контролером даних і визначає цілі та засоби обробки. Ми діємо як обробник за дорученням Роботодавця й обробляємо ці дані згідно з його задокументованими вказівками. Питання щодо таких даних слід спершу спрямовувати вашому Роботодавцю.
- Щодо даних облікового запису, потрібних для роботи самого Сервісу (облікові дані для входу, зв'язок між вашим входом і вашими профілями, журнали безпеки, звернення до підтримки та звіти про помилки, які ви нам надсилаєте), контролером є ми.
Якщо ви не впевнені, до кого звертатися, напишіть нам на [CONTACT EMAIL], і ми допоможемо спрямувати ваш запит.

2. Які дані ми обробляємо
- Дані облікового запису: адреса електронної пошти та (за бажанням) номер телефону; запис автентифікації та пароль, якими керує наш постачальник автентифікації (ми ніколи не бачимо ваш пароль у відкритому вигляді).
- Дані профілю: ім'я та прізвище, роль(і), тип договору, цільові/максимальні години, баланс понаднормових, право на відпустку та членство в одному чи кількох закладах.
- Операційні дані: призначення змін та їх історія, доступність і вподобання щодо змін, заявки на відпустку та відсутність, записи про обмін змінами та екстрені заміни, оголошення, голосування в опитуваннях, виконання завдань/контрольних списків, а також повідомлення, які ви надсилаєте або отримуєте в межах закладу.
- Дані підтримки: звіти про помилки та вміст, який ви до них додаєте.
- Технічні дані: відомості, потрібні для роботи та захисту Сервісу, як-от ідентифікатори сесій, позначки часу та журнали помилок.
Ми свідомо не збираємо особливі категорії даних (наприклад, дані про здоров'я). Будь ласка, не вводьте такі дані у поля довільного тексту.

3. Навіщо ми їх обробляємо та правові підстави (ст. 6 GDPR)
- Для надання Сервісу та функцій планування — виконання договору та/або законні інтереси вашого Роботодавця в організації персоналу (ст. 6(1)(b) і (f)).
- Для роботи облікових записів, вашої автентифікації та захисту Сервісу — законні інтереси в безпечному та працездатному сервісі (ст. 6(1)(f)).
- Для сприяння вашому Роботодавцю у дотриманні обов'язків щодо робочого часу та ведення записів — виконання юридичного обов'язку, якому підпорядковується Роботодавець (ст. 6(1)(c)).
- Додаткові функції, що ґрунтуються на вашому виборі (наприклад, прив'язка номера телефону для входу за SMS) — згода, яку ви можете відкликати будь-коли (ст. 6(1)(a)).

4. Хто може бачити ваші дані
- Люди у вашому закладі: ваш Роботодавець/керівник може бачити операційні дані, потрібні для вашого планування. Колеги бачать обмежену інформацію (наприклад, ваше ім'я та спільні зміни) лише якщо ваш Роботодавець увімкнув це в налаштуваннях видимості закладу; інакше відомості про колег обмежені.
- Наші постачальники послуг (обробники): ми використовуємо Supabase для хостингу, бази даних та автентифікації з роботою в Європейському Союзі (регіони Франкфурт/Ірландія). Вони обробляють дані лише для надання нам інфраструктури на підставі договору про обробку даних.
- Ми не продаємо ваші персональні дані й не використовуємо їх для реклами.
- Ми можемо розкривати дані, якщо цього вимагає закон або для захисту прав і безпеки.

5. Міжнародні передавання
Сервіс розміщується в межах ЄС/ЄЕП. Якщо обробка коли-небудь відбуватиметься поза межами ЄЕП, ми спиратимемося на належні гарантії, такі як Стандартні договірні положення Європейської Комісії.

6. Скільки ми зберігаємо
- Операційні дані зберігаються, доки обліковий запис Роботодавця активний, і стільки, скільки потрібно для його обов'язків щодо робочого часу та ведення записів; їх зберігання та видалення контролює Роботодавець.
- Дані облікового запису зберігаються протягом існування вашого облікового запису та обмежений період після цього, наскільки це потрібно з міркувань безпеки та юридичних причин, після чого видаляються або анонімізуються.
- Коли запис працівника анонімізується або видаляється, ідентифікаційні поля (ім'я, електронна пошта, зв'язок входу) вилучаються, і запис більше не може бути віднесений до вас.

7. Ваші права
З урахуванням умов GDPR ви маєте право: на доступ до своїх даних; на виправлення неточних даних; на видалення даних («право бути забутим»); на обмеження обробки або заперечення проти неї; а також на отримання своїх даних у придатному для перенесення форматі. Якщо обробка ґрунтується на згоді, ви можете відкликати її будь-коли без шкоди для раніше здійсненої обробки. Для реалізації прав щодо операційних даних звертайтеся до вашого Роботодавця (контролера); щодо даних облікового запису — до нас на [CONTACT EMAIL]. Ви також маєте право подати скаргу до місцевого наглядового органу із захисту даних.

8. Безпека
Ми застосовуємо технічні та організаційні заходи для захисту ваших даних, зокрема шифрування під час передавання, порядковий контроль доступу, що ізолює дані кожного закладу, авторизацію, що забезпечується на боці сервера, і доступ за принципом найменших привілеїв. Жодна система не є цілком безпечною, але ми працюємо над захистом вашої інформації та реагуванням на інциденти.

9. Діти
Сервіс призначений для використання в робочому контексті особами, які досягли законного віку для роботи. Він не адресований дітям, і ми свідомо не створюємо облікові записи для осіб, молодших за мінімальний вік, дозволений застосовним законодавством.

10. Зміни до цієї політики
Ми можемо час від часу оновлювати цю політику. У разі суттєвих змін ми оновимо дату «Останнє оновлення» та, за потреби, попросимо вас переглянути оновлену політику в застосунку.

11. Контакти
Постачальник: [COMPANY], [MAILING ADDRESS].
Контакт із питань конфіденційності / відповідальний за захист даних (якщо призначено): [CONTACT EMAIL].

ЗАПОВНЮВАЧ — це сумлінний чернетковий варіант, а не юридична консультація. Передайте його на перевірку кваліфікованим юристам і заповніть кожен пункт [BRACKETED] (а також переконайтеся, що ролі контролера/обробника, регіони хостингу та строки зберігання відповідають вашій фактичній конфігурації) перед публікацією.`;

const BODIES: Record<LegalDocId, DocBodies> = {
  privacy: { en: PRIVACY_EN, de: PRIVACY_DE, es: PRIVACY_ES, fr: PRIVACY_FR, ru: PRIVACY_RU, tr: PRIVACY_TR, uk: PRIVACY_UK },
  terms: { en: TERMS_EN },
  eula: { en: EULA_EN },
  dmca: { en: DMCA_EN },
};

// Body text for a document in the given language, falling back to English.
export function legalBody(id: LegalDocId, lang: string): string {
  const doc = BODIES[id];
  return doc[lang] ?? doc.en;
}
