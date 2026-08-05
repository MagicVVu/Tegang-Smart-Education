import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, List, Text } from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { FlowSteps } from "../components/FlowSteps";
import { Screen } from "../components/Screen";
import { StatePanel } from "../components/StatePanel";
import { useTask } from "../hooks/useTask";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Completion">;

function formatCompletionTime(value: string) {
  const date = new Date(value);
  const pad = (part: number) => String(part).padStart(2, "0");

  return `${date.getFullYear()}年${pad(date.getMonth() + 1)}月${pad(
    date.getDate(),
  )}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function CompletionScreen({ navigation, route }: Props) {
  const { task, loading: taskLoading, error: taskError, reload } = useTask(
    route.params.taskId,
  );
  const result = useMobileStore((state) => state.result);
  const loadResult = useMobileStore((state) => state.loadAssessmentResult);
  const [resultLoading, setResultLoading] = useState(
      result?.task_id !== route.params.taskId,
  );

  useEffect(() => {
    if (result?.task_id === route.params.taskId) {
      return;
    }
    loadResult(route.params.taskId).finally(() => setResultLoading(false));
  }, [loadResult, result?.task_id, route.params.taskId]);

  if (taskLoading || resultLoading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="check-decagram-outline"
          title="正在加载完成记录"
          description="请稍候，正在同步学习与测评摘要。"
        />
      </Screen>
    );
  }

  if (!task || !result || result.task_id !== route.params.taskId) {
    return (
      <Screen>
        <StatePanel
          icon="file-question-outline"
          title="完成记录暂时无法显示"
          description={taskError ?? "尚未找到对应的学习与测评记录。"}
          actionLabel="重新加载"
          onAction={() => {
            void reload();
            void loadResult(route.params.taskId);
          }}
          secondaryLabel="返回我的培训"
          onSecondary={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Main", params: { screen: "TrainingHome" } }]
            })
          }
        />
      </Screen>
    );
  }

  const usedRemedialFlow = result.attempt > 1;

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <Button
            mode="contained"
            contentStyle={styles.button}
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Main", params: { screen: "TrainingHome" } }]
              })
            }
          >
            返回我的培训
          </Button>
          <Button
            mode="text"
            onPress={() =>
              navigation.reset({
                index: 0,
                routes: [{ name: "Main", params: { screen: "Profile" } }]
              })
            }
          >
            查看个人培训记录
          </Button>
        </View>
      }
    >
      <Card mode="contained" style={styles.heroCard}>
        <Card.Content style={styles.hero}>
          <View style={styles.iconWrap}>
            <Icon
              source="check-decagram-outline"
              size={50}
              color={colors.surface}
            />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            培训任务已完成
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            学习、测评{usedRemedialFlow ? "、补训与复测" : ""}记录已保存。
          </Text>
          <Text variant="labelMedium" style={styles.time}>
          完成时间 {formatCompletionTime(result.submitted_at)}
          </Text>
        </Card.Content>
      </Card>

      {usedRemedialFlow ? (
        <Card mode="outlined">
          <Card.Content style={styles.flowContent}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              本次闭环
            </Text>
            <FlowSteps steps={["补训", "复测", "完成"]} current={2} />
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="outlined">
        <List.Item
          title={task.name}
          description={`任务编号 ${task.id}`}
          titleNumberOfLines={2}
          left={(props) => <List.Icon {...props} icon="book-check-outline" />}
        />
        <List.Item
          title={`最终测评 ${result.score_percent} 分`}
          description={`第 ${result.attempt} 次测评达标`}
          left={(props) => (
            <List.Icon {...props} icon="clipboard-check-outline" />
          )}
        />
        <List.Item
          title="高风险知识已达标"
          description="独立判定结果已记录"
          left={(props) => (
            <List.Icon
              {...props}
              icon="shield-check-outline"
              color={colors.success}
            />
          )}
        />
        <List.Item
          title="个人学习进度 100%"
          description="全部必修内容已完成"
          left={(props) => (
            <List.Icon {...props} icon="progress-check" />
          )}
        />
      </Card>

      {usedRemedialFlow ? (
        <Card mode="contained" style={styles.remedialCard}>
          <Card.Content style={styles.remedialContent}>
            <Icon source="trending-up" size={26} color={colors.info} />
            <View style={styles.remedialCopy}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                补训与复测摘要
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                已针对未达标知识点完成补充学习，并在第 {result.attempt}{" "}
                次测评中通过。最终结果较上次
                {result.score_change_percent != null
                  ? `提高 ${Math.max(result.score_change_percent, 0)} 分`
                  : "已有改善"}
                。
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      <Card mode="contained" style={styles.noticeCard}>
        <Card.Content style={styles.notice}>
          <Icon source="information-outline" size={22} color={colors.info} />
          <Text variant="bodySmall" style={styles.noticeText}>
            本记录用于培训闭环与后续学习安排，不直接作为绩效、晋升、处罚或岗位任免结论。
          </Text>
        </Card.Content>
      </Card>

      <Text variant="bodySmall" style={styles.followup}>
        后续如有知识版本更新或新的培训要求，系统会通过消息提醒你。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.brandStrong
  },
  hero: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl
  },
  iconWrap: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 36,
    backgroundColor: colors.success
  },
  title: {
    color: colors.surface,
    fontWeight: "800",
    textAlign: "center"
  },
  subtitle: {
    color: "#D8E5ED",
    lineHeight: 22,
    textAlign: "center"
  },
  time: {
    color: "#BFD6E6"
  },
  flowContent: {
    gap: spacing.md
  },
  sectionTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  remedialCard: {
    backgroundColor: colors.infoSoft
  },
  remedialContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  remedialCopy: {
    flex: 1,
    gap: spacing.sm
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  noticeCard: {
    backgroundColor: colors.surface
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  noticeText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 19
  },
  followup: {
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: "center"
  },
  footer: {
    gap: spacing.xs
  },
  button: {
    height: 50
  }
});
