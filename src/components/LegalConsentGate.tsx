// Privacy Policy + Terms & Conditions on this device, in two forms:
//
// - First run (nothing noted on this device yet): blocking. Both texts are
//   shown together; the button ("I have taken note" — matching the website,
//   where the privacy policy is acknowledged, not agreed to) unlocks only after
//   scrolling to the bottom.
// - A newer version than the one noted: a notice, not a block. It names the
//   changed documents, links to them on quickteam.at and closes with one tap.
//   Mirrors the website since 2026-09-13: AGB § 13(2)-(3) make a change
//   binding only once the customer agrees, and silence is not agreement, so a
//   new version must not lock anyone out. The contract itself (and its proof)
//   is concluded by the business on the website, not here.
//
// Each version is tracked separately (CONSENT_VERSIONS), stored per device.
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useState } from "react";
import {
  Modal, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import {
  CONSENT_DOC_IDS, CONSENT_VERSIONS, ConsentDocId, consentStorageKey, legalWebsiteUrl,
} from "../lib/legal";
import { legalBody } from "../lib/legalDocs";
import { useTheme } from "../theme/ThemeProvider";

type GateState =
  | { mode: "loading" }
  | { mode: "none" }
  | { mode: "first" }
  | { mode: "notice"; changed: ConsentDocId[] };

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
      if (stored.some((v) => v === null)) return setState({ mode: "first" });
      const changed = CONSENT_DOC_IDS.filter((id, i) => stored[i] !== CONSENT_VERSIONS[id]);
      setState(changed.length ? { mode: "notice", changed } : { mode: "none" });
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
    await Promise.all(
      CONSENT_DOC_IDS.map((id) => AsyncStorage.setItem(consentStorageKey(id), CONSENT_VERSIONS[id])),
    );
    setState({ mode: "none" });
  };

  if (state.mode === "loading" || state.mode === "none") return null;

  if (state.mode === "notice") {
    return (
      <Modal visible transparent animationType="fade" onRequestClose={markNoted}>
        <View style={styles.backdrop}>
          <View style={[styles.noticeCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.title, { color: theme.text }]}>{t("legal.noticeTitle")}</Text>
            <Text style={[styles.subtitle, { color: theme.muted }]}>{t("legal.noticeBody")}</Text>
            {state.changed.map((id) => (
              <Pressable
                key={id}
                style={[styles.docRow, { borderColor: theme.border, backgroundColor: theme.bg }]}
                onPress={() => WebBrowser.openBrowserAsync(legalWebsiteUrl(id, lang))}
              >
                <Text style={[styles.docRowText, { color: theme.text }]}>{t(`legal.${id}.title`)}</Text>
                <Text style={[styles.docRowText, { color: theme.muted }]}>›</Text>
              </Pressable>
            ))}
            <Pressable style={[styles.agree, { backgroundColor: theme.accent }]} onPress={markNoted}>
              <Text style={[styles.agreeText, { color: theme.accentText }]}>{t("legal.noticeDismiss")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { /* blocking */ }}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t("legal.consentTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{t("legal.consentIntro")}</Text>

          <ScrollView
            style={[styles.body, { borderColor: theme.border, backgroundColor: theme.bg }]}
            contentContainerStyle={{ padding: 14 }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
            onContentSizeChange={(_w, h) => setContentH(h)}
          >
            <Text style={[styles.docHeading, { color: theme.text }]}>{t("legal.privacy.title")}</Text>
            <Text style={[styles.bodyText, { color: theme.text }]}>{legalBody("privacy", lang)}</Text>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Text style={[styles.docHeading, { color: theme.text }]}>{t("legal.terms.title")}</Text>
            <Text style={[styles.bodyText, { color: theme.text }]}>{legalBody("terms", lang)}</Text>
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
  noticeCard: { borderWidth: 1.5, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14 },
  body: { flex: 1, borderWidth: 1.5, borderRadius: 12 },
  docHeading: { fontSize: 16, fontWeight: "800", marginBottom: 6 },
  bodyText: { fontSize: 14, lineHeight: 20 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 18 },
  docRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16,
  },
  docRowText: { fontSize: 16, fontWeight: "600" },
  hint: { fontSize: 13, textAlign: "center", fontStyle: "italic" },
  agree: { borderRadius: 999, paddingVertical: 15, alignItems: "center" },
  agreeText: { fontSize: 16, fontWeight: "700" },
});
