// src/app/(tabs)/index.tsx — Home: a quick glance at your next shift and any
// new messages. Opening a profile lands here (index is the initial tab route).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { CalendarClock, CheckCheck, ChevronRight, Clock, MapPin, MessageCircle, Repeat, TreePalm, TriangleAlert } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable,
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

const RED = "#C1442D";

// A thing the manager still has to approve or act on.
type PendingApproval = {
  id: string;
  kind: "vacation" | "swap" | "emergency";
  who: string;
  detail: string;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

const fmtRange = (von: string, bis: string, lang: string) => {
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const f = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(lang, opts);
  return von === bis ? f(von) : `${f(von)} – ${f(bis)}`;
};

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
    : typ === "notfall_vertretung" ? "emergency"
    : "shiftSwitch";

export default function Home() {
  const { user, activeMitarbeiter } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [firstName, setFirstName] = useState<string>("");
  const [unread, setUnread] = useState<UnreadMsg[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
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

    // Managers see what they still have to decide on: vacation requests always,
    // shift swaps only when the business requires manager approval for them.
    if (isChef) {
      const { data: settings } = await supabase
        .from("betriebs_einstellungen")
        .select("tausch_freigabe_erforderlich")
        .eq("betrieb_id", activeMitarbeiter.betrieb_id)
        .maybeSingle();
      const swapApprovalOn = !!settings?.tausch_freigabe_erforderlich;

      const [vac, swaps, team, emg] = await Promise.all([
        supabase.from("urlaub")
          .select("id, mitarbeiter_id, von, bis")
          .eq("betrieb_id", activeMitarbeiter.betrieb_id)
          .eq("status", "requested")
          .order("von", { ascending: true }),
        swapApprovalOn
          ? supabase.from("benachrichtigungen")
              .select("id, titel, autor_id, erstellt_am")
              .eq("betrieb_id", activeMitarbeiter.betrieb_id)
              .eq("typ", "aenderungswunsch")
              .is("geloescht_am", null)
              .order("erstellt_am", { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
        supabase.from("mitarbeiter").select("id, vorname, nachname")
          .eq("betrieb_id", activeMitarbeiter.betrieb_id),
        // Reported emergencies the manager still has to act on (call out a replacement).
        supabase.from("notfaelle")
          .select("id, melder_id, status, erstellt_am")
          .eq("betrieb_id", activeMitarbeiter.betrieb_id)
          .eq("status", "gemeldet")
          .order("erstellt_am", { ascending: true }),
      ]);

      const nameById = new Map<string, string>();
      (team.data ?? []).forEach((p: any) => nameById.set(p.id, `${p.vorname} ${p.nachname}`.trim()));

      const emgItems: PendingApproval[] = (emg.data ?? []).map((n: any) => ({
        id: `emg:${n.id}`,
        kind: "emergency",
        who: nameById.get(n.melder_id) ?? "—",
        detail: "",
      }));

      const vacItems: PendingApproval[] = (vac.data ?? []).map((v: any) => ({
        id: `vac:${v.id}`,
        kind: "vacation",
        who: nameById.get(v.mitarbeiter_id) ?? "—",
        detail: fmtRange(v.von, v.bis, lang),
      }));
      const swapItems: PendingApproval[] = (swaps.data ?? []).map((s: any) => ({
        id: `swap:${s.id}`,
        kind: "swap",
        who: s.autor_id ? (nameById.get(s.autor_id) ?? "") : "",
        detail: s.titel ?? "",
      }));
      setApprovals([...emgItems, ...vacItems, ...swapItems]);
    } else {
      setApprovals([]);
    }

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
  }, [user, activeMitarbeiter, isChef, lang]);

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

  const emergencyCount = approvals.filter((a) => a.kind === "emergency").length;
  const emergencyNames = approvals.filter((a) => a.kind === "emergency").map((a) => a.who);
  const vacationCount = approvals.filter((a) => a.kind === "vacation").length;
  const swapCount = approvals.filter((a) => a.kind === "swap").length;

  // Interrupting popup: opens once when emergencies appear, re-arms after they clear.
  const [emgDismissed, setEmgDismissed] = useState(false);
  useEffect(() => { if (emergencyCount === 0) setEmgDismissed(false); }, [emergencyCount]);
  const showEmgModal = isChef && emergencyCount > 0 && !emgDismissed;

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

        {/* ---- Manager: pending approvals ---- */}
        {isChef ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("home.pendingApprovals")}</Text>
            {emergencyCount === 0 && vacationCount === 0 && swapCount === 0 ? (
              <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <CheckCheck color={theme.muted} size={22} />
                <Text style={[styles.emptyText, { color: theme.muted }]}>{t("home.noApprovals")}</Text>
              </View>
            ) : (
              <>
                {emergencyCount > 0 ? (
                  <Pressable
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: RED }]}
                    onPress={() => router.push("/manager")}
                  >
                    <View style={styles.shiftHead}>
                      <View style={[styles.iconBadge, { backgroundColor: RED }]}>
                        <TriangleAlert color="#fff" size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shiftDay, { color: theme.text }]}>{t("home.emergencyWaiting")}</Text>
                        <Text style={[styles.shiftTitle, { color: theme.muted }]}>
                          {emergencyCount} {t(emergencyCount === 1 ? "home.requestOne" : "home.requestMany")}
                        </Text>
                      </View>
                      <ChevronRight color={theme.muted} size={22} />
                    </View>
                  </Pressable>
                ) : null}
                {vacationCount > 0 ? (
                  <Pressable
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => router.push("/manager")}
                  >
                    <View style={styles.shiftHead}>
                      <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                        <TreePalm color={theme.accentText} size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shiftDay, { color: theme.text }]}>{t("home.vacationWaiting")}</Text>
                        <Text style={[styles.shiftTitle, { color: theme.muted }]}>
                          {vacationCount} {t(vacationCount === 1 ? "home.requestOne" : "home.requestMany")}
                        </Text>
                      </View>
                      <ChevronRight color={theme.muted} size={22} />
                    </View>
                  </Pressable>
                ) : null}
                {swapCount > 0 ? (
                  <Pressable
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                    onPress={() => router.push("/messages")}
                  >
                    <View style={styles.shiftHead}>
                      <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                        <Repeat color={theme.accentText} size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shiftDay, { color: theme.text }]}>{t("home.swapWaiting")}</Text>
                        <Text style={[styles.shiftTitle, { color: theme.muted }]}>
                          {swapCount} {t(swapCount === 1 ? "home.requestOne" : "home.requestMany")}
                        </Text>
                      </View>
                      <ChevronRight color={theme.muted} size={22} />
                    </View>
                  </Pressable>
                ) : null}
              </>
            )}
          </>
        ) : (<>
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
        </>)}

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

      {/* Interrupting emergency popup for the manager */}
      <Modal visible={showEmgModal} transparent animationType="fade" onRequestClose={() => setEmgDismissed(true)}>
        <Pressable style={styles.backdrop} onPress={() => setEmgDismissed(true)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: RED }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <View style={[styles.iconBadge, { backgroundColor: RED }]}>
                <TriangleAlert color="#fff" size={22} />
              </View>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("home.emergencyModalTitle")}</Text>
            </View>
            <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21, marginBottom: 4 }}>
              {emergencyCount} {t(emergencyCount === 1 ? "home.requestOne" : "home.requestMany")}
              {emergencyNames.length ? ` — ${emergencyNames.join(", ")}` : ""}
            </Text>
            <Text style={{ color: theme.muted, fontSize: 13, marginBottom: 14 }}>{t("home.emergencyModalBody")}</Text>
            <View style={styles.modalBtnRow}>
              <Pressable style={[styles.modalBtn, { borderColor: theme.border }]} onPress={() => setEmgDismissed(true)}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{t("home.later")}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: RED, borderColor: RED }]} onPress={() => { setEmgDismissed(true); router.push("/manager"); }}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>{t("home.viewNow")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  greeting: { fontSize: 28, fontWeight: "700", marginBottom: 4 },

  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },

  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 18, gap: 6 },
  sheetHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: "800", flex: 1 },
  modalBtnRow: { flexDirection: "row", gap: 10 },
  modalBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: 999, paddingVertical: 12 },
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
