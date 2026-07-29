import type { ReactNode } from "react";
import { Breadcrumb, Flex, Typography } from "antd";

interface PageHeaderProps {
  title: string;
  description: string;
  eyebrow?: string;
  extra?: ReactNode;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  extra
}: PageHeaderProps) {
  return (
    <div className="page-heading">
      <Breadcrumb
        items={[
          { title: "特钢智教" },
          { title: eyebrow ?? title }
        ]}
      />
      <Flex justify="space-between" align="flex-start" gap={24}>
        <div>
          {eyebrow ? (
            <Typography.Text className="eyebrow">
              {eyebrow}
            </Typography.Text>
          ) : null}
          <Typography.Title level={2}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">
            {description}
          </Typography.Paragraph>
        </div>
        {extra ? <div className="page-heading__extra">{extra}</div> : null}
      </Flex>
    </div>
  );
}
