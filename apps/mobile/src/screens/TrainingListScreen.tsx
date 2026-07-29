import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { Button, Card, ProgressBar, SegmentedButtons, Text } from "react-native-paper";
import { trainingTask } from "@tegang/mock-data";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusChip } from "../components/StatusChip";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function TrainingListScreen() {
  const navigation = useNavigation<Navigation>();
  const status = useMobileStore((state) => state.taskStatus);
  const progress = useMobileStore((state) => state.progress);

  return (
    <Screen safeTop>
      <SectionHeader
        title="我的培训"
        description="仅显示本人任务、截止时间和下一步，不展示他人数据。"
      />
      <SegmentedButtons
        value="active"
        onValueChange={() => undefined}
        buttons={[
          { value: "active", label: "进行中" },
          { value: "todo", label: "待开始" },
          { value: "done", label: "已完成" }
        ]}
      />
      <Card mode="contained">
        <Card.Content style={styles.content}>
          <View style={styles.top}>
            <StatusChip status={status} />
            <Text variant="bodySmall" style={styles.deadline}>
              截止 2026-08-15
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.title}>
            {trainingTask.name}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            炼钢生产部新员工 · 高风险知识前置路径
          </Text>
          <ProgressBar progress={progress / 100} color={colors.brand} />
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate("TrainingDetail", {
                taskId: trainingTask.id
              })
            }
          >
            查看详情
          </Button>
        </Card.Content>
      </Card>
      <Text variant="bodySmall" style={styles.emptyHelp}>
        已完成任务会保留个人结果摘要，但不会在移动端展示完整业务报告或审批记录。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  deadline: { color: colors.warning },
  title: { color: colors.text, fontWeight: "700", lineHeight: 23 },
  muted: { color: colors.textSecondary },
  emptyHelp: { color: colors.textMuted, lineHeight: 18, textAlign: "center" }
});
