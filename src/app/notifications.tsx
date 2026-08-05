// src/app/notifications.tsx — per-user notification preferences
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

// Categories mirror the message/notification types. A category can be toggled
// as a whole (master switch) or per item.
const CATEGORIES = [
  { key: "messages", items: ["announcement", "tasks", "shiftSwitch", "polls", "documents"] },
  { key: "schedule", items: ["planPublished", "shiftChanged", "availabilityReminder", "understaffing"] },
] as const;

const STORAGE_KEY = "notifPrefs";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      setPrefs(raw ? JSON.parse(raw) : {});
      setLoaded(true);
    });
  }, []);

  const isOn = (k: string) => prefs[k] !== false; // default on

  const persist = (next: Record<string, boolean>) => {
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggleItem = (k: string) => persist({ ...prefs, [k]: !isOn(k) });

  const toggleCategory = (items: readonly string[]) => {
    const allOn = items.every(isOn);
    const next = { ...prefs };
    items.forEach((k) => { next[k] = !allOn; });
    persist(next);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t("notifications.title")}</Text>
      </View>

      {loaded && (
        <ScrollView contentContainerStyle={styles.content}>
          {CATEGORIES.map((cat) => {
            const expanded = open[cat.key] ?? false;
            return (
              <View key={cat.key} style={styles.section}>
                <Pressable
                  style={[styles.catRow, { backgroundColor: theme.surface }]}
                  onPress={() => setOpen((o) => ({ ...o, [cat.key]: !expanded }))}
                >
                  {expanded
                    ? <ChevronUp color={theme.muted} size={20} />
                    : <ChevronDown color={theme.muted} size={20} />}
                  <Text style={[styles.catLabel, { color: theme.text }]}>
                    {t(`notifications.cat.${cat.key}`)}
                  </Text>
                  <Switch
                    value={cat.items.every(isOn)}
                    onValueChange={() => toggleCategory(cat.items)}
                    trackColor={{ false: theme.border, true: theme.accent }}
                  />
                </Pressable>
                {expanded && (
                  <View style={[styles.card, { backgroundColor: theme.surface }]}>
                    {cat.items.map((k, i) => (
                      <View
                        key={k}
                        style={[
                          styles.itemRow,
                          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
                        ]}
                      >
                        <Text style={[styles.itemLabel, { color: theme.text }]}>
                          {t(`notifications.item.${k}`)}
                        </Text>
                        <Switch
                          value={isOn(k)}
                          onValueChange={() => toggleItem(k)}
                          trackColor={{ false: theme.border, true: theme.accent }}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 12 },
  back: { padding: 4 },
  title: { fontSize: 22, fontWeight: "700" },
  content: { padding: 16, gap: 20 },
  section: { gap: 8 },
  catRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  catLabel: { fontSize: 16, fontWeight: "700", flex: 1 },
  card: { borderRadius: 12, overflow: "hidden" },
  itemRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 16,
  },
  itemLabel: { fontSize: 15 },
});
