import { ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  Modal,
  Portal,
  Surface,
  Text
} from "react-native-paper";
import { knowledgeCitations } from "@tegang/mock-data";
import { colors, radii, spacing } from "@tegang/design-tokens";

export function KnowledgeCitationModal({
  visible,
  onDismiss,
  citationIds
}: {
  visible: boolean;
  onDismiss: () => void;
  citationIds?: string[];
}) {
  const citations = citationIds
    ? knowledgeCitations.filter((item) => citationIds.includes(item.id))
    : knowledgeCitations;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Surface style={styles.surface} elevation={2}>
          <Text variant="titleLarge" style={styles.title}>
            知识引用
          </Text>
          <Text variant="bodySmall" style={styles.help}>
            展示来源、版本、适用范围和当前内容关系。
          </Text>
          <ScrollView style={styles.scroll}>
            {citations.map((item, index) => (
              <View key={item.id}>
                <View style={styles.citation}>
                  <Text variant="titleMedium">{item.documentName}</Text>
                  <Text variant="labelMedium" style={styles.effective}>
                    {item.version} · {item.department} · 现行有效
                  </Text>
                  <Text variant="bodyMedium" style={styles.section}>
                    {item.section}
                  </Text>
                  <Text variant="bodyMedium" style={styles.excerpt}>
                    {item.excerpt}
                  </Text>
                  <Text variant="bodySmall" style={styles.help}>
                    与当前内容关系：{item.relation}
                  </Text>
                </View>
                {index < citations.length - 1 ? <Divider /> : null}
              </View>
            ))}
          </ScrollView>
          <Button mode="contained" onPress={onDismiss}>
            我知道了
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: spacing.lg,
    maxHeight: "84%"
  },
  surface: {
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    gap: spacing.sm
  },
  title: {
    color: colors.text,
    fontWeight: "700"
  },
  help: {
    color: colors.textSecondary,
    lineHeight: 18
  },
  scroll: {
    maxHeight: 470,
    marginVertical: spacing.sm
  },
  citation: {
    paddingVertical: spacing.md,
    gap: spacing.sm
  },
  effective: {
    color: colors.success
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
