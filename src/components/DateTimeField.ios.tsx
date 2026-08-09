// Native iOS date / time picker (SwiftUI) — graphical calendar for dates,
// wheel ("timer"-style) for times. See @expo/ui v57 swift-ui/DatePicker.
import { DatePicker, Host } from "@expo/ui/swift-ui";
import { datePickerStyle } from "@expo/ui/swift-ui/modifiers";

export type DateTimeFieldProps = {
  mode: "date" | "time";
  value: Date;
  onChange: (d: Date) => void;
  accent?: string;
  textColor?: string;
  locale?: string;
};

export function DateTimeField({ mode, value, onChange }: DateTimeFieldProps) {
  return (
    <Host matchContents style={{ width: "100%" }}>
      <DatePicker
        selection={value}
        displayedComponents={[mode === "date" ? "date" : "hourAndMinute"]}
        onDateChange={onChange}
        modifiers={[datePickerStyle(mode === "date" ? "graphical" : "wheel")]}
      />
    </Host>
  );
}
