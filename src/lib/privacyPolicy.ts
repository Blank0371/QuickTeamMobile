// Privacy policy version.
//
// HOW THIS WORKS
// On first launch every user must take note of the policy before using the app.
// The version they noted is stored on the device. When you change the policy,
// bump PRIVACY_POLICY_VERSION — users who noted an older version then get a
// one-tap notice with a link to the new text on next launch (no block; see
// LegalConsentGate). Keep it equal to the website's version (rechtstexte.ts).
//
// WHERE THE TEXT LIVES
// The policy body is the PRIVACY_EN / PRIVACY_DE constant in src/lib/legalDocs.ts
// (German for "de", English for every other language). Edit those to change the
// wording; legalBody() returns the right variant for the user's language.
//
// TO PUBLISH THE REAL POLICY
//   1. Edit PRIVACY_EN / PRIVACY_DE in src/lib/legalDocs.ts.
//   2. Bump PRIVACY_POLICY_VERSION (e.g. "2026-09-12-draft" -> "2026-10-01").
// That's it — the consent gate handles the rest.

export const PRIVACY_POLICY_VERSION = "2026-09-14-draft";
