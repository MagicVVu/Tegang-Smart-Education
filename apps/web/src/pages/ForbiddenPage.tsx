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
      subTitle="当前账号不能访问此页面。为保护业务数据，页面内容不会显示；如需权限，请联系系统管理员。"
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
          退出登录
        </Button>
      ]}
    />
  );
}
