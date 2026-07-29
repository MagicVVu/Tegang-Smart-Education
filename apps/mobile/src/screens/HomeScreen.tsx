import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import {
  Banner,
  Button,
  Card,
  Icon,
  ProgressBar,
  Surface,
  Text
} from "react-native-paper";
import { trainingTask } from "@tegang/mock-data";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatusChip } from "../components/StatusChip";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Navigation>();
  const status = useMobileStore((state) => state.taskStatus);
  const progress = useMobileStore((state) => state.progress);
  const scenario = useMobileStore((state) => state.scenario);

  return (
    <Screen safeTop>
      <View style={styles.header}>
        <View>
          <Text variant="bodyMedium" style={styles.muted}>
            早上好，员工 E-0231
          </Text>
          <Text variant="headlineSmall" style={styles.title}>
            今天继续完成培训
          </Text>
        </View>
        <Surface style={styles.avatar} elevation={0}>
          <Icon source="account-hard-hat-outline" size={26} color={colors.brand} />
        </Surface>
      </View>
      {scenario === "knowledge_conflict" || status === "paused" ? (
        <Banner visible icon="alert-outline" style={styles.banner}>
          当前知识版本正在确认，相关内容已暂停。系统不会用冲突资料继续生成讲解。
        </Banner>
      ) : null}
      {status === "execution_failed" ? (
        <Banner visible icon="cloud-alert-outline" style={styles.errorBanner}>
          培训任务暂时不可用。管理员正在处理 Agent 执行异常，当前没有丢失学习记录。
        </Banner>
      ) : null}
      <Card style={styles.primaryCard} mode="contained">
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardTop}>
            <StatusChip status={status} />
            <Text variant="labelMedium" style={styles.deadline}>
              截止 08-15
            </Text>
          </View>
          <Text variant="titleLarge" style={styles.cardTitle}>
            {trainingTask.name}
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            当前路径已根据炼钢生产部高风险知识要求调整。
          </Text>
          <ProgressBar
            progress={progress / 100}
            color={colors.brand}
            style={styles.progress}
          />
          <View style={styles.progressLabels}>
            <Text variant="bodySmall" style={styles.muted}>
              个人进度
            </Text>
            <Text variant="labelLarge">{progress}%</Text>
          </View>
          <Button
            mode="contained"
            icon="arrow-right"
            contentStyle={styles.primaryButton}
            disabled={status === "paused" || status === "execution_failed"}
            onPress={() =>
              navigation.navigate("TrainingDetail", {
                taskId: trainingTask.id
              })
            }
          >
            {progress > 0 ? "继续培训" : "查看任务"}
          </Button>
        </Card.Content>
      </Card>
      <SectionHeader
        title="下一步"
        description="系统只展示当前阶段可以执行的动作。"
      />
      <View style={styles.nextGrid}>
        <Surface style={styles.nextItem} elevation={0}>
          <Icon
            source="book-open-page-variant-outline"
            color={colors.brand}
            size={26}
          />
          <View style={styles.nextCopy}>
            <Text variant="titleSmall">高温作业前置知识</Text>
            <Text variant="bodySmall" style={styles.muted}>
              预计 18 分钟
            </Text>
          </View>
        </Surface>
        <Surface style={styles.nextItem} elevation={0}>
          <Icon source="clipboard-check-outline" color={colors.warning} size={26} />
          <View style={styles.nextCopy}>
            <Text variant="titleSmall">完成阶段测评</Text>
            <Text variant="bodySmall" style={styles.muted}>
              学习完成后开放
            </Text>
          </View>
        </Surface>
      </View>
      <SectionHeader title="提醒" />
      <Card mode="outlined">
        <Card.Content style={styles.reminder}>
          <Icon source="alert-circle-outline" color={colors.warning} size={24} />
          <View style={styles.reminderCopy}>
            <Text variant="titleSmall">高风险知识需单独达标</Text>
            <Text variant="bodySmall" style={styles.muted}>
              若未达标，将进入针对性补训和复测，不会直接重复全部课程。
            </Text>
          </View>
        </Card.Content>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  muted: { color: colors.textSecondary, lineHeight: 19 },
  title: { color: colors.text, fontWeight: "800", marginTop: 2 },
  avatar: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.brandSoft
  },
  banner: { borderRadius: radii.md, backgroundColor: colors.warningSoft },
  errorBanner: { borderRadius: radii.md, backgroundColor: colors.riskSoft },
  primaryCard: {
    overflow: "hidden",
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  cardContent: { gap: spacing.md },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  deadline: { color: colors.warning },
  cardTitle: { color: colors.text, fontWeight: "800" },
  description: { color: colors.textSecondary, lineHeight: 21 },
  progress: { height: 8, borderRadius: 4, backgroundColor: colors.brandSoft },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  primaryButton: { height: 48 },
  nextGrid: { gap: spacing.md },
  nextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  nextCopy: { flex: 1, gap: 2 },
  reminder: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  reminderCopy: { flex: 1, gap: spacing.xs }
});
