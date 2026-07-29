import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, List, Text } from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Remedial">;

export function RemedialScreen({ navigation, route }: Props) {
  const result = useMobileStore((state) => state.result);
  const startRemedial = useMobileStore((state) => state.startRemedial);
  const weakPoints =
    result?.knowledgeResults.filter((item) => !item.passed) ?? [];

  const begin = () => {
    startRemedial();
    navigation.replace("Learning", {
      taskId: route.params.taskId,
      remedial: true
    });
  };

  return (
    <Screen
      footer={
        <Button mode="contained" contentStyle={styles.button} onPress={begin}>
          开始补训
        </Button>
      }
    >
      <Card mode="contained" style={styles.heroCard}>
        <Card.Content style={styles.hero}>
          <Icon source="target-account" size={44} color={colors.warning} />
          <View style={styles.heroCopy}>
            <Text variant="headlineSmall" style={styles.title}>
              定向补训已生成
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              本次路径由测评结果触发，重点补充未达标内容，而不是重新学习全部课程。
            </Text>
          </View>
        </Card.Content>
      </Card>
      <SectionHeader
        title="为什么需要补训"
        description="依据本次测评结果和高风险独立达标规则"
      />
      <Card mode="outlined">
        {(weakPoints.length
          ? weakPoints
          : [
              {
                knowledgePoint: "高温作业与设备联锁",
                reason: "高风险前置条件未完整掌握。"
              }
            ]
        ).map((item) => (
          <List.Item
            key={item.knowledgePoint}
            title={item.knowledgePoint}
            description={item.reason}
            left={(props) => (
              <List.Icon
                {...props}
                icon="alert-octagon-outline"
                color={colors.risk}
              />
            )}
          />
        ))}
      </Card>
      <SectionHeader title="补训安排" />
      <Card mode="contained">
        <Card.Content style={styles.content}>
          <List.Item
            title="重新讲解前置条件"
            description="联锁状态、隔离边界和监护要求"
            left={(props) => <List.Icon {...props} icon="book-open-outline" />}
          />
          <List.Item
            title="完成一个场景练习"
            description="在冲突或无法确认时选择停止并转人工"
            left={(props) => (
              <List.Icon {...props} icon="clipboard-text-outline" />
            )}
          />
          <List.Item
            title="完成复测"
            description="高风险知识仍需单独达标"
            left={(props) => (
              <List.Icon {...props} icon="shield-check-outline" />
            )}
          />
        </Card.Content>
      </Card>
      <Text variant="bodySmall" style={styles.notice}>
        若多次复测仍未达标，任务将暂停并转培训管理员人工处理。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.warningSoft },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  heroCopy: { flex: 1, gap: spacing.xs },
  title: { color: colors.text, fontWeight: "800" },
  muted: { color: colors.textSecondary, lineHeight: 21 },
  content: { gap: spacing.xs },
  notice: {
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20
  },
  button: { height: 50 }
});
