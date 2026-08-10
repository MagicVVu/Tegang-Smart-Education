# C-02 验证记录

验证日期：2026-08-10。

## 完成结果

| 检查 | 结果 | 事实边界 |
| --- | --- | --- |
| Git 初始状态 | 通过 | 初始为 detached HEAD；`HEAD`、本地 `main`、`origin/main` 均为 `a45b9f2`，分叉计数 `0/0`，初始无未提交修改；后续差异均由 C-02 产生 |
| 飞书输入决策 | revision 700 已读取 | 已读取 3.12、3.13、3.14、3.15 对应章节；3.13 原为待批准，本任务获得项目负责人明确批准 |
| Python 锁文件 | 通过 | Python 3.12 使用 `pip-tools 7.6.0` 解析，`requirements.lock` 含传递依赖和哈希；容器以 `--require-hashes` 安装成功 |
| 后端与契约测试 | 18 passed、127 subtests passed | 数据库、Redis 与模型在普通测试中使用 Stub 隔离；未把 Stub 描述为产品运行模式 |
| Web/workspace 检查 | 通过 | TypeScript typecheck、ESLint、4 个测试文件/19 项测试和 Web 生产构建通过 |
| Compose 语法与构建 | 通过 | `docker compose config --quiet` 通过；Web/API Dockerfile 实际构建成功 |
| 四服务启动 | 通过 | `db`、`redis`、`backend`、`web` 均达到 `healthy`；依赖顺序使用健康条件，不只依赖进程启动 |
| Web 与 API | 通过 | Web 首页 HTTP 200；`/health/live` 为 `ok`，`/health/ready` 为 `ready`，`/health/dependencies` 为 `ok` |
| PostgreSQL 与 pgvector | 通过 | PostgreSQL `16.14` 可连接，目标数据库存在，pgvector `0.8.2` 已启用 |
| Redis | 通过 | Redis `7.4.10` 返回 `PONG`，AOF `everysec` 已启用 |
| 单服务重启 | 通过 | 单独重启 `backend` 后容器恢复 `healthy`，API live 为 `ok`，日志可读取 |
| 停止与数据保持 | 通过 | 写入 `c02` 临时探针后执行不带 `--volumes` 的 `down/up`；PostgreSQL 与 Redis 探针均保留，两个命名卷未删除；验证后仅清除本次探针 |
| 安全重置保护 | 通过 | 未提供 `-ConfirmDataLoss` 时重置入口以退出码 2 拒绝执行；测试项目仅在显式确认后删除自己的临时卷 |
| 模型 API | 通过 | 本地配置使用 DeepSeek OpenAI-compatible API、`deepseek-v4-flash`；最小非敏感请求返回 HTTP 200，未输出 Key 或模型回复内容 |
| Secret 边界 | 通过 | `.env` 被 Git 忽略且未被跟踪；安全副本未复制 `.env`、`.git`、`local.properties`、keystore 或密钥 |
| 镜像标签 | 通过 | 基础镜像、数据库、Redis 及本地 Web/API 镜像均使用显式标签；运行容器没有 `latest` |
| 环境诊断 | 通过 | 能发现版本、配置、端口、Docker、Compose、镜像、服务、数据库、pgvector、Redis、Web、API 与模型配置问题；值保持脱敏 |
| 新目录完整复现 | 通过 | 在含空格和中文且不含 `.env`/`.git` 的副本中，根命令 `pnpm run compose:up` 实际完成构建和四服务启动；Web/API/pgvector/Redis 均通过，临时构建目录残留数为 0 |

## 镜像实际记录

| 镜像 | 显式标签 | 本机验证的内容 ID |
| --- | --- | --- |
| Python | `python:3.12.13-slim-bookworm` | `sha256:4766d8b510c428e595d74b9cc5bbb2fae8e26316fffb4adc89908d79aacd58a2` |
| Node.js | `node:24.18.0-bookworm-slim` | `sha256:6f7b03f7c2c8e2e784dcf9295400527b9b1270fd37b7e9a7285cf83b6951452d` |
| PostgreSQL/pgvector | `pgvector/pgvector:0.8.2-pg16-bookworm` | `sha256:00ba258a66dac104fd5171074a0084462a64a1369d8513f3d0a634e2f24d15bc` |
| Redis | `redis:7.4.10-bookworm` | `sha256:e9b2e45ecd47fbb69b877cf8d045d5cccaaaed52524b6e098b4abe8212994f73` |
| C-02 backend | `tegang-smart-education/backend:c02-0.1.0` | `sha256:4362880f8808634c62e451ed97de3ab77faf37556d342a3162b6a35787790f69` |
| C-02 web | `tegang-smart-education/web:c02-0.1.0` | `sha256:a45c7ed2b31997c1950cc36098e36b89dda179420ec8ab0a5a72a107a77ee7d2` |

上述是 2026-08-10 在当前 Linux/amd64 Docker Desktop 本机内容存储中核验的 ID，不等同于已发布的跨架构 Registry manifest 摘要。

## 失败、原因与修正

1. 首次拉取 Python/Node 基础镜像时，Docker Hub 认证端点网络超时。未修改代理或镜像源；对两个公开镜像各进行一次安全重试后成功，并记录内容 ID。
2. 新目录首次直接把含空格脚本路径传给 `Start-Process` 时参数被拆分；改用仓库真实 pnpm 入口后主机 Web 返回 HTTP 200。
3. Docker Desktop/Compose 5.1 在中文构建上下文中报告 `x-docker-expose-session-sharedkey` 含不可打印字符。关闭 Bake 仍不能规避。最终根入口检测非 ASCII 路径后，只把不含 Secret/Git/缓存的构建上下文复制到经过校验的纯 ASCII 临时目录，完成构建后清理，再从原目录启动；统一入口终验通过。
4. 本机旧 `DEEPSEEK_API_KEY` 经官方 `/models` 接口确认失效。用户在本地 `.env` 保存当前 Key 后，最小连通性检查返回 HTTP 200；旧 Key 和新 Key 均未写入日志、Git 或飞书。

## 已知限制

- Windows 主机当前 Node.js 为 `24.14.0`，低于仓库默认基线 `24.18.0`；现有检查可运行，但 `doctor` 会按基线判定失败，直接开发前应升级。
- Windows 主机当前 JDK 为 8，低于 Android 所需 JDK 17；Android SDK 也未在本任务中重新配置或构建。
- Windows Store 的全局 `python` 命令入口在当前会话中不可靠；仓库 `.venv` 使用 Python 3.12.13，`doctor` 会优先识别该环境且已通过验证。
- Registry 多架构 manifest、生产部署、TLS、CI 发布和正式业务服务不属于 C-02 本机验收范围。
- 当前 Web/Android 既有业务 Mock 仍属于原型适配层；C-02 模型正式运行不使用 Mock Provider，正式业务 HTTP 适配由 C-04 后续处理。

本记录不得描述为正式业务后端、企业效果、生产部署或模型质量评测。
