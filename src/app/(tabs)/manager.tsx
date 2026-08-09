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
  Briefcase, Check, ChevronDown, ChevronRight, Megaphone, RefreshCw, TriangleAlert, Users, X,
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { RefreshScrollView } from "../../components/RefreshScrollView";

const GREEN = "#16a34a";
const RED = "#C1442D";
const AMBER = "#d97706";

type Section = "employees" | "business";
type Status = "requested" | "approved" | "denied";

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

export default function ManagerScreen() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const betrieb = activeMitarbeiter?.betrieb_id ?? null;

  const [section, setSection] = useState<Section>("employees");
  const [loading, setLoading] = useState(true);

  const [team, setTeam] = useState<Mitarbeiter[]>([]);
  const [vacations, setVacations] = useState<Urlaub[]>([]);
  const [roleNames, setRoleNames] = useState<Record<string, string[]>>({}); // mitarbeiter_id -> role names
  const [hoursWorked, setHoursWorked] = useState<Record<string, number>>({}); // this year
  const [shiftsWorked, setShiftsWorked] = useState<Record<string, number>>({});
  const [einstellungen, setEinstellungen] = useState<Einstellungen | null>(null);
  const [emergencies, setEmergencies] = useState<Emergency[]>([]);

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(lang, { day: "numeric", month: "short", year: "numeric" });

  const load = useCallback(async () => {
    if (!betrieb) return;
    setLoading(true);
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const [mitarb, roles, roleLinks, urlaub, settingsRow, zuweis, instanzen, notf, vorlagen] = await Promise.all([
      supabase.from("mitarbeiter")
        .select("id, vorname, nachname, email, telefon, rolle_typ, vertrag_typ, soll_stunden, ueberstunden_saldo, status, urlaubsanspruch_tage")
        .eq("betrieb_id", betrieb).order("nachname"),
      supabase.from("rollen").select("id, name").eq("betrieb_id", betrieb),
      supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", betrieb),
      supabase.from("urlaub").select("id, mitarbeiter_id, von, bis, status, kommentar, begruendung")
        .eq("betrieb_id", betrieb).order("von", { ascending: false }),
      supabase.from("betriebs_einstellungen")
        .select("tausch_freigabe_erforderlich, sprache_standard, verfuegbarkeit_deadline_tag, notfall_stunden_anrechnen, mitarbeiter_sehen_andere_schichten, mitarbeiter_sehen_andere_mitarbeiter")
        .eq("betrieb_id", betrieb).single(),
      supabase.from("schicht_zuweisungen").select("mitarbeiter_id, schicht_instanz_id, attendet").eq("betrieb_id", betrieb),
      supabase.from("schicht_instanzen").select("id, start_zeit, end_zeit, datum, schicht_vorlage_id").eq("betrieb_id", betrieb).gte("datum", yearStart),
      supabase.from("notfaelle").select("id, status, melder_id, schicht_instanz_id, rolle_id, grund, erstellt_am")
        .eq("betrieb_id", betrieb).in("status", ["gemeldet", "vertretung_gesucht"]).order("erstellt_am", { ascending: true }),
      supabase.from("schicht_vorlagen").select("id, bezeichnung").eq("betrieb_id", betrieb),
    ]);

    setTeam((mitarb.data ?? []) as Mitarbeiter[]);
    setVacations((urlaub.data ?? []) as Urlaub[]);

    const roleById = new Map((roles.data ?? []).map((r: any) => [r.id, r.name]));
    const rn: Record<string, string[]> = {};
    (roleLinks.data ?? []).forEach((l: any) => {
      const name = roleById.get(l.rolle_id);
      if (!name) return;
      (rn[l.mitarbeiter_id] ??= []).push(name);
    });
    setRoleNames(rn);

    const instById = new Map((instanzen.data ?? []).map((i: any) => [i.id, i]));
    // Emergency (non-attended) shifts only count toward the caller's hours when
    // the business chose to credit them.
    const countEmergency = (settingsRow.data as any)?.notfall_stunden_anrechnen ?? false;
    const hrs: Record<string, number> = {};
    const cnt: Record<string, number> = {};
    (zuweis.data ?? []).forEach((z: any) => {
      const inst = instById.get(z.schicht_instanz_id);
      if (!inst) return; // outside this year / not loaded
      if (z.attendet === false && !countEmergency) return; // skip called-out shift
      hrs[z.mitarbeiter_id] = (hrs[z.mitarbeiter_id] ?? 0) + shiftHours(inst.start_zeit, inst.end_zeit);
      cnt[z.mitarbeiter_id] = (cnt[z.mitarbeiter_id] ?? 0) + 1;
    });
    setHoursWorked(hrs);
    setShiftsWorked(cnt);

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
          {(["employees", "business"] as Section[]).map((s) => {
            const active = section === s;
            return (
              <Pressable key={s} onPress={() => setSection(s)} style={[styles.tabBtn, active && { backgroundColor: theme.accent }]}>
                <Text style={{ color: active ? theme.accentText : theme.text, fontWeight: "700", fontSize: 13 }}>
                  {t(s === "employees" ? "manager.tabEmployees" : "manager.tabBusiness")}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
        ) : section === "employees" ? (
          <EmployeesSection
            theme={theme} t={t} lang={lang} team={team} vacations={vacations} roleNames={roleNames}
            betrieb={betrieb!}
            hoursWorked={hoursWorked} shiftsWorked={shiftsWorked} emergencies={emergencies}
            reload={load} fmtDate={fmtDate}
          />
        ) : (
          <BusinessSection
            theme={theme} t={t} betrieb={betrieb!}
            einstellungen={einstellungen} setEinstellungen={setEinstellungen}
          />
        )}
      </RefreshScrollView>
    </SafeAreaView>
  );
}

// =====================================================================
// Employees
// =====================================================================
function EmployeesSection({ theme, t, lang, team, vacations, roleNames, betrieb, hoursWorked, shiftsWorked, emergencies, reload, fmtDate }: any) {
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
                <DetailRow theme={theme} label={t("manager.role")} value={(roleNames[detail.id] ?? []).join(", ") || t(detail.rolle_typ === "chef" ? "manager.chef" : "manager.employee")} />
                {detail.email ? <DetailRow theme={theme} label={t("manager.email")} value={detail.email} /> : null}
                {detail.telefon ? <DetailRow theme={theme} label={t("manager.phone")} value={detail.telefon} /> : null}
                {detail.vertrag_typ ? <DetailRow theme={theme} label={t("manager.contract")} value={detail.vertrag_typ} /> : null}
                {detail.soll_stunden != null ? <DetailRow theme={theme} label={t("manager.targetHours")} value={`${detail.soll_stunden} ${t("manager.hours")}`} /> : null}
                <DetailRow theme={theme} label={t("manager.overtimeBalance")} value={`${detail.ueberstunden_saldo > 0 ? "+" : ""}${detail.ueberstunden_saldo} ${t("manager.hours")}`} />
                <DetailRow theme={theme} label={t("manager.hoursWorked")} value={`${(hoursWorked[detail.id] ?? 0).toFixed(1)} ${t("manager.hours")}`} />
                <DetailRow theme={theme} label={t("manager.shiftsWorked")} value={String(shiftsWorked[detail.id] ?? 0)} />
                <DetailRow theme={theme} label={t("manager.vacationTaken")}
                  value={`${vacationTaken(vacations, detail.id)} / ${detail.urlaubsanspruch_tage} ${t("manager.days")}`} />
                <DetailRow theme={theme} label={t("manager.status")} value={detail.status} last />
              </>
            )}
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

// =====================================================================
// Business
// =====================================================================
function BusinessSection({ theme, t, betrieb, einstellungen, setEinstellungen }: any) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const setSetting = (patch: Partial<Einstellungen>) =>
    setEinstellungen((prev: Einstellungen | null) => ({ ...(prev ?? { tausch_freigabe_erforderlich: true, sprache_standard: "de", verfuegbarkeit_deadline_tag: 5, notfall_stunden_anrechnen: false, mitarbeiter_sehen_andere_schichten: false, mitarbeiter_sehen_andere_mitarbeiter: false }), ...patch }));

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
});
