// src/app/(tabs)/manager.tsx — placeholder while the manager area is built
import { Construction } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

export default function Manager() {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <Construction color={theme.accent} size={64} strokeWidth={1.5} />
      <Text style={[styles.title, { color: theme.text }]}>{t("manager.title")}</Text>
      <Text style={[styles.sub, { color: theme.muted }]}>{t("manager.inDevelopment")}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 15, textAlign: "center" },
});
