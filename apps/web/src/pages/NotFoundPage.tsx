import { Button, Result } from "antd";
import { useNavigate } from "react-router-dom";
import { homeRouteForRole } from "@tegang/business-rules";
import { usePrototypeStore } from "../stores/prototype-store";

export function NotFoundPage() {
  const navigate = useNavigate();
  const role = usePrototypeStore((state) => state.role);

  return (
    <main className="handoff-page">
      <Result
        status="404"
        title="页面不存在"
        subTitle="链接可能已失效，或该页面已调整位置。"
        extra={
          <Button
            type="primary"
            onClick={() =>
              navigate(role ? homeRouteForRole(role) : "/login", {
                replace: true
              })
            }
          >
            返回可用页面
          </Button>
        }
      />
    </main>
  );
}
