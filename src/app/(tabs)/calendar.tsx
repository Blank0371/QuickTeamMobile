import { useFocusEffect } from "expo-router";
import { AlertTriangle, CalendarPlus, Check, ChevronLeft, ChevronRight, Minus, Plus, Repeat, Search, StickyNote, Trash2, WifiOff, X } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput,
  View
} from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { DateTimeField } from "../../components/DateTimeField";
import { ScreenGradient } from "../../components/ScreenGradient";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { readCache, writeCache } from "../../lib/cache";
import { scheduleShiftReminders } from "../../lib/notifications";
import { useTheme } from "../../theme/ThemeProvider";
import { ShiftDetailView } from "../shift/[id]";

type ViewMode = "week" | "month";

// A shift as returned by the kalender_schichten RPC (roster already trimmed by
// the business visibility settings on the server).
export type CalShift = {
  id: string;
  status: string;     // 'geplant' (draft proposal), 'veroeffentlicht', 'archiviert'
  datum: string;      // YYYY-MM-DD
  start_zeit: string; // HH:MM:SS
  end_zeit: string;
  label: string | null;
  kommentar: string | null;
  mine: boolean;
  can_edit: boolean;
  canceled: boolean;     // I called out of this shift
  open: boolean;         // open for me to claim (posting or replacement)
  swap_wanted: boolean;  // someone on it wants to swap out
  understaffed?: boolean; // chef-only: a role's mindestbesetzung isn't met
  notiz_anzahl?: number;  // number of shift notes (sticky-note marker)
  participants: { name: string; role_name: string | null; attendet: boolean; is_me: boolean }[];
};

// Blueprint blue for not-yet-published (draft) shifts — reads as a plan, not a
// confirmed shift.
const BLUEPRINT = "#2f5f8f";

// Visual treatment for a shift's state: canceled → red, open → translucent,
// planned (not yet published) → blueprinty blue with a dashed outline.
const shiftVisual = (s: CalShift, accent: string) => {
  if (s.canceled) return { bg: RED, opacity: 1, canceled: true, open: false, dashed: false, blueprint: false };
  if (s.open) return { bg: accent, opacity: 0.5, canceled: false, open: true, dashed: true, blueprint: false };
  if (s.status === "geplant") return { bg: BLUEPRINT, opacity: 0.96, canceled: false, open: false, dashed: true, blueprint: true };
  return { bg: accent, opacity: 1, canceled: false, open: false, dashed: false, blueprint: false };
};

// Monday-first weekday i18n keys (matches startOfWeek below).
const WEEKDAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const startOfWeek = (d: Date) => {
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7; // Monday = 0
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
};
const coworkerNames = (s: CalShift) => s.participants.filter((p) => !p.is_me).map((p) => p.name);
// The role I'm working this shift under, if I'm on it and it has a named role.
const myRole = (s: CalShift) => s.participants.find((p) => p.is_me)?.role_name ?? null;

const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const startMin = (s: CalShift) => toMinutes(hhmm(s.start_zeit));
const endMinRaw = (s: CalShift) => toMinutes(hhmm(s.end_zeit));
// A shift whose end is at or before its start runs past midnight into the next day.
const isOvernight = (s: CalShift) => endMinRaw(s) <= startMin(s);

// The portion(s) of the shifts that fall on a given calendar day, in minutes
// from midnight. An overnight shift contributes a "head" on its start day
// (start → 24:00) and a "tail" on the following day (00:00 → end).
type DaySeg = { shift: CalShift; from: number; to: number; tail: boolean };
const daySegments = (shifts: CalShift[], date: Date): DaySeg[] => {
  const d = iso(date);
  const prev = iso(addDays(date, -1));
  const out: DaySeg[] = [];
  for (const s of shifts) {
    const overnight = isOvernight(s);
    if (s.datum === d) {
      out.push({ shift: s, from: startMin(s), to: overnight ? 24 * 60 : endMinRaw(s), tail: false });
    } else if (overnight && s.datum === prev) {
      out.push({ shift: s, from: 0, to: endMinRaw(s), tail: true });
    }
  }
  return out;
};

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const betrieb = activeMitarbeiter?.betrieb_id ?? null;
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [mode, setMode] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState(new Date()); // the focused day
  const [shifts, setShifts] = useState<CalShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false); // showing cached data (offline / fetch failed)
  const [openShiftId, setOpenShiftId] = useState<string | null>(null); // shift shown in the detail popup
  const [confirmPublish, setConfirmPublish] = useState(false); // "confirm planned shifts" popup
  const [publishing, setPublishing] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false); // "delete planned shifts" popup
  const [discarding, setDiscarding] = useState(false);

  // Draft (geplant) shifts the chef can still publish. Only the chef ever sees these.
  const plannedCount = shifts.filter((s) => s.status === "geplant").length;

  const publishPlanned = async () => {
    if (!betrieb) return;
    setPublishing(true);
    await supabase.rpc("geplante_schichten_veroeffentlichen", { p_betrieb_id: betrieb });
    setPublishing(false);
    setConfirmPublish(false);
    load();
  };

  // Throw away the generated proposal (draft shifts + the awaiting-review cycle).
  const discardPlanned = async () => {
    if (!betrieb) return;
    setDiscarding(true);
    await supabase.rpc("geplante_schichten_verwerfen", { p_betrieb_id: betrieb });
    setDiscarding(false);
    setConfirmDiscard(false);
    load();
  };

  // Chef-only data for the "create shift" sheet.
  const [showCreate, setShowCreate] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [rollen, setRollen] = useState<{ id: string; name: string }[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string[]>>({});
  const [roleIdsByMember, setRoleIdsByMember] = useState<Record<string, string[]>>({});

  const modes: ViewMode[] = ["week", "month"];
  const idx = modes.indexOf(mode);

  // Reload whenever the focused month (or business) changes — the window we
  // fetch (month ± 7 days) always covers the visible day/week/month.
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const cacheKey = `cal:${betrieb}:${activeMitarbeiter?.id}:${monthKey}`;

  // Re-schedule on-device shift reminders from the freshest shift list we have.
  const syncReminders = useCallback(async (list: CalShift[]) => {
    const raw = await AsyncStorage.getItem("notifPrefs").catch(() => null);
    const prefs = raw ? JSON.parse(raw) : {};
    const enabled = prefs.shiftReminder !== false; // default on
    await scheduleShiftReminders(
      list.map((s) => ({ id: s.id, datum: s.datum, start_zeit: s.start_zeit, label: s.label, mine: s.mine })),
      {
        eveningTitle: t("reminders.eveningTitle"),
        eveningBody: (label, time) => t("reminders.eveningBody", { label, time }),
        soonTitle: t("reminders.soonTitle"),
        soonBody: (label, time) => t("reminders.soonBody", { label, time }),
        shiftWord: t("calendar.shift"),
      },
      enabled,
    );
  }, [t]);

  const load = useCallback(async () => {
    if (!betrieb) return;
    setLoading(true);
    // Hydrate instantly from the last synced copy so the grid isn't blank.
    const cached = await readCache<CalShift[]>(cacheKey);
    if (cached) { setShifts(cached.value); setLoading(false); }

    const [y, mo] = monthKey.split("-").map(Number);
    const from = new Date(y, mo, 1); from.setDate(from.getDate() - 7);
    const to = new Date(y, mo + 1, 0); to.setDate(to.getDate() + 7);
    const { data, error } = await supabase.rpc("kalender_schichten", {
      p_betrieb_id: betrieb,
      p_von: iso(from),
      p_bis: iso(to),
      p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    if (error || data == null) {
      // Offline / failed — keep whatever cache we showed and flag it as stale.
      setStale(!!cached);
    } else {
      const list = data as CalShift[];
      setShifts(list);
      setStale(false);
      writeCache(cacheKey, list);
      syncReminders(list);
    }
    setLoading(false);
  }, [betrieb, monthKey, cacheKey, activeMitarbeiter?.id, syncReminders]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // When connectivity returns while showing stale data, revalidate.
  useEffect(() => {
    const unsub = NetInfo.addEventListener((s) => {
      if (s.isConnected && stale) load();
    });
    return () => unsub();
  }, [stale, load]);

  // Load the team + roles a chef needs to build a custom shift (once per business).
  useEffect(() => {
    if (!betrieb || !isChef) return;
    let cancelled = false;
    (async () => {
      const [mitarb, roles, roleLinks] = await Promise.all([
        supabase.from("mitarbeiter").select("id, vorname, nachname, rolle_typ").eq("betrieb_id", betrieb).order("nachname"),
        supabase.from("rollen").select("id, name").eq("betrieb_id", betrieb),
        supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", betrieb),
      ]);
      if (cancelled) return;
      setTeam((mitarb.data ?? []) as any[]);
      const roleById = new Map((roles.data ?? []).map((r: any) => [r.id, r.name]));
      setRollen((roles.data ?? []) as { id: string; name: string }[]);
      const rn: Record<string, string[]> = {};
      const rid: Record<string, string[]> = {};
      (roleLinks.data ?? []).forEach((l: any) => {
        const name = roleById.get(l.rolle_id);
        if (!name) return;
        (rn[l.mitarbeiter_id] ??= []).push(name);
        (rid[l.mitarbeiter_id] ??= []).push(l.rolle_id);
      });
      setRoleNames(rn);
      setRoleIdsByMember(rid);
    })();
    return () => { cancelled = true; };
  }, [betrieb, isChef]);

  const slide = useAnimatedStyle(() => ({
    left: withTiming(`${idx * 50 + 1}%`, { duration: 200 }),
  }));

  // Step by the active view's unit: ±1 week, ±1 month.
  const move = (dir: 1 | -1) => setCursor((c) => {
    const d = new Date(c);
    if (mode === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    return d;
  });

  const title = useMemo(() => {
    if (mode === "month") {
      return cursor.toLocaleDateString(lang, { month: "long", year: "numeric" });
    }
    const s = startOfWeek(cursor);
    const e = new Date(s);
    e.setDate(s.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    return `${s.toLocaleDateString(lang, opts)} – ${e.toLocaleDateString(lang, opts)}`;
  }, [mode, cursor, lang]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      {/* top navigation bar */}
      <View style={[styles.topbar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={() => move(-1)} hitSlop={10} style={styles.navBtn}>
          <ChevronLeft color={theme.text} size={26} />
        </Pressable>
        <Pressable onPress={() => setCursor(new Date())} hitSlop={6} style={styles.titleWrap}>
          <Text style={[styles.topTitle, { color: theme.text }]}>{title}</Text>
        </Pressable>
        <Pressable onPress={() => move(1)} hitSlop={10} style={styles.navBtn}>
          <ChevronRight color={theme.text} size={26} />
        </Pressable>
      </View>

      {stale && (
        <View style={[styles.offlineBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <WifiOff color={theme.muted} size={14} />
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: "600" }}>{t("calendar.offlineStale")}</Text>
        </View>
      )}

      {/* segmented control */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {mode === "week" && <WeekView date={cursor} shifts={shifts} onOpenShift={setOpenShiftId} />}
            {mode === "month" && <MonthView date={cursor} shifts={shifts} onPickDay={(d) => { setCursor(d); setMode("week"); }} />}
          </>
        )}
      </View>
       <View style={[styles.toggle, { backgroundColor: theme.surface }]}>
        <Animated.View style={[styles.highlight, { backgroundColor: theme.bg }, slide]} />
        {modes.map((m) => (
          <Pressable key={m} style={styles.third} onPress={() => setMode(m)}>
            <Text style={[styles.toggleText, { color: mode === m ? theme.text : theme.muted }]}>
              {t(`calendar.${m}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {isChef && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.accent, shadowColor: theme.text }]}
          onPress={() => setShowCreate(true)}
        >
          <CalendarPlus color={theme.accentText} size={24} />
        </Pressable>
      )}
      {isChef && (
        <CreateShiftModal
          visible={showCreate} theme={theme} t={t} lang={lang} betrieb={betrieb}
          team={team} rollen={rollen} roleNames={roleNames} roleIdsByMember={roleIdsByMember}
          onClose={() => setShowCreate(false)} onCreated={load}
        />
      )}

      {/* Bottom-left: publish the draft (planned) shifts, or throw the proposal away. */}
      {isChef && plannedCount > 0 && (
        <View style={styles.plannedActions}>
          <Pressable
            style={[styles.fabLeft, { backgroundColor: theme.accent, shadowColor: theme.text }]}
            onPress={() => setConfirmPublish(true)}
          >
            <Check color={theme.accentText} size={20} />
            <Text style={{ color: theme.accentText, fontWeight: "800", fontSize: 14 }}>{t("calendar.confirmPlanned")}</Text>
          </Pressable>
          <Pressable
            style={[styles.discardBtn, { backgroundColor: theme.surface, borderColor: RED, shadowColor: theme.text }]}
            onPress={() => setConfirmDiscard(true)}
          >
            <Trash2 color={RED} size={18} />
            <Text style={{ color: RED, fontWeight: "800", fontSize: 14 }}>{t("calendar.deletePlanned")}</Text>
          </Pressable>
        </View>
      )}

      <Modal visible={confirmPublish} transparent animationType="fade" onRequestClose={() => setConfirmPublish(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmPublish(false)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 17, marginBottom: 8 }}>{t("calendar.confirmPlannedTitle")}</Text>
            <Text style={{ color: theme.muted, fontSize: 14, marginBottom: 18 }}>
              {t("calendar.confirmPlannedBody", { count: plannedCount })}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={[styles.confirmBtn, { borderColor: theme.border }]} onPress={() => setConfirmPublish(false)} disabled={publishing}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{t("calendar.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={publishPlanned} disabled={publishing}>
                <Text style={{ color: theme.accentText, fontWeight: "800" }}>{publishing ? "…" : t("calendar.confirmPlannedGo")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={confirmDiscard} transparent animationType="fade" onRequestClose={() => setConfirmDiscard(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDiscard(false)}>
          <Pressable style={[styles.confirmSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 17, marginBottom: 8 }}>{t("calendar.deletePlannedTitle")}</Text>
            <Text style={{ color: theme.muted, fontSize: 14, marginBottom: 18 }}>
              {t("calendar.deletePlannedBody", { count: plannedCount })}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable style={[styles.confirmBtn, { borderColor: theme.border }]} onPress={() => setConfirmDiscard(false)} disabled={discarding}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{t("calendar.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: RED, borderColor: RED }]} onPress={discardPlanned} disabled={discarding}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>{discarding ? "…" : t("calendar.deletePlannedGo")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Shift detail popup — same view as the /shift/[id] screen, shown inline. */}
      <Modal
        visible={!!openShiftId}
        transparent
        animationType="slide"
        onRequestClose={() => { setOpenShiftId(null); load(); }}
      >
        <View style={styles.detailBackdrop}>
          <SafeAreaView edges={["bottom"]} style={[styles.detailSheet, { backgroundColor: theme.bg }]}>
            {openShiftId && (
              <ShiftDetailView id={openShiftId} onClose={() => { setOpenShiftId(null); load(); }} />
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
function packLanes(segs: DaySeg[]) {
  const sorted = [...segs].sort((a, b) => a.from - b.from);
  const laneEnds: number[] = [];          // end-minute of the last segment in each lane
  const placed = sorted.map((seg) => {
    let lane = laneEnds.findIndex((e) => e <= seg.from);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(seg.to); }
    else laneEnds[lane] = seg.to;
    return { seg, lane };
  });
  return { placed, laneCount: laneEnds.length };
}
// ---------- WEEK ----------
// A Studo-style time grid: a day-header row, an hour axis down the left, and
// seven day columns with shift blocks positioned by their start/end time.
const WEEK_GUTTER = 40;
const WEEK_PX_PER_MIN = 0.9;

function WeekView({ date, shifts, onOpenShift }: { date: Date; shifts: CalShift[]; onOpenShift: (id: string) => void }) {
  const { theme } = useTheme();
  const { lang } = useI18n();
  const start = startOfWeek(date);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(start, i)), [start.getTime()]);
  const todayIso = iso(new Date());

  // Live clock for the "now" line — ticks once a minute.
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);
  const todayIdx = days.findIndex((d) => iso(d) === todayIso);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Segments per day, and the visible time window across the whole week.
  const perDay = useMemo(() => days.map((d) => daySegments(shifts, d)), [days, shifts]);
  const { from, to } = useMemo(() => {
    const all = perDay.flat();
    if (!all.length) return { from: 8 * 60, to: 18 * 60 };
    return {
      from: Math.max(0, Math.min(...all.map((s) => s.from)) - 60),
      to: Math.min(24 * 60, Math.max(...all.map((s) => s.to)) + 60),
    };
  }, [perDay]);

  // Scale so the whole time window fills the available height — no scrolling.
  const [gridH, setGridH] = useState(0);
  const pxPerMin = gridH > 0 ? gridH / (to - from) : WEEK_PX_PER_MIN;
  const firstHour = Math.floor(from / 60);
  const lastHour = Math.ceil(to / 60);
  const hours = Array.from({ length: lastHour - firstHour + 1 }, (_, i) => firstHour + i);

  return (
    <View style={{ flex: 1 }}>
      {/* fixed day headers */}
      <View style={[styles.weekHeaderRow, { borderBottomColor: theme.border }]}>
        <View style={{ width: WEEK_GUTTER }} />
        {days.map((d, i) => {
          const isToday = iso(d) === todayIso;
          return (
            <View key={i} style={styles.weekHeadCell}>
              <Text style={[styles.weekHeadDow, { color: theme.muted }]}>
                {d.toLocaleDateString(lang, { weekday: "short" })}
              </Text>
              <View style={[styles.weekHeadNum, isToday && { backgroundColor: theme.accent }]}>
                <Text style={{ color: isToday ? theme.accentText : theme.text, fontWeight: "700", fontSize: 13 }}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* time grid — fills remaining height */}
      <View
        style={{ flex: 1, flexDirection: "row", paddingBottom: 8 }}
        onLayout={(e) => setGridH(e.nativeEvent.layout.height - 8)}
      >
        {/* hour axis */}
        <View style={{ width: WEEK_GUTTER }}>
          {hours.map((h) => (
            <Text key={h} style={[styles.weekHourLabel, { top: (h * 60 - from) * pxPerMin - 6, color: theme.muted }]}>
              {h}:00
            </Text>
          ))}
        </View>

        {/* columns */}
        <View style={{ flex: 1, position: "relative" }}>
          {/* hour lines behind everything */}
          {hours.map((h) => (
            <View key={h} style={[styles.weekHourLine, { top: (h * 60 - from) * pxPerMin, borderColor: theme.border }]} />
          ))}
          <View style={{ flexDirection: "row", position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
            {days.map((d, i) => {
              const { placed, laneCount } = packLanes(perDay[i]);
              const isToday = i === todayIdx;
              const showNow = isToday && nowMin >= from && nowMin <= to;
              return (
                <View key={i} style={[styles.weekCol, { borderLeftColor: theme.border }, isToday && { backgroundColor: theme.accent + "1A" }]}>
                  {placed.map(({ seg, lane }) => {
                    const w = 100 / laneCount;
                    return (
                      <WeekGridBlock
                        key={seg.shift.id + (seg.tail ? "-tail" : "")}
                        shift={seg.shift}
                        onOpen={onOpenShift}
                        style={{
                          position: "absolute",
                          top: (seg.from - from) * pxPerMin,
                          height: Math.max(12, (seg.to - seg.from) * pxPerMin - 2),
                          left: `${lane * w}%`,
                          width: `${w}%`,
                        }}
                      />
                    );
                  })}
                  {showNow && (
                    <View style={[styles.nowLine, { top: (nowMin - from) * pxPerMin }]} pointerEvents="none">
                      <View style={styles.nowDot} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

// A compact shift block sized for the narrow week columns.
function WeekGridBlock({ shift, style, onOpen }: { shift: CalShift; style?: any; onOpen: (id: string) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const v = shiftVisual(shift, theme.accent);
  return (
    <Pressable
      onPress={() => onOpen(shift.id)}
      style={[
        styles.weekBlock,
        { backgroundColor: v.bg, borderColor: v.dashed ? "#ffffffcc" : theme.bg, opacity: v.opacity },
        v.dashed && { borderStyle: "dashed" },
        style,
      ]}
    >
      <View style={styles.blockTitleRow}>
        <Text style={[styles.weekBlockTitle, v.canceled && styles.strike]} numberOfLines={1}>
          {shift.label || t("calendar.shift")}
        </Text>
        {shift.understaffed ? <AlertTriangle color="#FFD400" size={11} /> : null}
        {shift.swap_wanted ? <Repeat color="#fff" size={10} /> : null}
        {shift.notiz_anzahl ? <StickyNote color="#fff" size={10} /> : null}
      </View>
      <Text style={styles.weekBlockTime} numberOfLines={1}>{hhmm(shift.start_zeit)}</Text>
      <Text style={styles.weekBlockTime} numberOfLines={1}>{hhmm(shift.end_zeit)}</Text>
      {shift.participants.length > 0 && (
        <Text style={styles.weekBlockNames} numberOfLines={3}>
          {shift.participants.map((p) => p.name.split(" ")[0]).join(", ")}
        </Text>
      )}
    </Pressable>
  );
}

// ---------- MONTH ----------
function MonthView({ date, shifts, onPickDay }: { date: Date; shifts: CalShift[]; onPickDay: (d: Date) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // lead blanks, Monday start
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const cells: (Date | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(date.getFullYear(), date.getMonth(), i + 1)),
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      <View style={styles.monthHeader}>
        {WEEKDAY_KEYS.map((k, i) => (
          <Text key={i} style={[styles.monthHeaderCell, { color: theme.muted }]}>{t(`calendar.${k}`)}</Text>
        ))}
      </View>
      <View style={styles.monthGrid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.monthCell} />;
          const segs = daySegments(shifts, d);
          const has = segs.length > 0;
          const hasNote = segs.some((seg) => seg.shift.notiz_anzahl);
          return (
            <Pressable key={i} style={styles.monthCell} onPress={() => onPickDay(d)}>
              <View style={[
                styles.monthDay,
                has && { backgroundColor: theme.accent },
              ]}>
                <Text style={{ color: has ? theme.accentText : theme.text }}>{d.getDate()}</Text>
                {hasNote ? (
                  <StickyNote
                    color={has ? theme.accentText : theme.muted}
                    size={10}
                    style={styles.monthNoteDot}
                  />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ---------- shared ----------
function Empty({ text }: { text: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={{ color: theme.muted }}>{text}</Text>
    </View>
  );
}

// =====================================================================
// Create custom shift (chef only)
// =====================================================================
const RED = "#C1442D";
type ShiftMode = "zuweisung" | "ausschreibung";
const pad2 = (n: number) => String(n).padStart(2, "0");
const dateToStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const timeToStr = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const atTime = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };

// Map a raw Postgres constraint error (HC-1..HC-5, working-time limits) coming
// from benutzerdefinierte_schicht_erstellen into a friendly, translated message.
// The DB messages embed the offending mitarbeiter UUID — resolve it to a name.
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
function translateShiftError(msg: string, team: any[], t: any): string {
  const uuid = msg.match(UUID_RE)?.[0];
  const mem = uuid ? team.find((m: any) => m.id === uuid) : null;
  const name = mem ? `${mem.vorname} ${mem.nachname}`.trim() : t("manager.csErrSomeone");
  if (msg.includes("HC-2")) return t("manager.csErrOverlap", { name });
  if (msg.includes("HC-1")) return t("manager.csErrNoAvail", { name });
  if (msg.includes("HC-3")) return t("manager.csErrRole", { name });
  if (msg.includes("HC-4")) return t("manager.csErrRest", { name });
  if (msg.includes("HC-5") || msg.includes("Wochenhoechstarbeitszeit")) return t("manager.csErrWeekHours", { name });
  if (msg.includes("Tageshoechstarbeitszeit")) return t("manager.csErrDayHours", { name });
  if (msg.includes("deaktiviert")) return t("manager.csErrInactive", { name });
  return t("manager.csError");
}

function CreateShiftModal({ visible, theme, t, lang, betrieb, team, rollen, roleNames, roleIdsByMember, onClose, onCreated }: any) {
  const [dateVal, setDateVal] = useState<Date>(() => new Date());
  const [startVal, setStartVal] = useState<Date>(() => atTime(9, 0));
  const [endVal, setEndVal] = useState<Date>(() => atTime(17, 0));
  const [kommentar, setKommentar] = useState("");
  const [mode, setMode] = useState<ShiftMode>("zuweisung");
  const [assign, setAssign] = useState<Record<string, string>>({}); // mitarbeiter_id -> rolle_id
  const [bedarf, setBedarf] = useState<Record<string, number>>({}); // rolle_id -> amount
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // People flagged as on-vacation / prefer-not-to-work for the chosen day.
  const [warnings, setWarnings] = useState<{ name: string; reasons: string[] }[] | null>(null);
  // Search box + role filter for the assignee picker.
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null); // rolle_id or null = all

  const reset = () => {
    setDateVal(new Date()); setStartVal(atTime(9, 0)); setEndVal(atTime(17, 0));
    setKommentar(""); setMode("zuweisung"); setAssign({}); setBedarf({}); setError(null); setWarnings(null);
    setQuery(""); setRoleFilter(null);
  };
  const close = () => { reset(); onClose(); };

  const assignedIds = Object.entries(assign).filter(([, r]) => r).map(([mid]) => mid);
  const bedarfList = Object.entries(bedarf).filter(([, n]) => n > 0).map(([rid, n]) => ({ rolle_id: rid, benoetigt: n }));

  // Assignee list filtered by search text + role, then sorted by first role name.
  const visibleTeam = useMemo(() => {
    const q = query.trim().toLowerCase();
    const roleOrder = (m: any) =>
      ((roleNames[m.id] ?? [])[0] ?? "￿").toLowerCase(); // people with no role sink to the bottom
    return (team as any[])
      .filter((m) => {
        if (q && !`${m.vorname} ${m.nachname}`.toLowerCase().includes(q)) return false;
        if (roleFilter && !(roleIdsByMember[m.id] ?? []).includes(roleFilter)) return false;
        return true;
      })
      .sort((a, b) => roleOrder(a).localeCompare(roleOrder(b)) ||
        `${a.vorname} ${a.nachname}`.localeCompare(`${b.vorname} ${b.nachname}`));
  }, [team, query, roleFilter, roleNames, roleIdsByMember]);

  const timesValid = timeToStr(startVal) !== timeToStr(endVal);
  const canSubmit = timesValid && (mode === "zuweisung" ? assignedIds.length > 0 : bedarfList.length > 0);

  const toggleMember = (m: any) => {
    const roleIds: string[] = roleIdsByMember[m.id] ?? [];
    if (roleIds.length === 0) return; // no role → can't be scheduled
    setAssign((prev) => {
      const next = { ...prev };
      if (next[m.id]) delete next[m.id];
      else next[m.id] = roleIds[0];
      return next;
    });
  };
  const setMemberRole = (id: string, rid: string) => setAssign((prev) => ({ ...prev, [id]: rid }));
  const bump = (rid: string, d: number) =>
    setBedarf((prev) => ({ ...prev, [rid]: Math.max(0, Math.min(99, (prev[rid] ?? 0) + d)) }));

  // Actually creates the shift (after any warnings were acknowledged).
  const doCreate = async () => {
    setWarnings(null);
    setBusy(true); setError(null);
    const zuweisungen = assignedIds.map((mid) => ({ mitarbeiter_id: mid, rolle_id: assign[mid] }));
    const { error: err } = await supabase.rpc("benutzerdefinierte_schicht_erstellen", {
      p_betrieb_id: betrieb,
      p_datum: dateToStr(dateVal),
      p_start: timeToStr(startVal),
      p_end: timeToStr(endVal),
      p_kommentar: kommentar,
      p_modus: mode,
      p_zuweisungen: mode === "zuweisung" ? zuweisungen : [],
      p_bedarf: mode === "ausschreibung" ? bedarfList : [],
    });
    setBusy(false);
    if (err) { setError(translateShiftError(err.message ?? "", team, t)); return; }
    close();
    onCreated();
  };

  const submit = async () => {
    if (!canSubmit) return;
    // Open postings have no assignees to warn about — create directly.
    if (mode !== "zuweisung") { doCreate(); return; }
    setBusy(true); setError(null);
    const { data, error: err } = await supabase.rpc("schicht_zuweisung_warnungen", {
      p_betrieb_id: betrieb,
      p_datum: dateToStr(dateVal),
      p_mitarbeiter_ids: assignedIds,
    });
    setBusy(false);
    // If the pre-check itself fails, don't block creation — let the DB decide.
    if (err) { doCreate(); return; }
    const flagged = (data ?? [])
      .map((r: any) => {
        const mem = team.find((m: any) => m.id === r.mitarbeiter_id);
        const name = mem ? `${mem.vorname} ${mem.nachname}`.trim() : t("manager.csErrSomeone");
        const reasons: string[] = [];
        if (r.im_urlaub) reasons.push(t("manager.csWarnVacation"));
        if (r.ungerne) reasons.push(t("manager.csWarnUngerne"));
        return { name, reasons };
      })
      .filter((w: any) => w.reasons.length > 0);
    if (flagged.length > 0) { setWarnings(flagged); return; }
    doCreate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: "88%" }]}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("manager.createShift")}</Text>
            <Pressable onPress={close} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csDate")}</Text>
              <DateTimeField mode="date" value={dateVal} onChange={setDateVal} accent={theme.accent} textColor={theme.text} locale={lang} />
            </View>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csStart")}</Text>
                <DateTimeField mode="time" value={startVal} onChange={setStartVal} accent={theme.accent} textColor={theme.text} locale={lang} />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csEnd")}</Text>
                <DateTimeField mode="time" value={endVal} onChange={setEndVal} accent={theme.accent} textColor={theme.text} locale={lang} />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csComment")}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                placeholder={t("manager.csCommentPlaceholder")} placeholderTextColor={theme.muted}
                value={kommentar} onChangeText={setKommentar} multiline maxLength={140}
              />
            </View>

            {/* mode switch */}
            <View style={[styles.modeTabs, { borderColor: theme.border, marginTop: 6 }]}>
              {(["zuweisung", "ausschreibung"] as ShiftMode[]).map((mo) => {
                const active = mode === mo;
                return (
                  <Pressable key={mo} onPress={() => setMode(mo)} style={[styles.modeTabBtn, active && { backgroundColor: theme.accent }]}>
                    <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: "700", fontSize: 13 }}>
                      {t(mo === "zuweisung" ? "manager.csModeAssign" : "manager.csModeOpen")}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {mode === "zuweisung" ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>{t("manager.csPickPeople")}</Text>

                {/* Search by name */}
                <View style={[styles.csSearch, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                  <Search color={theme.muted} size={16} />
                  <TextInput
                    style={{ flex: 1, color: theme.text, paddingVertical: 8 }}
                    placeholder={t("manager.csSearchPeople")} placeholderTextColor={theme.muted}
                    value={query} onChangeText={setQuery} autoCorrect={false}
                  />
                  {query.length > 0 && (
                    <Pressable onPress={() => setQuery("")} hitSlop={8}><X color={theme.muted} size={16} /></Pressable>
                  )}
                </View>

                {/* Filter by role */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} keyboardShouldPersistTaps="handled">
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[{ id: null as string | null, name: t("manager.csAllRoles") }, ...rollen].map((r: any) => {
                      const on = roleFilter === r.id;
                      return (
                        <Pressable key={r.id ?? "all"} onPress={() => setRoleFilter(r.id)}
                          style={[styles.csChip, { borderColor: theme.border }, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                          <Text style={{ color: on ? theme.accentText : theme.text, fontSize: 12, fontWeight: "600" }}>{r.name}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                {visibleTeam.length === 0 && (
                  <Text style={{ color: theme.muted, fontSize: 13, marginTop: 12 }}>{t("manager.csNoPeople")}</Text>
                )}
                {visibleTeam.map((m: any) => {
                  const roleIds: string[] = roleIdsByMember[m.id] ?? [];
                  const selected = !!assign[m.id];
                  const memberRoleNames: string[] = roleNames[m.id] ?? [];
                  return (
                    <View key={m.id} style={[styles.csMemberRow, { borderColor: theme.border }]}>
                      <Pressable style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }} onPress={() => toggleMember(m)} disabled={roleIds.length === 0}>
                        <View style={[styles.checkbox, { borderColor: theme.border }, selected && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                          {selected && <Check color={theme.accentText} size={14} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: roleIds.length === 0 ? theme.muted : theme.text, fontWeight: "600" }}>{m.vorname} {m.nachname}</Text>
                          <Text style={{ color: theme.muted, fontSize: 12 }}>{memberRoleNames.join(", ") || t("manager.csNoRole")}</Text>
                        </View>
                      </Pressable>
                      {selected && roleIds.length > 1 && (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, maxWidth: 150, justifyContent: "flex-end" }}>
                          {roleIds.map((rid) => {
                            const rname = rollen.find((r: any) => r.id === rid)?.name ?? "";
                            const on = assign[m.id] === rid;
                            return (
                              <Pressable key={rid} onPress={() => setMemberRole(m.id, rid)}
                                style={[styles.csChip, { borderColor: theme.border }, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                                <Text style={{ color: on ? theme.accentText : theme.text, fontSize: 12, fontWeight: "600" }}>{rname}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  );
                })}
              </>
            ) : (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 12 }]}>{t("manager.csRolesNeeded")}</Text>
                {rollen.map((r: any) => {
                  const n = bedarf[r.id] ?? 0;
                  return (
                    <View key={r.id} style={[styles.csMemberRow, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{r.name}</Text>
                      <View style={styles.csStepper}>
                        <Pressable style={[styles.csStepBtn, { borderColor: theme.border }]} onPress={() => bump(r.id, -1)} disabled={n === 0}>
                          <Minus color={n === 0 ? theme.muted : theme.text} size={16} />
                        </Pressable>
                        <Text style={{ color: theme.text, fontWeight: "700", minWidth: 20, textAlign: "center" }}>{n}</Text>
                        <Pressable style={[styles.csStepBtn, { borderColor: theme.border }]} onPress={() => bump(r.id, 1)}>
                          <Plus color={theme.text} size={16} />
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 6 }}>{t("manager.csOpenHint")}</Text>
              </>
            )}

            {error ? <Text style={{ color: RED, fontSize: 13, marginTop: 10 }}>{error}</Text> : null}

            <Pressable
              style={[styles.submit, { backgroundColor: canSubmit ? theme.accent : theme.border, marginTop: 16 }]}
              onPress={submit} disabled={!canSubmit || busy}
            >
              <Text style={[styles.submitText, { color: canSubmit ? theme.accentText : theme.muted }]}>
                {busy ? "…" : mode === "zuweisung" ? t("manager.csCreate") : t("manager.csPost")}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>

      {/* Warning: assignee is on vacation or prefers not to work this day */}
      <Modal visible={!!warnings} transparent animationType="fade" onRequestClose={() => setWarnings(null)}>
        <View style={[styles.backdrop, { justifyContent: "center", padding: 24 }]}>
          <View style={[styles.confirmCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <AlertTriangle color={RED} size={20} />
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("manager.csWarnTitle")}</Text>
            </View>
            {(warnings ?? []).map((w, i) => (
              <Text key={i} style={{ color: theme.text, fontSize: 14, marginBottom: 6 }}>
                <Text style={{ fontWeight: "700" }}>{w.name}</Text>{` — ${w.reasons.join(", ")}`}
              </Text>
            ))}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <Pressable style={[styles.confirmBtn, { borderColor: theme.border }]} onPress={() => setWarnings(null)}>
                <Text style={{ color: theme.text, fontWeight: "700" }}>{t("manager.csWarnCancel")}</Text>
              </Pressable>
              <Pressable style={[styles.confirmBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={doCreate}>
                <Text style={{ color: theme.accentText, fontWeight: "700" }}>{t("manager.csWarnAssignAnyway")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingTop: 20 },
  screen: { flex: 1 },
  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4 },
  titleWrap: { flex: 1, alignItems: "center" },
  topTitle: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  toggle: { flexDirection: "row", borderRadius: 999, padding: 4, margin: 16, position: "relative" },
  highlight: { position: "absolute", top: 4, bottom: 4, width: "49%", borderRadius: 999 },
  third: { flex: 1, paddingVertical: 12, alignItems: "center" },
  toggleText: { fontSize: 15, fontWeight: "600" },

  hourLine: { position: "absolute", left: 0, right: 0, borderTopWidth: 1, paddingLeft: 2 },
  hourLabel: { fontSize: 11 },

  block: {
  borderRadius: 10,
  padding: 10,
  justifyContent: "center",
  overflow: "hidden",
  borderWidth: 1.5,
  },
  blockTitle: { color: "#fff", fontWeight: "700", fontSize: 14, flexShrink: 1 },
  blockTitleRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  blockSub: { color: "#fff", fontSize: 11, opacity: 0.8, marginTop: 2 },
  blockFlag: { color: "#fff", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 1 },
  strike: { textDecorationLine: "line-through" },
  roleTag: { alignSelf: "flex-start", backgroundColor: "#ffffff33", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1, marginTop: 3 },
  roleTagText: { color: "#fff", fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },

  weekHeaderRow: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, paddingBottom: 6, paddingTop: 2 },
  weekHeadCell: { flex: 1, alignItems: "center", gap: 3 },
  weekHeadDow: { fontSize: 11, fontWeight: "600", textTransform: "uppercase" },
  weekHeadNum: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  weekHourLabel: { position: "absolute", right: 6, fontSize: 10 },
  weekHourLine: { position: "absolute", left: 0, right: 0, borderTopWidth: StyleSheet.hairlineWidth },
  weekCol: { flex: 1, borderLeftWidth: StyleSheet.hairlineWidth, position: "relative" },
  weekBlock: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 3, paddingVertical: 2, overflow: "hidden" },
  nowLine: { position: "absolute", left: 0, right: 0, height: 2, backgroundColor: "#fff", zIndex: 10 },
  nowDot: { position: "absolute", left: -3, top: -2, width: 6, height: 6, borderRadius: 3, backgroundColor: "#fff" },
  weekBlockTitle: { color: "#fff", fontWeight: "700", fontSize: 10, flexShrink: 1 },
  weekBlockTime: { color: "#fff", fontSize: 9, opacity: 0.85 },
  weekBlockNames: { color: "#fff", fontSize: 9, opacity: 0.95, marginTop: 1, fontWeight: "600" },

  monthHeader: { flexDirection: "row", marginBottom: 8 },
  monthHeaderCell: { flex: 1, textAlign: "center", fontWeight: "600" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  monthDay: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  monthNoteDot: { position: "absolute", top: 1, right: 1 },
  offlineBar: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },

  fab: {
    position: "absolute", right: 20, bottom: 92, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  plannedActions: { position: "absolute", left: 20, bottom: 92, gap: 10, alignItems: "flex-start" },
  fabLeft: {
    height: 48, borderRadius: 24,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8,
    shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },
  discardBtn: {
    height: 44, borderRadius: 22, borderWidth: 1.5,
    paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 8,
    shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  confirmBackdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 28 },
  confirmSheet: { width: "100%", maxWidth: 420, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 20 },
  confirmBtn: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  // shift detail popup
  detailBackdrop: { flex: 1, backgroundColor: "#00000088", justifyContent: "flex-end" },
  detailSheet: { height: "92%", borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: "hidden" },

  // create-shift sheet
  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },
  field: { marginTop: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },
  modeTabs: { flexDirection: "row", borderWidth: 1.5, borderRadius: 10, padding: 3, gap: 3 },
  modeTabBtn: { flex: 1, paddingVertical: 9, borderRadius: 8, alignItems: "center" },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  csMemberRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  csChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
  csSearch: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, marginTop: 8 },
  csStepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  csStepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  submit: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "700" },
  confirmCard: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 20 },
});
