// src/app/(tabs)/_layout.tsx
import { router, Tabs } from "expo-router";
import { Briefcase, Calendar, CalendarClock, Home, ListTodo, MessageCircle, Settings } from "lucide-react-native";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { useAuth } from "../../context/auth";
import { useI18n } from "../../i18n/I18nProvider";
import { useTheme } from "../../theme/ThemeProvider";
import { registerForPush } from "../../lib/notifications";

export const unstable_settings = {
  initialRouteName: "index", // Main is the landing tab
};

export default function TabsLayout() {
  const { theme } = useTheme();
  const { t, lang } = useI18n();
  const { activeMitarbeiter } = useAuth();

  // Role of the position the user entered as -> chef sees the Manager tab.
  const isChef = activeMitarbeiter?.rolle_typ === "chef";

  // Register this device for push once we know the entered position, and record
  // the UI language so the server can localize pushes.
  useEffect(() => {
    registerForPush(activeMitarbeiter?.id ?? null, lang);
  }, [activeMitarbeiter?.id, lang]);

  // Tapping a push (or a scheduled reminder) deep-links to the relevant screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const data = resp.notification.request.content.data as any;
      if (data?.shift_id) router.push({ pathname: "/shift/[id]", params: { id: String(data.shift_id) } });
      else if (data?.benachrichtigung_id || data?.typ) router.push("/messages");
    });
    return () => sub.remove();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
        },
      }}
    >
      <Tabs.Screen
        name="messages"
        options={{
          title: t("tabs.messages"),
          tabBarIcon: ({ color, size }) => <MessageCircle color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="scheduling"
        options={{
          href: isChef ? null : "/scheduling", // employees only
          title: t("tabs.scheduling"),
          tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="todos"
        options={{
          href: null, // removed: employees no longer get a To-dos tab
          title: t("tabs.todos"),
          tabBarIcon: ({ color, size }) => <ListTodo color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="manager"
        options={{
          href: isChef ? "/manager" : null,
          title: t("tabs.manager"),
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.main"),
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t("tabs.calendar"),
          tabBarIcon: ({ color, size }) => <Calendar color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t("tabs.settings"),
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}