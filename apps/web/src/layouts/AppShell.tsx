import type { PropsWithChildren } from "react";
import {
  AlertOutlined,
  AuditOutlined,
  BarChartOutlined,
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
  Tooltip
} from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roleLabels } from "@tegang/shared-utils";
import { contractIds } from "@tegang/mock-data";
import type { ContractUserRole } from "@tegang/types";
import { usePrototypeStore } from "../stores/prototype-store";
import { services } from "../services";

const { Header, Sider, Content } = Layout;

const identityByRole: Record<
  Exclude<ContractUserRole, "employee">,
  { display_name: string; department_name: string }
> = {
  training_admin: {
    display_name: "培训管理员 A-001",
    department_name: "培训管理中心"
  },
  reviewer: {
    display_name: "审核员 R-001",
    department_name: "安全管理"
  },
  system_admin: {
    display_name: "系统管理员 S-001",
    department_name: "智信部"
  }
};

const navByRole: Record<
  Exclude<ContractUserRole, "employee">,
  Array<{ key: string; icon: React.ReactNode; label: string }>
> = {
  training_admin: [
    { key: "/admin/dashboard", icon: <DashboardOutlined />, label: "工作台" },
    {
      key: `/admin/plans/${contractIds.task}`,
      icon: <FileSearchOutlined />,
      label: "培训任务"
    },
    {
      key: `/admin/reports/${contractIds.task}`,
      icon: <BarChartOutlined />,
      label: "培训报告"
    },
    {
      key: `/agent-runs/${contractIds.task}`,
      icon: <RobotOutlined />,
      label: "Agent运行中心"
    }
  ],
  reviewer: [
    { key: "/approvals", icon: <AuditOutlined />, label: "审批中心" },
    {
      key: `/admin/reports/${contractIds.task}`,
      icon: <BarChartOutlined />,
      label: "培训报告"
    },
    {
      key: `/agent-runs/${contractIds.task}`,
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
      key: `/agent-runs/${contractIds.task}`,
      icon: <RobotOutlined />,
      label: "Agent运行中心"
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

  const user = identityByRole[role];
  const nav = navByRole[role];
  const selectedKey =
    nav.find((item) => location.pathname.startsWith(item.key))?.key ??
    location.pathname;

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
          selectedKeys={[selectedKey]}
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
              <div className="workspace-context">
                <strong>{roleLabels[role]}工作空间</strong>
                <span>当前数据范围：已授权部门与任务</span>
              </div>
            </Space>
            <Space size={16}>
              <Badge dot>
                <Button
                  type="text"
                  aria-label="消息提醒"
                  icon={<AlertOutlined />}
                />
              </Badge>
              <Avatar icon={<UserOutlined />} />
              <div className="current-user">
                <strong>{user.display_name}</strong>
                <span>{user.department_name}</span>
              </div>
              <Tooltip title="退出登录">
                <Button
                  type="text"
                  aria-label="退出登录"
                  icon={<LogoutOutlined />}
                  onClick={() => {
                    void services.auth.logout();
                    logout();
                    navigate("/login", { replace: true });
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
