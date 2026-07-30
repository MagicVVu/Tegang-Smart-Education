import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { Button, Result } from "antd";

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<
  PropsWithChildren,
  AppErrorBoundaryState
> {
  override state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("Web 页面渲染失败", error, errorInfo);
    }
  }

  override render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="handoff-page">
        <Result
          status="500"
          title="页面暂时无法显示"
          subTitle="已保护当前数据。请重新加载页面；若问题持续，请联系系统管理员并提供发生时间。"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      </main>
    );
  }
}
