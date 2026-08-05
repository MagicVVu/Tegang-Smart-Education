import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  Icon,
  List,
  ProgressBar,
  Text
} from "react-native-paper";
import type { ContractTrainingTaskStatus } from "@tegang/types";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { StatusChip } from "../components/StatusChip";
import { TaskStateNotice } from "../components/TaskStateNotice";
import { useCourse } from "../hooks/useCourse";
import { useTask } from "../hooks/useTask";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TrainingDetail">;

const blockedStatuses: ContractTrainingTaskStatus[] = [
  "TB-NEED-INPUT", "TB-WAIT-APPROVAL", "TB-FAILED", "TB-PAUSED", "TB-MANUAL", "TB-CANCELLED"
];

export function TrainingDetailScreen({ navigation, route }: Props) {
  const { task, loading, error, reload } = useTask(route.params.taskId);
  const {
    course,
    loading: courseLoading,
    error: courseError,
    reload: reloadCourse
  } = useCourse(route.params.taskId, false);
  const startLearning = useMobileStore((state) => state.startLearning);
  const [starting, setStarting] = useState(false);

  const next = async () => {
    if (!task || starting) return;
    if (
      task.learning_status === "LR-NOT-MET" ||
      task.learning_status === "LR-REMEDIAL"
    ) {
      navigation.navigate("Remedial", { taskId: task.id });
      return;
    }
    if (task.learning_status === "LR-WAIT-ASSESSMENT") {
      navigation.navigate("Assessment", { taskId: task.id });
      return;
    }
    if (task.learning_status === "LR-RETESTING") {
      navigation.navigate("Assessment", {
        taskId: task.id,
        reassessment: true
      });
      return;
    }
    if (task.learning_status === "LR-COMPLETED") {
      navigation.navigate("Completion", { taskId: task.id });
      return;
    }
    setStarting(true);
    try {
      if (task.learning_status !== "LR-LEARNING") {
        await startLearning(task.id);
      }
      navigation.navigate("Learning", { taskId: task.id });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="book-clock-outline"
          title="正在加载任务详情"
          description="请稍候，正在同步培训要求和学习路径。"
        />
      </Screen>
    );
  }

  if (error || !task) {
    return (
      <Screen>
        <StatePanel
          icon="cloud-alert-outline"
          title="任务详情加载失败"
          description={error ?? "未找到该培训任务。"}
          actionLabel="重新加载"
          onAction={() => void reload()}
          tone="error"
        />
      </Screen>
    );
  }

  const blocked = blockedStatuses.includes(task.task_status);

  return (
    <Screen
      footer={
        <Button
          mode="contained"
          loading={starting}
          disabled={blocked || starting}
          contentStyle={styles.footerButton}
          onPress={() => void next()}
        >
          {task.next_action_label}
        </Button>
      }
    >
      <View style={styles.top}>
        <StatusChip status={blocked ? task.task_status : task.learning_status} />
        <View style={styles.deadlineRow}>
          <Icon source="clock-outline" size={16} color={colors.warning} />
          <Text variant="labelMedium" style={styles.deadline}>
            {task.deadline} 截止
          </Text>
        </View>
      </View>
      <View style={styles.heading}>
        <Text variant="headlineSmall" style={styles.title}>
          {task.name}
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          适用：{task.audience_label}
        </Text>
      </View>

      <TaskStateNotice
        status={task.task_status}
        reason={task.availability_reason ?? undefined}
        onRetry={() => {
          void reload();
          void reloadCourse();
        }}
      />

      <Card mode="contained" style={styles.summaryCard}>
        <Card.Content style={styles.summary}>
          <View style={styles.progressTop}>
            <Text variant="titleSmall">个人进度</Text>
            <Text variant="titleMedium" style={styles.progressValue}>
              {task.progress_percent}%
            </Text>
          </View>
          <ProgressBar
            progress={task.progress_percent / 100}
            color={colors.brand}
            style={styles.progress}
          />
          <View style={styles.nextRow}>
            <View style={styles.nextCopy}>
              <Text variant="bodySmall" style={styles.muted}>
                当前下一步
              </Text>
              <Text variant="titleMedium" style={styles.nextTitle}>
                {task.next_action_label}
              </Text>
            </View>
            <Button
              compact
              mode="contained-tonal"
              disabled={blocked}
              onPress={() => void next()}
            >
              去完成
            </Button>
          </View>
        </Card.Content>
      </Card>

      <SectionHeader title="培训目标" />
      <Text variant="bodyMedium" style={styles.body}>
        {task.objective}
      </Text>

      <SectionHeader title="完成要求" />
      <Card mode="outlined">
        <List.Item
          title="完成全部必修内容"
          description={`预计学习 ${task.estimated_minutes} 分钟，进度自动保存`}
          left={(props) => (
            <List.Icon {...props} icon="book-check-outline" />
          )}
        />
        <Divider />
        <List.Item
          title="完成培训测评"
          description="所有题目作答后提交，结果按知识点说明"
          left={(props) => (
            <List.Icon {...props} icon="clipboard-check-outline" />
          )}
        />
        <Divider />
        <List.Item
          title="高风险知识单独达标"
          description="未达标时需完成定向补训和复测"
          left={(props) => (
            <List.Icon
              {...props}
              icon="shield-alert-outline"
              color={colors.risk}
            />
          )}
        />
      </Card>

      <SectionHeader
        title="学习路径"
        description="学习顺序已按部门和风险要求安排"
      />
      {courseLoading ? (
        <Card mode="outlined">
          <Card.Content style={styles.loadingRow}>
            <Icon source="timer-sand" size={20} color={colors.brand} />
            <Text variant="bodyMedium">正在加载课程目录…</Text>
          </Card.Content>
        </Card>
      ) : courseError || !course ? (
        <Card mode="contained" style={styles.courseError}>
          <Card.Content style={styles.courseErrorContent}>
            <Text variant="titleSmall">课程目录暂时无法加载</Text>
            <Text variant="bodySmall" style={styles.muted}>
              {courseError}
            </Text>
            <Button compact onPress={() => void reloadCourse()}>
              重新加载
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card mode="outlined">
          {course.units.map((unit, index) => (
            <View key={unit.id}>
              <List.Item
                title={unit.title}
                description={`${unit.duration_minutes} 分钟 · ${
                  unit.risk_level === "high" ? "高风险知识" : "必修"
                }`}
                left={() => (
                  <View style={styles.index}>
                    <Text variant="labelLarge">{index + 1}</Text>
                  </View>
                )}
                right={() => (
                  <Icon
                    source={
                      unit.risk_level === "high"
                        ? "shield-alert-outline"
                        : "book-outline"
                    }
                    color={
                      unit.risk_level === "high" ? colors.risk : colors.brand
                    }
                    size={22}
                  />
                )}
              />
              {index < course.units.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.riskCard} mode="contained">
        <Card.Content style={styles.riskContent}>
          <Icon source="shield-alert-outline" color={colors.risk} size={28} />
          <View style={styles.riskCopy}>
            <Text variant="titleSmall" style={styles.riskTitle}>
              高风险知识提醒
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              即使总分达标，高风险知识未通过仍需补训；多次复测未达标时会转人工处理。
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  deadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  deadline: {
    color: colors.warning
  },
  heading: {
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 32
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 20
  },
  body: {
    color: colors.text,
    lineHeight: 23
  },
  summaryCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  summary: {
    gap: spacing.md
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressValue: {
    color: colors.brand,
    fontWeight: "800"
  },
  progress: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brandSoft
  },
  nextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border
  },
  nextCopy: {
    flex: 1,
    gap: 2
  },
  nextTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  courseError: {
    backgroundColor: colors.riskSoft
  },
  courseErrorContent: {
    gap: spacing.sm
  },
  index: {
    width: 32,
    height: 32,
    margin: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.brandSoft
  },
  riskCard: {
    backgroundColor: colors.riskSoft
  },
  riskContent: {
    flexDirection: "row",
    gap: spacing.md
  },
  riskCopy: {
    flex: 1,
    gap: spacing.xs
  },
  riskTitle: {
    color: colors.risk,
    fontWeight: "700"
  },
  footerButton: {
    height: 50
  }
});
