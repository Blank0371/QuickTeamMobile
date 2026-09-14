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
//
// SOURCE OF TRUTH — QuickTeamFront:
// PRIVACY_* and TERMS_* are plain-text copies of the Markdown documents in
// QuickTeamFront/docs/rechtliches/legals/ (datenschutzerklaerung-de /
// privacy-policy-en, AGB-QuickTeam-de / Terms-QuickTeam-en), which the website
// serves at quickteam.at/datenschutz and /agb. They are shown in the consent
// gate; Settings links to the website instead (see LEGAL_WEBSITE_URLS). The
// wording must stay identical; only the Markdown syntax is removed (tables
// become indented lists). When the website text changes, re-copy it here and
// bump the matching version in privacyPolicy.ts / terms.ts to the website's
// version (src/lib/rechtstexte.ts there). All documents are pre-lawyer drafts.
// EULA_* and DMCA_* are app-only.

export type LegalDocId = "privacy" | "terms" | "eula" | "dmca";

type DocBodies = Record<string, string> & { en: string };

const PRIVACY_EN = `PRIVACY POLICY

Last updated: 13 September 2026

This Privacy Policy informs you, in accordance with Articles 13 and 14 of the General Data Protection Regulation (GDPR), how BlankTrading UG (haftungsbeschränkt) ("we" or "us") processes personal data when you

- visit our website quickteam.at,
- register and book QuickTeam as the owner of a business, or
- use QuickTeam in the web dashboard or in the QuickTeam app for iOS and Android, whether as a manager or as an employee of a business.

The website, the web dashboard and the app together make up the "QuickTeam" service (the "Service"). Where processing differs between the website and the app, this is stated explicitly.

1. Controller and contact

BlankTrading UG (haftungsbeschränkt)
Gabriele-Münter-Straße 31
73760 Ostfildern
Germany
Represented by its managing director Leo Solomon
Commercial register: Amtsgericht Stuttgart (Local Court of Stuttgart), HRB 795737
Email: blanktrading@web.de
Phone: +43 664 2538798

Data-protection contact: blanktrading@web.de. Please also send all requests to exercise your rights (Section 17) to this address.

Data protection officer: We are not required to appoint a data protection officer (Art. 37 GDPR, Sec. 38(1) BDSG) and have not appointed one. Data-protection requests are handled directly by our management.

2. Who is responsible for which data

QuickTeam is a shift and staff-scheduling tool used by businesses (each an "Employer") for their teams. There are two controllers for the data involved:

- Website visits, cookies (Sections 3 and 4)
  Controller: us
  Our role: controller
- Registration, contract and payment of a business (Sections 5 and 6)
  Controller: us
  Our role: controller
- Your login account, sessions, push delivery, email contact, bug reports (Sections 7.1, 10, 11, 12)
  Controller: us
  Our role: controller
- Operational data: your profile within the business, shifts, availability, preferences, vacation, shift swaps, emergencies, messages, polls, change log (Sections 7.2 to 9)
  Controller: your Employer
  Our role: processor (Art. 28 GDPR)

Operational data. Your Employer decides which data about you it records in QuickTeam, who in the business may see which information, and when data is deleted. We process this data only on the Employer's instructions under a data processing agreement. Your Employer is obliged to inform you about this processing itself; Sections 7.2 to 9 describe what the Service does technically but do not replace that information. Please direct requests about operational data to your Employer first. If such a request reaches us, we forward it to your Employer without undue delay and support them in responding.

Source of the data (Art. 14 GDPR). Employees are usually created by their Employer. Your name, email address, phone number where applicable, role(s) and employment details (such as contract type, target hours and vacation entitlement) therefore initially come from your Employer rather than from you. All other data arises when you or other members of your business use the Service.

If you are unsure whom to contact, write to us. We will help you or forward your request to the right place.

3. Visiting the website

3.1 Hosting and server logs

The website and the web dashboard are hosted and delivered by Vercel Inc., USA. With every page request, Vercel processes the technically necessary data: IP address, date and time, requested address, referrer, amount of data transferred, HTTP status code, and browser and operating-system information (user agent).

- Purpose: delivering the pages, stability, defence against attacks and error analysis.
- Legal basis: Art. 6(1)(f) GDPR. Our legitimate interest lies in providing the website securely and reliably.
- Retention: Vercel automatically deletes the logs of its server functions after one day at the latest. We do not keep our own access logs, and we do not combine this data with other data.
- Recipients: Vercel acts as our processor. Vercel delivers content via a worldwide server network; processing in the USA cannot be ruled out (Section 14).

3.2 No analytics, no advertising, no embedded third-party content

We use no analytics, tracking or advertising services and do not embed social-media plugins, maps or third-party videos. Fonts are served from our own server; no connection to Google Fonts or any other font provider is made when you load a page. The only place where third-party content is loaded is the payment form (Section 6).

4. Cookies and similar technologies on the website

We use only cookies that are technically necessary for the service you are using:

- qt_sprache
  Purpose: stores your chosen language (German or English)
  Retention: 1 year
  When set: only when you switch language
- sb-…-auth-token (possibly split into several parts)
  Purpose: keeps you signed in after login; contains your session and access identifiers
  Retention: until you sign out, at most 400 days
  When set: at login
- qt_position
  Purpose: remembers which of your positions you are working with in the dashboard if your account belongs to several businesses or positions
  Retention: 1 year; deleted when you sign out
  When set: when you select a position
- qt_registrierung
  Purpose: holds the business name, country and your first and last name during registration until the confirmation code has been entered; readable only on the registration page
  Retention: 24 hours; deleted after confirmation
  When set: during registration
- __stripe_mid, __stripe_sid
  Purpose: fraud prevention during payment (Stripe)
  Retention: 1 year and 30 minutes respectively
  When set: only on pages with the payment form (Section 6)

Legal basis: Storing and reading these cookies is strictly necessary for us to provide the service you have explicitly requested (Sec. 25(2) no. 2 TDDDG; in Austria Sec. 165(3) TKG 2021). No consent is required for this. The related processing of personal data is based on Art. 6(1)(b) GDPR (use of the Service) or Art. 6(1)(f) GDPR (security, language choice, fraud prevention).

Because we do not use any cookies for analytics or advertising, we do not display a cookie banner. You can delete or block cookies in your browser settings; without the login cookies, however, you cannot sign in.

5. Registering a business

5.1 What data we collect

To register a business we collect: the name of the business, its country (Germany or Austria), your first and last name, your email address and a password. The password is transmitted in encrypted form (TLS) to our server, which passes it straight on to our authentication service; the same applies at every sign-in and when resetting the password. We do not log or store the password. Only a cryptographic hash, from which the password cannot be recovered, is stored permanently.

To confirm your email address, we send you an eight-digit code (Section 12.1). Only after you enter the code is the business created and your account linked to it as manager ("Chef"). Until then, the business details are held with your not-yet-confirmed account.

Unconfirmed registrations are deleted automatically. If the code is not entered within 24 hours, an hourly process deletes the account together with the details stored with it.

5.2 Record of acceptance of the Terms, the DPA and this Privacy Policy

When registering, you accept the General Terms and Conditions and the Data Processing Agreement (DPA) on behalf of your business and take note of this Privacy Policy. If any of these documents changes, we ask managers to confirm again in the dashboard. As evidence, we store for each document: its name, version (date of the edition), time, the identifiers of your account and of the business and, where applicable, the language of the accepted version. These records cannot be changed afterwards.

5.3 Purposes and legal bases

- Creating and managing the customer account, concluding the contract: Art. 6(1)(b) GDPR where you are the contracting party yourself (for example as a sole trader). Where you act for a company, for example as its managing director, we base the processing of your data on Art. 6(1)(f) GDPR; our legitimate interest lies in performing the contract with the company you represent.
- Confirming your email address: Art. 6(1)(f) GDPR (protection against accounts with third-party or incorrect addresses).
- Record of acceptance: Art. 6(1)(f) GDPR (evidence of the conclusion of the contract and of the incorporation of the contractual terms).

6. Payment processing with Stripe

After registering, you choose a plan. The subscription begins with a 14-day trial, even if you have not yet added a payment method. You can add a payment method immediately or at any time before the trial ends; if the trial ends without one, the subscription is paused (for the consequences for your data, see Section 15.3).

- We transmit to Stripe: your email address, an internal identifier of your business and the chosen plan.
- Payment details (such as card details or an IBAN for SEPA Direct Debit) are entered directly into Stripe's form, which is embedded on our page and loaded from Stripe's servers. This data goes straight to Stripe; we do not receive or store full card numbers or bank details.
- We store: the Stripe customer ID, the subscription ID, the plan and the subscription status (such as trial, active, paused). Stripe notifies us of status changes automatically.
- Customer portal: Via "Abo verwalten" (manage subscription) in the dashboard settings, managers reach Stripe's customer portal, where you can cancel the subscription, change the payment method and download invoices. The portal is operated by Stripe; for this we transmit only your Stripe customer ID and the address you return to afterwards.
- Fraud prevention: On pages with the payment form, Stripe collects device and usage data (e.g. IP address, browser characteristics, interactions with the form) and sets the cookies listed in Section 4 in order to detect fraudulent payments.

Responsibility: Payments are processed by Stripe Payments Europe, Limited, Ireland. Stripe processes payment and billing data as an independent controller, in particular to execute payments, prevent fraud and meet its own legal obligations (for example anti-money-laundering rules). Details can be found in Stripe's privacy policy at stripe.com/privacy. Stripe also transfers data to Stripe, Inc. in the USA (Section 14).

Legal bases: Art. 6(1)(b) or (f) GDPR (see Section 5.3) for handling the subscription; Art. 6(1)(f) GDPR for fraud prevention; Art. 6(1)(c) GDPR for retaining invoices and accounting records.

Employees pay nothing and do not provide any payment details.

7. Using the web dashboard and the app

7.1 Your login account (we are the controller)

For each account we process: email address, password hash, account ID, the times of creation, confirmation and last sign-in, and your chosen language. For every active login session, our authentication service additionally stores the IP address and browser or device identifier (user agent) until you sign out or delete your account.

One account can be linked to several positions, for example if you work at two businesses. In the app, you can merge two of your own login accounts; the linking code generated for this is valid for 15 minutes.

Employees create their account in the app with an email address and password and confirm it with a code. Their Employer's invitation is matched to the account via the email address the Employer has entered; we do not send invitation emails ourselves. You can use the same account to sign in to the web dashboard.

Purposes and legal bases: providing personal, protected access and securing the Service against misuse. For customers, Art. 6(1)(b) GDPR; for employees and other invited persons, Art. 6(1)(f) GDPR. Our legitimate interest, and that of your Employer, is to give invited persons secure access to the service the Employer has booked.

7.2 Your profile within the business (your Employer is the controller)

For each position we process: first and last name, email address, optionally a phone number, position within the business (manager or employee), job roles (e.g. "Kitchen", "Service"), status (invited, active, paused, inactive), contract type, target and maximum hours, permitted additional hours, overtime balance, vacation entitlement in days and preferred language.

7.3 Scheduling and communication data (your Employer is the controller)

- Shifts and assignments: date, start and end, role, origin of the assignment (manual, automatic plan proposal or shift swap) and a note where a shift is not worked because of an emergency report.
- Availability and preferences: whether you are available for a shift, and which shifts you like or prefer to avoid, including for individual days.
- Vacation: requested period, status, your optional comment and, where applicable, the reason given for the decision.
- Shift swaps: the people and shifts involved, preferred days, status and, where applicable, a reason for rejection.
- Emergencies and cover: the affected shift, an optional reason, status and the person taking over.
- Messages: announcements, polls and checklists of your business, including your vote, completed tasks and the time you read a message; notes on shifts; system messages (e.g. "shift changed"). In polls marked as anonymous, your vote is not shown to other members by name; it is nevertheless stored together with your profile so that each person can vote only once.
- Change log: every change to shifts and assignments is logged with its time, the account that made it, and the state before and after the change. Only managers of the business can view the log; it serves to keep the schedule traceable.
- Planning periods, including deadlines and the time at which an automatic plan proposal was generated (Section 9).

7.4 Who in the business sees what

- Managers of your business see all operational data of the business.
- Employees see their own data. Colleagues' names and shifts are visible only to the extent your Employer has enabled this in the business settings. Messages, polls, open shifts and cover requests are addressed to the team or to the people eligible for them.
- Vacation requests are visible only to you and the managers.
- Emergency reports, including the optional reason, are visible to the members of your business (see Section 8).

7.5 Purposes and legal bases of operational processing

The processing serves to plan and organise work in the business: scheduling, taking availability and wishes into account, managing vacation, shift swaps, emergency cover and internal team communication. The legal basis is determined by your Employer as controller. In particular, Art. 6(1)(b) GDPR in conjunction with Art. 88 GDPR and national employee data-protection law (in Germany, Sec. 26 BDSG) may apply to the extent the processing is necessary for the employment relationship; Art. 6(1)(c) GDPR to the extent your Employer uses the schedule for statutory working-time record-keeping obligations; and Art. 6(1)(f) GDPR for organisational features such as polls and announcements. We process this data as a processor under Art. 28 GDPR.

8. Free text and health data

Several features contain optional free-text fields: the reason for an emergency report, the comment on a vacation request, notes on shifts, and messages. We do not analyse free text.

Please do not enter information about your health there. Even a reason such as "sick" is health data and thus a special category of personal data (Art. 9 GDPR). You are not required to give a reason in the Service. The reason for an emergency report is visible to the members of your business. How you report an inability to work is governed by the rules of your employment relationship, not by QuickTeam.

If you nevertheless enter such information, your Employer processes it as controller. The legal basis is then Art. 9(2)(b) GDPR in conjunction with employee data-protection law (in Germany, Sec. 26(3) BDSG).

9. Automatically generated plan proposals

Managers can have a schedule proposal generated automatically for a planning period. The procedure takes into account the staffing need per shift and role, the employees' job roles, availability, shift preferences, approved vacation, target and maximum hours, existing assignments and statutory rest periods and maximum working hours.

- The calculation runs on our own infrastructure at Supabase in the EU. No data is transmitted to third parties or to AI services.
- The result is a proposal. A manager reviews it, can change or discard it, and makes it binding only by publishing it.
- The procedure neither assesses your performance or behaviour nor makes predictions about you.

There is therefore no decision based solely on automated processing that produces legal effects concerning you or similarly significantly affects you (Art. 22 GDPR).

10. Notifications and push messages

Notifications within the Service. Messages and system notifications (e.g. about changed shifts, swap requests, open shifts or decisions on vacation requests) are stored in our database and displayed in the web dashboard and in the app. The web dashboard does not send push messages.

Push messages (app only). You receive push messages only if you allow them on your device.

- If you allow push messages, the app obtains a device-specific push token. We store it together with your account ID, the platform (iOS or Android) and the time of the last update.
- For every notification addressed to you, our server transmits to the push service of Expo (650 Industries, Inc., USA): the push token, a title, a text and technical details (the type of notification and internal identifiers of the notification and the business). For announcements and polls, the title and text written by the author are transmitted in full; for system notifications, it is a standard text such as "One of your shifts was changed."
- Expo forwards the message to the Apple Push Notification service (Apple Inc., USA) or to Firebase Cloud Messaging (Google LLC, USA), which deliver it to your device.
- You can switch off individual notification types in the app settings, and push messages altogether in your device's system settings.
- Legal basis: for accessing the push token, your consent via your device's system dialog (Sec. 25(1) TDDDG or Sec. 165(3) TKG 2021, Art. 6(1)(a) GDPR), which you can withdraw at any time in the system settings; for delivery, Art. 6(1)(f) GDPR (timely information about your shifts and your team). For the transfer to the USA, see Section 14.
- Retention: The push token is deleted when you delete your account. If another account signs in on the same device, the token is assigned to that account. Signing out alone does not currently remove the token; if you no longer want to receive push messages after signing out, please switch them off in your system settings.

Local reminders. On request, the app schedules shift reminders solely on your device. They are triggered without a network connection; no data is transmitted to us or to third parties.

11. Storage on your device (app)

The app stores on your device: your login session (access and refresh identifiers), a cache of recently loaded data for display without a network connection (e.g. calendar data), your chosen language and appearance (light/dark), a note of which messages have already been shown, and the accepted version of the legal documents.

This data stays on your device. Storing it is strictly necessary for the features you use (Sec. 25(2) no. 2 TDDDG or Sec. 165(3) TKG 2021; Art. 6(1)(b) or (f) GDPR). The login session is removed when you sign out; the remaining data stays until you uninstall the app or clear the app data in your device settings.

App stores. When you download and update the app, Apple (App Store) and Google (Google Play) process data as controllers in their own right under their own privacy policies. We receive only aggregated statistics from the stores, not information about individual persons.

12. Email

12.1 Emails we send

We send only emails that are necessary for your account: confirmation codes for registration, password reset and changing your email address. We do not send newsletters or marketing emails.

These emails are sent via Resend, Inc., USA, as our processor. Resend processes your email address, the content of the message (including the code) and delivery logs, stores this data in the USA and deletes it after 30 days. The legal basis is Art. 6(1)(b) or (f) GDPR (see Sections 5.3 and 7.1). Confirmation codes are valid only briefly, at most 24 hours.

12.2 When you write to us

If you email us, we process your address, the content and the metadata of the message in order to handle your request. Our mailbox is operated by 1&1 Mail & Media GmbH (WEB.DE), Germany. The legal basis is Art. 6(1)(b) GDPR where your request concerns a contract, Art. 6(1)(c) GDPR where you exercise your data-subject rights, and otherwise Art. 6(1)(f) GDPR (answering enquiries). We delete the message once the request has been dealt with, unless it must be retained as a commercial or business letter (Section 15).

12.3 Bug reports from the app

You can report bugs to us via the app. We store only the text you enter, a processing status and the time, without any link to your account. Please do not include personal data in a bug report that we do not need to handle it. The legal basis is Art. 6(1)(f) GDPR (fixing bugs and improving the Service). We delete bug reports once they have been handled, and after 12 months at the latest.

13. Recipients at a glance

We disclose personal data only to the extent necessary for the respective purpose:

- Supabase, Inc.
  Task: database, authentication, server functions, backups
  Role: processor
  Place of processing: EU (Ireland); access from the USA possible
- Vercel Inc.
  Task: hosting of website and web dashboard
  Role: processor
  Place of processing: worldwide server network, including the USA
- Resend, Inc.
  Task: sending confirmation codes
  Role: processor
  Place of processing: USA
- 650 Industries, Inc. (Expo)
  Task: sending push messages
  Role: processor
  Place of processing: USA
- Apple Inc. (APNs)
  Task: delivering push messages on iOS
  Role: delivery service
  Place of processing: USA
- Google LLC (Firebase Cloud Messaging)
  Task: delivering push messages on Android
  Role: delivery service
  Place of processing: USA
- 1&1 Mail & Media GmbH (WEB.DE)
  Task: email mailbox
  Role: processor
  Place of processing: Germany
- Stripe Payments Europe, Limited
  Task: payment processing, fraud prevention
  Role: independent controller
  Place of processing: EU (Ireland); transfer to Stripe, Inc., USA
- Apple Inc. / Google LLC (app stores)
  Task: distributing the app
  Role: independent controllers
  Place of processing: as stated by them

Agreements under Art. 28 GDPR are in place with all processors. Within your business, your Employer and – within the limits of Section 7.4 – your colleagues have access to operational data.

We do not sell personal data, do not use it for advertising, and disclose it to authorities only where we are legally required to do so.

14. International transfers

The Service's database is operated in the EU (Ireland). Transfers to the USA take place in the following cases:

- when the website and web dashboard are delivered via Vercel (Section 3.1),
- when confirmation codes are sent via Resend (Section 12.1),
- when push messages are sent via Expo, Apple and Google (Section 10),
- through access by Supabase, Inc. to the infrastructure, for example for support and maintenance,
- by Stripe within the scope of its own responsibility (Section 6).

The European Commission has adopted an adequacy decision for the USA (EU-US Data Privacy Framework, Art. 45 GDPR). It covers recipients certified under this framework; this applies to Vercel, Resend, Apple, Google and Stripe. For recipients without certification, and additionally for the certified ones, we base the transfer on the European Commission's Standard Contractual Clauses (Art. 46(2)(c) GDPR). You can obtain a copy of the safeguards relied upon by contacting blanktrading@web.de.

15. Retention and deletion

We store personal data only for as long as necessary for the respective purpose or as required by statutory retention obligations.

- Website server logs (Vercel): deleted automatically after 1 day at the latest
- Logs of database, authentication and server functions (Supabase): deleted automatically after 7 days
- Database backups: daily backup; each backup is overwritten after 7 days
- Cookies: see Section 4
- Unconfirmed registration: deleted automatically after 24 hours
- Confirmation codes: expire after a short time, at most 24 hours
- Linking code for merging accounts: valid for 15 minutes
- Email logs at the sending provider (Resend): 30 days
- Login account and active sessions: until you sign out (session) or delete your account (account), see Section 15.1
- Push token: until the account is deleted or another account signs in on the device (Section 10)
- Profile within the business: until your Employer removes it or you delete your account (then pseudonymisation, Section 15.1), at the latest until the business is deleted
- Scheduling and communication data, change log: as instructed by your Employer, at the latest until the business is deleted (Section 15.3)
- Records of acceptance of the Terms, the DPA and the Privacy Policy: until the business is deleted
- Stripe identifiers, plan and subscription status: until the business is deleted
- Invoices and accounting records: 8 years (Sec. 147 AO, Sec. 257 HGB)
- Commercial and business letters, including by email: 6 years (Sec. 257 HGB, Sec. 147 AO)
- Other emails to us: until the request has been dealt with
- Bug reports from the app: until handled, at most 12 months
- App data on your device: until sign-out (session) or uninstallation (Section 11)

Statutory retention periods begin at the end of the calendar year in which the record was created. During a retention obligation, the data is restricted from being used for other purposes.

15.1 When you delete your account

You can delete your account yourself at any time: on the web under "Delete account" (quickteam.at/kontoloeschung, after signing in) or in the app settings. Deletion takes effect immediately and for all your positions at once.

Deleted immediately: your login account (email address, password hash, sessions), your push tokens, notifications addressed to you personally together with read markers, your notification settings and open invitations.

Detached from your person: your profiles within the businesses. Your first and last name are replaced with a placeholder, your email address and phone number are removed, the link to your login account is removed, and the status is set to "inactive".

Retained – linked to this profile, which no longer carries your name – is the schedule data in which you were included: shift assignments, vacation entries, availability and preferences, shift-swap and emergency records, poll votes, notes and messages you wrote, and the change log. Your Employer needs this data to keep the schedule traceable and for working-time records. Because your Employer may still be able to attribute these entries to you using its own records, this is pseudonymisation, not anonymisation. Free text you wrote yourself remains unchanged in content; if you want such content removed, please contact your Employer. This data is deleted at the latest together with the business (Section 15.3).

Managers: If you manage a business in which other people are still listed, your account can only be deleted once you have handed over management or removed the other members. Otherwise a business holding other people's data would be left without anyone in charge. If you run the business alone, deleting your account also cancels the Stripe subscription immediately; the business and its data are then deleted in accordance with Section 15.3.

15.2 When your Employer removes you from the business

Managers can pseudonymise a person's profile within the business. This removes the name, email address, phone number and the link to the login account, and deletes the notifications and invitations addressed to that person; otherwise Section 15.1 applies accordingly. Managers can delete invitations that have not yet been accepted entirely. In both cases, your login account remains, because it may be linked to other positions; you can delete it yourself at any time.

15.3 End of the contract and expired trial

- After the contract ends, we make the business's data available for export for 30 days (Section 6(4) of the Terms). We then delete all data of the business, including the employees' profiles, the scheduling and communication data, the change log and the records of acceptance, unless a statutory retention obligation applies.
- If the trial ends without a payment method, the subscription is paused and management of the business is locked. If it is not resumed within 90 days by adding a payment method, we delete the business and its data in the same way as after the end of the contract.
- Employees' login accounts remain, because they may be linked to other businesses; they are deleted when the respective person deletes their account.

15.4 Backups

The database is backed up daily; each backup is overwritten after 7 days. Deleted data is therefore also removed from the backups no later than 7 days after deletion. We use backups solely to restore data after a loss. If we ever had to restore a backup, we would delete again any data whose deletion had been requested or carried out in the meantime.

16. Obligation to provide data

To register a business and for a login account, an email address, a password and – at registration – the name of the business, its country and your first and last name are required; without them we cannot conclude a contract or create an account. There is no statutory obligation to provide this data. In particular, comments, reasons, notes, poll votes, availability, preferences and enabling push messages are voluntary. Whether you have to use the Service as part of your employment depends on your arrangements with your Employer.

17. Your rights

Subject to the statutory conditions, you have the right to

- access the data processed about you (Art. 15 GDPR),
- rectification of inaccurate data (Art. 16 GDPR),
- erasure (Art. 17 GDPR),
- restriction of processing (Art. 18 GDPR),
- data portability (Art. 20 GDPR), and
- withdraw any consent with effect for the future (Art. 7(3) GDPR); the lawfulness of processing carried out before withdrawal remains unaffected.

Please send your request to blanktrading@web.de; for operational data, to your Employer first (Section 2). We answer requests free of charge and within one month. To protect your data, we may ask you to verify your identity, for example by writing from the email address registered with us.

Right to object under Art. 21 GDPR

Where we process your data on the basis of Art. 6(1)(f) GDPR, you have the right to object to this processing at any time on grounds relating to your particular situation. We will then no longer process the data unless we can demonstrate compelling legitimate grounds for the processing which override your interests, rights and freedoms, or the processing serves the establishment, exercise or defence of legal claims. The objection is not subject to any formal requirements and should be sent to blanktrading@web.de.

Complaint to a supervisory authority

You have the right to lodge a complaint with a data-protection supervisory authority (Art. 77 GDPR), in particular in the Member State of your habitual residence, your place of work or the place of the alleged infringement. The authority competent for us is:

Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg (State Commissioner for Data Protection and Freedom of Information of Baden-Württemberg)
Lautenschlagerstraße 20
70173 Stuttgart
Germany

For persons in Austria, this is the Austrian Data Protection Authority (Österreichische Datenschutzbehörde), Barichgasse 40–42, 1030 Vienna.

18. Security

We protect your data through technical and organisational measures, in particular:

- encrypted transmission (TLS) between your device, our servers and our service providers,
- row-level access controls (Row-Level Security) on all tables, which separate each business's data from the others and restrict it by role within a business,
- server-enforced authorisation checks; identifiers sent by the browser or the app are verified against your account on the server,
- storing passwords only as hashes,
- two-factor authentication for administrative access to the database and management consoles,
- least-privilege access; keys with elevated privileges are kept on the server side only,
- daily backups (Section 15.4).

Physical data-centre security, network protection and encryption of stored data are provided by Supabase as our processor. We remain responsible for the processing we carry out ourselves and for selecting suitable service providers. No system is perfectly secure; we review our measures regularly and respond to incidents as required by law.

19. Minors

The Service is intended for use in a work context by persons who may be employed under the applicable law. It is not directed at children. We do not collect age information and do not knowingly create accounts for persons below the statutory minimum age.

20. Changes to this Privacy Policy

We update this Privacy Policy when the Service or the legal situation changes. The version published at quickteam.at/datenschutz with the date stated above applies. In the event of material changes, we ask managers in the dashboard and users in the app to take note of the new version.`;

const TERMS_EN = `GENERAL TERMS AND CONDITIONS FOR THE USE OF QUICKTEAM

Last updated: 13 September 2026

Section 1 — Provider, scope, contracting party, definitions

(1) The provider and the customer's contracting party is BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Germany, represented by its managing director Leo Solomon, registered with the commercial register of the local court of Stuttgart under HRB 795737, VAT ID DE369517679 (the "Provider", "we" or "us").

(2) These Terms govern all contracts for the provision and use of the Software-as-a-Service application "QuickTeam" and the related services (the "Service") between the Provider and the customer. QuickTeam is a staff-scheduling tool provided over the internet as a web application and as an app for iOS and Android. The apps are available insofar as they have been published in the respective app stores.

(3) The Service is directed exclusively at entrepreneurs within the meaning of Section 14 of the German Civil Code (BGB), at legal entities under public law, and at special funds under public law. It is not directed at consumers within the meaning of Section 13 BGB. By registering, the customer confirms that it uses the Service in the exercise of its commercial or independent professional activity.

(4) The customer and sole contracting party is the business that orders the Service and creates the account (the "Customer"). "Users" are the natural persons — in particular the Customer's staff — whom the Customer invites into the Service and for whom accounts are created or activated. Users use the Service within the scope of the contract concluded by the Customer; the usage obligations under Section 7 apply to them as well. The Customer is responsible for its Users' compliance with these Terms as for its own conduct.

(5) These Terms apply exclusively. Conflicting, deviating or supplementary terms and conditions of the Customer do not become part of the contract unless the Provider has expressly consented to their validity in text form. This applies even where the Provider renders the Service without reservation while aware of such terms.

Section 2 — Subject matter and description of services

(1) For the term of the contract, the Provider makes the Service available to the Customer for use over the internet in its then-current version. The Customer does not acquire ownership of the software; it is made available for use on a time-limited basis. The provisions of tenancy law (Sections 535 et seq. BGB) apply on a supplementary basis unless these Terms provide otherwise.

(2) The scope of functions results from the service description on the Provider's website valid at the time the contract is concluded and from the selected plan. It includes, in particular, management of employees and roles, shift and staff scheduling including automatically generated schedule proposals, management of availability, preferences, vacation and absences, shift swaps, emergency cover, in-team messages with polls and checklists, and notifications.

(3) The Provider is entitled to further develop, adapt and improve the Service and to change or replace individual functions, provided that the contractually agreed core benefit for the Customer is preserved and the Customer is not unreasonably disadvantaged. Material restrictions of the scope of services are governed by Section 13.

(4) The point of delivery for the Provider's services is the router exit of the data center used by the Provider. The Customer is responsible for the connection between that point and the Users' devices, for the devices themselves, and for a suitable internet connection.

(5) Push notifications are delivered only in the apps for iOS and Android. Their delivery depends on the services of the platform operators (in particular Apple and Google) and on the Users' device and app settings. The Provider owes the handover of the notification to these services, not its delivery at a particular time.

(6) The plans differ in particular in the maximum number of employees the Customer may manage in the Service; deactivated and removed employees do not count. The limits result from the service description (paragraph 2). If the Customer exceeds the limit of its plan other than temporarily, the Provider may request in text form that the Customer switch to a suitable plan. If the Customer neither switches within four (4) weeks of receipt of the request nor reduces the number to the limit of its plan, the Provider may terminate the contract as of the end of the then-current billing period. No retroactive charges are made for past periods.

(7) Each contract covers one business at one location. For several locations or a number of employees above the limit of the largest plan, individual conditions may be agreed; these take precedence over the Terms (Section 14(1)).

Section 3 — Registration, conclusion of contract, accounts

(1) Use requires registration. The Customer must provide the requested information truthfully and completely and keep it up to date.

(2) The presentation of the Service on the website does not constitute a binding offer. By submitting the registration, the Customer makes a binding offer to conclude a usage contract on the basis of these Terms. The contract is concluded when the Provider, after the email address has been confirmed, creates the Customer's business in the Service.

(3) The person who registers on behalf of the Customer warrants that they are authorized to represent the Customer. The same applies to Users who make declarations on behalf of the Customer within the Service, in particular consents under Section 13 or declarations concerning the subscription.

(4) The Customer administers its Users' accounts and permissions on its own responsibility. It must keep access credentials confidential, protect them from third-party access, and notify the Provider without undue delay if there are indications of misuse. The Customer is responsible for all activity carried out via its accounts and those of its Users, to the extent it is responsible for such activity.

Section 4 — Availability, maintenance, support, data backup

(1) The Provider endeavors to achieve the highest possible availability of the Service at the point of delivery but does not owe any specific availability quota. Periods of announced maintenance, periods of unavailability due to force majeure (Section 11), and disruptions outside the Provider's sphere of influence — in particular disruptions of the internet or of telecommunications networks beyond the point of delivery, and disruptions of the devices of the Customer or its Users — do not count as a restriction of availability.

(2) Maintenance is carried out, where possible, outside usual business hours and, where it may cause more than insignificant impairment, announced with reasonable notice. The Provider may carry out urgent maintenance and security measures at any time without prior notice.

(3) The Provider offers support in German and English by email. Requests are handled within a reasonable period; the Provider owes specific response times only where they are stated in the service description or individually agreed.

(4) The Provider backs up the Customer's data regularly, at least daily, in accordance with the state of the art. Details, in particular the retention period of the backups, are set out in Annex 2 of the data-processing agreement (Section 7(3)).

Section 5 — Prices, trial period and payment terms

(1) Use of the Service by the Customer is subject to a charge after the free trial period (paragraph 2) has ended. Only the Customer (the business owner) is a contracting and paying party; the Users invited by the Customer (in particular its staff) pay nothing to use the Service. The prices of the selected plan valid at the time the plan is chosen apply, in accordance with the then-current price list on the Provider's website. All prices are exclusive of the applicable statutory value-added tax.

(2) Where the Provider offers a free trial period, it begins when the plan is chosen following registration; its duration results from the offer at that time. No fee is charged during the trial period. The end of the trial period and the amount of the first charge are shown to the Customer before it stores a means of payment.

(3) If the Customer stores a means of payment during the trial period, the contract converts into the paid subscription of the selected plan when the trial period ends, without any further declaration. If it does not, the subscription is suspended free of charge when the trial period ends; the Provider is entitled to block the management functions of the Service for that time. The Customer may resume the subscription within ninety (90) days of the end of the trial period by storing a means of payment; the paid subscription then begins when the means of payment is stored. If this does not happen, the contract ends upon expiry of this period without the need for termination. By way of derogation from Section 6(4), the Customer's data is in this case deleted when the contract ends; the Customer may request the export (Section 6(4)) until then.

(4) The subscription is billed monthly; the fee is due in advance for the respective billing month. The Provider may additionally offer billing periods of longer duration (e.g. annual billing); in that case the fee is due in advance for the selected period.

(5) Payment is made cashless via the payment service provider Stripe (Stripe Payments Europe, Limited). For this purpose the Customer stores a valid means of payment and authorizes the Provider to collect the fee due at the beginning of the respective billing period via Stripe. Stripe's terms apply in addition to the processing of payments. The Provider issues invoices in electronic form, for example as a PDF by email or in the payment service provider's customer portal; the Customer agrees to this. The Customer provides the Provider with the information required for a proper invoice, in particular its company name and address and, if it is established outside Germany, its VAT identification number.

(6) If collection of a fee due fails, collection is attempted again within the following fourteen (14) days and the Customer is informed. The Provider is entitled to restrict the management functions of the Service until payment is received. If the fee has not been paid fourteen (14) days after it fell due, the contract ends upon expiry of the last paid billing period without the need for termination; no fee is owed for the unpaid billing period. If a payment already made is subsequently reversed (e.g. by objecting to a direct debit), the fee for the billing period concerned remains owed; the Customer bears the resulting bank charges insofar as it is responsible for the reversal.

(7) The Provider is entitled to adjust the prices for future billing periods. It communicates a price change in text form at least six (6) weeks before it takes effect. The changed prices apply from the first billing period that begins after this notice period has expired; the price does not change for billing periods already paid. Until the change takes effect, the Customer may terminate the contract at any time under Section 6(2) as of the end of the current billing period; the notice points this out.

(8) The Customer may set off against the Provider's claims only with undisputed or legally established counterclaims. The Customer may exercise a right of retention only where its counterclaim is based on the same contractual relationship.

Section 6 — Term and termination

(1) After the trial period, a contract for a monthly-billed subscription has a term of one (1) month and renews automatically for one further month at a time for as long as it is not terminated. Where the Provider offers a billing period of longer duration (e.g. annual) and the Customer selects it, the term equals the selected period and renews for the same period each time.

(2) The Customer may terminate the contract — including during the trial period — at any time with effect from the end of the current, already-paid billing period or from the end of the trial period. Termination may be declared via the function provided for this purpose in the web dashboard (the payment service provider's customer portal) or in text form to the Provider. If the person acting for the Customer deletes their account while no one else is listed in the business, this is deemed termination with immediate effect. Without termination, the contract ends if the fee for a new billing period is not paid (Section 5(6)) or if the suspended subscription is not resumed (Section 5(3)). Access to the Service ends when the contract ends; paragraph 4 remains unaffected. Fees already paid are not refunded on a pro-rata basis.

(3) Each party's right to extraordinary termination for good cause remains unaffected. Good cause exists for the Provider in particular where the Customer materially breaches essential obligations under these Terms and fails to remedy the breach within a reasonable period despite a warning, or where a reversed payment (Section 5(6)) is not settled within fourteen (14) days despite a request to do so.

(4) During the term of the contract and until thirty (30) days after it ends, the Customer may request that the Provider make its data available in a structured, commonly used and machine-readable format (e.g. CSV or JSON). The request must be sent to the Provider in text form; the Provider makes the data available within thirty (30) days of receipt. Where the Service offers an export function, the Provider may refer the Customer to it. The export is free of charge. After the period under sentence 1 has expired, the Provider deletes the Customer's data, unless statutory retention obligations prevent this; for suspended subscriptions, Section 5(3) applies. The processing of personal data on the Customer's behalf is additionally governed by the data-processing agreement (Section 7(3)).

(5) Exportable within the meaning of paragraph 4 is all data that the Customer and its Users have entered into the Service or that has been generated there for the Customer's business, in particular information on employees and roles, shift templates, planning cycles, shifts and assignments, vacation, availability and preference information, messages including polls and checklists, swap and emergency records, and the change log. Data that serves solely the internal operation and security of the Service is not exported, in particular password hashes, session and security data, push tokens and program code. On this basis, the Customer may request switching to another provider of data processing services, or the transfer of its data to its own systems, under Regulation (EU) 2023/2854 (Data Act); the Provider supports the Customer in doing so and charges no fee for it.

Section 7 — Customer's obligations and responsibility

(1) The Customer uses the Service exclusively within applicable law and these Terms. It ensures that it and its Users do not misuse the Service, in particular do not upload unlawful, offensive or third-party-rights-infringing content, do not attempt unauthorized access, do not disrupt the functioning of the Service, and do not introduce malware.

(2) With respect to the personal data — in particular staff data — entered into the Service by it and its Users, the Customer is the data controller within the meaning of Art. 4(7) GDPR. It is solely responsible for ensuring that a valid legal basis exists for processing such data (in particular under Art. 6 and Art. 88 GDPR in conjunction with the national rules on employee data protection), that data subjects are properly informed, that any required consents or works-council agreements are in place, and that any co-determination rights of a works council (e.g. under Section 87(1) no. 6 of the German Works Constitution Act (BetrVG) or Sections 96, 96a of the Austrian Labour Constitution Act (ArbVG)) are observed.

(3) Insofar as the Provider processes personal data on behalf of the Customer within the Service, the data-processing agreement (DPA) concluded between the parties under Art. 28 GDPR applies, which the Customer concludes with the Provider upon registration. The DPA forms part of the contract and prevails over these Terms in the event of conflicts on data-protection matters.

(4) The Customer shall indemnify the Provider against all third-party claims — including reasonable costs of legal defense — asserted against the Provider on account of unlawful use of the Service by the Customer or its Users, or on account of a breach of the Customer's data-protection or employment-law obligations, to the extent the Customer is responsible for the underlying infringement. The Provider informs the Customer without undue delay of the claims asserted, gives it the opportunity to comment, and does not acknowledge claims without the Customer's consent.

(5) The Service is not an archive for records the Customer is required by law to retain. Data the Customer needs outside the Service — for example for payroll or to meet retention obligations — is backed up by the Customer on its own responsibility, in particular via the export under Section 6(4).

(6) The Service supports staff scheduling; it does not replace the Customer's decisions. The Customer reviews automatically generated schedule proposals and notices from the Service (e.g. on minimum staffing or target hours) before using them. The Customer remains responsible for compliance with working-time, occupational-safety, collective-agreement and other employment-law requirements — for example on maximum working hours, rest periods and deadlines for announcing schedules. The Service is not a system for recording working time. Messages and notifications in the Service do not replace declarations to employees that require a particular form or proof of receipt.

Section 8 — Rights of use and rights to content

(1) For the term of the contract, the Provider grants the Customer a simple, non-exclusive, non-transferable and non-sublicensable right to use the Service, by itself and its Users, within the contractually agreed scope.

(2) The Customer and its Users retain all rights to the content they submit. The Customer grants the Provider the simple right, limited in territory and time to performance of the contract, to store, reproduce, technically process and display such content to authorized Users, insofar as necessary to provide the Service.

(3) The Customer may not reproduce, modify, reverse-engineer, decompile or make available to third parties the software underlying the Service beyond the contractually granted use, unless permitted by law; Section 69e of the German Copyright Act (UrhG) remains unaffected.

Section 9 — Warranty / rights in respect of defects

(1) The Provider warrants that the Service substantially conforms to the applicable service description during the term of the contract. The provisions of tenancy law apply unless these Terms provide otherwise.

(2) The Provider's strict (no-fault) liability under Section 536a(1) first alternative BGB for defects already existing at the time the contract was concluded is excluded. The Provider's liability in this respect is governed by Section 10.

(3) The Provider will remedy defects of the Service within a reasonable period after notification by the Customer. Insignificant impairments of fitness for use do not give rise to any rights in respect of defects. The Customer must report identifiable defects without undue delay in text form.

Section 10 — Liability

(1) The Provider is liable without limitation for damages arising from injury to life, body or health based on an intentional or negligent breach of duty by the Provider, its legal representatives or vicarious agents, and for damages based on intent or gross negligence. The Provider is likewise liable without limitation where it has assumed a guarantee or where mandatory liability applies under the German Product Liability Act.

(2) In the event of a slightly negligent breach of an essential contractual obligation (cardinal obligation), the Provider's liability is limited in amount to the foreseeable damage typical for this type of contract at the time the contract was concluded. Essential contractual obligations are those whose fulfillment makes the proper performance of the contract possible in the first place and on whose observance the Customer may regularly rely.

(3) Any further liability of the Provider is excluded. In particular, in the case of slight negligence the Provider is not liable for the breach of non-essential contractual obligations.

(4) For loss of data, the Provider is liable in accordance with the preceding paragraphs. In the case of slight negligence, liability is limited to the effort required to restore the data from a backup under Section 4(4).

(5) The above limitations of liability also apply in favor of the Provider's legal representatives, employees and vicarious agents.

(6) The Customer's claims for damages become time-barred within one (1) year from the statutory commencement of the limitation period. This does not apply in the cases referred to in paragraph 1 or to fraudulently concealed defects.

Section 11 — Force majeure

The Provider is not liable for non-performance or delay in its services to the extent this results from events of force majeure. Force majeure means all circumstances beyond the Provider's reasonable control for which it is not responsible, in particular natural disasters, epidemics and pandemics, war, terrorism, labor disputes, official measures, and large-scale failures of power or telecommunications networks. Failures of service providers used by the Provider to provide the Service count as force majeure only if they are themselves caused by such an event. For the duration of the event, the affected performance obligations are suspended.

Section 12 — Confidentiality

The parties undertake to keep confidential all confidential information of the other party obtained in the course of the contractual relationship and to use it only for the purposes of performing the contract. This obligation continues after termination of the contract. Excluded is information that is publicly known, that the receiving party lawfully obtained from third parties, or that must be disclosed pursuant to a statutory or official order.

Section 13 — Changes to these Terms and to the scope of services

(1) The Provider may offer the Customer changes to these Terms and material changes to the scope of services with effect for the future. It sends the offer in text form at least six (6) weeks before the intended effective date, identifies the changes, and makes the amended version available.

(2) A change becomes effective for the Customer when the Customer consents to it. Consent may be given in text form or by confirmation within the Service. Silence does not constitute consent.

(3) As long as the Customer has not consented, the previous terms apply to it. If it has not consented by the intended effective date, the Provider may terminate the contract as of the end of the billing period in which that date falls, or as of the end of a later billing period; the offer points out this consequence. The Customer's right to terminate under Section 6(2) remains unaffected.

(4) Changes that operate exclusively in the Customer's favor, and the further development of the Service under Section 2(3), do not require consent. Price changes are governed by Section 5(7).

Section 14 — Final provisions

(1) Individual agreements between the parties take precedence over these Terms (Section 305b BGB). Otherwise, amendments and supplements to this contract must be made in text form, unless these Terms provide otherwise.

(2) The Customer may transfer rights and obligations under this contract to third parties only with the Provider's prior consent. The Provider is entitled to transfer its rights and obligations under this contract, in whole or in part, to an affiliated company or in the context of a business succession; in this case the Customer is entitled to extraordinary termination if continuation with the new contracting party is unreasonable for it.

(3) The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods (CISG) and the conflict-of-law rules of private international law.

(4) The exclusive place of jurisdiction for all disputes arising out of or in connection with this contract is the Provider's registered seat, provided the Customer is a merchant, a legal entity under public law, or a special fund under public law, or has no general place of jurisdiction in Germany. The Provider is also entitled to bring proceedings at the Customer's general place of jurisdiction.

(5) Should individual provisions of these Terms be or become wholly or partially invalid or unenforceable, the validity of the remaining provisions remains unaffected. The statutory provision applies in place of the invalid or unenforceable provision.

(6) These Terms are available in German and English. Only the German version is authoritative and legally binding; the English version is for information only.

Section 15 — Contact

Provider: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Germany. Phone number and further details: see the legal notice (Impressum).
Questions about these Terms and declarations in text form (e.g. termination or export requests): blanktrading@web.de.`;

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

Stand: 13. September 2026

Diese Datenschutzerklärung informiert Sie nach Art. 13 und 14 der Datenschutz-Grundverordnung (DSGVO) darüber, wie die BlankTrading UG (haftungsbeschränkt) (nachfolgend „wir“ oder „uns“) personenbezogene Daten verarbeitet, wenn Sie

- unsere Website quickteam.at besuchen,
- als Inhaberin oder Inhaber eines Betriebs QuickTeam registrieren und buchen oder
- QuickTeam im Web-Dashboard oder in der QuickTeam-App für iOS und Android nutzen, sei es als Führungskraft oder als Beschäftigte oder Beschäftigter eines Betriebs.

Website, Web-Dashboard und App bilden zusammen den Dienst „QuickTeam“ (der „Dienst“). Wo sich die Verarbeitung zwischen Website und App unterscheidet, ist das ausdrücklich angegeben.

1. Verantwortlicher und Kontakt

BlankTrading UG (haftungsbeschränkt)
Gabriele-Münter-Straße 31
73760 Ostfildern
Deutschland
Vertreten durch den Geschäftsführer Leo Solomon
Handelsregister: Amtsgericht Stuttgart, HRB 795737
E-Mail: blanktrading@web.de
Telefon: +43 664 2538798

Datenschutzkontakt: blanktrading@web.de. An diese Adresse richten Sie bitte auch alle Anfragen zur Ausübung Ihrer Rechte (Ziffer 17).

Datenschutzbeauftragter: Wir sind zur Benennung eines Datenschutzbeauftragten nicht verpflichtet (Art. 37 DSGVO, § 38 Abs. 1 BDSG) und haben keinen benannt. Datenschutzanfragen bearbeitet die Geschäftsführung selbst.

2. Wer für welche Daten verantwortlich ist

QuickTeam ist ein Werkzeug zur Schicht- und Personaleinsatzplanung, das Betriebe (jeweils der „Arbeitgeber“) für ihre Teams nutzen. Für die Daten, die dabei entstehen, gibt es zwei Verantwortliche:

- Besuch der Website, Cookies (Ziffern 3 und 4)
  Verantwortlich: wir
  Unsere Rolle: Verantwortlicher
- Registrierung, Vertrag und Zahlung eines Betriebs (Ziffern 5 und 6)
  Verantwortlich: wir
  Unsere Rolle: Verantwortlicher
- Ihr Anmeldekonto, Sitzungen, Push-Zustellung, E-Mail-Kontakt, Fehlermeldungen (Ziffern 7.1, 10, 11, 12)
  Verantwortlich: wir
  Unsere Rolle: Verantwortlicher
- Betriebliche Daten: Ihr Profil im Betrieb, Schichten, Verfügbarkeiten, Vorlieben, Urlaub, Schichttausch, Notfälle, Mitteilungen, Umfragen, Änderungsprotokoll (Ziffern 7.2 bis 9)
  Verantwortlich: Ihr Arbeitgeber
  Unsere Rolle: Auftragsverarbeiter (Art. 28 DSGVO)

Betriebliche Daten. Ihr Arbeitgeber entscheidet, welche Daten er in QuickTeam über Sie erfasst, wer im Betrieb welche Angaben sehen darf und wann Daten gelöscht werden. Wir verarbeiten diese Daten nur nach seinen Weisungen auf Grundlage eines Auftragsverarbeitungsvertrags. Ihr Arbeitgeber ist verpflichtet, Sie selbst über diese Verarbeitung zu informieren; die Ziffern 7.2 bis 9 beschreiben, was der Dienst dabei technisch tut, ersetzen diese Information aber nicht. Anfragen zu betrieblichen Daten richten Sie bitte zuerst an Ihren Arbeitgeber. Erreicht eine solche Anfrage uns, leiten wir sie unverzüglich an ihn weiter und unterstützen ihn bei der Beantwortung.

Herkunft der Daten (Art. 14 DSGVO). Beschäftigte werden in der Regel von ihrem Arbeitgeber angelegt. Name, E-Mail-Adresse, gegebenenfalls Telefonnummer, Rolle(n) und Anstellungsangaben (etwa Vertragsart, Sollstunden, Urlaubsanspruch) stammen deshalb zunächst von Ihrem Arbeitgeber und nicht von Ihnen. Alle weiteren Daten entstehen, wenn Sie oder andere Mitglieder Ihres Betriebs den Dienst nutzen.

Wenn Sie unsicher sind, an wen Sie sich wenden sollen, schreiben Sie uns. Wir helfen Ihnen weiter oder leiten Ihre Anfrage an die richtige Stelle.

3. Besuch der Website

3.1 Hosting und Server-Protokolle

Website und Web-Dashboard werden von Vercel Inc., USA, gehostet und ausgeliefert. Bei jedem Seitenaufruf verarbeitet Vercel die technisch notwendigen Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Adresse, Referrer, übertragene Datenmenge, HTTP-Statuscode sowie Browser- und Betriebssystemangaben (User-Agent).

- Zweck: Auslieferung der Seiten, Stabilität, Abwehr von Angriffen und Fehleranalyse.
- Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse liegt in einer sicheren und funktionsfähigen Bereitstellung der Website.
- Speicherdauer: Die Protokolle der Server-Funktionen löscht Vercel automatisch nach spätestens einem Tag. Eigene Zugriffsprotokolle legen wir nicht an, und wir führen diese Daten nicht mit anderen Daten zusammen.
- Empfänger: Vercel handelt als unser Auftragsverarbeiter. Vercel liefert Inhalte über ein weltweites Servernetz aus; eine Verarbeitung in den USA ist dabei nicht ausgeschlossen (Ziffer 14).

3.2 Keine Analyse, keine Werbung, keine eingebundenen Drittinhalte

Wir setzen keine Analyse-, Tracking- oder Werbedienste ein und binden keine Social-Media-Plugins, Karten oder Videos Dritter ein. Schriftarten werden von unserem eigenen Server ausgeliefert; beim Seitenaufruf wird keine Verbindung zu Google Fonts oder anderen Schriftanbietern hergestellt. Die einzige Stelle, an der Inhalte eines Dritten nachgeladen werden, ist das Zahlungsformular (Ziffer 6).

4. Cookies und ähnliche Technologien auf der Website

Wir verwenden ausschließlich Cookies, die für den von Ihnen genutzten Dienst technisch erforderlich sind:

- qt_sprache
  Zweck: speichert die gewählte Sprache (Deutsch oder Englisch)
  Speicherdauer: 1 Jahr
  Wann gesetzt: nur wenn Sie die Sprache umschalten
- sb-…-auth-token (ggf. in mehrere Teile aufgeteilt)
  Zweck: hält Sie nach der Anmeldung angemeldet; enthält Ihre Sitzungs- und Zugriffskennungen
  Speicherdauer: bis zur Abmeldung, längstens 400 Tage
  Wann gesetzt: bei der Anmeldung
- qt_position
  Zweck: merkt sich, mit welcher Ihrer Anstellungen Sie im Dashboard arbeiten, wenn Ihr Konto mehreren Betrieben oder Positionen zugeordnet ist
  Speicherdauer: 1 Jahr; wird beim Abmelden gelöscht
  Wann gesetzt: bei der Auswahl einer Position
- qt_registrierung
  Zweck: hält während der Registrierung Betriebsname, Land sowie Vor- und Nachname bereit, bis der Bestätigungscode eingegeben ist; nur auf der Registrierungsseite lesbar
  Speicherdauer: 24 Stunden; wird nach der Bestätigung gelöscht
  Wann gesetzt: bei der Registrierung
- __stripe_mid, __stripe_sid
  Zweck: Betrugsprävention bei der Zahlung (Stripe)
  Speicherdauer: 1 Jahr bzw. 30 Minuten
  Wann gesetzt: nur auf den Seiten mit Zahlungsformular (Ziffer 6)

Rechtsgrundlage: Das Speichern und Auslesen dieser Cookies ist unbedingt erforderlich, damit wir den von Ihnen ausdrücklich gewünschten Dienst bereitstellen können (§ 25 Abs. 2 Nr. 2 TDDDG; in Österreich § 165 Abs. 3 TKG 2021). Eine Einwilligung ist dafür nicht erforderlich. Die damit verbundene Verarbeitung personenbezogener Daten stützt sich auf Art. 6 Abs. 1 lit. b DSGVO (Nutzung des Dienstes) bzw. Art. 6 Abs. 1 lit. f DSGVO (Sicherheit, Sprachwahl, Betrugsprävention).

Weil wir keine Cookies zu Analyse- oder Werbezwecken einsetzen, zeigen wir kein Cookie-Banner. Sie können Cookies in den Einstellungen Ihres Browsers löschen oder blockieren; ohne die Anmelde-Cookies ist eine Anmeldung jedoch nicht möglich.

5. Registrierung eines Betriebs

5.1 Welche Daten wir erheben

Zur Registrierung eines Betriebs erheben wir: Name des Betriebs, Land (Deutschland oder Österreich), Ihren Vor- und Nachnamen, Ihre E-Mail-Adresse und ein Passwort. Das Passwort wird verschlüsselt (TLS) an unseren Server übertragen, der es unmittelbar an unseren Authentifizierungsdienst weiterreicht; das gilt ebenso bei jeder Anmeldung und beim Zurücksetzen des Passworts. Wir protokollieren das Passwort nicht und speichern es nicht. Dauerhaft gespeichert wird ausschließlich ein kryptografischer Hashwert, aus dem sich das Passwort nicht zurückrechnen lässt.

Zur Bestätigung Ihrer E-Mail-Adresse senden wir Ihnen einen achtstelligen Code (Ziffer 12.1). Erst nach Eingabe des Codes wird der Betrieb angelegt und Ihr Konto als Führungskraft („Chef“) mit ihm verknüpft. Bis dahin liegen die Angaben zum Betrieb bei Ihrem noch unbestätigten Konto.

Unbestätigte Registrierungen werden automatisch gelöscht. Wird der Code nicht innerhalb von 24 Stunden eingegeben, löscht ein stündlich laufender Vorgang das Konto samt der dazu gespeicherten Angaben.

5.2 Nachweis der Zustimmung zu AGB, AVV und Datenschutzerklärung

Bei der Registrierung bestätigen Sie die Allgemeinen Geschäftsbedingungen und den Auftragsverarbeitungsvertrag (AVV) für Ihren Betrieb und nehmen diese Datenschutzerklärung zur Kenntnis. Ändert sich eines dieser Dokumente, bitten wir Führungskräfte im Dashboard erneut um Bestätigung. Als Nachweis speichern wir je Dokument: Bezeichnung, Fassung (Datum des Stands), Zeitpunkt, Kennung Ihres Kontos und des Betriebs sowie gegebenenfalls die Sprache der bestätigten Fassung. Diese Einträge können nachträglich nicht geändert werden.

5.3 Zwecke und Rechtsgrundlagen

- Anlage und Verwaltung des Kundenkontos, Vertragsschluss: Art. 6 Abs. 1 lit. b DSGVO, soweit Sie selbst Vertragspartner sind (etwa als Einzelunternehmer). Handeln Sie für ein Unternehmen, etwa als Geschäftsführer, stützen wir die Verarbeitung Ihrer Daten auf Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse liegt in der Durchführung des Vertrags mit dem von Ihnen vertretenen Unternehmen.
- Bestätigung der E-Mail-Adresse: Art. 6 Abs. 1 lit. f DSGVO (Schutz vor Konten mit fremden oder falschen Adressen).
- Zustimmungsnachweis: Art. 6 Abs. 1 lit. f DSGVO (Nachweis des Vertragsschlusses und der Einbeziehung der Vertragsbedingungen).

6. Zahlungsabwicklung mit Stripe

Nach der Registrierung wählen Sie einen Tarif. Das Abonnement beginnt mit einer 14-tägigen Testphase, auch wenn Sie noch kein Zahlungsmittel hinterlegen. Ein Zahlungsmittel können Sie sofort oder bis zum Ende der Testphase hinterlegen; läuft sie ohne Zahlungsmittel ab, wird das Abonnement pausiert (zu den Folgen für Ihre Daten siehe Ziffer 15.3).

- An Stripe übermitteln wir: Ihre E-Mail-Adresse, eine interne Kennung Ihres Betriebs und den gewählten Tarif.
- Zahlungsdaten (etwa Kartendaten oder IBAN für SEPA-Lastschrift) geben Sie direkt in das Formular von Stripe ein, das auf unserer Seite eingebettet ist und von Servern der Stripe geladen wird. Diese Daten gehen unmittelbar an Stripe; vollständige Kartennummern oder Kontoverbindungen erhalten und speichern wir nicht.
- Bei uns gespeichert werden: die Stripe-Kundenkennung, die Kennung des Abonnements, der Tarif und der Status des Abonnements (etwa Testphase, aktiv, pausiert). Stripe teilt uns Änderungen des Status automatisch mit.
- Kundenportal: Über „Abo verwalten“ in den Einstellungen des Dashboards gelangen Führungskräfte zum Kundenportal von Stripe. Dort können Sie das Abonnement kündigen, das Zahlungsmittel ändern und Rechnungen abrufen. Das Portal wird von Stripe betrieben; wir übermitteln dafür nur Ihre Stripe-Kundenkennung und die Adresse, zu der Sie danach zurückkehren.
- Betrugsprävention: Auf den Seiten mit Zahlungsformular erhebt Stripe Geräte- und Nutzungsdaten (z. B. IP-Adresse, Browser-Merkmale, Interaktionen mit dem Formular) und setzt dafür die in Ziffer 4 genannten Cookies, um betrügerische Zahlungen zu erkennen.

Verantwortlichkeit: Die Zahlungsabwicklung übernimmt Stripe Payments Europe, Limited, Irland. Stripe verarbeitet die Zahlungs- und Abrechnungsdaten als eigenständig Verantwortlicher, insbesondere zur Durchführung der Zahlung, zur Betrugsprävention und zur Erfüllung eigener gesetzlicher Pflichten (etwa zur Geldwäscheprävention). Einzelheiten finden Sie in der Datenschutzerklärung von Stripe unter stripe.com/privacy. Stripe übermittelt Daten auch an die Stripe, Inc. in den USA (Ziffer 14).

Rechtsgrundlagen: Art. 6 Abs. 1 lit. b DSGVO bzw. lit. f DSGVO (siehe Ziffer 5.3) für die Abwicklung des Abonnements; Art. 6 Abs. 1 lit. f DSGVO für die Betrugsprävention; Art. 6 Abs. 1 lit. c DSGVO für die Aufbewahrung von Rechnungs- und Buchungsunterlagen.

Beschäftigte zahlen nichts und geben keine Zahlungsdaten an.

7. Nutzung von Web-Dashboard und App

7.1 Ihr Anmeldekonto (wir sind Verantwortlicher)

Für jedes Konto verarbeiten wir: E-Mail-Adresse, Passwort-Hashwert, Kontokennung, Zeitpunkte von Anlage, Bestätigung und letzter Anmeldung sowie die von Ihnen gewählte Sprache. Für jede aktive Anmeldesitzung speichert unser Authentifizierungsdienst zusätzlich IP-Adresse und Browser- bzw. Gerätekennung (User-Agent), bis Sie sich abmelden oder Ihr Konto löschen.

Ein Konto kann mehreren Anstellungen zugeordnet sein, etwa wenn Sie in zwei Betrieben arbeiten. In der App können Sie zwei eigene Anmeldekonten zusammenführen; der dafür erzeugte Verknüpfungscode ist 15 Minuten gültig.

Beschäftigte legen ihr Konto in der App mit E-Mail-Adresse und Passwort an und bestätigen es mit einem Code. Die Einladung ihres Arbeitgebers wird dem Konto über die E-Mail-Adresse zugeordnet, die der Arbeitgeber hinterlegt hat; wir versenden selbst keine Einladungs-E-Mails. Mit diesem Konto können Sie sich auch im Web-Dashboard anmelden.

Zwecke und Rechtsgrundlagen: Bereitstellung eines persönlichen, geschützten Zugangs und Absicherung des Dienstes gegen Missbrauch. Für Kundinnen und Kunden Art. 6 Abs. 1 lit. b DSGVO; für Beschäftigte und sonstige eingeladene Personen Art. 6 Abs. 1 lit. f DSGVO. Unser berechtigtes Interesse und das Ihres Arbeitgebers liegen darin, eingeladenen Personen einen sicheren Zugang zu dem Dienst zu geben, den der Arbeitgeber gebucht hat.

7.2 Ihr Profil im Betrieb (Ihr Arbeitgeber ist Verantwortlicher)

Je Anstellung werden verarbeitet: Vor- und Nachname, E-Mail-Adresse, optional Telefonnummer, Stellung im Betrieb (Führungskraft oder Beschäftigte/r), Tätigkeitsrollen (z. B. „Küche“, „Service“), Status (eingeladen, aktiv, pausiert, inaktiv), Vertragsart, Soll- und Höchststunden, zulässige Mehrstunden, Überstundensaldo, Urlaubsanspruch in Tagen und bevorzugte Sprache.

7.3 Planungs- und Kommunikationsdaten (Ihr Arbeitgeber ist Verantwortlicher)

- Schichten und Zuweisungen: Datum, Beginn und Ende, Rolle, Herkunft der Zuweisung (manuell, automatischer Planvorschlag oder Schichttausch) und ein Vermerk, wenn eine Schicht wegen einer Notfallmeldung nicht angetreten wird.
- Verfügbarkeiten und Vorlieben: ob Sie für eine Schicht verfügbar sind, welche Schichten Sie gerne oder ungern übernehmen, auch für einzelne Tage.
- Urlaub: beantragter Zeitraum, Status, Ihr optionaler Kommentar und gegebenenfalls die Begründung der Entscheidung.
- Schichttausch: beteiligte Personen und Schichten, bevorzugte Tage, Status und gegebenenfalls ein Ablehnungsgrund.
- Notfälle und Vertretungen: betroffene Schicht, optionaler Grund, Status und die Person, die die Vertretung übernimmt.
- Mitteilungen: Ankündigungen, Umfragen und Checklisten Ihres Betriebs samt Ihrer Stimme, erledigter Aufgaben und des Zeitpunkts, zu dem Sie eine Mitteilung gelesen haben; Notizen zu Schichten; Systemmeldungen (etwa „Schicht geändert“). Bei Umfragen, die als anonym gekennzeichnet sind, wird Ihre Stimme den anderen Mitgliedern nicht namentlich angezeigt; gespeichert wird sie dennoch zusammen mit Ihrem Profil, damit jede Person nur einmal abstimmen kann.
- Änderungsprotokoll: Jede Änderung an Schichten und Zuweisungen wird mit Zeitpunkt, dem ausführenden Konto sowie dem Stand vor und nach der Änderung protokolliert. Das Protokoll können nur Führungskräfte des Betriebs einsehen; es dient der Nachvollziehbarkeit des Dienstplans.
- Planungszeiträume einschließlich Fristen und des Zeitpunkts, zu dem ein automatischer Planvorschlag erstellt wurde (Ziffer 9).

7.4 Wer im Betrieb welche Angaben sieht

- Führungskräfte Ihres Betriebs sehen alle betrieblichen Daten des Betriebs.
- Beschäftigte sehen ihre eigenen Daten. Namen und Schichten von Kolleginnen und Kollegen sind nur sichtbar, soweit Ihr Arbeitgeber das in den Einstellungen des Betriebs freigegeben hat. Mitteilungen, Umfragen, offene Schichten und Vertretungsgesuche richten sich an das Team oder an die dafür in Frage kommenden Personen.
- Urlaubsanträge sehen nur Sie und die Führungskräfte.
- Notfallmeldungen einschließlich des optionalen Grundes sind für die Mitglieder Ihres Betriebs einsehbar (siehe Ziffer 8).

7.5 Zwecke und Rechtsgrundlagen der betrieblichen Verarbeitung

Die Verarbeitung dient der Planung und Organisation der Arbeit im Betrieb: Dienstplanung, Berücksichtigung von Verfügbarkeiten und Wünschen, Urlaubsverwaltung, Schichttausch, Notfallvertretung und teaminterne Kommunikation. Die Rechtsgrundlage bestimmt Ihr Arbeitgeber als Verantwortlicher. In Betracht kommen insbesondere Art. 6 Abs. 1 lit. b DSGVO in Verbindung mit Art. 88 DSGVO und den nationalen Vorschriften zum Beschäftigtendatenschutz (in Deutschland § 26 BDSG), soweit die Verarbeitung für das Beschäftigungsverhältnis erforderlich ist; Art. 6 Abs. 1 lit. c DSGVO, soweit Ihr Arbeitgeber den Dienstplan für arbeitszeitrechtliche Aufzeichnungspflichten nutzt; und Art. 6 Abs. 1 lit. f DSGVO für organisatorische Funktionen wie Umfragen und Ankündigungen. Wir verarbeiten diese Daten als Auftragsverarbeiter nach Art. 28 DSGVO.

8. Freitexte und Gesundheitsdaten

Mehrere Funktionen enthalten freiwillige Freitextfelder: den Grund einer Notfallmeldung, den Kommentar zu einem Urlaubsantrag, Notizen zu Schichten sowie Mitteilungen. Wir werten Freitexte nicht aus.

Bitte machen Sie dort keine Angaben zu Ihrer Gesundheit. Schon ein Grund wie „krank“ ist ein Gesundheitsdatum und damit eine besondere Kategorie personenbezogener Daten (Art. 9 DSGVO). Sie sind nicht verpflichtet, im Dienst einen Grund anzugeben. Der Grund einer Notfallmeldung ist für die Mitglieder Ihres Betriebs einsehbar. Wie Sie eine Arbeitsunfähigkeit melden, richtet sich nach den Regeln Ihres Arbeitsverhältnisses, nicht nach QuickTeam.

Machen Sie dennoch eine solche Angabe, verarbeitet Ihr Arbeitgeber sie als Verantwortlicher. Rechtsgrundlage ist dann Art. 9 Abs. 2 lit. b DSGVO in Verbindung mit den Vorschriften des Beschäftigtendatenschutzes (in Deutschland § 26 Abs. 3 BDSG).

9. Automatisch erstellte Planvorschläge

Führungskräfte können für einen Planungszeitraum einen Dienstplanvorschlag automatisch erstellen lassen. Das Verfahren berücksichtigt den Personalbedarf je Schicht und Rolle, die Tätigkeitsrollen der Beschäftigten, Verfügbarkeiten, Schichtvorlieben, genehmigten Urlaub, Soll- und Höchststunden, bereits bestehende Zuweisungen sowie gesetzliche Ruhe- und Höchstarbeitszeiten.

- Die Berechnung läuft auf unserer eigenen Infrastruktur bei Supabase in der EU. Es werden keine Daten an Dritte oder an KI-Dienste übermittelt.
- Das Ergebnis ist ein Vorschlag. Eine Führungskraft prüft ihn, kann ihn ändern oder verwerfen und macht ihn erst durch Veröffentlichung verbindlich.
- Das Verfahren bewertet weder Ihre Leistung noch Ihr Verhalten und trifft keine Vorhersagen über Sie.

Eine ausschließlich auf automatisierter Verarbeitung beruhende Entscheidung, die Ihnen gegenüber rechtliche Wirkung entfaltet oder Sie in ähnlicher Weise erheblich beeinträchtigt (Art. 22 DSGVO), findet damit nicht statt.

10. Benachrichtigungen und Push-Nachrichten

Benachrichtigungen im Dienst. Mitteilungen und Systemmeldungen (etwa zu geänderten Schichten, Tauschanfragen, offenen Schichten oder entschiedenen Urlaubsanträgen) werden in unserer Datenbank gespeichert und im Web-Dashboard sowie in der App angezeigt. Das Web-Dashboard versendet keine Push-Nachrichten.

Push-Nachrichten (nur App). Push-Nachrichten erhalten Sie nur, wenn Sie sie auf Ihrem Gerät erlauben.

- Erlauben Sie Push-Nachrichten, ruft die App einen gerätebezogenen Push-Token ab. Wir speichern ihn zusammen mit Ihrer Kontokennung, der Plattform (iOS oder Android) und dem Zeitpunkt der letzten Aktualisierung.
- Für jede an Sie gerichtete Benachrichtigung übermittelt unser Server an den Push-Dienst von Expo (650 Industries, Inc., USA): den Push-Token, einen Titel, einen Text und technische Angaben (Art der Benachrichtigung sowie interne Kennungen der Benachrichtigung und des Betriebs). Bei Ankündigungen und Umfragen werden Titel und Text, die die verfassende Person geschrieben hat, vollständig übermittelt; bei Systemmeldungen ist es ein Standardtext wie „Eine deiner Schichten wurde geändert.“
- Expo leitet die Nachricht an den Apple Push Notification service (Apple Inc., USA) bzw. an Firebase Cloud Messaging (Google LLC, USA) weiter, die sie auf Ihr Gerät zustellen.
- Einzelne Benachrichtigungsarten können Sie in den Einstellungen der App abschalten, Push-Nachrichten insgesamt in den Systemeinstellungen Ihres Geräts.
- Rechtsgrundlage: Für den Zugriff auf den Push-Token Ihre Einwilligung über den Systemdialog Ihres Geräts (§ 25 Abs. 1 TDDDG bzw. § 165 Abs. 3 TKG 2021, Art. 6 Abs. 1 lit. a DSGVO), die Sie jederzeit in den Systemeinstellungen widerrufen können; für die Zustellung Art. 6 Abs. 1 lit. f DSGVO (zeitnahe Information über Ihre Schichten und Ihr Team). Zur Übermittlung in die USA siehe Ziffer 14.
- Speicherdauer: Der Push-Token wird gelöscht, wenn Sie Ihr Konto löschen. Meldet sich auf demselben Gerät ein anderes Konto an, wird der Token diesem Konto zugeordnet. Ein Abmelden allein entfernt den Token derzeit nicht; wenn Sie nach dem Abmelden keine Push-Nachrichten mehr erhalten möchten, schalten Sie diese bitte in den Systemeinstellungen ab.

Lokale Erinnerungen. Auf Wunsch plant die App Schichterinnerungen ausschließlich auf Ihrem Gerät. Sie werden ohne Netzwerkverbindung ausgelöst; dabei werden keine Daten an uns oder Dritte übermittelt.

11. Speicherung auf Ihrem Gerät (App)

Die App speichert auf Ihrem Gerät: Ihre Anmeldesitzung (Zugriffs- und Erneuerungskennungen), einen Zwischenspeicher zuletzt geladener Daten für die Anzeige ohne Netzverbindung (etwa Kalenderdaten), die gewählte Sprache und Darstellung (hell/dunkel), einen Vermerk, welche Mitteilungen bereits angezeigt wurden, sowie die bestätigte Fassung der Rechtstexte.

Diese Daten bleiben auf Ihrem Gerät. Das Speichern ist für die von Ihnen genutzten Funktionen unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG bzw. § 165 Abs. 3 TKG 2021; Art. 6 Abs. 1 lit. b bzw. f DSGVO). Die Anmeldesitzung wird beim Abmelden entfernt; die übrigen Daten bleiben bis zur Deinstallation der App oder bis Sie die App-Daten in den Einstellungen Ihres Geräts löschen.

App-Stores. Beim Herunterladen und Aktualisieren der App verarbeiten Apple (App Store) und Google (Google Play) Daten in eigener Verantwortung nach ihren eigenen Datenschutzbestimmungen. Von den Stores erhalten wir nur zusammengefasste Statistiken, keine Angaben zu einzelnen Personen.

12. E-Mail

12.1 E-Mails, die wir versenden

Wir versenden ausschließlich E-Mails, die für Ihr Konto erforderlich sind: Bestätigungscodes bei der Registrierung, beim Zurücksetzen des Passworts und bei der Änderung Ihrer E-Mail-Adresse. Newsletter oder Werbe-E-Mails versenden wir nicht.

Der Versand läuft über Resend, Inc., USA, als unseren Auftragsverarbeiter. Resend verarbeitet Ihre E-Mail-Adresse, den Inhalt der Nachricht (einschließlich des Codes) und Zustellprotokolle, speichert diese Daten in den USA und löscht sie nach 30 Tagen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b bzw. f DSGVO (siehe Ziffern 5.3 und 7.1). Bestätigungscodes sind nur kurz gültig, höchstens 24 Stunden.

12.2 Wenn Sie uns schreiben

Schreiben Sie uns eine E-Mail, verarbeiten wir Ihre Adresse, den Inhalt und die Metadaten der Nachricht, um Ihr Anliegen zu bearbeiten. Unser Postfach wird von der 1&1 Mail & Media GmbH (WEB.DE), Deutschland, betrieben. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO, soweit Ihr Anliegen einen Vertrag betrifft, Art. 6 Abs. 1 lit. c DSGVO bei der Ausübung Ihrer Betroffenenrechte und im Übrigen Art. 6 Abs. 1 lit. f DSGVO (Beantwortung von Anfragen). Wir löschen die Nachricht, sobald das Anliegen erledigt ist, es sei denn, sie ist als Handels- oder Geschäftsbrief aufzubewahren (Ziffer 15).

12.3 Fehlermeldungen aus der App

Über die App können Sie uns Fehler melden. Gespeichert werden nur der von Ihnen eingegebene Text, ein Bearbeitungsstatus und der Zeitpunkt, und zwar ohne Verknüpfung mit Ihrem Konto. Bitte geben Sie in einer Fehlermeldung keine personenbezogenen Daten an, die wir zur Bearbeitung nicht benötigen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (Fehlerbehebung und Verbesserung des Dienstes). Wir löschen Fehlermeldungen, sobald sie bearbeitet sind, spätestens nach 12 Monaten.

13. Empfänger im Überblick

Wir geben personenbezogene Daten nur weiter, soweit dies für den jeweiligen Zweck erforderlich ist:

- Supabase, Inc.
  Aufgabe: Datenbank, Anmeldung, Server-Funktionen, Datensicherung
  Rolle: Auftragsverarbeiter
  Ort der Verarbeitung: EU (Irland); Zugriffe aus den USA möglich
- Vercel Inc.
  Aufgabe: Hosting von Website und Web-Dashboard
  Rolle: Auftragsverarbeiter
  Ort der Verarbeitung: weltweites Servernetz, auch USA
- Resend, Inc.
  Aufgabe: Versand von Bestätigungscodes
  Rolle: Auftragsverarbeiter
  Ort der Verarbeitung: USA
- 650 Industries, Inc. (Expo)
  Aufgabe: Versand von Push-Nachrichten
  Rolle: Auftragsverarbeiter
  Ort der Verarbeitung: USA
- Apple Inc. (APNs)
  Aufgabe: Zustellung von Push-Nachrichten auf iOS
  Rolle: Zustelldienst
  Ort der Verarbeitung: USA
- Google LLC (Firebase Cloud Messaging)
  Aufgabe: Zustellung von Push-Nachrichten auf Android
  Rolle: Zustelldienst
  Ort der Verarbeitung: USA
- 1&1 Mail & Media GmbH (WEB.DE)
  Aufgabe: E-Mail-Postfach
  Rolle: Auftragsverarbeiter
  Ort der Verarbeitung: Deutschland
- Stripe Payments Europe, Limited
  Aufgabe: Zahlungsabwicklung, Betrugsprävention
  Rolle: eigenständig Verantwortlicher
  Ort der Verarbeitung: EU (Irland); Übermittlung an Stripe, Inc., USA
- Apple Inc. / Google LLC (App-Stores)
  Aufgabe: Bereitstellung der App
  Rolle: eigenständig Verantwortliche
  Ort der Verarbeitung: nach eigenen Angaben

Mit allen Auftragsverarbeitern bestehen Verträge nach Art. 28 DSGVO. Innerhalb Ihres Betriebs erhalten Ihr Arbeitgeber und – im Rahmen von Ziffer 7.4 – Ihre Kolleginnen und Kollegen Zugriff auf betriebliche Daten.

Wir verkaufen keine personenbezogenen Daten, nutzen sie nicht für Werbung und geben sie an Behörden nur weiter, wenn wir gesetzlich dazu verpflichtet sind.

14. Übermittlung in Drittländer

Die Datenbank des Dienstes wird in der EU (Irland) betrieben. Zu Übermittlungen in die USA kommt es in folgenden Fällen:

- bei der Auslieferung von Website und Web-Dashboard über Vercel (Ziffer 3.1),
- beim Versand von Bestätigungscodes über Resend (Ziffer 12.1),
- beim Versand von Push-Nachrichten über Expo, Apple und Google (Ziffer 10),
- durch Zugriffe von Supabase, Inc. auf die Infrastruktur, etwa im Rahmen von Support und Wartung,
- durch Stripe im Rahmen seiner eigenen Verantwortlichkeit (Ziffer 6).

Für die USA hat die Europäische Kommission einen Angemessenheitsbeschluss erlassen (EU-US Data Privacy Framework, Art. 45 DSGVO). Er gilt für Empfänger, die nach diesem Rahmen zertifiziert sind; das trifft auf Vercel, Resend, Apple, Google und Stripe zu. Für Empfänger ohne Zertifizierung, und ergänzend auch für die zertifizierten, stützen wir die Übermittlung auf die Standardvertragsklauseln der Europäischen Kommission (Art. 46 Abs. 2 lit. c DSGVO). Eine Kopie der jeweils herangezogenen Garantien erhalten Sie auf Anfrage unter blanktrading@web.de.

15. Speicherdauer und Löschung

Wir speichern personenbezogene Daten nur so lange, wie es für den jeweiligen Zweck erforderlich ist oder gesetzliche Aufbewahrungspflichten es verlangen.

- Server-Protokolle der Website (Vercel): automatische Löschung nach spätestens 1 Tag
- Protokolle von Datenbank, Anmeldung und Server-Funktionen (Supabase): automatische Löschung nach 7 Tagen
- Datensicherungen der Datenbank: tägliche Sicherung, jede Sicherung wird nach 7 Tagen überschrieben
- Cookies: siehe Ziffer 4
- Unbestätigte Registrierung: automatische Löschung nach 24 Stunden
- Bestätigungscodes: verfallen nach kurzer Zeit, höchstens nach 24 Stunden
- Verknüpfungscode für die Zusammenführung von Konten: 15 Minuten gültig
- E-Mail-Protokolle beim Versanddienstleister (Resend): 30 Tage
- Anmeldekonto und aktive Sitzungen: bis Sie sich abmelden (Sitzung) bzw. Ihr Konto löschen (Konto), siehe Ziffer 15.1
- Push-Token: bis zur Kontolöschung oder bis sich ein anderes Konto auf dem Gerät anmeldet (Ziffer 10)
- Profil im Betrieb: bis Ihr Arbeitgeber es entfernt oder Sie Ihr Konto löschen (dann Pseudonymisierung, Ziffer 15.1), spätestens bis zur Löschung des Betriebs
- Planungs- und Kommunikationsdaten, Änderungsprotokoll: nach Weisung Ihres Arbeitgebers, spätestens bis zur Löschung des Betriebs (Ziffer 15.3)
- Nachweise der Zustimmung zu AGB, AVV und Datenschutzerklärung: bis zur Löschung des Betriebs
- Stripe-Kennungen, Tarif und Status des Abonnements: bis zur Löschung des Betriebs
- Rechnungen und Buchungsbelege: 8 Jahre (§ 147 AO, § 257 HGB)
- Handels- und Geschäftsbriefe, auch per E-Mail: 6 Jahre (§ 257 HGB, § 147 AO)
- Sonstige E-Mails an uns: bis zur Erledigung des Anliegens
- Fehlermeldungen aus der App: bis zur Bearbeitung, spätestens 12 Monate
- Daten in der App auf Ihrem Gerät: bis zur Abmeldung (Sitzung) bzw. Deinstallation (Ziffer 11)

Gesetzliche Aufbewahrungsfristen beginnen mit dem Ende des Kalenderjahres, in dem die Unterlage entstanden ist. Während einer Aufbewahrungspflicht werden die Daten für andere Zwecke gesperrt.

15.1 Wenn Sie Ihr Konto löschen

Sie können Ihr Konto jederzeit selbst löschen: im Web unter „Konto löschen“ (quickteam.at/kontoloeschung, nach Anmeldung) oder in der App in den Einstellungen. Die Löschung wirkt sofort und für alle Ihre Anstellungen zugleich.

Sofort gelöscht werden: Ihr Anmeldekonto (E-Mail-Adresse, Passwort-Hashwert, Sitzungen), Ihre Push-Token, die an Sie persönlich gerichteten Benachrichtigungen samt Lesevermerken, Ihre Benachrichtigungseinstellungen und offene Einladungen.

Von Ihrer Person gelöst werden Ihre Profile in den Betrieben: Vor- und Nachname werden durch einen Platzhalter ersetzt, E-Mail-Adresse und Telefonnummer entfernt, die Verbindung zu Ihrem Anmeldekonto aufgehoben und der Status auf „inaktiv“ gesetzt.

Bestehen bleiben – verknüpft mit diesem nicht mehr namentlichen Profil – die Dienstplandaten, in denen Sie eingeteilt waren: Schichtzuweisungen, Urlaubseinträge, Verfügbarkeiten und Vorlieben, Schichttausch- und Notfallvorgänge, Umfragestimmen, von Ihnen verfasste Notizen und Mitteilungen sowie das Änderungsprotokoll. Ihr Arbeitgeber benötigt diese Daten für die Nachvollziehbarkeit des Dienstplans und für arbeitszeitrechtliche Aufzeichnungen. Weil er diese Einträge anhand seiner eigenen Unterlagen unter Umständen weiterhin Ihnen zuordnen kann, handelt es sich um eine Pseudonymisierung, nicht um eine Anonymisierung. Freitexte, die Sie selbst geschrieben haben, bleiben inhaltlich unverändert; möchten Sie, dass solche Inhalte entfernt werden, wenden Sie sich bitte an Ihren Arbeitgeber. Diese Daten werden spätestens mit dem Betrieb gelöscht (Ziffer 15.3).

Führungskräfte: Leiten Sie einen Betrieb, in dem noch weitere Personen stehen, lässt sich Ihr Konto erst löschen, wenn Sie die Leitung übergeben oder die übrigen Mitglieder entfernt haben. Sonst bliebe ein Betrieb mit den Daten anderer Personen ohne Leitung zurück. Führen Sie den Betrieb allein, wird mit der Löschung Ihres Kontos auch das Abonnement bei Stripe sofort gekündigt; der Betrieb und seine Daten werden anschließend nach Ziffer 15.3 gelöscht.

15.2 Wenn Ihr Arbeitgeber Sie aus dem Betrieb entfernt

Führungskräfte können das Profil einer Person im Betrieb pseudonymisieren. Dabei werden Name, E-Mail-Adresse, Telefonnummer und die Verbindung zum Anmeldekonto entfernt und die an die Person gerichteten Benachrichtigungen und Einladungen gelöscht; im Übrigen gilt Ziffer 15.1 entsprechend. Noch nicht angenommene Einladungen können Führungskräfte vollständig löschen. Ihr Anmeldekonto bleibt in beiden Fällen bestehen, weil es anderen Anstellungen zugeordnet sein kann; Sie können es jederzeit selbst löschen.

15.3 Ende des Vertrags und abgelaufene Testphase

- Nach Vertragsende stellen wir die Daten des Betriebs 30 Tage lang zum Export bereit (§ 6 Abs. 4 AGB). Danach löschen wir alle Daten des Betriebs, einschließlich der Profile der Beschäftigten, der Planungs- und Kommunikationsdaten, des Änderungsprotokolls und der Zustimmungsnachweise, soweit keine gesetzliche Aufbewahrungspflicht entgegensteht.
- Läuft die Testphase ohne hinterlegtes Zahlungsmittel ab, wird das Abonnement pausiert und die Verwaltung des Betriebs gesperrt. Wird es nicht innerhalb von 90 Tagen durch Hinterlegen eines Zahlungsmittels fortgesetzt, löschen wir den Betrieb und seine Daten wie nach Vertragsende.
- Anmeldekonten von Beschäftigten bleiben bestehen, weil sie weiteren Betrieben zugeordnet sein können; sie werden gelöscht, wenn die jeweilige Person ihr Konto löscht.

15.4 Datensicherungen

Die Datenbank wird täglich gesichert; jede Sicherung wird nach 7 Tagen überschrieben. Gelöschte Daten sind deshalb spätestens 7 Tage nach der Löschung auch aus den Sicherungen entfernt. Sicherungen verwenden wir ausschließlich zur Wiederherstellung nach einem Datenverlust. Müssten wir eine Sicherung zurückspielen, löschen wir Daten, deren Löschung zwischenzeitlich verlangt oder durchgeführt worden war, erneut.

16. Pflicht zur Bereitstellung

Für die Registrierung eines Betriebs und für ein Anmeldekonto sind E-Mail-Adresse, Passwort und – bei der Registrierung – Name des Betriebs, Land sowie Vor- und Nachname erforderlich; ohne sie können wir keinen Vertrag schließen und kein Konto anlegen. Eine gesetzliche Pflicht zur Angabe besteht nicht. Freiwillig sind insbesondere Kommentare, Gründe, Notizen, Umfragestimmen, Verfügbarkeiten, Vorlieben und die Aktivierung von Push-Nachrichten. Ob Sie den Dienst im Rahmen Ihres Arbeitsverhältnisses nutzen müssen, richtet sich nach den Vereinbarungen mit Ihrem Arbeitgeber.

17. Ihre Rechte

Sie haben nach Maßgabe der gesetzlichen Voraussetzungen das Recht auf

- Auskunft über die zu Ihnen verarbeiteten Daten (Art. 15 DSGVO),
- Berichtigung unrichtiger Daten (Art. 16 DSGVO),
- Löschung (Art. 17 DSGVO),
- Einschränkung der Verarbeitung (Art. 18 DSGVO),
- Datenübertragbarkeit (Art. 20 DSGVO) sowie
- Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO); die Rechtmäßigkeit der bis dahin erfolgten Verarbeitung bleibt unberührt.

Richten Sie Ihre Anfrage an blanktrading@web.de; bei betrieblichen Daten zuerst an Ihren Arbeitgeber (Ziffer 2). Wir beantworten Anfragen unentgeltlich und innerhalb eines Monats. Um Ihre Daten zu schützen, können wir Sie bitten, Ihre Identität nachzuweisen, etwa durch eine Nachricht von der bei uns hinterlegten E-Mail-Adresse.

Widerspruchsrecht nach Art. 21 DSGVO

Soweit wir Ihre Daten auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO verarbeiten, haben Sie das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit Widerspruch gegen diese Verarbeitung einzulegen. Wir verarbeiten die Daten dann nicht mehr, es sei denn, wir können zwingende schutzwürdige Gründe für die Verarbeitung nachweisen, die Ihre Interessen, Rechte und Freiheiten überwiegen, oder die Verarbeitung dient der Geltendmachung, Ausübung oder Verteidigung von Rechtsansprüchen. Der Widerspruch ist formfrei und sollte an blanktrading@web.de gerichtet werden.

Beschwerde bei einer Aufsichtsbehörde

Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren (Art. 77 DSGVO), insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthalts, Ihres Arbeitsplatzes oder des mutmaßlichen Verstoßes. Für uns zuständig ist:

Der Landesbeauftragte für den Datenschutz und die Informationsfreiheit Baden-Württemberg
Lautenschlagerstraße 20
70173 Stuttgart
Deutschland

Für Personen in Österreich ist dies die Österreichische Datenschutzbehörde, Barichgasse 40–42, 1030 Wien.

18. Sicherheit

Wir schützen Ihre Daten durch technische und organisatorische Maßnahmen, insbesondere:

- verschlüsselte Übertragung (TLS) zwischen Ihrem Gerät, unseren Servern und unseren Dienstleistern,
- zeilenbasierte Zugriffskontrollen (Row-Level Security) auf allen Tabellen, die die Daten jedes Betriebs voneinander trennen und innerhalb eines Betriebs nach Rolle beschränken,
- serverseitig durchgesetzte Berechtigungsprüfungen; vom Browser oder der App übermittelte Kennungen werden serverseitig gegen Ihr Konto geprüft,
- Speicherung von Passwörtern ausschließlich als Hashwert,
- Zwei-Faktor-Authentifizierung für administrative Zugänge zu Datenbank und Verwaltungskonsolen,
- Zugriff nach dem Prinzip der geringsten Rechte; Schlüssel mit erweiterten Rechten liegen ausschließlich serverseitig,
- tägliche Datensicherungen (Ziffer 15.4).

Physische Sicherheit der Rechenzentren, Netzwerkschutz und Verschlüsselung der gespeicherten Daten erbringt Supabase als unser Auftragsverarbeiter. Für die Verarbeitung, die wir selbst durchführen, und für die Auswahl geeigneter Dienstleister bleiben wir verantwortlich. Kein System ist vollkommen sicher; wir überprüfen unsere Maßnahmen regelmäßig und reagieren auf Vorfälle nach den gesetzlichen Vorgaben.

19. Minderjährige

Der Dienst ist für die Nutzung im beruflichen Zusammenhang durch Personen bestimmt, die nach dem jeweils geltenden Recht beschäftigt werden dürfen. Er richtet sich nicht an Kinder. Wir erheben keine Altersangaben und legen wissentlich keine Konten für Personen unterhalb des gesetzlich zulässigen Mindestalters an.

20. Änderungen dieser Datenschutzerklärung

Wir passen diese Datenschutzerklärung an, wenn sich der Dienst oder die Rechtslage ändert. Maßgeblich ist die jeweils unter quickteam.at/datenschutz veröffentlichte Fassung mit dem oben genannten Stand. Bei wesentlichen Änderungen bitten wir Führungskräfte im Dashboard und Nutzerinnen und Nutzer in der App, die neue Fassung zur Kenntnis zu nehmen.`;

const TERMS_DE = `ALLGEMEINE GESCHÄFTSBEDINGUNGEN (AGB) FÜR DIE NUTZUNG VON QUICKTEAM

Stand: 13. September 2026

§ 1 Anbieter, Geltungsbereich, Vertragspartner, Begriffe

(1) Anbieter und Vertragspartner des Kunden ist die BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Deutschland, vertreten durch den Geschäftsführer Leo Solomon, eingetragen im Handelsregister des Amtsgerichts Stuttgart unter HRB 795737, USt-IdNr. DE369517679 (nachfolgend „Anbieter", „wir" oder „uns").

(2) Diese AGB gelten für alle Verträge über die Bereitstellung und Nutzung der Software-as-a-Service-Anwendung „QuickTeam" und der zugehörigen Dienste (der „Dienst") zwischen dem Anbieter und dem Kunden. QuickTeam ist ein Werkzeug zur Personaleinsatz- und Schichtplanung, das über das Internet als Webanwendung sowie als App für iOS und Android bereitgestellt wird. Die Apps stehen zur Verfügung, soweit sie in den jeweiligen App-Stores veröffentlicht sind.

(3) Der Dienst richtet sich ausschließlich an Unternehmer im Sinne des § 14 BGB, an juristische Personen des öffentlichen Rechts und an öffentlich-rechtliche Sondervermögen. Er richtet sich nicht an Verbraucher im Sinne des § 13 BGB. Mit der Registrierung bestätigt der Kunde, dass er den Dienst in Ausübung seiner gewerblichen oder selbständigen beruflichen Tätigkeit nutzt.

(4) Kunde und alleiniger Vertragspartner ist das Unternehmen (der Betrieb), das den Dienst bestellt und das Konto anlegt („Kunde"). „Nutzer" sind die natürlichen Personen — insbesondere Beschäftigte des Kunden —, die der Kunde in den Dienst einlädt und für die er Konten anlegen oder freischalten lässt. Nutzer nutzen den Dienst im Rahmen des vom Kunden geschlossenen Vertrags; die Nutzungspflichten nach § 7 gelten auch für sie. Der Kunde steht für die Einhaltung dieser AGB durch seine Nutzer wie für eigenes Handeln ein.

(5) Diese AGB gelten ausschließlich. Entgegenstehende, abweichende oder ergänzende allgemeine Geschäftsbedingungen des Kunden werden nicht Vertragsbestandteil, es sei denn, der Anbieter hat ihrer Geltung ausdrücklich in Textform zugestimmt. Dies gilt auch dann, wenn der Anbieter in Kenntnis solcher Bedingungen den Dienst vorbehaltlos erbringt.

§ 2 Vertragsgegenstand und Leistungsbeschreibung

(1) Der Anbieter stellt dem Kunden den Dienst für die Dauer des Vertrags in der jeweils aktuellen Version zur Nutzung über das Internet bereit. Der Kunde erwirbt kein Eigentum an der Software; diese wird ihm zeitlich befristet zur Nutzung überlassen. Auf die Bereitstellung finden die Vorschriften des Mietrechts (§§ 535 ff. BGB) ergänzend Anwendung, soweit in diesen AGB nichts Abweichendes geregelt ist.

(2) Der Funktionsumfang ergibt sich aus der zum Zeitpunkt des Vertragsschlusses gültigen Leistungsbeschreibung auf der Website des Anbieters und dem gewählten Tarif. Zum Funktionsumfang gehören insbesondere die Verwaltung von Mitarbeitern und Rollen, die Schicht- und Einsatzplanung einschließlich automatisch erstellter Planvorschläge, die Verwaltung von Verfügbarkeiten, Präferenzen, Urlaub und Abwesenheiten, Schichttausch, Notfallvertretung, teaminterne Mitteilungen mit Umfragen und Checklisten sowie Benachrichtigungen.

(3) Der Anbieter ist berechtigt, den Dienst weiterzuentwickeln, anzupassen und zu verbessern sowie einzelne Funktionen zu ändern oder zu ersetzen, sofern der vertraglich vereinbarte Kernnutzen für den Kunden erhalten bleibt und der Kunde hierdurch nicht unangemessen benachteiligt wird. Wesentliche Einschränkungen des Leistungsumfangs richten sich nach § 13.

(4) Übergabepunkt für die Leistungen des Anbieters ist der Routerausgang des vom Anbieter genutzten Rechenzentrums. Für die Verbindung zwischen diesem Übergabepunkt und den Endgeräten der Nutzer, für die Endgeräte selbst sowie für eine geeignete Internetverbindung ist der Kunde verantwortlich.

(5) Push-Benachrichtigungen werden nur in den Apps für iOS und Android zugestellt. Ihre Zustellung hängt von den Diensten der Plattformbetreiber (insbesondere Apple und Google) sowie von den Geräte- und App-Einstellungen der Nutzer ab. Der Anbieter schuldet die Übergabe der Benachrichtigung an diese Dienste, nicht ihre Zustellung zu einem bestimmten Zeitpunkt.

(6) Die Tarife unterscheiden sich insbesondere nach der Höchstzahl der Mitarbeiter, die der Kunde im Dienst führen darf; deaktivierte und entfernte Mitarbeiter zählen nicht mit. Die Grenzen ergeben sich aus der Leistungsbeschreibung (Abs. 2). Überschreitet der Kunde die Grenze seines Tarifs nicht nur vorübergehend, kann der Anbieter ihn in Textform auffordern, in einen passenden Tarif zu wechseln. Wechselt der Kunde nicht innerhalb von vier (4) Wochen nach Zugang der Aufforderung und verringert er die Zahl auch nicht auf die Grenze seines Tarifs, kann der Anbieter den Vertrag zum Ende des dann laufenden Abrechnungszeitraums kündigen. Eine Nachberechnung für zurückliegende Zeiträume erfolgt nicht.

(7) Ein Vertrag umfasst jeweils einen Betrieb an einem Standort. Für mehrere Standorte oder eine Mitarbeiterzahl über der Grenze des größten Tarifs können individuelle Konditionen vereinbart werden; diese gehen den AGB vor (§ 14 Abs. 1).

§ 3 Registrierung, Vertragsschluss, Konten

(1) Die Nutzung setzt eine Registrierung voraus. Der Kunde hat die abgefragten Angaben wahrheitsgemäß und vollständig zu machen und aktuell zu halten.

(2) Die Darstellung des Dienstes auf der Website ist kein verbindliches Angebot. Mit dem Absenden der Registrierung gibt der Kunde ein verbindliches Angebot auf Abschluss eines Nutzungsvertrags zu diesen AGB ab. Der Vertrag kommt zustande, wenn der Anbieter nach Bestätigung der E-Mail-Adresse den Betrieb des Kunden im Dienst anlegt.

(3) Die Person, die die Registrierung für den Kunden vornimmt, versichert, zu dessen Vertretung berechtigt zu sein. Dasselbe gilt für Nutzer, die für den Kunden Erklärungen im Dienst abgeben, insbesondere Zustimmungen nach § 13 oder Erklärungen zum Abonnement.

(4) Der Kunde verwaltet die Konten und Berechtigungen seiner Nutzer eigenverantwortlich. Er hat Zugangsdaten geheim zu halten, vor dem Zugriff Dritter zu schützen und den Anbieter unverzüglich zu informieren, wenn Anhaltspunkte für einen Missbrauch bestehen. Der Kunde ist für sämtliche Aktivitäten verantwortlich, die über seine Konten und die Konten seiner Nutzer erfolgen, soweit er dies zu vertreten hat.

§ 4 Verfügbarkeit, Wartung, Support, Datensicherung

(1) Der Anbieter bemüht sich um eine möglichst hohe Verfügbarkeit des Dienstes am Übergabepunkt, schuldet jedoch keine bestimmte Verfügbarkeitsquote. Nicht als Einschränkung der Verfügbarkeit gelten Zeiten angekündigter Wartung, Zeiten der Nichtverfügbarkeit aus Gründen höherer Gewalt (§ 11) sowie Störungen, die außerhalb des Einflussbereichs des Anbieters liegen, insbesondere Störungen des Internets oder von Telekommunikationsnetzen jenseits des Übergabepunkts und Störungen an Endgeräten des Kunden oder seiner Nutzer.

(2) Wartungsarbeiten werden nach Möglichkeit außerhalb der üblichen Geschäftszeiten durchgeführt und, soweit sie zu einer nicht nur unerheblichen Beeinträchtigung führen können, mit angemessener Frist angekündigt. Dringende Wartungs- und Sicherheitsmaßnahmen kann der Anbieter jederzeit ohne vorherige Ankündigung durchführen.

(3) Support leistet der Anbieter in deutscher und englischer Sprache per E-Mail. Anfragen werden innerhalb angemessener Frist bearbeitet; bestimmte Reaktionszeiten schuldet der Anbieter nur, soweit sie in der Leistungsbeschreibung genannt oder individuell vereinbart sind.

(4) Der Anbieter sichert die Daten des Kunden regelmäßig, mindestens täglich, nach dem Stand der Technik. Einzelheiten, insbesondere zur Aufbewahrungsdauer der Sicherungen, ergeben sich aus Anlage 2 des Auftragsverarbeitungsvertrags (§ 7 Abs. 3).

§ 5 Preise, Testphase und Zahlungsbedingungen

(1) Die Nutzung des Dienstes durch den Kunden ist nach Ablauf der kostenlosen Testphase (Abs. 2) entgeltlich. Vertrags- und zahlungspflichtig ist allein der Kunde (der Betriebsinhaber); die vom Kunden eingeladenen Nutzer (insbesondere seine Beschäftigten) zahlen für die Nutzung kein Entgelt. Es gelten die zum Zeitpunkt der Tarifwahl gültigen Preise des gewählten Tarifs gemäß der jeweils aktuellen Preisliste auf der Website des Anbieters. Alle Preise verstehen sich zuzüglich der jeweils geltenden gesetzlichen Umsatzsteuer.

(2) Soweit der Anbieter eine kostenlose Testphase anbietet, beginnt sie mit der Wahl des Tarifs im Anschluss an die Registrierung; ihre Dauer ergibt sich aus dem Angebot zu diesem Zeitpunkt. Während der Testphase fällt kein Entgelt an. Das Ende der Testphase und der Betrag der ersten Abbuchung werden dem Kunden angezeigt, bevor er ein Zahlungsmittel hinterlegt.

(3) Hinterlegt der Kunde während der Testphase ein Zahlungsmittel, geht der Vertrag mit Ablauf der Testphase ohne weitere Erklärung in das entgeltliche Abonnement des gewählten Tarifs über. Hinterlegt er keines, wird das Abonnement mit Ablauf der Testphase ohne Entgelt ruhend gestellt; der Anbieter ist berechtigt, die Verwaltungsfunktionen des Dienstes für diese Zeit zu sperren. Der Kunde kann das Abonnement innerhalb von neunzig (90) Tagen nach Ablauf der Testphase durch Hinterlegen eines Zahlungsmittels fortsetzen; das entgeltliche Abonnement beginnt dann mit dem Hinterlegen. Geschieht das nicht, endet der Vertrag mit Ablauf dieser Frist, ohne dass es einer Kündigung bedarf. Abweichend von § 6 Abs. 4 werden die Daten des Kunden in diesem Fall mit Vertragsende gelöscht; den Export (§ 6 Abs. 4) kann der Kunde bis dahin verlangen.

(4) Das Abonnement wird monatlich abgerechnet; das Entgelt ist im Voraus für den jeweiligen Abrechnungsmonat fällig. Der Anbieter kann zusätzlich Abrechnungszeiträume mit längerer Laufzeit (z. B. eine jährliche Abrechnung) anbieten; in diesem Fall ist das Entgelt im Voraus für den jeweils gewählten Zeitraum fällig.

(5) Die Zahlung erfolgt bargeldlos über den Zahlungsdienstleister Stripe (Stripe Payments Europe, Limited). Der Kunde hinterlegt hierzu ein gültiges Zahlungsmittel und ermächtigt den Anbieter, das fällige Entgelt zu Beginn des jeweiligen Abrechnungszeitraums über Stripe einzuziehen. Für die Zahlungsabwicklung gelten ergänzend die Bedingungen von Stripe. Rechnungen stellt der Anbieter in elektronischer Form bereit, etwa als PDF per E-Mail oder im Kundenportal des Zahlungsdienstleisters; der Kunde ist damit einverstanden. Der Kunde teilt dem Anbieter die für eine ordnungsgemäße Rechnung erforderlichen Angaben mit, insbesondere Firma und Anschrift sowie bei Sitz außerhalb Deutschlands seine Umsatzsteuer-Identifikationsnummer.

(6) Scheitert der Einzug eines fälligen Entgelts, wird der Einzug innerhalb der folgenden vierzehn (14) Tage erneut versucht, und der Kunde wird darüber informiert. Der Anbieter ist berechtigt, die Verwaltungsfunktionen des Dienstes bis zum Zahlungseingang einzuschränken. Ist das Entgelt vierzehn (14) Tage nach Fälligkeit nicht gezahlt, endet der Vertrag mit Ablauf des zuletzt bezahlten Abrechnungszeitraums, ohne dass es einer Kündigung bedarf; für den nicht bezahlten Abrechnungszeitraum wird kein Entgelt geschuldet. Wird eine bereits geleistete Zahlung nachträglich zurückgebucht (etwa durch Widerspruch gegen eine Lastschrift), bleibt das Entgelt für den betreffenden Abrechnungszeitraum geschuldet; die dadurch entstehenden Bankgebühren trägt der Kunde, soweit er die Rückbuchung zu vertreten hat.

(7) Der Anbieter ist berechtigt, die Preise für künftige Abrechnungszeiträume anzupassen. Er teilt eine Preisänderung mindestens sechs (6) Wochen vor ihrem Wirksamwerden in Textform mit. Die geänderten Preise gelten ab dem ersten Abrechnungszeitraum, der nach Ablauf dieser Frist beginnt; für bereits bezahlte Abrechnungszeiträume ändert sich der Preis nicht. Der Kunde kann den Vertrag bis zum Wirksamwerden jederzeit nach § 6 Abs. 2 zum Ende des laufenden Abrechnungszeitraums kündigen; hierauf weist die Mitteilung hin.

(8) Gegen Forderungen des Anbieters kann der Kunde nur mit unbestrittenen oder rechtskräftig festgestellten Gegenforderungen aufrechnen. Ein Zurückbehaltungsrecht kann der Kunde nur ausüben, soweit sein Gegenanspruch auf demselben Vertragsverhältnis beruht.

§ 6 Vertragslaufzeit und Kündigung

(1) Der Vertrag über ein monatlich abgerechnetes Abonnement hat nach Ablauf der Testphase eine Laufzeit von einem (1) Monat und verlängert sich automatisch um jeweils einen weiteren Monat, solange er nicht beendet wird. Bietet der Anbieter einen Abrechnungszeitraum mit längerer Laufzeit an (z. B. jährlich) und wählt der Kunde diesen, so beträgt die Laufzeit den gewählten Zeitraum und verlängert sich jeweils um denselben Zeitraum.

(2) Der Kunde kann den Vertrag — auch während der Testphase — jederzeit mit Wirkung zum Ende des laufenden, bereits bezahlten Abrechnungszeitraums oder zum Ende der Testphase kündigen. Die Kündigung kann über die dafür vorgesehene Funktion im Web-Dashboard (Kundenportal des Zahlungsdienstleisters) oder in Textform gegenüber dem Anbieter erklärt werden. Löscht die für den Kunden handelnde Person ihr Konto, während außer ihr niemand im Betrieb geführt wird, gilt dies als Kündigung mit sofortiger Wirkung. Ohne Kündigung endet der Vertrag, wenn das Entgelt für einen neuen Abrechnungszeitraum nicht gezahlt wird (§ 5 Abs. 6) oder das ruhende Abonnement nicht fortgesetzt wird (§ 5 Abs. 3). Mit Vertragsende endet der Zugang zum Dienst; Abs. 4 bleibt unberührt. Bereits gezahlte Entgelte werden nicht anteilig erstattet.

(3) Das Recht beider Parteien zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt. Ein wichtiger Grund liegt für den Anbieter insbesondere vor, wenn der Kunde in erheblicher Weise gegen wesentliche Pflichten aus diesen AGB verstößt und den Verstoß trotz Abmahnung nicht innerhalb einer angemessenen Frist abstellt, oder wenn eine zurückgebuchte Zahlung (§ 5 Abs. 6) trotz Aufforderung nicht innerhalb von vierzehn (14) Tagen ausgeglichen wird.

(4) Der Kunde kann während der Vertragslaufzeit und bis dreißig (30) Tage nach Vertragsende verlangen, dass der Anbieter ihm seine Daten in einem strukturierten, gängigen und maschinenlesbaren Format (etwa CSV oder JSON) bereitstellt. Das Verlangen ist in Textform an den Anbieter zu richten; der Anbieter stellt die Daten innerhalb von dreißig (30) Tagen nach Zugang bereit. Bietet der Dienst eine Exportfunktion, kann der Anbieter auf diese verweisen. Der Export ist kostenlos. Nach Ablauf der Frist nach Satz 1 löscht der Anbieter die Daten des Kunden, soweit keine gesetzlichen Aufbewahrungspflichten entgegenstehen; für ruhend gestellte Abonnements gilt § 5 Abs. 3. Für die Auftragsverarbeitung personenbezogener Daten gelten ergänzend die Regelungen des Auftragsverarbeitungsvertrags (§ 7 Abs. 3).

(5) Exportierbar im Sinne von Abs. 4 sind alle Daten, die der Kunde und seine Nutzer im Dienst eingegeben haben oder die dort für den Betrieb des Kunden erzeugt wurden, insbesondere Angaben zu Mitarbeitern und Rollen, Schichtvorlagen, Planungszeiträume, Schichten und Zuweisungen, Urlaubs-, Verfügbarkeits- und Präferenzangaben, Mitteilungen samt Umfragen und Checklisten, Tausch- und Notfallvorgänge sowie das Änderungsprotokoll. Nicht exportiert werden Daten, die allein dem internen Betrieb und der Sicherheit des Dienstes dienen, insbesondere Passwort-Hashes, Sitzungs- und Sicherheitsdaten, Push-Tokens und der Programmcode. Der Kunde kann auf dieser Grundlage den Wechsel zu einem anderen Anbieter von Datenverarbeitungsdiensten oder die Übertragung seiner Daten auf eigene Systeme nach der Verordnung (EU) 2023/2854 (Datenverordnung) verlangen; der Anbieter unterstützt ihn dabei und erhebt dafür kein Entgelt.

§ 7 Pflichten und Verantwortlichkeit des Kunden

(1) Der Kunde nutzt den Dienst ausschließlich im Rahmen der geltenden Gesetze und dieser AGB. Er stellt sicher, dass er und seine Nutzer den Dienst nicht missbrauchen, insbesondere nicht rechtswidrige, beleidigende oder Rechte Dritter verletzende Inhalte einstellen, keinen unbefugten Zugriff versuchen, die Funktionsfähigkeit des Dienstes nicht stören und keine Schadsoftware einbringen.

(2) Der Kunde ist hinsichtlich der von ihm und seinen Nutzern in den Dienst eingegebenen personenbezogenen Daten — insbesondere Beschäftigtendaten — datenschutzrechtlich Verantwortlicher im Sinne des Art. 4 Nr. 7 DSGVO. Er ist allein dafür verantwortlich, dass für die Verarbeitung dieser Daten eine tragfähige Rechtsgrundlage besteht (insbesondere nach Art. 6 und Art. 88 DSGVO in Verbindung mit den nationalen Vorschriften zum Beschäftigtendatenschutz), dass die betroffenen Personen ordnungsgemäß informiert werden, dass erforderliche Einwilligungen oder Betriebsvereinbarungen vorliegen und dass etwaige Mitbestimmungsrechte eines Betriebsrats (etwa nach § 87 Abs. 1 Nr. 6 BetrVG oder §§ 96, 96a ArbVG) gewahrt sind.

(3) Soweit der Anbieter im Rahmen des Dienstes personenbezogene Daten im Auftrag des Kunden verarbeitet, gilt der zwischen den Parteien geschlossene Auftragsverarbeitungsvertrag (AVV) nach Art. 28 DSGVO, den der Kunde bei der Registrierung mit dem Anbieter abschließt. Der AVV ist Bestandteil des Vertrags und geht diesen AGB im Falle von Widersprüchen in datenschutzrechtlichen Fragen vor.

(4) Der Kunde stellt den Anbieter von allen Ansprüchen Dritter — einschließlich angemessener Kosten der Rechtsverteidigung — frei, die diese wegen einer rechtswidrigen Nutzung des Dienstes durch den Kunden oder seine Nutzer oder wegen einer Verletzung datenschutz- oder arbeitsrechtlicher Pflichten des Kunden gegen den Anbieter geltend machen, soweit der Kunde die zugrunde liegende Rechtsverletzung zu vertreten hat. Der Anbieter informiert den Kunden unverzüglich über die geltend gemachten Ansprüche, gibt ihm Gelegenheit zur Stellungnahme und erkennt Ansprüche nicht ohne Zustimmung des Kunden an.

(5) Der Dienst ist kein Archiv für Unterlagen, die der Kunde aufgrund gesetzlicher Pflichten aufbewahren muss. Daten, die der Kunde außerhalb des Dienstes benötigt — etwa für die Lohnabrechnung oder zur Erfüllung von Aufbewahrungspflichten —, sichert er in eigener Verantwortung, insbesondere über den Export nach § 6 Abs. 4.

(6) Der Dienst unterstützt die Personaleinsatzplanung; er ersetzt nicht die Entscheidung des Kunden. Automatisch erstellte Planvorschläge und Hinweise des Dienstes (etwa zu Mindestbesetzung oder Sollstunden) prüft der Kunde vor ihrer Verwendung. Für die Einhaltung arbeitszeit-, arbeitsschutz-, tarif- und sonstiger arbeitsrechtlicher Vorgaben — etwa zu Höchstarbeitszeiten, Ruhezeiten und Fristen für die Bekanntgabe von Dienstplänen — bleibt der Kunde verantwortlich. Der Dienst ist kein System zur Erfassung der Arbeitszeit. Mitteilungen und Benachrichtigungen im Dienst ersetzen keine Erklärungen, die gegenüber Beschäftigten einer bestimmten Form oder eines Zugangsnachweises bedürfen.

§ 8 Nutzungsrechte und Rechte an Inhalten

(1) Der Anbieter räumt dem Kunden für die Dauer des Vertrags ein einfaches, nicht ausschließliches, nicht übertragbares und nicht unterlizenzierbares Recht ein, den Dienst im vertraglich vereinbarten Umfang durch sich und seine Nutzer zu nutzen.

(2) Der Kunde und seine Nutzer behalten sämtliche Rechte an den von ihnen eingestellten Inhalten. Der Kunde räumt dem Anbieter das einfache, räumlich und zeitlich auf die Vertragserfüllung beschränkte Recht ein, diese Inhalte zu speichern, zu vervielfältigen, technisch zu bearbeiten und den berechtigten Nutzern anzuzeigen, soweit dies zur Erbringung des Dienstes erforderlich ist.

(3) Dem Kunden ist es untersagt, die dem Dienst zugrunde liegende Software über die vertraglich eingeräumte Nutzung hinaus zu vervielfältigen, zu bearbeiten, zurückzuentwickeln, zu dekompilieren oder Dritten zugänglich zu machen, soweit hierfür keine gesetzliche Erlaubnis besteht; § 69e UrhG bleibt unberührt.

§ 9 Gewährleistung / Mängelrechte

(1) Der Anbieter gewährleistet, dass der Dienst während der Vertragslaufzeit im Wesentlichen der jeweils gültigen Leistungsbeschreibung entspricht. Es gelten die Vorschriften des Mietrechts, soweit in diesen AGB nichts Abweichendes geregelt ist.

(2) Die verschuldensunabhängige Haftung des Anbieters nach § 536a Abs. 1 Alt. 1 BGB für Mängel, die bereits bei Vertragsschluss vorhanden waren, wird ausgeschlossen. Die Haftung des Anbieters richtet sich insoweit nach § 10.

(3) Mängel des Dienstes wird der Anbieter nach Mitteilung durch den Kunden innerhalb angemessener Frist beseitigen. Unerhebliche Beeinträchtigungen der Gebrauchstauglichkeit begründen keine Mängelrechte. Der Kunde hat erkennbare Mängel unverzüglich in Textform anzuzeigen.

§ 10 Haftung

(1) Der Anbieter haftet unbeschränkt für Schäden aus der Verletzung des Lebens, des Körpers oder der Gesundheit, die auf einer vorsätzlichen oder fahrlässigen Pflichtverletzung des Anbieters, seiner gesetzlichen Vertreter oder Erfüllungsgehilfen beruhen, sowie für Schäden, die auf Vorsatz oder grober Fahrlässigkeit beruhen. Ebenso haftet der Anbieter unbeschränkt, soweit er eine Garantie übernommen hat oder soweit zwingend nach dem Produkthaftungsgesetz gehaftet wird.

(2) Bei der einfach fahrlässigen Verletzung einer wesentlichen Vertragspflicht (Kardinalpflicht) haftet der Anbieter der Höhe nach begrenzt auf den bei Vertragsschluss vorhersehbaren, vertragstypischen Schaden. Wesentliche Vertragspflichten sind solche, deren Erfüllung die ordnungsgemäße Durchführung des Vertrags überhaupt erst ermöglicht und auf deren Einhaltung der Kunde regelmäßig vertrauen darf.

(3) Eine darüber hinausgehende Haftung des Anbieters ist ausgeschlossen. Insbesondere haftet der Anbieter bei einfacher Fahrlässigkeit nicht für die Verletzung nicht wesentlicher Vertragspflichten.

(4) Für den Verlust von Daten haftet der Anbieter nach Maßgabe der vorstehenden Absätze. Bei einfacher Fahrlässigkeit ist die Haftung auf den Aufwand beschränkt, der für die Wiederherstellung der Daten aus einer Datensicherung nach § 4 Abs. 4 erforderlich ist.

(5) Die vorstehenden Haftungsbeschränkungen gelten auch zugunsten der gesetzlichen Vertreter, Mitarbeiter und Erfüllungsgehilfen des Anbieters.

(6) Schadensersatzansprüche des Kunden verjähren innerhalb eines (1) Jahres ab dem gesetzlichen Verjährungsbeginn. Dies gilt nicht in den Fällen des Absatzes 1 und nicht bei arglistig verschwiegenen Mängeln.

§ 11 Höhere Gewalt

Der Anbieter haftet nicht für die Nichterfüllung oder Verzögerung seiner Leistungen, soweit diese auf Ereignissen höherer Gewalt beruht. Als höhere Gewalt gelten alle vom Anbieter nicht zu vertretenden Umstände außerhalb seines zumutbaren Einflussbereichs, insbesondere Naturkatastrophen, Epidemien und Pandemien, Krieg, Terror, Arbeitskämpfe, behördliche Maßnahmen und großflächige Ausfälle von Strom- oder Telekommunikationsnetzen. Ausfälle von Dienstleistern, die der Anbieter zur Erbringung des Dienstes einsetzt, gelten nur dann als höhere Gewalt, wenn sie ihrerseits auf einem solchen Ereignis beruhen. Für die Dauer des Ereignisses sind die betroffenen Leistungspflichten ausgesetzt.

§ 12 Vertraulichkeit

Die Parteien verpflichten sich, alle im Rahmen des Vertragsverhältnisses erlangten vertraulichen Informationen der jeweils anderen Partei geheim zu halten und nur für die Zwecke der Vertragsdurchführung zu verwenden. Diese Pflicht besteht auch nach Beendigung des Vertrags fort. Ausgenommen sind Informationen, die offenkundig sind, die die empfangende Partei rechtmäßig von Dritten erhalten hat oder die aufgrund gesetzlicher oder behördlicher Anordnung offengelegt werden müssen.

§ 13 Änderungen dieser AGB und des Leistungsumfangs

(1) Der Anbieter kann dem Kunden Änderungen dieser AGB und wesentliche Änderungen des Leistungsumfangs mit Wirkung für die Zukunft anbieten. Er übermittelt das Angebot mindestens sechs (6) Wochen vor dem geplanten Wirksamwerden in Textform, macht die Änderungen kenntlich und stellt die geänderte Fassung zur Verfügung.

(2) Eine Änderung wird für den Kunden wirksam, wenn er ihr zustimmt. Die Zustimmung kann in Textform oder durch Bestätigung im Dienst erklärt werden. Schweigen gilt nicht als Zustimmung.

(3) Solange der Kunde nicht zugestimmt hat, gelten für ihn die bisherigen Bedingungen. Hat er bis zum geplanten Wirksamwerden nicht zugestimmt, kann der Anbieter den Vertrag zum Ende des Abrechnungszeitraums kündigen, in den dieser Zeitpunkt fällt, oder zu einem späteren Ende eines Abrechnungszeitraums; auf diese Folge weist das Angebot hin. Das Recht des Kunden zur Kündigung nach § 6 Abs. 2 bleibt unberührt.

(4) Keiner Zustimmung bedürfen Änderungen, die ausschließlich zugunsten des Kunden wirken, sowie die Weiterentwicklung des Dienstes nach § 2 Abs. 3. Für Preisänderungen gilt § 5 Abs. 7.

§ 14 Schlussbestimmungen

(1) Individuelle Vereinbarungen zwischen den Parteien haben Vorrang vor diesen AGB (§ 305b BGB). Im Übrigen bedürfen Änderungen und Ergänzungen dieses Vertrags der Textform, soweit diese AGB nichts anderes bestimmen.

(2) Der Kunde darf Rechte und Pflichten aus diesem Vertrag nur mit vorheriger Zustimmung des Anbieters auf Dritte übertragen. Der Anbieter ist berechtigt, seine Rechte und Pflichten aus diesem Vertrag ganz oder teilweise auf ein verbundenes Unternehmen oder im Rahmen einer Unternehmensnachfolge zu übertragen; der Kunde ist in diesem Fall zur außerordentlichen Kündigung berechtigt, wenn ihm die Fortsetzung mit dem neuen Vertragspartner nicht zumutbar ist.

(3) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG) und der Kollisionsnormen des internationalen Privatrechts.

(4) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag ist der Sitz des Anbieters, sofern der Kunde Kaufmann, juristische Person des öffentlichen Rechts oder öffentlich-rechtliches Sondervermögen ist oder keinen allgemeinen Gerichtsstand in Deutschland hat. Der Anbieter ist zudem berechtigt, am allgemeinen Gerichtsstand des Kunden zu klagen.

(5) Sollten einzelne Bestimmungen dieser AGB ganz oder teilweise unwirksam oder undurchführbar sein oder werden, so bleibt die Wirksamkeit der übrigen Bestimmungen hiervon unberührt. Anstelle der unwirksamen oder undurchführbaren Bestimmung gilt die gesetzliche Regelung.

(6) Diese AGB sind in deutscher und englischer Sprache verfügbar. Maßgeblich und rechtsverbindlich ist ausschließlich die deutsche Fassung; die englische Fassung dient nur der Information.

§ 15 Kontakt

Anbieter: BlankTrading UG (haftungsbeschränkt), Gabriele-Münter-Straße 31, 73760 Ostfildern, Deutschland. Telefonnummer und weitere Angaben: siehe Impressum.
Fragen zu diesen AGB sowie Erklärungen in Textform (etwa Kündigung oder Exportverlangen): blanktrading@web.de.`;

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
