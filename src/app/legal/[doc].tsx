// src/app/legal/[doc].tsx — full-text viewer for a single legal document
// (privacy, terms, eula, dmca). Reached from Settings > Legal.
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../i18n/I18nProvider";
import { LEGAL_DOC_IDS } from "../../lib/legal";
import { legalBody, LegalDocId } from "../../lib/legalDocs";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";

export default function LegalDocScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { doc } = useLocalSearchParams<{ doc: string }>();

  const id: LegalDocId = LEGAL_DOC_IDS.includes(doc as LegalDocId)
    ? (doc as LegalDocId)
    : "privacy";

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {t(`legal.${id}.title`)}
        </Text>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.body, { color: theme.text }]}>{legalBody(id, lang)}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 32, alignItems: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 40 },
  body: { fontSize: 14, lineHeight: 20 },
});
