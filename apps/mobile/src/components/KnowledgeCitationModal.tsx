import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Divider,
  Icon,
  Modal,
  Portal,
  Surface,
  Text
} from "react-native-paper";
import { colors, radii, spacing } from "@tegang/design-tokens";
import { useKnowledgeCitations } from "../hooks/useKnowledgeCitations";

export function KnowledgeCitationModal({
  visible,
  onDismiss,
  citationIds
}: {
  visible: boolean;
  onDismiss: () => void;
  citationIds?: readonly string[];
}) {
  const {
    citations,
    loading,
    error,
    reload
  } = useKnowledgeCitations(visible, citationIds);

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.surface} elevation={2}>
          <View style={styles.headingRow}>
            <View style={styles.headingCopy}>
              <Text variant="titleLarge" style={styles.title}>
                知识来源
              </Text>
              <Text variant="bodySmall" style={styles.help}>
                核对来源、版本、适用范围和现行状态
              </Text>
            </View>
            <Button compact onPress={onDismiss}>
              关闭
            </Button>
          </View>
          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.brand} />
              <Text variant="bodyMedium">正在加载知识来源…</Text>
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Icon source="file-alert-outline" size={38} color={colors.risk} />
              <Text variant="titleSmall">来源暂时无法显示</Text>
              <Text variant="bodySmall" style={styles.help}>
                {error}
              </Text>
              <Button mode="contained" onPress={() => void reload()}>
                重新加载
              </Button>
            </View>
          ) : (
            <ScrollView style={styles.scroll}>
              {citations.map((item, index) => (
                <View key={item.id}>
                  <View style={styles.citation}>
                    <Text variant="titleMedium" style={styles.documentName}>
                      {item.document_name}
                    </Text>
                    <View style={styles.metaRow}>
                      <Text variant="labelMedium" style={styles.effective}>
                        现行有效
                      </Text>
                      <Text variant="bodySmall" style={styles.help}>
                        {item.document_version} · {(item.authorized_scopes ?? []).join("、")}
                      </Text>
                    </View>
                    <Text variant="bodyMedium" style={styles.section}>
                      {item.section}
                    </Text>
                    <Text variant="bodyMedium" style={styles.excerpt}>
                      {item.excerpt}
                    </Text>
                    <Text variant="bodySmall" style={styles.help}>
                      与本课程的关系：{item.relation}
                    </Text>
                  </View>
                  {index < citations.length - 1 ? <Divider /> : null}
                </View>
              ))}
            </ScrollView>
          )}
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    maxHeight: "86%"
  },
  surface: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.md
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md
  },
  headingCopy: {
    flex: 1,
    gap: spacing.xs
  },
  title: {
    color: colors.text,
    fontWeight: "700"
  },
  help: {
    color: colors.textSecondary,
    lineHeight: 18
  },
  state: {
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md
  },
  scroll: {
    maxHeight: 520
  },
  citation: {
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  documentName: {
    color: colors.text,
    fontWeight: "700"
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: spacing.sm
  },
  effective: {
    color: colors.success,
    fontWeight: "700"
  },
  section: {
    color: colors.textSecondary
  },
  excerpt: {
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
    backgroundColor: colors.infoSoft,
    color: colors.text,
    lineHeight: 22
  }
});
