import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Checkbox,
  Divider,
  Icon,
  List,
  ProgressBar,
  Snackbar,
  Text
} from "react-native-paper";
import { candidatePlans, trainingTask } from "@tegang/mock-data";
import { colors, spacing } from "@tegang/design-tokens";
import { KnowledgeCitationModal } from "../components/KnowledgeCitationModal";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { mobileServices } from "../services";
import { useMobileStore } from "../stores/mobile-store";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Learning">;

export function LearningScreen({ navigation, route }: Props) {
  const progress = useMobileStore((state) => state.progress);
  const currentModuleIndex = useMobileStore(
    (state) => state.currentModuleIndex,
  );
  const finishLearning = useMobileStore((state) => state.finishLearning);
  const finishRemedial = useMobileStore((state) => state.finishRemedial);
  const status = useMobileStore((state) => state.taskStatus);
  const [citationVisible, setCitationVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState("");
  const isRemedial =
    route.params.remedial || status === "remedial_learning";
  const modules = candidatePlans[1]!.modules.filter(
    (module) =>
      module.department === "全员" || module.department === "炼钢生产部",
  );

  const completeCurrent = async () => {
    setSaving(true);
    try {
      await mobileServices.learning.completeModule();
      setSnackbar("学习进度已保存。");
    } finally {
      setSaving(false);
    }
  };

  const goAssessment = () => {
    if (isRemedial) {
      finishRemedial();
    } else {
      finishLearning();
    }
    navigation.replace("Assessment", {
      taskId: trainingTask.id,
      reassessment: isRemedial
    });
  };

  return (
    <>
      <Screen
        footer={
          <Button
            mode="contained"
            loading={saving}
            contentStyle={styles.footerButton}
            onPress={
              currentModuleIndex >= modules.length - 1
                ? goAssessment
                : completeCurrent
            }
          >
            {currentModuleIndex >= modules.length - 1
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
                  定向补训路径
                </Text>
                <Text variant="bodySmall" style={styles.muted}>
                  原因：首次测评未完整识别联锁、隔离和监护要求。只补充对应知识点，不重复全部课程。
                </Text>
              </View>
            </Card.Content>
          </Card>
        ) : null}
        <View style={styles.progressTop}>
          <Text variant="labelLarge">
            {isRemedial ? "补训进度" : "学习进度"}
          </Text>
          <Text variant="labelLarge">{progress}%</Text>
        </View>
        <ProgressBar progress={progress / 100} color={colors.brand} />
        <SectionHeader
          title={
            isRemedial
              ? "高温作业前置条件强化"
              : modules[currentModuleIndex]?.title ?? "课程学习"
          }
          description={`第 ${currentModuleIndex + 1} / ${modules.length} 个学习单元`}
        />
        <Card mode="contained">
          <Card.Content style={styles.article}>
            <Text variant="labelLarge" style={styles.badge}>
              正式知识内容 · 现行版本
            </Text>
            <Text variant="titleLarge" style={styles.articleTitle}>
              进入高温区域前的联锁、隔离与监护
            </Text>
            <Text variant="bodyLarge" style={styles.body}>
              进入高温作业区域前，应确认设备联锁状态、隔离边界和监护要求。任何一项无法确认时，应停止继续操作并转人工确认。
            </Text>
            <Divider />
            <Text variant="titleMedium">为什么要前置学习</Text>
            <Text variant="bodyMedium" style={styles.body}>
              该知识点影响现场安全，属于需要单独覆盖和达标的高风险内容。系统可以调整学习顺序，但不能降低正式要求。
            </Text>
            <Card style={styles.caseCard} mode="outlined">
              <Card.Content style={styles.caseContent}>
                <Text variant="labelLarge" style={styles.caseLabel}>
                  场景练习
                </Text>
                <Text variant="bodyMedium" style={styles.body}>
                  如果联锁状态与培训资料描述不一致，应先做什么？
                </Text>
                <Checkbox.Item
                  label="停止操作并请求现场授权人员确认"
                  status="checked"
                  position="leading"
                />
              </Card.Content>
            </Card>
          </Card.Content>
        </Card>
        <Card mode="outlined">
          <List.Item
            title="查看知识来源"
            description="文档、章节、版本、适用部门与有效状态"
            left={(props) => <List.Icon {...props} icon="file-search-outline" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => setCitationVisible(true)}
          />
        </Card>
        <Button
          mode="outlined"
          icon="robot-outline"
          onPress={() =>
            navigation.navigate("Main", { screen: "Tutor" })
          }
        >
          向智能辅导提问
        </Button>
      </Screen>
      <KnowledgeCitationModal
        visible={citationVisible}
        onDismiss={() => setCitationVisible(false)}
      />
      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar("")}
        duration={1800}
      >
        {snackbar}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  remedialBanner: { backgroundColor: colors.warningSoft },
  bannerContent: { flexDirection: "row", gap: spacing.md },
  bannerCopy: { flex: 1, gap: spacing.xs },
  remedialTitle: { color: colors.warning, fontWeight: "700" },
  muted: { color: colors.textSecondary, lineHeight: 19 },
  progressTop: { flexDirection: "row", justifyContent: "space-between" },
  article: { gap: spacing.lg },
  badge: { color: colors.success },
  articleTitle: { color: colors.text, fontWeight: "800", lineHeight: 28 },
  body: { color: colors.text, lineHeight: 24 },
  caseCard: { backgroundColor: colors.infoSoft },
  caseContent: { gap: spacing.sm },
  caseLabel: { color: colors.info },
  footerButton: { height: 50 }
});
