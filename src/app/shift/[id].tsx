// Real shift detail: loads via schicht_ansehen RPC.
// Staff see a read-only view (times, comment, and — if the business settings
// allow — the roster with each coworker's role). A chef sees everything and can
// edit the shift: date/time, comment, and the roster (assign people + roles,
// change roles, remove people).
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Plus, Repeat, Trash2, TriangleAlert, Users, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { DateTimeField } from "../../components/DateTimeField";
import { HoldButton } from "../../components/HoldButton";

const RED = "#C1442D";

type Participant = {
  name: string;
  mitarbeiter_id: string;
  zuweisung_id: string;
  rolle_id: string | null;
  role_name: string | null;
  attendet: boolean;
  is_me: boolean;
};
type ClaimInfo = {
  kind: "posting" | "emergency" | "swap";
  benachrichtigung_id: string;
  roles: { rolle_id: string; name: string | null }[];
};
type ShiftDetailData = {
  id: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  label: string | null;
  kommentar: string | null;
  mine: boolean;
  can_edit: boolean;
  canceled: boolean;
  open: boolean;
  swap_wanted: boolean;
  claim: ClaimInfo | null;
  understaffed?: boolean;
  bedarf?: { rolle_id: string; role_name: string | null; benoetigt: number; besetzt: number }[] | null;
  participants: Participant[];
};
type TeamMember = { id: string; vorname: string; nachname: string | null };

const pad2 = (n: number) => String(n).padStart(2, "0");
const dateToStr = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const timeToStr = (d: Date) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
const parseTime = (s: string) => { const d = new Date(); const [h, m] = s.split(":").map(Number); d.setHours(h || 0, m || 0, 0, 0); return d; };

// Full-screen route (deep links, notifications). Delegates to the shared view.
export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ShiftDetailView id={id} />;
}

// Shared shift detail. Rendered full-screen by the route above, or embedded in a
// popup (pass `onClose`) — e.g. when tapping a shift in the calendar.
export function ShiftDetailView({ id, onClose }: { id: string; onClose?: () => void }) {
  const embedded = !!onClose;
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [shift, setShift] = useState<ShiftDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // employee "hand over shift" (Schichtabgabe) — broadcast the shift to coworkers
  const [swapOpen, setSwapOpen] = useState(false);
  const [alreadyOffered, setAlreadyOffered] = useState(false);
  const [offering, setOffering] = useState(false);
  const [claiming, setClaiming] = useState(false);

  // employee "can't attend" (Notfall melden) — notify the manager to find cover
  const [emOpen, setEmOpen] = useState(false);
  const [emReason, setEmReason] = useState("");
  const [emSending, setEmSending] = useState(false);

  // chef edit buffer (date/time/comment)
  const [dateVal, setDateVal] = useState<Date>(new Date());
  const [startVal, setStartVal] = useState<Date>(new Date());
  const [endVal, setEndVal] = useState<Date>(new Date());
  const [kommentar, setKommentar] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rosterBusy, setRosterBusy] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // chef-only: team + roles for editing the roster
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [rollen, setRollen] = useState<{ id: string; name: string }[]>([]);
  const [roleIdsByMember, setRoleIdsByMember] = useState<Record<string, string[]>>({});

  // Edit UI requires BOTH the server verdict and the local chef role — employees
  // are strictly read-only.
  const canEdit = !!shift?.can_edit && isChef;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const { data } = await supabase.rpc("schicht_ansehen", { p_instanz_id: id, p_mitarbeiter_id: activeMitarbeiter?.id ?? null });
    const s = (data as ShiftDetailData | null) ?? null;
    setShift(s);
    setNotFound(!s);
    if (s) {
      setDateVal(new Date(s.datum + "T00:00:00"));
      setStartVal(parseTime(s.start_zeit));
      setEndVal(parseTime(s.end_zeit));
      setKommentar(s.kommentar ?? "");
      // is my shift already up for grabs?
      if (activeMitarbeiter && s.participants.some((p) => p.is_me)) {
        const { data: offer } = await supabase
          .from("benachrichtigungen")
          .select("id")
          .eq("typ", "schicht_tausch")
          .is("geloescht_am", null)
          .contains("inhalt", { schicht_instanz_id: id, anbieter_id: activeMitarbeiter.id })
          .limit(1);
        setAlreadyOffered((offer?.length ?? 0) > 0);
      } else {
        setAlreadyOffered(false);
      }
    }
    setLoading(false);
  }, [id, activeMitarbeiter]);

  useEffect(() => { load(); }, [load]);

  // Once we know this is a chef-editable shift, load the team + roles so the chef
  // can add people and pick roles. Keyed off the shift so we have the betrieb.
  useEffect(() => {
    if (!canEdit) return;
    let cancelled = false;
    (async () => {
      // derive betrieb from any assignment we already have; otherwise fetch by instance
      const { data: inst } = await supabase
        .from("schicht_instanzen").select("betrieb_id").eq("id", id).single();
      const betrieb = inst?.betrieb_id;
      if (!betrieb || cancelled) return;
      const [mitarb, roles, roleLinks] = await Promise.all([
        supabase.from("mitarbeiter").select("id, vorname, nachname").eq("betrieb_id", betrieb).order("nachname"),
        supabase.from("rollen").select("id, name").eq("betrieb_id", betrieb).eq("aktiv", true),
        supabase.from("mitarbeiter_rollen").select("mitarbeiter_id, rolle_id").eq("betrieb_id", betrieb),
      ]);
      if (cancelled) return;
      setTeam((mitarb.data ?? []) as TeamMember[]);
      setRollen((roles.data ?? []) as { id: string; name: string }[]);
      const rid: Record<string, string[]> = {};
      (roleLinks.data ?? []).forEach((l: any) => { (rid[l.mitarbeiter_id] ??= []).push(l.rolle_id); });
      setRoleIdsByMember(rid);
    })();
    return () => { cancelled = true; };
  }, [canEdit, id]);

  const timesValid = timeToStr(startVal) !== timeToStr(endVal);

  const saveDetails = async () => {
    if (!shift) return;
    setSaving(true);
    await supabase.from("schicht_instanzen").update({
      datum: dateToStr(dateVal),
      start_zeit: timeToStr(startVal),
      end_zeit: timeToStr(endVal),
      kommentar: kommentar.trim() || null,
    }).eq("id", shift.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    load();
  };

  // Recompute the per-role staffing counts from the current participants so the
  // "Staffing" card stays in sync after an optimistic roster edit.
  const withRecomputedBedarf = (s: ShiftDetailData): ShiftDetailData => {
    if (!s.bedarf) return s;
    const bedarf = s.bedarf.map((b) => ({
      ...b,
      besetzt: s.participants.filter((p) => p.attendet && p.rolle_id === b.rolle_id).length,
    }));
    return { ...s, bedarf, understaffed: bedarf.some((b) => b.besetzt < b.benoetigt) };
  };

  // The assignment trigger (pruefe_zuweisung_constraints) raises German
  // exceptions with a stable code/keyword we can map to a readable reason.
  const assignFailureReason = (msg?: string): string => {
    const m = msg ?? "";
    if (m.includes("HC-1") || m.includes("Urlaub")) return t("calendar.assignFailedVacation");
    if (m.includes("HC-2") || m.includes("ueberlappende")) return t("calendar.assignFailedOverlap");
    if (m.includes("HC-4") || m.includes("Ruhezeit")) return t("calendar.assignFailedRest");
    if (m.includes("Tageshoechstarbeitszeit")) return t("calendar.assignFailedMaxDay");
    if (m.includes("Wochenhoechstarbeitszeit") || m.includes("HC-5") || m.includes("max_stunden_hart")) return t("calendar.assignFailedMaxWeek");
    if (m.includes("HC-3") || m.includes("qualifiziert")) return t("calendar.assignFailedRole");
    if (m.includes("deaktiviert")) return t("calendar.assignFailedDisabled");
    return t("calendar.assignFailed");
  };

  // Assign / remove roster members. The RPC persists immediately, but we update
  // the popup's local state in place (no full reload) so the view doesn't flash
  // back to a spinner while the chef keeps editing. Any failure surfaces as an
  // inline error banner and leaves the roster untouched.
  const assign = async (mid: string, rid: string) => {
    if (!shift || rosterBusy) return;
    setRosterBusy(true);
    const { error } = await supabase.rpc("schicht_zuweisen", { p_instanz_id: shift.id, p_mitarbeiter_id: mid, p_rolle_id: rid });
    setRosterBusy(false);
    if (error) {
      setRosterError(assignFailureReason(error.message));
      return;
    }
    setRosterError(null);
    setShift((prev) => {
      if (!prev) return prev;
      const existing = prev.participants.find((p) => p.mitarbeiter_id === mid);
      let participants: Participant[];
      if (existing) {
        // role change on someone already on the shift
        participants = prev.participants.map((p) =>
          p.mitarbeiter_id === mid ? { ...p, rolle_id: rid, role_name: roleName(rid) } : p);
      } else {
        const m = team.find((tm) => tm.id === mid);
        participants = [...prev.participants, {
          name: m ? `${m.vorname}${m.nachname ? " " + m.nachname : ""}` : "",
          mitarbeiter_id: mid,
          zuweisung_id: `local-${mid}`,
          rolle_id: rid,
          role_name: roleName(rid),
          attendet: true,
          is_me: false,
        }];
      }
      return withRecomputedBedarf({ ...prev, participants });
    });
  };
  const unassign = async (mid: string) => {
    if (!shift || rosterBusy) return;
    setRosterBusy(true);
    const { error } = await supabase.rpc("schicht_zuweisung_loeschen", { p_instanz_id: shift.id, p_mitarbeiter_id: mid });
    setRosterBusy(false);
    if (error) {
      setRosterError(t("calendar.removeFailed"));
      return;
    }
    setRosterError(null);
    setShift((prev) => prev
      ? withRecomputedBedarf({ ...prev, participants: prev.participants.filter((p) => p.mitarbeiter_id !== mid) })
      : prev);
  };

  const offerSwap = async () => {
    if (!shift || offering) return;
    setOffering(true);
    const { error } = await supabase.rpc("tausch_ausschreiben", { p_instanz_id: shift.id });
    setOffering(false);
    setSwapOpen(false);
    if (error) { Alert.alert(t("shiftSwap.offerFailed")); return; }
    setAlreadyOffered(true);
    Alert.alert(t("shiftSwap.offeredTitle"), t("shiftSwap.offeredBody"));
    load();
  };

  // Employee reports they can't attend this shift (same as the scheduling tab's
  // emergency flow) — the manager is notified to arrange cover.
  const reportEmergency = async () => {
    const zid = shift?.participants.find((p) => p.is_me)?.zuweisung_id;
    if (!zid || emSending) return;
    setEmSending(true);
    const { error } = await supabase.rpc("notfall_melden", { p_zuweisung_id: zid, p_grund: emReason.trim() || null, p_mitarbeiter_id: activeMitarbeiter?.id ?? null });
    setEmSending(false);
    setEmOpen(false);
    if (error) { Alert.alert(t("scheduling.emReportFailed")); return; }
    setEmReason("");
    Alert.alert(t("scheduling.emReportedTitle"), t("scheduling.emReportedBody"));
    load();
  };

  // Employee claims an open shift (open posting slot or emergency replacement),
  // mirroring the accept flow in the messages tab.
  const claimShift = async (rolleId?: string) => {
    if (!shift?.claim || claiming) return;
    setClaiming(true);
    const c = shift.claim;
    let data: any, error: any;
    if (c.kind === "posting") {
      ({ data, error } = await supabase.rpc("schicht_ausschreibung_annehmen", {
        p_benachrichtigung_id: c.benachrichtigung_id,
        p_rolle_id: rolleId ?? c.roles[0]?.rolle_id ?? null,
        p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
      }));
    } else if (c.kind === "swap") {
      ({ data, error } = await supabase.rpc("schicht_tausch_uebernehmen", {
        p_benachrichtigung_id: c.benachrichtigung_id,
        p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
      }));
    } else {
      ({ data, error } = await supabase.rpc("notfall_vertretung_uebernehmen", {
        p_benachrichtigung_id: c.benachrichtigung_id,
        p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
      }));
    }
    setClaiming(false);
    // Map result codes to alerts, reusing the same copy as the messages tab.
    const fail = c.kind === "posting" ? "messages.osClaimFailed" : c.kind === "swap" ? "shiftSwap.takeFailed" : "messages.emTakeFailed";
    if (error) { Alert.alert(t(fail)); load(); return; }
    const code = data as string;
    if (code === "angenommen" || code === "besetzt") {
      Alert.alert(
        t(c.kind === "posting" ? "messages.osClaimedTitle" : c.kind === "swap" ? "shiftSwap.tookTitle" : "messages.emTookTitle"),
        t(c.kind === "posting" ? "messages.osClaimedBody" : c.kind === "swap" ? "shiftSwap.tookBody" : "messages.emTookBody"),
      );
    } else if (code === "voll") Alert.alert(t("messages.osFull"));
    else if (code === "bereits_besetzt") Alert.alert(t(c.kind === "swap" ? "shiftSwap.alreadyTaken" : "messages.emAlreadyTaken"));
    else if (code === "schon_zugewiesen") Alert.alert(t(c.kind === "posting" ? "messages.osAlreadyOn" : c.kind === "swap" ? "shiftSwap.alreadyOn" : "messages.emAlreadyOnShift"));
    else if (code === "nicht_qualifiziert") Alert.alert(t(c.kind === "posting" ? "messages.osNotQualified" : c.kind === "swap" ? "shiftSwap.notQualified" : "messages.emNotQualified"));
    else Alert.alert(t(fail));
    load();
  };

  // Chef: delete this single shift instance (cascades its assignments).
  const deleteShift = async () => {
    if (!shift || deleting) return;
    setDeleting(true);
    const { error } = await supabase.from("schicht_instanzen").delete().eq("id", shift.id);
    setDeleting(false);
    if (error) { Alert.alert(t("calendar.deleteShiftFailed")); return; }
    if (onClose) onClose(); else router.back();
  };
  const confirmDelete = () => {
    Alert.alert(t("calendar.deleteShiftTitle"), t("calendar.deleteShiftBody"), [
      { text: t("calendar.cancel"), style: "cancel" },
      { text: t("calendar.deleteShiftGo"), style: "destructive", onPress: deleteShift },
    ]);
  };

  const roleName = (rid: string | null) => rollen.find((r) => r.id === rid)?.name ?? null;
  // employees (not the chef) may hand over a shift they're personally on
  const myPart = shift?.participants.find((p) => p.is_me);
  const canOfferSwap = !!myPart && myPart.attendet && !isChef;
  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString(lang, { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Members a chef can still add: have at least one role and aren't already on the shift.
  const assignedIds = useMemo(() => new Set(shift?.participants.map((p) => p.mitarbeiter_id) ?? []), [shift]);
  const addable = useMemo(
    () => team.filter((m) => !assignedIds.has(m.id) && (roleIdsByMember[m.id]?.length ?? 0) > 0),
    [team, assignedIds, roleIdsByMember]
  );

  const Root: any = embedded ? View : SafeAreaView;
  const rootProps: any = embedded
    ? { style: [styles.embeddedRoot, { backgroundColor: theme.bg }] }
    : { style: [styles.screen, { backgroundColor: theme.bg }], edges: ["top"] };
  return (
    <Root {...rootProps}>
      {!embedded && <ScreenGradient />}
      <View style={[styles.topbar, { borderBottomColor: theme.border }]}>
        <Pressable onPress={onClose ?? (() => router.back())} hitSlop={10} style={styles.navBtn}>
          {embedded ? <X color={theme.text} size={24} /> : <ChevronLeft color={theme.text} size={26} />}
        </Pressable>
        <Text style={[styles.topTitle, { color: theme.text }]} numberOfLines={1}>
          {shift?.label || t("calendar.shift")}
        </Text>
        <View style={styles.navBtn} />
      </View>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginTop: 40 }} />
      ) : notFound || !shift ? (
        <View style={styles.center}><Text style={{ color: theme.muted }}>{t("calendar.shiftNotFound")}</Text></View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* ---------- When / details ---------- */}
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("calendar.details")}</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {canEdit ? (
              <>
                <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csDate")}</Text>
                <DateTimeField mode="date" value={dateVal} onChange={setDateVal} accent={theme.accent} textColor={theme.text} locale={lang} />
                <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csStart")}</Text>
                    <DateTimeField mode="time" value={startVal} onChange={setStartVal} accent={theme.accent} textColor={theme.text} locale={lang} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("manager.csEnd")}</Text>
                    <DateTimeField mode="time" value={endVal} onChange={setEndVal} accent={theme.accent} textColor={theme.text} locale={lang} />
                  </View>
                </View>
                <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 4 }]}>{t("manager.csComment")}</Text>
                <TextInput
                  style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg }]}
                  placeholder={t("manager.csCommentPlaceholder")} placeholderTextColor={theme.muted}
                  value={kommentar} onChangeText={setKommentar} multiline maxLength={140}
                />
                <Pressable
                  style={[styles.submit, { backgroundColor: timesValid ? theme.accent : theme.border, marginTop: 12 }]}
                  onPress={saveDetails} disabled={!timesValid || saving}
                >
                  <Text style={[styles.submitText, { color: timesValid ? theme.accentText : theme.muted }]}>
                    {saving ? "…" : saved ? `✓ ${t("manager.saved")}` : t("manager.save")}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.bigDate, { color: theme.text }]}>{fmtDate(shift.datum)}</Text>
                <Text style={[styles.time, { color: theme.muted }]}>{hhmm(shift.start_zeit)} – {hhmm(shift.end_zeit)}</Text>
                {shift.kommentar ? <Text style={{ color: theme.text, fontSize: 14, marginTop: 8 }}>“{shift.kommentar}”</Text> : null}
              </>
            )}
          </View>

          {/* ---------- Take this open shift (employee only) ---------- */}
          {!isChef && shift.claim ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("calendar.openToTake")}</Text>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}>
                <Text style={{ color: theme.text, fontSize: 14 }}>{t("calendar.takeShiftBlurb")}</Text>
                {shift.claim.kind === "posting" && shift.claim.roles.length > 1 ? (
                  <>
                    <Text style={[styles.fieldLabel, { color: theme.muted, marginTop: 6 }]}>{t("messages.osPickRole")}</Text>
                    <View style={styles.chipRow}>
                      {shift.claim.roles.map((r) => (
                        <Pressable key={r.rolle_id} onPress={() => claimShift(r.rolle_id)} disabled={claiming}
                          style={[styles.chip, { borderColor: theme.accent }]}>
                          <Text style={{ color: theme.accent, fontSize: 13, fontWeight: "700" }}>{r.name ?? t("calendar.shift")}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : (
                  <Pressable
                    style={[styles.swapBtn, { borderColor: theme.accent, backgroundColor: theme.accent }]}
                    onPress={() => claimShift()} disabled={claiming}
                  >
                    <Text style={{ color: theme.accentText, fontWeight: "700" }}>
                      {claiming ? "…" : t(shift.claim.kind === "emergency" ? "messages.emTakeOver" : shift.claim.kind === "swap" ? "shiftSwap.cardTitle" : "messages.osTake")}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : null}

          {/* ---------- Roster ---------- */}
          <Text style={[styles.sectionLabel, { color: theme.muted }]}>
            {canEdit ? t("calendar.roster") : t("calendar.coworkers")}
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {shift.participants.length === 0 ? (
              <Text style={{ color: theme.muted, fontSize: 13 }}>{t("manager.noParticipants")}</Text>
            ) : (
              shift.participants.map((p, idx) => {
                const eligible = canEdit ? (roleIdsByMember[p.mitarbeiter_id] ?? []) : [];
                return (
                  <View key={p.mitarbeiter_id} style={[styles.personRow, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                    <Users color={theme.muted} size={18} />
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={{ color: theme.text, fontWeight: p.is_me ? "800" : "600", textDecorationLine: p.attendet ? "none" : "line-through", opacity: p.attendet ? 1 : 0.6 }}>
                        {p.name}{p.is_me ? ` (${t("calendar.you")})` : ""}
                      </Text>
                      {/* chef: role chips when the member has >1 eligible role; else a plain label */}
                      {canEdit && eligible.length > 1 ? (
                        <View style={styles.chipRow}>
                          {eligible.map((rid) => {
                            const on = p.rolle_id === rid;
                            return (
                              <Pressable key={rid} onPress={() => assign(p.mitarbeiter_id, rid)} disabled={rosterBusy}
                                style={[styles.chip, { borderColor: theme.border }, on && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
                                <Text style={{ color: on ? theme.accentText : theme.text, fontSize: 12, fontWeight: "600" }}>{roleName(rid)}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                    </View>
                    {(!canEdit || eligible.length <= 1) && p.role_name ? (
                      <Text style={{ color: theme.muted, fontSize: 13 }}>{p.role_name}</Text>
                    ) : null}
                    {!p.attendet ? <Text style={{ color: RED, fontSize: 12, fontWeight: "700" }}>{t("manager.calledOut")}</Text> : null}
                    {canEdit ? (
                      <Pressable onPress={() => unassign(p.mitarbeiter_id)} disabled={rosterBusy} hitSlop={8} style={styles.removeBtn}>
                        <X color={theme.muted} size={18} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>

          {/* ---------- Staffing (chef only) — required vs. filled per role ---------- */}
          {canEdit && shift.bedarf && shift.bedarf.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("calendar.staffing")}</Text>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: shift.understaffed ? RED : theme.border }]}>
                {shift.understaffed ? (
                  <View style={[styles.swapRow, { marginBottom: 2 }]}>
                    <TriangleAlert color={RED} size={18} />
                    <Text style={{ color: RED, fontSize: 13, fontWeight: "700", flex: 1 }}>{t("calendar.understaffedBlurb")}</Text>
                  </View>
                ) : null}
                {shift.bedarf.map((b, idx) => {
                  const short = b.besetzt < b.benoetigt;
                  return (
                    <View key={b.rolle_id} style={[styles.personRow, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                      <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{b.role_name ?? t("calendar.shift")}</Text>
                      <Text style={{ color: short ? RED : theme.muted, fontWeight: "800", fontSize: 15 }}>{b.besetzt}/{b.benoetigt}</Text>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* ---------- Hand over shift (employee only) ---------- */}
          {canOfferSwap ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("shiftSwap.section")}</Text>
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                {alreadyOffered ? (
                  <View style={styles.swapRow}>
                    <Repeat color={theme.accent} size={18} />
                    <Text style={{ color: theme.muted, fontSize: 14, flex: 1 }}>{t("shiftSwap.pending")}</Text>
                  </View>
                ) : (
                  <>
                    <Text style={{ color: theme.text, fontSize: 14 }}>{t("shiftSwap.blurb")}</Text>
                    <Pressable
                      style={[styles.swapBtn, { borderColor: theme.accent }]}
                      onPress={() => setSwapOpen(true)}
                    >
                      <Repeat color={theme.accent} size={18} />
                      <Text style={{ color: theme.accent, fontWeight: "700" }}>{t("shiftSwap.offer")}</Text>
                    </Pressable>
                  </>
                )}
                {/* Can't attend → report an emergency (manager finds cover) */}
                <Pressable
                  style={[styles.swapBtn, { borderColor: RED }]}
                  onPress={() => setEmOpen(true)}
                >
                  <TriangleAlert color={RED} size={18} />
                  <Text style={{ color: RED, fontWeight: "700" }}>{t("scheduling.cannotAttend")}</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* ---------- Add person (chef only) ---------- */}
          {canEdit && addable.length > 0 ? (
            <>
              <Text style={[styles.sectionLabel, { color: theme.muted }]}>{t("calendar.addPerson")}</Text>
              {rosterError ? (
                <View style={[styles.swapRow, { marginBottom: 8 }]}>
                  <TriangleAlert color={RED} size={18} />
                  <Text style={{ color: RED, fontSize: 13, fontWeight: "700", flex: 1 }}>{rosterError}</Text>
                </View>
              ) : null}
              <View style={[styles.card, { backgroundColor: theme.surface, borderColor: rosterError ? RED : theme.border }]}>
                {addable.map((m, idx) => {
                  const firstRole = (roleIdsByMember[m.id] ?? [])[0];
                  return (
                    <Pressable key={m.id} onPress={() => firstRole && assign(m.id, firstRole)} disabled={rosterBusy}
                      style={[styles.personRow, idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
                      <Plus color={theme.accent} size={18} />
                      <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>{m.vorname} {m.nachname}</Text>
                      <Text style={{ color: theme.muted, fontSize: 13 }}>{roleName(firstRole ?? null)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* ---------- Delete this shift (chef only) ---------- */}
          {canEdit ? (
            <Pressable
              style={[styles.deleteShiftBtn, { borderColor: RED }]}
              onPress={confirmDelete} disabled={deleting}
            >
              <Trash2 color={RED} size={18} />
              <Text style={{ color: RED, fontWeight: "700" }}>{deleting ? "…" : t("calendar.deleteShift")}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      )}

      {/* Confirm handing over the shift — first eligible coworker to accept wins. */}
      <Modal visible={swapOpen} transparent animationType="fade" onRequestClose={() => setSwapOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setSwapOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <Pressable onPress={() => setSwapOpen(false)} hitSlop={10} style={styles.modalClose}>
              <X color={theme.muted} size={24} />
            </Pressable>
            <View style={{ gap: 10 }}>
              <View style={styles.swapRow}>
                <Repeat color={theme.accent} size={18} />
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>{t("shiftSwap.confirmTitle")}</Text>
              </View>
              {shift ? (
                <Text style={{ color: theme.muted, fontSize: 14 }}>
                  {fmtDate(shift.datum)} · {hhmm(shift.start_zeit)}–{hhmm(shift.end_zeit)}
                </Text>
              ) : null}
              <Text style={{ color: theme.text, fontSize: 14 }}>{t("shiftSwap.confirmBody")}</Text>
              <View style={{ marginTop: 6 }}>
                <HoldButton
                  label={t("shiftSwap.holdToOffer")}
                  onConfirm={offerSwap}
                  color={theme.accent}
                  fillColor="rgba(0,0,0,0.28)"
                  textColor={theme.accentText}
                  holdMs={1500}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm "can't attend" — reports an emergency so the manager finds cover. */}
      <Modal visible={emOpen} transparent animationType="fade" onRequestClose={() => setEmOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEmOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
            <Pressable onPress={() => setEmOpen(false)} hitSlop={10} style={styles.modalClose}>
              <X color={theme.muted} size={24} />
            </Pressable>
            <View style={{ gap: 10 }}>
              <View style={styles.swapRow}>
                <TriangleAlert color={RED} size={18} />
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: "700" }}>{t("scheduling.cannotAttend")}</Text>
              </View>
              {shift ? (
                <Text style={{ color: theme.muted, fontSize: 14 }}>
                  {fmtDate(shift.datum)} · {hhmm(shift.start_zeit)}–{hhmm(shift.end_zeit)}
                </Text>
              ) : null}
              <Text style={{ color: theme.text, fontSize: 14 }}>{t("scheduling.emConfirmBody")}</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.bg, minHeight: 64, textAlignVertical: "top" }]}
                placeholder={t("scheduling.reasonPlaceholder")} placeholderTextColor={theme.muted}
                value={emReason} onChangeText={setEmReason} multiline maxLength={200}
              />
              <View style={{ marginTop: 6 }}>
                <HoldButton
                  label={t("scheduling.emHoldToReport")}
                  onConfirm={reportEmergency}
                  color={RED}
                  fillColor="rgba(0,0,0,0.28)"
                  textColor="#fff"
                  holdMs={1500}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Root>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  embeddedRoot: { flex: 1, borderRadius: 20, overflow: "hidden" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  topbar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  navBtn: { padding: 4, width: 34 },
  topTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  content: { padding: 16, gap: 10, paddingBottom: 40 },

  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6 },
  sectionLabel: { fontSize: 13, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 10 },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  bigDate: { fontSize: 20, fontWeight: "700", textTransform: "capitalize" },
  time: { fontSize: 16, fontWeight: "600", marginTop: 2 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, minHeight: 44 },

  personRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 11 },
  removeBtn: { padding: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },

  submit: { borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  submitText: { fontSize: 15, fontWeight: "700" },

  swapRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  swapBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 999, paddingVertical: 12, marginTop: 8 },
  deleteShiftBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1.5, borderRadius: 999, paddingVertical: 14, marginTop: 8 },
  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", borderWidth: 1.5, borderRadius: 16, padding: 20, paddingTop: 40 },
  modalClose: { position: "absolute", top: 12, right: 12, zIndex: 1 },
});
