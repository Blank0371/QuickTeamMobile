// Privacy Policy + Terms & Conditions on this device. Blocking in both cases —
// take note or don't use the app (operator decision 2026-09-14):
//
// - First run (nothing noted on this device yet): both texts together.
// - A newer version than the one noted: only the changed documents.
//
// The button ("I have taken note" — matching the website, where the privacy
// policy is acknowledged, not agreed to) unlocks only after scrolling to the
// bottom; there is no other way out. Taking note of the terms here is not the
// business's acceptance of them (AGB § 13: a change binds once the customer
// agrees) — a chef accepts on the website. The privacy acknowledgement is also
// recorded server-side on entering a business (consentRecord.ts).
//
// Each version is tracked separately (CONSENT_VERSIONS), stored per device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Modal, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import {
  CONSENT_DOC_IDS, CONSENT_VERSIONS, ConsentDocId, consentStorageKey, NOTED_LANG_KEY,
} from "../lib/legal";
import { legalBody } from "../lib/legalDocs";
import { useTheme } from "../theme/ThemeProvider";

type GateState =
  | { mode: "loading" }
  | { mode: "none" }
  | { mode: "blocked"; docs: ConsentDocId[]; first: boolean };

export function LegalConsentGate() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  // "loading" = still reading storage (render nothing to avoid a flash)
  const [state, setState] = useState<GateState>({ mode: "loading" });
  const [atBottom, setAtBottom] = useState(false);

  // viewport vs content height — content that fits without scrolling should
  // unlock the button immediately.
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState(0);

  useEffect(() => {
    (async () => {
      const stored = await Promise.all(
        CONSENT_DOC_IDS.map((id) => AsyncStorage.getItem(consentStorageKey(id))),
      );
      if (stored.some((v) => v === null)) {
        return setState({ mode: "blocked", docs: [...CONSENT_DOC_IDS], first: true });
      }
      const changed = CONSENT_DOC_IDS.filter((id, i) => stored[i] !== CONSENT_VERSIONS[id]);
      setState(changed.length ? { mode: "blocked", docs: changed, first: false } : { mode: "none" });
    })();
  }, []);

  useEffect(() => {
    if (viewH > 0 && contentH > 0 && contentH <= viewH + 4) setAtBottom(true);
  }, [viewH, contentH]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 24) {
      setAtBottom(true);
    }
  };

  const markNoted = async () => {
    await Promise.all([
      ...CONSENT_DOC_IDS.map((id) => AsyncStorage.setItem(consentStorageKey(id), CONSENT_VERSIONS[id])),
      // legalBody() has German and English; every other language reads English.
      AsyncStorage.setItem(NOTED_LANG_KEY, lang === "de" ? "de" : "en"),
    ]);
    setState({ mode: "none" });
  };

  if (state.mode === "loading" || state.mode === "none") return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { /* blocking */ }}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {t(state.first ? "legal.consentTitle" : "legal.noticeTitle")}
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            {t(state.first ? "legal.consentIntro" : "legal.noticeBody")}
          </Text>

          <ScrollView
            style={[styles.body, { borderColor: theme.border, backgroundColor: theme.bg }]}
            contentContainerStyle={{ padding: 14 }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_w, h) => setContentH(h)}
          >
            {state.docs.map((id, i) => (
              <View key={id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: theme.border }]} />}
                <Text style={[styles.docHeading, { color: theme.text }]}>{t(`legal.${id}.title`)}</Text>
                <Text style={[styles.bodyText, { color: theme.text }]}>{legalBody(id, lang)}</Text>
              </View>
            ))}
          </ScrollView>

          {!atBottom && (
            <Text style={[styles.hint, { color: theme.muted }]}>{t("legal.scrollHint")}</Text>
          )}

          <Pressable
            style={[styles.agree, { backgroundColor: atBottom ? theme.accent : theme.border }]}
            onPress={markNoted}
            disabled={!atBottom}
          >
            <Text style={[styles.agreeText, { color: atBottom ? theme.accentText : theme.muted }]}>
              {t("legal.agree")}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#000000aa", justifyContent: "center", padding: 20 },
  // Definite height so the ScrollView below can fill it — a ScrollView has no
  // intrinsic height and would otherwise collapse to 0, hiding the text.
  sheet: { borderWidth: 1.5, borderRadius: 16, padding: 20, gap: 10, height: "85%" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  body: { flex: 1, borderWidth: 1.5, borderRadius: 12 },
  docHeading: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  bodyText: { fontSize: 14, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  hint: { fontSize: 13, textAlign: "center", fontStyle: "italic" },
  agree: { borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  agreeText: { fontSize: 16, fontWeight: "700" },
});
