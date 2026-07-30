import { StyleSheet } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  Text
} from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";

export function StatePanel({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  loading = false,
  tone = "neutral"
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  loading?: boolean;
  tone?: "neutral" | "warning" | "error";
}) {
  const iconColor =
    tone === "error"
      ? colors.risk
      : tone === "warning"
        ? colors.warning
        : colors.brand;

  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color={iconColor} />
        ) : (
          <Icon source={icon} size={48} color={iconColor} />
        )}
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyMedium" style={styles.description}>
          {description}
        </Text>
        {actionLabel && onAction ? (
          <Button mode="contained" onPress={onAction}>
            {actionLabel}
          </Button>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <Button mode="text" onPress={onSecondary}>
            {secondaryLabel}
          </Button>
        ) : null}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface
  },
  content: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xxl
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    textAlign: "center"
  },
  description: {
    maxWidth: 300,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "center"
  }
});
