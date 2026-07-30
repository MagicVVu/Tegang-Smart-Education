import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Card, Icon, Snackbar, Text } from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Forbidden">;

export function ForbiddenScreen({ navigation }: Props) {
  const [noticeVisible, setNoticeVisible] = useState(false);

  return (
    <>
      <Screen>
        <Card mode="contained" style={styles.card}>
          <Card.Content style={styles.content}>
            <ViewIcon />
            <Text variant="headlineSmall" style={styles.title}>
              当前账号无权访问
            </Text>
            <Text variant="bodyMedium" style={styles.description}>
              为保护业务数据，页面内容未加载。你仍可返回自己的培训页面继续学习。
            </Text>
            <Button
              mode="contained"
              contentStyle={styles.button}
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: "Main", params: { screen: "TrainingHome" } }
                  ]
                })
              }
            >
              返回我的培训
            </Button>
            <Button
              mode="text"
              icon="account-question-outline"
              onPress={() => setNoticeVisible(true)}
            >
              联系培训管理员
            </Button>
          </Card.Content>
        </Card>
      </Screen>
      <Snackbar
        visible={noticeVisible}
        duration={2400}
        onDismiss={() => setNoticeVisible(false)}
      >
        已记录帮助请求，请留意消息回复。
      </Snackbar>
    </>
  );
}

function ViewIcon() {
  return (
    <Card mode="contained" style={styles.iconCard}>
      <Card.Content style={styles.iconContent}>
        <Icon source="shield-lock-outline" size={50} color={colors.risk} />
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.xxl,
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  content: {
    alignItems: "center",
    gap: spacing.lg,
    paddingVertical: spacing.xxl
  },
  iconCard: {
    borderRadius: 38,
    backgroundColor: colors.riskSoft
  },
  iconContent: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    padding: 0
  },
  title: {
    color: colors.text,
    fontWeight: "800",
    textAlign: "center"
  },
  description: {
    maxWidth: 300,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: "center"
  },
  button: {
    minWidth: 220,
    height: 48
  }
});
