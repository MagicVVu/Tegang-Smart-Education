import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, Text } from "react-native-paper";
import type { FormalStatus } from "@tegang/shared-utils";
import { colors, spacing } from "@tegang/design-tokens";

const blockedStates: Partial<Record<FormalStatus, { icon: string; title: string; fallback: string; action?: string }>> = {
  "TB-NEED-INPUT": { icon: "file-alert-outline", title: "任务信息待补充", fallback: "培训管理员补充完整后会重新开放。", action: "刷新状态" },
  "TB-WAIT-APPROVAL": { icon: "clock-check-outline", title: "培训要求正在确认", fallback: "确认完成后会通过消息提醒。", action: "刷新状态" },
  "TB-FAILED": { icon: "cloud-alert-outline", title: "任务内容加载失败", fallback: "学习记录不会丢失，请稍后重试。", action: "重新加载" },
  "TB-PAUSED": { icon: "pause-circle-outline", title: "任务已暂停", fallback: "恢复后会通过消息提醒。", action: "刷新状态" },
  "TB-MANUAL": { icon: "account-clock-outline", title: "已转人工处理", fallback: "培训管理员正在处理，请等待消息通知。" },
  "TB-CANCELLED": { icon: "cancel", title: "任务已取消", fallback: "该任务无需继续学习。" },
  "LR-PAUSED": { icon: "account-clock-outline", title: "学习已暂停", fallback: "请等待授权人员处理。" }
};

export function TaskStateNotice({ status, reason, onRetry }: { status: FormalStatus; reason?: string; onRetry?: () => void }) {
  const state = blockedStates[status];
  if (!state) return null;
  const isError = status === "TB-FAILED";
  return (
    <Card mode="contained" style={isError ? styles.errorCard : styles.warningCard}>
      <Card.Content style={styles.content}>
        <Icon source={state.icon} size={28} color={isError ? colors.risk : colors.warning} />
        <View style={styles.copy}>
          <Text variant="titleSmall" style={styles.title}>{state.title}</Text>
          <Text variant="bodySmall" style={styles.description}>{reason ?? state.fallback}</Text>
          {state.action && onRetry ? <Button compact mode="text" onPress={onRetry}>{state.action}</Button> : null}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  warningCard: { backgroundColor: colors.warningSoft },
  errorCard: { backgroundColor: colors.riskSoft },
  content: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  copy: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontWeight: "700" },
  description: { color: colors.textSecondary, lineHeight: 19 }
});
