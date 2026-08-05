// src/app/(tabs)/scheduling.tsx — employee self-service: absence requests and
// per-day scheduling preferences on future (unplanned) months. UI-only for now
// (local state); no absence/preference persistence exists in the backend yet.
import { CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

const TIMES = ["morning", "afternoon", "evening", "night"] as const;
const ABSENCE = ["sick", "vacation", "other"] as const;
const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const MONTHS_AHEAD = 12; // how far ahead preferences may be set (from next month)
const BLOCKED = "#dc2626"; // color for a disabled navigation direction

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();

type DayPref = "priority" | "preferred" | "vacation";
const PREF_COLOR: Record<DayPref, string> = {
  priority: "#dc2626",  // red
  preferred: "#d97706", // amber
  vacation: "#2563eb",  // blue
};

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

export default function SchedulingScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  // ---- absence form ----
  const [absenceType, setAbsenceType] = useState<(typeof ABSENCE)[number]>("sick");
  const [note, setNote] = useState("");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [absSent, setAbsSent] = useState(false);

  // ---- calendar day preferences ----
  const [dayPrefs, setDayPrefs] = useState<Record<string, DayPref>>({});
  const [pickDay, setPickDay] = useState<string | null>(null);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // ---- time-of-day preferences ----
  const [times, setTimes] = useState<Set<string>>(new Set());

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });

  // next 90 days for the absence date pickers
  const dateChoices = Array.from({ length: 90 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return isoDay(d);
  });

  // preferences are only for future (unplanned) months: next month .. +MONTHS_AHEAD
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() + MONTHS_AHEAD, 1);
  const [monthCursor, setMonthCursor] = useState(firstMonth);
  const atMin = monthIndex(monthCursor) <= monthIndex(firstMonth);
  const atMax = monthIndex(monthCursor) >= monthIndex(lastMonth);
  const moveMonth = (dir: 1 | -1) => {
    if ((dir === -1 && atMin) || (dir === 1 && atMax)) return;
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const canSend = !!fromDate && !!toDate && fromDate <= toDate;

  const sendAbsence = () => {
    if (!canSend) return;
    // TODO: persist absence request to Supabase (no table exists yet)
    setAbsSent(true);
    setTimeout(() => setAbsSent(false), 2500);
  };

  const setDay = (pref: DayPref | null) => {
    if (!pickDay) return;
    setDayPrefs((prev) => {
      const next = { ...prev };
      if (pref) next[pickDay] = pref; else delete next[pickDay];
      return next;
    });
    setPickDay(null);
  };

  const updatePreferences = () => {
    // TODO: persist day preferences + time-of-day prefs to Supabase
    setPrefsSaved(true);
    setTimeout(() => setPrefsSaved(false), 2500);
  };

  const toggleTime = (time: string) =>
    setTimes((prev) => {
      const next = new Set(prev);
      next.has(time) ? next.delete(time) : next.add(time);
      return next;
    });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <CalendarClock color={theme.accent} size={26} />
          <Text style={[styles.title, { color: theme.text }]}>{t("scheduling.title")}</Text>
        </View>

        {/* ---- Report absence ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.absence")}</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.absenceHint")}</Text>

          <View style={styles.chips}>
            {ABSENCE.map((a) => (
              <Pressable
                key={a}
                onPress={() => setAbsenceType(a)}
                style={[styles.chip, { borderColor: theme.border }, absenceType === a && { backgroundColor: theme.accent, borderColor: theme.accent }]}
              >
                <Text style={{ color: absenceType === a ? "#fff" : theme.text, fontWeight: "600" }}>
                  {t(`scheduling.${a}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("scheduling.from")}</Text>
              <DateDropdown theme={theme} value={fromDate} display={fromDate ? fmtDate(fromDate) : null}
                placeholder={t("scheduling.from")} options={dateChoices} fmt={fmtDate} onSelect={setFromDate} />
            </View>
            <View style={styles.dateCol}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("scheduling.to")}</Text>
              <DateDropdown theme={theme} value={toDate} display={toDate ? fmtDate(toDate) : null}
                placeholder={t("scheduling.to")}
                options={fromDate ? dateChoices.filter((d) => d >= fromDate) : dateChoices}
                fmt={fmtDate} onSelect={setToDate} />
            </View>
          </View>

          <TextInput
            style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            placeholder={t("scheduling.notePlaceholder")}
            placeholderTextColor={theme.muted}
            value={note}
            onChangeText={setNote}
            multiline
          />

          <Pressable
            style={[styles.submit, { backgroundColor: canSend ? theme.accent : theme.border }]}
            onPress={sendAbsence}
            disabled={!canSend}
          >
            <Text style={[styles.submitText, { color: canSend ? "#fff" : theme.muted }]}>
              {absSent ? `✓ ${t("scheduling.submitted")}` : t("scheduling.submit")}
            </Text>
          </Pressable>
        </View>

        {/* ---- Calendar preferences (future/unplanned months) ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.preferences")}</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.calendarHint")}</Text>

          {/* legend */}
          <View style={styles.legend}>
            {(["priority", "preferred", "vacation"] as DayPref[]).map((p) => (
              <View key={p} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: PREF_COLOR[p] }]} />
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {t(p === "priority" ? "scheduling.priorityOff" : p === "preferred" ? "scheduling.preferredOff" : "scheduling.vacation")}
                </Text>
              </View>
            ))}
          </View>

          {/* month navigation — bounded to next month .. +MONTHS_AHEAD */}
          <View style={styles.monthNav}>
            <Pressable onPress={() => moveMonth(-1)} disabled={atMin} hitSlop={8} style={styles.navBtn}>
              <ChevronLeft color={atMin ? BLOCKED : theme.text} size={26} style={atMin && { opacity: 0.4 }} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: theme.text }]}>
              {monthCursor.toLocaleDateString(lang, { month: "long", year: "numeric" })}
            </Text>
            <Pressable onPress={() => moveMonth(1)} disabled={atMax} hitSlop={8} style={styles.navBtn}>
              <ChevronRight color={atMax ? BLOCKED : theme.text} size={26} style={atMax && { opacity: 0.4 }} />
            </Pressable>
          </View>

          <MonthGrid month={monthCursor} theme={theme} t={t} dayPrefs={dayPrefs} onPickDay={setPickDay} />

          <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={updatePreferences}>
            <Text style={[styles.submitText, { color: "#fff" }]}>
              {prefsSaved ? `✓ ${t("scheduling.preferencesUpdated")}` : t("scheduling.updatePreferences")}
            </Text>
          </Pressable>
        </View>

        {/* ---- Time-of-day preferences ---- */}
        <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.preferencesHint")}</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.chips}>
            {TIMES.map((time) => {
              const on = times.has(time);
              return (
                <Pressable
                  key={time}
                  onPress={() => toggleTime(time)}
                  style={[styles.chip, { borderColor: theme.border }, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}
                >
                  {on && <Check color="#fff" size={15} />}
                  <Text style={{ color: on ? "#fff" : theme.text, fontWeight: "600" }}>{t(`scheduling.${time}`)}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* day-preference picker */}
      <Modal visible={!!pickDay} transparent animationType="fade" onRequestClose={() => setPickDay(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickDay(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{pickDay ? fmtDate(pickDay) : ""}</Text>
              <Pressable onPress={() => setPickDay(null)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
            </View>
            {(["priority", "preferred", "vacation"] as DayPref[]).map((p) => {
              const active = pickDay ? dayPrefs[pickDay] === p : false;
              return (
                <Pressable key={p} style={[styles.sheetItem, { borderColor: PREF_COLOR[p] }, active && { backgroundColor: PREF_COLOR[p] }]} onPress={() => setDay(p)}>
                  <View style={[styles.legendDot, { backgroundColor: active ? "#fff" : PREF_COLOR[p] }]} />
                  <Text style={{ color: active ? "#fff" : theme.text, fontWeight: "700" }}>
                    {t(p === "priority" ? "scheduling.priorityOff" : p === "preferred" ? "scheduling.preferredOff" : "scheduling.requestVacation")}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable style={styles.sheetClear} onPress={() => setDay(null)}>
              <Text style={{ color: theme.muted, fontWeight: "600" }}>{t("scheduling.clearDay")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- month grid ----------
function MonthGrid({ month, theme, t, dayPrefs, onPickDay }: {
  month: Date; theme: any; t: (k: string) => string;
  dayPrefs: Record<string, DayPref>; onPickDay: (d: string) => void;
}) {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const offset = (new Date(year, mon, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, mon, i + 1)),
  ];

  return (
    <View style={styles.month}>
      <View style={styles.weekHeader}>
        {WEEKDAY_KEYS.map((k) => (
          <Text key={k} style={[styles.weekHeaderCell, { color: theme.muted }]}>
            {t(`calendar.${k}`).slice(0, 2)}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (!d) return <View key={i} style={styles.cell} />;
          const key = isoDay(d);
          const pref = dayPrefs[key];
          return (
            <Pressable key={i} style={styles.cell} onPress={() => onPickDay(key)}>
              <View style={[styles.day, pref && { backgroundColor: PREF_COLOR[pref] }]}>
                <Text style={{ color: pref ? "#fff" : theme.text, fontWeight: pref ? "700" : "400" }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------- date dropdown ----------
function DateDropdown({ theme, value, display, placeholder, options, fmt, onSelect }: {
  theme: any; value: string | null; display: string | null; placeholder: string;
  options: string[]; fmt: (d: string) => string; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable style={[styles.input, styles.dropTrigger, { borderColor: theme.border, backgroundColor: theme.bg }]} onPress={() => setOpen(true)}>
        <Text style={{ color: display ? theme.text : theme.muted, fontSize: 15, flex: 1 }} numberOfLines={1}>
          {display ?? placeholder}
        </Text>
        <ChevronDown color={theme.muted} size={18} />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={[styles.dropSheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable key={o} style={[styles.dropItem, { borderColor: theme.border }]} onPress={() => { onSelect(o); setOpen(false); }}>
                  <Text style={{ color: o === value ? theme.accent : theme.text, fontSize: 15, fontWeight: o === value ? "700" : "400" }}>{fmt(o)}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },
  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 12 },
  hint: { fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },

  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },

  dateRow: { flexDirection: "row", gap: 10 },
  dateCol: { flex: 1 },

  input: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  dropTrigger: { flexDirection: "row", alignItems: "center", gap: 6 },
  submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "700" },

  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6 },

  month: { gap: 6 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  navBtn: { padding: 4 },
  monthTitle: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  weekHeader: { flexDirection: "row" },
  weekHeaderCell: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  day: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },

  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 10 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
  sheetItem: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16 },
  sheetClear: { alignItems: "center", paddingVertical: 10 },

  dropSheet: { width: "100%", maxHeight: "70%", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 4 },
  dropItem: { paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
});
