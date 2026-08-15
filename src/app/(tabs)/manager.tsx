// src/app/(tabs)/manager.tsx â€” chef-only management area, two sections:
//  â€¢ Employees â€” vacation requests to approve/deny (pending open, decided folded)
//                and the full team list; tapping a member opens their detail
//                sheet (roles, hours worked, overtime, vacation taken, contract).
//  â€¢ Business  â€” editable business settings (name, country) plus the
//                betriebs_einstellungen row (default language, swap approval,
//                availability deadline).
// Reads/writes Supabase under chef RLS: urlaub (update status/begruendung),
// betriebe (update), betriebs_einstellungen (update).
import {
  Briefcase, CalendarCheck2, CalendarClock, CalendarPlus, Check, ChevronDown, ChevronRight, Clock,
  Hourglass, Megaphone, Minus, Pencil, Plus, RefreshCw, Trash2, TriangleAlert, Users, X,
} from "lucide-react-native";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { RefreshScrollView } from "../../components/RefreshScrollView";
import { DateTimeField } from "../../components/DateTimeField";

const GREEN = "#16a34a";
const RED = "#C1442D";
const AMBER = "#d97706";

const WEEKDAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

type Section = "employees" | "business" | "shifts";
type Status = "requested" | "approved" | "denied";

type Vorlage = { id: string; bezeichnung: string; wochentag: number; start_zeit: string; end_zeit: string; aktiv: boolean };
type Rolle = { id: string; name: string; aktiv: boolean };
type RoleReq = { rolle_id: string; mindestanzahl: number };
type Planungszyklus = { id: string; status: string; zeitraum_start: string; zeitraum_ende: string };

type Mitarbeiter = {
  id: string; vorname: string; nachname: string; email: string | null; telefon: string | null;
  rolle_typ: string; vertrag_typ: string | null; soll_stunden: number | null;
  ueberstunden_saldo: number; status: string; urlaubsanspruch_tage: number;
};
type Urlaub = {
  id: string; mitarbeiter_id: string; von: string; bis: string;
  status: Status; kommentar: string | null; begruendung: string | null;
};
type Einstellungen = {
  tausch_freigabe_erforderlich: boolean;
  sprache_standard: string;
  verfuegbarkeit_deadline_tag: number;
  notfall_stunden_anrechnen: boolean;
  mitarbeiter_sehen_andere_schichten: boolean;
  mitarbeiter_sehen_andere_mitarbeiter: boolean;
  abrechnung_bis: string | null; // accounting cutoff (YYYY-MM-DD) or null
};
type Emergency = {
  id: string;
  status: "gemeldet" | "vertretung_gesucht";
  melderName: string;
  roleName: string;
  label: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  grund: string | null;
};

const dayDiff = (von: string, bis: string) =>
  Math.max(0, Math.floor((new Date(bis).getTime() - new Date(von).getTime()) / 86400000) + 1);
const shiftHours = (start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = eh * 60 + em - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60; // overnight shift
  return mins / 60;
};
// Local (not UTC) YYYY-MM-DD — avoids the off-by-one toISOString gives near midnight.
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const monthKey = (datum: string) => datum.slice(0, 7); // 'YYYY-MM'
// Last calendar day of a 'YYYY-MM' month as 'YYYY-MM-DD'.
const lastDayOfMonth = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return `${ym}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
};
// Overtime = opening balance (ueberstunden_saldo) + Σ over every FULL calendar month
// ending on/before the cutoff of (hours actually worked that month − monthly soll).
// Months with no worked shifts for this employee are skipped (natural hire-date handling).
function computeOvertime(
  months: Record<string, number>, // 'YYYY-MM' -> worked hours
  soll: number | null,
  opening: number,
  cutoff: string | null,
): number {
  let ot = opening;
  if (!cutoff) return ot; // no accounting period defined yet
  for (const [ym, hrs] of Object.entries(months)) {
    if (lastDayOfMonth(ym) > cutoff) continue; // month not fully within the period
    ot += hrs - (soll ?? 0);
  }
  return ot;
}

export default function ManagerScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const insets = useSafeAreaInsets();
  const betrieb = activeMitarbeiter?.betrieb_id ?? null;

  const [section, setSection] = useState<Section>("employees");
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const [team, setTeam] = useState<Mitarbeiter[]>([]);
  const [vacations, setVacations] = useState<Urlaub[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string[]>>({}); // mitarbeiter_id -> role names
  const [roleIds, setRoleIds] = useState<Record<string, string[]>>({}); // mitarbeiter_id -> role ids
  const [hoursWorked, setHoursWorked] = useState<Record<string, number>>({}); // this year
  const [shiftsWorked, setShiftsWorked] = useState<Record<string, number>>({});
  const [monthlyHours, setMonthlyHours] = useState<Record<string, Record<string, number>>>({}); // id -> 'YYYY-MM' -> h
  const [overtime, setOvertime] = useState<Record<string, number>>({}); // id -> computed overtime hours
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);
  const [templates, setTemplates] = useState<Vorlage[]>([]);
  const [templateReqs, setTemplateReqs] = useState<Record<string, RoleReq[]>>({}); // vorlage_id -> role reqs
  const [roles, setRoles] = useState<Rolle[]>([]);
  const [zyklen, setZyklen] = useState<Planungszyklus[]>([]); // in-flight / awaiting-review planning cycles
  const [openSlots, setOpenSlots] = useState<Record<string, number>>({}); // planungszyklus_id -> unfilled role-slots

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });

  const load = useCallback(async () => {
    if (!betrieb) return;
    setLoading(true);
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const [mitarb, roles, roleLinks, urlaub, settingsRow, zuweis, instanzen, notf, vorlagen, mindest, zyklenRes] = await Promise.all([
      supabase.from("mitarbeiter")
        .select("id, vorname, nachname, email, telefon, rolle_typ, vertrag_typ, soll_stunden, ueberstunden_saldo, status, urlaubsanspruch_tage")
        .eq("betrieb_id", betrieb).order("nachname"),
      supabase.from("rollen").select("id, name, aktiv").eq("betrieb_id", betrieb),
      supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", betrieb),
      supabase.from("urlaub").select("id, mitarbeiter_id, von, bis, status, kommentar, begruendung")
        .eq("betrieb_id", betrieb).order("von", { ascending: false }),
      supabase.from("betriebs_einstellungen")
        .select("tausch_freigabe_erforderlich, sprache_standard, verfuegbarkeit_deadline_tag, notfall_stunden_anrechnen, mitarbeiter_sehen_andere_schichten, mitarbeiter_sehen_andere_mitarbeiter, abrechnung_bis")
        .eq("betrieb_id", betrieb).single(),
      supabase.from("schicht_zuweisungen").select("mitarbeiter_id, schicht_instanz_id, attendet").eq("betrieb_id", betrieb),
      // All instances (not just this year) so overtime can span every worked month up to the cutoff.
      supabase.from("schicht_instanzen").select("id, start_zeit, end_zeit, datum, schicht_vorlage_id").eq("betrieb_id", betrieb),
      supabase.from("notfaelle").select("id, status, melder_id, schicht_instanz_id, rolle_id, grund, erstellt_am")
        .eq("betrieb_id", betrieb).in("status", ["gemeldet", "vertretung_gesucht"]).order("erstellt_am", { ascending: true }),
      supabase.from("schicht_vorlagen").select("id, bezeichnung, wochentag, start_zeit, end_zeit, aktiv").eq("betrieb_id", betrieb),
      supabase.from("schicht_vorlage_mindestbesetzung").select("schicht_vorlage_id, rolle_id, mindestanzahl").eq("betrieb_id", betrieb),
      // Planning cycles that are still in flight or awaiting review (for the Shifts section banners).
      supabase.from("planungszyklen").select("id, status, zeitraum_start, zeitraum_ende")
        .eq("betrieb_id", betrieb)
        .in("status", ["offen", "deadline_erreicht", "solver_laeuft", "vorschlag_bereit"])
        .order("zeitraum_start", { ascending: true }),
    ]);

    setTeam((mitarb.data ?? []) as Mitarbeiter[]);
    setVacations((urlaub.data ?? []) as Urlaub[]);

    const roleById = new Map((roles.data ?? []).map((r: any) => [r.id, r.name]));
    const rn: Record<string, string[]> = {};
    const ri: Record<string, string[]> = {};
    (roleLinks.data ?? []).forEach((l: any) => {
      (ri[l.mitarbeiter_id] ??= []).push(l.rolle_id);
      const name = roleById.get(l.rolle_id);
      if (!name) return;
      (rn[l.mitarbeiter_id] ??= []).push(name);
    });
    setRoleNames(rn);
    setRoleIds(ri);

    const instById = new Map((instanzen.data ?? []).map((i: any) => [i.id, i]));
    // Emergency (non-attended) shifts only count toward the caller's hours when
    // the business chose to credit them.
    const countEmergency = (settingsRow.data as any)?.notfall_stunden_anrechnen ?? false;
    const cutoff = ((settingsRow.data as any)?.abrechnung_bis ?? null) as string | null;
    const hrs: Record<string, number> = {};      // this year only (existing display)
    const cnt: Record<string, number> = {};      // shifts this year
    const monthly: Record<string, Record<string, number>> = {}; // id -> 'YYYY-MM' -> hours (all time)
    (zuweis.data ?? []).forEach((z: any) => {
      const inst = instById.get(z.schicht_instanz_id);
      if (!inst) return; // not loaded
      if (z.attendet === false && !countEmergency) return; // skip called-out shift
      const h = shiftHours(inst.start_zeit, inst.end_zeit);
      (monthly[z.mitarbeiter_id] ??= {});
      monthly[z.mitarbeiter_id][monthKey(inst.datum)] = (monthly[z.mitarbeiter_id][monthKey(inst.datum)] ?? 0) + h;
      if (inst.datum >= yearStart) {
        hrs[z.mitarbeiter_id] = (hrs[z.mitarbeiter_id] ?? 0) + h;
        cnt[z.mitarbeiter_id] = (cnt[z.mitarbeiter_id] ?? 0) + 1;
      }
    });
    setHoursWorked(hrs);
    setShiftsWorked(cnt);
    setMonthlyHours(monthly);

    // Overtime per employee: opening balance + Σ(worked − soll) over full months ≤ cutoff.
    const ot: Record<string, number> = {};
    ((mitarb.data ?? []) as Mitarbeiter[]).forEach((m) => {
      ot[m.id] = computeOvertime(monthly[m.id] ?? {}, m.soll_stunden, m.ueberstunden_saldo ?? 0, cutoff);
    });
    setOvertime(ot);

    const vorlById = new Map((vorlagen.data ?? []).map((v: any) => [v.id, v.bezeichnung]));
    const nameById = new Map((mitarb.data ?? []).map((m: any) => [m.id, `${m.vorname} ${m.nachname}`.trim()]));

    // Active emergencies for the urgent section (needs shift labels).
    const nList = notf.data ?? [];
    const emg: Emergency[] = nList.map((n: any) => {
      const inst = instById.get(n.schicht_instanz_id);
      return {
        id: n.id,
        status: n.status,
        melderName: nameById.get(n.melder_id) ?? "â€”",
        roleName: roleById.get(n.rolle_id) ?? "",
        label: (inst?.schicht_vorlage_id && vorlById.get(inst.schicht_vorlage_id)) || t("manager.shift"),
        datum: inst?.datum ?? "",
        start_zeit: inst?.start_zeit ?? "",
        end_zeit: inst?.end_zeit ?? "",
        grund: n.grund ?? null,
      };
    });
    setEmergencies(emg);

    setEinstellungen((settingsRow.data ?? null) as Einstellungen | null);

    // Shift templates + their per-role minimum staffing (for the Shifts section).
    setRoles((roles.data ?? []).map((r: any) => ({ id: r.id, name: r.name, aktiv: r.aktiv })) as Rolle[]);
    setTemplates((vorlagen.data ?? []) as Vorlage[]);
    const reqs: Record<string, RoleReq[]> = {};
    (mindest.data ?? []).forEach((m: any) => {
      (reqs[m.schicht_vorlage_id] ??= []).push({ rolle_id: m.rolle_id, mindestanzahl: m.mindestanzahl });
    });
    setTemplateReqs(reqs);
    setZyklen((zyklenRes.data ?? []) as Planungszyklus[]);

    // Unfilled role-slots per proposal-ready cycle (derived server-side).
    const { data: slots } = await supabase.rpc("offene_stellen_pro_zyklus", { p_betrieb_id: betrieb });
    const slotMap: Record<string, number> = {};
    (slots ?? []).forEach((s: any) => { slotMap[s.planungszyklus_id] = s.offene_stellen ?? 0; });
    setOpenSlots(slotMap);

    setLoading(false);
  }, [betrieb, t]);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <RefreshScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" onRefresh={load}>
        <View style={styles.titleRow}>
          <Briefcase color={theme.accent} size={26} />
          <Text style={[styles.title, { color: theme.text }]}>{t("manager.title")}</Text>
          <Pressable onPress={load} hitSlop={10} disabled={loading} style={styles.refreshBtn}>
            <RefreshCw color={theme.muted} size={22} style={loading && { opacity: 0.4 }} />
          </Pressable>
        </View>

        {/* section switcher */}
        <View style={[styles.tabs, { borderColor: theme.border }]}>
          {(["employees", "shifts", "business"] as Section[]).map((s) => {
            const active = section === s;
            return (
              <Pressable key={s} onPress={() => setSection(s)} style={[styles.tabBtn, active && { backgroundColor: theme.accent }]}>
                <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: "700", fontSize: 13 }}>
                  {t(s === "employees" ? "manager.tabEmployees" : s === "business" ? "manager.tabBusiness" : "manager.tabShifts")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : section === "employees" ? (
          <EmployeesSection
            theme={theme} t={t} lang={lang} team={team} vacations={vacations} roleNames={roleNames} roleIds={roleIds}
            betrieb={betrieb!} roles={roles}
            hoursWorked={hoursWorked} shiftsWorked={shiftsWorked} emergencies={emergencies}
            monthlyHours={monthlyHours} overtime={overtime} abrechnungBis={einstellungen?.abrechnung_bis ?? null}
            reload={load} fmtDate={fmtDate}
          />
        ) : section === "business" ? (
          <BusinessSection
            theme={theme} t={t} lang={lang} betrieb={betrieb!}
            einstellungen={einstellungen} setEinstellungen={setEinstellungen}
          />
        ) : (
          <ShiftsSection
            theme={theme} t={t} lang={lang} betrieb={betrieb!}
            templates={templates} templateReqs={templateReqs} roles={roles} zyklen={zyklen} openSlots={openSlots} reload={load}
          />
        )}
      </RefreshScrollView>

      {/* Floating "generate shifts" button — hovers at the bottom of the Shifts section */}
      {!loading && section === "shifts" && (
        <Pressable
          style={[styles.bigCreate, { backgroundColor: theme.accent, alignSelf: "center", bottom: 16 + insets.bottom }]}
          onPress={() => setCreateOpen(true)}
        >
          <CalendarPlus color={theme.accentText} size={24} />
          <Text style={[styles.bigCreateText, { color: theme.accentText }]}>{t("manager.createShifts")}</Text>
        </Pressable>
      )}

      <CreateShiftsModal visible={createOpen} theme={theme} t={t} lang={lang} betrieb={betrieb} reload={load} onClose={() => setCreateOpen(false)} />
    </SafeAreaView>
  );
}

// =====================================================================
// Employees
// =====================================================================
function EmployeesSection({ theme, t, lang, team, vacations, roleNames, roleIds, betrieb, roles, hoursWorked, shiftsWorked, emergencies, monthlyHours, overtime, abrechnungBis, reload, fmtDate }: any) {
  const [showDecided, setShowDecided] = useState(false);
  const [denyFor, setDenyFor] = useState<string | null>(null); // urlaub id in deny mode
  const [denyReason, setDenyReason] = useState("");
  const [detail, setDetail] = useState<Mitarbeiter | null>(null);
  const [allowanceError, setAllowanceError] = useState<{ allowance: number; already: number; remaining: number; requested: number } | null>(null);

  const pending = vacations.filter((v: Urlaub) => v.status === "requested");
  const decided = vacations.filter((v: Urlaub) => v.status !== "requested");
  const nameOf = (id: string) => {
    const m = team.find((x: Mitarbeiter) => x.id === id);
    return m ? `${m.vorname} ${m.nachname}` : "â€”";
  };

  const decide = async (id: string, status: Status, begruendung: string | null) => {
    // Guard: approving must not push the employee over their yearly allowance.
    if (status === "approved") {
      const v = vacations.find((x: Urlaub) => x.id === id);
      if (v) {
        const allowance = allowanceOf(team, v.mitarbeiter_id);
        const already = approvedDays(vacations, v.mitarbeiter_id, id); // excludes this request
        const requested = dayDiff(v.von, v.bis);
        if (already + requested > allowance) {
          const remaining = Math.max(0, allowance - already);
          setAllowanceError({ allowance, already, remaining, requested });
          return;
        }
      }
    }
    const { error } = await supabase.from("urlaub").update({ status, begruendung }).eq("id", id);
    if (error) return;
    setDenyFor(null); setDenyReason("");
    reload();
  };

  const statusColor = { requested: AMBER, approved: GREEN, denied: RED } as const;

  return (
    <>
      {/* ---- Urgent: emergency call-outs ---- */}
      <UrgentEmergencies theme={theme} t={t} lang={lang} emergencies={emergencies} reload={reload} />

      {/* ---- Vacation requests ---- */}
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("manager.vacationRequests")}</Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.cardHead, { color: theme.text }]}>{t("manager.pendingRequests")}</Text>
        {pending.length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.noPending")}</Text>
        ) : (
          pending.map((v: Urlaub) => (
            <View key={v.id} style={[styles.reqRow, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{nameOf(v.mitarbeiter_id)}</Text>
              <Text style={{ color: theme.muted, fontSize: 13 }}>
                {fmtDate(v.von)}{v.bis !== v.von ? "  â€“  " + fmtDate(v.bis) : ""}   Â·   {dayDiff(v.von, v.bis)} {t("manager.days")}
              </Text>
              {v.kommentar ? (
                <Text style={{ color: theme.muted, fontSize: 13 }}>â€œ{v.kommentar}â€</Text>
              ) : null}

              {denyFor === v.id ? (
                <>
                  <TextInput
                    style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                    placeholder={t("manager.denyReasonPlaceholder")}
                    placeholderTextColor={theme.muted}
                    value={denyReason} onChangeText={setDenyReason} multiline maxLength={50}
                  />
                  <Text style={[styles.counter, { color: theme.muted }]}>{denyReason.length}/50</Text>
                  <View style={styles.btnRow}>
                    <Pressable style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => { setDenyFor(null); setDenyReason(""); }}>
                      <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>{t("manager.cancel")}</Text>
                    </Pressable>
                    <Pressable style={[styles.smallBtn, { backgroundColor: RED, borderColor: RED }]} onPress={() => decide(v.id, "denied", denyReason.trim() || null)}>
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{t("manager.confirmDeny")}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <View style={styles.btnRow}>
                  <Pressable style={[styles.smallBtn, { borderColor: RED }]} onPress={() => { setDenyFor(v.id); setDenyReason(""); }}>
                    <X color={RED} size={16} />
                    <Text style={{ color: RED, fontWeight: "700", fontSize: 13 }}>{t("manager.deny")}</Text>
                  </Pressable>
                  <Pressable style={[styles.smallBtn, { backgroundColor: GREEN, borderColor: GREEN }]} onPress={() => decide(v.id, "approved", null)}>
                    <Check color="#fff" size={16} />
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{t("manager.approve")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      {/* decided â€” folded */}
      <Pressable
        style={[styles.foldHead, { backgroundColor: theme.surface, borderColor: theme.border }]}
        onPress={() => setShowDecided((o) => !o)}
      >
        <Text style={{ color: theme.text, fontWeight: "700", flex: 1 }}>
          {t("manager.decidedRequests")} ({decided.length})
        </Text>
        {showDecided ? <ChevronDown color={theme.muted} size={20} /> : <ChevronRight color={theme.muted} size={20} />}
      </Pressable>
      {showDecided && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {decided.length === 0 ? (
            <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.noDecided")}</Text>
          ) : (
            decided.map((v: Urlaub) => (
              <View key={v.id} style={[styles.reqRow, { borderColor: theme.border }]}>
                <View>
                  <Text style={{ color: theme.text, fontWeight: "600" }}>{nameOf(v.mitarbeiter_id)}</Text>
                  <Text style={{ color: theme.muted, fontSize: 12 }}>
                    {fmtDate(v.von)}{v.bis !== v.von ? "  â€“  " + fmtDate(v.bis) : ""}   Â·   {dayDiff(v.von, v.bis)} {t("manager.days")}
                  </Text>
                  {v.begruendung ? (
                    <Text style={{ color: RED, fontSize: 12 }}>{v.begruendung}</Text>
                  ) : null}
                </View>

                {denyFor === v.id ? (
                  <>
                    <TextInput
                      style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                      placeholder={t("manager.denyReasonPlaceholder")}
                      placeholderTextColor={theme.muted}
                      value={denyReason} onChangeText={setDenyReason} multiline maxLength={50}
                    />
                    <Text style={[styles.counter, { color: theme.muted }]}>{denyReason.length}/50</Text>
                    <View style={styles.btnRow}>
                      <Pressable style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => { setDenyFor(null); setDenyReason(""); }}>
                        <Text style={{ color: theme.text, fontWeight: "700", fontSize: 13 }}>{t("manager.cancel")}</Text>
                      </Pressable>
                      <Pressable style={[styles.smallBtn, { backgroundColor: RED, borderColor: RED }]} onPress={() => decide(v.id, "denied", denyReason.trim() || null)}>
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{t("manager.confirmDeny")}</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <>
                    {/* big current-decision badge */}
                    <View style={[styles.decisionBadge, { backgroundColor: statusColor[v.status as Status] }]}>
                      {v.status === "approved" ? <Check color="#fff" size={18} /> : <X color="#fff" size={18} />}
                      <Text style={styles.decisionBadgeText}>
                        {t(`scheduling.status${v.status[0].toUpperCase()}${v.status.slice(1)}`)}
                      </Text>
                    </View>
                    {/* smaller change-decision action */}
                    {v.status === "approved" ? (
                      <Pressable style={styles.changeBtn} onPress={() => { setDenyFor(v.id); setDenyReason(""); }}>
                        <Text style={{ color: RED, fontWeight: "700", fontSize: 13 }}>{t("manager.changeToDenied")}</Text>
                      </Pressable>
                    ) : (
                      <Pressable style={styles.changeBtn} onPress={() => decide(v.id, "approved", null)}>
                        <Text style={{ color: GREEN, fontWeight: "700", fontSize: 13 }}>{t("manager.changeToApproved")}</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* allowance-exceeded error */}
      <Modal visible={!!allowanceError} transparent animationType="fade" onRequestClose={() => setAllowanceError(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAllowanceError(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            {allowanceError && (
              <>
                <View style={styles.sheetHead}>
                  <Text style={[styles.sheetTitle, { color: RED }]}>{t("manager.allowanceExceededTitle")}</Text>
                  <Pressable onPress={() => setAllowanceError(null)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
                </View>
                <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
                  {t("manager.allowanceExceededMsg")}
                </Text>
                <DetailRow theme={theme} label={t("manager.vacationAllowance")} value={`${allowanceError.allowance} ${t("manager.days")}`} />
                <DetailRow theme={theme} label={t("manager.vacationTaken")} value={`${allowanceError.already} ${t("manager.days")}`} />
                <DetailRow theme={theme} label={t("manager.remaining")} value={`${allowanceError.remaining} ${t("manager.days")}`} />
                <DetailRow theme={theme} label={t("manager.requested")} value={`${allowanceError.requested} ${t("manager.days")}`} last />
                <Pressable style={[styles.submit, { backgroundColor: theme.accent, marginTop: 16 }]} onPress={() => setAllowanceError(null)}>
                  <Text style={[styles.submitText, { color: theme.accentText }]}>{t("manager.cancel")}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ---- Roles ---- */}
      <RolesManager theme={theme} t={t} betrieb={betrieb} roles={roles} team={team} roleIds={roleIds} reload={reload} />

      {/* ---- Team ---- */}
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("manager.employees")}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {team.length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.noEmployees")}</Text>
        ) : (
          team.map((m: Mitarbeiter) => (
            <Pressable key={m.id} style={[styles.listRow, { borderColor: theme.border }]} onPress={() => setDetail(m)}>
              <Users color={theme.muted} size={18} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{m.vorname} {m.nachname}</Text>
                <Text style={{ color: theme.muted, fontSize: 12 }}>
                  {(roleNames[m.id] ?? []).join(", ") || t(m.rolle_typ === "chef" ? "manager.chef" : "manager.employee")}
                </Text>
              </View>
              <ChevronRight color={theme.muted} size={18} />
            </Pressable>
          ))
        )}
      </View>

      {/* member detail sheet */}
      <Modal visible={!!detail} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            {detail && (
              <>
                <View style={styles.sheetHead}>
                  <Text style={[styles.sheetTitle, { color: theme.text }]}>{detail.vorname} {detail.nachname}</Text>
                  <Pressable onPress={() => setDetail(null)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
                </View>
                {detail.rolle_typ === "chef" && (
                  <DetailRow theme={theme} label={t("manager.role")} value={t("manager.chef")} />
                )}
                {detail.email ? <DetailRow theme={theme} label={t("manager.email")} value={detail.email} /> : null}
                <DetailRow theme={theme} label={t("manager.phone")} value={detail.telefon || "—"} last={detail.rolle_typ === "chef"} />
                {/* Roles + work-related info only apply to schedulable employees, not the chef */}
                {detail.rolle_typ !== "chef" && (
                  <>
                    <RoleEditor theme={theme} t={t} betrieb={betrieb} employeeId={detail.id}
                      activeRoles={(roles as Rolle[]).filter((r) => r.aktiv)} assigned={roleIds[detail.id] ?? []} reload={reload} />
                    {detail.vertrag_typ ? <DetailRow theme={theme} label={t("manager.contract")} value={detail.vertrag_typ} /> : null}
                    {detail.soll_stunden != null ? <DetailRow theme={theme} label={t("manager.targetHours")} value={`${detail.soll_stunden} ${t("manager.hours")}`} /> : null}
                    <DetailRow theme={theme} label={t("manager.accountingUntil")}
                      value={abrechnungBis ? fmtDate(abrechnungBis) : t("manager.accountingNotSet")} />
                    <WorkBreakdown theme={theme} t={t} lang={lang}
                      months={monthlyHours[detail.id] ?? {}} soll={detail.soll_stunden}
                      opening={detail.ueberstunden_saldo ?? 0} overtime={overtime[detail.id] ?? (detail.ueberstunden_saldo ?? 0)}
                      cutoff={abrechnungBis} />
                    <DetailRow theme={theme} label={t("manager.shiftsWorked")} value={String(shiftsWorked[detail.id] ?? 0)} />
                    <DetailRow theme={theme} label={t("manager.vacationTaken")}
                      value={`${vacationTaken(vacations, detail.id)} / ${detail.urlaubsanspruch_tage} ${t("manager.days")}`} />
                    <DetailRow theme={theme} label={t("manager.status")} value={detail.status} last />
                  </>
                )}
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Inline role assignment for one employee: tap a chip to add/remove that role.
function RoleEditor({ theme, t, betrieb, employeeId, activeRoles, assigned, reload }: any) {
  const [busy, setBusy] = useState(false);

  const toggle = async (roleId: string, on: boolean) => {
    if (busy) return;
    setBusy(true);
    const { error } = on
      ? await supabase.from("mitarbeiter_rollen").delete()
          .eq("betrieb_id", betrieb).eq("mitarbeiter_id", employeeId).eq("rolle_id", roleId)
      : await supabase.from("mitarbeiter_rollen").insert({ betrieb_id: betrieb, mitarbeiter_id: employeeId, rolle_id: roleId });
    setBusy(false);
    if (error) { Alert.alert(t("manager.roleSaveFailed")); return; }
    await reload();
  };

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.editRoles")}</Text>
      {activeRoles.length === 0 ? (
        <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.tplNoRoles")}</Text>
      ) : (
        <>
          <View style={styles.roleChips}>
            {(activeRoles as Rolle[]).map((r) => {
              const on = (assigned as string[]).includes(r.id);
              return (
                <Pressable key={r.id} onPress={() => toggle(r.id, on)} disabled={busy}
                  style={[styles.roleChip, { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.accent : theme.bg }]}>
                  <Text style={{ color: on ? theme.accentText : theme.text, fontWeight: "600", fontSize: 14 }}>{r.name}</Text>
                  {on ? <Check color={theme.accentText} size={14} /> : <Plus color={theme.muted} size={14} />}
                </Pressable>
              );
            })}
          </View>
          {(assigned as string[]).length === 0 && (
            <Text style={[styles.hint, { color: AMBER }]}>{t("manager.editRolesNone")}</Text>
          )}
        </>
      )}
    </View>
  );
}

// Compact roles manager: list active roles, add a new one, soft-remove (aktiv=false).
function RolesManager({ theme, t, betrieb, roles, team, roleIds, reload }: any) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmRole, setConfirmRole] = useState<Rolle | null>(null); // role pending deletion
  const active = (roles as Rolle[]).filter((r) => r.aktiv);

  // Employees whose ONLY role is the one being removed — they'd be left unschedulable.
  const orphaned: Mitarbeiter[] = confirmRole
    ? (team as Mitarbeiter[]).filter((m) => {
        const ids = (roleIds?.[m.id] ?? []) as string[];
        return ids.length === 1 && ids[0] === confirmRole.id;
      })
    : [];

  const add = async () => {
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    const { error } = await supabase.from("rollen").insert({ betrieb_id: betrieb, name: n, aktiv: true });
    setBusy(false);
    if (error) { Alert.alert(t("manager.roleSaveFailed")); return; }
    setName("");
    reload();
  };

  const confirmRemoveDone = async () => {
    if (!confirmRole) return;
    setBusy(true);
    const { error } = await supabase.from("rollen").update({ aktiv: false }).eq("id", confirmRole.id);
    setBusy(false);
    setConfirmRole(null);
    if (error) { Alert.alert(t("manager.roleSaveFailed")); return; }
    reload();
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("manager.roles")}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {active.length === 0 ? (
          <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.rolesEmpty")}</Text>
        ) : (
          <View style={styles.roleChips}>
            {active.map((r) => (
              <View key={r.id} style={[styles.roleChip, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={{ color: theme.text, fontWeight: "600", fontSize: 14 }}>{r.name}</Text>
                <Pressable onPress={() => setConfirmRole(r)} hitSlop={8}>
                  <X color={theme.muted} size={16} />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        <View style={styles.roleAddRow}>
          <TextInput
            style={[styles.input, { flex: 1, color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
            value={name} onChangeText={setName} placeholder={t("manager.roleNamePlaceholder")} placeholderTextColor={theme.muted}
            maxLength={30} onSubmitEditing={add} returnKeyType="done"
          />
          <Pressable style={[styles.roleAddBtn, { backgroundColor: theme.accent, opacity: name.trim() ? 1 : 0.5 }]} onPress={add} disabled={!name.trim() || busy}>
            <Plus color={theme.accentText} size={18} />
            <Text style={{ color: theme.accentText, fontWeight: "700", fontSize: 14 }}>{t("manager.roleAdd")}</Text>
          </Pressable>
        </View>
      </View>

      {/* delete confirmation popup */}
      <Modal visible={!!confirmRole} transparent animationType="fade" onRequestClose={() => setConfirmRole(null)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmRole(null)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("manager.roleRemove")}</Text>
              <Pressable onPress={() => setConfirmRole(null)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
            </View>
            <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21, marginBottom: 16 }}>
              {confirmRole ? (t("manager.roleRemoveConfirm", { name: confirmRole.name }) as string) : ""}
            </Text>
            {orphaned.length > 0 && (
              <View style={[styles.deadlineBanner, { backgroundColor: AMBER + "1F", borderColor: AMBER, marginTop: 0, marginBottom: 16 }]}>
                <TriangleAlert color={AMBER} size={18} />
                <Text style={{ color: AMBER, fontWeight: "700", fontSize: 13, flex: 1 }}>
                  {t("manager.roleRemoveOrphans", { names: orphaned.map((m) => `${m.vorname} ${m.nachname}`.trim()).join(", ") })}
                  {" "}{t("manager.roleRemoveNeedsRole")}
                </Text>
              </View>
            )}
            <View style={styles.btnRow}>
              <Pressable style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => setConfirmRole(null)} disabled={busy}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>{t("manager.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, { backgroundColor: RED, borderColor: RED }]} onPress={confirmRemoveDone} disabled={busy}>
                <Trash2 color="#fff" size={16} />
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>{t("manager.roleRemove")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

// Emergencies a manager still has to act on, pinned to the very top.
function UrgentEmergencies({ theme, t, lang, emergencies, reload }: any) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!emergencies || emergencies.length === 0) return null;

  const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
  const fmtShift = (e: Emergency) =>
    `${e.label}${e.roleName ? " Â· " + e.roleName : ""} Â· ${e.datum ? new Date(e.datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" }) : ""} Â· ${hhmm(e.start_zeit)}â€“${hhmm(e.end_zeit)}`;

  const callOut = async (id: string) => {
    setBusy(id);
    const { error } = await supabase.rpc("notfall_vertretung_ausschreiben", { p_notfall_id: id });
    setBusy(null);
    if (!error) reload();
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: RED }]}>{t("manager.emergencies")}</Text>
      {emergencies.map((e: Emergency) => (
        <View key={e.id} style={[styles.card, { backgroundColor: theme.surface, borderColor: RED }]}>
          <View style={styles.rowIcon}>
            <TriangleAlert color={RED} size={20} />
            <Text style={{ color: RED, fontWeight: "800", flex: 1 }}>{t("manager.emergencyTitle")}</Text>
          </View>
          <Text style={{ color: theme.text, fontWeight: "700" }}>{e.melderName}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{fmtShift(e)}</Text>
          {e.grund ? <Text style={{ color: theme.text, fontSize: 13 }}>â€œ{e.grund}â€</Text> : null}

          {e.status === "vertretung_gesucht" ? (
            <View style={[styles.eligible, { backgroundColor: AMBER + "22" }]}>
              <Text style={{ color: AMBER, fontWeight: "700", fontSize: 13 }}>{t("manager.emergencySearching")}</Text>
            </View>
          ) : (
            <Pressable
              style={[styles.submit, { backgroundColor: RED, marginTop: 4, flexDirection: "row", justifyContent: "center" }]}
              onPress={() => callOut(e.id)}
              disabled={busy === e.id}
            >
              <Megaphone color="#fff" size={18} />
              <Text style={[styles.submitText, { color: "#fff", marginLeft: 8 }]}>{t("manager.emergencyCallOut")}</Text>
            </Pressable>
          )}
        </View>
      ))}
    </>
  );
}

function vacationTaken(vacations: Urlaub[], mitarbeiterId: string) {
  return approvedDays(vacations, mitarbeiterId);
}

// Sum of approved vacation days for this employee in the current year,
// optionally excluding one request (the one being (re)decided).
function approvedDays(vacations: Urlaub[], mitarbeiterId: string, excludeId?: string) {
  const yr = new Date().getFullYear();
  return vacations
    .filter((v) => v.id !== excludeId && v.mitarbeiter_id === mitarbeiterId
      && v.status === "approved" && new Date(v.von).getFullYear() === yr)
    .reduce((sum, v) => sum + dayDiff(v.von, v.bis), 0);
}

function allowanceOf(team: Mitarbeiter[], mitarbeiterId: string) {
  return team.find((m) => m.id === mitarbeiterId)?.urlaubsanspruch_tage ?? 0;
}

function DetailRow({ theme, label, value, last }: { theme: any; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: theme.text, fontSize: 14, fontWeight: "600", flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

// Per-employee hours-per-month list + computed overtime (opening balance +
// Σ over full months ≤ cutoff of worked − soll). Mirrors computeOvertime().
function WorkBreakdown({ theme, t, lang, months, soll, opening, overtime, cutoff }: any) {
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString(lang, { month: "short", year: "numeric" });
  };
  const rows = Object.entries(months as Record<string, number>)
    .filter(([ym]) => !cutoff || lastDayOfMonth(ym) <= cutoff)
    .sort((a, b) => a[0].localeCompare(b[0]));
  const otStr = `${overtime > 0 ? "+" : ""}${(overtime as number).toFixed(1)} ${t("manager.hours")}`;
  const otColor = overtime > 0 ? GREEN : overtime < 0 ? RED : theme.text;
  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.muted, marginTop: 12, marginBottom: 4 }]}>
        {t("manager.hoursPerMonth")}
      </Text>
      {rows.length === 0 ? (
        <Text style={[styles.hint, { color: theme.muted, marginBottom: 8 }]}>{t("manager.noHoursYet")}</Text>
      ) : (
        rows.map(([ym, hrs]) => (
          <View key={ym} style={[styles.detailRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{monthLabel(ym)}</Text>
            <Text style={{ color: theme.text, fontSize: 14 }}>
              {(hrs as number).toFixed(1)} / {soll ?? 0} {t("manager.hours")}
            </Text>
          </View>
        ))
      )}
      {opening ? (
        <DetailRow theme={theme} label={t("manager.openingBalance")}
          value={`${opening > 0 ? "+" : ""}${opening} ${t("manager.hours")}`} />
      ) : null}
      <View style={[styles.detailRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
        <Text style={{ color: theme.muted, fontSize: 13 }}>{t("manager.overtime")}</Text>
        <Text style={{ color: otColor, fontSize: 14, fontWeight: "700" }}>{otStr}</Text>
      </View>
    </>
  );
}

// =====================================================================
// Business
// =====================================================================
function BusinessSection({ theme, t, lang, betrieb, einstellungen, setEinstellungen }: any) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setSetting = (patch: Partial<Einstellungen>) =>
    setEinstellungen((prev: Einstellungen | null) => ({ ...(prev ?? { tausch_freigabe_erforderlich: true, sprache_standard: "de", verfuegbarkeit_deadline_tag: 5, notfall_stunden_anrechnen: false, mitarbeiter_sehen_andere_schichten: false, mitarbeiter_sehen_andere_mitarbeiter: false, abrechnung_bis: null }), ...patch }));

  const save = async () => {
    if (!betrieb) return;
    setSaving(true);
    if (einstellungen) {
      await supabase.from("betriebs_einstellungen").update({
        tausch_freigabe_erforderlich: einstellungen.tausch_freigabe_erforderlich,
        verfuegbarkeit_deadline_tag: einstellungen.verfuegbarkeit_deadline_tag,
        notfall_stunden_anrechnen: einstellungen.notfall_stunden_anrechnen,
        mitarbeiter_sehen_andere_schichten: einstellungen.mitarbeiter_sehen_andere_schichten,
        mitarbeiter_sehen_andere_mitarbeiter: einstellungen.mitarbeiter_sehen_andere_mitarbeiter,
        abrechnung_bis: einstellungen.abrechnung_bis,
      }).eq("betrieb_id", betrieb);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("manager.businessSettings")}</Text>
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {einstellungen && (
          <>
            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{t("manager.swapApproval")}</Text>
              <Switch
                value={einstellungen.tausch_freigabe_erforderlich}
                onValueChange={(v) => setSetting({ tausch_freigabe_erforderlich: v })}
                trackColor={{ true: theme.accent, false: theme.border }}
              />
            </View>

            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{t("manager.countEmergencyHours")}</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{t("manager.countEmergencyHoursHint")}</Text>
              </View>
              <Switch
                value={einstellungen.notfall_stunden_anrechnen}
                onValueChange={(v) => setSetting({ notfall_stunden_anrechnen: v })}
                trackColor={{ true: theme.accent, false: theme.border }}
              />
            </View>

            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{t("manager.seeOtherShifts")}</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{t("manager.seeOtherShiftsHint")}</Text>
              </View>
              <Switch
                value={einstellungen.mitarbeiter_sehen_andere_schichten}
                onValueChange={(v) => setSetting({ mitarbeiter_sehen_andere_schichten: v })}
                trackColor={{ true: theme.accent, false: theme.border }}
              />
            </View>

            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.text, fontWeight: "600" }}>{t("manager.seeOtherPeople")}</Text>
                <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>{t("manager.seeOtherPeopleHint")}</Text>
              </View>
              <Switch
                value={einstellungen.mitarbeiter_sehen_andere_mitarbeiter}
                onValueChange={(v) => setSetting({ mitarbeiter_sehen_andere_mitarbeiter: v })}
                trackColor={{ true: theme.accent, false: theme.border }}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.availabilityDeadline")}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                value={String(einstellungen.verfuegbarkeit_deadline_tag)}
                onChangeText={(txt) => {
                  const n = Math.max(1, Math.min(28, parseInt(txt.replace(/[^0-9]/g, ""), 10) || 1));
                  setSetting({ verfuegbarkeit_deadline_tag: n });
                }}
                keyboardType="number-pad" maxLength={2}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.accountingUntil")}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginBottom: 6 }}>{t("manager.accountingUntilHint")}</Text>
              <DateTimeField
                mode="date"
                value={einstellungen.abrechnung_bis ? new Date(einstellungen.abrechnung_bis + "T00:00:00") : new Date()}
                onChange={(d: Date) => setSetting({ abrechnung_bis: isoLocal(d) })}
                accent={theme.accent} textColor={theme.text} locale={lang}
              />
              {einstellungen.abrechnung_bis ? (
                <Pressable onPress={() => setSetting({ abrechnung_bis: null })} hitSlop={8} style={{ marginTop: 8 }}>
                  <Text style={{ color: theme.accent, fontWeight: "600", fontSize: 13 }}>{t("manager.accountingClear")}</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        )}

        <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={save} disabled={saving}>
          <Text style={[styles.submitText, { color: theme.accentText }]}>
            {saving ? "â€¦" : saved ? `âœ“ ${t("manager.saved")}` : t("manager.save")}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

// =====================================================================
// Shifts
// =====================================================================
const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
// Full localized weekday name (Monday-first index 0..6), same approach as scheduling.tsx.
const weekdayName = (wd: number, lang: string) => {
  const monday = new Date(2024, 0, 1); // 2024-01-01 is a Monday
  const d = new Date(monday);
  d.setDate(monday.getDate() + wd);
  return d.toLocaleDateString(lang, { weekday: "long" });
};

function ShiftsSection({ theme, t, lang, betrieb, templates, templateReqs, roles, zyklen, openSlots, reload }: any) {
  const [editor, setEditor] = useState<Vorlage | "new" | null>(null);

  const roleName = (id: string) => roles.find((r: Rolle) => r.id === id)?.name ?? "";

  // Planning cycles awaiting the chef's review vs. still being generated.
  const readyCycles: Planungszyklus[] = (zyklen ?? []).filter((z: Planungszyklus) => z.status === "vorschlag_bereit");
  // Total unfilled role-slots across the ready cycles (0 when fully staffed).
  const readyOpenSlots = readyCycles.reduce((sum, z) => sum + ((openSlots ?? {})[z.id] ?? 0), 0);
  const generatingCycles: Planungszyklus[] = (zyklen ?? []).filter((z: Planungszyklus) =>
    z.status === "offen" || z.status === "deadline_erreicht" || z.status === "solver_laeuft");

  const fmtRange = (von: string, bis: string) => {
    const f = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(lang, { day: "numeric", month: "short" });
    return `${f(von)} – ${f(bis)}`;
  };
  const cyclesLabel = (list: Planungszyklus[]) =>
    list.length === 1 ? fmtRange(list[0].zeitraum_start, list[0].zeitraum_ende) : `${list.length} ${t("manager.csCyclesMany")}`;

  const byDay = useMemo(() => {
    const m = new Map<number, Vorlage[]>();
    (templates as Vorlage[]).forEach((v) => {
      if (!m.has(v.wochentag)) m.set(v.wochentag, []);
      m.get(v.wochentag)!.push(v);
    });
    for (const arr of m.values()) arr.sort((a, b) => a.start_zeit.localeCompare(b.start_zeit));
    return m;
  }, [templates]);

  return (
    <>
      {/* Awaiting review — the solver produced a proposal the chef should check. */}
      {readyCycles.length > 0 && (
        <Pressable
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent, marginTop: 6, flexDirection: "row", alignItems: "center", gap: 12 }]}
          onPress={() => router.push("/calendar")}
        >
          <CalendarCheck2 color={theme.accent} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>{t("manager.csCheckReady")}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{cyclesLabel(readyCycles)}</Text>
          </View>
          {readyOpenSlots > 0 ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TriangleAlert color={AMBER} size={16} />
              <Text style={{ color: AMBER, fontWeight: "800", fontSize: 13 }}>{t("manager.csOpenSlots", { count: readyOpenSlots })}</Text>
            </View>
          ) : null}
          <ChevronRight color={theme.muted} size={22} />
        </Pressable>
      )}

      {/* Still generating — a cycle exists but no proposal is ready yet. */}
      {generatingCycles.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: AMBER, marginTop: readyCycles.length > 0 ? 0 : 6, flexDirection: "row", alignItems: "center", gap: 12 }]}>
          <Hourglass color={AMBER} size={22} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.text, fontWeight: "800", fontSize: 15 }}>{t("manager.csGenerating")}</Text>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{cyclesLabel(generatingCycles)}</Text>
          </View>
        </View>
      )}

      <View style={styles.tplHeadRow}>
        <Text style={[styles.sectionLabel, { color: theme.muted, marginTop: 6 }]}>{t("manager.shiftTemplates")}</Text>
        <Pressable style={[styles.addTplBtn, { borderColor: theme.accent }]} onPress={() => setEditor("new")}>
          <Plus color={theme.accent} size={16} />
          <Text style={{ color: theme.accent, fontWeight: "700", fontSize: 13 }}>{t("manager.addTemplate")}</Text>
        </Pressable>
      </View>

      {templates.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.noTemplates")}</Text>
        </View>
      ) : (
        WEEKDAY_KEYS.map((key, day) => {
          const arr = byDay.get(day) ?? [];
          if (arr.length === 0) return null;
          return (
            <View key={key} style={{ gap: 6 }}>
              <Text style={[styles.dayLabel, { color: theme.text }]}>{weekdayName(day, lang)}</Text>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, gap: 0 }]}>
                {arr.map((v, i) => {
                  const reqs: RoleReq[] = templateReqs[v.id] ?? [];
                  return (
                    <Pressable
                      key={v.id}
                      style={[styles.tplRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}
                      onPress={() => setEditor(v)}
                    >
                      <Clock color={theme.muted} size={18} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.tplTitleRow}>
                          <Text style={{ color: theme.text, fontWeight: "700" }}>{v.bezeichnung}</Text>
                          {!v.aktiv && (
                            <Text style={[styles.inactivePill, { color: theme.muted, borderColor: theme.border }]}>
                              {t("manager.tplInactive")}
                            </Text>
                          )}
                        </View>
                        <Text style={{ color: theme.muted, fontSize: 13 }}>{hhmm(v.start_zeit)}–{hhmm(v.end_zeit)}</Text>
                        {reqs.length > 0 && (
                          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 2 }}>
                            {reqs.map((r) => `${roleName(r.rolle_id)} ×${r.mindestanzahl}`).join("  ·  ")}
                          </Text>
                        )}
                      </View>
                      <Pencil color={theme.muted} size={16} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })
      )}

      {/* spacer so the last row clears the floating generate button */}
      <View style={{ height: 76 }} />

      <TemplateEditor
        target={editor} theme={theme} t={t} lang={lang} betrieb={betrieb} roles={roles}
        initialReqs={editor && editor !== "new" ? (templateReqs[editor.id] ?? []) : []}
        onClose={() => setEditor(null)} reload={reload}
      />
    </>
  );
}

// Create / edit a shift template incl. per-role minimum staffing.
function TemplateEditor({ target, theme, t, lang, betrieb, roles, initialReqs, onClose, reload }: any) {
  const isNew = target === "new";
  const tpl: Vorlage | null = target && target !== "new" ? target : null;
  const activeRoles: Rolle[] = (roles as Rolle[]).filter((r) => r.aktiv);

  const [bezeichnung, setBezeichnung] = useState("");
  const [wochentag, setWochentag] = useState(0);
  const [start, setStart] = useState("06:00");
  const [end, setEnd] = useState("14:00");
  const [aktiv, setAktiv] = useState(true);
  const [counts, setCounts] = useState<Record<string, number>>({}); // rolle_id -> mindestanzahl
  const [rolesOpen, setRolesOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Reset the form whenever a different template (or "new") is opened.
  useEffect(() => {
    if (!target) return;
    setBezeichnung(tpl?.bezeichnung ?? "");
    setWochentag(tpl?.wochentag ?? 0);
    setStart(tpl ? hhmm(tpl.start_zeit) : "06:00");
    setEnd(tpl ? hhmm(tpl.end_zeit) : "14:00");
    setAktiv(tpl?.aktiv ?? true);
    const c: Record<string, number> = {};
    (initialReqs as RoleReq[]).forEach((r) => { c[r.rolle_id] = r.mindestanzahl; });
    setCounts(c);
  }, [target]); // eslint-disable-line react-hooks/exhaustive-deps

  const validTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

  const save = async () => {
    if (!bezeichnung.trim()) { Alert.alert(t("manager.tplNameRequired")); return; }
    if (!validTime(start) || !validTime(end)) { Alert.alert(t("manager.tplTimeInvalid")); return; }
    setSaving(true);

    let vorlageId = tpl?.id ?? null;
    const base = {
      betrieb_id: betrieb,
      bezeichnung: bezeichnung.trim(),
      wochentag,
      start_zeit: start + ":00",
      end_zeit: end + ":00",
      aktiv,
    };

    if (isNew) {
      const { data, error } = await supabase.from("schicht_vorlagen").insert(base).select("id").single();
      if (error || !data) { setSaving(false); Alert.alert(t("manager.tplSaveFailed")); return; }
      vorlageId = data.id;
    } else {
      const { error } = await supabase.from("schicht_vorlagen").update(base).eq("id", vorlageId);
      if (error) { setSaving(false); Alert.alert(t("manager.tplSaveFailed")); return; }
    }

    // Sync role requirements: wipe existing, insert the nonzero counts.
    if (!isNew) {
      await supabase.from("schicht_vorlage_mindestbesetzung").delete().eq("schicht_vorlage_id", vorlageId);
    }
    const rows = Object.entries(counts)
      .filter(([, n]) => n > 0)
      .map(([rolle_id, n]) => ({ betrieb_id: betrieb, schicht_vorlage_id: vorlageId, rolle_id, mindestanzahl: n }));
    if (rows.length > 0) {
      await supabase.from("schicht_vorlage_mindestbesetzung").insert(rows);
    }

    setSaving(false);
    onClose();
    reload();
  };

  const remove = async () => {
    if (!tpl) return;
    Alert.alert(t("manager.deleteTemplate"), t("manager.deleteTemplateConfirm"), [
      { text: t("manager.cancel"), style: "cancel" },
      {
        text: t("manager.deleteTemplate"), style: "destructive", onPress: async () => {
          setSaving(true);
          await supabase.from("schicht_vorlage_mindestbesetzung").delete().eq("schicht_vorlage_id", tpl.id);
          await supabase.from("schicht_vorlagen").delete().eq("id", tpl.id);
          setSaving(false);
          onClose();
          reload();
        },
      },
    ]);
  };

  const bump = (rolleId: string, delta: number) =>
    setCounts((c) => ({ ...c, [rolleId]: Math.max(0, Math.min(99, (c[rolleId] ?? 0) + delta)) }));

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: "88%" }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>
              {isNew ? t("manager.newTemplate") : t("manager.editTemplate")}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 12 }} showsVerticalScrollIndicator={false}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.tplName")}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                value={bezeichnung} onChangeText={setBezeichnung} placeholder={t("manager.tplName")} placeholderTextColor={theme.muted} maxLength={40}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.tplWeekday")}</Text>
              <View style={styles.wdRow}>
                {WEEKDAY_KEYS.map((key, day) => {
                  const on = wochentag === day;
                  return (
                    <Pressable key={key} onPress={() => setWochentag(day)}
                      style={[styles.wdChip, { borderColor: on ? theme.accent : theme.border, backgroundColor: on ? theme.accent : "transparent" }]}>
                      <Text style={{ color: on ? theme.accentText : theme.text, fontWeight: "700", fontSize: 12 }}>
                        {weekdayName(day, lang).slice(0, 2)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.timeRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.tplStart")}</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                  value={start} onChangeText={setStart} placeholder="06:00" placeholderTextColor={theme.muted} maxLength={5} keyboardType="numbers-and-punctuation"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.tplEnd")}</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                  value={end} onChangeText={setEnd} placeholder="14:00" placeholderTextColor={theme.muted} maxLength={5} keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>

            <View style={[styles.switchRow, { borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{t("manager.tplActive")}</Text>
              <Switch value={aktiv} onValueChange={setAktiv} trackColor={{ true: theme.accent, false: theme.border }} />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.tplRoles")}</Text>
              {activeRoles.length === 0 ? (
                <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.tplNoRoles")}</Text>
              ) : (
                <>
                  {/* dropdown header — shows a summary of the chosen roles */}
                  <Pressable
                    style={[styles.roleDropdownHead, { borderColor: theme.border, backgroundColor: theme.bg }]}
                    onPress={() => setRolesOpen((o) => !o)}
                  >
                    <Text style={{ color: theme.text, flex: 1, fontSize: 14 }} numberOfLines={1}>
                      {(() => {
                        const chosen = activeRoles.filter((r: Rolle) => (counts[r.id] ?? 0) > 0);
                        return chosen.length === 0
                          ? t("manager.tplRolesNone")
                          : chosen.map((r: Rolle) => `${r.name} ×${counts[r.id]}`).join(", ");
                      })()}
                    </Text>
                    {rolesOpen ? <ChevronDown color={theme.muted} size={20} /> : <ChevronRight color={theme.muted} size={20} />}
                  </Pressable>

                  {rolesOpen && (
                    <View style={[styles.roleDropdownBody, { borderColor: theme.border, backgroundColor: theme.bg }]}>
                      {activeRoles.map((r: Rolle) => {
                        const n = counts[r.id] ?? 0;
                        return (
                          <View key={r.id} style={[styles.roleReqRow, { borderColor: theme.border }]}>
                            <Text style={{ color: theme.text, flex: 1, fontWeight: n > 0 ? "700" : "500" }}>{r.name}</Text>
                            <Pressable style={[styles.stepBtn, { borderColor: theme.border }]} onPress={() => bump(r.id, -1)} hitSlop={6}>
                              <Minus color={theme.text} size={16} />
                            </Pressable>
                            <Text style={{ color: theme.text, fontWeight: "700", width: 24, textAlign: "center" }}>{n}</Text>
                            <Pressable style={[styles.stepBtn, { borderColor: theme.border }]} onPress={() => bump(r.id, 1)} hitSlop={6}>
                              <Plus color={theme.text} size={16} />
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </>
              )}
            </View>

            <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={save} disabled={saving}>
              <Text style={[styles.submitText, { color: theme.accentText }]}>{saving ? "…" : t("manager.save")}</Text>
            </Pressable>

            {!isNew && (
              <Pressable style={styles.deleteBtn} onPress={remove} disabled={saving}>
                <Trash2 color={RED} size={16} />
                <Text style={{ color: RED, fontWeight: "700", fontSize: 14 }}>{t("manager.deleteTemplate")}</Text>
              </Pressable>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// React Native's Alert is a no-op on web (Expo Web); this wrapper falls back to
// window.alert on web so result messages still surface in the browser. Confirmations
// use an in-app Modal instead (see the confirm popup in CreateShiftsModal).
const notify = (message: string) => {
  if (Platform.OS === "web") { if (typeof window !== "undefined") window.alert(message); }
  else Alert.alert(message);
};

// "Generate shifts" — creates a real planning cycle (planungszyklen). The solver run
// that turns the cycle into concrete shifts is triggered separately.
function CreateShiftsModal({ visible, theme, t, lang, betrieb, reload, onClose }: any) {
  const now = new Date();
  const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return isoDay(d); };
  const endOfMonth = (iso: string) => { const d = new Date(iso + "T00:00:00"); return isoDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)); };

  // Start is DERIVED, not editable: the day after the last planning cycle ends.
  // If there's never been a cycle, we start from today and skip the deadline entirely.
  const [von, setVon] = useState<string | null>(null);
  const [bis, setBis] = useState("");
  const [hasPrevCycle, setHasPrevCycle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  // Does the chosen range overlap shifts that already exist?
  const [periodUsed, setPeriodUsed] = useState(false);

  const isoRe = /^\d{4}-\d{2}-\d{2}$/;

  // On open: find where the last cycle ended and seed the range from there.
  useEffect(() => {
    if (!visible || !betrieb) return;
    let alive = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase.from("planungszyklen").select("zeitraum_ende")
        .eq("betrieb_id", betrieb).order("zeitraum_ende", { ascending: false }).limit(1);
      if (!alive) return;
      const lastEnde = data?.[0]?.zeitraum_ende as string | undefined;
      const start = lastEnde ? addDays(lastEnde, 1) : isoDay(now);
      setHasPrevCycle(!!lastEnde);
      setVon(start);
      setBis(endOfMonth(start));
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [visible, betrieb]);

  // Overlap check: concrete shifts already in the chosen range.
  useEffect(() => {
    if (!visible || !betrieb || !von || !isoRe.test(bis) || von > bis) { setPeriodUsed(false); return; }
    let alive = true;
    (async () => {
      const { data } = await supabase.from("schicht_instanzen").select("id").eq("betrieb_id", betrieb)
        .gte("datum", von).lte("datum", bis).limit(1);
      if (!alive) return;
      setPeriodUsed((data?.length ?? 0) > 0);
    })();
    return () => { alive = false; };
  }, [visible, betrieb, von, bis]);

  // Deadline only applies once there's a prior cycle: 7 days before the period starts.
  const deadlineDate = hasPrevCycle && von ? new Date(addDays(von, -7) + "T23:59:59") : null;
  const deadlinePassed = deadlineDate ? now.getTime() > deadlineDate.getTime() : false;
  const fmtDeadline = deadlineDate ? deadlineDate.toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "";

  const sendReminder = async () => {
    setSending(true);
    const { error } = await supabase.rpc("ankuendigung_erstellen", {
      p_betrieb_id: betrieb,
      p_typ: "allgemein",
      p_titel: t("manager.prefReminderTitle"),
      p_text: t("manager.prefReminderBody"),
      p_prioritaet: "dringend",
    });
    setSending(false);
    notify(error ? t("manager.prefReminderFailed") : t("manager.prefReminderSent"));
  };

  // Create a real planning cycle (planungszyklen) with status 'offen'. The solver
  // method (quick/moderate/optimal) is chosen server-side by team size — see
  // solver_methode_fuer_betrieb() (returned as solver_methode). No prior cycle →
  // no deadline (null); the RPC falls back to the period start.
  // If the business resolves to the 'quick' method, we kick off the solver edge
  // function right away; otherwise the cycle just waits (moderate/optimal are run
  // separately, e.g. after the preferences deadline).
  const doGenerate = async () => {
    setSending(true);
    const { data, error } = await supabase.rpc("planungszyklus_erstellen", {
      p_betrieb_id: betrieb,
      p_start: von,
      p_ende: bis,
      p_deadline: deadlineDate ? deadlineDate.toISOString() : null,
    });

    // For the 'quick' method we kick off the solver right away; otherwise the cycle
    // just waits (moderate/optimal run separately, e.g. after the preferences deadline).
    const zyklusId = (data as any)?.id as string | undefined;
    const methode = (data as any)?.solver_methode as string | undefined;
    if (!error && methode === "quick" && zyklusId) {
      await supabase.functions.invoke("plan-generieren", { body: { planungszyklus_id: zyklusId } });
    }

    setSending(false);
    setConfirmOpen(false);
    onClose();
    // Refresh the manager so the new "being generated" / "check shifts" cards appear.
    reload?.();
  };

  // Validate, then open the in-app confirmation popup (same pattern as role deletion).
  const generate = () => {
    if (loading || !von || !isoRe.test(bis) || von >= bis) { notify(t("manager.csRangeInvalid")); return; }
    setConfirmOpen(true);
  };

  return (
    <>
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border, maxHeight: "88%" }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHead}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("manager.createShifts")}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: 4 }} showsVerticalScrollIndicator={false}>
          <View style={styles.timeRow}>
            {/* Start is fixed: the day after the last cycle (or today for the first). */}
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csRangeStart")}</Text>
              <View style={[styles.input, { justifyContent: "center", borderColor: theme.border, backgroundColor: theme.bg }]}>
                <Text style={{ color: theme.text, fontSize: 15, fontWeight: "600" }}>{loading ? "…" : von}</Text>
              </View>
              <Text style={[styles.hint, { color: theme.muted }]}>
                {t(hasPrevCycle ? "manager.csStartFromLast" : "manager.csStartFromToday")}
              </Text>
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csRangeEnd")}</Text>
              <TextInput style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                value={bis} onChangeText={setBis} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} maxLength={10} keyboardType="numbers-and-punctuation" />
            </View>
          </View>

          {/* Preferences deadline — only meaningful once a prior cycle exists */}
          {hasPrevCycle && (
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csDeadline")}</Text>
              <View style={styles.deadlineRow}>
                <CalendarClock color={theme.muted} size={18} />
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 15 }}>{fmtDeadline}</Text>
              </View>
              <Text style={[styles.hint, { color: theme.muted }]}>{t("manager.csDeadlineHint")}</Text>
            </View>
          )}

          {/* Duplicate-period warning — shifts already exist in this range */}
          {periodUsed && (
            <View style={[styles.deadlineBanner, { backgroundColor: RED + "1F", borderColor: RED }]}>
              <TriangleAlert color={RED} size={18} />
              <Text style={{ color: RED, fontWeight: "700", fontSize: 13, flex: 1 }}>{t("manager.csDupBody")}</Text>
            </View>
          )}

          {/* Warning / all-clear banner — only when a deadline is in play */}
          {hasPrevCycle && (
            <View style={[styles.deadlineBanner, { backgroundColor: (deadlinePassed ? GREEN : AMBER) + "1F", borderColor: deadlinePassed ? GREEN : AMBER }]}>
              <TriangleAlert color={deadlinePassed ? GREEN : AMBER} size={18} />
              <Text style={{ color: deadlinePassed ? GREEN : AMBER, fontWeight: "700", fontSize: 13, flex: 1 }}>
                {t(deadlinePassed ? "manager.csDeadlineOk" : "manager.csDeadlineWarn")}
              </Text>
            </View>
          )}

          {/* Reminder button sits ABOVE the generate button — only with a deadline */}
          {hasPrevCycle && (
            <Pressable style={[styles.reminderBtn, { borderColor: AMBER }]} onPress={sendReminder} disabled={sending}>
              <Megaphone color={AMBER} size={18} />
              <Text style={{ color: AMBER, fontWeight: "700", fontSize: 14, flex: 1, textAlign: "center" }}>
                {sending ? "…" : t("manager.prefReminder")}
              </Text>
            </Pressable>
          )}

          <Pressable style={[styles.submit, { backgroundColor: theme.accent }]} onPress={generate}>
            <Text style={[styles.submitText, { color: theme.accentText }]}>{t("manager.csGenerate")}</Text>
          </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>

      {/* In-app confirmation popup — same pattern as the role-deletion confirm */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHead}>
              <Text style={[styles.sheetTitle, { color: theme.text }]}>{t("manager.csConfirmTitle")}</Text>
              <Pressable onPress={() => setConfirmOpen(false)} hitSlop={10}><X color={theme.muted} size={22} /></Pressable>
            </View>
            <Text style={{ color: theme.text, fontSize: 15, lineHeight: 21, marginBottom: 16 }}>
              {t("manager.csConfirmBody")}{"\n\n"}{t("manager.csMethodNotify")}
            </Text>
            {periodUsed && (
              <View style={[styles.deadlineBanner, { backgroundColor: RED + "1F", borderColor: RED, marginTop: 0, marginBottom: 16 }]}>
                <TriangleAlert color={RED} size={18} />
                <Text style={{ color: RED, fontWeight: "700", fontSize: 13, flex: 1 }}>{t("manager.csDupBody")}</Text>
              </View>
            )}
            <View style={styles.btnRow}>
              <Pressable style={[styles.smallBtn, { borderColor: theme.border }]} onPress={() => setConfirmOpen(false)} disabled={sending}>
                <Text style={{ color: theme.text, fontWeight: "700", fontSize: 14 }}>{t("manager.cancel")}</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, { backgroundColor: theme.accent, borderColor: theme.accent }]} onPress={doGenerate} disabled={sending}>
                <Text style={{ color: theme.accentText, fontWeight: "700", fontSize: 14 }}>{sending ? "…" : t("manager.csConfirmGenerate")}</Text>
              </Pressable>
            </View>
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
  refreshBtn: { marginLeft: "auto", padding: 4 },
  title: { fontSize: 28, fontWeight: "700" },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },

  tabs: { flexDirection: "row", borderWidth: 1.5, borderRadius: 999, padding: 3, gap: 3 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 999 },

  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 12 },
  cardHead: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 13 },
  rowIcon: { flexDirection: "row", alignItems: "center", gap: 10 },
  eligible: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 2 },

  reqRow: { borderWidth: 1.5, borderRadius: 12, padding: 12, gap: 8 },
  decisionBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, paddingVertical: 12 },
  decisionBadgeText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  changeBtn: { alignSelf: "center", paddingVertical: 4, paddingHorizontal: 8 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 2 },
  smallBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderRadius: 999, paddingVertical: 9 },

  foldHead: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: 12, padding: 14 },

  listRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  statusPill: { borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  input: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15 },
  counter: { fontSize: 11, textAlign: "right", marginTop: -4 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },

  submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  submitText: { fontSize: 15, fontWeight: "700" },

  detailRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 11 },

  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  sheet: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 4 },
  sheetHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  sheetTitle: { fontSize: 18, fontWeight: "700" },

  // Shifts section
  bigCreate: { position: "absolute", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 16, paddingVertical: 18, paddingHorizontal: 32, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  bigCreateText: { fontSize: 19, fontWeight: "800" },
  tplHeadRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 },
  addTplBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 },
  dayLabel: { fontSize: 14, fontWeight: "800", marginTop: 6 },
  tplRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  tplTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inactivePill: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", borderWidth: 1, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 },
  wdRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  wdChip: { width: 40, height: 36, borderWidth: 1.5, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  timeRow: { flexDirection: "row", gap: 12 },
  roleDropdownHead: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  roleDropdownBody: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, marginTop: 6 },
  roleReqRow: { flexDirection: "row", alignItems: "center", gap: 10, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  stepBtn: { width: 34, height: 34, borderWidth: 1.5, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  deleteBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, marginTop: 2 },
  roleChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  roleChip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 12 },
  roleAddRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  roleAddBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14 },
  deadlineRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  deadlineBanner: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 12, padding: 12, marginTop: 8 },
  reminderBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1.5, borderRadius: 999, paddingVertical: 12, paddingHorizontal: 16, marginTop: 8 },
});
