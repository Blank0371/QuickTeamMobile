// src/app/(tabs)/index.tsx — Home: a quick glance at your next shift and any
// new messages. Opening a profile lands here (index is the initial tab route).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { CalendarClock, ChevronRight, Clock, MapPin, MessageCircle } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { Shift, shifts } from "../../lib/shifts";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { RefreshScrollView } from "../../components/RefreshScrollView";

type UnreadMsg = {
  id: string;
  typ: string;
  titel: string | null;
  erstellt_am: string;
  autorName: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Home only surfaces messages that arrived since the last time this device
// looked at Home. We remember the newest message timestamp per position.
const seenKey = (mitarbeiterId: string) => `home:lastMsgSeen:${mitarbeiterId}`;

// The soonest shift from today onward (shifts is mock/empty until the schedule
// feature lands — this degrades to an empty state).
const nextShift = (): Shift | null => {
  const today = iso(new Date());
  const upcoming = shifts
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return upcoming[0] ?? null;
};

const catKey = (typ: string) =>
  typ === "allgemein" ? "announcement"
    : typ === "aufgabenliste" ? "tasks"
    : typ === "umfrage" ? "polls"
    : typ === "dokument" ? "documents"
    : "shiftSwitch";

export default function Home() {
  const { user, activeMitarbeiter } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const [firstName, setFirstName] = useState<string>("");
  const [unread, setUnread] = useState<UnreadMsg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !activeMitarbeiter) return;

    // who am I (for the greeting)
    const { data: me } = await supabase
      .from("mitarbeiter")
      .select("vorname")
      .eq("id", activeMitarbeiter.id)
      .maybeSingle();
    setFirstName((me?.vorname ?? "").trim());

    // broadcast messages for this business, newest first
    const { data: rows } = await supabase
      .from("benachrichtigungen")
      .select("id, typ, titel, erstellt_am, autor_id")
      .eq("betrieb_id", activeMitarbeiter.betrieb_id)
      .is("mitarbeiter_id", null)
      .is("geloescht_am", null)
      .order("erstellt_am", { ascending: false });

    const list = rows ?? [];
    const ids = list.map((m: any) => m.id);
    if (ids.length === 0) { setUnread([]); setLoading(false); return; }

    // Timestamp of the newest message this device has already seen on Home.
    // Anything newer counts as "new"; the first ever visit (null) shows all unread.
    const lastSeen = await AsyncStorage.getItem(seenKey(activeMitarbeiter.id));

    const [reads, people] = await Promise.all([
      supabase.from("benachrichtigung_gelesen").select("benachrichtigung_id").in("benachrichtigung_id", ids),
      supabase.from("mitarbeiter").select("id, vorname, nachname"),
    ]);
    const readSet = new Set((reads.data ?? []).map((r: any) => r.benachrichtigung_id));
    const nameOf = new Map<string, string>();
    (people.data ?? []).forEach((p: any) => nameOf.set(p.id, `${p.vorname} ${p.nachname}`.trim()));

    const unreadList: UnreadMsg[] = list
      .filter((m: any) => !readSet.has(m.id))
      .filter((m: any) => !lastSeen || m.erstellt_am > lastSeen)
      .map((m: any) => ({
        id: m.id,
        typ: m.typ,
        titel: m.titel,
        erstellt_am: m.erstellt_am,
        autorName: m.autor_id ? (nameOf.get(m.autor_id) ?? "") : "",
      }));
    setUnread(unreadList);
    setLoading(false);

    // Remember the newest message so it won't be flagged "new" next time Home
    // is viewed. `list` is ordered newest-first, so [0] is the latest.
    await AsyncStorage.setItem(seenKey(activeMitarbeiter.id), list[0].erstellt_am);
  }, [user, activeMitarbeiter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));


  const shift = nextShift();

  const fmtShiftDay = (date: string) => {
    const d = new Date(date + "T00:00:00");
    const today = iso(new Date());
    const tomorrow = iso(new Date(Date.now() + 86400000));
    if (date === today) return t("home.today");
    if (date === tomorrow) return t("home.tomorrow");
    return d.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });
  };
  const fmtMsg = (isoStr: string) =>
    new Date(isoStr).toLocaleDateString(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.bg }]} edges={["top"]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <RefreshScrollView
        contentContainerStyle={styles.content}
        onRefresh={load}
      >
        <Text style={[styles.greeting, { color: theme.text }]}>
          {firstName ? `${t("home.greeting")}, ${firstName}` : t("home.greeting")}
        </Text>

        {/* ---- Next shift ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("home.nextShift")}</Text>
        {shift ? (
          <Pressable
            style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => router.push({ pathname: "/shift/[id]", params: { id: shift.id } })}
          >
            <View style={styles.shiftHead}>
              <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                <CalendarClock color={theme.accentText} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.shiftDay, { color: theme.text }]}>{fmtShiftDay(shift.date)}</Text>
                <Text style={[styles.shiftTitle, { color: theme.muted }]}>{shift.title}</Text>
              </View>
              <ChevronRight color={theme.muted} size={22} />
            </View>
            <View style={[styles.shiftMetaRow, { borderTopColor: theme.border }]}>
              <View style={styles.metaItem}>
                <Clock color={theme.muted} size={16} />
                <Text style={[styles.metaText, { color: theme.text }]}>{shift.start}–{shift.end}</Text>
              </View>
              {shift.role ? (
                <View style={styles.metaItem}>
                  <MapPin color={theme.muted} size={16} />
                  <Text style={[styles.metaText, { color: theme.text }]}>{shift.role}</Text>
                </View>
              ) : null}
            </View>
          </Pressable>
        ) : (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <CalendarClock color={theme.muted} size={22} />
            <Text style={[styles.emptyText, { color: theme.muted }]}>{t("home.noShift")}</Text>
          </View>
        )}

        {/* ---- New messages ---- */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("home.newMessages")}</Text>
        </View>

        {unread.length === 0 ? (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <MessageCircle color={theme.muted} size={22} />
            <Text style={[styles.emptyText, { color: theme.muted }]}>{t("home.noNewMessages")}</Text>
          </View>
        ) : (
          unread.slice(0, 4).map((m) => (
            <Pressable
              key={m.id}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => router.push("/messages")}
            >
              <View style={styles.msgHead}>
                <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.badge, { color: theme.accent }]}>
                  {t(`notifications.item.${catKey(m.typ)}`)}
                </Text>
              </View>
              {m.titel ? <Text style={[styles.msgTitle, { color: theme.text }]}>{m.titel}</Text> : null}
              <Text style={[styles.msgFoot, { color: theme.muted }]}>
                {m.autorName ? `${m.autorName} · ` : ""}{fmtMsg(m.erstellt_am)}
              </Text>
            </Pressable>
          ))
        )}
      </RefreshScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  greeting: { fontSize: 28, fontWeight: "700", marginBottom: 4 },

  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 },
  viewAll: { fontSize: 13, fontWeight: "700", marginTop: 10 },

  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6 },
  emptyCard: { flexDirection: "row", alignItems: "center", gap: 10 },
  emptyText: { fontSize: 15 },

  shiftHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  shiftDay: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  shiftTitle: { fontSize: 14, marginTop: 2 },
  shiftMetaRow: { flexDirection: "row", gap: 20, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 14, fontWeight: "600" },

  msgHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  msgTitle: { fontSize: 16, fontWeight: "700" },
  msgFoot: { fontSize: 12, marginTop: 2 },
});
