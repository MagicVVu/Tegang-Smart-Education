import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Snackbar,
  Text,
  TextInput
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { KnowledgeCitationModal } from "../components/KnowledgeCitationModal";
import { Screen } from "../components/Screen";
import { mobileServices } from "../services";

interface Message {
  id: string;
  role: "employee" | "assistant";
  text: string;
  citationIds?: string[];
  refused?: boolean;
}

const initialMessages: Message[] = [
  {
    id: "welcome",
    role: "assistant",
    text:
      "我可以依据当前培训任务中的授权知识进行解释。高风险或知识不足的问题会给出保守提示，并提供人工入口。"
  }
];

export function TutorScreen() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [failedText, setFailedText] = useState("");
  const [citationIds, setCitationIds] = useState<string[]>([]);
  const [citationVisible, setCitationVisible] = useState(false);
  const [snackbar, setSnackbar] = useState("");

  const send = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setInput("");
    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: "employee", text: trimmed }
    ]);
    try {
      if (trimmed.includes("发送失败")) {
        throw new Error("NETWORK_ERROR");
      }
      const result = await mobileServices.tutor.ask(trimmed);
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.data.answer,
          citationIds: result.data.citationIds,
          refused: result.data.refused
        }
      ]);
      setFailedText("");
    } catch {
      setFailedText(trimmed);
      setSnackbar("发送失败，问题已保留，可重新发送。");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
    <Screen keyboard safeTop scroll={false}>
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.title}>
            智能辅导
          </Text>
          <Text variant="bodySmall" style={styles.muted}>
            回答基于授权知识；不生成无依据的正式结论。
          </Text>
        </View>
        <View style={styles.suggestions}>
          {[
            "进入高温区域前需要确认什么？",
            "为什么这个知识点必须单独达标？",
            "可以用测评结果预测绩效吗？"
          ].map((item) => (
            <Chip key={item} compact onPress={() => setInput(item)}>
              {item}
            </Chip>
          ))}
        </View>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={(item) => item.id}
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
                  {item.role === "employee" ? "我" : "智能辅导 · Agent建议"}
                </Text>
                <Text variant="bodyMedium" style={styles.messageText}>
                  {item.text}
                </Text>
                {item.citationIds?.length ? (
                  <Button
                    compact
                    icon="file-search-outline"
                    onPress={() => {
                      setCitationIds(item.citationIds ?? []);
                      setCitationVisible(true);
                    }}
                  >
                    查看 {item.citationIds.length} 条知识引用
                  </Button>
                ) : null}
                {item.refused ? (
                  <Button
                    compact
                    icon="account-arrow-right-outline"
                    onPress={() =>
                      setSnackbar("已记录人工帮助请求（演示）。")
                    }
                  >
                    请求人工帮助
                  </Button>
                ) : null}
              </Card.Content>
            </Card>
          )}
          ListFooterComponent={
            sending ? <ActivityIndicator style={styles.loading} /> : null
          }
        />
        {failedText ? (
          <Button
            mode="outlined"
            icon="reload"
            onPress={() => send(failedText)}
          >
            重新发送上一个问题
          </Button>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            mode="outlined"
            value={input}
            onChangeText={setInput}
            placeholder="输入与当前培训有关的问题"
            multiline
            style={styles.input}
            right={
              <TextInput.Icon
                icon="send"
                disabled={!input.trim() || sending}
                onPress={() => send()}
              />
            }
          />
          <IconButton
            icon="account-arrow-right-outline"
            accessibilityLabel="转人工"
            onPress={() => setSnackbar("已请求培训管理员协助（演示）。")}
          />
        </View>
      </Screen>
      <KnowledgeCitationModal
        visible={citationVisible}
        citationIds={citationIds}
        onDismiss={() => setCitationVisible(false)}
      />
      <Snackbar
        visible={Boolean(snackbar)}
        onDismiss={() => setSnackbar("")}
        action={
          failedText
            ? { label: "重试", onPress: () => send(failedText) }
            : undefined
        }
      >
        {snackbar}
      </Snackbar>
    </>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xs },
  title: { color: colors.text, fontWeight: "800" },
  muted: { color: colors.textSecondary, lineHeight: 18 },
  suggestions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  list: { flex: 1, marginHorizontal: -spacing.xs },
  listContent: { gap: spacing.md, paddingVertical: spacing.sm },
  message: { maxWidth: "88%", borderRadius: radii.md },
  employeeMessage: { alignSelf: "flex-end", backgroundColor: colors.brandSoft },
  assistantMessage: {
    alignSelf: "flex-start",
    backgroundColor: colors.agentSoft
  },
  messageContent: { gap: spacing.sm },
  role: { color: colors.textSecondary },
  messageText: { color: colors.text, lineHeight: 22 },
  loading: { alignSelf: "flex-start", margin: spacing.md },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: spacing.xs },
  input: { flex: 1, maxHeight: 120, backgroundColor: colors.surface }
});
