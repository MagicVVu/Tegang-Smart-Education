# 前端 Monorepo 与服务边界

## 组成

- `apps/web`：面向培训管理员、审核员和系统管理员的 React Web。
- `apps/mobile`：面向员工学习闭环的 React Native Android 应用。
- `packages/types`：业务对象、状态、角色和服务接口。
- `packages/mock-data`：有明确演示标记的旗舰任务数据。
- `packages/business-rules`：权限、风险、发布、测评和恢复规则。
- `packages/design-tokens`：跨端语义色、字号、间距、圆角与阴影。
- `packages/shared-utils`：状态文案、格式化和 Mock 请求工具。

## Mock 与 FastAPI 切换

页面只调用 `services` 暴露的接口，不直接读取散落 JSON。当前服务实现位于：

- `apps/web/src/services/mock-services.ts`
- `apps/mobile/src/services/mock-services.ts`

未来接入 FastAPI 时：

1. 保留 `packages/types` 中的请求/响应类型。
2. 在各端 `services` 中增加 HTTP 实现。
3. 从 `VITE_API_BASE_URL` 或 `EXPO_PUBLIC_API_BASE_URL` 读取基础地址。
4. 在 `services/index.ts` 根据环境选择 Mock 或 HTTP 实现。
5. 统一处理加载、错误、权限和请求 ID，不改写页面业务结构。

## 状态与可恢复性

原型使用 Zustand 保存当前会话状态。Agent 失败只允许有限重试，可回退到已记录的稳定检查点，或进入人工接管。高风险正式写入在审批前不会发生。
