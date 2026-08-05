import { router } from "expo-router";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Pressable, ScrollView, StyleSheet,
  Text,
  View
} from "react-native";
import Animated, { useAnimatedStyle, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../../i18n/I18nProvider";
import { Shift, shifts, showCoworkers } from "../../lib/shifts";
import { useTheme } from "../../theme/ThemeProvider";

type ViewMode = "day" | "week" | "month";

// Monday-first weekday i18n keys (matches startOfWeek below).
const WEEKDAY_KEYS = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
] as const;

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const startOfWeek = (d: Date) => { 
  const c = new Date(d);
  const day = (c.getDay() + 6) % 7; // Monday = 0
  c.setDate(c.getDate() - day);
  c.setHours(0, 0, 0, 0);
  return c;
};

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const [mode, setMode] = useState<ViewMode>("day");
  const [cursor, setCursor] = useState(new Date()); // the focused day

  const modes: ViewMode[] = ["day", "week", "month"];
  const idx = modes.indexOf(mode);

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
      <View style = {styles.content}>
        {mode === "day" && <DayView date={cursor} />}
        {mode === "week" && <WeekView date={cursor} />}
        {mode === "month" && <MonthView date={cursor} onPickDay={(d) => { setCursor(d); setMode("day"); }} />}
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
    </SafeAreaView>
  );
}
function packLanes(shifts: Shift[]) {
  const sorted = [...shifts].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  const laneEnds: number[] = [];          // end-time of the last shift in each lane
  const placed = sorted.map((s) => {
    const start = toMinutes(s.start);
    const end = toMinutes(s.end);
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(end); }
    else laneEnds[lane] = end;
    return { shift: s, lane };
  });
  return { placed, laneCount: laneEnds.length };
}
// ---------- DAY ----------
function DayView({ date }: { date: Date }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const dayShifts = shifts.filter((s) => s.date === iso(date));

  const { from, to } = useMemo(() => {
    if (!dayShifts.length) return { from: 8 * 60, to: 18 * 60 };
    const starts = dayShifts.map((s) => toMinutes(s.start));
    const ends = dayShifts.map((s) => toMinutes(s.end));
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
            const top = (toMinutes(s.start) - from) * PX_PER_MIN;
            const h = (toMinutes(s.end) - toMinutes(s.start)) * PX_PER_MIN;
            const laneWidthPct = 100 / laneCount;
            return (
              <ShiftBlock
                key={s.id}
                shift={s}
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
function WeekView({ date }: { date: Date }) {
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
        const dayShifts = shifts.filter((s) => s.date === iso(d));
        return (
          <View key={i} style={styles.weekRow}>
            <Text style={[styles.weekDay, { color: theme.muted }]}>{t(`calendar.${WEEKDAY_KEYS[i]}`)}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              {dayShifts.length === 0 ? (
                <View style={[styles.weekEmpty, { borderColor: theme.border }]} />
              ) : (
                dayShifts.map((s) => <ShiftBlock key={s.id} shift={s} compact />)
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ---------- MONTH ----------
function MonthView({ date, onPickDay }: { date: Date; onPickDay: (d: Date) => void }) {
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
          const has = shifts.some((s) => s.date === iso(d));
          return (
            <Pressable key={i} style={styles.monthCell} onPress={() => onPickDay(d)}>
              <View style={[
                styles.monthDay,
                has && { backgroundColor: theme.accent },
              ]}>
                <Text style={{ color: has ? "#fff" : theme.text }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ---------- shared ----------
function ShiftBlock({ shift, style, compact }: { shift: Shift; style?: any; compact?: boolean }) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/shift/[id]", params: { id: shift.id } })}
      style={[
        styles.block,
        { backgroundColor: theme.accent, borderColor: theme.border },
        style,
      ]}
    >
      <Text style={styles.blockTitle} numberOfLines={1}>{shift.title}</Text>
      {showCoworkers && shift.coworkers.length > 0 && (
        <Text style={styles.blockSub} numberOfLines={1}>{shift.coworkers.join(", ")}</Text>
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
});