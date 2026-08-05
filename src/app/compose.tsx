// src/app/compose.tsx — chef composes a broadcast (announcement / tasks / poll)
import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, Plus, X } from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet,
    Switch, Text, TextInput, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "../i18n/I18nProvider";
import { shifts } from "../lib/shifts";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

type Cat = "allgemein" | "aufgabenliste" | "umfrage" | "aenderungswunsch";
const catKey = (c: Cat) =>
  c === "allgemein" ? "announcement"
    : c === "aufgabenliste" ? "tasks"
    : c === "umfrage" ? "polls"
    : "shiftSwitch";

export default function ComposeScreen() {
  const { betrieb, role } = useLocalSearchParams<{ betrieb: string; role: string }>();
  const { theme } = useTheme();
  const { t } = useI18n();

  // manager posts all types; employee only announcements + switch requests
  const CATS: Cat[] = role === "chef"
    ? ["allgemein", "aufgabenliste", "umfrage", "aenderungswunsch"]
    : ["allgemein", "aenderungswunsch"];

  const [cat, setCat] = useState<Cat>("allgemein");
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [items, setItems] = useState<string[]>([""]);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [anon, setAnon] = useState(false);
  const [prio, setPrio] = useState<"normal" | "wichtig" | "dringend">("normal");
  const [giveShiftId, setGiveShiftId] = useState<string | null>(null);
  const [wantDate, setWantDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // shift-swap options (mock data source)
  const today = isoDay(new Date());
  const upcomingShifts = shifts
    .filter((s) => s.date >= today)
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  const shiftDates = new Set(shifts.map((s) => s.date));
  const freeDates = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return isoDay(d);
  }).filter((d) => !shiftDates.has(d));

  const fmtDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  const shiftLabel = (id: string) => {
    const s = shifts.find((x) => x.id === id);
    return s ? `${fmtDate(s.date)} · ${s.start}–${s.end} · ${s.title}` : "";
  };

  const cleanItems = items.map((s) => s.trim()).filter(Boolean);
  const cleanOptions = options.map((s) => s.trim()).filter(Boolean);

  const TEXT_LIMIT = 500;
  const PRIO_COLOR: Record<"normal" | "wichtig" | "dringend", string> = {
    normal: "#16a34a",   // green
    wichtig: "#d97706",  // yellow/amber
    dringend: "#dc2626", // red
  };

  const canPost =
    titel.trim().length > 0 &&
    (cat !== "aufgabenliste" || cleanItems.length >= 1) &&
    (cat !== "umfrage" || cleanOptions.length >= 2) &&
    (cat !== "aenderungswunsch" || (!!giveShiftId && !!wantDate));

  const input = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }];

  const submit = async () => {
    setBusy(true); setError(null);
    // shift swap: always "important", body summarises the requested swap
    const swapText =
      cat === "aenderungswunsch" && giveShiftId && wantDate
        ? `${t("messages.swapGive")}: ${shiftLabel(giveShiftId)}\n${t("messages.swapWant")}: ${fmtDate(wantDate)}`
        : null;
    const { error: e } = await supabase.rpc("ankuendigung_erstellen", {
      p_betrieb_id: betrieb,
      p_typ: cat,
      p_titel: titel.trim(),
      p_text: cat === "aenderungswunsch" ? swapText : cat === "allgemein" ? (text.trim() || null) : null,
      p_prioritaet: cat === "aenderungswunsch" ? "wichtig" : prio,
      p_angeheftet: false,
      p_items: cat === "aufgabenliste" ? cleanItems : [],
      p_optionen: cat === "umfrage" ? cleanOptions : [],
      p_mehrfachauswahl: multi,
      p_anonym: anon,
    });
    setBusy(false);
    if (e) { setError(e.message); return; }
    router.back();
  };

  const listField = (
    values: string[], setValues: (v: string[]) => void, addLabel: string,
  ) => (
    <View style={{ gap: 8 }}>
      {values.map((v, i) => (
        <View key={i} style={styles.listRow}>
          <TextInput
            style={[...input, { flex: 1 }]}
            placeholder={`${i + 1}.`}
            placeholderTextColor={theme.muted}
            value={v}
            onChangeText={(txt) => setValues(values.map((x, j) => (j === i ? txt : x)))}
          />
          {values.length > 1 && (
            <Pressable onPress={() => setValues(values.filter((_, j) => j !== i))} hitSlop={8} style={styles.remove}>
              <X color={theme.muted} size={20} />
            </Pressable>
          )}
        </View>
      ))}
      <Pressable onPress={() => setValues([...values, ""])} style={styles.addRow} hitSlop={8}>
        <Plus color={theme.accent} size={18} />
        <Text style={{ color: theme.accent, fontWeight: "600" }}>{addLabel}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t("messages.new")}</Text>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <X color={theme.text} size={26} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* category chips */}
        <View style={styles.chips}>
          {CATS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCat(c)}
              style={[styles.chip, { borderColor: theme.border }, cat === c && { backgroundColor: theme.accent, borderColor: theme.accent }]}
            >
              <Text style={{ color: cat === c ? "#fff" : theme.text, fontWeight: "600" }}>
                {t(`notifications.item.${catKey(c)}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          style={input}
          placeholder={t("messages.titleField")}
          placeholderTextColor={theme.muted}
          value={titel}
          onChangeText={setTitel}
        />

        {cat !== "aenderungswunsch" && (<>
        <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("messages.priority")}</Text>
        <View style={styles.chips}>
          {(["normal", "wichtig", "dringend"] as const).map((p) => (
            <Pressable
              key={p}
              onPress={() => setPrio(p)}
              style={[styles.chip, { borderColor: PRIO_COLOR[p] }, prio === p && { backgroundColor: PRIO_COLOR[p] }]}
            >
              <Text style={{ color: prio === p ? "#fff" : PRIO_COLOR[p], fontWeight: "600" }}>
                {t(`messages.prio${p[0].toUpperCase()}${p.slice(1)}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        </>)}

        {cat === "aenderungswunsch" && (
          <>
            <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("messages.swapGive")}</Text>
            <Dropdown
              theme={theme}
              placeholder={t("messages.selectShift")}
              emptyLabel={t("messages.noUpcomingShifts")}
              value={giveShiftId}
              display={giveShiftId ? shiftLabel(giveShiftId) : null}
              options={upcomingShifts.map((s) => ({ value: s.id, label: shiftLabel(s.id) }))}
              onSelect={setGiveShiftId}
            />

            <Text style={[styles.fieldLabel, { color: theme.muted }]}>{t("messages.swapWant")}</Text>
            <Dropdown
              theme={theme}
              placeholder={t("messages.selectDate")}
              emptyLabel={t("messages.noFreeDates")}
              value={wantDate}
              display={wantDate ? fmtDate(wantDate) : null}
              options={freeDates.map((d) => ({ value: d, label: fmtDate(d) }))}
              onSelect={setWantDate}
            />
          </>
        )}

        {cat === "allgemein" && (
          <View style={{ gap: 4 }}>
            <TextInput
              style={[...input, styles.multiline]}
              placeholder={t("messages.textField")}
              placeholderTextColor={theme.muted}
              value={text}
              onChangeText={setText}
              maxLength={TEXT_LIMIT}
              multiline
            />
            <Text style={[styles.counter, { color: text.length >= TEXT_LIMIT ? "#dc2626" : theme.muted }]}>
              {text.length}/{TEXT_LIMIT}
            </Text>
          </View>
        )}

        {cat === "aufgabenliste" && listField(items, setItems, t("messages.addItem"))}

        {cat === "umfrage" && (
          <>
            {listField(options, setOptions, t("messages.addOption"))}
            <View style={[styles.toggleRow, { borderColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>{t("messages.multipleChoice")}</Text>
              <Switch value={multi} onValueChange={setMulti} trackColor={{ false: theme.border, true: theme.accent }} />
            </View>
            <View style={[styles.toggleRow, { borderColor: theme.border }]}>
              <Text style={[styles.toggleLabel, { color: theme.text }]}>{t("messages.anonymous")}</Text>
              <Switch value={anon} onValueChange={setAnon} trackColor={{ false: theme.border, true: theme.accent }} />
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.post, { backgroundColor: canPost ? theme.accent : theme.surface }]}
          onPress={submit}
          disabled={!canPost || busy}
        >
          {busy ? <ActivityIndicator color="#fff" />
                : <Text style={[styles.postText, { color: canPost ? "#fff" : theme.muted }]}>{t("messages.post")}</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type DropOpt = { value: string; label: string };
function Dropdown({ theme, placeholder, emptyLabel, value, display, options, onSelect }: {
  theme: any; placeholder: string; emptyLabel: string;
  value: string | null; display: string | null;
  options: DropOpt[]; onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const empty = options.length === 0;
  return (
    <>
      <Pressable
        style={[styles.input, styles.dropTrigger, { borderColor: theme.border, backgroundColor: theme.surface }]}
        onPress={() => !empty && setOpen(true)}
        disabled={empty}
      >
        <Text style={{ color: display ? theme.text : theme.muted, fontSize: 16, flex: 1 }} numberOfLines={1}>
          {empty ? emptyLabel : display ?? placeholder}
        </Text>
        {!empty && <ChevronDown color={theme.muted} size={20} />}
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.dropBackdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.dropSheet, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((o) => (
                <Pressable
                  key={o.value}
                  style={[styles.dropItem, { borderColor: theme.border }]}
                  onPress={() => { onSelect(o.value); setOpen(false); }}
                >
                  <Text style={{ color: o.value === value ? theme.accent : theme.text, fontSize: 16, fontWeight: o.value === value ? "700" : "400" }}>
                    {o.label}
                  </Text>
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  chips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  fieldLabel: { fontSize: 13, fontWeight: "600" },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 16 },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  listRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  remove: { padding: 4 },
  addRow: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  toggleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1.5, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
  },
  toggleLabel: { fontSize: 15, fontWeight: "600" },
  post: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  postText: { fontSize: 16, fontWeight: "700" },
  counter: { fontSize: 12, textAlign: "right" },
  dropTrigger: { flexDirection: "row", alignItems: "center", gap: 8 },
  dropBackdrop: { flex: 1, backgroundColor: "#00000088", alignItems: "center", justifyContent: "center", padding: 24 },
  dropSheet: { width: "100%", maxHeight: "70%", borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 4 },
  dropItem: { paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  error: { color: "#dc2626", textAlign: "center" },
});
