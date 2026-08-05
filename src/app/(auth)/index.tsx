// src/app/(auth)/index.tsx
import { useState } from "react";
import {
    ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

type Mode = "signIn" | "signUp" | "verify";

const OK = "#16a34a";
const BAD = "#dc2626";
const emailValid = (e: string) => /\S+@\S+\.\S+/.test(e.trim());

const LANGS = [
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "de" as const, flag: "🇩🇪", label: "Deutsch" },
  { code: "ru" as const, flag: "🇷🇺", label: "Русский" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "uk" as const, flag: "🇺🇦", label: "Українська" },
];

function LangSwitcher() {
  const { lang, setLang } = useI18n();
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  return (
    <View style={styles.langWrap}>
      <Pressable
        style={[styles.langBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setOpen((o) => !o)}
        hitSlop={8}
      >
        <Text style={styles.langFlag}>{current.flag}</Text>
        <Text style={[styles.langChevron, { color: theme.muted }]}>▾</Text>
      </Pressable>

      {open && (
        <View style={[styles.langMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {LANGS.map((l) => (
            <Pressable
              key={l.code}
              style={styles.langItem}
              onPress={() => { setLang(l.code); setOpen(false); }}
            >
              <Text style={styles.langFlag}>{l.flag}</Text>
              <Text style={[styles.langLabel, { color: theme.text }]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function Rule({ ok, label, color }: { ok: boolean; label: string; color: string }) {
  return (
    <View style={styles.ruleRow}>
      <View style={[styles.dot, { backgroundColor: ok ? OK : BAD }]}>
        <Text style={styles.dotMark}>{ok ? "✓" : "✕"}</Text>
      </View>
      <Text style={[styles.ruleText, { color }]}>{label}</Text>
    </View>
  );
}

export default function AuthScreen() {
  const { signIn, signUp, verifySignUp, resendCode } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const [view, setView] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const T = 250;
  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border }];

  const rules = [
    { ok: password.length >= 8, label: t("auth.pwRuleLength") },
    { ok: /[A-Z]/.test(password), label: t("auth.pwRuleUpper") },
    { ok: /[a-z]/.test(password), label: t("auth.pwRuleLower") },
    { ok: password.length > 0 && password === confirm, label: t("auth.pwRuleMatch") },
  ];
  const pwValid = rules.every((r) => r.ok);
  const canSignIn = emailValid(email) && password.length > 0;
  const canSignUp = emailValid(email) && pwValid;

  const go = (next: Mode) => {
    setView(next);
    setError(null);
    setNotice(null);
    if (next !== "verify") { setPassword(""); setConfirm(""); }
  };

  const doSignIn = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  const doSignUp = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      const { needsVerification, alreadyRegistered } = await signUp(email.trim(), password);
      if (alreadyRegistered) {
        setView("signIn");
        setPassword(""); setConfirm("");
        setError(t("auth.alreadyRegistered"));
      } else if (needsVerification) {
        go("verify");
      }
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  const doVerify = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await verifySignUp(email.trim(), code.trim());
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(null); setNotice(null);
    try {
      await resendCode(email.trim());
      setNotice(t("auth.codeResent"));
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    }
  };

  const enterBtn = (label: string, onPress: () => void, enabled: boolean) => (
    <Pressable
      style={[styles.enter, { backgroundColor: enabled ? theme.accent : theme.surface }]}
      onPress={onPress}
      disabled={!enabled || busy}
    >
      {busy ? <ActivityIndicator color={enabled ? "#fff" : theme.muted} />
            : <Text style={[styles.enterText, { color: enabled ? "#fff" : theme.muted }]}>{label}</Text>}
    </Pressable>
  );

  // ---------- verify (6-digit code) ----------
  if (view === "verify") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <LangSwitcher />
        <Animated.View style={styles.form} key={lang} entering={FadeIn.duration(T)}>
          <Text style={[styles.title, { color: theme.text }]}>{t("auth.verifyTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t("auth.verifySubtitle")} {email}
          </Text>

          <TextInput
            style={[...inputStyle, styles.codeInput]}
            placeholder={t("auth.code")}
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            autoFocus
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={[styles.notice, { color: theme.muted }]}>{notice}</Text>}

          {enterBtn(t("auth.verify"), doVerify, code.length === 6)}

          <Pressable onPress={resend} hitSlop={8}>
            <Text style={[styles.link, { color: theme.accent }]}>{t("auth.resend")}</Text>
          </Pressable>
          <Pressable onPress={() => go("signIn")} hitSlop={8}>
            <Text style={[styles.link, { color: theme.muted }]}>{t("auth.back")}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  const isSignUp = view === "signUp";

  // ---------- sign in / sign up ----------
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <LangSwitcher />
      <View style={styles.form} key={lang}>
        <Text style={[styles.title, { color: theme.text }]}>
          {isSignUp ? t("auth.signUp") : t("auth.signIn")}
        </Text>

        <TextInput
          style={inputStyle}
          placeholder={t("auth.email")}
          placeholderTextColor={theme.muted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={inputStyle}
          placeholder={t("auth.password")}
          placeholderTextColor={theme.muted}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {isSignUp && (
          <>
            <TextInput
              style={inputStyle}
              placeholder={t("auth.confirmPassword")}
              placeholderTextColor={theme.muted}
              secureTextEntry
              value={confirm}
              onChangeText={setConfirm}
            />
            <View style={styles.rules}>
              {rules.map((r) => (
                <Rule key={r.label} ok={r.ok} label={r.label} color={theme.muted} />
              ))}
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        {isSignUp
          ? enterBtn(t("auth.signUp"), doSignUp, canSignUp)
          : enterBtn(t("auth.signIn"), doSignIn, canSignIn)}

        <View style={styles.switchRow}>
          <Text style={[styles.switchText, { color: theme.muted }]}>
            {isSignUp ? t("auth.haveAccount") : t("auth.noAccount")}
          </Text>
          <Pressable onPress={() => go(isSignUp ? "signIn" : "signUp")} hitSlop={8}>
            <Text style={[styles.switchLink, { color: theme.accent }]}>
              {isSignUp ? t("auth.signIn") : t("auth.signUp")}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },

  langWrap: { alignItems: "flex-end", zIndex: 10 },
  langBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
  },
  langFlag: { fontSize: 22 },
  langChevron: { fontSize: 12, fontWeight: "700" },
  langMenu: {
    position: "absolute", top: 48, right: 0, minWidth: 160,
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 4, overflow: "hidden",
  },
  langItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  langLabel: { fontSize: 15, fontWeight: "600" },

  form: { flex: 1, justifyContent: "center", gap: 12 },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 8 },

  input: {
    borderWidth: 1.5, borderRadius: 4, paddingVertical: 14,
    paddingHorizontal: 12, fontSize: 16, textAlign: "center",
  },
  codeInput: { fontSize: 28, letterSpacing: 8, fontWeight: "700" },

  rules: { gap: 8, paddingHorizontal: 4, marginTop: 2 },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  dotMark: { color: "#fff", fontSize: 11, fontWeight: "800", lineHeight: 14 },
  ruleText: { fontSize: 14 },

  enter: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 16 },
  enterText: { fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, fontSize: 15, fontWeight: "600" },
  error: { color: "#dc2626", textAlign: "center" },
  notice: { textAlign: "center" },

  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  switchText: { fontSize: 15 },
  switchLink: { fontSize: 15, fontWeight: "700" },
});
