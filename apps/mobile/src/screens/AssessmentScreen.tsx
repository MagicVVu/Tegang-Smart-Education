import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationAction } from "@react-navigation/native";
import { StackActions, usePreventRemove } from "@react-navigation/native";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Dialog,
  Icon,
  Portal,
  ProgressBar,
  RadioButton,
  Snackbar,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { FlowSteps } from "../components/FlowSteps";
import { Screen } from "../components/Screen";
import { StatePanel } from "../components/StatePanel";
import { useAssessmentSession } from "../hooks/useAssessmentSession";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Assessment">;

export function AssessmentScreen({ navigation, route }: Props) {
  const attempt = useMobileStore((state) => state.assessmentAttempt);
  const {
    questions,
    answers,
    loading,
    submitting,
    saveState,
    error,
    answeredCount,
    choose,
    submit,
    reload,
    clearError
  } = useAssessmentSession(route.params.taskId, attempt);
  const [index, setIndex] = useState(0);
  const [leaveVisible, setLeaveVisible] = useState(false);
  const [submitVisible, setSubmitVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const [allowLeave, setAllowLeave] = useState(false);

  usePreventRemove(!allowLeave, ({ data }) => {
    setPendingAction(data.action);
    setLeaveVisible(true);
  });

  useEffect(() => {
    if (allowLeave && pendingAction) {
      navigation.dispatch(pendingAction);
    }
  }, [allowLeave, navigation, pendingAction]);

  const submitAssessment = async () => {
    setSubmitVisible(false);
    const result = await submit();
    if (result) {
      setPendingAction(
        StackActions.replace("AssessmentResult", {
          taskId: route.params.taskId
        }),
      );
      setAllowLeave(true);
    }
  };

  if (loading) {
    return (
      <Screen>
        <StatePanel
          loading
          icon="clipboard-text-outline"
          title="正在加载测评"
          description="请稍候，正在同步题目与已保存答案。"
        />
      </Screen>
    );
  }

  const current = questions[index];
  if (!current) {
    return (
      <Screen>
        <StatePanel
          icon="file-alert-outline"
          title="测评题目加载失败"
          description={error ?? "当前没有可用题目。"}
          actionLabel="重新加载"
          onAction={() => void reload()}
          secondaryLabel="返回培训"
          onSecondary={() => {
            setPendingAction(StackActions.pop(1));
            setAllowLeave(true);
          }}
          tone="error"
        />
      </Screen>
    );
  }

  const selected = answers[current.id] ?? [];
  const isLast = index === questions.length - 1;
  const saveLabel =
    saveState === "saving"
      ? "正在保存"
      : saveState === "synced"
        ? "答案已保存"
        : saveState === "local"
          ? "断网保存在本机"
          : "开始作答后自动保存";

  return (
    <>
      <Screen
        footer={
          <View style={styles.footer}>
            <Button
              mode="outlined"
              disabled={index === 0 || submitting}
              onPress={() => setIndex((value) => Math.max(value - 1, 0))}
            >
              上一题
            </Button>
            <Button
              mode="contained"
              loading={submitting}
              disabled={!selected.length || submitting}
              onPress={
                isLast
                  ? () => {
                      if (answeredCount < questions.length) {
                        clearError();
                      }
                      setSubmitVisible(true);
                    }
                  : () =>
                      setIndex((value) =>
                        Math.min(value + 1, questions.length - 1),
                      )
              }
            >
              {isLast ? "检查并提交" : "下一题"}
            </Button>
          </View>
        }
      >
        {route.params.reassessment ? (
          <>
            <FlowSteps steps={["补训", "复测", "完成"]} current={1} />
            <Banner visible icon="shield-check-outline" style={styles.banner}>
              第 {attempt} 次测评。复测仍按相同达标规则执行，高风险知识需单独通过。
            </Banner>
          </>
        ) : (
          <Banner visible icon="shield-check-outline" style={styles.banner}>
            共 {questions.length} 题，预计 10 分钟。高风险知识点单独判定，不以总分替代。
          </Banner>
        )}

        <View style={styles.progressRow}>
          <View>
            <Text variant="labelLarge">
              题目 {index + 1} / {questions.length}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              已答 {answeredCount} 题
            </Text>
          </View>
          <View style={styles.saveState}>
            <Icon
              source={
                saveState === "local" ? "cloud-off-outline" : "cloud-check-outline"
              }
              size={17}
              color={
                saveState === "local" ? colors.warning : colors.success
              }
            />
            <Text
              variant="bodySmall"
              style={
                saveState === "local" ? styles.offlineText : styles.savedText
              }
            >
              {saveLabel}
            </Text>
          </View>
        </View>
        <ProgressBar
          progress={(index + 1) / questions.length}
          color={colors.brand}
          style={styles.progress}
        />

        <View style={styles.numberGrid}>
          {questions.map((question, questionIndex) => {
            const answered = Boolean(answers[question.id]?.length);
            return (
              <Button
                key={question.id}
                compact
                mode={questionIndex === index ? "contained" : "outlined"}
                icon={answered ? "check" : undefined}
                onPress={() => setIndex(questionIndex)}
                style={styles.numberButton}
              >
                {questionIndex + 1}
              </Button>
            );
          })}
        </View>

        <Card mode="contained" style={styles.questionCard}>
          <Card.Content style={styles.question}>
            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={styles.knowledge}>
                {current.knowledge_point_name}
              </Text>
              <View
                style={
                  current.risk_level === "high"
                    ? styles.highRiskBadge
                    : styles.mediumRiskBadge
                }
              >
                <Text
                  variant="labelSmall"
                  style={
                    current.risk_level === "high"
                      ? styles.highRisk
                      : styles.mediumRisk
                  }
                >
                  {current.risk_level === "high"
                    ? "高风险知识"
                    : "一般知识"}
                </Text>
              </View>
            </View>
            <Text variant="titleLarge" style={styles.prompt}>
              {current.prompt}
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              {current.question_type === "multiple" ? "可选择多个答案" : "请选择一个答案"}
            </Text>
            <View style={styles.options}>
              {current.options.map((option, optionIndex) =>
                current.question_type === "multiple" ? (
                  <Checkbox.Item
                    key={option}
                    label={option}
                    status={
                      selected.includes(optionIndex) ? "checked" : "unchecked"
                    }
                    onPress={() => void choose(current, optionIndex)}
                    position="leading"
                    style={[
                      styles.option,
                      selected.includes(optionIndex) && styles.optionSelected
                    ]}
                    labelStyle={styles.optionLabel}
                  />
                ) : (
                  <RadioButton.Item
                    key={option}
                    label={option}
                    value={String(optionIndex)}
                    status={
                      selected.includes(optionIndex) ? "checked" : "unchecked"
                    }
                    onPress={() => void choose(current, optionIndex)}
                    position="leading"
                    style={[
                      styles.option,
                      selected.includes(optionIndex) && styles.optionSelected
                    ]}
                    labelStyle={styles.optionLabel}
                  />
                ),
              )}
            </View>
          </Card.Content>
        </Card>

        <Text variant="bodySmall" style={styles.hint}>
          离开前会进行确认；未提交答案会保留，提交后本次作答不可修改。
        </Text>
      </Screen>

      <Portal>
        <Dialog
          visible={leaveVisible}
          onDismiss={() => setLeaveVisible(false)}
        >
          <Dialog.Title>暂时离开测评？</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium">
              已作答内容会保留，但本次测评尚未提交。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setLeaveVisible(false)}>继续作答</Button>
            <Button
              onPress={() => {
                setLeaveVisible(false);
                setAllowLeave(true);
              }}
            >
              确认离开
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog
          visible={submitVisible}
          onDismiss={() => setSubmitVisible(false)}
        >
          <Dialog.Title>确认提交测评？</Dialog.Title>
          <Dialog.Content style={styles.dialogContent}>
            <Text variant="bodyMedium">
              已完成 {answeredCount} / {questions.length} 题。
            </Text>
            {answeredCount < questions.length ? (
              <Text variant="bodyMedium" style={styles.dialogWarning}>
                还有 {questions.length - answeredCount} 道题未完成，请返回作答。
              </Text>
            ) : (
              <Text variant="bodyMedium" style={styles.muted}>
                提交后本次答案不可修改，系统将按知识点生成结果。
              </Text>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSubmitVisible(false)}>返回检查</Button>
            <Button
              disabled={answeredCount < questions.length || submitting}
              onPress={() => void submitAssessment()}
            >
              确认提交
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={Boolean(error) && questions.length > 0}
        action={{ label: "知道了", onPress: clearError }}
        onDismiss={clearError}
        duration={3200}
      >
        {error}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md
  },
  banner: {
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  saveState: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  savedText: {
    color: colors.success
  },
  offlineText: {
    color: colors.warning
  },
  progress: {
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brandSoft
  },
  numberGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  numberButton: {
    minWidth: 58
  },
  questionCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  question: {
    gap: spacing.lg
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  knowledge: {
    flex: 1,
    color: colors.brand
  },
  highRiskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.riskSoft
  },
  mediumRiskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.warningSoft
  },
  highRisk: {
    color: colors.risk,
    fontWeight: "700"
  },
  mediumRisk: {
    color: colors.warning,
    fontWeight: "700"
  },
  prompt: {
    color: colors.text,
    fontWeight: "700",
    lineHeight: 30
  },
  options: {
    gap: spacing.sm
  },
  option: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md
  },
  optionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft
  },
  optionLabel: {
    color: colors.text,
    lineHeight: 21
  },
  hint: {
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: "center"
  },
  dialogContent: {
    gap: spacing.md
  },
  dialogWarning: {
    color: colors.risk,
    lineHeight: 21
  }
});
