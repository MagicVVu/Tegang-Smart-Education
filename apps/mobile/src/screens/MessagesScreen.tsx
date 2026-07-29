import { StyleSheet } from "react-native";
import { Badge, Card, List, Text } from "react-native-paper";
import { colors, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";

const messages = [
  {
    id: "MSG-01",
    title: "补训任务已生成",
    description: "高温作业与设备联锁 · 请完成定向补训后复测",
    icon: "target-account",
    unread: true
  },
  {
    id: "MSG-02",
    title: "培训任务即将到期",
    description: "距离截止时间还有 3 天",
    icon: "clock-alert-outline",
    unread: true
  },
  {
    id: "MSG-03",
    title: "知识资料版本已确认",
    description: "《炼钢生产部安全操作规范》V5.1",
    icon: "book-check-outline",
    unread: false
  }
];

export function MessagesScreen() {
  return (
    <Screen safeTop>
      <SectionHeader
        title="消息与提醒"
        description="仅展示与本人培训任务直接相关的通知"
      />
      <Card mode="outlined">
        {messages.map((message) => (
          <List.Item
            key={message.id}
            title={message.title}
            description={message.description}
            left={(props) => <List.Icon {...props} icon={message.icon} />}
            right={() =>
              message.unread ? <Badge style={styles.badge}>新</Badge> : null
            }
          />
        ))}
      </Card>
      <Text variant="bodySmall" style={styles.muted}>
        系统不会在消息中展示其他员工的培训信息。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "center", backgroundColor: colors.risk },
  muted: {
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.md
  }
});
