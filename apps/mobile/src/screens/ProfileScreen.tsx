import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Divider,
  Icon,
  List,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { SectionHeader } from "../components/SectionHeader";
import { StatePanel } from "../components/StatePanel";
import { useTrainingRecords } from "../hooks/useTrainingRecords";
import { useMobileStore } from "../stores/mobile-store";

export function ProfileScreen() {
  const employee = useMobileStore((state) => state.employee);
  const logout = useMobileStore((state) => state.logout);
  const { records, loading, error, reload } = useTrainingRecords();
  const [loggingOut, setLoggingOut] = useState(false);

  const signOut = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <Screen safeTop>
      <Text variant="headlineSmall" style={styles.pageTitle}>
        我的
      </Text>

      <Card mode="contained" style={styles.profileCard}>
        <Card.Content style={styles.profile}>
          <Avatar.Text
            label="E"
            size={58}
            color={colors.surface}
            style={styles.avatar}
          />
          <View style={styles.profileCopy}>
            <Text variant="titleLarge" style={styles.name}>
              {employee?.display_name ?? "员工"}
            </Text>
            <Text variant="bodyMedium" style={styles.profileMeta}>
              {employee?.department_name} · {employee?.job_title}
            </Text>
            <View style={styles.verified}>
              <Icon
                source="shield-check-outline"
                size={16}
                color={colors.success}
              />
              <Text variant="labelSmall" style={styles.verifiedText}>
                企业身份已验证
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <SectionHeader
        title="个人培训记录"
        description="仅展示当前账号的学习与完成记录"
      />
      {loading ? (
        <StatePanel
          loading
          icon="history"
          title="正在加载培训记录"
          description="请稍候，正在同步个人记录。"
        />
      ) : error ? (
        <StatePanel
          icon="cloud-alert-outline"
          title="培训记录加载失败"
          description={error}
          actionLabel="重新加载"
          onAction={() => void reload()}
          tone="error"
        />
      ) : records.length === 0 ? (
        <StatePanel
          icon="history"
          title="暂无培训记录"
          description="开始培训后，进度和结果会保留在这里。"
        />
      ) : (
        <Card mode="outlined">
          {records.map((record, index) => (
            <View key={record.task_id}>
              <List.Item
                title={record.task_name}
                description={`${record.result_summary}${
                  record.completed_at ? ` · ${record.completed_at}` : ""
                }`}
                titleNumberOfLines={2}
                descriptionNumberOfLines={2}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={
                      record.learning_status === "LR-COMPLETED"
                        ? "check-circle-outline"
                        : "progress-clock"
                    }
                    color={
                      record.learning_status === "LR-COMPLETED"
                        ? colors.success
                        : colors.brand
                    }
                  />
                )}
              />
              {index < records.length - 1 ? <Divider /> : null}
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title="账号与权限" />
      <Card mode="outlined">
        <List.Item
          title="当前身份"
          description="员工／参训人员"
          left={(props) => (
            <List.Icon {...props} icon="badge-account-outline" />
          )}
        />
        <Divider />
        <List.Item
          title="数据访问范围"
          description="仅本人任务、结果、消息和已授权知识"
          left={(props) => (
            <List.Icon {...props} icon="shield-account-outline" />
          )}
        />
        <Divider />
        <List.Item
          title="需要更正身份信息？"
          description="请联系培训管理员按企业制度处理"
          left={(props) => (
            <List.Icon {...props} icon="account-edit-outline" />
          )}
        />
      </Card>

      <Button
        mode="outlined"
        icon="logout"
        loading={loggingOut}
        disabled={loggingOut}
        textColor={colors.risk}
        contentStyle={styles.logoutButton}
        onPress={() => void signOut()}
      >
        退出登录
      </Button>
      <Text variant="bodySmall" style={styles.version}>
        特钢智教 Android · v0.2.0
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: {
    color: colors.text,
    fontWeight: "800"
  },
  profileCard: {
    borderRadius: radii.lg,
    backgroundColor: colors.brandStrong
  },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg
  },
  avatar: {
    backgroundColor: colors.brand
  },
  profileCopy: {
    flex: 1,
    gap: spacing.xs
  },
  name: {
    color: colors.surface,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary,
    lineHeight: 19
  },
  profileMeta: {
    color: "#D8E5ED",
    lineHeight: 19
  },
  verified: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: colors.surface
  },
  verifiedText: {
    color: colors.success,
    fontWeight: "700"
  },
  logoutButton: {
    height: 48
  },
  version: {
    color: colors.textMuted,
    textAlign: "center"
  }
});
