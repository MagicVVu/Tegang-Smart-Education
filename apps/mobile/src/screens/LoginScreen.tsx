import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Icon,
  Surface,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { useMobileStore } from "../stores/mobile-store";

export function LoginScreen() {
  const login = useMobileStore((state) => state.login);

  return (
    <View style={styles.background}>
      <View style={styles.hero}>
        <Surface style={styles.mark} elevation={0}>
          <Text variant="headlineMedium" style={styles.markText}>
            T
          </Text>
        </Surface>
        <Text variant="labelLarge" style={styles.eyebrow}>
          特钢企业员工培训
        </Text>
        <Text variant="displaySmall" style={styles.title}>
          特钢智教
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          查看个人路径、学习带引用知识、完成测评，并根据薄弱点进入定向补训。
        </Text>
        <View style={styles.chips}>
          <Chip icon="shield-check-outline">权限隔离</Chip>
          <Chip icon="book-check-outline">引用可追溯</Chip>
          <Chip icon="account-check-outline">仅本人数据</Chip>
        </View>
      </View>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.accountRow}>
            <Surface style={styles.avatar} elevation={0}>
              <Icon source="account-hard-hat-outline" size={30} color={colors.brand} />
            </Surface>
            <View style={styles.accountCopy}>
              <Text variant="titleMedium">员工 E-0231</Text>
              <Text variant="bodySmall" style={styles.muted}>
                炼钢生产部 · 新员工 · 演示账号
              </Text>
            </View>
          </View>
          <Button mode="contained" contentStyle={styles.button} onPress={login}>
            登录并查看我的培训
          </Button>
          <Text variant="bodySmall" style={styles.notice}>
            当前为本地代码型原型，所有账号和业务数据均为模拟数据。
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    justifyContent: "space-between",
    paddingTop: 72,
    paddingHorizontal: spacing.xl,
    paddingBottom: 36,
    backgroundColor: colors.brandStrong
  },
  hero: {
    gap: spacing.sm
  },
  mark: {
    width: 56,
    height: 56,
    marginBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.brand
  },
  markText: { color: colors.surface, fontWeight: "800" },
  eyebrow: { color: "#BFD6E6", letterSpacing: 1 },
  title: { color: colors.surface, fontWeight: "800" },
  subtitle: { color: "#D8E5ED", lineHeight: 26 },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  cardContent: { gap: spacing.lg },
  accountRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  avatar: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: colors.brandSoft
  },
  accountCopy: { flex: 1, gap: 2 },
  muted: { color: colors.textSecondary },
  button: { height: 50 },
  notice: { color: colors.textMuted, textAlign: "center", lineHeight: 18 }
});
