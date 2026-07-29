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
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "AssessmentResult">;

export function AssessmentResultScreen({ navigation, route }: Props) {
  const result = useMobileStore((state) => state.result);
  const completeTraining = useMobileStore((state) => state.completeTraining);

  if (!result) {
    return (
      <Screen>
        <Card mode="contained">
          <Card.Content style={styles.empty}>
            <Icon source="file-question-outline" size={42} color={colors.info} />
            <Text variant="titleMedium">暂未找到测评结果</Text>
            <Button
              mode="contained"
              onPress={() =>
                navigation.replace("Assessment", {
                  taskId: route.params.taskId
                })
              }
            >
              返回测评
            </Button>
          </Card.Content>
        </Card>
      </Screen>
    );
  }

  const passed = result.passed && result.highRiskPassed;

  const next = () => {
    if (passed) {
      completeTraining();
      navigation.replace("Completion", { taskId: route.params.taskId });
      return;
    }
    navigation.replace("Remedial", { taskId: route.params.taskId });
  };

  return (
    <Screen
      footer={
        <Button mode="contained" contentStyle={styles.button} onPress={next}>
          {passed ? "查看培训完成结果" : "进入定向补训"}
        </Button>
      }
    >
      <Card
        mode="contained"
        style={passed ? styles.passCard : styles.failCard}
      >
        <Card.Content style={styles.hero}>
          <Icon
            source={passed ? "check-decagram-outline" : "alert-circle-outline"}
            size={48}
            color={passed ? colors.success : colors.warning}
          />
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={styles.heroTitle}>
              {passed ? "本次测评已达标" : "需要定向补训"}
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              第 {result.attempt} 次测评 · 总分 {result.score} 分
            </Text>
          </View>
        </Card.Content>
      </Card>
      <View style={styles.summaryRow}>
        <Card style={styles.metricCard} mode="outlined">
          <Card.Content>
            <Text variant="bodySmall" style={styles.muted}>
              总体结果
            </Text>
            <Text variant="titleLarge">
              {result.passed ? "达标" : "未达标"}
            </Text>
          </Card.Content>
        </Card>
        <Card style={styles.metricCard} mode="outlined">
          <Card.Content>
            <Text variant="bodySmall" style={styles.muted}>
              高风险知识
            </Text>
            <Text
              variant="titleLarge"
              style={{
                color: result.highRiskPassed ? colors.success : colors.risk
              }}
            >
              {result.highRiskPassed ? "通过" : "未通过"}
            </Text>
          </Card.Content>
        </Card>
      </View>
      <SectionHeader
        title="知识点表现"
        description="高风险知识点独立展示，不能被其他题目总分抵消"
      />
      <Card mode="outlined">
        {result.knowledgeResults.map((item, itemIndex) => (
          <View key={item.knowledgePoint}>
            <List.Item
              title={item.knowledgePoint}
              description={item.reason}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={
                    item.passed
                      ? "check-circle-outline"
                      : "alert-circle-outline"
                  }
                  color={item.passed ? colors.success : colors.risk}
                />
              )}
              right={() => (
                <Text variant="labelLarge">{item.score} 分</Text>
              )}
            />
            <ProgressBar
              progress={item.score / 100}
              color={item.passed ? colors.success : colors.warning}
              style={styles.knowledgeBar}
            />
            {itemIndex < result.knowledgeResults.length - 1 ? (
              <Divider />
            ) : null}
          </View>
        ))}
      </Card>
      {!passed ? (
        <Card mode="contained" style={styles.nextCard}>
          <Card.Content style={styles.nextContent}>
            <Text variant="titleMedium">下一步建议</Text>
            <Text variant="bodyMedium" style={styles.muted}>
              只补充未达标知识点，并在补训完成后进入复测；系统不会把本次结果直接作为绩效或岗位结论。
            </Text>
          </Card.Content>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  passCard: { backgroundColor: colors.successSoft },
  failCard: { backgroundColor: colors.warningSoft },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.xs },
  heroTitle: { color: colors.text, fontWeight: "800" },
  muted: { color: colors.textSecondary, lineHeight: 20 },
  summaryRow: { flexDirection: "row", gap: spacing.md },
  metricCard: { flex: 1 },
  knowledgeBar: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  nextCard: { backgroundColor: colors.infoSoft },
  nextContent: { gap: spacing.sm },
  button: { height: 50 },
  empty: { alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl }
});
