// src/app/delete-account.tsx — self-service account deletion.
// Deliberately multi-step and hard to trigger by accident: a warning screen with
// an explicit "Continue", then a confirm screen that requires re-entering the
// password (or typing a confirmation word for password-less phone accounts) AND
// a 3-second press-and-hold before anything is deleted. Satisfies Apple Guideline
// 5.1.1(v) and the GDPR right to erasure.
import { router } from "expo-router";
import { ChevronLeft, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HoldButton } from "../components/HoldButton";
import { ScreenGradient } from "../components/ScreenGradient";
import { useAuth } from "../context/auth";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

export default function DeleteAccountScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { user, deleteAccount } = useAuth();

  // Email accounts re-authenticate with their password; password-less phone
  // accounts confirm by typing the word shown on screen instead.
  const hasPassword = !!user?.email;
  const confirmWord = t("deleteAccount.confirmWord");

  const [step, setStep] = useState<"warn" | "confirm">("warn");
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canConfirm = !busy && (hasPassword
    ? password.length > 0
    : phrase.trim().toLowerCase() === confirmWord.trim().toLowerCase());

  const bullets = [
    t("deleteAccount.bullet1"),
    t("deleteAccount.bullet2"),
    t("deleteAccount.bullet3"),
    t("deleteAccount.bullet4"),
  ];

  const runDelete = async () => {
    setBusy(true); setError(null);
    try {
      await deleteAccount(hasPassword ? password : undefined);
      // Success: deleteAccount() signs out, so the root navigator swaps to the
      // auth stack automatically and this screen unmounts. Nothing to route.
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg === "REAUTH_FAILED") setError(t("deleteAccount.wrongPassword"));
      else if (msg.includes("CHEF_MIT_MITGLIEDERN")) setError(t("deleteAccount.chefBlocked"));
      else setError(t("deleteAccount.error"));
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScreenGradient />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back} disabled={busy}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("deleteAccount.title")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === "warn" ? (
          <>
            <View style={styles.iconWrap}>
              <TriangleAlert color={theme.danger} size={48} />
            </View>
            <Text style={[styles.lead, { color: theme.text }]}>
              {t("deleteAccount.lead")}
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.danger }]}>
              {bullets.map((b, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletDot, { color: theme.danger }]}>•</Text>
                  <Text style={[styles.bulletText, { color: theme.text }]}>{b}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.note, { color: theme.muted }]}>
              {t("deleteAccount.irreversible")}
            </Text>

            <Pressable
              style={[styles.continueBtn, { backgroundColor: theme.danger }]}
              onPress={() => { setError(null); setStep("confirm"); }}
            >
              <Text style={styles.continueText}>{t("deleteAccount.continue")}</Text>
            </Pressable>
            <Pressable style={styles.cancelLink} onPress={() => router.back()}>
              <Text style={[styles.cancelText, { color: theme.muted }]}>{t("deleteAccount.cancel")}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.lead, { color: theme.text }]}>
              {hasPassword
                ? t("deleteAccount.confirmPassword")
                : t("deleteAccount.confirmPhrase", { word: confirmWord })}
            </Text>

            {hasPassword ? (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder={t("deleteAccount.passwordPlaceholder")}
                placeholderTextColor={theme.muted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                editable={!busy}
              />
            ) : (
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
                placeholder={confirmWord}
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                autoFocus
                value={phrase}
                onChangeText={(v) => { setPhrase(v); setError(null); }}
                editable={!busy}
              />
            )}

            {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}

            <View style={styles.holdWrap}>
              {canConfirm ? (
                <HoldButton
                  label={busy ? "" : t("deleteAccount.holdToDelete")}
                  onConfirm={runDelete}
                  color={theme.danger}
                />
              ) : (
                <View style={[styles.holdDisabled, { backgroundColor: theme.surface }]}>
                  <Text style={[styles.holdDisabledText, { color: theme.muted }]}>
                    {t("deleteAccount.holdToDelete")}
                  </Text>
                </View>
              )}
              {busy && <ActivityIndicator style={styles.spinner} color={theme.accentText} />}
            </View>
            <Text style={[styles.note, { color: theme.muted, textAlign: "center" }]}>
              {t("settings.holdToConfirm")}
            </Text>

            <Pressable style={styles.cancelLink} onPress={() => router.back()} disabled={busy}>
              <Text style={[styles.cancelText, { color: theme.muted }]}>{t("deleteAccount.cancel")}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  back: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  content: { padding: 20, gap: 16 },
  iconWrap: { alignItems: "center", marginTop: 8 },
  lead: { fontSize: 17, fontWeight: "600", lineHeight: 24 },
  card: { borderWidth: 1.5, borderRadius: 12, padding: 16, gap: 10 },
  bulletRow: { flexDirection: "row", gap: 8 },
  bulletDot: { fontSize: 16, fontWeight: "800", lineHeight: 22 },
  bulletText: { fontSize: 15, lineHeight: 22, flex: 1 },
  note: { fontSize: 13, lineHeight: 18 },
  continueBtn: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  continueText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  cancelLink: { paddingVertical: 14, alignItems: "center" },
  cancelText: { fontSize: 15, fontWeight: "600" },
  input: {
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 14, fontSize: 16,
  },
  error: { fontSize: 14, textAlign: "center" },
  holdWrap: { justifyContent: "center" },
  holdDisabled: { borderRadius: 999, paddingVertical: 16, alignItems: "center" },
  holdDisabledText: { fontSize: 16, fontWeight: "700" },
  spinner: { position: "absolute", alignSelf: "center" },
});
