// src/components/RefreshScrollView.tsx — a ScrollView with built-in
// pull-to-refresh. Pass `onRefresh` (sync or async); the spinner shows while it
// runs and hides when it settles. All other ScrollView props pass through, so
// this is a drop-in replacement anywhere the app needs "pull down to refresh".
// Virtualized lists (FlatList) use `useRefreshControl` for the same behaviour.
import { forwardRef, useCallback, useState } from "react";
import { RefreshControl, ScrollView, ScrollViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Props = ScrollViewProps & { onRefresh?: () => void | Promise<void> };

/** A themed RefreshControl whose spinner tracks the (async) `onRefresh`. */
export function useRefreshControl(onRefresh?: () => void | Promise<void>) {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handle = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  return onRefresh ? (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handle}
      tintColor={theme.muted}
      colors={[theme.accent]}
      progressBackgroundColor={theme.surface}
    />
  ) : undefined;
}

export const RefreshScrollView = forwardRef<ScrollView, Props>(({ onRefresh, children, ...rest }, ref) => {
  const refreshControl = useRefreshControl(onRefresh);
  return (
    <ScrollView ref={ref} {...rest} refreshControl={refreshControl}>
      {children}
    </ScrollView>
  );
});

RefreshScrollView.displayName = "RefreshScrollView";
