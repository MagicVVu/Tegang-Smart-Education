import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Icon,
  Surface,
  Text,
  TextInput
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { Screen } from "../components/Screen";
import { useMobileStore } from "../stores/mobile-store";

export function LoginScreen() {
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [accountTouched, setAccountTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const login = useMobileStore((state) => state.login);
  const loading = useMobileStore((state) => state.authLoading);
  const authError = useMobileStore((state) => state.authError);
  const clearAuthError = useMobileStore((state) => state.clearAuthError);

  const accountError = accountTouched && !account.trim();
  const passwordError = passwordTouched && password.length < 6;

  const submit = async () => {
    setAccountTouched(true);
    setPasswordTouched(true);
    if (!account.trim() || password.length < 6) return;
    try {
      await login({ account, password });
    } catch {
      // The store exposes a product-safe error message above the form.
    }
  };

  return (
    <Screen safeTop keyboard>
      <View style={styles.brandBlock}>
        <Surface style={styles.mark} elevation={0}>
          <Text variant="headlineMedium" style={styles.markText}>
            T
          </Text>
        </Surface>
        <View style={styles.brandCopy}>
          <Text variant="headlineMedium" style={styles.title}>
            特钢智教
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            员工培训、智能辅导与测评闭环
          </Text>
        </View>
      </View>

      <Card mode="contained" style={styles.card}>
        <Card.Content style={styles.form}>
          <View style={styles.formHeading}>
            <Text variant="titleLarge" style={styles.formTitle}>
              登录进入系统
            </Text>
            <Text variant="bodyMedium" style={styles.muted}>
              使用企业员工账号完成身份验证
            </Text>
          </View>

          {authError ? (
            <Card mode="contained" style={styles.errorCard}>
              <Card.Content style={styles.errorContent}>
                <Icon
                  source="alert-circle-outline"
                  size={22}
                  color={colors.risk}
                />
                <Text variant="bodySmall" style={styles.errorText}>
                  {authError}
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          <TextInput
            mode="outlined"
            label="员工账号"
            value={account}
            autoCapitalize="characters"
            autoCorrect={false}
            error={accountError}
            disabled={loading}
            left={<TextInput.Icon icon="account-outline" />}
            onBlur={() => setAccountTouched(true)}
            onChangeText={(value) => {
              setAccount(value);
              clearAuthError();
            }}
          />
          {accountError ? (
            <Text variant="bodySmall" style={styles.fieldError}>
              请输入员工账号
            </Text>
          ) : null}

          <TextInput
            mode="outlined"
            label="密码"
            value={password}
            secureTextEntry={!passwordVisible}
            error={passwordError}
            disabled={loading}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                onPress={() => setPasswordVisible((visible) => !visible)}
              />
            }
            onBlur={() => setPasswordTouched(true)}
            onChangeText={(value) => {
              setPassword(value);
              clearAuthError();
            }}
            onSubmitEditing={() => void submit()}
          />
          {passwordError ? (
            <Text variant="bodySmall" style={styles.fieldError}>
              密码至少需要 6 位
            </Text>
          ) : null}

          <Button
            mode="contained"
            loading={loading}
            disabled={loading}
            contentStyle={styles.button}
            onPress={() => void submit()}
          >
            {loading ? "正在验证身份" : "登录"}
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.privacy}>
        <Icon source="shield-lock-outline" size={20} color={colors.brand} />
        <Text variant="bodySmall" style={styles.privacyText}>
          系统仅展示当前账号获授权的个人培训任务与记录。登录即表示你同意按企业制度使用培训数据。
        </Text>
      </View>
      <Text variant="bodySmall" style={styles.help}>
        无法登录或身份信息有误？请联系培训管理员。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  brandBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md
  },
  mark: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.lg,
    backgroundColor: colors.brand
  },
  markText: {
    color: colors.surface,
    fontWeight: "800"
  },
  brandCopy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "800"
  },
  subtitle: {
    color: colors.textSecondary
  },
  card: {
    borderRadius: radii.lg,
    backgroundColor: colors.surface
  },
  form: {
    gap: spacing.md,
    paddingVertical: spacing.lg
  },
  formHeading: {
    gap: spacing.xs,
    marginBottom: spacing.sm
  },
  formTitle: {
    color: colors.text,
    fontWeight: "700"
  },
  muted: {
    color: colors.textSecondary
  },
  errorCard: {
    backgroundColor: colors.riskSoft
  },
  errorContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm
  },
  errorText: {
    flex: 1,
    color: colors.risk,
    lineHeight: 19
  },
  fieldError: {
    marginTop: -spacing.sm,
    color: colors.risk
  },
  button: {
    height: 50
  },
  privacy: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.brandSoft
  },
  privacyText: {
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 19
  },
  help: {
    color: colors.textMuted,
    textAlign: "center"
  }
});
