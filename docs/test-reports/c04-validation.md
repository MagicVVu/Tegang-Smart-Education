# C-04 FastAPI、React 与数据库最小业务骨架验证记录

验证日期：2026-08-10  
验证环境：Windows、Python 3.12.13、Node 24.18.0、Docker Engine 29.2.1、Docker Compose 5.1.0、PostgreSQL 16/pgvector 0.8.2、Redis 7.4.10。

## 实际增量

- FastAPI 应用工厂、Router、依赖注入、环境配置、受限 CORS/OpenAPI；
- request_id/trace_id 中间件、结构化访问日志和 C-03 统一安全错误；
- SQLAlchemy 2.0.51、Alembic 1.18.5 与哈希锁文件；
- Department、Role、User 及用户—角色/部门关联的首个迁移；
- API → Service → Repository → SQLAlchemy → PostgreSQL 只读纵向接口；
- Web HTTP Client、运行状态 Adapter 和单元测试；
- Compose 一次性迁移服务和同一 CI 工作流的后端/迁移 job。

没有调用模型 API，没有产生模型费用，没有写入真实员工或企业数据。

## 自动化检查

| 命令 | 实际结果 |
| --- | --- |
| `.venv\Scripts\python.exe -m compileall -q backend` | 通过 |
| `.venv\Scripts\python.exe -m pytest backend/tests` | 28 passed，127 contract subtests passed；1 条上游 TestClient 弃用警告 |
| `.venv\Scripts\python.exe backend/scripts/export_contracts.py --check` | 101 个生成文件无漂移 |
| `pnpm typecheck` | 7 个 workspace 项目通过 |
| `pnpm lint` | 通过，0 warning |
| `vitest run` | 6 files、24 tests 通过 |
| `pnpm build:web` / Docker Web build | 4,850 modules，生产构建通过 |
| `docker compose config --quiet` | 通过 |
| `alembic check`（当前 PostgreSQL） | `No new upgrade operations detected.` |
| `git diff --check` | 通过 |

Codex 内置 pnpm 进程报告其 Node 为 24.14.0，低于仓库 24.18.0；系统 Node 与 Docker 构建实际使用 24.18.0，CI 已改为读取 `.node-version`。该提示未被描述为项目通过证据。

Python 测试中的 `StarletteDeprecationWarning` 来自当前 FastAPI TestClient 对 `httpx` 的上游兼容提示；测试结果为通过，本轮未额外引入预发布替代包。

## PostgreSQL 与迁移

主 Compose 首次启动日志：

```text
Running upgrade  -> 20260810_0001, Create the minimal C-04 identity persistence foundation.
migrate: Exited (0)
backend: healthy
web: healthy
```

一次性数据库 `tegang_c04_validation_019feacd` 实际执行：

```text
[PASS] Alembic upgrade -> downgrade -> upgrade reached 20260810_0001.
```

随后写入一条明确标记为 synthetic 的 Department 探针，重启 PostgreSQL 容器后查询计数仍为 `1`，`/health/ready` 恢复为 `ready`。验证结束后仅删除该一次性数据库并确认数量为 `0`；主运行数据库、PostgreSQL/Redis 命名卷未删除或回退。

## HTTP 与 Compose

- `/health/live`：`ok`；
- `/health/ready`：`ready`；
- `/health/dependencies`：database、redis、model_configuration 均存在且不暴露凭证；
- `/api/v1/system/database-status`：HTTP 200，`schema_version=2.1.0`、`migration_revision=20260810_0001`；
- 指定的 `req_...` 与 `trc_...` 同时出现在响应体和响应头；
- Web 首页：HTTP 200；
- db、redis、backend、web healthy，migrate 成功退出 0。

首次并行构建时发现 backend 与 migrate 对相同镜像标签存在导出竞争；调整为 migrate 只复用 backend 镜像后，最终 `docker compose build backend web` 成功。该失败已解决且未影响数据。

## CI 与未执行项

`.github/workflows/ci.yml` 已增加 Python 3.12 锁定安装、PostgreSQL 一次性数据库、后端测试、契约漂移和可逆迁移验证，并将 Node 改为 `.node-version`。本地已验证 YAML 内容和对应命令，但本任务没有 push，因此 GitHub Actions 尚未实际运行，不能描述为 CI 已通过。

## 已知限制

- 当前无完整认证、企业身份源或业务授权实现；
- 只读数据库状态是运维接口，不返回身份或业务数据；
- 培训、审批、测评、报告、Agent 和 Android 继续使用既有原型 Adapter；
- 没有 Agent、RAG、模型调用、Redis 队列、生产部署或性能测试；
- Compose 项目名为保护既有卷继续保留 C-02 标识，镜像与运行内容已升级为 C-04。
