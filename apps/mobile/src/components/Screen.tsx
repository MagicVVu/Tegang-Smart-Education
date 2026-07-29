import type { PropsWithChildren, ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@tegang/design-tokens";

interface ScreenProps {
  scroll?: boolean;
  keyboard?: boolean;
  footer?: ReactNode;
  safeTop?: boolean;
}

export function Screen({
  children,
  scroll = true,
  keyboard = false,
  footer,
  safeTop = false
}: PropsWithChildren<ScreenProps>) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, styles.fixedContent]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={safeTop ? ["top", "left", "right", "bottom"] : ["left", "right", "bottom"]}
      style={styles.safe}
    >
      <KeyboardAvoidingView
        enabled={keyboard}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        {body}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background
  },
  keyboard: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg
  },
  fixedContent: {
    flex: 1
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface
  }
});
