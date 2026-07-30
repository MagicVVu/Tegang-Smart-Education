import { StyleSheet, View } from "react-native";
import { Icon, Text } from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";

export function FlowSteps({
  steps,
  current
}: {
  steps: string[];
  current: number;
}) {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      {steps.map((step, index) => {
        const completed = index < current;
        const active = index === current;
        return (
          <View key={step} style={styles.step}>
            <View
              style={[
                styles.circle,
                (completed || active) && styles.circleActive
              ]}
            >
              {completed ? (
                <Icon source="check" size={15} color={colors.surface} />
              ) : (
                <Text
                  variant="labelSmall"
                  style={active ? styles.numberActive : styles.number}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              variant="labelSmall"
              style={[styles.label, active && styles.labelActive]}
            >
              {step}
            </Text>
            {index < steps.length - 1 ? (
              <View
                style={[
                  styles.line,
                  completed ? styles.lineActive : undefined
                ]}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingVertical: spacing.sm
  },
  step: {
    position: "relative",
    flex: 1,
    alignItems: "center",
    gap: spacing.xs
  },
  circle: {
    zIndex: 1,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface
  },
  circleActive: {
    borderColor: colors.brand,
    backgroundColor: colors.brand
  },
  number: {
    color: colors.textSecondary
  },
  numberActive: {
    color: colors.surface,
    fontWeight: "700"
  },
  label: {
    color: colors.textSecondary,
    textAlign: "center"
  },
  labelActive: {
    color: colors.brand,
    fontWeight: "700"
  },
  line: {
    position: "absolute",
    top: 13,
    left: "65%",
    width: "70%",
    height: 2,
    backgroundColor: colors.border
  },
  lineActive: {
    backgroundColor: colors.brand
  }
});
