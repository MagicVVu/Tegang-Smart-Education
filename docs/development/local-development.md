# 本地开发

## 前置环境

- Node.js 24.18 LTS
- pnpm 11.9
- Python 3.12
- Docker Engine 27+ 与 Docker Compose 2.20+
- Android：JDK 17、Android SDK Platform 36、Android Studio 或命令行工具

## 安装

```powershell
Copy-Item -LiteralPath .env.example -Destination .env
pnpm bootstrap
```

## Web

```powershell
pnpm dev:web
pnpm build:web
```

## React Native / Android

```powershell
pnpm dev:mobile
pnpm android
```

Android Studio 打开 `apps/mobile/android`。需要重新生成原生工程时执行：

```powershell
pnpm --filter @tegang/mobile prebuild:android
```

Android 模拟器访问宿主机或 Docker 映射 API 使用 `http://10.0.2.2:8000`；真实设备使用宿主机局域网地址。禁止在 Android 包内保存模型 API Key。

## C-04 后端与 Compose

```powershell
pnpm compose:infra
pnpm db:upgrade
pnpm dev:backend
pnpm test:backend
pnpm compose:up
pnpm health
pnpm compose:down
```

Compose 会先运行一次性迁移服务，再启动 backend。可逆迁移测试必须配置与运行库不同的一次性 `MIGRATION_TEST_DATABASE_URL`。完整说明见 [C-04 后端与持久化骨架](c04-backend-persistence.md)、[Windows 开发与 Docker 复现基线](windows-docker-baseline.md) 和 [Quickstart](quickstart.md)。

## 质量检查

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:backend
pnpm test:e2e
pnpm run check
```

## 环境变量

复制 `.env.example` 为本地 `.env`。公开客户端变量为：

```dotenv
VITE_API_BASE_URL=
EXPO_PUBLIC_API_BASE_URL=
```

后端私有模型变量为 `MODEL_PROVIDER`、`MODEL_BASE_URL`、`MODEL_NAME`、`MODEL_API_KEY`。这些变量不得添加 `VITE_` 或 `EXPO_PUBLIC_` 前缀，不得进入客户端 Bundle、日志或飞书。

真实配置不得提交。Android 的 `local.properties`、签名文件和本机 SDK 路径也不得提交。

## 常见问题

- Gradle 首次构建下载慢：确认网络可访问 Gradle/Maven，必要时增加 wrapper 的 `networkTimeout`。
- 找不到 Android SDK：设置 `ANDROID_HOME` 和 `ANDROID_SDK_ROOT`，或创建未提交的 `local.properties`。
- Web/Compose 端口占用：在 `.env` 覆盖宿主端口；容器内部端口保持不变。
- E2E 无法启动：确认本机已安装 Chrome，或安装 Playwright Chromium 并调整 `PLAYWRIGHT_CHANNEL`。
