import type { PropsWithChildren } from "react";
import {
  AlertOutlined,
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  FileSearchOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  UserOutlined
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Flex,
  Layout,
  Menu,
  Space,
  Tag,
  Tooltip,
  Typography
} from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { demoUsers } from "@tegang/mock-data";
import { roleLabels } from "@tegang/shared-utils";
import type { UserRole } from "@tegang/types";
import { ScenarioSwitcher } from "../components/ScenarioSwitcher";
import { usePrototypeStore } from "../stores/prototype-store";

const { Header, Sider, Content } = Layout;

const navByRole: Record<
  Exclude<UserRole, "employee">,
  Array<{ key: string; icon: React.ReactNode; label: string }>
> = {
  training_admin: [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "工作台" },
    {
      key: "/admin/training/create",
      icon: <BookOutlined />,
      label: "新建培训任务"
    },
    {
      key: "/admin/plans/T-20260728-01",
      icon: <FileSearchOutlined />,
      label: "方案与任务详情"
    },
    {
      key: "/admin/reports/T-20260728-01",
      icon: <BarChartOutlined />,
      label: "培训报告"
    },
    {
      key: "/agent-runs/T-20260728-01",
      icon: <RobotOutlined />,
      label: "Agent运行中心"
    }
  ],
  reviewer: [
    { key: "/approvals", icon: <AuditOutlined />, label: "审批中心" },
    {
      key: "/admin/reports/T-20260728-01",
      icon: <BarChartOutlined />,
      label: "培训报告"
    },
    {
      key: "/agent-runs/T-20260728-01",
      icon: <RobotOutlined />,
      label: "Agent运行中心"
    }
  ],
  system_admin: [
    {
      key: "/system/knowledge",
      icon: <SettingOutlined />,
      label: "知识与配置"
    },
    {
      key: "/agent-runs/T-20260728-01",
      icon: <RobotOutlined />,
      label: "开发者Trace"
    }
  ]
};

export function AppShell({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useState(false);
  const role = usePrototypeStore((state) => state.role);
  const logout = usePrototypeStore((state) => state.logout);
  const navigate = useNavigate();
  const location = useLocation();

  if (!role || role === "employee") return <>{children}</>;

  const user = demoUsers.find((item) => item.role === role)!;
  const nav = navByRole[role];

  return (
    <Layout className="app-shell">
      <Sider
        width={232}
        collapsedWidth={76}
        collapsed={collapsed}
        className="app-sider"
      >
        <div className="brand">
          <div className="brand__mark">T</div>
          {!collapsed ? (
            <div>
              <strong>特钢智教</strong>
              <span>受控自主培训 Agent</span>
            </div>
          ) : null}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={nav}
          onClick={({ key }) => navigate(key)}
        />
        <div className="sider-boundary">
          {!collapsed ? (
            <>
              <SafetyCertificateOutlined />
              <div>
                <strong>权限已隔离</strong>
                <span>{roleLabels[role]}</span>
              </div>
            </>
          ) : (
            <Tooltip title={roleLabels[role]}>
              <SafetyCertificateOutlined />
            </Tooltip>
          )}
        </div>
      </Sider>
      <Layout>
        <Header className="app-header">
          <Flex justify="space-between" align="center">
            <Space size={16}>
              <Button
                type="text"
                aria-label={collapsed ? "展开导航" : "收起导航"}
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((value) => !value)}
              />
              <Tag color="blue">演示数据</Tag>
              <Typography.Text type="secondary">
                旗舰任务 T-20260728-01
              </Typography.Text>
            </Space>
            <Space size={16}>
              <ScenarioSwitcher />
              <Badge dot>
                <Button
                  type="text"
                  aria-label="消息提醒"
                  icon={<AlertOutlined />}
                />
              </Badge>
              <Avatar icon={<UserOutlined />} />
              <div className="current-user">
                <strong>{user.displayName}</strong>
                <span>{user.department}</span>
              </div>
              <Tooltip title="退出并切换演示身份">
                <Button
                  type="text"
                  aria-label="退出登录"
                  icon={<LogoutOutlined />}
                  onClick={() => {
                    logout();
                    navigate("/login");
                  }}
                />
              </Tooltip>
            </Space>
          </Flex>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
