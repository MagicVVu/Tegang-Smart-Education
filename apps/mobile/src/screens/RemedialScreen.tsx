import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, List, Text } from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { FlowSteps } from "../components/FlowSteps";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { useRemedialPlan } from "../hooks/useRemedialPlan";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Remedial">;

export function RemedialScreen({ navigation, route }: Props) {
  const { plan, loading, error, reload } = useRemedialPlan(
    route.params.taskId,
  );
  const task = useMobileStore((state) => state.currentTask);
  const startRemedial = useMobileStore((state) => state.startRemedial);
  const [starting, setStarting] = useState(false);

  const begin = async () => {
    if (starting) return;
    setStarting(true);
    try {
      if (task?.learning_status !== "LR-REMEDIAL") {
        await startRemedial(route.params.taskId);
      }
      navigation.replace("Learning", {
        taskId: route.params.taskId,
        remedial: true
      });
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="target"
          title="正在准备定向补训"
          description="正在根据本次测评结果生成未达标知识点安排。"
        />
      </Screen>
    );
  }

  if (!plan) {
    return (
      <Screen>
        <StatePanel
          icon="file-alert-outline"
          title="补训安排加载失败"
          description={error ?? "当前无法获取补训安排。"}
          actionLabel="重新加载"
          onAction={() => void reload()}
          secondaryLabel="返回测评结果"
          onSecondary={() => navigation.goBack()}
          tone="error"
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          mode="contained"
          loading={starting}
          disabled={starting}
          contentStyle={styles.button}
          onPress={() => void begin()}
        >
          {task?.learning_status === "LR-REMEDIAL" ? "继续补训" : "开始补训"}
        </Button>
      }
    >
      <Card mode="contained" style={styles.heroCard}>
        <Card.Content style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon source="target-account" size={38} color={colors.warning} />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={styles.title}>
              {plan.title}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {plan.reason}
            </Text>
          </View>
        </Card.Content>
      </Card>

      <SectionHeader
        title="完整路径"
        description="补训完成后自动进入复测，不会直接标记完成"
      />
      <FlowSteps steps={["补训", "复测", "完成"]} current={0} />
      <Card mode="contained" style={styles.nextStepCard}>
        <Card.Content style={styles.nextStepContent}>
          <Icon source="arrow-right-circle" size={24} color={colors.brand} />
          <Text variant="bodyMedium" style={styles.nextStepText}>
            {plan.next_step}
          </Text>
        </Card.Content>
      </Card>

      <SectionHeader
        title="为什么需要补训"
        description="依据本次测评结果和高风险独立达标规则"
      />
      <View style={styles.weakList}>
        {plan.weak_points.map((item) => (
          <Card
            key={item.knowledge_point_id}
            mode="outlined"
            style={
              item.risk_level === "high" ? styles.highRiskCard : undefined
            }
          >
            <Card.Content style={styles.weakContent}>
              <Icon
                source={
                  item.risk_level === "high"
                    ? "shield-alert-outline"
                    : "alert-circle-outline"
                }
                size={25}
                color={
                  item.risk_level === "high" ? colors.risk : colors.warning
                }
              />
              <View style={styles.weakCopy}>
                <View style={styles.weakHeading}>
                  <Text variant="titleSmall" style={styles.weakTitle}>
                    {item.knowledge_point_name}
                  </Text>
                  {item.risk_level === "high" ? (
                    <Text variant="labelSmall" style={styles.highRiskLabel}>
                      高风险
                    </Text>
                  ) : null}
                </View>
                <Text variant="bodySmall" style={styles.muted}>
                  {item.reason}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}
      </View>

      <SectionHeader title="完成要求" />
      <Card mode="outlined">
        {plan.requirements.map((requirement, index) => (
          <List.Item
            key={requirement}
            title={requirement}
            left={() => (
              <View style={styles.index}>
                <Text variant="labelLarge">{index + 1}</Text>
              </View>
            )}
          />
        ))}
      </Card>

      <Card mode="contained" style={styles.noticeCard}>
        <Card.Content style={styles.noticeContent}>
          <Icon
            source="account-clock-outline"
            color={colors.warning}
            size={23}
          />
          <Text variant="bodySmall" style={styles.notice}>
            若多次复测仍未达标，任务会暂停并转培训管理员人工处理，不会无限重复。
          </Text>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.warningSoft
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg
  },
  heroIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 29,
    backgroundColor: colors.surface
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 30
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 21
  },
  nextStepCard: {
    backgroundColor: colors.brandSoft
  },
  nextStepContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  nextStepText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21
  },
  weakList: {
    gap: spacing.md
  },
  highRiskCard: {
    borderColor: colors.risk
  },
  weakContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  weakCopy: {
    flex: 1,
    gap: spacing.sm
  },
  weakHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  weakTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: "700"
  },
  highRiskLabel: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    color: colors.risk,
    backgroundColor: colors.riskSoft
  },
  index: {
    width: 30,
    height: 30,
    margin: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.brandSoft
  },
  noticeCard: {
    backgroundColor: colors.warningSoft
  },
  noticeContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  notice: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 20
  },
  button: {
    height: 50
  }
});
