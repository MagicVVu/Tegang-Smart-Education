# C-04｜FastAPI 与数据库最小业务骨架

## 范围与复用

C-04 增量复用 C-02 的 FastAPI 健康语义、Compose 四服务与命名卷，复用 C-03 Pydantic 契约和生成链，并保留现有 Web/Android 原型。没有重建路由、登录、布局、错误边界或 Mock 业务流程。

本轮不实现完整认证、培训 CRUD、审批闭环、Agent、RAG、模型调用、Redis 队列或 Android HTTP 切换。

## 后端依赖方向

```text
FastAPI Router
  -> Service
    -> Repository
      -> SQLAlchemy Session
        -> PostgreSQL

Pydantic API 契约 <-> 显式映射边界 <-> SQLAlchemy Record
```

- 路由只做 HTTP 输入输出和依赖注入；
- Service 负责迁移版本与持久化就绪判断；
- Repository 只负责 SQLAlchemy 查询；
- ORM Record 不继承或复制 Pydantic 模型；
- 配置只从环境变量读取。

## 配置与安全

- `DATABASE_URL`：后端与 Alembic 数据库地址；`postgresql://` 会规范为 psycopg 3 方言；
- `CORS_ORIGINS`：逗号分隔的明确来源；生产环境拒绝 `*`；
- `OPENAPI_ENABLED`：开发/测试默认启用，生产默认关闭；
- `LOG_LEVEL`：结构化请求日志等级；
- `X-Request-ID`、`X-Trace-ID`：合法 C-03 格式会透传，否则重新生成；
- 统一错误响应不返回连接串、密钥、堆栈或内部异常文本。

## 迁移边界

首个 revision 为 `20260810_0001`，包含：

| 表 | 用途 |
| --- | --- |
| `departments` | Department 最小组织节点与父部门引用 |
| `roles` | Role、角色代码与权限范围 JSON |
| `users` | 无凭证、无敏感 HR 字段的应用用户 |
| `user_roles` | 用户—角色多对多关联及分配审计 |
| `user_departments` | 用户—部门多对多关联及分配审计 |

实体表使用内部 bigint 主键，并以唯一、不可由业务语义推断的外部 ID 映射 C-03 `id`。包含 `schema_version`、`entity_version`、带时区的 `created_at/updated_at` 及 `created_by/updated_by`。Alembic 自带 `alembic_version`，没有额外版本表，也没有种子数据。

## 命令

```powershell
pnpm bootstrap
pnpm compose:infra
pnpm db:upgrade
pnpm dev:backend
pnpm test:backend
```

可逆验证必须指向明确的一次性数据库：

```powershell
$env:MIGRATION_TEST_DATABASE_URL = "postgresql://.../tegang_c04_test"
pnpm test:migrations
```

脚本拒绝 `MIGRATION_TEST_DATABASE_URL` 与运行时 `DATABASE_URL` 相同。不要在现有数据库上执行 downgrade。

完整 Compose 使用 `pnpm compose:up`，顺序为 `db healthy -> migrate completed -> backend healthy -> web`，Redis 与 backend 同时保持既有健康条件。Compose 项目名暂时保留 `tegang_smart_education_c02`，以保持既有容器和命名卷连续性；backend/web 镜像标签已更新为 `c04-0.2.0`。

## Web 过渡

`apps/web/src/services/http-client.ts` 统一基础地址、8 秒超时、错误解析和关联 ID。`services.runtime` 只访问只读数据库状态；原型业务服务仍来自 `mock-services.ts`。`VITE_API_BASE_URL` 是公开浏览器配置，禁止存放模型 Key 或其他 Secret。

## 验证

实际命令和结果见 [C-04 验证记录](../test-reports/c04-validation.md)。
