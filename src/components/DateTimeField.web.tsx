// Web: use the browser's native date / time controls, which render a real
// calendar popover and time picker. Native iOS/Android use the SwiftUI /
// Jetpack Compose pickers in their platform-specific files.
import type { DateTimeFieldProps } from "./DateTimeField.ios";

const pad = (n: number) => String(n).padStart(2, "0");
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeStr = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function DateTimeField({ mode, value, onChange, accent, textColor, locale }: DateTimeFieldProps) {
  const isDate = mode === "date";
  // Rendered by react-dom on web; typed loosely to avoid needing DOM lib types.
  const Input: any = "input";

  const handle = (e: any) => {
    const s: string = e.target.value;
    if (!s) return;
    if (isDate) {
      const d = new Date(s + "T00:00:00");
      if (!isNaN(d.getTime())) onChange(d);
    } else {
      const [h, m] = s.split(":").map(Number);
      const d = new Date(value);
      d.setHours(h, m, 0, 0);
      onChange(d);
    }
  };

  return (
    <Input
      type={isDate ? "date" : "time"}
      // `lang` drives the displayed format of native date/time inputs
      // (e.g. de → DD.MM.YYYY, en-GB → DD/MM/YYYY). Value stays ISO.
      lang={locale || "de-DE"}
      value={isDate ? toDateStr(value) : toTimeStr(value)}
      onChange={handle}
      style={{
        border: `1.5px solid ${accent ?? "#8886"}`,
        borderRadius: 10,
        padding: "12px 14px",
        fontSize: 15,
        background: "transparent",
        color: textColor ?? "#fff",
        width: "100%",
        boxSizing: "border-box",
        colorScheme: "light dark",
      }}
    />
  );
}
