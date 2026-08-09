// src/app/(tabs)/scheduling.tsx — employee self-service, three sections:
//  • Emergency  — send a short-notice leave notice with a free-text reason.
//  • Planning   — recurring shift preferences (per role-matching template) plus
//                 date-specific "special date" preferences.
//  • Vacation   — remaining allowance, request a range, and see request status.
// Persists to Supabase: mitarbeiter_schicht_vorlieben (recurring),
// mitarbeiter_schicht_tagesvorlieben (per-date), urlaub, abwesenheit.
import {
  CalendarClock, CalendarDays, ChevronLeft,
  ChevronRight, Trash2, TreePalm, TriangleAlert, X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { RefreshScrollView } from "../../components/RefreshScrollView";

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
const MONTHS_AHEAD = 12; // how far ahead planning/vacation may reach (from this month)
const GREEN = "#16a34a"; // gerne / approved
const RED = "#C1442D";   // ungerne / denied
const AMBER = "#d97706"; // requested (pending)

type Praef = "gerne" | "ungerne";
type Vorlage = { id: string; bezeichnung: string; wochentag: number; start_zeit: string; end_zeit: string };
type DatePref = { schicht_vorlage_id: string; datum: string; praeferenz: Praef };
type Urlaub = { id: string; von: string; bis: string; status: "requested" | "approved" | "denied"; kommentar: string | null; begruendung: string | null };
type Tab = "emergency" | "planning" | "vacation";

const monthIndex = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const wochentagOf = (d: Date) => (d.getDay() + 6) % 7; // Monday-first 0..6
const hhmm = (t: string) => t.slice(0, 5);

export default function SchedulingScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const me = activeMitarbeiter?.id ?? null;
  const betrieb = activeMitarbeiter?.betrieb_id ?? null;

  const [tab, setTab] = useState<Tab>("emergency");
  const [loading, setLoading] = useState(true);

  const [vorlagen, setVorlagen] = useState<Vorlage[]>([]);
  const [recurPref, setRecurPref] = useState<Record<string, Praef>>({});
  const [datePrefs, setDatePrefs] = useState<DatePref[]>([]);
  const [vacations, setVacations] = useState<Urlaub[]>([]);
  const [anspruch, setAnspruch] = useState(0);

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" });
  const nameOf = (v: Vorlage) => `${v.bezeichnung} · ${hhmm(v.start_zeit)}–${hhmm(v.end_zeit)}`;

  const load = useCallback(async () => {
    if (!me || !betrieb) return;
    setLoading(true);

    const [myRoles, mindest, tpl, recur, dprefs, urlaub, mitarb] = await Promise.all([
      supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", me),
      supabase.from("schicht_vorlage_mindestbesetzung").select("schicht_vorlage_id, rolle_id").eq("betrieb_id", betrieb),
      supabase.from("schicht_vorlagen").select("id, bezeichnung, wochentag, start_zeit, end_zeit").eq("betrieb_id", betrieb).eq("aktiv", true),
      supabase.from("mitarbeiter_schicht_vorlieben").select("schicht_vorlage_id, praeferenz").eq("mitarbeiter_id", me),
      supabase.from("mitarbeiter_schicht_tagesvorlieben").select("schicht_vorlage_id, datum, praeferenz").eq("mitarbeiter_id", me).is("geloescht_am", null),
      supabase.from("urlaub").select("id, von, bis, status, kommentar, begruendung").eq("mitarbeiter_id", me).order("von", { ascending: false }),
      supabase.from("mitarbeiter").select("urlaubsanspruch_tage").eq("id", me).single(),
    ]);

    const roleIds = new Set((myRoles.data ?? []).map((r: any) => r.rolle_id));
    const vorlagenMitRolle = new Set(
      (mindest.data ?? []).filter((m: any) => roleIds.has(m.rolle_id)).map((m: any) => m.schicht_vorlage_id),
    );
    const list = (tpl.data ?? [])
      .filter((v: any) => vorlagenMitRolle.has(v.id))
      .sort((a: any, b: any) => a.wochentag - b.wochentag || a.start_zeit.localeCompare(b.start_zeit));

    setVorlagen(list as Vorlage[]);
    setRecurPref(Object.fromEntries((recur.data ?? []).map((r: any) => [r.schicht_vorlage_id, r.praeferenz])));
    setDatePrefs((dprefs.data ?? []) as DatePref[]);
    setVacations((urlaub.data ?? []) as Urlaub[]);
    setAnspruch(mitarb.data?.urlaubsanspruch_tage ?? 0);
    setLoading(false);
  }, [me, betrieb]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <RefreshScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onRefresh={load}>
        <View style={styles.titleRow}>
          <CalendarClock color={theme.accent} size={26} />
          <Text style={[styles.title, { color: theme.text }]}>{t("scheduling.title")}</Text>
        </View>

        {/* section switcher */}
        <View style={[styles.tabs, { borderColor: theme.border }]}>
          {(["emergency", "planning", "vacation"] as Tab[]).map((tb) => {
            const active = tab === tb;
            return (
              <Pressable key={tb} onPress={() => setTab(tb)} style={[styles.tabBtn, active && { backgroundColor: theme.accent }]}>
                <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: "700", fontSize: 13 }}>
                  {t(`scheduling.tab${tb[0].toUpperCase()}${tb.slice(1)}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : tab === "emergency" ? (
          <EmergencySection theme={theme} t={t} lang={lang} me={me} betrieb={betrieb} />
        ) : tab === "planning" ? (
          <PlanningSection
            theme={theme} t={t} lang={lang} me={me!} betrieb={betrieb!}
            vorlagen={vorlagen} recurPref={recurPref} setRecurPref={setRecurPref}
            datePrefs={datePrefs} reload={load} fmtDate={fmtDate} nameOf={nameOf}
          />
        ) : (
          <VacationSection
            theme={theme} t={t} lang={lang} me={me!} betrieb={betrieb!}
            vacations={vacations} anspruch={anspruch} reload={load} fmtDate={fmtDate}
          />
        )}
      </RefreshScrollView>
    </SafeAreaView>
  );
}

// =====================================================================
// Emergency
// =====================================================================
type EmShift = {
  zuweisungId: string;
  instanzId: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string;
};
type Reported = {
  id: string;
  status: "gemeldet" | "vertretung_gesucht" | "besetzt" | "storniert";
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string;
};

function EmergencySection({ theme, t, lang, me, betrieb }: any) {
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<EmShift[]>([]);
  const [reported, setReported] = useState<Reported[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(async () => {
    if (!me || !betrieb) return;
    setLoading(true);
    const today = isoDay(new Date());

    const [zuw, inst, vorl, notf] = await Promise.all([
      supabase.from("schicht_zuweisungen").select("id, schicht_instanz_id, attendet").eq("mitarbeiter_id", me),
      supabase.from("schicht_instanzen").select("id, datum, start_zeit, end_zeit, schicht_vorlage_id").eq("betrieb_id", betrieb).gte("datum", today),
      supabase.from("schicht_vorlagen").select("id, bezeichnung").eq("betrieb_id", betrieb),
      supabase.from("notfaelle").select("id, status, schicht_instanz_id").eq("melder_id", me).neq("status", "storniert"),
    ]);

    const instById = new Map((inst.data ?? []).map((i: any) => [i.id, i]));
    const vorlById = new Map((vorl.data ?? []).map((v: any) => [v.id, v.bezeichnung]));
    const labelOf = (i: any) => (i.schicht_vorlage_id && vorlById.get(i.schicht_vorlage_id)) || t("scheduling.shift");

    const upcoming: EmShift[] = (zuw.data ?? [])
      .filter((z: any) => z.attendet)
      .map((z: any) => ({ z, i: instById.get(z.schicht_instanz_id) }))
      .filter((x: any) => x.i)
      .map((x: any) => ({
        zuweisungId: x.z.id,
        instanzId: x.i.id,
        datum: x.i.datum,
        start_zeit: x.i.start_zeit,
        end_zeit: x.i.end_zeit,
        label: labelOf(x.i),
      }))
      .sort((a: EmShift, b: EmShift) => (a.datum + a.start_zeit).localeCompare(b.datum + b.start_zeit));

    const rep: Reported[] = (notf.data ?? [])
      .map((n: any) => ({ n, i: instById.get(n.schicht_instanz_id) }))
      .filter((x: any) => x.i)
      .map((x: any) => ({
        id: x.n.id,
        status: x.n.status,
        datum: x.i.datum,
        start_zeit: x.i.start_zeit,
        end_zeit: x.i.end_zeit,
        label: labelOf(x.i),
      }))
      .sort((a: Reported, b: Reported) => (a.datum + a.start_zeit).localeCompare(b.datum + b.start_zeit));

    setShifts(upcoming);
    setReported(rep);
    setSelected((cur) => (cur && upcoming.some((s) => s.zuweisungId === cur) ? cur : null));
    setLoading(false);
  }, [me, betrieb, t]);

  useEffect(() => { load(); }, [load]);

  const fmtShift = (s: { datum: string; start_zeit: string; end_zeit: string; label: string }) =>
    `${s.label} · ${new Date(s.datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(s.start_zeit)}–${hhmm(s.end_zeit)}`;

  const statusLabel = (s: Reported["status"]) =>
    s === "besetzt" ? t("scheduling.emReplaced")
      : s === "vertretung_gesucht" ? t("scheduling.emSearching")
        : t("scheduling.emReported");
  const statusColor = (s: Reported["status"]) => (s === "besetzt" ? GREEN : AMBER);

  const send = async () => {
    if (!selected || sending) return;
    setSending(true);
    const { error } = await supabase.rpc("notfall_melden", { p_zuweisung_id: selected, p_grund: reason.trim() || null });
    setSending(false);
    if (error) return;
    setReason("");
    setSelected(null);
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    load();
  };

  return (
    <>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.rowIcon}>
          <TriangleAlert color={RED} size={20} />
          <Text style={[styles.hint, { color: theme.muted, flex: 1 }]}>{t("scheduling.emergencyHint")}</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
        ) : shifts.length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.emNoShifts")}</Text>
        ) : (
          <>
            <Text style={[styles.sectionLabel, { color: theme.muted, marginTop: 0 }]}>{t("scheduling.emPickShift")}</Text>
            {shifts.map((s) => {
              const active = selected === s.zuweisungId;
              return (
                <Pressable
                  key={s.zuweisungId}
                  onPress={() => setSelected(active ? null : s.zuweisungId)}
                  style={[styles.shiftRow, { borderColor: active ? RED : theme.border }, active && { backgroundColor: RED + "18" }]}
                >
                  <View style={[styles.radio, { borderColor: active ? RED : theme.border }]}>
                    {active && <View style={[styles.radioDot, { backgroundColor: RED }]} />}
                  </View>
                  <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{fmtShift(s)}</Text>
                </Pressable>
              );
            })}

            <TextInput
              style={[styles.input, styles.multiline, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
              placeholder={t("scheduling.reasonPlaceholder")}
              placeholderTextColor={theme.muted}
              value={reason}
              onChangeText={setReason}
              multiline
            />
            <Pressable
              style={[styles.submit, { backgroundColor: selected ? RED : theme.border }]}
              onPress={send}
              disabled={!selected || sending}
            >
              <Text style={[styles.submitText, { color: selected ? "#fff" : theme.muted }]}>
                {sent ? `✓ ${t("scheduling.leaveSent")}` : t("scheduling.sendLeave")}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {reported.length > 0 && (
        <>
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.emYourEmergencies")}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {reported.map((r) => (
              <View key={r.id} style={[styles.listRow, { borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{fmtShift(r)}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusColor(r.status) }]}>
                  <Text style={styles.statusText}>{statusLabel(r.status)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </>
  );
}

// =====================================================================
// Planning
// =====================================================================
function PlanningSection({ theme, t, lang, me, betrieb, vorlagen, recurPref, setRecurPref, datePrefs, reload, fmtDate, nameOf }: any) {
  const [pickWd, setPickWd] = useState<number | null>(null);

  // Monday of the current week, used only to render full weekday names.
  const now = new Date();
  const monday = new Date(now); monday.setDate(now.getDate() - wochentagOf(now));
  const dateForWd = (wd: number) => { const d = new Date(monday); d.setDate(monday.getDate() + wd); return d; };
  const weekdayName = (wd: number) => dateForWd(wd).toLocaleDateString(lang, { weekday: "long" });

  // recurring preference toggle (applies to every occurrence of the weekday)
  const toggleRecur = async (vorlageId: string, praef: Praef) => {
    const cur = recurPref[vorlageId];
    if (cur === praef) {
      await supabase.from("mitarbeiter_schicht_vorlieben").delete()
        .eq("mitarbeiter_id", me).eq("schicht_vorlage_id", vorlageId);
      setRecurPref((prev: any) => { const n = { ...prev }; delete n[vorlageId]; return n; });
    } else {
      await supabase.from("mitarbeiter_schicht_vorlieben").upsert(
        { betrieb_id: betrieb, mitarbeiter_id: me, schicht_vorlage_id: vorlageId, praeferenz: praef },
        { onConflict: "mitarbeiter_id,schicht_vorlage_id" },
      );
      setRecurPref((prev: any) => ({ ...prev, [vorlageId]: praef }));
    }
  };

  const vorlagenFor = (wd: number) => vorlagen.filter((v: Vorlage) => v.wochentag === wd);

  return (
    <>
      {/* info */}
      <View style={[styles.infoBox, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
        <Text style={[styles.infoText, { color: theme.text }]}>{t("scheduling.planningInfo")}</Text>
      </View>

      {/* recurring template preferences — weekly calendar (Mon..Sun) */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.templateHint")}</Text>
        <View style={styles.legend}>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: GREEN }]} /><Text style={{ color: theme.muted, fontSize: 12 }}>{t("scheduling.preferWork")}</Text></View>
          <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: RED }]} /><Text style={{ color: theme.muted, fontSize: 12 }}>{t("scheduling.preferOff")}</Text></View>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAY_KEYS.map((k, wd) => {
            const vs = vorlagenFor(wd);
            const hasGerne = vs.some((v: Vorlage) => recurPref[v.id] === "gerne");
            const hasUngerne = vs.some((v: Vorlage) => recurPref[v.id] === "ungerne");
            const hasAny = vs.length > 0;
            return (
              <Pressable key={k} style={styles.weekCell} onPress={() => setPickWd(wd)} disabled={!hasAny}>
                <Text style={[styles.weekCellLabel, { color: theme.muted }]}>{t(`calendar.${k}`).slice(0, 2)}</Text>
                <View style={[styles.weekDayBox, { borderColor: theme.border }, !hasAny && { opacity: 0.35 }]}>
                  <Text style={{ color: theme.text, fontWeight: "700" }}>{vs.length}</Text>
                  {(hasGerne || hasUngerne) && (
                    <View style={styles.dotRow}>
                      {hasGerne && <View style={[styles.tinyDot, { backgroundColor: GREEN }]} />}
                      {hasUngerne && <View style={[styles.tinyDot, { backgroundColor: RED }]} />}
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* special dates — monthly calendar */}
      <SpecialDates
        theme={theme} t={t} lang={lang} me={me} betrieb={betrieb} vorlagen={vorlagen}
        datePrefs={datePrefs} reload={reload} fmtDate={fmtDate} nameOf={nameOf} vorlagenFor={vorlagenFor}
      />

      {/* weekday sheet: recurring prefs for the tapped weekday */}
      <Modal visible={pickWd !== null} transparent animationType="fade" onRequestClose={() => setPickWd(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPickWd(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{pickWd !== null ? weekdayName(pickWd) : ""}</Text>
              <Pressable onPress={() => setPickWd(null)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
            </View>
            {pickWd !== null && vorlagenFor(pickWd).length === 0 && (
              <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.noShiftsForRole")}</Text>
            )}
            {pickWd !== null && vorlagenFor(pickWd).map((v: Vorlage) => (
              <View key={v.id} style={[styles.shiftRow, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{nameOf(v)}</Text>
                <PrefToggle theme={theme} t={t} value={recurPref[v.id]} onSet={(p) => toggleRecur(v.id, p)} />
              </View>
            ))}
            <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={() => setPickWd(null)}>
              <Text style={[styles.submitText, { color: theme.accentText }]}>{t("scheduling.done")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function SpecialDates({ theme, t, lang, me, betrieb, vorlagen, datePrefs, reload, fmtDate, nameOf, vorlagenFor }: any) {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() + MONTHS_AHEAD, 1);
  const [monthCursor, setMonthCursor] = useState(firstMonth);
  const atMin = monthIndex(monthCursor) <= monthIndex(firstMonth);
  const atMax = monthIndex(monthCursor) >= monthIndex(lastMonth);
  const moveMonth = (dir: 1 | -1) => {
    if ((dir === -1 && atMin) || (dir === 1 && atMax)) return;
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const [pickDate, setPickDate] = useState<string | null>(null);
  // Staged selections for the open date sheet — nothing is written until "Done".
  const [staged, setStaged] = useState<Record<string, Praef>>({});
  const today = isoDay(now);

  const datePrefFor = (vId: string, datum: string): Praef | undefined =>
    datePrefs.find((dp: DatePref) => dp.schicht_vorlage_id === vId && dp.datum === datum)?.praeferenz;

  // open a date: seed the staged map from what's already saved for that date
  const openDate = (iso: string) => {
    const init: Record<string, Praef> = {};
    datePrefs.filter((dp: DatePref) => dp.datum === iso).forEach((dp: DatePref) => { init[dp.schicht_vorlage_id] = dp.praeferenz; });
    setStaged(init);
    setPickDate(iso);
  };
  const closeSheet = () => { setPickDate(null); setStaged({}); };
  const toggleStaged = (vId: string, praef: Praef) =>
    setStaged((prev) => { const n = { ...prev }; if (n[vId] === praef) delete n[vId]; else n[vId] = praef; return n; });

  // commit staged selections: only the shifts that actually changed
  const confirmDate = async () => {
    if (!pickDate) return closeSheet();
    const ops: any[] = [];
    for (const v of pickShifts) {
      const desired = staged[v.id];
      const existing = datePrefFor(v.id, pickDate);
      if (desired === existing) continue;
      if (!desired) {
        // soft-delete
        ops.push(supabase.from("mitarbeiter_schicht_tagesvorlieben").update({ geloescht_am: new Date().toISOString() })
          .eq("mitarbeiter_id", me).eq("schicht_vorlage_id", v.id).eq("datum", pickDate));
      } else {
        // upsert also revives a previously soft-deleted row (geloescht_am -> null)
        ops.push(supabase.from("mitarbeiter_schicht_tagesvorlieben").upsert(
          { betrieb_id: betrieb, mitarbeiter_id: me, schicht_vorlage_id: v.id, datum: pickDate, praeferenz: desired, geloescht_am: null },
          { onConflict: "mitarbeiter_id,schicht_vorlage_id,datum" }));
      }
    }
    if (ops.length) { await Promise.all(ops); reload(); }
    closeSheet();
  };
  const remove = async (dp: DatePref) => {
    await supabase.from("mitarbeiter_schicht_tagesvorlieben").update({ geloescht_am: new Date().toISOString() })
      .eq("mitarbeiter_id", me).eq("schicht_vorlage_id", dp.schicht_vorlage_id).eq("datum", dp.datum);
    reload();
  };

  const prefsOnDate = (iso: string) => datePrefs.filter((dp: DatePref) => dp.datum === iso);
  const pickShifts = pickDate ? vorlagenFor(wochentagOf(new Date(pickDate + "T00:00:00"))) : [];

  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.specialDates")}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.specialDatesHint")}</Text>

        <View style={styles.monthNav}>
          <Pressable onPress={() => moveMonth(-1)} disabled={atMin} hitSlop={8} style={styles.navBtn}>
            <ChevronLeft color={atMin ? RED : theme.text} size={26} style={atMin && { opacity: 0.4 }} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {monthCursor.toLocaleDateString(lang, { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={() => moveMonth(1)} disabled={atMax} hitSlop={8} style={styles.navBtn}>
            <ChevronRight color={atMax ? RED : theme.text} size={26} style={atMax && { opacity: 0.4 }} />
          </Pressable>
        </View>

        <MonthGrid
          month={monthCursor} theme={theme} t={t}
          renderDay={(d) => {
            const iso = isoDay(d);
            const past = iso < today;
            const hasShifts = vorlagenFor(wochentagOf(d)).length > 0;
            const marks = prefsOnDate(iso);
            const hasGerne = marks.some((m: DatePref) => m.praeferenz === "gerne");
            const hasUngerne = marks.some((m: DatePref) => m.praeferenz === "ungerne");
            return (
              <View style={[styles.day, (past || !hasShifts) && { opacity: 0.3 }]}>
                <Text style={{ color: theme.text }}>{d.getDate()}</Text>
                {(hasGerne || hasUngerne) && (
                  <View style={styles.dotRow}>
                    {hasGerne && <View style={[styles.tinyDot, { backgroundColor: GREEN }]} />}
                    {hasUngerne && <View style={[styles.tinyDot, { backgroundColor: RED }]} />}
                  </View>
                )}
              </View>
            );
          }}
          onPickDay={(iso) => { if (iso >= today) openDate(iso); }}
        />

        {datePrefs.filter((dp: DatePref) => dp.datum >= today).length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.noSpecialDates")}</Text>
        ) : (
          datePrefs
            .filter((dp: DatePref) => dp.datum >= today)
            .sort((a: DatePref, b: DatePref) => a.datum.localeCompare(b.datum))
            .map((dp: DatePref) => {
              const v = vorlagen.find((x: Vorlage) => x.id === dp.schicht_vorlage_id);
              return (
                <View key={dp.schicht_vorlage_id + dp.datum} style={[styles.listRow, { borderColor: theme.border }]}>
                  <View style={[styles.legendDot, { backgroundColor: dp.praeferenz === "gerne" ? GREEN : RED }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontWeight: "600" }}>{fmtDate(dp.datum)}</Text>
                    <Text style={{ color: theme.muted, fontSize: 12 }}>{v ? nameOf(v) : ""}</Text>
                  </View>
                  <Pressable onPress={() => remove(dp)} hitSlop={8}><Trash2 color={theme.muted} size={18} /></Pressable>
                </View>
              );
            })
        )}
      </View>

      {/* date sheet: stage per-date prefs; commit on Done, discard on X/backdrop */}
      <Modal visible={!!pickDate} transparent animationType="fade" onRequestClose={closeSheet}>
        <Pressable style={styles.backdrop} onPress={closeSheet}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{pickDate ? fmtDate(pickDate) : ""}</Text>
              <Pressable onPress={closeSheet} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
            </View>
            {pickShifts.length === 0 && (
              <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.noShiftsForRole")}</Text>
            )}
            {pickShifts.map((v: Vorlage) => (
              <View key={v.id} style={[styles.shiftRow, { borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{nameOf(v)}</Text>
                <PrefToggle theme={theme} t={t} value={staged[v.id]} onSet={(p) => toggleStaged(v.id, p)} />
              </View>
            ))}
            <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={confirmDate}>
              <Text style={[styles.submitText, { color: theme.accentText }]}>{t("scheduling.done")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// =====================================================================
// Vacation
// =====================================================================
function VacationSection({ theme, t, lang, me, betrieb, vacations, anspruch, reload, fmtDate }: any) {
  const now = new Date();
  const firstMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() + MONTHS_AHEAD, 1);
  const [monthCursor, setMonthCursor] = useState(firstMonth);
  const atMin = monthIndex(monthCursor) <= monthIndex(firstMonth);
  const atMax = monthIndex(monthCursor) >= monthIndex(lastMonth);
  const moveMonth = (dir: 1 | -1) => {
    if ((dir === -1 && atMin) || (dir === 1 && atMax)) return;
    setMonthCursor((c) => new Date(c.getFullYear(), c.getMonth() + dir, 1));
  };

  const [von, setVon] = useState<string | null>(null);
  const [bis, setBis] = useState<string | null>(null);
  const [kommentar, setKommentar] = useState("");
  const [sent, setSent] = useState(false);

  const yr = now.getFullYear();
  const usedDays = useMemo(() => vacations
    .filter((v: Urlaub) => v.status === "approved" || v.status === "requested")
    .reduce((sum: number, v: Urlaub) => {
      const s = new Date(v.von + "T00:00:00"); const e = new Date(v.bis + "T00:00:00");
      const start = s.getFullYear() < yr ? new Date(yr, 0, 1) : s;
      const end = e.getFullYear() > yr ? new Date(yr, 11, 31) : e;
      const d = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
      return sum + Math.max(0, d);
    }, 0), [vacations, yr]);
  const daysLeft = anspruch - usedDays;

  const today = isoDay(now);
  const onPick = (iso: string) => {
    if (iso < today) return;
    if (!von || (von && bis)) { setVon(iso); setBis(null); return; }
    if (iso < von) { setVon(iso); return; }
    setBis(iso);
  };
  const inRange = (iso: string) => (von && bis ? iso >= von && iso <= bis : iso === von);

  const rangeDays = von && bis
    ? Math.floor((new Date(bis).getTime() - new Date(von).getTime()) / 86400000) + 1
    : von ? 1 : 0;
  // The picked range must fit within the days the employee still has left,
  // so a request can never push the balance below zero.
  const exceedsBalance = rangeDays > daysLeft;
  const canRequest = !!von && rangeDays > 0 && !exceedsBalance;

  const request = async () => {
    if (!canRequest) return;
    const { error } = await supabase.from("urlaub").insert({
      mitarbeiter_id: me, betrieb_id: betrieb, von, bis: bis ?? von, status: "requested",
      kommentar: kommentar.trim() || null,
    });
    if (error) return;
    setVon(null); setBis(null); setKommentar("");
    setSent(true);
    setTimeout(() => setSent(false), 2500);
    reload();
  };

  const statusColor = { requested: AMBER, approved: GREEN, denied: RED } as const;

  return (
    <>
      {/* balance */}
      <View style={[styles.balanceCard, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
        <TreePalm color={theme.accent} size={30} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.balanceNum, { color: theme.text }]}>{daysLeft} / {anspruch}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t("scheduling.vacationDaysLeft")}</Text>
        </View>
      </View>

      {/* range picker */}
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.vacationSelectHint")}</Text>
        <View style={styles.monthNav}>
          <Pressable onPress={() => moveMonth(-1)} disabled={atMin} hitSlop={8} style={styles.navBtn}>
            <ChevronLeft color={atMin ? RED : theme.text} size={26} style={atMin && { opacity: 0.4 }} />
          </Pressable>
          <Text style={[styles.monthTitle, { color: theme.text }]}>
            {monthCursor.toLocaleDateString(lang, { month: "long", year: "numeric" })}
          </Text>
          <Pressable onPress={() => moveMonth(1)} disabled={atMax} hitSlop={8} style={styles.navBtn}>
            <ChevronRight color={atMax ? RED : theme.text} size={26} style={atMax && { opacity: 0.4 }} />
          </Pressable>
        </View>

        <MonthGrid
          month={monthCursor} theme={theme} t={t}
          renderDay={(d) => {
            const iso = isoDay(d);
            const past = iso < today;
            const sel = inRange(iso);
            const edge = iso === von || iso === bis;
            return (
              <View style={[styles.day, sel && { backgroundColor: edge ? theme.accent : theme.accent + "44" }, past && { opacity: 0.3 }]}>
                <Text style={{ color: sel && edge ? theme.accentText : theme.text, fontWeight: edge ? "700" : "400" }}>{d.getDate()}</Text>
              </View>
            );
          }}
          onPickDay={onPick}
        />

        <Text style={{ color: theme.muted, fontSize: 13, textAlign: "center" }}>
          {von ? `${fmtDate(von)}${bis ? "  –  " + fmtDate(bis) : ""}   ·   ${rangeDays} ${t("scheduling.days")}` : ""}
        </Text>
        {exceedsBalance ? (
          <Text style={{ color: RED, fontSize: 13, textAlign: "center", fontWeight: "600" }}>
            {t("scheduling.notEnoughDays")}
          </Text>
        ) : null}
        <View>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            placeholder={t("scheduling.commentPlaceholder")}
            placeholderTextColor={theme.muted}
            value={kommentar}
            onChangeText={setKommentar}
            maxLength={50}
          />
          <Text style={[styles.counter, { color: theme.muted }]}>{kommentar.length}/50</Text>
        </View>
        <Pressable style={[styles.submit, { backgroundColor: canRequest ? theme.accent : theme.border }]} onPress={request} disabled={!canRequest}>
          <Text style={[styles.submitText, { color: canRequest ? theme.accentText : theme.muted }]}>
            {sent ? `✓ ${t("scheduling.vacationRequested")}` : t("scheduling.requestVacation")}
          </Text>
        </Pressable>
      </View>

      {/* existing requests */}
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("scheduling.yourRequests")}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {vacations.length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("scheduling.noRequests")}</Text>
        ) : (
          vacations.map((v: Urlaub) => (
            <View key={v.id} style={[styles.listRow, { borderColor: theme.border, flexDirection: "column", alignItems: "stretch", gap: 6 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <CalendarDays color={theme.muted} size={18} />
                <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>
                  {fmtDate(v.von)}{v.bis !== v.von ? "  –  " + fmtDate(v.bis) : ""}
                </Text>
                <View style={[styles.statusPill, { backgroundColor: statusColor[v.status] }]}>
                  <Text style={styles.statusText}>{t(`scheduling.status${v.status[0].toUpperCase()}${v.status.slice(1)}`)}</Text>
                </View>
              </View>
              {v.kommentar ? (
                <Text style={{ color: theme.muted, fontSize: 13, marginLeft: 28 }}>
                  <Text style={{ fontWeight: "700" }}>{t("scheduling.yourComment")}: </Text>{v.kommentar}
                </Text>
              ) : null}
              {v.begruendung ? (
                <Text style={{ color: v.status === "denied" ? RED : theme.text, fontSize: 13, marginLeft: 28 }}>
                  <Text style={{ fontWeight: "700" }}>{t("scheduling.managerReason")}: </Text>{v.begruendung}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </>
  );
}

// =====================================================================
// Shared bits
// =====================================================================
function PrefToggle({ theme, t, value, onSet, wide }: { theme: any; t: any; value?: Praef; onSet: (p: Praef) => void; wide?: boolean }) {
  return (
    <View style={[styles.prefToggle, wide && { alignSelf: "stretch" }]}>
      {(["gerne", "ungerne"] as Praef[]).map((p) => {
        const active = value === p;
        const color = p === "gerne" ? GREEN : RED;
        return (
          <Pressable
            key={p}
            onPress={() => onSet(p)}
            style={[styles.prefBtn, wide && { flex: 1 }, { borderColor: color }, active && { backgroundColor: color }]}
          >
            <Text style={{ color: active ? "#fff" : color, fontWeight: "700", fontSize: 12 }}>
              {t(p === "gerne" ? "scheduling.preferWork" : "scheduling.preferOff")}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MonthGrid({ month, theme, t, renderDay, onPickDay }: {
  month: Date; theme: any; t: (k: string) => string;
  renderDay: (d: Date) => React.ReactNode; onPickDay: (iso: string) => void;
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
          <Text key={k} style={[styles.weekHeaderCell, { color: theme.muted }]}>{t(`calendar.${k}`).slice(0, 2)}</Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d, i) =>
          d ? (
            <Pressable key={i} style={styles.cell} onPress={() => onPickDay(isoDay(d))}>{renderDay(d)}</Pressable>
          ) : (
            <View key={i} style={styles.cell} />
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 28, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },

  tabs: { flexDirection: "row", borderWidth: 1.5, borderRadius: 999, padding: 3, gap: 3 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999 },

  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 12 },
  hint: { fontSize: 13 },
  rowIcon: { flexDirection: "row", alignItems: "center", gap: 10 },

  infoBox: { borderWidth: 1.5, borderRadius: 12, padding: 14 },
  infoText: { fontSize: 13, lineHeight: 19 },

  input: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  counter: { fontSize: 11, textAlign: "right", marginTop: 4 },
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
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  dotRow: { flexDirection: "row", gap: 2, position: "absolute", bottom: 3 },
  tinyDot: { width: 5, height: 5, borderRadius: 3 },

  weekRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  weekCell: { flex: 1, alignItems: "center", gap: 6 },
  weekCellLabel: { fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  weekDayBox: { width: 40, height: 44, borderWidth: 1.5, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  prefToggle: { flexDirection: "row", gap: 8 },
  prefBtn: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  shiftRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },

  listRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statusPill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  balanceCard: { flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1.5, borderRadius: 14, padding: 16 },
  balanceNum: { fontSize: 26, fontWeight: "800" },

  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 10 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
});
