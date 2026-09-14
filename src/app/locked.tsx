// src/app/locked.tsx — shown instead of the app when the entered position may
// not use it (see src/lib/access.ts):
// - "ended": the business's contract has ended (AGB § 6(2)); every role.
// - "paused": the trial expired without a payment method (AGB § 5(3)); managers
//   only, employees keep their schedule.
// Managers get a link to quickteam.at to subscribe again / add a payment method
// or export their data; the check re-runs when the in-app browser closes.
import * as WebBrowser from "expo-web-browser";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HoldButton } from "../components/HoldButton";
import { ScreenGradient } from "../components/ScreenGradient";
import { useAuth } from "../context/auth";
import { useI18n } from "../i18n/I18nProvider";
import { websiteUrl } from "../lib/legal";
import { useTheme } from "../theme/ThemeProvider";

export default function LockedScreen() {
  const { block, activeMitarbeiter, recheckAccess, exitToSelection, signOut } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  if (!block) return null;
  const { kind, betriebName, canSwitch } = block;
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const openWebsite = async () => {
    // The dashboard sends a signed-in manager on: to the payment step after a
    // cancellation, to the "trial expired" page during a pause.
    await WebBrowser.openBrowserAsync(websiteUrl("/dashboard", lang));
    recheckAccess();
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScreenGradient />
      <ScrollView contentContainerStyle={styles.content}>
        {betriebName ? (
          <Text style={[styles.business, { color: theme.muted }]}>{betriebName}</Text>
        ) : null}
        <Text style={[styles.title, { color: theme.text }]}>{t(`locked.${kind}.title`)}</Text>
        <Text style={[styles.body, { color: theme.text }]}>{t(`locked.${kind}.text`)}</Text>
        <Text style={[styles.body, { color: theme.text }]}>
          {kind === "paused"
            ? t("locked.paused.more")
            : t(isChef ? "locked.ended.deletionManager" : "locked.ended.deletion")}
        </Text>

        {isChef && (
          <Pressable style={[styles.primary, { backgroundColor: theme.accent }]} onPress={openWebsite}>
            <Text style={[styles.primaryText, { color: theme.accentText }]}>{t("locked.openWebsite")}</Text>
          </Pressable>
        )}

        {canSwitch && (
          <View style={styles.switchBlock}>
            <Text style={[styles.hint, { color: theme.muted }]}>{t(`locked.${kind}.others`)}</Text>
            <Pressable
              style={[styles.secondary, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={exitToSelection}
            >
              <Text style={[styles.secondaryText, { color: theme.text }]}>{t("locked.switch")}</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <View style={styles.danger}>
        <HoldButton label={t("select.signOut")} onConfirm={() => { signOut(); }} />
        <Text style={[styles.hint, { color: theme.muted, textAlign: "center" }]}>{t("settings.holdToConfirm")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12 },
  content: { gap: 14, paddingBottom: 24 },
  business: { fontSize: 15, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700" },
  body: { fontSize: 15, lineHeight: 22 },
  hint: { fontSize: 13 },
  primary: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 6 },
  primaryText: { fontSize: 16, fontWeight: "600" },
  switchBlock: { gap: 8, marginTop: 6 },
  secondary: { borderRadius: 999, borderWidth: 1.5, paddingVertical: 14, alignItems: "center" },
  secondaryText: { fontSize: 16, fontWeight: "600" },
  danger: { gap: 10 },
});
