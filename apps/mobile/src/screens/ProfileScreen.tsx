import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  List,
  RadioButton,
  Text
} from "react-native-paper";
import type { DemoScenario } from "@tegang/types";
import { demoUsers } from "@tegang/mock-data";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { useMobileStore } from "../stores/mobile-store";
import type { MainTabParamList } from "../navigation/types";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

const scenarios: Array<{
  id: DemoScenario;
  label: string;
  description: string;
}> = [
  { id: "normal", label: "正常达标", description: "首次测评通过" },
  {
    id: "assessment_failed",
    label: "未达标与补训",
    description: "首次失败，补训后复测"
  },
  {
    id: "agent_failure",
    label: "Agent失败",
    description: "展示暂停和人工接管提示"
  }
];

export function ProfileScreen({ navigation }: Props) {
  const user = demoUsers.find((item) => item.role === "employee")!;
  const scenario = useMobileStore((state) => state.scenario);
  const setScenario = useMobileStore((state) => state.setScenario);
  const logout = useMobileStore((state) => state.logout);

  return (
    <Screen safeTop>
      <Card mode="contained">
        <Card.Content style={styles.profile}>
          <Avatar.Text label="E" size={56} />
          <View style={styles.profileCopy}>
            <Text variant="titleLarge">{user.displayName}</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {user.department} · {user.title}
            </Text>
          </View>
        </Card.Content>
      </Card>
      <Card mode="outlined">
        <List.Item
          title="个人培训记录"
          description="已完成 1 项 · 进行中 1 项"
          left={(props) => <List.Icon {...props} icon="history" />}
        />
        <Divider />
        <List.Item
          title="数据与权限"
          description="仅可查看本人培训任务、结果和消息"
          left={(props) => (
            <List.Icon {...props} icon="shield-account-outline" />
          )}
        />
        <Divider />
        <List.Item
          title="测试无权限访问"
          description="验证移动端不允许进入管理员后台"
          left={(props) => <List.Icon {...props} icon="lock-outline" />}
          right={(props) => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => navigation.getParent()?.navigate("Forbidden" as never)}
        />
      </Card>
      <Card mode="contained" style={styles.demoCard}>
        <Card.Content style={styles.demoContent}>
          <Text variant="titleMedium">演示场景切换</Text>
          <Text variant="bodySmall" style={styles.muted}>
            仅在本地演示模式出现，用于验证不同状态分支。
          </Text>
          <RadioButton.Group
            value={scenario}
            onValueChange={(value) => setScenario(value as DemoScenario)}
          >
            {scenarios.map((item) => (
              <RadioButton.Item
                key={item.id}
                value={item.id}
                label={item.label}
                accessibilityLabel={item.description}
              />
            ))}
          </RadioButton.Group>
        </Card.Content>
      </Card>
      <Button mode="outlined" textColor={colors.risk} onPress={logout}>
        退出演示账号
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  profileCopy: { flex: 1, gap: spacing.xs },
  muted: { color: colors.textSecondary, lineHeight: 19 },
  demoCard: { backgroundColor: colors.infoSoft },
  demoContent: { gap: spacing.sm }
});
