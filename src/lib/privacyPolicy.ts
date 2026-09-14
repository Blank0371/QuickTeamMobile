// Privacy policy version.
//
// HOW THIS WORKS
// Every user must take note of the policy before using the app — on first
// launch, and again after each version bump (blocking; see LegalConsentGate).
// The version they noted is stored on the device and, once they enter a
// business, recorded server-side (rechtliche_zustimmungen, see consentRecord.ts).
// Keep it equal to the website's version (rechtstexte.ts).
//
// WHERE THE TEXT LIVES
// The policy body is the PRIVACY_EN / PRIVACY_DE constant in src/lib/legalDocs.ts
// (German for "de", English for every other language). Edit those to change the
// wording; legalBody() returns the right variant for the user's language.
//
// TO PUBLISH A NEW VERSION
//   1. Edit PRIVACY_EN / PRIVACY_DE in src/lib/legalDocs.ts.
//   2. Bump PRIVACY_POLICY_VERSION (e.g. "2026-09-12-draft" -> "2026-10-01").
//   3. Update PRIVACY_POLICY_HASH (below) from the website's German file.

export const PRIVACY_POLICY_VERSION = "2026-09-14-draft";

// Fingerprint of the noted version, recorded with each acknowledgement so a
// text swapped under an unchanged version string is detectable. It is the
// WEBSITE's value, not a hash of the app's copy: the website hashes its German
// Markdown (sha256, CRLF -> LF; QuickTeamFront/src/lib/rechtstexte-inhalt.ts),
// always German because that version is authoritative, and the app shows the
// same text without Markdown. Recompute from
// QuickTeamFront/docs/rechtliches/legals/datenschutzerklaerung-de.md (or the
// byte-identical copy in legals/) with:
//   node -e "const t=require('fs').readFileSync(process.argv[1],'utf8');console.log(require('crypto').createHash('sha256').update(t.replace(/\r\n/g,'\n')).digest('hex'))" legals/datenschutzerklaerung-de.md
export const PRIVACY_POLICY_HASH = "ca3a914963c7d3a29a71983776edd8bbeeb10a90a328c52407fc7486cccadbb2";
