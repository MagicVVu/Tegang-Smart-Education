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
          title="请在“特钢智教”移动端继续学习"
          subTitle="员工学习、智能辅导、测评、补训与复测在移动端完成；管理、审批和系统诊断信息不会向员工账号开放。"
          extra={
            <Flex vertical gap={12} align="center">
              <Tag icon={<QrcodeOutlined />} color="blue">
                员工 E-0231 · 炼钢生产部
              </Tag>
              <Typography.Text type="secondary">
                使用企业移动应用扫码或从工作台待办进入本人培训任务
              </Typography.Text>
              <Button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                退出登录
              </Button>
            </Flex>
          }
        />
      </Card>
    </main>
  );
}
