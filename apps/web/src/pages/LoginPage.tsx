import {
  AuditOutlined,
  BookOutlined,
  MobileOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined
} from "@ant-design/icons";
import { Button, Card, Col, Flex, Row, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import { homeRouteForRole } from "@tegang/business-rules";
import { demoUsers } from "@tegang/mock-data";
import { roleLabels } from "@tegang/shared-utils";
import type { UserRole } from "@tegang/types";
import { usePrototypeStore } from "../stores/prototype-store";

const icons: Record<UserRole, React.ReactNode> = {
  employee: <MobileOutlined />,
  training_admin: <BookOutlined />,
  reviewer: <AuditOutlined />,
  system_admin: <SettingOutlined />
};

const descriptions: Record<UserRole, string> = {
  employee: "移动端完成学习、智能辅导、测评、补训与复测。",
  training_admin: "创建培训目标、确认方案、下发任务并跟踪报告。",
  reviewer: "在高风险动作执行前核对依据、影响并作出决定。",
  system_admin: "维护知识与规则配置，查看开发者 Trace。"
};

export function LoginPage() {
  const login = usePrototypeStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = (role: UserRole) => {
    login(role);
    navigate(homeRouteForRole(role));
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="login-brand">
          <div className="brand__mark brand__mark--large">T</div>
          <div>
            <Typography.Text className="eyebrow">
              特钢企业员工培训
            </Typography.Text>
            <Typography.Title>特钢智教 AI Agent</Typography.Title>
          </div>
        </div>
        <Typography.Paragraph className="login-lead">
          将培训目标、员工上下文与可追溯知识转化为可审核、可调整的个性化培训闭环。
        </Typography.Paragraph>
        <Flex gap={8} wrap>
          <Tag icon={<SafetyCertificateOutlined />} color="blue">
            受控自主
          </Tag>
          <Tag icon={<RobotOutlined />} color="purple">
            动态规划
          </Tag>
          <Tag color="green">引用可追溯</Tag>
          <Tag color="orange">高风险先审批</Tag>
        </Flex>
        <div className="login-boundary">
          <strong>演示说明</strong>
          <span>
            所有账号和业务数据均为模拟数据。不同身份具有独立导航、路由和操作权限。
          </span>
        </div>
      </section>
      <section className="login-panel">
        <div>
          <Typography.Text className="eyebrow">P-00 身份入口</Typography.Text>
          <Typography.Title level={2}>选择演示身份</Typography.Title>
          <Typography.Paragraph type="secondary">
            角色切换相当于重新登录，不会在当前会话中绕过权限。
          </Typography.Paragraph>
        </div>
        <Row gutter={[16, 16]}>
          {demoUsers.map((user) => (
            <Col span={12} key={user.role}>
              <Card
                className="role-card"
                hoverable
                onClick={() => handleLogin(user.role)}
              >
                <div className="role-card__icon">{icons[user.role]}</div>
                <Typography.Title level={4}>
                  {roleLabels[user.role]}
                </Typography.Title>
                <Typography.Paragraph type="secondary">
                  {descriptions[user.role]}
                </Typography.Paragraph>
                <Typography.Text>{user.displayName}</Typography.Text>
                <Button type="link" block>
                  以该身份进入
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      </section>
    </main>
  );
}
