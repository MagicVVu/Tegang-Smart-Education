# C-02 Troubleshooting

先运行：

```powershell
pnpm doctor
docker compose ps
docker compose logs backend
```

## Docker daemon 不可用

症状：`failed to connect to the docker API`。

解决：启动 Docker Desktop，确认使用 Linux containers；再运行 `docker info`。Windows 建议使用受支持的 WSL 2 backend。启动 Docker Desktop 属于宿主机 GUI/服务操作，不由诊断脚本自动执行。

## 中文路径构建出现 BuildKit gRPC 错误

Docker Desktop/Compose 5.1 在 Windows 的非 ASCII 构建上下文中可能报告 `x-docker-expose-session-sharedkey` 含不可打印字符。必须通过 `pnpm compose:up` 使用仓库 PowerShell 入口；该入口检测到中文路径后，会把不含 `.env`、`.git`、密钥和缓存的构建上下文临时复制到纯 ASCII 临时目录，构建完成后立即清理，再从原目录启动服务。禁止为规避该问题复制 `.env`、改写仓库路径或关闭 Git 安全边界。

## 端口被占用

诊断会报告 5173、8000、5432、6379 的监听状态。在 `.env` 修改对应 `WEB_PORT`、`API_PORT`、`POSTGRES_PORT` 或 `REDIS_PORT`，然后重新运行 `docker compose config --quiet`。Android 与 Web URL 也必须使用修改后的宿主端口。

## API 一直 not ready

依次检查：

```powershell
docker compose ps
docker compose logs db
docker compose logs redis
docker compose logs backend
Invoke-RestMethod http://127.0.0.1:8000/health/dependencies
```

模型变量缺失会明确返回 `model_configuration: failed`；这不是启动产品 Mock 模式的信号。数据库失败时确认本地 `.env` 的数据库密码使用 URL 安全字符，且初始化日志显示 `CREATE EXTENSION` 成功。

## pgvector 未启用

```powershell
docker compose exec -T db psql -U tegang_app -d tegang_smart_education -tAc "SELECT extversion FROM pg_extension WHERE extname='vector'"
```

命令中的数据库用户和数据库名应与 `.env` 一致。若命令无输出，读取首次初始化日志。初始化 SQL 只在空数据卷首次创建数据库时执行；已有错误卷必须先备份和评审，再决定是否执行显式数据重置。

## Node/pnpm 版本不符

```powershell
node --version
corepack enable
corepack prepare pnpm@11.9.0 --activate
pnpm --version
```

Node 默认版本为 24.18.0。版本不符时使用 Windows Node 版本管理器或官方安装包切换，然后重新打开 PowerShell。

## Python 或依赖缺失

安装 Python 3.12 后：

```powershell
pnpm bootstrap
.\.venv\Scripts\python.exe -m pytest backend/tests
```

`requirements.lock` 带哈希；哈希或版本不一致时禁止临时去掉 `--require-hashes`，应更新 `requirements.in` 后重新评审并生成锁文件。

## Android 模拟器无法访问 API

- 模拟器使用 `http://10.0.2.2:<API_PORT>`，不能使用 `127.0.0.1` 指向 Windows 宿主机。
- 确认 `Invoke-RestMethod http://127.0.0.1:<API_PORT>/health/live` 在宿主机成功。
- 检查 Windows 防火墙是否允许所选端口；只开放需要的网络配置文件和来源。
- JDK 必须为 17，Expo SDK 54 需要 Android SDK Platform 36。

## 安全停止与重置

常规停止和清理不删除卷：

```powershell
pnpm compose:down
pnpm compose:clean
```

只有确认数据可删除后，才执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/compose.ps1 -Action reset -ConfirmDataLoss
```
