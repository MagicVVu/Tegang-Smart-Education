# 特钢智教 AI Agent

面向特钢企业员工培训的受控自主 Agent。仓库包含可运行的 Web 管理端、React Native Android 员工端，以及 FastAPI、SQLAlchemy、Alembic、PostgreSQL 和组织身份权限基础。

> 所有员工、制度、任务、测评和报告数据均为模拟数据，只用于验证页面、流程、权限和异常处理，不代表真实企业效果。

## 产品定位

为培训管理员、参训员工和审核人员提供从培训目标、知识检索、差异化方案、学习测评到补训复测、审批和报告的可追溯闭环；LMS 式记录、确定性规则、人工审批和 Agent 动态规划各自承担适合的职责。

## 平台分工

| 平台 | 主要角色 | 重点能力 |
| --- | --- | --- |
| Web | 培训管理员、审核员、系统管理员 | 目标创建、方案调整、高风险审批、报告、Agent 业务证据与开发者 Trace、知识配置 |
| Android | 员工/参训人员 | 我的培训、课程学习、知识引用、智能辅导、测评、补训、复测、消息和个人记录 |

移动端是原生 React Native 工程，不是 WebView，也不是 Web 后台的等比例缩小版。

## 运行截图

| Web 管理员工作台 | Web 高风险审批 | Android 员工首页 | Android 补训 |
| --- | --- | --- | --- |
| ![管理员工作台](docs/screenshots/web-admin-dashboard.png) | ![高风险审批](docs/screenshots/web-approval-detail.png) | ![员工首页](docs/screenshots/android-home.png) | ![定向补训](docs/screenshots/android-remedial.png) |

更多真实运行截图见 [docs/screenshots](docs/screenshots/README.md)。

## 技术栈

- Monorepo：pnpm workspace
- Web：React 19、TypeScript、Vite、React Router、Zustand、Ant Design
- Android：React Native 0.81、Expo 54、React Navigation、Zustand、React Native Paper
- 共享：业务类型、Mock 数据、确定性规则、设计 Token、状态文案与工具
- 质量：TypeScript、ESLint、Vitest、Playwright、Gradle

## 目录结构

```text
apps/
  web/                 React Web 管理端
  mobile/              React Native 员工端
    android/           Android Studio 可打开的原生工程
packages/
  types/               业务与 API 类型
  mock-data/           集中的演示数据
  business-rules/      权限、风险、测评和恢复规则
  design-tokens/       跨端语义设计 Token
  shared-utils/        通用文案与格式化
docs/
  architecture/        前端与服务边界
  prototype/           可点击流程说明
  page-mapping/        PRD 页面映射
  screenshots/         实际运行截图
  test-reports/        实际验证记录
backend/
  app/api/             FastAPI Router 与依赖组合
  app/models/          SQLAlchemy 持久化模型
  app/repositories/    数据访问边界
  app/services/        应用服务边界
  migrations/          Alembic 可逆迁移
```

原有 `agent_core/`、`rag/`、`evals/`、`infra/`、`prototype/` 与治理文档均保留；后端与认证均在现有分层和契约生成链上增量实现，未创建第二套身份、HTTP Client 或数据库基础。

## 环境要求

- Node.js 24.18 LTS
- pnpm 11.9
- Python 3.12（默认 `.python-version` 为 3.12.13；Windows 3.12.10 为最低兼容版本）
- Docker Engine 27+ 与 Docker Compose 2.20+；Windows 推荐 Docker Desktop Linux containers
- Web 截图/E2E：Playwright Chromium
- Android：JDK 17、Android SDK Platform 36、Android Studio 或命令行工具

不要把 `local.properties`、`.env`、签名文件、Token 或本机 SDK 绝对路径提交到 Git。

## 安装与启动

```powershell
Set-Location .\Tegang-Smart-Education
Copy-Item -LiteralPath .env.example -Destination .env
pnpm bootstrap
pnpm db:upgrade
pnpm dev:backend
pnpm dev:web
```

Web 地址：`http://127.0.0.1:5173`。

完整 Docker Compose Quickstart、模型配置、健康检查和安全清理见 [C-02 Quickstart](docs/development/quickstart.md)；环境与版本决策见 [Windows 开发与 Docker 复现基线](docs/development/windows-docker-baseline.md)。

移动端：

```powershell
pnpm dev:mobile
pnpm android
```

如需重新生成 Android 原生工程：

```powershell
pnpm --filter @tegang/mobile prebuild:android
```

## Android Studio

直接打开 `apps/mobile/android`，使用 JDK 17，等待 Gradle 同步后运行 `app`。首次构建需要下载 Gradle 和 Maven 依赖。SDK 路径使用环境变量或未提交的 `local.properties`，不要写入源码。

## 模拟组织与账号

四个账号标识通过幂等 bootstrap 初始化，密码只从本机环境变量读取并保存 Argon2id 哈希。只有后端 `DEMO_MODE=true` 时，Web 才显示并允许“演示身份”快捷入口：

| 角色 | 演示身份 | 可见范围 |
| --- | --- | --- |
| 员工 | 员工 E-0231 | 仅本人培训、学习、测评和消息；Web 提示转移动端 |
| 培训管理员 | 培训管理员 A-001 | 目标、方案、下发、进度、报告、Agent 业务视图 |
| 审核员 | 审核员 R-001 | 高风险审批、只读报告、Agent 业务证据 |
| 系统管理员 | 系统管理员 S-001 | 知识/规则配置与开发者 Trace |

权限同时作用于导航、路由、数据和按钮；后端 RBAC 与资源范围才是安全权威。直接访问越权员工资源采用统一 404 防枚举，动作权限不足返回 403。

## 演示场景

- 正常培训流程
- 高风险审批流程
- 信息不足暂停
- 测评未达标、定向补训与复测
- 知识冲突与保守处理
- Agent/Skill 失败、有限重试、回退和人工接管

场景切换器只在演示模式出现。

## 旗舰业务流程

```text
Web 管理员创建目标与约束
→ Supervisor 拆解并生成候选方案
→ 管理员确认
→ 确定性风险校验
→ 高风险审批
→ 正式任务下发
→ Android 员工学习与智能辅导
→ 测评
→ 未达标时定向补训与复测
→ 报告与 Agent 轨迹
```

详细说明见 [代码型原型流程](docs/prototype/prototype-flow.md) 和 [页面映射](docs/page-mapping/README.md)。

## 构建与测试

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm build:web
pnpm test:e2e
```

一次执行 Web 静态检查、单元测试和生产构建：

```powershell
pnpm run check
pnpm test:backend
```

Compose 会先运行一次性 `migrate` 服务，迁移成功后再启动 backend。宿主机迁移、迁移验证和分层说明见 [C-04 后端与持久化骨架](docs/development/c04-backend-persistence.md)；认证、授权、审计和安全初始化见 [组织、身份与权限基础](docs/development/identity-access-foundation.md)。

Android 命令行构建：

```powershell
Set-Location "apps\mobile\android"
$env:JAVA_HOME = "你的 JDK 17 安装目录"
.\gradlew.bat assembleDebug
```

当前实际验证记录见 [prototype-validation.md](docs/test-reports/prototype-validation.md)。

## Mock 数据与正式 API 边界

页面通过服务接口访问数据，Mock 没有散落在页面组件中：

- Web：`apps/web/src/services`
- 移动端：`apps/mobile/src/services`
- 共享类型：`packages/types`
- 模拟数据：`packages/mock-data`

复制 `.env.example` 为本地 `.env` 后，可配置公开 API 地址：

```dotenv
VITE_API_BASE_URL=
EXPO_PUBLIC_API_BASE_URL=
```

当前 Web/Android 的既有 Mock 适配器只用于尚未落地的原型业务与自动化测试，不是正式产品运行的模型 Mock 模式。认证已使用正式 HTTP API：Web 使用内存 Access Token 和 HttpOnly Refresh Cookie，Android 使用内存 Access Token 和 SecureStore Refresh Token；培训、审批、测评与 Agent 页面仍保留 Mock 边界，直到对应正式 API 实现。详细边界见 [frontend-monorepo.md](docs/architecture/frontend-monorepo.md)。

三档确定性模拟数据位于 [`data`](data/README.md)：small 用于本地开发和旗舰流程，standard 用于检索/题库/规则评测，stress 用于显式批量验证。small 是已提交生成物，`packages/mock-data` 从 small 派生；standard/stress 不会在安装、普通启动或默认测试中自动生成。生成、校验、身份 seed、受限 reset 和字段白名单匿名导出见 [三档确定性模拟数据基线](docs/development/tiered-simulated-data.md)。

当前后端公开的最小接口：

- `GET /health/live`、`GET /health/ready`、`GET /health/dependencies`：兼容 C-02 健康语义；
- `GET /api/v1/system/database-status`：只读运维纵向切片，验证 API → Service → Repository → SQLAlchemy → PostgreSQL，不返回用户、部门或培训数据。
- `POST /api/v1/auth/login|refresh|logout`、`GET /api/v1/auth/me`：正式认证、Refresh 轮换与 fresh Principal；
- `GET /api/v1/auth/demo-profiles`、`POST /api/v1/auth/demo-login`：仅显式 Demo 模式；
- `GET /api/v1/identity/employee-profiles/{id}`：Repository 层本人/部门范围过滤的最小受保护资源切片。

模型 API 只由后端通过 `MODEL_PROVIDER`、`MODEL_BASE_URL`、`MODEL_NAME`、`MODEL_API_KEY` 读取。禁止把模型 Key 放入 `VITE_*`、`EXPO_PUBLIC_*`、Android 包、Git、日志或飞书。真实模型连通性只通过显式 `pnpm model:check` 执行。

## 已知限制

- 当前已有组织、认证、RBAC、资源范围和审计基础，但没有完整业务 API、企业身份源、MFA、LMS 或知识库连接。
- 正式身份会话可恢复；尚未落地的业务状态仍是本地 Mock，刷新页面会回到初始业务场景。
- 模拟测评和报告不能证明真实培训效率或掌握度提升。
- Android 首次 Gradle 构建依赖外部下载；离线环境需要预先准备缓存。
- 本轮已用 Gradle Wrapper 和 Android 模拟器验证原生工程；Android Studio GUI 本身未由自动化流程打开。
- 当前尚未选择开源许可证，因此没有擅自新增 `LICENSE`。

## 原有项目导航

- [3 分钟导览](docs/quick-tour.md)
- [产品材料](docs/product/README.md)
- [状态看板](docs/status.md)
- [治理台账](docs/governance/task-ledger.md)
- [开发与 Git 约定](CONTRIBUTING.md)
