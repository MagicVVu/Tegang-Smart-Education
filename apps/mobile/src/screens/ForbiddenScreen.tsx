import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Forbidden">;

export function ForbiddenScreen({ navigation }: Props) {
  return (
    <Screen>
      <Card mode="contained">
        <Card.Content style={styles.content}>
          <Icon source="shield-lock-outline" size={64} color={colors.risk} />
          <Text variant="headlineSmall" style={styles.title}>
            无权限访问
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            员工账号无法访问管理员方案、审批、其他员工数据或开发者
            Trace。该限制同时作用于导航、页面和数据请求。
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            返回个人页面
          </Button>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xxl
  },
  title: { color: colors.text, fontWeight: "800" },
  description: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22
  }
});
