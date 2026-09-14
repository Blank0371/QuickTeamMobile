// Legal document registry — which documents exist, their order in the Settings
// "Legal" list, and which ones require agreement at sign-up.
//
// Versions live in their own files (privacyPolicy.ts, terms.ts) so each can be
// corrected and updated individually. Bodies live in legalDocs.ts.

import { LegalDocId } from "./legalDocs";
import { PRIVACY_POLICY_VERSION } from "./privacyPolicy";
import { TERMS_VERSION } from "./terms";

// Documents the in-app viewer (/legal/[doc]) can show.
export const LEGAL_DOC_IDS: LegalDocId[] = ["privacy", "terms", "eula", "dmca"];

// Settings > Legal opens these on the website instead of the in-app viewer, so
// users always see the published version. The pages are public (not behind
// SOFT_LAUNCH). The site only has German and English: `?lang=` picks the
// language for that page view (no cookie is set); every non-German app
// language gets English.
const LEGAL_WEBSITE_PATHS = {
  privacy: "/datenschutz",
  terms: "/agb",
  avv: "/avv",
} as const;

export function legalWebsiteUrl(id: keyof typeof LEGAL_WEBSITE_PATHS, appLang: string): string {
  return websiteUrl(LEGAL_WEBSITE_PATHS[id], appLang);
}

// A page on quickteam.at in the app's language (de, or en for everything else).
export function websiteUrl(path: string, appLang: string): string {
  const lang = appLang === "de" ? "de" : "en";
  return `https://quickteam.at${path}?lang=${lang}`;
}

// Apple's hosted "Licensed Application End User License Agreement" (the standard
// EULA). The EULA row opens this instead of an in-app document; set the same
// standard agreement in App Store Connect > App Information > License Agreement.
export const APPLE_STANDARD_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

// Documents the user must agree to at sign-up (shown together in the gate).
// EULA and DMCA are reference documents only and are not part of the gate.
export const CONSENT_DOC_IDS = ["privacy", "terms"] as const;
export type ConsentDocId = (typeof CONSENT_DOC_IDS)[number];

// Current version of each consent document. Bump one to show everyone who
// noted an older version the update notice.
export const CONSENT_VERSIONS: Record<ConsentDocId, string> = {
  privacy: PRIVACY_POLICY_VERSION,
  terms: TERMS_VERSION,
};

// Per-document storage key for the version the user last accepted.
export const consentStorageKey = (id: ConsentDocId) => `legal:accepted:${id}`;

// Language ("de" | "en") of the texts shown when they were last noted — goes
// into the server-side record (consentRecord.ts).
export const NOTED_LANG_KEY = "legal:acceptedLang";
