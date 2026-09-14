// Server-side proof that a person took note of the privacy policy.
//
// The gate (LegalConsentGate) stores what was noted on the device only — lost
// on reinstall, and no proof to anyone else. This writes the same fact to
// rechtliche_zustimmungen, the table the website uses:
//
// - Only the privacy policy ("datenschutz", art 'persoenlich'). AGB and AVV are
//   the business's contract, accepted by a chef on the website; the insert
//   policy zustimmung_insert_betrieblich would refuse them from here anyway.
// - One row per business: betrieb_id is required, and the gate runs before
//   sign-in, when there is no business yet. So the row is written on entering
//   a business, for the version noted on this device.
// - Idempotent (unique index on betrieb_id, auth_id, dokument, version, and
//   ON CONFLICT DO NOTHING). It runs on every entry, so a failed write — offline,
//   a server error — simply lands on a later one. It never blocks the app.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { consentStorageKey, NOTED_LANG_KEY } from "./legal";
import { PRIVACY_POLICY_HASH, PRIVACY_POLICY_VERSION } from "./privacyPolicy";
import { supabase } from "./supabase";

export async function recordPrivacyNoted(betriebId: string, authId: string, appLang: string): Promise<void> {
  try {
    const [noted, notedLang] = await Promise.all([
      AsyncStorage.getItem(consentStorageKey("privacy")),
      AsyncStorage.getItem(NOTED_LANG_KEY),
    ]);
    // Only the current version, and only once it was actually noted here.
    if (noted !== PRIVACY_POLICY_VERSION) return;
    const { error } = await supabase.from("rechtliche_zustimmungen").upsert(
      {
        betrieb_id: betriebId,
        auth_id: authId,
        dokument: "datenschutz",
        version: PRIVACY_POLICY_VERSION,
        // The language of the text that was shown (the app has de and en; every
        // other app language reads the English one). Noted before this was
        // stored → the app language now is the best remaining answer.
        sprache: notedLang ?? (appLang === "de" ? "de" : "en"),
        inhalt_hash: PRIVACY_POLICY_HASH,
      },
      { onConflict: "betrieb_id,auth_id,dokument,version", ignoreDuplicates: true },
    );
    if (error) console.warn("[consent] record failed", error.message);
  } catch (e) {
    console.warn("[consent] record failed", e);
  }
}
