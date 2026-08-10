import {
  AuditOutlined,
  BookOutlined,
  LockOutlined,
  MobileOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Row,
  Tag,
  Typography
} from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  canAccessPath,
  homeRouteForRole
} from "@tegang/business-rules";
import { roleLabels } from "@tegang/shared-utils";
import type { ContractPrototypeUserProfile, ContractUserRole } from "@tegang/types";
import { services } from "../services";

const icons: Record<ContractUserRole, React.ReactNode> = {
  employee: <MobileOutlined />,
  training_admin: <BookOutlined />,
  reviewer: <AuditOutlined />,
  system_admin: <SettingOutlined />
};

interface LoginValue {
  account: string;
  password: string;
}

export function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [developmentProfiles, setDevelopmentProfiles] = useState<ContractPrototypeUserProfile[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    void services.auth
      .listDevelopmentProfiles()
      .then(setDevelopmentProfiles);
  }, []);

  const finishLogin = (role: ContractUserRole) => {
    const requestedPath = (
      location.state as { from?: string } | null
    )?.from;
    const target =
      requestedPath &&
      requestedPath !== "/forbidden" &&
      canAccessPath(role, requestedPath)
        ? requestedPath
        : homeRouteForRole(role);
    navigate(target, { replace: true });
  };

  const handleLogin = async (values: LoginValue) => {
    setSubmitting(true);
    setError(undefined);
    try {
      const result = await services.auth.login(values);
      finishLogin(result.data.user.role);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "认证服务暂时不可用，请稍后重试。",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDevelopmentLogin = async (role: ContractUserRole) => {
    setSubmitting(true);
    setError(undefined);
    try {
      await services.auth.developmentLogin(role);
      // 开发快捷入口始终进入对应角色的首页，
      // 不使用 location.state.from 避免跨角色残留跳转
      navigate(homeRouteForRole(role), { replace: true });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "当前开发账号不可用。",
      );
    } finally {
      setSubmitting(false);
    }
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
            受控执行
          </Tag>
          <Tag icon={<RobotOutlined />} color="purple">
            动态规划
          </Tag>
          <Tag color="green">引用可追溯</Tag>
          <Tag color="orange">高风险先审批</Tag>
        </Flex>
        <div className="login-boundary">
          <strong>企业数据保护</strong>
          <span>
            登录后仅展示当前账号获授权的部门、任务和业务操作，关键操作将记录审计信息。
          </span>
        </div>
      </section>

      <section className="login-panel">
        <Card className="login-card" variant="borderless">
          <Typography.Text className="eyebrow">统一身份认证</Typography.Text>
          <Typography.Title level={2}>登录培训管理平台</Typography.Title>
          <Typography.Paragraph type="secondary">
            使用企业账号登录。系统将根据账号权限进入工作台、审批中心或系统管理空间。
          </Typography.Paragraph>

          {error ? (
            <Alert
              type="error"
              showIcon
              title="登录失败"
              description={error}
              closable
              onClose={() => setError(undefined)}
              style={{ marginBottom: 20 }}
            />
          ) : null}

          <Form<LoginValue>
            layout="vertical"
            onFinish={handleLogin}
            requiredMark="optional"
          >
            <Form.Item
              name="account"
              label="企业账号"
              rules={[{ required: true, message: "请输入企业账号" }]}
            >
              <Input
                autoComplete="username"
                prefix={<UserOutlined />}
                placeholder="请输入工号或企业账号"
                size="large"
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: "请输入密码" },
                { min: 6, message: "密码至少 6 位" }
              ]}
            >
              <Input.Password
                autoComplete="current-password"
                prefix={<LockOutlined />}
                placeholder="请输入密码"
                size="large"
              />
            </Form.Item>
            <Flex justify="space-between" align="center" className="login-help">
              <Typography.Text type="secondary">
                登录即表示你同意按企业安全规范使用授权数据。
              </Typography.Text>
              <Button type="link">无法登录？</Button>
            </Flex>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={submitting}
            >
              登录
            </Button>
          </Form>
        </Card>

        {import.meta.env.DEV && developmentProfiles.length ? (
          <section className="development-login" aria-label="开发环境快捷入口">
            <Divider>开发环境快捷入口</Divider>
            <Typography.Paragraph type="secondary">
              仅在本地开发环境显示，用于验证角色导航与权限边界。
            </Typography.Paragraph>
            <Row gutter={[12, 12]}>
              {developmentProfiles.map((user) => (
                <Col span={6} key={user.role}>
                  <Card
                    size="small"
                    className="role-card"
                    hoverable
                    onClick={() => handleDevelopmentLogin(user.role)}
                  >
                    <div className="role-card__icon">{icons[user.role]}</div>
                    <strong>{roleLabels[user.role]}</strong>
                    <Typography.Text type="secondary">
                      {user.display_name}
                    </Typography.Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </section>
        ) : null}
      </section>
    </main>
  );
}
