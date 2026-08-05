import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  ProgressBar,
  SegmentedButtons,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { StatusChip } from "../components/StatusChip";
import { useMobileStore } from "../stores/mobile-store";
import type { ContractTrainingTaskView, EmployeeTaskFilter } from "../services";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TrainingList">;

const filterLabels: Record<
  EmployeeTaskFilter,
  { label: string; emptyTitle: string; emptyDescription: string }
> = {
  active: {
    label: "进行中",
    emptyTitle: "没有进行中的培训",
    emptyDescription: "待开始或正在学习的任务会显示在这里。"
  },
  waiting: {
    label: "待处理",
    emptyTitle: "没有待处理事项",
    emptyDescription: "待测评、补训、复测或暂停任务会显示在这里。"
  },
  completed: {
    label: "已完成",
    emptyTitle: "暂无完成记录",
    emptyDescription: "完成学习与测评后，记录会保留在这里。"
  }
};

export function TrainingListScreen({ navigation }: Props) {
  const tasks = useMobileStore((state) => state.tasks);
  const filter = useMobileStore((state) => state.taskFilter);
  const loading = useMobileStore((state) => state.trainingLoading);
  const error = useMobileStore((state) => state.trainingError);
  const loadTasks = useMobileStore((state) => state.loadTasks);

  useEffect(() => {
    void loadTasks(filter);
  }, [filter, loadTasks]);

  const openTask = (task: ContractTrainingTaskView) => {
    if (task.learning_status === "LR-WAIT-ASSESSMENT") {
      navigation.navigate("Assessment", { taskId: task.id });
    } else if (
      task.learning_status === "LR-NOT-MET" ||
      task.learning_status === "LR-REMEDIAL"
    ) {
      navigation.navigate("Remedial", { taskId: task.id });
    } else if (task.learning_status === "LR-RETESTING") {
      navigation.navigate("Assessment", {
        taskId: task.id,
        reassessment: true
      });
    } else if (task.learning_status === "LR-COMPLETED") {
      navigation.navigate("Completion", { taskId: task.id });
    } else if (task.learning_status === "LR-LEARNING") {
      navigation.navigate("Learning", { taskId: task.id });
    } else {
      navigation.navigate("TrainingDetail", { taskId: task.id });
    }
  };

  return (
    <Screen>
      <SectionHeader
        title="全部培训"
        description="按当前阶段查看本人任务与下一步操作"
      />
      <SegmentedButtons
        value={filter}
        onValueChange={(value) =>
          void loadTasks(value as EmployeeTaskFilter)
        }
        buttons={(
          Object.entries(filterLabels) as Array<
            [EmployeeTaskFilter, (typeof filterLabels)[EmployeeTaskFilter]]
          >
        ).map(([value, item]) => ({
          value,
          label: item.label
        }))}
      />

      {loading ? (
        <StatePanel
          loading
          icon="book-clock-outline"
          title="正在加载培训任务"
          description="请稍候，正在同步最新状态。"
        />
      ) : error ? (
        <StatePanel
          icon="cloud-alert-outline"
          title="培训列表加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={() => void loadTasks(filter)}
          tone="error"
        />
      ) : tasks.length === 0 ? (
        <StatePanel
          icon="text-box-check-outline"
          title={filterLabels[filter].emptyTitle}
          description={filterLabels[filter].emptyDescription}
        />
      ) : (
        <View style={styles.list}>
          {tasks.map((task) => (
            <Card key={task.id} mode="contained" style={styles.card}>
              <Card.Content style={styles.content}>
                <View style={styles.top}>
                  <StatusChip status={task.learning_status} />
                  <View style={styles.deadlineRow}>
                    <Icon
                      source="clock-outline"
                      size={15}
                      color={colors.warning}
                    />
                    <Text variant="bodySmall" style={styles.deadline}>
                      {task.deadline} 截止
                    </Text>
                  </View>
                </View>
                <View style={styles.copy}>
                  <Text variant="titleMedium" style={styles.title}>
                    {task.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {task.audience_label} · 预计 {task.estimated_minutes} 分钟
                  </Text>
                </View>
                {task.risk_level === "high" ? (
                  <View style={styles.riskRow}>
                    <Icon
                      source="shield-alert-outline"
                      size={18}
                      color={colors.risk}
                    />
                    <Text variant="bodySmall" style={styles.riskText}>
                      含高风险知识，需单独达标
                    </Text>
                  </View>
                ) : null}
                <View style={styles.progressRow}>
                  <ProgressBar
                    progress={task.progress_percent / 100}
                    color={colors.brand}
                    style={styles.progress}
                  />
                  <Text variant="labelMedium">{task.progress_percent}%</Text>
                </View>
                {task.availability_reason ? (
                  <Text variant="bodySmall" style={styles.reason}>
                    {task.availability_reason}
                  </Text>
                ) : null}
                <Button mode="contained" onPress={() => openTask(task)}>
                  {task.next_action_label}
                </Button>
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
      <Text variant="bodySmall" style={styles.privacy}>
        这里只显示当前账号的培训任务和个人进度。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  content: {
    gap: spacing.md
  },
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
  copy: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 23
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  riskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  riskText: {
    color: colors.risk,
    fontWeight: "600"
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  progress: {
    flex: 1,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandSoft
  },
  reason: {
    padding: spacing.md,
    borderRadius: radii.sm,
    color: colors.textSecondary,
    lineHeight: 19,
    backgroundColor: colors.warningSoft
  },
  privacy: {
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: "center"
  }
});
