import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";

export function SectionHeader({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <View style={styles.container}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text variant="bodySmall" style={styles.description}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  title: { color: colors.text, fontWeight: "700" },
  description: { color: colors.textSecondary, lineHeight: 20 }
});
