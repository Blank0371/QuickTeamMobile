// src/app/(tabs)/settings.tsx
import { router } from "expo-router";
import { AlertCircle, Copyright, FileText, Settings as Gear, Mail, Moon, Phone, ScrollText, Shield, Sun, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { HoldButton } from "../../components/HoldButton";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { APPLE_STANDARD_EULA_URL } from "../../lib/legal";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { Flag } from "../../components/Flag";

const LANGS = [
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "de" as const, flag: "🇩🇪", label: "Deutsch" },
  { code: "ru" as const, flag: "🇷🇺", label: "Русский" },
  { code: "es" as const, flag: "🇪🇸", label: "Español" },
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "uk" as const, flag: "🇺🇦", label: "Українська" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
];

// Legal documents listed in the Settings > Legal section, in display order.
const LEGAL_DOCS = [
  { id: "privacy", Icon: Shield },
  { id: "terms", Icon: FileText },
  { id: "eula", Icon: ScrollText },
  { id: "dmca", Icon: Copyright },
] as const;

const MODES = [
  { m: "light", Icon: Sun },
  { m: "dark", Icon: Moon },
  { m: "system", Icon: Gear },
] as const;

const SMS_CODE_LENGTH = 6;       // must match Supabase Auth → SMS OTP Length
const EMAIL_CODE_LENGTH = 8;     // must match Supabase Auth → Email OTP Length
const emailValid = (e: string) => /\S+@\S+\.\S+/.test(e.trim());
const phoneValid = (p: string) => /^\+[1-9]\d{6,14}$/.test(p.replace(/[\s()-]/g, ""));
const normalizePhone = (p: string) => p.replace(/[\s()-]/g, "");

/**
 * Prompts a single-channel account (email-only or phone-only) to add the other
 * channel to the same auth.users row, so one person = one account. Renders
 * nothing once both channels exist. Flow: banner → enter contact → send OTP →
 * enter code → verified and merged into the current auth user.
 */
function LinkChannelBanner() {
  const { user, addPhone, addEmail, verifyChannelChange } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();

  // Missing channel to offer. Bail if we can't tell, or both already present.
  const missing: "phone" | "email" | null = !user
    ? null
    : !user.phone
      ? "phone"
      : !user.email
        ? "email"
        : null;

  const [step, setStep] = useState<"banner" | "input" | "verify">("banner");
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  if (!missing || dismissed) return null;

  const isPhone = missing === "phone";
  const codeLen = isPhone ? SMS_CODE_LENGTH : EMAIL_CODE_LENGTH;
  const contactValid = isPhone ? phoneValid(contact) : emailValid(contact);
  const sendValue = isPhone ? normalizePhone(contact) : contact.trim();

  const reset = () => {
    setStep("banner"); setContact(""); setCode(""); setError(null);
  };

  const send = async () => {
    setBusy(true); setError(null);
    try {
      if (isPhone) await addPhone(sendValue);
      else await addEmail(sendValue);
      setStep("verify");
    } catch (e) {
      console.error("[link] send", e);
      setError(t("settings.link.error"));
    } finally { setBusy(false); }
  };

  const confirm = async () => {
    setBusy(true); setError(null);
    try {
      await verifyChannelChange(sendValue, code.trim(), missing);
      // user.phone / user.email now populated → this component unmounts itself.
    } catch (e) {
      console.error("[link] confirm", e);
      setError(t("settings.link.error"));
    } finally { setBusy(false); }
  };

  return (
    <View style={[styles.banner, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
      <View style={styles.bannerHead}>
        {isPhone ? <Phone color={theme.accent} size={20} /> : <Mail color={theme.accent} size={20} />}
        <Text style={[styles.bannerTitle, { color: theme.text }]}>
          {isPhone ? t("settings.link.addPhoneTitle") : t("settings.link.addEmailTitle")}
        </Text>
        {step === "banner" && (
          <Pressable onPress={() => setDismissed(true)} hitSlop={8}>
            <X color={theme.muted} size={18} />
          </Pressable>
        )}
      </View>

      {step === "banner" && (
        <>
          <Text style={[styles.bannerBody, { color: theme.muted }]}>
            {isPhone ? t("settings.link.addPhoneBody") : t("settings.link.addEmailBody")}
          </Text>
          <Pressable
            style={[styles.bannerBtn, { backgroundColor: theme.accent }]}
            onPress={() => setStep("input")}
          >
            <Text style={[styles.bannerBtnText, { color: theme.accentText }]}>{t("settings.link.add")}</Text>
          </Pressable>
        </>
      )}

      {step === "input" && (
        <>
          <TextInput
            style={[styles.bannerInput, { color: theme.text, borderColor: theme.border }]}
            placeholder={isPhone ? t("settings.link.phonePlaceholder") : t("settings.link.emailPlaceholder")}
            placeholderTextColor={theme.muted}
            keyboardType={isPhone ? "phone-pad" : "email-address"}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            value={contact}
            onChangeText={setContact}
          />
          {error && <Text style={styles.bannerError}>{error}</Text>}
          <View style={styles.bannerRow}>
            <Pressable style={styles.bannerLink} onPress={reset} disabled={busy}>
              <Text style={[styles.bannerLinkText, { color: theme.muted }]}>{t("settings.link.cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.bannerBtn, { backgroundColor: theme.accent, opacity: contactValid && !busy ? 1 : 0.5, flex: 1 }]}
              onPress={send}
              disabled={!contactValid || busy}
            >
              {busy ? <ActivityIndicator color={theme.accentText} />
                    : <Text style={[styles.bannerBtnText, { color: theme.accentText }]}>{t("settings.link.sendCode")}</Text>}
            </Pressable>
          </View>
        </>
      )}

      {step === "verify" && (
        <>
          <Text style={[styles.bannerBody, { color: theme.muted }]}>
            {t("settings.link.codeSent")} {sendValue}
          </Text>
          <TextInput
            style={[styles.bannerInput, styles.bannerCode, { color: theme.text, borderColor: theme.border }]}
            placeholder={t("settings.link.code")}
            placeholderTextColor={theme.muted}
            keyboardType="number-pad"
            autoFocus
            maxLength={codeLen}
            value={code}
            onChangeText={setCode}
          />
          {error && <Text style={styles.bannerError}>{error}</Text>}
          <View style={styles.bannerRow}>
            <Pressable style={styles.bannerLink} onPress={reset} disabled={busy}>
              <Text style={[styles.bannerLinkText, { color: theme.muted }]}>{t("settings.link.cancel")}</Text>
            </Pressable>
            <Pressable
              style={[styles.bannerBtn, { backgroundColor: theme.accent, opacity: code.length === codeLen && !busy ? 1 : 0.5, flex: 1 }]}
              onPress={confirm}
              disabled={code.length !== codeLen || busy}
            >
              {busy ? <ActivityIndicator color={theme.accentText} />
                    : <Text style={[styles.bannerBtnText, { color: theme.accentText }]}>{t("settings.link.confirm")}</Text>}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const { exitToSelection, signOut } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();

  const [langOpen, setLangOpen] = useState(false);
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0];

  // Sliding highlight: the box glides to the tapped mode (left animated),
  // and the theme swap fades the surrounding screen along with it.
  const modeIdx = Math.max(0, MODES.findIndex((x) => x.m === mode));
  const slide = useAnimatedStyle(() => ({
    left: withTiming(`${modeIdx * 33.33 + 1}%`, { duration: 220 }),
  }));

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t("settings.title")}</Text>

        {/* ---- Link the other login channel (phone/email) ---- */}
        <LinkChannelBanner />

        {/* ---- Connections ---- */}
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface }]}
          onPress={exitToSelection}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              {t("settings.manageConnections")}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>

        {/* ---- Appearance ---- */}
        <View style={[styles.segment, { backgroundColor: theme.surface }]}>
          <Animated.View
            pointerEvents="none"
            style={[styles.segmentHighlight, { backgroundColor: theme.bg }, slide]}
          />
          {MODES.map(({ m, Icon }) => {
            const active = mode === m;
            return (
              <Pressable
                key={m}
                style={styles.segmentItem}
                onPress={() => setMode(m)}
              >
                <Icon color={active ? theme.text : theme.muted} size={20} />
                <Text style={{ color: active ? theme.text : theme.muted, fontWeight: "600", fontSize: 13 }}>
                  {t(`settings.mode.${m}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ---- Language (dropdown) ---- */}
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface }]}
          onPress={() => setLangOpen((o) => !o)}
        >
          <Flag emoji={current.flag} size={22} style={styles.langFlag} />
          <Text style={[styles.langLabel, { color: theme.text }]}>{t("settings.language")}</Text>
          <Text style={[styles.chevron, { color: theme.muted }]}>{langOpen ? "▴" : "▾"}</Text>
        </Pressable>
        {langOpen && (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {LANGS.map((l, i) => (
              <Pressable
                key={l.code}
                style={[
                  styles.langRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                ]}
                onPress={() => { setLang(l.code); setLangOpen(false); }}
              >
                <Flag emoji={l.flag} size={22} style={styles.langFlag} />
                <Text style={[styles.langLabel, { color: theme.text }]}>{l.label}</Text>
                {lang === l.code && <Text style={[styles.check, { color: theme.accent }]}>✓</Text>}
              </Pressable>
            ))}
          </View>
        )}

        {/* ---- Notifications ---- */}
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface }]}
          onPress={() => router.push("/notifications")}
        >
          <Mail color={theme.text} size={22} />
          <Text style={[styles.rowText, { color: theme.text, flex: 1 }]}>
            {t("settings.notifications")}
          </Text>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>

        {/* ---- Feedback ---- */}
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface }]}
          onPress={() => router.push("/bug-report")}
        >
          <AlertCircle color={theme.text} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowText, { color: theme.text }]}>
              {t("settings.reportBug")}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>

        {/* ---- Legal ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>
          {t("legal.sectionTitle")}
        </Text>
        {LEGAL_DOCS.map(({ id, Icon }) => (
          <Pressable
            key={id}
            style={[styles.row, { backgroundColor: theme.surface }]}
            onPress={() =>
              id === "eula"
                ? Linking.openURL(APPLE_STANDARD_EULA_URL)
                : router.push({ pathname: "/legal/[doc]", params: { doc: id } })
            }
          >
            <Icon color={theme.text} size={22} />
            <Text style={[styles.rowText, { color: theme.text, flex: 1 }]}>
              {t(`legal.${id}.title`)}
            </Text>
            <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
          </Pressable>
        ))}

        {/* ---- Danger zone ---- */}
        <View style={styles.danger}>
          <HoldButton label={t("settings.signOut")} onConfirm={() => { signOut(); }} />
          <Text style={[styles.holdHint, { color: theme.muted }]}>{t("settings.holdToConfirm")}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16 },
  sectionLabel: {
    fontSize: 13, fontWeight: "600", textTransform: "uppercase",
    marginTop: 16, marginBottom: 4, letterSpacing: 0.5,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 12, padding: 16,
  },
  rowText: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 24 },
  segment: { flexDirection: "row", borderRadius: 12, padding: 4, position: "relative" },
  segmentHighlight: { position: "absolute", top: 4, bottom: 4, width: "32.5%", borderRadius: 8 },
  segmentItem: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center", gap: 5 },
  card: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  langRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  langFlag: { fontSize: 22 },
  langLabel: { fontSize: 16, fontWeight: "600", flex: 1 },
  check: { fontSize: 18, fontWeight: "800" },

  danger: { marginTop: 32, gap: 12 },
  holdHint: { fontSize: 13, textAlign: "center" },

  banner: { borderWidth: 1.5, borderRadius: 12, padding: 16, gap: 12 },
  bannerHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  bannerBody: { fontSize: 14, lineHeight: 20 },
  bannerBtn: { borderRadius: 999, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  bannerBtnText: { fontSize: 15, fontWeight: "700" },
  bannerInput: {
    borderWidth: 1.5, borderRadius: 8, paddingVertical: 12,
    paddingHorizontal: 12, fontSize: 16,
  },
  bannerCode: { fontSize: 22, letterSpacing: 6, fontWeight: "700", textAlign: "center" },
  bannerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  bannerLink: { paddingVertical: 12, paddingHorizontal: 8 },
  bannerLinkText: { fontSize: 15, fontWeight: "600" },
  bannerError: { color: "#C1442D", fontSize: 14 },
});
