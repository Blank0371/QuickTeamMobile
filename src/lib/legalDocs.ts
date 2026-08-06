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

const PRIVACY_EN = `Here is where I would put our Privacy Policy…

IF I HAD ONE.

(Placeholder — this is not a real privacy policy and has no legal effect. The real one will replace this text before release.)`;

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
