// Fallback (web & other platforms): plain HTML-style inputs. Native iOS/Android
// use the SwiftUI / Jetpack Compose pickers in the platform-specific files.
import { useEffect, useState } from "react";
import { TextInput } from "react-native";
import type { DateTimeFieldProps } from "./DateTimeField.ios";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function DateTimeField({ mode, value, onChange, accent, textColor }: DateTimeFieldProps) {
  const format = mode === "date" ? toDateStr : toTimeStr;
  const [text, setText] = useState(format(value));
  useEffect(() => { setText(format(value)); }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = (s: string) => {
    setText(s);
    if (mode === "date") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(s + "T00:00:00");
        if (!isNaN(d.getTime())) onChange(d);
      }
    } else if (/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) {
      const [h, m] = s.split(":").map(Number);
      const d = new Date(value);
      d.setHours(h, m, 0, 0);
      onChange(d);
    }
  };

  return (
    <TextInput
      value={text}
      onChangeText={commit}
      placeholder={mode === "date" ? "2026-08-15" : "09:00"}
      keyboardType={mode === "date" ? "default" : "numbers-and-punctuation"}
      maxLength={mode === "date" ? 10 : 5}
      autoCapitalize="none"
      placeholderTextColor={textColor ? textColor + "88" : "#8886"}
      style={{ borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, borderColor: accent ?? "#8886", color: textColor ?? "#fff" }}
    />
  );
}
