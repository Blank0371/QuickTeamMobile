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

const BODIES: Record<LegalDocId, DocBodies> = {
  privacy: { en: PRIVACY_EN },
  terms: { en: TERMS_EN },
  eula: { en: EULA_EN },
  dmca: { en: DMCA_EN },
};

// Body text for a document in the given language, falling back to English.
export function legalBody(id: LegalDocId, lang: string): string {
  const doc = BODIES[id];
  return doc[lang] ?? doc.en;
}
