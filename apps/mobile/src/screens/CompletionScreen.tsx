import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { Button, Card, Icon, List, Text } from "react-native-paper";
import { reportSummary, trainingTask } from "@tegang/mock-data";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Completion">;

export function CompletionScreen({ navigation }: Props) {
  const result = useMobileStore((state) => state.result);

  return (
    <Screen
      footer={
        <Button
          mode="contained"
          contentStyle={styles.button}
          onPress={() =>
            navigation.reset({
              index: 0,
              routes: [{ name: "Main", params: { screen: "Home" } }]
            })
          }
        >
          返回首页
        </Button>
      }
    >
      <Card mode="contained" style={styles.heroCard}>
        <Card.Content style={styles.hero}>
          <View style={styles.iconWrap}>
            <Icon
              source="check-decagram-outline"
              size={52}
              color={colors.surface}
            />
          </View>
          <Text variant="headlineMedium" style={styles.title}>
            培训任务已完成
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            学习、测评与必要补训记录已保存。正式培训报告仍需管理员确认后发布。
          </Text>
        </Card.Content>
      </Card>
      <Card mode="outlined">
        <List.Item
          title={trainingTask.name}
          description={`任务编号 ${trainingTask.id}`}
          left={(props) => <List.Icon {...props} icon="book-check-outline" />}
        />
        <List.Item
          title={`最终测评 ${result?.score ?? 86} 分`}
          description={`第 ${result?.attempt ?? 2} 次测评达标`}
          left={(props) => (
            <List.Icon {...props} icon="clipboard-check-outline" />
          )}
        />
        <List.Item
          title="高风险知识已达标"
          description="单独判定结果已记录"
          left={(props) => (
            <List.Icon
              {...props}
              icon="shield-check-outline"
              color={colors.success}
            />
          )}
        />
      </Card>
      <Card mode="contained" style={styles.noticeCard}>
        <Card.Content style={styles.notice}>
          <Text variant="labelLarge">关于结果使用</Text>
          <Text variant="bodySmall" style={styles.muted}>
            该记录用于培训闭环与后续学习安排，不直接作为绩效、晋升、处罚或岗位任免结论。
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            演示报告完成率 {reportSummary.completionRate}%
            仅为模拟数据，不代表真实企业效果。
          </Text>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: { backgroundColor: colors.brandStrong },
  hero: { alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success
  },
  title: { color: colors.surface, fontWeight: "800" },
  subtitle: { color: "#D8E5ED", textAlign: "center", lineHeight: 22 },
  noticeCard: { backgroundColor: colors.infoSoft },
  notice: { gap: spacing.sm },
  muted: { color: colors.textSecondary, lineHeight: 19 },
  button: { height: 50 }
});
