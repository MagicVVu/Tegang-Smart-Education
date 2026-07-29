import { LockOutlined } from "@ant-design/icons";
import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { homeRouteForRole } from "@tegang/business-rules";
import { usePrototypeStore } from "../stores/prototype-store";

export function ForbiddenPage() {
  const role = usePrototypeStore((state) => state.role);
  const navigate = useNavigate();
  return (
    <Result
      icon={<LockOutlined />}
      status="403"
      title="无权限访问"
      subTitle="当前角色没有该页面或数据范围的访问权限。导航隐藏和路由校验均已生效。"
      extra={[
        <Button
          key="home"
          type="primary"
          onClick={() =>
            navigate(role ? homeRouteForRole(role) : "/login")
          }
        >
          返回当前角色首页
        </Button>,
        <Button key="login" onClick={() => navigate("/login")}>
          退出并切换身份
        </Button>
      ]}
    />
  );
}
