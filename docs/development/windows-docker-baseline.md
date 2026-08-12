# C-02｜Windows 开发与 Docker 复现基线

> 本文保留 C-02 历史运行基线。C-04 已在其上增加 SQLAlchemy、Alembic、一次性 `migrate` 服务和最小纵向接口；当前操作说明见 [C-04 后端与持久化骨架](c04-backend-persistence.md)，C-02 历史验证报告未改写。

## 目标与批准边界

本基线采用 Windows 宿主机直接调试、Docker Compose 集成复现、Linux 容器在线部署标准三种模式。项目负责人于 2026-08-10 明确批准在 C-02 范围采用 FastAPI、PostgreSQL/pgvector、Redis、Docker Compose 和 OpenAI-compatible 模型配置，并批准 Redis 作为 Compose 基础依赖启用。

C-02 只负责运行入口、版本、依赖锁、健康检查、配置、容器顺序和可复现验证。禁止在本任务中创建正式业务 API、业务表、SQLAlchemy 领域模型、Alembic 业务迁移、Worker、LangGraph 节点或 RAG 实现。

## 当前仓库现状

- Web 位于 `apps/web`，继续使用 React、TypeScript 和 Vite；不存在第二套 `frontend` 应用。
- Android 位于 `apps/mobile`，继续使用 Expo SDK 54 和 React Native 0.81；不进入 Docker。
- 共享包位于 `packages`，由 pnpm workspace 管理。
- `backend/app/schemas` 是既有 Pydantic 契约单一事实源；C-02 在同一 `backend` 域增加最小健康入口。
- `agent_core`、`rag` 和 `evals` 当前没有可启动正式服务。
- `frontend` 与 `prototype` 是历史路径，本任务不删除、移动或重命名。
- Web 和 Android 业务服务当前仍使用既有 Mock 适配器。它们不属于正式运行的模型 Mock 模式，也不是 C-02 模型验收依据；正式 HTTP 业务适配由 C-04 后续实现。

## 版本基线

| 组件 | 默认版本 | 最低兼容版本 | 锁定方式 | 选择依据 | 替换条件 |
| --- | --- | --- | --- | --- | --- |
| Python | 3.12.13 | 3.12.10 | `.python-version`、`pyproject.toml`、后端镜像 | 现有 Pydantic 契约兼容；3.12.10 是 3.12 最后一个带 Windows 传统安装器的维护版，3.12.13 是当前安全修复版 | 安全支持结束或依赖完成新版本验证 |
| Node.js | 24.18.0 LTS | 24.18.0 | `.nvmrc`、`.node-version`、`package.json#engines`、Web 镜像 | 24 是当前 LTS；Node 20 在当前日期已 EOL | Expo/Web/构建链在下一 LTS 完成验证 |
| pnpm | 11.9.0 | 11.9.0 | `packageManager`、Corepack、`pnpm-lock.yaml` | 延续仓库已固定版本 | 锁文件和全部 workspace 检查通过后升级 |
| PostgreSQL | 16（当前官方补丁 16.14） | 16 | `pgvector/pgvector:0.8.2-pg16-bookworm` | 16 支持至 2028-11；避免本任务跨主版本 | 执行备份/恢复或 `pg_upgrade` 评审后升级主版本 |
| pgvector | 0.8.2 | 0.8.2 | 同一显式镜像标签、初始化 SQL | 官方镜像支持 PostgreSQL 16 | 检索质量/兼容性验证后升级 |
| Redis Server | 7.4.10 | 7.4 | `redis:7.4.10-bookworm` | C-02 只使用 PING、AOF 和最小连接；固定补丁标签 | 许可证、安全或客户端兼容评审后替换 |
| Docker Engine | 29.2.x | 27.0 | 开发机/CI 工具版本检查 | 当前开发机客户端为 29.2.1；Compose 文件不依赖实验特性 | Docker 安全与平台支持策略更新 |
| Docker Compose | 5.1.x | 2.20 | `docker compose` 插件与诊断脚本 | 使用健康条件、命名卷和 Compose Specification | 语法检查与完整复现通过后升级 |
| JDK | 17 | 17 | Android Studio Gradle JDK / `JAVA_HOME` | Expo SDK 54 构建环境使用 Java 17 | Expo/React Native 官方基线升级 |
| Android SDK | Platform/API 36 | API 36 | Expo SDK 54 原生工程 | Expo SDK 54 的 compile/target SDK 为 36 | 升级 Expo 后按其兼容表调整 |

镜像标签不使用 `latest`。2026-08-10 已记录当前 Linux/amd64 Docker Desktop 的本机内容 ID，见验证报告；这些 ID 不得描述为已发布的跨架构 Registry manifest 摘要。

官方依据：

- [Node.js Releases](https://nodejs.org/en/about/previous-releases)
- [Python 3.12.10](https://www.python.org/downloads/release/python-31210/) 与 [Python 3.12.13](https://www.python.org/downloads/release/python-31213/)
- [PostgreSQL Versioning Policy](https://www.postgresql.org/support/versioning/)
- [pgvector 官方仓库与 Docker 标签](https://github.com/pgvector/pgvector)
- [Redis 官方镜像](https://hub.docker.com/_/redis)
- [Docker Compose 安装说明](https://docs.docker.com/compose/install/)
- [Docker Desktop Windows 要求](https://docs.docker.com/desktop/setup/install/windows-install/)
- [Expo SDK 54 兼容表](https://docs.expo.dev/versions/v54.0.0/)

## 运行模式

### Windows 宿主机开发

适用于 Web 热更新、Android 模拟器、后端断点调试和单元测试。PostgreSQL 与 Redis 可以只由 Compose 启动：

```powershell
pnpm compose:infra
pnpm dev:backend
pnpm dev:web
pnpm dev:mobile
```

宿主机后端的 `.env` 必须将 `DATABASE_URL` 指向 `127.0.0.1` 的映射端口，将 `REDIS_URL` 指向 `redis://127.0.0.1:<端口>/0`。PowerShell 入口从 `$PSScriptRoot` 计算仓库根目录，不依赖盘符、用户名或固定克隆路径。

### Docker Compose 复现

`compose.yaml` 包含：

| 服务 | 容器职责 | 容器端口 | 默认宿主端口 | 健康检查 |
| --- | --- | --- | --- | --- |
| `db` | PostgreSQL 与 pgvector | 5432 | 5432 | `pg_isready` + `vector` 扩展查询 |
| `redis` | 临时缓存/未来异步准备，AOF 持久化 | 6379 | 6379 | `redis-cli ping` |
| `backend` | C-02 最小 API | 8000 | 8000 | `/health/ready` |
| `web` | 现有 `apps/web` 构建与 Vite preview | 4173 | 5173 | HTTP 首页 |

服务通过独立 `runtime` bridge 网络通信。`backend` 等待 `db` 和 `redis` 健康；`web` 等待 `backend` 健康。健康检查不调用模型生成，不产生模型费用。

Windows 上必须优先使用根命令 `pnpm compose:up`。当仓库路径含中文等非 ASCII 字符时，当前 Docker Desktop/Compose 5.1 的 BuildKit 会话可能无法直接接收构建上下文；PowerShell 入口会自动创建不含 `.env`、`.git`、密钥和缓存的纯 ASCII 临时构建上下文，完成镜像构建后清理该目录，再回到原目录启动 Compose。该兼容处理不改变源码目录、数据卷或 Git 历史。

### Linux 部署标准

Compose 和 Dockerfile 只使用相对构建上下文与 Linux 容器路径，不包含 Windows 盘符。在线 Demo 和后续 CI 应复用相同 Dockerfile，并通过 Secret 系统提供私有环境变量。本任务不实现生产部署、TLS、入口网关、高可用或自动扩缩容。

## 环境变量与 Secret 边界

`.env.example` 只提供变量名和非敏感说明；本地 `.env` 已被 Git 忽略。

- Web 公开配置：`VITE_API_BASE_URL`。该值会进入浏览器 Bundle，只能保存公开 URL。
- Android 公开配置：`EXPO_PUBLIC_API_BASE_URL`。该值会进入客户端包，只能保存公开 URL。
- 后端私有配置：`MODEL_PROVIDER`、`MODEL_BASE_URL`、`MODEL_NAME`、`MODEL_API_KEY`、`DATABASE_URL`、`REDIS_URL`。
- Compose 基础配置：端口、数据库名、数据库用户及本地数据库密码。
- CI：必须由仓库/环境 Secret 注入，不得写入 workflow。

禁止把模型 API Key 放入 `VITE_*`、`EXPO_PUBLIC_*`、Android 配置、前端 Bundle、Git、飞书、日志、测试快照或截图。数据库密码建议仅使用 URL 安全字符；如使用特殊字符，宿主机 `DATABASE_URL` 必须进行标准 URL 编码。

正式运行必须配置四个模型变量。未配置时 `/health/ready` 返回 `503` 和“模型配置缺失”摘要；系统不会回退到产品 Mock 模式。普通测试通过 Stub 隔离依赖。

## 健康检查

- `/health/live`：仅检查 Python/API 进程，不访问外部依赖。
- `/health/ready`：并行检查 PostgreSQL、pgvector、Redis 和模型配置是否存在；不调用模型。
- `/health/dependencies`：返回安全依赖摘要，不返回 URL、密码、Key 或堆栈。
- `pnpm model:check`：唯一的显式模型连通性检查；发送最小非敏感输入，不打印 Key 或模型输出，只记录 Provider、模型标识、HTTP 状态和日期。

## 数据持久化、停止与重置

PostgreSQL 使用 `postgres_data` 命名卷，Redis 使用 `redis_data` 命名卷并启用 AOF `everysec`。以下命令停止容器但保留数据：

```powershell
pnpm compose:down
pnpm compose:clean
```

查看日志和重启单个服务：

```powershell
pnpm compose:logs
docker compose restart backend
docker compose logs backend
```

完整重置是独立危险操作，必须显式确认；它只删除本 Compose 项目的命名卷，不删除 `.env` 或仓库文件：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compose.ps1 -Action reset -ConfirmDataLoss
```

## Android 网络规则

- Android 模拟器访问 Windows 宿主机或宿主机映射的 Docker API：`http://10.0.2.2:8000`。
- 真实 Android 设备访问同一局域网中的宿主机 IPv4 地址；Windows 防火墙必须允许所选 API 端口的受控入站访问。
- Web 浏览器访问 `http://127.0.0.1:8000`；容器内部仅由服务使用 `backend:8000`。
- Metro 使用 `pnpm dev:mobile`，当前 package 脚本端口为 8084；原生调试配置还保留 8081，必要时由 Expo 命令负责端口转发。
- 移动端不得直接调用模型 API，模型 Key 只由后端读取。

## 统一命令

| 目的 | 命令 |
| --- | --- |
| 安装全部依赖 | `pnpm bootstrap` |
| 启动 Web | `pnpm dev:web` |
| 启动移动开发服务 | `pnpm dev:mobile` |
| 启动最小后端 | `pnpm dev:backend` |
| 启动数据库与 Redis | `pnpm compose:infra` |
| 启动完整 Compose | `pnpm compose:up` |
| 停止并保留数据 | `pnpm compose:down` |
| 查看日志 | `pnpm compose:logs` |
| 环境诊断 | `pnpm doctor` |
| HTTP 健康检查 | `pnpm health` |
| 清理容器/网络并保留卷 | `pnpm compose:clean` |
| 显式模型连通性检查 | `pnpm model:check` |

## 当前限制与后续条件

- 当前 C-02 API 不是正式业务服务；满足 C-04 的鉴权、幂等、事务和业务路由评审后再扩展。
- 当前没有业务表、迁移、Worker、Agent 工作流、RAG 或正式事件通道。
- Redis 仅作为 C-02 基础依赖启用，不是事实源，也没有缓存、锁或队列业务实现。
- 3.13 原文仍含 Mock Provider 产品模式旧说明。C-02 最新实施边界是“正式运行使用受控模型 API；自动化测试可以使用 Stub”。是否同步重写 3.13 Decision Log 需另行确认，本任务不扩大修改范围。
- 四服务运行、数据重启保持、中文/空格目录和真实模型连通性已按 [C-02 验证记录](../test-reports/c02-validation.md) 实测通过；跨架构 Registry manifest 与生产部署仍不在本任务范围内。

快速执行见 [Quickstart](quickstart.md)，故障处理见 [Troubleshooting](troubleshooting.md)。
