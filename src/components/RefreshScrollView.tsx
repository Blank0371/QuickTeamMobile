// src/components/RefreshScrollView.tsx — a ScrollView with built-in
// pull-to-refresh. Pass `onRefresh` (sync or async); the spinner shows while it
// runs and hides when it settles. All other ScrollView props pass through, so
// this is a drop-in replacement anywhere the app needs "pull down to refresh".
import { forwardRef, useCallback, useState } from "react";
import { RefreshControl, ScrollView, ScrollViewProps } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

type Props = ScrollViewProps & { onRefresh?: () => void | Promise<void> };

export const RefreshScrollView = forwardRef<ScrollView, Props>(({ onRefresh, children, ...rest }, ref) => {
  const { theme } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handle = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }, [onRefresh]);

  return (
    <ScrollView
      ref={ref}
      {...rest}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handle}
            tintColor={theme.muted}
            colors={[theme.accent]}
            progressBackgroundColor={theme.surface}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
});

RefreshScrollView.displayName = "RefreshScrollView";
