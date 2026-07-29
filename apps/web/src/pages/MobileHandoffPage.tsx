import { MobileOutlined, QrcodeOutlined } from "@ant-design/icons";
import { Button, Card, Flex, Result, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { usePrototypeStore } from "../stores/prototype-store";

export function MobileHandoffPage() {
  const logout = usePrototypeStore((state) => state.logout);
  const navigate = useNavigate();
  return (
    <main className="handoff-page">
      <Card className="handoff-card">
        <Result
          icon={<MobileOutlined />}
          title="员工学习任务在 Android 原型中完成"
          subTitle="Web 端不会向员工暴露审批、管理配置或完整技术 Trace。请启动 apps/mobile 体验学习、辅导、测评、补训和复测。"
          extra={
            <Flex vertical gap={12} align="center">
              <Tag icon={<QrcodeOutlined />} color="blue">
                员工 E-0231 · 炼钢生产部
              </Tag>
              <Typography.Text code>pnpm dev:mobile</Typography.Text>
              <Typography.Text code>pnpm android</Typography.Text>
              <Button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                退出并切换身份
              </Button>
            </Flex>
          }
        />
      </Card>
    </main>
  );
}
