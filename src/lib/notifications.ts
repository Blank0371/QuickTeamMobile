// Push registration + on-device shift reminders.
//
// Two independent mechanisms:
//   • Remote push — we register the device's Expo push token with the server
//     (push_token_speichern); the backend sends pushes for notification events,
//     respecting the per-type opt-outs. Nothing here sends remote pushes.
//   • Local reminders — scheduleShiftReminders() schedules on-device
//     notifications for the user's upcoming shifts. These fire with no network,
//     so they keep working offline.
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { supabase } from "./supabase";

// Show an alert + play a sound even when the app is foregrounded.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const ANDROID_CHANNEL = "default";

// A shift as needed for reminders (subset of the calendar's CalShift).
export type ReminderShift = {
  id: string;
  datum: string;      // YYYY-MM-DD
  start_zeit: string; // HH:MM(:SS)
  label: string | null;
  mine: boolean;
};

type ReminderCopy = {
  eveningTitle: string;   // e.g. "Shift tomorrow"
  eveningBody: (label: string, time: string) => string;
  soonTitle: string;      // e.g. "Shift soon"
  soonBody: (label: string, time: string) => string;
  shiftWord: string;      // fallback label when a shift has no name
};

const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ??
  (Constants as any)?.easConfig?.projectId;

/**
 * Ask for permission (if needed), create the Android channel, fetch the Expo
 * push token and persist it server-side. Also records the user's language so the
 * server can localize pushes. Safe to call repeatedly; no-ops on web / simulators
 * without failing. Returns the token, or null when unavailable.
 */
export async function registerForPush(mitarbeiterId: string | null, sprache: string): Promise<string | null> {
  if (Platform.OS === "web" || !Device.isDevice) return null;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: "QuickTeam",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let granted = existing.granted;
    if (!granted && existing.canAskAgain) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return null;

    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    if (!token) return null;

    await supabase.rpc("push_token_speichern", { p_token: token, p_platform: Platform.OS });
    if (mitarbeiterId) {
      await supabase.rpc("mitarbeiter_sprache_setzen", {
        p_mitarbeiter_id: mitarbeiterId,
        p_sprache: sprache,
      });
    }
    return token;
  } catch (e) {
    console.warn("[push] register failed", e);
    return null;
  }
}

const hhmm = (s: string) => (s ? s.slice(0, 5) : "");

// Parse "YYYY-MM-DD" + "HH:MM" into a local Date.
function shiftStart(datum: string, start: string): Date {
  const [y, mo, d] = datum.split("-").map(Number);
  const [h, mi] = hhmm(start).split(":").map(Number);
  return new Date(y, (mo ?? 1) - 1, d ?? 1, h ?? 0, mi ?? 0, 0, 0);
}

/**
 * Cancel every previously scheduled reminder and re-schedule from scratch for the
 * user's upcoming shifts. Idempotent: call it after each calendar load so the
 * schedule always reflects the latest roster. Does nothing (only clears) when the
 * `shiftReminder` preference is off.
 *
 *   • Evening before at 18:00 — one summary per day that has shift(s).
 *   • 2 hours before start — one per shift.
 */
export async function scheduleShiftReminders(
  shifts: ReminderShift[],
  copy: ReminderCopy,
  enabled: boolean,
): Promise<void> {
  if (Platform.OS === "web" || !Device.isDevice) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (!enabled) return;

    const now = new Date();
    const mine = shifts.filter((s) => s.mine);

    // 2h-before, per shift.
    for (const s of mine) {
      const start = shiftStart(s.datum, s.start_zeit);
      const when = new Date(start.getTime() - 2 * 60 * 60 * 1000);
      if (when > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: copy.soonTitle,
            body: copy.soonBody(s.label || copy.shiftWord, hhmm(s.start_zeit)),
            data: { typ: "shiftReminder", shift_id: s.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
        });
      }
    }

    // Evening-before summary, per day. Uses the earliest shift of that day.
    const byDay = new Map<string, ReminderShift>();
    for (const s of mine) {
      const cur = byDay.get(s.datum);
      if (!cur || hhmm(s.start_zeit) < hhmm(cur.start_zeit)) byDay.set(s.datum, s);
    }
    for (const [datum, s] of byDay) {
      const [y, mo, d] = datum.split("-").map(Number);
      const eve = new Date(y, (mo ?? 1) - 1, (d ?? 1) - 1, 18, 0, 0, 0); // 18:00 the day before
      if (eve > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: copy.eveningTitle,
            body: copy.eveningBody(s.label || copy.shiftWord, hhmm(s.start_zeit)),
            data: { typ: "shiftReminder", shift_id: s.id },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eve },
        });
      }
    }
  } catch (e) {
    console.warn("[push] schedule reminders failed", e);
  }
}
