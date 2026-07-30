import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import type { TrainingStatus } from "@tegang/types";
import { colors, spacing } from "@tegang/design-tokens";

const blockedStates: Partial<
  Record<
    TrainingStatus,
    { icon: string; title: string; fallback: string; action?: string }
  >
> = {
  information_missing: {
    icon: "file-alert-outline",
    title: "任务信息待补充",
    fallback: "培训管理员补充完整后会重新开放。",
    action: "刷新状态"
  },
  awaiting_approval: {
    icon: "clock-check-outline",
    title: "培训要求正在确认",
    fallback: "当前暂不可开始，确认完成后会通过消息提醒。",
    action: "刷新状态"
  },
  execution_failed: {
    icon: "cloud-alert-outline",
    title: "任务内容加载失败",
    fallback: "学习记录不会丢失，请稍后重试。",
    action: "重新加载"
  },
  paused: {
    icon: "pause-circle-outline",
    title: "任务已暂停",
    fallback: "相关知识版本正在确认，恢复后会通过消息提醒。",
    action: "刷新状态"
  },
  human_takeover: {
    icon: "account-clock-outline",
    title: "已转人工处理",
    fallback: "培训管理员正在处理，请等待消息通知。"
  },
  cancelled: {
    icon: "cancel",
    title: "任务已取消",
    fallback: "该任务无需继续学习，如有疑问请联系培训管理员。"
  }
};

export function TaskStateNotice({
  status,
  reason,
  onRetry
}: {
  status: TrainingStatus;
  reason?: string;
  onRetry?: () => void;
}) {
  const state = blockedStates[status];
  if (!state) return null;
  const isError = status === "execution_failed";

  return (
    <Card
      mode="contained"
      style={isError ? styles.errorCard : styles.warningCard}
    >
      <Card.Content style={styles.content}>
        <Icon
          source={state.icon}
          size={28}
          color={isError ? colors.risk : colors.warning}
        />
        <View style={styles.copy}>
          <Text variant="titleSmall" style={styles.title}>
            {state.title}
          </Text>
          <Text variant="bodySmall" style={styles.description}>
            {reason ?? state.fallback}
          </Text>
          {state.action && onRetry ? (
            <Button compact mode="text" onPress={onRetry}>
              {state.action}
            </Button>
          ) : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  warningCard: {
    backgroundColor: colors.warningSoft
  },
  errorCard: {
    backgroundColor: colors.riskSoft
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  copy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "700"
  },
  description: {
    color: colors.textSecondary,
    lineHeight: 19
  }
});
