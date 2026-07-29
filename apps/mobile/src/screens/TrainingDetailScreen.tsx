import type { NativeStackScreenProps } from "@react-navigation/native-stack";
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
import { candidatePlans, trainingTask } from "@tegang/mock-data";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusChip } from "../components/StatusChip";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TrainingDetail">;

export function TrainingDetailScreen({ navigation, route }: Props) {
  const status = useMobileStore((state) => state.taskStatus);
  const progress = useMobileStore((state) => state.progress);
  const startLearning = useMobileStore((state) => state.startLearning);
  const plan = candidatePlans[1]!;

  const nextRoute = () => {
    if (status === "assessment_failed" || status === "remedial_learning") {
      navigation.navigate("Remedial", { taskId: route.params.taskId });
      return;
    }
    if (status === "awaiting_assessment" || status === "reassessment") {
      navigation.navigate("Assessment", {
        taskId: route.params.taskId,
        reassessment: status === "reassessment"
      });
      return;
    }
    if (status === "completed") {
      navigation.navigate("Completion", { taskId: route.params.taskId });
      return;
    }
    startLearning();
    navigation.navigate("Learning", { taskId: route.params.taskId });
  };

  return (
    <Screen
      footer={
        <Button
          mode="contained"
          contentStyle={styles.footerButton}
          disabled={status === "paused" || status === "execution_failed"}
          onPress={nextRoute}
        >
          {status === "assessment_failed" || status === "remedial_learning"
            ? "进入定向补训"
            : status === "awaiting_assessment"
              ? "开始测评"
              : status === "reassessment"
                ? "开始复测"
                : status === "completed"
                  ? "查看完成结果"
                  : progress > 0
                    ? "继续学习"
                    : "开始学习"}
        </Button>
      }
    >
      <View style={styles.top}>
        <StatusChip status={status} />
        <Text variant="labelMedium" style={styles.deadline}>
          截止 2026-08-15
        </Text>
      </View>
      <Text variant="headlineSmall" style={styles.title}>
        {trainingTask.name}
      </Text>
      <Text variant="bodyMedium" style={styles.muted}>
        培训路径根据部门和当前基础形成；Agent 调整理由可以查看，但正式制度和高风险要求不能被覆盖。
      </Text>
      <Card mode="contained">
        <Card.Content style={styles.progressCard}>
          <View style={styles.progressTop}>
            <Text variant="titleSmall">个人进度</Text>
            <Text variant="titleSmall">{progress}%</Text>
          </View>
          <ProgressBar progress={progress / 100} color={colors.brand} />
          <Text variant="bodySmall" style={styles.muted}>
            当前路径：{plan.title}
          </Text>
        </Card.Content>
      </Card>
      <SectionHeader title="培训目标" />
      <Card mode="outlined">
        <Card.Content>
          <Text variant="bodyMedium" style={styles.body}>
            {trainingTask.objective}
          </Text>
        </Card.Content>
      </Card>
      <SectionHeader
        title="我的学习路径"
        description="炼钢生产部的高风险知识已前置，智信部内容不会出现在本人的路径中。"
      />
      <Card mode="outlined">
        {plan.modules
          .filter(
            (module) =>
              module.department === "全员" ||
              module.department === "炼钢生产部",
          )
          .map((module, index, visibleModules) => (
            <View key={module.id}>
              <List.Item
                title={module.title}
                description={`${module.durationMinutes} 分钟 · ${module.riskLevel === "high" ? "高风险独立达标" : "必修"}`}
                left={() => (
                  <View style={styles.index}>
                    <Text variant="labelLarge">{index + 1}</Text>
                  </View>
                )}
                right={() => (
                  <Icon
                    source={
                      module.riskLevel === "high"
                        ? "alert-outline"
                        : "check-circle-outline"
                    }
                    color={
                      module.riskLevel === "high"
                        ? colors.risk
                        : colors.brand
                    }
                    size={22}
                  />
                )}
              />
              {index < visibleModules.length - 1 ? <Divider /> : null}
            </View>
          ))}
      </Card>
      <Card style={styles.riskCard} mode="contained">
        <Card.Content style={styles.riskContent}>
          <Icon source="shield-alert-outline" color={colors.risk} size={28} />
          <View style={styles.riskCopy}>
            <Text variant="titleSmall" style={styles.riskTitle}>
              高风险知识需单独达标
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              未达标时进入针对性补训与复测；达到循环上限后转人工，不会无限重复。
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
    alignItems: "center"
  },
  deadline: { color: colors.warning },
  title: { color: colors.text, fontWeight: "800", lineHeight: 32 },
  muted: { color: colors.textSecondary, lineHeight: 20 },
  body: { color: colors.text, lineHeight: 23 },
  progressCard: { gap: spacing.md },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  index: {
    width: 32,
    height: 32,
    margin: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: colors.brandSoft
  },
  riskCard: { backgroundColor: colors.riskSoft },
  riskContent: { flexDirection: "row", gap: spacing.md },
  riskCopy: { flex: 1, gap: spacing.xs },
  riskTitle: { color: colors.risk, fontWeight: "700" },
  footerButton: { height: 50 }
});
