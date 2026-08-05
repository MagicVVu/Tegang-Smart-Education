import { useMemo } from "react";
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Flex,
  List,
  Tag,
  Typography
} from "antd";
import { knowledgeCitations } from "../services/workspace-data";

interface KnowledgeDrawerProps {
  open: boolean;
  onClose: () => void;
  citationIds?: string[];
}

export function KnowledgeDrawer({
  open,
  onClose,
  citationIds
}: KnowledgeDrawerProps) {
  const citations = useMemo(
    () =>
      citationIds
        ? knowledgeCitations.filter((item) =>
            citationIds.includes(item.id),
          )
        : knowledgeCitations,
    [citationIds],
  );

  return (
    <Drawer
      title="知识引用与有效性"
      width={520}
      open={open}
      onClose={onClose}
      footer={
        <Button type="primary" block onClick={onClose}>
          返回当前页面
        </Button>
      }
    >
      <Alert
        type="info"
        showIcon
        message="引用用于说明当前内容依据，不代表模型可以绕过权限或版本规则。"
        style={{ marginBottom: 20 }}
      />
      <List
        dataSource={citations}
        renderItem={(citation) => (
          <List.Item>
            <div className="citation-detail">
              <Flex justify="space-between" align="center" gap={12}>
                <Typography.Title level={5}>
                  {citation.document_name}
                </Typography.Title>
                <Tag color={citation.status === "effective" ? "green" : "red"}>
                  {citation.status === "effective"
                    ? "现行有效"
                    : citation.status === "conflict"
                      ? "版本冲突"
                      : "已过期"}
                </Tag>
              </Flex>
              <Descriptions
                column={1}
                size="small"
                items={[
                  { key: "version", label: "版本", children: citation.document_version },
                  {
                    key: "department",
                    label: "所属范围",
                    children: (citation.authorized_scopes ?? []).join("、")
                  },
                  { key: "section", label: "章节", children: citation.section }
                ]}
              />
              <blockquote>{citation.excerpt}</blockquote>
              <Typography.Paragraph type="secondary">
                与当前内容关系：{citation.relation}
              </Typography.Paragraph>
            </div>
          </List.Item>
        )}
      />
    </Drawer>
  );
}
