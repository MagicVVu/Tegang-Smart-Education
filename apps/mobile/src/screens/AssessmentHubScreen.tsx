import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback } from "react";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, List, Text } from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { useAssessmentResults } from "../hooks/useAssessmentResults";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function AssessmentHubScreen() {
  const navigation = useNavigation<Navigation>();
  const task = useMobileStore((state) => state.currentTask);
  const { results, loading, error, reload } = useAssessmentResults();

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const openCurrent = () => {
    if (!task) return;
    if (task.status === "awaiting_assessment") {
      navigation.navigate("Assessment", { taskId: task.id });
    } else if (
      task.status === "assessment_failed" ||
      task.status === "remedial_learning"
    ) {
      navigation.navigate("Remedial", { taskId: task.id });
    } else if (task.status === "reassessment") {
      navigation.navigate("Assessment", {
        taskId: task.id,
        reassessment: true
      });
    } else {
      const currentResult = results.find((item) => item.taskId === task.id);
      if (currentResult) {
        navigation.navigate("AssessmentResult", { taskId: task.id });
      } else {
        navigation.navigate("TrainingDetail", { taskId: task.id });
      }
    }
  };

  const hasAssessmentAction =
    task &&
    [
      "awaiting_assessment",
      "assessment_failed",
      "remedial_learning",
      "reassessment"
    ].includes(task.status);

  return (
    <Screen safeTop>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          测评与结果
        </Text>
        <Text variant="bodyMedium" style={styles.muted}>
          查看待完成测评、知识点表现与后续安排
        </Text>
      </View>

      {hasAssessmentAction ? (
        <Card mode="contained" style={styles.actionCard}>
          <Card.Content style={styles.actionContent}>
            <View style={styles.actionHeading}>
              <View style={styles.actionIcon}>
                <Icon
                  source={
                    task.status === "reassessment"
                      ? "clipboard-text-clock-outline"
                      : task.status === "awaiting_assessment"
                        ? "clipboard-text-outline"
                        : "target-account"
                  }
                  size={27}
                  color={colors.brand}
                />
              </View>
              <View style={styles.actionCopy}>
                <Text variant="labelMedium" style={styles.eyebrow}>
                  当前待办
                </Text>
                <Text variant="titleMedium" style={styles.actionTitle}>
                  {task.nextActionLabel}
                </Text>
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={styles.muted}
                >
                  {task.name}
                </Text>
              </View>
            </View>
            <Button mode="contained" onPress={openCurrent}>
              {task.nextActionLabel}
            </Button>
          </Card.Content>
        </Card>
      ) : (
        <Card mode="outlined">
          <Card.Content style={styles.noAction}>
            <Icon
              source="clipboard-check-outline"
              size={24}
              color={colors.success}
            />
            <View style={styles.noActionCopy}>
              <Text variant="titleSmall">当前没有待完成测评</Text>
              <Text variant="bodySmall" style={styles.muted}>
                学习内容完成后，测评入口会在这里开放。
              </Text>
            </View>
          </Card.Content>
        </Card>
      )}

      <SectionHeader
        title="个人测评记录"
        description="结果按知识点与高风险要求说明"
      />
      {loading ? (
        <StatePanel
          loading
          icon="clipboard-pulse-outline"
          title="正在加载测评记录"
          description="请稍候，正在同步最新结果。"
        />
      ) : error ? (
        <StatePanel
          icon="cloud-alert-outline"
          title="测评记录加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={() => void reload()}
          tone="error"
        />
      ) : results.length === 0 ? (
        <StatePanel
          icon="clipboard-text-outline"
          title="暂无测评记录"
          description="完成首次测评后，会在这里看到结果和下一步。"
        />
      ) : (
        <Card mode="outlined">
          {results.map((result) => {
            const fullyPassed = result.passed && result.highRiskPassed;
            return (
              <List.Item
                key={result.id}
                title={result.taskId === task?.id ? task.name : "生产区域基础制度与行为规范"}
                description={`第 ${result.attempt} 次 · ${result.score} 分 · ${
                  fullyPassed
                    ? "已达标"
                    : result.nextAction === "human_review"
                      ? "人工处理中"
                      : "需补充学习"
                }`}
                titleNumberOfLines={2}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      fullyPassed
                        ? "check-circle-outline"
                        : "alert-circle-outline"
                    }
                    color={fullyPassed ? colors.success : colors.warning}
                  />
                )}
                right={(props) => (
                  <List.Icon {...props} icon="chevron-right" />
                )}
                onPress={() =>
                  navigation.navigate("AssessmentResult", {
                    taskId: result.taskId
                  })
                }
              />
            );
          })}
        </Card>
      )}

      <Card mode="contained" style={styles.noticeCard}>
        <Card.Content style={styles.notice}>
          <Icon source="shield-check-outline" size={22} color={colors.info} />
          <Text variant="bodySmall" style={styles.noticeText}>
            单次测评结果仅用于培训闭环与学习安排，不直接形成绩效或人事结论。
          </Text>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "800"
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  actionCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft
  },
  actionContent: {
    gap: spacing.md
  },
  actionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  actionIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 25,
    backgroundColor: colors.surface
  },
  actionCopy: {
    flex: 1,
    gap: spacing.xs
  },
  eyebrow: {
    color: colors.brand,
    fontWeight: "700"
  },
  actionTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  noAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  noActionCopy: {
    flex: 1,
    gap: spacing.xs
  },
  noticeCard: {
    backgroundColor: colors.infoSoft
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
  }
});
