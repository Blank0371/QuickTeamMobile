// Hold-to-confirm button: fires onConfirm only after being held for holdMs, with
// a fill that grows left→right to show the remaining time. Releasing early cancels
// and rewinds. Used for destructive actions (Settings, connections) and for
// committing to an open shift. Colors default to the destructive red look.
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";

export function HoldButton({
  label,
  onConfirm,
  color = "#C1442D",
  fillColor = "#7A2418",
  textColor = "#EDE9E0",
  compact = false,
  holdMs = 3000,
}: {
  label: string;
  onConfirm: () => void;
  color?: string;
  fillColor?: string;
  textColor?: string;
  compact?: boolean;
  holdMs?: number;
}) {
  const progress = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const start = () => {
    progress.value = withTiming(1, { duration: holdMs }, (finished) => {
      if (finished) runOnJS(onConfirm)();
    });
  };
  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPressIn={start}
      onPressOut={cancel}
      style={[styles.btn, { backgroundColor: color }, compact && styles.btnCompact]}
      delayLongPress={holdMs}
    >
      <Animated.View pointerEvents="none" style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
      <Text style={[styles.text, { color: textColor }, compact && styles.textCompact]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 999, paddingVertical: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  btnCompact: { paddingVertical: 10, paddingHorizontal: 20, alignSelf: "flex-start" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  text: { fontSize: 16, fontWeight: "700" },
  textCompact: { fontSize: 14 },
});
