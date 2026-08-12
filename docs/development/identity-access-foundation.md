# 组织、身份与权限基础

## 边界

本实现基于现有 FastAPI、SQLAlchemy、Alembic、统一错误、请求关联和 Web HTTP Client 增量建设，不接入真实 LDAP/AD/SSO/HR，不导入真实员工数据，也不实现完整 IAM 后台。所有组织、部门、岗位和账号均明确属于模拟身份基线。

## 组织与持久化

迁移 `20260810_0002` 追加组织、岗位、员工画像、凭证、部门授权范围、认证会话、Refresh Token 和安全审计表；历史迁移 `20260810_0001` 未修改。实体继续使用内部 bigint 主键和外部 `<prefix>_<ULID>` 双层标识。

最小模拟组织包含炼钢生产部、培训管理、安全管理和智信部，以及 E-0231、A-001、R-001、S-001 四个账号标识。四个账号分别绑定 employee、training_admin、reviewer、system_admin；培训管理员和审核员仅获得显式的炼钢生产部数据范围，系统管理员不因此获得员工培训数据。

## 安全初始化

先在本机未提交的 `.env` 中填写四个 `BOOTSTRAP_*_PASSWORD`，每项至少 12 个字符，然后执行：

```powershell
pnpm db:upgrade
pnpm identity:bootstrap
```

bootstrap 幂等：已有密码哈希默认不变；只有明确设置 `BOOTSTRAP_ROTATE_PASSWORDS=true` 才轮换。密码仅从环境变量读取，不打印、不进入迁移、源码、文档或 Git。数据库只保存 Argon2id 哈希。

## 认证与会话

- `POST /api/v1/auth/login`：统一账号/密码错误，未知账号也执行 dummy Argon2 校验；
- `POST /api/v1/auth/refresh`：随机 Refresh Token 仅保存 SHA-256 哈希，每次使用即轮换；复用旧 Token 会撤销整条会话；
- `POST /api/v1/auth/logout`：撤销当前会话及其 Refresh Token；
- `GET /api/v1/auth/me`：从数据库重新读取当前用户、角色和范围，返回 fresh Principal；
- `GET /api/v1/auth/demo-profiles`、`POST /api/v1/auth/demo-login`：仅 `DEMO_MODE=true` 可用。

Access Token 是短时 HS256 JWT，校验 `sub/sid/jti/iss/aud/iat/nbf/exp`，只含身份和会话 ID，不含密码、完整权限、员工信息或实时授权依据。缺少至少 32 字符的 `AUTH_JWT_SECRET` 时认证功能不可用；生产环境会在启动配置校验阶段拒绝缺失密钥。

Web Refresh Token 使用 HttpOnly、受控 SameSite、生产 Secure Cookie；Refresh/Logout 同时验证 Origin 与双提交 CSRF。Android 后端只接受 employee Principal，Refresh Token 写入 Expo SecureStore，Access Token 仅驻留内存，均不进入 AsyncStorage 或日志。

## 授权与防枚举

后端授权先检查 capability，再检查本人、部门、审批分配或 Trace 类型等资源属性，默认拒绝。员工身份查询在 Repository 查询中直接加入本人/授权部门过滤；直接访问未授权员工或跨部门资源统一返回 404，动作能力不足返回 403，未登录返回 401。系统管理员只有系统配置和开发者 Trace 权限，不自动拥有员工数据权限。前端 Principal/capabilities 仅用于菜单、路由和按钮提示，不能替代 API 判定。

## 审计

登录成功/失败、Access 拒绝、Refresh 成功/复用、Logout、Demo 登录、受保护资源允许/拒绝均写安全审计。记录主体、会话、有效角色、动作、资源与部门、allow/deny、reason、request_id、trace_id 和截断的客户端类型/User-Agent；不记录密码、Token、Cookie、密钥或完整请求体。

## 已知限制

- 当前仅提供一个最小受保护员工身份读取切片；培训、审批、报告和 Agent 业务 API 尚未实现。
- Android 认证已正式接入，但其余移动业务服务仍是既有 Mock Adapter。
- 未接入真实企业身份源、多因素认证、密钥托管、设备证明或集中审计平台。
- 本机账号只有在操作者自行配置未提交密码并执行 bootstrap 后才会存在。

实际命令与结果见 [验证记录](../test-reports/c06-validation.md)。
