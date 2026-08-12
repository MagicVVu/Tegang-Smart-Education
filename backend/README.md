# backend

业务 API、身份与权限、培训任务、审批、报告和系统状态的后端代码域。当前在既有持久化骨架之上提供最小可运行的组织、身份、会话、RBAC、数据范围与安全审计基础。

## 当前分层

- `app/main.py`：应用工厂、Router 注册、CORS/OpenAPI 和生命周期；
- `app/api`：HTTP 路由与依赖组合；
- `app/config.py`、`app/observability.py`、`app/errors.py`：环境配置、结构化请求日志和安全错误；
- `app/database.py`：SQLAlchemy Engine、Session 与事务边界；
- `app/models`：独立于 Pydantic 的持久化模型；
- `app/repositories`：数据库访问；
- `app/services`：不进入路由的应用逻辑；
- `app/schemas`：C-03 权威 Pydantic 契约，未复制为 ORM；
- `migrations`：Alembic 迁移。

## API

- `GET /health/live`：仅确认进程存活；
- `GET /health/ready`：检查 PostgreSQL/pgvector、Redis 和模型配置是否就绪；
- `GET /health/dependencies`：返回不含凭证的依赖摘要；
- `GET /api/v1/system/database-status`：只读运维状态，贯通 API、Service、Repository、SQLAlchemy 与 PostgreSQL；
- `POST /api/v1/auth/login|refresh|logout`：Web 与 Android 正式认证链路；
- `GET /api/v1/auth/me`：从服务端会话和最新授权关系重建当前主体；
- `GET /api/v1/identity/employee-profiles/{employee_profile_id}`：演示默认拒绝、能力校验和数据范围过滤的受保护资源；
- `backend/scripts/check_model.py`：显式、可能产生 API 费用的模型连通性检查。

系统状态接口不会开放用户、部门或培训数据，不属于产品业务契约，因此没有加入 C-03 生成链。统一错误继续复用 C-03 `ErrorResponse`。

## 迁移与身份初始化

`20260810_0001` 创建：

- `departments`、`roles`、`users`；
- `user_roles`、`user_departments`；
- 唯一外部 ID、`schema_version`、`entity_version`、UTC 时间和最小审计字段。

`20260810_0002` 在首个迁移之上增加组织、岗位、员工画像、凭据、会话、刷新令牌、安全审计与部门授权范围。迁移本身不写入账号或密码；受控的模拟身份由独立初始化脚本创建。

从仓库根目录启动：

```powershell
pnpm dev:backend
```

宿主机首次启动前执行：

```powershell
pnpm db:upgrade
pnpm identity:bootstrap
pnpm test:backend
```

可逆迁移验证只允许使用显式的 `MIGRATION_TEST_DATABASE_URL`，并且该地址不得等于 `DATABASE_URL`：

```powershell
pnpm test:migrations
```

身份初始化会从本地 `.env` 读取四个 `BOOTSTRAP_*_PASSWORD` 变量，密码至少 12 位；脚本幂等执行，默认不会轮换既有密码。禁止提交 `.env`。完整说明见 [组织、身份与权限基础](../docs/development/identity-access-foundation.md) 与 [后端与持久化骨架](../docs/development/c04-backend-persistence.md)。
