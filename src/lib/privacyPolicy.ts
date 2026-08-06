// Privacy policy version.
//
// HOW THIS WORKS
// Every user must agree to the current policy before using the app. The version
// they agreed to is stored on the device. When you change the policy, bump
// PRIVACY_POLICY_VERSION — every user is then re-prompted to agree on next launch.
//
// WHERE THE TEXT LIVES
// The policy body is translated per language under the "privacy.body" key in
// each file in src/i18n/locales/*.json. Edit those to change the wording; the
// app shows the body for the user's current language automatically.
//
// TO PUBLISH THE REAL POLICY
//   1. Replace the "privacy.body" text in each locale file (en, de, fr, ru, tr, uk).
//   2. Bump PRIVACY_POLICY_VERSION (e.g. "2026-08-06-draft" -> "2026-09-01").
// That's it — the agreement prompt handles the rest.

export const PRIVACY_POLICY_VERSION = "2026-08-07-draft";
