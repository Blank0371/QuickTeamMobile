import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useI18n } from "../../i18n/I18nProvider";
import { businessSettings, mockShifts } from "../../mock/shifts";
import { useTheme } from "../../theme/ThemeProvider";

export default function ShiftDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { t } = useI18n();
  const shift = mockShifts.find((s) => s.id === id);

  if (!shift) {
    return <View style={[styles.screen, { backgroundColor: theme.bg }]}><Text style={{ color: theme.text }}>Not found</Text></View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{shift.title}</Text>
      <Row label={t("calendar.time")} value={`${shift.start} – ${shift.end}`} />
      <Row label={t("calendar.date")} value={shift.date} />
      {businessSettings.showCoworkers && shift.coworkers.length > 0 && (
        <Row label={t("calendar.coworkers")} value={shift.coworkers.join(", ")} />
      )}
      {shift.comment ? <Row label={t("calendar.comment")} value={shift.comment} /> : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
      <Text style={[styles.value, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 8 },
  row: { gap: 2 },
  label: { fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 },
  value: { fontSize: 17 },
});