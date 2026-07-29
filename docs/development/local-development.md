# 本地开发

## 前置环境

- Node.js 20.19+
- pnpm 11.9
- Android：JDK 17、Android SDK Platform 35、Android Studio 或命令行工具

## 安装

```powershell
pnpm install
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

## 质量检查

```powershell
pnpm typecheck
pnpm lint
pnpm test
pnpm test:e2e
pnpm check
```

## 环境变量

复制 `.env.example` 为本地 `.env`。当前留给未来 API 的变量为：

```dotenv
VITE_API_BASE_URL=
EXPO_PUBLIC_API_BASE_URL=
```

真实配置不得提交。Android 的 `local.properties`、签名文件和本机 SDK 路径也不得提交。

## 常见问题

- Gradle 首次构建下载慢：确认网络可访问 Gradle/Maven，必要时增加 wrapper 的 `networkTimeout`。
- 找不到 Android SDK：设置 `ANDROID_HOME` 和 `ANDROID_SDK_ROOT`，或创建未提交的 `local.properties`。
- Web 端口占用：Vite 固定使用 5173，结束占用进程后重试。
- E2E 无法启动：确认本机已安装 Chrome，或安装 Playwright Chromium 并调整 `PLAYWRIGHT_CHANNEL`。
