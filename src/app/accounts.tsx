import { Text, View } from "react-native";
import { useAuth } from "../context/auth";
import { useI18n } from "../i18n/I18nProvider";
import { useTheme } from "../theme/ThemeProvider";

export default function AccountsScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <View>
      <Text>Account</Text>
    </View>
  );
}

