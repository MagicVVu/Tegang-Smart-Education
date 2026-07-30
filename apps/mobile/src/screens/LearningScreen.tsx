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
  Snackbar,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { FlowSteps } from "../components/FlowSteps";
import { KnowledgeCitationModal } from "../components/KnowledgeCitationModal";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { useCourse } from "../hooks/useCourse";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Learning">;

export function LearningScreen({ navigation, route }: Props) {
  const isRemedial = Boolean(route.params.remedial);
  const {
    course,
    loading,
    saving,
    error,
    savedMessage,
    reload,
    completeCurrentUnit,
    finish,
    clearSavedMessage
  } = useCourse(route.params.taskId, isRemedial);
  const task = useMobileStore((state) => state.currentTask);
  const [citationVisible, setCitationVisible] = useState(false);

  const goNext = async () => {
    if (!course) return;
    const isLast = course.currentUnitIndex >= course.units.length - 1;
    if (!isLast) {
      await completeCurrentUnit();
      return;
    }
    if (await finish()) {
      navigation.replace("Assessment", {
        taskId: route.params.taskId,
        reassessment: isRemedial
      });
    }
  };

  if (loading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="book-open-page-variant-outline"
          title="正在加载课程"
          description="请稍候，正在同步课程内容和上次学习位置。"
        />
      </Screen>
    );
  }

  if (!course) {
    return (
      <Screen>
        <StatePanel
          icon="file-alert-outline"
          title="课程内容加载失败"
          description={error ?? "课程内容暂时不可用。"}
          actionLabel="重新加载"
          onAction={() => void reload()}
          secondaryLabel="返回任务"
          onSecondary={() => navigation.goBack()}
          tone="error"
        />
      </Screen>
    );
  }

  const currentUnit = course.units[course.currentUnitIndex];
  if (!currentUnit) {
    return (
      <Screen>
        <StatePanel
          icon="file-question-outline"
          title="未找到当前学习单元"
          description="请返回培训任务后重新进入。"
          actionLabel="返回任务"
          onAction={() => navigation.goBack()}
        />
      </Screen>
    );
  }

  const isLast = course.currentUnitIndex >= course.units.length - 1;
  const progress =
    task?.id === route.params.taskId
      ? task.progress
      : Math.round(
          ((course.currentUnitIndex + 1) / course.units.length) * 100,
        );

  return (
    <>
      <Screen
        footer={
          <Button
            mode="contained"
            loading={saving}
            disabled={saving}
            contentStyle={styles.footerButton}
            onPress={() => void goNext()}
          >
            {isLast
              ? isRemedial
                ? "完成补训并进入复测"
                : "完成学习并进入测评"
              : "完成本节并继续"}
          </Button>
        }
      >
        {isRemedial ? (
          <Card style={styles.remedialBanner} mode="contained">
            <Card.Content style={styles.bannerContent}>
              <Icon source="target-account" color={colors.warning} size={28} />
              <View style={styles.bannerCopy}>
                <Text variant="titleSmall" style={styles.remedialTitle}>
                  正在进行定向补训
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  只补充未达标知识点；完成后将在本任务内直接进入复测。
                </Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        {isRemedial ? (
          <FlowSteps steps={["补训", "复测", "完成"]} current={0} />
        ) : null}

        <View style={styles.progressTop}>
          <View style={styles.progressCopy}>
            <Text variant="labelLarge">
              {isRemedial ? "补训进度" : "课程进度"}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              第 {course.currentUnitIndex + 1} / {course.units.length} 节
            </Text>
          </View>
          <Text variant="titleMedium" style={styles.progressValue}>
            {progress}%
          </Text>
        </View>
        <ProgressBar
          progress={progress / 100}
          color={colors.brand}
          style={styles.progress}
        />

        <Card mode="outlined">
          <List.Accordion
            title="课程目录"
            description={`当前：${currentUnit.title}`}
            left={(props) => <List.Icon {...props} icon="format-list-numbered" />}
          >
            {course.units.map((unit, index) => (
              <List.Item
                key={unit.id}
                title={`${index + 1}. ${unit.title}`}
                description={`${unit.durationMinutes} 分钟${
                  unit.riskLevel === "high" ? " · 高风险知识" : ""
                }`}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      index < course.currentUnitIndex || unit.completed
                        ? "check-circle-outline"
                        : index === course.currentUnitIndex
                          ? "play-circle-outline"
                          : "circle-outline"
                    }
                    color={
                      index === course.currentUnitIndex
                        ? colors.brand
                        : undefined
                    }
                  />
                )}
              />
            ))}
          </List.Accordion>
        </Card>

        {error ? (
          <Card mode="contained" style={styles.saveError}>
            <Card.Content style={styles.saveErrorContent}>
              <Icon source="cloud-alert-outline" size={22} color={colors.risk} />
              <View style={styles.saveErrorCopy}>
                <Text variant="titleSmall">进度保存失败</Text>
                <Text variant="bodySmall" style={styles.muted}>
                  {error} 当前页面会保留你的学习位置。
                </Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <SectionHeader
          title={currentUnit.title}
          description={`${currentUnit.eyebrow} · 内容版本 ${course.contentVersion}`}
        />
        <Card mode="contained" style={styles.articleCard}>
          <Card.Content style={styles.article}>
            <Text variant="titleLarge" style={styles.articleTitle}>
              {currentUnit.heading}
            </Text>
            {currentUnit.paragraphs.map((paragraph) => (
              <Text key={paragraph} variant="bodyLarge" style={styles.body}>
                {paragraph}
              </Text>
            ))}
            <Divider />
            <Text variant="titleMedium" style={styles.subheading}>
              必须掌握
            </Text>
            <View style={styles.keyPoints}>
              {currentUnit.keyPoints.map((point) => (
                <View key={point} style={styles.keyPoint}>
                  <Icon
                    source="check-circle-outline"
                    size={19}
                    color={colors.success}
                  />
                  <Text variant="bodyMedium" style={styles.keyPointText}>
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>

        {currentUnit.riskLevel === "high" ? (
          <Card style={styles.riskCard} mode="contained">
            <Card.Content style={styles.riskContent}>
              <Icon
                source="shield-alert-outline"
                color={colors.risk}
                size={26}
              />
              <View style={styles.riskCopy}>
                <Text variant="titleSmall" style={styles.riskTitle}>
                  高风险知识提醒
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  本知识点需要在测评中单独达标。现场条件无法确认时，请停止操作并转人工确认。
                </Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <Card style={styles.caseCard} mode="outlined">
          <Card.Content style={styles.caseContent}>
            <Text variant="labelLarge" style={styles.caseLabel}>
              场景理解
            </Text>
            <Text variant="bodyMedium" style={styles.body}>
              {currentUnit.scenarioQuestion}
            </Text>
            <View style={styles.answerRow}>
              <Icon
                source="check-circle"
                color={colors.success}
                size={20}
              />
              <Text variant="bodyMedium" style={styles.answerText}>
                {currentUnit.scenarioAnswer}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <Card mode="outlined">
          <List.Item
            title="查看知识来源"
            description="文档、章节、版本、适用范围与现行状态"
            left={(props) => (
              <List.Icon {...props} icon="file-search-outline" />
            )}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setCitationVisible(true)}
          />
        </Card>

        <Button
          mode="outlined"
          icon="message-processing-outline"
          onPress={() =>
            navigation.navigate("Tutor", { taskId: route.params.taskId })
          }
        >
          向智能辅导提问
        </Button>
      </Screen>
      <KnowledgeCitationModal
        visible={citationVisible}
        citationIds={currentUnit.citationIds}
        onDismiss={() => setCitationVisible(false)}
      />
      <Snackbar
        visible={Boolean(savedMessage)}
        onDismiss={clearSavedMessage}
        duration={1800}
      >
        {savedMessage}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  remedialBanner: {
    backgroundColor: colors.warningSoft
  },
  bannerContent: {
    flexDirection: "row",
    gap: spacing.md
  },
  bannerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  remedialTitle: {
    color: colors.warning,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  progressTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  progressCopy: {
    gap: 2
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
  saveError: {
    backgroundColor: colors.riskSoft
  },
  saveErrorContent: {
    flexDirection: "row",
    gap: spacing.md
  },
  saveErrorCopy: {
    flex: 1,
    gap: spacing.xs
  },
  articleCard: {
    backgroundColor: colors.surface
  },
  article: {
    gap: spacing.lg
  },
  articleTitle: {
    color: colors.text,
    fontWeight: "800",
    lineHeight: 29
  },
  subheading: {
    color: colors.text,
    fontWeight: "700"
  },
  body: {
    color: colors.text,
    lineHeight: 24
  },
  keyPoints: {
    gap: spacing.md
  },
  keyPoint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  keyPointText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21
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
  caseCard: {
    borderRadius: radii.md,
    backgroundColor: colors.infoSoft
  },
  caseContent: {
    gap: spacing.md
  },
  caseLabel: {
    color: colors.info,
    fontWeight: "700"
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.sm,
    backgroundColor: colors.surface
  },
  answerText: {
    flex: 1,
    color: colors.text,
    lineHeight: 21
  },
  footerButton: {
    height: 50
  }
});
