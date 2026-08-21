// src/app/notifications.tsx — per-user notification preferences.
//
// Preferences are stored server-side (benachrichtigung_prefs) so the push sender
// can honour each opt-out, and cached in AsyncStorage so locally-scheduled shift
// reminders can read the `shiftReminder` gate without a round-trip. Item keys are
// the real notification `typ` strings (plus `shiftReminder`) so an "off" here
// suppresses the matching remote push.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { ChevronDown, ChevronLeft, ChevronUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import { useI18n } from "../i18n/I18nProvider";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { ScreenGradient } from "../components/ScreenGradient";

// Item keys are the notification `typ` strings the backend emits, plus the
// local-only `shiftReminder`. Grouped for display only.
const CATEGORIES = [
  { key: "messages", items: ["allgemein", "umfrage", "schicht_tausch", "schicht_ausschreibung"] },
  { key: "schedule", items: ["schicht_geaendert", "aenderungswunsch", "notfall_vertretung", "shiftReminder"] },
] as const;

const STORAGE_KEY = "notifPrefs";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const mid = activeMitarbeiter?.id ?? null;

  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [permGranted, setPermGranted] = useState<boolean | null>(null);

  const refreshPerm = useCallback(async () => {
    try {
      const p = await Notifications.getPermissionsAsync();
      setPermGranted(p.granted);
    } catch { setPermGranted(null); }
  }, []);

  useEffect(() => {
    (async () => {
      // Start from the local cache for an instant paint…
      const raw = await AsyncStorage.getItem(STORAGE_KEY).catch(() => null);
      const local: Record<string, boolean> = raw ? JSON.parse(raw) : {};
      // …then overlay the authoritative server prefs.
      if (mid) {
        const { data } = await supabase.rpc("benachrichtigung_prefs_holen", { p_mitarbeiter_id: mid });
        (data as { schluessel: string; aktiv: boolean }[] | null)?.forEach((r) => {
          local[r.schluessel] = r.aktiv;
        });
      }
      setPrefs(local);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(local));
      setLoaded(true);
    })();
    refreshPerm();
  }, [mid, refreshPerm]);

  const isOn = (k: string) => prefs[k] !== false; // default on

  const persistLocal = (next: Record<string, boolean>) => {
    setPrefs(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const setServer = (k: string, aktiv: boolean) => {
    if (!mid) return;
    supabase.rpc("benachrichtigung_pref_setzen", { p_mitarbeiter_id: mid, p_schluessel: k, p_aktiv: aktiv });
  };

  const toggleItem = (k: string) => {
    const next = { ...prefs, [k]: !isOn(k) };
    persistLocal(next);
    setServer(k, next[k]);
  };

  const toggleCategory = (items: readonly string[]) => {
    const allOn = items.every(isOn);
    const next = { ...prefs };
    items.forEach((k) => { next[k] = !allOn; setServer(k, !allOn); });
    persistLocal(next);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScreenGradient />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Text style={[styles.title, { color: theme.text }]}>{t("notifications.title")}</Text>
      </View>

      {loaded && (
        <ScrollView contentContainerStyle={styles.content}>
          {/* OS permission state */}
          {permGranted === false && (
            <Pressable
              style={[styles.permRow, { backgroundColor: theme.surface, borderColor: theme.accent }]}
              onPress={() => Linking.openSettings()}
            >
              <Text style={[styles.permText, { color: theme.text }]}>{t("notifications.permDenied")}</Text>
              <Text style={[styles.permAction, { color: theme.accent }]}>{t("notifications.permOpen")}</Text>
            </Pressable>
          )}

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
  permRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16,
  },
  permText: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 10 },
  permAction: { fontSize: 14, fontWeight: "700" },
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
  itemLabel: { fontSize: 15, flex: 1, marginRight: 10 },
});
