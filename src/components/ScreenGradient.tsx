// Subtle top→bottom brand wash: a hint of green fading into the base background.
// Renders as a single GPU-composited layer behind screen content (absolute fill).
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

export function ScreenGradient() {
  const { theme } = useTheme();
  return (
    <LinearGradient
      colors={theme.gradient}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
    />
  );
}
