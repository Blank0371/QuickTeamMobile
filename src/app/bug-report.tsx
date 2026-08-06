// src/app/bug-report.tsx — user reports a bug/problem, stored in Supabase
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";

const TEXT_LIMIT = 1000;

export default function BugReportScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const canSend = text.trim().length > 0 && !busy;

  const submit = async () => {
    setBusy(true); setError(null);
    const { error: e } = await supabase
      .from("bug_reports")
      .insert({ text: text.trim() });
    setBusy(false);
    if (e) { setError(t("settings.bugReport.error")); return; }
    setDone(true);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>
          {t("settings.bugReport.title")}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {done ? (
          <Text style={[styles.success, { color: theme.text }]}>
            {t("settings.bugReport.success")}
          </Text>
        ) : (
          <>
            <Text style={[styles.description, { color: theme.muted }]}>
              {t("settings.bugReport.description")}
            </Text>

            <TextInput
              style={[
                styles.input,
                { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface },
              ]}
              placeholder={t("settings.bugReport.placeholder")}
              placeholderTextColor={theme.muted}
              value={text}
              onChangeText={setText}
              maxLength={TEXT_LIMIT}
              multiline
              autoFocus
            />
            <Text style={[styles.counter, { color: text.length >= TEXT_LIMIT ? "#dc2626" : theme.muted }]}>
              {text.length}/{TEXT_LIMIT}
            </Text>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              style={[styles.submit, { backgroundColor: canSend ? theme.accent : theme.surface }]}
              onPress={submit}
              disabled={!canSend}
            >
              {busy
                ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.submitText, { color: canSend ? "#fff" : theme.muted }]}>
                    {t("settings.bugReport.submit")}
                  </Text>}
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
  content: { padding: 16, gap: 12 },
  description: { fontSize: 15, lineHeight: 20 },
  input: {
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14,
    fontSize: 16, minHeight: 160, textAlignVertical: "top",
  },
  counter: { fontSize: 12, textAlign: "right" },
  submit: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  submitText: { fontSize: 16, fontWeight: "700" },
  success: { fontSize: 17, fontWeight: "600", textAlign: "center", marginTop: 24 },
  error: { color: "#dc2626", textAlign: "center" },
});
