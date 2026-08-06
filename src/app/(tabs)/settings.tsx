// src/app/(tabs)/settings.tsx
import { router } from "expo-router";
import { AlertCircle, Copyright, FileText, Settings as Gear, Mail, Moon, ScrollText, Shield, Sun } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { APPLE_STANDARD_EULA_URL } from "../../lib/legal";
import { useTheme } from "../../theme/ThemeProvider";

const LANGS = [
  { code: "en" as const, flag: "🇬🇧", label: "English" },
  { code: "de" as const, flag: "🇩🇪", label: "Deutsch" },
  { code: "ru" as const, flag: "🇷🇺", label: "Русский" },
  { code: "fr" as const, flag: "🇫🇷", label: "Français" },
  { code: "tr" as const, flag: "🇹🇷", label: "Türkçe" },
  { code: "uk" as const, flag: "🇺🇦", label: "Українська" },
];

// Legal documents listed in the Settings > Legal section, in display order.
const LEGAL_DOCS = [
  { id: "privacy", Icon: Shield },
  { id: "terms", Icon: FileText },
  { id: "eula", Icon: ScrollText },
  { id: "dmca", Icon: Copyright },
] as const;

const HOLD_MS = 3000;

// Destructive button that only fires after being held for 3s, with a fill that
// grows left→right to show the remaining time.
function HoldButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const progress = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const start = () => {
    progress.value = withTiming(1, { duration: HOLD_MS }, (finished) => {
      if (finished) runOnJS(onConfirm)();
    });
  };
  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={styles.dangerBtn}
      delayLongPress={HOLD_MS}
    >
      <Animated.View pointerEvents="none" style={[styles.dangerFill, fillStyle]} />
      <Text style={styles.dangerText}>{label}</Text>
    </Pressable>
  );
}

const MODES = [
  { m: "light", Icon: Sun },
  { m: "dark", Icon: Moon },
  { m: "system", Icon: Gear },
] as const;

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
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>{t("settings.title")}</Text>

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
          <Text style={styles.langFlag}>{current.flag}</Text>
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
                <Text style={styles.langFlag}>{l.flag}</Text>
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
  dangerBtn: {
    backgroundColor: "#dc2626", borderRadius: 999, paddingVertical: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  dangerFill: {
    position: "absolute", left: 0, top: 0, bottom: 0,
    backgroundColor: "#7f1d1d",
  },
  dangerText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  holdHint: { fontSize: 13, textAlign: "center" },
});
