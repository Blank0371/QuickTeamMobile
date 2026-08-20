// src/app/(tabs)/index.tsx — Home: a quick glance at your next shift and any
// new messages. Opening a profile lands here (index is the initial tab route).
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import { CalendarCheck2, CalendarClock, CheckCheck, ChevronRight, Clock, MapPin, MessageCircle, Repeat, TreePalm, TriangleAlert } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import type { CalShift } from "./calendar";
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

const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
const myRole = (s: CalShift) => s.participants.find((p) => p.is_me)?.role_name ?? null;

// Deep-green shading that echoes the app's background gradient, rather than a
// flat vivid green. Horizontal wash from the near-black carbon-green used at the
// bottom of the screen backdrop into a mid forest green, left to right.
const HOURS_FILL_DARK = ["#16241C", "#2F6B44"] as [string, string];
// Light: pale sage → soft green wash. Light enough that the dark-green labels
// stay legible over the fill, while clearly reading as "progress".
const HOURS_FILL_LIGHT = ["#CFE0C9", "#A7C8A0"] as [string, string];
const monthKey = (datum: string) => datum.slice(0, 7); // 'YYYY-MM'

// Hours of a shift already worked as of `now`: 0 before it starts, the elapsed
// portion while it's in progress, and its full length once it's over. Handles
// overnight shifts (end time on/before start rolls into the next day).
const workedSoFar = (s: CalShift, now: Date) => {
  const start = new Date(`${s.datum}T${s.start_zeit}`);
  let end = new Date(`${s.datum}T${s.end_zeit}`);
  if (end <= start) end = new Date(end.getTime() + 86400000);
  const elapsedMs = Math.min(now.getTime(), end.getTime()) - start.getTime();
  return Math.max(0, elapsedMs) / 3_600_000;
};

// The month's target: soll_stunden is a weekly-hours × 4.33 figure for a
// "typical" month. Normalise back to a week (÷4.33), scale by how many weeks
// this specific month actually spans (days ÷ 7), and round to the nearest hour.
const monthTarget = (soll: number, ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return Math.round((soll / 4.33) * (days / 7));
};

// One row per month: 'YYYY-MM' and the hours already worked in it.
type MonthHours = { ym: string; worked: number };

const catKey = (typ: string) =>
  typ === "allgemein" ? "announcement"
    : typ === "aufgabenliste" ? "tasks"
    : typ === "umfrage" ? "polls"
    : typ === "dokument" ? "documents"
    : typ === "notfall_vertretung" ? "emergency"
    : "shiftSwitch";

export default function Home() {
  const { user, activeMitarbeiter } = useAuth();
  const { theme, isDark } = useTheme();
  const { t, lang } = useI18n();

  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [firstName, setFirstName] = useState<string>("");
  const [unread, setUnread] = useState<UnreadMsg[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [upcoming, setUpcoming] = useState<CalShift[]>([]);
  const [shiftsReady, setShiftsReady] = useState(0); // planning cycles with a proposal awaiting review
  const [sollStunden, setSollStunden] = useState<number | null>(null);
  const [monthHours, setMonthHours] = useState<MonthHours[]>([]); // newest first, current month at [0]
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || !activeMitarbeiter) return;

    // who am I (for the greeting)
    const { data: me } = await supabase
      .from("mitarbeiter")
      .select("vorname, soll_stunden")
      .eq("id", activeMitarbeiter.id)
      .maybeSingle();
    setFirstName((me?.vorname ?? "").trim());
    setSollStunden((me?.soll_stunden as number | null) ?? null);

    // Managers see what they still have to decide on: vacation requests always,
    // shift swaps only when the business requires manager approval for them.
    if (isChef) {
      const { data: settings } = await supabase
        .from("betriebs_einstellungen")
        .select("ask_chef_for_shift_switch")
        .eq("betrieb_id", activeMitarbeiter.betrieb_id)
        .maybeSingle();
      const swapApprovalOn = !!settings?.ask_chef_for_shift_switch;

      const [vac, swaps, team, emg, ready] = await Promise.all([
        supabase.from("urlaub")
          .select("id, mitarbeiter_id, von, bis")
          .eq("betrieb_id", activeMitarbeiter.betrieb_id)
          .eq("status", "requested")
          .order("von", { ascending: true }),
        swapApprovalOn
          ? supabase.from("schichttausch_anfragen")
              .select("id, anbietender_mitarbeiter_id, erstellt_am")
              .eq("betrieb_id", activeMitarbeiter.betrieb_id)
              .eq("status", "wartet_auf_chef")
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
        // Generated schedules waiting for the manager to review them.
        supabase.from("planungszyklen")
          .select("id")
          .eq("betrieb_id", activeMitarbeiter.betrieb_id)
          .eq("status", "vorschlag_bereit"),
      ]);
      setShiftsReady((ready.data ?? []).length);

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
        who: s.anbietender_mitarbeiter_id ? (nameById.get(s.anbietender_mitarbeiter_id) ?? "") : "",
        detail: "",
      }));
      setApprovals([...emgItems, ...vacItems, ...swapItems]);
      setUpcoming([]);
    } else {
      setApprovals([]);
      setShiftsReady(0);
      // Employees see their next few upcoming shifts plus a worked-hours bar for
      // recent months, both drawn from the same roster RPC the calendar uses
      // (respects the business visibility settings).
      const now = new Date();
      const today = iso(now);
      const to = iso(new Date(Date.now() + 60 * 86400000));
      // Reach back to the start of the month six months ago so the expandable
      // bar has some history to show; go forward 60 days for upcoming shifts.
      const from = iso(new Date(now.getFullYear(), now.getMonth() - 5, 1));
      const { data: sh } = await supabase.rpc("kalender_schichten", {
        p_betrieb_id: activeMitarbeiter.betrieb_id,
        p_von: from,
        p_bis: to,
        p_mitarbeiter_id: activeMitarbeiter.id,
      });
      const all = (sh as CalShift[]) ?? [];

      const mine = all
        .filter((s) => s.mine && s.datum >= today)
        .sort((a, b) => (a.datum + a.start_zeit).localeCompare(b.datum + b.start_zeit))
        .slice(0, 3);
      setUpcoming(mine);

      // Hours already worked, per month: my shifts up to and including this month,
      // summed by calendar month. A shift counts only for the time already elapsed
      // — a finished shift counts fully, one in progress counts up to now, and one
      // that hasn't started yet counts zero. Called-out shifts don't count.
      const curKey = monthKey(today);
      const worked: Record<string, number> = {};
      all
        .filter((s) => s.mine && !s.canceled && monthKey(s.datum) <= curKey)
        .forEach((s) => {
          const k = monthKey(s.datum);
          worked[k] = (worked[k] ?? 0) + workedSoFar(s, now);
        });
      // Always show the current month, even with zero worked hours yet.
      if (worked[curKey] == null) worked[curKey] = 0;
      const rows: MonthHours[] = Object.entries(worked)
        .map(([ym, w]) => ({ ym, worked: w }))
        .sort((a, b) => b.ym.localeCompare(a.ym)); // newest first
      setMonthHours(rows);
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

    // Resolve just the broadcast authors' names (respects the roster RLS: we
    // only ask the server to name the specific ids we already have).
    const authorIds = Array.from(
      new Set(list.map((m: any) => m.autor_id).filter(Boolean))
    ) as string[];
    const [reads, people] = await Promise.all([
      supabase.from("benachrichtigung_gelesen").select("benachrichtigung_id").in("benachrichtigung_id", ids),
      authorIds.length > 0
        ? supabase.rpc("mitarbeiter_namen", { p_betrieb_id: activeMitarbeiter.betrieb_id, p_ids: authorIds })
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const readSet = new Set((reads.data ?? []).map((r: any) => r.benachrichtigung_id));
    const nameOf = new Map<string, string>();
    (people.data ?? []).forEach((p: any) => nameOf.set(p.id, p.name));

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

  const fmtShiftDay = (date: string) => {
    const d = new Date(date + "T00:00:00");
    const today = iso(new Date());
    const tomorrow = iso(new Date(Date.now() + 86400000));
    if (date === today) return t("home.today");
    if (date === tomorrow) return t("home.tomorrow");
    return d.toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long" });
  };
  const fmtMonth = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(lang, { month: "long", year: "numeric" });
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
            {emergencyCount === 0 && vacationCount === 0 && swapCount === 0 && shiftsReady === 0 ? (
              <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <CheckCheck color={theme.muted} size={22} />
                <Text style={[styles.emptyText, { color: theme.muted }]}>{t("home.noApprovals")}</Text>
              </View>
            ) : (
              <>
                {shiftsReady > 0 ? (
                  <Pressable
                    style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}
                    onPress={() => router.push("/manager")}
                  >
                    <View style={styles.shiftHead}>
                      <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                        <CalendarCheck2 color={theme.accentText} size={20} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.shiftDay, { color: theme.text }]}>{t("home.shiftsReadyTitle")}</Text>
                        <Text style={[styles.shiftTitle, { color: theme.muted }]}>{t("home.shiftsReadyBody")}</Text>
                      </View>
                      <ChevronRight color={theme.muted} size={22} />
                    </View>
                  </Pressable>
                ) : null}
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
        {/* ---- Worked-hours bar (current month; tap to reveal earlier months) ---- */}
        {sollStunden != null && monthHours.length > 0 ? (
          <>
            <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("home.hoursWorked")}</Text>
            <Pressable
              disabled={monthHours.length <= 1}
              onPress={() => setHoursExpanded((v) => !v)}
              style={{ gap: 8 }}
            >
              {(hoursExpanded ? monthHours : monthHours.slice(0, 1)).map((row) => {
                const max = Math.max(1, monthTarget(sollStunden, row.ym));
                const pct = Math.max(0, Math.min(1, row.worked / max));
                return (
                  <View key={row.ym} style={[styles.hoursTrack, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                    <LinearGradient
                      colors={isDark ? HOURS_FILL_DARK : HOURS_FILL_LIGHT}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.hoursFill, { width: `${pct * 100}%`, borderColor: theme.accent }]}
                    />
                    <View style={styles.hoursLabelRow}>
                      <Text style={[styles.hoursMonth, { color: theme.text }]} numberOfLines={1}>{fmtMonth(row.ym)}</Text>
                      <Text style={[styles.hoursValue, { color: theme.text }]}>
                        {Math.round(row.worked)} {t("home.hoursUnit")}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </Pressable>
          </>
        ) : null}

        {/* ---- Upcoming shifts ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("home.nextShifts")}</Text>
        {upcoming.length === 0 ? (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <CalendarClock color={theme.muted} size={22} />
            <Text style={[styles.emptyText, { color: theme.muted }]}>{t("home.noShift")}</Text>
          </View>
        ) : (
          upcoming.map((s) => {
            const role = myRole(s);
            return (
              <Pressable
                key={s.id}
                style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => router.push({ pathname: "/shift/[id]", params: { id: s.id } })}
              >
                <View style={styles.shiftHead}>
                  <View style={[styles.iconBadge, { backgroundColor: theme.accent }]}>
                    <CalendarClock color={theme.accentText} size={20} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.shiftDay, { color: theme.text }]}>{fmtShiftDay(s.datum)}</Text>
                    <Text style={[styles.shiftTitle, { color: theme.muted }]}>{s.label || t("calendar.shift")}</Text>
                  </View>
                  <ChevronRight color={theme.muted} size={22} />
                </View>
                <View style={[styles.shiftMetaRow, { borderTopColor: theme.border }]}>
                  <View style={styles.metaItem}>
                    <Clock color={theme.muted} size={16} />
                    <Text style={[styles.metaText, { color: theme.text }]}>{hhmm(s.start_zeit)}–{hhmm(s.end_zeit)}</Text>
                  </View>
                  {role ? (
                    <View style={styles.metaItem}>
                      <MapPin color={theme.muted} size={16} />
                      <Text style={[styles.metaText, { color: theme.text }]}>{role}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })
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

  hoursTrack: { height: 44, borderRadius: 12, borderWidth: 1.5, overflow: "hidden", justifyContent: "center" },
  hoursFill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRightWidth: 2, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  hoursLabelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, gap: 8 },
  hoursMonth: { fontSize: 15, fontWeight: "700", textTransform: "capitalize", flexShrink: 1 },
  hoursValue: { fontSize: 15, fontWeight: "800" },

  msgHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badge: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  msgTitle: { fontSize: 16, fontWeight: "700" },
  msgFoot: { fontSize: 12, marginTop: 2 },
});
