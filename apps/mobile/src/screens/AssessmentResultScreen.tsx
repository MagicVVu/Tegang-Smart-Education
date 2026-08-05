import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
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
import { colors, radii, spacing } from "@tegang/design-tokens";
import { FlowSteps } from "../components/FlowSteps";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentResult">;

export function AssessmentResultScreen({ navigation, route }: Props) {
  const result = useMobileStore((state) => state.result);
  const loadResult = useMobileStore((state) => state.loadAssessmentResult);
  const [loading, setLoading] = useState(!result);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (result?.task_id === route.params.taskId) {
      return;
    }
    loadResult(route.params.taskId)
      .catch((error) =>
        setLoadError(
          error instanceof Error ? error.message : "测评结果暂时无法加载。",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadResult, result?.task_id, route.params.taskId]);

  if (loading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="clipboard-pulse-outline"
          title="正在生成测评结果"
          description="正在按知识点和高风险规则完成判定。"
        />
      </Screen>
    );
  }

  if (!result || result.task_id !== route.params.taskId) {
    return (
      <Screen>
        <StatePanel
          icon="file-question-outline"
          title="暂未找到测评结果"
          description={loadError || "完成并提交测评后，结果会显示在这里。"}
          actionLabel="返回我的培训"
          onAction={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Main", params: { screen: "TrainingHome" } }]
            })
          }
        />
      </Screen>
    );
  }

  const fullyPassed = result.passed && result.high_risk_passed;
  const needsHuman = result.next_action === "human_review";
  const overallPassedButHighRiskFailed =
    result.passed && !result.high_risk_passed;
  const conclusion = fullyPassed
    ? {
        title: "本次测评已达标",
        description: "总体要求和高风险知识均已通过。",
        icon: "check-decagram-outline",
        color: colors.success
      }
    : needsHuman
      ? {
          title: "已转人工处理",
          description: "已达到复测循环上限，请等待培训管理员处理。",
          icon: "account-clock-outline",
          color: colors.warning
        }
      : overallPassedButHighRiskFailed
        ? {
            title: "高风险知识尚未达标",
            description:
              "总分已达到要求，但高风险知识未通过，仍需定向补训。",
            icon: "shield-alert-outline",
            color: colors.risk
          }
        : {
            title: "需要补充学习",
            description: "本次测评存在未达标知识点，请完成定向补训。",
            icon: "alert-circle-outline",
            color: colors.warning
          };

  const next = () => {
    if (fullyPassed) {
      navigation.replace("Completion", { taskId: route.params.taskId });
    } else if (needsHuman) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main", params: { screen: "TrainingHome" } }]
      });
    } else {
      navigation.replace("Remedial", { taskId: route.params.taskId });
    }
  };

  return (
    <Screen
      footer={
        <Button mode="contained" contentStyle={styles.button} onPress={next}>
          {fullyPassed
            ? "查看培训完成结果"
            : needsHuman
              ? "返回我的培训"
              : "进入定向补训"}
        </Button>
      }
    >
      <Card
        mode="contained"
        style={fullyPassed ? styles.passCard : styles.failCard}
      >
        <Card.Content style={styles.hero}>
          <View
            style={[
              styles.heroIcon,
              { backgroundColor: `${conclusion.color}18` }
            ]}
          >
            <Icon
              source={conclusion.icon}
              size={42}
              color={conclusion.color}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              {conclusion.title}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              {conclusion.description}
            </Text>
            <Text variant="labelMedium" style={styles.attempt}>
              第 {result.attempt} 次测评 · {result.score_percent} 分
            </Text>
          </View>
        </Card.Content>
      </Card>

      {!fullyPassed && !needsHuman ? (
        <Card mode="outlined" style={styles.ruleCard}>
          <Card.Content style={styles.ruleContent}>
            <Icon source="information-outline" size={22} color={colors.risk} />
            <Text variant="bodySmall" style={styles.ruleText}>
              即使总分达标，高风险知识未通过仍需补训。其他题目得分不能抵消高风险要求。
            </Text>
          </Card.Content>
        </Card>
      ) : null}

      {!fullyPassed && !needsHuman ? (
        <>
          <SectionHeader
            title="后续步骤"
            description="补训、复测与完成属于同一培训任务"
          />
          <FlowSteps steps={["补训", "复测", "完成"]} current={0} />
          <Text variant="bodySmall" style={styles.centerHelp}>
            复测将在补训完成后自动开放，无需返回列表寻找新任务。
          </Text>
        </>
      ) : null}

      <View style={styles.summaryRow}>
        <Card style={styles.metricCard} mode="outlined">
          <Card.Content style={styles.metricContent}>
            <Text variant="bodySmall" style={styles.muted}>
              总体结果
            </Text>
            <Text
              variant="titleLarge"
              style={result.passed ? styles.success : styles.warning}
            >
              {result.passed ? "达标" : "未达标"}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.metricCard} mode="outlined">
          <Card.Content style={styles.metricContent}>
            <Text variant="bodySmall" style={styles.muted}>
              高风险知识
            </Text>
            <Text
              variant="titleLarge"
              style={result.high_risk_passed ? styles.success : styles.risk}
            >
              {result.high_risk_passed ? "通过" : "未通过"}
            </Text>
          </Card.Content>
        </Card>
      </View>

      {result.score_change_percent != null ? (
        <Card mode="contained" style={styles.changeCard}>
          <Card.Content style={styles.changeContent}>
            <Icon source="trending-up" size={24} color={colors.info} />
            <View style={styles.changeCopy}>
              <Text variant="titleSmall">与上次相比</Text>
              <Text variant="bodySmall" style={styles.muted}>
                上次 {result.previous_score_percent} 分，本次
                {result.score_change_percent >= 0 ? "提高" : "下降"}{" "}
                {Math.abs(result.score_change_percent)} 分。
              </Text>
            </View>
          </Card.Content>
        </Card>
      ) : null}

      <SectionHeader
        title="知识点表现"
        description="结果按知识点说明，不只展示总分"
      />
      <Card mode="outlined">
        {(result.knowledge_point_performances ?? []).map((item, itemIndex) => (
          <View key={item.knowledge_point_id}>
            <List.Item
              title={item.knowledge_point_name}
              description={item.reason}
              titleNumberOfLines={2}
              descriptionNumberOfLines={3}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={
                    item.passed
                      ? "check-circle-outline"
                      : item.risk_level === "high"
                        ? "shield-alert-outline"
                        : "alert-circle-outline"
                  }
                  color={item.passed ? colors.success : colors.risk}
                />
              )}
              right={() => (
                <Text variant="labelLarge">{item.score_percent} 分</Text>
              )}
            />
            <ProgressBar
              progress={item.score_percent / 100}
              color={item.passed ? colors.success : colors.warning}
              style={styles.knowledgeBar}
            />
            {itemIndex < (result.knowledge_point_performances ?? []).length - 1 ? (
              <Divider />
            ) : null}
          </View>
        ))}
      </Card>

      {(result.wrong_answer_reasons ?? []).length ? (
        <>
          <SectionHeader
            title="错因与补训建议"
            description="只补充本次未掌握的内容"
          />
          <View style={styles.reasonList}>
            {(result.wrong_answer_reasons ?? []).map((item) => (
              <Card
                key={item.question_id}
                mode="contained"
                style={styles.reasonCard}
              >
                <Card.Content style={styles.reasonContent}>
                  <Text variant="titleSmall" style={styles.reasonTitle}>
                    {item.knowledge_point_name}
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    错因：{item.reason}
                  </Text>
                  <Text variant="bodySmall" style={styles.recommendation}>
                    建议：{item.recommendation}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      <Text variant="bodySmall" style={styles.disclaimer}>
        本次结果用于培训闭环和后续学习安排，不直接作为绩效、晋升、处罚或岗位任免结论。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  passCard: {
    backgroundColor: colors.successSoft
  },
  failCard: {
    backgroundColor: colors.warningSoft
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg
  },
  heroIcon: {
    width: 62,
    height: 62,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 31
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs
  },
  heroTitle: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 30
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 20
  },
  attempt: {
    marginTop: spacing.xs,
    color: colors.text
  },
  ruleCard: {
    borderColor: colors.risk,
    backgroundColor: colors.riskSoft
  },
  ruleContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  ruleText: {
    flex: 1,
    color: colors.risk,
    lineHeight: 19,
    fontWeight: "600"
  },
  centerHelp: {
    marginTop: -spacing.md,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: "center"
  },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.md
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.md
  },
  metricContent: {
    gap: spacing.xs
  },
  success: {
    color: colors.success,
    fontWeight: "800"
  },
  warning: {
    color: colors.warning,
    fontWeight: "800"
  },
  risk: {
    color: colors.risk,
    fontWeight: "800"
  },
  changeCard: {
    backgroundColor: colors.infoSoft
  },
  changeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  changeCopy: {
    flex: 1,
    gap: spacing.xs
  },
  knowledgeBar: {
    height: 6,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: 3
  },
  reasonList: {
    gap: spacing.md
  },
  reasonCard: {
    backgroundColor: colors.warningSoft
  },
  reasonContent: {
    gap: spacing.sm
  },
  reasonTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  recommendation: {
    color: colors.brand,
    lineHeight: 19,
    fontWeight: "600"
  },
  disclaimer: {
    padding: spacing.md,
    borderRadius: radii.md,
    color: colors.textSecondary,
    lineHeight: 19,
    textAlign: "center",
    backgroundColor: colors.surface
  },
  button: {
    height: 50
  }
});
