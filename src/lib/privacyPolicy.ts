// Privacy policy version.
//
// HOW THIS WORKS
// Every user must agree to the current policy before using the app. The version
// they agreed to is stored on the device. When you change the policy, bump
// PRIVACY_POLICY_VERSION — every user is then re-prompted to agree on next launch.
//
// WHERE THE TEXT LIVES
// The policy body is the PRIVACY_EN / PRIVACY_DE constant in src/lib/legalDocs.ts
// (German for "de", English for every other language). Edit those to change the
// wording; legalBody() returns the right variant for the user's language.
//
// TO PUBLISH THE REAL POLICY
//   1. Edit PRIVACY_EN / PRIVACY_DE in src/lib/legalDocs.ts.
//   2. Bump PRIVACY_POLICY_VERSION (e.g. "2026-09-12-draft" -> "2026-10-01").
// That's it — the agreement prompt handles the rest.

export const PRIVACY_POLICY_VERSION = "2026-09-13-draft";
