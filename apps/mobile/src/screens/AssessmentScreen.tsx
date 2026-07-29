import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { NavigationAction } from "@react-navigation/native";
import { StackActions, usePreventRemove } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import {
  Banner,
  Button,
  Card,
  Checkbox,
  Dialog,
  Portal,
  ProgressBar,
  RadioButton,
  Snackbar,
  Text
} from "react-native-paper";
import type { AssessmentQuestion } from "@tegang/types";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { mobileServices } from "../services";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Assessment">;

export function AssessmentScreen({ navigation, route }: Props) {
  const attempt = useMobileStore((state) => state.assessmentAttempt);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const [preventLeave, setPreventLeave] = useState(true);

  useEffect(() => {
    mobileServices.assessment
      .getQuestions(route.params.taskId)
      .then((response) => setQuestions(response.data))
      .catch(() => setError("题目加载失败，请检查网络后重试。"))
      .finally(() => setLoading(false));
  }, [route.params.taskId]);

  usePreventRemove(preventLeave, ({ data }) => {
    setPendingAction(data.action);
    setConfirmVisible(true);
  });

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setPendingAction(
          StackActions.replace("Main", {
            screen: "Home"
          }),
        );
        setConfirmVisible(true);
        return true;
      },
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!preventLeave && pendingAction) {
      navigation.dispatch(pendingAction);
    }
  }, [navigation, pendingAction, preventLeave]);

  const current = questions[index];
  const answeredCount = useMemo(
    () => questions.filter((question) => answers[question.id]?.length).length,
    [answers, questions],
  );

  const choose = (optionIndex: number) => {
    if (!current) return;
    setAnswers((existing) => {
      const selected = existing[current.id] ?? [];
      if (current.type === "multiple") {
        return {
          ...existing,
          [current.id]: selected.includes(optionIndex)
            ? selected.filter((item) => item !== optionIndex)
            : [...selected, optionIndex]
        };
      }
      return { ...existing, [current.id]: [optionIndex] };
    });
  };

  const submit = async () => {
    if (answeredCount < questions.length) {
      setError(`还有 ${questions.length - answeredCount} 道题未完成。`);
      return;
    }
    setSubmitting(true);
    try {
      await mobileServices.assessment.submit(
        route.params.taskId,
        answers,
        attempt,
      );
      setPendingAction(
        StackActions.replace("AssessmentResult", {
          taskId: route.params.taskId
        }),
      );
      setPreventLeave(false);
    } catch {
      setError("提交失败，答案已保存在本机，可直接重试。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !current) {
    return (
      <Screen>
        <Text variant="titleMedium">正在加载测评题目…</Text>
        <ProgressBar indeterminate color={colors.brand} />
      </Screen>
    );
  }

  const selected = answers[current.id] ?? [];
  const isLast = index === questions.length - 1;

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
              disabled={!selected.length}
              onPress={
                isLast
                  ? submit
                  : () =>
                      setIndex((value) =>
                        Math.min(value + 1, questions.length - 1),
                      )
              }
            >
              {isLast ? "提交测评" : "下一题"}
            </Button>
          </View>
        }
      >
        <Banner visible icon="shield-check-outline">
          {route.params.reassessment
            ? `第 ${attempt} 次测评：复测仍按正式达标规则执行。`
            : "高风险知识点单独判定，不以总分替代。"}
        </Banner>
        <View style={styles.progressRow}>
          <Text variant="labelLarge">
            题目 {index + 1} / {questions.length}
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            已答 {answeredCount} 题
          </Text>
        </View>
        <ProgressBar
          progress={(index + 1) / questions.length}
          color={colors.brand}
        />
        <Card mode="contained">
          <Card.Content style={styles.question}>
            <View style={styles.metaRow}>
              <Text variant="labelLarge" style={styles.knowledge}>
                {current.knowledgePoint}
              </Text>
              <Text
                variant="labelMedium"
                style={
                  current.riskLevel === "high"
                    ? styles.highRisk
                    : styles.mediumRisk
                }
              >
                {current.riskLevel === "high" ? "高风险知识" : "一般知识"}
              </Text>
            </View>
            <Text variant="titleLarge" style={styles.prompt}>
              {current.prompt}
            </Text>
            <View>
              {current.options.map((option, optionIndex) =>
                current.type === "multiple" ? (
                  <Checkbox.Item
                    key={option}
                    label={option}
                    status={
                      selected.includes(optionIndex) ? "checked" : "unchecked"
                    }
                    onPress={() => choose(optionIndex)}
                    position="leading"
                    style={styles.option}
                  />
                ) : (
                  <RadioButton.Item
                    key={option}
                    label={option}
                    value={String(optionIndex)}
                    status={
                      selected.includes(optionIndex) ? "checked" : "unchecked"
                    }
                    onPress={() => choose(optionIndex)}
                    position="leading"
                    style={styles.option}
                  />
                ),
              )}
            </View>
          </Card.Content>
        </Card>
        <Text variant="bodySmall" style={styles.hint}>
          离开页面前会提醒；已作答内容保留在当前演示会话中。
        </Text>
      </Screen>
      <Portal>
        <Dialog
          visible={confirmVisible}
          onDismiss={() => setConfirmVisible(false)}
        >
          <Dialog.Title>暂时离开测评？</Dialog.Title>
          <Dialog.Content>
            <Text>当前答案会保留，但测评尚未提交。</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmVisible(false)}>继续作答</Button>
            <Button
              onPress={() => {
                setConfirmVisible(false);
                setPreventLeave(false);
              }}
            >
              确认离开
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar
        visible={Boolean(error)}
        action={{ label: "知道了", onPress: () => setError("") }}
        onDismiss={() => setError("")}
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
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  muted: { color: colors.textSecondary },
  question: { gap: spacing.lg },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  knowledge: { color: colors.brand, flex: 1 },
  highRisk: { color: colors.risk, fontWeight: "700" },
  mediumRisk: { color: colors.warning, fontWeight: "700" },
  prompt: { color: colors.text, fontWeight: "700", lineHeight: 30 },
  option: {
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10
  },
  hint: { color: colors.textMuted, textAlign: "center" }
});
