// src/app/(tabs)/messages.tsx — broadcast feed (announcements, tasks, polls, docs)
import { router, useFocusEffect } from "expo-router";
import { Check, FileText, Plus, X } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView,
    StyleSheet, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { supabase } from "../../lib/supabase";
import { useTheme } from "../../theme/ThemeProvider";

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
  attachments: Attach[];
  gelesen: boolean;
};

export default function MessagesScreen() {
  const { user, activeMitarbeiter } = useAuth();
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<"newest" | "relevant">("newest");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !activeMitarbeiter) return;
    const { data: rows } = await supabase
      .from("benachrichtigungen")
      .select("id, typ, titel, text, prioritaet, angeheftet, mehrfachauswahl, anonym, erstellt_am, autor_id")
      .eq("betrieb_id", activeMitarbeiter.betrieb_id)
      .is("mitarbeiter_id", null)
      .is("geloescht_am", null)
      .order("angeheftet", { ascending: false })
      .order("erstellt_am", { ascending: false });

    const list = rows ?? [];
    const ids = list.map((m: any) => m.id);
    if (ids.length === 0) { setMessages([]); setLoading(false); return; }

    const [tasks, opts, votes, atts, reads, people] = await Promise.all([
      supabase.from("aufgaben").select("id, benachrichtigung_id, text, reihenfolge, erledigt_von, erledigt_am").in("benachrichtigung_id", ids),
      supabase.from("umfrage_optionen").select("id, benachrichtigung_id, text, reihenfolge").in("benachrichtigung_id", ids),
      supabase.from("umfrage_stimmen").select("benachrichtigung_id, option_id, mitarbeiter_id").in("benachrichtigung_id", ids),
      supabase.from("nachricht_anhaenge").select("id, benachrichtigung_id, datei_name").in("benachrichtigung_id", ids),
      supabase.from("benachrichtigung_gelesen").select("benachrichtigung_id").in("benachrichtigung_id", ids),
      supabase.from("mitarbeiter").select("id, vorname, nachname, auth_id"),
    ]);

    const nameOf = new Map<string, string>();
    const mine = new Set<string>();
    (people.data ?? []).forEach((p: any) => {
      nameOf.set(p.id, `${p.vorname} ${p.nachname}`.trim());
      if (p.auth_id === user.id) mine.add(p.id);
    });
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
      (votesBy.get(m.id) ?? []).forEach((v: any) => {
        voteCounts[v.option_id] = (voteCounts[v.option_id] ?? 0) + 1;
        if (mine.has(v.mitarbeiter_id)) myVotes.add(v.option_id);
      });
      return {
        ...m,
        autorName: m.autor_id ? (nameOf.get(m.autor_id) ?? "") : "",
        tasks: (tasksBy.get(m.id) ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge),
        options: (optsBy.get(m.id) ?? []).sort((a, b) => a.reihenfolge - b.reihenfolge),
        voteCounts,
        myVotes,
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
  }, [user, activeMitarbeiter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

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
    await supabase.rpc("abstimmen", { p_benachrichtigung_id: m.id, p_option_ids: next });
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

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.muted} />}
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
              <Text style={{ color: sortMode === s ? "#fff" : theme.text, fontWeight: "600", fontSize: 13 }}>
                {t(s === "newest" ? "messages.sortNewest" : "messages.sortRelevant")}
              </Text>
            </Pressable>
          ))}
        </View>

        {displayed.map((m) => (
          <SummaryCard key={m.id} m={m} theme={theme} t={t} fmt={fmt}
            onPress={() => setSelectedId(m.id)} />
        ))}

        {/* aenderungswunsch — mockup only */}
        <MockChangeRequest theme={theme} t={t} />
      </ScrollView>

      {activeMitarbeiter && (
        <Pressable
          style={[styles.fab, { backgroundColor: theme.accent }]}
          onPress={() => router.push({ pathname: "/compose", params: { betrieb: activeMitarbeiter.betrieb_id, role: activeMitarbeiter.rolle_typ } })}
        >
          <Plus color="#fff" size={26} />
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
          <Text style={[styles.prioBadge, { color: m.prioritaet === "dringend" ? "#dc2626" : "#d97706" }]}>
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
          <Text style={[styles.prioBadge, { color: m.prioritaet === "dringend" ? "#dc2626" : "#d97706" }]}>
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
              {done && <Check color="#fff" size={14} />}
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
        return (
          <Pressable key={opt.id} style={styles.optRow} onPress={() => onVote(opt.id)}>
            <View style={[styles.optFill, { backgroundColor: theme.bg, width: `${pct}%` }]} />
            <View style={[styles.radio, { borderColor: theme.border }, picked && { borderColor: theme.accent }]}>
              {picked && <View style={[styles.radioDot, { backgroundColor: theme.accent }]} />}
            </View>
            <Text style={[styles.optText, { color: theme.text }]}>{opt.text}</Text>
            <Text style={[styles.optCount, { color: theme.muted }]}>{count}</Text>
          </Pressable>
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

function MockChangeRequest({ theme, t }: any) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent, borderStyle: "dashed" }]}>
      <View style={styles.cardHead}>
        <Text style={[styles.badge, { color: theme.accent }]}>{t("notifications.item.shiftSwitch")}</Text>
        <Text style={[styles.mockTag, { color: theme.muted }]}>{t("messages.mock")}</Text>
      </View>
      <Text style={[styles.cardTitle, { color: theme.text }]}>Anna — {t("messages.mockWants")}</Text>
      <Text style={[styles.cardText, { color: theme.text }]}>Evening shift · Fri 18:00–23:00</Text>
      <Text style={[styles.taskMeta, { color: theme.muted }]}>{t("messages.mockAvailable")}: Mon, Wed, Thu</Text>
      <View style={[styles.eligible, { backgroundColor: "#16a34a22" }]}>
        <Text style={{ color: "#16a34a", fontWeight: "700" }}>✓ {t("messages.mockCanTake")}</Text>
      </View>
    </View>
  );
}

const catKey = (typ: string) =>
  typ === "allgemein" ? "announcement"
    : typ === "aufgabenliste" ? "tasks"
    : typ === "umfrage" ? "polls"
    : typ === "dokument" ? "documents"
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

  docRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 4 },
  docName: { fontSize: 15 },

  eligible: { alignSelf: "flex-start", borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, marginTop: 6 },

  fab: {
    position: "absolute", right: 20, bottom: 24, width: 56, height: 56, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
});
