// src/app/_layout.tsx
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "../context/auth";
import { I18nProvider } from "../i18n/I18nProvider";
import { ThemeProvider } from "../theme/ThemeProvider";

function RootNav() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    
      <Stack.Protected guard={!!user}>
        
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="accounts"
          options={{ presentation: "modal", headerShown: true, title: "Account" }}
        />
        <Stack.Screen name="shift/[id]" options={{ presentation: "modal", headerShown: true, title: "Shift" }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <RootNav />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}