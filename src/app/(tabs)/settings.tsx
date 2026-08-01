// src/app/(tabs)/settings.tsx
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

export default function SettingsScreen() {
  const { user } = useAuth();
  const { theme, mode, setMode } = useTheme();
  const { t, lang, setLang } = useI18n();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("settings.title")}
        </Text>

        {/* ---- Account ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>
          {t("settings.account")}
        </Text>
        <Pressable
          style={[styles.row, { backgroundColor: theme.surface }]}
          onPress={() => router.push("/accounts")}
        >
          <View>
            <Text style={[styles.rowText, { color: theme.text }]}>
              {user?.email ?? t("settings.currentAccount")}
            </Text>
            <Text style={[styles.rowSub, { color: theme.muted }]}>
              {t("settings.manageAccounts")}
            </Text>
          </View>
          <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
        </Pressable>

        {/* ---- Appearance ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>
          {t("settings.appearance")}
        </Text>
        <View style={[styles.segment, { backgroundColor: theme.surface }]}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Pressable
              key={m}
              style={[
                styles.segmentItem,
                mode === m && { backgroundColor: theme.bg },
              ]}
              onPress={() => setMode(m)}
            >
              <Text style={{ color: mode === m ? theme.text : theme.muted, fontWeight: "600" }}>
                {t(`settings.mode.${m}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* ---- Language ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>
          {t("settings.language")}
        </Text>
        <View style={[styles.segment, { backgroundColor: theme.surface }]}>
          {(["en", "de"] as const).map((l) => (
            <Pressable
              key={l}
              style={[
                styles.segmentItem,
                lang === l && { backgroundColor: theme.bg },
              ]}
              onPress={() => setLang(l)}
            >
              <Text style={{ color: lang === l ? theme.text : theme.muted, fontWeight: "600" }}>
                {t(`settings.lang.${l}`)}
              </Text>
            </Pressable>
          ))}
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
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderRadius: 12, padding: 16,
  },
  rowText: { fontSize: 16, fontWeight: "600" },
  rowSub: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 24 },
  segment: {
    flexDirection: "row", borderRadius: 12, padding: 4, gap: 4,
  },
  segmentItem: {
    flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center",
  },
});