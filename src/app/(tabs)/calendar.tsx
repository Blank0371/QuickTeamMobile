import { router, useFocusEffect } from "expo-router";
import { AlertTriangle, CalendarPlus, Check, ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet,
  Text, TextInput,
  View
} from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { DateTimeField } from "../../components/DateTimeField";
import { ShiftDetailView } from "../shift/[id]";

type ViewMode = "day" | "week" | "month";

// A shift as returned by the kalender_schichten RPC (roster already trimmed by
// the business visibility settings on the server).
export type CalShift = {
  id: string;
  datum: string;      // YYYY-MM-DD
  start_zeit: string; // HH:MM:SS
  end_zeit: string;
  label: string | null;
  kommentar: string | null;
  mine: boolean;
  can_edit: boolean;
  participants: { name: string; role_name: string | null; attendet: boolean; is_me: boolean }[];
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

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const betrieb = activeMitarbeiter?.betrieb_id ?? null;
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [mode, setMode] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState(new Date()); // the focused day
  const [shifts, setShifts] = useState<CalShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [openShiftId, setOpenShiftId] = useState<string | null>(null); // shift shown in the detail popup

  // Chef-only data for the "create shift" sheet.
  const [showCreate, setShowCreate] = useState(false);
  const [team, setTeam] = useState<any[]>([]);
  const [rollen, setRollen] = useState<{ id: string; name: string }[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string[]>>({});
  const [roleIdsByMember, setRoleIdsByMember] = useState<Record<string, string[]>>({});

  const modes: ViewMode[] = ["day", "week", "month"];
  const idx = modes.indexOf(mode);

  // Reload whenever the focused month (or business) changes — the window we
  // fetch (month ± 7 days) always covers the visible day/week/month.
  const monthKey = `${cursor.getFullYear()}-${cursor.getMonth()}`;
  const load = useCallback(async () => {
    if (!betrieb) return;
    setLoading(true);
    const [y, mo] = monthKey.split("-").map(Number);
    const from = new Date(y, mo, 1); from.setDate(from.getDate() - 7);
    const to = new Date(y, mo + 1, 0); to.setDate(to.getDate() + 7);
    const { data } = await supabase.rpc("kalender_schichten", {
      p_betrieb_id: betrieb,
      p_von: iso(from),
      p_bis: iso(to),
      p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    setShifts((data as CalShift[]) ?? []);
    setLoading(false);
  }, [betrieb, monthKey, activeMitarbeiter?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
    left: withTiming(`${idx * 33.33 + 1}%`, { duration: 200 }),
  }));

  // Step by the active view's unit: ±1 day, ±1 week, ±1 month.
  const move = (dir: 1 | -1) => setCursor((c) => {
    const d = new Date(c);
    if (mode === "day") d.setDate(d.getDate() + dir);
    else if (mode === "week") d.setDate(d.getDate() + 7 * dir);
    else d.setMonth(d.getMonth() + dir);
    return d;
  });

  const title = useMemo(() => {
    if (mode === "day") {
      return cursor.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
    }
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

      {/* segmented control */}
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : (
          <>
            {mode === "day" && <DayView date={cursor} shifts={shifts} onOpenShift={setOpenShiftId} />}
            {mode === "week" && <WeekView date={cursor} shifts={shifts} onOpenShift={setOpenShiftId} />}
            {mode === "month" && <MonthView date={cursor} shifts={shifts} onPickDay={(d) => { setCursor(d); setMode("day"); }} />}
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
function packLanes(shifts: CalShift[]) {
  const sorted = [...shifts].sort((a, b) => toMinutes(hhmm(a.start_zeit)) - toMinutes(hhmm(b.start_zeit)));
  const laneEnds: number[] = [];          // end-time of the last shift in each lane
  const placed = sorted.map((s) => {
    const start = toMinutes(hhmm(s.start_zeit));
    const end = toMinutes(hhmm(s.end_zeit));
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else laneEnds[lane] = end;
    return { shift: s, lane };
  });
  return { placed, laneCount: laneEnds.length };
}
// ---------- DAY ----------
function DayView({ date, shifts, onOpenShift }: { date: Date; shifts: CalShift[]; onOpenShift: (id: string) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const dayShifts = shifts.filter((s) => s.datum === iso(date));

  const { from, to } = useMemo(() => {
    if (!dayShifts.length) return { from: 8 * 60, to: 18 * 60 };
    const starts = dayShifts.map((s) => toMinutes(hhmm(s.start_zeit)));
    const ends = dayShifts.map((s) => toMinutes(hhmm(s.end_zeit)));
    return {
      from: Math.max(0, Math.min(...starts) - 60),
      to: Math.min(24 * 60, Math.max(...ends) + 60),
    };
  }, [dayShifts]);

  const { placed, laneCount } = useMemo(() => packLanes(dayShifts), [dayShifts]);

  const PX_PER_MIN = 1.1;
  const height = (to - from) * PX_PER_MIN;
  const GUTTER = 56;   // space for hour labels

  if (!dayShifts.length) return <Empty text={t("calendar.noShifts")} />;

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <View style={{ height }}>
        {/* hour lines */}
        {Array.from({ length: Math.ceil(to / 60) - Math.floor(from / 60) + 1 }).map((_, i) => {
          const hour = Math.floor(from / 60) + i;
          const top = (hour * 60 - from) * PX_PER_MIN;
          return (
            <View key={hour} style={[styles.hourLine, { top, borderColor: theme.border }]}>
              <Text style={[styles.hourLabel, { color: theme.muted }]}>{`${hour}:00`}</Text>
            </View>
          );
        })}

        {/* shift blocks, packed into lanes */}
        <View style={{ position: "absolute", top: 0, bottom: 0, left: GUTTER, right: 8 }}>
          {placed.map(({ shift: s, lane }) => {
            const top = (toMinutes(hhmm(s.start_zeit)) - from) * PX_PER_MIN;
            const h = (toMinutes(hhmm(s.end_zeit)) - toMinutes(hhmm(s.start_zeit))) * PX_PER_MIN;
            const laneWidthPct = 100 / laneCount;
            return (
              <ShiftBlock
                key={s.id}
                shift={s}
                onOpen={onOpenShift}
                style={{
                  position: "absolute",
                  top,
                  height: h,
                  left: `${lane * laneWidthPct}%`,
                  width: `${laneWidthPct}%`,
                }}
              />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ---------- WEEK ----------
function WeekView({ date, shifts, onOpenShift }: { date: Date; shifts: CalShift[]; onOpenShift: (id: string) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const start = startOfWeek(date);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
      {days.map((d, i) => {
        const dayShifts = shifts.filter((s) => s.datum === iso(d));
        return (
          <View key={i} style={styles.weekRow}>
            <Text style={[styles.weekDay, { color: theme.muted }]}>{t(`calendar.${WEEKDAY_KEYS[i]}`)}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              {dayShifts.length === 0 ? (
                <View style={[styles.weekEmpty, { borderColor: theme.border }]} />
              ) : (
                dayShifts.map((s) => <ShiftBlock key={s.id} shift={s} compact onOpen={onOpenShift} />)
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
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
          const has = shifts.some((s) => s.datum === iso(d));
          return (
            <Pressable key={i} style={styles.monthCell} onPress={() => onPickDay(d)}>
              <View style={[
                styles.monthDay,
                has && { backgroundColor: theme.accent },
              ]}>
                <Text style={{ color: has ? theme.accentText : theme.text }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ---------- shared ----------
function ShiftBlock({ shift, style, compact, onOpen }: { shift: CalShift; style?: any; compact?: boolean; onOpen?: (id: string) => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const coworkers = coworkerNames(shift);
  return (
    <Pressable
      onPress={() => (onOpen ? onOpen(shift.id) : router.push({ pathname: "/shift/[id]", params: { id: shift.id } }))}
      style={[
        styles.block,
        { backgroundColor: theme.accent, borderColor: theme.border },
        style,
      ]}
    >
      <Text style={styles.blockTitle} numberOfLines={1}>{shift.label || t("calendar.shift")}</Text>
      {compact ? (
        <Text style={styles.blockSub} numberOfLines={1}>{hhmm(shift.start_zeit)}–{hhmm(shift.end_zeit)}</Text>
      ) : null}
      {coworkers.length > 0 && (
        <Text style={styles.blockSub} numberOfLines={1}>{coworkers.join(", ")}</Text>
      )}
    </Pressable>
  );
}

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

  const reset = () => {
    setDateVal(new Date()); setStartVal(atTime(9, 0)); setEndVal(atTime(17, 0));
    setKommentar(""); setMode("zuweisung"); setAssign({}); setBedarf({}); setError(null); setWarnings(null);
  };
  const close = () => { reset(); onClose(); };

  const assignedIds = Object.entries(assign).filter(([, r]) => r).map(([mid]) => mid);
  const bedarfList = Object.entries(bedarf).filter(([, n]) => n > 0).map(([rid, n]) => ({ rolle_id: rid, benoetigt: n }));

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
                {team.map((m: any) => {
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
  highlight: { position: "absolute", top: 4, bottom: 4, width: "32.5%", borderRadius: 999 },
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
  blockTitle: { color: "#fff", fontWeight: "700", fontSize: 14 },
  blockSub: { color: "#fff", fontSize: 11, opacity: 0.8, marginTop: 2 },

  weekRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  weekDay: { width: 36, fontSize: 15, fontWeight: "700", paddingTop: 8 },
  weekEmpty: { height: 20, borderRadius: 8, borderWidth: 1, borderStyle: "dashed" },

  monthHeader: { flexDirection: "row", marginBottom: 8 },
  monthHeaderCell: { flex: 1, textAlign: "center", fontWeight: "600" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  monthDay: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },

  fab: {
    position: "absolute", right: 20, bottom: 92, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 6,
  },

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
  csStepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  csStepBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  submit: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "700" },
  confirmCard: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 20 },
  confirmBtn: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
});
