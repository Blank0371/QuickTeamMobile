// src/components/DismissKeyboard.tsx — tap anywhere outside the focused text
// field to close the keyboard. `DismissKeyboardView` wraps the whole app in the
// root layout; `Modal` is a drop-in for react-native's Modal that does the same
// inside the modal (modals get their own touch root on Android).
//
// It listens to raw touch events (not the responder system), so buttons, chips
// and scroll views keep working normally. A touch counts as a tap when it moves
// less than TAP_SLOP; after the tap settles, the keyboard is dismissed unless the
// tap landed on the focused field itself or moved focus to another field.
//
// Native only: browsers already blur an input when you tap elsewhere, and
// react-native-web doesn't implement TextInput.State, so on web this is a plain View.
import { ReactNode } from "react";
import {
  GestureResponderEvent,
  Keyboard,
  Modal as RNModal,
  ModalProps,
  Platform,
  StyleProp,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

const TAP_SLOP = 10;
const SETTLE_MS = 100;
const ENABLED = Platform.OS !== "web";

let start: { x: number; y: number } | null = null;
let pending: ReturnType<typeof setTimeout> | null = null;

function onTouchStart(e: GestureResponderEvent) {
  start = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
}

function onTouchEnd(e: GestureResponderEvent) {
  const s = start;
  start = null;
  const focused = TextInput.State.currentlyFocusedInput();
  if (!s || !focused) return;
  if (Math.abs(e.nativeEvent.pageX - s.x) > TAP_SLOP || Math.abs(e.nativeEvent.pageY - s.y) > TAP_SLOP) return;
  if ((e.target as unknown) === focused) return;

  // Nested wrappers (root + modal) both see the same touch; one timer is enough.
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    if (TextInput.State.currentlyFocusedInput() === focused) Keyboard.dismiss();
  }, SETTLE_MS);
}

export function DismissKeyboardView({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View
      style={[{ flex: 1 }, style]}
      onTouchStart={ENABLED ? onTouchStart : undefined}
      onTouchEnd={ENABLED ? onTouchEnd : undefined}
    >
      {children}
    </View>
  );
}

export function Modal({ children, ...rest }: ModalProps) {
  return (
    <RNModal {...rest}>
      <DismissKeyboardView>{children}</DismissKeyboardView>
    </RNModal>
  );
}
