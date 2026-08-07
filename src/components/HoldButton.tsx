// Destructive confirm button: fires onConfirm only after being held for HOLD_MS,
// with a fill that grows left→right to show the remaining time. Releasing early
// cancels and rewinds. Shared by Settings and the connections screen.
import { Pressable, StyleSheet, Text } from "react-native";
import Animated, {
  cancelAnimation, runOnJS, useAnimatedStyle, useSharedValue, withTiming,
} from "react-native-reanimated";

const HOLD_MS = 3000;

export function HoldButton({ label, onConfirm }: { label: string; onConfirm: () => void }) {
  const progress = useSharedValue(0);
  const fillStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const start = () => {
    progress.value = withTiming(1, { duration: HOLD_MS }, (finished) => {
      if (finished) runOnJS(onConfirm)();
    });
  };
  const cancel = () => {
    cancelAnimation(progress);
    progress.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable onPressIn={start} onPressOut={cancel} style={styles.btn} delayLongPress={HOLD_MS}>
      <Animated.View pointerEvents="none" style={[styles.fill, fillStyle]} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: "#C1442D", borderRadius: 999, paddingVertical: 16,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#7A2418" },
  text: { color: "#EDE9E0", fontSize: 16, fontWeight: "700" },
});
