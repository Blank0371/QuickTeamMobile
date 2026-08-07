// Blocking sign-up consent for the Privacy Policy AND Terms & Conditions.
// Both are shown together and the user agrees to both at once, but each version
// is tracked separately — changing either one re-prompts on next launch.
// The "I agree" button unlocks only after scrolling to the bottom.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import {
  Modal, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, View,
} from "react-native";
import { useI18n } from "../i18n/I18nProvider";
import { CONSENT_DOC_IDS, CONSENT_VERSIONS, consentStorageKey } from "../lib/legal";
import { legalBody } from "../lib/legalDocs";
import { useTheme } from "../theme/ThemeProvider";

export function LegalConsentGate() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();

  // null = still reading storage (render nothing to avoid a flash)
  const [needsAgree, setNeedsAgree] = useState<boolean | null>(null);
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
      const need = CONSENT_DOC_IDS.some((id, i) => stored[i] !== CONSENT_VERSIONS[id]);
      setNeedsAgree(need);
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

  const accept = async () => {
    await Promise.all(
      CONSENT_DOC_IDS.map((id) => AsyncStorage.setItem(consentStorageKey(id), CONSENT_VERSIONS[id])),
    );
    setNeedsAgree(false);
  };

  if (!needsAgree) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => { /* blocking */ }}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t("legal.consentTitle")}</Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>{t("legal.consentUpdated")}</Text>

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
            onPress={accept}
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
