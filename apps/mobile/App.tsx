import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@tegang/design-tokens";
import { RootNavigator } from "./src/navigation/RootNavigator";

const theme = {
  ...MD3LightTheme,
  roundness: 3,
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.brand,
    secondary: colors.agent,
    tertiary: colors.info,
    error: colors.risk,
    background: colors.background,
    surface: colors.surface,
    outline: colors.border,
    onSurface: colors.text,
    onSurfaceVariant: colors.textSecondary
  }
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <StatusBar style="dark" />
          <RootNavigator />
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
