// src/app/(auth)/index.tsx
import { useState } from "react";
import {
    ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View,
} from "react-native";
import Animated, {
    FadeIn, FadeOut, LinearTransition,
    useAnimatedStyle, withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";

type Tab = "host" | "employee";

export default function AuthScreen() {
  const { hostSignIn, hostSignUp, signUpWithHash } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();

  const [tab, setTab] = useState<Tab>("host");
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const slide = useAnimatedStyle(() => ({
    left: withTiming(tab === "host" ? "1%" : "50%", { duration: 250 }),
  }));

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (tab === "employee") await signUpWithHash(code);
      else if (isSignUp) await hostSignUp(email, password);
      else await hostSignIn(email, password);
    } catch (e: any) {
      setError(e.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border }];
  const T = 250; // one duration for everything

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      {/* ---- toggle (unchanged) ---- */}
      <View style={[styles.toggle, { backgroundColor: theme.surface }]}>
        <Animated.View style={[styles.highlight, { backgroundColor: theme.bg }, slide]} />
        <Pressable style={styles.half} onPress={() => switchTab("host")}>
          <Text style={[styles.tabText, { color: tab === "host" ? theme.text : theme.muted }]}>
            {t("auth.host")}
          </Text>
        </Pressable>
        <Pressable style={styles.half} onPress={() => switchTab("employee")}>
          <Text style={[styles.tabText, { color: tab === "employee" ? theme.text : theme.muted }]}>
            {t("auth.employee")}
          </Text>
        </Pressable>
      </View>

      {/* ---- morphing form ---- */}
      <Animated.View style={styles.form} layout={LinearTransition.duration(T)}>

        {/* host-only: email */}
        {tab === "host" && (
          <Animated.View
            entering={FadeIn.duration(T)}
            exiting={FadeOut.duration(T / 2)}
            layout={LinearTransition.duration(T)}
          >
            <TextInput
              style={inputStyle}
              placeholder={t("auth.email")}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </Animated.View>
        )}

        {/* host-only: password */}
        {tab === "host" && (
          <Animated.View
            entering={FadeIn.duration(T)}
            exiting={FadeOut.duration(T / 2)}
            layout={LinearTransition.duration(T)}
          >
            <TextInput
              style={inputStyle}
              placeholder={t("auth.password")}
              placeholderTextColor={theme.muted}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </Animated.View>
        )}

        {/* employee-only: code */}
        {tab === "employee" && (
          <Animated.View
            entering={FadeIn.duration(T)}
            exiting={FadeOut.duration(T / 2)}
            layout={LinearTransition.duration(T)}
          >
            <TextInput
              style={inputStyle}
              placeholder={t("auth.inviteCode")}
              placeholderTextColor={theme.muted}
              autoCapitalize="none"
              value={code}
              onChangeText={setCode}
            />
          </Animated.View>
        )}

        {error && (
          <Animated.Text
            style={styles.error}
            entering={FadeIn.duration(T)}
            exiting={FadeOut.duration(T / 2)}
            layout={LinearTransition.duration(T)}
          >
            {error}
          </Animated.Text>
        )}

        {/* shared: Enter — never unmounts, just glides to its new spot */}
        <Animated.View layout={LinearTransition.duration(T)}>
          <Pressable
            style={[styles.enter, { backgroundColor: theme.accent }]}
            onPress={submit}
            disabled={busy}
          >
            {busy ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.enterText}>{t("auth.enter")}</Text>}
          </Pressable>
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingTop: 24 },
  toggle: { flexDirection: "row", borderRadius: 999, padding: 4, position: "relative" },
  highlight: { position: "absolute", top: 4, bottom: 4, width: "49%", borderRadius: 999 },
  half: { flex: 1, paddingVertical: 12, alignItems: "center", justifyContent: "center" },
  tabText: { fontSize: 16, fontWeight: "600" },

  form: { flex: 1, justifyContent: "center", gap: 12 },

  input: {
    borderWidth: 1.5, borderRadius: 4, paddingVertical: 14,
    paddingHorizontal: 12, fontSize: 16, textAlign: "center",
  },
  enter: { borderRadius: 999, paddingVertical: 16, alignItems: "center", marginTop: 24 },
  enterText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  switch: { textAlign: "center", marginTop: 12 },
  error: { color: "#dc2626", textAlign: "center" },
});