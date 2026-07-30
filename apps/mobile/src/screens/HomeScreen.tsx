import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  ProgressBar,
  Surface,
  Text
} from "react-native-paper";
import type { TrainingStatus } from "@tegang/types";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { StatusChip } from "../components/StatusChip";
import { TaskStateNotice } from "../components/TaskStateNotice";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const blockedStatuses: TrainingStatus[] = [
  "information_missing",
  "awaiting_approval",
  "execution_failed",
  "paused",
  "human_takeover",
  "cancelled"
];

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const employee = useMobileStore((state) => state.employee);
  const task = useMobileStore((state) => state.currentTask);
  const loading = useMobileStore((state) => state.trainingLoading);
  const error = useMobileStore((state) => state.trainingError);
  const loadCurrentTask = useMobileStore((state) => state.loadCurrentTask);

  useFocusEffect(
    useCallback(() => {
      void loadCurrentTask();
    }, [loadCurrentTask]),
  );

  const openNext = () => {
    if (!task) return;
    if (task.status === "learning") {
      navigation.navigate("Learning", { taskId: task.id });
      return;
    }
    if (task.status === "awaiting_assessment") {
      navigation.navigate("Assessment", { taskId: task.id });
      return;
    }
    if (
      task.status === "assessment_failed" ||
      task.status === "remedial_learning"
    ) {
      navigation.navigate("Remedial", { taskId: task.id });
      return;
    }
    if (task.status === "reassessment") {
      navigation.navigate("Assessment", {
        taskId: task.id,
        reassessment: true
      });
      return;
    }
    if (task.status === "completed") {
      navigation.navigate("Completion", { taskId: task.id });
      return;
    }
    navigation.navigate("TrainingDetail", { taskId: task.id });
  };

  if (loading && !task) {
    return (
      <Screen safeTop>
        <StatePanel
          loading
          icon="book-clock-outline"
          title="正在加载我的培训"
          description="请稍候，正在同步当前任务与学习进度。"
        />
      </Screen>
    );
  }

  if (error && !task) {
    return (
      <Screen safeTop>
        <StatePanel
          icon="cloud-alert-outline"
          title="培训任务加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={() => void loadCurrentTask()}
          tone="error"
        />
      </Screen>
    );
  }

  if (!task) {
    return (
      <Screen safeTop>
        <View style={styles.header}>
          <View>
            <Text variant="bodyMedium" style={styles.muted}>
              {employee?.department ?? "员工培训"}
            </Text>
            <Text variant="headlineSmall" style={styles.title}>
              我的培训
            </Text>
          </View>
        </View>
        <StatePanel
          icon="calendar-check-outline"
          title="当前没有待完成培训"
          description="新任务下发后会显示在这里，并通过消息提醒你。"
          actionLabel="查看全部培训"
          onAction={() => navigation.navigate("TrainingList")}
        />
      </Screen>
    );
  }

  const blocked = blockedStatuses.includes(task.status);
  const remainingMinutes = Math.max(
    0,
    Math.round(task.estimatedMinutes * (1 - task.progress / 100)),
  );

  return (
    <Screen safeTop>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="bodyMedium" style={styles.muted}>
            {employee?.displayName ?? "员工"} · {employee?.department}
          </Text>
          <Text variant="headlineSmall" style={styles.title}>
            我的培训
          </Text>
        </View>
        <Surface style={styles.avatar} elevation={0}>
          <Icon
            source="account-hard-hat-outline"
            size={25}
            color={colors.brand}
          />
        </Surface>
      </View>

      <TaskStateNotice
        status={task.status}
        reason={task.availabilityReason}
        onRetry={() => void loadCurrentTask()}
      />

      <Card style={styles.primaryCard} mode="contained">
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTop}>
            <StatusChip status={task.status} />
            <View style={styles.deadlineWrap}>
              <Icon source="clock-outline" size={16} color={colors.warning} />
              <Text variant="labelMedium" style={styles.deadline}>
                {task.deadline} 截止
              </Text>
            </View>
          </View>
          <View style={styles.taskCopy}>
            <Text variant="titleLarge" style={styles.cardTitle}>
              {task.name}
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              {task.department} · 高风险知识需单独达标
            </Text>
          </View>
          <View style={styles.progressHeading}>
            <Text variant="labelLarge">当前进度</Text>
            <Text variant="titleMedium" style={styles.progressValue}>
              {task.progress}%
            </Text>
          </View>
          <ProgressBar
            progress={task.progress / 100}
            color={colors.brand}
            style={styles.progress}
          />
          <View style={styles.progressLabels}>
            <Text variant="bodySmall" style={styles.muted}>
              {remainingMinutes > 0
                ? `预计还需 ${remainingMinutes} 分钟`
                : "学习内容已完成"}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              共 {task.estimatedMinutes} 分钟
            </Text>
          </View>
          <View style={styles.nextAction}>
            <View style={styles.nextIcon}>
              <Icon source="arrow-right" size={20} color={colors.brand} />
            </View>
            <View style={styles.nextCopy}>
              <Text variant="bodySmall" style={styles.muted}>
                下一步
              </Text>
              <Text variant="titleMedium" style={styles.nextTitle}>
                {task.nextActionLabel}
              </Text>
            </View>
          </View>
          <Button
            mode="contained"
            icon="arrow-right"
            contentStyle={styles.primaryButton}
            disabled={blocked}
            onPress={openNext}
          >
            {task.nextActionLabel}
          </Button>
          {blocked ? (
            <Button
              mode="text"
              onPress={() =>
                navigation.navigate("TrainingDetail", { taskId: task.id })
              }
            >
              查看任务说明
            </Button>
          ) : null}
        </Card.Content>
      </Card>

      <View style={styles.sectionRow}>
        <SectionHeader title="重要提醒" />
        <Button compact onPress={() => navigation.navigate("TrainingList")}>
          全部培训
        </Button>
      </View>
      <Card mode="outlined">
        <Card.Content style={styles.reminder}>
          <View style={styles.riskIcon}>
            <Icon source="shield-alert-outline" color={colors.risk} size={24} />
          </View>
          <View style={styles.reminderCopy}>
            <Text variant="titleSmall">高风险知识独立判定</Text>
            <Text variant="bodySmall" style={styles.muted}>
              即使总分达标，高风险知识未通过仍需定向补训和复测。
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Card mode="outlined">
        <Card.Content style={styles.messageRow}>
          <Icon source="bell-outline" size={22} color={colors.brand} />
          <View style={styles.messageCopy}>
            <Text variant="titleSmall">任务将在 2026-08-15 截止</Text>
            <Text variant="bodySmall" style={styles.muted}>
              请预留测评与可能的补训时间。
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  headerCopy: {
    flex: 1
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    marginTop: 2
  },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.brandSoft
  },
  primaryCard: {
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  cardContent: {
    gap: spacing.md
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  deadlineWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  deadline: {
    color: colors.warning
  },
  taskCopy: {
    gap: spacing.xs
  },
  cardTitle: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 28
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 21
  },
  progressHeading: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.sm
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
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  nextAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft
  },
  nextIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.surface
  },
  nextCopy: {
    flex: 1
  },
  nextTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  primaryButton: {
    height: 48
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  reminder: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  riskIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: colors.riskSoft
  },
  reminderCopy: {
    flex: 1,
    gap: spacing.xs
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  messageCopy: {
    flex: 1,
    gap: spacing.xs
  }
});
