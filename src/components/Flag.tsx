// src/components/Flag.tsx — render a flag emoji cross-platform.
// Native (iOS/Android) renders the emoji glyph directly. Web falls back to a
// Twemoji PNG because Windows/Chrome ships no flag-emoji font and would
// otherwise show the raw regional-indicator letters (e.g. "GB", "DE").
import { Image, Platform, StyleProp, Text, TextStyle } from "react-native";

// "🇬🇧" -> "1f1ec-1f1e7" (Twemoji asset filename)
const codepoints = (emoji: string) =>
  Array.from(emoji).map((c) => c.codePointAt(0)!.toString(16)).join("-");

const TWEMOJI = (emoji: string) =>
  `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/${codepoints(emoji)}.png`;

export function Flag({ emoji, size = 22, style }: { emoji: string; size?: number; style?: StyleProp<TextStyle> }) {
  if (Platform.OS === "web") {
    return (
      <Image
        source={{ uri: TWEMOJI(emoji) }}
        style={{ width: size, height: size }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }
  return <Text style={[{ fontSize: size }, style]}>{emoji}</Text>;
}
