# 前端 Monorepo 与服务边界

## 组成

- `apps/web`：面向培训管理员、审核员和系统管理员的 React Web。
- `apps/mobile`：面向员工学习闭环的 React Native Android 应用。
- `packages/types`：业务对象、状态、角色和服务接口。
- `packages/mock-data`：有明确演示标记的旗舰任务数据。
- `packages/business-rules`：权限、风险、发布、测评和恢复规则。
- `packages/design-tokens`：跨端语义色、字号、间距、圆角与阴影。
- `packages/shared-utils`：状态文案、格式化和 Mock 请求工具。

## Mock 与 FastAPI 过渡边界

页面只调用 `services` 暴露的接口，不直接读取散落 JSON。当前服务实现位于：

- `apps/web/src/services/mock-services.ts`
- `apps/mobile/src/services/mock-services.ts`

当前持久化与身份基础已完成：

1. Web 在 `apps/web/src/services/http-client.ts` 建立统一 HTTP Client；
2. 从 `VITE_API_BASE_URL` 读取后端地址并统一处理超时、安全错误、request_id 和 trace_id；
3. `runtime` Adapter 调用只读 `/api/v1/system/database-status`；
4. 现有培训、审批、测评、报告和 Agent 服务继续使用 Mock Adapter；
5. 后续每实现一个正式业务 API，再按 C-03 契约逐项替换对应 Adapter，不改写页面业务结构。

认证已从原型边界中单独切换为正式 HTTP：Web 的 Access Token 仅保存在模块内存，Refresh Token 使用 HttpOnly Cookie，启动时通过 refresh/me 恢复并把后端 Principal 写入 Zustand；演示身份卡受前后端 `DEMO_MODE` 双重控制。Android 使用同一认证 API，只允许 employee Principal，并把 Refresh Token 写入 Expo SecureStore，Access Token 仍只驻留内存。培训、审批、测评、报告和 Agent 业务 Adapter 仍保持既有 Mock，等待各自业务 API 落地。

系统数据库状态属于运维接口，不是产品数据，因此不进入 C-03 Schema/TypeScript 生成链。正式产品数据接口仍必须先更新 Pydantic 权威契约并完成生成与漂移测试。

## 状态与可恢复性

Zustand 正式会话保存服务端确认的 Principal 和主角色，不保存 Access/Refresh Token；角色和 capabilities 只用于交互层保护，后端仍是安全权威。原型业务状态继续保存在 Zustand。Agent 失败只允许有限重试，可回退到已记录的稳定检查点，或进入人工接管。高风险正式写入在审批前不会发生。
