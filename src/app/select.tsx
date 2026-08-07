// src/app/select.tsx — pick which business to enter after signing in
import { RefreshCw } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator, Pressable,
  StyleSheet, Text, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HoldButton } from "../components/HoldButton";
import { useAuth } from "../context/auth";
import { useI18n } from "../i18n/I18nProvider";
import { supabase } from "../lib/supabase";
import { useTheme } from "../theme/ThemeProvider";
import { ScreenGradient } from "../components/ScreenGradient";
import { RefreshScrollView } from "../components/RefreshScrollView";

type Invite = {
  mitarbeiter_id: string;
  betrieb_id: string;
  betrieb_name: string;
  rolle_typ: string;
};
// One active position (mitarbeiter row). A person may hold several in the same
// business, so each is its own entry keyed by the mitarbeiter id.
type Membership = {
  id: string;
  betrieb_id: string;
  betrieb_name: string;
  rolle_typ: string;
  name: string;
};

export default function SelectBusinessScreen() {
  const { enterApp, signOut, user } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [joined, setJoined] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const [inv, mem] = await Promise.all([
      supabase.rpc("meine_einladungen"),
      supabase
        .from("mitarbeiter")
        .select("id, rolle_typ, betrieb_id, vorname, nachname, betriebe(name)")
        .eq("auth_id", user?.id ?? "")
        .eq("status", "aktiv")
        .is("anonymisiert_am", null),
    ]);
    if (inv.error || mem.error) {
      setError(inv.error?.message ?? mem.error?.message ?? t("select.loadError"));
    } else {
      setInvites((inv.data ?? []) as Invite[]);
      const memberships: Membership[] = (mem.data ?? []).map((r: any) => ({
        id: r.id,
        betrieb_id: r.betrieb_id,
        betrieb_name: r.betriebe?.name ?? "",
        rolle_typ: r.rolle_typ,
        name: `${r.vorname ?? ""} ${r.nachname ?? ""}`.trim(),
      }));
      memberships.sort((a, b) => a.betrieb_name.localeCompare(b.betrieb_name));
      setJoined(memberships);
    }
    setLoading(false);
  }, [t, user?.id]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const accept = async (invite: Invite) => {
    setAccepting(invite.mitarbeiter_id);
    setError(null);
    const { error: e } = await supabase.rpc("einladung_annehmen", {
      p_mitarbeiter_id: invite.mitarbeiter_id,
    });
    if (e) {
      setError(e.message);   // keep the error — load() would clear it
    } else {
      await load();
    }
    setAccepting(null);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.screen, styles.center, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </SafeAreaView>
    );
  }

  const isEmpty = invites.length === 0 && joined.length === 0;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScreenGradient />
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>{t("select.title")}</Text>
      </View>
      <Text style={[styles.email, { color: theme.muted }]}>{user?.email}</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {isEmpty ? (
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>{t("select.empty")}</Text>
          <Text style={[styles.emptyHint, { color: theme.muted }]}>{t("select.emptyHint")}</Text>
        </View>
      ) : (
        <RefreshScrollView
          contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
          onRefresh={load}
        >
          {joined.length > 0 && (
            <Text style={[styles.section, { color: theme.muted }]}>{t("select.joined")}</Text>
          )}
          {joined.map((m) => (
            <Pressable
              key={m.id}
              onPress={() => enterApp({ id: m.id, betrieb_id: m.betrieb_id, rolle_typ: m.rolle_typ })}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{m.betrieb_name}</Text>
                <Text style={[styles.cardSub, { color: theme.muted }]}>
                  {t(`select.role.${m.rolle_typ}`)}{m.name ? ` · ${m.name}` : ""}
                </Text>
              </View>
              <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>
            </Pressable>
          ))}

          {invites.length > 0 && (
            <Text style={[styles.section, { color: theme.muted, marginTop: joined.length ? 12 : 0 }]}>
              {t("select.invites")}
            </Text>
          )}
          {invites.map((inv) => (
            <View
              key={inv.mitarbeiter_id}
              style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{inv.betrieb_name}</Text>
                <Text style={[styles.cardSub, { color: theme.muted }]}>
                  {t(`select.role.${inv.rolle_typ}`)}
                </Text>
              </View>
              <Pressable
                onPress={() => accept(inv)}
                disabled={accepting != null}
                style={[styles.acceptBtn, { backgroundColor: theme.accent, opacity: accepting != null ? 0.6 : 1 }]}
              >
                {accepting === inv.mitarbeiter_id
                  ? <ActivityIndicator size="small" color={theme.accentText} />
                  : <Text style={[styles.acceptText, { color: theme.accentText }]}>{t("select.accept")}</Text>}
              </Pressable>
            </View>
          ))}
        </RefreshScrollView>
      )}

      <Pressable
        style={[styles.refreshBar, { backgroundColor: theme.accent }]}
        onPress={refresh}
        disabled={refreshing}
      >
        {refreshing ? (
          <ActivityIndicator color={theme.accentText} />
        ) : (
          <View style={styles.refreshBarInner}>
            <RefreshCw size={18} color={theme.accentText} />
            <Text style={[styles.refreshBarText, { color: theme.accentText }]}>{t("select.refresh")}</Text>
          </View>
        )}
      </Pressable>

      <View style={styles.danger}>
        <HoldButton label={t("select.signOut")} onConfirm={() => { signOut(); }} />
        <Text style={[styles.holdHint, { color: theme.muted }]}>{t("settings.holdToConfirm")}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  center: { alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 24, fontWeight: "700" },
  danger: { marginTop: 12, gap: 10 },
  holdHint: { fontSize: 13, textAlign: "center" },
  email: { fontSize: 14, marginTop: 2, marginBottom: 16 },
  section: { fontSize: 13, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1.5, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16,
  },
  cardTitle: { fontSize: 17, fontWeight: "600", flex: 1 },
  cardSub: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: "700" },
  acceptBtn: { borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  acceptText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  emptyTitle: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  emptyHint: { fontSize: 14, textAlign: "center", marginTop: 8, paddingHorizontal: 24 },
  refreshBar: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 8 },
  refreshBarInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  refreshBarText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  error: { color: "#C1442D", textAlign: "center", marginBottom: 8 },
});
