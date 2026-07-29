# 原型验证记录

验证日期：2026-07-29

| 检查 | 命令 | 当前结果 |
| --- | --- | --- |
| TypeScript | `pnpm typecheck` | 通过 |
| ESLint | `pnpm lint` | 通过 |
| 单元测试 | `pnpm test` | 7 项通过 |
| Web 生产构建 | `pnpm build:web` | 通过 |
| Web 旗舰流程 | `pnpm test:e2e` | 2 项通过；覆盖创建、高风险审批、下发、Agent 证据与路由权限 |
| Expo 原生工程 | `pnpm --filter @tegang/mobile prebuild:android` | 已生成 |
| Android Debug 构建 | `gradlew assembleDebug --offline --no-daemon` | 通过；296 个任务，APK 已生成 |
| Android 模拟器 | 原生 APK + API 35 模拟器 | 通过；APK 安装、Activity 启动与 Metro 加载正常 |
| Android 员工主流程 | 模拟器人工点击 | 通过；登录、学习、辅导、测评、补训、复测、完成 |
| Android 键盘 | 智能辅导输入框 | 通过；键盘可弹起，返回键先关闭键盘 |
| Android 测评返回键 | 测评页硬件返回键 | 通过；显示离开确认并保留当前答案 |
| Android 运行日志 | `adb logcat` | 完整主流程结束后未发现致命异常 |

## 运行环境

- Node.js：当前工作区运行时
- 包管理器：pnpm 11
- Android：compileSdk/targetSdk 36，API 35 x86_64 模拟器
- Java：JDK 17
- Gradle Wrapper：8.14.3
- Debug APK：`apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk`

Android Studio GUI 未在本轮自动化环境中打开；同一原生工程已经通过标准 Gradle Wrapper 构建并在 Android 模拟器安装运行。本文只记录实际完成的检查，不把未执行项标记为通过。
