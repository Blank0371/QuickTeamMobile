// src/app/(tabs)/messages.tsx — broadcast feed (announcements, tasks, polls, docs)
import { router, useFocusEffect } from "expo-router";
import { CalendarPlus, Check, ChevronDown, FileText, Plus, Repeat, TriangleAlert, X } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator, Alert, Modal, Pressable, ScrollView,
    StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";
import { ScreenGradient } from "../../components/ScreenGradient";
import { RefreshScrollView } from "../../components/RefreshScrollView";
import { HoldButton } from "../../components/HoldButton";

type Task = { id: string; text: string; erledigt_von: string | null; erledigt_am: string | null };
type Opt = { id: string; text: string };
type Attach = { id: string; datei_name: string | null };
type Msg = {
  id: string; typ: string; titel: string | null; text: string | null;
  prioritaet: string;
  angeheftet: boolean; mehrfachauswahl: boolean; anonym: boolean;
  erstellt_am: string; autor_id: string | null;
  autorName: string;
  tasks: Task[];
  options: Opt[];
  voteCounts: Record<string, number>;
  myVotes: Set<string>;
  voters: Record<string, string[]>; // option_id → voter names (only for non-anonymous polls)
  attachments: Attach[];
  gelesen: boolean;
};

type EmergencyMsg = {
  id: string;
  erstellt_am: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  status: "gemeldet" | "vertretung_gesucht" | "besetzt" | "storniert";
  eligible: boolean;
  isMelder: boolean;
  takenByMe: boolean;
  takenByName: string;
  melderName: string;
};

type SwapCandidate = {
  zuweisung_id: string;
  schicht_instanz_id: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
};
type SwapMsg = {
  id: string;              // benachrichtigung id
  anfrageId: string;
  erstellt_am: string;
  datum: string;           // person1's offered shift
  start_zeit: string;
  end_zeit: string;
  status: "offen" | "angefragt" | "wartet_auf_chef" | string;
  isAnbieter: boolean;     // viewer offered this shift
  isUebernehmer: boolean;  // viewer is the responder
  anbieterName: string;
  uebernehmerName: string;
  prefDates: string[];
  eligible: boolean;       // viewer may respond (status offen)
  candidates: SwapCandidate[]; // viewer's eligible give-shifts
  gegen: { datum: string; start_zeit: string; end_zeit: string } | null; // responder's offered-back shift
};

type OpenRole = { rolle_id: string; name: string; benoetigt: number; besetzt: number; eligible: boolean };
type OpenShift = {
  id: string;
  erstellt_am: string;
  datum: string;
  start_zeit: string;
  end_zeit: string;
  kommentar: string;
  roles: OpenRole[];
  amAssigned: boolean;
};

export default function MessagesScreen() {
  const { user, activeMitarbeiter } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [emergencies, setEmergencies] = useState<EmergencyMsg[]>([]);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [swaps, setSwaps] = useState<SwapMsg[]>([]);
  const [openDetail, setOpenDetail] = useState<OpenShift | null>(null);
  const [swapDetail, setSwapDetail] = useState<SwapMsg | null>(null);
  const [emergencyDetail, setEmergencyDetail] = useState<EmergencyMsg | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "relevant">("newest");
  const [category, setCategory] = useState<"all" | "shifts" | "messages">("all");
  const [catOpen, setCatOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const PAGE = 10;
  const [visibleCount, setVisibleCount] = useState(PAGE);
  const [totalMsgCount, setTotalMsgCount] = useState(0);

  // Turn notfall_vertretung broadcasts into interactive take-over cards.
  const loadEmergencies = useCallback(async (emgRows: any[]) => {
    if (!activeMitarbeiter || emgRows.length === 0) { setEmergencies([]); return; }
    const notfallIds = emgRows.map((m: any) => m.inhalt?.notfall_id).filter(Boolean);

    const [notf, myRoles] = await Promise.all([
      supabase.from("notfaelle").select("id, status, melder_id, uebernehmer_id").in("id", notfallIds),
      supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", activeMitarbeiter.id),
    ]);
    const nById = new Map((notf.data ?? []).map((n: any) => [n.id, n]));
    const myRoleSet = new Set((myRoles.data ?? []).map((r: any) => r.rolle_id));
    // Names of the people referenced by these emergencies (reporter / taker only).
    const nameIds = Array.from(new Set(
      (notf.data ?? []).flatMap((n: any) => [n.melder_id, n.uebernehmer_id]).filter(Boolean)
    )) as string[];
    const { data: people } = nameIds.length > 0
      ? await supabase.rpc("mitarbeiter_namen", { p_betrieb_id: activeMitarbeiter.betrieb_id, p_ids: nameIds })
      : { data: [] as any[] };
    const nameOf = new Map<string, string>((people ?? []).map((p: any) => [p.id, p.name]));

    const built: EmergencyMsg[] = emgRows.map((m: any) => {
      const inhalt = m.inhalt ?? {};
      const n = nById.get(inhalt.notfall_id);
      const status = n?.status ?? "besetzt";
      const isMelder = n?.melder_id === activeMitarbeiter.id;
      return {
        id: m.id,
        erstellt_am: m.erstellt_am,
        datum: inhalt.datum ?? "",
        start_zeit: inhalt.start_zeit ?? "",
        end_zeit: inhalt.end_zeit ?? "",
        status,
        eligible: myRoleSet.has(inhalt.rolle_id) && !isMelder,
        isMelder,
        takenByMe: n?.uebernehmer_id === activeMitarbeiter.id,
        takenByName: n?.uebernehmer_id ? (nameOf.get(n.uebernehmer_id) ?? "") : "",
        melderName: n?.melder_id ? (nameOf.get(n.melder_id) ?? "") : "",
      };
    });
    setEmergencies(built);
  }, [activeMitarbeiter]);

  // Turn schicht_ausschreibung broadcasts into interactive open-shift cards.
  const loadOpenShifts = useCallback(async (rows: any[]) => {
    if (!activeMitarbeiter || rows.length === 0) { setOpenShifts([]); return; }
    const instIds = rows.map((m: any) => m.inhalt?.schicht_instanz_id).filter(Boolean);

    const [zuweis, myRoles] = await Promise.all([
      supabase.from("schicht_zuweisungen").select("mitarbeiter_id, rolle_id, schicht_instanz_id").in("schicht_instanz_id", instIds),
      supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", activeMitarbeiter.id),
    ]);
    const myRoleSet = new Set((myRoles.data ?? []).map((r: any) => r.rolle_id));
    const fillCount = new Map<string, number>(); // `${inst}|${rolle}` -> filled slots
    const mineOnInst = new Set<string>();
    (zuweis.data ?? []).forEach((z: any) => {
      const k = `${z.schicht_instanz_id}|${z.rolle_id}`;
      fillCount.set(k, (fillCount.get(k) ?? 0) + 1);
      if (z.mitarbeiter_id === activeMitarbeiter.id) mineOnInst.add(z.schicht_instanz_id);
    });

    const built: OpenShift[] = rows.map((m: any) => {
      const inhalt = m.inhalt ?? {};
      const inst = inhalt.schicht_instanz_id;
      const amAssigned = mineOnInst.has(inst);
      const roles: OpenRole[] = (inhalt.rollen ?? []).map((r: any) => {
        const besetzt = fillCount.get(`${inst}|${r.rolle_id}`) ?? 0;
        const benoetigt = r.benoetigt ?? 1;
        return {
          rolle_id: r.rolle_id, name: r.name, benoetigt, besetzt,
          eligible: myRoleSet.has(r.rolle_id) && besetzt < benoetigt && !amAssigned,
        };
      });
      return {
        id: m.id,
        erstellt_am: m.erstellt_am,
        datum: inhalt.datum ?? "",
        start_zeit: inhalt.start_zeit ?? "",
        end_zeit: inhalt.end_zeit ?? "",
        kommentar: inhalt.kommentar ?? "",
        roles,
        amAssigned,
      };
    });
    setOpenShifts(built);
  }, [activeMitarbeiter]);

  // Turn schicht_tausch broadcasts into interactive swap cards. The mutable
  // state lives in schichttausch_anfragen; the card renders different actions
  // for the offerer / responder / chef depending on the anfrage status.
  const loadSwaps = useCallback(async (rows: any[]) => {
    if (!activeMitarbeiter || rows.length === 0) { setSwaps([]); return; }
    const anfrageIds = rows.map((m: any) => m.inhalt?.anfrage_id).filter(Boolean);
    const today = new Date().toISOString().slice(0, 10);

    const [anfragen, myRoles, myZuw] = await Promise.all([
      supabase.from("schichttausch_anfragen")
        .select("id, status, anbietender_mitarbeiter_id, uebernehmender_mitarbeiter_id, gegen_schicht_zuweisung_id, praeferenz_tage, gegen_datum, gegen_start, gegen_end")
        .in("id", anfrageIds),
      supabase.from("mitarbeiter_rollen").select("rolle_id").eq("mitarbeiter_id", activeMitarbeiter.id),
      supabase.from("schicht_zuweisungen")
        .select("id, rolle_id, schicht_instanz_id, schicht_instanzen(datum, start_zeit, end_zeit)")
        .eq("mitarbeiter_id", activeMitarbeiter.id).eq("attendet", true),
    ]);
    const aById = new Map((anfragen.data ?? []).map((a: any) => [a.id, a]));
    const myRoleSet = new Set((myRoles.data ?? []).map((r: any) => r.rolle_id));

    // The viewer's own upcoming shifts — the pool of shifts they could offer back.
    const myShifts: SwapCandidate[] = (myZuw.data ?? []).map((z: any) => {
      const inst = Array.isArray(z.schicht_instanzen) ? z.schicht_instanzen[0] : z.schicht_instanzen;
      return {
        zuweisung_id: z.id, rolle_id: z.rolle_id, schicht_instanz_id: z.schicht_instanz_id,
        datum: inst?.datum ?? "", start_zeit: inst?.start_zeit ?? "", end_zeit: inst?.end_zeit ?? "",
      } as any;
    }).filter((s: any) => s.datum && s.datum >= today);
    // Days I already work — I can't take on a second shift on any of them.
    const myShiftDates = new Set<string>(myShifts.map((s: any) => s.datum));

    const nameIds = Array.from(new Set([
      ...rows.map((m: any) => m.inhalt?.anbieter_id).filter(Boolean),
      ...(anfragen.data ?? []).map((a: any) => a.uebernehmender_mitarbeiter_id).filter(Boolean),
    ])) as string[];
    const { data: people } = nameIds.length > 0
      ? await supabase.rpc("mitarbeiter_namen", { p_betrieb_id: activeMitarbeiter.betrieb_id, p_ids: nameIds })
      : { data: [] as any[] };
    const nameOf = new Map<string, string>((people ?? []).map((p: any) => [p.id, p.name]));

    const built: SwapMsg[] = rows.map((m: any) => {
      const inhalt = m.inhalt ?? {};
      const a = aById.get(inhalt.anfrage_id) ?? {};
      const status = a.status ?? "offen";
      const isAnbieter = inhalt.anbieter_id === activeMitarbeiter.id;
      const isUebernehmer = a.uebernehmender_mitarbeiter_id === activeMitarbeiter.id;
      const prefDates = ((inhalt.praeferenz_tage ?? a.praeferenz_tage ?? []) as string[]);
      const anbieterRollen = new Set<string>((inhalt.anbieter_rollen ?? []) as string[]);
      // Days the offerer already works — they can't take a give-back shift then.
      const anbieterBusy = new Set<string>((inhalt.anbieter_belegt_tage ?? []) as string[]);
      const offMonth = (inhalt.datum ?? "").slice(0, 7);
      // I can only take the offered shift if I'm qualified for it AND not already
      // working that day.
      const canTakeOffered = myRoleSet.has(inhalt.rolle_id) && !myShiftDates.has(inhalt.datum);
      // Which of my shifts I could offer back: I'm qualified for the offered shift,
      // the offerer is qualified for mine, and it falls on a preferred day (or, if
      // none were named, in the same month as the offered shift).
      const candidates = (!isAnbieter && canTakeOffered)
        ? myShifts.filter((s: any) =>
            s.schicht_instanz_id !== inhalt.schicht_instanz_id &&
            anbieterRollen.has(s.rolle_id) &&
            !anbieterBusy.has(s.datum) &&
            (prefDates.length ? prefDates.includes(s.datum) : (s.datum.slice(0, 7) === offMonth)))
        : [];
      return {
        id: m.id,
        anfrageId: inhalt.anfrage_id,
        erstellt_am: m.erstellt_am,
        datum: inhalt.datum ?? "",
        start_zeit: inhalt.start_zeit ?? "",
        end_zeit: inhalt.end_zeit ?? "",
        status,
        isAnbieter,
        isUebernehmer,
        anbieterName: inhalt.anbieter_id ? (nameOf.get(inhalt.anbieter_id) ?? "") : "",
        uebernehmerName: a.uebernehmender_mitarbeiter_id ? (nameOf.get(a.uebernehmender_mitarbeiter_id) ?? "") : "",
        prefDates,
        eligible: status === "offen" && !isAnbieter && canTakeOffered && candidates.length > 0,
        candidates,
        gegen: a.gegen_datum ? { datum: a.gegen_datum, start_zeit: a.gegen_start, end_zeit: a.gegen_end } : null,
      };
    });
    setSwaps(built);
  }, [activeMitarbeiter]);

  const load = useCallback(async () => {
    if (!user || !activeMitarbeiter) return;
    const { data: rows } = await supabase
      .from("benachrichtigungen")
      .select("id, typ, titel, text, prioritaet, angeheftet, mehrfachauswahl, anonym, erstellt_am, autor_id, inhalt")
      .eq("betrieb_id", activeMitarbeiter.betrieb_id)
      .is("mitarbeiter_id", null)
      .is("geloescht_am", null)
      .order("angeheftet", { ascending: false })
      .order("erstellt_am", { ascending: false });

    const allRows = rows ?? [];
    // Emergency-replacement and open-shift broadcasts get their own interactive cards.
    const emgRows = allRows.filter((m: any) => m.typ === "notfall_vertretung");
    const openRows = allRows.filter((m: any) => m.typ === "schicht_ausschreibung");
    const swapRows = allRows.filter((m: any) => m.typ === "schicht_tausch");
    const fullList = allRows.filter((m: any) => !["notfall_vertretung", "schicht_ausschreibung", "schicht_tausch"].includes(m.typ));
    await Promise.all([loadEmergencies(emgRows), loadOpenShifts(openRows), loadSwaps(swapRows)]);

    // Only build the most recent `visibleCount` messages; "Load more" reveals older ones.
    setTotalMsgCount(fullList.length);
    const list = fullList.slice(0, visibleCount);

    const ids = list.map((m: any) => m.id);
    if (ids.length === 0) { setMessages([]); setLoading(false); return; }

    // Which broadcasts are non-anonymous polls — for those we show voter names.
    const openPollIds = new Set(list.filter((m: any) => m.typ === "umfrage" && !m.anonym).map((m: any) => m.id));

    const [tasks, opts, votes, atts, reads] = await Promise.all([
      supabase.from("aufgaben").select("id, benachrichtigung_id, text, reihenfolge, erledigt_von, erledigt_am").in("benachrichtigung_id", ids),
      supabase.from("umfrage_optionen").select("id, benachrichtigung_id, text, reihenfolge").in("benachrichtigung_id", ids),
      supabase.from("umfrage_stimmen").select("benachrichtigung_id, option_id, mitarbeiter_id").in("benachrichtigung_id", ids),
      supabase.from("nachricht_anhaenge").select("id, benachrichtigung_id, datei_name").in("benachrichtigung_id", ids),
      supabase.from("benachrichtigung_gelesen").select("benachrichtigung_id").in("benachrichtigung_id", ids),
    ]);

    // Names to resolve: broadcast authors + voters of non-anonymous polls.
    const autorIds = list.map((m: any) => m.autor_id).filter(Boolean) as string[];
    const voterIds = (votes.data ?? [])
      .filter((v: any) => openPollIds.has(v.benachrichtigung_id))
      .map((v: any) => v.mitarbeiter_id);
    const nameIds = Array.from(new Set([...autorIds, ...voterIds]));

    const people = nameIds.length > 0
      ? await supabase.rpc("mitarbeiter_namen", { p_betrieb_id: activeMitarbeiter.betrieb_id, p_ids: nameIds })
      : { data: [] as any[] };

    const nameOf = new Map<string, string>();
    (people.data ?? []).forEach((p: any) => nameOf.set(p.id, p.name));
    // Only the currently active persona's votes count as "mine" — one auth
    // account can back several mitarbeiter rows (persona switching).
    const mine = new Set<string>([activeMitarbeiter.id]);
    const readSet = new Set((reads.data ?? []).map((r: any) => r.benachrichtigung_id));

    const byMsg = <T,>(arr: any[] | null) => {
      const m = new Map<string, T[]>();
      (arr ?? []).forEach((r: any) => {
        const k = r.benachrichtigung_id;
        if (!m.has(k)) m.set(k, []);
        m.get(k)!.push(r);
      });
      return m;
    };
    const tasksBy = byMsg<any>(tasks.data);
    const optsBy = byMsg<any>(opts.data);
    const votesBy = byMsg<any>(votes.data);
    const attsBy = byMsg<any>(atts.data);

    const built: Msg[] = list.map((m: any) => {
      const voteCounts: Record<string, number> = {};
      const myVotes = new Set<string>();
      const voters: Record<string, string[]> = {};
      const showVoters = m.typ === "umfrage" && !m.anonym;
      (votesBy.get(m.id) ?? []).forEach((v: any) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
        if (mine.has(v.mitarbeiter_id)) myVotes.add(v.option_id);
        if (showVoters) {
          const nm = nameOf.get(v.mitarbeiter_id);
          if (nm) (voters[v.option_id] ??= []).push(nm);
        }
      });
      return {
        ...m,
        autorName: m.autor_id ? (nameOf.get(m.autor_id) ?? "") : "",
        tasks: (tasksBy.get(m.id) ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge),
        options: (optsBy.get(m.id) ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge),
        voteCounts,
        myVotes,
        voters,
        attachments: attsBy.get(m.id) ?? [],
        gelesen: readSet.has(m.id),
      };
    });
    setMessages(built);
    setLoading(false);

    // opening the tab marks everything read (fire and forget)
    built.filter((m) => !m.gelesen).forEach((m) => {
      supabase.rpc("als_gelesen_markieren", { p_benachrichtigung_id: m.id });
    });
  }, [user, activeMitarbeiter, loadEmergencies, loadOpenShifts, loadSwaps, visibleCount]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live updates: when anyone in the business takes an open slot (new assignment)
  // or a broadcast changes, every connected client re-loads so a taken spot is
  // reflected for all — no manual refresh needed.
  useEffect(() => {
    if (!activeMitarbeiter) return;
    const bid = activeMitarbeiter.betrieb_id;
    const channel = supabase
      .channel(`feed:${bid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "schicht_zuweisungen", filter: `betrieb_id=eq.${bid}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "benachrichtigungen", filter: `betrieb_id=eq.${bid}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "schichttausch_anfragen", filter: `betrieb_id=eq.${bid}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeMitarbeiter, load]);

  // Keep open accept-modals in sync with live reloads.
  useEffect(() => {
    setOpenDetail((cur) => (cur ? (openShifts.find((o) => o.id === cur.id) ?? null) : cur));
  }, [openShifts]);
  useEffect(() => {
    setEmergencyDetail((cur) => (cur ? (emergencies.find((e) => e.id === cur.id) ?? null) : cur));
  }, [emergencies]);
  useEffect(() => {
    setSwapDetail((cur) => (cur ? (swaps.find((s) => s.id === cur.id) ?? null) : cur));
  }, [swaps]);

  const takeOver = async (m: EmergencyMsg) => {
    setEmergencyDetail(null);
    const { data, error } = await supabase.rpc("notfall_vertretung_uebernehmen", { p_benachrichtigung_id: m.id, p_mitarbeiter_id: activeMitarbeiter?.id ?? null });
    if (error) { Alert.alert(t("messages.emTakeFailed")); load(); return; }
    const code = data as string;
    if (code === "besetzt") Alert.alert(t("messages.emTookTitle"), t("messages.emTookBody"));
    else if (code === "bereits_besetzt") Alert.alert(t("messages.emAlreadyTaken"));
    else if (code === "schon_zugewiesen") Alert.alert(t("messages.emAlreadyOnShift"));
    else if (code === "nicht_qualifiziert") Alert.alert(t("messages.emNotQualified"));
    else Alert.alert(t("messages.emTakeFailed"));
    load();
  };

  const claimSlot = async (benId: string, rolleId: string) => {
    setOpenDetail(null);
    const { data, error } = await supabase.rpc("schicht_ausschreibung_annehmen", {
      p_benachrichtigung_id: benId,
      p_rolle_id: rolleId,
      p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    if (error) { Alert.alert(t("messages.osClaimFailed")); load(); return; }
    const code = data as string;
    if (code === "angenommen") Alert.alert(t("messages.osClaimedTitle"), t("messages.osClaimedBody"));
    else if (code === "voll") Alert.alert(t("messages.osFull"));
    else if (code === "schon_zugewiesen") Alert.alert(t("messages.osAlreadyOn"));
    else if (code === "nicht_qualifiziert") Alert.alert(t("messages.osNotQualified"));
    else Alert.alert(t("messages.osClaimFailed"));
    load();
  };

  // person2 responds to an open offer, giving one of their own shifts in return.
  const respondSwap = async (m: SwapMsg, gegenZuweisungId: string) => {
    setSwapDetail(null);
    const { data, error } = await supabase.rpc("tausch_annehmen", {
      p_benachrichtigung_id: m.id,
      p_gegen_zuweisung_id: gegenZuweisungId,
      p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    if (error) { Alert.alert(t("shiftSwap.takeFailed")); load(); return; }
    const code = data as string;
    if (code === "angefragt") Alert.alert(t("shiftSwap.respondedTitle"), t("shiftSwap.respondedBody"));
    else if (code === "bereits_besetzt") Alert.alert(t("shiftSwap.alreadyTaken"));
    else if (code === "schon_zugewiesen") Alert.alert(t("shiftSwap.alreadyOn"));
    else if (code === "nicht_qualifiziert" || code === "anbieter_nicht_qualifiziert") Alert.alert(t("shiftSwap.notQualified"));
    else if (code === "nicht_wunschtag") Alert.alert(t("shiftSwap.notPreferredDay"));
    else if (code === "schon_belegt") Alert.alert(t("shiftSwap.dayConflict"));
    else if (code === "anbieter_belegt") Alert.alert(t("shiftSwap.anbieterDayConflict"));
    else Alert.alert(t("shiftSwap.takeFailed"));
    load();
  };

  // person1 confirms or declines a responder's specific offer.
  const anbieterDecide = async (m: SwapMsg, zustimmen: boolean) => {
    setSwapDetail(null);
    const { data, error } = await supabase.rpc("tausch_anbieter_entscheiden", {
      p_anfrage_id: m.anfrageId, p_zustimmen: zustimmen, p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    if (error) { Alert.alert(t("shiftSwap.takeFailed")); load(); return; }
    const code = data as string;
    if (code === "bestaetigt") Alert.alert(t("shiftSwap.swappedTitle"), t("shiftSwap.swappedBody"));
    else if (code === "wartet_auf_chef") Alert.alert(t("shiftSwap.sentToChefTitle"), t("shiftSwap.sentToChefBody"));
    else if (code === "abgelehnt") Alert.alert(t("shiftSwap.declinedTitle"), t("shiftSwap.declinedBody"));
    else if (code === "abgelehnt_system") Alert.alert(t("shiftSwap.swapFailed"));
    load();
  };

  // chef approves or rejects when the business requires approval.
  const chefDecide = async (m: SwapMsg, genehmigt: boolean) => {
    setSwapDetail(null);
    const { data, error } = await supabase.rpc("tausch_entscheiden", {
      p_anfrage_id: m.anfrageId, p_genehmigt: genehmigt, p_grund: null,
    });
    if (error) { Alert.alert(t("shiftSwap.takeFailed")); load(); return; }
    const code = data as string;
    if (code === "bestaetigt") Alert.alert(t("shiftSwap.swappedTitle"), t("shiftSwap.swappedBody"));
    else if (code === "abgelehnt_chef") Alert.alert(t("shiftSwap.chefDeclinedTitle"), t("shiftSwap.chefDeclinedBody"));
    else if (code === "abgelehnt_system") Alert.alert(t("shiftSwap.swapFailed"));
    load();
  };

  // person1 withdraws their offer entirely.
  const withdrawSwap = async (m: SwapMsg) => {
    setSwapDetail(null);
    const { error } = await supabase.rpc("tausch_zurueckziehen", {
      p_anfrage_id: m.anfrageId, p_mitarbeiter_id: activeMitarbeiter?.id ?? null,
    });
    if (error) { Alert.alert(t("shiftSwap.withdrawFailed")); }
    load();
  };

  const toggleTask = async (taskId: string) => {
    await supabase.rpc("aufgabe_umschalten", { p_aufgabe_id: taskId });
    load();
  };

  const vote = async (m: Msg, optionId: string) => {
    let next: string[];
    if (m.mehrfachauswahl) {
      next = m.myVotes.has(optionId)
        ? [...m.myVotes].filter((o) => o !== optionId)
        : [...m.myVotes, optionId];
    } else {
      next = m.myVotes.has(optionId) ? [] : [optionId];
    }
    await supabase.rpc("abstimmen", { p_benachrichtigung_id: m.id, p_option_ids: next, p_mitarbeiter_id: activeMitarbeiter?.id ?? null });
    load();
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.bg }]} edges={["top"]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  const PRIO: Record<string, number> = { dringend: 3, wichtig: 2, normal: 1 };
  const weekAgo = Date.now() - 7 * 86400000;
  const q = query.trim().toLowerCase();
  const displayed = messages
    .filter((m) =>
      !q ||
      (m.titel ?? "").toLowerCase().includes(q) ||
      (m.text ?? "").toLowerCase().includes(q) ||
      m.autorName.toLowerCase().includes(q))
    .sort((a, b) => {
      if (a.angeheftet !== b.angeheftet) return a.angeheftet ? -1 : 1; // pinned first
      const ta = new Date(a.erstellt_am).getTime();
      const tb = new Date(b.erstellt_am).getTime();
      if (sortMode === "relevant") {
        // priority only boosts messages from the last week
        const pa = ta >= weekAgo ? (PRIO[a.prioritaet] ?? 1) : 0;
        const pb = tb >= weekAgo ? (PRIO[b.prioritaet] ?? 1) : 0;
        if (pa !== pb) return pb - pa;
      }
      return tb - ta; // newest first
    });

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  // Merge messages, emergency-cover and open-shift cards into a single feed so
  // they interleave by recency: a newer post sits above an older emergency/open shift.
  type FeedItem =
    | { kind: "msg"; ts: number; pinned: boolean; prio: number; m: (typeof displayed)[number] }
    | { kind: "emergency"; ts: number; pinned: false; prio: number; e: EmergencyMsg }
    | { kind: "open"; ts: number; pinned: false; prio: number; o: OpenShift }
    | { kind: "swap"; ts: number; pinned: false; prio: number; s: SwapMsg };
  const feed: FeedItem[] = [
    ...displayed.map((m) => ({
      kind: "msg" as const,
      ts: new Date(m.erstellt_am).getTime(),
      pinned: m.angeheftet,
      prio: sortMode === "relevant" && new Date(m.erstellt_am).getTime() >= weekAgo ? (PRIO[m.prioritaet] ?? 1) : 0,
      m,
    })),
    ...emergencies.map((e) => ({ kind: "emergency" as const, ts: new Date(e.erstellt_am).getTime(), pinned: false as const, prio: 0, e })),
    ...openShifts.map((o) => ({ kind: "open" as const, ts: new Date(o.erstellt_am).getTime(), pinned: false as const, prio: 0, o })),
    ...swaps
      .filter((s) => {
        // The offerer and responder always see their own swap; the chef sees it
        // once it needs approval. Everyone else only sees an OPEN offer they can
        // actually respond to — people who can't take the shift never see it.
        if (s.isAnbieter || s.isUebernehmer) return true;
        if (s.status === "offen") return s.eligible;
        if (s.status === "wartet_auf_chef") return isChef;
        return false;
      })
      .map((s) => ({ kind: "swap" as const, ts: new Date(s.erstellt_am).getTime(), pinned: false as const, prio: 0, s })),
  ]
    .filter((item) => {
      if (category === "all") return true;
      const group =
        item.kind === "emergency" || item.kind === "open" || item.kind === "swap"
          ? "shifts"
          : ["emergency", "openShift", "shiftSwitch"].includes(catKey(item.m.typ))
            ? "shifts"
            : "messages";
      return group === category;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1; // pinned messages first
      if (a.prio !== b.prio) return b.prio - a.prio;
      return b.ts - a.ts; // newest first
    });

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScreenGradient />
      <RefreshScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onRefresh={load}
      >
        <Text style={[styles.title, { color: theme.text }]}>{t("tabs.messages")}</Text>

        <TextInput
          style={[styles.search, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }]}
          placeholder={t("messages.search")}
          placeholderTextColor={theme.muted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        <View style={styles.sortRow}>
          {(["newest", "relevant"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => setSortMode(s)}
              style={[styles.sortChip, { borderColor: theme.border }, sortMode === s && { backgroundColor: theme.accent, borderColor: theme.accent }]}
            >
              <Text style={{ color: sortMode === s ? theme.accentText : theme.text, fontWeight: "600", fontSize: 13 }}>
                {t(s === "newest" ? "messages.sortNewest" : "messages.sortRelevant")}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => setCatOpen((o) => !o)}
            style={[styles.sortChip, styles.catChip, { borderColor: category === "all" ? theme.border : theme.accent }]}
          >
            <Text style={{ color: category === "all" ? theme.text : theme.accent, fontWeight: "600", fontSize: 13 }}>
              {t(`messages.cat_${category}`)}
            </Text>
            <ChevronDown color={category === "all" ? theme.text : theme.accent} size={16} />
          </Pressable>
        </View>
        {catOpen && (
          <View style={[styles.catMenu, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {(["all", "shifts", "messages"] as const).map((c) => (
              <Pressable
                key={c}
                onPress={() => { setCategory(c); setCatOpen(false); }}
                style={styles.catItem}
              >
                <Text style={{ color: category === c ? theme.accent : theme.text, fontWeight: category === c ? "700" : "500", fontSize: 14 }}>
                  {t(`messages.cat_${c}`)}
                </Text>
                {category === c && <Check color={theme.accent} size={16} />}
              </Pressable>
            ))}
          </View>
        )}

        {feed.map((item) =>
          item.kind === "emergency" ? (
            <EmergencyCard key={item.e.id} e={item.e} theme={theme} t={t} lang={lang} onOpen={() => setEmergencyDetail(item.e)} />
          ) : item.kind === "open" ? (
            <OpenShiftCard key={item.o.id} o={item.o} theme={theme} t={t} lang={lang} onOpen={() => setOpenDetail(item.o)} />
          ) : item.kind === "swap" ? (
            <SwapCard key={item.s.id} s={item.s} theme={theme} t={t} lang={lang} isChef={isChef} onOpen={() => setSwapDetail(item.s)} />
          ) : (
            <SummaryCard key={item.m.id} m={item.m} theme={theme} t={t} fmt={fmt}
              onPress={() => setSelectedId(item.m.id)} />
          )
        )}

        {totalMsgCount > visibleCount && (
          <Pressable
            style={[styles.loadMore, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={() => setVisibleCount((c) => c + PAGE)}
          >
            <Text style={{ color: theme.accent, fontWeight: "700", fontSize: 14 }}>{t("messages.loadMore")}</Text>
          </Pressable>
        )}

      </RefreshScrollView>

      {activeMitarbeiter && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push({ pathname: "/compose", params: { betrieb: activeMitarbeiter.betrieb_id, role: activeMitarbeiter.rolle_typ } })}
        >
          <Plus color={theme.accentText} size={26} />
        </Pressable>
      )}

      <DetailModal
        m={selected}
        theme={theme}
        t={t}
        fmt={fmt}
        onClose={() => setSelectedId(null)}
        onToggleTask={toggleTask}
        onVote={(o: string) => selected && vote(selected, o)}
      />

      <OpenShiftModal
        o={openDetail}
        theme={theme}
        t={t}
        lang={lang}
        onClose={() => setOpenDetail(null)}
        onClaim={(rolleId: string) => openDetail && claimSlot(openDetail.id, rolleId)}
      />

      <EmergencyModal
        e={emergencyDetail}
        theme={theme}
        t={t}
        lang={lang}
        onClose={() => setEmergencyDetail(null)}
        onTake={() => emergencyDetail && takeOver(emergencyDetail)}
      />

      <SwapModal
        s={swapDetail}
        theme={theme}
        t={t}
        lang={lang}
        isChef={isChef}
        onClose={() => setSwapDetail(null)}
        onRespond={(gegenId: string) => swapDetail && respondSwap(swapDetail, gegenId)}
        onAnbieterDecide={(ok: boolean) => swapDetail && anbieterDecide(swapDetail, ok)}
        onChefDecide={(ok: boolean) => swapDetail && chefDecide(swapDetail, ok)}
        onWithdraw={() => swapDetail && withdrawSwap(swapDetail)}
      />
    </SafeAreaView>
  );
}

// compact card — no body content, only meta. Tap opens the detail modal.
function SummaryCard({ m, theme, t, fmt, onPress }: any) {
  return (
    <Pressable
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
      onPress={onPress}
    >
      <View style={styles.cardHead}>
        <Text style={[styles.badge, { color: theme.accent }]}>
          {t(`notifications.item.${catKey(m.typ)}`)}
        </Text>
        {m.prioritaet !== "normal" && (
          <Text style={[styles.prioBadge, { color: m.prioritaet === "dringend" ? "#C1442D" : "#d97706" }]}>
            {t(m.prioritaet === "dringend" ? "messages.prioDringend" : "messages.prioWichtig")}
          </Text>
        )}
        {!m.gelesen && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
        {m.angeheftet && <Text style={styles.pin}>📌</Text>}
      </View>

      {m.titel ? <Text style={[styles.cardTitle, { color: theme.text }]}>{m.titel}</Text> : null}

      <Text style={[styles.cardFoot, { color: theme.muted }]}>
        {m.autorName ? `${m.autorName} · ` : ""}{fmt(m.erstellt_am)}
      </Text>
    </Pressable>
  );
}

// full message content in a dismissible popup
function DetailModal({ m, theme, t, fmt, onClose, onToggleTask, onVote }: any) {
  return (
    <Modal visible={!!m} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}>
            <X color={theme.muted} size={24} />
          </Pressable>
          {m && (
            <ScrollView contentContainerStyle={{ gap: 6 }} showsVerticalScrollIndicator={false}>
              <DetailBody m={m} theme={theme} t={t} fmt={fmt}
                onToggleTask={onToggleTask} onVote={onVote} />
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function DetailBody({ m, theme, t, fmt, onToggleTask, onVote }: any) {
  const totalVotes = Object.values(m.voteCounts as Record<string, number>).reduce((a, b) => a + b, 0);
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.cardHead}>
        <Text style={[styles.badge, { color: theme.accent }]}>
          {t(`notifications.item.${catKey(m.typ)}`)}
        </Text>
        {m.prioritaet !== "normal" && (
          <Text style={[styles.prioBadge, { color: m.prioritaet === "dringend" ? "#C1442D" : "#d97706" }]}>
            {t(m.prioritaet === "dringend" ? "messages.prioDringend" : "messages.prioWichtig")}
          </Text>
        )}
        {m.angeheftet && <Text style={styles.pin}>📌</Text>}
      </View>

      {m.titel ? <Text style={[styles.cardTitle, { color: theme.text }]}>{m.titel}</Text> : null}
      {m.text ? <Text style={[styles.cardText, { color: theme.text }]}>{m.text}</Text> : null}

      {/* task list */}
      {m.typ === "aufgabenliste" && m.tasks.map((task: Task) => {
        const done = !!task.erledigt_am;
        return (
          <Pressable key={task.id} style={styles.taskRow} onPress={() => onToggleTask(task.id)}>
            <View style={[styles.checkbox, { borderColor: theme.border }, done && { backgroundColor: theme.accent, borderColor: theme.accent }]}>
              {done && <Check color={theme.accentText} size={14} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.taskText, { color: theme.text }, done && styles.strike]}>{task.text}</Text>
              {done && task.erledigt_am ? (
                <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.done")} · {fmt(task.erledigt_am)}</Text>
              ) : null}
            </View>
          </Pressable>
        );
      })}

      {/* poll */}
      {m.typ === "umfrage" && m.options.map((opt: Opt) => {
        const count = m.voteCounts[opt.id] ?? 0;
        const picked = m.myVotes.has(opt.id);
        const pct = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
        const voterNames: string[] = m.voters?.[opt.id] ?? [];
        return (
          <View key={opt.id}>
            <Pressable style={styles.optRow} onPress={() => onVote(opt.id)}>
              <View style={[styles.optFill, { backgroundColor: theme.bg, width: `${pct}%` }]} />
              <View style={[styles.radio, { borderColor: theme.border }, picked && { borderColor: theme.accent }]}>
                {picked && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
              </View>
              <Text style={[styles.optText, { color: theme.text }]}>{opt.text}</Text>
              <Text style={[styles.optCount, { color: theme.muted }]}>{count}</Text>
            </Pressable>
            {!m.anonym && voterNames.length > 0 ? (
              <Text style={[styles.voterNames, { color: theme.muted }]}>{voterNames.join(", ")}</Text>
            ) : null}
          </View>
        );
      })}
      {m.typ === "umfrage" ? (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>
          {totalVotes} {t("messages.votes")}{m.anonym ? ` · ${t("messages.anonymous")}` : ""}
        </Text>
      ) : null}

      {/* documents */}
      {m.typ === "dokument" && m.attachments.map((a: Attach) => (
        <View key={a.id} style={styles.docRow}>
          <FileText color={theme.accent} size={18} />
          <Text style={[styles.docName, { color: theme.text }]}>{a.datei_name ?? "—"}</Text>
        </View>
      ))}

      <Text style={[styles.cardFoot, { color: theme.muted }]}>
        {m.autorName ? `${m.autorName} · ` : ""}{fmt(m.erstellt_am)}
      </Text>
    </View>
  );
}

const RED = "#C1442D";
const GREEN = "#16a34a";
const emWhen = (e: EmergencyMsg, lang: string) => {
  const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
  return e.datum
    ? `${new Date(e.datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(e.start_zeit)}–${hhmm(e.end_zeit)}`
    : "";
};

// When the broadcast was posted (date + time) — shown as a card footer.
const postedAt = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

// Tappable summary for an open emergency shift. Tapping opens the take-over modal.
function EmergencyCard({ e, theme, t, lang, onOpen }: { e: EmergencyMsg; theme: any; t: any; lang: string; onOpen: () => void }) {
  const taken = e.status === "besetzt";
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.surface, borderColor: RED }]} onPress={onOpen}>
      <View style={styles.cardHead}>
        <TriangleAlert color={RED} size={16} />
        <Text style={[styles.badge, { color: RED }]}>{t("notifications.item.emergency")}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{t("messages.emTakeOverTitle")}</Text>
      <Text style={[styles.cardText, { color: theme.text }]}>{emWhen(e, lang)}</Text>
      {e.melderName ? <Text style={[styles.taskMeta, { color: theme.muted }]}>{e.melderName}</Text> : null}

      {taken ? (
        <View style={[styles.eligible, { backgroundColor: GREEN + "22" }]}>
          <Text style={{ color: GREEN, fontWeight: "700" }}>
            ✓ {e.takenByMe ? t("messages.emTakenByYou") : (e.takenByName ? `${t("messages.emTakenBy")} ${e.takenByName}` : t("messages.emTaken"))}
          </Text>
        </View>
      ) : e.isMelder ? (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.emYourEmergency")}</Text>
      ) : e.eligible ? (
        <View style={[styles.takeBtn, { backgroundColor: RED, alignSelf: "flex-start" }]}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>{t("messages.emTapToTake")}</Text>
        </View>
      ) : (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.emNotEligible")}</Text>
      )}
      <Text style={[styles.cardFoot, { color: theme.muted }]}>{postedAt(e.erstellt_am, lang)}</Text>
    </Pressable>
  );
}

// Take-over modal — hold to commit, first come first served.
function EmergencyModal({ e, theme, t, lang, onClose, onTake }: { e: EmergencyMsg | null; theme: any; t: any; lang: string; onClose: () => void; onTake: () => void }) {
  const taken = e?.status === "besetzt";
  return (
    <Modal visible={!!e} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: RED }]} onPress={(ev) => ev.stopPropagation()}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}><X color={theme.muted} size={24} /></Pressable>
          {e && (
            <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
              <View style={styles.cardHead}>
                <TriangleAlert color={RED} size={16} />
                <Text style={[styles.badge, { color: RED }]}>{t("notifications.item.emergency")}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t("messages.emTakeOverTitle")}</Text>
              <Text style={[styles.cardText, { color: theme.text }]}>{emWhen(e, lang)}</Text>
              {e.melderName ? <Text style={[styles.taskMeta, { color: theme.muted }]}>{e.melderName}</Text> : null}

              {taken ? (
                <View style={[styles.eligible, { backgroundColor: GREEN + "22" }]}>
                  <Text style={{ color: GREEN, fontWeight: "700" }}>
                    ✓ {e.takenByMe ? t("messages.emTakenByYou") : (e.takenByName ? `${t("messages.emTakenBy")} ${e.takenByName}` : t("messages.emTaken"))}
                  </Text>
                </View>
              ) : e.isMelder ? (
                <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.emYourEmergency")}</Text>
              ) : e.eligible ? (
                <View style={{ marginTop: 6 }}>
                  <HoldButton label={t("messages.emHoldToTake")} onConfirm={onTake} color={RED} fillColor="rgba(0,0,0,0.28)" textColor="#fff" holdMs={2000} />
                </View>
              ) : (
                <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.emNotEligible")}</Text>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const osWhen = (o: OpenShift, lang: string) => {
  const hhmm = (s: string) => (s ? s.slice(0, 5) : "");
  return o.datum
    ? `${new Date(o.datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(o.start_zeit)}–${hhmm(o.end_zeit)}`
    : "";
};

// Tappable summary for a posted open shift. Tapping opens the accept modal.
function OpenShiftCard({ o, theme, t, lang, onOpen }: { o: OpenShift; theme: any; t: any; lang: string; onOpen: () => void }) {
  const GREEN = "#16a34a";
  const openCount = o.roles.reduce((n, r) => n + Math.max(0, r.benoetigt - r.besetzt), 0);
  const canTake = o.roles.some((r) => r.eligible);

  return (
    <Pressable style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]} onPress={onOpen}>
      <View style={styles.cardHead}>
        <CalendarPlus color={theme.accent} size={16} />
        <Text style={[styles.badge, { color: theme.accent }]}>{t("notifications.item.openShift")}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{t("messages.osTitle")}</Text>
      <Text style={[styles.cardText, { color: theme.text }]}>{osWhen(o, lang)}</Text>
      <Text style={[styles.taskMeta, { color: theme.muted }]}>
        {o.roles.map((r) => `${r.name} ${r.besetzt}/${r.benoetigt}`).join("  ·  ")}
      </Text>
      {o.amAssigned ? (
        <View style={[styles.eligible, { backgroundColor: GREEN + "22" }]}>
          <Text style={{ color: GREEN, fontWeight: "700" }}>✓ {t("messages.osYoureOn")}</Text>
        </View>
      ) : canTake ? (
        <View style={[styles.takeBtn, { backgroundColor: theme.accent, alignSelf: "flex-start" }]}>
          <Text style={{ color: theme.accentText, fontWeight: "700" }}>{t("messages.osOpenToTake")}</Text>
        </View>
      ) : openCount === 0 ? (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.osFullShort")}</Text>
      ) : (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.osNotEligible")}</Text>
      )}
      <Text style={[styles.cardFoot, { color: theme.muted }]}>{postedAt(o.erstellt_am, lang)}</Text>
    </Pressable>
  );
}

// Accept modal — open a role slot and agree to it, first come first served.
function OpenShiftModal({ o, theme, t, lang, onClose, onClaim }: { o: OpenShift | null; theme: any; t: any; lang: string; onClose: () => void; onClaim: (rolleId: string) => void }) {
  const GREEN = "#16a34a";
  return (
    <Modal visible={!!o} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]} onPress={(e) => e.stopPropagation()}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}><X color={theme.muted} size={24} /></Pressable>
          {o && (
            <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
              <View style={styles.cardHead}>
                <CalendarPlus color={theme.accent} size={16} />
                <Text style={[styles.badge, { color: theme.accent }]}>{t("notifications.item.openShift")}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t("messages.osTitle")}</Text>
              <Text style={[styles.cardText, { color: theme.text }]}>{osWhen(o, lang)}</Text>
              {o.kommentar ? <Text style={[styles.cardText, { color: theme.text }]}>“{o.kommentar}”</Text> : null}

              {o.amAssigned && (
                <View style={[styles.eligible, { backgroundColor: GREEN + "22" }]}>
                  <Text style={{ color: GREEN, fontWeight: "700" }}>✓ {t("messages.osYoureOn")}</Text>
                </View>
              )}

              <Text style={[styles.taskMeta, { color: theme.muted, marginTop: 4 }]}>{t("messages.osPickRole")}</Text>
              {o.roles.map((r) => {
                const full = r.besetzt >= r.benoetigt;
                return (
                  <View key={r.rolle_id} style={styles.osRoleRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: theme.text, fontWeight: "700" }}>{r.name}</Text>
                      <Text style={[styles.taskMeta, { color: theme.muted }]}>{r.besetzt}/{r.benoetigt} {t("messages.osFilled")}</Text>
                    </View>
                    {r.eligible ? (
                      <HoldButton
                        label={t("messages.osHoldToTake")}
                        onConfirm={() => onClaim(r.rolle_id)}
                        color={theme.accent}
                        fillColor="rgba(0,0,0,0.28)"
                        textColor={theme.accentText}
                        holdMs={2000}
                        compact
                      />
                    ) : full ? (
                      <Text style={{ color: GREEN, fontWeight: "700" }}>✓ {t("messages.osFullShort")}</Text>
                    ) : o.amAssigned ? null : (
                      <Text style={[styles.taskMeta, { color: theme.muted, maxWidth: 130, textAlign: "right" }]}>{t("messages.osNotYourRole")}</Text>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const swWhen = (s: SwapMsg, lang: string) => {
  const hhmm = (x: string) => (x ? x.slice(0, 5) : "");
  return s.datum
    ? `${new Date(s.datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(s.start_zeit)}–${hhmm(s.end_zeit)}`
    : "";
};

const swDay = (datum: string, start: string, end: string, lang: string) => {
  const hhmm = (x: string) => (x ? x.slice(0, 5) : "");
  return datum
    ? `${new Date(datum + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · ${hhmm(start)}–${hhmm(end)}`
    : "";
};

// A short status line + whether the current viewer has an action to take.
function swapStatus(s: SwapMsg, isChef: boolean, t: any): { line: string; action: boolean } {
  if (s.status === "offen") {
    if (s.isAnbieter) return { line: t("shiftSwap.yourOffer"), action: false };
    if (s.eligible) return { line: t("shiftSwap.tapToRespond"), action: true };
    return { line: t("shiftSwap.notEligible"), action: false };
  }
  if (s.status === "angefragt") {
    if (s.isAnbieter) return { line: t("shiftSwap.needsYourConfirm"), action: true };
    if (s.isUebernehmer) return { line: t("shiftSwap.waitingAnbieter"), action: false };
    return { line: t("shiftSwap.statusPending"), action: false };
  }
  if (s.status === "wartet_auf_chef") {
    if (isChef) return { line: t("shiftSwap.needsChefApproval"), action: true };
    if (s.isAnbieter || s.isUebernehmer) return { line: t("shiftSwap.waitingChef"), action: false };
    return { line: t("shiftSwap.statusPending"), action: false };
  }
  return { line: t("shiftSwap.statusPending"), action: false };
}

// Tappable summary for a shift-swap offer. Tapping opens the detail modal.
function SwapCard({ s, theme, t, lang, isChef, onOpen }: { s: SwapMsg; theme: any; t: any; lang: string; isChef: boolean; onOpen: () => void }) {
  const st = swapStatus(s, isChef, t);
  return (
    <Pressable style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]} onPress={onOpen}>
      <View style={styles.cardHead}>
        <Repeat color={theme.accent} size={16} />
        <Text style={[styles.badge, { color: theme.accent }]}>{t("notifications.item.shiftSwitch")}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.text }]}>{t("shiftSwap.cardTitle")}</Text>
      <Text style={[styles.cardText, { color: theme.text }]}>{swWhen(s, lang)}</Text>
      {s.anbieterName ? <Text style={[styles.taskMeta, { color: theme.muted }]}>{s.anbieterName}</Text> : null}

      {st.action ? (
        <View style={[styles.takeBtn, { backgroundColor: theme.accent, alignSelf: "flex-start" }]}>
          <Text style={{ color: theme.accentText, fontWeight: "700" }}>{st.line}</Text>
        </View>
      ) : (
        <Text style={[styles.taskMeta, { color: theme.muted }]}>{st.line}</Text>
      )}
      <Text style={[styles.cardFoot, { color: theme.muted }]}>{postedAt(s.erstellt_am, lang)}</Text>
    </Pressable>
  );
}

// Detail modal — renders the right action set for the viewer's role + status.
function SwapModal({ s, theme, t, lang, isChef, onClose, onRespond, onAnbieterDecide, onChefDecide, onWithdraw }: {
  s: SwapMsg | null; theme: any; t: any; lang: string; isChef: boolean;
  onClose: () => void; onRespond: (gegenId: string) => void;
  onAnbieterDecide: (ok: boolean) => void; onChefDecide: (ok: boolean) => void; onWithdraw: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  useEffect(() => { setPicked(null); }, [s?.id, s?.status]);

  return (
    <Modal visible={!!s} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.accent }]} onPress={(ev) => ev.stopPropagation()}>
          <Pressable onPress={onClose} hitSlop={10} style={styles.modalClose}><X color={theme.muted} size={24} /></Pressable>
          {s && (
            <ScrollView contentContainerStyle={{ gap: 8 }} showsVerticalScrollIndicator={false}>
              <View style={styles.cardHead}>
                <Repeat color={theme.accent} size={16} />
                <Text style={[styles.badge, { color: theme.accent }]}>{t("notifications.item.shiftSwitch")}</Text>
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{t("shiftSwap.cardTitle")}</Text>

              {/* person1's shift being offered */}
              <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("shiftSwap.offeredShift")}</Text>
              <Text style={[styles.cardText, { color: theme.text }]}>{swWhen(s, lang)}</Text>
              {s.anbieterName ? <Text style={[styles.taskMeta, { color: theme.muted }]}>{s.anbieterName}</Text> : null}

              {/* preferred days */}
              {s.prefDates.length > 0 ? (
                <Text style={[styles.taskMeta, { color: theme.muted }]}>
                  {t("shiftSwap.preferredDays")}: {s.prefDates.map((d) => new Date(d + "T00:00:00").toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })).join(", ")}
                </Text>
              ) : null}

              {/* the offered-back shift, once a responder has chosen one */}
              {s.gegen ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("shiftSwap.givenBack")}{s.uebernehmerName ? ` · ${s.uebernehmerName}` : ""}</Text>
                  <Text style={[styles.cardText, { color: theme.text }]}>{swDay(s.gegen.datum, s.gegen.start_zeit, s.gegen.end_zeit, lang)}</Text>
                </View>
              ) : null}

              {/* ---- Action area ---- */}
              {s.status === "offen" && s.isAnbieter ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("shiftSwap.yourOffer")}</Text>
                  <Pressable style={[styles.takeBtn, { borderWidth: 1.5, borderColor: RED, alignSelf: "stretch", alignItems: "center" }]} onPress={onWithdraw}>
                    <Text style={{ color: RED, fontWeight: "700" }}>{t("shiftSwap.withdraw")}</Text>
                  </Pressable>
                </View>
              ) : s.status === "offen" && s.eligible ? (
                <View style={{ marginTop: 8, gap: 8 }}>
                  <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("shiftSwap.pickGiveShift")}</Text>
                  {s.candidates.map((c) => {
                    const on = picked === c.zuweisung_id;
                    return (
                      <Pressable
                        key={c.zuweisung_id}
                        onPress={() => setPicked(c.zuweisung_id)}
                        style={[styles.osRoleRow, { borderColor: on ? theme.accent : "#8883", borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 10 }]}
                      >
                        <View style={[styles.radio, { borderColor: theme.border }, on && { borderColor: theme.accent }]}>
                          {on && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
                        </View>
                        <Text style={{ color: theme.text, fontWeight: "600", flex: 1 }}>
                          {swDay(c.datum, c.start_zeit, c.end_zeit, lang)}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    style={[styles.takeBtn, { backgroundColor: theme.accent, alignSelf: "stretch", alignItems: "center", marginTop: 4, opacity: picked ? 1 : 0.5 }]}
                    disabled={!picked}
                    onPress={() => picked && onRespond(picked)}
                  >
                    <Text style={{ color: theme.accentText, fontWeight: "700" }}>{t("shiftSwap.sendOffer")}</Text>
                  </Pressable>
                </View>
              ) : s.status === "angefragt" && s.isAnbieter ? (
                <View style={{ marginTop: 8, gap: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{t("shiftSwap.confirmSwapBody")}</Text>
                  <Pressable style={[styles.takeBtn, { backgroundColor: theme.accent, alignSelf: "stretch", alignItems: "center" }]} onPress={() => onAnbieterDecide(true)}>
                    <Text style={{ color: theme.accentText, fontWeight: "700" }}>{t("shiftSwap.confirmSwap")}</Text>
                  </Pressable>
                  <Pressable style={[styles.takeBtn, { borderWidth: 1.5, borderColor: RED, alignSelf: "stretch", alignItems: "center" }]} onPress={() => onAnbieterDecide(false)}>
                    <Text style={{ color: RED, fontWeight: "700" }}>{t("shiftSwap.decline")}</Text>
                  </Pressable>
                </View>
              ) : s.status === "wartet_auf_chef" && isChef ? (
                <View style={{ marginTop: 8, gap: 10 }}>
                  <Text style={{ color: theme.text, fontSize: 14 }}>{t("shiftSwap.chefApproveBody")}</Text>
                  <Pressable style={[styles.takeBtn, { backgroundColor: theme.accent, alignSelf: "stretch", alignItems: "center" }]} onPress={() => onChefDecide(true)}>
                    <Text style={{ color: theme.accentText, fontWeight: "700" }}>{t("shiftSwap.approve")}</Text>
                  </Pressable>
                  <Pressable style={[styles.takeBtn, { borderWidth: 1.5, borderColor: RED, alignSelf: "stretch", alignItems: "center" }]} onPress={() => onChefDecide(false)}>
                    <Text style={{ color: RED, fontWeight: "700" }}>{t("shiftSwap.reject")}</Text>
                  </Pressable>
                </View>
              ) : (
                <Text style={[styles.taskMeta, { color: theme.muted, marginTop: 8 }]}>{swapStatus(s, isChef, t).line}</Text>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const catKey = (typ: string) =>
  typ === "allgemein" ? "announcement"
    : typ === "aufgabenliste" ? "tasks"
    : typ === "umfrage" ? "polls"
    : typ === "dokument" ? "documents"
    : typ === "notfall_vertretung" ? "emergency"
    : typ === "schicht_ausschreibung" ? "openShift"
    : "shiftSwitch";

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  content: { padding: 16, gap: 12, paddingBottom: 96 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 4 },
  empty: { textAlign: "center", marginTop: 40 },
  search: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, fontSize: 15 },
  sortRow: { flexDirection: "row", gap: 8 },
  sortChip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  catMenu: { borderWidth: 1.5, borderRadius: 12, overflow: "hidden" },
  catItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingHorizontal: 16 },
  prioBadge: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },

  card: { borderWidth: 1.5, borderRadius: 14, padding: 16, gap: 6 },
  backdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 20 },
  modalCard: { width: "100%", maxHeight: "80%", borderWidth: 1.5, borderRadius: 16, padding: 20, paddingTop: 40 },
  modalClose: { position: "absolute", top: 12, right: 12, zIndex: 1 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pin: { fontSize: 12 },
  mockTag: { fontSize: 11, marginLeft: "auto", fontStyle: "italic" },
  cardTitle: { fontSize: 17, fontWeight: "700" },
  cardText: { fontSize: 15, lineHeight: 20 },
  cardFoot: { fontSize: 12, marginTop: 4 },

  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: "center", justifyContent: "center", marginTop: 1 },
  taskText: { fontSize: 15 },
  strike: { textDecorationLine: "line-through", opacity: 0.6 },
  taskMeta: { fontSize: 12, marginTop: 2 },

  optRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, overflow: "hidden" },
  optFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  optText: { fontSize: 15, flex: 1 },
  optCount: { fontSize: 14, fontWeight: "600" },
  voterNames: { fontSize: 12, paddingHorizontal: 10, marginTop: 4, marginBottom: 8 },

  docRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  docName: { fontSize: 15 },

  eligible: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6 },
  takeBtn: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20, marginTop: 6 },
  loadMore: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  osRoleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6, borderTopWidth: StyleSheet.hairlineWidth, borderColor: "#8883" },

  fab: {
    position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
});
