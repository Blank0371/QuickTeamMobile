// Legal document registry — which documents exist, their order in the Settings
// "Legal" list, and which ones require agreement at sign-up.
//
// Versions live in their own files (privacyPolicy.ts, terms.ts) so each can be
// corrected and updated individually. Bodies live in legalDocs.ts.

import { LegalDocId } from "./legalDocs";
import { PRIVACY_POLICY_VERSION } from "./privacyPolicy";
import { TERMS_VERSION } from "./terms";

// Order shown in Settings > Legal.
export const LEGAL_DOC_IDS: LegalDocId[] = ["privacy", "terms", "eula", "dmca"];

// Apple's hosted "Licensed Application End User License Agreement" (the standard
// EULA). The EULA row opens this instead of an in-app document; set the same
// standard agreement in App Store Connect > App Information > License Agreement.
export const APPLE_STANDARD_EULA_URL =
  "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

// Documents the user must agree to at sign-up (shown together in the gate).
// EULA and DMCA are reference documents only and are not part of the gate.
export const CONSENT_DOC_IDS = ["privacy", "terms"] as const;
export type ConsentDocId = (typeof CONSENT_DOC_IDS)[number];

// Current version of each consent document. Bump one to re-prompt everyone.
export const CONSENT_VERSIONS: Record<ConsentDocId, string> = {
  privacy: PRIVACY_POLICY_VERSION,
  terms: TERMS_VERSION,
};

// Per-document storage key for the version the user last accepted.
export const consentStorageKey = (id: ConsentDocId) => `legal:accepted:${id}`;
