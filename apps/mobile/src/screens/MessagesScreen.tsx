import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";
import { Badge, Card, Icon, Text } from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { StatePanel } from "../components/StatePanel";
import { useNotifications } from "../hooks/useNotifications";
import type { NotificationItem } from "../services";
import type { RootStackParamList } from "../navigation/types";

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function MessagesScreen() {
  const navigation = useNavigation<Navigation>();
  const { items, loading, error, reload, markRead } = useNotifications();
  const unreadCount = items.filter((item) => item.unread).length;

  const open = async (item: NotificationItem) => {
    if (item.unread) await markRead(item.id);
    if (!item.taskId) return;
    if (item.destination === "assessment") {
      navigation.navigate("Assessment", { taskId: item.taskId });
    } else if (item.destination === "remedial") {
      navigation.navigate("Remedial", { taskId: item.taskId });
    } else {
      navigation.navigate("TrainingDetail", { taskId: item.taskId });
    }
  };

  return (
    <Screen safeTop>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text variant="headlineSmall" style={styles.title}>
            消息与提醒
          </Text>
          <Text variant="bodyMedium" style={styles.muted}>
            与本人培训任务直接相关的通知
          </Text>
        </View>
        {unreadCount ? (
          <View style={styles.unread}>
            <Text variant="labelMedium" style={styles.unreadText}>
              {unreadCount} 条未读
            </Text>
          </View>
        ) : null}
      </View>

      {loading ? (
        <StatePanel
          loading
          icon="bell-outline"
          title="正在加载消息"
          description="请稍候，正在同步最新提醒。"
        />
      ) : error ? (
        <StatePanel
          icon="cloud-alert-outline"
          title="消息加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={() => void reload()}
          tone="error"
        />
      ) : items.length === 0 ? (
        <StatePanel
          icon="bell-check-outline"
          title="暂时没有新消息"
          description="培训任务、截止时间和人工反馈会在这里提醒你。"
        />
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <Card
              key={item.id}
              mode="outlined"
              style={item.unread ? styles.unreadCard : styles.card}
              onPress={() => void open(item)}
            >
              <Card.Content style={styles.message}>
                <View
                  style={[
                    styles.iconWrap,
                    item.unread ? styles.iconWrapUnread : undefined
                  ]}
                >
                  <Icon
                    source={item.icon}
                    size={23}
                    color={item.unread ? colors.brand : colors.textSecondary}
                  />
                </View>
                <View style={styles.messageCopy}>
                  <View style={styles.messageHeading}>
                    <Text
                      variant="titleSmall"
                      numberOfLines={2}
                      style={styles.messageTitle}
                    >
                      {item.title}
                    </Text>
                    {item.unread ? (
                      <Badge style={styles.badge} size={8} />
                    ) : null}
                  </View>
                  <Text variant="bodySmall" style={styles.muted}>
                    {item.description}
                  </Text>
                  <Text variant="labelSmall" style={styles.time}>
                    {item.createdAt}
                  </Text>
                </View>
                <Icon
                  source="chevron-right"
                  size={20}
                  color={colors.textMuted}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      )}

      <View style={styles.privacy}>
        <Icon source="shield-account-outline" size={19} color={colors.brand} />
        <Text variant="bodySmall" style={styles.privacyText}>
          消息中不会展示其他员工的培训信息。
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "800"
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  unread: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.brandSoft
  },
  unreadText: {
    color: colors.brand,
    fontWeight: "700"
  },
  list: {
    gap: spacing.md
  },
  card: {
    backgroundColor: colors.surface
  },
  unreadCard: {
    borderColor: colors.brand,
    backgroundColor: colors.surface
  },
  message: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  iconWrap: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 21,
    backgroundColor: colors.background
  },
  iconWrapUnread: {
    backgroundColor: colors.brandSoft
  },
  messageCopy: {
    flex: 1,
    gap: spacing.xs
  },
  messageHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  messageTitle: {
    flex: 1,
    color: colors.text,
    fontWeight: "700"
  },
  badge: {
    backgroundColor: colors.risk
  },
  time: {
    color: colors.textMuted
  },
  privacy: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  privacyText: {
    color: colors.textMuted
  }
});
