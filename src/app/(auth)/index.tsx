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
import { ScreenGradient } from "../../components/ScreenGradient";
import { Flag } from "../../components/Flag";

type Mode = "signIn" | "signUp" | "verify" | "forgot" | "reset" | "phone" | "phoneVerify";

const OK = "#16a34a";
const BAD = "#C1442D";
const CODE_LENGTH = 8; // must match Supabase Auth → Email OTP Length
const SMS_CODE_LENGTH = 6; // must match Supabase Auth → SMS OTP Length
const emailValid = (e: string) => /\S+@\S+\.\S+/.test(e.trim());
// E.164-ish: leading "+", country code, then at least ~6 more digits.
const phoneValid = (p: string) => /^\+[1-9]\d{6,14}$/.test(p.replace(/[\s()-]/g, ""));
const normalizePhone = (p: string) => p.replace(/[\s()-]/g, "");

const LANGS = [
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "de" as const, flag: "🇩🇪", label: "Deutsch" },
  { code: "ru" as const, flag: "🇷🇺", label: "Русский" },
  { code: "es" as const, flag: "🇪🇸", label: "Español" },
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "uk" as const, flag: "🇺🇦", label: "Українська" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
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
        <Flag emoji={current.flag} size={22} style={styles.langFlag} />
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
              <Flag emoji={l.flag} size={22} style={styles.langFlag} />
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
  const { signIn, signUp, verifySignUp, resendCode, sendPasswordReset, confirmPasswordReset,
          signInWithPhone, verifyPhone } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const [view, setView] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
    if (next === "signIn" || next === "signUp" || next === "forgot") {
      setPassword(""); setConfirm("");
    }
    if (next !== "verify" && next !== "reset") setCode("");
  };

  // Surface a friendly message to the user; log the real error for developers.
  const fail = (context: string, e: unknown) => {
    console.error(`[auth] ${context}`, e);
    setError(t("auth.genericError"));
  };

  const doSignIn = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      fail("signIn", e);
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
    } catch (e) {
      fail("signUp", e);
    } finally { setBusy(false); }
  };

  const doVerify = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await verifySignUp(email.trim(), code.trim());
    } catch (e) {
      fail("verifySignUp", e);
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(null); setNotice(null);
    try {
      await resendCode(email.trim());
      setNotice(t("auth.codeResent"));
    } catch (e) {
      fail("resendCode", e);
    }
  };

  const doForgot = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await sendPasswordReset(email.trim());
      go("reset");
      setNotice(t("auth.resetSent"));
    } catch (e) {
      fail("sendPasswordReset", e);
    } finally { setBusy(false); }
  };

  const doReset = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await confirmPasswordReset(email.trim(), code.trim(), password);
      // Verifying the recovery code signs the user in; auth state change routes onward.
    } catch (e) {
      fail("confirmPasswordReset", e);
    } finally { setBusy(false); }
  };

  const doPhoneStart = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await signInWithPhone(normalizePhone(phone));
      go("phoneVerify");
    } catch (e) {
      fail("signInWithPhone", e);
    } finally { setBusy(false); }
  };

  const doPhoneVerify = async () => {
    setBusy(true); setError(null); setNotice(null);
    try {
      await verifyPhone(normalizePhone(phone), code.trim());
      // A valid code opens a session; auth state change routes onward.
    } catch (e) {
      fail("verifyPhone", e);
    } finally { setBusy(false); }
  };

  const resendPhone = async () => {
    setError(null); setNotice(null);
    try {
      await signInWithPhone(normalizePhone(phone));
      setNotice(t("auth.codeResent"));
    } catch (e) {
      fail("signInWithPhone", e);
    }
  };

  const enterBtn = (label: string, onPress: () => void, enabled: boolean) => (
    <Pressable
      style={[styles.enter, { backgroundColor: enabled ? theme.accent : theme.surface }]}
      onPress={onPress}
      disabled={!enabled || busy}
    >
      {busy ? <ActivityIndicator color={enabled ? theme.accentText : theme.muted} />
            : <Text style={[styles.enterText, { color: enabled ? theme.accentText : theme.muted }]}>{label}</Text>}
    </Pressable>
  );

  // ---------- phone sign-in (enter number) ----------
  if (view === "phone") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScreenGradient />
        <LangSwitcher />
        <Animated.View style={styles.form} key={lang} entering={FadeIn.duration(T)}>
          <Text style={[styles.title, { color: theme.text }]}>{t("auth.phoneTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{t("auth.phoneSubtitle")}</Text>

          <TextInput
            style={inputStyle}
            placeholder={t("auth.phonePlaceholder")}
            placeholderTextColor={theme.muted}
            keyboardType="phone-pad"
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            value={phone}
            onChangeText={setPhone}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {enterBtn(t("auth.sendCode"), doPhoneStart, phoneValid(phone))}

          <Pressable onPress={() => go("signIn")} hitSlop={8}>
            <Text style={[styles.link, { color: theme.muted }]}>{t("auth.useEmailInstead")}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ---------- phone verify (SMS code) ----------
  if (view === "phoneVerify") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScreenGradient />
        <LangSwitcher />
        <Animated.View style={styles.form} key={lang} entering={FadeIn.duration(T)}>
          <Text style={[styles.title, { color: theme.text }]}>{t("auth.verifyTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t("auth.verifySubtitle")} {phone}
          </Text>

          <TextInput
            style={[...inputStyle, styles.codeInput]}
            placeholder={t("auth.code")}
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            autoFocus
            maxLength={SMS_CODE_LENGTH}
            value={code}
            onChangeText={setCode}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={[styles.notice, { color: theme.muted }]}>{notice}</Text>}

          {enterBtn(t("auth.verify"), doPhoneVerify, code.length === SMS_CODE_LENGTH)}

          <Pressable onPress={resendPhone} hitSlop={8}>
            <Text style={[styles.link, { color: theme.accent }]}>{t("auth.resend")}</Text>
          </Pressable>
          <Pressable onPress={() => go("phone")} hitSlop={8}>
            <Text style={[styles.link, { color: theme.muted }]}>{t("auth.back")}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ---------- forgot password (request code) ----------
  if (view === "forgot") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScreenGradient />
        <LangSwitcher />
        <Animated.View style={styles.form} key={lang} entering={FadeIn.duration(T)}>
          <Text style={[styles.title, { color: theme.text }]}>{t("auth.forgotTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{t("auth.forgotSubtitle")}</Text>

          <TextInput
            style={inputStyle}
            placeholder={t("auth.email")}
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            autoFocus
            value={email}
            onChangeText={setEmail}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          {enterBtn(t("auth.sendCode"), doForgot, emailValid(email))}

          <Pressable onPress={() => go("signIn")} hitSlop={8}>
            <Text style={[styles.link, { color: theme.muted }]}>{t("auth.back")}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ---------- reset password (code + new password) ----------
  if (view === "reset") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScreenGradient />
        <LangSwitcher />
        <Animated.View style={styles.form} key={lang} entering={FadeIn.duration(T)}>
          <Text style={[styles.title, { color: theme.text }]}>{t("auth.resetTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t("auth.verifySubtitle")} {email}
          </Text>

          <TextInput
            style={[...inputStyle, styles.codeInput]}
            placeholder={t("auth.code")}
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            autoFocus
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={setCode}
          />
          <TextInput
            style={inputStyle}
            placeholder={t("auth.password")}
            placeholderTextColor={theme.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
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

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={[styles.notice, { color: theme.muted }]}>{notice}</Text>}

          {enterBtn(t("auth.resetPassword"), doReset, code.length === CODE_LENGTH && pwValid)}

          <Pressable onPress={() => go("signIn")} hitSlop={8}>
            <Text style={[styles.link, { color: theme.muted }]}>{t("auth.back")}</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ---------- verify (6-digit code) ----------
  if (view === "verify") {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <ScreenGradient />
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
            maxLength={CODE_LENGTH}
            value={code}
            onChangeText={setCode}
          />

          {error && <Text style={styles.error}>{error}</Text>}
          {notice && <Text style={[styles.notice, { color: theme.muted }]}>{notice}</Text>}

          {enterBtn(t("auth.verify"), doVerify, code.length === CODE_LENGTH)}

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
      <ScreenGradient />
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

        {!isSignUp && (
          <>
            <Pressable onPress={() => go("forgot")} hitSlop={8}>
              <Text style={[styles.link, { color: theme.accent }]}>{t("auth.forgotLink")}</Text>
            </Pressable>
            <Pressable onPress={() => go("phone")} hitSlop={8}>
              <Text style={[styles.link, { color: theme.accent, marginTop: 8 }]}>{t("auth.usePhoneInstead")}</Text>
            </Pressable>
          </>
        )}

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
  error: { color: "#C1442D", textAlign: "center" },
  notice: { textAlign: "center" },

  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  switchText: { fontSize: 15 },
  switchLink: { fontSize: 15, fontWeight: "700" },
});
