// Native Android date / time picker (Jetpack Compose).
// See @expo/ui v57 jetpack-compose/DateTimePicker.
import { DateTimePicker, Host } from "@expo/ui/jetpack-compose";
import type { DateTimeFieldProps } from "./DateTimeField.ios";

export function DateTimeField({ mode, value, onChange, accent }: DateTimeFieldProps) {
  return (
    <Host matchContents={{ vertical: true }} style={{ width: "100%" }}>
      <DateTimePicker
        initialDate={value.toISOString()}
        displayedComponents={mode === "date" ? "date" : "hourAndMinute"}
        variant="picker"
        is24Hour
        color={accent}
        onDateSelected={onChange}
      />
    </Host>
  );
}
