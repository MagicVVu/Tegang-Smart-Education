import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useRef, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  IconButton,
  Snackbar,
  Text,
  TextInput
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { KnowledgeCitationModal } from "../components/KnowledgeCitationModal";
import { Screen } from "../components/Screen";
import {
  useTutorConversation,
  type TutorMessage
} from "../hooks/useTutorConversation";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Tutor">;

export function TutorScreen({ navigation, route }: Props) {
  const listRef = useRef<FlatList<TutorMessage>>(null);
  const {
    messages,
    suggestions,
    input,
    loading,
    sending,
    failure,
    notice,
    setInput,
    send,
    retry,
    requestHumanHelp,
    submitFeedback,
    clearNotice
  } = useTutorConversation(route.params.taskId);
  const [citationIds, setCitationIds] = useState<string[]>([]);
  const [citationVisible, setCitationVisible] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const activeSuggestion =
    suggestions[suggestionIndex % Math.max(suggestions.length, 1)];

  return (
    <>
      <Screen keyboard scroll={false}>
        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Icon
              source="message-processing-outline"
              size={24}
              color={colors.agent}
            />
          </View>
          <View style={styles.introCopy}>
            <Text variant="titleMedium" style={styles.title}>
              结合当前课程提问
            </Text>
            <Text variant="bodySmall" style={styles.muted}>
              回答基于已授权资料；高风险或无法确认的内容会明确提示。
            </Text>
          </View>
        </View>

        {activeSuggestion ? (
          <View style={styles.suggestionCard}>
            <View style={styles.suggestionHeading}>
              <Text variant="labelMedium" style={styles.suggestionLabel}>
                推荐问题
              </Text>
              {suggestions.length > 1 ? (
                <Button
                  compact
                  onPress={() =>
                    setSuggestionIndex(
                      (current) => (current + 1) % suggestions.length
                    )
                  }
                >
                  换一题
                </Button>
              ) : null}
            </View>
            <Button
              compact
              mode="outlined"
              contentStyle={styles.suggestionButtonContent}
              labelStyle={styles.suggestionButtonLabel}
              onPress={() => setInput(activeSuggestion)}
            >
              {activeSuggestion}
            </Button>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: true })
          }
          renderItem={({ item }) => (
            <Card
              mode="contained"
              style={[
                styles.message,
                item.role === "employee"
                  ? styles.employeeMessage
                  : styles.assistantMessage
              ]}
            >
              <Card.Content style={styles.messageContent}>
                <Text variant="labelMedium" style={styles.role}>
                  {item.role === "employee" ? "我" : "智能辅导"}
                </Text>
                {item.kind === "refused" ? (
                  <View style={styles.refusedLabel}>
                    <Icon
                      source="shield-alert-outline"
                      size={16}
                      color={colors.warning}
                    />
                    <Text variant="labelSmall" style={styles.warningText}>
                      依据不足，未给出确定性结论
                    </Text>
                  </View>
                ) : null}
                <Text variant="bodyMedium" style={styles.messageText}>
                  {item.text}
                </Text>
                {item.highRiskNotice ? (
                  <View style={styles.riskNotice}>
                    <Icon
                      source="alert-outline"
                      size={17}
                      color={colors.risk}
                    />
                    <Text variant="bodySmall" style={styles.riskText}>
                      {item.highRiskNotice}
                    </Text>
                  </View>
                ) : null}
                {item.citationIds?.length ? (
                  <Button
                    compact
                    icon="file-search-outline"
                    onPress={() => {
                      setCitationIds(item.citationIds ?? []);
                      setCitationVisible(true);
                    }}
                  >
                    查看 {item.citationIds.length} 条知识来源
                  </Button>
                ) : null}
                {item.role === "assistant" && item.id !== "welcome" ? (
                  <View style={styles.feedbackRow}>
                    <Text variant="bodySmall" style={styles.muted}>
                      {item.feedback
                        ? "反馈已记录"
                        : "这个回答有帮助吗？"}
                    </Text>
                    {!item.feedback ? (
                      <>
                        <IconButton
                          icon="thumb-up-outline"
                          size={18}
                          accessibilityLabel="有帮助"
                          onPress={() =>
                            void submitFeedback(item.id, true)
                          }
                        />
                        <IconButton
                          icon="thumb-down-outline"
                          size={18}
                          accessibilityLabel="没有帮助"
                          onPress={() =>
                            void submitFeedback(item.id, false)
                          }
                        />
                      </>
                    ) : null}
                  </View>
                ) : null}
              </Card.Content>
            </Card>
          )}
          ListFooterComponent={
            sending ? (
              <View style={styles.answering}>
                <ActivityIndicator size="small" color={colors.agent} />
                <Text variant="bodySmall" style={styles.muted}>
                  正在查找授权资料并组织回答…
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator
                style={styles.loading}
                color={colors.agent}
              />
            ) : null
          }
        />

        {failure ? (
          <Card mode="contained" style={styles.failureCard}>
            <Card.Content style={styles.failureContent}>
              <View style={styles.failureHeading}>
                <Icon
                  source="cloud-alert-outline"
                  size={24}
                  color={colors.risk}
                />
                <View style={styles.failureCopy}>
                  <Text variant="titleSmall" style={styles.failureTitle}>
                    发送失败，问题已保留
                  </Text>
                  <Text variant="bodySmall" style={styles.muted}>
                    {failure.message}
                  </Text>
                </View>
              </View>
              <View style={styles.failureActions}>
                <Button
                  mode="contained"
                  icon="reload"
                  loading={sending}
                  onPress={retry}
                >
                  重试发送
                </Button>
                <Button mode="outlined" onPress={() => navigation.goBack()}>
                  返回课程
                </Button>
              </View>
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.composer}>
          <TextInput
            mode="outlined"
            value={input}
            onChangeText={setInput}
            placeholder="输入与当前培训有关的问题"
            multiline
            disabled={sending}
            style={styles.input}
            right={
              <TextInput.Icon
                icon="send"
                disabled={!input.trim() || sending}
                onPress={() => void send()}
              />
            }
          />
          <IconButton
            icon="account-arrow-right-outline"
            mode="contained-tonal"
            accessibilityLabel="请求人工帮助"
            onPress={() => void requestHumanHelp()}
          />
        </View>
      </Screen>
      <KnowledgeCitationModal
        visible={citationVisible}
        citationIds={citationIds}
        onDismiss={() => setCitationVisible(false)}
      />
      <Snackbar
        visible={Boolean(notice)}
        onDismiss={clearNotice}
        duration={2200}
      >
        {notice}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  introIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.agentSoft
  },
  introCopy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 18
  },
  suggestionCard: {
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface
  },
  suggestionHeading: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  suggestionLabel: {
    color: colors.textSecondary,
    fontWeight: "700"
  },
  suggestionButtonContent: {
    minHeight: 38,
    justifyContent: "flex-start"
  },
  suggestionButtonLabel: {
    flex: 1,
    textAlign: "left"
  },
  list: {
    flex: 1,
    marginHorizontal: -spacing.xs
  },
  listContent: {
    flexGrow: 1,
    gap: spacing.md,
    paddingVertical: spacing.sm
  },
  message: {
    maxWidth: "90%",
    borderRadius: radii.md
  },
  employeeMessage: {
    alignSelf: "flex-end",
    backgroundColor: colors.brandSoft
  },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.agentSoft
  },
  messageContent: {
    gap: spacing.sm
  },
  role: {
    color: colors.textSecondary,
    fontWeight: "700"
  },
  messageText: {
    color: colors.text,
    lineHeight: 22
  },
  refusedLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  warningText: {
    flex: 1,
    color: colors.warning,
    fontWeight: "700"
  },
  riskNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.riskSoft
  },
  riskText: {
    flex: 1,
    color: colors.risk,
    lineHeight: 18
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  answering: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    padding: spacing.md
  },
  loading: {
    marginTop: spacing.xxl
  },
  failureCard: {
    backgroundColor: colors.riskSoft
  },
  failureContent: {
    gap: spacing.md
  },
  failureHeading: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  failureCopy: {
    flex: 1,
    gap: spacing.xs
  },
  failureTitle: {
    color: colors.risk,
    fontWeight: "700"
  },
  failureActions: {
    flexDirection: "row",
    gap: spacing.sm
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs
  },
  input: {
    flex: 1,
    maxHeight: 120,
    backgroundColor: colors.surface
  }
});
